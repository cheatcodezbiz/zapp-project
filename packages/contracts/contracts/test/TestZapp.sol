// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ZappBaseUpgradeable} from "../ZappBaseUpgradeable.sol";

/// @dev Minimal concrete implementation of ZappBaseUpgradeable for testing.
contract TestZapp is ZappBaseUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory dappId_,
        address admin_,
        address upgrader_
    ) external initializer {
        __ZappBase_init(dappId_, admin_, upgrader_);
    }
}

/// @dev V2 implementation used to test the upgrade path.
contract TestZappV2 is ZappBaseUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory dappId_,
        address admin_,
        address upgrader_
    ) external initializer {
        __ZappBase_init(dappId_, admin_, upgrader_);
    }

    function v2Feature() external pure returns (string memory) {
        return "v2";
    }
}
