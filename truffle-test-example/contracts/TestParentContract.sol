pragma solidity >=0.4.21 <0.6.0;

contract TestParentContract {
    address public owner;
    string public parentName;

    constructor(string memory _parentName) public {
        owner = msg.sender;
        parentName = _parentName;
    }
}
