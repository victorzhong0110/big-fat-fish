import {localWorldId} from './regionRules.js';
// @ts-check
import {createEmptyPlan,createStateChange} from '../plans.js';
import {createEntityState} from '../entities.js';
import {distanceSquared} from '../geometry.js';
import {canCloseMapPassage} from '../navigation.js';
import {planWorldReward} from '../rewards.js';
import {validatePressureReservation} from './pressureRules.js';
/** @param {import('../../contracts.d.ts').EvaluationContext} c @param {string} id @param {string} mechanicId @param {string} budgetId @param {Record<string,import('../../contracts.d.ts').Json>} runtime @param {number} warning */
function event(c,id,mechanicId,budgetId,runtime,warning=4){return validatePressureReservation(c,{id,mechanicId,budgetId,runtime,phase:'queued',startedAt:null,remaining:warning});}
/** @param {import('../../contracts.d.ts').EvaluationContext} c @param {import('../../contracts.d.ts').PressureEvent} e @param {import('../../contracts.d.ts').StateChange[]} changes */
function withEvent(c,e,changes=[]){return {...createEmptyPlan(),changes:[...changes,createStateChange('world','pressure','setPressureEvents',{events:[...c.state.world.pressureEvents,e]})]};}
/** A visible 40-HP signal belongs to the actual started beacon, has a finite rewardless budget, and cannot be recreated after destruction.
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/pressureRules.js#validatePressureReservation
 * @param {import('../../contracts.d.ts').EvaluationContext} c @param {string} objectiveId
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planObjectiveSignal(c,objectiveId){
 const s=c.state,body=s.world.entities[objectiveId];if(!s.start.difficulty.mechanicIds.includes('mech_11_objective_signal')||!body||body.runtime.signalCreated===true)return createEmptyPlan();const id=`signal:${objectiveId}`,pressureId=`pressure:${id}`,r=event(c,pressureId,'mech_11_objective_signal',`signalBudget:${objectiveId}`,{kind:'signal',signalId:id,objectiveId,count:0,nextSignalAt:s.tick+360,durationTicks:3600,rewardless:true,title:'目标增援信号'});if(!r.ok)return createEmptyPlan();
 return withEvent(c,r.value,[createStateChange('entity',body.id,'setEntityRuntime',{runtime:{...body.runtime,signalCreated:true}}),createStateChange('world',id,'putEntity',createEntityState(id,'world_signal','enemy','enemy',{x:body.position.x+160,y:body.position.y},{hp:40,maxHp:40,radius:20,runtime:{noAi:true,noRewardTarget:true,spawnGroup:pressureId}}))]);
}
/** Explicit optional elite/integration activation. No spawn or reward occurs merely by walking past its marker.
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/pressureRules.js#validatePressureReservation
 * @calls domain/world/regionRules.js#localWorldId
 * @param {import('../../contracts.d.ts').EvaluationContext} c @param {string} entityId
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planChallengeInteraction(c,entityId){
 const s=c.state,e=s.world.entities[entityId],player=s.world.entities[s.player.entityId];if(!e||e.runtime.started===true||s.flow.phase!=='exploring'||distanceSquared(e.position,player.position)>96**2)return createEmptyPlan();
 if(e.runtime.challengeKind==='integration'){if(!s.start.difficulty.mechanicIds.includes('mech_15_integration'))return createEmptyPlan();const parent={id:`pressure:${e.id}`,mechanicId:'mech_15_integration',budgetId:localWorldId(s,'integrationBudget'),phase:/** @type {const} */('queued'),startedAt:s.tick,remaining:0,runtime:{kind:'coordinator',stage:0,markerId:e.id,gapUntil:s.tick}};return withEvent(c,parent,[createStateChange('entity',e.id,'setEntityRuntime',{runtime:{...e.runtime,started:true}})]);}
 const faction=String(e.runtime.challengeKind),grok=faction==='grok',enemyId=grok?'enemy_grok_bot':faction==='gpt'?'enemy_gpt_hoots':'enemy_claude_guard',r=event(c,`pressure:${e.id}`,'mech_01_exploration',`eliteBudget:${e.id}`,{kind:'elite',eliteOwner:e.id,count:grok?24:1,enemyId,individualElite:!grok,durationTicks:18000,title:`精英挑战 · ${faction}`},1.5);if(!r.ok)return createEmptyPlan();
 return withEvent(c,r.value,[createStateChange('entity',e.id,'setEntityRuntime',{runtime:{...e.runtime,started:true}})]);
}
/** @param {import('../../contracts.d.ts').EvaluationContext} c @param {import('../../contracts.d.ts').PressureEvent} e */
function eliteReward(c,e){const s=c.state,owner=s.world.entities[String(e.runtime.eliteOwner)];if(!owner||owner.runtime.completed===true)return createEmptyPlan();const id=`challengeReward:${owner.id}`,changes=[createStateChange('entity',owner.id,'setEntityRuntime',{runtime:{...owner.runtime,completed:true}}),createStateChange('runtime',id,'recordReward',{})];
 for(const[kind,amount]of /** @type {[string,number][]} */([['gpuFragment',4],['part',3]])){const key=`${id}:${kind}`;changes.push(createStateChange('world',key,'putPickup',{id:key,kind,amount,position:owner.position,instanceId:null,collected:false}));}
 const pool=['mcp_bubble','mcp_fan','mcp_vector','mcp_stream','mcp_return','mcp_batch','skill_cache','skill_batch','skill_redirect','skill_sandbox','skill_fork','skill_rollback','skill_overclock'],definitionId=pool[(s.seed+owner.id.length)%pool.length],instanceId=`${s.runId}:${id}:gear`,key=`${id}:gear`,weapon=definitionId.startsWith('mcp_');changes.push(createStateChange('world',key,'putPickup',{id:key,kind:weapon?'weapon':'skill',amount:1,position:{x:owner.position.x+35,y:owner.position.y},instanceId,collected:false,...(weapon?{weapon:{instanceId,definitionId,originalQuality:1,cooldown:0,temporaryQuality:null,updateExpiresAt:null}}:{skill:{instanceId,definitionId,cooldown:0}})}));return {...createEmptyPlan(),changes};}
/** Priority coordinator: completed rewards, inherited handoff, optional three-stage challenge, then at most two safe anomalies per biome.
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/navigation.js#canCloseMapPassage
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/rewards.js#planWorldReward
 * @calls domain/world/pressureRules.js#validatePressureReservation
 * @calls domain/world/regionRules.js#localWorldId
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planLateSchedule(c){
 const s=c.state;if(s.flow.phase!=='exploring')return createEmptyPlan();const player=s.world.entities[s.player.entityId];
 for(const e of s.world.pressureEvents)if(e.phase==='completed'&&e.runtime.kind==='elite'&&s.world.entities[String(e.runtime.eliteOwner)]?.runtime.completed!==true)return eliteReward(c,e);
 if(s.world.pressureEvents.some(e=>e.phase==='queued'&&e.runtime.kind==='coordinator'&&Number(e.runtime.gapUntil)>s.tick))return createEmptyPlan();
 if(s.start.difficulty.mechanicIds.includes('mech_13_handoff'))for(const e of s.world.pressureEvents.filter(e=>e.phase==='active'&&e.runtime.kind==='elite'&&e.runtime.handoffDone!==true)){
  const budget=s.world.budgets.find(b=>b.id===e.budgetId);if(!budget)continue;const living=Object.values(s.world.entities).filter(b=>b.runtime.spawnGroup===e.id&&!b.dead),remaining=living.reduce((n,b)=>n+b.hp/b.maxHp,0)+budget.total-budget.spawned;if(remaining>budget.total*.2)continue;
  const r=event(c,`handoff:${e.id}`,'mech_13_handoff',localWorldId(s,'pursuers'),{kind:'handoff',count:6,title:'遭遇衔接'},3);if(!r.ok)continue;return {...createEmptyPlan(),changes:[createStateChange('world','pressure','setPressureEvents',{events:[...s.world.pressureEvents.map(p=>p.id===e.id?{...p,runtime:{...p.runtime,handoffDone:true}}:p),r.value]}),createStateChange('world','handoff','setSpawnDirector',{queue:s.world.spawnQueue,budgets:s.world.budgets,nextAt:Math.max(s.tick,Number(s.spawnDirectorNextAt??0))+720})]};
 }
 for(const parent of s.world.pressureEvents.filter(e=>e.phase==='queued'&&e.runtime.kind==='coordinator')){
  const stage=Number(parent.runtime.stage),children=s.world.pressureEvents.filter(e=>e.runtime.parentId===parent.id&&Number(e.runtime.stage)===stage),living=Object.values(s.world.entities).some(e=>!e.dead&&children.some(ch=>e.runtime.spawnGroup===ch.id)),pending=s.world.spawnQueue.some(r=>children.some(ch=>ch.id===r.groupId));
  if(children.length&&children.every(e=>['completed','cancelled'].includes(e.phase))&&!living&&!pending){if(children.some(e=>Number(e.runtime.spawnedCount??0)===0&&!['tideReverse','shortcut'].includes(String(e.runtime.kind))&&e.runtime.deviceDestroyed!==true)){const marker=s.world.entities[String(parent.runtime.markerId)];return {...createEmptyPlan(),changes:[createStateChange('world','pressure','setPressureEvents',{events:s.world.pressureEvents.map(e=>e.id===parent.id?{...e,phase:'cancelled'}:e)}),createStateChange('entity',marker.id,'setEntityRuntime',{runtime:{...marker.runtime,failed:true}})]};}if(stage===2){const objective=s.world.objectives.find(o=>o.id===parent.runtime.markerId),reward=objective?planWorldReward(c,objective.rewardId).plan:createEmptyPlan();return {...reward,changes:[...reward.changes,createStateChange('world','pressure','setPressureEvents',{events:s.world.pressureEvents.map(e=>e.id===parent.id?{...e,phase:'completed'}:e)}),createStateChange('world','objectives','setObjectives',{objectives:s.world.objectives.map(o=>o.id===parent.runtime.markerId?{...o,completed:true,active:false}:o)})]};}return {...createEmptyPlan(),changes:[createStateChange('world','pressure','setPressureEvents',{events:s.world.pressureEvents.map(e=>e.id===parent.id?{...e,runtime:{...e.runtime,stage:stage+1,gapUntil:s.tick+900}}:e)})]};}
  if(children.length||Number(parent.runtime.gapUntil)>s.tick)continue;let prospective=c;const added=/** @type {import('../../contracts.d.ts').PressureEvent[]} */([]),changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]);
  const pairs=[['mech_02_reinforcements','mech_08_grok_flanks'],['mech_11_objective_signal','mech_14_anomaly'],['mech_03_gpt_support','mech_12_gpt_four_roles']];
  for(let n=0;n<2;n++){const id=`${parent.id}:stage:${stage}:${n}`,kind=stage===1?(n===0?'signal':'tideReverse'):'integrationWave',signalId=`device:${id}`,rt=/** @type {Record<string,import('../../contracts.d.ts').Json>} */({kind,parentId:parent.id,stage,count:stage===0?6:stage===2?4:0,durationTicks:stage===1&&n===1?720:1800,title:`综合压力 · 第${stage+1}段`,...(stage===2?{species:['enemy_gpt_rocky','enemy_gpt_dewey','enemy_gpt_hoots','enemy_gpt_seedy']}:{}),...(stage===1&&n===0?{signalId,nextSignalAt:s.tick+360,maxRequests:12,rewardless:true}:{}),...(stage===1&&n===1?{currentId:localWorldId(s,'current:integration')}:{})}),r=event(prospective,id,pairs[stage][n],localWorldId(s,'integrationBudget'),rt);if(!r.ok){added.length=0;break;}added.push(r.value);prospective={...c,state:{...s,world:{...s.world,pressureEvents:[...s.world.pressureEvents,...added]}}};if(kind==='signal'){const marker=s.world.entities[String(parent.runtime.markerId)];changes.push(createStateChange('world',signalId,'putEntity',createEntityState(signalId,'world_signal','enemy','enemy',{x:marker.position.x+160,y:marker.position.y},{hp:40,maxHp:40,radius:20,runtime:{noAi:true,noRewardTarget:true,spawnGroup:id}})));}}
  if(added.length===2)return {...createEmptyPlan(),changes:[...changes,createStateChange('world','pressure','setPressureEvents',{events:[...s.world.pressureEvents,...added]})]};
 }
 if(!s.start.difficulty.mechanicIds.includes('mech_14_anomaly'))return createEmptyPlan();const previous=s.world.pressureEvents.filter(e=>e.mechanicId==='mech_14_anomaly'&&e.runtime.biome===s.world.map.biomeIndex&&!e.runtime.parentId),last=previous.at(-1);if(previous.length>=2||s.tick-Number(last?.startedAt??0)<7200)return createEmptyPlan();
 const kind=(s.seed+previous.length)%2?'shortcut':'tideReverse',target=s.world.entities[localWorldId(s,kind==='shortcut'?'shortcut:0':'current:0')];if(!target||distanceSquared(target.position,player.position)>800**2||kind==='shortcut'&&!canCloseMapPassage(c,target.id))return createEmptyPlan();const r=event(c,`anomaly:${s.world.map.biomeIndex}:${previous.length}`,'mech_14_anomaly',localWorldId(s,'anomalyBudget'),{kind,count:0,durationTicks:720,biome:s.world.map.biomeIndex,...(kind==='shortcut'?{obstacleId:target.id}:{currentId:target.id}),title:kind==='shortcut'?'捷径即将关闭12秒':'局部潮流即将反向'});return r.ok?withEvent(c,r.value):createEmptyPlan();
}
