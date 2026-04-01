export const MASTER_CHEF_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IRewardToken {
    function mint(address to, uint256 amount) external;
}

/// @title MasterChef — PancakeSwap-style yield farm
/// @notice Pool management, LP staking, per-block reward distribution with allocation weights.
/// @dev UUPS upgradeable. Uses ERC-7201 namespaced storage.
contract MasterChef is
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────

    /// @notice Maximum deposit fee: 4% (400 basis points).
    uint16 public constant MAX_DEPOSIT_FEE = 400;

    /// @notice Precision factor for accRewardPerShare calculations.
    uint256 private constant ACC_PRECISION = 1e18;

    // ──────────────────────────────────────────────
    //  ERC-7201 Storage
    // ──────────────────────────────────────────────

    struct PoolInfo {
        IERC20 lpToken;
        uint256 allocPoint;
        uint256 lastRewardBlock;
        uint256 accRewardPerShare;
        uint16 depositFeeBps;
    }

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 lastDepositBlock;
    }

    /// @custom:storage-location erc7201:zapp.storage.MasterChef
    struct MasterChefStorage {
        IRewardToken rewardToken;
        uint256 rewardPerBlock;
        uint256 startBlock;
        address devAddress;
        uint16 devFeeBps;
        uint256 totalAllocPoint;
        PoolInfo[] pools;
        mapping(uint256 => mapping(address => UserInfo)) users;
        mapping(address => bool) poolExistence;
    }

    // keccak256(abi.encode(uint256(keccak256("zapp.storage.MasterChef")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0x70ff8bbfeb4f31bc7779d43ed6d968c17b7ce25bdd22e93c037401778837e800;

    function _getStorage() private pure returns (MasterChefStorage storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint, uint16 depositFeeBps);
    event PoolSet(uint256 indexed pid, uint256 allocPoint);
    event DevAddressUpdated(address indexed oldDev, address indexed newDev);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier validatePool(uint256 pid) {
        require(pid < _getStorage().pools.length, "Pool does not exist");
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor / Initializer
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the MasterChef contract.
    /// @param rewardToken_ Address of the reward token (must support mint()).
    /// @param rewardPerBlock_ Reward tokens minted per block (in wei).
    /// @param startBlock_ Block number at which rewards start.
    /// @param devAddress_ Address that receives the dev fee portion.
    /// @param devFeeBps_ Dev fee in basis points (e.g. 909 = 9.09%).
    function initialize(
        address rewardToken_,
        uint256 rewardPerBlock_,
        uint256 startBlock_,
        address devAddress_,
        uint16 devFeeBps_
    ) external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        MasterChefStorage storage $ = _getStorage();
        $.rewardToken = IRewardToken(rewardToken_);
        $.rewardPerBlock = rewardPerBlock_;
        $.startBlock = startBlock_;
        $.devAddress = devAddress_;
        $.devFeeBps = devFeeBps_;
    }

    // ──────────────────────────────────────────────
    //  Pool Management
    // ──────────────────────────────────────────────

    /// @notice Add a new LP pool. Can only be called by the owner.
    /// @param allocPoint Allocation points for this pool.
    /// @param lpToken Address of the LP token.
    /// @param depositFeeBps Deposit fee in basis points (max 400 = 4%).
    function add(
        uint256 allocPoint,
        address lpToken,
        uint16 depositFeeBps
    ) external onlyOwner {
        require(depositFeeBps <= MAX_DEPOSIT_FEE, "Deposit fee too high");
        MasterChefStorage storage $ = _getStorage();
        require(!$.poolExistence[lpToken], "Pool already exists");

        massUpdatePools();

        uint256 lastRewardBlock = block.number > $.startBlock ? block.number : $.startBlock;
        $.totalAllocPoint += allocPoint;
        $.poolExistence[lpToken] = true;

        $.pools.push(
            PoolInfo({
                lpToken: IERC20(lpToken),
                allocPoint: allocPoint,
                lastRewardBlock: lastRewardBlock,
                accRewardPerShare: 0,
                depositFeeBps: depositFeeBps
            })
        );

        emit PoolAdded($.pools.length - 1, lpToken, allocPoint, depositFeeBps);
    }

    /// @notice Update the allocation points for a pool. Can only be called by the owner.
    /// @param pid Pool ID.
    /// @param allocPoint New allocation points.
    function set(uint256 pid, uint256 allocPoint) external onlyOwner validatePool(pid) {
        massUpdatePools();

        MasterChefStorage storage $ = _getStorage();
        $.totalAllocPoint = $.totalAllocPoint - $.pools[pid].allocPoint + allocPoint;
        $.pools[pid].allocPoint = allocPoint;

        emit PoolSet(pid, allocPoint);
    }

    // ──────────────────────────────────────────────
    //  Core Functions
    // ──────────────────────────────────────────────

    /// @notice Deposit LP tokens to earn rewards.
    /// @param pid Pool ID.
    /// @param amount Amount of LP tokens to deposit.
    function deposit(uint256 pid, uint256 amount) external nonReentrant validatePool(pid) {
        MasterChefStorage storage $ = _getStorage();
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

            // Apply deposit fee
            if (pool.depositFeeBps > 0) {
                uint256 fee = received * pool.depositFeeBps / 10000;
                pool.lpToken.safeTransfer($.devAddress, fee);
                received -= fee;
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
        MasterChefStorage storage $ = _getStorage();
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
    /// @dev ALWAYS available. No admin gate. No penalty. Returns full principal. Forfeits rewards.
    /// @param pid Pool ID.
    function emergencyWithdraw(uint256 pid) external nonReentrant validatePool(pid) {
        MasterChefStorage storage $ = _getStorage();
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
        MasterChefStorage storage $ = _getStorage();
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

    /// @notice Update reward variables for all pools. Gas-intensive — use sparingly.
    function massUpdatePools() public {
        MasterChefStorage storage $ = _getStorage();
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
        MasterChefStorage storage $ = _getStorage();
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
    /// @param pid Pool ID.
    /// @param userAddr User address.
    /// @return Pending reward amount in wei.
    function pendingReward(uint256 pid, address userAddr) external view validatePool(pid) returns (uint256) {
        MasterChefStorage storage $ = _getStorage();
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

    /// @notice Returns the number of pools.
    function poolLength() external view returns (uint256) {
        return _getStorage().pools.length;
    }

    /// @notice Returns pool info for a given pool ID.
    function getPoolInfo(uint256 pid) external view validatePool(pid) returns (
        address lpToken,
        uint256 allocPoint,
        uint256 lastRewardBlock,
        uint256 accRewardPerShare,
        uint16 depositFeeBps
    ) {
        PoolInfo storage pool = _getStorage().pools[pid];
        return (
            address(pool.lpToken),
            pool.allocPoint,
            pool.lastRewardBlock,
            pool.accRewardPerShare,
            pool.depositFeeBps
        );
    }

    /// @notice Returns user info for a given pool and user.
    function getUserInfo(uint256 pid, address userAddr) external view validatePool(pid) returns (
        uint256 amount,
        uint256 rewardDebt,
        uint256 lastDepositBlock
    ) {
        UserInfo storage user = _getStorage().users[pid][userAddr];
        return (user.amount, user.rewardDebt, user.lastDepositBlock);
    }

    /// @notice Returns the reward token address.
    function rewardToken() external view returns (address) {
        return address(_getStorage().rewardToken);
    }

    /// @notice Returns the current reward per block.
    function rewardPerBlock() external view returns (uint256) {
        return _getStorage().rewardPerBlock;
    }

    /// @notice Returns the total allocation points.
    function totalAllocPoint() external view returns (uint256) {
        return _getStorage().totalAllocPoint;
    }

    /// @notice Returns the start block.
    function startBlock() external view returns (uint256) {
        return _getStorage().startBlock;
    }

    /// @notice Returns the dev address.
    function devAddress() external view returns (address) {
        return _getStorage().devAddress;
    }

    /// @notice Returns the dev fee in basis points.
    function devFeeBps() external view returns (uint16) {
        return _getStorage().devFeeBps;
    }

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    /// @notice Update the reward per block. No timelock — degen default.
    /// @param newRewardPerBlock New reward amount per block (in wei).
    function setRewardPerBlock(uint256 newRewardPerBlock) external onlyOwner {
        massUpdatePools();
        _getStorage().rewardPerBlock = newRewardPerBlock;
    }

    /// @notice Update the dev address. Only callable by current dev.
    /// @param newDevAddress New dev address.
    function setDevAddress(address newDevAddress) external {
        MasterChefStorage storage $ = _getStorage();
        require(msg.sender == $.devAddress, "Only dev");
        require(newDevAddress != address(0), "Zero address");
        emit DevAddressUpdated($.devAddress, newDevAddress);
        $.devAddress = newDevAddress;
    }

    /// @notice Update the dev fee. Only callable by owner.
    /// @param newDevFeeBps New dev fee in basis points.
    function setDevFeeBps(uint16 newDevFeeBps) external onlyOwner {
        require(newDevFeeBps <= 2000, "Dev fee too high"); // Max 20%
        _getStorage().devFeeBps = newDevFeeBps;
    }

    // ──────────────────────────────────────────────
    //  Internal Helpers
    // ──────────────────────────────────────────────

    /// @dev Safe reward token transfer, in case rounding causes insufficient balance.
    function _safeRewardTransfer(address to, uint256 amount) internal {
        MasterChefStorage storage $ = _getStorage();
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
