// OPENARCADE S07: source/event evidence; statuses advance with tested sub-batches.
import rules from '../rules/s07.js';
const terminals = [
  'first fatal health depletion, after distance and kill accounting',
  'fifth death after platform, bandage and rescue awards',
  'regulation decision, seventh goal or overtime goal',
  'elimination, final crown or final timeout after qualification awards',
  'crash after the last earned distance, coin and near-miss awards',
  'fatal hurt after enemy and solved-word awards',
  'fatal health depletion or 120-second dawn after health bonus',
  'fatal health depletion through the real damage paths',
  '120-second clock or third match point after rally accounting',
  'route timeout or exhausted lives after combo banking and route bonus',
  'elimination, round clock or overtime decision after champion bonus',
  '900-second match clock after title win/loss bonus',
  'first deposit of at least two cases after ordered sigils and both relays',
  'first fort topple after the core, block and topple awards',
  '900-second dawn after defense and dawn awards; local best retains verdict delay',
  'all challenges completed after the Star Garden arrival award',
  '900-second quota verdict after all earned salvage events',
  'first 100-damage bust before existing damage recovery',
  'first glade restoration after the 300-point channel award',
  '900-second shift after migration outcome bonus; local best retains ending delay',
];
export default rules.map((rule,index) => {
  const test = index<6?'tests/s07-feature-01-03.test.js':index<12?'tests/s07-feature-04-06.test.js':'tests/s07-feature-07-10.test.js';
  return {schemaVersion:1,gameId:rule.gameId,source:rule.source,ruleVersion:1,status:rule.status,
    human:{terminal:terminals[index],provenance:'fresh human factory; real input, damage or clock boundary',tests:[test]},
    ai:{terminal:terminals[index],provenance:'fresh AI factory; identical event awards, decisions automated; no human best writes',tests:[test]},
  };
});
