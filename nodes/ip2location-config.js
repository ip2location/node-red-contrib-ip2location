'use strict';
module.exports = function (RED) {
  function Config(config) { RED.nodes.createNode(this, config); this.name = config.name; }
  RED.nodes.registerType('ip2location-config', Config, {
    credentials: {apiKey:{type:'password'}}
  });
};
