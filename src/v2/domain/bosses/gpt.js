// @ts-check
import {createEmptyPlan,createStateChange} from '../plans.js';
import {createEntityState} from '../entities.js';
import {distanceSquared,normalizeVector} from '../geometry.js';
import {resolveBodyDestination} from '../motionSolver.js';
import {toJson} from '../serialization.js';
/** @param {import('../../contracts.d.ts').EvaluationContext} c @param {import('../../contracts.d.ts').BossState} boss @param {import('../../contracts.d.ts').BossState} next */
function bossChange(c,boss,next){return createStateChange('world','bosses','setBosses',{bosses:c.state.bosses.map(b=>b.entityId===boss.entityId?next:b)});}
/** @param {import('../../contracts.d.ts').EvaluationContext} c @param {import('../../contracts.d.ts').DeepReadonly<import('../../contracts.d.ts').EntityState>} owner @param {import('../../contracts.d.ts').Vec2} point @param {string} id @param {number} angleOffset */
function bubble(c,owner,point,id,angleOffset){const a=Math.atan2(point.y-owner.position.y,point.x-owner.position.x)+angleOffset;return createStateChange('world',id,'putEntity',createEntityState(id,'projectile_bubble','projectile','enemy',owner.position,{sourceId:owner.id,attackId:id,radius:7,velocity:{x:Math.cos(a)*180,y:Math.sin(a)*180},expiresAt:c.state.tick+300,runtime:{sourceKind:'enemy',chainId:id,damage:10*Number(owner.runtime.damageMultiplier??1),maxHits:1,hitTargetIds:[],critEligible:false,reflectable:true}}));}
/** @param {import('../../contracts.d.ts').EvaluationContext} c @param {import('../../contracts.d.ts').BossState} boss */
function spawnEchoes(c,boss){const s=c.state,e=s.world.entities[boss.entityId],changes=[],species=['codex','dewey','fireball','codex'],count=Object.values(s.world.entities).filter(x=>x.runtime.echoOwner===e.id&&!x.dead).length;
 for(let n=0;n<Math.min(4,10-count);n++){const id=`echo:${e.id}:${boss.spawnGroupSeq}:${n}`,definitionId=`enemy_gpt_${species[n]}`,p=c.catalog.definitions[definitionId].parameters,point=resolveBodyDestination(c,e,{x:e.position.x+Math.cos(n*Math.PI/2)*170,y:e.position.y+Math.sin(n*Math.PI/2)*170});if(distanceSquared(point,s.world.entities[s.player.entityId].position)<80**2)continue;changes.push(createStateChange('world',id,'putEntity',createEntityState(id,definitionId,'enemy','enemy',point,{faction:'gpt',modelProfileId:s.start.difficulty.modelProfileIds.gpt,hp:Number(p.hp)*s.start.difficulty.hpMultiplier,maxHp:Number(p.hp)*s.start.difficulty.hpMultiplier,radius:Number(p.radius),rewardPolicy:'none',distillEligible:false,runtime:{echoOwner:e.id,moveSpeed:Number(p.moveSpeed),contactDamage:Number(p.contactDamage)*s.start.difficulty.damageMultiplier,damageMultiplier:s.start.difficulty.damageMultiplier,engaged:true}})));}
 return changes;
}
/** GPT's conditional reset is a local encounter transaction. The completion is deferred until after this tick's damage/deaths.
 * @implementationScope adventure-slice
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/motionSolver.js#resolveBodyDestination
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planGptBoss(context,boss){
 const state=context.state,entity=state.world.entities[boss.entityId],player=state.world.entities[state.player.entityId];if(!entity||entity.dead||entity.dying||player.dead)return createEmptyPlan();
 const rt={...entity.runtime},changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../../contracts.d.ts').EffectRequest[]} */([]),id=`gpt:${entity.id}:${state.tick}`;
 const reset=/** @type {{nodeId:string;completeAt:number}|null} */(rt.gptReset??null);
 let nextBoss={...boss,resetCooldown:Math.max(0,(Number(rt.resetReadyAt??0)-state.tick)/60)};
 if(reset){nextBoss.resetRemaining=Math.max(0,(reset.completeAt-state.tick)/60);if(state.tick>=reset.completeAt)rt.resetDue=true;}
 else if(entity.hp<=entity.maxHp*.55&&state.tick>=Number(rt.resetReadyAt??0)){
  const node=boss.resetNodes.find(n=>!n.consumed);if(node){rt.gptReset={nodeId:node.id,completeAt:state.tick+240};rt.gptCast=null;nextBoss.resetRemaining=4;changes.push(createStateChange('world',`marker:${node.id}`,'removeEntity',{}),createStateChange('world',node.id,'putEntity',createEntityState(node.id,'gpt_reset_node','enemy','enemy',node.position,{hp:45,maxHp:45,radius:22,sourceId:entity.id,runtime:{noAi:true,noRewardTarget:true,resetNodeOwner:entity.id}})));}
 }
 if(!rt.gptReset){
  if(Number(rt.echoDueAt??0)>0&&Number(rt.echoDueAt)<=state.tick){changes.push(...spawnEchoes(context,{...boss,spawnGroupSeq:boss.spawnGroupSeq+1}));nextBoss.spawnGroupSeq++;rt.echoDueAt=0;rt.echoReadyAt=state.tick+720;}
  if(!rt.echoDueAt&&state.tick>=Number(rt.echoReadyAt??720)){rt.echoDueAt=state.tick+90;rt.gptCast=null;}
  const cast=/** @type {{kind:string;point:import('../../contracts.d.ts').Vec2;executeAt:number}|null} */(rt.gptCast??null);
  if(cast&&state.tick>=cast.executeAt){for(let n=0;n<3;n++)changes.push(bubble(context,entity,cast.point,`${id}:fan:${n}`,(n-1)*Math.PI/4));rt.gptCast=null;rt.gptReadyAt=state.tick+150;rt.gptMoveIndex=Number(rt.gptMoveIndex??0)+1;}
  else if(!cast&&!rt.echoDueAt&&state.tick>=Number(rt.gptReadyAt??90)){
   if(Number(rt.gptMoveIndex??0)%2===0)rt.gptCast={kind:'fan',point:{...player.position},executeAt:state.tick+48};
   else{for(let n=0;n<2;n++){const groundId=`${id}:ground:${n}`,position={x:Math.max(80,Math.min(state.world.map.width-80,player.position.x+n*(player.position.x+160<state.world.map.width-80?160:-160))),y:player.position.y},danger=n===state.seed%2;changes.push(createStateChange('world',groundId,'putEntity',createEntityState(groundId,'gpt_answer_area','objective','neutral',position,{sourceId:entity.id,radius:70,expiresAt:state.tick+72,runtime:{bossGround:true,danger,revealAt:state.tick+30,executeAt:state.tick+60}})));}rt.gptMoveIndex=Number(rt.gptMoveIndex??0)+1;rt.gptReadyAt=state.tick+210;}
  }
 }
 for(const field of Object.values(state.world.entities).filter(e=>e.runtime.bossGround===true&&e.sourceId===entity.id))if(Number(field.runtime.executeAt)<=state.tick&&field.runtime.resolved!==true){
  if(field.runtime.danger===true&&distanceSquared(player.position,field.position)<=(field.radius+player.radius)**2){const damageId=`${field.id}:hit`;effects.push({id:damageId,sourceId:entity.id,chainId:field.id,generation:0,kind:'damage',payload:toJson({id:damageId,sourceId:entity.id,creditOwner:'enemy',sourceKind:'enemy',attackId:damageId,projectileId:null,targetId:player.id,baseDamage:16*Number(rt.damageMultiplier??1),contact:field.position,incomingDirection:{x:0,y:1},generation:0,chainId:field.id,critEligible:false,expiresAt:state.tick+1})});}changes.push(createStateChange('entity',field.id,'setEntityRuntime',{runtime:{...field.runtime,resolved:true,visualOnly:true}}));
 }
 const direction=normalizeVector({x:player.position.x-entity.position.x,y:player.position.y-entity.position.y}),moving=!rt.gptReset&&!rt.gptCast&&Math.sqrt(distanceSquared(entity.position,player.position))>350,velocity=moving?{x:direction.x*95,y:direction.y*95}:{x:0,y:0};
 changes.push(createStateChange('entity',entity.id,'setEntityRuntime',{runtime:rt}),createStateChange('entity',entity.id,'setEntityKinematics',{position:entity.position,previousPosition:entity.previousPosition,velocity,facingRadians:Math.atan2(direction.y,direction.x)}),bossChange(context,boss,nextBoss));
 return {...createEmptyPlan(),changes,effects};
}
/** Consume one reset attempt, restore only Boss HP, clear its old hostile objects, retain player attacks and schedule a warned echo wave.
 * @implementationScope adventure-slice
 * @calls domain/bosses/gpt.js#planGptResetInterrupt
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planGptReset(context,boss){
 const state=context.state,entity=state.world.entities[boss.entityId],reset=/** @type {{nodeId:string;completeAt:number}|null} */(entity?.runtime.gptReset??null),player=state.world.entities[state.player.entityId];
 if(!entity||entity.dead||entity.dying||entity.hp<=0||player.hp<=0||entity.runtime.resetDue!==true||!reset||reset.completeAt>state.tick)return createEmptyPlan();
 const node=state.world.entities[reset.nodeId];if(!node||node.dead||node.hp<=0)return planGptResetInterrupt(context,boss,reset.nodeId);
 const changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]);
 for(const object of Object.values(state.world.entities)){const echo=object.runtime.echoOwner===entity.id,hostile=object.sourceId===entity.id||state.world.entities[object.sourceId]?.runtime.echoOwner===entity.id;if(object.id!==entity.id&&(echo||hostile&&(object.kind==='projectile'||object.runtime.petZone||object.runtime.bossGround===true||object.runtime.resetNodeOwner===entity.id)))changes.push(createStateChange('world',object.id,'removeEntity',{}));}
 changes.push(createStateChange('entity',entity.id,'setHp',{hp:entity.maxHp}),createStateChange('entity',entity.id,'setEntityRuntime',{runtime:{...entity.runtime,gptReset:null,resetDue:false,resetReadyAt:state.tick+600,gptCast:null,gptReadyAt:state.tick+90,echoDueAt:state.tick+90,echoReadyAt:state.tick+810}}),bossChange(context,boss,{...boss,resetNodes:boss.resetNodes.map(n=>n.id===reset.nodeId?{...n,hp:0,consumed:true}:n),resetRemaining:0,resetCooldown:10}));
 return {...createEmptyPlan(),changes,events:[{id:`reset:${reset.nodeId}`,runId:state.runId,tick:state.tick,seq:0,type:'BossReset',sourceId:entity.id,targetId:entity.id,payload:{nodeId:reset.nodeId}}]};
}
/** A destroyed active node consumes the attempt without healing. Ten seconds later the next unused node may activate.
 * @implementationScope adventure-slice
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @param {string} nodeId
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planGptResetInterrupt(context,boss,nodeId){
 const state=context.state,entity=state.world.entities[boss.entityId],node=boss.resetNodes.find(n=>n.id===nodeId),reset=/** @type {{nodeId:string}|null} */(entity?.runtime.gptReset??null);if(!entity||entity.dead||!node||node.consumed||reset?.nodeId!==nodeId)return createEmptyPlan();
 const changes=[bossChange(context,boss,{...boss,resetNodes:boss.resetNodes.map(n=>n.id===nodeId?{...n,hp:0,consumed:true}:n),resetRemaining:0,resetCooldown:10}),createStateChange('entity',entity.id,'setEntityRuntime',{runtime:{...entity.runtime,gptReset:null,resetDue:false,resetReadyAt:state.tick+600,gptReadyAt:state.tick+90}})];
 return {...createEmptyPlan(),changes,events:[{id:`cracked:${nodeId}`,runId:state.runId,tick:state.tick,seq:0,type:'ResetCracked',sourceId:state.player.entityId,targetId:nodeId,payload:{bossId:entity.id}}]};
}
/** Keep the node record synchronized with actual HP, and interrupt on its one real death event.
 * @implementationScope adventure-slice
 * @calls domain/bosses/gpt.js#planGptResetInterrupt
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planGptBossEvent(context,event){const state=context.state,node=event.targetId?state.world.entities[event.targetId]:null,boss=state.bosses.find(b=>b.entityId===node?.runtime.resetNodeOwner);if(!node||!boss)return createEmptyPlan();if(event.type==='EntityDied')return planGptResetInterrupt(context,boss,node.id);if(event.type==='DamageResolved')return {...createEmptyPlan(),changes:[bossChange(context,boss,{...boss,resetNodes:boss.resetNodes.map(n=>n.id===node.id?{...n,hp:node.hp}:n)})]};return createEmptyPlan();}
