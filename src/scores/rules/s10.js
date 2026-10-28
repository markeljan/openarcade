// Owned by OPENARCADE S10. Empty during rollout.
// S10: versioned game rules; source transitions own every result.
export default [
  {schemaVersion:1,gameId:'tower-heist',source:'src/feature-games31.js',metric:'Active time to return home after the first roof escape',units:'milliseconds',order:'asc',version:1,status:'complete',bounds:{minScore:0,maxScore:86400000,integer:true,minDurationMs:0,maxDurationMs:86400000}},
  {schemaVersion:1,gameId:'storm-slot',source:'src/feature-games31.js',metric:'Sector, race and skill points at the first two-lap cup',units:'points',order:'desc',version:1,status:'complete',bounds:{minScore:0,maxScore:100000,integer:true,minDurationMs:0,maxDurationMs:86400000}},
  {schemaVersion:1,gameId:'glacier-glide',source:'src/feature-games32.js',metric:'Feeding and rescue points in 120 active seconds',units:'points',order:'desc',version:1,status:'complete',bounds:{minScore:0,maxScore:100000,integer:true,minDurationMs:119950,maxDurationMs:120050}},
  {schemaVersion:1,gameId:'cloud-shepherd',source:'src/feature-games32.js',metric:'Sheep, rescue and shelter points on the first completed pasture',units:'points',order:'desc',version:1,status:'complete',bounds:{minScore:0,maxScore:100000,integer:true,minDurationMs:0,maxDurationMs:86400000}},
  {schemaVersion:1,gameId:'essence-workshop',source:'src/feature-games33.js',metric:'Artifact and moon-moth points in 120 active seconds',units:'points',order:'desc',version:1,status:'complete',bounds:{minScore:0,maxScore:100000,integer:true,minDurationMs:119950,maxDurationMs:120050}},
  {schemaVersion:1,gameId:'mill-mechanic',source:'src/feature-games33.js',metric:'Completed output services in 120 active seconds',units:'services',order:'desc',version:1,status:'complete',bounds:{minScore:0,maxScore:10000,integer:true,minDurationMs:119950,maxDurationMs:120050}},
];
