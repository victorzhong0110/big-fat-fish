// @ts-check
/**
 * DSH稳定ID分派，不得把所有候选处理器依次执行。
 * Incremental implementation; unavailable functions remain explicit TODOs.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../content/handlers/dsh.js';

/**
 * 按合法稳定id和已实现绑定只调用一个对应处理器。
 * 调用阶段：dispatch；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。
 * @implementationScope core-preview
 * @calls content/handlers/dsh.js#planDshGptBranch
 * @calls content/handlers/dsh.js#planDshGptPreview
 * @calls content/handlers/dsh.js#planDshGrokLicense
 * @calls content/handlers/dsh.js#planDshGrokSalvage
 * @calls content/handlers/dsh.js#planDshLora
 * @calls content/handlers/dsh.js#planDshOpen
 * @calls content/handlers/dsh.js#planDshRice
 * @calls content/handlers/dsh.js#planDshSleep
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} definitionId
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function dispatchDshHandler(context, definitionId, event) {
  if (definitionId === 'dsh_lora') return dependency1.planDshLora(context, event);
  if (definitionId === 'dsh_gpt_branch') return dependency1.planDshGptBranch(context, event);
  if (definitionId === 'dsh_gpt_preview') return dependency1.planDshGptPreview(context,event);
  if (definitionId === 'dsh_grok_license') return dependency1.planDshGrokLicense(context,event);
  if (definitionId === 'dsh_grok_salvage') return dependency1.planDshGrokSalvage(context,event);
  if (definitionId === 'dsh_sleep') return dependency1.planDshSleep(context,event);
  if (definitionId === 'dsh_rice') return dependency1.planDshRice(context,event);
  if (definitionId === 'dsh_open') return dependency1.planDshOpen(context,event);
  throw new Error(`DSH handler is not implemented: ${definitionId}`);
}
