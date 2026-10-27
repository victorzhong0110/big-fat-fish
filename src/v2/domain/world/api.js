// @ts-check
import {createEmptyPlan,createStateChange} from '../plans.js';
import {createEntityState} from '../entities.js';
import {distanceSquared} from '../geometry.js';
import {resolveApiSpawnMultipliers} from '../difficulty.js';
import {planBossEncounter} from './adventure.js';
import {isWorldSafe} from './safety.js';
import {validatePressureReservation} from './pressureRules.js';
/** Safe withdrawal uses the same live threat boundary as saving, plus checkpoint proximity and released movement/fire. No pause can manufacture safety.
 * @implementationScope adventure-slice API
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/world/safety.js#isWorldSafe
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {boolean}
 */
export function canApiWithdraw(c){const s=c.state,p=s.world.entities[s.player.entityId];return !!s.api&&s.flow.phase==='exploring'&&!p.dead&&p.hp>0&&!s.input.firing&&!s.input.move.x&&!s.input.move.y&&!s.flow.queuedLevelRewards.length&&!s.pendingEffects.pending.length&&s.world.map.checkpointIds.some(id=>s.world.entities[id]&&distanceSquared(p.position,s.world.entities[id].position)<=96**2)&&isWorldSafe(c,p.position);}
/** Start/cancel a real three-second world-time hold. A new hold never resumes a partly finished prior attempt.
 * @implementationScope adventure-slice API
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/api.js#canApiWithdraw
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @param {string} type
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planApiWithdrawal(c,type){const s=c.state;if(!s.api)return createEmptyPlan();const p=s.world.entities[s.player.entityId];if(type==='StartWithdrawal'&&(!canApiWithdraw(c)||s.api.withdrawal))return createEmptyPlan();return {...createEmptyPlan(),changes:[createStateChange('runtime','api','setApiState',{...s.api,withdrawal:type==='StartWithdrawal'?{startedAt:s.tick,position:p.position,hpDamageTotal:Number(p.runtime.hpDamageTotal??0)}:null})]};}
/** Reuse the same three tested Boss factories, replacing every created identity (including nodes/covers) with a stage-unique ID. The temporary beacon state is only a construction input and is never committed.
 * @implementationScope adventure-slice API
 * @calls domain/difficulty.js#resolveApiSpawnMultipliers
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/adventure.js#planBossEncounter
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planApiBossEncounter(c){
 const s=c.state,a=s.api;if(!a||s.bosses.some(b=>!s.world.entities[b.entityId]?.dead))return createEmptyPlan();const strength=resolveApiSpawnMultipliers(a.elapsedTicks);if(!strength.ok)throw new Error(strength.message);const faction=/** @type {import('../../contracts.d.ts').Faction} */(['claude','gpt','grok'][a.bossIndex%3]),fake={...s,start:{...s.start,bossFaction:faction,difficulty:{...s.start.difficulty,hpMultiplier:strength.value.hp,damageMultiplier:strength.value.damage}},bosses:[],world:{...s.world,objectives:s.world.objectives.map((o,i)=>o.kind==='beacon'?{...o,completed:true}:o)}};
 const plan=planBossEncounter({...c,state:fake}),ids=new Map();for(const ch of plan.changes)if(ch.operation==='putEntity')ids.set(ch.id,`api:${a.bossIndex}:${ch.id}`);
 const bossChange=plan.changes.find(ch=>ch.operation==='setBosses'),raw=/** @type {{bosses:readonly import('../../contracts.d.ts').BossState[]}|undefined} */(bossChange?.payload);for(const b of raw?.bosses??[])for(const node of b.resetNodes){const nodeId=`api:${a.bossIndex}:${node.id}`;ids.set(node.id,nodeId);ids.set(`marker:${node.id}`,`marker:${nodeId}`);}
 const rewrite=(/** @type {import('../../contracts.d.ts').Json} */value)=>JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='string'?(ids.get(v)??v):v));
 const changes=plan.changes.map(ch=>({...ch,id:ids.get(ch.id)??ch.id,payload:rewrite(ch.payload)}));
 for(const ch of changes){if(ch.operation==='putEntity'){const e=/** @type {import('../../contracts.d.ts').EntityState} */(ch.payload);if(e.definitionId.startsWith('boss_'))e.runtime={...e.runtime,finalBoss:false,apiStage:true,damageMultiplier:strength.value.damage};}if(ch.operation==='setBosses'){const p=/** @type {{bosses:import('../../contracts.d.ts').BossState[]}} */(ch.payload);p.bosses=[...s.bosses,...p.bosses];}}
 return {...plan,changes:[...changes,createStateChange('runtime','api','setApiState',{...a,bossIndex:a.bossIndex+1,nextBossAt:a.nextBossAt+18000,bossWarningAt:null,withdrawal:null})]};
}
/** Advance API time once per world step; afterCombat reacts only after damage/death settlement, so death beats a completed withdrawal and a stage Boss never ends the run.
 * @implementationScope adventure-slice API
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/api.js#canApiWithdraw
 * @calls domain/world/api.js#planApiBossEncounter
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @param {boolean} afterCombat
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planApiWorldAdvance(c,afterCombat=false){
 const s=c.state;if(!s.api||!['exploring','boss'].includes(s.flow.phase))return createEmptyPlan();const a={...s.api},changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]),events=/** @type {import('../../contracts.d.ts').DomainEvent[]} */([]),p=s.world.entities[s.player.entityId];
 if(afterCombat){
  if(p.dead||p.hp<=0)return createEmptyPlan();
  const ended=s.bosses.map(b=>s.world.entities[b.entityId]).find(e=>e?.dead&&e.runtime.apiStage===true&&e.runtime.apiFinished!==true);
  if(ended){for(const child of Object.values(s.world.entities))if(child.id!==ended.id&&child.sourceId===ended.id&&(child.runtime.resetNodeOwner===ended.id||child.definitionId==='gpt_node_marker'||child.runtime.bossGround===true))changes.push(createStateChange('world',child.id,'removeEntity',{}));a.calmUntil=s.tick+900;a.nextBossAt=Math.max(a.nextBossAt,a.calmUntil);changes.push(createStateChange('entity',ended.id,'setEntityRuntime',{runtime:{...ended.runtime,apiFinished:true}}),createStateChange('flow','phase','setFlowPhase',{phase:'exploring',resumePhase:null}));const removed=s.world.spawnQueue.filter(r=>r.bossOwner===ended.id);if(removed.length)changes.push(createStateChange('world','api','setSpawnDirector',{queue:s.world.spawnQueue.filter(r=>r.bossOwner!==ended.id),budgets:s.world.budgets.map(b=>({...b,reserved:b.reserved-removed.filter(r=>r.budgetId===b.id).length})),nextAt:Math.max(s.spawnDirectorNextAt??0,a.calmUntil)}));}
  if(a.withdrawal){const hold=a.withdrawal,interrupted=!canApiWithdraw(c)||distanceSquared(p.position,hold.position)>.01||Number(p.runtime.hpDamageTotal??0)!==hold.hpDamageTotal;if(interrupted)a.withdrawal=null;else if(s.tick-hold.startedAt>=180){a.withdrawal=null;changes.push(createStateChange('flow','phase','setFlowPhase',{phase:'withdrawal',resumePhase:null}),createStateChange('runtime','input','setInput',{...s.input,move:{x:0,y:0},firing:false,heldKeys:[],pointerIds:[]}));}}
  if(!changes.length&&a.withdrawal===s.api.withdrawal)return createEmptyPlan();
 }else{
  if(a.lastAdvancedTick===s.tick)return createEmptyPlan();a.lastAdvancedTick=s.tick;a.elapsedTicks++;const minute=Math.floor(a.elapsedTicks/3600);if(a.materialMinute!==minute){a.materialMinute=minute;a.fragmentsThisMinute=0;a.partsThisMinute=0;}
  const live=s.bosses.some(b=>!s.world.entities[b.entityId]?.dead);
  if(!live&&!a.withdrawal&&s.tick>=a.calmUntil){if(a.bossWarningAt!==null&&s.tick>=a.bossWarningAt+240)return planApiBossEncounter({...c,state:{...s,api:a}});if(a.bossWarningAt===null&&a.elapsedTicks>=a.nextBossAt){a.bossWarningAt=s.tick;events.push({id:`apiWarning:${s.runId}:${a.bossIndex}`,runId:s.runId,tick:s.tick,seq:0,type:'ApiBossWarning',sourceId:null,targetId:null,payload:{faction:['claude','gpt','grok'][a.bossIndex%3],seconds:4}});const id=`apiWarning:${a.bossIndex}`;changes.push(createStateChange('world',id,'putEntity',createEntityState(id,'world_blast','objective','neutral',{x:2550,y:1750},{radius:90,expiresAt:s.tick+240,runtime:{visualOnly:true}})));}}
 }
 return {...createEmptyPlan(),changes:[...changes,createStateChange('runtime','api','setApiState',a)],events};
}
/** API additional pressure rotates every 90 seconds with four-second warnings; blocked schedules are deferred, never piled into a catch-up queue.
 * @implementationScope adventure-slice API
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/pressureRules.js#validatePressureReservation
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planApiPressure(c){const s=c.state,a=s.api;if(!a||s.flow.phase!=='exploring'||a.withdrawal||a.bossWarningAt!==null||s.tick<a.calmUntil||s.tick<a.nextPressureAt||s.world.pressureEvents.some(e=>e.phase==='queued'&&e.runtime.kind==='coordinator'&&Number(e.runtime.gapUntil)>s.tick))return createEmptyPlan();const n=a.pressureSeq,kind=n%3===2?'tideReverse':'apiWave',r=validatePressureReservation(c,{id:`apiPressure:${n}`,mechanicId:['mech_02_reinforcements','mech_08_grok_flanks','mech_14_anomaly'][n%3],budgetId:'pursuers',phase:'queued',startedAt:null,remaining:4,runtime:{kind,count:kind==='apiWave'?6:0,currentId:'current:0',durationTicks:kind==='apiWave'?1800:720,title:'API调用 · 额外压力'}});return {...createEmptyPlan(),changes:[...(r.ok?[createStateChange('world','pressure','setPressureEvents',{events:[...s.world.pressureEvents,r.value]})]:[]),createStateChange('runtime','api','setApiState',{...a,nextPressureAt:s.tick+(r.ok?5400:60),pressureSeq:n+(r.ok?1:0)})]};}
