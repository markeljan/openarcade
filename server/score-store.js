export function createScoreStore(query) {
 const one=async (sql,args)=>{const rows=await query(sql,args);return rows[0]?.value};
 return {
  submit: ({runId,gameId,ruleVersion,order,score,actor,userId,displayName,fingerprint,claimHash,details})=>one('SELECT arcade_score_submit($1::uuid,$2,$3::int,$4,$5::double precision,$6,$7,$8,$9,$10,$11::jsonb) AS value',[runId,gameId,ruleVersion,order,score,actor,userId??null,displayName,fingerprint,claimHash??null,JSON.stringify(details??{})]),
  claim: ({runId,claimHash,userId,displayName})=>one('SELECT arcade_score_claim($1::uuid,$2,$3,$4) AS value',[runId,claimHash,userId,displayName]),
  rateLimit: ({scope,windowSeconds,limit})=>one('SELECT arcade_score_rate_limit($1,$2::int,$3::int) AS value',[scope,windowSeconds,limit]),
  async leaderboard({gameId,ruleVersion,order,filter,userId}) {
   const rows=await query(`SELECT run_id AS "runId", score, display_name AS "displayName", actor, (actor='human' AND user_id IS NULL) AS guest, details->'context' AS context, details->'attribution' AS attribution, created_at AS "createdAt" FROM arcade_score_rows WHERE game_id=$1 AND rule_version=$2 AND removed_at IS NULL AND ($3='all' OR ($3='players' AND actor='human') OR ($3='ai' AND actor='ai')) ORDER BY CASE WHEN $4='asc' THEN score END ASC, CASE WHEN $4='desc' THEN score END DESC, created_at ASC, run_id ASC LIMIT 10`,[gameId,ruleVersion,filter,order]);
   const best=userId?await query(`SELECT run_id AS "runId", score, display_name AS "displayName", actor, false AS guest, details->'context' AS context, details->'attribution' AS attribution, created_at AS "createdAt" FROM arcade_score_rows WHERE game_id=$1 AND rule_version=$2 AND actor='human' AND user_id=$3 AND removed_at IS NULL ORDER BY CASE WHEN $4='asc' THEN score END ASC, CASE WHEN $4='desc' THEN score END DESC, created_at ASC, run_id ASC LIMIT 1`,[gameId,ruleVersion,userId,order]):[];
   const board=await query('SELECT epoch,sort_order FROM arcade_score_boards WHERE game_id=$1 AND rule_version=$2',[gameId,ruleVersion]);
   if(board[0] && board[0].sort_order!==order) throw new Error('Score order mismatch');
   const ai=await query(`SELECT score FROM arcade_score_rows WHERE game_id=$1 AND rule_version=$2 AND actor='ai' AND removed_at IS NULL ORDER BY CASE WHEN $3='asc' THEN score END ASC, CASE WHEN $3='desc' THEN score END DESC, created_at ASC, run_id ASC OFFSET 9 LIMIT 1`,[gameId,ruleVersion,order]);
   return {entries:rows,personalBest:best[0]??null,epoch:Number(board[0]?.epoch??0),threshold:ai[0]?.score??null};
  }
 };
}
