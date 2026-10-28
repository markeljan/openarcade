// OPENARCADE S06. Add a rule only with matching terminal coverage.
export default [{
  schemaVersion: 1, gameId: 'snake', source: 'src/games.js',
  metric: 'food eaten before wall/self collision or full-board completion',
  units: 'food', order: 'desc', version: 1, status: 'complete',
  // The 24 x 16 board starts with three occupied cells.
  bounds: {minScore: 0, maxScore: 381, integer: true,
    minDurationMs: 0, maxDurationMs: 86400000},
}];
