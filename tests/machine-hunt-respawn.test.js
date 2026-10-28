import test from 'node:test';
import assert from 'node:assert/strict';
import {machineHunt} from '../src/feature-games.js';

test('defeated preview hunter returns to the same world without saving a manual record',()=>{
 let seed=71,records=0;const old=Math.random;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 try{const game=machineHunt({finish:()=>records++});game.input('ArrowUp',true);let down=null,auto=false;for(let i=0;i<60*180;i++){game.update(1/60,auto);const s=game.snapshot();if(!auto&&s.hero.hp<=1.5&&s.hero.hp>0){auto=true;game.input('ArrowUp',false)}if(auto&&s.gameOver){down=s;break}}assert.ok(down,'seeded preview should be defeated');assert.ok(down.score>0);
  for(let i=0;i<30;i++)game.update(1/60,true);const during=game.snapshot();assert.ok(during.gameOver>0);assert.deepEqual(during.hero,down.hero,'hunter remains down');assert.ok(during.kills>down.kills&&during.score>down.score,'already-fired arrows continue and defeat a machine');
  let revived=null;for(let i=0;i<70;i++){game.update(1/60,true);const s=game.snapshot();if(!s.gameOver){revived=s;break}}
  assert.ok(revived,'preview should revive after the down interval');assert.equal(revived.hero.hp,5);assert.ok(revived.score>=during.score);assert.ok(revived.kills>=during.kills);assert.equal(revived.nextBand,down.nextBand);assert.equal(revived.lastMeters,down.lastMeters);assert.ok(Math.abs((revived.hero.y-revived.scroll)-(down.hero.y-down.scroll)-180)<1e-8,'revival moves back 90 reference units');assert.ok(revived.robots.every(r=>r.detect<=2.4));assert.equal(records,0);
 }finally{Math.random=old}
});
