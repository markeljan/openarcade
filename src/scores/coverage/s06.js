// OPENARCADE S06. Evidence is game-terminal tests plus shared wrapper provenance tests.
export default [
  {
    "schemaVersion": 1,
    "gameId": "snake",
    "source": "src/games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "wall/self collision or full board",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-classics-snake.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    },
    "ai": {
      "terminal": "wall/self collision or full board; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-classics-snake.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "breakout",
    "source": "src/games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "lost ball or 36-brick board clear",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-classics-remaining.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    },
    "ai": {
      "terminal": "lost ball or 36-brick board clear; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-classics-remaining.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "pong",
    "source": "src/games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "ball exits either side; score counts paddle returns",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-classics-remaining.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    },
    "ai": {
      "terminal": "ball exits either side; score counts paddle returns; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-classics-remaining.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "orbit",
    "source": "src/games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "enemy collision",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-classics-remaining.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    },
    "ai": {
      "terminal": "enemy collision; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-classics-remaining.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "flappy",
    "source": "src/games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "boundary/pipe collision; score counts recycled pipes",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-classics-remaining.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    },
    "ai": {
      "terminal": "boundary/pipe collision; score counts recycled pipes; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-classics-remaining.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "dodge",
    "source": "src/games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "drop collision; score counts recycled drops",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-classics-remaining.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    },
    "ai": {
      "terminal": "drop collision; score counts recycled drops; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-classics-remaining.test.js",
        "tests/s06-classics-callback-pause.test.js"
      ]
    }
  }
];
