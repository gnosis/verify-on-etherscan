const fs = require('fs-extra');

async function gatherDataFromArtifacts({ artifacts, networkId, logger }) {
  const artifactJSONs = await Promise.all(artifacts.map(f => fs.readJson(f)));

  const result = {};

  for (let i = 0, alen = artifactJSONs.length; i < alen; ++i) {
    const artifact = artifactJSONs[i];
    const file = artifacts[i];

    const { contractName: contractname, compiler, networks, bytecode, sourcePath, abi } = artifact;

    const networkData = networks[networkId];

    if (!networkData) continue;

    const { address: contractaddress, links, transactionHash: txhash } = networkData;

    const match = /[\w.+-]+?commit\.[\da-f]+/i.exec(compiler.version);
    if (match === null) {
      logger &&
        logger.error(
          `${file} doesn't contain a valid compiler version: ${compiler.version}, skipping`
        );
      continue;
    }
    const versionfromArtifact = match[0];
    const compilerversion = `v${versionfromArtifact}`;

    const hasNonEmptyConstructor = abi.some(
      ({ type, inputs }) => type === 'constructor' && inputs.length > 0
    );

    const contractData = {
      contractname,
      compilerversion,
      bytecode,
      contractaddress,
      txhash,
      sourcePath,
      hasNonEmptyConstructor
    };

    const librariesUsed = Object.keys(links);

    if (librariesUsed.length) {
      if (librariesUsed.length > 10) {
        logger &&
          logger.error(
            '\nEtherscan only allows verification of contracts with up to 10 libraries;'
          );
        logger &&
          logger.error(contractname, 'has', librariesUsed.length, "and won't be verrified\n");
        continue;
      }

      for (let j = 1, len = librariesUsed.length; j <= len; ++j) {
        const libName = librariesUsed[j];
        contractData[`libraryname${j}`] = libName;
        contractData[`libraryaddress${j}`] = links[libName];
      }
    }

    result[file] = contractData;
  }

  return result;
}

module.exports = gatherDataFromArtifacts;
