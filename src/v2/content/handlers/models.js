// @ts-check
/**
 * 四档模型逐项接口，Fable/Mythos分别可追溯。
 * Model rules are initialized once; runtime abilities consume the saved profile.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import {planModelProfile} from '../../domain/modelProfiles.js';
import * as dependency1 from '../../domain/plans.js';

/**
 * Haiku无外壳，无额外基础能力。
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#planModelProfile
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planModelClaudeHaiku(context, event) {
  return planModelProfile(context,event,'claude_haiku');
}

/**
 * Sonnet全向可伤外壳，破壳一次眩晕后加速。
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#planModelProfile
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planModelClaudeSonnet(context, event) {
  return planModelProfile(context,event,'claude_sonnet');
}

/**
 * Opus壳仅侧后270度可伤，破后继承眩晕/加速。
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#planModelProfile
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planModelClaudeOpus(context, event) {
  return planModelProfile(context,event,'claude_opus');
}

/**
 * API Fable更大、背部120度弱点、破壳不晕并加速。
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#planModelProfile
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planModelClaudeFable(context, event) {
  return planModelProfile(context,event,'claude_fable');
}

/**
 * API Mythos与Fable初值相同但显示名不同，不擅加新强弱。
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#planModelProfile
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planModelClaudeMythos(context, event) {
  return planModelProfile(context,event,'claude_mythos');
}

/**
 * Pro七种Pet基础技能；种类和模型profile分离。
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#planModelProfile
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planModelGptAstra(context, event) {
  return planModelProfile(context,event,'gpt_astra');
}

/**
 * Max5x按08逐Pet添加招式扩展，不提前开四种编组。
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#planModelProfile
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planModelGptSol(context, event) {
  return planModelProfile(context,event,'gpt_sol');
}

/**
 * Max20x继承Sol，逐Pet强化支援/区域/掉层等行为。
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#planModelProfile
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planModelGptTerra(context, event) {
  return planModelProfile(context,event,'gpt_terra');
}

/**
 * API继承Terra并开启08指定额外行为，假身/种子不发奖励。
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#planModelProfile
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planModelGptLuna(context, event) {
  return planModelProfile(context,event,'gpt_luna');
}

/**
 * Grok各档保持同一种Bot基础行为和指定低矮穿障profile，不获得高级技能。
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#planModelProfile
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planModelGrokBot(context, event) {
  return planModelProfile(context,event,'grok_bot');
}
