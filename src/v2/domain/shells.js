// @ts-check
/**
 * 普通Claude四阶段外壳与唯一破壳事件。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */
import * as dependency1 from './geometry.js';

/**
 * 按模型朝向/弱点判定壳伤，非弱点0伤，溢出不伤本体。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：范围中心重合时用入射方向反向；API背部120°，Opus侧后270°。
 * @calls domain/geometry.js#isContactWithinArc
 * @calls domain/shells.js#planShellBreak
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DamageRequest} request
 * @returns {import('../contracts.d.ts').ShellResolution}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function resolveShellContact(context, request) {
  throw new Error('TODO V2: domain/shells.js#resolveShellContact');
}

/**
 * 只一次破壳：Sonnet/Opus晕后加速，API直接加速不眩晕。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} entityId
 * @returns {import('../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planShellBreak(context, entityId) {
  throw new Error('TODO V2: domain/shells.js#planShellBreak');
}
