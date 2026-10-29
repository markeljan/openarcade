function browserIndexedDB() {
  try { return globalThis.indexedDB; } catch { return undefined; }
}

export function createPendingQueue({indexedDB=browserIndexedDB(),now=Date.now,ttlMs=7*86400000}={}) {
  let db, mode='persistent', chain=Promise.resolve();
  const memory=new Map(), clone=v=>v==null?v:structuredClone(v);
  const fallback=()=>{mode='memory';db?.close();db=null};
  const ready=new Promise(resolve=>{
    if(!indexedDB){fallback();resolve();return}
    let settled=false;
    const done=()=>{if(!settled){settled=true;resolve()}};
    try {const req=indexedDB.open('openarcade-scores-v1',1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('pending'))req.result.createObjectStore('pending',{keyPath:'runId'})};
      req.onblocked=req.onerror=()=>{fallback();done()};
      req.onsuccess=()=>{if(settled){req.result.close();return}db=req.result;db.onversionchange=fallback;done()};
    } catch {fallback();done()}
  });
  const serial=fn=>{const p=chain.then(async()=>{await ready;return fn()});chain=p.catch(()=>{});return p};
  async function tx(type,action){if(!db||mode!=='persistent')return;try{return await new Promise((resolve,reject)=>{const t=db.transaction('pending',type),s=t.objectStore('pending');let value;action(s,v=>value=v);t.oncomplete=()=>resolve(value);t.onerror=t.onabort=()=>reject(t.error)})}catch{fallback()}}
  async function remove(id){memory.delete(id);await tx('readwrite',s=>s.delete(id))}
  async function get(id){if(mode==='persistent'){const item=await tx('readonly',(s,done)=>{const r=s.get(id);r.onsuccess=()=>done(r.result)});if(item)memory.set(id,clone(item));else if(mode==='persistent')memory.delete(id)}const item=memory.get(id);if(item&&(!Number.isFinite(item.expiresAt)||item.expiresAt<=now())){await remove(id);return null}return clone(item)??null}
  const fields=['schemaVersion','gameId','score','ruleVersion','actor','context','result','durationMs','provenance','submissionEligible','guestName','attribution'];
  const stable=v=>JSON.stringify(v, (k,x)=>x && typeof x==='object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))) : x);
  const conflicts=(a,b)=>fields.some(k=>stable(a[k])!==stable(b[k]));
  const expired=x=>!Number.isFinite(x.expiresAt)||x.expiresAt<=now();
  return {
    get durability(){return mode},
    enqueue(record){if(!record||typeof record.runId!=='string'||!record.runId.trim()||typeof record.gameId!=='string'||!record.gameId.trim()||!Number.isFinite(record.score))return Promise.reject(new TypeError('Invalid run'));const input=clone(record);return serial(async()=>{
      const createdAt=now(), fresh={...input,createdAt,expiresAt:createdAt+ttlMs};
      let selected=memory.get(input.runId), conflict=false;
      if(selected&&expired(selected)) selected=null;
      if(mode==='persistent') {
        const result=await tx('readwrite',(store,done)=>{const request=store.get(input.runId);request.onsuccess=()=>{const old=request.result;if(old&&!expired(old)){selected=old;conflict=conflicts(old,input);memory.set(input.runId,clone(old));done('existing')}else{selected=fresh;memory.set(input.runId,clone(fresh));store.put(fresh);done('added')}}});
        if(result===undefined&&mode==='memory'&&!selected){selected=fresh;memory.set(input.runId,clone(fresh))}
      } else if(selected) conflict=conflicts(selected,input);
      else {selected=fresh;memory.set(input.runId,clone(fresh))}
      if(conflict)throw new Error('Conflicting run');
      return {runId:input.runId,durability:mode};
    })},
    get(id){return serial(()=>get(id))},
    list(){return serial(async()=>{if(mode==='persistent'){const items=await tx('readonly',(s,done)=>{const r=s.getAll();r.onsuccess=()=>done(r.result)});if(items){memory.clear();for(const item of items)memory.set(item.runId,clone(item))}}for(const [id,item] of memory)if(!Number.isFinite(item.expiresAt)||item.expiresAt<=now())await remove(id);return [...memory.values()].map(clone).sort((a,b)=>a.createdAt-b.createdAt||a.runId.localeCompare(b.runId))})},
    update(id,patch){const changes=clone(patch);return serial(async()=>{
      let item=null;
      const merge=old=>({...old,...(Object.hasOwn(changes,'receipt')?{receipt:changes.receipt}:{}),runId:old.runId});
      if(mode==='persistent') await tx('readwrite',(store,done)=>{const request=store.get(id);request.onsuccess=()=>{const old=request.result;if(!old||expired(old)){memory.delete(id);if(old)store.delete(id);done(null);return}item=merge(old);memory.set(id,clone(item));store.put(item);done(item)}});
      if(mode==='memory'&&!item) {const old=memory.get(id);if(old&&!expired(old)){item=merge(old);memory.set(id,clone(item))}else memory.delete(id)}
      return clone(item);
    })},
    acknowledge(id){return serial(()=>remove(id))},abandon(id){return serial(()=>remove(id))}
  };
}
