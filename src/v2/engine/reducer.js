// @ts-check
/**
 * 唯一状态变更应用器；系统自身只产计划。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../domain/plans.js';
import { serializeCanonical } from '../domain/serialization.js';
import { inspectGameState } from '../domain/stateValidation.js';

/**
 * 验证后将计划应用到tick私有工作副本，供下阶段读取。
 * 调用阶段：reduce；下游模式：sequence。
 * 状态权限：仅写tick私有工作副本；不修改已发布快照或Profile。
 * @calls domain/plans.js#validateSystemPlan
 * @calls domain/serialization.js#serializeCanonical
 * @param {import('../contracts.d.ts').GameState} working
 * @param {import('../contracts.d.ts').SystemPlan} plan
 * @returns {import('../contracts.d.ts').GameState}
 */
export function applySystemPlan(working, plan) {
  const report = dependency1.validateSystemPlan(plan);
  if (!report.valid) throw new Error(report.diagnostics.map(item => item.message).join('; '));
  // Copy first: a rejected change cannot leak a partly applied tick to any reader.
  const next = structuredClone(working);
  next.attackHits = next.attackHits.filter(hit => hit.expiresAt >= next.tick);
  const ownedChanges = structuredClone(plan.changes);
  for (const change of ownedChanges) {
    const p = /** @type {Record<string, import('../contracts.d.ts').Json>} */ (change.payload);
    const entity = next.world.entities[change.id];
    if (change.target === 'entity' && !entity) throw new Error(`Unknown entity: ${change.id}`);
    switch (change.operation) {
      case 'putEntity':
        if (next.world.entities[change.id]) throw new Error('Duplicate entity spawn');
        next.world.entities = { ...next.world.entities, [change.id]: /** @type {import('../contracts.d.ts').EntityState} */ (JSON.parse(serializeCanonical(p))) }; break;
      case 'removeEntity': {
        if (change.id === next.player.entityId) throw new Error('Cannot remove player');
        const entities = { ...next.world.entities }; delete entities[change.id]; next.world.entities = entities;
        next.attackHits = next.attackHits.filter(hit => hit.targetId !== change.id); break;
      }
      case 'setEntityKinematics': {
        const data = /** @type {Pick<import('../contracts.d.ts').EntityState, 'position' | 'previousPosition' | 'velocity' | 'facingRadians'>} */ (JSON.parse(serializeCanonical(p)));
        entity.position = data.position; entity.previousPosition = data.previousPosition; entity.velocity = data.velocity; entity.facingRadians = data.facingRadians; break;
      }
      case 'setModelBody': entity.hp=Number(p.hp);entity.maxHp=Number(p.maxHp);entity.radius=Number(p.radius);entity.shell=/** @type {import('../contracts.d.ts').ShellState|null} */(p.shell);entity.runtime=/** @type {Record<string,import('../contracts.d.ts').Json>} */(p.runtime);break;
      case 'setEntityRadius': entity.radius=Number(p.radius);break;
      case 'setEntityExpiry': entity.expiresAt=Number(p.expiresAt);break;
      case 'setProjectileLeg': if(entity.kind!=='projectile')throw new Error('Only projectiles have attack legs');entity.attackId=String(p.attackId);entity.runtime=/** @type {Record<string,import('../contracts.d.ts').Json>} */(p.runtime);break;
      case 'setEntityRuntime': entity.runtime = /** @type {Record<string, import('../contracts.d.ts').Json>} */ (p.runtime); break;
      case 'setObjectives': next.world.objectives=/** @type {import('../contracts.d.ts').ObjectiveState[]} */ (JSON.parse(serializeCanonical(p.objectives)));break;
      case 'compactApiLedgers':if(!next.api)throw new Error('API compaction outside API mode');next.processedRewardIds=/** @type {string[]} */(p.rewardIds);next.lora.resolvedTrialIds=/** @type {string[]} */(p.resolvedTrialIds);break;
      case 'setApiState': if(!next.api)throw new Error('API state outside API mode');next.api=/** @type {import('../contracts.d.ts').ApiState} */(JSON.parse(serializeCanonical(p)));break;
      case 'setBosses': next.bosses=/** @type {import('../contracts.d.ts').BossState[]} */ (JSON.parse(serializeCanonical(p.bosses)));break;
      case 'setPressureEvents': next.world.pressureEvents=/** @type {import('../contracts.d.ts').PressureEvent[]} */(JSON.parse(serializeCanonical(p.events)));break;
      case 'setSpawnDirector': next.world.spawnQueue=/** @type {import('../contracts.d.ts').SpawnRequest[]} */ (JSON.parse(serializeCanonical(p.queue)));next.world.budgets=/** @type {import('../contracts.d.ts').EncounterBudget[]} */ (JSON.parse(serializeCanonical(p.budgets)));next.spawnDirectorNextAt=Number(p.nextAt);break;
      case 'setMap': next.world.map = /** @type {import('../contracts.d.ts').MapState} */ (JSON.parse(serializeCanonical(p))); break;
      case 'setInput': next.input = /** @type {import('../contracts.d.ts').InputState} */ (JSON.parse(serializeCanonical(p))); break;
      case 'ackCommand':
        if (Number(p.seq) <= next.lastCommandSeq) throw new Error('Stale command sequence');
        next.lastCommandSeq = Number(p.seq); next.processedCommandIds = [...next.processedCommandIds, change.id].slice(-512); break;
      case 'setFlowPhase': next.flow = { ...next.flow, ...(Object.hasOwn(p, 'suspendedResumePhase') ? { suspendedResumePhase: /** @type {import('../contracts.d.ts').Phase | null} */ (p.suspendedResumePhase) } : {}), phase: /** @type {import('../contracts.d.ts').Phase} */ (p.phase), resumePhase: /** @type {import('../contracts.d.ts').Phase | null} */ (p.resumePhase) }; break;
      case 'setLoadout':
        if (change.id !== next.player.entityId) throw new Error('Player id mismatch');
        next.player.loadout = /** @type {import('../contracts.d.ts').Loadout} */ (JSON.parse(serializeCanonical(p))); break;
      case 'putPickup': next.world.pickups = { ...next.world.pickups, [change.id]: /** @type {import('../contracts.d.ts').PickupState} */ (JSON.parse(serializeCanonical(p))) }; break;
      case 'removePickup': { const pickups = { ...next.world.pickups }; delete pickups[change.id]; next.world.pickups = pickups; break; }
      case 'recordReward':
        if (!next.processedRewardIds.includes(change.id)) next.processedRewardIds = [...next.processedRewardIds, change.id]; break;
      case 'addCollectedResource':
        if (p.kind === 'riceXp') { next.totalTokens += Number(p.amount); next.xpRemainder += Number(p.amount); }
        else if (p.kind === 'gpuFragment') next.inventory.gpuFragments += Number(p.amount); else next.inventory.parts += Number(p.amount); break;
      case 'setLevelProgress':
        if (Number(p.level) !== next.level + 1 || Number(p.xpRemainder) !== next.xpRemainder - (20 + 10 * next.level) || next.flow.queuedLevelRewards.length) throw new Error('Invalid level threshold');
        next.level = Number(p.level); next.xpRemainder = Number(p.xpRemainder); next.flow.queuedLevelRewards = /** @type {import('../contracts.d.ts').LevelReward[]} */ (JSON.parse(serializeCanonical(p.rewards))); break;
      case 'applyLevelGrowth': {
        if (next.flow.queuedLevelRewards[0]?.level !== p.level || change.id !== `growth:${next.flow.queuedLevelRewards[0]?.id}` || next.processedRewardIds.includes(change.id)) throw new Error('Invalid or duplicate level growth');
        next.player.baseStats.maxHp += 2;
        const player = next.world.entities[next.player.entityId]; player.maxHp += 2; player.hp = Math.min(player.maxHp, player.hp + 2);
        next.processedRewardIds = [...next.processedRewardIds, change.id]; break;
      }
      case 'setGrowthFlow':
        next.flow = { ...next.flow, queuedLevelRewards: /** @type {import('../contracts.d.ts').LevelReward[]} */ (JSON.parse(serializeCanonical(p.rewards))), choice: /** @type {import('../contracts.d.ts').PluginChoice | null} */ (p.choice), pluginRerollsUsed: Number(p.rerollsUsed) }; break;
      case 'setPlugins': next.plugins = /** @type {import('../contracts.d.ts').PluginState[]} */ (JSON.parse(serializeCanonical(p.plugins))); break;
      case 'setDistillRuntime': next.distillRuntime = /** @type {Record<string, import('../contracts.d.ts').Json>} */ (p.runtime); break;
      case 'setDistillTrack': next.distill = { ...next.distill, [change.id]: { stage: /** @type {0 | 1 | 2 | 3} */ (p.stage), samples: Number(p.samples) } }; break;
      case 'setPlayerTimers': {
        if (change.id !== next.player.entityId) throw new Error('Player id mismatch');
        const weaponCooldowns = /** @type {Record<string, import('../contracts.d.ts').Json>[]} */ (p.weaponCooldowns);
        if (weaponCooldowns.length !== next.player.loadout.weapons.length || weaponCooldowns.some(item => !next.player.loadout.weapons.some(weapon => weapon.instanceId === item.instanceId))) throw new Error('Cooldown weapon mismatch');
        next.player = { ...next.player, invulnerableRemaining: Number(p.invulnerableRemaining), controlImmuneRemaining: Number(p.controlImmuneRemaining), loadout: { ...next.player.loadout, skillCooldown: Number(p.skillCooldown), dashCooldown: Number(p.dashCooldown), companionCooldown: Number(p.companionCooldown), weapons: next.player.loadout.weapons.map(weapon => ({ ...weapon, cooldown: Number(weaponCooldowns.find(item => item.instanceId === weapon.instanceId)?.cooldown) })) } }; break;
      }
      case 'setWorldTimers':
        if (p.lastWorldAdvanceTick !== next.tick) throw new Error('Timer tick mismatch');
        next.lastWorldAdvanceTick = Number(p.lastWorldAdvanceTick); next.lora = { ...next.lora, underfitRemaining: Number(p.underfitRemaining), overfitRemaining: Number(p.overfitRemaining) }; break;
      case 'removeStatus': { const statuses = { ...next.world.statuses }; delete statuses[change.id]; next.world.statuses = statuses; break; }
      case 'removeShield': { const shields = { ...next.world.shields }; delete shields[change.id]; next.world.shields = shields; break; }
      case 'removeDamageBudget': { const budgets = { ...next.damageBudgets }; delete budgets[change.id]; next.damageBudgets = budgets; break; }
      case 'setStatusIds': entity.statusIds = /** @type {string[]} */ (p.ids); break;
      case 'setStatus': next.world.statuses = { ...next.world.statuses, [change.id]: { id: String(p.id), kind: String(p.kind), sourceId: String(p.sourceId), remaining: Number(p.remaining), requiredInputs: Number(p.requiredInputs), completedInputs: Number(p.completedInputs), modifiersApplied: /** @type {string[]} */ (p.modifiersApplied) } }; break;
      case 'setLoraInputHeld': next.lora.inputHeld = p.held === true; break;
      case 'queueLoraLevel':
        if (Number(p.level) > next.level) throw new Error('Cannot train a future level');
        if (!next.lora.pendingLevels.includes(Number(p.level))) next.lora.pendingLevels = [...next.lora.pendingLevels, Number(p.level)]; break;
      case 'beginLoraTrial': {
        const trial = /** @type {Record<string, import('../contracts.d.ts').Json>} */ (p.trial);
        if (next.lora.active || !next.start.dsh.some(slot => slot.id === 'dsh_lora') || !next.lora.pendingLevels.includes(Number(trial.level)) || next.lora.resolvedTrialIds.includes(String(trial.id)) || !['exploring', 'boss', 'preparing'].includes(next.flow.phase)) throw new Error('Invalid training entry');
        next.lora.inputHeld = false;
        next.lora.active = { id: String(trial.id), level: Number(trial.level), target: /** @type {'maxHp' | 'damageMultiplier' | 'moveSpeed' | 'armor'} */ (trial.target), phase: 'ready', uiTick: 0, result: null };
        next.flow = { ...next.flow, phase: 'loraTraining', resumePhase: next.flow.phase === 'boss' ? 'boss' : next.flow.resumePhase ?? 'exploring' }; break;
      }
      case 'startLoraPointer':
        if (next.flow.phase !== 'loraTraining' || next.lora.active?.phase !== 'ready') throw new Error('Training is not ready');
        next.lora.active = { ...next.lora.active, phase: 'running' }; break;
      case 'advanceLoraTrial':
        if (next.flow.phase !== 'loraTraining' || next.lora.active?.phase !== 'running' || p.uiTick !== next.lora.active.uiTick + 1) throw new Error('Invalid training UI step');
        next.lora.active = { ...next.lora.active, uiTick: Number(p.uiTick) }; break;
      case 'registerCommand':
        if (!next.processedCommandIds.includes(change.id)) next.processedCommandIds = [...next.processedCommandIds, change.id]; break;
      case 'applyLoraOutcome': {
        if (next.flow.phase !== 'loraTraining' || !next.lora.active || next.lora.active.id !== p.trialId || next.lora.resolvedTrialIds.includes(String(p.trialId))) throw new Error('Invalid training completion');
        const modifier = /** @type {Record<string, import('../contracts.d.ts').Json>} */ (p.modifier);
        const entry = { id: String(modifier.id), sourceId: 'dsh_lora', stat: /** @type {'maxHp' | 'damageMultiplier' | 'moveSpeed' | 'armor'} */ (modifier.stat), operation: /** @type {const} */ ('add'), value: Number(modifier.value), expiresAt: null };
        next.lora = { ...next.lora, active: null, pendingLevels: next.lora.pendingLevels.filter(level => level !== p.level), modifiers: [...next.lora.modifiers.filter(item => item.id !== entry.id), entry], resolvedTrialIds: [...next.lora.resolvedTrialIds, String(p.trialId)], underfitRemaining: p.result === 'underfit' ? 8 : next.lora.underfitRemaining, overfitRemaining: p.result === 'overfit' ? 8 : next.lora.overfitRemaining };
        const player = next.world.entities[next.player.entityId]; player.maxHp = Number(p.maxHp); player.hp = Math.min(player.hp, player.maxHp);
        // The flow orchestrator must process this level's plugin/next level before resuming world time.
        next.flow = { ...next.flow, phase: 'preparing' }; break;
      }
      case 'setWeaponUpdate': {
        if (change.id !== next.player.entityId || Number(p.expiresAt) < next.tick) throw new Error('Invalid weapon update');
        const weapons = next.player.loadout.weapons.map(weapon => weapon.instanceId === p.instanceId ? { ...weapon, temporaryQuality: Number(p.temporaryQuality), updateExpiresAt: Number(p.expiresAt) } : weapon);
        if (!weapons.some(weapon => weapon.instanceId === p.instanceId)) throw new Error('Missing weapon instance');
        next.player.loadout = { ...next.player.loadout, weapons }; break;
      }
      case 'resetEquipmentCooldowns':
        if (change.id !== next.player.entityId) throw new Error('Player id mismatch');
        next.player.loadout = { ...next.player.loadout, skillCooldown: 0, dashCooldown: 0, companionCooldown: next.player.loadout.companionId ? 0 : next.player.loadout.companionCooldown }; break;
      case 'setDshRuntime': next.dshRuntime = { ...next.dshRuntime, [change.id]: p.runtime }; break;
      case 'setPlayerModifiers': next.player.modifiers = /** @type {import('../contracts.d.ts').StatModifier[]} */ (JSON.parse(serializeCanonical(p.modifiers))); break;
      case 'setDshCycle':
        if (p.lastAdvancedTick !== next.tick) throw new Error('DSH tick mismatch');
        next.dshCycle = { ...(p.activeRemaining!==undefined?{activeRemaining:Number(p.activeRemaining)}:{}),...(p.durationResets!==undefined?{durationResets:Number(p.durationResets)}:{}),remaining: Number(p.remaining), pendingOutcome: p.pendingOutcome === 'update' ? 'update' : p.pendingOutcome === 'reset' ? 'reset' : null, triggerSeq: Number(p.triggerSeq), lastAdvancedTick: Number(p.lastAdvancedTick) }; break;
      case 'setHp':
        if (Number(p.hp) > entity.maxHp) throw new Error('HP exceeds maximum');
        entity.hp = Number(p.hp); break;
      case 'setDeath': entity.dead = true; entity.dying = true;entity.runtime={...entity.runtime,deathAt:next.tick};break;
      case 'setDamageCredit': entity.runtime = { ...entity.runtime, lastDamageSourceId: p.sourceId, lastDamageCreditOwner: p.creditOwner }; break;
      case 'setShell': entity.shell = { maxHp: Number(p.maxHp), hp: Number(p.hp), broken: p.broken === true, weakArcDegrees: Number(p.weakArcDegrees), stunRemaining: Number(p.stunRemaining), enraged: p.enraged === true }; break;
      case 'attachShield': entity.shieldIds=[...new Set([...entity.shieldIds,String(p.shieldId)])];break;
      case 'setShieldIds': entity.shieldIds = /** @type {string[]} */ (p.ids); break;
      case 'setShield': next.world.shields = { ...next.world.shields, [change.id]: { id: String(p.id), sourceId: String(p.sourceId), amount: Number(p.amount), expiresAt: Number(p.expiresAt), seq: Number(p.seq) } }; break;
      case 'setControlImmune':
        if (change.id !== next.player.entityId) throw new Error('Player id mismatch');
        next.player.controlImmuneRemaining = Number(p.remaining); break;
      case 'setInvulnerable':
        if (change.id !== next.player.entityId) throw new Error('Player id mismatch');
        next.player.invulnerableRemaining = Number(p.remaining); break;
      case 'setDamageBudget': {
        const entries = /** @type {Record<string, import('../contracts.d.ts').Json>[]} */ (p.entries).map(entry => ({ tick: Number(entry.tick), spent: Number(entry.spent) }));
        if (entries.some(entry => entry.tick > next.tick)) throw new Error('Future damage budget');
        next.damageBudgets = { ...next.damageBudgets, [change.id]: entries }; break;
      }
      case 'registerHit': {
        const hit = { attackId: String(p.attackId), targetId: String(p.targetId), expiresAt: Number(p.expiresAt) };
        if (!next.world.entities[hit.targetId] || hit.expiresAt < next.tick) throw new Error('Invalid hit target or expiry');
        if (!next.attackHits.some(previous => previous.attackId === hit.attackId && previous.targetId === hit.targetId)) next.attackHits = [...next.attackHits, hit];
        break;
      }
      case 'setRandomStream': next.random = { ...next.random, [change.id]: { seed: Number(p.seed), cursor: Number(p.cursor) } }; break;
      default: throw new Error(`Unsupported change: ${change.operation}`);
    }
  }
  // Effects/events/persistence are returned to the tick orchestrator, never silently reapplied here.
  // Both the working copy and payloads are detached from caller-owned objects.
  return next;
}

/**
 * 核对有限数值/实体来源/壳状态/机制/槽位/账本等跨模块不变量。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/stateValidation.js#inspectGameState
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').ValidationReport}
 */
export function validateStateInvariants(state, catalog) {
  return inspectGameState(state, catalog);
}

/**
 * 整个tick成功后提交新revision和输出；失败不发布半完成状态。
 * 调用阶段：commit；下游模式：sequence。
 * 状态权限：唯一GameState提交点；不执行外部I/O。
 * @calls domain/plans.js#validateSystemPlan
 * @calls engine/reducer.js#validateStateInvariants
 * @param {import('../contracts.d.ts').StateSnapshot} previous
 * @param {import('../contracts.d.ts').GameState} working
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {Pick<import('../contracts.d.ts').TickResult, 'events' | 'persistence' | 'diagnostics'>} outbox
 * @returns {import('../contracts.d.ts').TickResult}
 */
export function commitWorkingState(previous, working, catalog, outbox = { events: [], persistence: [], diagnostics: [] }) {
  const outboxReport = dependency1.validateSystemPlan({ changes: [], effects: [], ...outbox });
  if (!outboxReport.valid) throw new Error('Invalid commit outbox');
  const report = validateStateInvariants(working, catalog);
  if (!report.valid) throw new Error(report.diagnostics.map(item => item.message).join('; '));
  if (working.runId !== previous.runId || working.revision !== previous.revision || working.tick < previous.tick || working.tick > previous.tick + 1 || working.uiTick < previous.uiTick || working.uiTick > previous.uiTick + 1) throw new Error('Invalid tick commit boundary');
  const worldAdvanced = working.tick > previous.tick, uiAdvanced = working.uiTick > previous.uiTick;
  if (worldAdvanced && uiAdvanced || worldAdvanced && !['exploring', 'boss'].includes(previous.flow.phase) || uiAdvanced && previous.flow.phase !== 'loraTraining') throw new Error('Wrong clock domain at commit');
  if (previous.revision >= Number.MAX_SAFE_INTEGER) throw new Error('Revision overflow');
  const next = structuredClone(working);
  next.revision = previous.revision + 1;
  const events = outbox.events.map((event, seq) => ({ ...structuredClone(event), seq }));
  if (new Set(events.map(event => event.id)).size !== events.length || events.some(event => event.runId !== next.runId)) throw new Error('Duplicate event or wrong run');
  return { next, events, persistence: structuredClone(outbox.persistence), diagnostics: structuredClone(outbox.diagnostics) };
}
