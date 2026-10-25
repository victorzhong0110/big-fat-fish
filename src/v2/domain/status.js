// @ts-check
/**
 * 控制/封禁请求与拦截优先级。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * Glasswing只处理一次，再算抵抗/拦截；返回计划，不立即调用插件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/status.js#applyGlasswingModifier
 * @calls domain/status.js#selectControlInterceptor
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').ControlRequest} request
 * @returns {import('../contracts.d.ts').ControlResolution}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function resolveControlRequest(context, request) {
  throw new Error('TODO V2: domain/status.js#resolveControlRequest');
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
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function selectControlInterceptor(context, request) {
  throw new Error('TODO V2: domain/status.js#selectControlInterceptor');
}

/**
 * 只接受有效按下边沿/辅助节奏，累积挣脱；LoRA界面不接收。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planEscapeInput(context, command) {
  throw new Error('TODO V2: domain/status.js#planEscapeInput');
}

/**
 * 更新控制、免疫和训练负面倒计时；暂停不走，解除不刷新技能。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
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
  for (const status of Object.values(state.world.statuses)) {
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
