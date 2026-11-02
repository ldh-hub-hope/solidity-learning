// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// 9주차 과제: Multi Manager
// manager 3명 이상을 등록하고, "모든 manager 가 confirm" 해야만 통과하는
// onlyAllConfirmed modifier 를 제공하는 접근제어 모듈 (TinyBank 에서 상속)
abstract contract MultiManagedAccess {
    uint256 public constant MIN_MANAGERS = 3;

    address public owner;
    address[] public managers;
    mapping(address => bool) public isManager;
    mapping(address => bool) public confirmed;

    constructor(address _owner, address[] memory _managers) {
        require(_managers.length >= MIN_MANAGERS, "At least 3 managers required");
        owner = _owner;
        for (uint256 i = 0; i < _managers.length; i++) {
            address m = _managers[i];
            require(m != address(0), "Invalid manager address");
            require(!isManager[m], "Duplicate manager");
            isManager[m] = true;
            managers.push(m);
        }
    }

    // manager 전원이 confirm 한 상태에서만 실행되고, 실행되면 confirm 상태를 초기화한다.
    modifier onlyAllConfirmed() {
        require(allConfirmed(), "Not all confirmed yet");
        _reset();
        _;
    }

    function confirm() external {
        require(isManager[msg.sender], "You are not a manager");
        confirmed[msg.sender] = true;
    }

    function allConfirmed() public view returns (bool) {
        for (uint256 i = 0; i < managers.length; i++) {
            if (!confirmed[managers[i]]) {
                return false;
            }
        }
        return true;
    }

    function managersLength() external view returns (uint256) {
        return managers.length;
    }

    function _reset() internal {
        for (uint256 i = 0; i < managers.length; i++) {
            confirmed[managers[i]] = false;
        }
    }
}
