// @ts-check
import {createEmptyPlan,createStateChange} from '../plans.js';
import {distanceSquared} from '../geometry.js';
/** Explicit alarms own pressure below tier fourteen; autonomous anomaly scheduling is gated to later tiers.
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').EvaluationContext} context @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planPressureSchedule(context){return createEmptyPlan();}
/** Pure reservation under inherited mechanics, finite budget, two pressure slots, and checkpoint/Boss priority.
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').PressureEvent} event
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').PressureEvent>}
 */
export function reservePressureEvent(context,event){
 const s=context.state,player=s.world.entities[s.player.entityId],fail=(/** @type {string} */message)=>({ok:/** @type {const} */(false),code:'PRESSURE_DEFERRED',message});
 if(s.flow.phase!=='exploring'||s.bosses.some(b=>!s.world.entities[b.entityId]?.dead)||s.world.map.checkpointIds.some(id=>s.world.entities[id]&&distanceSquared(player.position,s.world.entities[id].position)<=220**2))return fail('Boss/checkpoint safety has priority');
 if(!s.start.difficulty.mechanicIds.includes(event.mechanicId)||s.world.pressureEvents.some(e=>e.id===event.id)||s.world.pressureEvents.filter(e=>['telegraph','active'].includes(e.phase)).length>=2)return fail('Missing mechanic, duplicate or both pressure slots occupied');
 const budget=s.world.budgets.find(b=>b.id===event.budgetId);if(!budget||budget.total-budget.spawned-budget.reserved<Number(event.runtime.count??0))return fail('Encounter budget unavailable');
 if(!event.id||!Number.isFinite(event.remaining)||event.remaining<1.5)return fail('A complete visible warning is required');
 return {ok:true,value:{...structuredClone(event),phase:'telegraph',startedAt:s.tick,runtime:{...event.runtime,activateAt:s.tick+Math.ceil(event.remaining*60)}}};
}
/** A telegraph commits one wave. Cancelling/expiring refunds unspawned reservations, never duplicates the budget.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planPressureEventAdvance(context){
 const s=context.state;if(!s.world.pressureEvents.some(e=>['telegraph','active'].includes(e.phase)))return createEmptyPlan();
 const pressure=s.world.pressureEvents.map(e=>({...e,runtime:{...e.runtime}})),budgets=s.world.budgets.map(b=>({...b}));let queue=[...s.world.spawnQueue];const events=/** @type {import('../../contracts.d.ts').DomainEvent[]} */([]);
 for(const e of pressure){if(!['telegraph','active'].includes(e.phase))continue;
  if(s.flow.phase==='boss'){e.phase='cancelled';e.remaining=0;const removed=queue.filter(r=>r.groupId===e.id);queue=queue.filter(r=>r.groupId!==e.id);const b=budgets.find(b=>b.id===e.budgetId);if(b)b.reserved-=removed.length;continue;}
  if(e.phase==='telegraph'){
   e.remaining=Math.max(0,(Number(e.runtime.activateAt)-s.tick)/60);if(e.remaining>0)continue;e.phase='active';e.runtime.endAt=s.tick+1800;e.remaining=30;
   const budget=budgets.find(b=>b.id===e.budgetId),count=Math.min(24,Math.max(0,Number(e.runtime.count??0)),budget?budget.total-budget.spawned-budget.reserved:0),player=s.world.entities[s.player.entityId];
   if(budget){for(let n=0;n<count;n++)queue.push({id:`${e.id}:${n}`,groupId:e.id,budgetId:e.budgetId,enemyId:'enemy_grok_bot',position:{x:player.position.x+(n%2?800:-800),y:player.position.y+(n%2?180:-180)},at:s.tick+Math.floor(n/8)*240,modelProfileId:'grok_bot',rewardPolicy:e.runtime.rewardless===true?'none':'normal',distillEligible:e.runtime.rewardless!==true});budget.reserved+=count;}
   events.push({id:`active:${e.id}`,runId:s.runId,tick:s.tick,seq:events.length,type:'PressureActivated',sourceId:null,targetId:null,payload:{mechanicId:e.mechanicId}});
  }else{e.remaining=Math.max(0,(Number(e.runtime.endAt)-s.tick)/60);if(e.remaining===0){e.phase='completed';const removed=queue.filter(r=>r.groupId===e.id);queue=queue.filter(r=>r.groupId!==e.id);const b=budgets.find(b=>b.id===e.budgetId);if(b)b.reserved-=removed.length;}}
 }
 return {...createEmptyPlan(),changes:[createStateChange('world','pressure','setPressureEvents',{events:pressure}),createStateChange('world','pressure','setSpawnDirector',{queue,budgets,nextAt:s.spawnDirectorNextAt??720})],events};
}
