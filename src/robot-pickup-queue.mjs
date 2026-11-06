// Deterministic FIFO service at each actual warehouse dock, boxed crate,
// conveyor, free belt and stock pile. No rendering dependencies.
// Tickets are stored on the robot, so a save/reload preserves order.
import {ROBOT_CLEARANCE} from './robot-traffic.mjs';
export const TEN_INCHES_METERS=.254;
export const ROBOT_SPAWN_PITCH=ROBOT_CLEARANCE+TEN_INCHES_METERS;
export const PICKUP_SERVICE_SECONDS=.65;
export const ACTIVE_QUEUE_SLOTS=4;

export function pickupKey(floor,source){
 if(!source)return null;
 const id=source.type==='crate'?source.crateId:
  source.type==='pile'?source.index:
  source.type==='freeBelt'?source.id:
  source.type==='belt'?source.aisle+':'+source.segment:'main';
 return floor+':'+source.type+':'+id;
}
export function queueMembers(s,key){
 return s.robots.filter(bot=>bot.placed&&!bot.broken&&!bot.wrecked&&
   bot.phase==='supply'&&bot.source?.queueKey===key)
  .sort((a,b)=>(a.source.queueTicket??a.id)-(b.source.queueTicket??b.id)||a.id-b.id);
}
export function queueRank(s,bot){
 if(!bot.source?.queueKey)return -1;
 return queueMembers(s,bot.source.queueKey).findIndex(b=>b.id===bot.id);
}
export function queueWaitingPoint(bot,rank){
 const src=bot.source;
 if(!src)return null;
 const n=Math.max(0,rank);
 // The front position is the true pickup point. Behind it, a *single-file*
 // line stands at least 10 inches clear of the next physical robot body.
 // Main warehouse sources queue along the open rear crosswalk, avoiding shelves.
 if(src.type==='dock'||src.type==='crate'){
  const direction=src.type==='dock'?-1:src.crateId===1?-1:1;
  return {x:src.x+direction*Math.min(n,ACTIVE_QUEUE_SLOTS)*ROBOT_SPAWN_PITCH,
   z:src.z};
 }
 // Belt and pile queues run along the length of their working aisle.
 return {x:src.x,z:Math.max(11.2,Math.min(90.2,src.z+n*ROBOT_SPAWN_PITCH))};
}
export function pickupAvailable(s,source,floor){
 if(!source)return false;
 if(source.type==='dock'||source.type==='crate')return true;
 if(source.type==='pile')return !!s.stockPiles[source.index]?.count&&s.stockPiles[source.index].floor===floor;
 if(source.type==='freeBelt')return s.freeBelts.some(b=>b.id===source.id&&b.floor===floor&&b.items>0);
 if(source.type==='belt')return !!s.beltItems[floor]?.[source.aisle]?.[source.segment];
 return false;
}
export function reservePickup(s,bot,source){
 if(!source)return null;
 if(!Number.isFinite(s.robotQueueNextTicket))s.robotQueueNextTicket=1;
 bot.source={...source,queueKey:pickupKey(bot.floor,source),
  queueTicket:s.robotQueueNextTicket++};
 bot.pickupWait=0;
 return bot.source;
}
export function releasePickup(bot){
 bot.source=null;
 bot.pickupWait=0;
}
// Station service is serialized. No following worker can pick up even if
// it physically reaches the counter while the head is loading.
export function canCollectPickup(s,bot,dt){
 if(queueRank(s,bot)!==0)return false;
 bot.pickupWait=(bot.pickupWait||0)+Math.max(0,dt);
 return bot.pickupWait>=PICKUP_SERVICE_SECONDS;
}
