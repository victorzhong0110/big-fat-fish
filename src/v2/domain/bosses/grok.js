// @ts-check
import {createEmptyPlan,createStateChange} from '../plans.js';
import {createEntityState} from '../entities.js';
import {normalizeVector,distanceSquared,intersectSweptCircles} from '../geometry.js';
import {toJson} from '../serialization.js';
/** A single slow, destructible rocket and ordinary crowds. The half-health phase changes only deployment cadence.
 * @implementationScope adventure-slice
 * @calls domain/bosses/grok.js#planGrokBossReinforcements
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planGrokBoss(context,boss){
 const state=context.state,entity=state.world.entities[boss.entityId],player=state.world.entities[state.player.entityId];if(!entity||entity.dead||entity.dying)return createEmptyPlan();
 const wave=state.tick>=Number(entity.runtime.nextWaveAt??120)?planGrokBossReinforcements(context,boss):createEmptyPlan(),patched=/** @type {{runtime:Record<string,import('../../contracts.d.ts').Json>}|undefined} */(wave.changes.find(c=>c.id===entity.id&&c.operation==='setEntityRuntime')?.payload),rt={...entity.runtime,...patched?.runtime},changes=[...wave.changes],cast=/** @type {{point:import('../../contracts.d.ts').Vec2;executeAt:number;startedAt:number}|null} */(rt.rocketCast??null);
 if(wave.changes.length&&state.start.difficulty.mechanicIds.includes('mech_05_boss_combo'))rt.rocketReadyAt=state.tick+90;
 if(cast&&state.tick>=cast.executeAt){const id=`rocket:${entity.id}:${state.tick}`,d=normalizeVector({x:cast.point.x-entity.position.x,y:cast.point.y-entity.position.y});changes.push(createStateChange('world',id,'putEntity',createEntityState(id,'grok_rocket','enemy','enemy',entity.position,{sourceId:entity.id,hp:8,maxHp:8,radius:10,velocity:{x:d.x*170,y:d.y*170},expiresAt:state.tick+360,runtime:{noAi:true,noRewardTarget:true,enemyRocket:true,damage:12*Number(rt.damageMultiplier??1)}})));rt.rocketCast=null;rt.rocketReadyAt=cast.startedAt+480;}
 else if(!cast&&state.tick>=Number(rt.rocketReadyAt??180))rt.rocketCast={point:{...player.position},startedAt:state.tick,executeAt:state.tick+84};
 const d=normalizeVector({x:player.position.x-entity.position.x,y:player.position.y-entity.position.y}),moving=!rt.rocketCast&&distanceSquared(entity.position,player.position)>300**2;
 changes.push(createStateChange('entity',entity.id,'setEntityRuntime',{runtime:rt}),createStateChange('entity',entity.id,'setEntityKinematics',{position:entity.position,previousPosition:entity.previousPosition,velocity:moving?{x:d.x*65,y:d.y*65}:{x:0,y:0},facingRadians:Math.atan2(d.y,d.x)}));
 return {...createEmptyPlan(),changes};
}
/** Queue sixteen basic Bots over two seconds. At most one group is pending; every wave has only three eligible samples and no XP/materials.
 * @implementationScope adventure-slice
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planGrokBossReinforcements(context,boss){
 const state=context.state,entity=state.world.entities[boss.entityId];if(!entity||entity.dead||state.world.spawnQueue.some(s=>s.bossOwner===entity.id)||Object.values(state.world.entities).filter(e=>e.definitionId==='enemy_grok_bot'&&!e.dead).length>=24)return createEmptyPlan();
 const seq=boss.spawnGroupSeq+1,groupId=`grokWave:${entity.id}:${seq}`,budgetId=groupId,queue=[...state.world.spawnQueue],player=state.world.entities[state.player.entityId],entrances=[{x:player.position.x-800,y:player.position.y-250},{x:player.position.x+800,y:player.position.y+250},{x:player.position.x,y:player.position.y-800}];
 for(let n=0;n<16;n++)queue.push({id:`${groupId}:${n}`,groupId,budgetId,enemyId:'enemy_grok_bot',position:entrances[state.start.difficulty.mechanicIds.includes('mech_10_boss_arena')?(seq+n%2)%3:n%2],at:state.tick+90+Math.floor(n/2)*15,modelProfileId:'grok_bot',rewardPolicy:/** @type {const} */('none'),distillEligible:n<3,bossOwner:entity.id,bossGrokSample:n<3});
 return {...createEmptyPlan(),changes:[createStateChange('world',budgetId,'setSpawnDirector',{queue,budgets:[...state.world.budgets,{id:budgetId,total:16,reserved:16,spawned:0,maxAlive:24}],nextAt:state.spawnDirectorNextAt??720}),createStateChange('world','bosses','setBosses',{bosses:state.bosses.map(b=>b.entityId===entity.id?{...b,spawnGroupSeq:seq}:b)}),createStateChange('entity',entity.id,'setEntityRuntime',{runtime:{...entity.runtime,nextWaveAt:state.tick+(entity.hp<entity.maxHp*.5?540:720),waveWarningUntil:state.tick+90,waveEntrances:entrances}})]};
}
/** Sweep the destructible rocket against terrain/fish, then resolve a single twelve-damage explosion through the central quota/defense pipeline.
 * @implementationScope adventure-slice
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#intersectSweptCircles
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planGrokProjectiles(context){
 const state=context.state,player=state.world.entities[state.player.entityId],changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../../contracts.d.ts').EffectRequest[]} */([]);
 for(const rocket of Object.values(state.world.entities).filter(e=>e.runtime.enemyRocket===true)){
  if(rocket.dead||rocket.hp<=0){changes.push(createStateChange('world',rocket.id,'removeEntity',{}));continue;}
  let time=intersectSweptCircles(rocket.previousPosition,rocket.position,rocket.radius,player.position,player.radius);
  for(const id of state.world.map.obstacleIds){const obstacle=state.world.entities[id];if(!obstacle)continue;const t=intersectSweptCircles(rocket.previousPosition,rocket.position,rocket.radius,obstacle.position,obstacle.radius);if(t!==null&&(time===null||t<time))time=t;}
  if(time===null&&Number(rocket.expiresAt)>state.tick)continue;const t=time??1,point={x:rocket.previousPosition.x+(rocket.position.x-rocket.previousPosition.x)*t,y:rocket.previousPosition.y+(rocket.position.y-rocket.previousPosition.y)*t},id=`${rocket.id}:blast`;
  if(distanceSquared(player.position,point)<=(80+player.radius)**2)effects.push({id,sourceId:rocket.sourceId,chainId:rocket.id,generation:0,kind:'damage',payload:toJson({id,sourceId:rocket.sourceId,creditOwner:'enemy',sourceKind:'enemy',attackId:id,projectileId:null,targetId:player.id,baseDamage:Number(rocket.runtime.damage),contact:point,incomingDirection:normalizeVector(rocket.velocity),generation:0,chainId:rocket.id,critEligible:false,expiresAt:state.tick+1})});
  changes.push(createStateChange('world',rocket.id,'removeEntity',{}),createStateChange('world',id,'putEntity',createEntityState(id,'world_blast','objective','neutral',point,{radius:80,expiresAt:state.tick+12,runtime:{visualOnly:true}})));
 }
 return {...createEmptyPlan(),changes,effects};
}
