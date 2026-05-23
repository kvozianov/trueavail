// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentityRegistry {
    function approvedWallet(address wallet) external view returns (bool);
    function companyOf(address wallet) external view returns (bytes32);
}

contract CorporateLiquidity {
    IIdentityRegistry public immutable identityRegistry;

    event LiquidityTransferred(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 indexed encryptedMemo,
        bytes32 companyId
    );

    constructor(address registryAddress) {
        require(registryAddress != address(0), "CorporateLiquidity: zero registry");
        identityRegistry = IIdentityRegistry(registryAddress);
    }

    function transferLiquidity(address payable to, uint256 amount, bytes32 encryptedMemo) external payable {
        require(to != address(0), "CorporateLiquidity: zero recipient");
        require(amount > 0, "CorporateLiquidity: zero amount");
        require(msg.value == amount, "CorporateLiquidity: amount must equal msg.value");
        require(encryptedMemo != bytes32(0), "CorporateLiquidity: empty memo");

        bytes32 senderCompany = identityRegistry.companyOf(msg.sender);
        bytes32 recipientCompany = identityRegistry.companyOf(to);

        require(senderCompany != bytes32(0), "CorporateLiquidity: sender not registered");
        require(senderCompany == recipientCompany, "CorporateLiquidity: company mismatch");
        require(identityRegistry.approvedWallet(msg.sender), "CorporateLiquidity: sender not approved");
        require(identityRegistry.approvedWallet(to), "CorporateLiquidity: recipient not approved");

        (bool sent, ) = to.call{value: amount}("");
        require(sent, "CorporateLiquidity: native transfer failed");

        emit LiquidityTransferred(msg.sender, to, amount, encryptedMemo, senderCompany);
    }
}
