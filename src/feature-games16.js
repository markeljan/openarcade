import {createGameAudio,unlockSound} from './audio.js';
import {createRunReporter} from './scores/run.js';
export const featureGames16=[
 {id:'ricochet-foundry',name:'Ricochet Foundry',category:'PUZZLE',description:'Bank a hot charge through the forge.',controls:'Left / right choose port · Up / down turn director · Space launch',accent:'#efad7d',icon:'◆'},
 {id:'lantern-line',name:'Lantern Line',category:'PUZZLE',description:'Route motes to light the skyline.',controls:'Arrows or WASD move · X rotate · Space scrub · Z purge',accent:'#b8d4ed',icon:'✦'}
];
const W=320,H=720,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}function dot(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}function text(c,s,x,y,color='#fff',size=14,align='left'){c.fillStyle=color;c.font=`bold ${size}px monospace`;c.textAlign=align;c.fillText(s,x,y)}
export function advanceFoundryPhysics(body,dt,obstacles=[]){
 let remaining=dt,hits=[];for(let bounce=0;bounce<6&&remaining>1e-7;bounce++){let best=null;for(const box of obstacles){if(!box.active||body.routeLocked&&box.kind==='slag')continue;const radius=body.radius??9;let enter=-Infinity,exit=Infinity,nx=0,ny=0,ok=true;for(const [p,v,min,max,axis] of [[body.x,body.vx,box.x-radius,box.x+box.w+radius,'x'],[body.y,body.vy,box.y-radius,box.y+box.h+radius,'y']]){if(Math.abs(v)<1e-9){if(p<min||p>max)ok=false;continue}let t1=(min-p)/v,t2=(max-p)/v,normal=-1;if(t1>t2){[t1,t2]=[t2,t1];normal=1}if(t1>enter){enter=t1;nx=axis==='x'?normal:0;ny=axis==='y'?normal:0}exit=Math.min(exit,t2);if(enter>exit)ok=false}if(!ok||exit<0||enter<0||enter>remaining)continue;if(!best||enter<best.time)best={time:enter,nx,ny,box}}if(!best){body.x+=body.vx*remaining;body.y+=body.vy*remaining;break}body.x+=body.vx*best.time;body.y+=body.vy*best.time;remaining-=best.time;const dot=body.vx*best.nx+body.vy*best.ny;body.vx-=2*dot*best.nx;body.vy-=2*dot*best.ny;body.x+=best.nx*.001;body.y+=best.ny*.001;hits.push(best.box.id);if(best.box.kind==='slag'){best.box.hp--;if(best.box.hp<=0)best.box.active=false}}return hits;
}
export function foundryChargeSpeed(pressure){return pressure<45?240:pressure<75?270:300}
export function foundry(play=()=>{},finish){
 const names=['DRIVE GEAR','PRESSURE VALVE','TURBINE BLADE','FOUNDRY HEART'],targets=[['HEAT','DEPENDENCY'],['STAMP','DIE'],['QUENCH','VALVE']],positions={HEAT:{x:45,y:220},STAMP:{x:160,y:230},QUENCH:{x:274,y:220},DIE:{x:160,y:405},DEPENDENCY:{x:110,y:350},VALVE:{x:33,y:495}};
 let port,dir,order,parts,charge,ball,notice,timer,keys,dependencies,pressure,shots,elapsed,hazard,jammed,emergencyVents,slag,collisions,sessionScore,runScore,scoreEnabled=false;
 function fresh(){charge={stage:'RAW',heat:0,stamps:0};ball=null;dependencies=0;jammed=false;slag=[{id:'slag-left',kind:'slag',x:54,y:300,w:18,h:16,hp:2,active:true},{id:'slag-right',kind:'slag',x:246,y:316,w:22,h:14,hp:2,active:true},{id:'slag-plate',kind:'slag',x:72,y:490,w:36,h:12,hp:2,active:true}];hazard={phase:'calm',due:elapsed+(order===0?12:5.5),timer:0,counters:0};notice='SELECT PORT AND DIRECTOR'}
 function reset(){sessionScore=0;runScore=0;port=1;dir=1;order=0;parts=0;pressure=24;shots=0;timer=0;elapsed=0;emergencyVents=0;collisions=[];keys={};fresh()}reset();
 function award(n){runScore+=n;if(scoreEnabled)sessionScore+=n}function needed(){if(dependencies<[0,2,1,0][order])return'DEPENDENCY';if(charge.stage==='RAW')return'HEAT';if(charge.stage==='HEATED')return'STAMP';if(charge.stage==='SHAPED'&&charge.stamps<(order===3?2:1))return'STAMP';if(charge.stage==='SHAPED')return'QUENCH';return'DIE'}
 function launch(){if(ball)return;const target=targets[port][dir<0?0:1];ball={x:60+port*100,y:600,target,mode:'guide',port,orientation:dir,hold:0,trail:[],routeLocked:true,radius:9,bouncedTime:0};shots++;play('foundry-launch');notice='ROUTE: '+target}
 function arrive(){const target=ball.target;let good=true;if(target==='DEPENDENCY'){dependencies=Math.min([0,2,1,0][order],dependencies+1);notice='DEPENDENCY CLEARED'}else if(target==='VALVE'){play('foundry-vent');pressure=Math.max(0,pressure-18);jammed=false;if(hazard.phase==='warning'){hazard.phase='countered';hazard.timer=70/60;hazard.counters++;notice='SURGE COUNTERED'}else notice='PRESSURE VENTED'}else if(target==='HEAT'&&charge.stage==='RAW'){charge.stage='HEATED';award(8);charge.heat=(order===3?960:600)/60;notice='CHARGE HEATED'}else if(target==='STAMP'&&charge.stage==='HEATED'){charge.stage='SHAPED';award(8);charge.stamps=1;notice='CHARGE SHAPED'}else if(target==='STAMP'&&charge.stage==='SHAPED'&&charge.stamps<(order===3?2:1)){charge.stamps++;award(8);notice='SECOND STAMP'}else if(target==='QUENCH'&&charge.stage==='SHAPED'&&charge.stamps>=(order===3?2:1)){charge.stage='TEMPERED';award(8);charge.heat=0;notice='CHARGE TEMPERED'}else if(target==='DIE'&&!jammed&&charge.stage==='TEMPERED'&&dependencies>=[0,2,1,0][order]){ball.mode='cast';ball.hold=order===3?1:1/3;notice='CAST COMPLETE';play('foundry-cast');pressure=Math.max(0,pressure-25);return}else good=false;
  if(!good){play('foundry-scrap');charge.stage='SCRAP';charge.heat=0;pressure=Math.min(100,pressure+10);ball.mode='scrap';ball.hold=38/60;notice='WRONG ORDER — SCRAP'}else{if(target!=='VALVE'&&target!=='DEPENDENCY')play('foundry-machine');if(target!=='VALVE'&&target!=='DEPENDENCY')pressure=Math.max(0,pressure-2);ball.mode='hold';ball.hold=({HEAT:14,STAMP:12,QUENCH:18,DIE:20}[target]||1)/60}}
 function moveToward(target,dt){const dx=target.x-ball.x,dy=target.y-ball.y,d=Math.hypot(dx,dy);if(!d)return true;const speed=foundryChargeSpeed(pressure),duration=ball.bounced?dt:Math.min(dt,d/speed);if(!ball.bounced){ball.vx=dx/d*speed;ball.vy=dy/d*speed}const walls=[{id:'left-wall',kind:'wall',x:11,y:100,w:4,h:520,active:true},{id:'right-wall',kind:'wall',x:305,y:100,w:4,h:520,active:true},{id:'ceiling',kind:'wall',x:15,y:85,w:290,h:4,active:true}];const hits=advanceFoundryPhysics(ball,duration,[...walls,...slag]);if(hits.length){collisions.push(...hits);play('foundry-ricochet');ball.bounced=true}if(d<=speed*dt&&!hits.length&&!ball.bounced){ball.x=target.x;ball.y=target.y;return true}return false}
 return timedRun({input(k,d){keys[k]=d;if(!d)return;if(k==='ArrowLeft'||k==='a')port=(port+2)%3;if(k==='ArrowRight'||k==='d')port=(port+1)%3;if(['ArrowUp','ArrowDown','w','s'].includes(k))dir*=-1;if(k===' '||k==='x')launch()},update(dt,auto){scoreEnabled=!auto;timer+=dt;elapsed+=dt;if(hazard.phase==='calm'&&elapsed>=hazard.due){hazard.phase='warning';play('foundry-warning');hazard.timer=4;notice='PRESSURE SURGE - VALVE'}else if(hazard.phase==='warning'){hazard.timer-=dt;if(hazard.timer<=0){hazard.phase='land';hazard.timer=1.5;pressure=Math.min(100,pressure+15);jammed=true;play('foundry-jam');notice='DIE JAMMED - USE VALVE'}}else if(hazard.phase==='land'||hazard.phase==='countered'){hazard.timer-=dt;if(hazard.timer<=0){hazard.phase='calm';hazard.due=elapsed+18+order*2}}if(pressure>=100){pressure=55;emergencyVents++;slag.filter(q=>q.active).slice(0,2).forEach(q=>q.active=false);if(!ball||!['cast','scrap'].includes(ball.mode)){pressure+=10;play('foundry-scrap');charge.stage='SCRAP';charge.heat=0;ball={x:ball?.x??160,y:ball?.y??600,mode:'scrap',hold:38/60,trail:[]};notice='EMERGENCY VENT - SCRAP'}else notice='EMERGENCY VENT'}if(charge.heat>0){charge.heat-=dt;if(charge.heat<=0&&charge.stage!=='SCRAP'){charge.stage='SCRAP';play('foundry-scrap');pressure=Math.min(100,pressure+12);ball={x:ball?.x??160,y:ball?.y??600,mode:'scrap',hold:38/60};notice='OVERHEAT — SCRAP'}}if(auto&&!ball&&timer>1){const target=hazard.phase==='warning'||jammed?'VALVE':needed();for(let p=0;p<3;p++)for(let d=0;d<2;d++)if(targets[p][d]===target){port=p;dir=d?1:-1}launch();timer=0}if(!ball)return;if(ball.bounced){ball.bouncedTime=(ball.bouncedTime||0)+dt;if(ball.bouncedTime>4){ball.mode='return';ball.bounced=false;ball.bouncedTime=0;notice='RELIEF RETURN'}}if(['guide','director','outbound','return'].includes(ball.mode)){ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>12)ball.trail.shift()}if(ball.mode==='guide'){if(moveToward({x:60+ball.port*100,y:510},dt)){play('foundry-guide');ball.mode='outbound'}}else if(ball.mode==='outbound'){if(moveToward(positions[ball.target],dt))arrive()}else if(ball.mode==='hold'){ball.hold-=dt;if(ball.hold<=0)ball.mode='return'}else if(ball.mode==='return'){if(moveToward({x:160,y:600},dt)){ball=null;notice='CHARGE RETURNED'}}else if(ball.mode==='scrap'){ball.hold-=dt;if(ball.hold<=0){charge={stage:'RAW',heat:0,stamps:0};ball=null;notice='REPLACEMENT CHARGE'}}else if(ball.mode==='cast'){ball.hold-=dt;if(ball.hold<=0){parts++;award(order===3?100:30);order=(order+1)%4;fresh();notice='PART INSTALLED'}}},draw(c){rect(c,0,0,W,H,'#272b33');rect(c,24,100,272,530,'#4a4445');slag.filter(q=>q.active).forEach(q=>rect(c,q.x,q.y,q.w,q.h,'#716a62'));for(const [name,q] of Object.entries(positions)){rect(c,q.x-21,q.y-14,42,28,name===needed()?'#e8a568':'#7a6b5b');text(c,name,q.x,q.y-20,'#fff2ad',9,'center')}for(let i=0;i<3;i++){rect(c,44+i*100,585,32,23,i===port?'#f1b575':'#806956');text(c,String(i+1),60+i*100,602,'#fff',12,'center')}text(c,dir>0?'DIRECTOR ↗':'DIRECTOR ↖',160,545,'#efcd9e',12,'center');c.strokeStyle='#d3c7ba';c.lineWidth=6;c.beginPath();c.moveTo(145,dir>0?450:430);c.lineTo(175,dir>0?430:450);c.stroke();if(ball){for(const t of ball.trail||[])dot(c,t.x,t.y,3,'#d28b57');dot(c,ball.x,ball.y,9,'#fff4a1')}text(c,'RICOCHET FOUNDRY',16,38,'#ffd8ac',17);text(c,`${names[order]}  PARTS ${parts}  SCORE ${sessionScore}`,16,63,'#e7caaa',11);text(c,`${charge.stage}  NEXT ${needed()}  PRESSURE ${pressure}`,16,82,'#e7caaa',10);if(hazard.phase==='warning')text(c,'SURGE WARNING',160,115,'#ffb379',12,'center');if(jammed)text(c,'DIE JAMMED',160,385,'#ff8a79',10,'center');text(c,notice,160,670,'#e8c69c',12,'center')},reset,snapshot(){return structuredClone({port,dir,order,parts,charge,ball,notice,dependencies,pressure,shots,elapsed,hazard,jammed,emergencyVents,slag,collisions,sessionScore,runScore})}},finish,()=>runScore);
}
export function lanternClog(lane,ordinal){lane.jam=3;if(ordinal%12===11)lane.misfire=true}
export function lanternCoil(lane,mote){if(lane.jam>0){mote.flawed=true;return 'jam'}if(lane.misfire){lane.misfire=false;mote.charge=mote.charge===2?1:2;return 'misfire'}return 'ok'}
export function lantern(play=()=>{},onFinish){
 let keeper,lanes,motes,threat,keys={},timer,threatTimer,score,notice,order,raw,rawGlyph,halves,exact,imperfect,districts,chain,orderIndex,reworks,threatOrdinal,launched;
 const xs=[74,160,246],hues=['#ffdf8b','#8fe1dc','#ed9caf'],vent={x:160,y:145};
 const randomHue=()=>Math.floor(Math.random()*3),newOrder=()=>[{hue:randomHue(),glyph:Math.floor(Math.random()*2),charge:1+Math.floor(Math.random()*2)},{hue:randomHue(),glyph:Math.floor(Math.random()*2),charge:1+Math.floor(Math.random()*2)}];
 function reset(){keeper={x:160,y:500};lanes=xs.map(x=>({x,orientation:0,jam:0,guard:0,heat:0,misfire:false}));motes=[];threat=null;timer=0;threatTimer=9;score=0;notice='MATCH BOTH ORDER HALVES';order=newOrder();raw=randomHue();rawGlyph=Math.floor(Math.random()*2);halves=[];exact=0;imperfect=0;districts=0;chain=0;orderIndex=0;reworks=0;threatOrdinal=0;launched=[];keys={}}reset();
 function near(y){let best=lanes.reduce((a,b)=>Math.abs(a.x-keeper.x)<Math.abs(b.x-keeper.x)?a:b);return Math.hypot(best.x-keeper.x,y-keeper.y)<32?best:null}
 function rotate(){let l=near(400);if(l){l.orientation=(l.orientation+1)%3;play('lantern-rotate');notice='PRISM ROTATED'}}
 function scrub(){let l=near(300);if(!l)return;if(l.jam>0){l.jam=0;play('lantern-scrub');notice='CLOG SCRUBBED';score+=20}else if(threat&&lanes[threat.lane]===l){if(l.guard<=0)play('lantern-scrub');l.guard=2;notice='FILTER SET'}}
 function purge(){if(threat&&threat.state==='windup'&&Math.hypot(keeper.x-vent.x,keeper.y-vent.y)<35){threat=null;play('lantern-purge');score+=20;notice='SOOTLING PURGED'}}
 function rework(){const h=halves[0];if(!h||!h.flawed||Math.hypot(keeper.x-160,keeper.y-445)>=32)return false;Object.assign(h,order[0],{flawed:false});chain=0;reworks++;play('lantern-scrub');notice='GLASS REWORKED';return true}function input(k,d){const previous=keys[k];keys[k]=d;if(!d||previous)return;if(k==='x')rotate();if(k===' '){if(!rework())scrub()}if(k==='z')purge()}
 function finish(){let good=halves.every((h,i)=>!h.flawed&&h.hue===order[i].hue&&h.glyph===order[i].glyph&&h.charge===order[i].charge);launched.push({x:160,y:150,hue:halves[1].hue,exact:good,t:(good?80:60)/60});if(good){play('lantern-match');exact++;chain++;score+=100+chain*10;notice='EXACT LANTERN';if(districts<4&&exact>=4+districts*2){districts++;play('lantern-complete');notice='DISTRICT '+districts+' LIT'}}else{imperfect++;chain=0;score+=20;notice='DIM LANTERN'}halves=[];orderIndex++;order=newOrder()}
 return timedRun({input,update(dt,auto){launched.forEach(l=>{l.y-=66*dt;l.t-=dt});launched=launched.filter(l=>l.t>0);timer+=dt;threatTimer-=dt;lanes.forEach(l=>{l.jam=Math.max(0,l.jam-dt);l.guard=Math.max(0,l.guard-dt);l.heat=Math.max(0,l.heat-dt*5)});
  if(!threat&&threatTimer<=0){let hottest=lanes.reduce((a,b)=>a.heat>=b.heat?a:b);threat={lane:lanes.indexOf(hottest),state:'windup',t:1.5,ordinal:threatOrdinal++};threat.hidden=threat.ordinal%6===5;threatTimer=11;play('lantern-warning');notice='SOOTLING WINDUP'}
  if(threat){threat.t-=dt;if(threat.t<=0){let l=lanes[threat.lane];if(l.guard>0){l.guard=0;notice='CLOG CAUGHT'}else{lanternClog(l,threat.ordinal);play('lantern-clog');notice='COIL JAMMED'}threat=null}}
  let side=halves.length+motes.length,target=order[Math.min(side,1)],sensedThreat=threat&&!threat.hidden?threat:null;
  if(auto&&halves[0]?.flawed){const dx=160-keeper.x,dy=445-keeper.y,d=Math.hypot(dx,dy)||1;keeper.x+=dx/d*Math.min(d,120*dt);keeper.y+=dy/d*Math.min(d,120*dt);if(d<12)rework()}else if(auto){let lane=sensedThreat?lanes[sensedThreat.lane]:lanes.find((l,i)=>l.jam===0&&!motes.some(m=>m.lane===i&&m.stage===0))||lanes[0],goal=sensedThreat?{x:lane.x,y:300}:{x:lane.x,y:400},dx=goal.x-keeper.x,dy=goal.y-keeper.y,d=Math.hypot(dx,dy)||1;keeper.x+=dx/d*Math.min(d,120*dt);keeper.y+=dy/d*Math.min(d,120*dt);if(d<12){if(sensedThreat)scrub();else if(side<2){let need=(target.hue-raw+3)%3;if(lane.orientation!==need)rotate()}}}
  else{let dx=Number(!!(keys.ArrowRight||keys.d))-Number(!!(keys.ArrowLeft||keys.a)),dy=Number(!!(keys.ArrowDown||keys.s))-Number(!!(keys.ArrowUp||keys.w)),d=Math.hypot(dx,dy)||1;keeper.x=clamp(keeper.x+dx/d*110*dt,25,295);keeper.y=clamp(keeper.y+dy/d*110*dt,125,595)}
  if(timer>=2.4&&side<2){let l=lanes.reduce((a,b)=>Math.abs(a.x-keeper.x)<Math.abs(b.x-keeper.x)?a:b);if(!auto||(!sensedThreat&&Math.hypot(l.x-keeper.x,400-keeper.y)<20&&l.orientation===(target.hue-raw+3)%3)){timer=0;motes.push({lane:lanes.indexOf(l),x:l.x,y:500,hue:raw,glyph:rawGlyph,charge:0,recipe:{glyphFlip:rawGlyph!==target.glyph,charge:target.charge},stage:0,flawed:false,side});raw=randomHue();rawGlyph=Math.floor(Math.random()*2)}}
  motes.forEach(m=>{let l=lanes[m.lane];m.y-=80*dt;if(m.y<=400&&m.stage===0){m.hue=(m.hue+l.orientation)%3;if(m.recipe.glyphFlip)m.glyph=1-m.glyph;m.stage=1}if(m.y<=300&&m.stage===1){if(l.jam<=0)m.charge=m.recipe.charge;const outcome=lanternCoil(l,m);if(outcome==='misfire')notice='COIL MISFIRE';if(outcome!=='jam')l.heat=Math.min(100,l.heat+20+m.charge*5);m.stage=2}if(m.y<=200&&m.stage===2)m.stage=3;if(m.y<=150){m.done=true;play('lantern-collect');halves.push(m)}});motes=motes.filter(m=>!m.done);if(halves.length>=2)finish();
 },draw(c){rect(c,0,0,W,H,'#19253c');text(c,'LANTERN LINE',16,38,'#d6e4ff',20);text(c,`DISTRICTS ${districts}/4  EXACT ${exact}  SCORE ${score}`,16,63,'#e8d9a5',11);rect(c,24,110,272,480,'#273b53');lanes.forEach((l,i)=>{rect(c,l.x-2,175,4,330,'#719a9d');rect(c,l.x-18,382,36,36,'#c3b878');text(c,String(l.orientation),l.x,407,'#273b53',20,'center');rect(c,l.x-18,282,36,36,l.jam?'#a85656':'#a47a4f');if(l.guard)rect(c,l.x-22,278,44,4,'#79f2d0');if(l.misfire)rect(c,l.x-11,318,22,3,'#ff9b80');rect(c,l.x-18,182,36,36,'#467776');text(c,'F',l.x,207,'#d9f2ed',14,'center');text(c,'IN',l.x,530,'#e9d9a7',9,'center')});rect(c,146,432,28,24,'#806c69');text(c,'R',160,449,'#ffe8bb',12,'center');rect(c,vent.x-22,vent.y-12,44,24,'#82634a');text(c,'PURGE',vent.x,vent.y+4,'#ffe8bb',9,'center');motes.forEach(m=>dot(c,m.x,m.y,6,hues[m.hue]));launched.forEach(l=>{dot(c,l.x,l.y,10,l.exact?hues[l.hue]:'#858b91');rect(c,l.x-5,l.y+7,10,4,'#d6bd84')});if(threat){let l=lanes[threat.lane];dot(c,l.x,260,8,'#131920');text(c,'!',l.x,270,'#ff988c',16,'center')}dot(c,keeper.x,keeper.y,10,'#e5d7b7');rect(c,keeper.x-8,keeper.y+7,16,17,'#9bb6da');for(let i=0;i<4;i++)rect(c,54+i*57,620,40,35,i<districts?'#f1d986':'#4b5969');text(c,`ORDER ${orderIndex+1}:`,20,565,'#f4e7c6',10);order.forEach((o,i)=>{dot(c,115+i*48,560,7,hues[o.hue]);text(c,`${o.glyph?'|':'□'}${o.charge}`,126+i*48,564,'#f4e7c6',10)});text(c,`NEXT`,224,565,'#f4e7c6',9);dot(c,270,560,6,hues[raw]);text(c,notice,160,680,'#e5d8a6',12,'center')},reset,snapshot(){return structuredClone({keeper,lanes,motes,threat,score,notice,order,raw,rawGlyph,halves,exact,imperfect,districts,chain,orderIndex,reworks,timer,threatTimer,threatOrdinal,launched})}},onFinish,()=>score);
}
const factories={'ricochet-foundry':foundry,'lantern-line':lantern};
export function createFeatureGame16(canvas,id,options={}){
 const ctx=canvas.getContext('2d');if(!ctx||!factories[id])throw new Error(`Unknown game: ${id}`);

 const audioEnabled=!!options.audioEnabled,audio=createGameAudio(audioEnabled&&!options.paused);
 let game,interactive=!!options.interactive,context=options.context??(interactive?'manual-player':'gallery-preview'),paused=!!options.paused,disposed=false,frame=null,frameEpoch=0,last=0,result=null,resultTime=0,generation=0;
 const held=new Set(),reports=createRunReporter({gameId:id,ruleVersion:1,actor:interactive?'human':'ai',context,onResult:options.onResult,onError:options.onError});
 reports.setPaused(paused);
 canvas.setAttribute('aria-label',`${featureGames16.find(g=>g.id===id).name} game`);
 function resize(){const b=canvas.getBoundingClientRect(),r=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(b.width*r));canvas.height=Math.max(1,Math.round(b.height*r))}
 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(canvas);resize();
 function release(){for(const k of held)game?.input?.(k,false);held.clear()}
 // A canceled callback may still arrive. Its ticket must never consume a newer slot.
 function cancelTick(){frameEpoch++;const pending=frame;frame=null;if(pending!==null)cancelAnimationFrame(pending.id)}
 function schedule(){
  if(disposed||paused||frame!==null)return;
  const ticket={epoch:frameEpoch,id:null};frame=ticket;
  ticket.id=requestAnimationFrame(t=>{
   if(frame!==ticket||ticket.epoch!==frameEpoch||disposed||paused)return;
   frame=null;tick(t,ticket.epoch);
  });
 }
 function beginRun(next={}){
  if(disposed)return;
  const mode=next.interactive??interactive,nextContext=next.context??(mode===interactive||context==='embed'?context:mode?'manual-player':'watch-player');
  reports.abandon();generation++;cancelTick();release();game?.destroy?.();interactive=!!mode;context=nextContext;result=null;resultTime=0;last=0;canvas.tabIndex=interactive?0:-1;
  const bound=reports.beginRun({actor:interactive?'human':'ai',context}),version=generation;
  const finish=payload=>{const record=bound(payload);if(record&&version===generation&&!disposed){result=record;resultTime=0}return record};
  game=factories[id](audio.emit,finish);
  schedule();
 }
 beginRun();
 function key(e,down){
  if(!interactive||paused||disposed)return;const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','x','z','Shift','Enter'].includes(k))return;
  e.preventDefault();if(down&&audioEnabled&&e.isTrusted)unlockSound();
  if(result){if(down&&k==='Enter')beginRun();return}
  if(down)held.add(k);else held.delete(k);game.input?.(k,down);
 }
 const kd=e=>key(e,true),ku=e=>key(e,false);canvas.addEventListener('keydown',kd);canvas.addEventListener('keyup',ku);canvas.addEventListener('blur',release);
 function tick(t,epoch){
  if(disposed||paused||epoch!==frameEpoch)return;if(!interactive&&last&&t-last<32){schedule();return}
  const dt=last?Math.min((t-last)/1000,.05):0;last=t;
  if(result){resultTime+=dt;if(!interactive&&resultTime>=(id==='gravity-claw'?2:.8))beginRun()}
  else{reports.advance(dt);game.update(dt,!interactive)}
  if(disposed||paused||epoch!==frameEpoch)return;
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#10151c';ctx.fillRect(0,0,canvas.width,canvas.height);const scale=Math.min(canvas.width/W,canvas.height/H);ctx.setTransform(scale,0,0,scale,(canvas.width-W*scale)/2,(canvas.height-H*scale)/2);game.draw(ctx);
  if(disposed||paused||epoch!==frameEpoch)return;
  if(result&&id!=='gravity-claw'){rect(ctx,16,H/2-50,W-32,100,'#192632');text(ctx,result.result,W/2,H/2-15,'#fff',12,'center');text(ctx,`SCORE ${result.score}`,W/2,H/2+9,'#e9ca90',12,'center');text(ctx,interactive?'ENTER TO PLAY AGAIN':'NEXT RUN...',W/2,H/2+32,'#d2d9d7',10,'center')}
  if(epoch===frameEpoch)schedule();
 }
 schedule();
 return {beginRun,restart(){beginRun()},setInteractive(value){const mode=!!value;if(mode!==interactive)beginRun({interactive:mode});else{release();last=0}},getSessionState(){return result?'result':'playing'},resize,
  pause(){if(!paused&&!disposed){paused=true;reports.setPaused(true);cancelTick();release();audio.setActive(false);last=0}},
  resume(){if(paused&&!disposed){paused=false;reports.setPaused(false);audio.setActive(audioEnabled);last=0;schedule()}},
  destroy(){if(disposed)return;reports.destroy();generation++;disposed=true;cancelTick();release();game?.destroy?.();audio.destroy();observer?.disconnect();canvas.removeEventListener('keydown',kd);canvas.removeEventListener('keyup',ku);canvas.removeEventListener('blur',release)}};
}

// Scored sessions use active simulation time; legacy factory callers remain endless.
function timedRun(game,finish,getScore){
 if(typeof finish!=='function')return game;
 let elapsed=0,complete=false;
 return {...game,input(k,down){if(!complete||!down)game.input?.(k,down)},update(dt,auto){
  if(complete)return;
  const active=Math.min(120-elapsed,Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05)));
  game.update(active,auto);elapsed+=active;
  if(elapsed>=120-1e-9){complete=true;finish({score:getScore(),result:'SESSION COMPLETE'})}
 }};
}
