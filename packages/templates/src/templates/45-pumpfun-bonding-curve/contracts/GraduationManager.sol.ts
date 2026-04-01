export const GRADUATION_MANAGER_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev Uniswap V2 Router interface (subset)
interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
}

/// @dev Uniswap V2 Factory interface (subset)
interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/// @title GraduationManager — DEX migration on bonding curve graduation
/// @notice When a token reaches its graduation threshold on the bonding curve,
///         this contract creates a real liquidity pool on a Uniswap V2 compatible DEX
///         and permanently locks the LP tokens.
/// @dev UUPS upgradeable. Uses ERC-7201 namespaced storage.
contract GraduationManager is
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  ERC-7201 Storage
    // ──────────────────────────────────────────────

    struct GraduationInfo {
        address token;
        address lpPair;
        uint256 ethLiquidity;
        uint256 tokenLiquidity;
        uint256 lpTokensLocked;
        uint256 graduatedAt;
        bool graduated;
    }

    /// @custom:storage-location erc7201:zapp.storage.GraduationManager
    struct GraduationManagerStorage {
        address bondingCurve;          // Only the bonding curve can call onGraduation
        IUniswapV2Router02 dexRouter;  // Uniswap V2 compatible router
        address lpLockAddress;         // Address where LP tokens are locked (burn or lock contract)
        uint256 lpLockDuration;        // Duration for LP lock (0 = permanent burn to dead address)
        mapping(address => GraduationInfo) graduations; // token => graduation info
        address[] graduatedTokens;     // List of graduated tokens
        uint256 burnBps;               // Percentage of remaining tokens to burn (bps, default 10000 = 100%)
    }

    // keccak256(abi.encode(uint256(keccak256("zapp.storage.GraduationManager")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0xb7ccd901d2271396399bbc0e08d54fdc7234de9bce94237a7df2b52e36e43200;

    function _getStorage() private pure returns (GraduationManagerStorage storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /// @dev Permanent lock address — LP tokens sent here are effectively burned.
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event TokenGraduated(
        address indexed token,
        address indexed lpPair,
        uint256 ethLiquidity,
        uint256 tokenLiquidity,
        uint256 lpTokensLocked
    );

    event LiquidityLocked(
        address indexed token,
        address indexed lpPair,
        uint256 lpAmount,
        address lockAddress
    );

    event RemainingTokensBurned(
        address indexed token,
        uint256 amount
    );

    // ──────────────────────────────────────────────
    //  Constructor / Initializer
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the GraduationManager.
    /// @param bondingCurve_ Address of the BondingCurve contract (only caller).
    /// @param dexRouter_ Address of the Uniswap V2 compatible router.
    /// @param lpLockAddress_ Address where LP tokens are sent (dead address for permanent lock).
    /// @param burnBps_ Percentage of remaining bonding curve tokens to burn (10000 = 100%).
    function initialize(
        address bondingCurve_,
        address dexRouter_,
        address lpLockAddress_,
        uint256 burnBps_
    ) external initializer {
        require(bondingCurve_ != address(0), "Zero bonding curve");
        require(dexRouter_ != address(0), "Zero router");
        require(burnBps_ <= 10000, "Burn bps too high");

        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        GraduationManagerStorage storage $ = _getStorage();
        $.bondingCurve = bondingCurve_;
        $.dexRouter = IUniswapV2Router02(dexRouter_);
        $.lpLockAddress = lpLockAddress_ == address(0) ? DEAD_ADDRESS : lpLockAddress_;
        $.burnBps = burnBps_;
    }

    // ──────────────────────────────────────────────
    //  Graduation Callback
    // ──────────────────────────────────────────────

    /// @notice Called by the BondingCurve when a token reaches graduation threshold.
    /// @dev Creates a real DEX liquidity pool and locks the LP tokens.
    /// @param token Address of the graduated token.
    /// @param ethAmount ETH amount for liquidity.
    /// @param tokenAmount Token amount available for liquidity/burn.
    function onGraduation(
        address token,
        uint256 ethAmount,
        uint256 tokenAmount
    ) external nonReentrant {
        GraduationManagerStorage storage $ = _getStorage();
        require(msg.sender == $.bondingCurve, "Only bonding curve");
        require(!$.graduations[token].graduated, "Already graduated");
        require(ethAmount > 0, "No ETH");

        // Calculate how many tokens to burn vs add to liquidity
        uint256 tokensToBurn = tokenAmount * $.burnBps / 10000;
        uint256 tokensForLiquidity = tokenAmount - tokensToBurn;

        // Burn remaining tokens if configured
        if (tokensToBurn > 0) {
            IERC20(token).safeTransfer(DEAD_ADDRESS, tokensToBurn);
            emit RemainingTokensBurned(token, tokensToBurn);
        }

        // Approve router to spend tokens
        if (tokensForLiquidity > 0) {
            IERC20(token).approve(address($.dexRouter), tokensForLiquidity);
        }

        // Add liquidity to the DEX
        uint256 lpTokens = 0;
        address lpPair = address(0);

        if (tokensForLiquidity > 0 && ethAmount > 0) {
            (uint256 amountToken, uint256 amountETH, uint256 liquidity) = $.dexRouter.addLiquidityETH{value: ethAmount}(
                token,
                tokensForLiquidity,
                0,  // Accept any amount of tokens (slippage handled by bonding curve design)
                0,  // Accept any amount of ETH
                address(this), // LP tokens come to this contract first
                block.timestamp + 300
            );

            lpTokens = liquidity;

            // Get the LP pair address
            IUniswapV2Factory factory = IUniswapV2Factory($.dexRouter.factory());
            lpPair = factory.getPair(token, $.dexRouter.WETH());
        }

        // Lock LP tokens permanently
        if (lpTokens > 0 && lpPair != address(0)) {
            IERC20(lpPair).safeTransfer($.lpLockAddress, lpTokens);
            emit LiquidityLocked(token, lpPair, lpTokens, $.lpLockAddress);
        }

        // Record graduation info
        $.graduations[token] = GraduationInfo({
            token: token,
            lpPair: lpPair,
            ethLiquidity: ethAmount,
            tokenLiquidity: tokensForLiquidity,
            lpTokensLocked: lpTokens,
            graduatedAt: block.timestamp,
            graduated: true
        });

        $.graduatedTokens.push(token);

        emit TokenGraduated(token, lpPair, ethAmount, tokensForLiquidity, lpTokens);
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    function getGraduationInfo(address token) external view returns (
        address lpPair,
        uint256 ethLiquidity,
        uint256 tokenLiquidity,
        uint256 lpTokensLocked,
        uint256 graduatedAt,
        bool graduated
    ) {
        GraduationInfo storage info = _getStorage().graduations[token];
        return (
            info.lpPair,
            info.ethLiquidity,
            info.tokenLiquidity,
            info.lpTokensLocked,
            info.graduatedAt,
            info.graduated
        );
    }

    function graduatedTokensLength() external view returns (uint256) {
        return _getStorage().graduatedTokens.length;
    }

    function graduatedTokenAt(uint256 index) external view returns (address) {
        return _getStorage().graduatedTokens[index];
    }

    function bondingCurve() external view returns (address) {
        return _getStorage().bondingCurve;
    }

    function dexRouter() external view returns (address) {
        return address(_getStorage().dexRouter);
    }

    function lpLockAddress() external view returns (address) {
        return _getStorage().lpLockAddress;
    }

    function burnBps() external view returns (uint256) {
        return _getStorage().burnBps;
    }

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    function setBondingCurve(address newBondingCurve) external onlyOwner {
        require(newBondingCurve != address(0), "Zero address");
        _getStorage().bondingCurve = newBondingCurve;
    }

    function setDexRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "Zero address");
        _getStorage().dexRouter = IUniswapV2Router02(newRouter);
    }

    function setLpLockAddress(address newLockAddress) external onlyOwner {
        _getStorage().lpLockAddress = newLockAddress == address(0) ? DEAD_ADDRESS : newLockAddress;
    }

    function setBurnBps(uint256 newBurnBps) external onlyOwner {
        require(newBurnBps <= 10000, "Burn bps too high");
        _getStorage().burnBps = newBurnBps;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @notice Allow contract to receive ETH from bonding curve.
    receive() external payable {}
}
`;
