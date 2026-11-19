'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readIP, readDomain} = require('../lib/utils');
const {ipLookup, whoisLookup, hostedLookup} = require('../lib/api-client');
function fakeSDK(calls, outcome = {ip:'8.8.8.8',country_code:'US'}) {
  class Configuration {
    constructor(key) { this.key = key; }
  }
  class IPGeolocation {
    constructor(config) { this.config = config; }
    lookup(ip, lang) {
      calls.push({key:this.config.key, ip, lang});
      if (outcome instanceof Error) return Promise.reject(outcome);
      return Promise.resolve(outcome);
    }
  }
  return async () => ({Configuration, IPGeolocation});
}
test('IP input prioritizes msg.ip and validates address', () => {
  assert.equal(readIP({ip:' 8.8.8.8 ',payload:'1.1.1.1'}), '8.8.8.8');
  assert.equal(readIP({payload:'2001:4860:4860::8888'}), '2001:4860:4860::8888');
  assert.throws(() => readIP({payload:'no-ip'}), /Invalid IPv4/);
  assert.throws(() => readIP({payload:{ip:'8.8.8.8'}}), /non-empty string/);
});
test('WHOIS domain input validates and prioritizes msg.domain', () => {
  assert.equal(readDomain({domain:'example.com',payload:'example.org'}), 'example.com');
  assert.throws(() => readDomain({payload:'https://example.com'}), /Invalid domain/);
});
test('keyless IP lookup passes an empty API key through the SDK', async () => {
  const calls=[];
  const result = await ipLookup('', '8.8.8.8', '', fakeSDK(calls));
  assert.deepEqual(result, {ip:'8.8.8.8', country_code:'US'});
  assert.deepEqual(calls, [{key:'', ip:'8.8.8.8', lang:undefined}]);
});
test('authenticated IP lookup uses the same SDK and forwards language', async () => {
  const calls=[];
  await ipLookup('test-key', '2001:4860:4860::8888', 'es', fakeSDK(calls));
  assert.deepEqual(calls, [{key:'test-key', ip:'2001:4860:4860::8888', lang:'es'}]);
});
test('SDK lookup errors propagate to Node-RED error handling', async () => {
  const calls=[];
  await assert.rejects(ipLookup('', '8.8.8.8', '', fakeSDK(calls, new Error('quota reached'))), /quota reached/);
  assert.equal(calls.length, 1);
});
test('WHOIS and hosted domains require keys', async () => {
  await assert.rejects(whoisLookup('', 'example.com'), /API key/);
  await assert.rejects(hostedLookup('', '8.8.8.8'), /API key/);
});
