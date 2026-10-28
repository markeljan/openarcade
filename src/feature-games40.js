import {createRunReporter} from './scores/run.js';
import {createGameAudio,unlockSound} from './audio.js';
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
export function stamp(play=()=>{},onFinish=()=>{}){
 const names=['NIA','IVO','MAY','ORI','SOL','ADA','KIT','UMA'];
 const patterns=[[null,'expiry','portrait',null],[null,'permit','portrait',null],[null,'name','expiry','seal']];
 const stations={bell:{x:36,y:562},passport:{x:70,y:550},permit:{x:242,y:550},ledger:{x:160,y:610},admit:{x:222,y:608},refuse:{x:94,y:608},rope:{x:40,y:550},flag:{x:280,y:550}};
 let clerk,traveler,keys,score,shift,ordinal,phase,checked,feedback,ledger,timer,endTimer,offset,rope,signal,action,pending,arrival,travelerDeparture,ferryTravel,ledgerClosed,aftermathStep,rulesRead,busy,paper,permitSheet,accumulator,barrier;
 const near=(point,r=20)=>Math.hypot(clerk.x-point.x,clerk.y-point.y)<r;
 function issue(){
  paper={x:20,y:372};permitSheet={x:192,y:382};
  const name=names[(offset+shift*4+ordinal)%names.length],face=Math.floor(Math.random()*3);
  traveler={name,face,portrait:face,expiry:16+Math.floor(Math.random()*4),permit:{kind:'WORK',name,seal:'A'}};
  const fault=patterns[shift][ordinal];if(fault==='expiry')traveler.expiry=9;if(fault==='portrait')traveler.portrait=(face+1)%3;
  if(fault==='permit')traveler.permit=null;if(fault==='name')traveler.permit.name=names[(names.indexOf(name)+1)%names.length];if(fault==='seal')traveler.permit.seal='B';
  checked={passport:false,permit:false};
 }
 function reset(){barrier=0;accumulator=0;clerk={x:160,y:596};keys={};busy=0;score=0;shift=0;ordinal=0;phase='call';feedback='RING FOR NEXT';ledger=[];timer=0;endTimer=0;rope=false;signal=false;action=null;pending=null;arrival=0;travelerDeparture=null;ferryTravel=0;ledgerClosed=false;aftermathStep=0;rulesRead=false;offset=Math.floor(Math.random()*names.length);issue()}
 function interact(){
  if(phase==='complete'){if(aftermathStep===0&&near(stations.flag)){aftermathStep=1;busy=24/60;feedback='WAVE TO FERRY'}else if(aftermathStep===1&&near(stations.ledger)){aftermathStep=2;busy=20/60;feedback='CLOSE THE BOOK'}else if(aftermathStep===2&&endTimer>=2.5&&near(stations.bell))reset();return}
  if(phase==='call'&&near(stations.bell)){phase='inspect';arrival=15/60;busy=12/60;play('stamp-bell');feedback='TRAVELER APPROACHING';return}
  if(phase==='inspect'&&arrival<=0&&near(stations.passport)&&!checked.passport){startCompare('passport');return}
  if(phase==='inspect'&&arrival<=0&&near(stations.permit)){if(!rulesRead){rulesRead=true;action={kind:'read',elapsed:0,end:14/60};feedback='POSTED RULES READ';return}if(!checked.permit){startCompare('permit');return}}
  if(phase==='ledger'&&near(stations.ledger)){
   if(travelerDeparture){feedback=pending.decision==='ADMIT'?'WATCH THEM BOARD':'WATCH THEM RETURN';return}if(!pending)return;ledger.push(pending);pending=null;busy=16/60;play('stamp-record');ordinal++;if(ordinal===4){shift++;ordinal=0;rulesRead=false;play('stamp-shift');if(shift===3){phase='departure';feedback='RELEASE DOCK ROPE';return}}
   phase='call';feedback=ordinal===0?'NEW SHIFT · RING FOR NEXT':'RING FOR NEXT';issue();
  }
  else if(phase==='departure'){
   if(!rope&&near(stations.rope)){rope=true;busy=16/60;play('stamp-rope');feedback='SIGNAL THE FERRY'}
   else if(rope&&!signal&&near(stations.flag)){signal=true;busy=20/60;play('stamp-signal');feedback='CLOSE THE BOOK'}
   else if(signal&&near(stations.ledger)){ledgerClosed=true;busy=16/60;play('stamp-record');phase='sailing';feedback='PASSENGERS SAILING'}
  }
 }
 function positioningState(origin,docOrigin,hero,target,steps=1000){let h={...origin},p={...docOrigin},n=0;while(n<steps){const dx=hero.x-h.x,dy=hero.y-h.y,d=Math.hypot(dx,dy),pd=Math.hypot(target.x-p.x,target.y-p.y),ticks=Math.max(1,Math.ceil(pd/6.4-1e-9)),step=Math.min(3.1,d/ticks);if(d){h.x+=dx/d*step;h.y+=dy/d*step}if(pd){const stepPaper=Math.min(6.4,pd);p.x+=(target.x-p.x)/pd*stepPaper;p.y+=(target.y-p.y)/pd*stepPaper}n++;if(Math.hypot(hero.x-h.x,hero.y-h.y)<1e-7&&Math.hypot(target.x-p.x,target.y-p.y)<1e-7){h={...hero};p={...target};break}}return {h,p,n}}
 function positioningTicks(origin,docOrigin,hero,target){return positioningState(origin,docOrigin,hero,target).n}
 function startCompare(kind){const scan=(kind==='passport'?14:18)/60,doc=kind==='passport'?paper:permitSheet,target=kind==='passport'?{x:48,y:420}:{x:168,y:436},hero=kind==='passport'?{x:28,y:498}:{x:296,y:510},position=positioningTicks(clerk,doc,hero,target)/60;action={kind:'compare',document:kind,elapsed:0,position,origin:{...clerk},docOrigin:{...doc},target,hero,contact:position+scan,end:position+scan+9/60,committed:false};phase='comparing';feedback=kind==='passport'?'BRING PASSPORT CLOSE':'BRING PERMIT CLOSE'}
 function decide(admit){if(phase!=='inspect'||arrival>0||!near(admit?stations.admit:stations.refuse,24))return;const target={x:admit?144:32,y:456},hero={x:admit?222:110,y:628},position=positioningTicks(clerk,paper,hero,target)/60;action={kind:'stamp',admit,elapsed:0,position,origin:{...clerk},docOrigin:{...paper},target,hero,contact:position+8/60,end:position+22/60,committed:false};phase='stamping';feedback='POSITION PAPER'}
 function stepAction(dt){if(!action)return;const a=action;if(a.kind==='stamp'){const dx=192-permitSheet.x,dy=382-permitSheet.y,d=Math.hypot(dx,dy),step=Math.min(d,384*dt);if(d){permitSheet.x+=dx/d*step;permitSheet.y+=dy/d*step}}if(a.kind==='read'){a.elapsed+=dt;if(a.elapsed+1e-9>=a.end)action=null;return}const old=a.elapsed;a.elapsed+=dt;const doc=a.kind==='stamp'||a.document==='passport'?paper:permitSheet,placed=positioningState(a.origin,a.docOrigin,a.hero,a.target,Math.min(Math.round(a.position*60),Math.floor(a.elapsed*60+1e-8)));clerk.x=placed.h.x;clerk.y=placed.h.y;doc.x=placed.p.x;doc.y=placed.p.y;if(a.kind==='compare'&&a.elapsed>=a.position){const scan=(a.document==='passport'?14:18)/60,span=a.document==='passport'?40:54,age=a.elapsed-a.position,progress=clamp(age/scan,0,1),recover=clamp((age-scan)/(8/60),0,1);clerk.y=a.hero.y+span*progress+(550-a.hero.y-span)*recover;}if(!a.committed&&a.elapsed+1e-9>=a.contact){a.committed=true;if(a.kind==='compare'){checked[a.document]=true;play('stamp-compare');feedback=stampFaults(traveler,rulesForStamp(shift)).find(x=>a.document==='passport'?(x==='EXPIRY'||x==='PORTRAIT'):(x==='PERMIT'||x==='NAME'||x==='SEAL'))||(a.document==='passport'?'PASSPORT COMPARED':'PERMIT COMPARED')}else{const faults=stampFaults(traveler,rulesForStamp(shift)),correct=a.admit===(faults.length===0);score+=correct?2:-5;play(correct?(a.admit?'stamp-approve':'stamp-refuse'):'stamp-citation');pending={name:traveler.name,decision:a.admit?'ADMIT':'REFUSE',correct,faults};travelerDeparture={name:traveler.name,decision:pending.decision,x:86,hold:14/60};phase='ledger';feedback=correct?'CORRECT · WATCH TRAVELER':`CITATION ${faults[0]||'VALID'} · WATCH TRAVELER`;}}if(a.elapsed+1e-9>=a.end){if(a.kind==='compare')phase='inspect';action=null}}

 function autoStep(dt){
  if(action||arrival>0)return;let target;if(phase==='complete')target=aftermathStep===0?stations.flag:aftermathStep===1?stations.ledger:stations.bell;else if(phase==='call')target=stations.bell;else if(phase==='ledger')target=travelerDeparture?{x:clamp(travelerDeparture.x,36,280),y:624,following:true}:stations.ledger;else if(phase==='sailing')target=stations.flag;else if(phase==='departure')target=!rope?stations.rope:!signal?stations.flag:stations.ledger;
  else if(phase==='inspect'&&!rulesRead)target=stations.permit;else if(phase==='inspect'&&!checked.passport)target=stations.passport;else if(phase==='inspect'&&rulesForStamp(shift).permit&&!checked.permit)target=stations.permit;
  else if(phase==='inspect')target=stampFaults(traveler,rulesForStamp(shift)).length?stations.refuse:stations.admit;
  if(!target)return;const tx=target.x,ty=Math.max(pending?Math.round(paper.y/2)*2+166:536,target.y),dx=tx-clerk.x,dy=ty-clerk.y,d=Math.hypot(dx,dy),step=186*dt;
  if(d<=Math.max(5,step)){clerk.x=tx;clerk.y=ty;timer+=dt;if(timer>.2){timer=0;if(target.following||phase==='sailing'){}else if(phase==='inspect'&&target===stations.admit)decide(true);else if(phase==='inspect'&&target===stations.refuse)decide(false);else interact()}}
  else {clerk.x+=dx/d*step;clerk.y+=dy/d*step}
 }
 reset();
 return {
  input(k,d){keys[k]=d},
  update(dt,auto){accumulator+=dt;while(accumulator+1e-9>=1/60){accumulator=Math.max(0,accumulator-1/60);this.step(1/60,auto)}},clearAccumulator(){accumulator=0},step(dt,auto){const wasAction=!!action,locked=busy>1e-9;busy=Math.max(0,busy-dt);if(phase==='sailing'){ferryTravel=Math.min(162,ferryTravel+186*dt);if(ferryTravel>=162){phase='complete';onFinish({score,result:'THREE SHIFTS COMPLETE'});play('stamp-depart');feedback='FERRY AWAY · THREE SHIFTS COMPLETE';endTimer=0;aftermathStep=0}}if(phase==='complete')endTimer+=dt;arrival=Math.max(0,arrival-dt);const wasDeparting=!!travelerDeparture;if(action)stepAction(dt);barrier=clamp(barrier+(travelerDeparture?.decision==='ADMIT'?5.1:-3.3)*dt,0,1);if(wasDeparting&&travelerDeparture){const d=travelerDeparture;d.hold=Math.max(0,d.hold-dt);if(d.hold<1e-9)d.hold=0;if(!d.hold){const next=d.x+(d.decision==='ADMIT'?204:-192)*dt;if(!(d.decision==='ADMIT'&&next+26>=260&&d.x<260&&barrier<.92))d.x=next;if(d.x>336||d.x< -44){feedback=pending.decision==='ADMIT'?'BOARDED · RECORD':'RETURNED · RECORD';travelerDeparture=null}}}if(action||wasAction||locked)return;if(auto)autoStep(dt);else{let dx=Number(!!(keys.ArrowRight||keys.d))-Number(!!(keys.ArrowLeft||keys.a)),dy=Number(!!(keys.ArrowDown||keys.s))-Number(!!(keys.ArrowUp||keys.w)),n=Math.hypot(dx,dy)||1;clerk.x=clamp(clerk.x+dx/n*186*dt,24,296);clerk.y=clamp(clerk.y+dy/n*186*dt,pending?Math.round(paper.y/2)*2+166:536,628);if(keys[' '])interact();if(keys.x)decide(true);if(keys.z)decide(false)}},
  draw(c){
   rect(c,0,0,W,H,'#183746');rect(c,0,100,320,110,'#6493a1');for(let x=0;x<320;x+=35)rect(c,x,147+(x%3)*2,24,2,'#9dc6c4');
   c.save();c.translate(ferryTravel,0);rect(c,86,153,181,8,'#1a3440');rect(c,95,161,162,9,'#d9be87');rect(c,104,169,144,13,'#203d4b');rect(c,111,129,118,25,'#f2dfb8');rect(c,136,119,70,12,'#f2dfb8');rect(c,180,108,15,12,'#d77970');for(let x=120;x<220;x+=22){rect(c,x,137,13,13,'#214454');rect(c,x+3,139,3,9,'#92c7c5')}c.restore();rect(c,17,175,44,9,'#715843');rect(c,22,150,8,25,'#8b684a');rect(c,0,181,320,10,'#506b6c');for(let x=16;x<320;x+=48){rect(c,x,179,4,25,'#d4b17a');rect(c,x+4,185,44,2,'#a1aaa0')}
   rect(c,0,405,320,245,'#1b3d4c');for(let y=420;y<650;y+=25)rect(c,0,y,320,2,'#315969');for(let x=0;x<320;x+=50)rect(c,x,410,2,240,'#294d5d');
   rect(c,12,24,296,88,'#d8c9a4');rect(c,16,28,288,22,'#203f4a');text(c,'PORT RULES',24,44,'#f6ebce',12);const rules=rulesForStamp(Math.min(shift,2));
   text(c,`DAY ${rules.day}  ·  EXPIRY ${rules.day}+  ·  FACE = ID`,24,67,'#3d4742',10);text(c,rules.permit?'WORK PERMIT REQUIRED':'PERMIT NOT REQUIRED',24,84,'#3d4742',10);if(rules.matchingName)text(c,'NAME = ID  ·  SEAL A',24,101,'#3d4742',10);
   // Dock and traveler occupy the upper half; documents sit on the desk below.
   rect(c,0,191,320,168,'#819694');for(let y=200;y<360;y+=28)rect(c,0,y,320,2,'#667d7c');for(let x=28;x<320;x+=51)rect(c,x,194,2,164,'#6d8280');
   rect(c,0,238,320,10,'#183d47');for(let x=6;x<320;x+=40){rect(c,x,232,4,22,'#183d47');rect(c,x+4,237,32,4,'#d1af78')}
   rect(c,257,296,8,65,'#203e45');rect(c,205,297,60,8,'#f4e3bf');for(let x=207;x<257;x+=14)rect(c,x,297,7,8,'#e18774');
   rect(c,45,352,228,7,'#c19a6e');if(phase!=='ledger'||travelerDeparture){c.save();c.translate(travelerDeparture?travelerDeparture.x-86:0,0);rect(c,62,289,48,48,'#625c71');rect(c,68,334,14,25,'#263c46');rect(c,91,334,14,25,'#263c46');rect(c,58,305,11,29,'#6a5869');rect(c,107,306,10,29,'#6a5869');rect(c,72,266,30,32,['#bf9e84','#e3b49a','#8b6d5e'][traveler.face]);rect(c,70,261,34,9,['#4c3430','#a4774e','#242c36'][traveler.face]);rect(c,78,278,4,4,'#26343b');rect(c,94,278,4,4,'#26343b');rect(c,83,290,10,3,'#925f58');c.restore()}
   rect(c,0,360,320,94,'#785846');for(let y=371;y<454;y+=20)rect(c,0,y,320,2,'#654b3d');rect(c,14,374,4,66,'#d9b77e');rect(c,19,369,38,5,'#d9b77e');
   rect(c,18,435,284,14,'#74513d');rect(c,24,449,272,19,'#bd9168');rect(c,30,468,12,150,'#7c5741');rect(c,278,468,12,150,'#7c5741');rect(c,20,445,280,175,'#536762');rect(c,20,445,280,7,'#bf9671');   c.save();c.translate(paper.x-40,paper.y-454);rect(c,35,458,110,135,'#b89567');rect(c,40,454,108,134,'#f3e8ce');text(c,traveler.name,50,473,'#514d40',11);text(c,`EXP ${traveler.expiry}`,50,494,'#514d40',10);dot(c,65,550,11,['#bf9e84','#e3b49a','#8b6d5e'][traveler.portrait]);rect(c,57,538,16,5,['#4c3430','#a4774e','#242c36'][traveler.portrait]);text(c,checked.passport?'ID ✓':'ID',112,566,'#5c725e',9,'center');if(pending)text(c,pending.decision,92,521,pending.decision==='ADMIT'?'#568b71':'#b45c58',10,'center');c.restore();
   c.save();c.translate(permitSheet.x-195,permitSheet.y-380);rect(c,191,384,116,126,'#b89567');rect(c,195,380,112,126,'#efe3c6');text(c,'PERMIT',203,399,'#514d40',10);if(traveler.permit){text(c,traveler.permit.kind,250,425,'#514d40',10,'center');text(c,traveler.permit.name,250,447,'#514d40',10,'center');text(c,`SEAL ${traveler.permit.seal}`,250,470,'#514d40',10,'center')}else text(c,'NONE',250,447,'#a35f56',12,'center');text(c,checked.permit?'PASS ✓':'PASS',250,494,'#5c725e',9,'center');c.restore();
for(const [name,point] of Object.entries(stations)){if((phase==='departure'||phase==='complete')?['bell','passport','permit'].includes(name):['rope','flag'].includes(name))continue;const active=(phase==='call'&&name==='bell')||(phase==='inspect'&&['passport','permit','admit','refuse'].includes(name))||(phase==='ledger'&&name==='ledger')||(phase==='departure'&&name===(!rope?'rope':!signal?'flag':'ledger'));rect(c,point.x-24,point.y-15,48,30,active?'#859b86':'#5a716b');text(c,({bell:'BELL',passport:'ID',permit:'PASS',ledger:'BOOK',admit:'X ✓',refuse:'Z ✕',rope:'ROPE',flag:'FLAG'})[name],point.x,point.y+4,'#f7edce',9,'center')}
   rect(c,clerk.x-12,clerk.y+5,24,23,'#273f4d');rect(c,clerk.x-7,clerk.y-8,14,16,'#eac29f');rect(c,clerk.x-10,clerk.y-12,20,5,'#283e48');rect(c,clerk.x-13,clerk.y-14,26,4,'#d7b67d');rect(c,clerk.x-3,clerk.y+6,6,18,'#d8c79b');rect(c,clerk.x-13,clerk.y+11,4,10,'#ecc9a5');rect(c,clerk.x+9,clerk.y+11,4,10,'#ecc9a5');
   rect(c,0,0,320,20,'#132e3b');text(c,`STAMP HARBOR   SHIFT ${Math.min(shift+1,3)}/3`,8,14,'#f5e6c9',10);text(c,`PAY ${score}  CASE ${Math.min(ordinal+1,4)}/4`,16,654,'#fff2d1',11);text(c,feedback,160,675,'#f6e8c8',10,'center');
   if(action){const progress=clamp(action.elapsed/action.end,0,1);rect(c,76,391,168,7,'#6d5e4b');rect(c,76,391,168*progress,7,action.kind==='compare'?'#9dc6c4':'#dfb780');text(c,action.kind==='read'?'READING RULES':action.kind==='compare'?'COMPARING DOCUMENT':'STAMP CONTACT',160,387,'#f8efda',8,'center')}if(travelerDeparture){const x=travelerDeparture.decision==='ADMIT'?clamp(42+(1-travelerDeparture.left/3)*250,42,292):clamp(42-(1-travelerDeparture.left/1.8)*50,-8,42);dot(c,x,174,5,'#f5d7b2')}text(c,phase==='call'?'BELL: SPACE':phase==='comparing'?'COMPARING':phase==='stamping'?'STAMPING':phase==='inspect'?'ID/PASS: SPACE · X ADMIT · Z REFUSE':phase==='ledger'?(travelerDeparture?'WATCH TRAVELER':'BOOK: SPACE'):phase==='departure'?'ROPE → FLAG → BOOK: SPACE':phase==='sailing'?'PASSENGERS SAILING':aftermathStep===0?'WAVE: SPACE':aftermathStep===1?'BOOK: SPACE':'BELL: SPACE TO REPLAY',160,700,'#f4ddb3',9,'center');
   if(phase==='complete'){rect(c,45,350,230,72,'#142e38');text(c,'THREE SHIFTS COMPLETE',160,374,'#fff2d1',12,'center');text(c,`${ledger.filter(e=>e.correct).length}/12 CORRECT · PAY ${score}`,160,395,'#e4ce8d',10,'center')}
  },reset,
  snapshot(){return {barrier,paper:{...paper},permitSheet:{...permitSheet},phase,shift,ordinal,score,rope,signal,clerk:{...clerk},traveler:structuredClone(traveler),rules:rulesForStamp(Math.min(shift,2)),checked:{...checked},ledger:structuredClone(ledger),feedback,action:action&&{...action},pending:pending&&structuredClone(pending),arrival,ferryTravel,ledgerClosed,aftermathStep,rulesRead,busy,endTimer,travelerDeparture:travelerDeparture&&{...travelerDeparture}}}
 };
}
// Wash Wonder: landmark restoration, with a pressure-sensitive jet and material-specific nozzles.
function inWashJet(cell,jet){const dx=cell.x-jet.x,dy=cell.y-jet.y,along=dx*jet.dx+dy*jet.dy,across=Math.abs(dx*jet.dy-dy*jet.dx),width=jet.nozzle==='narrow'?5.6:6+along*.035;return along>=6&&along<=jet.range&&across<=width}
export function applyWashJet(cells,jet,dt){
 let cleared=0,removed=0,rust=0,chalk=0;
 for(const cell of cells){
  if(!inWashJet(cell,jet))continue;
  cell.wet=45/60;if(cell.hp<=0)continue;
  const strength=jet.nozzle==='narrow'?(cell.material==='rust'?3.8:.9):(cell.material==='chalk'?2.7:.28);
  const before=cell.hp;cell.hp=Math.max(0,Math.round((cell.hp-strength*jet.pressure*dt*60)*100)/100);removed+=before-cell.hp;if(cell.hp===0){cleared++;if(cell.material==='rust')rust++;else chalk++}
 }
 return {cleared,removed,rust,chalk};
}
export function createWashWonder(sound=()=>{},onFinish=()=>{}){
 const titles=['STRIPED CAROUSEL','SUNBEAM ENGINE','GLASS OBSERVATORY'],tap={x:34,y:588},gate={x:284,y:574},maxWater=168;
 const horseParts=[[[-14,0],[-10,-7],[4,-6],[6,-14],[11,-17],[16,-10],[13,-7],[9,-8],[7,1],[-6,3]],[[-9,0],[-6,2],[-12,11],[-15,10]],[[4,-1],[7,-1],[13,8],[10,10]],[[-10,-6],[-17,-10],[-18,-8],[-11,-4]]],roof=[[19,146],[80,88],[141,146]];
 const inside=(points,x,y)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit};
 const shape=(job,x,y)=>{
  if(job===0){x/=2;y/=2;return inside(roof,x,y)||(y>=144&&y<157&&x>=20&&x<140)||(y>=151&&y<226&&x>=74&&x<86)||(y>=149&&y<226&&((x>=32&&x<37)||(x>=122&&x<127)))||(y>=155&&y<220&&((x>=53&&x<55)||(x>=106&&x<108)))||horseParts.some(p=>inside(p,x-53,y-204)||inside(p,x-106,y-204))||(y>=227&&y<240&&x>=24&&x<137)||(y>=225&&y<231&&x>=27&&x<134)}
  if(job===1)return (y>=224&&y<=282&&x>=90&&x<=116)||(y>=264&&y<=418&&x>=194&&x<=264)||(y>=318&&y<=418&&x>=58&&x<=206)||(y>=410&&y<=438&&x>=40&&x<=278)||(y>=422&&y<=478&&[96,160,226].some(cx=>(x-cx)**2+(y-446)**2<900));
  return (y<=306&&((x-160)/112)**2+((y-300)/124)**2<=1)||(y>=304&&y<=342&&x>=44&&x<=276)||(y>=342&&y<=482&&x>=70&&x<=252);
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
   const hp=(material==='rust'?15:10)+Math.floor(Math.random()*6);cells.push({x,y,left,top,mask,material,motor,hp,max:hp,wet:0});
  }return cells
 }
 let player,keys,jobs,job,phase,water,nozzle,aim,notice,target,jet,refills,cleared,endTimer,motorOn,refillStarted,triggerHeld,lowWarn,sprayClock,missClock,nozzleCooldown,motorSpin,accumulator,washFrame=0;
 const near=(a,b,r=21)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
 function reset(){player={x:46,y:582};keys={};jobs=[0,1,2].map(jobCells);job=0;phase='wash';water=maxWater;nozzle='fan';aim={x:0,y:-1};notice='FAN FOR CHALK';target=-1;jet=null;refills=0;cleared=0;endTimer=0;motorOn=false;refillStarted=false;triggerHeld=false;lowWarn=false;sprayClock=0;missClock=0;nozzleCooldown=0;motorSpin=0;accumulator=0}
 function refill(dt){if(!near(player,tap)||water>=maxWater)return;if(!refillStarted)sound('wash-refill');refillStarted=true;const was=water;water=Math.min(maxWater,water+540*dt);if(was<maxWater&&water===maxWater){refills++;refillStarted=false;lowWarn=false;notice='TANK FULL';sound('wash-full')}}
 function spray(dt){
  if(water<=0){notice='LOW WATER: Z AT TAP';missClock+=dt;if(missClock>=.5){sound('wash-empty');missClock=0}return}
  const pressure=clamp(water/45,.12,1);jet={x:player.x+aim.x*20,y:player.y-16+aim.y*18,dx:aim.x,dy:aim.y,nozzle,pressure,range:380*(.55+pressure*.45)};
  water=Math.max(0,water-51*dt);const result=applyWashJet(jobs[job],jet,dt);cleared+=result.cleared;sprayClock+=dt;if(result.removed>0){missClock=0;if(sprayClock>=.25){sound('wash-spray');sprayClock=0}if(result.rust)sound('wash-rust');if(result.chalk)sound('wash-chalk')}else{missClock+=dt;if(missClock>=.4&&missClock-dt<.4)sound('wash-missed')}
  if(water<36){notice='LOW PRESSURE: TAP';if(!lowWarn){lowWarn=true;sound('wash-low')}}
  if(!motorOn&&jobs[job].every(c=>!c.motor||c.hp<=0)){motorOn=true;notice='MECHANISM RELEASED';sound('wash-motor')}
  if(jobs[job].every(c=>c.hp<=0)){phase='ribbon';notice='CLEAN! OPEN THE GATE';target=-1;sound('wash-restored')}
 }
 function openGate(){if(phase!=='ribbon'||!near(player,gate))return;if(job<2){job++;phase='wash';target=-1;motorOn=false;motorSpin=0;notice=job===1?'RUST NEEDS NARROW':'RINSE THE GLASS';sound('wash-gate')}else{phase='pack';onFinish({score:0,result:'PARK REOPENED'});notice='PARK REOPENED';endTimer=0;sound('wash-reopen')}}
 function autoIntent(){
  if(phase==='pack')return water<maxWater?{target:tap,refill:true}:{target:tap,finish:true};
  if(phase==='ribbon')return {target:gate,open:true};
  if(refillStarted||water<29)return {target:tap,refill:true};
  const cells=jobs[job];if(target<0||!cells[target]||cells[target].hp<=0){let best=Infinity;target=-1;for(let i=0;i<cells.length;i++){const cell=cells[i];if(cell.hp<=0)continue;const cost=Math.abs(cell.x-player.x)+(cell.material===(nozzle==='narrow'?'rust':'chalk')?0:34)+(480-cell.y)*.015;if(cost<best){best=cost;target=i}}}
  const cell=cells[target];if(!cell)return {};
  const wanted=cell.material==='rust'?'narrow':'fan';if(nozzle!==wanted)return {change:true};
  const range=380*(.55+clamp(water/45,.12,1)*.45);if(468-cell.y>range)return {target:tap,refill:true};
  if(Math.abs(player.x-cell.x)>4.8)return {target:{x:clamp(cell.x,24,296),y:clamp(cell.y+150,506,582)}};
  const currentJet={x:player.x+aim.x*20,y:player.y-16+aim.y*18,dx:aim.x,dy:aim.y,nozzle,range};
  if(aim.y===-1&&aim.x===0&&inWashJet(cell,currentJet))return {spray:true};
  return player.y-38-cell.y<16?{down:true}:{up:true};
 }
 function toggleNozzle(){if(nozzleCooldown>0)return;nozzle=nozzle==='fan'?'narrow':'fan';nozzleCooldown=18/60;notice=nozzle==='fan'?'FAN: CHALK':'NARROW: RUST';sound('wash-nozzle')}
 function step(auto){
  washFrame++;const dt=1/60;if(motorOn)motorSpin+=2.1*dt;for(const c of jobs[job])c.wet=Math.max(0,(c.wet||0)-dt);nozzleCooldown=nozzleCooldown-dt<1e-9?0:nozzleCooldown-dt;jet=null;let intent=auto?autoIntent():{dx:Number(!!(keys.ArrowRight||keys.d))-Number(!!(keys.ArrowLeft||keys.a)),dy:Number(!!(keys.ArrowDown||keys.s))-Number(!!(keys.ArrowUp||keys.w)),spray:!!keys[' '],refill:!!(keys.z||keys.Shift)};
  if(triggerHeld&&!intent.spray)sound('wash-release');triggerHeld=!!intent.spray;if(intent.change||!auto&&(keys.x||keys.j||keys.k))toggleNozzle()
  let dx=intent.dx||0,dy=intent.dy||0;
  if(intent.target&&!near(player,intent.target,2)){const x=intent.target.x-player.x,y=intent.target.y-player.y,d=Math.hypot(x,y),step=Math.min(d,198*dt);dx=x/d;dy=y/d;player.x+=dx*step;player.y+=dy*step}
  else if(intent.up)dy=-1;else if(intent.down)dy=1;
  if(!intent.target){const length=Math.hypot(dx,dy)||1;player.x+=dx/length*(intent.spray?86:198)*dt;player.y+=dy/length*(intent.spray?86:198)*dt}
  player.x=clamp(player.x,20,300);player.y=clamp(player.y,502,628);
  if((dx||dy)&&!intent.spray)aim=Math.abs(dx)>Math.abs(dy)?{x:Math.sign(dx),y:0}:{x:0,y:Math.sign(dy)};
  const filling=!!intent.refill&&near(player,tap)&&water<maxWater;
  if(filling)refill(dt);
  if(!filling&&(intent.open||(intent.spray&&phase==='ribbon')))openGate();
  if(!filling&&!auto&&intent.spray&&phase==='pack'&&water>=maxWater&&near(player,tap)){const remaining=accumulator;reset();accumulator=remaining;return}
  if(intent.finish&&phase==='pack'&&near(player,tap)){const remaining=accumulator;reset();accumulator=remaining;return}
  if(!filling&&intent.spray&&phase==='wash')spray(dt);
 }
 function update(dt,auto){accumulator+=Math.min(Math.max(dt,0),.05);while(accumulator+1e-9>=1/60){accumulator=Math.max(0,accumulator-1/60);step(auto)}}
 function draw(c){
  rect(c,0,0,320,720,'#a8d8dc');dot(c,261,78,18,'#f4d887');rect(c,18,88,58,8,'#f7efd7');rect(c,208,98,70,8,'#f7efd7');
  c.fillStyle='#78a696';c.beginPath();c.moveTo(0,260);for(const [x,y] of [[0,220],[40,184],[85,200],[125,180],[190,202],[240,178],[284,195],[320,180],[320,300]])c.lineTo(x,y);c.closePath();c.fill();
  rect(c,0,260,320,232,'#87a668');for(const x of [12,306]){rect(c,x-5,248,10,100,'#bb784d');dot(c,x,235,39,'#507e61');dot(c,x-15,220,25,'#356355');dot(c,x+13,213,26,'#78a16b')}
  rect(c,0,492,320,160,'#ccb993');
  for(let y=500;y<650;y+=26){rect(c,0,y,320,2,'#e8d7b2');for(let x=y%52;x<320;x+=56)rect(c,x,y,2,26,'#b5a27f')}
  if(job===0){rect(c,48,448,224,28,'#b8794f');rect(c,148,224,24,224,'#e8bb65');c.fillStyle='#e6b762';c.beginPath();c.moveTo(160,174);c.lineTo(38,294);c.lineTo(282,294);c.closePath();c.fill();for(const x of [40,80,120,160,200,240]){c.fillStyle=(x/40)%2?'#fff0cf':'#d46d5e';c.beginPath();c.moveTo(160,176);c.lineTo(x,294);c.lineTo(x+40,294);c.closePath();c.fill()}rect(c,40,292,240,18,'#fff0cf');for(const x of [68,106,214,250])rect(c,x,294,6,154,'#e6b762');for(const x of [106,212]){const lift=motorOn?Math.sin(motorSpin+(x===106?0:Math.PI))*10:0;c.save();c.translate(x,408+lift);for(let i=0;i<horseParts.length;i++){const points=horseParts[i];c.fillStyle=i===3?'#bb784d':'#fff2d3';c.beginPath();c.moveTo(points[0][0]*2,points[0][1]*2);for(const point of points.slice(1))c.lineTo(point[0]*2,point[1]*2);c.closePath();c.fill()}rect(c,-10,-12,20,6,'#3c71b5');c.restore()}}
  else if(job===1){rect(c,58,318,150,100,'#4176af');rect(c,192,264,72,154,'#d87764');rect(c,90,224,26,65,'#bb784d');for(const x of [96,160,226]){dot(c,x,446,24,'#263e42');const a=motorOn?motorSpin:0;for(let i=0;i<4;i++){const t=a+i*Math.PI/2;rect(c,x+Math.cos(t)*14-3,446+Math.sin(t)*14-3,6,6,'#e6b762')}dot(c,x,446,4,'#b6d5d3')}}
  else {dot(c,160,300,110,'#5f9dba');rect(c,44,304,232,38,'#e6b762');rect(c,70,342,180,130,'#79a8dd');for(let x=90;x<250;x+=40)rect(c,x,350,6,110,'#fff2d3');const tx=160+(motorOn?Math.sin(motorSpin)*44:0);rect(c,tx-4,264,8,52,'#fff2d3');rect(c,tx-22,252,44,14,'#e6b762');rect(c,tx-22,252,8,14,'#263e42')}
  for(let i=0;i<jobs[job].length;i++){const cell=jobs[job][i],ratio=cell.hp/cell.max,wet=cell.wet>0&&!(motorOn&&cell.motor);if(cell.hp<=0&&!wet)continue;for(let bit=0;bit<16;bit++){if(!(cell.mask&(1<<bit)))continue;const px=bit%4,py=Math.floor(bit/4),texture=(px*3+py*5+i)%11,x=cell.left+px*2,y=cell.top+py*2;if(cell.hp>0&&(ratio>.55||ratio>.25&&texture<7||texture<3))rect(c,x,y,2,2,cell.material==='rust'?(texture%4===0?'#a17955':'#825b47'):(texture%4===0?'#b5a78c':'#9f947e'));if(wet&&py===3&&px<2)rect(c,x,y,2,2,'#76d2e5');if(wet&&cell.hp<=0&&(i+washFrame)%17===0&&px===1&&py===1)rect(c,x,y,2,2,'#fff2d3')}}
  rect(c,tap.x-18,tap.y-20,36,40,'#3c71b5');text(c,'TAP',tap.x,625,'#263e42',10,'center');rect(c,gate.x-14,540,4,58,'#bb784d');rect(c,gate.x+10,540,4,58,'#bb784d');if(phase!=='pack')rect(c,gate.x-12,552,24,5,'#d97765');
  dot(c,player.x,player.y-13,8,'#f1d1a5');rect(c,player.x-8,player.y-5,16,20,'#3c71b5');
  if(jet){c.strokeStyle='#eaffff';c.lineWidth=nozzle==='fan'?7:3;c.beginPath();c.moveTo(jet.x,jet.y);c.lineTo(jet.x+jet.dx*jet.range,jet.y+jet.dy*jet.range);c.stroke()}
  rect(c,0,0,320,50,'#263e42');text(c,'WASH WONDER',10,19,'#fff2d3',15);text(c,`${job+1}/3`,301,19,'#e6b762',14,'right');text(c,titles[job],10,41,'#fff2d3',12);
  rect(c,0,650,320,70,'#263e42');text(c,notice,10,673,'#fff2d3',11);text(c,`${nozzle.toUpperCase()}/${nozzle==='fan'?'CHALK':'RUST'}  WATER ${Math.ceil(water)}`,10,699,'#76d2e5',11);
  if(phase==='pack')text(c,'PARK REOPENED',160,480,'#fff2d3',18,'center');
 }
 reset();return {input(k,down){keys[k]=down},update,draw,reset,snapshot(){return {job,phase,water,nozzle,jet:jet&&{...jet},aim:{...aim},player:{...player},remaining:jobs[job].filter(c=>c.hp>0).length,cells:jobs[job].map(c=>({...c})),cleared,refills,motorOn,motorSpin,notice,nozzleCooldown}}};
}
function wash(sound,onFinish){return createWashWonder(sound,onFinish)}

const factories={'stamp-harbor':stamp,'wash-wonder':wash};
export function createFeatureGame40(canvas,id,options={}){
 const ctx=canvas.getContext('2d');if(!ctx||!factories[id])throw new Error(`Unknown game: ${id}`);
 const audioEnabled=!!options.audioEnabled,audio=createGameAudio(audioEnabled&&!options.paused);
 let game,interactive=!!options.interactive,context=options.context??(interactive?'manual-player':'gallery-preview'),paused=!!options.paused,disposed=false,frame,last=0,remainder=0,result=null,resultTime=0;
 const held=new Set(), reports=createRunReporter({gameId:id,ruleVersion:1,actor:interactive?'human':'ai',context,onResult:options.onResult,onError:options.onError});reports.setPaused(paused);
 function release(){if(game)for(const k of held)game.input(k,false);held.clear()}
 function beginRun(mode={}){if(disposed)return;reports.abandon();release();game?.destroy?.();const nextInteractive=!!(mode.interactive??interactive),sameMode=nextInteractive===interactive;interactive=nextInteractive;context=mode.context??(sameMode||context==='embed'?context:interactive?'manual-player':'watch-player');result=null;resultTime=0;remainder=0;last=0;canvas.tabIndex=interactive?0:-1;const finish=reports.beginRun({actor:interactive?'human':'ai',context}),runId=reports.getRun().runId;game=factories[id](audio.emit,payload=>{if(reports.getRun()?.runId!==runId)return;const score=['phase-foundry','gloam-trawler','wash-wonder'].includes(id)?reports.getRun()?.durationMs:payload.score;const record=finish({...payload,score});if(record&&reports.getRun()?.runId===runId){release();result=record;resultTime=0}})}
 beginRun({interactive,context});canvas.setAttribute('aria-label',`${featureGames40.find(g=>g.id===id).name} game`);
 function resize(){const b=canvas.getBoundingClientRect(),r=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(b.width*r));canvas.height=Math.max(1,Math.round(b.height*r))}
 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(canvas);resize();
 function key(e,d){if(disposed||paused||!interactive)return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(result){if(d&&k==='Enter'){e.preventDefault();beginRun({interactive:true,context})}else if(k==='Escape')e.preventDefault();return}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','x','z','Shift','j','k'].includes(k)){e.preventDefault();if(id==='phase-foundry'&&d&&held.has(k)&&[' ','x','z'].includes(k))return;if(d){held.add(k);if(audioEnabled&&e.isTrusted)unlockSound()}else held.delete(k);game.input(k,d)}}
 const kd=e=>key(e,true),ku=e=>key(e,false),pointer=()=>{if(interactive)canvas.focus?.({preventScroll:true})};canvas.addEventListener('keydown',kd);canvas.addEventListener('keyup',ku);canvas.addEventListener('blur',release);canvas.addEventListener('pointerdown',pointer);
 function tick(t){if(disposed||paused)return;if(!interactive&&last&&t-last<32){frame=requestAnimationFrame(tick);return}const dt=last?Math.min((t-last)/1000,.05):0;last=t;
 if(result){resultTime+=dt;if(resultTime>=(interactive?12:1)){if(interactive){beginRun({interactive:false,context:context==='embed'?'embed':'watch-player'});options.onAttract?.()}else beginRun({interactive:false,context})}}
 else {reports.advance(dt);game.update(dt,!interactive);}
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#10151c';ctx.fillRect(0,0,canvas.width,canvas.height);const scale=Math.min(canvas.width/W,canvas.height/H);ctx.setTransform(scale,0,0,scale,(canvas.width-W*scale)/2,(canvas.height-H*scale)/2);game.draw(ctx);
 if(result){ctx.fillStyle='#17232e';ctx.fillRect(W*.1,H*.4,W*.8,95);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 14px monospace';ctx.fillText(result.result,W/2,H*.4+30);ctx.fillText(`SCORE ${result.score}`,W/2,H*.4+52);ctx.font='10px monospace';ctx.fillText(interactive?'ENTER TO PLAY AGAIN':'NEXT RUN SOON',W/2,H*.4+75)}frame=requestAnimationFrame(tick)}
 if(!paused)frame=requestAnimationFrame(tick);return {beginRun,restart(){beginRun({interactive,context})},setInteractive(v){if(disposed)return;v=!!v;if(v!==interactive)beginRun({interactive:v,context:context==='embed'?'embed':v?'manual-player':'watch-player'});else{release();game.clearAccumulator?.();remainder=0;last=0}},getSessionState(){return result?'result':'playing'},pause(){if(!paused&&!disposed){paused=true;reports.setPaused(true);release();game.clearAccumulator?.();audio.setActive(false);cancelAnimationFrame(frame);last=0;remainder=0}},resume(){if(paused&&!disposed){paused=false;reports.setPaused(false);audio.setActive(audioEnabled);last=0;frame=requestAnimationFrame(tick)}},resize,destroy(){reports.destroy();release();game.destroy?.();audio.destroy();disposed=true;cancelAnimationFrame(frame);observer?.disconnect();canvas.removeEventListener('keydown',kd);canvas.removeEventListener('keyup',ku);canvas.removeEventListener('blur',release);canvas.removeEventListener('pointerdown',pointer)}}
}
