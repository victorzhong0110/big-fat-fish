// @ts-check
/**
 * 事件投影到效果计划，切断伤害与插件的循环依赖。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import{planEasterEvent}from'../domain/easter.js';
import{planDshEffects}from'../domain/dshEffects.js';
import{planCombatPluginEvent}from'../domain/combatPlugins.js';
import {planCompanionMilestones} from '../domain/companions.js';
import { planPluginParallel } from '../content/handlers/plugins.js';
import { planSealRelease } from '../domain/status.js';
import { planDistillEvent } from '../domain/distill.js';
import * as dependency1 from '../dispatch/dsh.js';
import * as dependency2 from '../dispatch/mechanics.js';
import * as dependency3 from '../dispatch/models.js';
import * as dependency4 from '../dispatch/plugins.js';
import * as dependency5 from '../domain/distill.js';
import * as dependency6 from '../domain/plans.js';

/**
 * 按事件的合法订阅者派发插件/DSH/模型/机制；副作用进效果队列。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：过滤已启用/实际订阅的handler；次级伤害不冒充基础武器命中；不再次发布同eventId。
 * @implementationScope core-preview + adventure-slice
 * @calls content/handlers/plugins.js#planPluginParallel
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @calls domain/companions.js#planCompanionMilestones
 * @calls domain/distill.js#planDistillEvent
 * @calls domain/dshEffects.js#planDshEffects
 * @calls domain/easter.js#planEasterEvent
 * @calls domain/plans.js#mergeSystemPlans
 * @calls domain/status.js#planSealRelease
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planEventHooks(context, event) {
  if (!['core-preview', 'adventure-slice'].includes(String(context.state.start.runtimeProfile))) throw new Error('Full content event subscriptions are not connected');
  if (context.state.plugins.some(plugin=>context.catalog.definitions[plugin.id]?.kind!=='plugin'||context.catalog.definitions[plugin.id]?.parameters.previewAvailable!==true) || context.state.start.dsh.some(slot => !['dsh_lora', 'dsh_gpt_branch', 'dsh_claude_appeal', 'dsh_claude_allowlist','dsh_gpt_preview','dsh_grok_license','dsh_grok_salvage','dsh_sleep','dsh_rice','dsh_open'].includes(slot.id)) || context.state.start.difficulty.mechanicIds.some(id => !(context.state.start.runtimeProfile === 'adventure-slice' && id === 'mech_01_exploration'))) throw new Error('Content hooks are not enabled in the combat preview');
  return dependency6.mergeSystemPlans([planDistillEvent(context, event), planSealRelease(context, event),planPluginParallel(context,event),planCompanionMilestones(context,event),planCombatPluginEvent(context,event),planDshEffects(context,event),planEasterEvent(context,event)]);
}
