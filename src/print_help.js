const helpMessage = `
Usage: API_KEY=<your key> truffle run verify [options] [artifact_paths ...]
    API_KEY             your key for etherscan.io API (required)

    --network <name>    network from truffle.js file (required)
                        web3 instance is created with provider supplied by truffle to the plugin
                        a network with its networkId must be available for verification on etherscan.io 
                        currently available are mainnet, rinkeby, kovan and ropsten

    --output, -o        path to directory to output flattened contracts (optional)
                        for optional saving to filesystem

    --delay,  -d        delay (in ms) between checking if a contract has been verified after verification starts
                        (optional)(default 20000)

    --use-fetch         fetch transactions from etherscan.io instead of from blockchain when determining constructor arguments
                        (optional)(default false)
                        
    --verbose           output more logs (optional)

    artifact_paths      a space separated list of paths to artifact json files (required)
                        or a glob pattern like ./build/contracts/*.json
                        
`;

module.exports = () => console.log(helpMessage);
