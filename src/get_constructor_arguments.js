const fetch = require('node-fetch');

// .....contract_code......metadata_start.........metadata_end(constructor_args)
const metaNconstructorR = /a165627a7a72305820[0-9A-Fa-f]+?0029([0-9A-Fa-f]*)$/;

const extractConstructorCodes = data => {
  if (!data) return null;

  const match = data.match(metaNconstructorR);

  return match && match[1];
};

// constructor bytecode is a sequence of 32-bytes
// a byte is represented with 2 characters in hex
// so a valid constructor must be a multiple of 64 characters
const checkConstructorArgsValidity = constArgs => constArgs && constArgs.length % 64 === 0;

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

        let constructorArgs;
        let validConstructorArgs = false;

        if (!tx.input.startsWith(bytecode)) {
          logger &&
            logger.error(
              `${contractname} bytecode doesn't match creating tx's input. Verification may fail.`
            );

          constructorArgs = extractConstructorCodes(tx.input);

          validConstructorArgs = checkConstructorArgsValidity(constructorArgs);
        } else {
          constructorArgs = tx.input.replace(bytecode, '');
          validConstructorArgs = checkConstructorArgsValidity(constructorArgs);
        }

        if (validConstructorArgs) {
          verbose &&
            logger &&
            logger.log(
              `${contractname} at ${contractaddress} was deployed with constructor arguments: ${constructorArgs}`
            );
        } else {
          logger &&
            logger.error(
              `Unable to infer valid constructor arguments from ${contractname} creating tx ${txhash}. Verification will fail.`
            );
        }

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
