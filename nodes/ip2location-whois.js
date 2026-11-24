'use strict';
const {readDomain,run,credential,requestTimeout} = require('../lib/utils');
const api = require('../lib/api-client');
module.exports = function (RED) {
  function Whois(config) {
    RED.nodes.createNode(this,config);
    const cfg = RED.nodes.getNode(config.connection);
    run(this, msg => api.whoisLookup(credential(cfg,'apiKey'),readDomain(msg),requestTimeout(config.timeoutMs)));
  }
  RED.nodes.registerType('ip2location-whois',Whois);
};
