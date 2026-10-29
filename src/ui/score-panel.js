/** Mount a score and leaderboard panel. The caller owns score submission state. */
export function mountScorePanel(root, { client, onSignIn = () => {}, onRetry = () => {} }) {
  const doc = root.ownerDocument;
  const make = (tag, className) => { const node = doc.createElement(tag); node.className = className; return node; };
  const panel = make('section', 'score-panel');
  panel.setAttribute('aria-label', 'Scores');
  const result = make('div', 'score-result');
  const heading = make('h3', 'score-heading'); heading.textContent = 'Leaderboard';
  const filters = make('div', 'score-filters');
  filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', 'Leaderboard filters');
  const players = make('button', 'score-filter'); players.type = 'button'; players.textContent = 'Players';
  const ai = make('button', 'score-filter'); ai.type = 'button'; ai.textContent = 'AI';
  filters.append(players, ai);
  const board = make('div', 'score-board'); board.setAttribute('aria-live', 'polite');
  panel.append(result, heading, filters, board); root.append(panel);
  let game = null, filter = 'players', generation = 0, disposed = false, resultKey = null;
  function text(parent, tag, className, value) {
    const node = make(tag, className); node.textContent = value; parent.append(node); return node;
  }
  function clear(node) { node.replaceChildren(); }
  function controls() {
    players.setAttribute('aria-pressed', String(filter === 'players'));
    ai.setAttribute('aria-pressed', String(filter === 'ai'));
  }
  function renderBoard(state) {
    if (disposed) return;
    clear(board);
    if (!state || state.status === 'loading') { text(board, 'p', 'score-board-status', 'Loading leaderboard…'); return; }
    if (state.status === 'unavailable' || state.status === 'error') {
      text(board, 'p', 'score-board-status', 'Leaderboard unavailable.');
      const retry = text(board, 'button', 'score-action', 'Retry leaderboard'); retry.type = 'button';
      retry.addEventListener('click', () => { void refresh().catch(() => {}); });
      return;
    }
    const data = state.data || state;
    text(board, 'p', 'score-board-meta', `Top 10 ${filter === 'ai' ? 'AI' : 'players'} · Client-reported`);
    text(board, 'p', 'score-board-rules', `Rule version: ${data.ruleVersion ?? 'unknown'} · ${data.metric ?? 'Score'} · ${data.units ?? 'units unspecified'} · ${data.order ?? 'order unspecified'}`);
    const list = make('ol', 'score-list');
    for (const entry of (data.entries || []).slice(0, 10)) {
      const name = entry.displayName || (entry.guest ? 'Guest' : 'Player');
      const prefix = [entry.actor === 'ai' ? 'AI' : '', entry.guest ? 'Guest' : ''].filter(Boolean).join(' · ');
      const attribution = entry.attribution ? ` · From ${entry.attribution === 'x' ? 'X' : entry.attribution} (unverified)` : '';
      text(list, 'li', 'score-entry', `${prefix ? `${prefix} · ` : ''}${name}: ${entry.score} ${data.units || ''}${attribution}`.trim());
    }
    board.append(list);
    if (!data.entries?.length) text(board, 'p', 'score-board-empty', 'No scores yet.');
    const best = data.personalBest;
    const bestMessage = data.personalBestStatus === 'signed-out' ? 'Sign in to see your personal best.' :
      data.personalBestStatus === 'unavailable' ? 'Personal best unavailable.' :
      best ? `Personal best: ${best.score} ${data.units || ''}`.trim() : 'Personal best: none yet';
    text(board, 'p', 'score-personal-best', bestMessage);
  }
  async function refresh() {
    if (disposed || !game) return;
    const token = ++generation, id = game.id, selectedFilter = filter;
    renderBoard({ status: 'loading' });
    const current = () => !disposed && token === generation;
    const show = data => {
      if (!current()) return;
      if ((data?.gameId != null && data.gameId !== id) || (data?.filter != null && data.filter !== selectedFilter)) renderBoard({ status: 'unavailable' });
      else renderBoard({ data });
    };
    try {
      const data = await client.leaderboard(id, { filter: selectedFilter });
      show(data);
    } catch (error) {
      if (!current()) return;
      if (Number(error?.status) !== 401 && !['identity-unavailable', 'sign-in-required'].includes(error?.code)) {
        renderBoard({ status: 'unavailable' }); return;
      }
      try {
        const data = await client.leaderboard(id, { filter: selectedFilter, includePersonalBest: false });
        show({ ...data, personalBest: null, personalBestStatus: 'unavailable' });
      } catch {
        if (current()) renderBoard({ status: 'unavailable' });
      }
    }
  }
  function setGame(next) {
    if (disposed) return;
    generation++;
    game = next;
    filter = 'players'; controls(); clear(result); resultKey = null;
    if (game) return refresh();
    clear(board);
  }
  function renderResult(run, state, { units = run?.units } = {}) {
    if (disposed) return;
    if (run && (!game || run.gameId !== game.id || (state?.runId && state.runId !== run.runId))) return;
    const key = JSON.stringify([run, state, units]);
    if (key === resultKey) return;
    resultKey = key;
    clear(result);
    if (!run) return;
    const status = typeof state === 'string' ? state : state?.status;
    text(result, 'h3', 'score-result-title', `${run.actor === 'ai' ? 'AI' : 'Player'} result`);
    text(result, 'p', 'score-result-terminal', `Result: ${run.result ?? 'unknown'}`);
    text(result, 'p', 'score-result-value', `${run.score} ${units || ''}`.trim());
    text(result, 'p', 'score-result-rule', `Rule version: ${run.ruleVersion}`);
    const messages = {
      pending: 'Score pending.', saving: 'Saving score…', 'queued-auth': 'Sign in to save this score',
      saved: 'Score saved.', retry: 'Score could not be saved. Try again.',
      nonqualifying: 'Score did not qualify.', unavailable: 'Score saving unavailable.', expired: 'This score has expired.'
    };
    text(result, 'p', 'score-result-status', messages[status] || 'Score status unavailable.').setAttribute('role', 'status');
    if (state?.redirectSafe === false && run.actor !== 'ai' && ['pending', 'queued-auth', 'retry'].includes(status)) {
      text(result, 'p', 'score-result-durability', 'Stored only in this tab. Reload or external sign-in may lose this run.');
    }
    if (status === 'queued-auth' && run.actor !== 'ai') {
      const action = text(result, 'button', 'score-action', 'Sign in to save this score'); action.type = 'button';
      action.addEventListener('click', () => { if (!disposed) onSignIn(run); });
    } else if (status === 'retry' || status === 'unavailable') {
      const action = text(result, 'button', 'score-action', 'Retry saving'); action.type = 'button';
      action.addEventListener('click', () => { if (!disposed) onRetry(run); });
    }
  }
  function select(value) { if (disposed || value === filter) return; filter = value; controls(); refresh(); }
  const selectPlayers = () => select('players'), selectAi = () => select('ai');
  players.addEventListener('click', selectPlayers); ai.addEventListener('click', selectAi); controls();
  return { setGame, renderResult, renderBoard, refresh, dispose() {
    if (disposed) return; disposed = true; generation++;
    players.removeEventListener('click', selectPlayers); ai.removeEventListener('click', selectAi); panel.remove();
  } };
}
