const fetch = require('node-fetch');

async function filterOutVerified(artifactsData, { apiUrl }) {
  const files = Object.keys(artifactsData);
  console.log();

  const verifiedContracts = await Promise.all(
    files.map(async f => {
      const { contractaddress, contractname } = artifactsData[f];

      const res = await fetch(`${apiUrl}?module=contract&action=getabi&address=${contractaddress}`);
      try {
        const json = await res.json();
        if (json.status === '1') {
          console.log(`${contractname} at ${contractaddress} is already verified, skipping`);
          return true;
        }
      } catch (error) {
        return false;
      }

      return false;
    })
  );

  return files.reduce((accum, f, i) => {
    if (!verifiedContracts[i]) accum[f] = artifactsData[f];
    return accum;
  }, {});
}

module.exports = filterOutVerified;
