const Web3 = require('web3');
const path = require('path');

async function processPluginConfig(config) {
  const { working_directory: cwd, network, o, output = o, compilers, useFetch, _ } = config;

  const {
    settings: { optimizer }
  } = compilers.solc;

  const artifacts = _.slice(1);

  if (!network) {
    throw new Error('No network provided. Run truffle run verify --help to see usage.');
  }

  let provider;

  try {
    ({ provider } = config);
  } catch (error) {
    throw new Error(`No valid provider for network ${network} in truffle.js`);
  }

  const web3 = new Web3(provider);

  return {
    cwd,
    web3,
    useFetch,
    output,
    artifacts,
    apiKey: process.env.API_KEY,
    optimizer,
    network
  };
}

const id2Network = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby',
  42: 'kovan'
};

const availableNetworks = Object.values(id2Network);
const Networks = new Set(availableNetworks);

const Network2Id = Object.keys(id2Network).reduce((accum, id) => {
  accum[id2Network[id]] = id;
  return accum;
}, {});

const DEFAULT_OPTIMIZER_CONFIG = { enabled: false, runs: 200 };

/**
 *
 * @param {cwd, artifacts, web3, optimizer, output, apiKey, network, delay?, useFetch?} options
 */
async function processConfig(options) {
  const { cwd = process.cwd(), artifacts, web3, network } = options;

  const artifactsAbsPaths = artifacts.map(f => path.resolve(cwd, f));

  let etherscanNetwork;
  let networkId;
  if (web3) {
    networkId = await web3.eth.net.getId();

    etherscanNetwork = id2Network[networkId];

    if (!etherscanNetwork) {
      throw new Error(
        `Network with id ${networkId} isn't available on etherscan.io for verification`
      );
    }
  } else {
    if (!Networks.has(network)) {
      throw new Error(`Network ${network} isn't available on etherscan.io for verification`);
    }
    etherscanNetwork = network;
    networkId = Network2Id[network];
  }

  const apiUrl = `https://api${
    etherscanNetwork === 'mainnet' ? '' : `-${etherscanNetwork}`
  }.etherscan.io/api`;

  return {
    optimizer: DEFAULT_OPTIMIZER_CONFIG,
    ...options,
    networkId,
    network: etherscanNetwork,
    artifacts: artifactsAbsPaths,
    apiUrl
  };
}

module.exports = {
  processPluginConfig,
  processConfig,
  availableNetworks
};
