const Web3 = require('web3');
const path = require('path');

async function processPluginConfig(config) {
  const {
    working_directory: cwd,
    network,
    output,
    compilers,
    useFetch,
    logger,
    verbose,
    d,
    delay = d,
    _
  } = config;

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
    network,
    logger,
    verbose,
    delay
  };
}

const id2Network = {
  1: 'mainnet',
  3: 'ropsten',
  4: 'rinkeby',
  5: 'goerli',
  42: 'kovan'
};

const availableNetworks = Object.values(id2Network);
const Networks = new Set(availableNetworks);

const Network2Id = Object.keys(id2Network).reduce((accum, id) => {
  accum[id2Network[id]] = id;
  return accum;
}, {});

// readonly
const network2InfuraURL = {
  mainnet: 'https://mainnet.infura.io',
  ropsten: 'https://ropsten.infura.io',
  rinkeby: 'https://rinkeby.infura.io',
  kovan: 'https://kovan.infura.io',
  goerli: 'https://goerli.infura.io'
};

const createWeb3Instance = network => {
  const url = network2InfuraURL[network];
  if (!url) throw new Error(`No network url for ${network} network`);

  return new Web3(url);
};

const DEFAULT_OPTIMIZER_CONFIG = { enabled: false, runs: 200 };

/**
 *
 * @param {cwd?, artifacts, web3?, optimizer?, output?, apiKey, network?, delay?, useFetch?, logger?, verbose?} options
 */
async function processConfig(options) {
  const { cwd = process.cwd(), artifacts, network, useFetch } = options;

  let { web3 } = options;

  const artifactsAbsPaths = artifacts.map(f => path.resolve(cwd, f));

  let etherscanNetwork;
  let networkId;
  let web3WasCreated = false;
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

    if (!useFetch) {
      web3 = createWeb3Instance(network);
      web3WasCreated = true;
    }
  }

  const apiUrl = `https://api${
    etherscanNetwork === 'mainnet' ? '' : `-${etherscanNetwork}`
  }.etherscan.io/api`;

  const config = {
    optimizer: DEFAULT_OPTIMIZER_CONFIG,
    logger: console,
    web3,
    ...options,
    networkId,
    network: etherscanNetwork,
    artifacts: artifactsAbsPaths,
    apiUrl
  };

  const { verbose, logger } = config;
  if (verbose && logger) {
    logger.log(
      `\nUsing the following config:\n${JSON.stringify(
        config,
        [
          'cwd',
          'artifacts',
          'optimizer',
          'enabled',
          'runs',
          'output',
          'network',
          'delay',
          'useFetch',
          'verbose'
        ],
        2
      )}`
    );
    if (web3WasCreated) {
      logger.log('web3 instance was created');
    } else {
      logger.log(config.web3 ? 'web3 instance is provided' : 'web3 instance is not provided');
    }
    logger.log(config.apiKey ? 'apiKey is provided' : 'apiKey is not provided');
    logger.log(config.logger === console ? 'using console as logger' : 'using a custom logger');
  }

  return config;
}

module.exports = {
  processPluginConfig,
  processConfig,
  availableNetworks,
  DEFAULT_OPTIMIZER_CONFIG
};
