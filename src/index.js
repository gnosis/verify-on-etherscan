const { processConfig } = require('./process_config');

const gatherDataFromArtifacts = require('./gather_data_from_artifacts');
const filterOutVerified = require('./filter_out_verified');
const flattenContracts = require('./flatten_contracts');
const outputFlattened = require('./output_flattened');
const getConstructorArguments = require('./get_constructor_arguments');
const postToVerify = require('./post_to_verify');

async function verify(config) {
  const options = await processConfig(config);
  // must have APIKey

  // gather contractaddress, contractname, compileversion, optimizationUsed, runs, txhash,
  // bytecode, sourcePath, libaryname1..., lybraryaddress1... from artifacts
  const artifactsData = await gatherDataFromArtifacts(options);

  // filter out already verified contracts
  const { unverified: unverifiedArtifactsData, alreadyVerified } = await filterOutVerified(
    artifactsData,
    options
  );

  const writeFlattened = typeof options.output === 'string';
  // get sourceCode from truffle-flattener
  // const flattenedContracts = await flattenContracts(unverifiedArtifactsData);
  const flattenedContracts = await flattenContracts(
    writeFlattened ? artifactsData : unverifiedArtifactsData
  );

  if (writeFlattened) {
    // output flattened contracts to a folder
    await outputFlattened(artifactsData, flattenedContracts, options);
  }

  // get constructorArguements encoded from tx of txhash and bytecode
  const constructorArguments = await getConstructorArguments(unverifiedArtifactsData, options);

  // submit post request
  /**
   * @type {{ alreadyVerified: string[], successful: string[], failed: string[] }}
   */
  const res = await postToVerify(
    unverifiedArtifactsData,
    flattenedContracts,
    constructorArguments,
    options
  );

  res.alreadyVerified = alreadyVerified.concat(res.alreadyVerified);
  return res;
}

module.exports = verify;
