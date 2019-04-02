/* global artifacts */
const Token = artifacts.require('./ERC20.sol');
const TestToken = artifacts.require('./TestToken.sol');

module.exports = async deployer => {
  await deployer.deploy(Token);
  await deployer.deploy(TestToken, 'Test Token', 'TST', 18);
};
