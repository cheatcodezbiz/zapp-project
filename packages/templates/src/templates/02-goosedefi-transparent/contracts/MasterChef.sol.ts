export const GOOSE_MASTER_CHEF_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IGooseToken {
    function mint(address to, uint256 amount) external;
}

/// @title GooseMasterChef — GooseDefi-style transparent yield farm
/// @notice Features timelocked emission changes, deposit fee buyback-and-burn,
///         0% fee on native pairs, 4% on non-native, transparent event logging.
/// @dev UUPS upgradeable. Uses ERC-7201 namespaced storage.
contract GooseMasterChef is
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────

    uint16 public constant MAX_DEPOSIT_FEE = 400; // 4%
    uint256 private constant ACC_PRECISION = 1e18;
    uint256 public constant MIN_TIMELOCK_DELAY = 6 hours;

    // ──────────────────────────────────────────────
    //  ERC-7201 Storage
    // ──────────────────────────────────────────────

    struct PoolInfo {
        IERC20 lpToken;
        uint256 allocPoint;
        uint256 lastRewardBlock;
        uint256 accRewardPerShare;
        uint16 depositFeeBps;
        bool isNativePair; // true = 0% fee, false = 4% fee
    }

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 lastDepositBlock;
    }

    struct PendingEmissionChange {
        uint256 newRewardPerBlock;
        uint256 executeAfter; // timestamp after which it can be executed
        bool exists;
    }

    /// @custom:storage-location erc7201:zapp.storage.GooseMasterChef
    struct GooseMasterChefStorage {
        IGooseToken rewardToken;
        uint256 rewardPerBlock;
        uint256 startBlock;
        address devAddress;
        uint16 devFeeBps;
        uint256 totalAllocPoint;
        address feeRecipient; // Receives deposit fees for buyback-and-burn
        uint256 timelockDelay; // Delay for emission changes (min 6 hours)
        PoolInfo[] pools;
        mapping(uint256 => mapping(address => UserInfo)) users;
        mapping(address => bool) poolExistence;
        PendingEmissionChange pendingEmission;
    }

    // keccak256(abi.encode(uint256(keccak256("zapp.storage.GooseMasterChef")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0x60929c1b10ba3cd73882f43243829267b74612836f2eec2c7a91397b3056a200;

    function _getStorage() private pure returns (GooseMasterChefStorage storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    // ──────────────────────────────────────────────
    //  Events — Transparent logging on ALL admin actions
    // ──────────────────────────────────────────────

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint, uint16 depositFeeBps, bool isNativePair);
    event PoolSet(uint256 indexed pid, uint256 allocPoint);
    event DepositFeeCollected(uint256 indexed pid, address indexed user, uint256 feeAmount, address feeRecipient);
    event DevAddressUpdated(address indexed oldDev, address indexed newDev);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event EmissionChangeProposed(uint256 newRewardPerBlock, uint256 executeAfter);
    event EmissionChangeExecuted(uint256 oldRewardPerBlock, uint256 newRewardPerBlock);
    event EmissionChangeCancelled(uint256 cancelledRewardPerBlock);
    event TimelockDelayUpdated(uint256 oldDelay, uint256 newDelay);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier validatePool(uint256 pid) {
        require(pid < _getStorage().pools.length, "Pool does not exist");
        _;
    }

    modifier nonDuplicated(address lpToken) {
        require(!_getStorage().poolExistence[lpToken], "Pool already exists");
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor / Initializer
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the GooseMasterChef contract.
    /// @param rewardToken_ Address of the reward token (must support mint()).
    /// @param rewardPerBlock_ Reward tokens minted per block (in wei).
    /// @param startBlock_ Block number at which rewards start.
    /// @param devAddress_ Address that receives the dev fee portion.
    /// @param devFeeBps_ Dev fee in basis points.
    /// @param feeRecipient_ Address that receives deposit fees for buyback-and-burn.
    /// @param timelockDelay_ Delay for emission changes (min 6 hours).
    function initialize(
        address rewardToken_,
        uint256 rewardPerBlock_,
        uint256 startBlock_,
        address devAddress_,
        uint16 devFeeBps_,
        address feeRecipient_,
        uint256 timelockDelay_
    ) external initializer {
        require(timelockDelay_ >= MIN_TIMELOCK_DELAY, "Timelock too short");
        require(feeRecipient_ != address(0), "Zero fee recipient");

        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        GooseMasterChefStorage storage $ = _getStorage();
        $.rewardToken = IGooseToken(rewardToken_);
        $.rewardPerBlock = rewardPerBlock_;
        $.startBlock = startBlock_;
        $.devAddress = devAddress_;
        $.devFeeBps = devFeeBps_;
        $.feeRecipient = feeRecipient_;
        $.timelockDelay = timelockDelay_;
    }

    // ──────────────────────────────────────────────
    //  Pool Management
    // ──────────────────────────────────────────────

    /// @notice Add a new LP pool. Can only be called by the owner.
    /// @param allocPoint Allocation points for this pool.
    /// @param lpToken Address of the LP token.
    /// @param depositFeeBps Deposit fee in bps (max 400). Ignored if isNativePair is true.
    /// @param isNativePair If true, deposit fee is always 0%.
    function add(
        uint256 allocPoint,
        address lpToken,
        uint16 depositFeeBps,
        bool isNativePair
    ) external onlyOwner nonDuplicated(lpToken) {
        require(depositFeeBps <= MAX_DEPOSIT_FEE, "Deposit fee too high");

        massUpdatePools();

        GooseMasterChefStorage storage $ = _getStorage();
        uint256 lastRewardBlock = block.number > $.startBlock ? block.number : $.startBlock;
        $.totalAllocPoint += allocPoint;
        $.poolExistence[lpToken] = true;

        // Native pairs always have 0% fee
        uint16 actualFee = isNativePair ? 0 : depositFeeBps;

        $.pools.push(
            PoolInfo({
                lpToken: IERC20(lpToken),
                allocPoint: allocPoint,
                lastRewardBlock: lastRewardBlock,
                accRewardPerShare: 0,
                depositFeeBps: actualFee,
                isNativePair: isNativePair
            })
        );

        emit PoolAdded($.pools.length - 1, lpToken, allocPoint, actualFee, isNativePair);
    }

    /// @notice Update the allocation points for a pool. Can only be called by the owner.
    /// @param pid Pool ID.
    /// @param allocPoint New allocation points.
    function set(uint256 pid, uint256 allocPoint) external onlyOwner validatePool(pid) {
        massUpdatePools();

        GooseMasterChefStorage storage $ = _getStorage();
        $.totalAllocPoint = $.totalAllocPoint - $.pools[pid].allocPoint + allocPoint;
        $.pools[pid].allocPoint = allocPoint;

        emit PoolSet(pid, allocPoint);
    }

    // ──────────────────────────────────────────────
    //  Timelocked Emission Changes
    // ──────────────────────────────────────────────

    /// @notice Propose a new reward per block. Subject to timelock delay.
    /// @param newRewardPerBlock New reward amount per block (in wei).
    function proposeEmissionChange(uint256 newRewardPerBlock) external onlyOwner {
        GooseMasterChefStorage storage $ = _getStorage();
        uint256 executeAfter = block.timestamp + $.timelockDelay;

        $.pendingEmission = PendingEmissionChange({
            newRewardPerBlock: newRewardPerBlock,
            executeAfter: executeAfter,
            exists: true
        });

        emit EmissionChangeProposed(newRewardPerBlock, executeAfter);
    }

    /// @notice Execute a previously proposed emission change after the timelock.
    function executeEmissionChange() external onlyOwner {
        GooseMasterChefStorage storage $ = _getStorage();
        require($.pendingEmission.exists, "No pending change");
        require(block.timestamp >= $.pendingEmission.executeAfter, "Timelock not expired");

        massUpdatePools();

        uint256 oldReward = $.rewardPerBlock;
        $.rewardPerBlock = $.pendingEmission.newRewardPerBlock;

        delete $.pendingEmission;

        emit EmissionChangeExecuted(oldReward, $.rewardPerBlock);
    }

    /// @notice Cancel a pending emission change.
    function cancelEmissionChange() external onlyOwner {
        GooseMasterChefStorage storage $ = _getStorage();
        require($.pendingEmission.exists, "No pending change");

        uint256 cancelled = $.pendingEmission.newRewardPerBlock;
        delete $.pendingEmission;

        emit EmissionChangeCancelled(cancelled);
    }

    /// @notice View the pending emission change details.
    function pendingEmissionChange() external view returns (
        uint256 newRewardPerBlock,
        uint256 executeAfter,
        bool exists
    ) {
        GooseMasterChefStorage storage $ = _getStorage();
        PendingEmissionChange storage pe = $.pendingEmission;
        return (pe.newRewardPerBlock, pe.executeAfter, pe.exists);
    }

    // ──────────────────────────────────────────────
    //  Core Functions
    // ──────────────────────────────────────────────

    /// @notice Deposit LP tokens to earn rewards.
    /// @param pid Pool ID.
    /// @param amount Amount of LP tokens to deposit.
    function deposit(uint256 pid, uint256 amount) external nonReentrant validatePool(pid) {
        GooseMasterChefStorage storage $ = _getStorage();
        PoolInfo storage pool = $.pools[pid];
        UserInfo storage user = $.users[pid][msg.sender];

        _updatePool(pid);

        // Harvest pending rewards if user already has a stake
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
            if (pending > 0) {
                _safeRewardTransfer(msg.sender, pending);
                emit Harvest(msg.sender, pid, pending);
            }
        }

        if (amount > 0) {
            uint256 balBefore = pool.lpToken.balanceOf(address(this));
            pool.lpToken.safeTransferFrom(msg.sender, address(this), amount);
            uint256 received = pool.lpToken.balanceOf(address(this)) - balBefore;

            // Apply deposit fee — sent to feeRecipient for buyback-and-burn
            if (pool.depositFeeBps > 0) {
                uint256 fee = received * pool.depositFeeBps / 10000;
                pool.lpToken.safeTransfer($.feeRecipient, fee);
                received -= fee;
                emit DepositFeeCollected(pid, msg.sender, fee, $.feeRecipient);
            }

            user.amount += received;
            user.lastDepositBlock = block.number;
        }

        user.rewardDebt = user.amount * pool.accRewardPerShare / ACC_PRECISION;

        emit Deposit(msg.sender, pid, amount);
    }

    /// @notice Withdraw LP tokens and harvest rewards.
    /// @param pid Pool ID.
    /// @param amount Amount of LP tokens to withdraw.
    function withdraw(uint256 pid, uint256 amount) external nonReentrant validatePool(pid) {
        GooseMasterChefStorage storage $ = _getStorage();
        PoolInfo storage pool = $.pools[pid];
        UserInfo storage user = $.users[pid][msg.sender];

        require(user.amount >= amount, "Insufficient balance");
        require(block.number > user.lastDepositBlock, "Same block as deposit");

        _updatePool(pid);

        uint256 pending = (user.amount * pool.accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            emit Harvest(msg.sender, pid, pending);
        }

        if (amount > 0) {
            user.amount -= amount;
            pool.lpToken.safeTransfer(msg.sender, amount);
        }

        user.rewardDebt = user.amount * pool.accRewardPerShare / ACC_PRECISION;

        emit Withdraw(msg.sender, pid, amount);
    }

    /// @notice Withdraw all staked tokens WITHOUT claiming rewards. Emergency only.
    /// @dev ALWAYS available. No admin gate. No penalty. Returns full principal.
    /// @param pid Pool ID.
    function emergencyWithdraw(uint256 pid) external nonReentrant validatePool(pid) {
        GooseMasterChefStorage storage $ = _getStorage();
        PoolInfo storage pool = $.pools[pid];
        UserInfo storage user = $.users[pid][msg.sender];

        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;

        if (amount > 0) {
            pool.lpToken.safeTransfer(msg.sender, amount);
        }

        emit EmergencyWithdraw(msg.sender, pid, amount);
    }

    /// @notice Harvest pending rewards without changing stake.
    /// @param pid Pool ID.
    function harvest(uint256 pid) external nonReentrant validatePool(pid) {
        GooseMasterChefStorage storage $ = _getStorage();
        PoolInfo storage pool = $.pools[pid];
        UserInfo storage user = $.users[pid][msg.sender];

        require(block.number > user.lastDepositBlock, "Same block as deposit");

        _updatePool(pid);

        uint256 pending = (user.amount * pool.accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
        require(pending > 0, "Nothing to harvest");

        user.rewardDebt = user.amount * pool.accRewardPerShare / ACC_PRECISION;
        _safeRewardTransfer(msg.sender, pending);

        emit Harvest(msg.sender, pid, pending);
    }

    // ──────────────────────────────────────────────
    //  Pool Update Logic
    // ──────────────────────────────────────────────

    /// @notice Update reward variables for all pools.
    function massUpdatePools() public {
        GooseMasterChefStorage storage $ = _getStorage();
        uint256 length = $.pools.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            _updatePool(pid);
        }
    }

    /// @notice Update reward variables for a single pool.
    /// @param pid Pool ID.
    function updatePool(uint256 pid) external validatePool(pid) {
        _updatePool(pid);
    }

    function _updatePool(uint256 pid) internal {
        GooseMasterChefStorage storage $ = _getStorage();
        PoolInfo storage pool = $.pools[pid];

        if (block.number <= pool.lastRewardBlock) {
            return;
        }

        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0 || $.totalAllocPoint == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }

        uint256 blocks = block.number - pool.lastRewardBlock;
        uint256 reward = blocks * $.rewardPerBlock * pool.allocPoint / $.totalAllocPoint;

        // Mint dev fee
        if ($.devFeeBps > 0 && $.devAddress != address(0)) {
            uint256 devReward = reward * $.devFeeBps / 10000;
            $.rewardToken.mint($.devAddress, devReward);
        }

        $.rewardToken.mint(address(this), reward);
        pool.accRewardPerShare += reward * ACC_PRECISION / lpSupply;
        pool.lastRewardBlock = block.number;
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    /// @notice View pending reward for a user in a specific pool.
    function pendingReward(uint256 pid, address userAddr) external view validatePool(pid) returns (uint256) {
        GooseMasterChefStorage storage $ = _getStorage();
        PoolInfo storage pool = $.pools[pid];
        UserInfo storage user = $.users[pid][userAddr];

        uint256 accRewardPerShare = pool.accRewardPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));

        if (block.number > pool.lastRewardBlock && lpSupply > 0 && $.totalAllocPoint > 0) {
            uint256 blocks = block.number - pool.lastRewardBlock;
            uint256 reward = blocks * $.rewardPerBlock * pool.allocPoint / $.totalAllocPoint;
            accRewardPerShare += reward * ACC_PRECISION / lpSupply;
        }

        return (user.amount * accRewardPerShare / ACC_PRECISION) - user.rewardDebt;
    }

    function poolLength() external view returns (uint256) {
        return _getStorage().pools.length;
    }

    function getPoolInfo(uint256 pid) external view validatePool(pid) returns (
        address lpToken,
        uint256 allocPoint,
        uint256 lastRewardBlock,
        uint256 accRewardPerShare,
        uint16 depositFeeBps,
        bool isNativePair
    ) {
        PoolInfo storage pool = _getStorage().pools[pid];
        return (
            address(pool.lpToken),
            pool.allocPoint,
            pool.lastRewardBlock,
            pool.accRewardPerShare,
            pool.depositFeeBps,
            pool.isNativePair
        );
    }

    function getUserInfo(uint256 pid, address userAddr) external view validatePool(pid) returns (
        uint256 amount,
        uint256 rewardDebt,
        uint256 lastDepositBlock
    ) {
        UserInfo storage user = _getStorage().users[pid][userAddr];
        return (user.amount, user.rewardDebt, user.lastDepositBlock);
    }

    function rewardToken() external view returns (address) {
        return address(_getStorage().rewardToken);
    }

    function rewardPerBlock() external view returns (uint256) {
        return _getStorage().rewardPerBlock;
    }

    function totalAllocPoint() external view returns (uint256) {
        return _getStorage().totalAllocPoint;
    }

    function startBlock() external view returns (uint256) {
        return _getStorage().startBlock;
    }

    function devAddress() external view returns (address) {
        return _getStorage().devAddress;
    }

    function devFeeBps() external view returns (uint16) {
        return _getStorage().devFeeBps;
    }

    function feeRecipient() external view returns (address) {
        return _getStorage().feeRecipient;
    }

    function timelockDelay() external view returns (uint256) {
        return _getStorage().timelockDelay;
    }

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    /// @notice Update the dev address. Only callable by current dev.
    function setDevAddress(address newDevAddress) external {
        GooseMasterChefStorage storage $ = _getStorage();
        require(msg.sender == $.devAddress, "Only dev");
        require(newDevAddress != address(0), "Zero address");
        emit DevAddressUpdated($.devAddress, newDevAddress);
        $.devAddress = newDevAddress;
    }

    /// @notice Update the fee recipient address.
    function setFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Zero address");
        GooseMasterChefStorage storage $ = _getStorage();
        emit FeeRecipientUpdated($.feeRecipient, newFeeRecipient);
        $.feeRecipient = newFeeRecipient;
    }

    /// @notice Update the timelock delay. Must be >= 6 hours.
    function setTimelockDelay(uint256 newDelay) external onlyOwner {
        require(newDelay >= MIN_TIMELOCK_DELAY, "Timelock too short");
        GooseMasterChefStorage storage $ = _getStorage();
        emit TimelockDelayUpdated($.timelockDelay, newDelay);
        $.timelockDelay = newDelay;
    }

    /// @notice Update the dev fee. Only callable by owner.
    function setDevFeeBps(uint16 newDevFeeBps) external onlyOwner {
        require(newDevFeeBps <= 2000, "Dev fee too high");
        _getStorage().devFeeBps = newDevFeeBps;
    }

    // ──────────────────────────────────────────────
    //  Internal Helpers
    // ──────────────────────────────────────────────

    function _safeRewardTransfer(address to, uint256 amount) internal {
        GooseMasterChefStorage storage $ = _getStorage();
        IERC20 token = IERC20(address($.rewardToken));
        uint256 bal = token.balanceOf(address(this));
        if (amount > bal) {
            token.safeTransfer(to, bal);
        } else {
            token.safeTransfer(to, amount);
        }
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
`;
