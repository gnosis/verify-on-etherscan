pragma solidity >=0.4.21 <0.6.0;

import "./TestParentContract.sol";

contract OneContract is TestParentContract("Parent") {
    string public name;

    constructor(string memory _name) public {
        name = _name;
    }
}

contract TwoContract is TestParentContract("Parent") {
    string public name;

    constructor(string memory _name) public {
        name = _name;
    }
}
