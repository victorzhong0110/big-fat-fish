// @ts-check
import { serializeCanonical } from '../domain/serialization.js';
import { createEmptyPlan } from '../domain/plans.js';
/**
 * 有界队列处理替代伤害/死亡直接递归。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
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
 * @implementationScope core-preview
 * @calls domain/damage.js#planLifeChange
 * @calls domain/damage.js#resolveDamageRequest
 * @calls domain/rewards.js#planTokenCollection
 * @calls domain/serialization.js#serializeCanonical
 * @calls domain/shields.js#planShieldGrant
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').EffectRequest} request
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function evaluateEffectRequest(context, request) {
  const p = /** @type {Record<string, import('../contracts.d.ts').Json>} */ (request.payload);
  if (request.kind === 'damage') return dependency1.resolveDamageRequest(context, /** @type {import('../contracts.d.ts').DamageRequest} */ (JSON.parse(serializeCanonical(p)))).plan;
  if (request.kind === 'heal') return dependency1.planLifeChange(context, String(p.targetId), Number(p.amount), request.id);
  if (request.kind === 'shield') return dependency4.planShieldGrant(context, String(p.targetId), request.sourceId, Number(p.amount), Number(p.duration));
  if (request.kind === 'collect') return dependency3.planTokenCollection(context, String(p.pickupId));
  throw new Error(`Effect kind not available in combat preview: ${request.kind}`);
}

/**
 * 稳定顺序执行请求，应用中间计划/死亡声明/事件钩子，再把派生请求排队。
 * 调用阶段：effect-loop；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：generation<=4、每tick派生<=128；先标dying再钩子；队列循环不递归，禁止自动新开chain绕预算。 返回nextWorking与deaths/outbox，不返回供再次apply的重复计划；调用方接纳结果后继续tick。
 * @implementationScope core-preview
 * @calls domain/deaths.js#collectDeathRecords
 * @calls domain/deaths.js#planDeathTransitions
 * @calls engine/effectLoop.js#evaluateEffectRequest
 * @calls engine/hooks.js#planEventHooks
 * @calls engine/reducer.js#applySystemPlan
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').EffectQueue} queue
 * @returns {import('../contracts.d.ts').EffectDrain}
 */
export function drainEffectQueue(context, queue) {
  let working = /** @type {import('../contracts.d.ts').GameState} */ (structuredClone(context.state));
  const pending = [...queue.pending], processed = new Set(queue.processedIds);
  const events = /** @type {import('../contracts.d.ts').DomainEvent[]} */ ([]), persistence = /** @type {import('../contracts.d.ts').PersistenceIntent[]} */ ([]), diagnostics = /** @type {import('../contracts.d.ts').Diagnostic[]} */ ([]), deaths = /** @type {import('../contracts.d.ts').DeathRecord[]} */ ([]);
  let spawned = queue.spawnedThisTick, iterations = 0, exhausted = false;
  while (pending.length) {
    const request = pending.shift();
    if (!request || processed.has(request.id)) continue;
    if (++iterations > 2048) { exhausted = true; diagnostics.push({ code: 'EFFECT_ITERATION_LIMIT', message: 'Effect processing paused at the safety limit', relatedIds: [] }); break; }
    processed.add(request.id);
    if (request.generation < 0 || request.generation > 4) { diagnostics.push({ code: 'EFFECT_GENERATION_LIMIT', message: 'Dropped out-of-bounds descendant', relatedIds: [request.id] }); continue; }
    const plan = evaluateEffectRequest({ ...context, state: working }, request);
    working = dependency8.applySystemPlan(working, plan);
    const records = dependency2.collectDeathRecords({ ...context, state: working });
    const deathPlan = dependency2.planDeathTransitions({ ...context, state: working }, records);
    if (deathPlan.changes.length) working = dependency8.applySystemPlan(working, deathPlan); deaths.push(...records);
    const allEvents = [...plan.events, ...deathPlan.events];
    const childPlans = [plan, deathPlan];
    for (const event of allEvents) {
      const hooks = dependency7.planEventHooks({ ...context, state: working, event }, event);
      if (hooks.changes.length) working = dependency8.applySystemPlan(working, hooks); childPlans.push(hooks);
    }
    events.push(...allEvents, ...childPlans.slice(2).flatMap(item => item.events)); persistence.push(...childPlans.flatMap(item => item.persistence)); diagnostics.push(...childPlans.flatMap(item => item.diagnostics));
    for (const child of childPlans.flatMap(item => item.effects)) {
      if (spawned >= 128 || request.generation >= 4) { diagnostics.push({ code: 'EFFECT_DERIVATION_LIMIT', message: 'Stopped derived effects at the per-tick budget', relatedIds: [child.id] }); continue; }
      spawned++; pending.push({ ...child, chainId: request.chainId, generation: request.generation + 1 });
    }
  }
  return { nextWorking: working, deaths, events, persistence, diagnostics, nextQueue: { pending: exhausted ? pending : [], processedIds: [...processed], spawnedThisTick: spawned }, exhausted };
}
