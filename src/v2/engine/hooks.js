// @ts-check
/**
 * 事件投影到效果计划，切断伤害与插件的循环依赖。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */
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
 * @calls dispatch/plugins.js#dispatchPluginsHandler
 * @calls dispatch/dsh.js#dispatchDshHandler
 * @calls dispatch/models.js#dispatchModelsHandler
 * @calls dispatch/mechanics.js#dispatchMechanicsHandler
 * @calls domain/distill.js#planDistilledAbilities
 * @calls domain/plans.js#mergeSystemPlans
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planEventHooks(context, event) {
  throw new Error('TODO V2: engine/hooks.js#planEventHooks');
}
