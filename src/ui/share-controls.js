/** Manage sharing for the currently selected game. Call share() directly from a click. */
export function createShareControls({ navigator: nav = globalThis.navigator, onStatus = () => {} } = {}) {
  let selection = null;
  let revision = 0;
  let disposed = false;

  function setSelection(game, url) {
    if (disposed) return;
    revision++;
    selection = game && url ? { game: { id: game.id, name: game.name }, url: String(url) } : null;
    onStatus({ message: '', url: '' });
  }

  async function share() {
    if (disposed || !selection) return;
    const current = selection;
    const token = ++revision;
    const active = () => !disposed && token === revision;
    const report = (message, url = '') => { if (active()) onStatus({ message, url }); };

    if (typeof nav?.share === 'function') {
      try {
        // No asynchronous work precedes this call, preserving transient activation.
        await nav.share({ title: current.game.name, url: current.url });
        report('Share opened.');
        return;
      } catch (error) {
        if (!active()) return;
        if (error?.name === 'AbortError') {
          report('Sharing cancelled.');
          return;
        }
      }
    }
    if (!active()) return;
    try {
      if (typeof nav?.clipboard?.writeText !== 'function') throw new Error('Clipboard unavailable');
      await nav.clipboard.writeText(current.url);
      report('Link copied.', current.url);
    } catch {
      report('Copy this link manually:', current.url);
    }
  }

  function dispose() {
    disposed = true;
    selection = null;
    revision++;
  }
  return { setSelection, share, dispose };
}
