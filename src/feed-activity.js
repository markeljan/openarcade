export function createActivityCoordinator({read,onData,onError,onBusy=()=>{}}){
 let generation=0,current=null,queue=Promise.resolve();
 const valid=(id,token)=>current===id&&generation===token;
 function select(id){current=id;const token=++generation;onBusy(true);const request=queue.then(()=>read(id));request.then(data=>{if(valid(id,token)){onData(data);onBusy(false)}},error=>{if(valid(id,token)){onError(error);onBusy(false)}});return request}
 function mutate(id,operation){const token=++generation;onBusy(true);const request=queue.then(()=>operation(id));queue=request.catch(()=>{});request.then(data=>{if(valid(id,token)){onData(data);onBusy(false)}},error=>{if(valid(id,token)){onError(error);onBusy(false)}});return request}
 return {select,mutate};
}
