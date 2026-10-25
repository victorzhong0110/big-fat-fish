// @ts-check
/**
 * 显式随机状态；不使用Math.random。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */

/**
 * 由seed派生世界/奖励/战斗/DSH/LoRA/事件六条随机流。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {number} seed
 * @returns {import('../contracts.d.ts').RandomStreams}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createRandomStreams(seed) {
  throw new Error('TODO V2: domain/random.js#createRandomStreams');
}

/**
 * 返回一次随机值与新游标，不修改输入。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').RandomState} random
 * @returns {import('../contracts.d.ts').RandomDraw}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function drawRandom(random) {
  throw new Error('TODO V2: domain/random.js#drawRandom');
}

/**
 * 按非负权重选择索引，明确空池/总权重0错误。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/random.js#drawRandom
 * @param {readonly number[]} weights
 * @param {import('../contracts.d.ts').RandomState} random
 * @returns {import('../contracts.d.ts').Result<{ index: number; next: import('../contracts.d.ts').RandomState }>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function chooseWeightedIndex(weights, random) {
  throw new Error('TODO V2: domain/random.js#chooseWeightedIndex');
}
