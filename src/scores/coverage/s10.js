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
].map(([gameId,module,terminal])=>({schemaVersion:1,gameId,source:`src/feature-games${module}.js`,ruleVersion:1,status:'complete',human:{...human,terminal},ai:{...ai,terminal}}));
