// @ts-check
/**
 * 主动技能稳定ID分派，不得把所有候选处理器依次执行。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../content/handlers/skills.js';

/**
 * 按合法稳定id和已实现绑定只调用一个对应处理器。
 * 调用阶段：dispatch；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。
 * @implementationScope core-preview
 * @calls content/handlers/skills.js#planSkillBatch
 * @calls content/handlers/skills.js#planSkillCache
 * @calls content/handlers/skills.js#planSkillDisconnect
 * @calls content/handlers/skills.js#planSkillFork
 * @calls content/handlers/skills.js#planSkillOverclock
 * @calls content/handlers/skills.js#planSkillRedirect
 * @calls content/handlers/skills.js#planSkillRollback
 * @calls content/handlers/skills.js#planSkillSandbox
 * @param {import('../contracts.d.ts').AttackContext} context
 * @param {import('../contracts.d.ts').Id} definitionId
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function dispatchSkillsHandler(context, definitionId) {
  if (definitionId === 'skill_cache') return dependency1.planSkillCache(context);
  if (definitionId === 'skill_disconnect') return dependency1.planSkillDisconnect(context);
  if(definitionId==='skill_batch')return dependency1.planSkillBatch(context);
  if(definitionId==='skill_redirect')return dependency1.planSkillRedirect(context);
  if(definitionId==='skill_sandbox')return dependency1.planSkillSandbox(context);
  if(definitionId==='skill_fork')return dependency1.planSkillFork(context);
  if(definitionId==='skill_rollback')return dependency1.planSkillRollback(context);
  if(definitionId==='skill_overclock')return dependency1.planSkillOverclock(context);
  throw new Error(`Skill handler not available: ${definitionId}`);
}
