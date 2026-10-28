// OPENARCADE S09: version 1 challenges use 120 active simulation seconds.
export default [
  {
    "schemaVersion": 1,
    "gameId": "hive-heist",
    "source": "src/feature-games21.js",
    "metric": "nectar deposited by the player bee × 15 in 120 active seconds",
    "units": "points",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 1000000,
      "integer": true,
      "minDurationMs": 120000,
      "maxDurationMs": 120000
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "cloud-caravan",
    "source": "src/feature-games21.js",
    "metric": "cargo units delivered in 120 active seconds",
    "units": "cargo units",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 10000,
      "integer": true,
      "minDurationMs": 120000,
      "maxDurationMs": 120000
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "orchard-wardens",
    "source": "src/feature-games22.js",
    "metric": "grafting, harvest and orchard action awards in 120 active seconds",
    "units": "points",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 1000000,
      "integer": true,
      "minDurationMs": 120000,
      "maxDurationMs": 120000
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "avalanche-post",
    "source": "src/feature-games22.js",
    "metric": "mail delivery and sheltered rescue awards in 120 active seconds",
    "units": "points",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 1000000,
      "integer": true,
      "minDurationMs": 120000,
      "maxDurationMs": 120000
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "orbit-kitchen",
    "source": "src/feature-games23.js",
    "metric": "served meal, streak, orbital and shield awards in 120 active seconds",
    "units": "points",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 1000000,
      "integer": true,
      "minDurationMs": 120000,
      "maxDurationMs": 120000
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "hearth-conductor",
    "source": "src/feature-games23.js",
    "metric": "cue, combo, crescendo and counterpoint ovation in 120 active seconds",
    "units": "points",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 1000000,
      "integer": true,
      "minDurationMs": 120000,
      "maxDurationMs": 120000
    }
  }
];
