import test from 'node:test';
import assert from 'node:assert/strict';
import {createWashWonder} from '../src/feature-games40.js';
test('manual washing signals contact, nozzle, release and refilling',()=>{
 const events=[],g=createWashWonder(e=>events.push(e));
 g.input('x',true);g.update(1/60,false);g.input('x',false);assert.ok(events.includes('wash-nozzle'));
 g.input(' ',true);g.input('ArrowRight',true);for(let i=0;i<120;i++)g.update(1/60,false);g.input(' ',false);g.input('ArrowRight',false);g.update(1/60,false);
 assert.ok(events.includes('wash-spray'));assert.ok(events.includes('wash-release'));
 g.input('ArrowLeft',true);for(let i=0;i<120;i++)g.update(1/60,false);g.input('ArrowLeft',false);g.input('z',true);for(let i=0;i<40;i++)g.update(1/60,false);assert.ok(events.includes('wash-refill'));assert.ok(events.includes('wash-full'));
});
test('AI signals cleaning and all landmark payoffs',()=>{
 const events=[],g=createWashWonder(e=>events.push(e));for(let i=0;i<30000&&g.snapshot().phase!=='pack';i++)g.update(1/60,true);
 assert.equal(g.snapshot().phase,'pack');for(const e of ['wash-spray','wash-rust','wash-chalk','wash-nozzle','wash-refill','wash-full','wash-motor','wash-restored','wash-gate','wash-reopen'])assert.ok(events.includes(e),e);
});
