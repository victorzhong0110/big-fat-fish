// @ts-check
/**
 * companions逐项占位处理器；实际参数仍以玩法规格为准。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import {planCompanionAbility} from '../../domain/companions.js';
import * as dependency1 from '../../domain/plans.js';

/**
 * companion_rice / 饭团：玩家生命低于 80% 时治疗 4；未满足条件不开始冷却；20 秒；随行
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/companions.js#planCompanionAbility
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planCompanionRice(context, event) {
  return planCompanionAbility(context,'rice');
}

/**
 * companion_patch / 补丁：清除玩家一次禁锢/减速；无法解技能或自身封禁；24 秒；随行
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/companions.js#planCompanionAbility
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planCompanionPatch(context, event) {
  return planCompanionAbility(context,'patch');
}

/**
 * companion_cache / 小缓存：生成可挡 8 伤的护盾，持续 5 秒，取最大值不叠加；18 秒；随行
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/companions.js#planCompanionAbility
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planCompanionCache(context, event) {
  return planCompanionAbility(context,'cache');
}

/**
 * companion_router / 路由员：向最近敌人发射 2 个追踪泡，每发 8 伤，600 范围，弹速 380；4 秒
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/companions.js#planCompanionAbility
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planCompanionRouter(context, event) {
  return planCompanionAbility(context,'router');
}

/**
 * companion_decoy / 替身进程：放出 3 秒诱饵，吸引 300 内普通敌人；无爆炸；15 秒
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/companions.js#planCompanionAbility
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planCompanionDecoy(context, event) {
  return planCompanionAbility(context,'decoy');
}

/**
 * companion_rocket / 小火箭：发射一枚瞄准最近目标的火箭，直击 16，爆炸半径 90、12 伤；不触发玩家基础命中插件；7 秒；700 范围
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/companions.js#planCompanionAbility
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planCompanionRocket(context, event) {
  return planCompanionAbility(context,'rocket');
}
