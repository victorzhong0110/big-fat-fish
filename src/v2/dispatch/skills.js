// @ts-check
/**
 * 主动技能稳定ID分派，不得把所有候选处理器依次执行。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../content/handlers/skills.js';

/**
 * 按合法稳定id和已实现绑定只调用一个对应处理器。
 * 调用阶段：dispatch；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。
 * @calls content/handlers/skills.js#planSkillDisconnect
 * @calls content/handlers/skills.js#planSkillCache
 * @calls content/handlers/skills.js#planSkillBatch
 * @calls content/handlers/skills.js#planSkillRedirect
 * @calls content/handlers/skills.js#planSkillSandbox
 * @calls content/handlers/skills.js#planSkillFork
 * @calls content/handlers/skills.js#planSkillRollback
 * @calls content/handlers/skills.js#planSkillOverclock
 * @param {import('../contracts.d.ts').AttackContext} context
 * @param {import('../contracts.d.ts').Id} definitionId
 * @returns {import('../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function dispatchSkillsHandler(context, definitionId) {
  throw new Error('TODO V2: dispatch/skills.js#dispatchSkillsHandler');
}
