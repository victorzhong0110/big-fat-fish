// @ts-check
import { createEmptyPlan,createStateChange,mergeSystemPlans } from './plans.js';
import { createEntityState } from './entities.js';
import { derivePlayerStats } from './stats.js';
import { normalizeVector,intersectSweptCircles,distanceSquared } from './geometry.js';
import { canTraverseObstacle } from './collision.js';
import { toJson } from './serialization.js';

/** A bounded legal teleport placement, without tracing the path from the current position.
 * @calls domain/collision.js#canTraverseObstacle
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Vec2} point
 * @returns {import('../contracts.d.ts').Vec2}
 */
export function findAbilityPlacement(context,point){
 const player=context.state.world.entities[context.state.player.entityId],map=context.state.world.map;
 for(let ring=0;ring<=10;ring++)for(let i=0;i<(ring?16:1);i++){
  const angle=i*Math.PI/8,p={x:Math.max(player.radius,Math.min(map.width-player.radius,point.x+ring*16*Math.cos(angle))),y:Math.max(player.radius,Math.min(map.height-player.radius,point.y+ring*16*Math.sin(angle)))};
  if(!Object.values(context.state.world.entities).some(e=>e.kind==='obstacle'&&!canTraverseObstacle(player,e,context.catalog)&&distanceSquared(p,e.position)<(player.radius+e.radius)**2))return p;
 }
 return {...player.position};
}

/** Plan a shared skill field (telegraphed blast, slow zone, redirect window or decoy), or a pure self buff/rollback.
 * @calls domain/abilities.js#findAbilityPlacement
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').AttackContext} context
 * @param {'batch'|'redirect'|'sandbox'|'fork'|'rollback'|'overclock'} kind
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planEquippedAbility(context,kind){
 const state=context.state,player=state.world.entities[state.player.entityId],id=`ability:${kind}:${state.tick}`,output=derivePlayerStats(state,context.catalog).damageMultiplier*(context.skillPower??1);
 if(kind==='overclock')return {...createEmptyPlan(),changes:[createStateChange('player',player.id,'setPlayerModifiers',{modifiers:[...state.player.modifiers.filter(m=>!m.id.startsWith('skill:overclock:')),{id:'skill:overclock:interval',sourceId:'skill_overclock',stat:'weaponInterval',operation:'multiply',value:.65,expiresAt:state.tick+Math.round(240*(context.skillDuration??1))},{id:'skill:overclock:speed',sourceId:'skill_overclock',stat:'moveSpeed',operation:'add',value:state.player.baseStats.moveSpeed*.1,expiresAt:state.tick+Math.round(240*(context.skillDuration??1))}].map(m=>({...m}))})]};
 if(kind==='rollback'){
  const history=/** @type {readonly (readonly number[])[]} */(player.runtime.rollbackHistory??[]),old=[...history].reverse().find(sample=>sample[0]<=state.tick-120)??history[0],target=old?{x:old[1],y:old[2]}:player.position,position=findAbilityPlacement(context,target),lost=Math.max(0,Number(player.runtime.hpDamageTotal??0)-(old?.[3]??0)),amount=Math.min(15,lost*.4*(context.skillPower??1));
  return {...createEmptyPlan(),changes:[createStateChange('entity',player.id,'setEntityKinematics',{position,previousPosition:position,velocity:{x:0,y:0},facingRadians:player.facingRadians})],effects:amount>0?[{id:`${id}:heal`,sourceId:player.id,chainId:id,generation:0,kind:'heal',payload:{targetId:player.id,amount}}]:[]};
 }
 const maxRange=kind==='fork'?90:Math.min(400,Number(state.input.aimDistance??400)),point=kind==='redirect'?player.position:{x:Math.max(0,Math.min(state.world.map.width,player.position.x+context.aim.x*maxRange)),y:Math.max(0,Math.min(state.world.map.height,player.position.y+context.aim.y*maxRange))};
 const duration=kind==='batch'?36:kind==='redirect'?72:Math.round(240*(context.skillDuration??1)),radius=kind==='batch'?130:kind==='sandbox'?160:kind==='redirect'?90:16;
 const entity=createEntityState(id,kind==='fork'?'ability_decoy':'ability_field',kind==='fork'?'decoy':'objective','neutral',point,{radius,expiresAt:state.tick+duration,runtime:{abilityKind:kind,damage:(kind==='fork'?25*derivePlayerStats(state,context.catalog).damageMultiplier:(kind==='batch'?65:15)*output),executeAt:state.tick+duration,reflected:0,lureRadius:kind==='fork'?450:0,burstRadius:kind==='fork'?100:radius}});
 return {...createEmptyPlan(),changes:[createStateChange('world',id,'putEntity',entity)]};
}

/** Resolve a bounded player-origin radial ability through the standard effect queue.
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {string} id
 * @param {import('../contracts.d.ts').Vec2} point
 * @param {number} radius
 * @param {number} amount
 * @param {'skill'|'companion'|'dsh'|'plugin_secondary'} sourceKind
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planAbilityDamage(context,id,point,radius,amount,sourceKind){
 const sourceId=context.state.player.entityId,effects=Object.values(context.state.world.entities).filter(e=>e.kind==='enemy'&&e.team==='enemy'&&!e.dead&&!e.dying&&distanceSquared(e.position,point)<=(radius+e.radius)**2).sort((a,b)=>a.id<b.id?-1:1).map(e=>({id:`${id}:${e.id}`,sourceId,chainId:id,generation:0,kind:'damage',payload:toJson({id:`${id}:${e.id}`,sourceId,creditOwner:'player',sourceKind,attackId:id,projectileId:null,targetId:e.id,baseDamage:amount,contact:e.position,incomingDirection:normalizeVector({x:e.position.x-point.x,y:e.position.y-point.y}),generation:0,chainId:id,critEligible:false,expiresAt:context.state.tick+1})}));
 return {...createEmptyPlan(),effects};
}

/** Apply reflection before projectile motion; expire passive fields using effective world ticks.
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#intersectSweptCircles
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planAbilityFields(context){
 const state=context.state,player=state.world.entities[state.player.entityId],changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),claimed=new Set();
 for(const field of Object.values(state.world.entities).filter(e=>e.runtime.abilityKind).sort((a,b)=>a.id<b.id?-1:1)){
  const kind=field.runtime.abilityKind;
  if(['sandbox','redirect','companionDecoy'].includes(String(kind))&&Number(field.runtime.executeAt)<=state.tick){changes.push(createStateChange('world',field.id,'removeEntity',{}));continue;}
  if(kind!=='redirect')continue;changes.push(createStateChange('entity',field.id,'setEntityKinematics',{position:player.position,previousPosition:player.position,velocity:{x:0,y:0},facingRadians:0}));let count=Number(field.runtime.reflected);
  for(const shot of Object.values(state.world.entities).filter(e=>e.kind==='projectile'&&e.team==='enemy'&&!e.dead&&e.runtime.exhausted!==true&&(e.expiresAt===null||e.expiresAt>=state.tick)&&e.runtime.reflectable!==false&&e.runtime.rocket!==true&&e.runtime.beam!==true).sort((a,b)=>a.id<b.id?-1:1)){
   if(count>=12||claimed.has(shot.id))continue;const future={x:shot.position.x+shot.velocity.x/60,y:shot.position.y+shot.velocity.y/60};
   if(intersectSweptCircles(shot.position,future,shot.radius,player.position,90)===null)continue;
   claimed.add(shot.id);count++;const id=`${field.id}:reflect:${count}`,speed=Math.max(1,Math.hypot(shot.velocity.x,shot.velocity.y)),aim=normalizeVector(state.input.aim),projectile=createEntityState(id,'projectile_bubble','projectile','player',shot.position,{radius:shot.radius,sourceId:player.id,attackId:id,velocity:{x:aim.x*speed,y:aim.y*speed},expiresAt:state.tick+180,runtime:{sourceKind:'skill',damage:Number(field.runtime.damage),chainId:field.id,maxHits:1,hitTargetIds:[],critEligible:false}});
   changes.push(createStateChange('world',shot.id,'removeEntity',{}),createStateChange('world',id,'putEntity',projectile));
  }
  if(count!==field.runtime.reflected)changes.push(createStateChange('entity',field.id,'setEntityRuntime',{runtime:{...field.runtime,reflected:count}}));
 }
 return {...createEmptyPlan(),changes};
}

/** Mature fixed-point blast/decoy fields after movement, once; do not replay while paused.
 * @calls domain/abilities.js#planAbilityDamage
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createStateChange
 * @calls domain/plans.js#mergeSystemPlans
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planAbilityBursts(context){
 const plans=[];for(const field of Object.values(context.state.world.entities).filter(e=>['batch','fork'].includes(String(e.runtime.abilityKind))&&Number(e.runtime.executeAt)<=context.state.tick)){
  const damage=planAbilityDamage(context,`${field.id}:burst`,field.position,Number(field.runtime.burstRadius),Number(field.runtime.damage),'skill'),id=`${field.id}:visual`,visual=createEntityState(id,'world_blast','objective','neutral',field.position,{radius:Number(field.runtime.burstRadius),expiresAt:context.state.tick+12,runtime:{visualOnly:true}});
  plans.push({...damage,changes:[createStateChange('world',field.id,'removeEntity',{}),createStateChange('world',id,'putEntity',visual)]});
 }
 return mergeSystemPlans(plans);
}

/** Slow zones do not stack; bosses use the weaker modifier.
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} entity
 * @returns {number}
 */
export function resolveAbilityMoveScale(state,entity){
 const inside=Object.values(state.world.entities).some(field=>field.runtime.abilityKind==='sandbox'&&Number(field.runtime.executeAt)>state.tick&&distanceSquared(field.position,entity.position)<=field.radius**2);
 const boss=state.bosses.some(b=>b.entityId===entity.id),zone=inside?(boss?.8:.5):1,plugin=Number(entity.runtime.pluginSlowUntil??0)>state.tick?(boss?.875:.75):1;return Math.min(zone,plugin);
}

/** Ordinary enemies prefer a live in-range decoy; equal distance ties use stable IDs.
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} entity
 * @returns {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>}
 */
export function selectAbilityTarget(state,entity){
 const player=state.world.entities[state.player.entityId];if(state.bosses.some(b=>b.entityId===entity.id))return player;
 return Object.values(state.world.entities).filter(e=>e.kind==='decoy'&&!e.dead&&e.expiresAt!==null&&e.expiresAt>state.tick&&distanceSquared(e.position,entity.position)<=Number(e.runtime.lureRadius)**2).sort((a,b)=>distanceSquared(a.position,entity.position)-distanceSquared(b.position,entity.position)||(a.id<b.id?-1:1))[0]??player;
}

/** Save the last 120 world ticks of position and cumulative real HP loss. UI/pause never records samples.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planAbilityHistory(context){
 const state=context.state,player=state.world.entities[state.player.entityId],history=/** @type {readonly (readonly number[])[]} */(player.runtime.rollbackHistory??[[0,player.position.x,player.position.y,0]]);
 const samples=[...history.filter(sample=>sample[0]>=state.tick-120&&sample[0]<state.tick).map(sample=>[...sample]),[state.tick,player.position.x,player.position.y,Number(player.runtime.hpDamageTotal??0)]];
 const vitals=/** @type {readonly (readonly number[])[]} */(player.runtime.rollbackVitals??[]);
 const rollbackVitals=[...vitals.filter(sample=>sample[0]>=state.tick-120&&sample[0]<state.tick),[state.tick,player.hp]];
 return {...createEmptyPlan(),changes:[createStateChange('entity',player.id,'setEntityRuntime',{runtime:{...player.runtime,rollbackHistory:samples,rollbackVitals}})]};
}
