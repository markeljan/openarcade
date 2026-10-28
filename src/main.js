import './style.css';
import { games as baseGames, createGame } from './games.js';
import { moreGames, createMoreGame } from './more-games.js';
import { extraGames, createExtraGame } from './extra-games.js';
import { customGames, createCustomGame } from './custom/runtime.js';

const featureModules = Object.entries(import.meta.glob('./feature-games*.js', {eager:true}))
  .sort(([a],[b]) => (Number(a.match(/feature-games(\d*)\.js$/)?.[1] || 1) - Number(b.match(/feature-games(\d*)\.js$/)?.[1] || 1)));
const featureEntries = featureModules.flatMap(([, module]) => {
  const list = Object.entries(module).find(([key]) => /^featureGames\d*$/.test(key))?.[1];
  const make = Object.entries(module).find(([key]) => /^createFeatureGame\d*$/.test(key))?.[1];
  if (!Array.isArray(list) || typeof make !== 'function') throw new Error('Invalid feature game module');
  return list.map(game => ({game, make}));
});
const games = [...featureEntries.map(entry=>entry.game), ...baseGames, ...moreGames, ...extraGames, ...customGames];
const create = (canvas, game, opts) => {
  const feature = featureEntries.find(entry => entry.game === game);
  return feature ? feature.make(canvas, game.id, opts) : baseGames.includes(game) ? createGame(canvas, game.id, opts) : moreGames.includes(game) ? createMoreGame(canvas, game.id, opts) : extraGames.includes(game) ? createExtraGame(canvas, game.id, opts) : createCustomGame(canvas, game.id, opts);
};
const app = document.querySelector('#app');
app.innerHTML = `
<header class="header"><div class="brand"><h1>MINI<span>/</span>ARCADE</h1><p>tiny games · always playing · open one and take over</p></div><div class="status"><i></i> arcade online</div></header>
<main class="shell"><div class="intro"><div><h2>LIVE GAMES</h2><p>Self-playing previews · click any card to play</p></div><div class="toolbar" aria-label="Gallery controls"><button class="toggle" data-layout="wall" aria-pressed="true">WALL</button><button class="toggle" data-layout="row" aria-pressed="false">ROW</button><button class="nav" id="prev" aria-label="Previous game">‹</button><span class="position" aria-live="polite"></span><button class="nav" id="next" aria-label="Next game">›</button></div></div><div class="gallery" id="gallery"></div></main>
<footer class="foot"><span><strong>●</strong> SELF-PLAYING PREVIEWS</span><span>CHOOSE A GAME · TAKE CONTROL · PLAY AGAIN</span><span>ARROW KEYS TO BROWSE · ENTER TO PLAY</span></footer>
<dialog class="dialog" id="dialog" aria-label="Game player"><div class="play-layout"><header class="play-header"><div><h2 id="play-title"></h2><p id="play-subtitle"></p></div><div class="actions"><button class="action" id="share">COPY LINK</button><button class="action" id="restart">RESTART</button><button class="action" id="auto">WATCH AI</button><button class="action" id="close">✕ CLOSE</button></div></header><div class="game-stage"><canvas class="play-canvas" id="play-canvas"></canvas><div class="overlay" id="overlay"><div class="instructions"><h3>HOW TO PLAY</h3><p id="instructions"></p><button class="action primary" id="start">ENTER · PLAY</button></div></div></div><div class="touch-controls" aria-label="Touch controls"><div class="dpad"><button data-key="ArrowUp" aria-label="Up">▲</button><button data-key="ArrowLeft" aria-label="Left">◀</button><button data-key="ArrowDown" aria-label="Down">▼</button><button data-key="ArrowRight" aria-label="Right">▶</button></div><div class="touch-actions"></div></div><div class="play-foot" id="play-foot"></div></div></dialog>`;
const gallery = document.querySelector('#gallery'), position = document.querySelector('.position');
const dialog = document.querySelector('#dialog'), overlay = document.querySelector('#overlay'), playCanvas = document.querySelector('#play-canvas');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionPreference.matches, pageHidden = document.hidden;
const saveData = navigator.connection?.saveData;
let selected = 0, layout = 'wall', player = null, playing = false, hasStarted = false, pendingGame = null;
try { const saved = localStorage.getItem('miniarcade-layout'); if (saved === 'wall' || saved === 'row') layout = saved; } catch {}
const previews = new Map(), visible = new Set(), stillQueue = new Set();
let stillPainting = null;
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
  button.addEventListener('click',()=>{select(index);openGame(index);});
  button.addEventListener('focus',()=>select(index,layout==='row'));
  card.addEventListener('pointermove', e=>{if(layout==='row' && e.pointerType !== 'touch' && index!==selected) select(index,false);});
  return {card,button,canvas};
});
function select(index, scroll=true){selected=Math.max(0,Math.min(games.length-1,index));cards.forEach((c,i)=>{c.card.classList.toggle('selected',i===selected);c.button.tabIndex=layout==='wall'||i===selected?0:-1;c.button.setAttribute('aria-current',String(i===selected));});position.textContent=`${String(selected+1).padStart(2,'0')} / ${String(games.length).padStart(2,'0')}`;document.querySelector('#prev').disabled=selected===0;document.querySelector('#next').disabled=selected===games.length-1;if(scroll && layout==='row') cards[selected].card.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});updatePreviews();}
// Still paintings run one at a time while live previews are paused. This also
// bounds instances whose constructors start an animation before returning.
function processStillQueue(){
  if(stillPainting || dialog.open || pageHidden)return;
  const index=[...stillQueue].find(i=>visible.has(i));
  if(index===undefined)return;
  stillQueue.delete(index);
  const token={index};stillPainting=token;
  for(const [i,instance] of previews){instance.pause();cards[i].card.dataset.preview='still'}
  let instance=previews.get(index);
  if(!instance){instance=create(cards[index].canvas,games[index],{interactive:false});previews.set(index,instance)}
  token.instance=instance;cards[index].card.dataset.preview='playing';
  // Let game and gallery resize observers settle before the final still draw.
  setTimeout(()=>{
    if(stillPainting!==token)return;
    if(!visible.has(index)||previews.get(index)!==instance){stillPainting=null;updatePreviews();return}
    instance.resume();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(stillPainting!==token)return;
      instance.pause();cards[index].card.dataset.preview='still';stillPainting=null;updatePreviews();
    }));
  },100);
}
function updatePreviews(){
  const active=dialog.open||saveData||reduced||pageHidden?[]:[...visible].sort((a,b)=>Math.abs(a-selected)-Math.abs(b-selected)).slice(0,6);
  if((dialog.open||pageHidden) && stillPainting){stillQueue.add(stillPainting.index);stillPainting.instance?.pause();stillPainting=null}
  for(const [i,instance] of previews){
    if(!visible.has(i)){instance.destroy();previews.delete(i);stillQueue.delete(i);cards[i].card.dataset.preview='idle';cards[i].canvas.width=1;cards[i].canvas.height=1;}
  }
  for(const i of stillQueue)if(!visible.has(i))stillQueue.delete(i);
  for(const i of visible)if(!previews.has(i)&&stillPainting?.index!==i)stillQueue.add(i);
  const busy=!!stillPainting||stillQueue.size>0;
  for(const [i,instance] of previews){
    if(stillPainting?.index===i)continue;
    if(!busy&&active.includes(i)){instance.resume();cards[i].card.dataset.preview='playing'}
    else {instance.pause();cards[i].card.dataset.preview='still'}
  }
  processStillQueue();
}
motionPreference.addEventListener('change', event=>{reduced=event.matches;updatePreviews()});
function setPageHidden(hidden){pageHidden=hidden;if(player){if(hidden)player.pause();else player.resume()}updatePreviews()}
document.addEventListener('visibilitychange',()=>setPageHidden(document.hidden));
window.addEventListener('pagehide',()=>setPageHidden(true));
window.addEventListener('pageshow',()=>setPageHidden(document.hidden));
const observer=new IntersectionObserver(entries=>{for(const entry of entries){const i=Number(entry.target.dataset.index);entry.isIntersecting?visible.add(i):visible.delete(i);}updatePreviews();},{rootMargin:'40px',threshold:.05});
cards.forEach(({card},i)=>{card.dataset.index=i;observer.observe(card)});
const stillResizeObserver=new ResizeObserver(entries=>{for(const entry of entries){const i=Number(entry.target.parentElement.parentElement.parentElement.dataset.index);if(previews.has(i)&&cards[i].card.dataset.preview==='still'){stillQueue.add(i);updatePreviews()}}});
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
function openGame(index, updateUrl=true){
  const game=games[index];if(updateUrl)history.pushState(null,'',gameUrl(game.id));configureTouch(game);enableTouch(false);document.querySelector('#play-title').textContent=game.name.toUpperCase();document.querySelector('#play-subtitle').textContent=game.description;document.querySelector('#instructions').textContent=game.controls;document.querySelector('#play-foot').textContent=game.controls.toUpperCase();overlay.hidden=false;dialog.dataset.mode='instructions';playing=false;hasStarted=false;document.querySelector('#auto').textContent='WATCH AI';dialog.showModal();const instance=create(playCanvas,game,{interactive:false,onAttract:()=>{if(player===instance&&playing)watch()}});player=instance;if(pageHidden)player.pause();updatePreviews();document.querySelector('#start').focus();
}
function start(){if(!player)return;playing=true;overlay.hidden=true;dialog.dataset.mode='playing';enableTouch(true);if(!hasStarted) player.restart();hasStarted=true;player.setInteractive(true);document.querySelector('#auto').textContent='WATCH AI';playCanvas.focus();}
function watch(){if(!player)return;playing=false;hasStarted=true;overlay.hidden=true;dialog.dataset.mode='watching';enableTouch(true);player.setInteractive(false);document.querySelector('#auto').textContent='TAKE OVER';}
const touchControls=document.querySelector('.touch-controls');
function sendTouch(button,type){playCanvas.dispatchEvent(new KeyboardEvent(type,{key:button.dataset.key,bubbles:true,cancelable:true}))}
touchControls.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-key]');if(!button||button.disabled)return;e.preventDefault();if(!overlay.hidden)return;if(!playing)start();button.setPointerCapture(e.pointerId);sendTouch(button,'keydown')});
touchControls.addEventListener('pointerup',e=>{const button=e.target.closest('[data-key]');if(!button)return;e.preventDefault();sendTouch(button,'keyup')});
touchControls.addEventListener('pointercancel',e=>{const button=e.target.closest('[data-key]');if(button)sendTouch(button,'keyup')});
touchControls.addEventListener('click',e=>{const button=e.target.closest('[data-key]');if(!button||button.disabled||e.detail!==0||!overlay.hidden)return;if(!playing)start();sendTouch(button,'keydown');sendTouch(button,'keyup')});
document.querySelector('#start').addEventListener('click',start);
document.querySelector('#share').addEventListener('click',async()=>{const button=document.querySelector('#share');try{await navigator.clipboard.writeText(gameUrl(games[selected].id).href);button.textContent='COPIED'}catch{button.textContent='COPY FAILED'}setTimeout(()=>{button.textContent='COPY LINK'},1800)});
document.querySelector('#restart').addEventListener('click',()=>{player?.restart();if(playing)playCanvas.focus()});
document.querySelector('#auto').addEventListener('click',()=>{if(playing||!overlay.hidden)watch();else start()});
document.querySelector('#close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{player?.destroy();player=null;if(pendingGame!==null){const index=pendingGame;pendingGame=null;select(index,false);openGame(index,false);return}if(new URL(location.href).searchParams.has('game'))history.replaceState(null,'',gameUrl(null));updatePreviews();cards[selected].button.focus()});
dialog.addEventListener('keydown',e=>{if(e.key==='Enter'&&!overlay.hidden&&(e.target===dialog||e.target===playCanvas||e.target.id==='start')){e.preventDefault();start();}});
function setLayout(mode, persist=false){layout=mode;gallery.classList.toggle('row',layout==='row');document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===layout)));if(persist)try{localStorage.setItem('miniarcade-layout',layout)}catch{};select(selected);}
document.querySelectorAll('[data-layout]').forEach(button=>button.addEventListener('click',()=>setLayout(button.dataset.layout,true)));
document.querySelector('#prev').addEventListener('click',()=>select(selected-1));document.querySelector('#next').addEventListener('click',()=>select(selected+1));
document.addEventListener('keydown',e=>{if(dialog.open || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;if(layout==='row' && (e.key==='ArrowUp'||e.key==='ArrowDown'))return;e.preventDefault();const columns=layout==='wall'?getComputedStyle(gallery).gridTemplateColumns.split(/\s+/).length:1;const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[e.key]||0;select(e.key==='Home'?0:e.key==='End'?games.length-1:selected+delta);cards[selected].button.focus()});
setLayout(layout);
function syncGameUrl(){
  const id=new URL(location.href).searchParams.get('game');
  const index=games.findIndex(game=>game.id===id);
  if(index<0){if(dialog.open){pendingGame=null;dialog.close()}return}
  if(dialog.open){if(index!==selected){pendingGame=index;dialog.close()}return}
  select(index,false);openGame(index,false);
}
window.addEventListener('popstate',syncGameUrl);
syncGameUrl();














