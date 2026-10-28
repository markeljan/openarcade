import {featureRegistry} from './feature-registry.js';
import {legacyCatalog} from './legacy-catalog.js';

// Deliberately imports metadata only: safe in Node/build tools and the browser.
export const gameCatalog = Object.freeze([
  ...featureRegistry.flatMap(({path,games}) => games.map(game => ({
    ...game, modulePath:path,
    factoryExport:`createFeatureGame${path.match(/feature-games(\d*)\.js$/)[1]}`,
    width:320, height:720,
  }))),
  ...legacyCatalog,
].map(game => Object.freeze(game)));
const byId = new Map(gameCatalog.map(game => [game.id,game]));
if(byId.size !== gameCatalog.length) throw new Error('Duplicate game catalog ID');
export function getGame(id) { return byId.get(id) ?? null; }
