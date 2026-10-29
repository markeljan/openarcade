import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmbedScores} from '../src/embed/guest-scores.js';
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.value='';this.attributes={};}
 append(...items){this.children.push(...items)} setAttribute(k,v){this.attributes[k]=v} addEventListener(k,v){(this.listeners[k]??=[]).push(v)}
 dispatch(type,extra={}){const e={preventDefault(){},...extra};for(const fn of this.listeners[type]??[])fn(e)} focus(){} select(){this.selected=true} remove(){}
}
const doc={createElement:t=>new Element(t),referrer:''};
const id='12345678-1234-4123-8123-123456789abc', id2='22345678-1234-4123-8123-123456789abc';
const record=(runId=id)=>({schemaVersion:1,runId,gameId:'snake',actor:'human',context:'embed',submissionEligible:true,score:7,result:'Run complete'});
const flush=()=>new Promise(r=>setImmediate(r));
function setup(scores,nav={}){const ui=createEmbedScores({scores,gameId:'snake',document:doc,navigator:nav,location:{href:'https://site.test/?source=x'}});const [_,form,button,instructions,warning,status,secretWarning,secret]=ui.element.children;return {ui,form,button,warning,status,secretWarning,secret,inputs:form.children[2].children.slice(1)};}
const paste=inputs=>inputs[0].dispatch('paste',{clipboardData:{getData:()=> 'abcd'}});

test('guest requires exact acknowledgement and retries same UUID and metadata',async()=>{
 const calls=[]; let submitCalls=0;
 const s={enqueue:async(...args)=>(calls.push(args),{status:'pending',durability:'memory'}),submit:async runId=>({status:'saved',runId:++submitCalls===1?id2:runId})};
 const x=setup(s);x.ui.show(record());paste(x.inputs);x.form.dispatch('submit');x.form.dispatch('submit');await flush();assert.equal(submitCalls,1);assert.match(x.status.textContent,/unavailable/i);assert.match(x.warning.textContent,/reload/i);assert.equal(x.button.hidden,true);
 x.form.dispatch('submit');await flush();assert.equal(submitCalls,2);assert.equal(calls.length,1);assert.deepEqual(calls[0][1],{guestName:'ABCD',attribution:'x'});assert.match(x.status.textContent,/saved/i);
});

test('private option exposes code after explicit copy when clipboard fails',async()=>{
 const recovery={schemaVersion:1,runId:id,claimToken:'private-test-value',expiresAt:'2030-01-01'};
 const calls=[];const x=setup({enqueue:async(...args)=>(calls.push(args),{status:'pending',durability:'persistent'}),submit:async runId=>({status:'queued-auth',runId}),getRecovery:async()=>recovery});
 x.ui.show(record());assert.equal(calls.length,0);assert.equal(x.secret.hidden,true);x.button.dispatch('click');x.button.dispatch('click');await flush();
 assert.equal(calls.length,1);assert.equal(calls[0][1],undefined);assert.equal(x.secret.hidden,false);assert.equal(x.secret.selected,true);assert.match(x.secretWarning.textContent,/anyone holding/i);assert.ok(!x.status.textContent.includes(recovery.claimToken));assert.equal(x.form.hidden,true);
 x.ui.hide();assert.equal(x.secret.value,'');
});

test('reported clipboard success still leaves a selectable recovery fallback',async()=>{
 const recovery={schemaVersion:1,runId:id,claimToken:'private-test-value',expiresAt:'2030-01-01'};
 let copied;
 const x=setup({enqueue:async()=>({status:'pending',durability:'persistent'}),submit:async runId=>({status:'queued-auth',runId}),getRecovery:async()=>recovery},{clipboard:{writeText:async value=>{copied=value;}}});
 x.ui.show(record());assert.equal(x.secret.hidden,true);x.button.dispatch('click');await flush();
 assert.deepEqual(JSON.parse(copied),recovery);assert.equal(x.secret.hidden,false);assert.equal(x.secret.value,copied);assert.equal(x.secretWarning.hidden,false);
 assert.match(x.status.textContent,/If pasting fails/);assert.ok(!x.status.textContent.includes(recovery.claimToken));
 x.ui.show(record(id2));assert.equal(x.secret.value,'');assert.equal(x.secret.hidden,true);assert.equal(x.secretWarning.hidden,true);
});

test('stale completion does not mutate newer run, and invalid runs are hidden',async()=>{
 let finish;const x=setup({enqueue:async()=>({status:'pending',durability:'indexeddb'}),submit:()=>new Promise(r=>finish=r)});
 x.ui.show(record());paste(x.inputs);x.form.dispatch('submit');await flush();x.ui.show(record(id2));finish({status:'saved',runId:id});await flush();assert.match(x.status.textContent,/Your result: 7/);assert.equal(x.button.hidden,false);
 x.ui.show({...record(),actor:'ai'});assert.equal(x.ui.element.hidden,true);x.ui.dispose();
});
