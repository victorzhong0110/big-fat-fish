// @ts-check
/**
 * 纯几何计算，无世界状态。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */

/**
 * 归一化输入，零向量保持零，不产生NaN。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').Vec2} vector
 * @returns {import('../contracts.d.ts').Vec2}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function normalizeVector(vector) {
  throw new Error('TODO V2: domain/geometry.js#normalizeVector');
}

/**
 * 计算高速移动圆的首个命中时间比例，避免穿透。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').Vec2} from
 * @param {import('../contracts.d.ts').Vec2} to
 * @param {number} radius
 * @param {import('../contracts.d.ts').Vec2} target
 * @param {number} targetRadius
 * @returns {number | null}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function intersectSweptCircles(from, to, radius, target, targetRadius) {
  throw new Error('TODO V2: domain/geometry.js#intersectSweptCircles');
}

/**
 * 判定侧后弱点弧，包含08指定边界。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').Vec2} center
 * @param {number} facingRadians
 * @param {import('../contracts.d.ts').Vec2} contact
 * @param {number} arcDegrees
 * @returns {boolean}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function isContactWithinArc(center, facingRadians, contact, arcDegrees) {
  throw new Error('TODO V2: domain/geometry.js#isContactWithinArc');
}

/**
 * 供稳定目标/距离排序；相同距离由上层按entityId裁决。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').Vec2} a
 * @param {import('../contracts.d.ts').Vec2} b
 * @returns {number}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function distanceSquared(a, b) {
  throw new Error('TODO V2: domain/geometry.js#distanceSquared');
}
