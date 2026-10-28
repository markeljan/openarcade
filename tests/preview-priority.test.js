import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPreviews,previewOverlaps} from '../src/preview-priority.js';
const card=(index,x,y,focused=false)=>({index,focused,rect:{left:x-10,top:y-10,width:20,height:20}});
test('preview priority favors focus, selection, then viewport proximity',()=>{const candidates=[card(0,1000,1000),card(4,100,100),card(7,51,51),card(8,52,52,true),card(9,50,50)];assert.deepEqual(rankPreviews(candidates,4,50,50),[8,4,9,7,0])});
test('offscreen selection is ignored and ties remain stable',()=>{const candidates=[card(8,60,50),card(3,40,50),card(20,50,50)];assert.deepEqual(rankPreviews(candidates,0,50,50),[20,3,8])});

test('preview candidates require actual area overlap with the clipped viewport',()=>{const b={left:0,right:100,top:0,bottom:100};assert.equal(previewOverlaps({left:99,right:120,top:10,bottom:20},b),true);assert.equal(previewOverlaps({left:100,right:120,top:10,bottom:20},b),false);assert.equal(previewOverlaps({left:10,right:20,top:-30,bottom:-1},b),false)});
