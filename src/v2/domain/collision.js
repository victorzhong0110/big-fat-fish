// @ts-check
/**
 * 实体碰撞与Grok部分穿障的唯一规则。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */
import * as dependency1 from './geometry.js';

/**
 * 读取同一碰撞矩阵，只有指定Grok/虚影穿低矮障碍，高墙/锁门优先阻挡。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').EntityState} entity
 * @param {import('../contracts.d.ts').EntityState} obstacle
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {boolean}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function canTraverseObstacle(entity, obstacle, catalog) {
  throw new Error('TODO V2: domain/collision.js#canTraverseObstacle');
}

/**
 * 生成稳定排序的连续碰撞结果，不直接改血或销毁实体。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/geometry.js#intersectSweptCircles
 * @calls domain/collision.js#canTraverseObstacle
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').CollisionResult}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function detectCollisions(context) {
  throw new Error('TODO V2: domain/collision.js#detectCollisions');
}

/**
 * 检查视野外、最小距离、可通行与局部/全局数量上限。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/collision.js#canTraverseObstacle
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').SpawnRequest} request
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').Vec2>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function validateSpawnLocation(context, request) {
  throw new Error('TODO V2: domain/collision.js#validateSpawnLocation');
}
