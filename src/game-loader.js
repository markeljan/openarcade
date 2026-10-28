const loaders = import.meta.glob(['./feature-games*.js','./games.js','./more-games.js','./extra-games.js']);
const factories = new Map();

// Loading never constructs a canvas runtime. Callers can reject obsolete loads.
export async function loadGameFactory(game) {
  const path=game?.modulePath;
  if(!loaders[path]) throw new Error(`Game unavailable: ${game?.id ?? 'unknown'}`);
  if(!factories.has(path)) {
    const loading=loaders[path]();
    factories.set(path,loading);
    loading.catch(()=>{if(factories.get(path)===loading)factories.delete(path)});
  }
  const module=await factories.get(path), make=module[game.factoryExport];
  if(typeof make!=='function') throw new Error(`Game unavailable: ${game.id}`);
  return make;
}
