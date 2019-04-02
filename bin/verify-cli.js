#!/usr/bin/env node

const path = require('path');

const constructOptimizerFromOptions = ({ optimize, optimizeRuns }) => {
  const enabled = !!optimize || !!optimizeRuns;

  const runs = optimizeRuns || 200;

  return { enabled, runs };
};

const withObjectFunctionsDisabled = (object, cb) => {
  if (Object.isFrozen(object)) throw new Error("Object is frozen, can't reassign functions");

  const noop = () => {};

  const old = Reflect.ownKeys(object).reduce((accum, key) => {
    const val = object[key];
    if (typeof val === 'function') {
      accum[key] = val;
      object[key] = noop;
    }

    return accum;
  }, {});

  try {
    return cb();
  } catch (error) {
    // do nothing
  } finally {
    Object.assign(object, old);
  }
};

const readTruffleConfig = () => {
  let truffleConfig;

  try {
    truffleConfig = require(path.resolve('./truffle.js'));
  } catch (error) {
    try {
      truffleConfig = require(path.resolve('./truffle-config.js'));
    } catch (error) {} // eslint-disable-line
  }

  return truffleConfig;
};

const getOptimizerFromTruffleConfig = () => {
  const config = withObjectFunctionsDisabled(console, readTruffleConfig);

  return (
    config &&
    config.compilers &&
    config.compilers.solc &&
    config.compilers.solc.settings &&
    config.compilers.solc.settings.optimizer
  );
};

const { argv } = require('yargs')
  .version()
  .usage('$0 <artifacts...>', 'Verifies contracts on etherscan.io', yargs => {
    yargs
      .positional('artifacts', {
        describe: 'paths to json artifacts or a glob pattern',
        type: 'string'
      })
      .example(
        '$0 --network rinkeby ./build/contracts/*',
        `Verifies all contract artifacts in ./build/contracts deployed to rinkeby network.
        Tries to infer optimizer settings from truffle.js or truffle-config.js`
      )
      .example(
        '$0 --network rinkeby ./build/contracts/* --optimize-runs 100',
        `Verifies all contract artifacts in ./build/contracts deployed to rinkeby network.
        Optimizer is set as { enabled: true, runs: 100}`
      );
  })

  .option('network', {
    demandOption: true,
    choices: require('../src/process_config').availableNetworks,
    type: 'string',
    describe: 'which network to verify contracts on'
  })
  .option('optimize', {
    alias: 'o',
    type: 'boolean',
    describe: 'whether your contracts were optimized during compilation'
  })
  .option('optimize-runs', {
    alias: 'r',
    type: 'number',
    describe:
      'how many runs your contracts were optimized for during compilation (sets --optimize to true if given)'
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    describe: 'which directory to output flattened contracts to'
  })
  .option('delay', {
    alias: 'd',
    type: 'number',
    default: 20000,
    describe:
      'delay (in ms) between checking if a contract has been verified after verification starts'
  })

  .help('help')
  .alias('help', 'h')
  .alias('version', 'v')
  .fail((msg, err, yargs) => {
    if (err) throw err; // preserve stack

    if (msg === 'Not enough non-option arguments: got 0, need at least 1') {
      console.error('Must provide artifact paths');
    } else {
      console.error(msg);
    }
    console.error('\nSee usage:');
    console.error(yargs.help());
    process.exit(1);
  });

// console.log('argv: ', argv);

function run(options) {
  const { network, optimize, optimizeRuns, output, delay, artifacts } = options;
  // console.log('network: ', network);
  // console.log('optimize: ', optimize);
  // console.log('optimizeRuns: ', optimizeRuns);
  // console.log('output: ', output);
  // console.log('delay: ', delay, typeof delay);

  let optimizer;
  if (optimize === undefined && optimizeRuns === undefined) {
    optimizer = getOptimizerFromTruffleConfig();
  }
  if (!optimizer) optimizer = constructOptimizerFromOptions(options);
  // console.log('optimizer: ', optimizer);

  require('../src')({
    network,
    optimizer,
    output,
    delay,
    artifacts,
    apiKey: process.env.API_KEY
  }).catch(console.error);
}

run(argv);
