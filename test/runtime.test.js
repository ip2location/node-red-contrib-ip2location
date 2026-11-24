'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const api = require('../lib/api-client');
const {openBin} = require('../lib/offline-client');
function construct(file,type,config={},credentials={apiKey:'test-key'}) {
  const constructors={};
  const RED={nodes:{createNode(node){ const ee=new EventEmitter();node.on=ee.on.bind(ee);node.emit=ee.emit.bind(ee);node.status=()=>{};node.sent=[];node.send=m=>node.sent.push(m);node.error=()=>{}; },registerType(k,v){constructors[k]=v;},getNode(){return {credentials};}}};
  require('../nodes/'+file)(RED);
  const node=new constructors[type](config);
  return node;
}
function deliver(node,msg) {return new Promise((resolve,reject)=>{
  node.emit('input',msg,m=>{node.sent.push(m);},e=>e?reject(e):resolve());
});}
test('online lookup calls adapter, replaces payload and preserves metadata',async()=>{
  const old=api.ipLookup;
  api.ipLookup=async(key,ip,lang)=>({keyUsed:key?'yes':'no',ip,lang});
  try {
    const n=construct('ip2location-lookup','ip2location-lookup',{lang:'es'});
    const m={ip:'8.8.8.8',payload:'old',traceId:42};
    await deliver(n,m);
    assert.deepEqual(n.sent[0].payload,{keyUsed:'yes',ip:'8.8.8.8',lang:'es'});
    assert.equal(n.sent[0].traceId,42);
  } finally {api.ipLookup=old;}
});
test('invalid lookup input calls done(error), sends no message',async()=>{
  const n=construct('ip2location-lookup','ip2location-lookup');
  await assert.rejects(deliver(n,{payload:'invalid'}),/Invalid IPv4/);
  assert.equal(n.sent.length,0);
});
test('missing WHOIS key rejects without issuing a request',async()=>{
  const n=construct('ip2location-whois','ip2location-whois',{},{});
  await assert.rejects(deliver(n,{payload:'example.com'}),/API key/);
});
test('missing BIN path causes Catch-compatible error',async()=>{
  const n=construct('ip2location-offline','ip2location-offline',{binPath:'/this/file/does/not/exist.BIN'});
  await assert.rejects(deliver(n,{payload:'8.8.8.8'}),/ENOENT/);
});
