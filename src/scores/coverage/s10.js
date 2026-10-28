// Owned by OPENARCADE S10. Empty during rollout.
const tests=['tests/s10-games31-33-score.test.js'];
const human={provenance:'Fresh manual factory; preview state is abandoned before input release',tests};
const ai={provenance:'Fresh AI factory; identical scoring rules; gallery results are ineligible',tests};
export default [
  ['tower-heist',31,'Return home after roof escape, before objective reset'],
  ['storm-slot',31,'First two-lap cup, before circuit rollover'],
  ['glacier-glide',32,'Version 1 round ends at 120 active simulation seconds'],
  ['cloud-shepherd',32,'First pasture sealed with the final sheep, before pasture transition'],
  ['essence-workshop',33,'Version 1 round ends at 120 active simulation seconds'],
  ['mill-mechanic',33,'Version 1 round ends at 120 active simulation seconds'],
].map(([gameId,module,terminal])=>({schemaVersion:1,gameId,source:`src/feature-games${module}.js`,ruleVersion:1,status:'complete',human:{...human,terminal},ai:{...ai,terminal}})).concat([
  ['wobble-war',34,'Red army defeat after accumulated victories'],
  ['void-gambit',34,'Hull lost or final enemy defeated; assisted human runs do not submit'],
  ['rulebound',35,'Final book chapter completed before page reset'],
  ['hex-hamlet',35,'Complete, unfinished or exhausted expedition before travellers or reset continue'],
  ['ashen-courier',36,'Fallen or escaped before native attract reset'],
  ['icebound-ascent',36,'Final summit reached before celebration reset'],
].map(([gameId,module,terminal])=>({schemaVersion:1,gameId,source:`src/feature-games${module}.js`,ruleVersion:1,status:'complete',human:{terminal,provenance:'Fresh manual factory; native assistance is excluded from human submissions',tests:['tests/s10-games34-36-score.test.js']},ai:{terminal,provenance:'Same game rules and numeric awards; fresh AI factory',tests:['tests/s10-games34-36-score.test.js']}})));
