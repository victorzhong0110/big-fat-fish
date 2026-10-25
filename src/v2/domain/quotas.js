// @ts-check
/**
 * 逐来源滚动十秒伤害额度与账本。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 将火箭/持续区域追溯到发射者，Boss重置保持同一个sourceId。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {import('../contracts.d.ts').Id} sourceId
 * @returns {import('../contracts.d.ts').Id}
 */
export function resolveDamageBudgetSource(state, sourceId) {
  const visited = new Set();
  let current = sourceId;
  while (!visited.has(current)) {
    visited.add(current);
    const entity = state.world.entities[current];
    if (!entity || entity.sourceId === current) return current;
    if (!entity.sourceId) throw new Error('Damage source is empty');
    current = entity.sourceId;
  }
  throw new Error('Cyclic damage source lineage');
}

/**
 * 移除tick<=当前tick-600的记录，含精确边界。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {readonly import('../contracts.d.ts').DamageBudgetEntry[]} entries
 * @param {import('../contracts.d.ts').Tick} tick
 * @returns {readonly import('../contracts.d.ts').DamageBudgetEntry[]}
 */
export function pruneDamageBudget(entries, tick) {
  if (!Number.isSafeInteger(tick) || tick < 0 || entries.some(entry => !Number.isSafeInteger(entry.tick) || entry.tick < 0 || entry.tick > tick || !Number.isFinite(entry.spent) || entry.spent < 0)) throw new RangeError('Invalid damage budget');
  return entries.filter(entry => entry.tick > tick - 600).map(entry => ({ ...entry }));
}

/**
 * 在合法命中后计算5h防御前许可伤害并计划记账；护盾前消耗，额度可为0。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：无敌/闪避否决的请求不记账；未持有时保留最近十秒历史用于重新装配。
 * @calls domain/quotas.js#pruneDamageBudget
 * @calls domain/quotas.js#resolveDamageBudgetSource
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DamageRequest} request
 * @returns {import('../contracts.d.ts').QuotaResolution}
 */
export function planQuotaAllowance(context, request) {
  if (!Number.isFinite(request.baseDamage) || request.baseDamage < 0) throw new RangeError('Invalid budget damage');
  const state = context.state;
  const sourceId = resolveDamageBudgetSource(state, request.sourceId);
  const entries = pruneDamageBudget(state.damageBudgets[sourceId] ?? [], state.tick);
  const plugin = state.plugins.find(plugin => plugin.id === 'plugin_5h');
  const spent = entries.reduce((sum, entry) => sum + entry.spent, 0);
  const cap = plugin ? (plugin.rank === 1 ? 18 : 12) : Number.MAX_VALUE;
  const allowedDamage = Math.min(request.baseDamage, Math.max(0, cap - spent));
  const nextEntries = allowedDamage > 0 ? [...entries, { tick: state.tick, spent: allowedDamage }] : entries;
  return { sourceId, allowedDamage, budgetSpent: allowedDamage, plan: {
    changes: [{ target: 'runtime', id: sourceId, operation: 'setDamageBudget', payload: { entries: nextEntries.map(entry => ({ tick: entry.tick, spent: entry.spent })) } }],
    effects: [], events: [], persistence: [], diagnostics: [],
  } };
}
