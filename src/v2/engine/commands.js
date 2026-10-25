// @ts-check
/**
 * 用户/系统命令校验与分派。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../domain/attacks.js';
import * as dependency2 from '../domain/draft.js';
import * as dependency3 from '../domain/lora.js';
import * as dependency4 from '../domain/status.js';
import * as dependency5 from '../domain/world/map.js';
import * as dependency6 from './flow.js';

/**
 * 校验幂等id/seq/tick、状态、choiceId、资源和参数合法性。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').ValidationReport}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function validateGameCommand(state, command) {
  throw new Error('TODO V2: engine/commands.js#validateGameCommand');
}

/**
 * 按phase与type分派输入/技能/换装/选择/LoRA/交互，不直接持久化。
 * 调用阶段：query；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls engine/commands.js#validateGameCommand
 * @calls domain/attacks.js#planSkillCast
 * @calls domain/attacks.js#planDash
 * @calls domain/attacks.js#planLoadoutChange
 * @calls domain/draft.js#planPluginSelection
 * @calls domain/draft.js#planPluginReroll
 * @calls domain/draft.js#planPluginSkip
 * @calls domain/lora.js#planLoraInput
 * @calls domain/status.js#planEscapeInput
 * @calls domain/world/map.js#planWorldInteraction
 * @calls engine/flow.js#planPause
 * @calls engine/flow.js#planResume
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').CommandResult}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planGameCommand(context, command) {
  throw new Error('TODO V2: engine/commands.js#planGameCommand');
}

/**
 * 按targetTick/seq稳定排序，未来命令保留，重复id拒绝。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {readonly import('../contracts.d.ts').Command[]} commands
 * @param {import('../contracts.d.ts').Tick} tick
 * @param {'world' | 'ui'} clockDomain
 * @returns {readonly import('../contracts.d.ts').Command[]}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function orderPendingCommands(commands, tick, clockDomain) {
  throw new Error('TODO V2: engine/commands.js#orderPendingCommands');
}
