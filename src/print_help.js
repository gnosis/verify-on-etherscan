const helpMessage = `
Usage: API_KEY=<your_key> truffle run verify [options] <artifacts...>
    
    API_KEY             your key for etherscan.io API (required)
    
    artifacts           a space separated list of paths to artifact json files (required)
                        or a glob pattern like ./build/contracts/*.json

    --network <name>    network from truffle.js file (required)
                        web3 instance is created with provider supplied by truffle to the plugin
                        a network with its networkId must be available for verification on etherscan.io 
                        currently available are mainnet, rinkeby, kovan, ropsten and goerli

    --output            path to directory to write flattened contracts to (optional)
                        for optional saving to filesystem

    --delay,  -d        delay (in ms) between checking if a contract has been verified after verification starts
                        (optional)(default 20000)

    --use-fetch         fetch transactions from etherscan.io instead of from blockchain when determining constructor arguments
                        (optional)(default false)
                        
    --verbose           output more logs (optional)

    --help, -h          output more logs (optional)                      
`;

module.exports = () => console.log(helpMessage);
