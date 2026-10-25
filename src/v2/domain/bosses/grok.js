// @ts-check
/**
 * Grok首领只有简单火箭和召集人海。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */
import * as dependency1 from '../world/spawning.js';

/**
 * 预告单枚可击毁火箭和召兵；50%后仅缩短召兵间隔，不加高级技能。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/bosses/grok.js#planGrokBossReinforcements
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planGrokBoss(context, boss) {
  throw new Error('TODO V2: domain/bosses/grok.js#planGrokBoss');
}

/**
 * 按局部上限/入口预留召兵，召兵无经验资源、每轮最多3个样本。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/world/spawning.js#planReinforcementGroup
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planGrokBossReinforcements(context, boss) {
  throw new Error('TODO V2: domain/bosses/grok.js#planGrokBossReinforcements');
}
