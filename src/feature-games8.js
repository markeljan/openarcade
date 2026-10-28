export const featureGames8 = [

 {id:'grave-garden',name:'Grave Garden',category:'STRATEGY',description:'Plant defenses against the undead.',controls:'Arrows choose bed; Space pea ward; X / J / K thorn wall; Z / Shift sunbloom',accent:'#abd878',icon:'✿'},

 {id:'swarm-keeper',name:'Swarm Keeper',category:'ADVENTURE',description:'Lead your crew to the Star Garden.',controls:'Left / right lead · Up advance · Down pause · X / Z rescue',accent:'#f0d478',icon:'✦'},

];

const W=320,H=720,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}

function text(c,s,x,y,color='#fff',size=14,align='left'){c.fillStyle=color;c.font=`bold ${size}px monospace`;c.textAlign=align;c.fillText(s,x,y)}

function dot(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}

const gardenBiteRates={shambler:1.02,hound:1.26,bucket:1.44,brute:2.415};
export function gardenApplyBite(plant,zombie,dt){plant.hp-=gardenBiteRates[zombie.kind]*dt;if(plant.type==='wall')zombie.hp-=1.92*dt}
// Projectiles meet the nearest living enemy in their lane before it acts.
// Sweep the traveled segment so a long frame cannot skip a collision.
export function gardenAdvanceShots(shots,zombies,dt){for(const shot of shots){const old=shot.x,next=old+(shot.kind==='moon'?138:186)*dt;const hits=zombies.filter(z=>z.hp>0&&z.lane===shot.lane&&z.x>=old-6&&z.x<=next+10).sort((a,b)=>a.x-b.x);const hit=hits[0];if(hit){shot.x=500;hit.hp-=shot.damage;if(shot.kind==='moon')for(const other of zombies)if(other!==hit&&other.hp>0&&other.lane===hit.lane&&Math.abs(other.x-hit.x)<30)other.hp-=.55}else shot.x=next}return shots.filter(s=>s.x<340)}
export function garden(){

 const lanes=[200,310,420,530],xs=[70,120,170],types={pea:{cost:50,hp:9},wall:{cost:40,hp:20},sun:{cost:25,hp:8},moon:{cost:70,hp:8}},roster={shambler:{hp:5,speed:14},hound:{hp:4,speed:22},bucket:{hp:11,speed:10},brute:{hp:22,speed:7}};

 let plants,zombies,shots,bed,sun,score,manualScore,autoMode=true,wave,t,waveTime,sunClock,plan,carried,keys={},greenhouse,barrows,breaches,wavesHeld,waveBreachStart,ended,delay,notice,moon,gardener;

 function create(type,lane,col){return {lane,col,type,hp:types[type].hp,cool:type==='sun'?(180+(lane*37+col*29)%160)/60:(18+(lane*13+col*17)%50)/60}}

 function buildWave(){const count=4+Math.min(10,Math.floor((wave-1)/3)),focus=Math.floor(Math.random()*4);return Array.from({length:count},(_,i)=>{let lane=i<Math.ceil(count*.45)?focus:Math.floor(Math.random()*4);if(wave%7===0&&i<3)lane=(focus+1)%4;const tier=Math.floor((wave-1)/10),q=Math.random(),kind=wave%10===0&&i===0?'brute':tier>=2&&q<.17?'brute':tier>=1&&q<.4?'bucket':q<.63?'hound':'shambler';return {at:5+i*(8/Math.max(1,count-1)),lane,kind,spawned:false}})}

 function award(points){score+=points;if(!autoMode)manualScore+=points}
 function reset(){plants=[create('sun',0,0),create('pea',0,1),create('pea',1,0),create('wall',1,2),create('sun',2,0),create('pea',2,1),create('pea',3,0),create('wall',3,2)];zombies=[];shots=[];bed={lane:0,col:0};sun=130;score=0;manualScore=0;wave=1;t=0;waveTime=0;sunClock=0;carried=null;greenhouse=200;breaches=0;wavesHeld=0;waveBreachStart=0;barrows=lanes.map((_,lane)=>({lane,ready:true,active:false,x:30}));ended=false;delay=7;notice='WAVE INCOMING';gardener={x:48,y:lanes[1]+16,task:null,pose:'stand'};moon={phase:'calm',next:70,timer:0,lane:0,count:0};plan=buildWave()}reset();

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

   const speed=carried?82:98,step=speed*dt;

   if(d>step){gardener.x+=dx/d*step;gardener.y+=dy/d*step;gardener.pose=carried?'carry':'walk';return}

   gardener.x=x;gardener.y=y;task.phase='work';task.remaining=task.action==='lift'?26/60:34/60;

  }

  gardener.pose=task.action==='lift'?'uproot':'plant';task.remaining-=dt;if(task.remaining>0)return;

  const existing=plants.find(p=>p.lane===task.lane&&p.col===task.col);

  if(task.action==='lift'&&existing&&!carried){carried=existing;plants=plants.filter(p=>p!==existing);if(task.destination){gardener.task={action:'place',...task.destination,phase:'travel'};return}}

  else if(task.action==='place'&&carried&&!existing){plants.push({...carried,lane:task.lane,col:task.col});carried=null;award(15)}

  else if(task.action==='build'&&!existing&&!carried&&sun>=types[task.type].cost){sun-=types[task.type].cost;plants.push(create(task.type,task.lane,task.col));award(11)}

  gardener.task=null;gardener.pose='stand';

 }

 function project(extra){

  const power={sun:.35,pea:3.5,wall:4.7,moon:5.4},threat={shambler:5,hound:6,bucket:12,brute:25};

  const incoming=lanes.map(()=>0),live=lanes.map(()=>0),def=lanes.map(()=>0);

  for(const q of plan)incoming[q.lane]+=threat[q.kind];

  for(const z of zombies)live[z.lane]+=Math.max(0,z.hp)*(1+roster[z.kind].speed/60);

  for(const p of plants){if(extra?.action==='move'&&p.lane===extra.fromLane&&p.col===extra.fromCol)continue;def[p.lane]+=power[p.type]*(.45+.55*clamp(p.hp/types[p.type].hp,0,1))}

  if(extra)def[extra.lane]+=power[extra.type];

  let breaches=0,margin=0;const projected=lanes.map((_,lane)=>{const load=live[lane]+incoming[lane]*.72+(moon.phase!=='calm'&&moon.lane===lane?7:0),hold=def[lane]*6.4,risk=Math.max(0,(load-hold)/9);breaches+=risk;margin+=hold-load;return {load,hold,risk}});

  return {breaches,margin,lanes:projected};

 }

 function choosePlan(){

  const base=project(),candidates=[],bloomCount=plants.filter(p=>p.type==='sun').length;

  for(let lane=0;lane<4;lane++)for(let col=0;col<3;col++)if(!plants.some(p=>p.lane===lane&&p.col===col)){

   for(const type of ['pea','wall','moon','sun'])if(sun>=types[type].cost){

    const task={action:'build',lane,col,type},after=project(task);

    let value=(base.breaches-after.breaches)*155+(after.margin-base.margin)*.15-types[type].cost*.035;

    if(col===2)value+=type==='wall'?34:-18;

    if(col===1)value+=(type==='pea'||type==='moon')?25:-12;

    if(col===0)value+=type==='sun'?24*.4:type==='pea'?10:-8;

    value+=base.lanes[lane].load*.7-base.lanes[lane].hold*.08;

    if(type==='sun'&&bloomCount<3)value+=12*.4;

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

  candidates.sort((a,b)=>b.value-a.value||a.lane-b.lane||a.col-b.col||a.type.localeCompare(b.type));

  return candidates[0]?.value>1?candidates[0]:null;

 }

 function endWave(){if(breaches===waveBreachStart){wavesHeld++;award(2)}if(wave%6===0)award(4);waveBreachStart=breaches;wave++;waveTime=0;plan=buildWave();notice='WAVE INCOMING';if(wave%6===1){barrows.forEach(b=>{if(!b.active)b.ready=true});if(greenhouse>0)greenhouse=Math.min(200,greenhouse+2)}}

 return {input(k,d){keys[k]=d;if(!d||ended)return;if(k==='ArrowUp'||k==='w')bed.lane=clamp(bed.lane-1,0,3);if(k==='ArrowDown'||k==='s')bed.lane=clamp(bed.lane+1,0,3);if(k==='ArrowLeft'||k==='a')bed.col=clamp(bed.col-1,0,2);if(k==='ArrowRight'||k==='d')bed.col=clamp(bed.col+1,0,2);if(k===' ')plant('pea');if(k==='x'||k==='j'||k==='k')plant('wall');if(k==='z'||k==='Shift')plant('sun');},update(dt,auto){
  autoMode=auto;
  if(ended){if(auto&&(delay-=dt)<=0)reset();return}t+=dt;if(t>=900-1e-9){ended=true;award(510);notice=greenhouse>0?'DAWN SAVED':'GARDEN LOST';return}waveTime+=dt;sunClock+=dt;

  if(moon.phase==='calm'&&t>=moon.next){moon.phase='warn';moon.timer=4;moon.lane=(wave+breaches+moon.count)%4;notice='BLOOD MOON WARNING'}else if(moon.phase!=='calm'&&(moon.timer-=dt)<=0){if(moon.phase==='warn'){moon.phase='live';moon.timer=15;notice='THE DEAD QUICKEN'}else{moon.phase='calm';moon.count++;moon.next+=120;notice='MOON PASSES'}}

  for(const entry of plan)if(!entry.spawned&&waveTime>=entry.at){entry.spawned=true;const empowered=moon.phase==='live'&&entry.lane===moon.lane;zombies.push({lane:entry.lane,x:318,hp:roster[entry.kind].hp*(empowered?1.22:1),kind:entry.kind,moon:empowered})}

  if(auto&&!gardener.task&&carried){const col=[0,1,2].find(n=>!plants.some(p=>p.lane===bed.lane&&p.col===n));if(col!==undefined){bed.col=col;gardener.task={action:'place',lane:bed.lane,col,phase:'travel'}}}

  if(auto&&!gardener.task&&!carried){const choice=choosePlan();if(choice){bed={lane:choice.lane,col:choice.col};if(choice.action==='move')gardener.task={action:'lift',lane:choice.fromLane,col:choice.fromCol,phase:'travel',destination:{lane:choice.lane,col:choice.col}};else plant(choice.type)}}

  stepGardener(dt);

  plants.forEach(p=>{p.cool-=dt;if(p.cool>1e-9)return;if(p.type==='sun'){p.cool+=5.5;sun=clamp(sun+18,0,300);award(2);return}const target=zombies.some(z=>z.hp>0&&z.lane===p.lane&&z.x>xs[p.col]-6);if(!target){p.cool+=12/60;return}p.cool+=p.type==='moon'?88/60:p.type==='pea'?62/60:25/60;if(p.type==='pea'||p.type==='moon')shots.push({lane:p.lane,x:xs[p.col]+(p.type==='moon'?12:16),kind:p.type,damage:p.type==='moon'?1.65:1})});

  shots=gardenAdvanceShots(shots,zombies,dt);
  for(const z of zombies){if(z.hp<=0)continue;const hit=plants.filter(p=>p.hp>0&&p.lane===z.lane&&xs[p.col]<=z.x+3&&Math.abs(xs[p.col]-z.x)<16).sort((a,b)=>b.col-a.col)[0];if(hit){gardenApplyBite(hit,z,dt)}else z.x-=roster[z.kind].speed*(z.moon&&moon.phase==='live'?1.28:1)*dt}

  for(const barrow of barrows){if(!barrow.active&&barrow.ready&&zombies.some(z=>z.hp>0&&z.lane===barrow.lane&&z.x<40)){barrow.active=true;barrow.x=25;award(20);notice='BARROW SAVE'}if(barrow.active){barrow.x+=210*dt;for(const z of zombies)if(z.lane===barrow.lane&&Math.abs(z.x-barrow.x)<14)z.hp=0;if(barrow.x>330){barrow.active=false;barrow.ready=false}}}

  for(const z of zombies)if(z.hp>0&&z.x<25){z.hp=0;z.breached=true;greenhouse=Math.max(0,greenhouse-1);breaches++;notice='GREENHOUSE BREACH'}

  plants=plants.filter(p=>p.hp>0);shots=shots.filter(s=>s.x<340);zombies=zombies.filter(z=>{if(z.hp<=0){if(!z.breached)award(9);return false}return true});

  const sunTicks=Math.floor(sunClock+1e-9);if(sunTicks>0){sunClock=Math.max(0,sunClock-sunTicks);sun=Math.min(300,sun+2*sunTicks)}
  if(waveTime>=15-1e-9)endWave();

 },draw(c){

  rect(c,0,0,W,H,'#101b17');rect(c,0,0,W,112,'#1a1914');text(c,'GRAVE GARDEN',14,27,'#c5ef84',18);text(c,`WAVE ${String(wave).padStart(2,'0')}/60`,304,26,'#f2cf6f',12,'right');text(c,'KEEP THE GREENHOUSE ALIVE',14,48,'#e5dfbf',10);

  rect(c,14,58,190,5,'#394940');rect(c,14,58,190*greenhouse/200,5,'#92d88c');text(c,`GLASS ${Math.round(greenhouse/2)}%`,304,65,'#a7e5c5',10,'right');

  const forecast=project().lanes.slice().sort((a,b)=>b.risk-a.risk)[0];text(c,forecast.risk<.35?'FORMATION HOLDS':forecast.risk<1.35?'FORMATION STRAINS':'BREACH LIKELY',14,87,forecast.risk<.35?'#99d87f':'#e4b36d',11);if(moon.phase!=='calm')text(c,`MOON ${moon.phase.toUpperCase()} L${moon.lane+1}`,304,100,'#f28d8d',9,'right');

  rect(c,0,112,W,476,'#293c34');rect(c,0,112,W,29,'#3d5144');dot(c,275,124,8,moon.phase==='live'?'#c86160':'#d9ddae');rect(c,0,141,24,447,'#233e36');rect(c,3,145,19,435,'#91b9ad');for(let y=150;y<580;y+=35){rect(c,4,y,18,3,'#365c53');rect(c,11,y,3,31,'#365c53')}rect(c,0,139,26,6,'#91a68f');

  for(let x=220;x<320;x+=18){rect(c,x,139,3,18,'#6e796a');rect(c,x,145,18,3,'#6e796a')}

  lanes.forEach((y,l)=>{rect(c,24,y-37,296,74,'#222c27');rect(c,24,y+32,296,5,'#5a6757');rect(c,27,y-28,151,55,'#674d32');xs.forEach((x,col)=>{rect(c,x-20,y-25,39,50,'#79593a');rect(c,x-16,y-21,31,42,'#4a3c2c');rect(c,x-16,y+10,31,3,'#a47c50');if(bed.lane===l&&bed.col===col){c.strokeStyle='#f0d07c';c.strokeRect(x-17,y-22,33,44)}});for(let x=197;x<315;x+=31){rect(c,x,y+11,9,15,'#778078');rect(c,x+2,y+7,5,4,'#8c9589')}for(const q of plan.filter(q=>q.lane===l&&!q.spawned)){const x=310-Math.max(0,q.at-waveTime)*8;rect(c,clamp(x,184,312),y-29,4,8,'#edcc79')}});

  plants.forEach(p=>{const x=xs[p.col],y=lanes[p.lane];rect(c,x-2,y-2,4,17,'#6da05b');dot(c,x-6,y+7,5,'#6caa67');dot(c,x+6,y+8,5,'#6caa67');if(p.type==='sun'){dot(c,x,y-8,13,'#e3bf5a');dot(c,x,y-8,6,'#725532')}else if(p.type==='wall'){rect(c,x-12,y-14,24,25,'#a58053');for(let k=-1;k<=1;k++)rect(c,x+k*8-3,y-20,6,7,'#c19a68')}else if(p.type==='moon'){dot(c,x,y-7,12,'#a980c8');rect(c,x-12,y-7,24,5,'#d0b2e3')}else{dot(c,x,y-8,11,'#9ddc69');rect(c,x+5,y-12,11,8,'#9ddc69');dot(c,x+3,y-13,2,'#25442d')}});

  shots.forEach(s=>dot(c,s.x,lanes[s.lane],4,s.kind==='moon'?'#d4a7f3':'#d0f795'));zombies.forEach(z=>{rect(c,z.x-10,lanes[z.lane]-19,20,35,z.kind==='brute'?'#835d61':z.kind==='bucket'?'#7c8188':'#737b79');dot(c,z.x,lanes[z.lane]-22,10,'#a3b4a3');dot(c,z.x-3,lanes[z.lane]-23,2,'#e87169')});barrows.forEach(b=>{if(b.ready||b.active){rect(c,b.x-8,lanes[b.lane]+19,16,8,b.active?'#ffdb76':'#9d8e66');dot(c,b.x,lanes[b.lane]+28,4,'#394139')}});

  dot(c,gardener.x,gardener.y,8,'#e8d5aa');rect(c,gardener.x-9,gardener.y-13,18,5,'#8b7656');rect(c,gardener.x-7,gardener.y+4,14,14,'#638e68');if(carried)dot(c,gardener.x+10,gardener.y-5,7,'#a9d276');

  rect(c,0,590,W,130,'#29261e');rect(c,0,590,W,8,'#8e7550');const cards=[['SUN',25,'#e3bf5a'],['PEA',50,'#9ddc69'],['THORN',40,'#a58053'],['MOON',70,'#a980c8']];cards.forEach(([name,cost,color],i)=>{const x=10+i*76;rect(c,x,605,67,48,'#d6c398');dot(c,x+33,622,8,color);text(c,name,x+33,644,'#3d3528',9,'center');text(c,String(cost),x+4,618,'#3d3528',8)});text(c,`SUN ${Math.floor(sun)}  ${autoMode?'SCORE '+score:'RUN '+manualScore}`,12,679,'#f3d679',12);text(c,ended?notice:`${notice} · BREACHES ${breaches}`,12,703,'#d8e8c0',10);

 },reset,snapshot(){return structuredClone({plants,zombies,shots,bed,sun,score,manualScore,wave,waveTime,plan,carried,greenhouse,barrows,breaches,wavesHeld,ended,notice,moon,gardener})}};

}

export function createSwarmKeeper(){
 const roles=['builder','carrier','fighter','rescuer'],jobs=['bridge','carry','fight','rescue'],counts={bridge:4,carry:3,fight:5,rescue:2},needs={bridge:520,carry:460,fight:390,rescue:330},roleFor={bridge:'builder',carry:'carrier',fight:'fighter',rescue:'rescuer'},colors={builder:'#f2bd55',carrier:'#72c7ee',fighter:'#ff796b',rescuer:'#8ee6a8'},zones=['DEW MEADOW','EMBER CANYON','MOON MARSH','STAR GARDEN'];
 let leader,members,challenges,keys={},score,rescues,losses,phase,ending,notice,t,serial;
 function make(role){return{id:serial++,role,state:'follow',job:'follow',x:leader.x,y:leader.y+20,downTime:0,rescue:0}}
 function reset(){leader={x:160,y:0};serial=0;members=Array.from({length:12},(_,i)=>make(roles[i%4]));const offset=Math.floor(Math.random()*4);challenges=Array.from({length:20},(_,i)=>({index:i,kind:jobs[(i+offset)%4],at:270+i*220,progress:0,need:needs[jobs[(i+offset)%4]],active:false,done:false,accident:false,enemies:jobs[(i+offset)%4]==='fight'?3:0}));score=0;rescues=0;losses=0;phase='journey';ending=0;notice='KEEP THE SWARM TOGETHER';t=0}reset();
 function assign(c,auto){const down=members.filter(m=>m.state==='down').sort((a,b)=>a.downTime-b.downTime)[0],force=down&&(auto||keys.x||keys.z||keys.Shift);let pool=members.filter(m=>m.state==='follow');pool.forEach(m=>m.job='follow');if(force){pool.sort((a,b)=>(a.role==='rescuer'?0:1)-(b.role==='rescuer'?0:1)||a.id-b.id);const helpers=pool.splice(0,2);helpers.forEach(m=>m.job='downed');down.rescue+=helpers.length*dtRate;if(down.rescue>=75){down.state='follow';down.job='follow';down.downTime=0;down.rescue=0;rescues++;score+=28;notice='FRIEND IS SAFE'}}if(c?.active&&!c.done){pool.sort((a,b)=>(a.role===roleFor[c.kind]?0:1)-(b.role===roleFor[c.kind]?0:1)||a.id-b.id);pool.slice(0,counts[c.kind]).forEach(m=>m.job=c.kind)}}
 let dtRate=0;
 function complete(c){c.done=true;c.active=false;c.progress=c.need;score+=35;notice={bridge:'BRIDGE HOLDS',carry:'SUNSEED HOME',fight:'PATH IS SAFE',rescue:'NO ONE LEFT BEHIND'}[c.kind];let added=c.kind==='carry'?1:c.kind==='rescue'?2:0;while(added--&&members.filter(m=>m.state!=='lost').length<28)members.push(make(roles[serial%4]));if(challenges.every(c=>c.done)){phase='ending';ending=5;notice='STAR GARDEN REACHED';score+=300}}
 function update(dt,auto){if(phase==='ending'){if(auto&&(ending-=dt)<=0)reset();return}t+=dt;dtRate=dt*60;const c=challenges.find(c=>!c.done);if(c&&!c.active&&leader.y>=c.at-58){c.active=true;notice={bridge:'BUILD THE CROSSING',carry:'CARRY THE SUNSEED',fight:'DRIVE BACK THE BEETLES',rescue:'BRING THEM HOME'}[c.kind]}const advance=auto||keys.ArrowUp||keys.w||(!keys.ArrowDown&&!keys.s&&!c?.active);if(advance&&(!c?.active||leader.y<c.at-31))leader.y+=55*dt;const dx=auto?Math.sin(leader.y/160)*.4:(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);leader.x=clamp(leader.x+dx*90*dt,25,295);assign(c,auto);
 for(const m of members)if(m.state==='down'){m.downTime-=dt;if(m.downTime<=0){m.state='lost';m.job='lost';losses++;notice='A FRIEND WAS LOST'}}
 if(c?.active&&!c.done){const workers=members.filter(m=>m.state==='follow'&&m.job===c.kind),force=workers.reduce((n,m)=>n+(m.role===roleFor[c.kind]?1.3:1),0),rate=c.kind==='fight'?.72:c.kind==='carry'?.9:1;c.progress=Math.min(c.need,c.progress+force*rate*dtRate);if(c.kind==='fight')c.enemies=Math.max(0,3-Math.floor(c.progress/c.need*3));if(!c.accident&&c.kind!=='rescue'&&c.progress>=c.need*.46){c.accident=true;const victim=workers[(c.index+workers.length)%Math.max(1,workers.length)];if(victim){victim.state='down';victim.job='down';victim.downTime=c.index%6===4?.9:8.5;victim.rescue=0;notice='FRIEND DOWN — X RESCUE'}}if(c.progress>=c.need)complete(c)}
 members.filter(m=>m.state==='follow').forEach((m,i)=>{let tx=leader.x+(i%6-2.5)*14,ty=520+20+Math.floor(i/6)*14;if(m.job!=='follow'){tx=leader.x+(i%5-2)*15;ty=470}m.x+=(tx-m.x)*Math.min(1,dt*3);m.y+=(ty-m.y)*Math.min(1,dt*3)});
 }
 return{input(k,d){keys[k]=d},update,reset,snapshot(){return structuredClone({leader,members,challenges,score,rescues,losses,phase,notice})},draw(c){const zone=Math.min(3,Math.floor(leader.y/1120)),grounds=['#77945b','#986e4f','#567e78','#887ba0'];rect(c,0,0,W,H,'#233d37');rect(c,36,0,248,H,grounds[zone]);for(let i=0;i<14;i++){let y=(i*65+leader.y)%800-40;rect(c,44,y,232,3,'#9cb977');dot(c,24,y+25,8,'#456b4b');dot(c,296,y+4,10,'#496d4f')}const next=challenges.find(c=>!c.done);if(next){const y=520-(next.at-leader.y);if(y>-40&&y<700){if(next.kind==='bridge'){rect(c,36,y-18,248,36,'#578d9b');rect(c,105,y-15,110*next.progress/next.need,30,'#c6a673')}else if(next.kind==='carry')rect(c,145,y-12,30,24,'#d5bb7d');else if(next.kind==='fight')for(let i=0;i<next.enemies;i++)dot(c,125+i*35,y,12,'#74534a');else{dot(c,135,y,7,'#b7edc0');dot(c,185,y,7,'#b7edc0')}text(c,next.kind.toUpperCase(),160,y-27,'#f7e9ba',10,'center')}}members.filter(m=>m.state!=='lost').forEach(m=>{const x=m.state==='down'?leader.x+38:m.x,y=m.state==='down'?540:m.y;dot(c,x,y,7,m.state==='down'?'#a86b70':colors[m.role]);if(m.state==='down')text(c,'!',x,y-10,'#ffb3a0',10,'center')});dot(c,leader.x,520,11,'#f5edb4');rect(c,leader.x-6,506,12,5,'#eb7b69');text(c,'SWARM KEEPER',16,35,'#f9e6ad',19);text(c,`CREW ${members.filter(m=>m.state!=='lost').length} DOWN ${members.filter(m=>m.state==='down').length}  ${zones[zone]}`,16,63,'#e9f0bf',10);text(c,`${notice}`,16,675,'#eff2bf',10);text(c,`ROADS ${challenges.filter(c=>c.done).length}/20  SAVED ${rescues}  LOST ${losses}`,16,700,'#eff2bf',10)},};
}
function swarm(){return createSwarmKeeper()}
const factories={'grave-garden':garden,'swarm-keeper':swarm};

export function createFeatureGame8(canvas,id,options={}){const ctx=canvas.getContext('2d');if(!ctx||!factories[id])throw new Error(`Unknown game: ${id}`);let game=factories[id](),interactive=!!options.interactive,paused=!!options.paused,disposed=false,frame,last=0;const held=new Set();canvas.tabIndex=interactive?0:-1;canvas.setAttribute('aria-label',`${featureGames8.find(g=>g.id===id).name} game`);function resize(){const b=canvas.getBoundingClientRect(),r=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(b.width*r));canvas.height=Math.max(1,Math.round(b.height*r))}const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(canvas);resize();function release(){for(const k of held)game.input(k,false);held.clear()}function key(e,d){if(!interactive)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','x','j','k','z','Shift'].includes(k)){e.preventDefault();if(d)held.add(k);else held.delete(k);game.input(k,d)}}const kd=e=>key(e,true),ku=e=>key(e,false);canvas.addEventListener('keydown',kd);canvas.addEventListener('keyup',ku);canvas.addEventListener('blur',release);function tick(t){if(disposed||paused)return;if(!interactive&&last&&t-last<32){frame=requestAnimationFrame(tick);return}const dt=last?Math.min((t-last)/1000,.05):0;last=t;game.update(dt,!interactive);ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#10151c';ctx.fillRect(0,0,canvas.width,canvas.height);const scale=Math.min(canvas.width/W,canvas.height/H);ctx.setTransform(scale,0,0,scale,(canvas.width-W*scale)/2,(canvas.height-H*scale)/2);game.draw(ctx);frame=requestAnimationFrame(tick)}if(!paused)frame=requestAnimationFrame(tick);return {restart(){release();game=factories[id]()},setInteractive(v){release();interactive=!!v;last=0;canvas.tabIndex=interactive?0:-1},pause(){if(!paused){release();paused=true;cancelAnimationFrame(frame);last=0}},resume(){if(paused&&!disposed){paused=false;last=0;frame=requestAnimationFrame(tick)}},resize,destroy(){release();disposed=true;cancelAnimationFrame(frame);observer?.disconnect();canvas.removeEventListener('keydown',kd);canvas.removeEventListener('keyup',ku);canvas.removeEventListener('blur',release)}}}

