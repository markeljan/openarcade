import test from 'node:test';
import assert from 'node:assert/strict';
import {prismBeamEndpoints,prism} from '../src/feature-games28.js';
test('beam endpoints follow prism orientation and the mirror as it rotates',()=>{let p={x:85.5,y:424.5,orientation:0},m={x:163.5,y:424.5,angle:-45};assert.deepEqual(prismBeamEndpoints(p,m),{split:{x:57,y:411},reflection:{x:135,y:411}});p.orientation=1;m.angle=45;assert.deepEqual(prismBeamEndpoints(p,m),{split:{x:85.5,y:456},reflection:{x:163.5,y:456}});m.angle=0;assert.deepEqual(prismBeamEndpoints(p,m).reflection,{x:149.25,y:433.5})});
test('AI can still align the optics and seal a breach',()=>{let g=prism();for(let i=0;i<5000&&g.snapshot().counters.sealed===0;i++)g.update(1/60,true);assert.ok(g.snapshot().counters.sealed>0)});
