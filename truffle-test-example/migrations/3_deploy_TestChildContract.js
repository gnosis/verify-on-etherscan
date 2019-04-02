/* global artifacts */
const TestChildContract = artifacts.require('./TestChildContract.sol');

module.exports = deployer => {
  return deployer.deploy(TestChildContract, 'Child');
};
