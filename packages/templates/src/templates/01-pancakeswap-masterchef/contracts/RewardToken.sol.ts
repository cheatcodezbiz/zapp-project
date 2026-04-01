export const REWARD_TOKEN_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title RewardToken — ERC-20 reward token with minter role
/// @notice Mintable by MasterChef, burnable by anyone. UUPS upgradeable.
contract RewardToken is
    ERC20Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @custom:storage-location erc7201:zapp.storage.RewardToken
    struct RewardTokenStorage {
        uint256 maxSupply; // 0 = unlimited (degen default)
    }

    // keccak256(abi.encode(uint256(keccak256("zapp.storage.RewardToken")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0x597982b5da313acb3374c877defafc02ce91cf5686aacf6aba84d7c50b2f6800;

    function _getStorage() private pure returns (RewardTokenStorage storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

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
        RewardTokenStorage storage $ = _getStorage();
        if ($.maxSupply > 0) {
            require(totalSupply() + amount <= $.maxSupply, "Exceeds max supply");
        }
        _mint(to, amount);
    }

    /// @notice Burn tokens from the caller's balance.
    /// @param amount Amount of tokens to burn (in wei).
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Set or update the maximum supply cap. Set to 0 for unlimited.
    /// @param newMaxSupply New max supply value.
    function setMaxSupply(uint256 newMaxSupply) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _getStorage().maxSupply = newMaxSupply;
    }

    /// @notice Returns the current max supply cap. 0 means unlimited.
    function maxSupply() external view returns (uint256) {
        return _getStorage().maxSupply;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
`;
