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
      case 'putEntity': valid = change.target === 'world' && p.id === change.id && typeof p.definitionId === 'string' && typeof p.sourceId === 'string' && ['player', 'enemy', 'companion', 'projectile', 'pickup', 'obstacle', 'objective', 'decoy'].includes(String(p.kind)) && ['player', 'enemy', 'neutral'].includes(String(p.team)) && nonnegative('hp') && nonnegative('maxHp') && nonnegative('radius') && Array.isArray(p.statusIds) && Array.isArray(p.shieldIds); break;
      case 'removeEntity': valid = change.target === 'world' && Object.keys(p).length === 0; break;
      case 'setEntityKinematics': valid = change.target === 'entity' && Object.keys(p).length === 4 && ['position', 'previousPosition', 'velocity'].every(key => { const point = /** @type {Record<string, import('../contracts.d.ts').Json> | null} */ (p[key]); return point && typeof point === 'object' && typeof point.x === 'number' && typeof point.y === 'number'; }) && typeof p.facingRadians === 'number'; break;
      case 'setModelBody': valid=change.target==='entity'&&nonnegative('hp')&&Number(p.hp)>0&&nonnegative('maxHp')&&Number(p.maxHp)>=Number(p.hp)&&nonnegative('radius')&&Number(p.radius)>0&&!!p.runtime&&typeof p.runtime==='object'&&(p.shell===null||typeof p.shell==='object');break;
      case 'setEntityRadius': valid=change.target==='entity'&&nonnegative('radius')&&Number(p.radius)>0;break;
      case 'setEntityExpiry': valid=change.target==='entity'&&Number.isSafeInteger(p.expiresAt)&&Number(p.expiresAt)>=0;break;
      case 'setProjectileLeg': valid=change.target==='entity'&&typeof p.attackId==='string'&&!!p.runtime&&typeof p.runtime==='object'&&!Array.isArray(p.runtime);break;
      case 'setEntityRuntime': valid = change.target === 'entity' && !!p.runtime && typeof p.runtime === 'object' && !Array.isArray(p.runtime); break;
      case 'setObjectives': valid=change.target==='world'&&Array.isArray(p.objectives);break;
      case 'compactApiLedgers':valid=change.target==='runtime'&&change.id==='api'&&ids('rewardIds')&&ids('resolvedTrialIds');break;
      case 'setApiState': valid=change.target==='runtime'&&change.id==='api'&&['elapsedTicks','bossIndex','materialMinute','fragmentsThisMinute','partsThisMinute','nextBossAt','calmUntil','nextPressureAt','pressureSeq','kills','bossKills'].every(k=>Number.isSafeInteger(p[k])&&Number(p[k])>=0)&&(p.lastAdvancedTick===null||Number.isSafeInteger(p.lastAdvancedTick))&&(p.bossWarningAt===null||Number.isSafeInteger(p.bossWarningAt))&&(p.withdrawal===null||typeof p.withdrawal==='object');break;
      case 'setBosses': valid=change.target==='world'&&Array.isArray(p.bosses);break;
      case 'setPressureEvents': valid=change.target==='world'&&Array.isArray(p.events);break;
      case 'setSpawnDirector': valid=change.target==='world'&&Array.isArray(p.queue)&&Array.isArray(p.budgets)&&Number.isSafeInteger(p.nextAt)&&Number(p.nextAt)>=0;break;
      case 'setMap': valid = change.target === 'world' && p.id === change.id && nonnegative('width') && nonnegative('height') && Array.isArray(p.obstacleIds) && Array.isArray(p.checkpointIds) && Array.isArray(p.exitIds); break;
      case 'setInput': valid = change.target === 'runtime' && change.id === 'input' && typeof p.firing === 'boolean' && !!p.move && typeof p.move === 'object' && !!p.aim && typeof p.aim === 'object' && Array.isArray(p.heldKeys) && Array.isArray(p.pointerIds); break;
      case 'ackCommand': valid = change.target === 'runtime' && Number.isSafeInteger(p.seq) && Number(p.seq) >= 0; break;
      case 'setFlowPhase': valid = change.target === 'flow' && ['preparing', 'exploring', 'boss', 'paused', 'defeat', 'victory', 'withdrawal', 'pluginChoice', 'loraTraining'].includes(String(p.phase)) && (p.resumePhase === null || typeof p.resumePhase === 'string'); break;
      case 'setLoadout': valid = change.target === 'player' && Array.isArray(p.weapons) && p.weapons.length >= 1 && p.weapons.length <= 2 && Number.isInteger(p.activeWeaponIndex) && nonnegative('skillCooldown') && nonnegative('companionCooldown') && nonnegative('dashCooldown') && typeof p.skillId === 'string'; break;
      case 'putPickup': valid = change.target === 'world' && p.id === change.id && ['riceXp', 'gpuFragment', 'part', 'weapon', 'skill'].includes(String(p.kind)) && nonnegative('amount') && !!p.position && typeof p.position === 'object' && typeof p.collected === 'boolean'; break;
      case 'removePickup': valid = change.target === 'world' && Object.keys(p).length === 0; break;
      case 'recordReward': valid = change.target === 'runtime' && Object.keys(p).length === 0; break;
      case 'addCollectedResource': valid = change.target === 'progression' && ['riceXp', 'gpuFragment', 'part'].includes(String(p.kind)) && Number.isSafeInteger(p.amount) && Number(p.amount) >= 0; break;
      case 'setLevelProgress': valid = change.target === 'progression' && Number.isSafeInteger(p.level) && Number(p.level) >= 2 && Number.isSafeInteger(p.xpRemainder) && Number(p.xpRemainder) >= 0 && Array.isArray(p.rewards); break;
      case 'applyLevelGrowth': valid = change.target === 'progression' && Number.isSafeInteger(p.level) && Number(p.level) >= 2; break;
      case 'setGrowthFlow': valid = change.target === 'flow' && Array.isArray(p.rewards) && (p.choice === null || !!p.choice && typeof p.choice === 'object') && Number.isInteger(p.rerollsUsed) && Number(p.rerollsUsed) >= 0 && Number(p.rerollsUsed) <= 1; break;
      case 'setPlugins': valid = change.target === 'progression' && Array.isArray(p.plugins); break;
      case 'setDistillRuntime': valid = change.target === 'progression' && change.id === 'distill' && !!p.runtime && typeof p.runtime === 'object' && !Array.isArray(p.runtime) && Object.values(p.runtime).every(value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0); break;
      case 'setDistillTrack': valid = change.target === 'progression' && ['claude', 'gpt', 'grok'].includes(change.id) && Number.isInteger(p.stage) && Number(p.stage) >= 0 && Number(p.stage) <= 3 && Number.isSafeInteger(p.samples) && Number(p.samples) >= 0; break;
      case 'setPlayerTimers': valid = change.target === 'player' && ['invulnerableRemaining', 'controlImmuneRemaining', 'skillCooldown', 'dashCooldown', 'companionCooldown'].every(nonnegative) && Array.isArray(p.weaponCooldowns) && p.weaponCooldowns.every(item => item && typeof item === 'object' && !Array.isArray(item) && typeof item.instanceId === 'string' && typeof item.cooldown === 'number' && item.cooldown >= 0); break;
      case 'setWorldTimers': valid = change.target === 'runtime' && change.id === 'worldTimers' && Number.isSafeInteger(p.lastWorldAdvanceTick) && Number(p.lastWorldAdvanceTick) >= 0 && nonnegative('underfitRemaining') && nonnegative('overfitRemaining'); break;
      case 'removeStatus': case 'removeShield': valid = change.target === 'world' && Object.keys(p).length === 0; break;
      case 'removeDamageBudget': valid = change.target === 'runtime' && Object.keys(p).length === 0; break;
      case 'setStatusIds': valid = change.target === 'entity' && ids('ids'); break;
      case 'setStatus': valid = change.target === 'world' && p.id === change.id && typeof p.kind === 'string' && typeof p.sourceId === 'string' && nonnegative('remaining') && Number.isInteger(p.requiredInputs) && Number(p.requiredInputs) >= 0 && Number.isInteger(p.completedInputs) && Number(p.completedInputs) >= 0 && ids('modifiersApplied'); break;
      case 'setLoraInputHeld': valid = change.target === 'runtime' && change.id === 'dsh_lora' && typeof p.held === 'boolean'; break;
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
      case 'setDshRuntime': valid = change.target === 'runtime' && !!p.runtime && typeof p.runtime === 'object' && !Array.isArray(p.runtime); break;
      case 'setPlayerModifiers': valid = change.target === 'player' && Array.isArray(p.modifiers); break;
      case 'setDshCycle': valid = change.target === 'runtime' && change.id === 'dsh_gpt_branch' && nonnegative('remaining') && Number(p.remaining) <= 10 && nonnegative('activeRemaining') && Number(p.activeRemaining)<=300 && Number.isSafeInteger(p.durationResets) && Number(p.durationResets)>=0 && (p.pendingOutcome === null || p.pendingOutcome === 'update' || p.pendingOutcome === 'reset') && Number.isSafeInteger(p.triggerSeq) && Number(p.triggerSeq) >= 0 && Number.isSafeInteger(p.lastAdvancedTick) && Number(p.lastAdvancedTick) >= 0; break;
      case 'setHp': valid = change.target === 'entity' && nonnegative('hp'); break;
      case 'setDeath': valid = change.target === 'entity' && p.dying === true && p.dead === true; break;
      case 'setDamageCredit': valid = change.target === 'entity' && typeof p.sourceId === 'string' && ['player', 'enemy', 'none'].includes(String(p.creditOwner)); break;
      case 'setShell': valid = change.target === 'entity' && nonnegative('maxHp') && nonnegative('hp') && Number(p.hp) <= Number(p.maxHp) && typeof p.broken === 'boolean' && nonnegative('weakArcDegrees') && Number(p.weakArcDegrees) <= 360 && nonnegative('stunRemaining') && typeof p.enraged === 'boolean'; break;
      case 'attachShield': valid=change.target==='entity'&&typeof p.shieldId==='string'&&p.shieldId.length>0;break;
      case 'setShieldIds': valid = change.target === 'entity' && ids('ids') && new Set(/** @type {string[]} */ (p.ids)).size === /** @type {string[]} */ (p.ids).length; break;
      case 'setShield': valid = change.target === 'world' && p.id === change.id && typeof p.sourceId === 'string' && nonnegative('amount') && Number.isSafeInteger(p.expiresAt) && Number(p.expiresAt) >= 0 && Number.isSafeInteger(p.seq) && Number(p.seq) >= 0; break;
      case 'setControlImmune': valid = change.target === 'player' && nonnegative('remaining'); break;
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

/** Create one validated plain-data change without untyped casts in each system.
 * @calls domain/serialization.js#serializeCanonical
 * @param {import('../contracts.d.ts').StateChange['target']} target
 * @param {string} id
 * @param {string} operation
 * @param {object | import('../contracts.d.ts').Json} payload
 * @returns {import('../contracts.d.ts').StateChange}
 */
export function createStateChange(target, id, operation, payload) {
  return { target, id, operation, payload: /** @type {import('../contracts.d.ts').Json} */ (JSON.parse(serializeCanonical(payload))) };
}
