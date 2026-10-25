// @ts-check
/**
 * 候选、升级、换槽与一次性重抽。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../content/catalog.js';
import * as dependency2 from './random.js';

/**
 * 按权重生成3/DSH首轮4个互异候选，首组保底蒸馏。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/random.js#chooseWeightedIndex
 * @calls content/catalog.js#listContentByKind
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').LevelReward} reward
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').PluginChoice>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createPluginChoice(context, reward) {
  throw new Error('TODO V2: domain/draft.js#createPluginChoice');
}

/**
 * 校验choiceId/optionId，升级同id或确认满槽替换，Pro5h单独origin不占槽。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planPluginSelection(context, command) {
  throw new Error('TODO V2: domain/draft.js#planPluginSelection');
}

/**
 * 消费本局有限重抽次数后重建候选，优先避开旧候选；不重复保底蒸馏。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/draft.js#createPluginChoice
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planPluginReroll(context, command) {
  throw new Error('TODO V2: domain/draft.js#planPluginReroll');
}

/**
 * 一次跳过治疗8并完成该选择，不转换永久资源。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planPluginSkip(context, command) {
  throw new Error('TODO V2: domain/draft.js#planPluginSkip');
}
