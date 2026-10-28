import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [id, ...words] = process.argv.slice(2);
if (!id || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) { console.error('Usage: npm run new-game -- my-game "My Game"'); process.exit(1); }
const sourceFiles = (await readdir(resolve('src'))).filter(file => /^feature-games\d*\.js$/.test(file));
const builtins = await Promise.all(['games.js','more-games.js','extra-games.js',...sourceFiles].map(file => import(pathToFileURL(resolve('src',file)).href)));
const known = builtins.flatMap(m => Object.entries(m).find(([key]) => /^(games|moreGames|extraGames|featureGames\d*)$/.test(key))?.[1] || []);
await mkdir(resolve('src/custom/games'), {recursive:true});
const existingFiles = (await readdir(resolve('src/custom/games'))).filter(file => file.endsWith('.js'));
for (const file of existingFiles) { const module = await import(pathToFileURL(resolve('src/custom/games',file)).href); if (module.metadata) known.push(module.metadata); }
if (known.some(game => game.id === id)) { console.error(`Game ID already exists: ${id}`); process.exit(1); }
const name = words.join(' ') || id.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ');
const target = resolve('src/custom/games', `${id}.js`);
const source = `// Replace this small working example with your own game logic.\nexport const metadata = ${JSON.stringify({id,name,category:'ARCADE',description:'Collect ten sparks.',controls:'Arrow keys to move',accent:'#2de2e6'},null,2)};\n\nexport function create({finish} = {}) {\n  let x=160, y=360, target={x:200,y:250}, score=0; const keys={};\n  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));\n  return {\n    input(key,down){ keys[key]=down; },\n    update(dt,auto){\n      let dx=auto?Math.sign(target.x-x):Number(!!keys.ArrowRight)-Number(!!keys.ArrowLeft);\n      let dy=auto?Math.sign(target.y-y):Number(!!keys.ArrowDown)-Number(!!keys.ArrowUp);\n      x=clamp(x+dx*100*dt,12,308); y=clamp(y+dy*100*dt,12,708);\n      if(Math.hypot(x-target.x,y-target.y)<15){score++;if(score>=10)finish?.({score,result:'SPARKS COLLECTED'});target={x:30+Math.random()*260,y:50+Math.random()*620};}\n    },\n    draw(ctx){\n      ctx.fillStyle='#14262b';ctx.fillRect(0,0,320,720);ctx.fillStyle='#2de2e6';ctx.fillRect(x-8,y-8,16,16);\n      ctx.fillStyle='#ffe395';ctx.beginPath();ctx.arc(target.x,target.y,7,0,Math.PI*2);ctx.fill();\n      ctx.fillStyle='#fff';ctx.font='16px monospace';ctx.fillText('SCORE '+score,16,28);\n    }\n  };\n}\n`;
await mkdir(resolve('src/custom/games'), {recursive:true});
try { await writeFile(target, source, {flag:'wx'}); console.log(`Created ${target}. It will appear in the gallery automatically.`); }
catch(error){ if(error.code==='EEXIST'){ console.error(`Game already exists: ${target}`); process.exit(1); } throw error; }



