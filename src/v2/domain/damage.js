// @ts-check
/**
 * 伤害的唯一规划入口；不递归调用击杀或效果钩子。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */
import * as dependency1 from './quotas.js';
import * as dependency2 from './shells.js';
import * as dependency3 from './shields.js';
import * as dependency4 from './stats.js';

/**
 * 检查命中/无敌，分流外壳，计算额度/护甲/减伤/暴击/盾/生命，产生伤害和死亡候选。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：有壳目标先外壳分支；对敌暴击只在原生武器允许处一次计算；额度只用于敌→玩家。
 * @calls domain/damage.js#isDamageRequestValid
 * @calls domain/shells.js#resolveShellContact
 * @calls domain/quotas.js#planQuotaAllowance
 * @calls domain/shields.js#resolveShieldAbsorption
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DamageRequest} request
 * @returns {import('../contracts.d.ts').DamageResolution}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function resolveDamageRequest(context, request) {
  throw new Error('TODO V2: domain/damage.js#resolveDamageRequest');
}

/**
 * 检查实体存活、dying、attackId命中去重、来源/链代数与闪避保护。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DamageRequest} request
 * @returns {boolean}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function isDamageRequestValid(context, request) {
  throw new Error('TODO V2: domain/damage.js#isDamageRequestValid');
}

/**
 * 治疗/生命变动限幅，输出实际治疗和溢出；不自行触发回血递归。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} targetId
 * @param {number} delta
 * @param {import('../contracts.d.ts').Id} causeId
 * @returns {import('../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planLifeChange(context, targetId, delta, causeId) {
  throw new Error('TODO V2: domain/damage.js#planLifeChange');
}
