// @ts-check
/**
 * 计划的结构合并；不包含玩法分支。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

import { serializeCanonical } from './serialization.js';

/**
 * 建立各输出队列为空的计划对象。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function createEmptyPlan() {
  return { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
}

/**
 * 按调用顺序合并计划，保留稳定事件序号；不执行伤害/存储。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/plans.js#createEmptyPlan
 * @param {readonly import('../contracts.d.ts').SystemPlan[]} plans
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function mergeSystemPlans(plans) {
  const merged = createEmptyPlan();
  return {
    changes: plans.flatMap(plan => plan.changes), effects: plans.flatMap(plan => plan.effects),
    events: plans.flatMap(plan => plan.events), persistence: plans.flatMap(plan => plan.persistence),
    diagnostics: [...merged.diagnostics, ...plans.flatMap(plan => plan.diagnostics)],
  };
}

/**
 * 拒绝未知状态路径、非法来源、负代数或无穷数值。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/serialization.js#serializeCanonical
 * @param {import('../contracts.d.ts').SystemPlan} plan
 * @returns {import('../contracts.d.ts').ValidationReport}
 */
export function validateSystemPlan(plan) {
  const diagnostics = /** @type {import('../contracts.d.ts').Diagnostic[]} */ ([]);
  const reject = (/** @type {string} */ message) => diagnostics.push({ code: 'INVALID_PLAN', message, relatedIds: [] });
  try { serializeCanonical(plan); } catch { return { valid: false, diagnostics: [{ code: 'INVALID_PLAN', message: 'Plan must be finite, acyclic plain data', relatedIds: [] }] }; }
  if (!plan || ![plan.changes, plan.effects, plan.events, plan.persistence, plan.diagnostics].every(Array.isArray)) return { valid: false, diagnostics: [{ code: 'INVALID_PLAN', message: 'Missing plan queues', relatedIds: [] }] };
  for (const change of plan.changes) {
    if (!change || typeof change.id !== 'string' || !change.id) { reject('Change needs a nonempty id'); continue; }
    const p = /** @type {Record<string, import('../contracts.d.ts').Json>} */ (change.payload);
    if (!p || typeof p !== 'object' || Array.isArray(p)) { reject('Change payload must be an object'); continue; }
    const nonnegative = (/** @type {string} */ key) => typeof p[key] === 'number' && p[key] >= 0;
    const ids = (/** @type {string} */ key) => Array.isArray(p[key]) && p[key].every(id => typeof id === 'string' && id.length > 0);
    let valid = false;
    switch (change.operation) {
      case 'setPlayerTimers': valid = change.target === 'player' && ['invulnerableRemaining', 'controlImmuneRemaining', 'skillCooldown', 'dashCooldown', 'companionCooldown'].every(nonnegative) && Array.isArray(p.weaponCooldowns) && p.weaponCooldowns.every(item => item && typeof item === 'object' && !Array.isArray(item) && typeof item.instanceId === 'string' && typeof item.cooldown === 'number' && item.cooldown >= 0); break;
      case 'setWorldTimers': valid = change.target === 'runtime' && change.id === 'worldTimers' && Number.isSafeInteger(p.lastWorldAdvanceTick) && Number(p.lastWorldAdvanceTick) >= 0 && nonnegative('underfitRemaining') && nonnegative('overfitRemaining'); break;
      case 'removeStatus': case 'removeShield': valid = change.target === 'world' && Object.keys(p).length === 0; break;
      case 'removeDamageBudget': valid = change.target === 'runtime' && Object.keys(p).length === 0; break;
      case 'setStatusIds': valid = change.target === 'entity' && ids('ids'); break;
      case 'setStatus': valid = change.target === 'world' && p.id === change.id && typeof p.kind === 'string' && typeof p.sourceId === 'string' && nonnegative('remaining') && Number.isInteger(p.requiredInputs) && Number(p.requiredInputs) >= 0 && Number.isInteger(p.completedInputs) && Number(p.completedInputs) >= 0 && ids('modifiersApplied'); break;
      case 'queueLoraLevel': valid = change.target === 'runtime' && change.id === 'dsh_lora' && Number.isSafeInteger(p.level) && Number(p.level) >= 2; break;
      case 'beginLoraTrial': {
        const trial = /** @type {Record<string, import('../contracts.d.ts').Json> | null} */ (p.trial);
        valid = change.target === 'runtime' && change.id === 'dsh_lora' && !!trial && typeof trial === 'object' && !Array.isArray(trial) && typeof trial.id === 'string' && Number.isSafeInteger(trial.level) && Number(trial.level) >= 2 && ['maxHp', 'damageMultiplier', 'moveSpeed', 'armor'].includes(String(trial.target)) && trial.phase === 'ready' && trial.uiTick === 0 && trial.result === null;
        break;
      }
      case 'advanceLoraTrial': valid = change.target === 'runtime' && change.id === 'dsh_lora' && Number.isSafeInteger(p.uiTick) && Number(p.uiTick) >= 0 && Number(p.uiTick) < 120; break;
      case 'startLoraPointer': valid = change.target === 'runtime' && change.id === 'dsh_lora' && Object.keys(p).length === 0; break;
      case 'registerCommand': valid = change.target === 'runtime' && Object.keys(p).length === 0; break;
      case 'applyLoraOutcome': {
        const modifier = /** @type {Record<string, import('../contracts.d.ts').Json> | null} */ (p.modifier);
        valid = change.target === 'runtime' && change.id === 'dsh_lora' && typeof p.trialId === 'string' && Number.isSafeInteger(p.level) && Number(p.level) >= 2 && ['perfect', 'underfit', 'overfit'].includes(String(p.result)) && Number(p.maxHp) >= 1 && !!modifier && typeof modifier === 'object' && !Array.isArray(modifier) && typeof modifier.id === 'string' && modifier.sourceId === 'dsh_lora' && ['maxHp', 'damageMultiplier', 'moveSpeed', 'armor'].includes(String(modifier.stat)) && modifier.operation === 'add' && typeof modifier.value === 'number' && modifier.expiresAt === null;
        break;
      }
      case 'setWeaponUpdate': valid = change.target === 'player' && typeof p.instanceId === 'string' && typeof p.temporaryQuality === 'number' && [0, 1, 2].includes(p.temporaryQuality) && Number.isSafeInteger(p.expiresAt) && Number(p.expiresAt) >= 0; break;
      case 'resetEquipmentCooldowns': valid = change.target === 'player' && Object.keys(p).length === 0; break;
      case 'setDshCycle': valid = change.target === 'runtime' && change.id === 'dsh_gpt_branch' && nonnegative('remaining') && Number(p.remaining) <= 28 && (p.pendingOutcome === null || p.pendingOutcome === 'update' || p.pendingOutcome === 'reset') && Number.isSafeInteger(p.triggerSeq) && Number(p.triggerSeq) >= 0 && Number.isSafeInteger(p.lastAdvancedTick) && Number(p.lastAdvancedTick) >= 0; break;
      case 'setHp': valid = change.target === 'entity' && nonnegative('hp'); break;
      case 'setDeath': valid = change.target === 'entity' && p.dying === true && p.dead === true; break;
      case 'setDamageCredit': valid = change.target === 'entity' && typeof p.sourceId === 'string' && ['player', 'enemy', 'none'].includes(String(p.creditOwner)); break;
      case 'setShell': valid = change.target === 'entity' && nonnegative('maxHp') && nonnegative('hp') && Number(p.hp) <= Number(p.maxHp) && typeof p.broken === 'boolean' && nonnegative('weakArcDegrees') && Number(p.weakArcDegrees) <= 360 && nonnegative('stunRemaining') && typeof p.enraged === 'boolean'; break;
      case 'setShieldIds': valid = change.target === 'entity' && ids('ids') && new Set(/** @type {string[]} */ (p.ids)).size === /** @type {string[]} */ (p.ids).length; break;
      case 'setShield': valid = change.target === 'world' && p.id === change.id && typeof p.sourceId === 'string' && nonnegative('amount') && Number.isSafeInteger(p.expiresAt) && Number(p.expiresAt) >= 0 && Number.isSafeInteger(p.seq) && Number(p.seq) >= 0; break;
      case 'setInvulnerable': valid = change.target === 'player' && nonnegative('remaining'); break;
      case 'setDamageBudget': valid = change.target === 'runtime' && Array.isArray(p.entries) && p.entries.every(entry => entry && typeof entry === 'object' && !Array.isArray(entry) && Number.isSafeInteger(entry.tick) && Number(entry.tick) >= 0 && typeof entry.spent === 'number' && entry.spent >= 0); break;
      case 'registerHit': valid = change.target === 'runtime' && typeof p.attackId === 'string' && p.attackId.length > 0 && typeof p.targetId === 'string' && p.targetId.length > 0 && Number.isSafeInteger(p.expiresAt) && Number(p.expiresAt) >= 0; break;
      case 'setRandomStream': valid = change.target === 'random' && ['world', 'reward', 'combat', 'dsh', 'lora', 'event'].includes(change.id) && Number.isInteger(p.seed) && Number(p.seed) >= 0 && Number(p.seed) <= 0xffffffff && Number.isSafeInteger(p.cursor) && Number(p.cursor) >= 0; break;
      default: reject(`Unknown change operation: ${change.operation}`); continue;
    }
    if (!valid) reject(`Invalid ${change.operation} payload or target`);
  }
  const effectIds = new Set();
  for (const effect of plan.effects) {
    if (!effect || ![effect.id, effect.chainId, effect.sourceId, effect.kind].every(value => typeof value === 'string' && value.length > 0) || !Number.isInteger(effect.generation) || effect.generation < 0 || effect.generation > 4 || effectIds.has(effect.id)) { reject('Invalid or duplicate effect'); continue; }
    effectIds.add(effect.id);
  }
  for (const event of plan.events) if (!event || !event.id || !event.runId || !event.type || !Number.isSafeInteger(event.tick) || event.tick < 0 || !Number.isSafeInteger(event.seq) || event.seq < 0) reject('Invalid event');
  for (const intent of plan.persistence) if (!intent || !intent.id || !['discovery', 'checkpoint', 'settlement', 'unlock'].includes(intent.kind)) reject('Invalid persistence intent');
  return { valid: diagnostics.length === 0, diagnostics };
}
