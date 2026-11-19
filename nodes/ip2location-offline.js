'use strict';
const {readIP,run} = require('../lib/utils');
const {openBin} = require('../lib/offline-client');
module.exports = function (RED) {
  function Offline(config) {
    RED.nodes.createNode(this,config);
    let db;
    let openError;
    try { db = openBin('location', config.binPath); } catch (e) { openError = e; this.status({fill:'red',shape:'ring',text:'BIN unavailable'}); }
    run(this, async msg => {
      const ip = readIP(msg);
      if (openError) throw openError;
      return db.getAll(ip);
    });
    this.on('close', function(done) {
      try { if (db && typeof db.close === 'function') db.close(); done(); } catch(err) { done(err); }
    });
  }
  RED.nodes.registerType('ip2location-offline', Offline);
};
