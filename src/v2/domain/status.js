// @ts-check
import { createEmptyPlan, createStateChange, mergeSystemPlans } from './plans.js';
import { createEntityState } from './entities.js';
import { derivePlayerStats } from './stats.js';
import { distanceSquared } from './geometry.js';
import { toJson } from './serialization.js';
/**
 * 控制/封禁请求与拦截优先级。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * Glasswing只处理一次，再算抵抗/拦截；返回计划，不立即调用插件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @calls domain/stats.js#derivePlayerStats
 * @calls domain/status.js#applyGlasswingModifier
 * @calls domain/status.js#selectControlInterceptor
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').ControlRequest} request
 * @returns {import('../contracts.d.ts').ControlResolution}
 */
export function resolveControlRequest(context, request) {
  const state = context.state, player = state.world.entities[state.player.entityId], source = state.world.entities[request.sourceId];
  const empty = { blocked: true, consumedInterceptorId: null, duration: 0, requiredInputs: 0, plan: createEmptyPlan() };
  if (!['root', 'slow', 'skillBan', 'companionBan'].includes(request.kind) || !Array.isArray(request.appliedModifierIds) || !source || source.team !== 'enemy' || request.targetId !== player.id || player.dead || !['exploring', 'boss'].includes(state.flow.phase) || !Number.isFinite(request.baseDuration) || request.baseDuration <= 0 || !Number.isSafeInteger(request.baseRequiredInputs) || request.baseRequiredInputs < 0) return empty;
  if (request.kind === 'root' && state.player.controlImmuneRemaining > 0 || player.statusIds.some(id => state.world.statuses[id]?.kind === request.kind) && request.kind !== 'slow') return empty;
  if (request.kind === 'companionBan' && !state.player.loadout.companionId) return empty;
  const modified = applyGlasswingModifier(context, request), interceptor = selectControlInterceptor(context, modified);
  const changes = /** @type {import('../contracts.d.ts').StateChange[]} */ ([]), effects = /** @type {import('../contracts.d.ts').EffectRequest[]} */ ([]);
  if (interceptor) {
    if (request.kind === 'root') changes.push(createStateChange('player', player.id, 'setControlImmune', { remaining: 2 }));
    if (interceptor === 'tree_skill_f') changes.push(createStateChange('entity', player.id, 'setEntityRuntime', { runtime: { ...player.runtime, treeEmergencyUsed: true } }));
    else if (interceptor === 'companion_patch') changes.push(createStateChange('player', player.id, 'setLoadout', { ...state.player.loadout, companionCooldown: 24 * (state.start.treeNodeIds.includes('tree_explore_d') ? 0.9 : 1) }));
    else if (interceptor === 'dsh_claude_allowlist') {
      const previous = /** @type {{usedBiomes?:readonly number[]}} */ (state.dshRuntime[interceptor] ?? {});
      changes.push(createStateChange('runtime', interceptor, 'setDshRuntime', { runtime: { usedBiomes: [...(previous.usedBiomes ?? []), state.world.map.biomeIndex] } }));
    } else {
      const plugin = state.plugins.find(item => item.id === interceptor); if (!plugin) throw new Error('Missing selected interceptor');
      const seconds = interceptor === 'plugin_failover' ? plugin.rank === 1 ? 18 : 12 : plugin.rank === 1 ? 20 : 14;
      changes.push(createStateChange('progression', interceptor, 'setPlugins', { plugins: state.plugins.map(item => item.id === interceptor ? { ...item, runtime: { ...item.runtime, readyAt: state.tick + seconds * 60 } } : item) }));
      if (interceptor === 'plugin_breaker') changes.push(createStateChange('player', player.id, 'setPlayerModifiers', { modifiers: [...state.player.modifiers.filter(modifier => modifier.id !== 'breaker:output'), { id: 'breaker:output', sourceId: interceptor, stat: 'damageMultiplier', operation: 'multiply', value: 1.25, expiresAt: state.tick + 180 }] }));
      else for (const enemy of Object.values(state.world.entities).filter(entity => entity.kind === 'enemy' && !entity.dead && distanceSquared(entity.position, player.position) <= 180 ** 2).sort((a, b) => a.id < b.id ? -1 : 1)) {
        const id = `${request.id}:failover:${enemy.id}`;
        effects.push({ id, chainId: request.id, generation: 0, sourceId: player.id, kind: 'damage', payload: toJson({ id, sourceId: player.id, creditOwner: 'player', sourceKind: 'plugin_secondary', attackId: id, projectileId: null, targetId: enemy.id, baseDamage: 20 * derivePlayerStats(state, context.catalog).damageMultiplier, contact: player.position, incomingDirection: { x: 1, y: 0 }, generation: 0, chainId: request.id, critEligible: false, expiresAt: state.tick }) });
      }
    }
    return { ...empty, consumedInterceptorId: interceptor, plan: { ...createEmptyPlan(), changes, effects } };
  }
  const appeal = state.start.dsh.some(slot => slot.id === 'dsh_claude_appeal') && ['skillBan', 'companionBan'].includes(request.kind);
  const duration = modified.baseDuration * (appeal ? 0.8 : 1), requiredInputs = request.kind === 'root' ? Math.max(3, modified.baseRequiredInputs - (state.start.treeNodeIds.includes('tree_skill_d') ? 1 : 0)) : modified.baseRequiredInputs;
  const id = `control:${player.id}:${request.kind}`;
  const status = { id, kind: request.kind, sourceId: request.sourceId, remaining: duration, requiredInputs, completedInputs: 0, modifiersApplied: modified.appliedModifierIds };
  changes.push(createStateChange('world', id, 'setStatus', status), createStateChange('entity', player.id, 'setStatusIds', { ids: [...new Set([...player.statusIds, id])] }));
  if (request.kind === 'root') changes.push(createStateChange('entity', player.id, 'setEntityRuntime', { runtime: { ...player.runtime, escapeHeld: false, lastEscapeAt: state.tick - 6 } }));
  if (['skillBan', 'companionBan'].includes(request.kind)) {
    const required = Math.max(2, 3 - (request.kind === 'companionBan' && state.start.treeNodeIds.includes('tree_explore_e') ? 1 : 0));
    const positions = Array.from({ length: 8 }, (_, i) => ({ x: Math.max(24, Math.min(state.world.map.width - 24, player.position.x + Math.cos(i * Math.PI / 4) * 140)), y: Math.max(24, Math.min(state.world.map.height - 24, player.position.y + Math.sin(i * Math.PI / 4) * 140)) }));
    const position = positions.find(point => !state.world.map.obstacleIds.some(obstacleId => { const obstacle = state.world.entities[obstacleId]; return obstacle && obstacle.runtime.solid !== false && distanceSquared(point, obstacle.position) < (obstacle.radius + 18) ** 2; })) ?? positions[0];
    const sealId = `seal:${id}:${state.tick}`;
    changes.push(createStateChange('world', sealId, 'putEntity', createEntityState(sealId, 'claude_seal', 'enemy', 'enemy', position, { radius: 18, hp: required, maxHp: required, rewardPolicy: 'none', distillEligible: false, sourceId: request.sourceId, expiresAt: state.tick + Math.ceil(duration * 60), runtime: { sealStatusId: id, noAi: true } })));
  }
  return { blocked: false, consumedInterceptorId: null, duration, requiredInputs, plan: { ...createEmptyPlan(), changes } };
}

/**
 * 11级Claude Boss控制时长/禁锢挣脱要求×2；不复制伤害或状态。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：使用appliedModifierIds去重；技能/伙伴封禁破封命中数不翻倍。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').ControlRequest} request
 * @returns {import('../contracts.d.ts').ControlRequest}
 */
export function applyGlasswingModifier(context, request) {
  const state = context.state;
  const marker = 'mech_11_glasswing';
  const claudeBoss = state.bosses.some(boss => boss.entityId === request.sourceId && boss.faction === 'claude');
  if (!claudeBoss || request.targetId !== state.player.entityId || !state.start.difficulty.mechanicIds.includes(marker) || request.appliedModifierIds.includes(marker)) return structuredClone(request);
  if (![request.baseDuration, request.baseRequiredInputs].every(Number.isFinite) || request.baseDuration < 0 || !Number.isInteger(request.baseRequiredInputs) || request.baseRequiredInputs < 0) throw new RangeError('Invalid control request');
  return { ...request, baseDuration: request.baseDuration * 2, baseRequiredInputs: request.kind === 'root' ? request.baseRequiredInputs * 2 : request.baseRequiredInputs, appliedModifierIds: [...request.appliedModifierIds, marker] };
}

/**
 * 按树→故障转移→补丁或白名单→越狱选择第一可用防护，仅消费一份。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').ControlRequest} request
 * @returns {import('../contracts.d.ts').Id | null}
 */
export function selectControlInterceptor(context, request) {
  const state = context.state, player = state.world.entities[state.player.entityId];
  const ready = (/** @type {string} */ id) => { const plugin = state.plugins.find(plugin => plugin.id === id); return plugin && Number(plugin.runtime.readyAt ?? 0) <= state.tick; };
  if (request.kind === 'root') {
    if (state.start.treeNodeIds.includes('tree_skill_f') && player.runtime.treeEmergencyUsed !== true) return 'tree_skill_f';
    if (ready('plugin_failover')) return 'plugin_failover';
  }
  if (['root', 'slow'].includes(request.kind) && state.player.loadout.companionId === 'companion_patch' && state.player.loadout.companionCooldown <= 0 && !player.statusIds.some(id => state.world.statuses[id]?.kind === 'companionBan')) return 'companion_patch';
  if (['skillBan', 'companionBan'].includes(request.kind)) {
    const allow = state.start.dsh.find(slot => slot.id === 'dsh_claude_allowlist');
    const used = /** @type {readonly number[]} */ (/** @type {Record<string, import('../contracts.d.ts').Json>} */ (state.dshRuntime.dsh_claude_allowlist ?? {}).usedBiomes ?? []);
    if (allow?.options.protect === request.kind && !used.includes(state.world.map.biomeIndex)) return 'dsh_claude_allowlist';
    if (ready('plugin_breaker')) return 'plugin_breaker';
  }
  return null;
}

/**
 * 只接受有效按下边沿/辅助节奏，累积挣脱；LoRA界面不接收。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planEscapeInput(context, command) {
  const state = context.state, player = state.world.entities[state.player.entityId];
  if (!['exploring', 'boss'].includes(state.flow.phase)) return createEmptyPlan();
  const p = /** @type {{edge?:string;repeat?:boolean}} */ (command.payload);
  if (command.type === 'ReleaseEscape' && p.edge === 'release') return { ...createEmptyPlan(), changes: [createStateChange('entity', player.id, 'setEntityRuntime', { runtime: { ...player.runtime, escapeHeld: false } })] };
  const id = player.statusIds.find(id => state.world.statuses[id]?.kind === 'root'), status = id ? state.world.statuses[id] : null;
  const assisted = command.type === 'EscapeHeld' && p.edge === 'held' && player.runtime.escapeHeld === true;
  if (!status || p.repeat === true || !assisted && (command.type !== 'EscapePress' || p.edge !== 'press' || player.runtime.escapeHeld === true) || state.tick - Number(player.runtime.lastEscapeAt ?? -1000) < (assisted ? 12 : 6)) return createEmptyPlan();
  const completedInputs = status.completedInputs + 1;
  const changes = [createStateChange('entity', player.id, 'setEntityRuntime', { runtime: { ...player.runtime, escapeHeld: true, lastEscapeAt: state.tick } })];
  if (completedInputs >= status.requiredInputs) changes.push(createStateChange('world', status.id, 'removeStatus', {}), createStateChange('entity', player.id, 'setStatusIds', { ids: player.statusIds.filter(id => id !== status.id) }), createStateChange('player', player.id, 'setControlImmune', { remaining: 2 }));
  else changes.push(createStateChange('world', status.id, 'setStatus', { ...status, completedInputs }));
  return { ...createEmptyPlan(), changes };
}

/**
 * 更新控制、免疫和训练负面倒计时；暂停不走，解除不刷新技能。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planStatusAdvance(context) {
  const state = context.state;
  const empty = { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  if (!['exploring', 'boss'].includes(state.flow.phase) || state.lastWorldAdvanceTick === state.tick) return empty;
  const dt = 1 / 60;
  const decrease = (/** @type {number} */ value, scale = 1) => {
    const next = value - dt * scale;
    return next < 1e-9 ? 0 : next;
  };
  const changes = /** @type {import('../contracts.d.ts').StateChange[]} */ ([]);
  const events = /** @type {import('../contracts.d.ts').DomainEvent[]} */ ([]);
  const expiredStatuses = new Set();
  for (const status of Object.values(state.world.statuses).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const remaining = decrease(status.remaining);
    if (remaining === 0) {
      expiredStatuses.add(status.id);
      changes.push({ target: 'world', id: status.id, operation: 'removeStatus', payload: {} });
      events.push({ id: `statusExpired:${status.id}:${state.tick}`, runId: state.runId, tick: state.tick, seq: events.length, type: 'StatusExpired', sourceId: status.sourceId, targetId: null, payload: { statusId: status.id, kind: status.kind } });
    } else changes.push({ target: 'world', id: status.id, operation: 'setStatus', payload: { ...status, remaining } });
  }
  const expiredShields = new Set(Object.values(state.world.shields).filter(shield => shield.expiresAt <= state.tick || shield.amount <= 0).map(shield => shield.id));
  for (const id of expiredShields) changes.push({ target: 'world', id, operation: 'removeShield', payload: {} });
  for (const entity of Object.values(state.world.entities)) {
    if (typeof entity.runtime.sealStatusId === 'string' && (!state.world.statuses[entity.runtime.sealStatusId] || expiredStatuses.has(entity.runtime.sealStatusId))) { changes.push(createStateChange('world', entity.id, 'removeEntity', {})); continue; }
    if (entity.statusIds.some(id => expiredStatuses.has(id))) changes.push({ target: 'entity', id: entity.id, operation: 'setStatusIds', payload: { ids: entity.statusIds.filter(id => !expiredStatuses.has(id)) } });
    if (entity.shieldIds.some(id => expiredShields.has(id))) changes.push({ target: 'entity', id: entity.id, operation: 'setShieldIds', payload: { ids: entity.shieldIds.filter(id => !expiredShields.has(id)) } });
    if (entity.shell?.broken && entity.shell.stunRemaining > 0) {
      const stunRemaining = decrease(entity.shell.stunRemaining);
      changes.push({ target: 'entity', id: entity.id, operation: 'setShell', payload: { ...entity.shell, stunRemaining, enraged: stunRemaining === 0 || entity.shell.enraged } });
    }
  }
  for (const [sourceId, entries] of Object.entries(state.damageBudgets)) {
    const active = entries.filter(entry => entry.tick > state.tick - 600);
    if (!active.length) changes.push({ target: 'runtime', id: sourceId, operation: 'removeDamageBudget', payload: {} });
    else if (active.length !== entries.length) changes.push({ target: 'runtime', id: sourceId, operation: 'setDamageBudget', payload: { entries: active.map(entry => ({ ...entry })) } });
  }
  const player = state.world.entities[state.player.entityId], loadout = state.player.loadout;
  const companionBanned = player.statusIds.some(id => state.world.statuses[id]?.kind === 'companionBan');
  const rootExpired = player.statusIds.some(id => expiredStatuses.has(id) && state.world.statuses[id]?.kind === 'root');
  const recovery = state.lora.overfitRemaining > 0 ? 0.6 : 1;
  changes.push({ target: 'player', id: player.id, operation: 'setPlayerTimers', payload: {
    invulnerableRemaining: decrease(state.player.invulnerableRemaining), controlImmuneRemaining: rootExpired ? 2 : decrease(state.player.controlImmuneRemaining),
    skillCooldown: decrease(loadout.skillCooldown, recovery), dashCooldown: decrease(loadout.dashCooldown, recovery), companionCooldown: companionBanned ? loadout.companionCooldown : decrease(loadout.companionCooldown),
    weaponCooldowns: loadout.weapons.map(weapon => ({ instanceId: weapon.instanceId, cooldown: decrease(weapon.cooldown) })),
  } });
  changes.push({ target: 'runtime', id: 'worldTimers', operation: 'setWorldTimers', payload: { lastWorldAdvanceTick: state.tick, underfitRemaining: decrease(state.lora.underfitRemaining), overfitRemaining: decrease(state.lora.overfitRemaining) } });
  return { ...empty, changes, events };
}

/** 基础射击打碎封印物后立即解除对应封禁，不恢复冷却。
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planSealRelease(context, event) {
 const state = context.state, entity = event.targetId ? state.world.entities[event.targetId] : null;
 if (event.type !== 'EntityDied' || !entity?.dead || typeof entity.runtime.sealStatusId !== 'string') return createEmptyPlan();
 const id = entity.runtime.sealStatusId, player = state.world.entities[state.player.entityId];
 if (!state.world.statuses[id]) return createEmptyPlan();
 return { ...createEmptyPlan(), changes: [createStateChange('world', id, 'removeStatus', {}), createStateChange('entity', player.id, 'setStatusIds', { ids: player.statusIds.filter(item => item !== id) })] };
}
