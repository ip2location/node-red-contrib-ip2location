'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readIP,readDomain,pageNumber,requestTimeout} = require('../lib/utils');
const {ipLookup,hostedLookup,whoisLookup} = require('../lib/api-client');
const {validateBinResult} = require('../lib/offline-client');
function fakeSdk(calls, response = {}) {
  class Configuration { constructor(key) {this.key=key;} }
  class IPGeolocation { constructor(config){this.config=config;} lookup(ip,lang){calls.push({method:'ip',ip,lang,key:this.config.key});return Promise.resolve(response);} }
  class DomainWhois {constructor(config){this.config=config;}lookup(domain){calls.push({method:'whois',domain});return Promise.resolve(response);} }
  class HostedDomain {constructor(config){this.config=config;}lookup(ip,page){calls.push({method:'hosted',ip,page});return Promise.resolve(response);} }
  return async()=>({Configuration, IPGeolocation, DomainWhois, HostedDomain});
}
test('empty language omitted, trim non-empty language', async()=>{
  const calls=[]; const load=fakeSdk(calls);
  await ipLookup('', '8.8.8.8', '   ',10000,load);
  await ipLookup('x','8.8.8.8',' es ',10000,load);
  assert.equal(calls[0].lang,undefined);
  assert.equal(calls[1].lang,'es');
});
test('hosted page defaults to one and forwards chosen page', async()=>{
  const calls=[];const load=fakeSdk(calls);
  await hostedLookup('key','8.8.8.8',1,10000,load);
  await hostedLookup('key','8.8.8.8',3,10000,load);
  assert.deepEqual(calls.map(c=>c.page),[1,3]);
  await assert.rejects(hostedLookup('key','8.8.8.8',0,10000,load),/positive integer/);
});
test('request times out when SDK never resolves',async()=>{
  const never=async()=>({Configuration:class {}, IPGeolocation:class {lookup(){return new Promise(()=>{});}}});
  await assert.rejects(ipLookup('','8.8.8.8','',20,never),/timed out/);
});
test('quota and credit failures get useful messages', async()=>{
  class Configuration{};
  const keyless=async()=>({Configuration,IPGeolocation:class {lookup(){return Promise.reject(new Error(JSON.stringify({error:{error_code:10000,error_message:'Daily quota exceeded. Please register at https://www.ip2location.io to get 50,000 free queries monthly.'}})));}}});
  const credits=async()=>({Configuration,HostedDomain:class {lookup(){return Promise.reject(new Error(JSON.stringify({error:{error_code:10004,error_message:'Insufficient credits'}})));}},DomainWhois:class {lookup(){return Promise.reject(new Error(JSON.stringify({error:{error_code:10004,error_message:'Insufficient credits'}})));}}});
  await assert.rejects(ipLookup('','8.8.8.8','',10000,keyless),/Keyless daily quota exceeded/);
  await assert.rejects(hostedLookup('x','8.8.8.8',1,1000,credits),/Insufficient API credits/i);
  await assert.rejects(whoisLookup('x','example.com',1000,credits),/Insufficient API credits/i);
});
test('IP property present but invalid does not fallback',()=>{
  assert.throws(()=>readIP({ip:'',payload:'8.8.8.8'}),/non-empty string/);
  assert.throws(()=>readIP({ip:42,payload:'8.8.8.8'}),/non-empty string/);
});
test('IDN and trailing dot validation',()=>{
  assert.equal(readDomain({domain:'bücher.de.'}),'xn--bcher-kva.de');
  assert.throws(()=>readDomain({domain:'https://example.com'}),/Invalid domain/);
});
test('offline SDK errors are rejected',()=>{
  assert.throws(()=>validateBinResult('location',{country_short:'MISSING_FILE'}),/MISSING_FILE/);
  assert.throws(()=>validateBinResult('location',{countryShort:'IPV6_NOT_SUPPORTED'}),/IPV6_NOT_SUPPORTED/);
  assert.throws(()=>validateBinResult('proxy',{countryShort:'IPV6 ADDRESS MISSING IN IPV4 BIN'}),/IPV6 ADDRESS/);
  assert.deepEqual(validateBinResult('location',{countryShort:'US'}),{countryShort:'US'});
});
test('positive page and timeout validation',()=>{
  for(const x of [0,-1,1.2,'1.5','0',null]) assert.throws(()=>pageNumber(x),/positive integer/);
  assert.equal(pageNumber('3'),3);
  assert.equal(requestTimeout(''),10000);
});
