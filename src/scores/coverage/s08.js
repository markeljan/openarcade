import rules from '../rules/s08.js';

// OPENARCADE S08's machine-readable 20-row coverage manifest. Matching complete
// rules/evidence enable a game; pending rows deliberately remain unavailable.
const terminals = {
  'burrow-boss':'900 active seconds of hunt followed by the six-second native ending',
  'gravity-claw':'health depleted by the actual lethal collision before recovery',
  'ashen-rage':'900-second race expires after awarding the 500-point finish bonus',
  'star-roller':'300 seconds or size 85, followed by the full reward-bearing finale',
  'dragon-lock':'720-second flight and seven-second gate finale, after its 410-point bonus',
  'cursed-fist':'630-second encounter and seven-second finale',
  'coral-courier':'first successful full reef restoration, cycles becomes one',
  'beacon-bay':'eighth safely docked ship, after the docking award',
  'railway-rush':'eighth successful train delivery, after matching cargo awards',
  'pottery-house':'third fired pot displayed on the gallery shelf, after quality awards',
};
const evidence = module => module<=13?['tests/s08-feature11-13-scoring.test.js']:
  module<=16?['tests/s08-feature14-16-terminal.test.js','tests/s08-feature14-16-lifecycle.test.js']:
  ['tests/s08-feature17-20-lifecycle.test.js'];

export default rules.map(rule => {
  const module=Number(/feature-games(\d+)/.exec(rule.source)[1]);
  const entry={schemaVersion:1,gameId:rule.gameId,source:rule.source,
    metric:rule.metric,units:rule.units,order:rule.order,ruleVersion:rule.version,
    status:rule.status,browser:{status:rule.gameId==='tower-panic'?'passed':'not-run'}};
  if(rule.gameId==='tower-panic')entry.browser.evidence='tests/s08-wrapper-browser.test.js: real 120-second human and watch-AI terminals, result/Enter and lifecycle';
  if(rule.status==='pending')return entry;
  const terminal=terminals[rule.gameId]??'120 active simulation seconds, with the final event tally captured before result freeze';
  entry.human={terminal,provenance:'fresh human factory; actor-bound callback; client-reported',tests:evidence(module)};
  entry.ai={terminal,provenance:'fresh AI factory; same event awards and terminal rules; no human best writes; client-reported',tests:evidence(module)};
  entry.limitations=module>=17?'Near-terminal state fixtures and shortened clocks exercise successful terminal actions and finale awards; these are not complete manual playthroughs.':
    'Natural timed factory boundaries and targeted event fixtures; browser coverage is representative.';
  return entry;
});
