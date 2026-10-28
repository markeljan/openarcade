import test from 'node:test';
import assert from 'node:assert/strict';
import {rulesForStamp, stampFaults, stamp} from '../src/feature-games40.js';

const valid = {name:'NIA',face:1,portrait:1,expiry:20,permit:{kind:'WORK',name:'NIA',seal:'A'}};
const press = (game, key) => { game.input(key,true); game.update(1/60,false); game.input(key,false); };
function moveTo(game, x, y) {
 while(game.snapshot().action||game.snapshot().busy>1e-8)game.update(1/60,false);
 for (const [axis, target, negative, positive] of [['x',x,'ArrowLeft','ArrowRight'],['y',y,'ArrowUp','ArrowDown']]) {
  const distance=target-game.snapshot().clerk[axis];
  if (distance) { const key=distance<0?negative:positive; game.input(key,true); game.update(Math.abs(distance)/186,false); game.input(key,false); }
 }
}

test('posted rules add permit, name and seal checks in their respective shifts',()=>{
 const missing={...valid,permit:null}, mismatch={...valid,permit:{kind:'WORK',name:'IVO',seal:'B'}};
 assert.deepEqual(stampFaults(missing,rulesForStamp(0)),[]);
 assert.deepEqual(stampFaults(missing,rulesForStamp(1)),['PERMIT']);
 assert.deepEqual(stampFaults(mismatch,rulesForStamp(1)),[]);
 assert.deepEqual(stampFaults(mismatch,rulesForStamp(2)),['NAME','SEAL']);
 assert.deepEqual(stampFaults({...valid,expiry:11,portrait:0},rulesForStamp(0)),['EXPIRY','PORTRAIT']);
});

test('a manual clerk can inspect, stamp and record all twelve cases across three shifts',()=>{
 const game=stamp();
 for (let i=0;i<12;i++) {
  let state=game.snapshot(); assert.equal(state.phase,'call'); assert.equal(state.shift,Math.floor(i/4));
  moveTo(game,36,562); press(game,' '); assert.equal(game.snapshot().phase,'inspect');
  moveTo(game,70,550); press(game,' '); assert.equal(game.snapshot().phase,'comparing');game.update(.7,false);assert.equal(game.snapshot().checked.passport,true);
  state=game.snapshot(); if(state.rules.permit){moveTo(game,242,550);if(!game.snapshot().rulesRead){press(game,' ');game.update(.25,false)}press(game,' ');game.update(1.2,false);assert.equal(game.snapshot().checked.permit,true)}
  state=game.snapshot(); const admit=stampFaults(state.traveler,state.rules).length===0;
  moveTo(game,admit?222:94,608);press(game,admit?'x':'z');assert.equal(game.snapshot().phase,'stamping');game.update(.6,false);assert.equal(game.snapshot().phase,'ledger');
  moveTo(game,160,610);game.update(3,false);press(game,' ');
 }
 assert.equal(game.snapshot().phase,'departure');assert.equal(game.snapshot().score,24);
 moveTo(game,40,550);press(game,' ');assert.equal(game.snapshot().rope,true);
 moveTo(game,280,550);press(game,' ');assert.equal(game.snapshot().signal,true);
 moveTo(game,160,610);press(game,' ');let sailing=game.snapshot();assert.equal(sailing.phase,'sailing');assert.equal(sailing.ledgerClosed,true);assert.equal(sailing.ferryTravel,0);game.update(.4,false);sailing=game.snapshot();assert.equal(sailing.phase,'sailing');assert.ok(sailing.ferryTravel>0);game.update(.5,false);assert.equal(game.snapshot().phase,'complete');
 game.update(10,false);assert.equal(game.snapshot().phase,'complete');moveTo(game,280,550);press(game,' ');assert.equal(game.snapshot().aftermathStep,1);moveTo(game,160,610);press(game,' ');assert.equal(game.snapshot().aftermathStep,2);moveTo(game,36,562);press(game,' ');assert.equal(game.snapshot().phase,'call');
});

test('autoplay completes the same desk workflow and begins another run',()=>{
 const game=stamp();let complete=false,restarted=false;
 for(let i=0;i<24000;i++){game.update(1/60,true);const state=game.snapshot();if(state.phase==='complete'){complete=true;assert.equal(state.score,24)}else if(complete&&state.phase==='call'){restarted=true;break}}
 assert.ok(complete);assert.ok(restarted);
});

test('an incorrect decision incurs the reference five-unit citation',()=>{
 const game=stamp();moveTo(game,36,562);press(game,' ');
 // The first reference case is valid, so refusing it is a citation.
 moveTo(game,94,608);press(game,'z');game.update(.6,false);
 assert.equal(game.snapshot().score,-5);assert.equal(game.snapshot().pending.correct,false);assert.equal(game.snapshot().ledger.length,0);
});


test('comparison, stamp contact and traveler departure gate the ledger',()=>{
 const game=stamp();moveTo(game,36,562);press(game,' ');game.update(.25,false);moveTo(game,70,550);press(game,' ');
 assert.equal(game.snapshot().phase,'comparing');const compare=game.snapshot().action;for(let i=0;i<Math.round((compare.contact-compare.elapsed)*60)-1;i++)game.update(1/60,false);assert.equal(game.snapshot().checked.passport,false);game.update(1/60,false);assert.equal(game.snapshot().checked.passport,true);game.update(.2,false);assert.equal(game.snapshot().phase,'inspect');
 moveTo(game,222,608);press(game,'x');assert.equal(game.snapshot().score,0);const stampAction=game.snapshot().action;for(let i=0;i<Math.round((stampAction.contact-stampAction.elapsed)*60)-1;i++)game.update(1/60,false);assert.equal(game.snapshot().score,0);game.update(1/60,false);let s=game.snapshot();assert.equal(s.score,2);assert.equal(s.phase,'ledger');assert.equal(s.ledger.length,0);assert.ok(s.pending);assert.ok(s.travelerDeparture);
 game.update(.3,false);moveTo(game,160,610);assert.ok(game.snapshot().travelerDeparture,'traveler should still be departing');press(game,' ');assert.equal(game.snapshot().ordinal,0);assert.equal(game.snapshot().ledger.length,0);assert.equal(game.snapshot().feedback,'WATCH THEM BOARD');game.update(3,false);press(game,' ');s=game.snapshot();assert.equal(s.ledger.length,1);assert.equal(s.ordinal,1);assert.equal(s.pending,null);
});

test('wrongly admitting an expired passport records a citation after departure',()=>{
 const game=stamp();moveTo(game,36,562);press(game,' ');game.update(.3,false);moveTo(game,222,608);press(game,'x');game.update(.6,false);moveTo(game,160,610);game.update(3,false);press(game,' ');
 assert.equal(game.snapshot().ordinal,1);moveTo(game,36,562);press(game,' ');game.update(.3,false);moveTo(game,70,550);press(game,' ');game.update(.7,false);assert.equal(game.snapshot().feedback,'EXPIRY');
 moveTo(game,222,608);press(game,'x');game.update(.6,false);let s=game.snapshot();assert.equal(s.score,-3);assert.equal(s.pending.correct,false);assert.deepEqual(s.pending.faults,['EXPIRY']);assert.equal(s.ledger.length,1);
 moveTo(game,160,610);game.update(3,false);press(game,' ');s=game.snapshot();assert.equal(s.ledger.length,2);assert.equal(s.ledger[1].decision,'ADMIT');assert.deepEqual(s.ledger[1].faults,['EXPIRY']);
});
test('posted rules are read once each shift before permit comparison in manual and AI',()=>{const g=stamp();moveTo(g,36,562);press(g,' ');g.update(.25,false);moveTo(g,242,550);press(g,' ');let s=g.snapshot();assert.equal(s.rulesRead,true);assert.equal(s.action.kind,'read');assert.equal(s.checked.permit,false);g.update(.25,false);press(g,' ');assert.equal(g.snapshot().action.kind,'compare');g.update(.7,false);assert.equal(g.snapshot().checked.permit,true);const ai=stamp(),seen=new Set();for(let i=0;i<20000&&seen.size<3;i++){ai.update(1/60,true);const v=ai.snapshot();if(v.action?.kind==='read')seen.add(v.shift)}assert.deepEqual([...seen],[0,1,2])});

test('held manual actions activate on entering a station and stop after release',()=>{
 const g=stamp();g.input(' ',true);g.input('ArrowLeft',true);for(let i=0;i<57;i++)g.update(1/60,false);g.input('ArrowLeft',false);g.input('ArrowUp',true);for(let i=0;i<20;i++)g.update(1/60,false);g.input('ArrowUp',false);assert.equal(g.snapshot().phase,'inspect');g.input(' ',false);g.update(.3,false);
 moveTo(g,222,570);g.input('x',true);g.input('ArrowDown',true);for(let i=0;i<20;i++)g.update(1/60,false);g.input('ArrowDown',false);g.input('x',false);assert.equal(g.snapshot().phase,'stamping');g.update(.7,false);assert.equal(g.snapshot().score,2);
 const h=stamp();h.input(' ',true);h.input(' ',false);moveTo(h,36,562);h.update(1/60,false);assert.equal(h.snapshot().phase,'call');
});

test('bell locks movement for twelve frames while held input resumes afterward',()=>{
 const g=stamp();moveTo(g,36,562);press(g,' ');assert.equal(g.snapshot().busy,12/60);g.input('ArrowRight',true);g.update(11/60,false);assert.ok(Math.abs(g.snapshot().clerk.x-36)<1e-8);assert.ok(g.snapshot().arrival<15/60,'traveler continues approaching');g.update(1/60,false);assert.ok(Math.abs(g.snapshot().clerk.x-36)<1e-8);g.update(1/60,false);assert.ok(g.snapshot().clerk.x>36);g.input('ArrowRight',false);
});

test('action levels are sampled after movement and a tap between ticks is missed',()=>{
 const g=stamp();moveTo(g,58,562);g.input(' ',true);g.input(' ',false);g.update(1/60,false);assert.equal(g.snapshot().phase,'call');g.input('ArrowLeft',true);g.input(' ',true);assert.equal(g.snapshot().phase,'call');g.update(2/60,false);g.input('ArrowLeft',false);g.input(' ',false);assert.equal(g.snapshot().phase,'inspect');
});


test('stamp decision stations use their reference sides and strict 24 pixel range',()=>{
 const g=stamp();moveTo(g,36,562);press(g,' ');g.update(.3,false);moveTo(g,247,608);press(g,'x');assert.equal(g.snapshot().phase,'inspect');moveTo(g,245,608);press(g,'x');assert.equal(g.snapshot().phase,'stamping');g.update(.6,false);assert.equal(g.snapshot().pending.decision,'ADMIT');
 const h=stamp();moveTo(h,36,562);press(h,' ');h.update(.3,false);moveTo(h,94,608);press(h,'z');h.update(.6,false);assert.equal(h.snapshot().pending.decision,'REFUSE');
});
test('manual movement uses scaled reference speed and bounds',()=>{const g=stamp();assert.deepEqual(g.snapshot().clerk,{x:160,y:596});g.input('ArrowRight',true);g.update(1/60,false);g.input('ArrowRight',false);assert.ok(Math.abs(g.snapshot().clerk.x-163.1)<1e-9);g.input('ArrowUp',true);g.update(1,false);g.input('ArrowUp',false);assert.equal(g.snapshot().clerk.y,536)});
test('manual compare and stamp physically position the clerk and paper before contact',()=>{const g=stamp();moveTo(g,36,562);press(g,' ');g.update(.25,false);moveTo(g,70,550);press(g,' ');let s=g.snapshot(),a=s.action,start={...s.clerk},paper={...s.paper};g.update(a.position/2,false);s=g.snapshot();assert.ok(s.clerk.x<start.x&&s.clerk.y<start.y);assert.ok(s.paper.x>paper.x&&s.paper.y>paper.y);assert.equal(s.checked.passport,false);g.update(a.end,false);assert.deepEqual(g.snapshot().paper,{x:48,y:420});moveTo(g,222,608);press(g,'x');s=g.snapshot();a=s.action;g.update(a.position/2,false);s=g.snapshot();assert.ok(s.paper.x>48&&s.paper.y>420);assert.equal(s.pending,null);g.update(a.end,false);s=g.snapshot();assert.deepEqual(s.paper,{x:144,y:456});assert.ok(s.pending);g.input('ArrowUp',true);g.update(.5,false);g.input('ArrowUp',false);assert.equal(g.snapshot().clerk.y,622)});
test('AI physically positions documents and completes the shift',()=>{const g=stamp();let compare=false,position=false,stampPosition=false;for(let i=0;i<20000;i++){const before=g.snapshot();g.update(1/60,true);const s=g.snapshot();if(s.action?.kind==='compare'&&s.action.elapsed>0&&s.action.elapsed<s.action.position){compare=true;position ||= s.clerk.x!==before.clerk.x||s.clerk.y!==before.clerk.y}if(s.action?.kind==='stamp'&&s.action.elapsed>0&&s.action.elapsed<s.action.position)stampPosition=true;if(s.shift>=1)break}assert.ok(compare&&position&&stampPosition);assert.ok(g.snapshot().shift>=1)});
test('passport slides at reference speed then clerk scans and recovers',()=>{const g=stamp();moveTo(g,36,562);press(g,' ');g.update(.25,false);moveTo(g,70,550);press(g,' ');let a=g.snapshot().action;for(let i=0;i<9;i++)g.update(1/60,false);let s=g.snapshot();assert.deepEqual(s.paper,{x:48,y:420});assert.equal(s.checked.passport,false);while(g.snapshot().action.elapsed+1e-8<a.position)g.update(1/60,false);s=g.snapshot();assert.ok(Math.abs(s.clerk.y-498)<1e-7);for(let i=0;i<14;i++)g.update(1/60,false);s=g.snapshot();assert.equal(s.checked.passport,true);assert.ok(Math.abs(s.clerk.y-538)<1e-7);for(let i=0;i<8;i++)g.update(1/60,false);s=g.snapshot();assert.ok(Math.abs(s.clerk.y-550)<1e-7);assert.equal(s.phase,'comparing');g.update(1/60,false);assert.equal(g.snapshot().phase,'inspect')});


test('permit returns independently during stamp positioning',()=>{const g=stamp();moveTo(g,36,562);press(g,' ');g.update(.25,false);moveTo(g,242,550);press(g,' ');g.update(.25,false);press(g,' ');g.update(1.2,false);assert.deepEqual(g.snapshot().permitSheet,{x:168,y:436});moveTo(g,222,608);press(g,'x');const before=g.snapshot().permitSheet;g.update(1/60,false);const after=g.snapshot().permitSheet;assert.ok(Math.abs(Math.hypot(after.x-before.x,after.y-before.y)-6.4)<1e-7);g.update(.2,false);assert.deepEqual(g.snapshot().permitSheet,{x:192,y:382})});
test('manual movement and AI workflow agree at 30 and 60 updates per second',()=>{const old=Math.random;Math.random=()=>0;try{for(const auto of [false,true]){const a=stamp(),b=stamp();if(!auto){a.input('ArrowRight',true);b.input('ArrowRight',true)}for(let i=0;i<180;i++)a.update(1/60,auto);for(let i=0;i<90;i++)b.update(1/30,auto);const x=a.snapshot(),y=b.snapshot();assert.equal(x.phase,y.phase);assert.equal(x.ordinal,y.ordinal);assert.ok(Math.abs(x.clerk.x-y.clerk.x)<1e-7);assert.ok(Math.abs(x.clerk.y-y.clerk.y)<1e-7);assert.deepEqual(x.checked,y.checked)}}finally{Math.random=old}});
test('compare recovery holds controls through its last reference frame',()=>{const g=stamp();moveTo(g,36,562);press(g,' ');g.update(.25,false);moveTo(g,70,550);press(g,' ');const a=g.snapshot().action;g.update(a.position+(14+8)/60,false);assert.equal(g.snapshot().phase,'comparing');const x=g.snapshot().clerk.x;g.input('ArrowRight',true);g.update(1/60,false);assert.equal(g.snapshot().phase,'inspect');assert.equal(g.snapshot().clerk.x,x);g.update(1/60,false);assert.ok(g.snapshot().clerk.x>x);g.input('ArrowRight',false)});
test('120Hz and irregular updates match 60Hz manual and AI simulation',()=>{const old=Math.random;Math.random=()=>0;try{for(const auto of [false,true]){const a=stamp(),b=stamp(),c=stamp();if(!auto)for(const g of [a,b,c])g.input('ArrowRight',true);for(let i=0;i<180;i++)a.update(1/60,auto);for(let i=0;i<360;i++)b.update(1/120,auto);for(let i=0;i<60;i++)for(const dt of [.007,.013,.011,.019])c.update(dt,auto);for(const other of [b,c]){const x=a.snapshot(),y=other.snapshot();assert.equal(y.phase,x.phase);assert.equal(y.ordinal,x.ordinal);assert.deepEqual(y.checked,x.checked);assert.ok(Math.abs(y.clerk.x-x.clerk.x)<1e-7);assert.ok(Math.abs(y.clerk.y-x.clerk.y)<1e-7)}}}finally{Math.random=old}});
test('reset and session boundary discard residual simulation time',()=>{const g=stamp();g.input('ArrowRight',true);g.update(1/120,false);assert.equal(g.snapshot().clerk.x,160);g.clearAccumulator();g.update(1/120,false);assert.equal(g.snapshot().clerk.x,160);g.update(1/120,false);assert.ok(g.snapshot().clerk.x>160);g.update(1/120,false);g.reset();g.input('ArrowRight',true);g.update(1/120,false);assert.equal(g.snapshot().clerk.x,160)});
