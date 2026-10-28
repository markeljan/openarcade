// Anonymous browser identity is used only to keep one vote per game per browser.
let cachedVisitor;
function visitorId(){
 if(cachedVisitor)return cachedVisitor;
 try{const stored=localStorage.getItem('openarcade:visitor');if(stored&&/^[a-f0-9-]{36}$/i.test(stored))return cachedVisitor=stored}catch{}
 cachedVisitor=crypto.randomUUID();try{localStorage.setItem('openarcade:visitor',cachedVisitor)}catch{}return cachedVisitor;
}
async function request(path,options={}){
 let response;try{response=await fetch(path,{...options,headers:{'Content-Type':'application/json','X-Arcade-Visitor':visitorId(),...options.headers}})}catch{throw new Error('Feedback is unavailable. Please try again later.')}
 let data;try{data=await response.json()}catch{throw new Error('Feedback is unavailable. Please try again later.')}
 if(!response.ok)throw new Error(data.error||'Feedback is unavailable. Please try again later.');return data;
}
export function getAllEngagement(){return request('/api/feedback?all=1')}
export function getEngagement(gameId){return request('/api/feedback?gameId='+encodeURIComponent(gameId))}
function mutate(gameId,action,fields={}){return request('/api/feedback',{method:'POST',body:JSON.stringify({gameId,action,...fields})})}
export function recordPlay(gameId){return mutate(gameId,'play')}
export function setVote(gameId,value){return mutate(gameId,'vote',{value})}
export function addComment(gameId,text){return mutate(gameId,'comment',{text})}
