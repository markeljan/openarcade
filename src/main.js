import './style.css';
import {getSoundEnabled,setSoundEnabled,subscribeSound,unlockSound} from './audio.js';
import { games as baseGames, createGame } from './games.js';
import { moreGames, createMoreGame } from './more-games.js';
import { extraGames, createExtraGame } from './extra-games.js';
import { customGames, createCustomGame } from './custom/runtime.js';
import { featureRegistry } from './feature-registry.js';
import { instantiateIfCurrent } from './async-game.js';
import { handlePlayerEscape } from './player-session.js';
import { rankPreviews, previewOverlaps } from './preview-priority.js';
import { shouldScrollGalleryWheel, nearestGalleryCard, galleryEdgeVelocity, verticalGalleryNeighbor } from './gallery-controls.js';

const featureLoaders = import.meta.glob('./feature-games*.js');
const featureEntries = featureRegistry.flatMap(({path,games}) => games.map(game => ({game,path})));
const games = [...featureEntries.map(entry=>entry.game), ...baseGames, ...moreGames, ...extraGames, ...customGames];
const featureFactories = new Map();
const create = async (canvas, game, opts) => {
  const feature = featureEntries.find(entry => entry.game === game);
  if(feature){
    let loading=featureFactories.get(feature.path);
    if(!loading){
      const load=featureLoaders[feature.path];
      if(!load)throw new Error(`Missing feature module: ${feature.path}`);
      loading=load().then(module=>{const make=Object.entries(module).find(([key])=>/^createFeatureGame\d*$/.test(key))?.[1];if(typeof make!=='function')throw new Error(`Invalid feature game module: ${feature.path}`);return make});
      featureFactories.set(feature.path,loading);
      loading.catch(()=>{if(featureFactories.get(feature.path)===loading)featureFactories.delete(feature.path)});
    }
    const make=await loading;
    return ()=>make(canvas,game.id,opts);
  }
  return ()=>baseGames.includes(game) ? createGame(canvas, game.id, opts) : moreGames.includes(game) ? createMoreGame(canvas, game.id, opts) : extraGames.includes(game) ? createExtraGame(canvas, game.id, opts) : createCustomGame(canvas, game.id, opts);
};
const app = document.querySelector('#app');
app.innerHTML = `
<header class="header"><div class="brand"><h1>MINI<span>/</span>ARCADE</h1><p>tiny games · always playing · open one and take over</p></div><div class="status"><i></i> arcade online</div></header>
<main class="shell"><div class="intro"><div><h2>LIVE GAMES</h2><p>Self-playing previews · click any card to play</p></div><div class="toolbar" aria-label="Gallery controls"><button class="toggle" data-layout="wall" aria-pressed="true">WALL</button><button class="toggle" data-layout="row" aria-pressed="false">ROW</button><button class="nav" id="prev" aria-label="Previous game">‹</button><span class="position" aria-live="polite"></span><button class="nav" id="next" aria-label="Next game">›</button></div></div><div class="gallery" id="gallery"></div></main>
<footer class="foot"><span><strong>●</strong> SELF-PLAYING PREVIEWS</span><span>CHOOSE A GAME · TAKE CONTROL · PLAY AGAIN</span><span>ARROW KEYS TO BROWSE · ENTER TO PLAY</span></footer>
<dialog class="dialog" id="dialog" aria-label="Game player"><div class="play-layout"><header class="play-header"><div><h2 id="play-title"></h2><p id="play-subtitle"></p></div><div class="actions"><button class="action" id="share">COPY LINK</button><button class="action" id="restart">RESTART</button><button class="action" id="auto">WATCH AI</button><button class="action" id="sound" aria-pressed="false">SOUND OFF</button><button class="action" id="close">✕ CLOSE</button></div></header><div class="game-stage"><canvas class="play-canvas" id="play-canvas"></canvas><div class="overlay" id="overlay"><div class="instructions"><h3>HOW TO PLAY</h3><p id="instructions"></p><button class="action primary" id="start">ENTER · PLAY</button></div></div></div><div class="touch-controls" aria-label="Touch controls"><div class="dpad"><button data-key="ArrowUp" aria-label="Up">▲</button><button data-key="ArrowLeft" aria-label="Left">◀</button><button data-key="ArrowDown" aria-label="Down">▼</button><button data-key="ArrowRight" aria-label="Right">▶</button></div><div class="touch-actions"></div></div><div class="play-foot" id="play-foot"></div></div></dialog>`;
const gallery = document.querySelector('#gallery'), position = document.querySelector('.position');
const dialog = document.querySelector('#dialog'), overlay = document.querySelector('#overlay'), playCanvas = document.querySelector('#play-canvas');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)'), coarsePointer=matchMedia('(hover: none), (pointer: coarse)'), compactGallery=matchMedia('(max-width: 760px)');
let reduced = motionPreference.matches, pageHidden = document.hidden, deliberatePreview = false;
const saveData = navigator.connection?.saveData;
let selected = 0, layout = 'wall', player = null, playing = false, hasStarted = false, pendingGame = null;
try { const saved = localStorage.getItem('miniarcade-layout'); if (saved === 'wall' || saved === 'row') layout = saved; } catch {}
const previews = new Map(), visible = new Set(), stillQueue = new Set(), painted = new Set();
let stillPainting = null, playerRequest = 0, swipeSelectionTimer, closingPlayer = false;
const previewErrors = new Set();
const cards = games.map((game, index) => {
  const card = document.createElement('article'); card.className = 'card'; card.dataset.preview='idle'; card.style.setProperty('--accent', game.accent || '#2de2e6');
  const button = document.createElement('button'); button.className='card-button'; button.setAttribute('aria-label', `Play ${game.name}`);
  const head = document.createElement('div'); head.className='card-head';
  const title = document.createElement('div'); title.className='card-title';
  const number = document.createElement('span'); number.className='card-number'; number.textContent=String(index+1).padStart(2,'0');
  const name = document.createElement('span'); name.textContent=game.name.toUpperCase(); title.append(number,name);
  const tagline = document.createElement('span'); tagline.className='card-tagline'; tagline.textContent=game.description;
  head.append(title,tagline);
  const preview = document.createElement('div'); preview.className='preview'; const canvas=document.createElement('canvas'); canvas.setAttribute('aria-hidden','true'); const hint=document.createElement('span'); hint.className='open-hint'; hint.textContent='PLAY ↗'; preview.append(canvas,hint); button.append(head,preview);card.append(button);gallery.append(card);
  button.addEventListener('click',()=>{deliberatePreview=true;select(index);openGame(index);});
  button.addEventListener('focus',()=>{deliberatePreview=true;select(index,layout==='row')});
  card.addEventListener('pointermove', e=>{if(layout==='row' && !coarsePointer.matches && e.pointerType !== 'touch' && index!==selected) select(index,false);});
  return {card,button,canvas};
});
function select(index, scroll=true){clearTimeout(swipeSelectionTimer);selected=Math.max(0,Math.min(games.length-1,index));cards.forEach((c,i)=>{c.card.classList.toggle('selected',i===selected);c.button.tabIndex=layout==='wall'||i===selected?0:-1;c.button.setAttribute('aria-current',String(i===selected));});position.textContent=`${String(selected+1).padStart(2,'0')} / ${String(games.length).padStart(2,'0')}`;document.querySelector('#prev').disabled=selected===0;document.querySelector('#next').disabled=selected===games.length-1;if(scroll && layout==='row') cards[selected].card.scrollIntoView({behavior:reduced?'auto':'smooth',block:'nearest',inline:'center'});updatePreviews();}
// Still paintings run one at a time with one preview slot reserved. This bounds
// instances whose constructors start an animation before returning.
function rankedVisible(){
 const bounds=gallery.getBoundingClientRect(),left=Math.max(0,bounds.left),right=Math.min(innerWidth,bounds.right),top=Math.max(0,bounds.top),bottom=Math.min(innerHeight,bounds.bottom);
 if(right<=left||bottom<=top)return [];
 const candidates=[...visible].map(index=>({index,rect:cards[index].card.getBoundingClientRect(),focused:cards[index].card.contains(document.activeElement)})).filter(({rect})=>previewOverlaps(rect,{left,right,top,bottom}));
 return rankPreviews(candidates,selected,(left+right)/2,(top+bottom)/2);
}
function previewTargets(limit=6){return dialog.open||(saveData&&!deliberatePreview)||reduced||pageHidden?[]:rankedVisible().filter(i=>!previewErrors.has(i)).slice(0,limit)}
function releasePreview(index){const instance=previews.get(index);if(instance){instance.destroy();previews.delete(index)}if(painted.has(index))cards[index].card.dataset.preview='still'}
async function processStillQueue(){
 if(stillPainting||dialog.open||pageHidden)return;
 const index=rankedVisible().find(i=>stillQueue.has(i));if(index===undefined)return;
 stillQueue.delete(index);const token={index};stillPainting=token;
 // Reserve one of the six engine slots for the still currently being painted.
 const keep=previewTargets().filter(i=>i!==index).slice(0,5);
 for(const i of [...previews.keys()])if(i!==index&&!keep.includes(i))releasePreview(i);
 for(const i of keep){const instance=previews.get(i);if(instance){instance.resume();cards[i].card.dataset.preview='playing'}}
 let instance=previews.get(index);
 if(!instance){
  try{instance=await instantiateIfCurrent(create(cards[index].canvas,games[index],{interactive:false}),()=>stillPainting===token&&rankedVisible().includes(index)&&!dialog.open&&!pageHidden);
   if(!instance){if(stillPainting===token){stillPainting=null;updatePreviews()}return}previews.set(index,instance);
  }catch(error){if(stillPainting===token){console.error('Preview failed to load',error);previewErrors.add(index);cards[index].card.dataset.preview='error';stillPainting=null;updatePreviews()}return}
 }
 token.instance=instance;cards[index].card.dataset.preview='playing';
 setTimeout(()=>{
  if(stillPainting!==token)return;
  if(dialog.open||pageHidden||!rankedVisible().includes(index)||previews.get(index)!==instance){stillPainting=null;updatePreviews();return}
  instance.resume();requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(stillPainting!==token)return;instance.pause();painted.add(index);cards[index].card.dataset.preview='still';stillPainting=null;updatePreviews();
  }));
 },100);
}
function updatePreviews(){
 const ranked=rankedVisible(),eligible=new Set(ranked),active=previewTargets();
 // A pending constructor owns its reserved slot until it settles; invalidate it
 // through its currentness predicate rather than starting another constructor.
 if((dialog.open||pageHidden||!eligible.has(stillPainting?.index))&&stillPainting?.instance){const i=stillPainting.index;stillPainting.instance.pause();cards[i].card.dataset.preview=painted.has(i)?'still':'idle';stillPainting=null}
 for(const [i,instance] of previews)if(!eligible.has(i)){instance.destroy();previews.delete(i);stillQueue.delete(i);painted.delete(i);cards[i].card.dataset.preview='idle';cards[i].canvas.width=1;cards[i].canvas.height=1}
 for(const i of painted)if(!eligible.has(i)){painted.delete(i);cards[i].card.dataset.preview='idle';cards[i].canvas.width=1;cards[i].canvas.height=1}
 for(const i of stillQueue)if(!eligible.has(i))stillQueue.delete(i);
 for(const i of previewErrors)if(!eligible.has(i)){previewErrors.delete(i);cards[i].card.dataset.preview='idle'}
 for(const i of ranked)if(!painted.has(i)&&!previews.has(i)&&!previewErrors.has(i)&&stillPainting?.index!==i)stillQueue.add(i);
 // Finish all missing stills before restoring an evicted sixth active engine.
 if(!stillQueue.size&&!stillPainting)for(const i of active)if(!previews.has(i)&&!previewErrors.has(i))stillQueue.add(i);
 const busy=!!stillPainting||stillQueue.size>0,keep=busy?active.filter(i=>i!==stillPainting?.index).slice(0,5):active;
 for(const [i,instance] of previews){if(stillPainting?.index===i)continue;if(keep.includes(i)){instance.resume();cards[i].card.dataset.preview='playing'}else releasePreview(i)}
 processStillQueue();
}
motionPreference.addEventListener('change', event=>{reduced=event.matches;if(reduced)setEdgeVelocity(0);updatePreviews()});
function setPageHidden(hidden){pageHidden=hidden;if(hidden)setEdgeVelocity(0);if(player){if(hidden)player.pause();else player.resume()}updatePreviews()}
document.addEventListener('visibilitychange',()=>setPageHidden(document.hidden));
window.addEventListener('pagehide',()=>setPageHidden(true));
window.addEventListener('pageshow',()=>setPageHidden(document.hidden));
const observer=new IntersectionObserver(entries=>{for(const entry of entries){const i=Number(entry.target.dataset.index);entry.isIntersecting?visible.add(i):visible.delete(i);}updatePreviews();},{rootMargin:'40px',threshold:.05});
cards.forEach(({card},i)=>{card.dataset.index=i;observer.observe(card)});
let previewGeometryFrame=0;function previewGeometryChanged(){if(!previewGeometryFrame)previewGeometryFrame=requestAnimationFrame(()=>{previewGeometryFrame=0;updatePreviews()})}
window.addEventListener('scroll',previewGeometryChanged,{passive:true});window.addEventListener('resize',previewGeometryChanged,{passive:true});gallery.addEventListener('scroll',()=>{previewGeometryChanged();clearTimeout(swipeSelectionTimer);if(!dialog.open&&layout==='row'&&(coarsePointer.matches||compactGallery.matches))swipeSelectionTimer=setTimeout(()=>{if(dialog.open||layout!=='row')return;const bounds=gallery.getBoundingClientRect(),index=nearestGalleryCard(cards.map((c,index)=>({index,rect:c.card.getBoundingClientRect()})),bounds.left+bounds.width/2);if(index!==null)select(index,false)},110)},{passive:true});
const stillSizes=new Map();const stillResizeObserver=new ResizeObserver(entries=>{let changed=false;for(const entry of entries){const i=Number(entry.target.parentElement.parentElement.parentElement.dataset.index),size=`${entry.contentRect.width}:${entry.contentRect.height}`;if(stillSizes.get(i)===size)continue;stillSizes.set(i,size);if(painted.has(i)&&!previews.has(i)){painted.delete(i);changed=true}}if(changed)updatePreviews()});
cards.forEach(({canvas})=>stillResizeObserver.observe(canvas));
function configureTouch(game){
  const controls=game.controls || '';
  const inferred=[[' ',/\bspace\b/i],['x',/\bX\b/],['z',/\bZ\b/],['c',/\bC\b/],['b',/\bB\b/],['Enter',/\bEnter\b/i],['Shift',/\bShift\b/i]].filter(([,pattern])=>pattern.test(controls)).map(([key])=>key);
  const declared=Array.isArray(game.touchKeys)?game.touchKeys:inferred;
  const keys=[...new Set(declared.filter(key=>typeof key==='string' && (key===' '||key==='Enter'||key==='Shift'||(key.length===1 && /\S/.test(key)))))];
  const actions=document.querySelector('.touch-actions');actions.replaceChildren();
  for(const key of keys){const button=document.createElement('button');button.type='button';button.dataset.key=key;button.textContent=key===' '?'ACTION':key==='Shift'?'⇧':key.toUpperCase();button.setAttribute('aria-label',key===' '?'Space action':`${key} action`);if(key===' ')button.className='touch-action';actions.append(button)}
}
function enableTouch(enabled){document.querySelectorAll('.touch-controls [data-key]').forEach(button=>{button.disabled=!enabled})}
function gameUrl(id){const url=new URL(location.href);if(id)url.searchParams.set('game',id);else url.searchParams.delete('game');return url}
async function openGame(index, updateUrl=true){
  if(closingPlayer){if(updateUrl)history.pushState(null,'',gameUrl(games[index].id));pendingGame=index;return}
  setEdgeVelocity(0);const request=++playerRequest,game=games[index],controls=typeof game.controls==='string'?game.controls:'';if(updateUrl)history.pushState(null,'',gameUrl(game.id));configureTouch(game);enableTouch(false);document.querySelector('#play-title').textContent=game.name.toUpperCase();document.querySelector('#play-subtitle').textContent=game.description??'';document.querySelector('#instructions').textContent=controls;document.querySelector('#play-foot').textContent=controls.toUpperCase();overlay.hidden=false;dialog.dataset.mode='loading';playing=false;hasStarted=false;document.querySelector('#auto').textContent='WATCH AI';document.querySelector('#start').disabled=true;document.querySelector('#auto').disabled=true;dialog.showModal();updatePreviews();
  try{
    let instance;
    instance=await instantiateIfCurrent(create(playCanvas,game,{interactive:false,audioEnabled:true,onAttract:()=>{if(player===instance&&playing)watch(false)}}),()=>request===playerRequest&&dialog.open);
    if(!instance)return;
    player=instance;if(pageHidden)player.pause();dialog.dataset.mode='instructions';document.querySelector('#start').disabled=false;document.querySelector('#auto').disabled=false;document.querySelector('#start').focus();
  }catch(error){if(request!==playerRequest||!dialog.open)return;console.error('Game failed to load',error);dialog.dataset.mode='error';document.querySelector('#instructions').textContent='Unable to load this game. Close and try again.'}
}
function start(){if(!player)return;const fresh=!hasStarted||dialog.dataset.mode==='watching';playing=true;overlay.hidden=true;dialog.dataset.mode='playing';enableTouch(true);if(fresh) player.restart();hasStarted=true;player.setInteractive(true);document.querySelector('#auto').textContent='WATCH AI';playCanvas.focus();}
function watch(resetRun=true){if(!player)return;if(playing&&resetRun)player.restart();playing=false;hasStarted=true;overlay.hidden=true;dialog.dataset.mode='watching';enableTouch(true);player.setInteractive(false);document.querySelector('#auto').textContent='TAKE OVER';}
const touchControls=document.querySelector('.touch-controls');
function sendTouch(button,type){playCanvas.dispatchEvent(new KeyboardEvent(type,{key:button.dataset.key,bubbles:true,cancelable:true}))}
touchControls.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-key]');if(!button||button.disabled)return;e.preventDefault();if(!overlay.hidden)return;if(!playing){unlockSound();start()}button.setPointerCapture(e.pointerId);sendTouch(button,'keydown')});
touchControls.addEventListener('pointerup',e=>{const button=e.target.closest('[data-key]');if(!button)return;e.preventDefault();sendTouch(button,'keyup')});
touchControls.addEventListener('pointercancel',e=>{const button=e.target.closest('[data-key]');if(button)sendTouch(button,'keyup')});
touchControls.addEventListener('click',e=>{const button=e.target.closest('[data-key]');if(!button||button.disabled||e.detail!==0||!overlay.hidden)return;if(!playing){unlockSound();start()}sendTouch(button,'keydown');sendTouch(button,'keyup')});
const soundButton=document.querySelector('#sound');
function refreshSound(){const on=getSoundEnabled();soundButton.textContent=on?'SOUND ON':'SOUND OFF';soundButton.setAttribute('aria-pressed',String(on))}
subscribeSound(refreshSound);refreshSound();
soundButton.addEventListener('click',()=>setSoundEnabled(!getSoundEnabled()));
document.querySelector('#start').addEventListener('click',()=>{unlockSound();start()});
document.querySelector('#share').addEventListener('click',async()=>{const button=document.querySelector('#share');try{await navigator.clipboard.writeText(gameUrl(games[selected].id).href);button.textContent='COPIED'}catch{button.textContent='COPY FAILED'}setTimeout(()=>{button.textContent='COPY LINK'},1800)});
document.querySelector('#restart').addEventListener('click',()=>{player?.restart();if(playing)playCanvas.focus()});
document.querySelector('#auto').addEventListener('click',()=>{unlockSound();if(playing||!overlay.hidden)watch();else start()});
function closePlayer(){if(dialog.open){closingPlayer=true;dialog.close()}}
document.querySelector('#close').addEventListener('click',closePlayer);
dialog.addEventListener('cancel',()=>{closingPlayer=true});
dialog.addEventListener('close',()=>{closingPlayer=false;playerRequest++;player?.destroy();player=null;if(pendingGame!==null){const index=pendingGame;pendingGame=null;select(index,false);openGame(index,false);return}if(new URL(location.href).searchParams.has('game'))history.replaceState(null,'',gameUrl(null));updatePreviews();cards[selected].button.focus()});
dialog.addEventListener('keydown',e=>{if(handlePlayerEscape(e,playing,player,watch))return;if(e.key==='Enter'&&!overlay.hidden&&(e.target===dialog||e.target===playCanvas||e.target.id==='start')){e.preventDefault();unlockSound();start();}});
function setLayout(mode, persist=false){setEdgeVelocity(0);layout=mode;gallery.classList.toggle('row',layout==='row');document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===layout)));if(persist)try{localStorage.setItem('miniarcade-layout',layout)}catch{};select(selected);}
document.querySelectorAll('[data-layout]').forEach(button=>button.addEventListener('click',()=>setLayout(button.dataset.layout,true)));
document.querySelector('#prev').addEventListener('click',()=>{deliberatePreview=true;select(selected-1);cards[selected].button.focus()});document.querySelector('#next').addEventListener('click',()=>{deliberatePreview=true;select(selected+1);cards[selected].button.focus()});
let edgeVelocity=0,edgeFrame=0,edgeLast=0;
function setEdgeVelocity(value){if(layout!=='row'||dialog.open||reduced||pageHidden)value=0;if(!!value!==!!edgeVelocity)gallery.style.scrollSnapType=value?'none':'';edgeVelocity=value;if(value&&!edgeFrame){edgeLast=performance.now();edgeFrame=requestAnimationFrame(stepEdge)}}
function stepEdge(now){edgeFrame=0;if(!edgeVelocity||layout!=='row'||dialog.open||reduced||pageHidden){setEdgeVelocity(0);return}const frames=Math.min(3,(now-edgeLast)/(1000/60))||1;edgeLast=now;gallery.scrollLeft+=edgeVelocity*frames;edgeFrame=requestAnimationFrame(stepEdge)}
window.addEventListener('pointermove',event=>{const bounds=gallery.getBoundingClientRect();if(layout!=='row'||coarsePointer.matches||reduced||dialog.open||pageHidden||event.pointerType==='touch'||gallery.scrollWidth<=gallery.clientWidth||event.clientY<bounds.top||event.clientY>bounds.bottom){setEdgeVelocity(0);return}setEdgeVelocity(galleryEdgeVelocity(event.clientX,innerWidth))},{passive:true});
document.documentElement.addEventListener('mouseleave',()=>setEdgeVelocity(0));window.addEventListener('blur',()=>setEdgeVelocity(0));
gallery.addEventListener('wheel',e=>{if(shouldScrollGalleryWheel({row:layout==='row',coarse:coarsePointer.matches,deltaX:e.deltaX,deltaY:e.deltaY,scrollWidth:gallery.scrollWidth,clientWidth:gallery.clientWidth})){e.preventDefault();gallery.scrollBy({left:e.deltaY,behavior:'auto'})}},{passive:false});
gallery.addEventListener('keydown',e=>{if(dialog.open || e.altKey || e.ctrlKey || e.metaKey || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;if(layout==='row' && (e.key==='ArrowUp'||e.key==='ArrowDown'))return;e.preventDefault();const vertical=e.key==='ArrowUp'||e.key==='ArrowDown';const index=vertical?verticalGalleryNeighbor(cards.map((c,index)=>({index,rect:c.card.getBoundingClientRect()})),selected,e.key==='ArrowUp'?-1:1):e.key==='Home'?0:e.key==='End'?games.length-1:selected+(e.key==='ArrowLeft'?-1:1);select(index);cards[selected].button.focus()});
setLayout(layout);
function syncGameUrl(){
  const id=new URL(location.href).searchParams.get('game');
  const index=games.findIndex(game=>game.id===id);
  if(closingPlayer){pendingGame=index<0?null:index;return}
  if(index<0){if(dialog.open){pendingGame=null;closePlayer()}return}
  if(dialog.open){if(index!==selected){pendingGame=index;closePlayer()}return}
  select(index,false);openGame(index,false);
}
window.addEventListener('popstate',syncGameUrl);
syncGameUrl();














