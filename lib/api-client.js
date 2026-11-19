'use strict';
let sdkPromise;
async function sdk() {
  if (!sdkPromise) sdkPromise = import('ip2location-io-nodejs').then(m => m.default || m);
  return sdkPromise;
}
function assertKey(key, service) {
  if (!key) throw new Error(`${service} requires an API key in the IP2Location config node`);
}
// The SDK omits the `key` query parameter when Configuration is given an empty string.
// Both keyless and authenticated lookups therefore use exactly the same SDK path.
async function ipLookup(key, ip, lang, loadSdk = sdk) {
  const x = await loadSdk();
  return new x.IPGeolocation(new x.Configuration(key || '')).lookup(ip, lang || undefined);
}
async function whoisLookup(key, domain) {
  assertKey(key, 'WHOIS');
  const x = await sdk();
  return new x.DomainWhois(new x.Configuration(key)).lookup(domain);
}
async function hostedLookup(key, ip) {
  assertKey(key, 'Hosted Domains');
  const x = await sdk();
  return new x.HostedDomain(new x.Configuration(key)).lookup(ip);
}
module.exports = {ipLookup, whoisLookup, hostedLookup};
