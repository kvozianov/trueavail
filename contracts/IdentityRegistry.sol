// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract IdentityRegistry {
    address public owner;

    mapping(address wallet => bytes32 companyId) public companyOf;
    mapping(address wallet => bool approved) public approvedWallet;

    event WalletApproved(address indexed wallet, bytes32 indexed companyId);
    event WalletRemoved(address indexed wallet, bytes32 indexed companyId);

    modifier onlyOwner() {
        require(msg.sender == owner, "IdentityRegistry: only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addWallet(address wallet, bytes32 companyId) external onlyOwner {
        require(wallet != address(0), "IdentityRegistry: zero wallet");
        require(companyId != bytes32(0), "IdentityRegistry: empty company");

        companyOf[wallet] = companyId;
        approvedWallet[wallet] = true;

        emit WalletApproved(wallet, companyId);
    }

    function removeWallet(address wallet) external onlyOwner {
        bytes32 companyId = companyOf[wallet];

        approvedWallet[wallet] = false;
        companyOf[wallet] = bytes32(0);

        emit WalletRemoved(wallet, companyId);
    }

    function isApprovedForCompany(address wallet, bytes32 companyId) external view returns (bool) {
        return approvedWallet[wallet] && companyOf[wallet] == companyId;
    }
}
