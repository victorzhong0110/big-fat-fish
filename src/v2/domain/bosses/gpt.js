// @ts-check
/**
 * ChatGPT三个节点的局部重置事务。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 按血量/节点/冷却决定读条，保持可被打死；低级基础位置、高级5选3。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/bosses/gpt.js#planGptReset
 * @calls domain/bosses/gpt.js#planGptResetInterrupt
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planGptBoss(context, boss) {
  throw new Error('TODO V2: domain/bosses/gpt.js#planGptBoss');
}

/**
 * 消耗当前节点，回血、清旧敌弹/回响、预告新波次；不改玩家或sourceId/5h账本。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：绝不调用checkpoint.restore或重建整局；当tick已致死则不再重置。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planGptReset(context, boss) {
  throw new Error('TODO V2: domain/bosses/gpt.js#planGptReset');
}

/**
 * 击碎节点消费一次尝试并进入10秒保护；不恢复Boss血量。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @param {import('../../contracts.d.ts').Id} nodeId
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planGptResetInterrupt(context, boss, nodeId) {
  throw new Error('TODO V2: domain/bosses/gpt.js#planGptResetInterrupt');
}
