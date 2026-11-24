'use strict';
const {readIP,run} = require('../lib/utils');
const {openBin,validateBinResult} = require('../lib/offline-client');
module.exports = function (RED) {
  function Offline(config) {
    RED.nodes.createNode(this,config);
    let db, openError;
    const initialize = () => {
      const next = openBin('location',config.binPath);
      const previous = db;
      db = next;
      openError = undefined;
      if (previous) previous.close();
      this.status({fill:'green',shape:'dot',text:'ready'});
    };
    try { initialize(); } catch (e) { openError=e; this.status({fill:'red',shape:'ring',text:'BIN unavailable'}); }
    run(this, msg => {
      const ip = readIP(msg);
      if (msg.reload === true) {
        try { initialize(); } catch (err) { openError = err; throw err; }
      }
      if (openError) throw openError;
      return validateBinResult('location',db.getAll(ip));
    }, {offline:true});
    this.on('close', done => { try { if (db) db.close(); done(); } catch (err) { done(err); } });
  }
  RED.nodes.registerType('ip2location-offline',Offline);
};
