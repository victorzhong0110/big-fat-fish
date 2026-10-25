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
  const allowed = previous === 'exploring' || previous === 'boss' ? ['paused', 'defeat', 'victory', 'withdrawal'] : previous === 'paused' ? [context.state.flow.resumePhase] : [];
  if (!allowed.includes(nextPhase)) throw new Error(`Illegal phase transition ${previous} -> ${nextPhase}`);
  return { ...createEmptyPlan(), changes: [createStateChange('flow', 'phase', 'setFlowPhase', { phase: nextPhase, resumePhase: nextPhase === 'paused' ? previous : null })] };
}

/**
 * 按队首升级逐步开LoRA/插件，不能两个面板抢Space。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/levels.js#planNextLevelReward
 * @calls domain/lora.js#createLoraTrial
 * @calls domain/draft.js#createPluginChoice
 * @calls engine/flow.js#planFlowTransition
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planProgressionPanels(context) {
  throw new Error('TODO V2: engine/flow.js#planProgressionPanels');
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
  return { ...plan, changes: [...plan.changes, createStateChange('runtime', 'input', 'setInput', { ...context.state.input, move: { x: 0, y: 0 }, firing: false, heldKeys: [], pointerIds: [] })] };
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
  if (context.state.flow.phase !== 'paused' || phase !== 'exploring' && phase !== 'boss') return createEmptyPlan();
  return planFlowTransition(context, phase);
}
