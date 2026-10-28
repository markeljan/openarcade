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
  },
  {
    "schemaVersion": 1,
    "gameId": "star-defender",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "road-runner",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "frog-crossing",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "meteor-field",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "ship/rock collision",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "ship/rock collision; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "coin-maze",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "successful solve only",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "successful solve only; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "jump-dash",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "harvest-catch",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "bumper-ball",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "tunnel-flight",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "gate collision",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "gate collision; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "target-practice",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "parcel-sort",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "balance-box",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "laser-dodge",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "beam collision",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "beam collision; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "bubble-pop",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "tiny-fishing",
    "source": "src/more-games.js",
    "ruleVersion": 1,
    "status": "complete",
    "human": {
      "terminal": "60 active seconds; earlier natural loss where present",
      "provenance": "fresh human factory; abandoned before cleanup on restart/mode changes; completed callback once",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    },
    "ai": {
      "terminal": "60 active seconds; earlier natural loss where present; callback before a fresh AI factory",
      "provenance": "same gameplay rules and metric; AI decisions only; gallery is not submission eligible; human local best untouched",
      "tests": [
        "tests/s06-more-terminals.test.js",
        "tests/s06-more-lifecycle.test.js"
      ]
    }
  }
];
