// OPENARCADE S07. Bounds are public acceptance envelopes, not gameplay maxima.
// See docs/S07-SCORING.md. Pending games remain disabled during staged rollout.
const rows = [
  ['machine-hunt',1,'distance meters plus machine kill awards','points',1000000,86400],
  ['meat-lad',1,'platform checkpoints, bandages and rescues through fifth death','points',1000000,86400],
  ['turbo-arena',2,'blue-team goals at match completion','goals',7,86400],
  ['jelly-dash',2,'round qualification and final crown awards','points',750,86400],
  ['side-surfers',3,'distance ticks, coins, combo and near-miss awards at crash','points',10000000,86400],
  ['word-fall',3,'enemy defeat and solved-word awards at fatal hurt','points',10000000,86400],
  ['rune-swarm',4,'match, spell and kill awards plus dawn health bonus','points',1000000,180],
  ['deep-digger',4,'mining, crafting, combat and building awards at fatal depletion','points',10000000,86400],
  ['web-slam',5,'rally hits, wall damage and breach awards at match end','points',1000000,150],
  ['deadline-deck',5,'banked trick combos, bundles, deliveries and route bonus','points',10000000,120],
  ['scrap-arena',6,'pickups, wrecks and champion bonus at round decision','points',1000000,180],
  ['gridiron-rush',6,'drive and action awards plus final title bonus','points',10000000,930],
  ['ghost-shift',7,'sigils, relays, cases and first completed deposit','points',1000000,86400],
  ['wingrush',7,'cores, broken blocks and first fort topple','points',1000000,86400],
  ['grave-garden',8,'defense and dawn awards at session completion','points',1000000,930],
  ['swarm-keeper',8,'challenge and crew awards through Star Garden arrival','points',1000000,86400],
  ['cosmic-haul',9,'rock breaks, tethers and banked salvage before quota verdict','points',1000000,930],
  ['midnight-pursuit',9,'distance travelled before first bust','meters',1000000,86400],
  ['pico-cap',10,'glade objective and combat awards through first restoration','points',1000000,86400],
  ['frog-convoy',10,'crossings, pickups, deliveries and migration outcome bonus','points',1000000,86400],
];
const ready = new Set(rows.map(([id])=>id));
export default rows.map(([gameId,module,metric,units,maxScore,seconds]) => ({
  schemaVersion:1,gameId,source:`src/feature-games${module===1?'':module}.js`,
  metric,units,order:'desc',version:1,status:ready.has(gameId)?'complete':'pending',
  bounds:{minScore:0,maxScore,integer:gameId!=='midnight-pursuit',minDurationMs:0,maxDurationMs:seconds*1000},
}));
