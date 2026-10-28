import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldScrollGalleryWheel,nearestGalleryCard,galleryEdgeVelocity,verticalGalleryNeighbor} from '../src/gallery-controls.js';
const base={row:true,coarse:false,deltaX:0,deltaY:80,scrollWidth:800,clientWidth:400};
test('vertical mouse wheel scrolls an overflowing row horizontally',()=>{assert.equal(shouldScrollGalleryWheel(base),true);assert.equal(shouldScrollGalleryWheel({...base,deltaY:-40}),true)});
test('wall, touch, horizontal gestures, and a fitting row retain native scrolling',()=>{for(const change of [{row:false},{coarse:true},{deltaX:81},{deltaX:80},{scrollWidth:400}])assert.equal(shouldScrollGalleryWheel({...base,...change}),false)});

test('swiped row selects the card nearest its center',()=>{const cards=[{index:0,rect:{left:-110,width:100}},{index:1,rect:{left:20,width:100}},{index:2,rect:{left:150,width:100}}];assert.equal(nearestGalleryCard(cards,120),1);assert.equal(nearestGalleryCard(cards,190),2);assert.equal(nearestGalleryCard([],120),null)});

test('edge scroll speed ramps toward the viewport edge',()=>{assert.equal(galleryEdgeVelocity(0,1000),-16);assert.equal(galleryEdgeVelocity(55,1000),-8);assert.equal(galleryEdgeVelocity(500,1000),0);assert.equal(galleryEdgeVelocity(945,1000),8);assert.equal(galleryEdgeVelocity(1000,1000),16);assert.equal(galleryEdgeVelocity(-1,1000),0)});

test('vertical navigation stays in the top row and finds the nearest card in a ragged row',()=>{const cards=[{index:0,rect:{left:0,top:0,width:100}},{index:1,rect:{left:110,top:0,width:100}},{index:2,rect:{left:220,top:0,width:100}},{index:3,rect:{left:0,top:120,width:100}},{index:4,rect:{left:110,top:120,width:100}},{index:5,rect:{left:0,top:240,width:100}}];assert.equal(verticalGalleryNeighbor(cards,2,-1),2);assert.equal(verticalGalleryNeighbor(cards,2,1),4);assert.equal(verticalGalleryNeighbor(cards,4,1),5);assert.equal(verticalGalleryNeighbor(cards,5,1),5)});
