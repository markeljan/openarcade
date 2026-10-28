// Retain records for the lifetime of this page when persistent storage is blocked.
const sessionRecords = new WeakMap();

/** Shared lifecycle for an independently authored portrait canvas game. */
export function createCanvasGame(canvas, metadata, factory, options = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof factory !== 'function') throw new Error(`Cannot create game: ${metadata?.id || 'unknown'}`);
  const W = 320, H = 720, held = new Set();
  let game, interactive = !!options.interactive, paused = !!options.paused, disposed = false, frame, last = 0;
  let outcome = null, generation = 0, best = null;
  const recordKey = `miniarcade:custom-best:${metadata.id}`;
  let records = sessionRecords.get(window);
  if (!records) { records = new Map(); sessionRecords.set(window, records); }
  function readBest() {
    let stored = null;
    try { const value=window.localStorage?.getItem(recordKey); if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))) stored=Number(value); } catch {}
    const cached=records.get(recordKey);
    return cached === undefined ? stored : stored === null ? cached : Math.max(cached,stored);
  }
  best=readBest();
  function makeGame() {
    const current=++generation;
    return factory({finish({score, result}={}) {
      if(disposed||current!==generation||outcome)return;
      const points=typeof score==='number'&&Number.isFinite(score)?score:null;
      outcome={score:points,result:String(result??'RUN COMPLETE').slice(0,50),delay:2,manualDelay:12+1/60};
      if(interactive&&points!==null) {
        const stored=readBest();if(stored!==null&&(best===null||stored>best))best=stored;
        if(best===null||points>best){best=points;records.set(recordKey,best);try { window.localStorage?.setItem(recordKey,String(best)); } catch { /* Keep the current session playable. */ }}
      }
    }});
  }
  function newRun() { generation++; game?.destroy?.(); outcome=null; game=makeGame(); last=0; }
  game=makeGame();
  canvas.tabIndex = interactive ? 0 : -1;
  canvas.setAttribute('aria-label', `${metadata.name} game`);
  function resize() {
    const bounds = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(bounds.width * ratio));
    canvas.height = Math.max(1, Math.round(bounds.height * ratio));
    draw();
  }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(canvas);
  resize();
  function release() { for (const key of held) game.input?.(key, false); held.clear(); }
  function isGameKey(event) {
    // Keep browser, screen-reader and dialog shortcuts available. Individual
    // games may use any printable key, arrows, Enter, or Shift.
    return !event.ctrlKey && !event.metaKey && !event.altKey &&
      (event.key.length === 1 || ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Shift'].includes(event.key));
  }
  function key(event, down) {
    if (!interactive) return;
    const name = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (down && outcome && name === 'Enter' && isGameKey(event)) { event.preventDefault(); release(); newRun(); draw(); return; }
    if (down ? (outcome || !isGameKey(event)) : !held.has(name)) return;
    event.preventDefault();
    if (down) held.add(name); else held.delete(name);
    game.input?.(name, down);
    if (outcome) draw();
  }
  const kd = event => key(event, true), ku = event => key(event, false);
  function pointer(event) {
    if (!interactive || outcome) return;
    canvas.focus({preventScroll:true});
    const bounds=canvas.getBoundingClientRect(), scale=Math.min(bounds.width/W,bounds.height/H);
    if (!scale) return;
    const x=(event.clientX-bounds.left-(bounds.width-W*scale)/2)/scale;
    const y=(event.clientY-bounds.top-(bounds.height-H*scale)/2)/scale;
    if (x>=0 && x<=W && y>=0 && y<=H) { game.pointer?.(x,y); if(outcome)draw(); }
  }
  canvas.addEventListener('keydown',kd); canvas.addEventListener('keyup',ku);
  canvas.addEventListener('blur',release); canvas.addEventListener('pointerdown',pointer);
  function draw() {
    ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle='#0c1118'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const scale=Math.min(canvas.width/W,canvas.height/H);
    ctx.setTransform(scale,0,0,scale,(canvas.width-W*scale)/2,(canvas.height-H*scale)/2);
    game.draw(ctx);
    if(outcome) {
      ctx.fillStyle='#101924'; ctx.fillRect(30,292,260,128);
      ctx.fillStyle='#f6e6c1'; ctx.textAlign='center'; ctx.font='bold 16px monospace';
      ctx.fillText(outcome.result,160,320);
      ctx.font='bold 13px monospace';
      if(outcome.score!==null)ctx.fillText(`SCORE ${outcome.score}`,160,348);
      if(interactive&&best!==null)ctx.fillText(`BEST ${best}`,160,371);
      ctx.fillText(interactive?'ENTER TO PLAY AGAIN':'NEXT RUN...',160,400);
    }
  }
  function tick(time) {
    if (disposed || paused) return;
    if (!interactive && last && time-last < 1000/30-1) { frame=requestAnimationFrame(tick); return; }
    const dt=last ? Math.min((time-last)/1000,.05) : 0;
    last=time; if(outcome){if(interactive&&(outcome.manualDelay-=dt)<=0){release();interactive=false;canvas.tabIndex=-1;newRun();options.onAttract?.()}else if(!interactive&&(outcome.delay-=dt)<=0)newRun()}else game.update(dt,!interactive); if(disposed||paused)return;draw(); frame=requestAnimationFrame(tick);
  }
  if (!paused) frame=requestAnimationFrame(tick);
  return {
    getSessionState() { return outcome ? 'result' : 'playing'; },
    restart() { if(disposed)return; release(); newRun(); draw(); },
    setInteractive(value) { if(disposed)return; release(); const takeover=!interactive&&!!value; interactive=!!value; if(takeover&&outcome)newRun(); canvas.tabIndex=interactive ? 0 : -1; last=0; draw(); },
    pause() { if (!paused) { release(); paused=true; cancelAnimationFrame(frame); last=0; } },
    resume() { if (paused && !disposed) { paused=false; last=0; frame=requestAnimationFrame(tick); } },
    resize,
    destroy() {
      if (disposed) return;
      release(); disposed=true; generation++; cancelAnimationFrame(frame); observer?.disconnect(); game.destroy?.();
      canvas.removeEventListener('keydown',kd); canvas.removeEventListener('keyup',ku);
      canvas.removeEventListener('blur',release); canvas.removeEventListener('pointerdown',pointer);
    },
  };
}
