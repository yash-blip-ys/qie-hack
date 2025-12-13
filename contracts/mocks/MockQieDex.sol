// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Simplified mock of a QIEDEX pair used for demo swaps
contract MockQieDex {
    IERC20 public immutable qusd;

    event SwapExecuted(address indexed sender, address indexed recipient, uint256 amountIn, uint256 amountOut);

    constructor(address qusdAddress) {
        qusd = IERC20(qusdAddress);
    }

    /// @notice Executes a mock swap that simply forwards QUSD to the recipient
    function simulateSwap(address recipient, uint256 amountIn) external returns (uint256 amountOut) {
        require(amountIn > 0, "MockQieDex: amount must be greater than 0");
        bool success = qusd.transferFrom(msg.sender, recipient, amountIn);
        require(success, "MockQieDex: transfer failed");
        emit SwapExecuted(msg.sender, recipient, amountIn, amountIn);
        return amountIn;
    }
}
