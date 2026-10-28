// OPENARCADE S06. MAX_SAFE_INTEGER is a storage precision ceiling for native unbounded counters/time, not proof of plausible gameplay.
export default [
  {
    "schemaVersion": 1,
    "gameId": "snake",
    "source": "src/games.js",
    "metric": "food eaten; wall/self collision or full board",
    "units": "food",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 381,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 9007199254740991
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "breakout",
    "source": "src/games.js",
    "metric": "bricks destroyed; lost ball or 36-brick board clear",
    "units": "bricks",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 36,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 9007199254740991
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "pong",
    "source": "src/games.js",
    "metric": "left paddle returns; ball exits either side; score counts paddle returns",
    "units": "returns",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 9007199254740991,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 9007199254740991
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "orbit",
    "source": "src/games.js",
    "metric": "sparks collected; enemy collision",
    "units": "sparks",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 9007199254740991,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 9007199254740991
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "flappy",
    "source": "src/games.js",
    "metric": "pipes recycled offscreen; boundary/pipe collision; score counts recycled pipes",
    "units": "pipes",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 9007199254740991,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 9007199254740991
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "dodge",
    "source": "src/games.js",
    "metric": "drops recycled below field; drop collision; score counts recycled drops",
    "units": "drops",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 9007199254740991,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 9007199254740991
    }
  }
];
