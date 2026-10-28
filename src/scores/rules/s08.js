// OPENARCADE S08: versioned rules for complete feature modules 11–20.
// Pending rows are disabled until their instrumentation/evidence sub-batch lands.
const definitions = [
  ['tower-panic',11,'Crew recruitment, floor, extraction and deflection points in 120 active seconds','points',120100,100000],
  ['burrow-boss',11,'Cave hunt award points through the 900-second hunt and six-second ending','points',906100,1000000],
  ['idol-escape',12,'Successful chamber distance in 120 active seconds; failed chambers add zero','meters',120100,100000],
  ['robot-register',12,'Register flag and stage points in 120 active seconds','points',120100,100000],
  ['castle-crasher',13,'Fire, impact, breach and chapter points in 120 active seconds','points',120100,100000],
  ['hotel-haunt',13,'Ghost, first room light and cleared floor points in 120 active seconds','points',120100,1000000],
  ['kaiju-control',14,'Evacuation, dispatch, defense and district points in 120 active seconds','points',120100,100000],
  ['moonshine-valley',14,'Farm, combat and dawn points in 120 active seconds','points',120100,100000],
  ['dungeon-relay',15,'Relay award points in 120 active seconds; knockdowns are nonfatal','points',120100,1000000],
  ['gravity-claw',15,'Claw award points before health depletion','points',86400000,1000000000],
  ['ricochet-foundry',16,'Charge processing and installed part points in 120 active seconds','points',120100,100000],
  ['lantern-line',16,'Lantern, chain, scrub and purge points in 120 active seconds','points',120100,100000],
  ['ashen-rage',17,'Rival knockout points plus finish bonus at race completion','points',900100,1000000],
  ['star-roller',17,'Pickup, sweeper and finale points at time limit or star completion','points',86400000,1000000000],
  ['dragon-lock',18,'Flight session award points after the gate finale','points',727100,10000000],
  ['cursed-fist',18,'Normal foe and boss defeat points after the final encounter','defeat points',637100,100000],
  ['coral-courier',19,'Reef rescue, transplant, companion and biome points through first full restoration','points',86400000,1000000000],
  ['beacon-bay',19,'Safe docking points through the first eight saved ships','points',86400000,800],
  ['railway-rush',20,'Matching cargo points through the eighth train delivery','points',86400000,1000000000],
  ['pottery-house',20,'Displayed pottery quality points through the third gallery piece','points',86400000,1200],
];

const enabledModules = new Set([11,12,13,14,15,16]);

export default definitions.map(([gameId,module,metric,units,maxDurationMs,maxScore]) => ({
  schemaVersion:1, gameId, source:`src/feature-games${module}.js`,
  metric, units, order:'desc', version:1, status:enabledModules.has(module)?'complete':'pending',
  // These are acceptance ceilings, not claims of optimal play. Milestone and
  // health-based runs have no natural time limit; accept at most one active day.
  bounds:{minScore:0,maxScore,integer:true,minDurationMs:0,maxDurationMs},
}));
