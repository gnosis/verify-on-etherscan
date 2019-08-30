[![Build Status](https://travis-ci.org/gnosis/verify-on-etherscan.svg?branch=master)](https://travis-ci.org/gnosis/verify-on-etherscan?branch=master)
[![NPM version](https://badge.fury.io/js/verify-on-etherscan.svg)](https://www.npmjs.com/package/verify-on-etherscan)

# Verify on Etherscan
CLI utility / truffle plugin / Node.js library that automates verification on etherscan.io of contracts that were compiled and deployed with truffle.

The most common use case of verifying contracts after deployment should be covered by the following command even without installing the library:

```sh
API_KEY=<your_etherscan_api_key> npx verify-on-etherscan --network mainnet ./build/contracts/*
```

Etherscan supports **mainnet, ropsten, rinkeby, kovan** and **goerli** networks for verification and requires a valid **Etherscan APIkey**. You can see details [here](https://etherscan.io/apis#contracts).

## Installation

```sh
npm install --save-dev verify-on-etherscan
```

## Usage

The library can be used as a cli utility -- the simplest way, as a truffle plugin -- to take advantage of truffle config or as a third-party library.

## As a cli utility

```sh
Usage: API_KEY=<your_key> npx verify-on-etherscan [options] <artifact_paths ...>

Positionals:
  artifacts             a space separated list of paths to artifact json files (required)
                        or a glob pattern like ./build/contracts/*.json
                        [string, string, string...]

Options:
  --version, -v         Show version number

  --network             which network to verify contracts on
                        [string] [required] [choices: "mainnet", "ropsten", "rinkeby", "kovan", "goerli"]

  --optimize, -o        whether your contracts were optimized during compilation
                        (sets --optimize-runs to 200 if none given)
                        [string]

  --optimize-runs, -r   how many runs your contracts were optimized for during compilation
                        (sets --optimize to true if given)
                        [number]

  --output              which directory to write flattened contracts to
                        [string]

  --delay, -d           delay (in ms) between checking if a contract has been
                        verified after verification starts
                        [number] [default: 20000]

  --use-fetch           fetch transactions from Etherscan instead of from
                        blockchain when determining constructor arguments
                        [boolean] [default: true]

  --verbose             output more logs

  --help, -h            Show help
```

By default the library will use Etherscan api to fetch transactions.
To use a `web3` for that set `--use-fetch=false`. That way an instance of `web3` will be created for you and connected to `https://<network>.infura.io`

If no `--optimizer` or `--optimize-runs` flags are provided, the library will attempt to infer optimizer settings from `./truffle.js` or `./truffle-config.js` in the project directory. Failing that `{ enabled: false, runs: 200 }` will be used.

You can use `voeth` as an alias for `verify-on-etherscan` if you install it locally:
```
API_KEY=<your_etherscan_api_key> npx voeth --network rinkeby ./build/contracts/Contract1.json ./build/contracts/Contract2.json
```

-------------

## As a truffle plugin

First add

```js
plugins: ["verify-on-etherscan"]
```

to your config in `truffle.js` or `truffle-config.js`

```sh
Usage: API_KEY=<your_key> npx truffle run verify [options] <artifact_paths ...>

    artifact_paths      a space separated list of paths to artifact json files (required)
                        or a glob pattern like ./build/contracts/*.json

    API_KEY             your key for Etherscan API (required)

    --network <name>    network from truffle.js file (required)
                        web3 instance is created with provider supplied by truffle to the plugin
                        a network with its networkId must be available for verification on Etherscan 
                        currently available are mainnet, rinkeby, kovan, ropsten and goerli

    --output            path to directory to output flattened contracts to (optional)
                        for optional saving to filesystem

    --delay,  -d        delay (in ms) between checking if a contract has been verified after verification starts
                        (optional)(default 20000)

    --use-fetch         fetch transactions from Etherscan instead of from blockchain when determining constructor arguments
                        (optional)(default false)
                        
    --verbose           output more logs (optional)

    --help, -h          output more logs (optional)
```

By default a `web3` instance will be created with a provider from the config returned from `truffle.js` corresponding to the provided `--network`. It will be used for requisting transaction data from the blockchain.
`--use-fetch` allows to use Etherscan api to fetch transactions.

Optimizer settings are passed by truffle as part of the plugin config.

----------------

### As a library

First import it in your project then call it with your options:
```js
const verify = require('verify-on-etherscan');

const result = await verify({
  cwd,
  artifacts,
  apiKey,
  web3,
  network,
  useFetch,
  optimizer,
  output,
  delay,
  logger,
  verbose
})
```

`verify(options)` returns a Promise that resolves to

```js
  {
    // contracts that were already verified on Etherscan
    alreadyVerified: Array<absolute_artifact_paths>,
    // contracts that were verified successfully
    successful: Array<absolute_artifact_paths>,
    // contracts for which verification failed
    failed: Array<absolute_artifact_paths>
  }
```

 when the verification is finished, or rejects if any unhandled Errors are thrown inside.

Options:

```sh
  cwd                   current working directory, relative to which artifacts will be looked up
                        (default: process.cwd())

  artifacts             array of paths to json artifact files, relative to cwd
                        (required non-empty array)

  apiKey                Etherscan APIkey (required)

  web3                  a web3 instance connected to a valid network (optional)

  network               name from the list of valid networks to connect to (optional)

  useFetch              use Etherscan api to fetch transactions instead of a web3 instance
                        (optional, default: false)
  
  optimizer             optimizer settings object
                        (default: { enabled: false, runs: 200 })
                      
    optimizer.enabled   whether your contracts were optimized during compilation
    optimizer.runs      how many runs your contracts were optimized for during compilation

  output                path to directory to write flattened contracts to
                        (optional)

  delay                 delay (in ms) between checking if a contract has been verified after verification starts

  logger                logger to use for output to console
                        (optional, default: console, if falsy nothing will be output)

  verbose               ouput more logs (optional, default: false)
```

If `web3` is provided, it will be used to determine which network to verify contracts on (through `web3.eth.net.getId()` matching).

if `network` is provided and `useFetch === false`, an instance of `web3` will be created for you and connected to `https://<network>.infura.io`. `network` must be one of the networks which Etherscan supports for verification.

if `network` is provided and `useFetch === true`, no `web3` instance will be created and the library will fetch transactions from Etherscan api.

Either `web3` or `network` must be provided.

## Workflow

### Step 0

In case of using the library as a cli utility or a truffle plugin some config parsing will first take place

---

### Step 1

Depending on provided config an instance of `web3` is created.

---

### Step 2

JSON artifacts are read, parsed and necessary data is extracted.

Extracted: **contractname, compilerversion, bytecode, contractaddress, txhash, sourcePath, library addresses** (if any). **contractaddress** and **txhash** are dependent on the network set for verification.

It's also determined whether a contract has a non-emty constructor.

---

### Step 3

For each **contractaddress** the libary fetches contract abi from Etherscan to filter out already verified contracts.

Keep in mind that recently verified contracts would still be reported as unverified by Etherscan for some time and won't be filtered out immediately.

---

### Step 4

[truffle-flattener](https://github.com/nomiclabs/truffle-flattener) processes **sourcePath** of each artifact and returns the flattened code.

---

### Step 5 (optional)

If `--output <directory>` was given, flattened contracts are written out there following `<original_filename>.flat.sol` pattern.
 
---

### Step 6

For contracts that have a non-emty constructor the library determines its encoded constructor arguments.

It gets the input data of the transaction corresponding to a contract's creation **txhash**. Then subtracts the artifact **bytecode** from it. The result is the encoded constructor arguments.

In case the bytecode and the transaction data don't match, provided source code and compiler are the same, the difference is usually in the metadata portion of the code.

A typical contract creation transaction data looks like this:

```hex
(solc v>=0.4.7 <0.4.22)
0x6060604052[__contract_code__]a165627a7a72305820[__metadata__]0029[__constractor_arguments__]

(solc v>=0.4.22)
0x6080604052[__contract_code__]a165627a7a72305820[__metadata__]0029[__constractor_arguments__]
```

It is trivial to extract the constructor arguments from it.

---

### Step 7

For each contract the library posts **apiKey, optimizer** settings, **contractaddress, contractname, sourceCode, constructorArguments, library addresses** and **compileversion** to Etherscan api getting GUIDs in return.

The library checks the GUIDs for status change until all contracts are either verified or fail verification. The interval between check is determined by the `delay` option.

## License

Licensed under the MIT license.
