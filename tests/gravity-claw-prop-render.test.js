import test from 'node:test';
import assert from 'node:assert/strict';
import {drawClawProp} from '../src/feature-games15.js';
test('claw ammunition types retain their reference silhouettes and colors',()=>{const noop=()=>{};for(const [kind,color] of [['crate','#5d708a'],['can','#e05548'],['disc','#b8c4d4'],['cell','#ffd166'],['bolt','#63e0f5'],['mite','#a4d465']]){let colors=[];const c=new Proxy({fillRect(){colors.push(this.fillStyle)},fill(){colors.push(this.fillStyle)}},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});drawClawProp(c,{kind,x:100,y:100});assert.ok(colors.includes(color),kind)}});
