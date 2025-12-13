// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockQieOracle
/// @notice Simulates FX price feeds for the prototype environment
contract MockQieOracle is Ownable {
    int256 private price;
    uint8 public immutable decimals;

    event PriceUpdated(int256 indexed newPrice, uint256 timestamp);

    constructor(int256 initialPrice, uint8 initialDecimals) Ownable(msg.sender) {
        price = initialPrice;
        decimals = initialDecimals;
    }

    /// @notice Returns the latest mocked price
    function getPrice() external view returns (int256) {
        return price;
    }

    /// @notice Update price (owner only)
    function setPrice(int256 newPrice) external onlyOwner {
        price = newPrice;
        emit PriceUpdated(newPrice, block.timestamp);
    }
}
