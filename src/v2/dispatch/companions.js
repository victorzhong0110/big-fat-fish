// @ts-check
/**
 * 伙伴稳定ID分派，不得把所有候选处理器依次执行。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../content/handlers/companions.js';

/**
 * 按合法稳定id和已实现绑定只调用一个对应处理器。
 * 调用阶段：dispatch；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。
 * @calls content/handlers/companions.js#planCompanionCache
 * @calls content/handlers/companions.js#planCompanionDecoy
 * @calls content/handlers/companions.js#planCompanionPatch
 * @calls content/handlers/companions.js#planCompanionRice
 * @calls content/handlers/companions.js#planCompanionRocket
 * @calls content/handlers/companions.js#planCompanionRouter
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} definitionId
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function dispatchCompanionsHandler(context, definitionId, event) {
  if(definitionId==='companion_rice')return dependency1.planCompanionRice(context,event);
  if(definitionId==='companion_patch')return dependency1.planCompanionPatch(context,event);
  if(definitionId==='companion_cache')return dependency1.planCompanionCache(context,event);
  if(definitionId==='companion_router')return dependency1.planCompanionRouter(context,event);
  if(definitionId==='companion_decoy')return dependency1.planCompanionDecoy(context,event);
  if(definitionId==='companion_rocket')return dependency1.planCompanionRocket(context,event);
  throw new Error('Unknown companion');
}
