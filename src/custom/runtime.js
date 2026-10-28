// Drop a module exporting `metadata` and `create()` into custom/games.
// Vite discovers it automatically; the gallery supplies this shared lifecycle.
import { createCanvasGame } from './canvas-game.js';
const modules = import.meta.glob('./games/*.js', { eager: true });
const entries = Object.values(modules).map(module => ({ metadata: module.metadata, create: module.create }));
for (const entry of entries) {
  if (!entry.metadata?.id || !entry.metadata?.name || typeof entry.create !== 'function') throw new Error('Invalid custom game module');
}
export const customGames = entries.map(entry => entry.metadata);
export function createCustomGame(canvas, id, options = {}) {
  const entry = entries.find(item => item.metadata.id === id);
  if (!entry) throw new Error(`Unknown custom game: ${id}`);
  return createCanvasGame(canvas, entry.metadata, entry.create, options);
}
