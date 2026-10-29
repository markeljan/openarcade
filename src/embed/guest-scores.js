import {createGuestForm} from './guest-form.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function attribution(location, referrer) {
  try {
    const params = new URL(location?.href ?? 'https://example.invalid/').searchParams;
    const host = referrer ? new URL(referrer).hostname.toLowerCase() : '';
    return ['x','twitter'].includes((params.get('source') ?? params.get('utm_source') ?? '').toLowerCase()) || ['x.com','twitter.com'].some(d => host === d || host.endsWith('.'+d)) ? 'x' : 'direct';
  } catch { return 'direct'; }
}

// The scores client owns persistence, protocol validation, and acknowledgement.
export function createEmbedScores({scores, gameId, document: doc = globalThis.document, navigator: nav = globalThis.navigator, location = globalThis.location, referrer = doc?.referrer} = {}) {
  if (!scores || !doc || !gameId) throw new TypeError('A score client, document and game ID are required');
  const root=doc.createElement('section'); root.hidden=true; root.className='embed-scores';
  root.setAttribute('aria-label','Score options');
  const explanation=doc.createElement('p'); explanation.textContent='Guest scores are public and are not linked to an account. A private recovery code lets you save this result after signing in on OpenArcade.';
  const status=doc.createElement('p'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
  const warning=doc.createElement('p'); warning.hidden=true;
  const privateButton=doc.createElement('button'); privateButton.type='button'; privateButton.textContent='Copy recovery code';
  const instructions=doc.createElement('p'); instructions.textContent='Open OpenArcade, sign in, and use Recover a score.';
  const secret=doc.createElement('textarea'); secret.readOnly=true; secret.hidden=true; secret.setAttribute('aria-label','Private recovery code');
  const secretWarning=doc.createElement('p'); secretWarning.hidden=true; secretWarning.textContent='Private: anyone holding this code can claim the score. Copy it and keep it safe.';
  let current=null, generation=0, disposed=false;
  const runs=new Map();
  const valid=record=>record?.schemaVersion===1 && record.gameId===gameId && record.actor==='human' && record.context==='embed' && record.submissionEligible===true && Number.isFinite(record.score) && typeof record.runId==='string' && uuid.test(record.runId);
  const active=(token,runId)=>!disposed && token===generation && current?.runId===runId;
  function resetSecret(){secret.value='';secret.hidden=true;secretWarning.hidden=true;}
  async function attempt(record, mode, name) {
    const token=generation, id=record.runId;
    let run=runs.get(id);
    if(!run) {run={mode, name, pending:false, enqueued:false, saved:false};runs.set(id,run);}
    if(run.mode!==mode || run.pending) return {success:false,message:'A submission is already in progress.'};
    run.pending=true;
    if(mode==='guest') { privateButton.hidden=true; } else { guest.hide(); }
    status.textContent='Submitting score…'; privateButton.disabled=true;
    try {
      if(!run.enqueued) {
        const queued=await scores.enqueue(record, mode==='guest'?{guestName:run.name,attribution:attribution(location,referrer)}:undefined);
        if(queued?.status!=='pending') throw new Error('unavailable');
        run.enqueued=true; run.durability=queued.durability;
      }
      if(!active(token,id)) return {success:false,message:'Score submission unavailable.'};
      warning.hidden=run.durability!=='memory';
      warning.textContent=run.durability==='memory'?'Keep this frame open. A reload can lose the pending score.':'';
      if(!run.saved) {
        const result=await scores.submit(id);
        const expected=mode==='guest'?'saved':'queued-auth';
        if(result?.status!==expected || result.runId!==id) throw new Error('unavailable');
        run.saved=true;
      }
      if(!active(token,id)) return {success:false,message:'Score submission unavailable.'};
      if(mode==='guest') {warning.hidden=true;status.textContent='Public guest score saved; it is not linked to an account.';return {success:true,message:'Score submitted.'};}
      const recovery=await scores.getRecovery(id);
      if(!active(token,id)) return {success:false,message:'Score submission unavailable.'};
      if(recovery?.schemaVersion!==1 || recovery.runId!==id || typeof recovery.claimToken!=='string' || !recovery.claimToken || !recovery.expiresAt) throw new Error('unavailable');
      const code=JSON.stringify(recovery);
      try { if(!nav?.clipboard?.writeText) throw new Error('unavailable'); await nav.clipboard.writeText(code); }
      catch { if(!active(token,id)) return {success:false,message:'Score submission unavailable.'}; secret.value=code; secret.hidden=false; secretWarning.hidden=false; secret.focus(); secret.select(); status.textContent='Copy the private recovery code shown below.'; return {success:true}; }
      if(!active(token,id)) return {success:false,message:'Score submission unavailable.'};
      warning.hidden=true;
      status.textContent='Private recovery code copied. Open OpenArcade, sign in, and use Recover a score.';
      return {success:true};
    } catch {
      if(active(token,id)) status.textContent='Score submission unavailable. Please retry.';
      return {success:false,message:'Score submission unavailable. Please retry.'};
    } finally {run.pending=false;if(!disposed && current?.runId===id && !root.hidden) privateButton.disabled=false;}
  }
  const guest=createGuestForm({document:doc,location,referrer,submit:(record,name)=>attempt(record,'guest',name)});
  privateButton.addEventListener('click',()=>{if(current) void attempt(current,'private');});
  root.append(explanation,guest.element,privateButton,instructions,warning,status,secretWarning,secret);
  return {element:root,show(record){
    if(disposed)return;
    if(!valid(record)){this.hide();return;}
    if(current?.runId===record.runId&&!root.hidden)return;
    generation++;current=record;root.hidden=false;status.textContent=`Your result: ${record.score} · ${record.result || 'Run complete'}`;warning.hidden=true;resetSecret();
    const run=runs.get(record.runId); privateButton.hidden=run?.mode==='guest'; privateButton.disabled=!!run?.pending;
    if(run?.mode==='private')guest.hide();else guest.show(record);
    if(run?.durability==='memory'){warning.hidden=false;warning.textContent='Keep this frame open. A reload can lose the pending score.';}
  },hide(){generation++;current=null;root.hidden=true;guest.hide();resetSecret();},dispose(){generation++;disposed=true;current=null;guest.dispose();resetSecret();root.remove();}};
}
