'use strict';
let sdkPromise;
async function sdk() {
  if (!sdkPromise) sdkPromise = import('ip2location-io-nodejs').then(m => m.default || m).catch(err => { sdkPromise = undefined; throw err; });
  return sdkPromise;
}
function assertKey(key, service) {
  if (!key) throw new Error(`${service} requires an API key in the IP2Location config node`);
}
function withTimeout(task, timeoutMs = 10000) {
  if (!Number.isSafeInteger(Number(timeoutMs)) || Number(timeoutMs) < 1) throw new Error('Request timeout must be a positive integer in milliseconds');
  let timer;
  return Promise.race([
    Promise.resolve().then(task),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`API request timed out after ${timeoutMs} ms`)), Number(timeoutMs)); })
  ]).finally(() => clearTimeout(timer));
}
function errorText(err) {
  const parts = [err?.message, err?.code, err?.error_code, err?.error?.code, err?.error?.error_code, err?.error?.message];
  if (typeof err === 'string') parts.push(err);
  try { parts.push(JSON.stringify(err)); } catch (_) { /* ignore */ }
  return parts.filter(x => x != null).join(' ');
}
function parseApiError(err) {
  try {
    const parsed = JSON.parse(err.message);
    if (parsed?.error) {
      return {
        code: Number(parsed.error.error_code),
        message: parsed.error.error_message || err.message
      };
    }
  } catch {
    // Error message is not JSON.
  }
  return {
    code: null,
    message: err?.message || String(err)
  };
}
function mapError(err, service, key) {
  const { code, message } = parseApiError(err);
  if (!key && service === 'IP2Location.io' && code === 10000) {
    return new Error('Keyless daily quota exceeded (1,000 requests/day). Register at https://www.ip2location.io to get 50,000 free queries monthly.');
  }
  if ((service === 'WHOIS' || service === 'Hosted Domains') && code === 10004) {
    return new Error('Insufficient API credits. Check your account balance or plan.');
  }
  return new Error(message);
}
async function lookup(service, key, task, timeoutMs) {
  try { return await withTimeout(task, timeoutMs); }
  catch (err) { throw mapError(err, service, key); }
}
async function ipLookup(key, ip, lang, loadSdk = sdk, timeoutMs = 10000) {
  return lookup('IP2Location.io', key, async () => {
    const x = await loadSdk();
    return new x.IPGeolocation(new x.Configuration(key || '')).lookup(ip, (typeof lang === 'string' && lang.trim()) || undefined);
  }, timeoutMs);
}
async function whoisLookup(key, domain, timeoutMs = 10000, loadSdk = sdk) {
  assertKey(key, 'WHOIS');
  return lookup('WHOIS', key, async () => {
    const x = await loadSdk();
    return new x.DomainWhois(new x.Configuration(key)).lookup(domain);
  }, timeoutMs);
}
async function hostedLookup(key, ip, page = 1, timeoutMs = 10000, loadSdk = sdk) {
  assertKey(key, 'Hosted Domains');
  if (!Number.isSafeInteger(page) || page <= 0) throw new Error('Hosted Domains page must be a positive integer');
  return lookup('Hosted Domains', key, async () => {
    const x = await loadSdk();
    return new x.HostedDomain(new x.Configuration(key)).lookup(ip, page);
  }, timeoutMs);
}
module.exports = {ipLookup, whoisLookup, hostedLookup, withTimeout, mapError};
