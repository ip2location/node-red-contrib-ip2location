'use strict';
// Optional Node-RED helper integration smoke suite. Run with `npm run test:integration`.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const helper = require('node-red-node-test-helper');
const lookup = require('../nodes/ip2location-lookup');
const config = require('../nodes/ip2location-config');
const api = require('../lib/api-client');
helper.init(require.resolve('node-red'));
function start() {return new Promise((resolve,reject)=>helper.startServer(e=>e?reject(e):resolve()));}
function stop() {return new Promise(resolve=>helper.stopServer(()=>resolve()));}
function load(flow) {return new Promise((resolve,reject)=>helper.load([config,lookup],flow,e=>e?reject(e):resolve()));}
function unload() {return helper.unload();}
test('Node-RED helper flow receives transformed message',async()=>{
  const old=api.ipLookup;
  api.ipLookup=async()=>({country_code:'US'});
  await start();
  try {
    await load([{id:'a1',type:'ip2location-lookup',name:'Lookup',wires:[['h1']]}, {id:'h1',type:'helper'}]);
    const node=helper.getNode('a1');
    const receiver=helper.getNode('h1');
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('no output')),3000);
      receiver.on('input',msg=>{clearTimeout(timeout); try {assert.equal(msg.payload.country_code,'US');resolve();}catch(e){reject(e);} });
      node.receive({payload:'8.8.8.8'});
    });
  } finally {await unload();await stop();api.ipLookup=old;}
});
