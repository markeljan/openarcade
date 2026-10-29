import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuestForm} from '../src/embed/guest-form.js';

class Element {
  constructor(tag) { this.tagName=tag; this.children=[]; this.listeners={}; this.value=''; this.attributes={}; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(key,value) { this.attributes[key]=value; }
  addEventListener(type,handler) { (this.listeners[type] ??= []).push(handler); }
  dispatch(type,extra={}) { const event={preventDefault(){this.defaultPrevented=true},...extra}; for(const handler of this.listeners[type]??[]) handler(event); return event; }
  focus() { Element.focused=this; }
  remove() { this.removed=true; }
}
const doc={createElement:tag=>new Element(tag),referrer:''};
function setup(submit, extra={}) {
  const ui=createGuestForm({document:doc,submit,...extra});
  const [heading,context,fieldset,button,status]=ui.element.children;
  return {ui,context,fieldset,inputs:fieldset.children.slice(1),button,status};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('slots normalize letters, advance, backspace, and accept only a four-letter paste',()=>{
  const {ui,inputs,status}=setup(()=>{}); ui.show({id:1});
  inputs[0].value='a'; inputs[0].dispatch('input'); assert.equal(inputs[0].value,'A'); assert.equal(Element.focused,inputs[1]);
  inputs[1].value='9'; inputs[1].dispatch('input'); assert.equal(inputs[1].value,'');
  inputs[1].dispatch('keydown',{key:'Backspace'}); assert.equal(inputs[0].value,''); assert.equal(Element.focused,inputs[0]);
  inputs[0].dispatch('paste',{clipboardData:{getData:()=> 'ab1d'}}); assert.match(status.textContent,/exactly four/);
  inputs[0].dispatch('paste',{clipboardData:{getData:()=> 'abcd'}}); assert.equal(inputs.map(x=>x.value).join(''),'ABCD');
});

test('submission validates, blocks duplicate calls, and retries the same record after failure',async()=>{
  const calls=[]; let reject;
  const {ui,inputs,fieldset,button,status}=setup((record,name)=>{calls.push([record,name]); return calls.length===1?new Promise((_,r)=>{reject=r}):Promise.resolve({success:true,message:'Saved'});});
  const record={id:1}; ui.show(record); ui.element.dispatch('submit'); assert.match(status.textContent,/four letters/); assert.equal(calls.length,0);
  inputs[0].dispatch('paste',{clipboardData:{getData:()=> 'abcd'}});
  ui.element.dispatch('submit'); ui.element.dispatch('submit'); assert.equal(calls.length,1); assert.equal(button.disabled,true);
  reject(new Error('Unavailable')); await flush(); assert.match(status.textContent,/Unavailable/); assert.equal(button.disabled,false); assert.equal(fieldset.disabled,true,'retries retain the same name and immutable run');
  ui.element.dispatch('submit'); await flush(); assert.deepEqual(calls,[[record,'ABCD'],[record,'ABCD']]); assert.equal(status.textContent,'Saved'); assert.equal(button.disabled,true);
});

test('old completion cannot alter a newer run or a disposed form',async()=>{
  let resolve; const {ui,inputs,status,button}=setup(()=>new Promise(r=>{resolve=r}));
  ui.show({id:1}); inputs[0].dispatch('paste',{clipboardData:{getData:()=> 'abcd'}}); ui.element.dispatch('submit');
  ui.show({id:2}); resolve({success:true,message:'Old result'}); await flush();
  assert.equal(status.textContent,''); assert.equal(button.disabled,false); assert.equal(ui.element.hidden,false);
  ui.hide(); assert.equal(ui.element.hidden,true); ui.dispose(); assert.equal(ui.element.removed,true);
});

test('source is explicitly unverified and restricted to X origins or source hints',()=>{
  assert.match(setup(()=>{}, {location:{href:'https://site.test/?source=x'}}).context.textContent,/From X \(unverified\)/);
  assert.match(setup(()=>{}, {referrer:'https://mobile.twitter.com/path'}).context.textContent,/unverified/);
  assert.equal(setup(()=>{}, {referrer:'https://x.com.evil.test/'}).context.textContent,'Guest');
});
