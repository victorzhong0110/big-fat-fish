// @ts-check
/**
 * AI系统收集意图，模型和难度共同生效。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
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
 * @calls dispatch/enemies.js#dispatchEnemiesHandler
 * @calls dispatch/models.js#dispatchModelsHandler
 * @calls dispatch/mechanics.js#dispatchMechanicsHandler
 * @calls domain/navigation.js#findNavigationPath
 * @calls domain/navigation.js#chooseRetreatPoint
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planEnemyAi(context) {
  throw new Error('TODO V2: domain/ai.js#planEnemyAi');
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
