const fetch = require('node-fetch');

async function getConstructorArguments(
  artifactsData,
  { web3, apiUrl, network, useFetch, logger, verbose }
) {
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

          if (json.error) {
            throw new Error(
              `Error getting transaction ${txhash} from ${etherscanURL}:
              ${json.error.code}: ${json.error.message}
              `
            );
          }

          if (json.result === null) {
            logger && logger.error(`No transaction with hash ${txhash} found on ${etherscanURL}`);
          }

          return json.result;
        };

  const constructorArgumentsEncoded = await Promise.all(
    files.map(async f => {
      const {
        txhash,
        bytecode,
        contractname,
        hasNonEmptyConstructor,
        contractaddress
      } = artifactsData[f];

      if (!hasNonEmptyConstructor) return;

      try {
        const tx = await getTransaction(txhash);
        if (tx === null) {
          logger &&
            logger.error(
              `Transaction ${txhash} from ${contractname} wasn't found on the blockchain. Verification will fail.`
            );
          return;
        }

        if (!tx.input.startsWith(bytecode)) {
          logger &&
            logger.error(
              `${contractname} bytecode doesn't match creating tx's input. Verification will fail.`
            );
          return;
        }
        const constructorArgs = tx.input.replace(bytecode, '');

        verbose &&
          logger &&
          logger.log(
            `${contractname} at ${contractaddress} was deployed with constructor arguments: ${constructorArgs}`
          );

        return constructorArgs;
      } catch (error) {
        logger && logger.error(error);
      }
    })
  );

  return files.reduce((accum, f, i) => {
    if (constructorArgumentsEncoded[i]) accum[f] = constructorArgumentsEncoded[i];
    return accum;
  }, {});
}

module.exports = getConstructorArguments;
