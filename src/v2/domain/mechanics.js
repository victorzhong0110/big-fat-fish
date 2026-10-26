// @ts-check
import {createEmptyPlan,createStateChange} from './plans.js';
import {distanceSquared} from './geometry.js';
import {toJson} from './serialization.js';
/** Immutable cumulative mechanic lookup.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state @param {string} id @returns {boolean}
 */
export function hasMechanic(state,id){return state.start.difficulty.mechanicIds.includes(id);}
/** Native AI consumes support/combo parameters; real claw and encounter events alone create their corresponding plans.
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/mechanics.js#hasMechanic
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @param {string|null} onlyId
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planMechanicEvent(context,event,onlyId=null){
 const s=context.state,player=s.world.entities[s.player.entityId],active=(/** @type {string} */id)=>hasMechanic(s,id)&&(!onlyId||onlyId===id),changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../contracts.d.ts').EffectRequest[]} */([]),events=/** @type {import('../contracts.d.ts').DomainEvent[]} */([]);
 if(active('mech_02_reinforcements')&&event.type==='WorldTick'&&s.flow.phase==='exploring'){
  const camp=s.world.objectives.map(o=>s.world.entities[o.id]).find(e=>e?.runtime.reinforcementPending===true&&distanceSquared(e.position,player.position)<=700**2);
  if(camp){const index=Number(camp.runtime.campIndex),prefix=String(camp.runtime.campPrefix??''),budgetId=`${prefix}camp:${index}`,budget=s.world.budgets.find(b=>b.id===budgetId);if(budget&&budget.reserved===0&&budget.spawned===4){const queue=[...s.world.spawnQueue],groups=[['codex','dewey','rocky'],['fireball','hoots','seedy'],['stacky','codex','dewey']];
   for(let n=4;n<10;n++){const pet=n===4,enemyId=pet?`enemy_gpt_${groups[index][2]}`:'enemy_grok_bot';queue.push({id:`${prefix}resident:${index}:${n}`,groupId:budgetId,budgetId,enemyId,position:{x:player.position.x+(n%2?-800:800),y:player.position.y+(n%2?-160:160)},at:s.tick+(n<7?240:480),modelProfileId:s.start.difficulty.modelProfileIds[pet?'gpt':'grok'],rewardPolicy:'normal',distillEligible:true});}
   changes.push(createStateChange('entity',camp.id,'setEntityRuntime',{runtime:{...camp.runtime,reinforcementPending:false}}),createStateChange('world',budgetId,'setSpawnDirector',{queue,budgets:s.world.budgets.map(b=>b.id===budgetId?{...b,reserved:6}:b),nextAt:s.spawnDirectorNextAt??720}));
  }}
 }
 if(active('mech_04_claude_break')&&event.type==='HeavyClawResolved'&&event.sourceId){const p=/** @type {{point:import('../contracts.d.ts').Vec2;facing:number;range:number;cosine:number;amount:number}} */(event.payload);
  for(const cover of Object.values(s.world.entities).filter(e=>e.kind==='obstacle'&&e.runtime.breakable===true&&e.hp>0&&distanceSquared(e.position,p.point)<=(p.range+e.radius)**2)){const x=cover.position.x-p.point.x,y=cover.position.y-p.point.y,d=Math.hypot(x,y);if(d>0&&(x*Math.cos(p.facing)+y*Math.sin(p.facing))/d<p.cosine)continue;const id=`${event.id}:${cover.id}`;effects.push({id,sourceId:event.sourceId,chainId:event.id,generation:0,kind:'damage',payload:toJson({id,sourceId:event.sourceId,creditOwner:'enemy',sourceKind:'enemy',attackId:event.id,projectileId:null,targetId:cover.id,baseDamage:p.amount,contact:p.point,incomingDirection:{x:Math.cos(p.facing),y:Math.sin(p.facing)},generation:0,chainId:event.id,critEligible:false,expiresAt:s.tick+1})});}
 }
 if(active('mech_04_claude_break')&&event.type==='DamageResolved'&&event.targetId){const cover=s.world.entities[event.targetId];if(cover?.runtime.breakable===true&&cover.hp<=0){changes.push(createStateChange('world',cover.id,'removeEntity',{}),createStateChange('world',s.world.map.id,'setMap',{...s.world.map,obstacleIds:s.world.map.obstacleIds.filter(id=>id!==cover.id),navigationRevision:s.world.map.navigationRevision+1}));events.push({id:`broken:${cover.id}`,runId:s.runId,tick:s.tick,seq:0,type:'CoverBroken',sourceId:event.sourceId,targetId:cover.id,payload:{}});}}
 return {...createEmptyPlan(),changes,effects,events};
}
