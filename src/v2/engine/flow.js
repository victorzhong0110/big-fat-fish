// @ts-check
/**
 * 流程转移与升级界面互斥。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../domain/draft.js';
import * as dependency2 from '../domain/levels.js';
import * as dependency3 from '../domain/lora.js';

/**
 * 校验允许的状态边，记录恢复phase，禁止终态回到playing。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Phase} nextPhase
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planFlowTransition(context, nextPhase) {
  throw new Error('TODO V2: engine/flow.js#planFlowTransition');
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
 * @calls engine/flow.js#planFlowTransition
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {string} reason
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planPause(context, reason) {
  throw new Error('TODO V2: engine/flow.js#planPause');
}

/**
 * 恢复到明确resumePhase，训练恢复原指针，不补跑墙钟时间。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls engine/flow.js#planFlowTransition
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planResume(context) {
  throw new Error('TODO V2: engine/flow.js#planResume');
}
