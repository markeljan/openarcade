// OPENARCADE S06. This slice enables Snake only.
export default [{
  schemaVersion: 1, gameId: 'snake', source: 'src/games.js',
  ruleVersion: 1, status: 'complete',
  human: {
    terminal: 'wall/self collision or full board calls end before any reset',
    provenance: 'fresh manual factory and bound finish; restart/takeover abandon old run',
    tests: ['tests/s06-classics-snake.test.js'],
  },
  ai: {
    terminal: 'same wall/self collision or full board calls end before a fresh preview factory',
    provenance: 'same Snake rules; fresh AI run ID; gallery is ineligible and never writes human best',
    tests: ['tests/s06-classics-snake.test.js'],
  },
}];
