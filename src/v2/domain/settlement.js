// @ts-check
/**
 * 对局结果与局外余额同事务计划。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */

/**
 * 计算成功/失败40或50%/API主动撤回，资源向下取整；本局id固定。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {'victory' | 'defeat' | 'withdrawal'} outcome
 * @returns {import('../contracts.d.ts').Settlement}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createSettlement(state, outcome) {
  throw new Error('TODO V2: domain/settlement.js#createSettlement');
}

/**
 * 去重、入账、碎片换卡、解锁并清当前检查点，单个revision计划。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').Profile} profile
 * @param {import('../contracts.d.ts').Settlement} settlement
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').ProfilePlan>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planSettlementCommit(profile, settlement, catalog) {
  throw new Error('TODO V2: domain/settlement.js#planSettlementCommit');
}

/**
 * 校验余额/树前置/槽位/去重/活动存档引用；迁移失败不覆盖原数据。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').Profile} profile
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').ValidationReport}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function validateProfileRecord(profile, catalog) {
  throw new Error('TODO V2: domain/settlement.js#validateProfileRecord');
}
