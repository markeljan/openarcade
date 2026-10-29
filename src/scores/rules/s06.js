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
  },
  {
    "schemaVersion": 1,
    "gameId": "star-defender",
    "source": "src/more-games.js",
    "metric": "enemies destroyed; 60 active seconds; earlier natural loss where present",
    "units": "enemies destroyed",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 9007199254740991,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "road-runner",
    "source": "src/more-games.js",
    "metric": "cars passed; 60 active seconds; earlier natural loss where present",
    "units": "cars passed",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 75,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "frog-crossing",
    "source": "src/more-games.js",
    "metric": "crossings; 60 active seconds; earlier natural loss where present",
    "units": "crossings",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 9007199254740991,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "meteor-field",
    "source": "src/more-games.js",
    "metric": "rocks destroyed; ship/rock collision",
    "units": "rocks destroyed",
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
    "gameId": "coin-maze",
    "source": "src/more-games.js",
    "metric": "active elapsed time for a completed solve",
    "units": "milliseconds",
    "order": "asc",
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
    "gameId": "jump-dash",
    "source": "src/more-games.js",
    "metric": "obstacles passed; 60 active seconds; earlier natural loss where present",
    "units": "obstacles passed",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 55,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "harvest-catch",
    "source": "src/more-games.js",
    "metric": "net harvest; 60 active seconds; earlier natural loss where present",
    "units": "net harvest",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": -218,
      "maxScore": 109,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "bumper-ball",
    "source": "src/more-games.js",
    "metric": "bumper hits; 60 active seconds; earlier natural loss where present",
    "units": "bumper hits",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 9007199254740991,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "tunnel-flight",
    "source": "src/more-games.js",
    "metric": "gates passed; gate collision",
    "units": "gates passed",
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
    "gameId": "target-practice",
    "source": "src/more-games.js",
    "metric": "targets hit; 60 active seconds; earlier natural loss where present",
    "units": "targets hit",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 9007199254740991,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "parcel-sort",
    "source": "src/more-games.js",
    "metric": "net parcels; 60 active seconds; earlier natural loss where present",
    "units": "net parcels",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": -48,
      "maxScore": 48,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "balance-box",
    "source": "src/more-games.js",
    "metric": "whole seconds balanced until fall or the 60-second deadline; 60 active seconds; earlier natural loss where present",
    "units": "seconds",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 60,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "laser-dodge",
    "source": "src/more-games.js",
    "metric": "beams dodged; beam collision",
    "units": "beams dodged",
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
    "gameId": "bubble-pop",
    "source": "src/more-games.js",
    "metric": "bubbles popped; 60 active seconds; earlier natural loss where present",
    "units": "bubbles popped",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 9007199254740991,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "tiny-fishing",
    "source": "src/more-games.js",
    "metric": "fish caught; 60 active seconds; earlier natural loss where present",
    "units": "fish caught",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 9007199254740991,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "lander",
    "source": "src/extra-games.js",
    "metric": "successful landings; 60 active seconds; earlier natural loss where present",
    "units": "landings",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 50,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "maze",
    "source": "src/extra-games.js",
    "metric": "active elapsed time for a completed solve",
    "units": "milliseconds",
    "order": "asc",
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
    "gameId": "asteroids",
    "source": "src/extra-games.js",
    "metric": "asteroids destroyed; ship/asteroid collision",
    "units": "hits",
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
    "gameId": "catch",
    "source": "src/extra-additions.js",
    "metric": "net fruit caught; 60 active seconds; earlier natural loss where present",
    "units": "fruit",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 300,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "runner",
    "source": "src/extra-additions.js",
    "metric": "hurdles cleared; hurdle collision",
    "units": "hurdles",
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
    "gameId": "invaders",
    "source": "src/extra-additions.js",
    "metric": "fleet hits; 24-enemy fleet cleared",
    "units": "hits",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 24,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 9007199254740991
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "target",
    "source": "src/extra-additions.js",
    "metric": "targets hit; 60 active seconds; earlier natural loss where present",
    "units": "hits",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 804,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "racer",
    "source": "src/extra-additions.js",
    "metric": "cars passed; car collision",
    "units": "cars",
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
    "gameId": "puzzle",
    "source": "src/extra-additions.js",
    "metric": "active elapsed time for a completed solve",
    "units": "milliseconds",
    "order": "asc",
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
    "gameId": "bubbles",
    "source": "src/extra-additions.js",
    "metric": "bubbles popped; 60 active seconds; earlier natural loss where present",
    "units": "bubbles",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 1446,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  },
  {
    "schemaVersion": 1,
    "gameId": "platform",
    "source": "src/extra-additions.js",
    "metric": "crossings; 60 active seconds; earlier natural loss where present",
    "units": "crossings",
    "order": "desc",
    "version": 1,
    "status": "complete",
    "bounds": {
      "minScore": 0,
      "maxScore": 30,
      "integer": true,
      "minDurationMs": 0,
      "maxDurationMs": 60100
    }
  }
];
