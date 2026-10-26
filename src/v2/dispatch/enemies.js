// @ts-check
/**
 * 普通敌人稳定ID分派，不得把所有候选处理器依次执行。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../content/handlers/enemies.js';

/**
 * 按合法稳定id和已实现绑定只调用一个对应处理器。
 * 调用阶段：dispatch；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。
 * @implementationScope core-preview + adventure-slice
 * @calls content/handlers/enemies.js#planEnemyClaudeGuard
 * @calls content/handlers/enemies.js#planEnemyGptCodex
 * @calls content/handlers/enemies.js#planEnemyGptDewey
 * @calls content/handlers/enemies.js#planEnemyGptFireball
 * @calls content/handlers/enemies.js#planEnemyGptHoots
 * @calls content/handlers/enemies.js#planEnemyGptRocky
 * @calls content/handlers/enemies.js#planEnemyGptSeedy
 * @calls content/handlers/enemies.js#planEnemyGptStacky
 * @calls content/handlers/enemies.js#planEnemyGrokBot
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} definitionId
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function dispatchEnemiesHandler(context, definitionId, event) {
  if (definitionId === 'enemy_claude_guard') return dependency1.planEnemyClaudeGuard(context, event);
  if (definitionId === 'enemy_grok_bot') return dependency1.planEnemyGrokBot(context, event);
  if(definitionId==='enemy_gpt_codex')return dependency1.planEnemyGptCodex(context,event);
  if(definitionId==='enemy_gpt_dewey')return dependency1.planEnemyGptDewey(context,event);
  if(definitionId==='enemy_gpt_fireball')return dependency1.planEnemyGptFireball(context,event);
  if(definitionId==='enemy_gpt_hoots')return dependency1.planEnemyGptHoots(context,event);
  if(definitionId==='enemy_gpt_rocky')return dependency1.planEnemyGptRocky(context,event);
  if(definitionId==='enemy_gpt_seedy')return dependency1.planEnemyGptSeedy(context,event);
  if(definitionId==='enemy_gpt_stacky')return dependency1.planEnemyGptStacky(context,event);
  throw new Error(`Enemy handler not available: ${definitionId}`);
}
