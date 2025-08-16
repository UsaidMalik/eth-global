// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPYUSD
 * @dev Mock PYUSD token for testing purposes
 * @notice This is a test token that mimics PYUSD behavior for development
 */
contract MockPYUSD is ERC20, Ownable {
    uint8 private constant DECIMALS = 6; // PYUSD uses 6 decimals
    
    constructor() ERC20("PayPal USD (Mock)", "PYUSD") Ownable(msg.sender) {
        // Mint initial supply to deployer (100M tokens)
        _mint(msg.sender, 100_000_000 * 10**DECIMALS);
    }
    
    /**
     * @dev Returns the number of decimals used by the token
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @dev Mint tokens to a specific address (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from a specific address (only owner)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
    
    /**
     * @dev Faucet function for testing - allows anyone to mint small amounts
     * @param amount Amount to mint (max 1000 PYUSD per call)
     */
    function faucet(uint256 amount) external {
        require(amount <= 1000 * 10**DECIMALS, "Amount exceeds faucet limit");
        _mint(msg.sender, amount);
    }
}