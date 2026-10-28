import test from 'node:test';
import assert from 'node:assert/strict';
import {pico} from '../src/feature-games10.js';
const tick=(g,n,auto=false)=>{for(let i=0;i<n;i++)g.update(1/60,auto)};
const step=(g,k)=>{g.input(k,true);g.input(k,false);tick(g,27)};
function exposed(g){for(const k of ['ArrowDown',' '])step(g,k);for(let i=0;i<3000;i++){const s=g.snapshot();if(s.hero.small&&s.hero.x===2&&s.hero.y===4)return;if(!s.hero.stun&&!s.bounce){const {x,y}=s.hero,k=y!==4?'ArrowDown':x>2?'ArrowLeft':'ArrowRight';g.input(k,true);g.input(k,false)}g.update(1/60,false)}throw new Error('could not reach exposed crack')}
test('exposed small hero is pushed to a passable neighboring tile by rain',()=>{const g=pico();exposed(g);let before;for(let i=0;i<2500;i++){before=g.snapshot();g.update(1/60,false);if(g.snapshot().storm.soaks>before.storm.soaks)break}let s=g.snapshot();assert.ok(s.bounce);assert.deepEqual([s.hero.x,s.hero.y],[before.hero.x,before.hero.y]);const target=[s.bounce.x,s.bounce.y];assert.equal(Math.abs(target[0]-before.hero.x)+Math.abs(target[1]-before.hero.y),1);tick(g,25);s=g.snapshot();assert.deepEqual([s.hero.x,s.hero.y],target);});
test('automatic hero still restores a glade with rain movement enabled',()=>{const g=pico();for(let i=0;i<6000&&g.snapshot().glades<2;i++)g.update(1/60,true);assert.ok(g.snapshot().glades>=2)});
