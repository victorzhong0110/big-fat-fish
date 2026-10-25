// @ts-check
/**
 * 实体/群组/箱子/目标奖励计划，无存储I/O。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 按阵营掉经验，精英群仅一箱；无奖励回响/装置排除。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {readonly import('../contracts.d.ts').DeathRecord[]} records
 * @returns {import('../contracts.d.ts').RewardPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planDeathRewards(context, records) {
  throw new Error('TODO V2: domain/rewards.js#planDeathRewards');
}

/**
 * 按stable rewardId发箱子/任务奖励，API分钟材料限额先校验。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} rewardId
 * @returns {import('../contracts.d.ts').RewardPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planWorldReward(context, rewardId) {
  throw new Error('TODO V2: domain/rewards.js#planWorldReward');
}

/**
 * 接触/吸附到达后才收大白饭，等值合并不改经验；永久材料另记背包。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} pickupId
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planTokenCollection(context, pickupId) {
  throw new Error('TODO V2: domain/rewards.js#planTokenCollection');
}
