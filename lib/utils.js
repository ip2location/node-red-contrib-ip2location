'use strict';
const net = require('node:net');
function readString(msg, primary, name) {
  const value = typeof msg[primary] === 'string' && msg[primary].trim() ? msg[primary] : msg.payload;
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} must be a non-empty string in msg.${primary} or msg.payload`);
  return value.trim();
}
function readIP(msg) {
  const ip = readString(msg, 'ip', 'IP address');
  if (!net.isIP(ip)) throw new Error('Invalid IPv4 or IPv6 address');
  return ip;
}
function readDomain(msg) {
  const domain = readString(msg, 'domain', 'Domain');
  // Disallow URL schemes, whitespace, ports and arbitrary HTTP parameters.
  if (domain.length > 253 || !/^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(domain)) {
    throw new Error('Invalid domain name; supply a hostname, not a URL');
  }
  return domain;
}
function run(node, work) {
  node.on('input', async (msg, send, done) => {
    send = send || node.send.bind(node);
    try {
      node.status({fill:'blue',shape:'dot',text:'looking up'});
      const result = await work(msg);
      if (result === undefined || result === null) throw new Error('Lookup returned no data');
      msg.payload = result;
      send(msg);
      node.status({fill:'green',shape:'dot',text:'success'});
      if (done) done();
    } catch (err) {
      // Node-RED calls Catch nodes when done(err) is invoked.
      node.status({fill:'red',shape:'ring',text:'error'});
      if (done) done(err); else node.error(err, msg);
    }
  });
}
function credential(node, field) {
  return node && node.credentials && typeof node.credentials[field] === 'string' ? node.credentials[field].trim() : '';
}
module.exports = {readIP, readDomain, run, credential};
