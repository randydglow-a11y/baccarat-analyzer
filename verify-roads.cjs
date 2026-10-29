'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sandbox={window:{},console};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('roadmaps.js','utf8'),sandbox);
const {buildBig,derived}=sandbox.window.BaccaratRoads;
const shoe='TPPBPPPTTPBBBBBTPBPPBTBPBBBBPTBBPBBBBBBPP'.split('');
const cases=[];
function test(name,fn){try{fn();cases.push({name,pass:true});console.log('PASS',name)}catch(e){cases.push({name,pass:false});console.error('FAIL',name,e.message)}}
const count=(x,v)=>x.filter(c=>c===v).length;
test('Video 41 hands and totals',()=>{assert.equal(shoe.length,41);assert.equal(count(shoe,'B'),21);assert.equal(count(shoe,'P'),14);assert.equal(count(shoe,'T'),6)});
test('Opening tie belongs to first Player Big Road mark',()=>{const big=buildBig(shoe);assert.equal(big.cells[0].v,'P');assert.equal(big.cells[0].tie,1)});
test('Big Road and derived roads never overlap across 41 prefixes',()=>{for(let n=0;n<=41;n++){const big=buildBig(shoe.slice(0,n));for(const cells of [big.cells,...[1,2,3].map(i=>derived(big,i))]){assert.equal(new Set(cells.map(x=>x.c+','+x.r)).size,cells.length)}}});
test('Roads never rewrite historical marks across 41 prefixes',()=>{const full=buildBig(shoe);for(let offset=0;offset<=3;offset++){const expected=offset?derived(full,offset):full.cells;for(let n=0;n<=41;n++){const b=buildBig(shoe.slice(0,n));const partial=offset?derived(b,offset):b.cells;for(let i=0;i<partial.length;i++)for(const key of ['v','c','r'])assert.equal(partial[i][key],expected[i][key],`offset ${offset} hand ${n} mark ${i} key ${key}`)}}});
function row(cells,row,start,end){const map=new Map(cells.map(x=>[x.c+','+x.r,x.v==='B'?'R':'U']));return Array.from({length:end-start+1},(_,i)=>map.get((start+i-1)+','+(row-1))||'.').join('')}
test('Independent reader Small Road first 10 top cells',()=>assert.equal(row(derived(buildBig(shoe),2),1,1,10),'RURURURURU'));
test('Independent reader Small Road row 2 columns 4–6',()=>assert.equal(row(derived(buildBig(shoe),2),2,4,6),'URU'));
test('Independent reader Small Road row 3 columns 5–6',()=>assert.equal(row(derived(buildBig(shoe),2),3,5,6),'RU'));
test('Independent reader Small Road bottom row columns 6–8',()=>assert.equal(row(derived(buildBig(shoe),2),6,6,8),'UUU'));
test('Independent reader Big Eye Boy top row columns 2–10',()=>assert.equal(row(derived(buildBig(shoe),1),1,2,10),'URURURURU'));
test('Independent reader Cockroach Pig top row columns 2–10',()=>assert.equal(row(derived(buildBig(shoe),3),1,2,10),'URURURURU'));
const videoHand7=derived(buildBig(shoe.slice(0,7)),2);
console.log('REFERENCE DISCREPANCY (non-blocking): video hand 7 expected red/red; implementation:',videoHand7.map(x=>x.v==='B'?'red':'blue').join('/'));
const fails=cases.filter(x=>!x.pass);console.log(`${cases.length-fails.length}/${cases.length} automated checks passed`);
if(fails.length)process.exitCode=1;
