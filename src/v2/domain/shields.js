// @ts-check
/**
 * 来源护盾按到期顺序消耗。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */

/**
 * 最早到期优先，相同时按seq；全挡不产生生命受伤。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} targetId
 * @param {number} damage
 * @returns {import('../contracts.d.ts').ShieldResolution}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function resolveShieldAbsorption(context, targetId, damage) {
  throw new Error('TODO V2: domain/shields.js#resolveShieldAbsorption');
}

/**
 * 按同名盾取大/刷新策略授予护盾，不改变最大生命。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} targetId
 * @param {import('../contracts.d.ts').Id} sourceId
 * @param {number} amount
 * @param {number} duration
 * @returns {import('../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planShieldGrant(context, targetId, sourceId, amount, duration) {
  throw new Error('TODO V2: domain/shields.js#planShieldGrant');
}
