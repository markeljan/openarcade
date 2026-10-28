// Optional result-state reporting keeps game-over cards visible on Escape.
// Games without the method retain the existing manual-to-watch behavior.
export function handlePlayerEscape(event, playing, player, watch) {
  if (event.key !== 'Escape' || !playing) return false;
  event.preventDefault();
  if (player?.getSessionState?.() !== 'result') watch();
  return true;
}
