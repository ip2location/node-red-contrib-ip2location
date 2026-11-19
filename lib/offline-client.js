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
  // Official libraries support open() and close(). The proxy SDK reports 0 on success.
  try {
    const status = client.open(absolute);
    if (type === 'proxy' && status !== 0 && status !== undefined) throw new Error('IP2Proxy BIN could not be opened');
    return client;
  } catch (err) {
    try { client.close(); } catch (_) { /* best-effort */ }
    throw err;
  }
}
module.exports = {openBin};
