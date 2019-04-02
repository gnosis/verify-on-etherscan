const flattener = require('truffle-flattener');

async function flattenContracts(artifactsData) {
  const files = Object.keys(artifactsData);

  const paths = files.map(f => artifactsData[f].sourcePath);

  const uniquePaths = Array.from(new Set(paths));

  const flattened = await Promise.all(uniquePaths.map(path => flattener([path])));

  const path2flattened = uniquePaths.reduce((accum, curr, i) => {
    accum[curr] = flattened[i];
    return accum;
  }, {});

  return files.reduce((accum, f) => {
    const { sourcePath } = artifactsData[f];

    accum[f] = path2flattened[sourcePath];
    return accum;
  }, {});
}

module.exports = flattenContracts;
