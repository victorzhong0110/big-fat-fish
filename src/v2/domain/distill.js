// @ts-check
import { createEmptyPlan, createStateChange } from './plans.js';
import { createEntityState } from './entities.js';
import { derivePlayerStats } from './stats.js';
/**
 * 三阵营样本、封顶和可见派生能力。
 * Incremental implementation; unavailable functions remain explicit TODOs.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 启用时处理合法击杀样本/射击/时间事件，回响与辅助实体不提供样本。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/distill.js#advanceDistillTrack
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planDistillEvent(context, event) {
  const state = context.state, plugin = state.plugins.find(item => item.id === 'plugin_distill');
  if (!plugin) return createEmptyPlan();
  if (event.type === 'EntityDied') {
    const record = /** @type {import('../contracts.d.ts').DeathRecord} */ (JSON.parse(JSON.stringify(event.payload)));
    const entity = state.world.entities[record.entityId], faction = record.faction;
    const rewardId = `distill:${event.id}`;
    if (!entity || entity.kind !== 'enemy' || !entity.dead || !faction || !record.distillEligible || record.creditOwner !== 'player' || record.rewardPolicy === 'none'&&entity.runtime.bossGrokSample!==true || state.processedRewardIds.includes(rewardId)) return createEmptyPlan();
    const boss = state.bosses.some(item => item.entityId === entity.id);
    const samples = boss ? 6 : faction === 'claude' ? record.rewardPolicy === 'elite' ? 6 : 3 : faction === 'gpt' && record.rewardPolicy === 'elite' ? 3 : 1;
    const track = advanceDistillTrack(state.distill[faction], samples, faction === 'grok' ? plugin.rank === 1 ? 10 : 7 : plugin.rank === 1 ? 6 : 4);
    return { ...createEmptyPlan(), changes: [createStateChange('progression', faction, 'setDistillTrack', track), createStateChange('runtime', rewardId, 'recordReward', {})] };
  }
  const player = state.world.entities[state.player.entityId];
  if (!player.dead && event.type === 'DamageResolved' && event.targetId === player.id && Number(/** @type {{hpDamage:number}} */ (event.payload).hpDamage) > 0 && state.distill.claude.stage > 0 && Number((state.distillRuntime ?? {}).shieldReadyAt ?? 0) <= state.tick) {
    return { ...runtimePlan(context, { shieldReadyAt: state.tick + 600 }), effects: [{ id: `distillShield:${event.id}`, chainId: event.id, generation: 0, sourceId: 'plugin_distill:claude', kind: 'shield', payload: { targetId: player.id, amount: [0, 5, 8, 12][state.distill.claude.stage], duration: 2 } }] };
  }
  if (event.type === 'WeaponFired') {
    const stage = state.distill.grok.stage; if (!stage) return createEmptyPlan();
    const shots = Math.min(8, Number((state.distillRuntime ?? {}).shots ?? 0) + 1);
    if (shots < 8 || Number((state.distillRuntime ?? {}).botReadyAt ?? 0) > state.tick) return runtimePlan(context, { shots });
    const available = 4 - Object.values(state.world.entities).filter(entity => entity.runtime.distilledGrok === true && entity.runtime.exhausted !== true && entity.expiresAt !== null && entity.expiresAt >= state.tick).length;
    const changes = [...runtimePlan(context, { shots: 0, botReadyAt: state.tick + 240 }).changes];
    for (let i = 0; i < Math.min(stage + 1, available); i++) changes.push(spawnDistilled(context, `distillBot:${event.id}:${i}`, 6, 240, 120, Math.atan2(state.input.aim.y, state.input.aim.x) + (i - stage / 2) * 0.15, true, null));
    return { ...createEmptyPlan(), changes };
  }
  return createEmptyPlan();
}

/**
 * 样本溢出逐阶，最高3阶；2级插件门槛降低时立即结算。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').DistillTrack} track
 * @param {number} samples
 * @param {number} required
 * @returns {import('../contracts.d.ts').DistillTrack}
 */
export function advanceDistillTrack(track, samples, required) {
  if (![track.stage, track.samples, samples, required].every(Number.isSafeInteger) || track.stage < 0 || track.stage > 3 || track.samples < 0 || samples < 0 || required <= 0) throw new Error('Invalid distillation sample count');
  let stage = track.stage, remaining = track.samples + samples;
  if (!Number.isSafeInteger(remaining)) throw new Error('Sample count overflow');
  while (stage < 3 && remaining >= required) { stage++; remaining -= required; }
  return { stage: /** @type {0|1|2|3} */ (stage), samples: stage === 3 ? 0 : remaining };
}

/**
 * Claude受伤盾、GPT追击泡、Grok基础射击Bot虚影；不伪造主动技能施放。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planDistilledAbilities(context) {
  const state = context.state, plugin = state.plugins.find(item => item.id === 'plugin_distill');
  if (!plugin || !['exploring', 'boss'].includes(state.flow.phase)) return createEmptyPlan();
  const stage = state.distill.gpt.stage;
  if (!stage || Number((state.distillRuntime ?? {}).bubbleReadyAt ?? 0) > state.tick) return createEmptyPlan();
  const player = state.world.entities[state.player.entityId];
  const targets = Object.values(state.world.entities).filter(entity => entity.kind === 'enemy' && !entity.dead && (entity.position.x - player.position.x) ** 2 + (entity.position.y - player.position.y) ** 2 <= 500 ** 2).sort((a, b) => ((a.position.x - player.position.x) ** 2 + (a.position.y - player.position.y) ** 2) - ((b.position.x - player.position.x) ** 2 + (b.position.y - player.position.y) ** 2) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!targets.length) return createEmptyPlan();
  const target = targets[0], angle = Math.atan2(target.position.y - player.position.y, target.position.x - player.position.x);
  return { ...createEmptyPlan(), changes: [...runtimePlan(context, { bubbleReadyAt: state.tick + 300 }).changes, ...Array.from({ length: stage === 1 ? 1 : 2 }, (_, i) => spawnDistilled(context, `distillBubble:${state.tick}:${i}`, stage === 3 ? 12 : 8, 320, 150, angle + i * 0.1, false, target.id))] };
}

/** @param {import('../contracts.d.ts').EvaluationContext} context @param {Record<string,import('../contracts.d.ts').Json>} patch */
function runtimePlan(context, patch) {
 return { ...createEmptyPlan(), changes: [createStateChange('progression', 'distill', 'setDistillRuntime', { runtime: { ...context.state.distillRuntime, ...patch } })] };
}
/** @param {import('../contracts.d.ts').EvaluationContext} context @param {string} id @param {number} damage @param {number} speed @param {number} duration @param {number} angle @param {boolean} bot @param {string|null} targetId */
function spawnDistilled(context, id, damage, speed, duration, angle, bot, targetId) {
 const state = context.state, player = state.world.entities[state.player.entityId];
 return createStateChange('world', id, 'putEntity', createEntityState(id, 'projectile_bubble', 'projectile', 'player', player.position, { sourceId: player.id, attackId: id, radius: bot ? 10 : 6, velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }, facingRadians: angle, expiresAt: state.tick + duration, runtime: { damage: damage * derivePlayerStats(state, context.catalog).damageMultiplier, sourceKind: 'distilled', chainId: id, maxHits: 1, hitTargetIds: [], critEligible: false, distilledGrok: bot, homingTargetId: targetId, speed } }));
}
