// @ts-check
/**
 * 玩家/敌人移动与高速扫掠起终点。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from './collision.js';
import * as dependency2 from './geometry.js';
import * as dependency3 from './stats.js';

/**
 * 归一化移动，冲刺/水流/控制共同作用；LoRA/暂停不更新位置。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').InputState} input
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planPlayerMovement(context, input) {
  throw new Error('TODO V2: domain/movement.js#planPlayerMovement');
}

/**
 * 积分实体/弹体位置并校验障碍，可穿Grok使用同一碰撞矩阵。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/collision.js#canTraverseObstacle
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planEntityMotion(context) {
  throw new Error('TODO V2: domain/movement.js#planEntityMotion');
}

/**
 * 计算大白饭吸附/接触拾取意图，半径按01/插件/树定义。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planPickupMotion(context) {
  throw new Error('TODO V2: domain/movement.js#planPickupMotion');
}
