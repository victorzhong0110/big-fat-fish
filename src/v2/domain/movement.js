// @ts-check
import { planProjectileBurst } from './projectiles.js';
import { createEmptyPlan, createStateChange } from './plans.js';
import { resolveBodyDestination } from './motionSolver.js';
/**
 * 玩家/敌人移动与高速扫掠起终点。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from './collision.js';
import * as dependency2 from './geometry.js';
import * as dependency3 from './stats.js';

/**
 * 归一化移动，冲刺/水流/控制共同作用；LoRA/暂停不更新位置。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').InputState} input
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planPlayerMovement(context, input) {
  if (!['exploring', 'boss'].includes(context.state.flow.phase)) return createEmptyPlan();
  const state = context.state, entity = state.world.entities[state.player.entityId];
  const move = dependency2.normalizeVector(input.move), stats = dependency3.derivePlayerStats(state, context.catalog);
  const rooted = entity.statusIds.some(id => state.world.statuses[id]?.kind === 'root');
  const slow = entity.statusIds.some(id => state.world.statuses[id]?.kind === 'slow') ? 0.75 : 1;
  const dashing = typeof entity.runtime.dashUntil === 'number' && entity.runtime.dashUntil > state.tick;
  const dash = /** @type {import('../contracts.d.ts').Vec2} */ (entity.runtime.dashDirection ?? input.aim);
  const velocity = rooted ? { x: 0, y: 0 } : dashing ? { x: dash.x * 650, y: dash.y * 650 } : { x: move.x * stats.moveSpeed * slow, y: move.y * stats.moveSpeed * slow };
  return { ...createEmptyPlan(), changes: [createStateChange('entity', entity.id, 'setEntityKinematics', { position: entity.position, previousPosition: entity.previousPosition, velocity, facingRadians: Math.atan2(input.aim.y, input.aim.x) })] };
}

/**
 * 积分实体/弹体位置并校验障碍，可穿Grok使用同一碰撞矩阵。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/geometry.js#intersectSweptCircles
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/motionSolver.js#resolveBodyDestination
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/projectiles.js#planProjectileBurst
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planEntityMotion(context) {
  if (!['exploring','boss'].includes(context.state.flow.phase)) return createEmptyPlan();
  const changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../contracts.d.ts').EffectRequest[]} */([]),events=/** @type {import('../contracts.d.ts').DomainEvent[]} */([]);
  for(const entity of Object.values(context.state.world.entities)){
    if(entity.runtime.visualOnly===true&&entity.expiresAt!==null&&entity.expiresAt<context.state.tick){changes.push(createStateChange('world',entity.id,'removeEntity',{}));continue;}
    if(entity.kind==='projectile'&&(entity.runtime.exhausted===true||entity.runtime.returnCaught===true||entity.expiresAt!==null&&entity.expiresAt<context.state.tick)){
      if(entity.runtime.exhausted!==true&&entity.runtime.returnCaught!==true){if(entity.runtime.sourceKind==='weapon_primary'&&Array.isArray(entity.runtime.hitTargetIds)&&entity.runtime.hitTargetIds.length===0)events.push({id:`expired:${entity.id}`,runId:context.state.runId,tick:context.state.tick,seq:0,type:'PrimaryProjectileExpired',sourceId:entity.sourceId,targetId:null,payload:{position:{...entity.position},rawW:Number(entity.runtime.rawW??entity.runtime.damage),chainId:String(entity.runtime.chainId)}});const burst=planProjectileBurst(context,entity,entity.position);changes.push(...burst.changes);effects.push(...burst.effects);}
      changes.push(createStateChange('world',entity.id,'removeEntity',{}));continue;
    }
    if(entity.dead||entity.dying||!['player','enemy','projectile'].includes(entity.kind))continue;
    let velocity=entity.velocity,runtime={...entity.runtime},returning=runtime.returnPhase==='returning';
    const owner=context.state.world.entities[entity.sourceId],origin=/** @type {import('../contracts.d.ts').Vec2|undefined} */(runtime.returnOrigin);
    if(origin&&(runtime.returnPhase==='turnPending'||runtime.returnPhase==='outbound'&&Math.hypot(entity.position.x-origin.x,entity.position.y-origin.y)>=Number(runtime.returnDistance)-1e-9)){
      returning=true;runtime={...runtime,returnPhase:'returning',hitTargetIds:[]};changes.push(createStateChange('entity',entity.id,'setProjectileLeg',{attackId:`${entity.id}:return`,runtime}));
    }
    if(returning&&owner&&!owner.dead){const d=dependency2.normalizeVector({x:owner.position.x-entity.position.x,y:owner.position.y-entity.position.y});velocity={x:d.x*Number(runtime.speed),y:d.y*Number(runtime.speed)};}
    else if(typeof runtime.homingTargetId==='string'){const target=context.state.world.entities[runtime.homingTargetId];if(target&&!target.dead){const d=dependency2.normalizeVector({x:target.position.x-entity.position.x,y:target.position.y-entity.position.y});velocity={x:d.x*Number(runtime.speed),y:d.y*Number(runtime.speed)};}}
    if(!velocity.x&&!velocity.y&&entity.previousPosition.x===entity.position.x&&entity.previousPosition.y===entity.position.y)continue;
    let desired={x:entity.position.x+velocity.x/60,y:entity.position.y+velocity.y/60};
    if(origin&&!returning){const distance=Math.hypot(desired.x-origin.x,desired.y-origin.y),limit=Number(runtime.returnDistance);if(distance>limit){const d=dependency2.normalizeVector({x:desired.x-origin.x,y:desired.y-origin.y});desired={x:origin.x+d.x*limit,y:origin.y+d.y*limit};}}
    if(origin&&returning&&owner){const time=dependency2.intersectSweptCircles(entity.position,desired,entity.radius,owner.position,owner.radius);if(time!==null){desired={x:entity.position.x+(desired.x-entity.position.x)*time,y:entity.position.y+(desired.y-entity.position.y)*time};runtime={...runtime,returnCaught:true};changes.push(createStateChange('entity',entity.id,'setEntityRuntime',{runtime}));}}
    if(origin&&Math.hypot(desired.x-origin.x,desired.y-origin.y)>Number(runtime.returnMaxDistance)+1e-8){changes.push(createStateChange('world',entity.id,'removeEntity',{}));continue;}
    const position=entity.kind==='projectile'||entity.runtime.enemyRocket===true?desired:resolveBodyDestination(context,entity,desired);
    changes.push(createStateChange('entity',entity.id,'setEntityKinematics',{position,previousPosition:entity.position,velocity,facingRadians:entity.kind==='projectile'?Math.atan2(velocity.y,velocity.x):entity.facingRadians}));
  }
  return {...createEmptyPlan(),changes,effects,events};
}

/**
 * 计算大白饭吸附/接触拾取意图，半径按01/插件/树定义。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planPickupMotion(context) {
  const state = context.state, player = state.world.entities[state.player.entityId];
  const collect = state.plugins.find(plugin => plugin.id === 'plugin_collect');
  const radius = 100 + (state.start.treeNodeIds.includes('tree_explore_a') ? 25 : 0) + (collect ? collect.rank === 1 ? 80 : 140 : 0);
  const changes = /** @type {import('../contracts.d.ts').StateChange[]} */ ([]), effects = /** @type {import('../contracts.d.ts').EffectRequest[]} */ ([]);
  for (const pickup of Object.values(state.world.pickups).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    if (pickup.collected || ['weapon','skill'].includes(pickup.kind)) continue;
    const distance = Math.sqrt(dependency2.distanceSquared(player.position, pickup.position));
    if (distance <= 40) effects.push({ id: `collect:${pickup.id}`, chainId: `collect:${pickup.id}`, generation: 0, sourceId: player.id, kind: 'collect', payload: { pickupId: pickup.id } });
    else if (pickup.kind === 'riceXp' && distance <= radius) {
      const step = Math.min(distance, 360 / 60), direction = dependency2.normalizeVector({ x: player.position.x - pickup.position.x, y: player.position.y - pickup.position.y });
      changes.push(createStateChange('world', pickup.id, 'putPickup', { ...pickup, position: { x: pickup.position.x + direction.x * step, y: pickup.position.y + direction.y * step } }));
    }
  }
  return { ...createEmptyPlan(), changes, effects };
}
