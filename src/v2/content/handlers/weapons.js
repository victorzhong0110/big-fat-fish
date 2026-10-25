// @ts-check
import { resolveWeaponTemplate } from '../weaponCapabilities.js';
import { planNativeProjectiles } from '../../domain/projectiles.js';
/**
 * 六种MCP的真实原生行为入口，派发前校验行为模板。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../../domain/plans.js';

/**
 * mcp_bubble / 标准输出 · 泡泡接口：1 发泡泡，伤害 12，弹速 600，半径 7，命中消失；0.32 秒；720；初始
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/projectiles.js#planNativeProjectiles
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planWeaponBubble(context) {
  if (resolveWeaponTemplate(context.catalog,context.weapon?.definitionId??'') !== 'mcp_bubble') throw new Error('Bubble handler received the wrong weapon');
  return planNativeProjectiles(context);
}

/**
 * mcp_fan / 多模态 · 扇面接口：5 发，每发 5 伤，扇面总夹角 32°，弹速 550，半径 5；0.70 秒；460；6 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/projectiles.js#planNativeProjectiles
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planWeaponFan(context) {
  if (resolveWeaponTemplate(context.catalog,context.weapon?.definitionId??'') !== 'mcp_fan') throw new Error('Fan handler received the wrong weapon');
  return planNativeProjectiles(context);
}

/**
 * mcp_vector / 向量检索 · 穿透接口：1 发 24 伤，弹速 900，半径 5，最多命中 4 个不同敌人；0.65 秒；900；8 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/projectiles.js#planNativeProjectiles
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planWeaponVector(context) {
  if (resolveWeaponTemplate(context.catalog,context.weapon?.definitionId??'') !== 'mcp_vector') throw new Error('Wrong weapon behavior');
  return planNativeProjectiles(context);
}

/**
 * mcp_stream / 流式输出 · 连发接口：按住每次发 1 个 4 伤微泡，弹速 700，半径 4；0.10 秒；600；8 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/projectiles.js#planNativeProjectiles
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planWeaponStream(context) {
  if (resolveWeaponTemplate(context.catalog,context.weapon?.definitionId??'') !== 'mcp_stream') throw new Error('Wrong weapon behavior');
  return planNativeProjectiles(context);
}

/**
 * mcp_return / 回调函数 · 回旋接口：1 枚 18 伤回旋泡，弹速 420；到 340 距离后回追发射者，去/回各可命中同敌一次，2 秒到期；0.85 秒；最大离发射点 500；10 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/projectiles.js#planNativeProjectiles
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planWeaponReturn(context) {
  if (resolveWeaponTemplate(context.catalog,context.weapon?.definitionId??'') !== 'mcp_return') throw new Error('Wrong weapon behavior');
  return planNativeProjectiles(context);
}

/**
 * mcp_batch / 批处理 · 爆破接口：1 枚慢泡，直击 20，爆炸半径 100 造成 12；直击目标可受两段，弹速 350，半径 10；1.10 秒；600；12 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/projectiles.js#planNativeProjectiles
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planWeaponBatch(context) {
  if (resolveWeaponTemplate(context.catalog,context.weapon?.definitionId??'') !== 'mcp_batch') throw new Error('Wrong weapon behavior');
  return planNativeProjectiles(context);
}
