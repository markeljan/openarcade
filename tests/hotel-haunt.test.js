import test from 'node:test';
import assert from 'node:assert/strict';
import {hotel} from '../src/feature-games13.js';

test('Hotel Haunt starts each floor with two possessions and ghosts persist through vents',()=>{
 const g=hotel();let s=g.snapshot();assert.equal(s.props.filter(p=>p.ghost).length,2);
 // Sweep the nearest possessed furniture, then leave the ghost alone.
 g.input('ArrowLeft',true);for(let i=0;i<30;i++)g.update(1/60,false);g.input('ArrowLeft',false);
 g.input(' ',true);for(let i=0;i<32;i++)g.update(1/60,false);g.input(' ',false);
 s=g.snapshot();assert.equal(s.ghosts.length,1);assert.equal(s.ghosts[0].state,'flee');
 for(let i=0;i<300&&g.snapshot().ghosts[0].state==='flee';i++)g.update(1/60,false);
 s=g.snapshot();assert.equal(s.ghosts[0].state,'venting');
 for(let i=0;i<60;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.ghosts[0].state,'possessed');assert.equal(s.ghosts.length,1);
});
