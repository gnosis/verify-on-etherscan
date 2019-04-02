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
  { apiUrl, apiKey, optimizer, network, delay = 20000 }
) {
  const files = Object.keys(artifactsData);
  console.log();

  if (files.length === 0) {
    console.log('All contracts already verified. Exiting...');
    return;
  }

  if (!apiKey) {
    throw new Error("No API_KEY provided, can't verify");
  }

  const { enabled: optimizationUsed = true, runs = 200 } = optimizer;

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

      const res = await fetch(apiUrl, options);
      const { contractname, contractaddress } = contractData;

      if (!res.ok) {
        console.error(`Error sending request to verify ${contractname} at ${contractaddress}`);
        console.error(res.status, res.statusText);
        return;
      }

      const json = await res.json();
      if (json.status === '1') {
        const guid = json.result;
        console.log(`Verification started for ${contractname} at ${contractaddress}`);
        console.log('\tGUID: ', guid);
        console.log(`Check progress at ${createCheckGUIDurl(guid)}\n`);
        return guid;
      }
      console.log(`Error verifying ${contractname} at ${contractaddress}. ${json.result}\n`);
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
    const res = await fetch(createCheckGUIDurl(guid));

    if (!res.ok) throw new Error(`Error fetching status of ${guid}`);
    return res.json();
  };

  console.log();

  const waitForGuid = async guid => {
    const { contractname, contractaddress } = GUIDinProgress2contract[guid];
    try {
      const json = await checkGUID(guid);

      // if result is not Pending, means it either failed or passed
      if (!json.result.includes('Pending')) {
        console.log(`${contractname} at ${contractaddress}`, json.result);
        delete GUIDinProgress2contract[guid];
        if (json.status === '1' && json.result.includes('Verified')) {
          console.log(
            `View verified code at ${createContractCodeAtEthersacanURL(contractaddress)}`
          );
        }
      }
    } catch (error) {
      console.error(`${contractname} at ${contractaddress}`, error);
      delete GUIDinProgress2contract[guid];
    }
  };

  let guids;
  // each 20 sec check for verification progress
  while ((guids = Object.keys(GUIDinProgress2contract)).length > 0) {
    /* eslint-disable no-await-in-loop */
    await delayMS(delay);
    await Promise.all(guids.map(waitForGuid));
    /* eslint-enable no-await-in-loop */
  }
}

module.exports = postToVerify;
