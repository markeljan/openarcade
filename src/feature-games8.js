import {createRunReporter} from './scores/run.js';
import {createGameAudio,unlockSound} from './audio.js';
export const featureGames8 = [

 {id:'grave-garden',name:'Grave Garden',category:'STRATEGY',description:'Plant defenses against the undead.',controls:'Arrows choose bed; Space pea ward; X / J / K thorn wall; Z / Shift sunbloom',accent:'#abd878',icon:'✿'},

 {id:'swarm-keeper',name:'Swarm Keeper',category:'ADVENTURE',description:'Lead your crew to the Star Garden.',controls:'Left / right lead · Up advance · Down pause · X / Z rescue',accent:'#f0d478',icon:'✦'},

];

const W=320,H=720,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}

function text(c,s,x,y,color='#fff',size=14,align='left'){c.fillStyle=color;c.font=`bold ${size}px monospace`;c.textAlign=align;c.fillText(s,x,y)}

function dot(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}

const gardenBiteRates={shambler:1.02,hound:1.26,bucket:1.44,brute:2.415};
export function gardenBiteCueDue(id,fromFrame,toFrame){return Math.floor((toFrame+id)/40)>Math.floor((fromFrame+id)/40)}
export function gardenBiteInRange(plantX,zombieX){return plantX<=zombieX+6&&zombieX-plantX<18}
export function gardenApplyBite(plant,zombie,dt){plant.hitT=5/60;zombie.biteT=14/60;plant.hp-=gardenBiteRates[zombie.kind]*dt;if(plant.type==='wall')zombie.hp-=1.92*dt;return zombie.hp>0&&plant.hp<=0}
// Projectiles meet the nearest living enemy in their lane before it acts.
// Sweep the traveled segment so a long frame cannot skip a collision.
export function gardenAdvanceShots(shots,zombies,dt,sound=()=>{},onKill=()=>{}){
 for(const shot of shots){if(shot.life===undefined)shot.life=shot.kind==='moon'?2:1.5;let remaining=Math.min(dt,Math.max(0,shot.life));
  while(remaining>1e-9&&shot.life>1e-9&&shot.x<328){const step=Math.min(1/60,remaining,shot.life);shot.x+=(shot.kind==='moon'?138:186)*step;shot.life-=step;remaining-=step;
   const hit=zombies.filter(z=>z.hp>0&&z.lane===shot.lane&&z.x>=shot.x-6&&z.x<=shot.x+10).sort((a,b)=>a.x-b.x||(a.id??0)-(b.id??0))[0];
   if(hit){shot.x=500;hit.hp-=shot.damage;hit.hitT=6/60;sound(hit.kind==='bucket'||hit.kind==='brute'?'garden-clang':'garden-hit');if(shot.kind==='moon')for(const other of zombies)if(other!==hit&&other.hp>0&&other.lane===hit.lane&&Math.abs(other.x-hit.x)<30){other.hp-=.55;other.hitT=4/60;if(other.hp<=0)onKill(other)}if(hit.hp<=0)onKill(hit);break}
  }
 }
 return shots.filter(s=>s.x<328&&s.life>1e-9)
}
// Reference presentation cues run on a clock independent of the garden simulation.
export function createGardenShow(){
 const tiers={1:{frames:12,gap:0},2:{frames:46,gap:120},3:{frames:84,gap:600}},last={},queue=[];let active=null,lastApexEnd=-1e9;
 function begin(c,frame){active={...c,start:frame+1,end:frame+1+tiers[c.tier].frames};last[c.tier]=frame}
 function offer(id,tier,frame){const c={id,tier,expires:frame+30};if(active?.id===id&&active.tier===tier)return;if(queue.some(q=>q.id===id&&q.tier===tier))return;if(last[tier]!==undefined&&frame-last[tier]<tiers[tier].gap)return;if(active&&tier>active.tier){begin(c,frame);return}if(!active&&!(tier>=2&&frame-lastApexEnd<90)){begin(c,frame);return}if(tier>=(active?.tier??2)&&queue.length<3)queue.push(c)}
 function step(frame){if(active&&frame>=active.end){if(active.tier>=3)lastApexEnd=frame;active=null}while(!active&&queue.length){const c=queue[0];if(c.expires<frame){queue.shift();continue}if(c.tier>=2&&frame-lastApexEnd<90)break;if(last[c.tier]!==undefined&&frame-last[c.tier]<tiers[c.tier].gap){queue.shift();continue}queue.shift();begin(c,frame)}const age=active?frame-active.start:-1,apex=active?.tier===3;return {hold:apex&&age>=0&&age<6,every:apex&&age>=6&&age<30?3:1,admire:apex&&age>=0&&age<42,active:active?.id??null,age}}
 function reset(frame){if(active?.tier>=3)lastApexEnd=frame;active=null;queue.length=0}
 return {offer,step,reset};
}
const GARDEN_PERSONAS=[{name:'ROWAN',color:'#8fe06f',bloomBias:.4},{name:'MOSS',color:'#6fd3c8',bloomBias:1.1},{name:'BRIAR',color:'#f4c95d',bloomBias:.1}];
export function garden(sound=()=>{},records={},realShowClock=false,options={}){
 let reported=false,pendingTerminal=null;

 const lanes=[176,280,384,488],xs=[84,136,188],types={pea:{cost:50,hp:9},wall:{cost:40,hp:20},sun:{cost:25,hp:8},moon:{cost:70,hp:8}},roster={shambler:{hp:5,speed:13.8},hound:{hp:4,speed:21.6},bucket:{hp:11,speed:9.84},brute:{hp:22,speed:6.96}};

 let plants,zombies,shots,bed,sun,score,manualScore,autoMode=true,wave,t,waveTime,sunClock,plan,carried,keys={},greenhouse,barrows,breaches,wavesHeld,waveBreachStart,ended,delay,resultHold,sessionResult,pendingEnter,recentManual,attract,notice,moon,gardener,persona,nextPlanAt,tactic,plannerCalls,transplants,saves,lastSave,skill,show,showFrame,presentation,killed,taps;

 function create(type,lane,col){return {lane,col,type,hp:types[type].hp,cool:type==='sun'?(180+(lane*37+col*29)%160)/60:(18+(lane*13+col*17)%50)/60}}

 function buildWave(){const count=4+Math.min(10,Math.floor((wave-1)/3)),focus=Math.floor(Math.random()*4);return Array.from({length:count},(_,i)=>{let lane=i<Math.ceil(count*.45)?focus:Math.floor(Math.random()*4);if(wave%7===0&&i<3)lane=(focus+1)%4;const tier=Math.floor((wave-1)/10),q=Math.random(),kind=wave%10===0&&i===0?'brute':tier>=2&&q<.17?'brute':tier>=1&&q<.4?'bucket':q<.63?'hound':'shambler';return {at:(300+Math.floor(i*Math.max(24,480/Math.max(1,count-1))))/60,lane,kind,id:wave*100+i,spawned:false}})}

 function award(points){score+=points;if(!autoMode&&!sessionResult)manualScore+=points}
 function reset(){if(show)show.reset(showFrame);else{show=createGardenShow();showFrame=0}presentation={admire:false};killed=new WeakSet();plants=[create('sun',0,0),create('pea',0,1),create('pea',1,0),create('wall',1,2),create('sun',2,0),create('pea',2,1),create('pea',3,0),create('wall',3,2)];zombies=[];shots=[];bed={lane:0,col:0};sun=130;score=0;manualScore=0;keys={};taps={};wave=1;t=0;waveTime=0;sunClock=0;carried=null;greenhouse=200;breaches=0;wavesHeld=0;transplants=0;saves=0;lastSave=null;waveBreachStart=0;barrows=lanes.map((_,lane)=>({lane,ready:true,active:false,x:38}));ended=false;delay=7;resultHold=12;sessionResult=null;pendingEnter=false;recentManual=0;attract=false;notice='WAVE INCOMING';persona=GARDEN_PERSONAS[Math.min(2,Math.floor(Math.random()*3))];nextPlanAt=0;plannerCalls=0;tactic='READ THE GATE';gardener={x:62,y:lanes[1],task:null,pose:'stand'};moon={phase:'calm',next:70,timer:0,lane:0,count:0};skill={state:1+Math.floor(Math.random()*2147483647),next:0,until:0,lapses:0};plan=buildWave()}reset();
 function offer(id,tier){show.offer(id,tier,showFrame)}
 function offerKill(z){if(killed.has(z))return;killed.add(z);offer('weeded',1);if(z.x<110)offer('last-save',2)}
 function skillRandom(){skill.state=(skill.state+0x6d2b79f5)>>>0;let v=skill.state;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);return ((v^(v>>>14))>>>0)/4294967296}

 function plant(type){

  if(gardener.task)return;

  const existing=plants.find(p=>p.lane===bed.lane&&p.col===bed.col);

  if(existing||carried||sun<types[type].cost)return;

  gardener.task={action:'build',type,lane:bed.lane,col:bed.col,phase:'travel'};

 }

 function stepGardener(dt){

  const task=gardener.task;if(!task){gardener.pose='stand';return}

  const x=xs[task.col],y=lanes[task.lane]+16,dx=x-gardener.x,dy=y-gardener.y,d=Math.hypot(dx,dy);

  if(task.phase==='travel'){

   const speed=carried?81.6:98.4,step=speed*dt;

   if(d>2.4){const travel=Math.min(step,d);gardener.x+=dx/d*travel;gardener.y+=dy/d*travel;gardener.pose=carried?'carry':'walk';return}

   gardener.x=x;gardener.y=y;task.phase='work';task.remaining=task.action==='lift'?26/60:34/60;gardener.pose=task.action==='lift'?'uproot':'plant';return;

  }

  gardener.pose=task.action==='lift'?'uproot':'plant';task.remaining-=dt;if(task.remaining>1e-9)return;

  const existing=plants.find(p=>p.lane===task.lane&&p.col===task.col);

  if(task.action==='lift'&&existing&&!carried){carried=existing;plants=plants.filter(p=>p!==existing);sound('garden-uproot');if(task.destination){gardener.task={action:'place',...task.destination,phase:'travel'};return}}

  else if(task.action==='place'&&carried&&!existing){plants.push({...carried,lane:task.lane,col:task.col});carried=null;transplants++;award(15);sound('garden-plant');offer('replant',2)}

  else if(task.action==='build'&&!existing&&!carried&&sun>=types[task.type].cost){sun-=types[task.type].cost;plants.push(create(task.type,task.lane,task.col));award(11);sound('garden-plant');offer('plant',1)}

  gardener.task=null;gardener.pose='stand';nextPlanAt=0;

 }

 function project(extra){

  const power={sun:.35,pea:3.5,wall:4.7,moon:5.4},threat={shambler:5,hound:6,bucket:12,brute:25};

  const incoming=lanes.map(()=>0),live=lanes.map(()=>0),def=lanes.map(()=>0);

  for(const q of plan)incoming[q.lane]+=threat[q.kind];

  for(const z of zombies)live[z.lane]+=Math.max(0,z.hp)*(1+roster[z.kind].speed/60);

  for(let lane=0;lane<4;lane++)for(let col=0;col<3;col++){let p=plants.find(q=>q.lane===lane&&q.col===col);if(extra?.action==='move'&&lane===extra.fromLane&&col===extra.fromCol)p=null;if(extra&&lane===extra.lane&&col===extra.col)p={type:extra.type,hp:types[extra.type].hp};if(p)def[lane]+=power[p.type]*(.45+.55*clamp(p.hp/types[p.type].hp,0,1));}

  let breaches=0,margin=0;const projected=lanes.map((_,lane)=>{const load=live[lane]+incoming[lane]*.72+(moon.phase!=='calm'&&moon.lane===lane?7:0),hold=def[lane]*6.4,risk=Math.max(0,(load-hold)/9);breaches+=risk;margin+=hold-load;return {load,hold,risk}});

  return {breaches,margin,lanes:projected};

 }

 function choosePlan(){
  plannerCalls++;

  const base=project(),candidates=[],bloomCount=plants.filter(p=>p.type==='sun').length;

  for(let lane=0;lane<4;lane++)for(let col=0;col<3;col++)if(!plants.some(p=>p.lane===lane&&p.col===col)){

   for(const type of ['pea','wall','moon','sun'])if(sun>=types[type].cost){

    const task={action:'build',lane,col,type},after=project(task);

    let value=(base.breaches-after.breaches)*155+(after.margin-base.margin)*.15-types[type].cost*.035;

    if(col===2)value+=type==='wall'?34:-18;

    if(col===1)value+=(type==='pea'||type==='moon')?25:-12;

    if(col===0)value+=type==='sun'?24*persona.bloomBias:type==='pea'?10:-8;

    value+=base.lanes[lane].load*.7-base.lanes[lane].hold*.08;

    if(type==='sun'&&bloomCount<3)value+=12*persona.bloomBias;

    if(moon.phase==='warn'&&lane===moon.lane)value+=18;

    candidates.push({...task,value});

   }

   for(const p of plants){if(p.lane===lane||p.type==='sun'||p.hp<types[p.type].hp*.45)continue;

    const source=base.lanes[p.lane],dest=base.lanes[lane];

    if(moon.phase!=='warn'&&dest.risk<.8)continue;

    if(dest.risk<=source.risk+.25&&!(moon.phase==='warn'&&lane===moon.lane))continue;

    const task={action:'move',lane,col,type:p.type,fromLane:p.lane,fromCol:p.col},after=project(task);

    const value=(base.breaches-after.breaches)*165+(after.margin-base.margin)*.12+(moon.phase==='warn'&&lane===moon.lane?30:0)-12;

    candidates.push({...task,value});

   }

  }

  const referenceType={sun:'bloom',moon:'lantern',pea:'pea',wall:'thorn'};candidates.sort((a,b)=>b.value-a.value||a.lane-b.lane||a.col-b.col||referenceType[a.type].localeCompare(referenceType[b.type])||(a.action==='move'&&b.action==='move'?(a.fromLane-b.fromLane||a.fromCol-b.fromCol):0));

  return candidates[0]?.value>1?candidates[0]:null;

 }

 function drawEnemy(c,z,y,preview=false){
  const hit=!preview&&z.hitT>0,bite=!preview&&z.biteT>0,x=z.x+(hit?(Math.ceil(z.hitT*60)%2?2:-2):0),walk=Math.floor(t*7+x/20)%2,shade=preview?'#6a7062':hit?'#c38c87':z.kind==='brute'?'#775760':'#737b79',bone=preview?'#9b9f88':hit?'#f0c3b4':'#a3b4a3';
  if(z.kind==='hound'){rect(c,x-12,y-7,23,10,shade);rect(c,x-17-(bite?4:0),y-13,9,9,bone);rect(c,x-20-(bite?4:0),y-7,8,5,bone);rect(c,x-15,y-18,4,7,shade);rect(c,x+9,y-11,5,4,shade);rect(c,x+12,y-15,4,6,shade);rect(c,x-10,y+3,4,7+walk,shade);rect(c,x+5,y+3,4,8-walk,shade);rect(c,x-17,y-11,2,2,'#e87169')}
  else{const big=z.kind==='brute',w=big?27:20,h=big?42:35,top=y-h/2;rect(c,x-w/2,top,w,h,'#394e54');rect(c,x-w/2+2,top+4,w-4,h-8,big?'#586773':'#51636a');rect(c,x-w/2-3-(bite?4:0),top+7,5,h-15,shade);rect(c,x+w/2-2,top+7,5,h-15,shade);rect(c,x-(big?12:9),top-13,big?24:18,16,bone);rect(c,x-(big?10:7),top-11,big?20:14,4,'#bac9bd');rect(c,x-6,top-5,3,2,'#e87169');rect(c,x+3,top-5,3,2,'#e87169');rect(c,x-w/2,y+h/2-2,7,5+walk,'#26383a');rect(c,x+w/2-7,y+h/2-2,7,6-walk,'#26383a');if(z.kind==='bucket'){rect(c,x-10,top-20,20,8,'#829599');rect(c,x-8,top-23,16,4,'#a9bab6')}if(big){rect(c,x-13,top-19,26,5,'#3a4d53');rect(c,x-8,top-24,16,6,'#5e7377');rect(c,x+12,y-7,4,27,'#a29f85')}}
  if(!preview&&z.moon){c.globalAlpha=.28;rect(c,x-14,y-27,28,52,'#d95656');c.globalAlpha=1}
  if(!preview&&z.maxHp&&z.hp<z.maxHp){rect(c,x-11,y+25,22,3,'#342021');rect(c,x-11,y+25,22*clamp(z.hp/z.maxHp,0,1),3,'#d95656')}
 }
 function endWave(){sound('alert');nextPlanAt=0;if(breaches===waveBreachStart){wavesHeld++;award(2);offer('wave-held',2)}if(wave%6===0){award(4);offer('garden-apex',3)}waveBreachStart=breaches;wave++;waveTime=0;plan=buildWave();notice='WAVE INCOMING';if(wave%6===1){barrows.forEach(b=>{if(!b.active)b.ready=true});if(greenhouse>0)greenhouse=Math.min(200,greenhouse+2)}}

 function applyManualTap(logical){tactic='MANUAL';if(logical==='up')bed.lane=clamp(bed.lane-1,0,3);if(logical==='down')bed.lane=clamp(bed.lane+1,0,3);if(logical==='left')bed.col=clamp(bed.col-1,0,2);if(logical==='right')bed.col=clamp(bed.col+1,0,2);if(logical==='pea')plant('pea');if(logical==='wall')plant('wall');if(logical==='sun')plant('sun')}
 function consumeManualTaps(){for(const k of ['left','right','up','down'])if(taps[k]){delete taps[k];applyManualTap(k)}for(const k of ['pea','wall','sun'])if(taps[k]){delete taps[k];applyManualTap(k);break}}
 return {input(k,d){const logical=({ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',' ':'pea',x:'wall',j:'wall',k:'wall',z:'sun',Shift:'sun',Enter:'start'})[k]??k;const wasHeld=!!keys[logical];keys[logical]=d;recentManual=8;if(!d||wasHeld)return;if(k==='Enter'){pendingEnter=true;return}if(ended||sessionResult||realShowClock)taps[logical]=true;else applyManualTap(logical);},update(dt,auto){
  recentManual=Math.max(0,recentManual-dt);if(sessionResult){if(pendingEnter){const held=keys,queued=taps,recent=recentManual;reset();keys=held;taps=queued;recentManual=recent;auto=false}else{if((resultHold-=dt)<-1e-9){reset();attract=true;return}auto=recentManual<=0}}autoMode=auto;if(ended){showFrame++;presentation=show.step(showFrame)}else{if(realShowClock){showFrame++;presentation=show.step(showFrame);if(presentation.hold||showFrame%presentation.every!==0)return}else{do{showFrame++;presentation=show.step(showFrame)}while(presentation.hold||showFrame%presentation.every!==0)}}if(lastSave){lastSave.timer-=dt;if(lastSave.timer<=0)lastSave=null}
  if(ended){if((delay-=dt)<=1e-9){if(auto){reset();return}const result={notice,greenhouse,wavesHeld,transplants,manualScore},queued=pendingEnter,held=keys,actions=taps,recent=recentManual;records.finish?.(manualScore);if(pendingTerminal&&!reported&&options.finish){reported=true;options.finish(pendingTerminal)}reset();keys=held;taps=actions;recentManual=recent;sessionResult=result;pendingEnter=queued}return}t+=dt;if(t>=900-1e-9){ended=true;award(510);sound('garden-dawn');notice=greenhouse>0?'DAWN SAVED':'GARDEN LOST';if(!reported&&options.finish){pendingTerminal={score,result:notice};if(auto){reported=true;options.finish(pendingTerminal)}}offer('dawn',3);return}waveTime+=dt;sunClock+=dt;

  if(moon.phase==='calm'&&t+1e-9>=moon.next){moon.phase='warn';moon.timer=4;nextPlanAt=0;moon.lane=(wave+breaches+moon.count)%4;notice='BLOOD MOON WARNING';sound('garden-warning')}else if(moon.phase!=='calm'&&(moon.timer-=dt)<=1e-9){if(moon.phase==='warn'){moon.phase='live';moon.timer=15;notice='THE DEAD QUICKEN';sound('boss')}else{moon.phase='calm';moon.count++;moon.next+=120;offer('moon-survived',2);notice='MOON PASSES'}}

  for(const entry of plan)if(!entry.spawned&&waveTime+1e-9>=entry.at){entry.spawned=true;const empowered=moon.phase==='live'&&entry.lane===moon.lane;zombies.push({id:entry.id,lane:entry.lane,x:320+(entry.id%3)*6,hp:roster[entry.kind].hp*(empowered?1.22:1),maxHp:roster[entry.kind].hp*(empowered?1.22:1),kind:entry.kind,moon:empowered});if(entry.kind==='brute'||entry.kind==='bucket')sound('boss')}

  if(!auto&&(realShowClock||Object.keys(taps).length))consumeManualTaps();
  if(auto&&!gardener.task&&carried){const col=[0,1,2].find(n=>!plants.some(p=>p.lane===bed.lane&&p.col===n));if(col!==undefined){bed.col=col;gardener.task={action:'place',lane:bed.lane,col,phase:'travel'}}}

  let decisionReady=false;if(auto&&t+1e-9>=skill.next){if(skillRandom()<.0022){skill.until=t+(18+Math.floor(skillRandom()*17))/60;skill.next=skill.until;skill.lapses++;if(!gardener.task)tactic='MISSED THE CUE'}else{skill.next=t+(10+Math.floor(skillRandom()*9))/60;decisionReady=true}}
  if(auto&&decisionReady&&t+1e-9>=skill.until&&!gardener.task&&!carried&&t+1e-9>=nextPlanAt){const admire=presentation.admire&&!zombies.some(z=>z.hp>0&&z.x<104);const choice=admire?null:choosePlan();if(!admire)nextPlanAt=t+.5;if(choice){bed={lane:choice.lane,col:choice.col};tactic=choice.action==='move'?(moon.phase==='warn'?'REPLANT BEFORE MOON':'SHIFT THE LINE'):(moon.phase==='warn'&&choice.lane===moon.lane?'FORTIFY MOON LANE':`PLANT ${{pea:'PEA WARD',wall:'THORN WALL',moon:'MOON CAP',sun:'SUNBLOOM'}[choice.type]}`);if(choice.action==='move')gardener.task={action:'lift',lane:choice.fromLane,col:choice.fromCol,phase:'travel',destination:{lane:choice.lane,col:choice.col}};else plant(choice.type)}else tactic='WATCH THE LINE'}

  stepGardener(dt);

  [...plants].sort((a,b)=>a.lane-b.lane||a.col-b.col).forEach(p=>{p.hitT=Math.max(0,(p.hitT||0)-dt);p.cool-=dt;if(p.cool>1e-9)return;if(p.type==='sun'){p.cool+=5.5;sun=clamp(sun+18,0,300);award(2);sound('garden-harvest');offer('sun',1);return}const target=zombies.some(z=>z.hp>0&&z.lane===p.lane&&z.x>xs[p.col]-6);if(!target){p.cool+=12/60;return}p.cool+=p.type==='moon'?88/60:p.type==='pea'?62/60:25/60;if(p.type==='pea'||p.type==='moon'){shots.push({lane:p.lane,x:xs[p.col]+(p.type==='moon'?12:16),kind:p.type,damage:p.type==='moon'?1.65:1});offer('shot',1)}});

  shots=gardenAdvanceShots(shots,zombies,dt,sound,offerKill);
  for(const barrow of barrows){if(!barrow.active&&barrow.ready&&zombies.some(z=>z.hp>0&&z.lane===barrow.lane&&z.x<64)){barrow.active=true;barrow.x=38;award(20);sound('garden-barrow');offer('barrow-save',2);notice='BARROW SAVE'}else if(barrow.active){barrow.x+=210*dt;for(const z of zombies)if(z.lane===barrow.lane&&Math.abs(z.x-barrow.x)<14){z.hp=0;offerKill(z)};if(barrow.x>330){barrow.active=false;barrow.ready=false}}}

  const destroyedPlants=new Set();for(const z of zombies){if(z.hp<=0)continue;z.hitT=Math.max(0,(z.hitT||0)-dt);z.biteT=Math.max(0,(z.biteT||0)-dt);const hit=plants.filter(p=>!destroyedPlants.has(p)&&p.lane===z.lane&&gardenBiteInRange(xs[p.col],z.x)).sort((a,b)=>b.col-a.col)[0];if(hit){if(gardenApplyBite(hit,z,dt))destroyedPlants.add(hit);if(z.hp<=0)offerKill(z);if(gardenBiteCueDue(z.id,Math.floor((t-dt)*60+1e-7),Math.floor(t*60+1e-7)))sound('garden-hit')}else z.x-=roster[z.kind].speed*(z.moon&&moon.phase==='live'?1.28:1)*dt}

  for(const z of zombies)if(z.hp>0&&z.x<52){z.hp=0;z.breached=true;greenhouse=Math.max(0,greenhouse-1);breaches++;sound('garden-breach');notice='GREENHOUSE BREACH'}

  const priorPlants=plants.length;for(const p of destroyedPlants)sound('down');plants=plants.filter(p=>!destroyedPlants.has(p));if(plants.length!==priorPlants)nextPlanAt=0;shots=shots.filter(s=>s.x<328);zombies=zombies.filter(z=>{if(z.hp<=0){if(!z.breached){offerKill(z);award(9);sound('down');if(z.x<110){saves++;lastSave={lane:z.lane,timer:24/60};sound('dodge');notice='LAST-SECOND SAVE!'}}return false}return true});

  const sunTicks=Math.floor(sunClock+1e-9);if(sunTicks>0){sunClock=Math.max(0,sunClock-sunTicks);sun=Math.min(300,sun+2*sunTicks)}
  if(waveTime>=15-1e-9)endWave();

 },draw(c){
  const screenX=x=>x<=208?32+(x-48)*.725:148+(x-208)*(85/56),screenY=y=>188+(y-176)*(43/52),drawLanes=lanes.map(screenY),drawXs=xs.map(screenX);

  rect(c,0,0,W,H,'#101b17');rect(c,0,0,W,112,'#1a1914');text(c,'GRAVE GARDEN',14,27,'#c5ef84',18);text(c,`WAVE ${String(wave).padStart(2,'0')}/60`,304,26,'#f2cf6f',12,'right');text(c,'KEEP THE GREENHOUSE ALIVE',14,48,'#e5dfbf',10);

  rect(c,14,58,190,5,'#394940');const glassColor=greenhouse>60?'#92d88c':'#d95656';rect(c,14,58,190*greenhouse/200,5,glassColor);text(c,`GLASS ${Math.round(greenhouse/2)}%`,304,65,glassColor,10,'right');

  const forecast=project().lanes.map((lane,i)=>({...lane,lane:i})).sort((a,b)=>b.risk-a.risk||a.lane-b.lane)[0];text(c,forecast.risk<.35?'FORMATION HOLDS':forecast.risk<1.35?`LANE ${forecast.lane+1} STRAINS`:`BREACH LIKELY · LANE ${forecast.lane+1}`,14,87,forecast.risk<.35?'#99d87f':forecast.risk<1.35?'#e4b36d':'#d95656',11);text(c,persona.name,304,87,persona.color,10,'right');if(moon.phase!=='calm')text(c,`MOON ${moon.phase.toUpperCase()} L${moon.lane+1}`,304,100,'#f28d8d',9,'right');

  const stage=Math.min(5,Math.floor((wave-1)/10)),sky=['#3d5144','#1f2e43','#a66042','#4b6373','#552431','#a78059'][stage],ground=['#293c34','#303c42','#42342f','#363744','#403038','#29323d'][stage];rect(c,0,112,W,476,ground);rect(c,0,112,W,29,sky);rect(c,0,132,W,7,'#354c41');rect(c,0,139,W,5,'#263d34');for(let x=150;x<320;x+=32){rect(c,x,126,20,12,'#2c4139');rect(c,x+5,121,10,6,'#344a3e')}if(stage<4||stage===5&&moon.phase==='calm'){const moonX=[244,256,238,256,256,236][stage];rect(c,moonX,114,12,12,stage===1?'#dbe9e2':stage===3?'#e4f5f1':'#e6dfa0');rect(c,moonX+4,116,9,7,sky)}else{const moonRadius=moon.phase==='warn'?2*(5+Math.floor(Math.max(0,4-moon.timer)+1e-8)):18;c.globalAlpha=.24;dot(c,256,122,moonRadius+8,'#d95b63');c.globalAlpha=1;dot(c,256,122,moonRadius,'#d95b63')}// Greenhouse front: timber posts, glazed panes and the little pitched roof.
  rect(c,0,141,30,447,'#1b3530');rect(c,3,151,23,335,'#46766c');rect(c,7,157,15,317,'#82b7a7');for(let y=158;y<480;y+=43){rect(c,8,y,13,29,'#a0cab6');rect(c,10,y+2,4,23,'#c4ddd0');rect(c,7,y+29,16,4,'#315c52')}rect(c,3,151,4,335,'#264f45');rect(c,22,151,4,335,'#264f45');rect(c,0,141,30,8,'#5f8274');rect(c,3,135,23,5,'#a4b9a3');rect(c,7,130,15,5,'#829a8b');rect(c,12,126,7,4,'#c6d0b0');rect(c,0,482,31,6,'#a1c6a9');for(let i=0;i<6;i++)rect(c,2+i*6,494,4,4,i<Math.ceil(greenhouse/(200/6))?'#92d88c':'#26332e');

  for(let x=220;x<320;x+=18){rect(c,x,139,3,18,'#6e796a');rect(c,x,145,18,3,'#6e796a')}

  drawLanes.forEach((y,l)=>{const laneColor=['#222c27','#252d35','#302c2d','#30373d','#392a30','#222c27'][stage],edgeColor=['#5a6757','#59666a','#75655a','#839395','#765b60','#5a6757'][stage];rect(c,24,y-37,296,74,laneColor);rect(c,24,y+32,296,5,edgeColor);rect(c,38,y-28,114,55,'#674d32');drawXs.forEach((x,col)=>{rect(c,x-17,y-25,34,50,'#79593a');rect(c,x-14,y-21,28,42,'#4a3c2c');rect(c,x-14,y+10,28,3,'#a47c50');if(!autoMode&&bed.lane===l&&bed.col===col){c.strokeStyle='#f0d07c';c.strokeRect(x-17,y-22,33,44)}});for(let x=197;x<315;x+=31){rect(c,x,y+11,9,15,'#778078');rect(c,x+2,y+7,5,4,'#8c9589')}if(waveTime<5){const incoming=plan.filter(q=>q.lane===l);if(incoming.length){c.globalAlpha=.13+.07*Math.sin(showFrame*.16+l);rect(c,152,y-28,168,56,moon.phase==='warn'&&moon.lane===l?'#71313d':'#737064');c.globalAlpha=.48;for(let i=0;i<Math.min(4,incoming.length);i++){const q=incoming.find(q=>q.id%4===i)||incoming[0];drawEnemy(c,{kind:q.kind,x:310-i*12},y+5,true)}c.globalAlpha=1;text(c,`x${incoming.length} ${Math.ceil(5-waveTime)}s`,305,y-25,'#e6d9ae',8,'right');for(let i=0;i<4;i++){const x=166+i*32+showFrame%24;c.strokeStyle='#e8bf6e';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x-6,y-6);c.moveTo(x,y);c.lineTo(x-6,y+6);c.stroke()}}}});

  // Frost leaves snow on every lane and gathers around the crypt and well.
  if(stage===3){for(const y of drawLanes){for(let x=168;x<310;x+=26){rect(c,x,y-25,12,3,'#9fc9ce');rect(c,x+4,y-29,5,4,'#badcda')}for(let x=158;x<316;x+=38)rect(c,x,y+28,14,3,'#d5ebeb')}rect(c,262,160,48,36,'#647d82');rect(c,257,156,57,5,'#9ebec0');rect(c,268,150,35,6,'#77979b');rect(c,278,146,15,5,'#a2c2c3');rect(c,268,165,36,26,'#789296');rect(c,278,169,14,22,'#4b666e');rect(c,258,155,55,3,'#d1e9e8');rect(c,264,450,39,7,'#637f80');rect(c,270,447,28,4,'#a9c9c9');rect(c,274,444,20,3,'#d7e9e6')}
  // Blood chapter's bare tree reaches across the outer edge of the graveyard.
  if(stage===4){c.strokeStyle='#64555a';c.lineWidth=4;c.beginPath();c.moveTo(311,480);c.lineTo(301,381);c.lineTo(281,306);c.lineTo(269,215);c.moveTo(302,383);c.lineTo(286,347);c.lineTo(279,305);c.moveTo(286,348);c.lineTo(265,326);c.moveTo(278,304);c.lineTo(299,270);c.stroke()}
  // The night chapter's family crypt sits in the second lane.
  if(stage===1){rect(c,265,258,42,39,'#33434a');rect(c,261,254,50,5,'#526269');rect(c,270,248,32,7,'#495a61');rect(c,281,243,10,6,'#566970');rect(c,269,262,34,32,'#455760');rect(c,281,269,10,25,'#202d35');rect(c,284,267,4,3,'#788b8b');rect(c,265,293,42,4,'#65716c')}
  // The harvest chapter adds an arch behind the third cemetery lane.
  if(stage===2){rect(c,253,377,7,46,'#554332');rect(c,306,377,7,46,'#554332');rect(c,259,374,48,7,'#714c2d');rect(c,268,370,31,5,'#a66c34');for(let x=262;x<309;x+=15){rect(c,x,402,10,8,'#a35d27');rect(c,x+2,399,6,3,'#c7833c');rect(c,x+5,397,2,3,'#5f7b42')}}
  // Dawn's victory trellis is a landmark, not a collision object.
  if(stage===5){rect(c,253,157,7,329,'#344b3a');rect(c,308,157,7,329,'#344b3a');for(let y=169;y<480;y+=22){rect(c,256,y,55,4,'#48664b');for(let x=262;x<306;x+=18){rect(c,x,y-4,5,4,'#cfba69');rect(c,x+5,y-2,4,3,'#78965e')}}}
  [...plants].sort((a,b)=>a.lane-b.lane||a.col-b.col).forEach(p=>{const x=drawXs[p.col],y=drawLanes[p.lane];rect(c,x-2,y-2,4,17,'#6da05b');dot(c,x-6,y+7,5,'#6caa67');dot(c,x+6,y+8,5,'#6caa67');if(p.type==='sun'){dot(c,x,y-8,13,'#e3bf5a');dot(c,x,y-8,6,'#725532')}else if(p.type==='wall'){rect(c,x-10,y-10,20,19,'#5a7145');rect(c,x-13,y-16,6,12,'#628650');rect(c,x+7,y-16,6,12,'#628650');rect(c,x-4,y-19,8,11,'#6f9458');rect(c,x-15,y-20,4,7,'#a5b887');rect(c,x+11,y-20,4,7,'#a5b887');rect(c,x-2,y-24,4,7,'#a5b887');rect(c,x-11,y+6,22,5,'#66523a');rect(c,x-4,y-7,3,3,'#273b2b');rect(c,x+4,y-7,3,3,'#273b2b')}else if(p.type==='moon'){dot(c,x,y-7,12,'#a980c8');rect(c,x-12,y-7,24,5,'#d0b2e3')}else{dot(c,x,y-8,11,'#9ddc69');rect(c,x+5,y-12,11,8,'#9ddc69');dot(c,x+3,y-13,2,'#25442d')}if(p.hitT>0){c.globalAlpha=.45;rect(c,x-10,y-18,20,23,'#f2d0b8');c.globalAlpha=1}if(p.hp<types[p.type].hp*.95){rect(c,x-12,y+23,24,2,'#271c19');rect(c,x-12,y+23,24*clamp(p.hp/types[p.type].hp,0,1),2,p.hp>types[p.type].hp*.4?'#92d88c':'#d95656')}});

  shots.forEach(s=>dot(c,screenX(s.x),drawLanes[s.lane],4,s.kind==='moon'?'#d4a7f3':'#d0f795'));zombies.forEach(z=>drawEnemy(c,{...z,x:screenX(z.x)},drawLanes[z.lane]));barrows.forEach(b=>{if(b.ready||b.active){rect(c,screenX(b.x)-8,drawLanes[b.lane]+19,16,8,b.active?'#ffdb76':'#9d8e66');dot(c,screenX(b.x),drawLanes[b.lane]+28,4,'#394139')}});

  const gx=screenX(gardener.x),gy=screenY(gardener.y);rect(c,gx-7,gy+15,6,5,'#35463b');rect(c,gx+2,gy+15,6,5,'#35463b');rect(c,gx-8,gy+4,16,13,'#4e7657');rect(c,gx-5,gy+5,10,8,'#76946b');rect(c,gx-3,gy+6,3,8,'#ad9470');dot(c,gx,gy,7,'#e8d5aa');rect(c,gx-10,gy-12,20,4,'#b69c66');rect(c,gx-7,gy-16,14,5,'#cbb179');rect(c,gx-3,gy-2,2,2,'#334937');rect(c,gx+3,gy-2,2,2,'#334937');if(carried)dot(c,gx+10,gy-5,7,'#a9d276');

  // The foreground cart and iron fence anchor the cemetery below the lanes.
  rect(c,0,486,W,104,'#1b3028');rect(c,0,489,W,4,'#465d4b');rect(c,0,575,W,5,'#5e654e');for(let x=8;x<320;x+=24){rect(c,x,496,3,49,'#314b39');rect(c,x-4,506,18,3,'#314b39');rect(c,x-4,533,18,3,'#314b39')}rect(c,0,547,320,4,'#344d3b');rect(c,37,550,104,5,'#75543b');rect(c,51,525,81,25,'#5c4430');for(let x=57;x<128;x+=17){rect(c,x,528,14,18,'#765438');rect(c,x+2,530,10,3,'#a47c51')}rect(c,45,553,4,23,'#74533a');rect(c,127,553,4,23,'#74533a');rect(c,28,556,28,4,'#b18b60');rect(c,31,552,3,11,'#b18b60');c.strokeStyle='#597a54';c.lineWidth=3;c.beginPath();c.arc(211,543,22,0,Math.PI*2);c.stroke();c.beginPath();c.arc(211,543,15,0,Math.PI*2);c.stroke();rect(c,209,525,3,36,'#597a54');rect(c,194,541,34,3,'#597a54');for(let x=158;x<260;x+=22){rect(c,x,500,2,14,'#54764d');rect(c,x-5,512,14,2,'#54764d')}rect(c,277,554,20,4,'#426a5c');rect(c,293,548,5,14,'#426a5c');
  rect(c,0,590,W,130,'#29261e');rect(c,0,590,W,8,'#8e7550');const cards=[['SUN',25],['PEA',50],['THORN',40],['MOON',70]];cards.forEach(([name,cost],i)=>{const x=10+i*76,cx=x+33;c.globalAlpha=sun>=cost?1:.42;rect(c,x,602,67,51,'#805e3b');rect(c,x+4,606,59,42,'#ecd9aa');rect(c,x+8,609,51,29,'#fff1cf');if(name==='SUN'){rect(c,cx-3,619,6,14,'#67945b');rect(c,cx-9,613,18,13,'#edc55b');rect(c,cx-4,616,8,7,'#806032');rect(c,cx-6,631,6,3,'#67945b')}else if(name==='PEA'){rect(c,cx-3,622,6,12,'#689b58');rect(c,cx-9,614,15,13,'#9bd96b');rect(c,cx+4,617,9,7,'#83c95f');rect(c,cx-1,616,2,2,'#304b31')}else if(name==='THORN'){rect(c,cx-10,620,20,12,'#6d8a58');for(let j=-1;j<=1;j++)rect(c,cx+j*7-2,615,4,7,'#b1c298');rect(c,cx-6,624,3,3,'#30452f')}else{rect(c,cx-3,623,6,10,'#d7c8ab');rect(c,cx-11,615,22,8,'#aa80c6');rect(c,cx-8,612,16,4,'#c4a1dc')}text(c,String(cost),x+7,644,'#3d3528',8);text(c,name,x+59,644,'#62543a',7,'right');c.globalAlpha=1});text(c,`SUN ${Math.floor(sun)}  ${autoMode?'SCORE '+score:'RUN '+manualScore}`,12,679,'#f3d679',12);if(moon.phase==='warn'){c.globalAlpha=.18+.08*Math.sin(showFrame*.22);rect(c,152,drawLanes[moon.lane]-34,168,68,'#d95656');c.globalAlpha=1}if(lastSave){c.globalAlpha=.16*clamp(lastSave.timer/(24/60),0,1);rect(c,0,drawLanes[lastSave.lane]-37,W,74,'#b8ed75');c.globalAlpha=1}const result=sessionResult||(ended?{notice,greenhouse,wavesHeld,transplants,manualScore}:null);if(result){const resultColor=result.greenhouse>0?'#f4c95d':'#d95656';c.globalAlpha=.88;rect(c,18,240,284,200,'#07150f');c.globalAlpha=1;c.strokeStyle=resultColor;c.lineWidth=2;c.strokeRect(19,241,282,198);text(c,result.notice,160,308,resultColor,22,'center');text(c,`${result.wavesHeld} WAVES HELD`,160,356,'#e5dfbf',14,'center');text(c,`${result.transplants} DEFENSES REPLANTED`,160,389,'#8fe06f',13,'center');if(sessionResult){text(c,`RUN ${result.manualScore}  BEST ${records.best?.()??result.manualScore}`,160,413,'#e5dfbf',9,'center');text(c,'ENTER TO PLAY AGAIN',160,429,'#d8e8c0',8,'center')}}text(c,ended?notice:`${autoMode?tactic:'MANUAL'} · BREACHES ${breaches}`,12,703,'#d8e8c0',10);

 },reset,isResult(){return !!sessionResult},isAttract(){const value=attract;attract=false;return value},snapshot(){return structuredClone({plants,zombies,shots,bed,sun,score,manualScore,wave,waveTime,plan,carried,greenhouse,barrows,breaches,wavesHeld,transplants,saves,lastSave,ended,notice,moon,gardener,persona,tactic,plannerCalls,nextPlanAt,skill,bedPositions:{x:xs,y:lanes}})}};

}

export function createSwarmKeeper(sound=()=>{},options={}){
 let reported=false;
 const roles=['builder','carrier','fighter','rescuer'],jobs=['bridge','carry','fight','rescue'],counts={bridge:4,carry:3,fight:5,rescue:2},needs={bridge:520,carry:460,fight:390,rescue:330},roleFor={bridge:'builder',carry:'carrier',fight:'fighter',rescue:'rescuer'},colors={builder:'#f2bd55',carrier:'#72c7ee',fighter:'#ff796b',rescuer:'#8ee6a8'},zones=['DEW MEADOW','EMBER CANYON','MOON MARSH','STAR GARDEN'];
 let leader,members,challenges,keys={},score,rescues,losses,phase,ending,notice,t,serial;
 function make(role){return{id:serial++,role,state:'follow',job:'follow',x:leader.x,y:leader.y+20,downTime:0,rescue:0}}
 function reset(){leader={x:160,y:0};serial=0;members=Array.from({length:12},(_,i)=>make(roles[i%4]));const offset=Math.floor(Math.random()*4);challenges=Array.from({length:20},(_,i)=>({index:i,kind:jobs[(i+offset)%4],at:270+i*220,progress:0,need:needs[jobs[(i+offset)%4]],active:false,done:false,accident:false,beat:0,soundClock:0,enemies:jobs[(i+offset)%4]==='fight'?3:0}));score=0;rescues=0;losses=0;phase='journey';ending=0;notice='KEEP THE SWARM TOGETHER';t=0}reset();
 function workerTarget(m){const i=members.filter(v=>v.state==='follow').indexOf(m);if(m.job==='downed')return{x:leader.x+38,y:540};if(m.job!=='follow')return{x:leader.x+(i%5-2)*15,y:470};return{x:leader.x+(i%6-2.5)*14,y:540+Math.floor(i/6)*14}}
 function workReady(m){const q=workerTarget(m);return Math.hypot(m.x-q.x,m.y-q.y)<16}
 function assign(c,auto){const down=members.filter(m=>m.state==='down').sort((a,b)=>a.downTime-b.downTime)[0],force=down&&(auto||keys.x||keys.z||keys.Shift);let pool=members.filter(m=>m.state==='follow');pool.forEach(m=>m.job='follow');if(force){pool.sort((a,b)=>(a.role==='rescuer'?0:1)-(b.role==='rescuer'?0:1)||a.id-b.id);const helpers=pool.splice(0,2);helpers.forEach(m=>m.job='downed');down.rescue+=helpers.reduce((n,m)=>n+(workReady(m)?(m.role==='rescuer'?1.32:.78):0),0)*dtRate;if(down.rescue>=120){down.state='follow';down.job='follow';down.downTime=0;down.rescue=0;rescues++;score+=28;sound('swarm-rescue');notice='FRIEND IS SAFE'}}if(c?.active&&!c.done){pool.sort((a,b)=>(a.role===roleFor[c.kind]?0:1)-(b.role===roleFor[c.kind]?0:1)||a.id-b.id);pool.slice(0,counts[c.kind]).forEach(m=>m.job=c.kind)}}
 let dtRate=0;
 function complete(c){c.done=true;c.active=false;c.progress=c.need;score+=35;if(c.kind==='bridge')sound('swarm-bridge');else if(c.kind==='carry')sound('swarm-carry');notice={bridge:'BRIDGE HOLDS',carry:'SUNSEED HOME',fight:'PATH IS SAFE',rescue:'NO ONE LEFT BEHIND'}[c.kind];let added=c.kind==='carry'?1:c.kind==='rescue'?2:0;while(added--&&members.filter(m=>m.state!=='lost').length<28){members.push(make(c.kind==='carry'?'carrier':roles[(serial+c.index)%4]));sound('pickup')}if((c.index+1)%4===0){score+=80;if(members.filter(m=>m.state!=='lost').length<28){members.push(make('rescuer'));sound('pickup')}}if(challenges.every(c=>c.done)){phase='ending';ending=5;notice='STAR GARDEN REACHED';score+=300;if(!reported&&options.finish){reported=true;options.finish({score,result:'Star Garden reached'})}sound('swarm-arrival')}}
 function update(dt,auto){if(phase==='ending'){if(auto&&(ending-=dt)<=0)reset();return}t+=dt;dtRate=dt*60;const c=challenges.find(c=>!c.done);if(c&&!c.active&&leader.y>=c.at-58){c.active=true;sound('swarm-activate');notice={bridge:'BUILD THE CROSSING',carry:'CARRY THE SUNSEED',fight:'DRIVE BACK THE BEETLES',rescue:'BRING THEM HOME'}[c.kind]}const advance=auto||keys.ArrowUp||keys.w||(!keys.ArrowDown&&!keys.s&&!c?.active);if(advance&&(!c?.active||leader.y<c.at-31))leader.y+=55*dt;const dx=auto?Math.sin(leader.y/160)*.4:(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);leader.x=clamp(leader.x+dx*90*dt,25,295);assign(c,auto);
 for(const m of members)if(m.state==='down'){m.downTime-=dt;if(m.downTime<=0){m.state='lost';m.job='lost';losses++;sound('swarm-lost');notice='A FRIEND WAS LOST'}}
 if(c?.active&&!c.done){const workers=members.filter(m=>m.state==='follow'&&m.job===c.kind),force=workers.reduce((n,m)=>n+(workReady(m)?(m.role===roleFor[c.kind]?1.32:.78):0),0),rate=c.kind==='fight'?.72:c.kind==='carry'?.9:1;c.progress=Math.min(c.need,c.progress+force*rate*dtRate);c.soundClock=Math.max(0,c.soundClock-dt);if(force>0&&c.kind==='fight'&&c.soundClock<=0){sound('swarm-fight');c.soundClock=9/60}while(c.beat<4&&c.progress>=c.need*(c.beat+1)/4){c.beat++;if(c.kind!=='fight')sound('swarm-work')}if(c.kind==='fight')c.enemies=Math.max(0,3-Math.floor(c.progress/c.need*3));if(!c.accident&&c.kind!=='rescue'&&c.progress>=c.need*.46){c.accident=true;const victim=workers[(c.index+workers.length)%Math.max(1,workers.length)];if(victim){victim.state='down';victim.job='down';victim.downTime=c.index%6===4?.9:8.5;victim.rescue=0;sound('swarm-down');notice='FRIEND DOWN — X RESCUE'}}if(c.progress>=c.need)complete(c)}
 members.filter(m=>m.state==='follow').forEach(m=>{const target=workerTarget(m);m.x+=(target.x-m.x)*Math.min(1,dt*3);m.y+=(target.y-m.y)*Math.min(1,dt*3)});
 }
 return{input(k,d){keys[k]=d},update,reset,snapshot(){return structuredClone({leader,members,challenges,score,rescues,losses,phase,notice})},draw(c){const zone=Math.min(3,Math.floor(leader.y/1120)),grounds=['#77945b','#986e4f','#567e78','#887ba0'];rect(c,0,0,W,H,'#233d37');rect(c,36,0,248,H,grounds[zone]);for(let i=0;i<14;i++){let y=(i*65+leader.y)%800-40;rect(c,44,y,232,3,'#9cb977');dot(c,24,y+25,8,'#456b4b');dot(c,296,y+4,10,'#496d4f')}const next=challenges.find(c=>!c.done);if(next){const y=520-(next.at-leader.y);if(y>-40&&y<700){if(next.kind==='bridge'){rect(c,36,y-18,248,36,'#578d9b');rect(c,105,y-15,110*next.progress/next.need,30,'#c6a673')}else if(next.kind==='carry')rect(c,145,y-12,30,24,'#d5bb7d');else if(next.kind==='fight')for(let i=0;i<next.enemies;i++)dot(c,125+i*35,y,12,'#74534a');else{dot(c,135,y,7,'#b7edc0');dot(c,185,y,7,'#b7edc0')}text(c,next.kind.toUpperCase(),160,y-27,'#f7e9ba',10,'center')}}members.filter(m=>m.state!=='lost').forEach(m=>{const x=m.state==='down'?leader.x+38:m.x,y=m.state==='down'?540:m.y;dot(c,x,y,7,m.state==='down'?'#a86b70':colors[m.role]);if(m.state==='down')text(c,'!',x,y-10,'#ffb3a0',10,'center')});dot(c,leader.x,520,11,'#f5edb4');rect(c,leader.x-6,506,12,5,'#eb7b69');text(c,'SWARM KEEPER',16,35,'#f9e6ad',19);text(c,`CREW ${members.filter(m=>m.state!=='lost').length} DOWN ${members.filter(m=>m.state==='down').length}  ${zones[zone]}`,16,63,'#e9f0bf',10);text(c,`${notice}`,16,675,'#eff2bf',10);text(c,`ROADS ${challenges.filter(c=>c.done).length}/20  SAVED ${rescues}  LOST ${losses}`,16,700,'#eff2bf',10)},};
}
function swarm(sound,options){return createSwarmKeeper(sound,options)}
const factories={'grave-garden':garden,'swarm-keeper':swarm};

export function createFeatureGame8(canvas,id,options={}){const ctx=canvas.getContext('2d');if(!ctx||!factories[id])throw new Error(`Unknown game: ${id}`);const audio=createGameAudio(!!options.audioEnabled&&!options.paused);const bestKey=`miniarcade:best:${id}`;let best=null;function readBest(){try{const v=window.localStorage?.getItem(bestKey);return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null}catch{return null}}best=readBest();const records={best:()=>best,finish(value){const stored=readBest();if(stored!==null&&(best===null||stored>best))best=stored;if(best===null||value>best){best=value;try{window.localStorage?.setItem(bestKey,String(value))}catch{}}}};let game,interactive=!!options.interactive,paused=!!options.paused,disposed=false,frame,last=0,gardenRemainder=0;const held=new Set();let context=options.context??(interactive?'manual-player':'gallery-preview'),pendingAI=false,pendingRestart=false;const reports=createRunReporter({gameId:id,ruleVersion:1,actor:interactive?'human':'ai',context,onResult:options.onResult,onError:options.onError});reports.setPaused(paused);function fresh(nextInteractive=interactive,nextContext=context){if(disposed)return;reports.abandon();if(game){release();game.destroy?.()}interactive=nextInteractive;context=nextContext;last=0;canvas.tabIndex=interactive?0:-1;pendingAI=false;pendingRestart=false;const bound=reports.beginRun({actor:interactive?'human':'ai',context});const finish=value=>{if(!interactive)pendingAI=id==='grave-garden'?7:id==='frog-convoy'?6:id==='cosmic-haul'?3:id==='swarm-keeper'?5:0.000001;bound(value)};game=id==='grave-garden'?garden(audio?.emit,records,true,{finish}):factories[id](audio?.emit,{finish})}fresh();canvas.tabIndex=interactive?0:-1;canvas.setAttribute('aria-label',`${featureGames8.find(g=>g.id===id).name} game`);function resize(){const b=canvas.getBoundingClientRect(),r=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(b.width*r));canvas.height=Math.max(1,Math.round(b.height*r))}const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(canvas);resize();function release(){gardenRemainder=0;for(const k of held)game.input(k,false);held.clear()}function key(e,d){if(!interactive||paused||disposed)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','x','j','k','z','Shift'].includes(k)||(id==='grave-garden'&&k==='Enter')){e.preventDefault();if(d&&k==='Enter'&&game.isResult?.()){reports.abandon();pendingRestart=true;return}if(d){held.add(k);if(options.audioEnabled&&audio)unlockSound()}else held.delete(k);game.input(k,d)}}const kd=e=>key(e,true),ku=e=>key(e,false);canvas.addEventListener('keydown',kd);canvas.addEventListener('keyup',ku);canvas.addEventListener('blur',release);function tick(t){if(disposed||paused)return;if(!interactive&&last&&t-last<32){frame=requestAnimationFrame(tick);return}const dt=last?Math.min((t-last)/1000,.05):0;last=t;if(pendingRestart)fresh();if(pendingAI&&(pendingAI-=dt)<=0)fresh();const activeGame=game,wasResult=!!game.isResult?.();reports.advance(dt);if(pendingAI){}else if(id==='grave-garden'){gardenRemainder+=dt;while(gardenRemainder+1e-9>=1/60){game.update(1/60,!interactive);if(disposed||paused||game!==activeGame)break;gardenRemainder-=1/60}}else game.update(dt,!interactive);if(disposed||paused)return;if(game!==activeGame){frame=requestAnimationFrame(tick);return;}if(interactive&&game.isAttract?.()){fresh(false,options.context==='embed'?'embed':'watch-player');const attractGame=game,attractFrame=frame;options.onAttract?.();if(disposed||paused)return;if(frame!==attractFrame)return;if(game!==attractGame){frame=requestAnimationFrame(tick);return}}else if(interactive&&wasResult&&!game.isResult?.()){fresh();}ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#10151c';ctx.fillRect(0,0,canvas.width,canvas.height);const scale=Math.min(canvas.width/W,canvas.height/H);ctx.setTransform(scale,0,0,scale,(canvas.width-W*scale)/2,(canvas.height-H*scale)/2);game.draw(ctx);frame=requestAnimationFrame(tick)}if(!paused)frame=requestAnimationFrame(tick);return {getSessionState(){return interactive&&game.isResult?.()?'result':'playing'},beginRun({interactive:v,context:c}){fresh(!!v,c)},restart(){fresh()},setInteractive(v){if(!!v!==interactive)fresh(!!v,options.context==='embed'?'embed':v?'manual-player':'watch-player')},pause(){if(!paused){reports.setPaused(true);release();audio?.setActive(false);paused=true;cancelAnimationFrame(frame);last=0}},resume(){if(paused&&!disposed){audio?.setActive(!!options.audioEnabled);paused=false;reports.setPaused(false);last=0;frame=requestAnimationFrame(tick)}},resize,destroy(){if(disposed)return;reports.destroy();release();audio?.destroy();disposed=true;cancelAnimationFrame(frame);observer?.disconnect();canvas.removeEventListener('keydown',kd);canvas.removeEventListener('keyup',ku);canvas.removeEventListener('blur',release)}}}
