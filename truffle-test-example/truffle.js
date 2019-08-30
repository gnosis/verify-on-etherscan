const HDWalletProvider = require('truffle-hdwallet-provider');

const DEFAULT_MNEMONIC =
  'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat';

console.log(`
  ==========================================
    Truffle config
  ==========================================
`);

// Get the mnemonic
const privateKey = process.env.PK;
let mnemonic = process.env.MNEMONIC;
if (!privateKey && !mnemonic) {
  mnemonic = DEFAULT_MNEMONIC;
}

function truffleConfig({
  urlRinkeby = 'https://rinkeby.infura.io/',
  urlKovan = 'https://kovan.infura.io/',
  urlRopsten = 'https://ropsten.infura.io/',
  urlGoerli = 'https://goerli.infura.io/',
  urlMainnet = 'https://mainnet.infura.io',
  urlDevelopment = 'localhost',
  portDevelopment = 8545
} = {}) {
  let getProvider;
  if (privateKey) {
    console.log('Using private key');
    getProvider = url => {
      return () => {
        return new HDWalletProvider([privateKey], url);
      };
    };
  } else {
    console.log(mnemonic === DEFAULT_MNEMONIC ? 'Using default mnemonic' : 'Using custom mnemonic');
    getProvider = url => {
      return () => {
        return new HDWalletProvider(mnemonic, url);
      };
    };
  }

  return {
    plugins: ['verify-on-etherscan'],
    networks: {
      development: {
        host: urlDevelopment,
        port: portDevelopment,
        network_id: '*'
      },
      mainnet: {
        provider: getProvider(urlMainnet),
        network_id: '1'
      },
      rinkeby: {
        provider: getProvider(urlRinkeby),
        network_id: '4'
      },
      kovan: {
        provider: getProvider(urlKovan),
        network_id: '42'
      },
      ropsten: {
        provider: getProvider(urlRopsten),
        network_id: '3'
      },
      goerli: {
        provider: getProvider(urlGoerli),
        network_id: '5'
      }
    },
    compilers: {
      solc: {
        version: '0.5.2'
      }
    }
  };
}

module.exports = truffleConfig({
  mnemonic,
  privateKey
});
