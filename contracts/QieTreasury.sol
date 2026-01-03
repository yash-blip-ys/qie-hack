// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./QUSD.sol";
import "./mocks/MockQieOracle.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title QieTreasury
 * @notice Core contract for QieRemit - handles deposits, swaps, and cross-border transfers
 */
contract QieTreasury is Ownable {
    QUSD public immutable qusdToken;
    MockQieOracle public oracle;
    
    // Exchange rate: Determined by Oracle
    
    event CrossBorderFulfillmentRequested(
        address indexed sender,
        address indexed recipient,
        uint256 amountQUSD,
        string targetCurrency,
        uint256 timestamp
    );

    event NativeDeposited(
        address indexed depositor,
        uint256 amountQIE,
        uint256 amountQUSD
    );

    constructor(address _qusdToken, address _oracle, address initialOwner) Ownable(initialOwner) {
        qusdToken = QUSD(_qusdToken);
        oracle = MockQieOracle(_oracle);
    }

    /**
     * @notice Deposit native QIE coin and receive QUSD tokens
     * @dev Mints QUSD based on Oracle rate
     */
    function depositNativeForStable() external payable {
        require(msg.value > 0, "QieTreasury: Must send QIE");
        
        int256 price = oracle.getPrice();
        require(price > 0, "QieTreasury: Invalid oracle price");
        
        // Calculate QUSD amount: (amountQIE * price) / 1e18
        // Price is assumed to be 18 decimals (e.g., 1 QIE = $1.50 => 1.5e18)
        uint256 qusdAmount = (msg.value * uint256(price)) / 1e18;
        
        // Mint QUSD to sender
        qusdToken.mint(msg.sender, qusdAmount);
        
        emit NativeDeposited(msg.sender, msg.value, qusdAmount);
    }

    /**
     * @notice Execute a cross-border transfer request
     * @param recipient Address of the recipient (can be on another chain/network)
     * @param amountQUSD Amount of QUSD to transfer
     * @param targetCurrency Target currency code (e.g., "USD", "EUR", "INR")
     */
    function executeCrossBorderTransfer(
        address recipient,
        uint256 amountQUSD,
        string calldata targetCurrency
    ) external {
        require(amountQUSD > 0, "QieTreasury: Amount must be greater than 0");
        require(recipient != address(0), "QieTreasury: Invalid recipient");
        
        // Burn QUSD from sender
        qusdToken.burn(msg.sender, amountQUSD);
        
        // Emit event for off-chain oracle to process
        emit CrossBorderFulfillmentRequested(
            msg.sender,
            recipient,
            amountQUSD,
            targetCurrency,
            block.timestamp
        );
    }

    /**
     * @notice Withdraw native QIE from treasury (owner only)
     * @param to Address to send QIE to
     * @param amount Amount of QIE to withdraw
     */
    function withdrawNative(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "QieTreasury: Invalid address");
        require(address(this).balance >= amount, "QieTreasury: Insufficient balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "QieTreasury: Transfer failed");
    }

    // Allow contract to receive native QIE
    receive() external payable {
        // Accept native QIE deposits
    }
}

