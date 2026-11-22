'use strict';
const net = require('node:net');
function readString(msg, primary, name) {
  const present = Object.prototype.hasOwnProperty.call(msg, primary);
  const value = present ? msg[primary] : msg.payload;
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} must be a non-empty string in msg.${primary} or msg.payload`);
  return value.trim();
}
function readIP(msg) {
  const ip = readString(msg, 'ip', 'IP address');
  if (!net.isIP(ip)) throw new Error('Invalid IPv4 or IPv6 address');
  return ip;
}
function readDomain(msg) {
  const {domainToASCII} = require('node:url');
  const input = readString(msg, 'domain', 'Domain');
  const ascii = domainToASCII(input.replace(/\.$/, ''));
  if (!ascii || ascii.length > 253 || !/^(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(ascii)) {
    throw new Error('Invalid domain name; supply a hostname, not a URL');
  }
  return ascii;
}
function pageNumber(value) {
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) throw new Error('Hosted Domains page must be a positive integer');
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error('Hosted Domains page must be a positive integer');
  return n;
}
function requestTimeout(value) {
  const timeout = value === undefined || value === '' ? 10000 : Number(value);
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 300000) throw new Error('Request timeout must be between 1 and 300000 ms');
  return timeout;
}
function run(node, work, options = {}) {
  node.on('input', async (msg, send, done) => {
    send = send || node.send.bind(node);
    try {
      node.status({fill:'blue',shape:'dot',text:options.offline ? 'querying BIN' : 'requesting'});
      const result = await work(msg);
      if (result === undefined || result === null) throw new Error('Lookup returned no data');
      msg.payload = result;
      send(msg);
      node.status({fill:'green',shape:'dot',text:options.offline ? 'ready' : 'success'});
      if (done) done();
    } catch (err) {
      node.status({fill:'red',shape:'ring',text:'error'});
      if (done) done(err); else node.error(err, msg);
    }
  });
}
function credential(node, field) {
  return node && node.credentials && typeof node.credentials[field] === 'string' ? node.credentials[field].trim() : '';
}
module.exports = {readIP, readDomain, pageNumber, requestTimeout, run, credential};
