// @ts-check
import { createEmptyPlan, createStateChange } from './plans.js';
/**
 * 实体/群组/箱子/目标奖励计划，无存储I/O。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 按阵营掉经验，精英群仅一箱；无奖励回响/装置排除。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {readonly import('../contracts.d.ts').DeathRecord[]} records
 * @returns {import('../contracts.d.ts').RewardPlan}
 */
export function planDeathRewards(context, records) {
  const state = context.state, changes = /** @type {import('../contracts.d.ts').StateChange[]} */ ([]), rewardIds = [];
  const seen = new Set(state.processedRewardIds);
  for (const record of records) {
    const entity = state.world.entities[record.entityId], rewardId = `deathReward:${record.entityId}`;
    if (!entity || record.creditOwner !== 'player' || record.rewardPolicy === 'none' || seen.has(rewardId)) continue;
    seen.add(rewardId);
    const amount = state.bosses.some(boss => boss.entityId === entity.id) ? 120 : record.rewardPolicy === 'elite' ? 32 : record.faction === 'claude' ? 24 : record.faction === 'gpt' ? 8 : 4;
    changes.push(createStateChange('world', rewardId, 'putPickup', { id: rewardId, kind: 'riceXp', amount, position: entity.position, instanceId: null, collected: false }));
    changes.push(createStateChange('runtime', rewardId, 'recordReward', {})); rewardIds.push(rewardId);
  }
  return { plan: { ...createEmptyPlan(), changes }, rewardIds };
}

/**
 * 按stable rewardId发箱子/任务奖励，API分钟材料限额先校验。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} rewardId
 * @returns {import('../contracts.d.ts').RewardPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planWorldReward(context, rewardId) {
  throw new Error('TODO V2: domain/rewards.js#planWorldReward');
}

/**
 * 接触/吸附到达后才收大白饭，等值合并不改经验；永久材料另记背包。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} pickupId
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planTokenCollection(context, pickupId) {
  const state = context.state, pickup = state.world.pickups[pickupId], player = state.world.entities[state.player.entityId];
  if (!pickup || pickup.collected || (pickup.position.x - player.position.x) ** 2 + (pickup.position.y - player.position.y) ** 2 > 40 ** 2) return createEmptyPlan();
  if (!['riceXp', 'gpuFragment', 'part'].includes(pickup.kind)) throw new Error('Equipment pickups are not available yet');
  return { ...createEmptyPlan(), changes: [createStateChange('world', pickupId, 'removePickup', {}), createStateChange('progression', pickupId, 'addCollectedResource', { kind: pickup.kind, amount: pickup.amount })], events: [{ id: `collected:${pickupId}`, runId: state.runId, tick: state.tick, seq: 0, type: 'PickupCollected', sourceId: player.id, targetId: null, payload: { kind: pickup.kind, amount: pickup.amount } }] };
}
