// @ts-check
/**
 * 有界队列处理替代伤害/死亡直接递归。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../domain/damage.js';
import * as dependency2 from '../domain/deaths.js';
import * as dependency3 from '../domain/rewards.js';
import * as dependency4 from '../domain/shields.js';
import * as dependency5 from '../domain/status.js';
import * as dependency6 from '../domain/world/spawning.js';
import * as dependency7 from './hooks.js';
import * as dependency8 from './reducer.js';

/**
 * 按请求kind分派伤害、控制、治疗、盾、生成等；返回下一批计划。
 * 调用阶段：query；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/damage.js#resolveDamageRequest
 * @calls domain/status.js#resolveControlRequest
 * @calls domain/damage.js#planLifeChange
 * @calls domain/shields.js#planShieldGrant
 * @calls domain/world/spawning.js#planEnemySpawn
 * @calls domain/rewards.js#planTokenCollection
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').EffectRequest} request
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function evaluateEffectRequest(context, request) {
  throw new Error('TODO V2: engine/effectLoop.js#evaluateEffectRequest');
}

/**
 * 稳定顺序执行请求，应用中间计划/死亡声明/事件钩子，再把派生请求排队。
 * 调用阶段：effect-loop；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：generation<=4、每tick派生<=128；先标dying再钩子；队列循环不递归，禁止自动新开chain绕预算。 返回nextWorking与deaths/outbox，不返回供再次apply的重复计划；调用方接纳结果后继续tick。
 * @calls engine/effectLoop.js#evaluateEffectRequest
 * @calls engine/reducer.js#applySystemPlan
 * @calls domain/deaths.js#collectDeathRecords
 * @calls domain/deaths.js#planDeathTransitions
 * @calls engine/hooks.js#planEventHooks
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').EffectQueue} queue
 * @returns {import('../contracts.d.ts').EffectDrain}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function drainEffectQueue(context, queue) {
  throw new Error('TODO V2: engine/effectLoop.js#drainEffectQueue');
}
