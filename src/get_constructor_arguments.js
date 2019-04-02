const fetch = require('node-fetch');

async function getConstructorArguments(artifactsData, { web3, apiUrl, network, useFetch }) {
  const files = Object.keys(artifactsData);

  const etherscanURL = `${network === 'mainnet' ? '' : `${network}.`}etherscan.io`;

  const getTransaction =
    web3 && !useFetch
      ? txhash => web3.eth.getTransaction(txhash)
      : async txhash => {
          const res = await fetch(
            `${apiUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${txhash}`
          );

          const json = await res.json();

          if (json.result === null) {
            throw new Error(`No transaction with hash ${txhash} found on ${etherscanURL}`);
          }

          if (json.error) {
            throw new Error(
              `Error getting transaction ${txhash} from ${etherscanURL}:
            ${json.error.code}: ${json.error.message}
            `
            );
          }
          return json.result;
        };

  const constructorArgumentsEncoded = await Promise.all(
    files.map(async f => {
      const { txhash, bytecode, contractname, hasNonEmptyConstructor } = artifactsData[f];

      if (!hasNonEmptyConstructor) return;

      const tx = await getTransaction(txhash);
      if (tx === null) {
        console.error(
          `Transaction ${txhash} from ${contractname} wasn't found on the blockchain. Verification will fail.`
        );
        return;
      }

      if (!tx.input.startsWith(bytecode)) {
        console.log('tx.input: ', tx.input);
        console.log('bytecode: ', bytecode);
        console.error(
          `${contractname} bytecode doesn't match creating tx's input. Verification will fail.`
        );
        return;
      }
      const constructorArgs = tx.input.replace(bytecode, '');

      return constructorArgs;
    })
  );

  return files.reduce((accum, f, i) => {
    if (constructorArgumentsEncoded[i]) accum[f] = constructorArgumentsEncoded[i];
    return accum;
  }, {});
}

module.exports = getConstructorArguments;
