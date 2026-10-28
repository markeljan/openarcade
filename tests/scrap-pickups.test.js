import test from 'node:test';
import assert from 'node:assert/strict';
import {scrapCollectPickup,scrapPickupRate} from '../src/feature-games6.js';

test('nitro pickup fills a depleted rig and respawns faster as the round intensifies',()=>{
 for(const nitro of [0,30,80]){const rig={nitro},pickup={type:'nitro',ready:true};scrapCollectPickup(rig,pickup);assert.equal(rig.nitro,100);assert.equal(pickup.ready,false);assert.equal(pickup.t,11)}
 assert.equal(scrapPickupRate(0,4),1);assert.equal(scrapPickupRate(20,4),2);assert.equal(scrapPickupRate(90,4),3);assert.equal(scrapPickupRate(1,2),3);
});
test('repair and weapon pickups use their reference respawn periods',()=>{
 const rig={hp:50,weapon:'FLUX',special:0},repair={type:'repair',ready:true},weapon={type:'weapon',ready:true};scrapCollectPickup(rig,repair);scrapCollectPickup(rig,weapon);assert.equal(repair.t,15);assert.equal(weapon.t,8.5);assert.equal(rig.hp,80);assert.equal(rig.special,2);
});
