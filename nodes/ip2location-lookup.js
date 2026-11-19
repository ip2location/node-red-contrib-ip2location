'use strict';
const {readIP,run,credential} = require('../lib/utils');
const api = require('../lib/api-client');
module.exports = function (RED) {
  function Lookup(config) {
    RED.nodes.createNode(this,config);
    const cfg = RED.nodes.getNode(config.connection);
    run(this, msg => {
      const ip = readIP(msg);
      const lang = (typeof msg.lang === 'string' && msg.lang.trim()) || (config.lang || '');
      return api.ipLookup(credential(cfg,'apiKey'), ip, lang);
    });
  }
  RED.nodes.registerType('ip2location-lookup',Lookup);
};
