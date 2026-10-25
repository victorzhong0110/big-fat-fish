// @ts-check
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
 * @calls domain/motionSolver.js#resolveBodyDestination
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planEntityMotion(context) {
  if (!['exploring', 'boss'].includes(context.state.flow.phase)) return createEmptyPlan();
  const changes = /** @type {import('../contracts.d.ts').StateChange[]} */ ([]);
  for (const entity of Object.values(context.state.world.entities)) {
    if (entity.kind === 'projectile' && (entity.runtime.exhausted === true || entity.expiresAt !== null && entity.expiresAt < context.state.tick)) { changes.push(createStateChange('world', entity.id, 'removeEntity', {})); continue; }
    if (entity.dead || entity.dying || !['player', 'enemy', 'projectile'].includes(entity.kind)) continue;
    if (!entity.velocity.x && !entity.velocity.y && entity.previousPosition.x === entity.position.x && entity.previousPosition.y === entity.position.y) continue;
    const desired = { x: entity.position.x + entity.velocity.x / 60, y: entity.position.y + entity.velocity.y / 60 };
    const position = entity.kind === 'projectile' ? desired : resolveBodyDestination(context, entity, desired);
    changes.push(createStateChange('entity', entity.id, 'setEntityKinematics', { position, previousPosition: entity.position, velocity: entity.velocity, facingRadians: entity.facingRadians }));
  }
  return { ...createEmptyPlan(), changes };
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
    if (pickup.collected) continue;
    const distance = Math.sqrt(dependency2.distanceSquared(player.position, pickup.position));
    if (distance <= 40) effects.push({ id: `collect:${pickup.id}`, chainId: `collect:${pickup.id}`, generation: 0, sourceId: player.id, kind: 'collect', payload: { pickupId: pickup.id } });
    else if (pickup.kind === 'riceXp' && distance <= radius) {
      const step = Math.min(distance, 360 / 60), direction = dependency2.normalizeVector({ x: player.position.x - pickup.position.x, y: player.position.y - pickup.position.y });
      changes.push(createStateChange('world', pickup.id, 'putPickup', { ...pickup, position: { x: pickup.position.x + direction.x * step, y: pickup.position.y + direction.y * step } }));
    }
  }
  return { ...createEmptyPlan(), changes, effects };
}
