'use strict';
const fs = require('node:fs');
const path = require('node:path');
function openBin(type, filename) {
  if (!filename || typeof filename !== 'string') throw new Error('BIN database path is required');
  const absolute = path.resolve(filename);
  const stat = fs.statSync(absolute);
  if (!stat.isFile()) throw new Error('BIN path must point to a regular file');
  const klass = type === 'proxy' ? require('ip2proxy-nodejs').IP2Proxy : require('ip2location-nodejs').IP2Location;
  const client = new klass();
  try {
    const status = client.open(absolute);
    if (type === 'proxy' && status !== 0 && status !== undefined) throw new Error('IP2Proxy BIN could not be opened');
    // A blank or damaged BIN can return a synthetic version; package version also verifies header.
    const version = client.getDatabaseVersion();
    const packageVersion = client.getPackageVersion();
    if (!version || !packageVersion || /undefined|NaN/i.test(String(version))) throw new Error(`${type} BIN file could not be initialized`);
    return client;
  } catch (err) {
    try { client.close(); } catch (_) { /* best-effort */ }
    throw err;
  }
}
function validateBinResult(type, result) {
  if (!result || typeof result !== 'object') throw new Error('BIN lookup returned no data');
  const value = result.country_short ?? result.countryShort;
  const errors = type === 'proxy'
    ? ['MISSING FILE', 'IPV6 ADDRESS MISSING IN IPV4 BIN', 'INVALID IP ADDRESS']
    : ['MISSING_FILE', 'IPV6_NOT_SUPPORTED', 'INVALID_IP_ADDRESS'];
  if (typeof value === 'string' && errors.includes(value)) throw new Error(`${type === 'proxy' ? 'IP2Proxy' : 'IP2Location'} BIN lookup failed: ${value}`);
  return result;
}
module.exports = {openBin, validateBinResult};
