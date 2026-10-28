import './style.css';
import {getSoundEnabled,setSoundEnabled,subscribeSound,unlockSound} from './audio.js';
import { gameCatalog } from './catalog.js';
import { loadGameFactory } from './game-loader.js';
import { gameUrl, gameIdFromLocation } from './social/urls.js';
import { customGames, createCustomGame } from './custom/runtime.js';
import { instantiateIfCurrent } from './async-game.js';
import { handlePlayerEscape } from './player-session.js';
import { createShareControls } from './ui/share-controls.js';
import {getAllEngagement,getEngagement,recordPlay,setVote,addComment} from './engagement.js';
import {sortGamesByVotes} from './feed-order.js';
import {createActivityCoordinator} from './feed-activity.js';
import { rankPreviews, previewOverlaps } from './preview-priority.js';
import { shouldScrollGalleryWheel, nearestGalleryCard, galleryEdgeVelocity, verticalGalleryNeighbor } from './gallery-controls.js';

// Custom scaffold modules join the static launch catalog without changing routes.
const games = [...gameCatalog, ...customGames];
const create = async (canvas, game, opts) => {
  if (customGames.includes(game)) return () => createCustomGame(canvas, game.id, opts);
  const make = await loadGameFactory(game);
  return () => make(canvas, game.id, opts);
};
const app = document.querySelector('#app');
app.innerHTML = `
<header class="header"><div class="brand"><h1>Open<span>Arcade</span></h1><p>tiny games · inspired by <a href="https://miniarcade.dev/">miniarcade.dev</a></p></div><div class="header-links"><div class="status"><i></i> arcade online</div><a class="github-link" href="https://github.com/markeljan/openarcade" target="_blank" rel="noopener noreferrer" aria-label="OpenArcade on GitHub (opens in a new tab)"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"/></svg><span>GitHub</span></a></div></header>
<main class="shell"><div class="intro"><div><h2>LIVE GAMES</h2><p>Self-playing previews · click any card to play</p></div><div class="toolbar" aria-label="Gallery controls"><button class="action primary" id="open-feed">OPEN FEED</button><button class="toggle" data-layout="wall" aria-pressed="true">WALL</button><button class="toggle" data-layout="row" aria-pressed="false">ROW</button><button class="nav" id="prev" aria-label="Previous game">‹</button><span class="position" aria-live="polite"></span><button class="nav" id="next" aria-label="Next game">›</button></div></div><div class="gallery" id="gallery"></div></main>
<footer class="foot"><span><strong>●</strong> SELF-PLAYING PREVIEWS</span><span>CHOOSE A GAME · TAKE CONTROL · PLAY AGAIN</span><span>ARROW KEYS TO BROWSE · ENTER TO PLAY</span></footer>
<dialog class="dialog" id="dialog" aria-labelledby="play-title"><div class="play-layout"><header class="play-header"><div><h2 id="play-title" aria-live="polite" aria-atomic="true"></h2><p id="play-subtitle"></p></div><div class="actions"><button class="action" id="restart">RESTART</button><button class="action" id="auto">WATCH AI</button><button class="action" id="sound" aria-pressed="false">SOUND OFF</button><button class="action" id="close">✕ CLOSE</button></div></header><div class="feed-body"><div class="game-stage" id="feed-swipe"><canvas class="play-canvas" id="play-canvas"></canvas><div class="swipe-handle" aria-hidden="true">↑ SWIPE FOR NEXT ↓</div><div class="overlay" id="overlay"><div class="instructions"><h3>HOW TO PLAY</h3><p id="instructions"></p><button class="action primary" id="start">ENTER · PLAY</button></div></div></div><aside class="feed-rail" aria-label="Game feed controls"><div class="feed-navigation"><button id="feed-prev" aria-label="Previous game">↑ <span>Previous</span></button><span id="feed-position" aria-live="polite"></span><button id="feed-next" aria-label="Next game">↓ <span>Next</span></button></div><button class="feed-play" id="feed-play">▶ PLAY</button><details class="feed-help"><summary>HOW TO PLAY</summary><p id="feed-instructions"></p></details><div class="feed-stats" aria-label="Game activity"><span id="play-count">0 plays</span><div class="feed-votes"><button id="vote-up" aria-label="Upvote game" aria-pressed="false">▲ <span>0</span></button><button id="vote-down" aria-label="Downvote game" aria-pressed="false">▼ <span>0</span></button></div></div><div class="share-controls"><button class="action" id="share" type="button">SHARE GAME</button><p id="share-status" role="status" aria-live="polite"></p><label id="share-link-label" for="share-link" hidden>Game link<input id="share-link" readonly></label></div><button class="comments-toggle" id="comments-toggle" aria-expanded="false" aria-controls="comments-panel">COMMENTS</button><section class="comments" id="comments-panel" aria-labelledby="comments-title"><button class="comments-close" id="comments-close" aria-label="Close comments">✕</button><h3 id="comments-title">COMMENTS <span id="comment-count">0</span></h3><div id="comment-list" class="comment-list" aria-live="polite"></div><details class="feedback-info" id="feedback-info"><summary>Feedback info</summary><p>Feedback may be used by AI agents to improve gameplay and fix bugs.</p></details><form id="comment-form"><label for="comment-input">Add a public comment</label><textarea id="comment-input" maxlength="280" rows="2" placeholder="Share a thought"></textarea><button type="submit">POST</button></form><p id="engagement-status" role="status"></p><button id="retry-activity" type="button" hidden>RETRY ACTIVITY</button></section></aside></div><div class="touch-controls" aria-label="Touch controls"><div class="dpad"><button data-key="ArrowUp" aria-label="Up">▲</button><button data-key="ArrowLeft" aria-label="Left">◀</button><button data-key="ArrowDown" aria-label="Down">▼</button><button data-key="ArrowRight" aria-label="Right">▶</button></div><div class="touch-actions"></div></div><div class="play-foot" id="play-foot"></div></div></dialog>`;
const shareControls=createShareControls({onStatus:({message,url})=>{document.querySelector('#share-status').textContent=message;document.querySelector('#share-link-label').hidden=!url;document.querySelector('#share-link').value=url}});
const gallery = document.querySelector('#gallery'), position = document.querySelector('.position');
const dialog = document.querySelector('#dialog'), overlay = document.querySelector('#overlay'), playCanvas = document.querySelector('#play-canvas');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)'), coarsePointer=matchMedia('(hover: none), (pointer: coarse)'), compactGallery=matchMedia('(max-width: 760px)');
let reduced = motionPreference.matches, pageHidden = document.hidden, deliberatePreview = false;
const saveData = navigator.connection?.saveData;
let selected = 0, layout = 'wall', player = null, playing = false, hasStarted = false, pendingGame = null;
try { const saved = localStorage.getItem('miniarcade-layout'); if (saved === 'wall' || saved === 'row') layout = saved; } catch {}
const previews = new Map(), visible = new Set(), stillQueue = new Set(), painted = new Set();
let stillPainting = null, playerRequest = 0, swipeSelectionTimer, closingPlayer = false, feedView = 0;
const previewErrors = new Set();
let feedStats={},feedOrder=games.map((_,i)=>i);try{feedStats=await Promise.race([getAllEngagement(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Activity timeout')),2000))]);feedOrder=sortGamesByVotes(games,feedStats).map(g=>games.indexOf(g))}catch{}
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
function applyFeedOrder(){feedOrder=sortGamesByVotes(games,feedStats).map(g=>games.indexOf(g));const current=[...gallery.children].map(card=>Number(card.dataset.index));if(current.some((index,rank)=>index!==feedOrder[rank]))for(const index of feedOrder)gallery.append(cards[index].card);updateFeedPosition()}
function updateFeedPosition(){const rank=feedOrder.indexOf(selected);position.textContent=`${String(rank+1).padStart(2,'0')} / ${String(games.length).padStart(2,'0')}`;document.querySelector('#prev').disabled=rank===0;document.querySelector('#next').disabled=rank===games.length-1;document.querySelector('#feed-position').textContent=`${rank+1} / ${games.length}`;document.querySelector('#feed-prev').disabled=rank===0;document.querySelector('#feed-next').disabled=rank===games.length-1}
function select(index, scroll=true){clearTimeout(swipeSelectionTimer);selected=Math.max(0,Math.min(games.length-1,index));cards.forEach((c,i)=>{c.card.classList.toggle('selected',i===selected);c.button.tabIndex=layout==='wall'||i===selected?0:-1;c.button.setAttribute('aria-current',String(i===selected));});updateFeedPosition();if(scroll && layout==='row') cards[selected].card.scrollIntoView({behavior:reduced?'auto':'smooth',block:'nearest',inline:'center'});updatePreviews();}
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
async function openGame(index, updateUrl=true){
  if(closingPlayer){if(updateUrl)history.pushState(null,'',gameUrl(games[index].id));pendingGame=index;return}
  setEdgeVelocity(0);const request=++playerRequest;feedView++;commentsPanel.classList.remove('open');commentsToggle.setAttribute('aria-expanded','false');releaseTouchKeys();player?.destroy();player=null;select(index,false);const game=games[index],controls=typeof game.controls==='string'?game.controls:'';if(updateUrl)history.pushState(null,'',gameUrl(game.id));shareControls.setSelection(game,gameUrl(game.id).href);document.querySelector('#feedback-info').open=false;configureTouch(game);refreshEngagement(game.id);updateFeedPosition();enableTouch(false);document.querySelector('#feed-play').disabled=true;document.querySelector('#play-title').textContent=game.name.toUpperCase();document.querySelector('#play-subtitle').textContent=game.description??'';document.querySelector('#instructions').textContent=controls;document.querySelector('#feed-instructions').textContent=controls||'Use the game controls to play.';document.querySelector('#play-foot').textContent=controls.toUpperCase();overlay.hidden=false;dialog.dataset.mode='loading';playing=false;hasStarted=false;document.querySelector('#auto').textContent='WATCH AI';document.querySelector('#start').disabled=true;document.querySelector('#auto').disabled=true;if(!dialog.open)dialog.showModal();updatePreviews();
  try{
    let instance;
    instance=await instantiateIfCurrent(create(playCanvas,game,{interactive:false,audioEnabled:true,onAttract:()=>{if(player===instance&&playing)watch(false)}}),()=>request===playerRequest&&dialog.open);
    if(!instance)return;
    player=instance;if(pageHidden)player.pause();overlay.hidden=true;dialog.dataset.mode='watching';hasStarted=true;enableTouch(true);document.querySelector('#start').disabled=false;document.querySelector('#auto').disabled=false;document.querySelector('#auto').textContent='TAKE OVER';document.querySelector('#feed-play').disabled=false;document.querySelector('#feed-play').textContent='▶ PLAY';
  }catch(error){if(request!==playerRequest||!dialog.open)return;console.error('Game failed to load',error);dialog.dataset.mode='error';document.querySelector('#instructions').textContent='Unable to load this game. Close and try again.'}
}
function start(){if(!player||playing)return;const id=games[selected].id;activity.mutate(id,()=>recordPlay(id)).catch(()=>{});const fresh=!hasStarted||dialog.dataset.mode==='watching';playing=true;overlay.hidden=true;dialog.dataset.mode='playing';document.querySelector('#feed-play').disabled=true;document.querySelector('#feed-play').textContent='PLAYING';enableTouch(true);if(fresh) player.restart();hasStarted=true;player.setInteractive(true);document.querySelector('#auto').textContent='WATCH AI';playCanvas.focus();}
function watch(resetRun=true){if(!player)return;if(playing&&resetRun)player.restart();playing=false;hasStarted=true;overlay.hidden=true;dialog.dataset.mode='watching';document.querySelector('#feed-play').disabled=false;document.querySelector('#feed-play').textContent='▶ PLAY';enableTouch(true);player.setInteractive(false);document.querySelector('#auto').textContent='TAKE OVER';}
const touchControls=document.querySelector('.touch-controls');
function releaseTouchKeys(){for(const button of touchControls.querySelectorAll('[data-key]'))sendTouch(button,'keyup')}
function sendTouch(button,type){playCanvas.dispatchEvent(new KeyboardEvent(type,{key:button.dataset.key,bubbles:true,cancelable:true}))}
touchControls.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-key]');if(!button||button.disabled)return;e.preventDefault();if(!overlay.hidden)return;if(!playing){unlockSound();start()}button.setPointerCapture(e.pointerId);sendTouch(button,'keydown')});
touchControls.addEventListener('pointerup',e=>{const button=e.target.closest('[data-key]');if(!button)return;e.preventDefault();sendTouch(button,'keyup')});
touchControls.addEventListener('pointercancel',e=>{const button=e.target.closest('[data-key]');if(button)sendTouch(button,'keyup')});
touchControls.addEventListener('click',e=>{const button=e.target.closest('[data-key]');if(!button||button.disabled||e.detail!==0||!overlay.hidden)return;if(!playing){unlockSound();start()}sendTouch(button,'keydown');sendTouch(button,'keyup')});
let engagement=null;
function showEngagementError(){document.querySelector('#engagement-status').textContent='Activity is unavailable right now.';document.querySelector('#retry-activity').hidden=false}
function renderEngagement(data){document.querySelector('#retry-activity').hidden=true;engagement=data;feedStats[games[selected].id]={...feedStats[games[selected].id],upvotes:data.upvotes,downvotes:data.downvotes,plays:data.plays};applyFeedOrder();document.querySelector('#engagement-status').textContent='';document.querySelector('#play-count').textContent=`${data.plays} ${data.plays===1?'play':'plays'}`;for(const [id,value,count] of [['vote-up',1,data.upvotes],['vote-down',-1,data.downvotes]]){const button=document.getElementById(id);button.setAttribute('aria-pressed',String(data.userVote===value));button.querySelector('span').textContent=count}document.querySelector('#comment-count').textContent=data.comments.length;const list=document.querySelector('#comment-list');list.replaceChildren();if(!data.comments.length){const empty=document.createElement('p');empty.className='comment-empty';empty.textContent='Be the first to comment.';list.append(empty)}else for(const comment of data.comments){const item=document.createElement('article');item.className='comment';const body=document.createElement('p');body.textContent=comment.text;item.append(body);if(comment.createdAt){const time=document.createElement('time');const date=new Date(comment.createdAt);if(!Number.isNaN(date.valueOf())){time.dateTime=date.toISOString();time.textContent=date.toLocaleDateString();item.append(time)}}list.append(item)}}
function activityControls(busy){for(const el of document.querySelectorAll('#vote-up,#vote-down,#comment-input,#comment-form button'))el.disabled=busy}
const activity=createActivityCoordinator({read:getEngagement,onData:renderEngagement,onError:showEngagementError,onBusy:activityControls});
function refreshEngagement(id){document.querySelector('#retry-activity').hidden=true;engagement=null;document.querySelector('#comment-input').value='';document.querySelector('#engagement-status').textContent='Loading activity…';document.querySelector('#play-count').textContent='— plays';document.querySelector('#comment-count').textContent='—';for(const id of ['vote-up','vote-down']){document.querySelector(`#${id} span`).textContent='—';document.getElementById(id).setAttribute('aria-pressed','false')}document.querySelector('#comment-list').replaceChildren();activity.select(id).catch(()=>{})}
function vote(value){if(!engagement)return;const id=games[selected].id,choice=engagement.userVote===value?0:value;activity.mutate(id,()=>setVote(id,choice)).catch(()=>{})}
const commentsPanel=document.querySelector('#comments-panel'),commentsToggle=document.querySelector('#comments-toggle');function setCommentsOpen(open){if(!open)document.querySelector('#feedback-info').open=false;commentsPanel.classList.toggle('open',open);commentsToggle.setAttribute('aria-expanded',String(open));if(open)document.querySelector('#comment-input').focus();else commentsToggle.focus()}commentsToggle.addEventListener('click',()=>setCommentsOpen(!commentsPanel.classList.contains('open')));document.querySelector('#comments-close').addEventListener('click',()=>setCommentsOpen(false));
document.querySelector('#retry-activity').addEventListener('click',()=>refreshEngagement(games[selected].id));document.querySelector('#vote-up').addEventListener('click',()=>vote(1));document.querySelector('#vote-down').addEventListener('click',()=>vote(-1));
document.querySelector('#comment-form').addEventListener('submit',e=>{e.preventDefault();const input=document.querySelector('#comment-input'),value=input.value.trim(),id=games[selected].id,view=feedView;if(!value)return;activity.mutate(id,()=>addComment(id,value)).then(()=>{if(feedView===view&&games[selected].id===id&&input.value.trim()===value)input.value=''}).catch(()=>{})});
function navigateFeed(delta){const rank=feedOrder.indexOf(selected)+delta;if(rank<0||rank>=games.length)return;openGame(feedOrder[rank])}
document.querySelector('#open-feed').addEventListener('click',()=>openGame(selected));document.querySelector('#feed-prev').addEventListener('click',()=>navigateFeed(-1));document.querySelector('#feed-next').addEventListener('click',()=>navigateFeed(1));
const swipeSurface=document.querySelector('#feed-swipe');let swipe=null;swipeSurface.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||e.target.closest('button')||(playing&&e.target===playCanvas))return;swipe={x:e.clientX,y:e.clientY,id:e.pointerId}});swipeSurface.addEventListener('pointerup',e=>{if(!swipe||swipe.id!==e.pointerId)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.abs(dy)>55&&Math.abs(dy)>Math.abs(dx)*1.4)navigateFeed(dy<0?1:-1)});swipeSurface.addEventListener('pointercancel',()=>{swipe=null});
const soundButton=document.querySelector('#sound');
function refreshSound(){const on=getSoundEnabled();soundButton.textContent=on?'SOUND ON':'SOUND OFF';soundButton.setAttribute('aria-pressed',String(on))}
subscribeSound(refreshSound);refreshSound();
soundButton.addEventListener('click',()=>setSoundEnabled(!getSoundEnabled()));
function explicitPlay(){if(!player||playing)return;unlockSound();start()}
document.querySelector('#start').addEventListener('click',explicitPlay);document.querySelector('#feed-play').addEventListener('click',explicitPlay);
document.querySelector('#share').addEventListener('click',()=>{releaseTouchKeys();shareControls.share()});
document.querySelector('#share-link').addEventListener('focus',e=>e.target.select());
document.querySelector('#restart').addEventListener('click',()=>{player?.restart();if(playing)playCanvas.focus()});
document.querySelector('#auto').addEventListener('click',()=>{unlockSound();if(playing||!overlay.hidden)watch();else explicitPlay()});
function closePlayer(){if(dialog.open){releaseTouchKeys();closingPlayer=true;dialog.close()}}
document.querySelector('#close').addEventListener('click',closePlayer);
dialog.addEventListener('cancel',()=>{closingPlayer=true});
dialog.addEventListener('close',()=>{closingPlayer=false;shareControls.setSelection(null,null);playerRequest++;player?.destroy();player=null;if(pendingGame!==null){const index=pendingGame;pendingGame=null;select(index,false);openGame(index,false);return}if(gameIdFromLocation(location))history.replaceState(null,'',gameUrl(null));updatePreviews();cards[selected].button.focus()});
dialog.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('#feedback-info').open){e.preventDefault();document.querySelector('#feedback-info').open=false;document.querySelector('#feedback-info summary').focus();return}if(e.key==='Escape'&&commentsPanel.classList.contains('open')){e.preventDefault();setCommentsOpen(false);return}if(handlePlayerEscape(e,playing,player,watch))return;if(e.key==='Enter'&&!playing&&(e.target===dialog||e.target===playCanvas||e.target.id==='start')){e.preventDefault();explicitPlay();}});
function setLayout(mode, persist=false){setEdgeVelocity(0);layout=mode;gallery.classList.toggle('row',layout==='row');document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===layout)));if(persist)try{localStorage.setItem('miniarcade-layout',layout)}catch{};select(selected);}
document.querySelectorAll('[data-layout]').forEach(button=>button.addEventListener('click',()=>setLayout(button.dataset.layout,true)));
document.querySelector('#prev').addEventListener('click',()=>{deliberatePreview=true;select(feedOrder[Math.max(0,feedOrder.indexOf(selected)-1)]);cards[selected].button.focus()});document.querySelector('#next').addEventListener('click',()=>{deliberatePreview=true;select(feedOrder[Math.min(games.length-1,feedOrder.indexOf(selected)+1)]);cards[selected].button.focus()});
let edgeVelocity=0,edgeFrame=0,edgeLast=0;
function setEdgeVelocity(value){if(layout!=='row'||dialog.open||reduced||pageHidden)value=0;if(!!value!==!!edgeVelocity)gallery.style.scrollSnapType=value?'none':'';edgeVelocity=value;if(value&&!edgeFrame){edgeLast=performance.now();edgeFrame=requestAnimationFrame(stepEdge)}}
function stepEdge(now){edgeFrame=0;if(!edgeVelocity||layout!=='row'||dialog.open||reduced||pageHidden){setEdgeVelocity(0);return}const frames=Math.min(3,(now-edgeLast)/(1000/60))||1;edgeLast=now;gallery.scrollLeft+=edgeVelocity*frames;edgeFrame=requestAnimationFrame(stepEdge)}
window.addEventListener('pointermove',event=>{const bounds=gallery.getBoundingClientRect();if(layout!=='row'||coarsePointer.matches||reduced||dialog.open||pageHidden||event.pointerType==='touch'||gallery.scrollWidth<=gallery.clientWidth||event.clientY<bounds.top||event.clientY>bounds.bottom){setEdgeVelocity(0);return}setEdgeVelocity(galleryEdgeVelocity(event.clientX,innerWidth))},{passive:true});
document.documentElement.addEventListener('mouseleave',()=>setEdgeVelocity(0));window.addEventListener('blur',()=>setEdgeVelocity(0));
gallery.addEventListener('wheel',e=>{if(shouldScrollGalleryWheel({row:layout==='row',coarse:coarsePointer.matches,deltaX:e.deltaX,deltaY:e.deltaY,scrollWidth:gallery.scrollWidth,clientWidth:gallery.clientWidth})){e.preventDefault();gallery.scrollBy({left:e.deltaY,behavior:'auto'})}},{passive:false});
gallery.addEventListener('keydown',e=>{if(dialog.open || e.altKey || e.ctrlKey || e.metaKey || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;if(layout==='row' && (e.key==='ArrowUp'||e.key==='ArrowDown'))return;e.preventDefault();const vertical=e.key==='ArrowUp'||e.key==='ArrowDown';const index=vertical?verticalGalleryNeighbor(cards.map((c,index)=>({index,rect:c.card.getBoundingClientRect()})),selected,e.key==='ArrowUp'?-1:1):e.key==='Home'?feedOrder[0]:e.key==='End'?feedOrder.at(-1):feedOrder[Math.max(0,Math.min(games.length-1,feedOrder.indexOf(selected)+(e.key==='ArrowLeft'?-1:1)))];select(index);cards[selected].button.focus()});
selected=feedOrder[0];applyFeedOrder();setLayout(layout);
function syncGameUrl(){
  const id=gameIdFromLocation(location);
  const index=games.findIndex(game=>game.id===id);
  if(closingPlayer){pendingGame=index<0?null:index;return}
  if(index<0){if(dialog.open){pendingGame=null;closePlayer()}return}
  if(dialog.open){if(index!==selected)openGame(index,false);return}
  select(index,false);openGame(index,false);
}
window.addEventListener('popstate',syncGameUrl);
syncGameUrl();















