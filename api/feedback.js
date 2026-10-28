import {neon} from '@neondatabase/serverless';
const idPattern=/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const visitorPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const gameValid=id=>typeof id==='string'&&id.length<=64&&idPattern.test(id);
const count=n=>Number(n)||0;
function reply(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body))}
export function createFeedbackHandler(query){
 async function one(gameId,visitor){
  const [scores,votes,comments]=await Promise.all([
   query('SELECT plays FROM arcade_plays WHERE game_id=$1',[gameId]),
   query('SELECT COUNT(*) FILTER (WHERE value=1) AS upvotes, COUNT(*) FILTER (WHERE value=-1) AS downvotes, COALESCE(MAX(value) FILTER (WHERE visitor_id=$2::uuid),0) AS user_vote FROM arcade_votes WHERE game_id=$1',[gameId,visitor]),
   query('SELECT body,created_at FROM arcade_comments WHERE game_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100',[gameId])]);
  const v=votes[0]||{};return {plays:count(scores[0]?.plays),upvotes:count(v.upvotes),downvotes:count(v.downvotes),userVote:count(v.user_vote),comments:comments.map(c=>({text:c.body,createdAt:c.created_at}))};
 }
 return async function handler(req,res){
  const visitor=req.headers['x-arcade-visitor'];if(typeof visitor!=='string'||!visitorPattern.test(visitor))return reply(res,400,{error:'A valid visitor ID is required.'});
  if(!query)return reply(res,503,{error:'Feedback is not configured yet.'});
  try{
   if(req.method==='GET'){
    const url=new URL(req.url,'http://localhost');if(url.searchParams.get('all')==='1'){
     const rows=await query('SELECT COALESCE(p.game_id,v.game_id) AS game_id,COALESCE(p.plays,0) AS plays,COALESCE(v.upvotes,0) AS upvotes,COALESCE(v.downvotes,0) AS downvotes FROM arcade_plays p FULL OUTER JOIN (SELECT game_id,COUNT(*) FILTER (WHERE value=1) AS upvotes,COUNT(*) FILTER (WHERE value=-1) AS downvotes FROM arcade_votes GROUP BY game_id) v ON p.game_id=v.game_id',[]);
     return reply(res,200,Object.fromEntries(rows.map(r=>[r.game_id,{plays:count(r.plays),upvotes:count(r.upvotes),downvotes:count(r.downvotes)}])));
    }
    const gameId=url.searchParams.get('gameId');if(!gameValid(gameId))return reply(res,400,{error:'Invalid game ID.'});return reply(res,200,await one(gameId,visitor));
   }
   if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return reply(res,405,{error:'Method not allowed.'})}
   let body=req.body;if(typeof body==='string'){if(body.length>2048)return reply(res,400,{error:'Request is too large.'});try{body=JSON.parse(body)}catch{return reply(res,400,{error:'Invalid request.'})}}
   if(!body||typeof body!=='object'||!gameValid(body.gameId))return reply(res,400,{error:'Invalid game ID.'});const {gameId,action}=body;
   if(action==='play')await query('INSERT INTO arcade_plays (game_id,plays) VALUES ($1,1) ON CONFLICT (game_id) DO UPDATE SET plays=arcade_plays.plays+1',[gameId]);
   else if(action==='vote'&&[-1,0,1].includes(body.value)){if(body.value===0)await query('DELETE FROM arcade_votes WHERE game_id=$1 AND visitor_id=$2::uuid',[gameId,visitor]);else await query('INSERT INTO arcade_votes (game_id,visitor_id,value) VALUES ($1,$2::uuid,$3) ON CONFLICT (game_id,visitor_id) DO UPDATE SET value=EXCLUDED.value',[gameId,visitor,body.value])}
   else if(action==='comment'&&typeof body.text==='string'&&body.text.trim().length>=1&&body.text.trim().length<=280)await query('INSERT INTO arcade_comments (game_id,body) VALUES ($1,$2)',[gameId,body.text.trim()]);
   else return reply(res,400,{error:'Invalid feedback.'});
   return reply(res,200,await one(gameId,visitor));
  }catch{return reply(res,503,{error:'Feedback is unavailable. Please try again later.'})}
 };
}
export default async function handler(req,res){const url=process.env.DATABASE_URL;let query;if(url){try{const sql=neon(url);query=(text,params)=>sql.query(text,params)}catch{}}return createFeedbackHandler(query)(req,res)}
