// @ts-check
/**
 * 死亡声明、奖励归属和同tick胜负冲突。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 收集本tick第一次致死者，按稳定id生成记录；已dying/已结算不重复。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {readonly import('../contracts.d.ts').DeathRecord[]}
 */
export function collectDeathRecords(context) {
  const state = context.state;
  const entities = /** @type {readonly import('../contracts.d.ts').EntityState[]} */ (Object.values(state.world.entities));
  return entities.filter(entity => entity.hp <= 0 && !entity.dying && !entity.dead && !['projectile', 'pickup', 'obstacle', 'objective'].includes(entity.kind)).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(entity => ({
    entityId: entity.id, sourceId: typeof entity.runtime.lastDamageSourceId === 'string' ? entity.runtime.lastDamageSourceId : entity.sourceId,
    creditOwner: entity.runtime.lastDamageCreditOwner === 'player' || entity.runtime.lastDamageCreditOwner === 'enemy' ? entity.runtime.lastDamageCreditOwner : 'none',
    faction: entity.faction, rewardPolicy: entity.rewardPolicy, distillEligible: entity.distillEligible,
    groupId: typeof entity.runtime.groupId === 'string' ? entity.runtime.groupId : null,
  }));
}

/**
 * 在后续钩子前标记dying/死亡，产生唯一EntityDied与来源事件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {readonly import('../contracts.d.ts').DeathRecord[]} records
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planDeathTransitions(context, records) {
  const state = context.state;
  const unique = [...new Map(records.map(record => [record.entityId, record])).values()].filter(record => {
    const entity = state.world.entities[record.entityId];
    return entity && entity.hp <= 0 && !entity.dying && !entity.dead;
  });
  return { changes: unique.map(record => ({ target: 'entity', id: record.entityId, operation: 'setDeath', payload: { dying: true, dead: true } })), effects: [], persistence: [], diagnostics: [],
    events: unique.map((record, seq) => ({ id: `death:${record.entityId}`, runId: state.runId, tick: state.tick, seq, type: 'EntityDied', sourceId: record.sourceId, targetId: record.entityId, payload: { ...record } })),
  };
}

/**
 * 同时玩家/最终Boss致死判失败；API Boss死亡不胜利，仍保留真实击败解锁事实。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {readonly import('../contracts.d.ts').DeathRecord[]} records
 * @returns {'victory' | 'defeat' | null}
 */
export function resolveTerminalOutcome(context, records) {
  const state = context.state;
  if (records.some(record => record.entityId === state.player.entityId) || state.world.entities[state.player.entityId]?.hp <= 0) return 'defeat';
  if (state.start.difficulty.mode === 'api') return null;
  const finalBossDied = records.some(record => state.bosses.some(boss => boss.entityId === record.entityId) && state.world.entities[record.entityId]?.runtime.finalBoss === true);
  return finalBossDied ? 'victory' : null;
}
