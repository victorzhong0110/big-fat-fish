// @ts-check
/**
 * 逐来源滚动十秒伤害额度与账本。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */

/**
 * 将火箭/持续区域追溯到发射者，Boss重置保持同一个sourceId。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {import('../contracts.d.ts').Id} sourceId
 * @returns {import('../contracts.d.ts').Id}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function resolveDamageBudgetSource(state, sourceId) {
  throw new Error('TODO V2: domain/quotas.js#resolveDamageBudgetSource');
}

/**
 * 移除tick<=当前tick-600的记录，含精确边界。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {readonly import('../contracts.d.ts').DamageBudgetEntry[]} entries
 * @param {import('../contracts.d.ts').Tick} tick
 * @returns {readonly import('../contracts.d.ts').DamageBudgetEntry[]}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function pruneDamageBudget(entries, tick) {
  throw new Error('TODO V2: domain/quotas.js#pruneDamageBudget');
}

/**
 * 在合法命中后计算5h防御前许可伤害并计划记账；护盾前消耗，额度可为0。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：无敌/闪避否决的请求不记账；未持有时保留最近十秒历史用于重新装配。
 * @calls domain/quotas.js#resolveDamageBudgetSource
 * @calls domain/quotas.js#pruneDamageBudget
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DamageRequest} request
 * @returns {import('../contracts.d.ts').QuotaResolution}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planQuotaAllowance(context, request) {
  throw new Error('TODO V2: domain/quotas.js#planQuotaAllowance');
}
