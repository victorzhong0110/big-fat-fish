// @ts-check
/**
 * Claude高数值/封禁招式意图；控制由统一管线处理。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 推进预警/招式/恢复，按5/10/11级机制加入组合/场地/Glasswing请求标记。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/bosses/claude.js#planClaudeBan
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planClaudeBoss(context, boss) {
  throw new Error('TODO V2: domain/bosses/claude.js#planClaudeBoss');
}

/**
 * 无合法槽则普通攻击；只发一份封禁请求和可破封装置计划。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @param {'skillBan' | 'companionBan'} kind
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planClaudeBan(context, boss, kind) {
  throw new Error('TODO V2: domain/bosses/claude.js#planClaudeBan');
}
