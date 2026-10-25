// @ts-check
/**
 * 驻守、追兵、Grok群组和API预算。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../../content/catalog.js';
import * as dependency2 from '../collision.js';
import * as dependency3 from '../difficulty.js';

/**
 * 推进合法生成日程，额度/局部容量满则延期，合并久积压，保持Grok人海方向。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/collision.js#validateSpawnLocation
 * @calls domain/difficulty.js#resolveApiSpawnMultipliers
 * @calls domain/world/spawning.js#planReinforcementGroup
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planSpawnSchedule(context) {
  throw new Error('TODO V2: domain/world/spawning.js#planSpawnSchedule');
}

/**
 * 建立稳定实体id/奖励来源/出生时倍率和模型壳，提交生成计划。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：模型壳/基础能力在下一阶段按相同profile处理，出生倍率只快照一次；实体来源和奖励策略不丢失。
 * @calls domain/difficulty.js#resolveModelProfileId
 * @calls content/catalog.js#findContentDefinition
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').SpawnRequest} request
 * @returns {import('../../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planEnemySpawn(context, request) {
  throw new Error('TODO V2: domain/world/spawning.js#planEnemySpawn');
}

/**
 * 为一组入口/信号援军预留预算和奖励策略；同group只排一次。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').Id} groupId
 * @param {import('../../contracts.d.ts').Id} budgetId
 * @returns {import('../../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planReinforcementGroup(context, groupId, budgetId) {
  throw new Error('TODO V2: domain/world/spawning.js#planReinforcementGroup');
}
