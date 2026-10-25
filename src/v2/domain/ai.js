// @ts-check
import { mergeSystemPlans } from './plans.js';
/**
 * AI系统收集意图，模型和难度共同生效。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../dispatch/companions.js';
import * as dependency2 from '../dispatch/enemies.js';
import * as dependency3 from '../dispatch/mechanics.js';
import * as dependency4 from '../dispatch/models.js';
import * as dependency5 from './bosses/claude.js';
import * as dependency6 from './bosses/gpt.js';
import * as dependency7 from './bosses/grok.js';
import * as dependency8 from './navigation.js';

/**
 * 逐活敌解析基础职能+模型profile+累计常驻机制，再规划移动/预警/攻击。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：分派为每个合法entity/handler一次，不能把声明的所有分支直接全跑。
 * @implementationScope core-preview
 * @calls dispatch/enemies.js#dispatchEnemiesHandler
 * @calls domain/plans.js#mergeSystemPlans
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planEnemyAi(context) {
  const event = context.event ?? { id: `world:${context.state.tick}`, runId: context.state.runId, tick: context.state.tick, seq: 0, type: 'WorldTick', sourceId: null, targetId: null, payload: null };
  const plans = Object.values(context.state.world.entities).filter(entity => entity.kind === 'enemy' && !entity.dead && !entity.dying && !context.state.bosses.some(boss => boss.entityId === entity.id)).sort((a, b) => a.id < b.id ? -1 : 1).map(entity => dependency2.dispatchEnemiesHandler({ ...context, entityId: entity.id }, entity.definitionId, event));
  return mergeSystemPlans(plans);
}

/**
 * 未封禁时按原冷却和条件自动协助，输出来源companion。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls dispatch/companions.js#dispatchCompanionsHandler
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planCompanionAi(context) {
  throw new Error('TODO V2: domain/ai.js#planCompanionAi');
}

/**
 * 按阵营只分派对应首领；API阶段Boss不改变胜负规则。
 * 调用阶段：query；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/bosses/claude.js#planClaudeBoss
 * @calls domain/bosses/gpt.js#planGptBoss
 * @calls domain/bosses/grok.js#planGrokBoss
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planBossAi(context) {
  throw new Error('TODO V2: domain/ai.js#planBossAi');
}
