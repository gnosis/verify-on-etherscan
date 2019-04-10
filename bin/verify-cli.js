#!/usr/bin/env node

const path = require('path');
const yargs = require('yargs');

const { availableNetworks, DEFAULT_OPTIMIZER_CONFIG } = require('../src/process_config');

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
    } catch (error) { } // eslint-disable-line
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

function run(options) {
  const { network, optimize, optimizeRuns, output, delay, artifacts, verbose, useFetch } = options;

  let optimizer;
  // no flags provided
  if (optimize === undefined && optimizeRuns === undefined) {
    // try to get from ./truffle(-config)?.js
    optimizer = getOptimizerFromTruffleConfig();
    optimizer && verbose && console.log(`Optimizer settings inferred from local truffle config`);
    // couldn't
    if (!optimizer) {
      console.log('Was unable to infer optimizer settings from local truffle config');
      console.log(`Will use defaults: ${JSON.stringify(DEFAULT_OPTIMIZER_CONFIG)}`);
      console.log('If that is not correct, provide --optimize and/or --optimize-runs flags');

      optimizer = DEFAULT_OPTIMIZER_CONFIG;
    }
  } else optimizer = constructOptimizerFromOptions(options);

  require('../src')({
    network,
    optimizer,
    output,
    delay,
    artifacts,
    verbose,
    useFetch,
    apiKey: process.env.API_KEY
  }).catch(console.error);
}

function main() {
  const { argv } = yargs
    .version()
    .usage('$0 <artifacts...>', 'Verifies contracts on etherscan.io', yarg => {
      yarg
        .positional('artifacts', {
          describe:
            'a space separated list of paths to artifact json files (required) or a glob pattern like ./build/contracts/*.json',
          type: 'string'
        })
        .example(
          'API_KEY=<your_key> $0 --network rinkeby ./build/contracts/*',
          `Verifies all contract artifacts in ./build/contracts deployed to rinkeby network.
          Tries to infer optimizer settings from truffle.js or truffle-config.js`
        )
        .example(
          'API_KEY=<your_key> $0 --network rinkeby ./build/contracts/Contract.json --optimize-runs 100',
          `Verifies ./build/contracts/Contract.json artifact deployed to rinkeby network.
          Optimizer is set as { enabled: true, runs: 100}`
        );
    })

    .option('network', {
      demandOption: true,
      choices: availableNetworks,
      type: 'string',
      describe: 'which network to verify contracts on'
    })
    .option('optimize', {
      alias: 'o',
      type: 'boolean',
      describe:
        'whether your contracts were optimized during compilation (sets --optimize-runs to 200 if none given)'
    })
    .option('optimize-runs', {
      alias: 'r',
      type: 'number',
      describe:
        'how many runs your contracts were optimized for during compilation (sets --optimize to true if given)'
    })
    .option('output', {
      type: 'string',
      describe: 'which directory to write flattened contracts to'
    })
    .option('delay', {
      alias: 'd',
      type: 'number',
      default: 20000,
      describe:
        'delay (in ms) between checking if a contract has been verified after verification starts'
    })
    .option('use-fetch', {
      type: 'boolean',
      default: true,
      describe:
        'fetch transactions from etherscan.io instead of from blockchain when determining constructor arguments'
    })
    .option('verbose', {
      type: 'boolean',
      describe: 'output more logs'
    })

    .help('help')
    .alias('help', 'h')
    .alias('version', 'v')
    .wrap(yargs.terminalWidth())
    .fail((msg, err, yarg) => {
      if (err) throw err; // preserve stack

      if (msg === 'Not enough non-option arguments: got 0, need at least 1') {
        console.error('Must provide artifact paths');
      } else {
        console.error(msg);
      }
      console.error('\nSee usage:');
      console.error(yarg.help());
      process.exit(1);
    });

  run(argv);
}

// if running directly
if (require.main === module) {
  main();
}
