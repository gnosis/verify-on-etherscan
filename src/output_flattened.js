const path = require('path');
const fs = require('fs-extra');

// console.warn('fs.mkdirp.mock: ', fs.mkdirp.mock);

async function outputFlattened(artifactsData, flattenedContracts, { output }) {
  const files = Object.keys(flattenedContracts);
  if (files.length === 0) return;

  await fs.mkdirp(output);
  // console.warn('fs.mkdirp.mock: ', fs.mkdirp.mock);

  await Promise.all(
    files.map(file => {
      const flat = flattenedContracts[file];
      const { sourcePath } = artifactsData[file];

      const filename = path.basename(sourcePath, '.sol');

      const filepath = path.resolve(output, `${filename}.flat.sol`);

      return fs.writeFile(filepath, flat);
    })
  );

  // for (const file of Object.keys(flattenedContracts)) {
  //   const flat = flattenedContracts[file];
  //   const { sourcePath } = artifactsData[file];

  //   const filename = path.basename(sourcePath, '.sol');

  //   const filepath = path.resolve(output, `${filename}.flat.sol`);

  //   fs.writeFileSync(filepath, flat);
  // }
}

module.exports = outputFlattened;
