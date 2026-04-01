export const GOOSE_TOKEN_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title GooseToken — ERC-20 reward token with minter role and buyback burn address
/// @notice Mintable by MasterChef, burnable by anyone. UUPS upgradeable.
/// @dev Features a dedicated burn address for buyback-and-burn mechanism.
contract GooseToken is
    ERC20Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Burn address for buyback mechanism — tokens sent here are permanently removed.
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @custom:storage-location erc7201:zapp.storage.GooseToken
    struct GooseTokenStorage {
        uint256 maxSupply;        // 0 = unlimited (degen default)
        uint256 totalBurned;      // Track total buyback burns for transparency
    }

    // keccak256(abi.encode(uint256(keccak256("zapp.storage.GooseToken")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0x5ca2fb471bd496dc0e9162547859c2fe42fc7f813d822a1100b2700493e05800;

    function _getStorage() private pure returns (GooseTokenStorage storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event BuybackBurn(address indexed from, uint256 amount);
    event MaxSupplyUpdated(uint256 oldMaxSupply, uint256 newMaxSupply);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        address admin_
    ) external initializer {
        __ERC20_init(name_, symbol_);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(MINTER_ROLE, admin_);
    }

    /// @notice Mint new tokens. Only callable by addresses with MINTER_ROLE.
    /// @param to Recipient address.
    /// @param amount Amount of tokens to mint (in wei).
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        GooseTokenStorage storage $ = _getStorage();
        if ($.maxSupply > 0) {
            require(totalSupply() + amount <= $.maxSupply, "Exceeds max supply");
        }
        _mint(to, amount);
    }

    /// @notice Burn tokens from the caller's balance.
    /// @param amount Amount of tokens to burn (in wei).
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        _getStorage().totalBurned += amount;
    }

    /// @notice Buyback and burn — transfer tokens to the dead address.
    /// @dev Used by the fee recipient after swapping deposit fees for the token.
    /// @param amount Amount of tokens to burn via buyback.
    function buybackBurn(uint256 amount) external {
        _transfer(msg.sender, BURN_ADDRESS, amount);
        _getStorage().totalBurned += amount;
        emit BuybackBurn(msg.sender, amount);
    }

    /// @notice Set or update the maximum supply cap. Set to 0 for unlimited.
    /// @param newMaxSupply New max supply value.
    function setMaxSupply(uint256 newMaxSupply) external onlyRole(DEFAULT_ADMIN_ROLE) {
        GooseTokenStorage storage $ = _getStorage();
        emit MaxSupplyUpdated($.maxSupply, newMaxSupply);
        $.maxSupply = newMaxSupply;
    }

    /// @notice Returns the current max supply cap. 0 means unlimited.
    function maxSupply() external view returns (uint256) {
        return _getStorage().maxSupply;
    }

    /// @notice Returns total tokens burned via buyback and direct burn.
    function totalBurned() external view returns (uint256) {
        return _getStorage().totalBurned;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
`;
