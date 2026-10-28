// @ts-check
/**
 * MCP稳定ID分派，不得把所有候选处理器依次执行。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import { resolveWeaponTemplate } from '../content/weaponCapabilities.js';
import * as dependency1 from '../content/handlers/weapons.js';

/**
 * 按合法稳定id和已实现绑定只调用一个对应处理器。
 * 调用阶段：dispatch；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。
 * @implementationScope core-preview
 * @calls content/handlers/weapons.js#planWeaponBatch
 * @calls content/handlers/weapons.js#planWeaponBubble
 * @calls content/handlers/weapons.js#planWeaponFan
 * @calls content/handlers/weapons.js#planWeaponReturn
 * @calls content/handlers/weapons.js#planWeaponStream
 * @calls content/handlers/weapons.js#planWeaponVector
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @param {import('../contracts.d.ts').AttackContext} context
 * @param {import('../contracts.d.ts').Id} definitionId
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function dispatchWeaponsHandler(context, definitionId) {
  const templateId = resolveWeaponTemplate(context.catalog,definitionId);
  if (templateId === 'mcp_bubble') return dependency1.planWeaponBubble(context);
  if (templateId === 'mcp_fan') return dependency1.planWeaponFan(context);
  if(templateId==='mcp_vector')return dependency1.planWeaponVector(context);
  if(templateId==='mcp_stream')return dependency1.planWeaponStream(context);
  if(templateId==='mcp_return')return dependency1.planWeaponReturn(context);
  if(templateId==='mcp_batch')return dependency1.planWeaponBatch(context);
  throw new Error(`Weapon handler not available: ${definitionId}`);
}
