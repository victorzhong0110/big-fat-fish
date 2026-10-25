// @ts-check
/**
 * 唯一状态变更应用器；系统自身只产计划。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */
import * as dependency1 from '../domain/plans.js';

/**
 * 验证后将计划应用到tick私有工作副本，供下阶段读取。
 * 调用阶段：reduce；下游模式：sequence。
 * 状态权限：仅写tick私有工作副本；不修改已发布快照或Profile。
 * @calls domain/plans.js#validateSystemPlan
 * @param {import('../contracts.d.ts').GameState} working
 * @param {import('../contracts.d.ts').SystemPlan} plan
 * @returns {import('../contracts.d.ts').GameState}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function applySystemPlan(working, plan) {
  throw new Error('TODO V2: engine/reducer.js#applySystemPlan');
}

/**
 * 核对有限数值/实体来源/壳状态/机制/槽位/账本等跨模块不变量。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').ValidationReport}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function validateStateInvariants(state, catalog) {
  throw new Error('TODO V2: engine/reducer.js#validateStateInvariants');
}

/**
 * 整个tick成功后提交新revision和输出；失败不发布半完成状态。
 * 调用阶段：commit；下游模式：sequence。
 * 状态权限：唯一GameState提交点；不执行外部I/O。
 * @calls engine/reducer.js#validateStateInvariants
 * @param {import('../contracts.d.ts').StateSnapshot} previous
 * @param {import('../contracts.d.ts').GameState} working
 * @returns {import('../contracts.d.ts').TickResult}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function commitWorkingState(previous, working) {
  throw new Error('TODO V2: engine/reducer.js#commitWorkingState');
}
