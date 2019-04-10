const fetch = require('node-fetch');

async function filterOutVerified(artifactsData, { apiUrl, logger, verbose }) {
  const files = Object.keys(artifactsData);
  logger && logger.log();

  const verifiedContracts = await Promise.all(
    files.map(async f => {
      const { contractaddress, contractname } = artifactsData[f];

      const res = await fetch(`${apiUrl}?module=contract&action=getabi&address=${contractaddress}`);
      try {
        const json = await res.json();
        if (json.status === '1') {
          logger &&
            logger.log(`${contractname} at ${contractaddress} is already verified, skipping`);
          return true;
        }
      } catch (error) {
        verbose &&
          logger &&
          logger.error(
            `Error checking if ${contractname} at ${contractaddress} is verified: ${error.message}`
          );
        return false;
      }

      return false;
    })
  );

  const alreadyVerified = [];

  const unverified = files.reduce((accum, f, i) => {
    if (verifiedContracts[i]) alreadyVerified.push(f);
    else accum[f] = artifactsData[f];
    return accum;
  }, {});

  return { unverified, alreadyVerified };
}

module.exports = filterOutVerified;
