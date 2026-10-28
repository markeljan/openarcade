import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuneSwarm} from '../src/feature-games4.js';
function press(g,k){g.input(k,true);g.input(k,false)}
function move(g,p){let c=g.snapshot().cursor;while(c.x<p.x){press(g,'ArrowRight');c=g.snapshot().cursor}while(c.x>p.x){press(g,'ArrowLeft');c=g.snapshot().cursor}while(c.y<p.y){press(g,'ArrowDown');c=g.snapshot().cursor}while(c.y>p.y){press(g,'ArrowUp');c=g.snapshot().cursor}}
test('manual valid swap casts a color spell and advances its power',()=>{const g=createRuneSwarm();const [a,b]=g.snapshot().move;move(g,a);press(g,' ');move(g,b);press(g,' ');const s=g.snapshot();assert.ok(s.score>0);assert.ok(s.powers.some(v=>v>0));assert.ok(s.spellCounts.some(v=>v>0));assert.equal(s.selected,null)});
test('AI casts all five rune spells and can survive to dawn',()=>{const old=Math.random;let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);try{const g=createRuneSwarm();for(let i=0;i<2402&&!g.snapshot().gameOver;i++)g.update(.05,true);const s=g.snapshot();assert.ok(s.spellCounts.every(n=>n>0));assert.equal(s.dawn,true);assert.equal(s.gameOver,true)}finally{Math.random=old}});

test('rune sound sink stays silent during setup and emits on a valid manual swap',()=>{
 const cues=[],g=createRuneSwarm({},cue=>cues.push(cue));assert.deepEqual(cues,[]);const [a,b]=g.snapshot().move;move(g,a);press(g,' ');move(g,b);press(g,' ');
 assert.ok(cues.includes('rune-swap'));assert.ok(cues.includes('rune-match')||cues.includes('rune-prism'));assert.ok(cues.some(c=>['rune-red','rune-gold','rune-blue','rune-green','rune-violet'].includes(c)));
});

test('rune sound sink reports all spell colors and dawn during preview',()=>{
 const old=Math.random;let seed=42;Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);try{const cues=[],g=createRuneSwarm({},cue=>cues.push(cue));for(let i=0;i<2402&&!g.snapshot().gameOver;i++)g.update(.05,true);for(const cue of ['rune-red','rune-gold','rune-blue','rune-green','rune-violet','rune-dawn'])assert.ok(cues.includes(cue),cue)}finally{Math.random=old}
});
