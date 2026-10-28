import { createRunReporter } from './scores/run.js';
/** Tiny self-contained canvas games. Add an entry and a factory to extend the arcade. */
export const games = [
  { id: 'snake', name: 'Snake', category: 'CLASSIC', description: 'A little longer every time.', controls: 'Arrow keys or WASD to steer', accent: '#b5f36f', icon: '↗' },
  { id: 'breakout', name: 'Breakout', category: 'ARCADE', description: 'Clear the board, one bounce at a time.', controls: 'Move your mouse or use arrow keys', accent: '#ffad70', icon: '▦' },
  { id: 'pong', name: 'Pong', category: 'CLASSIC', description: 'The original back and forth.', controls: 'Move your mouse or use ↑ and ↓', accent: '#b6a4ff', icon: '◧' },
  { id: 'orbit', name: 'Orbit', category: 'ACTION', description: 'Keep moving. Collect the sparks.', controls: 'Arrow keys or WASD to move', accent: '#ff8da4', icon: '✳' },
  { id: 'flappy', name: 'Flappy', category: 'SKILL', description: 'A tiny flight through a big world.', controls: 'Click, tap, or press space to flap', accent: '#ffda77', icon: '↟' },
  { id: 'dodge', name: 'Dodge', category: 'ACTION', description: 'Find a little room to breathe.', controls: 'Move your mouse or use arrow keys', accent: '#8edcf0', icon: '◇' },
];

const W = 320, H = 240;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rand = (a, b) => a + Math.random() * (b - a);
const circle = (ctx, x, y, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const rect = (ctx, x, y, w, h, color, radius = 0) => { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); };
const label = (ctx, text, x, y, color = '#87919b', size = 10, align = 'left') => { ctx.fillStyle = color; ctx.font = `600 ${size}px system-ui, sans-serif`; ctx.textAlign = align; ctx.fillText(text, x, y); };
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function snake(end = () => {}) {
  let body, dir, next, food, time, score;
  const cell = 12, cols = 24, rows = 16, ox = 16, oy = 24;
  function place() {
    const occupied=new Set(body.map(p=>`${p.x},${p.y}`)), free=[];
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(!occupied.has(`${x},${y}`))free.push({x,y});
    if(free.length)food=free[Math.floor(rand(0,free.length))];
  }
  function reset() { body = [{x:8,y:8},{x:7,y:8},{x:6,y:8}]; dir = {x:1,y:0}; next = dir; score = 0; time = 0; place(); }
  reset();
  return {
    input(key, down) { if (!down) return; const d = ({ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]})[key]; if (d && (d[0] !== -dir.x || d[1] !== -dir.y)) next = {x:d[0],y:d[1]}; },
    update(dt, auto) { time += dt; if (time < .12) return; time = 0;
      if (auto) {
        // Find a route to the food around the current body. The tail will move
        // on this step, so it need not block the search unless we are eating.
        const head = body[0], blocked = new Set(body.slice(0,-1).map(p=>`${p.x},${p.y}`));
        const queue = [{x:head.x,y:head.y,first:null}], seen = new Set([`${head.x},${head.y}`]);
        const directions = [[0,-1],[1,0],[0,1],[-1,0]];
        let choice = null;
        for (let i=0;i<queue.length&&!choice;i++) {
          const current=queue[i];
          for (const [dx,dy] of directions) {
            if (!current.first && dx===-dir.x && dy===-dir.y) continue;
            const x=current.x+dx,y=current.y+dy,key=`${x},${y}`;
            if (x<0||x>=cols||y<0||y>=rows||seen.has(key)||blocked.has(key)) continue;
            const first=current.first||{x:dx,y:dy};
            if (x===food.x&&y===food.y) { choice=first; break; }
            seen.add(key);queue.push({x,y,first});
          }
        }
        if (!choice) {
          const safe=directions.find(([dx,dy])=>{
            const x=head.x+dx,y=head.y+dy;
            return !(dx===-dir.x&&dy===-dir.y)&&x>=0&&x<cols&&y>=0&&y<rows&&!blocked.has(`${x},${y}`);
          });
          if (safe) choice={x:safe[0],y:safe[1]};
        }
        if (choice) next=choice;
      }
      dir = next; const head = {x:body[0].x+dir.x,y:body[0].y+dir.y}; const eating = head.x===food.x && head.y===food.y;
      if (head.x<0 || head.x>=cols || head.y<0 || head.y>=rows || body.slice(0,eating ? undefined : -1).some(p=>p.x===head.x&&p.y===head.y)) { end('GAME OVER',score); return; }
      body.unshift(head); if (eating) { score++; if(body.length===cols*rows){end('BOARD CLEAR',score);}else place(); } else body.pop();
    },
    draw(ctx) { for(let x=0;x<cols;x++) for(let y=0;y<rows;y++) rect(ctx,ox+x*cell+5,oy+y*cell+5,1,1,'#26312e'); circle(ctx,ox+food.x*cell+6,oy+food.y*cell+6,4,'#ffad70'); body.forEach((p,i)=>rect(ctx,ox+p.x*cell+1,oy+p.y*cell+1,10,10,i?'#83c85f':'#c2f77e',3)); label(ctx,`SCORE  ${String(score).padStart(2,'0')}`,16,229); }, reset
  };
}
function breakout(end = () => {}) {
  let ball, paddle, bricks, score, keys = {};
  function reset(){ ball={x:160,y:160,vx:85,vy:-110}; paddle=160; score=0; bricks=[]; for(let y=0;y<4;y++) for(let x=0;x<9;x++) bricks.push({x:20+x*31,y:35+y*14,alive:true,color:['#f8a080','#eec775','#b5df83','#9fc9e8'][y]}); }
  reset();
  return { input(k,down){keys[k]=down;}, pointer(x){paddle=x;}, update(dt,auto){ if(auto) paddle += (ball.x-paddle)*Math.min(1,dt*7); else paddle += ((keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0))*180*dt; paddle=clamp(paddle,29,291); ball.x+=ball.vx*dt; ball.y+=ball.vy*dt; if(ball.x<8||ball.x>312){ball.vx*=-1;ball.x=clamp(ball.x,8,312);} if(ball.y<12){ball.vy=Math.abs(ball.vy);} if(ball.y>205&&ball.y<215&&ball.vy>0&&Math.abs(ball.x-paddle)<30){ball.vy=-Math.abs(ball.vy);ball.vx=clamp((ball.x-paddle)*5,-120,120)||35;} if(ball.y>245){if(auto)reset();else end('GAME OVER',score);return;} for(const b of bricks) if(b.alive&&ball.x>b.x&&ball.x<b.x+27&&ball.y>b.y&&ball.y<b.y+10){b.alive=false;ball.vy*=-1;score++;break;} if(score===36){if(auto)reset();else end('BOARD CLEAR',score);} }, draw(ctx){ bricks.forEach(b=>{if(b.alive)rect(ctx,b.x,b.y,27,10,b.color,3);}); rect(ctx,paddle-28,208,56,6,'#f7e6cc',3); circle(ctx,ball.x,ball.y,4,'#fff6e7'); label(ctx,`SCORE  ${String(score).padStart(2,'0')}`,20,230); }, reset };
}
function pong(end = () => {}) {
  let ball, left, right, score, keys={};
  function reset(){ball={x:160,y:120,vx:105,vy:75};left=right=120;score=0;} reset();
  return { input(k,d){keys[k]=d;},pointer(x,y){left=y;},update(dt,auto){ if(auto) left+=(ball.y-left)*Math.min(1,dt*4); else left+=((keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0))*180*dt; right+=(ball.y-right)*Math.min(1,dt*3.6);left=clamp(left,22,218);right=clamp(right,22,218);ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;if(ball.y<8||ball.y>232)ball.vy*=-1;if(ball.x<28&&ball.x>16&&ball.vx<0&&Math.abs(ball.y-left)<24){ball.vx=Math.abs(ball.vx);ball.vy=(ball.y-left)*5;score++;}if(ball.x>292&&ball.x<304&&ball.vx>0&&Math.abs(ball.y-right)<24){ball.vx=-Math.abs(ball.vx);ball.vy=(ball.y-right)*5;}if(ball.x<0||ball.x>320){if(auto)reset();else end(ball.x<0?'POINT LOST':'POINT WON',score);}},draw(ctx){for(let y=16;y<230;y+=16)rect(ctx,159,y,2,7,'#394039');rect(ctx,19,left-22,5,44,'#c9b9ff',3);rect(ctx,296,right-22,5,44,'#c9b9ff',3);circle(ctx,ball.x,ball.y,4,'#f9f5ff');label(ctx,`${String(score).padStart(2,'0')}`,145,24,'#756f83',13,'right');label(ctx,'01',175,24,'#756f83',13);},reset};
}
function orbit(end = () => {}){
  let player, sparks, enemies, score, keys={}; function reset(){player={x:160,y:120};sparks=Array.from({length:5},()=>({x:rand(25,295),y:rand(35,205)}));enemies=Array.from({length:4},(_,i)=>({angle:i*Math.PI/2,r:38+i*22,speed:.8+i*.14}));score=0;}reset();
  return {input(k,d){keys[k]=d;},update(dt,auto){let dx=0,dy=0;if(auto){const target=sparks.reduce((a,b)=>distance(player,a)<distance(player,b)?a:b);dx=target.x-player.x;dy=target.y-player.y;const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;}else{dx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);dy=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);}player.x=clamp(player.x+dx*95*dt,10,310);player.y=clamp(player.y+dy*95*dt,12,228); enemies.forEach(e=>e.angle+=dt*e.speed);sparks.forEach(s=>{if(distance(player,s)<12){score++;s.x=rand(25,295);s.y=rand(35,205);}});if(enemies.some(e=>distance(player,{x:160+Math.cos(e.angle)*e.r,y:120+Math.sin(e.angle)*e.r})<10)){if(auto)reset();else end('GAME OVER',score);}},draw(ctx){enemies.forEach(e=>{ctx.strokeStyle='#3c343c';ctx.lineWidth=1;ctx.beginPath();ctx.arc(160,120,e.r,0,Math.PI*2);ctx.stroke();circle(ctx,160+Math.cos(e.angle)*e.r,120+Math.sin(e.angle)*e.r,5,'#e27f94');});sparks.forEach(s=>{circle(ctx,s.x,s.y,4,'#ffda8e');});circle(ctx,player.x,player.y,7,'#fff2df');label(ctx,`SPARKS  ${String(score).padStart(2,'0')}`,16,229);},reset};
}
function flappy(end = () => {}){
 let bird, pipes, score, clock;function reset(){bird={y:120,vy:0};pipes=[{x:330,gap:120},{x:490,gap:100}];score=0;clock=0;}reset();function flap(){bird.vy=-135;}return {input(k,d){if(d&&(k===' '||k==='ArrowUp'||k==='w'))flap();},pointer(){flap();},update(dt,auto){clock+=dt;const next=pipes.find(p=>p.x+28>75)||pipes[0];if(auto&&bird.y>next.gap+rand(-7,5)&&bird.vy>10)flap();bird.vy+=330*dt;bird.y+=bird.vy*dt;pipes.forEach(p=>{p.x-=80*dt;if(p.x< -30){p.x=330;p.gap=rand(75,165);score++;}});if(bird.y<5||bird.y>235||pipes.some(p=>p.x<83&&p.x+28>67&&Math.abs(bird.y-p.gap)>42)){if(auto)reset();else end('GAME OVER',score);}},draw(ctx){pipes.forEach(p=>{rect(ctx,p.x,0,28,p.gap-48,'#88cda2',4);rect(ctx,p.x,p.gap+48,28,H-p.gap-48,'#88cda2',4);});circle(ctx,75,bird.y,10,'#ffda77');circle(ctx,79,bird.y-2,2,'#443c35');label(ctx,`FLIGHT  ${String(score).padStart(2,'0')}`,16,229);},reset};
}
function dodge(end = () => {}){
 let player, drops, score, keys={};function reset(){player={x:160,y:195};drops=Array.from({length:9},(_,i)=>({x:rand(20,300),y:-i*35,r:rand(5,10),v:rand(55,105)}));score=0;}reset();return {input(k,d){keys[k]=d;},pointer(x,y){player.x=x;player.y=clamp(y,130,220);},update(dt,auto){if(auto){let target=160;const danger=drops.filter(d=>d.y>110&&d.y<220).sort((a,b)=>Math.abs(a.x-player.x)-Math.abs(b.x-player.x))[0];if(danger&&Math.abs(danger.x-player.x)<45)target=danger.x<160?255:65;player.x+=(target-player.x)*Math.min(1,dt*2);}else{player.x+=((keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0))*180*dt;player.y+=((keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0))*180*dt;}player.x=clamp(player.x,10,310);player.y=clamp(player.y,130,220);drops.forEach(d=>{d.y+=d.v*dt;if(d.y>250){d.y=rand(-80,-10);d.x=rand(20,300);score++;}if(distance(player,d)<d.r+7){if(auto)reset();else end('GAME OVER',score);}});},draw(ctx){drops.forEach(d=>{circle(ctx,d.x,d.y,d.r,'#86cddd');rect(ctx,d.x-1,d.y-d.r-9,2,7,'#47616a',1);});ctx.fillStyle='#e7fbff';ctx.beginPath();ctx.moveTo(player.x,player.y-9);ctx.lineTo(player.x+8,player.y+7);ctx.lineTo(player.x-8,player.y+7);ctx.closePath();ctx.fill();label(ctx,`DODGED  ${String(score).padStart(2,'0')}`,16,229);},reset};
}
export const factories = { snake, breakout, pong, orbit, flappy, dodge };

/** Each instance owns its frame loop and listeners; call destroy on unmount. */
export function createGame(canvas, id, options = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !factories[id]) throw new Error(`Unknown game: ${id}`);
  let result = null, best = 0;
  const bestKey = `tiny-arcade.best.${id}`;
  try { const stored=Number(globalThis.localStorage?.getItem(bestKey)); if(Number.isFinite(stored)&&stored>0)best=stored; } catch {}
  let interactive = !!options.interactive, context = options.context ?? (interactive ? 'manual-player' : 'gallery-preview'), game, aiFinished = false, disposed = false, generation = 0;
  function saveBest(score) {
    const safeScore=Number.isFinite(score) ? Math.max(0,Math.floor(score)) : 0;
    if(safeScore>best){best=safeScore;try{globalThis.localStorage?.setItem(bestKey,String(best))}catch{}}
  }
  const reports = id === 'snake' ? createRunReporter({gameId:id, ruleVersion:1, actor:interactive?'human':'ai', context, onResult(record){
    if(record.actor==='human')saveBest(record.score);
    return options.onResult?.(record);
  }, onError:options.onError}) : null;
  const end = (message, score=0) => {
    const safeScore=Number.isFinite(score) ? Math.max(0,Math.floor(score)) : 0;
    result={message,score:safeScore};
    saveBest(safeScore);
  };
  function fresh() {
    game?.destroy?.();
    const runGeneration = ++generation;
    const finish = reports?.beginRun({actor:interactive?'human':'ai', context});
    aiFinished = false;
    game = factories[id]((message, score=0) => {
      if (!reports) { end(message, score); return; }
      const record = finish({score, result:message});
      if (!record || disposed || generation !== runGeneration) return;
      if (record.actor === 'human') end(message, score); else aiFinished = true;
    });
  }
  fresh();
  let frame, last = 0, paused = !!options.paused;
  reports?.setPaused(paused);
  canvas.tabIndex = interactive ? 0 : -1;
  canvas.setAttribute('aria-label', `${games.find(g => g.id === id).name} game`);
  function resize() { const bounds=canvas.getBoundingClientRect(); const ratio=Math.min(window.devicePixelRatio||1,2); canvas.width=Math.max(1,Math.round(bounds.width*ratio));canvas.height=Math.max(1,Math.round(bounds.height*ratio)); }
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; observer?.observe(canvas); resize();
  function key(event, down) { if(disposed || paused || !interactive || result) return; const k=event.key.length===1?event.key.toLowerCase():event.key; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(k)){event.preventDefault();game.input?.(k,down);} }
  const keydown=e=>key(e,true), keyup=e=>key(e,false);
  function point(e){const b=canvas.getBoundingClientRect();const scale=Math.min(b.width/W,b.height/H);return {x:(e.clientX-b.left-(b.width-W*scale)/2)/scale,y:(e.clientY-b.top-(b.height-H*scale)/2)/scale};}
  function pointer(e){if(disposed||paused||!interactive||result)return;canvas.focus({preventScroll:true});const p=point(e);game.pointer?.(p.x,p.y);}
  function move(e){if(!disposed && !paused && interactive && !result && (e.pointerType==='mouse'||e.buttons)) {const p=point(e);game.pointerMove?.(p.x,p.y); if(id==='breakout'||id==='pong'||id==='dodge')game.pointer?.(p.x,p.y);}}
  const clearKeys=()=>['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d'].forEach(k=>game.input?.(k,false));
  canvas.addEventListener('blur',clearKeys);
  canvas.addEventListener('keydown',keydown);canvas.addEventListener('keyup',keyup);canvas.addEventListener('pointerdown',pointer);canvas.addEventListener('pointermove',move);
  function schedule(){if(!disposed && !paused && frame == null)frame=requestAnimationFrame(tick);}
  function tick(t){frame=null;if(disposed || paused)return;if(!interactive&&last&&t-last<1000/30-1){schedule();return;}const dt=last?Math.min((t-last)/1000,.04):0;last=t;if(!result){reports?.advance(dt);game.update(dt,!interactive);if(aiFinished && !disposed && !paused)fresh();}if(disposed || paused)return;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#18211d';ctx.fillRect(0,0,canvas.width,canvas.height);const scale=Math.min(canvas.width/W,canvas.height/H),x=(canvas.width-W*scale)/2,y=(canvas.height-H*scale)/2;ctx.fillStyle='#26342c';for(let i=0;i<28;i++){const sx=((i*83+17)%320)/320*canvas.width,sy=((i*137+19)%480)/480*canvas.height;ctx.fillRect(sx,sy,Math.max(1,scale),Math.max(1,scale));}ctx.setTransform(scale,0,0,scale,x,y);ctx.fillStyle='#18211d';ctx.fillRect(0,0,W,H);game.draw(ctx);if(result){rect(ctx,54,79,212,78,'#11151dee',5);label(ctx,result.message,160,103,'#fff4df',16,'center');label(ctx,`SCORE ${result.score}   BEST ${best}`,160,122,'#e6d49b',10,'center');label(ctx,'RESTART TO PLAY AGAIN',160,140,'#b7c5c5',9,'center');}schedule();}
  schedule();
  return { beginRun({interactive:value, context:nextContext}){if(disposed)return;reports?.abandon();generation++;clearKeys();interactive=!!value;context=nextContext ?? (interactive?'manual-player':'gallery-preview');result=null;fresh();canvas.tabIndex=interactive?0:-1;}, restart(){if(disposed)return;reports?.abandon();generation++;clearKeys();result=null;fresh();}, setInteractive(value){if(disposed)return;const changed=interactive!==!!value;if(changed && reports){reports.abandon();generation++;}clearKeys();interactive=!!value;if(reports && changed){context=context==='embed'?'embed':(interactive?'manual-player':'watch-player');result=null;fresh();}else if(!interactive&&result){result=null;fresh();}canvas.tabIndex=interactive?0:-1;}, pause(){if(disposed)return;reports?.setPaused(true);clearKeys();if(!paused){paused=true;cancelAnimationFrame(frame);frame=null;last=0;}}, resume(){if(paused && !disposed){reports?.setPaused(false);paused=false;last=0;schedule();}}, resize, destroy(){if(disposed)return;disposed=true;generation++;reports?.destroy();clearKeys();game?.destroy?.();cancelAnimationFrame(frame);observer?.disconnect();canvas.removeEventListener('blur',clearKeys);canvas.removeEventListener('keydown',keydown);canvas.removeEventListener('keyup',keyup);canvas.removeEventListener('pointerdown',pointer);canvas.removeEventListener('pointermove',move);} };
}



