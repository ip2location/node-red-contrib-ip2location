'use strict';
const {readIP,run,credential,requestTimeout} = require('../lib/utils');
const api = require('../lib/api-client');
module.exports = function (RED) {
  function Lookup(config) {
    RED.nodes.createNode(this,config);
    const cfg = RED.nodes.getNode(config.connection);
    run(this, msg => {
      const lang = typeof msg.lang === 'string' && msg.lang.trim() ? msg.lang.trim() : (config.lang || '').trim();
      return api.ipLookup(credential(cfg,'apiKey'), readIP(msg), lang, requestTimeout(config.timeoutMs), undefined);
    });
  }
  RED.nodes.registerType('ip2location-lookup',Lookup);
};
