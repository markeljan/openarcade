export const featureGames40=[
 {id:'stamp-harbor',name:'Stamp Harbor',category:'PUZZLE',description:'Check papers and decide who may enter.',controls:'Arrows walk · Space bell / inspect / book · X admit · Z refuse',accent:'#dfcf9e',icon:'▣'},
 {id:'wash-wonder',name:'Wash Wonder',category:'SKILL',description:'Wash away dirt and reopen the park.',controls:'Arrows or WASD walk / aim · Space spray / open gate · X nozzle · Z refill at tap',accent:'#a9e0e6',icon:'✦'}
];
const W=320,H=720,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}function dot(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}function text(c,s,x,y,color='#fff',size=14,align='left'){c.fillStyle=color;c.font=`bold ${size}px monospace`;c.textAlign=align;c.fillText(s,x,y)}
// The three posted shifts follow the shipped reference's progressively stricter rules.
export function rulesForStamp(shift){return {day:12+shift,permit:shift>=1,matchingName:shift>=2,seal:shift>=2?'A':null}}
export function stampFaults(traveler,rules){
 const errors=[];if(traveler.expiry<rules.day)errors.push('EXPIRY');if(traveler.face!==traveler.portrait)errors.push('PORTRAIT');
 if(rules.permit&&(!traveler.permit||traveler.permit.kind!=='WORK'))errors.push('PERMIT');
 if(rules.matchingName&&traveler.permit&&traveler.permit.name!==traveler.name)errors.push('NAME');
 if(rules.seal&&traveler.permit&&traveler.permit.seal!==rules.seal)errors.push('SEAL');return errors;
}
export function stamp(){
 const names=['NIA','IVO','MAY','ORI','SOL','ADA','KIT','UMA'];
 const patterns=[[null,'expiry','portrait',null],[null,'permit','portrait',null],[null,'name','expiry','seal']];
 const stations={bell:{x:45,y:510},passport:{x:112,y:510},permit:{x:200,y:510},ledger:{x:270,y:510},admit:{x:75,y:590},refuse:{x:245,y:590},rope:{x:45,y:510},flag:{x:245,y:510}};
 let clerk,traveler,keys,score,shift,ordinal,phase,checked,feedback,ledger,timer,endTimer,offset,rope,signal,action,pending,arrival,travelerDeparture;
 const near=(point,r=19)=>Math.hypot(clerk.x-point.x,clerk.y-point.y)<=r;
 function issue(){
  const name=names[(offset+shift*4+ordinal)%names.length],face=Math.floor(Math.random()*3);
  traveler={name,face,portrait:face,expiry:16+Math.floor(Math.random()*4),permit:{kind:'WORK',name,seal:'A'}};
  const fault=patterns[shift][ordinal];if(fault==='expiry')traveler.expiry=9;if(fault==='portrait')traveler.portrait=(face+1)%3;
  if(fault==='permit')traveler.permit=null;if(fault==='name')traveler.permit.name=names[(names.indexOf(name)+1)%names.length];if(fault==='seal')traveler.permit.seal='B';
  checked={passport:false,permit:false};
 }
 function reset(){clerk={x:160,y:550};keys={};score=0;shift=0;ordinal=0;phase='call';feedback='RING FOR NEXT';ledger=[];timer=0;endTimer=0;rope=false;signal=false;action=null;pending=null;arrival=0;travelerDeparture=null;offset=Math.floor(Math.random()*names.length);issue()}
 function interact(){
  if(phase==='call'&&near(stations.bell)){phase='inspect';arrival=15/60;feedback='TRAVELER APPROACHING';return}
  if(phase==='inspect'&&arrival<=0&&near(stations.passport)&&!checked.passport){startCompare('passport');return}
  if(phase==='inspect'&&arrival<=0&&near(stations.permit)&&!checked.permit){startCompare('permit');return}
  if(phase==='ledger'&&near(stations.ledger)){
   if(travelerDeparture){feedback=pending.decision==='ADMIT'?'WATCH THEM BOARD':'WATCH THEM RETURN';return}if(!pending)return;ledger.push(pending);pending=null;ordinal++;if(ordinal===4){shift++;ordinal=0;if(shift===3){phase='departure';feedback='RELEASE DOCK ROPE';return}}
   phase='call';feedback=ordinal===0?'NEW SHIFT · RING FOR NEXT':'RING FOR NEXT';issue();
  }
  else if(phase==='departure'){
   if(!rope&&near(stations.rope)){rope=true;feedback='SIGNAL THE FERRY'}
   else if(rope&&!signal&&near(stations.flag)){signal=true;feedback='CLOSE THE BOOK'}
   else if(signal&&near(stations.ledger)){phase='complete';feedback='FERRY AWAY · THREE SHIFTS COMPLETE';endTimer=2}
  }
 }
 function startCompare(kind){const scan=(kind==='passport'?14:18)/60;action={kind:'compare',document:kind,elapsed:0,contact:.2+scan,end:.2+scan+8/60,committed:false};phase='comparing';feedback=kind==='passport'?'BRING PASSPORT CLOSE':'BRING PERMIT CLOSE'}
 function decide(admit){if(phase!=='inspect'||arrival>0||!near(admit?stations.admit:stations.refuse))return;action={kind:'stamp',admit,elapsed:0,contact:.2+8/60,end:.2+22/60,committed:false};phase='stamping';feedback='POSITION PAPER'}
 function stepAction(dt){if(!action)return;const a=action,old=a.elapsed;a.elapsed+=dt;if(!a.committed&&a.elapsed+1e-9>=a.contact){a.committed=true;if(a.kind==='compare'){checked[a.document]=true;feedback=stampFaults(traveler,rulesForStamp(shift)).find(x=>a.document==='passport'?(x==='EXPIRY'||x==='PORTRAIT'):(x==='PERMIT'||x==='NAME'||x==='SEAL'))||(a.document==='passport'?'PASSPORT COMPARED':'PERMIT COMPARED')}else{const faults=stampFaults(traveler,rulesForStamp(shift)),correct=a.admit===(faults.length===0);score+=correct?2:-5;pending={name:traveler.name,decision:a.admit?'ADMIT':'REFUSE',correct,faults};travelerDeparture={name:traveler.name,decision:pending.decision,left:a.admit?3:1.8};phase='ledger';feedback=correct?'CORRECT · WATCH TRAVELER':`CITATION ${faults[0]||'VALID'} · WATCH TRAVELER`;travelerDeparture.left=Math.max(0,travelerDeparture.left-Math.max(0,a.elapsed-Math.max(old,a.contact)));if(!travelerDeparture.left)travelerDeparture=null}}if(a.elapsed+1e-9>=a.end){if(a.kind==='compare')phase='inspect';action=null}}

 function autoStep(dt){
  if(action||arrival>0||(phase==='ledger'&&travelerDeparture))return;let target;if(phase==='call')target=stations.bell;else if(phase==='ledger')target=stations.ledger;else if(phase==='departure')target=!rope?stations.rope:!signal?stations.flag:stations.ledger;
  else if(phase==='inspect'&&!checked.passport)target=stations.passport;else if(phase==='inspect'&&rulesForStamp(shift).permit&&!checked.permit)target=stations.permit;
  else if(phase==='inspect')target=stampFaults(traveler,rulesForStamp(shift)).length?stations.refuse:stations.admit;
  if(!target)return;const dx=target.x-clerk.x,dy=target.y-clerk.y,d=Math.hypot(dx,dy),step=150*dt;
  if(d<=Math.max(5,step)){clerk.x=target.x;clerk.y=target.y;timer+=dt;if(timer>.2){timer=0;if(phase==='inspect'&&target===stations.admit)decide(true);else if(phase==='inspect'&&target===stations.refuse)decide(false);else interact()}}
  else {clerk.x+=dx/d*step;clerk.y+=dy/d*step}
 }
 reset();
 return {
  input(k,d){keys[k]=d;if(!d||phase==='complete'||action)return;if(k===' ')interact();if(k==='x')decide(true);if(k==='z')decide(false)},
  update(dt,auto){if(phase==='complete'){if(auto&&(endTimer-=dt)<=0)reset();return}arrival=Math.max(0,arrival-dt);const wasDeparting=!!travelerDeparture;if(action)stepAction(dt);if(wasDeparting&&travelerDeparture){travelerDeparture.left=Math.max(0,travelerDeparture.left-dt);if(!travelerDeparture.left){feedback=pending.decision==='ADMIT'?'BOARDED · RECORD':'RETURNED · RECORD';travelerDeparture=null}}if(action)return;if(auto)autoStep(dt);else{let dx=Number(!!(keys.ArrowRight||keys.d))-Number(!!(keys.ArrowLeft||keys.a)),dy=Number(!!(keys.ArrowDown||keys.s))-Number(!!(keys.ArrowUp||keys.w)),n=Math.hypot(dx,dy)||1;clerk.x=clamp(clerk.x+dx/n*120*dt,25,295);clerk.y=clamp(clerk.y+dy/n*120*dt,460,610)}},
  draw(c){
   rect(c,0,0,W,H,'#183746');rect(c,0,100,320,110,'#6493a1');for(let x=0;x<320;x+=35)rect(c,x,147+(x%3)*2,24,2,'#9dc6c4');
   rect(c,86,153,181,8,'#1a3440');rect(c,95,161,162,9,'#d9be87');rect(c,104,169,144,13,'#203d4b');rect(c,111,129,118,25,'#f2dfb8');rect(c,136,119,70,12,'#f2dfb8');rect(c,180,108,15,12,'#d77970');for(let x=120;x<220;x+=22){rect(c,x,137,13,13,'#214454');rect(c,x+3,139,3,9,'#92c7c5')}rect(c,17,175,44,9,'#715843');rect(c,22,150,8,25,'#8b684a');rect(c,0,181,320,10,'#506b6c');for(let x=16;x<320;x+=48){rect(c,x,179,4,25,'#d4b17a');rect(c,x+4,185,44,2,'#a1aaa0')}
   rect(c,0,405,320,245,'#1b3d4c');for(let y=420;y<650;y+=25)rect(c,0,y,320,2,'#315969');for(let x=0;x<320;x+=50)rect(c,x,410,2,240,'#294d5d');
   rect(c,12,24,296,88,'#d8c9a4');rect(c,16,28,288,22,'#203f4a');text(c,'PORT RULES',24,44,'#f6ebce',12);const rules=rulesForStamp(Math.min(shift,2));
   text(c,`DAY ${rules.day}  ·  EXPIRY ${rules.day}+  ·  FACE = ID`,24,67,'#3d4742',10);text(c,rules.permit?'WORK PERMIT REQUIRED':'PERMIT NOT REQUIRED',24,84,'#3d4742',10);if(rules.matchingName)text(c,'NAME = ID  ·  SEAL A',24,101,'#3d4742',10);
   // Dock and traveler occupy the upper half; documents sit on the desk below.
   rect(c,0,191,320,168,'#819694');for(let y=200;y<360;y+=28)rect(c,0,y,320,2,'#667d7c');for(let x=28;x<320;x+=51)rect(c,x,194,2,164,'#6d8280');
   rect(c,0,238,320,10,'#183d47');for(let x=6;x<320;x+=40){rect(c,x,232,4,22,'#183d47');rect(c,x+4,237,32,4,'#d1af78')}
   rect(c,257,296,8,65,'#203e45');rect(c,205,297,60,8,'#f4e3bf');for(let x=207;x<257;x+=14)rect(c,x,297,7,8,'#e18774');
   rect(c,45,352,228,7,'#c19a6e');rect(c,62,289,48,48,'#625c71');rect(c,68,334,14,25,'#263c46');rect(c,91,334,14,25,'#263c46');rect(c,58,305,11,29,'#6a5869');rect(c,107,306,10,29,'#6a5869');rect(c,72,266,30,32,['#bf9e84','#e3b49a','#8b6d5e'][traveler.face]);rect(c,70,261,34,9,['#4c3430','#a4774e','#242c36'][traveler.face]);rect(c,78,278,4,4,'#26343b');rect(c,94,278,4,4,'#26343b');rect(c,83,290,10,3,'#925f58');
   rect(c,0,360,320,94,'#785846');for(let y=371;y<454;y+=20)rect(c,0,y,320,2,'#654b3d');rect(c,14,374,4,66,'#d9b77e');rect(c,19,369,38,5,'#d9b77e');
   rect(c,18,435,284,14,'#74513d');rect(c,24,449,272,19,'#bd9168');rect(c,30,468,12,150,'#7c5741');rect(c,278,468,12,150,'#7c5741');rect(c,20,445,280,175,'#536762');rect(c,20,445,280,7,'#bf9671');   rect(c,35,458,110,135,'#b89567');rect(c,40,454,108,134,'#f3e8ce');text(c,traveler.name,50,473,'#514d40',11);text(c,`EXP ${traveler.expiry}`,50,494,'#514d40',10);dot(c,65,550,11,['#bf9e84','#e3b49a','#8b6d5e'][traveler.portrait]);rect(c,57,538,16,5,['#4c3430','#a4774e','#242c36'][traveler.portrait]);text(c,checked.passport?'ID ✓':'ID',112,566,'#5c725e',9,'center');
   rect(c,191,384,116,126,'#b89567');rect(c,195,380,112,126,'#efe3c6');text(c,'PERMIT',203,399,'#514d40',10);if(traveler.permit){text(c,traveler.permit.kind,250,425,'#514d40',10,'center');text(c,traveler.permit.name,250,447,'#514d40',10,'center');text(c,`SEAL ${traveler.permit.seal}`,250,470,'#514d40',10,'center')}else text(c,'NONE',250,447,'#a35f56',12,'center');text(c,checked.permit?'PASS ✓':'PASS',250,494,'#5c725e',9,'center');
for(const [name,point] of Object.entries(stations)){if(phase==='departure'?['bell','passport','permit'].includes(name):['rope','flag'].includes(name))continue;const active=(phase==='call'&&name==='bell')||(phase==='inspect'&&['passport','permit','admit','refuse'].includes(name))||(phase==='ledger'&&name==='ledger')||(phase==='departure'&&name===(!rope?'rope':!signal?'flag':'ledger'));rect(c,point.x-24,point.y-15,48,30,active?'#859b86':'#5a716b');text(c,({bell:'BELL',passport:'ID',permit:'PASS',ledger:'BOOK',admit:'X ✓',refuse:'Z ✕',rope:'ROPE',flag:'FLAG'})[name],point.x,point.y+4,'#f7edce',9,'center')}
   rect(c,clerk.x-12,clerk.y+5,24,23,'#273f4d');rect(c,clerk.x-7,clerk.y-8,14,16,'#eac29f');rect(c,clerk.x-10,clerk.y-12,20,5,'#283e48');rect(c,clerk.x-13,clerk.y-14,26,4,'#d7b67d');rect(c,clerk.x-3,clerk.y+6,6,18,'#d8c79b');rect(c,clerk.x-13,clerk.y+11,4,10,'#ecc9a5');rect(c,clerk.x+9,clerk.y+11,4,10,'#ecc9a5');
   rect(c,0,0,320,20,'#132e3b');text(c,`STAMP HARBOR   SHIFT ${Math.min(shift+1,3)}/3`,8,14,'#f5e6c9',10);text(c,`PAY ${score}  CASE ${Math.min(ordinal+1,4)}/4`,16,654,'#fff2d1',11);text(c,feedback,160,675,'#f6e8c8',10,'center');
   if(action){const progress=clamp(action.elapsed/action.end,0,1);rect(c,76,391,168,7,'#6d5e4b');rect(c,76,391,168*progress,7,action.kind==='compare'?'#9dc6c4':'#dfb780');text(c,action.kind==='compare'?'COMPARING DOCUMENT':'STAMP CONTACT',160,387,'#f8efda',8,'center')}if(travelerDeparture){const x=travelerDeparture.decision==='ADMIT'?clamp(42+(1-travelerDeparture.left/3)*250,42,292):clamp(42-(1-travelerDeparture.left/1.8)*50,-8,42);dot(c,x,174,5,'#f5d7b2')}text(c,phase==='call'?'BELL: SPACE':phase==='comparing'?'COMPARING':phase==='stamping'?'STAMPING':phase==='inspect'?'ID/PASS: SPACE · X ADMIT · Z REFUSE':phase==='ledger'?(travelerDeparture?'WATCH TRAVELER':'BOOK: SPACE'):phase==='departure'?'ROPE → FLAG → BOOK: SPACE':'RESTART TO PLAY AGAIN',160,700,'#f4ddb3',9,'center');
   if(phase==='complete'){rect(c,45,350,230,72,'#142e38');text(c,'THREE SHIFTS COMPLETE',160,374,'#fff2d1',12,'center');text(c,`${ledger.filter(e=>e.correct).length}/12 CORRECT · PAY ${score}`,160,395,'#e4ce8d',10,'center')}
  },reset,
  snapshot(){return {phase,shift,ordinal,score,rope,signal,clerk:{...clerk},traveler:structuredClone(traveler),rules:rulesForStamp(Math.min(shift,2)),checked:{...checked},ledger:structuredClone(ledger),feedback,action:action&&{...action},pending:pending&&structuredClone(pending),arrival,travelerDeparture:travelerDeparture&&{...travelerDeparture}}}
 };
}
// Wash Wonder: landmark restoration, with a pressure-sensitive jet and material-specific nozzles.
export function applyWashJet(cells,jet,dt){
 let cleared=0,removed=0;
 for(const cell of cells){
  if(cell.hp<=0)continue;
  const dx=cell.x-jet.x,dy=cell.y-jet.y,along=dx*jet.dx+dy*jet.dy,across=Math.abs(dx*jet.dy-dy*jet.dx);
  const width=jet.nozzle==='narrow'?5.6:6+along*.035;
  if(along<6||along>jet.range||across>width)continue;
  const strength=jet.nozzle==='narrow'?(cell.material==='rust'?3.8:.9):(cell.material==='chalk'?2.7:.28);
  const before=cell.hp;cell.hp=Math.max(0,cell.hp-strength*jet.pressure*dt*60);removed+=before-cell.hp;if(cell.hp===0)cleared++;
 }
 return {cleared,removed};
}
export function createWashWonder(){
 const titles=['STRIPED CAROUSEL','SUNBEAM ENGINE','GLASS OBSERVATORY'],tap={x:34,y:588},gate={x:284,y:574},maxWater=168;
 const shape=(job,x,y)=>{
  if(job===0)return (y>=176&&y<=292&&Math.abs(x-160)<=(y-176)*1.05)||(y>=292&&y<314&&x>=40&&x<=280)||(y>=314&&y<452&&((x>=148&&x<=172)||(x>=62&&x<=78)||(x>=242&&x<=258)||(x>=98&&x<=114)||(x>=206&&x<=222)))||([106,214].some(cx=>y>=374&&y<=430&&Math.abs(x-cx)<27))||(y>=452&&y<=478&&x>=48&&x<=272);
  if(job===1)return (y>=224&&y<=282&&x>=90&&x<=116)||(y>=264&&y<=418&&x>=194&&x<=264)||(y>=318&&y<=418&&x>=58&&x<=206)||(y>=410&&y<=438&&x>=40&&x<=278)||(y>=422&&y<=478&&[96,160,226].some(cx=>(x-cx)**2+(y-446)**2<900));
  return (y<=306&&((x-160)/112)**2+((y-300)/124)**2<=1)||(y>=304&&y<=342&&x>=44&&x<=276)||(y>=342&&y<=478&&x>=70&&x<=252);
 };
 function jobCells(job){
  // Each eight-pixel cell carries a 4x4 silhouette mask, matching the reference's
  // four-pixel cells at its half-sized logical resolution.
  const cells=[];for(let top=188;top<484;top+=8)for(let left=36;left<284;left+=8){
   let mask=0,x=0,y=0,nearest=Infinity;
   for(let py=0;py<4;py++)for(let px=0;px<4;px++)if(shape(job,left+px*2+1,top+py*2+1)){
    mask|=1<<(py*4+px);const distance=(px-1.5)**2+(py-1.5)**2;
    if(distance<nearest){nearest=distance;x=left+px*2+1;y=top+py*2+1}
   }
   if(!mask)continue;const motor=job===0?top>=320&&top<448:job===1?top>=422:top<342;
   const material=(job===0?top>=448||(left>=144&&left<=172):job===1?top>=412||left<124:top>=336)?'rust':'chalk';
   const hp=(material==='rust'?15:10)+Math.floor(Math.random()*6);cells.push({x,y,left,top,mask,material,motor,hp,max:hp});
  }return cells
 }
 let player,keys,jobs,job,phase,water,nozzle,aim,notice,target,jet,refills,cleared,endTimer,motorOn,refillStarted;
 const near=(a,b,r=21)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
 function reset(){player={x:46,y:582};keys={};jobs=[0,1,2].map(jobCells);job=0;phase='wash';water=maxWater;nozzle='fan';aim={x:0,y:-1};notice='FAN FOR CHALK';target=-1;jet=null;refills=0;cleared=0;endTimer=0;motorOn=false;refillStarted=false}
 function refill(dt){if(!near(player,tap)||water>=maxWater)return;refillStarted=true;const was=water;water=Math.min(maxWater,water+540*dt);if(was<maxWater&&water===maxWater){refills++;refillStarted=false;notice='TANK FULL'}}
 function spray(dt){
  if(water<=0){notice='LOW WATER: Z AT TAP';return}
  const pressure=clamp(water/45,.12,1);jet={x:player.x+aim.x*20,y:player.y-16+aim.y*18,dx:aim.x,dy:aim.y,nozzle,pressure,range:380*(.55+pressure*.45)};
  water=Math.max(0,water-51*dt);const result=applyWashJet(jobs[job],jet,dt);cleared+=result.cleared;
  if(water<36)notice='LOW PRESSURE: TAP';
  if(!motorOn&&jobs[job].every(c=>!c.motor||c.hp<=0)){motorOn=true;notice='MECHANISM RELEASED'}
  if(jobs[job].every(c=>c.hp<=0)){phase='ribbon';notice='CLEAN! OPEN THE GATE';target=-1}
 }
 function openGate(){if(phase!=='ribbon'||!near(player,gate))return;if(job<2){job++;phase='wash';target=-1;motorOn=false;notice=job===1?'RUST NEEDS NARROW':'RINSE THE GLASS'}else{phase='pack';notice='PARK REOPENED';endTimer=0}}
 function autoIntent(){
  if(phase==='pack')return water<maxWater?{target:tap,refill:true}:{target:tap,finish:true};
  if(phase==='ribbon')return {target:gate,open:true};
  if(refillStarted||water<29)return {target:tap,refill:true};
  const cells=jobs[job];if(target<0||!cells[target]||cells[target].hp<=0){let best=Infinity;target=-1;for(let i=0;i<cells.length;i++){const cell=cells[i];if(cell.hp<=0)continue;const cost=Math.abs(cell.x-player.x)+(cell.material===(nozzle==='narrow'?'rust':'chalk')?0:34)+(480-cell.y)*.015;if(cost<best){best=cost;target=i}}}
  const cell=cells[target];if(!cell)return {};
  const wanted=cell.material==='rust'?'narrow':'fan';if(nozzle!==wanted)return {change:true};
  if(Math.abs(player.x-cell.x)>2)return {target:{x:clamp(cell.x,24,296),y:550}};
  if(aim.y!==-1)return {up:true};
  return {spray:true};
 }
 function update(dt,auto){
  dt=Math.min(Math.max(dt,0),.05);jet=null;let intent=auto?autoIntent():{dx:Number(!!(keys.ArrowRight||keys.d))-Number(!!(keys.ArrowLeft||keys.a)),dy:Number(!!(keys.ArrowDown||keys.s))-Number(!!(keys.ArrowUp||keys.w)),spray:!!keys[' '],refill:!!keys.z};
  if(intent.change)nozzle=nozzle==='fan'?'narrow':'fan';
  let dx=intent.dx||0,dy=intent.dy||0;
  if(intent.target&&!near(player,intent.target,2)){const x=intent.target.x-player.x,y=intent.target.y-player.y,d=Math.hypot(x,y),step=Math.min(d,198*dt);dx=x/d;dy=y/d;player.x+=dx*step;player.y+=dy*step}
  else if(intent.up)dy=-1;
  if(!intent.target){const length=Math.hypot(dx,dy)||1;player.x+=dx/length*(intent.spray?86:198)*dt;player.y+=dy/length*(intent.spray?86:198)*dt}
  player.x=clamp(player.x,20,300);player.y=clamp(player.y,502,628);
  if((dx||dy)&&!intent.spray)aim=Math.abs(dx)>Math.abs(dy)?{x:Math.sign(dx),y:0}:{x:0,y:Math.sign(dy)};
  const filling=!!intent.refill&&near(player,tap)&&water<maxWater;
  if(filling)refill(dt);
  if(!filling&&(intent.open||(intent.spray&&phase==='ribbon')))openGate();
  if(!filling&&!auto&&intent.spray&&phase==='pack'&&water>=maxWater&&near(player,tap)){reset();return}
  if(intent.finish&&phase==='pack'&&near(player,tap)){endTimer+=dt;if(endTimer>2)reset()}
  if(!filling&&intent.spray&&phase==='wash')spray(dt);
 }
 function draw(c){
  rect(c,0,0,320,720,'#a8d8dc');dot(c,261,78,18,'#f4d887');rect(c,18,88,58,8,'#f7efd7');rect(c,208,98,70,8,'#f7efd7');
  c.fillStyle='#78a696';c.beginPath();c.moveTo(0,260);for(const [x,y] of [[0,220],[40,184],[85,200],[125,180],[190,202],[240,178],[284,195],[320,180],[320,300]])c.lineTo(x,y);c.closePath();c.fill();
  rect(c,0,260,320,232,'#87a668');for(const x of [12,306]){rect(c,x-5,248,10,100,'#bb784d');dot(c,x,235,39,'#507e61');dot(c,x-15,220,25,'#356355');dot(c,x+13,213,26,'#78a16b')}
  rect(c,0,492,320,160,'#ccb993');
  for(let y=500;y<650;y+=26){rect(c,0,y,320,2,'#e8d7b2');for(let x=y%52;x<320;x+=56)rect(c,x,y,2,26,'#b5a27f')}
  if(job===0){rect(c,48,448,224,28,'#b8794f');rect(c,148,224,24,224,'#e8bb65');c.fillStyle='#e6b762';c.beginPath();c.moveTo(160,174);c.lineTo(38,294);c.lineTo(282,294);c.closePath();c.fill();for(const x of [40,80,120,160,200,240]){c.fillStyle=(x/40)%2?'#fff0cf':'#d46d5e';c.beginPath();c.moveTo(160,176);c.lineTo(x,294);c.lineTo(x+40,294);c.closePath();c.fill()}rect(c,40,292,240,18,'#fff0cf');for(const x of [68,106,214,250])rect(c,x,294,6,154,'#e6b762');for(const x of [106,214]){rect(c,x-19,397,38,17,'#fff2d3');rect(c,x+13,382,12,25,'#fff2d3');rect(c,x-14,414,6,17,'#fff2d3');rect(c,x+11,414,6,17,'#fff2d3');rect(c,x-10,400,20,6,'#3c71b5')}}
  else if(job===1){rect(c,58,318,150,100,'#4176af');rect(c,192,264,72,154,'#d87764');rect(c,90,224,26,65,'#bb784d');for(const x of [96,160,226])dot(c,x,446,24,'#263e42');}
  else {dot(c,160,300,110,'#5f9dba');rect(c,44,304,232,38,'#e6b762');rect(c,70,342,180,130,'#79a8dd');for(let x=90;x<250;x+=40)rect(c,x,350,6,110,'#fff2d3')}
  for(const cell of jobs[job])if(cell.hp>0){
   // Only painted mask pixels cover the landmark; damage breaks the patch up.
   const ratio=cell.hp/cell.max;for(let bit=0;bit<16;bit++)if((cell.mask&(1<<bit))&&((bit*7%16)/16<ratio)){
    const px=cell.left+(bit%4)*2,py=cell.top+Math.floor(bit/4)*2;
    rect(c,px,py,2,2,cell.material==='rust'?(bit%5?'#825b47':'#a17955'):(bit%5?'#a99d84':'#c4b79c'));
   }
  }
  rect(c,tap.x-18,tap.y-20,36,40,'#3c71b5');text(c,'TAP',tap.x,625,'#263e42',10,'center');rect(c,gate.x-14,540,4,58,'#bb784d');rect(c,gate.x+10,540,4,58,'#bb784d');if(phase!=='pack')rect(c,gate.x-12,552,24,5,'#d97765');
  dot(c,player.x,player.y-13,8,'#f1d1a5');rect(c,player.x-8,player.y-5,16,20,'#3c71b5');
  if(jet){c.strokeStyle='#eaffff';c.lineWidth=nozzle==='fan'?7:3;c.beginPath();c.moveTo(jet.x,jet.y);c.lineTo(jet.x+jet.dx*jet.range,jet.y+jet.dy*jet.range);c.stroke()}
  rect(c,0,0,320,50,'#263e42');text(c,'WASH WONDER',10,19,'#fff2d3',15);text(c,`${job+1}/3`,301,19,'#e6b762',14,'right');text(c,titles[job],10,41,'#fff2d3',12);
  rect(c,0,650,320,70,'#263e42');text(c,notice,10,673,'#fff2d3',11);text(c,`${nozzle.toUpperCase()}/${nozzle==='fan'?'CHALK':'RUST'}  WATER ${Math.ceil(water)}`,10,699,'#76d2e5',11);
  if(phase==='pack')text(c,'PARK REOPENED',160,480,'#fff2d3',18,'center');
 }
 reset();return {input(k,down){const held=!!keys[k];keys[k]=down;if(down&&!held&&k==='x'){nozzle=nozzle==='fan'?'narrow':'fan';notice=nozzle==='fan'?'FAN: CHALK':'NARROW: RUST'}},update,draw,reset,snapshot(){return {job,phase,water,nozzle,aim:{...aim},player:{...player},remaining:jobs[job].filter(c=>c.hp>0).length,cells:jobs[job].map(c=>({...c})),cleared,refills,motorOn,notice}}};
}
function wash(){return createWashWonder()}

const factories={'stamp-harbor':stamp,'wash-wonder':wash};
export function createFeatureGame40(canvas,id,options={}){const ctx=canvas.getContext('2d');if(!ctx||!factories[id])throw new Error(`Unknown game: ${id}`);let game=factories[id](),interactive=!!options.interactive,paused=!!options.paused,disposed=false,frame,last=0;const held=new Set();canvas.tabIndex=interactive?0:-1;canvas.setAttribute('aria-label',`${featureGames40.find(g=>g.id===id).name} game`);function resize(){const b=canvas.getBoundingClientRect(),r=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(b.width*r));canvas.height=Math.max(1,Math.round(b.height*r))}const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(canvas);resize();function release(){for(const k of held)game.input(k,false);held.clear()}function key(e,d){if(!interactive)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','x','z','Shift'].includes(k)){e.preventDefault();if(d)held.add(k);else held.delete(k);game.input(k,d)}}const kd=e=>key(e,true),ku=e=>key(e,false);canvas.addEventListener('keydown',kd);canvas.addEventListener('keyup',ku);canvas.addEventListener('blur',release);function tick(t){if(disposed||paused)return;if(!interactive&&last&&t-last<32){frame=requestAnimationFrame(tick);return}const dt=last?Math.min((t-last)/1000,.05):0;last=t;game.update(dt,!interactive);ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#10151c';ctx.fillRect(0,0,canvas.width,canvas.height);const scale=Math.min(canvas.width/W,canvas.height/H);ctx.setTransform(scale,0,0,scale,(canvas.width-W*scale)/2,(canvas.height-H*scale)/2);game.draw(ctx);frame=requestAnimationFrame(tick)}if(!paused)frame=requestAnimationFrame(tick);return {restart(){release();game=factories[id]()},setInteractive(v){release();interactive=!!v;last=0;canvas.tabIndex=interactive?0:-1},pause(){if(!paused){release();paused=true;cancelAnimationFrame(frame);last=0}},resume(){if(paused&&!disposed){paused=false;last=0;frame=requestAnimationFrame(tick)}},resize,destroy(){release();disposed=true;cancelAnimationFrame(frame);observer?.disconnect();canvas.removeEventListener('keydown',kd);canvas.removeEventListener('keyup',ku);canvas.removeEventListener('blur',release)}}}


