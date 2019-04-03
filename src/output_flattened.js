const path = require('path');
const fs = require('fs-extra');

async function outputFlattened(artifactsData, flattenedContracts, { output, logger, verbose }) {
  const files = Object.keys(flattenedContracts);
  if (files.length === 0) return;

  await fs.mkdirp(output);

  await Promise.all(
    files.map(file => {
      const flat = flattenedContracts[file];
      const { sourcePath, contractname } = artifactsData[file];

      const filename = path.basename(sourcePath, '.sol');

      const filepath = path.resolve(output, `${filename}.flat.sol`);

      verbose && logger.log(`Writing flattened contract ${contractname} to ${filepath}`);

      return fs.writeFile(filepath, flat);
    })
  );
}

module.exports = outputFlattened;
