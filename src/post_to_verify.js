const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

const delayMS = ms =>
  ms &&
  new Promise(res => {
    setTimeout(res, ms);
  });

const removeUndefined = obj =>
  Object.keys(obj).reduce((accum, key) => {
    if (obj[key] !== undefined) accum[key] = obj[key];

    return accum;
  }, {});

async function postToVerify(
  artifactsData,
  flattenedContracts,
  constructorArguments,
  { apiUrl, apiKey, optimizer, network, delay = 20000, logger, verbose }
) {
  const files = Object.keys(artifactsData);
  logger && logger.log();

  if (files.length === 0) {
    logger && logger.log('All contracts already verified. Exiting...');
    return;
  }

  if (!apiKey) {
    throw new Error("No API_KEY provided, can't verify");
  }

  const { enabled: optimizationUsed = false, runs = 200 } = optimizer;

  const defaultBody = {
    apikey: apiKey,
    optimizationUsed: optimizationUsed ? '1' : '0',
    runs,
    module: 'contract',
    action: 'verifysourcecode',
    hasNonEmptyConstructor: undefined,
    txhash: undefined,
    sourcePath: undefined,
    bytecode: undefined
  };

  const createCheckGUIDurl = guid =>
    `${apiUrl}?module=contract&action=checkverifystatus&guid=${guid}`;

  const contractAtEtherscanURL = `https://${
    network === 'mainnet' ? '' : `${network}.`
  }etherscan.io/address`;
  const createContractCodeAtEthersacanURL = address => `${contractAtEtherscanURL}/${address}#code`;

  const GUIDs = await Promise.all(
    files.map(async f => {
      const contractData = artifactsData[f];

      const body = {
        ...contractData,
        ...defaultBody,
        sourceCode: flattenedContracts[f],
        constructorArguements: constructorArguments[f]
      };

      const cleanBody = removeUndefined(body);

      const options = {
        method: 'post',
        body: new URLSearchParams(cleanBody),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }
      };

      const { contractname, contractaddress } = contractData;
      let res;
      try {
        res = await fetch(apiUrl, options);
      } catch (error) {
        logger &&
          logger.error(
            `Error sending verification request to ${contractAtEtherscanURL} for ${contractname} at ${contractaddress}: ${
              error.message
            }`
          );
        return;
      }

      if (!res.ok) {
        logger &&
          logger.error(`Error sending request to verify ${contractname} at ${contractaddress}`);
        logger && logger.error(res.status, res.statusText);
        return;
      }

      let json;
      try {
        json = await res.json();
      } catch (error) {
        logger &&
          logger.error(
            `Error parsing verification response for ${contractname} at ${contractaddress}: ${
              error.message
            }`
          );
        return;
      }

      if (json.status === '1') {
        const guid = json.result;
        logger && logger.log(`Verification started for ${contractname} at ${contractaddress}`);
        logger && logger.log('\tGUID: ', guid);
        logger && logger.log(`Check progress at ${createCheckGUIDurl(guid)}\n`);
        return guid;
      }
      logger &&
        logger.log(`Error verifying ${contractname} at ${contractaddress}. ${json.result}\n`);
    })
  );

  const GUIDinProgress2contract = GUIDs.reduce((accum, guid, i) => {
    if (guid) {
      const { contractname, contractaddress } = artifactsData[files[i]];
      accum[guid] = { contractname, contractaddress };
    }
    return accum;
  }, {});

  const checkGUID = async guid => {
    verbose && logger && logger.log(`\nChecking status of GUID ${guid}`);
    const res = await fetch(createCheckGUIDurl(guid));

    if (!res.ok) throw new Error(`Error fetching status of ${guid}`);
    return res.json();
  };

  logger && logger.log();

  const waitForGuid = async guid => {
    const { contractname, contractaddress } = GUIDinProgress2contract[guid];
    try {
      const json = await checkGUID(guid);

      // if result is not Pending, means it either failed or passed
      if (!json.result.includes('Pending')) {
        logger && logger.log(`${contractname} at ${contractaddress}`, json.result);
        delete GUIDinProgress2contract[guid];
        if (json.status === '1' && json.result.includes('Verified')) {
          logger &&
            logger.log(
              `View verified code at ${createContractCodeAtEthersacanURL(contractaddress)}\n`
            );
        }
      } else {
        verbose && logger && logger.log(`${contractname} at ${contractaddress}`, json.result);
      }
    } catch (error) {
      logger && logger.error(`${contractname} at ${contractaddress}`, error);
      delete GUIDinProgress2contract[guid];
    }
  };

  let guids;
  // each 20 sec check for verification progress
  while ((guids = Object.keys(GUIDinProgress2contract)).length > 0) {
    verbose &&
      delay > 0 &&
      logger &&
      logger.log(`\nWaiting ${delay} ms before checking verification status\n`);
    /* eslint-disable no-await-in-loop */
    await delayMS(delay);
    await Promise.all(guids.map(waitForGuid));
    /* eslint-enable no-await-in-loop */
  }
}

module.exports = postToVerify;
