export const TOKEN_FACTORY_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title LaunchToken — Standard ERC-20 with fixed supply, deployed by TokenFactory
/// @notice Fair launch token: entire supply goes to the bonding curve. 0% creator allocation.
contract LaunchToken is ERC20 {
    string private _imageUri;
    string private _description;
    address public immutable creator;
    uint256 public immutable createdAt;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory description_,
        string memory imageUri_,
        uint256 totalSupply_,
        address bondingCurve_,
        address creator_
    ) ERC20(name_, symbol_) {
        _description = description_;
        _imageUri = imageUri_;
        creator = creator_;
        createdAt = block.timestamp;

        // Fair launch: ALL tokens go to the bonding curve. 0% creator allocation.
        _mint(bondingCurve_, totalSupply_);
    }

    function imageUri() external view returns (string memory) {
        return _imageUri;
    }

    function description() external view returns (string memory) {
        return _description;
    }
}

interface IBondingCurve {
    function registerToken(address token, uint256 initialSupply, address creator) external;
}

/// @title TokenFactory — Permissionless token creation for the launchpad
/// @notice Anyone can create a new token that immediately trades on the bonding curve.
/// @dev UUPS upgradeable. Uses ERC-7201 namespaced storage.
contract TokenFactory is
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ──────────────────────────────────────────────
    //  ERC-7201 Storage
    // ──────────────────────────────────────────────

    /// @custom:storage-location erc7201:zapp.storage.TokenFactory
    struct TokenFactoryStorage {
        address bondingCurve;        // BondingCurve contract address
        uint256 creationFee;         // Fee to create a token (in wei)
        uint256 defaultTotalSupply;  // Default total supply for new tokens
        address feeRecipient;        // Address receiving creation fees
        address[] deployedTokens;    // All deployed token addresses
        mapping(address => address[]) creatorTokens; // creator => their tokens
    }

    // keccak256(abi.encode(uint256(keccak256("zapp.storage.TokenFactory")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0xd11ede83e63f0d724a70b13aaf064ec36c677879f0ba6b8922d1d6fc15061200;

    function _getStorage() private pure returns (TokenFactoryStorage storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        string description,
        string imageUri,
        uint256 totalSupply
    );

    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event DefaultSupplyUpdated(uint256 oldSupply, uint256 newSupply);

    // ──────────────────────────────────────────────
    //  Constructor / Initializer
    // ──────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the TokenFactory contract.
    /// @param bondingCurve_ Address of the BondingCurve contract.
    /// @param creationFee_ Fee to create a token (in wei).
    /// @param defaultTotalSupply_ Default total supply for new tokens.
    /// @param feeRecipient_ Address receiving creation fees.
    function initialize(
        address bondingCurve_,
        uint256 creationFee_,
        uint256 defaultTotalSupply_,
        address feeRecipient_
    ) external initializer {
        require(bondingCurve_ != address(0), "Zero bonding curve");
        require(feeRecipient_ != address(0), "Zero fee recipient");
        require(defaultTotalSupply_ > 0, "Zero supply");

        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        TokenFactoryStorage storage $ = _getStorage();
        $.bondingCurve = bondingCurve_;
        $.creationFee = creationFee_;
        $.defaultTotalSupply = defaultTotalSupply_;
        $.feeRecipient = feeRecipient_;
    }

    // ──────────────────────────────────────────────
    //  Token Creation
    // ──────────────────────────────────────────────

    /// @notice Create a new token that immediately trades on the bonding curve.
    /// @dev Permissionless — anyone can create a token by paying the creation fee.
    /// @param name Token name (e.g. "Doge Coin").
    /// @param symbol Token symbol (e.g. "DOGE").
    /// @param description Token description / pitch.
    /// @param imageUri URI to the token's image (IPFS or HTTP).
    /// @return token Address of the deployed token.
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata description,
        string calldata imageUri
    ) external payable nonReentrant returns (address token) {
        TokenFactoryStorage storage $ = _getStorage();
        require(msg.value >= $.creationFee, "Insufficient creation fee");

        // Transfer creation fee to fee recipient
        if ($.creationFee > 0) {
            (bool feeSuccess, ) = $.feeRecipient.call{value: $.creationFee}("");
            require(feeSuccess, "Fee transfer failed");
        }

        // Refund excess ETH
        uint256 excess = msg.value - $.creationFee;
        if (excess > 0) {
            (bool refundSuccess, ) = msg.sender.call{value: excess}("");
            require(refundSuccess, "Refund failed");
        }

        // Deploy the token — ALL supply goes to the bonding curve (fair launch)
        uint256 totalSupply = $.defaultTotalSupply;
        LaunchToken newToken = new LaunchToken(
            name,
            symbol,
            description,
            imageUri,
            totalSupply,
            $.bondingCurve,
            msg.sender
        );

        token = address(newToken);

        // Register the token on the bonding curve
        IBondingCurve($.bondingCurve).registerToken(token, totalSupply, msg.sender);

        // Track the token
        $.deployedTokens.push(token);
        $.creatorTokens[msg.sender].push(token);

        emit TokenCreated(token, msg.sender, name, symbol, description, imageUri, totalSupply);
    }

    // ──────────────────────────────────────────────
    //  View Functions
    // ──────────────────────────────────────────────

    function bondingCurve() external view returns (address) {
        return _getStorage().bondingCurve;
    }

    function creationFee() external view returns (uint256) {
        return _getStorage().creationFee;
    }

    function defaultTotalSupply() external view returns (uint256) {
        return _getStorage().defaultTotalSupply;
    }

    function deployedTokensLength() external view returns (uint256) {
        return _getStorage().deployedTokens.length;
    }

    function deployedTokenAt(uint256 index) external view returns (address) {
        return _getStorage().deployedTokens[index];
    }

    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return _getStorage().creatorTokens[creator];
    }

    // ──────────────────────────────────────────────
    //  Admin Functions
    // ──────────────────────────────────────────────

    function setCreationFee(uint256 newFee) external onlyOwner {
        TokenFactoryStorage storage $ = _getStorage();
        emit CreationFeeUpdated($.creationFee, newFee);
        $.creationFee = newFee;
    }

    function setDefaultTotalSupply(uint256 newSupply) external onlyOwner {
        require(newSupply > 0, "Zero supply");
        TokenFactoryStorage storage $ = _getStorage();
        emit DefaultSupplyUpdated($.defaultTotalSupply, newSupply);
        $.defaultTotalSupply = newSupply;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Zero address");
        _getStorage().feeRecipient = newRecipient;
    }

    function setBondingCurve(address newCurve) external onlyOwner {
        require(newCurve != address(0), "Zero address");
        _getStorage().bondingCurve = newCurve;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
`;
