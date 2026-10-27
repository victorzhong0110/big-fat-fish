import {planApiPressure} from './api.js';
// @ts-check
import {validatePressureReservation} from './pressureRules.js';
import {planLateSchedule} from './lateMechanics.js';
import {canCloseMapPassage} from '../navigation.js';
import {createEmptyPlan,createStateChange} from '../plans.js';
import {distanceSquared} from '../geometry.js';
/** Explicit alarms own pressure below tier fourteen; autonomous anomaly scheduling is gated to later tiers.
 * @calls domain/world/api.js#planApiPressure
 * @calls domain/world/lateMechanics.js#planLateSchedule
 * @param {import('../../contracts.d.ts').EvaluationContext} context @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planPressureSchedule(context){const late=planLateSchedule(context);return late.changes.length?late:planApiPressure(context);}
/** Pure reservation under inherited mechanics, finite budget, two pressure slots, and checkpoint/Boss priority.
 * @calls domain/world/pressureRules.js#validatePressureReservation
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').PressureEvent} event
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').PressureEvent>}
 */
export function reservePressureEvent(context,event){return validatePressureReservation(context,event);}

/** A telegraph commits one wave. Cancelling/expiring refunds unspawned reservations, never duplicates the budget.
 * @calls domain/navigation.js#canCloseMapPassage
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planPressureEventAdvance(context){
 const s=context.state;if(!s.world.pressureEvents.some(e=>['telegraph','active','queued'].includes(e.phase)))return createEmptyPlan();
 const pressure=s.world.pressureEvents.map(e=>({...e,runtime:{...e.runtime}})),budgets=s.world.budgets.map(b=>({...b})),changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]),diagnostics=/** @type {import('../../contracts.d.ts').Diagnostic[]} */([]);let queue=[...s.world.spawnQueue];
 const finish=(/** @type {typeof pressure[number]} */e,/** @type {'cancelled'|'completed'} */phase)=>{e.phase=phase;e.remaining=0;const removed=queue.filter(r=>r.groupId===e.id);e.runtime.spawnedCount=Math.max(0,Number(e.runtime.requestedCount??0)-removed.length);queue=queue.filter(r=>r.groupId!==e.id);const b=budgets.find(b=>b.id===e.budgetId);if(b)b.reserved-=removed.length;if(e.runtime.kind==='shortcut'&&e.runtime.closed===true){const door=s.world.entities[String(e.runtime.obstacleId)];if(door){changes.push(createStateChange('entity',door.id,'setEntityRuntime',{runtime:{...door.runtime,solid:false}}),createStateChange('world',s.world.map.id,'setMap',{...s.world.map,navigationRevision:s.world.map.navigationRevision+1}));}}};
 const wave=(/** @type {typeof pressure[number]} */e,/** @type {number} */amount,/** @type {string} */suffix,delay=0)=>{const budget=budgets.find(b=>b.id===e.budgetId),count=Math.min(24,amount,budget?budget.total-budget.spawned-budget.reserved:0),player=s.world.entities[s.player.entityId],species=/** @type {readonly string[]} */(e.runtime.species??[String(e.runtime.enemyId??'enemy_grok_bot')]);if(!budget)return;
  for(let n=0;n<count;n++){const enemyId=species[n%species.length],faction=enemyId.startsWith('enemy_gpt_')?'gpt':enemyId==='enemy_claude_guard'?'claude':'grok',flanks=faction==='grok'&&s.start.difficulty.mechanicIds.includes('mech_08_grok_flanks');queue.push({id:`${e.id}:${suffix}:${n}`,groupId:e.id,budgetId:e.budgetId,enemyId,position:{x:player.position.x+(n%2?800:-800),y:player.position.y+(n%2?180:-180)},at:s.tick+delay+Math.floor(n/8)*240+(flanks&&n%2?120:0),modelProfileId:s.start.difficulty.modelProfileIds[faction],rewardPolicy:e.runtime.rewardless===true?'none':e.runtime.individualElite===true?'elite':'normal',distillEligible:e.runtime.rewardless!==true,elite:e.runtime.individualElite===true});}budget.reserved+=count;e.runtime.requestedCount=Number(e.runtime.requestedCount??0)+count;};
 for(const e of pressure){if(!['telegraph','active','queued'].includes(e.phase))continue;if(s.flow.phase==='boss'){finish(e,'cancelled');const marker=s.world.entities[String(e.runtime.eliteOwner??e.runtime.markerId??'')];if(marker)changes.push(createStateChange('entity',marker.id,'setEntityRuntime',{runtime:{...marker.runtime,failed:true}}));continue;}if(e.phase==='queued')continue;
  if(e.runtime.kind==='signal'){const device=s.world.entities[String(e.runtime.signalId)],objective=s.world.objectives.find(o=>o.id===e.runtime.objectiveId);if(!device||device.dead||device.hp<=0||objective?.completed){if(device&&(device.dead||device.hp<=0))e.runtime.deviceDestroyed=true;finish(e,'completed');continue;}}
  if(e.phase==='telegraph'){e.remaining=Math.max(0,(Number(e.runtime.activateAt)-s.tick)/60);if(e.remaining>0)continue;
   if(e.runtime.kind==='shortcut'){const id=String(e.runtime.obstacleId),door=s.world.entities[id];if(!door||!canCloseMapPassage(context,id)){finish(e,'cancelled');diagnostics.push({code:'UNSAFE_PASSAGE',message:'Closure cancelled to preserve a legal route',relatedIds:[id]});continue;}changes.push(createStateChange('entity',id,'setEntityRuntime',{runtime:{...door.runtime,solid:true}}),createStateChange('world',s.world.map.id,'setMap',{...s.world.map,navigationRevision:s.world.map.navigationRevision+1}));e.runtime.closed=true;}
   e.phase='active';e.runtime.endAt=s.tick+Number(e.runtime.durationTicks??1800);e.remaining=Number(e.runtime.durationTicks??1800)/60;wave(e,Number(e.runtime.count??0),'initial');
  }else{e.remaining=Math.max(0,(Number(e.runtime.endAt)-s.tick)/60);const b=budgets.find(b=>b.id===e.budgetId),cleared=e.runtime.kind==='elite'&&b&&b.spawned>=b.total&&!queue.some(r=>r.groupId===e.id)&&!Object.values(s.world.entities).some(body=>body.runtime.spawnGroup===e.id&&!body.dead);if(e.remaining===0||cleared){finish(e,e.runtime.kind==='elite'&&!cleared?'cancelled':'completed');if(e.runtime.kind==='elite'&&!cleared){const marker=s.world.entities[String(e.runtime.eliteOwner)];if(marker)changes.push(createStateChange('entity',marker.id,'setEntityRuntime',{runtime:{...marker.runtime,failed:true}}));}continue;}}
  if(e.runtime.kind==='signal'&&s.tick>=Number(e.runtime.nextSignalAt)){const seq=Number(e.runtime.signalSeq??0)+1;wave(e,Math.max(0,Math.min(3,Number(e.runtime.maxRequests??30)-Number(e.runtime.requestedCount??0))),`signal:${seq}`,90);e.runtime.nextSignalAt=s.tick+360;e.runtime.signalSeq=seq;}
 }
 return {...createEmptyPlan(),changes:[...changes,createStateChange('world','pressure','setPressureEvents',{events:pressure}),createStateChange('world','pressure','setSpawnDirector',{queue,budgets,nextAt:s.spawnDirectorNextAt??720})],diagnostics};
}
