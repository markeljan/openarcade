import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {defineConfig,loadEnv} from 'vite';
import {socialPagesPlugin} from './scripts/social-pages.mjs';

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'VITE_');
  return {
    plugins:[socialPagesPlugin({origin:env.VITE_SITE_ORIGIN,playerEnabled:env.VITE_X_PLAYER_ENABLED==='true'&&env.VITE_EMBEDS_ENABLED!=='false'})],
    build:{rollupOptions:{input:{main:resolve('index.html'),...(existsSync('embed.html')?{embed:resolve('embed.html')}:{})}}},
  };
});
