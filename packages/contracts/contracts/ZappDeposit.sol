// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title ZappDeposit
/// @notice Accepts ETH and ERC-20 deposits, forwards funds to a treasury, and emits
///         credit-purchase events consumed by the Zapp platform backend.
contract ZappDeposit is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuard,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Emitted when a user deposits funds and receives platform credits.
    /// @param user     The depositor address.
    /// @param token    The token address (address(0) for native ETH).
    /// @param amount   The raw token amount deposited.
    /// @param usdCents Off-chain USD-cent value attributed to this deposit.
    event CreditsPurchased(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 usdCents
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    /// @custom:storage-location erc7201:zapp.storage.Deposit
    struct DepositStorage {
        address treasury;
        uint256 feeBps; // basis points, e.g. 750 = 7.5%
    }

    // keccak256(abi.encode(uint256(keccak256("zapp.storage.Deposit")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant DEPOSIT_STORAGE_LOCATION =
        0x5033c57149b83f1c7f342865ca8b39ed9e8f46c51e2c36a936891e2c0c83a600;

    function _getDepositStorage() private pure returns (DepositStorage storage $) {
        assembly {
            $.slot := DEPOSIT_STORAGE_LOCATION
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the deposit contract.
    /// @param admin_    Address that receives DEFAULT_ADMIN_ROLE.
    /// @param upgrader_ Address that receives UPGRADER_ROLE.
    /// @param treasury_ Address (e.g. Gnosis Safe) that receives forwarded funds.
    /// @param feeBps_   Platform fee in basis points (750 = 7.5%).
    function initialize(
        address admin_,
        address upgrader_,
        address treasury_,
        uint256 feeBps_
    ) external initializer {
        require(treasury_ != address(0), "ZappDeposit: zero treasury");
        require(feeBps_ <= 10_000, "ZappDeposit: fee exceeds 100%");

        __AccessControl_init();
        // ReentrancyGuard uses transient storage in OZ 5.x — no init needed
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, upgrader_);

        DepositStorage storage $ = _getDepositStorage();
        $.treasury = treasury_;
        $.feeBps = feeBps_;
    }

    // -------------------------------------------------------------------------
    // Deposit functions
    // -------------------------------------------------------------------------

    /// @notice Deposit native ETH in exchange for platform credits.
    /// @param usdCents The USD-cent credit value attributed by the backend.
    function depositETH(
        uint256 usdCents
    ) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "ZappDeposit: zero value");
        require(usdCents > 0, "ZappDeposit: zero credits");

        DepositStorage storage $ = _getDepositStorage();

        (bool sent, ) = $.treasury.call{value: msg.value}("");
        require(sent, "ZappDeposit: ETH transfer failed");

        emit CreditsPurchased(msg.sender, address(0), msg.value, usdCents);
    }

    /// @notice Deposit an ERC-20 token in exchange for platform credits.
    /// @param token    The ERC-20 token address.
    /// @param amount   The amount of tokens to deposit.
    /// @param usdCents The USD-cent credit value attributed by the backend.
    function depositToken(
        address token,
        uint256 amount,
        uint256 usdCents
    ) external nonReentrant whenNotPaused {
        require(token != address(0), "ZappDeposit: zero token address");
        require(amount > 0, "ZappDeposit: zero amount");
        require(usdCents > 0, "ZappDeposit: zero credits");

        DepositStorage storage $ = _getDepositStorage();

        IERC20(token).safeTransferFrom(msg.sender, $.treasury, amount);

        emit CreditsPurchased(msg.sender, token, amount, usdCents);
    }

    // -------------------------------------------------------------------------
    // Admin functions
    // -------------------------------------------------------------------------

    /// @notice Update the treasury address. Only callable by DEFAULT_ADMIN_ROLE.
    function setTreasury(
        address newTreasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "ZappDeposit: zero treasury");
        DepositStorage storage $ = _getDepositStorage();
        address old = $.treasury;
        $.treasury = newTreasury;
        emit TreasuryUpdated(old, newTreasury);
    }

    /// @notice Update the platform fee. Only callable by DEFAULT_ADMIN_ROLE.
    /// @param newFeeBps New fee in basis points (max 10000).
    function setFee(
        uint256 newFeeBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= 10_000, "ZappDeposit: fee exceeds 100%");
        DepositStorage storage $ = _getDepositStorage();
        uint256 old = $.feeBps;
        $.feeBps = newFeeBps;
        emit FeeUpdated(old, newFeeBps);
    }

    /// @notice Pause deposits. Only callable by DEFAULT_ADMIN_ROLE.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause deposits. Only callable by DEFAULT_ADMIN_ROLE.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    /// @notice Returns the current treasury address.
    function treasury() external view returns (address) {
        return _getDepositStorage().treasury;
    }

    /// @notice Returns the current fee in basis points.
    function feeBps() external view returns (uint256) {
        return _getDepositStorage().feeBps;
    }

    /// @dev Restricts upgrades to UPGRADER_ROLE.
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
