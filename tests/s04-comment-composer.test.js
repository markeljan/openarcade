import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommentComposer} from '../src/ui/comment-composer.js';

function fixture(initial='signed-in') {
  let listener, state={status:initial}, handler, resolve, reject;
  const drafts=new Map(), calls=[], input={value:'',addEventListener(_type,fn){handler=fn},removeEventListener(){handler=null}}, button={}, status={};
  const auth={getState:()=>state,subscribe(fn){listener=fn;fn(state);return ()=>{listener=null}}};
  let signIns=0;
  const composer=createCommentComposer({input,button,status,auth,getCommentDraft:id=>drafts.get(id),saveCommentDraft:(id,raw)=>drafts.set(id,raw),clearCommentDraft:(id,raw)=>{if(drafts.get(id)===raw)drafts.delete(id)},submit:(id,text)=>{calls.push([id,text]);return new Promise((res,rej)=>{resolve=res;reject=rej})},onSignIn:()=>{signIns++}});
  return {composer,input,button,status,drafts,calls,type(value){input.value=value;handler()},auth(next){state={status:next};listener?.(state)},resolve:()=>resolve(),reject:e=>reject(e),signIns:()=>signIns};
}
test('signed out drafts survive sign-in and game changes without automatic posting',async()=>{
 const f=fixture('signed-out');f.composer.setGame('a');f.type('  hello  ');await f.composer.submit();assert.equal(f.signIns(),1);assert.deepEqual(f.calls,[]);f.auth('signed-in');assert.equal(f.input.value,'  hello  ');f.composer.setGame('b');f.type('other');f.composer.setGame('a');assert.equal(f.input.value,'  hello  ');assert.equal(f.button.textContent,'Post');f.composer.dispose();
});
test('acknowledgement clears only the submitted unchanged draft',async()=>{
 const f=fixture();f.composer.setGame('a');f.type(' first ');const p=f.composer.submit();assert.deepEqual(f.calls,[['a','first']]);f.type('new text');f.resolve();await p;assert.equal(f.input.value,'new text');assert.equal(f.drafts.get('a'),'new text');const q=f.composer.submit();f.resolve();await q;assert.equal(f.input.value,'');assert.equal(f.drafts.has('a'),false);
});
test('late acknowledgement and error do not mutate a different game view',async()=>{
 const f=fixture();f.composer.setGame('a');f.type('old');const p=f.composer.submit();f.composer.setGame('b');f.type('new');f.resolve();await p;assert.equal(f.input.value,'new');assert.equal(f.drafts.has('a'),false);assert.equal(f.button.disabled,false);f.composer.setGame('a');f.type('again');const q=f.composer.submit();f.composer.setGame('b');f.reject({status:503});await q;assert.equal(f.status.textContent,'');assert.equal(f.input.value,'new');assert.equal(f.drafts.get('a'),'again');
});
test('authentication and errors leave drafts editable and provide useful status',async()=>{
 const f=fixture('loading');f.composer.setGame('a');f.type('draft');assert.equal(f.button.disabled,true);f.auth('unavailable');assert.equal(f.input.value,'draft');f.auth('signed-in');for(const [code,pattern] of [[401,/Sign-in required/],[503,/unavailable/],[429,/later/],[500,/Could not post/]]){const p=f.composer.submit();f.reject({code});await p;assert.match(f.status.textContent,pattern);assert.equal(f.input.value,'draft')}f.composer.dispose();
});
