/**
 * Outputs `Hello, World!` when running `truffle run hello`,
 * or `Hello, ${name}` when running `truffle run hello [name]`
 * @param {Config} config - A truffle-config object.
 * Has attributes like `truffle_directory`, `working_directory`, etc.
 */

const { processPluginConfig } = require('./process_config');
const verify = require('./index');
const printHelp = require('./print_help');

module.exports = async config => {
  if (config.help || config.h) {
    printHelp();
    return;
  }

  const options = await processPluginConfig(config);

  if (options.artifacts.length === 0) {
    console.log('No artifact paths given.');
    printHelp();
    return;
  }

  await verify(options);
};
