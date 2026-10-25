// @ts-check
/**
 * 连续地图生成、探索与安全交互。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../geometry.js';
import * as dependency2 from '../random.js';
import * as dependency3 from '../rewards.js';

/**
 * 按模式生成连续地图、合法目标/检查点/箱子；不生成房间清场门。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/random.js#drawRandom
 * @param {import('../../contracts.d.ts').StartSnapshot} start
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @param {import('../../contracts.d.ts').RandomState} random
 * @returns {import('../../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createMapPlan(start, catalog, random) {
  throw new Error('TODO V2: domain/world/map.js#createMapPlan');
}

/**
 * 更新可见格、秘密方向与发现事件，已发现id不重复发资源。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planMapExploration(context) {
  throw new Error('TODO V2: domain/world/map.js#planMapExploration');
}

/**
 * F/触屏选择最近交互目标，校验距离与安全状态；不直接读写存储。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/rewards.js#planWorldReward
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').Command} command
 * @returns {import('../../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planWorldInteraction(context, command) {
  throw new Error('TODO V2: domain/world/map.js#planWorldInteraction');
}

/**
 * 检查附近敌人、在途攻击、事件危险和检查点规则，不靠暂停制造安全。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').Vec2} position
 * @returns {boolean}
 */
export function isSafeForInteraction(context, position) {
  const state = context.state;
  if (state.flow.phase !== 'exploring' || state.world.pressureEvents.some(event => event.phase === 'active' || event.phase === 'telegraph')) return false;
  const activeBoss = state.bosses.some(boss => { const entity = state.world.entities[boss.entityId]; return entity && !entity.dead && entity.hp > 0; });
  if (activeBoss) return false;
  if (Object.values(state.world.entities).some(entity => !entity.dead && !entity.dying && entity.team === 'enemy' && (entity.expiresAt === null || entity.expiresAt >= state.tick) && (entity.kind === 'projectile' || dependency1.distanceSquared(entity.position, position) <= 600 ** 2))) return false;
  return !state.world.spawnQueue.some(spawn => spawn.at <= state.tick + 300 && dependency1.distanceSquared(spawn.position, position) <= 800 ** 2);
}
