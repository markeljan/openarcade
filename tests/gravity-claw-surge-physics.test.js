import test from 'node:test';
import assert from 'node:assert/strict';
import {scatterClawSurge} from '../src/feature-games15.js';
test('surge preserves existing momentum and releases live thrown objects as loose props',()=>{const props=[{kind:'crate',vx:40,vy:20}],shots=[{kind:'cell',vx:80,vy:-30,t:1},{kind:'can',vx:10,vy:10,t:0,spent:true}];scatterClawSurge(props,shots,()=>.5);assert.equal(props.length,2);assert.equal(props[0].vx,40);assert.equal(props[0].vy,-43);assert.equal(props[1].kind,'cell');assert.equal(props[1].vx,80);assert.equal(props[1].vy,-93)});
