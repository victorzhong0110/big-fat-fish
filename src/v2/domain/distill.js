// @ts-check
/**
 * 三阵营样本、封顶和可见派生能力。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */

/**
 * 启用时处理合法击杀样本/射击/时间事件，回响与辅助实体不提供样本。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/distill.js#advanceDistillTrack
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planDistillEvent(context, event) {
  throw new Error('TODO V2: domain/distill.js#planDistillEvent');
}

/**
 * 样本溢出逐阶，最高3阶；2级插件门槛降低时立即结算。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').DistillTrack} track
 * @param {number} samples
 * @param {number} required
 * @returns {import('../contracts.d.ts').DistillTrack}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function advanceDistillTrack(track, samples, required) {
  throw new Error('TODO V2: domain/distill.js#advanceDistillTrack');
}

/**
 * Claude受伤盾、GPT追击泡、Grok基础射击Bot虚影；不伪造主动技能施放。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planDistilledAbilities(context) {
  throw new Error('TODO V2: domain/distill.js#planDistilledAbilities');
}
