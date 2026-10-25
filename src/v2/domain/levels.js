// @ts-check
/**
 * 经验溢出、升级队列与LoRA/插件的前后顺序。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 按经验阈值分解升级，API不封顶；生成唯一LevelReward记录，不先开多个面板。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/levels.js#isPluginMilestone
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planLevelProgression(context) {
  throw new Error('TODO V2: domain/levels.js#planLevelProgression');
}

/**
 * 取队首：正常生命成长→LoRA→该级插件→下一级；胜负优先。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planNextLevelReward(context) {
  throw new Error('TODO V2: domain/levels.js#planNextLevelReward');
}

/**
 * 短途/远征固定节点，API31级起每3级；不用旧波次决定插件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {number} level
 * @param {import('../contracts.d.ts').Mode} mode
 * @returns {boolean}
 */
export function isPluginMilestone(level, mode) {
  if (!Number.isSafeInteger(level) || level < 2) return false;
  const milestones = mode === 'short' || mode === 'tutorial' ? [2, 4, 7, 10, 13, 16] : [2, 4, 7, 10, 13, 16, 19, 22, 25, 28];
  return milestones.includes(level) || mode === 'api' && level >= 31 && (level - 31) % 3 === 0;
}
