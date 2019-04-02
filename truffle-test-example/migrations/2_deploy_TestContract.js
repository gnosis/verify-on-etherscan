/* global artifacts */
const TestContract = artifacts.require('./TestContract.sol');

module.exports = deployer => {
  return deployer.deploy(TestContract);
};
