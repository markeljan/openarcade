import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { launchBrowser } from './s12-browser.mjs';
const args=process.argv.slice(2);
const arg=(name,fallback)=>args.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3)||fallback;
const dir=resolve('public/social');
const out=resolve(arg('out',''));
if (!arg('out','')) throw Error('Pass --out=<temporary output directory>');
const base=arg('url','http://127.0.0.1:4312/');
const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
const games=Object.entries(manifest.games);
const browser=await launchBrowser({url:new URL('/scripts/s12-capture.html',base).href});
try {
  await mkdir(out,{recursive:true});
  for (let start=0;start<games.length;start+=56) {
    const group=games.slice(start,start+56);
    const data=group.map(([id])=>({id,src:new URL(`/social/games/${encodeURIComponent(id)}.png`,base).href}));
    await browser.run(`window.reviewSheet=document.createElement('canvas'); reviewSheet.width=1504; reviewSheet.height=980; window.reviewContext=reviewSheet.getContext('2d'); reviewContext.fillStyle='#11191b'; reviewContext.fillRect(0,0,1504,980); true`);
    for (let i=0;i<data.length;i++) {
      const item=data[i];
      await browser.run(`(async()=>{const image=new Image();image.src=${JSON.stringify(item.src)};await image.decode();const c=window.reviewContext,x=(${i}%8)*188,y=Math.floor(${i}/8)*140;c.fillStyle='#24302e';c.fillRect(x+2,y+2,184,136);const scale=Math.min(180/590,112/550),w=590*scale,h=550*scale;c.drawImage(image,575,40,590,550,x+(188-w)/2,y+4,w,h);c.fillStyle='#fff';c.font='13px system-ui';c.fillText(${JSON.stringify(item.id)},x+5,y+132,178);return true})()`);
    }
    const png=await browser.run("window.reviewSheet.toDataURL('image/png')");
    const file=join(out,`contact-${Math.floor(start/56)+1}.png`);
    await writeFile(file,Buffer.from(png.slice(png.indexOf(',')+1),'base64'));
    console.log(file);
  }
} finally {await browser.close()}
