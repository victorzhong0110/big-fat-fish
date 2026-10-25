// @ts-check
import { createEmptyPlan, createStateChange } from './plans.js';
/**
 * 经验溢出、升级队列与LoRA/插件的前后顺序。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 按经验阈值分解升级，API不封顶；生成唯一LevelReward记录，不先开多个面板。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/levels.js#isPluginMilestone
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planLevelProgression(context) {
  const state = context.state;
  if (!['exploring', 'boss'].includes(state.flow.phase) || state.world.entities[state.player.entityId].dead) return createEmptyPlan();
  const cap = state.start.difficulty.mode === 'api' ? Number.MAX_SAFE_INTEGER : state.start.difficulty.mode === 'expedition' ? 30 : 16;
  let level = state.level, xp = state.xpRemainder;
  const rewards = [...state.flow.queuedLevelRewards];
  // Process one level at a time. Its HP/LoRA/plugin resolves before the next threshold.
  if (level >= cap || xp < 20 + 10 * level || rewards.length) return createEmptyPlan();
  xp -= 20 + 10 * level; level++;
  rewards.push({ id: `${state.runId}:level:${level}`, level, loraRequired: state.start.dsh.some(slot => slot.id === 'dsh_lora'), pluginRequired: isPluginMilestone(level, state.start.difficulty.mode) });
  return { ...createEmptyPlan(), changes: [createStateChange('progression', 'level', 'setLevelProgress', { level, xpRemainder: xp, rewards })] };
}

/**
 * 取队首：正常生命成长→LoRA→该级插件→下一级；胜负优先。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planNextLevelReward(context) {
  const state = context.state, reward = state.flow.queuedLevelRewards[0];
  if (!reward || ['paused', 'victory', 'defeat', 'withdrawal'].includes(state.flow.phase)) return createEmptyPlan();
  const id = `growth:${reward.id}`;
  if (state.processedRewardIds.includes(id)) return createEmptyPlan();
  return { ...createEmptyPlan(), changes: [createStateChange('progression', id, 'applyLevelGrowth', { level: reward.level })], events: [{ id, runId: state.runId, tick: state.tick, seq: 0, type: 'LevelGained', sourceId: state.player.entityId, targetId: null, payload: { level: reward.level } }] };
}

/**
 * 短途/远征固定节点，API31级起每3级；不用旧波次决定插件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {number} level
 * @param {import('../contracts.d.ts').Mode} mode
 * @returns {boolean}
 */
export function isPluginMilestone(level, mode) {
  if (!Number.isSafeInteger(level) || level < 2) return false;
  const milestones = mode === 'short' || mode === 'tutorial' ? [2, 4, 7, 10, 13, 16] : [2, 4, 7, 10, 13, 16, 19, 22, 25, 28];
  return milestones.includes(level) || mode === 'api' && level >= 31 && (level - 31) % 3 === 0;
}
