// @ts-check
/**
 * 计划的结构合并；不包含玩法分支。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */

/**
 * 建立各输出队列为空的计划对象。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createEmptyPlan() {
  throw new Error('TODO V2: domain/plans.js#createEmptyPlan');
}

/**
 * 按调用顺序合并计划，保留稳定事件序号；不执行伤害/存储。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {readonly import('../contracts.d.ts').SystemPlan[]} plans
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function mergeSystemPlans(plans) {
  throw new Error('TODO V2: domain/plans.js#mergeSystemPlans');
}

/**
 * 拒绝未知状态路径、非法来源、负代数或无穷数值。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').SystemPlan} plan
 * @returns {import('../contracts.d.ts').ValidationReport}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function validateSystemPlan(plan) {
  throw new Error('TODO V2: domain/plans.js#validateSystemPlan');
}
