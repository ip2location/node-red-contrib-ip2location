'use strict';
const {readIP,run,credential} = require('../lib/utils');
const api = require('../lib/api-client');
module.exports = function (RED) {
  function Hosted(config) {
    RED.nodes.createNode(this,config);
    const cfg = RED.nodes.getNode(config.connection);
    run(this, msg => api.hostedLookup(credential(cfg,'apiKey'), readIP(msg)));
  }
  RED.nodes.registerType('ip2location-hosted-domains',Hosted);
};
