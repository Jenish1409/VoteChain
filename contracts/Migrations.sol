// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Migrations
 * @notice Standard Truffle Migrations contract for tracking deployment history on Ganache.
 */
contract Migrations {
    address public owner = msg.sender;
    uint256 public last_completed_migration;

    modifier restricted() {
        require(
            msg.sender == owner,
            "Migrations: This function is restricted to the contract's owner"
        );
        _;
    }

    function setCompleted(uint256 completed) public restricted {
        last_completed_migration = completed;
    }
}
