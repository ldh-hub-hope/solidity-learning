// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// 9주차: access control module - abstract contract
// owner / manager 한 명씩을 관리하는 공통 접근제어 모듈 (MyToken 에서 상속)
abstract contract ManagedAccess {
    address public owner;
    address public manager;

    constructor(address _owner, address _manager) {
        owner = _owner;
        manager = _manager;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not authorized");
        _;
    }

    modifier onlyManager() {
        require(
            msg.sender == manager,
            "You are not authorized to manage this contract"
        );
        _;
    }
}
