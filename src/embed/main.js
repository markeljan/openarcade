import './style.css';
import { getGame } from '../catalog.js';
import { loadGameFactory } from '../game-loader.js';
import { gameIdFromLocation, gameUrl } from '../social/urls.js';
import { getSoundEnabled, setSoundEnabled, unlockSound } from '../audio.js';
import { touchKeys } from './controls.js';

const root = document.querySelector('#embed');
const id = gameIdFromLocation(new URL(location.href.replace(/\.html(?=\?|#|$)/, '')));
const game = getGame(id);
const link = document.createElement('a');
link.href = gameUrl(game?.id).href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Play on OpenArcade';
function unavailable(message) { root.replaceChildren(); const p = document.createElement('p'); p.setAttribute('role', 'status'); p.textContent = message; root.append(p, link); }
if (!game || import.meta.env.VITE_EMBEDS_ENABLED === 'false') {
  unavailable(game ? 'Embedding is currently unavailable.' : 'This game is unavailable.');
} else {
  root.innerHTML = `<header><h1></h1><p class="description"></p></header><div class="stage"><canvas></canvas></div><p class="status" role="status">Loading game…</p><p class="instructions"></p><div class="actions"><button id="start" disabled>Start</button><button id="restart" disabled>Restart</button><button id="pause" disabled>Pause</button><button id="sound" aria-pressed="false">Sound off</button></div><div class="touch" aria-label="Touch controls"><div class="arrows"><button data-key="ArrowUp" aria-label="Up">▲</button><button data-key="ArrowLeft" aria-label="Left">◀</button><button data-key="ArrowDown" aria-label="Down">▼</button><button data-key="ArrowRight" aria-label="Right">▶</button></div><div class="touch-actions"></div></div>`;
  root.append(link);
  root.querySelector('h1').textContent = game.name;
  root.querySelector('.description').textContent = game.description || '';
  root.querySelector('.instructions').textContent = game.controls || 'Use the game controls to play.';
  const canvas = root.querySelector('canvas'), stage = root.querySelector('.stage'), status = root.querySelector('.status');
  stage.style.aspectRatio = `${game.width} / ${game.height}`;
  stage.style.setProperty('--ratio', game.width / game.height);
  const start = root.querySelector('#start'), restart = root.querySelector('#restart'), pause = root.querySelector('#pause'), sound = root.querySelector('#sound'), touch = root.querySelector('.touch');
  for (const key of touchKeys(game)) { const button = document.createElement('button'); button.dataset.key = key; button.textContent = key === ' ' ? 'ACTION' : key === 'Shift' ? '⇧' : key.toUpperCase(); button.setAttribute('aria-label', key === ' ' ? 'Space action' : `${key} action`); root.querySelector('.touch-actions').append(button); }
  let player = null, disposed = false, playing = false, paused = false;
  const send = (button, type) => canvas.dispatchEvent(new KeyboardEvent(type, { key: button.dataset.key, bubbles: true, cancelable: true }));
  const release = () => touch.querySelectorAll('[data-key]').forEach(button => send(button, 'keyup'));
  const updateTouch = () => touch.querySelectorAll('button').forEach(button => { button.disabled = !playing || paused; });
  updateTouch();
  // A fresh embed starts muted even if the gallery has a saved sound preference.
  let savedSound; try { savedSound = localStorage.getItem('miniarcade-sound'); } catch {}
  setSoundEnabled(false);
  try { if (savedSound === null) localStorage.removeItem('miniarcade-sound'); else if (savedSound !== undefined) localStorage.setItem('miniarcade-sound', savedSound); } catch {}
  sound.addEventListener('click', () => { setSoundEnabled(!getSoundEnabled()); const on = getSoundEnabled(); sound.textContent = on ? 'Sound on' : 'Sound off'; sound.setAttribute('aria-pressed', String(on)); if (on) unlockSound(); });
  const beginRun = () => { if (typeof player.beginRun === 'function') player.beginRun({interactive:true, context:'embed'}); else { player.restart(); player.setInteractive(true); } };
  start.addEventListener('click', () => { if (!player || playing) return; beginRun(); playing = true; paused = false; player.resume(); start.disabled = true; pause.disabled = false; status.textContent = 'Playing'; updateTouch(); canvas.focus(); unlockSound(); });
  restart.addEventListener('click', () => { if (!player) return; release(); beginRun(); playing = true; paused = false; player.resume(); start.disabled = true; pause.disabled = false; pause.textContent = 'Pause'; status.textContent = 'Playing'; updateTouch(); canvas.focus(); });
  pause.addEventListener('click', () => { if (!player || !playing) return; paused = !paused; release(); if (paused) player.pause(); else { player.resume(); canvas.focus(); } pause.textContent = paused ? 'Resume' : 'Pause'; status.textContent = paused ? 'Paused' : 'Playing'; updateTouch(); });
  touch.addEventListener('pointerdown', e => { const button = e.target.closest('[data-key]'); if (!button || button.disabled) return; e.preventDefault(); button.setPointerCapture(e.pointerId); send(button, 'keydown'); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) touch.addEventListener(type, e => { const button = e.target.closest('[data-key]'); if (button) send(button, 'keyup'); });
  touch.addEventListener('click', e => { const button = e.target.closest('[data-key]'); if (button && !button.disabled && e.detail === 0) { send(button, 'keydown'); send(button, 'keyup'); } });
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => { if (!player) return; if (document.hidden) { release(); player.pause(); } else if (!paused) player.resume(); });
  window.addEventListener('pagehide', () => { disposed = true; release(); player?.destroy(); player = null; });
  window.addEventListener('pageshow', event => { if (event.persisted && disposed) location.reload(); });
  loadGameFactory(game).then(factory => { if (disposed) return; player = factory(canvas, game.id, { interactive: false, context: 'gallery-preview', audioEnabled: true, onAttract: () => { if (disposed) return; playing = false; paused = false; start.disabled = false; pause.disabled = true; pause.textContent = 'Pause'; status.textContent = 'Ready to play'; release(); updateTouch(); }, onResult: result => { if (disposed) return; const score = Number.isFinite(result?.score) ? ` Score: ${result.score}.` : ''; status.textContent = `${result?.result || 'Game completed.'}${score}`; } }); if (document.hidden) player.pause(); status.textContent = 'Ready to play'; start.disabled = false; restart.disabled = false; }).catch(() => { if (!disposed) unavailable('Unable to load this game.'); });
}

