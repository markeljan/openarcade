import {existsSync,readFileSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {gameCatalog,getGame} from '../src/catalog.js';
import {gameUrl,embedUrl,siteOrigin} from '../src/social/urls.js';

export const SITE_TITLE='OpenArcade — tiny games, big side quests';
export const SITE_DESCRIPTION='Play 112 free browser games on OpenArcade. Watch the games play, pick a favorite, and take control.';
const FALLBACK_IMAGE={path:'/social/site-card-v1.png',width:1200,height:630,alt:'OpenArcade — tiny games, big side quests'};
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function readImageManifest(root) {
  const file=resolve(root,'public/social/manifest.json');
  if(!existsSync(file)) return {games:{}};
  const manifest=JSON.parse(readFileSync(file,'utf8'));
  if(manifest.version!==1 || !manifest.games || typeof manifest.games!=='object') throw new Error('Invalid social image manifest');
  for(const [id,image] of [...Object.entries(manifest.games),...(manifest.homepage?[['homepage',manifest.homepage]]:[])]) {
    const target=resolve(root,'public','.'+image.path), base=resolve(root,'public')+sep;
    if((id!=='homepage'&&!getGame(id)) || !(id==='homepage'?/^\/social\/[a-z0-9_.-]+\.png$/:/^\/social\/games\/[a-z0-9/_.-]+\.png$/).test(image.path) || !target.startsWith(base) ||
       !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width<1 || image.height<1 ||
       typeof image.version!=='string' || !/^[a-zA-Z0-9._-]+$/.test(image.version) || !existsSync(target))
      throw new Error(`Invalid or missing social image: ${id}`);
  }
  return manifest;
}

export function socialMetadata(game,{origin,manifest={games:{}},playerEnabled=false,embedPage=false}={}) {
  origin=siteOrigin(origin);
  const title=game?`${game.name} — OpenArcade`:SITE_TITLE;
  const description=game?`${game.description} Play ${game.name} free on OpenArcade.`:SITE_DESCRIPTION;
  const image=(game?manifest.games[game.id]:manifest.homepage)??FALLBACK_IMAGE;
  const imageAlt=image.alt??(game?`${game.name} gameplay on OpenArcade`:FALLBACK_IMAGE.alt);
  const imageUrl=new URL(image.path,origin);
  if(image.version)imageUrl.searchParams.set('v',image.version);
  const canonical=(game&&embedPage?embedUrl(game.id,origin):gameUrl(game?.id,origin)).href;
  const tags=[
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    ...Object.entries({'og:type':'website','og:site_name':'OpenArcade','og:title':title,'og:description':description,'og:url':canonical,'og:image':imageUrl.href,'og:image:type':'image/png','og:image:width':image.width,'og:image:height':image.height,'og:image:alt':imageAlt}).map(([key,value])=>`<meta property="${key}" content="${escapeHtml(value)}">`),
    ...Object.entries({'twitter:card':game&&playerEnabled?'player':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':imageUrl.href,'twitter:image:alt':imageAlt}).map(([key,value])=>`<meta name="${key}" content="${escapeHtml(value)}">`),
  ];
  if(game&&playerEnabled) tags.push(`<meta name="twitter:player" content="${escapeHtml(embedUrl(game.id,origin).href)}">`,'<meta name="twitter:player:width" content="720">','<meta name="twitter:player:height" content="720">');
  return tags.join('\n  ');
}

export function withMetadata(html,game,options) {
  return html.replace(/<!-- social:start -->[\s\S]*?<!-- social:end -->/,`<!-- social:start -->\n  ${socialMetadata(game,options)}\n  <!-- social:end -->`);
}
export function notFoundHtml() {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Game not found — OpenArcade</title></head><body style="background:#08090d;color:#f4f6fa;font:18px system-ui;padding:2rem"><main><h1>Game not found</h1><p>This game is unavailable or the link is incorrect.</p><a style="color:#2de2e6" href="/">Explore OpenArcade</a></main></body></html>';
}

export function socialPagesPlugin(options={}) {
  let config,metadataOptions;
  const route=pathname=>/^\/(games|embed)\/([^/]+)\/?$/.exec(pathname);
  function middleware(server,preview=false) {
    return async(req,res,next)=>{
      const url=new URL(req.url,'http://localhost'), match=route(url.pathname);
      if(!match && !/^\/(?:games|embed)(?:\/|$)/.test(url.pathname))return next();
      let id;try{id=decodeURIComponent(match?.[2]??'')}catch{}
      const game=getGame(id);
      if(!game) {res.statusCode=404;res.setHeader('Content-Type','text/html; charset=utf-8');res.end(notFoundHtml());return;}
      if(preview) { req.url=`/${match[1]}/${game.id}.html${url.search}`;return next(); }
      try {
        const entry=match[1]==='embed'?'embed.html':'index.html';
        if(!existsSync(resolve(config.root,entry)))return next();
        let html=readFileSync(resolve(config.root,entry),'utf8');
        html=withMetadata(html,game,{...metadataOptions,embedPage:match[1]==='embed'});
        html=await server.transformIndexHtml(req.url,html);
        res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
      }catch(error){next(error)}
    };
  }
  return {
    name:'openarcade-social-pages',enforce:'post',
    configResolved(value) {config=value;metadataOptions={...options,manifest:readImageManifest(config.root)};},
    configureServer(server){server.middlewares.use(middleware(server));},
    configurePreviewServer(server){server.middlewares.use(middleware(server,true));},
    generateBundle(_output,bundle) {
      const page=bundle['index.html'];
      if(!page)throw new Error('Missing Vite homepage output');
      const template=String(page.source);
      page.source=withMetadata(template,null,metadataOptions);
      for(const game of gameCatalog) this.emitFile({type:'asset',fileName:`games/${game.id}.html`,source:withMetadata(template,game,metadataOptions)});
      const embed=bundle['embed.html'];
      if(options.playerEnabled&&!embed)throw new Error('Player Cards require the dedicated embed entry');
      if(embed)for(const game of gameCatalog)this.emitFile({type:'asset',fileName:`embed/${game.id}.html`,source:withMetadata(String(embed.source),game,{...metadataOptions,embedPage:true})});
      this.emitFile({type:'asset',fileName:'404.html',source:notFoundHtml()});
      this.emitFile({type:'asset',fileName:'sitemap.xml',source:`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[null,...gameCatalog].map(game=>`<url><loc>${escapeHtml(gameUrl(game?.id,siteOrigin(options.origin)).href)}</loc></url>`).join('')}</urlset>`});
    },
  };
}
