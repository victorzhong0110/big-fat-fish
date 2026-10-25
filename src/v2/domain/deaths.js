// @ts-check
/**
 * 死亡声明、奖励归属和同tick胜负冲突。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */

/**
 * 收集本tick第一次致死者，按稳定id生成记录；已dying/已结算不重复。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {readonly import('../contracts.d.ts').DeathRecord[]}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function collectDeathRecords(context) {
  throw new Error('TODO V2: domain/deaths.js#collectDeathRecords');
}

/**
 * 在后续钩子前标记dying/死亡，产生唯一EntityDied与来源事件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {readonly import('../contracts.d.ts').DeathRecord[]} records
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planDeathTransitions(context, records) {
  throw new Error('TODO V2: domain/deaths.js#planDeathTransitions');
}

/**
 * 同时玩家/最终Boss致死判失败；API Boss死亡不胜利，仍保留真实击败解锁事实。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {readonly import('../contracts.d.ts').DeathRecord[]} records
 * @returns {'victory' | 'defeat' | null}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function resolveTerminalOutcome(context, records) {
  throw new Error('TODO V2: domain/deaths.js#resolveTerminalOutcome');
}
