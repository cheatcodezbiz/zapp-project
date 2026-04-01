export const BONDING_CURVE_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title BondingCurve — Virtual AMM bonding curve for token trading
/// @notice Tokens trade on a bonding curve until reaching graduation market cap,
///         then automatically migrate to a real DEX with locked liquidity.
/// @dev 1% platform fee on all trades. UUPS upgradeable.
contract BondingCurve is
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────

    uint256 public constant PRECISION = 1e18;
    uint16 public constant MAX_PLATFORM_FEE = 100; // 1% max

    // ──────────────────────────────────────────────
    //  Enums
    // ──────────────────────────────────────────────

    enum CurveType {
        LINEAR,
        EXPONENTIAL
    }

    // ──────────────────────────────────────────────
    //  ERC-7201 Storage
    // ──────────────────────────────────────────────

    struct TokenCurve {
        address token;
        uint256 virtualTokenReserve;  // Virtual token reserve for pricing
        uint256 virtualEthReserve;    // Virtual ETH reserve for pricing
        uint256 totalRaised;          // Total ETH raised for this token
        uint256 totalSupplySold;      // Total tokens sold via the curve
        uint256 initialSupply;        // Initial supply allocated to the curve
        bool graduated;               // Whether token has graduated to DEX
        address creator;              // Token creator address
    }

    /// @custom:storage-location erc7201:zapp.storage.BondingCurve
    struct BondingCurveStorage {
        CurveType curveType;
        uint256 basePrice;             // Base price in wei per token
        uint256 slope;                 // Price increase per token sold
        uint256 graduationThreshold;   // ETH threshold for graduation (in wei)
        uint16 platformFeeBps;         // Platform fee in basis points
        address platformFeeRecipient;  // Address receiving platform fees
        address graduationManager;     // GraduationManager contract address
        mapping(address => TokenCurve) curves; // token address => curve data
        address[] allTokens;           // List of all token addresses
    }

    // keccak256(abi.encode(uint256(keccak256("zapp.storage.BondingCurve")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0xb04797626d5db1485ffdad08a6b46771555821116176a3abf5c3bae4dcc23100;

    function _getStorage() private pure returns (BondingCurveStorage storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event TokenBought(
        address indexed token,
        address indexed buyer,
        uint256 ethIn,
        uint256 tokensOut,
        uint256 fee,
        uint256 newPrice
    );

    event TokenSold(
        address indexed token,
        address indexed seller,
        uint256 tokensIn,
        uint256 ethOut,
        uint256 fee,
        uint256 newPrice
    );

    event TokenGraduated(
        address indexed token,
        uint256 totalRaised,
        uint256 totalSupplySold
    );

    event CurveRegistered(
        address indexed token,
        address indexed creator,
        uint256 initialSupply
    );

    // ──────────────────────────────────────────────
    //  Constructor / Initializer
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the BondingCurve contract.
    /// @param curveType_ LINEAR or EXPONENTIAL bonding curve.
    /// @param basePrice_ Base price in wei per token unit.
    /// @param slope_ Price increase factor.
    /// @param graduationThreshold_ ETH raised threshold for graduation (in wei).
    /// @param platformFeeBps_ Platform fee in basis points (max 100 = 1%).
    /// @param platformFeeRecipient_ Address receiving platform fees.
    /// @param graduationManager_ GraduationManager contract address.
    function initialize(
        CurveType curveType_,
        uint256 basePrice_,
        uint256 slope_,
        uint256 graduationThreshold_,
        uint16 platformFeeBps_,
        address platformFeeRecipient_,
        address graduationManager_
    ) external initializer {
        require(platformFeeBps_ <= MAX_PLATFORM_FEE, "Fee too high");
        require(platformFeeRecipient_ != address(0), "Zero fee recipient");
        require(graduationManager_ != address(0), "Zero graduation manager");

        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        BondingCurveStorage storage $ = _getStorage();
        $.curveType = curveType_;
        $.basePrice = basePrice_;
        $.slope = slope_;
        $.graduationThreshold = graduationThreshold_;
        $.platformFeeBps = platformFeeBps_;
        $.platformFeeRecipient = platformFeeRecipient_;
        $.graduationManager = graduationManager_;
    }

    // ──────────────────────────────────────────────
    //  Curve Registration (called by TokenFactory)
    // ──────────────────────────────────────────────

    /// @notice Register a new token on the bonding curve. Called by TokenFactory.
    /// @param token Address of the token.
    /// @param initialSupply Total supply allocated to the bonding curve.
    /// @param creator Address of the token creator.
    function registerToken(
        address token,
        uint256 initialSupply,
        address creator
    ) external {
        BondingCurveStorage storage $ = _getStorage();
        require($.curves[token].token == address(0), "Already registered");

        // Initialize virtual reserves for the constant-product formula
        // Virtual token reserve = initial supply
        // Virtual ETH reserve = base price * initial supply / PRECISION
        uint256 virtualEth = $.basePrice * initialSupply / PRECISION;
        if (virtualEth == 0) virtualEth = 1 ether; // Minimum 1 ETH virtual reserve

        $.curves[token] = TokenCurve({
            token: token,
            virtualTokenReserve: initialSupply,
            virtualEthReserve: virtualEth,
            totalRaised: 0,
            totalSupplySold: 0,
            initialSupply: initialSupply,
            graduated: false,
            creator: creator
        });

        $.allTokens.push(token);

        emit CurveRegistered(token, creator, initialSupply);
    }

    // ──────────────────────────────────────────────
    //  Trading Functions
    // ──────────────────────────────────────────────

    /// @notice Buy tokens with ETH via the bonding curve.
    /// @param token Address of the token to buy.
    /// @param minTokensOut Minimum tokens expected (slippage protection).
    function buy(address token, uint256 minTokensOut) external payable nonReentrant {
        BondingCurveStorage storage $ = _getStorage();
        TokenCurve storage curve = $.curves[token];
        require(curve.token != address(0), "Token not registered");
        require(!curve.graduated, "Token already graduated");
        require(msg.value > 0, "Zero ETH sent");

        // Calculate platform fee
        uint256 fee = msg.value * $.platformFeeBps / 10000;
        uint256 ethAfterFee = msg.value - fee;

        // Calculate tokens to output using virtual AMM
        uint256 tokensOut = _getTokensForEth(curve, ethAfterFee);
        require(tokensOut >= minTokensOut, "Slippage exceeded");
        require(tokensOut <= curve.virtualTokenReserve, "Insufficient curve supply");

        // Update curve state
        curve.virtualEthReserve += ethAfterFee;
        curve.virtualTokenReserve -= tokensOut;
        curve.totalRaised += ethAfterFee;
        curve.totalSupplySold += tokensOut;

        // Transfer platform fee
        if (fee > 0) {
            (bool feeSuccess, ) = $.platformFeeRecipient.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }

        // Transfer tokens to buyer
        IERC20(token).safeTransfer(msg.sender, tokensOut);

        uint256 newPrice = getCurrentPrice(token);
        emit TokenBought(token, msg.sender, msg.value, tokensOut, fee, newPrice);

        // Check graduation
        if (curve.totalRaised >= $.graduationThreshold) {
            _graduate(token);
        }
    }

    /// @notice Sell tokens back to the bonding curve for ETH.
    /// @param token Address of the token to sell.
    /// @param tokenAmount Amount of tokens to sell.
    /// @param minEthOut Minimum ETH expected (slippage protection).
    function sell(address token, uint256 tokenAmount, uint256 minEthOut) external nonReentrant {
        BondingCurveStorage storage $ = _getStorage();
        TokenCurve storage curve = $.curves[token];
        require(curve.token != address(0), "Token not registered");
        require(!curve.graduated, "Token already graduated");
        require(tokenAmount > 0, "Zero tokens");

        // Calculate ETH output using virtual AMM
        uint256 ethOut = _getEthForTokens(curve, tokenAmount);

        // Calculate platform fee
        uint256 fee = ethOut * $.platformFeeBps / 10000;
        uint256 ethAfterFee = ethOut - fee;

        require(ethAfterFee >= minEthOut, "Slippage exceeded");
        require(ethAfterFee <= address(this).balance, "Insufficient ETH in curve");

        // Transfer tokens from seller to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);

        // Update curve state
        curve.virtualTokenReserve += tokenAmount;
        curve.virtualEthReserve -= ethOut;
        curve.totalRaised -= ethOut;
        curve.totalSupplySold -= tokenAmount;

        // Transfer platform fee
        if (fee > 0) {
            (bool feeSuccess, ) = $.platformFeeRecipient.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }

        // Transfer ETH to seller
        (bool success, ) = msg.sender.call{value: ethAfterFee}("");
        require(success, "ETH transfer failed");

        uint256 newPrice = getCurrentPrice(token);
        emit TokenSold(token, msg.sender, tokenAmount, ethAfterFee, fee, newPrice);
    }

    // ──────────────────────────────────────────────
    //  Price Calculation
    // ──────────────────────────────────────────────

    /// @notice Get the current price of a token in ETH (per 1e18 tokens).
    function getCurrentPrice(address token) public view returns (uint256) {
        BondingCurveStorage storage $ = _getStorage();
        TokenCurve storage curve = $.curves[token];
        if (curve.token == address(0) || curve.virtualTokenReserve == 0) return 0;

        if ($.curveType == CurveType.LINEAR) {
            // Linear: price = basePrice + (totalSupplySold * slope / PRECISION)
            return $.basePrice + (curve.totalSupplySold * $.slope / PRECISION);
        } else {
            // Exponential (constant product): price = virtualEthReserve / virtualTokenReserve * PRECISION
            return curve.virtualEthReserve * PRECISION / curve.virtualTokenReserve;
        }
    }

    /// @notice Estimate tokens received for a given ETH input.
    function getEstimatedTokensOut(address token, uint256 ethIn) external view returns (uint256) {
        BondingCurveStorage storage $ = _getStorage();
        TokenCurve storage curve = $.curves[token];
        require(curve.token != address(0), "Token not registered");

        uint256 fee = ethIn * $.platformFeeBps / 10000;
        return _getTokensForEth(curve, ethIn - fee);
    }

    /// @notice Estimate ETH received for a given token input.
    function getEstimatedEthOut(address token, uint256 tokenAmount) external view returns (uint256) {
        BondingCurveStorage storage $ = _getStorage();
        TokenCurve storage curve = $.curves[token];
        require(curve.token != address(0), "Token not registered");

        uint256 ethOut = _getEthForTokens(curve, tokenAmount);
        uint256 fee = ethOut * $.platformFeeBps / 10000;
        return ethOut - fee;
    }

    function _getTokensForEth(TokenCurve storage curve, uint256 ethIn) internal view returns (uint256) {
        // Constant product formula: x * y = k
        // tokensOut = virtualTokenReserve - (k / (virtualEthReserve + ethIn))
        uint256 k = curve.virtualTokenReserve * curve.virtualEthReserve;
        uint256 newEthReserve = curve.virtualEthReserve + ethIn;
        uint256 newTokenReserve = k / newEthReserve;
        return curve.virtualTokenReserve - newTokenReserve;
    }

    function _getEthForTokens(TokenCurve storage curve, uint256 tokenAmount) internal view returns (uint256) {
        // Constant product formula: x * y = k
        // ethOut = virtualEthReserve - (k / (virtualTokenReserve + tokenAmount))
        uint256 k = curve.virtualTokenReserve * curve.virtualEthReserve;
        uint256 newTokenReserve = curve.virtualTokenReserve + tokenAmount;
        uint256 newEthReserve = k / newTokenReserve;
        return curve.virtualEthReserve - newEthReserve;
    }

    // ──────────────────────────────────────────────
    //  Graduation
    // ──────────────────────────────────────────────

    function _graduate(address token) internal {
        BondingCurveStorage storage $ = _getStorage();
        TokenCurve storage curve = $.curves[token];
        curve.graduated = true;

        emit TokenGraduated(token, curve.totalRaised, curve.totalSupplySold);

        // Transfer remaining tokens and ETH to the graduation manager
        uint256 remainingTokens = IERC20(token).balanceOf(address(this));
        if (remainingTokens > 0) {
            IERC20(token).safeTransfer($.graduationManager, remainingTokens);
        }

        uint256 ethForLiquidity = curve.totalRaised;
        if (ethForLiquidity > 0) {
            (bool success, ) = $.graduationManager.call{value: ethForLiquidity}("");
            require(success, "ETH transfer to graduation manager failed");
        }

        // Notify graduation manager
        IGraduationManager($.graduationManager).onGraduation(
            token,
            ethForLiquidity,
            remainingTokens
        );
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    function getTokenCurve(address token) external view returns (
        uint256 virtualTokenReserve,
        uint256 virtualEthReserve,
        uint256 totalRaised,
        uint256 totalSupplySold,
        uint256 initialSupply,
        bool graduated,
        address creator
    ) {
        TokenCurve storage curve = _getStorage().curves[token];
        return (
            curve.virtualTokenReserve,
            curve.virtualEthReserve,
            curve.totalRaised,
            curve.totalSupplySold,
            curve.initialSupply,
            curve.graduated,
            curve.creator
        );
    }

    function graduationThreshold() external view returns (uint256) {
        return _getStorage().graduationThreshold;
    }

    function platformFeeBps() external view returns (uint16) {
        return _getStorage().platformFeeBps;
    }

    function allTokensLength() external view returns (uint256) {
        return _getStorage().allTokens.length;
    }

    function allTokens(uint256 index) external view returns (address) {
        return _getStorage().allTokens[index];
    }

    function graduationProgress(address token) external view returns (uint256) {
        BondingCurveStorage storage $ = _getStorage();
        TokenCurve storage curve = $.curves[token];
        if ($.graduationThreshold == 0) return 0;
        if (curve.totalRaised >= $.graduationThreshold) return 10000; // 100%
        return curve.totalRaised * 10000 / $.graduationThreshold;
    }

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    function setGraduationThreshold(uint256 newThreshold) external onlyOwner {
        _getStorage().graduationThreshold = newThreshold;
    }

    function setPlatformFeeBps(uint16 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_PLATFORM_FEE, "Fee too high");
        _getStorage().platformFeeBps = newFeeBps;
    }

    function setPlatformFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Zero address");
        _getStorage().platformFeeRecipient = newRecipient;
    }

    function setGraduationManager(address newManager) external onlyOwner {
        require(newManager != address(0), "Zero address");
        _getStorage().graduationManager = newManager;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @notice Allow contract to receive ETH (for sells).
    receive() external payable {}
}

interface IGraduationManager {
    function onGraduation(address token, uint256 ethAmount, uint256 tokenAmount) external;
}
`;
