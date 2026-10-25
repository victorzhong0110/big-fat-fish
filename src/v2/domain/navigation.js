// @ts-check
/**
 * 可达性/寻路与碰撞共享规则。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from './collision.js';
import * as dependency2 from './geometry.js';

/**
 * 按实体碰撞profile寻路，Bot不能路径与物理不一致。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/collision.js#canTraverseObstacle
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').NavigationQuery} query
 * @returns {import('../contracts.d.ts').NavigationResult}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function findNavigationPath(context, query) {
  throw new Error('TODO V2: domain/navigation.js#findNavigationPath');
}

/**
 * 关闭捷径前验证主线、检查点和出口仍可达。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/navigation.js#findNavigationPath
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} obstacleId
 * @returns {boolean}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function canCloseMapPassage(context, obstacleId) {
  throw new Error('TODO V2: domain/navigation.js#canCloseMapPassage');
}

/**
 * 选择GPT后撤/保护位置，无遮挡合法点才移动。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/navigation.js#findNavigationPath
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} entityId
 * @param {number} maxDistance
 * @returns {import('../contracts.d.ts').Vec2 | null}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function chooseRetreatPoint(context, entityId, maxDistance) {
  throw new Error('TODO V2: domain/navigation.js#chooseRetreatPoint');
}
