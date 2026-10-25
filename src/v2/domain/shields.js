// @ts-check
/**
 * 来源护盾按到期顺序消耗。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 最早到期优先，相同时按seq；全挡不产生生命受伤。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} targetId
 * @param {number} damage
 * @returns {import('../contracts.d.ts').ShieldResolution}
 */
export function resolveShieldAbsorption(context, targetId, damage) {
  if (!Number.isFinite(damage) || damage < 0) throw new RangeError('Invalid shield damage');
  const state = context.state, entity = state.world.entities[targetId];
  if (!entity) throw new Error('Unknown shield target');
  const shields = entity.shieldIds.map(id => state.world.shields[id]).filter(shield => shield && shield.amount > 0 && shield.expiresAt > state.tick).sort((a, b) => a.expiresAt - b.expiresAt || a.seq - b.seq || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let remainingDamage = damage;
  const changes = /** @type {import('../contracts.d.ts').StateChange[]} */ ([]);
  for (const shield of shields) {
    if (remainingDamage <= 0) break;
    const used = Math.min(shield.amount, remainingDamage);
    remainingDamage -= used;
    changes.push({ target: 'world', id: shield.id, operation: 'setShield', payload: { ...shield, amount: shield.amount - used } });
  }
  return { absorbed: damage - remainingDamage, remainingDamage, plan: { changes, effects: [], events: [], persistence: [], diagnostics: [] } };
}

/**
 * 按同名盾取大/刷新策略授予护盾，不改变最大生命。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} targetId
 * @param {import('../contracts.d.ts').Id} sourceId
 * @param {number} amount
 * @param {number} duration
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planShieldGrant(context, targetId, sourceId, amount, duration) {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(duration) || duration < 0) throw new RangeError('Invalid shield grant');
  const state = context.state, entity = state.world.entities[targetId];
  if (!entity || entity.dead || entity.dying || amount === 0 || duration === 0) return { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  const id = `shield:${JSON.stringify([targetId, sourceId])}`;
  const existing = state.world.shields[id];
  const active = existing && existing.expiresAt > state.tick;
  const shield = { id, sourceId, amount: Math.max(amount, active ? existing.amount : 0), expiresAt: Math.max(state.tick + Math.ceil(duration * 60), active ? existing.expiresAt : 0), seq: active ? existing.seq : state.tick };
  return { changes: [
    { target: 'world', id, operation: 'setShield', payload: shield },
    { target: 'entity', id: targetId, operation: 'setShieldIds', payload: { ids: [...new Set([...entity.shieldIds, id])] } },
  ], effects: [], events: [], persistence: [], diagnostics: [] };
}
