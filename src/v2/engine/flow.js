// @ts-check
import { createEmptyPlan, createStateChange } from '../domain/plans.js';
/**
 * 流程转移与升级界面互斥。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../domain/draft.js';
import * as dependency2 from '../domain/levels.js';
import * as dependency3 from '../domain/lora.js';

/**
 * 校验允许的状态边，记录恢复phase，禁止终态回到playing。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Phase} nextPhase
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planFlowTransition(context, nextPhase) {
  const previous = context.state.flow.phase;
  const allowed = ['exploring', 'boss', 'pluginChoice', 'loraTraining'].includes(previous) ? ['paused', 'defeat', 'victory', 'withdrawal'] : previous === 'paused' ? [context.state.flow.resumePhase] : [];
  if (!allowed.includes(nextPhase)) throw new Error(`Illegal phase transition ${previous} -> ${nextPhase}`);
  return { ...createEmptyPlan(), changes: [createStateChange('flow', 'phase', 'setFlowPhase', { phase: nextPhase, resumePhase: nextPhase === 'paused' ? previous : ['pluginChoice', 'loraTraining'].includes(nextPhase) ? context.state.flow.suspendedResumePhase ?? 'exploring' : null, suspendedResumePhase: nextPhase === 'paused' ? context.state.flow.resumePhase : null })] };
}

/**
 * 按队首升级逐步开LoRA/插件，不能两个面板抢Space。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/draft.js#createPluginChoice
 * @calls domain/levels.js#planLevelProgression
 * @calls domain/levels.js#planNextLevelReward
 * @calls domain/lora.js#createLoraTrial
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planProgressionPanels(context) {
  const state = context.state, reward = state.flow.queuedLevelRewards[0];
  if (['paused', 'pluginChoice', 'loraTraining', 'victory', 'defeat', 'withdrawal'].includes(state.flow.phase)) return createEmptyPlan();
  if (!reward) return state.flow.phase === 'preparing' ? { ...createEmptyPlan(), changes: [createStateChange('flow', 'phase', 'setFlowPhase', { phase: state.flow.resumePhase ?? 'exploring', resumePhase: null })] } : dependency2.planLevelProgression(context);
  const growth = dependency2.planNextLevelReward(context); if (growth.changes.length) return growth;
  if (reward.loraRequired && !state.lora.resolvedTrialIds.includes(`lora:${state.runId}:${reward.level}`)) {
    const creation = dependency3.createLoraTrial(context, reward.level);
    return { ...createEmptyPlan(), changes: [createStateChange('runtime', 'dsh_lora', 'queueLoraLevel', { level: reward.level }), createStateChange('random', 'lora', 'setRandomStream', creation.nextRandom), createStateChange('runtime', 'dsh_lora', 'beginLoraTrial', { trial: creation.trial }), createStateChange('runtime', 'input', 'setInput', { ...state.input, move: { x: 0, y: 0 }, firing: false, heldKeys: [], pointerIds: [] })] };
  }
  if (reward.pluginRequired) {
    const result = dependency1.createPluginChoice(context, reward); if (!result.ok) throw new Error(result.message);
    return { ...createEmptyPlan(), changes: [createStateChange('random', 'reward', 'setRandomStream', result.value.nextRandom), createStateChange('flow', 'growth', 'setGrowthFlow', { rewards: state.flow.queuedLevelRewards, choice: result.value.choice, rerollsUsed: state.flow.pluginRerollsUsed ?? 0 }), createStateChange('flow', 'phase', 'setFlowPhase', { phase: 'pluginChoice', resumePhase: state.flow.phase === 'boss' ? 'boss' : state.flow.resumePhase ?? 'exploring' }), createStateChange('runtime', 'input', 'setInput', { ...state.input, move: { x: 0, y: 0 }, firing: false, heldKeys: [], pointerIds: [] })] };
  }
  return { ...createEmptyPlan(), changes: [createStateChange('flow', 'growth', 'setGrowthFlow', { rewards: state.flow.queuedLevelRewards.slice(1), choice: null, rerollsUsed: state.flow.pluginRerollsUsed ?? 0 })] };
}

/**
 * 保留所有世界/UI剩余时间，后台/性能暂停清理持有输入。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls engine/flow.js#planFlowTransition
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {string} reason
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planPause(context, reason) {
  if (context.state.flow.phase === 'paused') return createEmptyPlan();
  const plan = planFlowTransition(context, 'paused');
  return { ...plan, changes: [...plan.changes, ...(context.state.world.entities[context.state.player.entityId].runtime.escapeHeld===true?[createStateChange('entity',context.state.player.entityId,'setEntityRuntime',{runtime:{...context.state.world.entities[context.state.player.entityId].runtime,escapeHeld:false}})]:[]), createStateChange('runtime', 'dsh_lora', 'setLoraInputHeld', { held: false }), createStateChange('runtime', 'input', 'setInput', { ...context.state.input, move: { x: 0, y: 0 }, firing: false, heldKeys: [], pointerIds: [] })] };
}

/**
 * 恢复到明确resumePhase，训练恢复原指针，不补跑墙钟时间。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls engine/flow.js#planFlowTransition
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planResume(context) {
  const phase = context.state.flow.resumePhase;
  if (context.state.flow.phase !== 'paused' || !['exploring', 'boss', 'loraTraining', 'pluginChoice'].includes(String(phase))) return createEmptyPlan();
  return planFlowTransition(context, /** @type {import('../contracts.d.ts').Phase} */ (phase));
}
