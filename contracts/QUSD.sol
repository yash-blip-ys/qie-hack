// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title QUSD - Qie Stable USD
 * @notice ERC20 stablecoin pegged to USD, mintable/burnable by Treasury contract
 */
contract QUSD is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Qie Stable USD", "QUSD") Ownable(initialOwner) {}

    /**
     * @notice Mint QUSD tokens (only owner/Treasury can call)
     * @param to Address to mint tokens to
     * @param amount Amount of QUSD to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Burn QUSD tokens (only owner/Treasury can call)
     * @param from Address to burn tokens from
     * @param amount Amount of QUSD to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

