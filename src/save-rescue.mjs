// Pure save-recovery rules, usable in Node tests without a browser.
// Neither a stale tab nor a broken primary key should silently roll back progress.
export const MIRROR_SAVE_KEY='mustacheMartV4LatestConfirmed';
export const SAVE_NOTICE_KEY='mustacheMartSaveWriteStatusV1';
export function readSaveRecord(raw){
 if(typeof raw!=='string'||!raw)return null;
 try{
  const data=JSON.parse(raw);
  if(![3,4].includes(data.version)||!Array.isArray(data.fill)||data.fill.length<10000)return null;
  const sum=data.fill.reduce((a,b)=>a+(Number(b)||0),0);
  if(!Number.isFinite(sum)||sum<0)return null;
  return {raw,data,stamp:Number.isFinite(data.savedAt)?Math.max(0,data.savedAt):0,
   stocked:sum,ranks:Object.values(data.levels||{}).reduce((a,b)=>a+(Number(b)||0),0),
   robots:Array.isArray(data.robots)?data.robots.length:0};
 }catch{return null;}
}
export function bestStartupSave(primary,mirror,archives=[],legacy=null){
 const candidates=[
  {origin:'main saved game',raw:primary},
  {origin:'latest confirmed save',raw:mirror},
  ...archives.map((v,i)=>({origin:'recovery copy '+(i+1),raw:typeof v==='string'?v:v?.data})),
  {origin:'old V3 saved game',raw:legacy}
 ].map(c=>({...c,record:readSaveRecord(c.raw)})).filter(c=>c.record);
 if(!candidates.length)return {raw:null,origin:'no saved game'};
 // A valid V4 takes precedence over V3, whose cell layout may differ.
 const modern=candidates.filter(c=>c.record.data.version===4);
 const pool=modern.length?modern:candidates;
 // Timestamped copies are preferred over untimestamped copies only if they
 // are genuinely recent; no scoring heuristic may silently undo crab damage
 // or user-approved reductions to stock/robot count.
 const winner=pool.slice().sort((a,b)=>
  b.record.stamp-a.record.stamp ||
  (a.origin==='main saved game'?-1:b.origin==='main saved game'?1:0)
 )[0];
 return {raw:winner.raw,origin:winner.origin};
}
export function stampSave(serialized,when=Date.now()){
 const record=readSaveRecord(serialized);
 if(!record)throw Error('Cannot write incomplete Mustache Mart saved game');
 return JSON.stringify({...record.data,savedAt:Math.max(1,Math.floor(when))});
}
export function guardedSave(storage,key,mirrorKey,payload,lastKnown){
 const fresh=readSaveRecord(payload);
 if(!fresh)return {ok:false,reason:'invalid',message:'Refusing to save an invalid game'};
 let current;
 try{current=storage.getItem(key);}
 catch{return {ok:false,reason:'unavailable',message:'Browser storage unavailable'};}
 // Different browser tabs on the SAME port are not allowed to overwrite
 // each other's later writes. A null current is safe on first initialization.
 if(current!==lastKnown&&current!==null){
  return {ok:false,reason:'conflict',message:'Another tab changed this saved game. Export or reload before continuing.'};
 }
 try{
  storage.setItem(key,payload);
  if(storage.getItem(key)!==payload)throw Error('Saved data failed read-back verification');
 }catch{
  return {ok:false,reason:'primary-failed',message:'Could not verify browser save; keep this tab open and export a backup'};
 }
 // The confirmed copy is a second recoverable key, not a replacement save.
 let mirrorOk=true;
 try{storage.setItem(mirrorKey,payload);mirrorOk=storage.getItem(mirrorKey)===payload;}
 catch{mirrorOk=false;}
 return {ok:true,mirrorOk,raw:payload,stamp:fresh.stamp};
}
