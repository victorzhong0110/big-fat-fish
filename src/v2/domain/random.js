// @ts-check
/**
 * 显式随机状态；不使用Math.random。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 由seed派生世界/奖励/战斗/DSH/LoRA/事件六条随机流。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {number} seed
 * @returns {import('../contracts.d.ts').RandomStreams}
 */
export function createRandomStreams(seed) {
  if (!Number.isSafeInteger(seed)) throw new RangeError('Seed must be a safe integer');
  const names = /** @type {const} */ (['world', 'reward', 'combat', 'dsh', 'lora', 'event']);
  return /** @type {import('../contracts.d.ts').RandomStreams} */ (Object.fromEntries(names.map((name, index) => {
    let mixed = (seed >>> 0) ^ Math.imul(index + 1, 0x9e3779b9);
    mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad);
    mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97);
    return [name, { seed: (mixed ^ (mixed >>> 15)) >>> 0, cursor: 0 }];
  })));
}

/**
 * 返回一次随机值与新游标，不修改输入。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').RandomState} random
 * @returns {import('../contracts.d.ts').RandomDraw}
 */
export function drawRandom(random) {
  if (!Number.isInteger(random.seed) || random.seed < 0 || random.seed > 0xffffffff || !Number.isSafeInteger(random.cursor) || random.cursor < 0 || random.cursor === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Invalid random stream');
  }
  // Counter-based 32-bit permutation; explicitly fold high cursor bits for long runs.
  const cursor = random.cursor + 1;
  let value = (random.seed + Math.imul(cursor >>> 0, 0x9e3779b9)) ^ Math.floor(cursor / 0x100000000);
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value = (value ^ (value >>> 15)) >>> 0;
  return { value: value / 0x100000000, next: { seed: random.seed, cursor } };
}

/**
 * 按非负权重选择索引，明确空池/总权重0错误。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/random.js#drawRandom
 * @param {readonly number[]} weights
 * @param {import('../contracts.d.ts').RandomState} random
 * @returns {import('../contracts.d.ts').Result<{ index: number; next: import('../contracts.d.ts').RandomState }>}
 */
export function chooseWeightedIndex(weights, random) {
  if (!weights.length || weights.some(value => !Number.isFinite(value) || value < 0)) {
    return { ok: false, code: 'INVALID_WEIGHTS', message: 'Weights must be finite, nonnegative and nonempty' };
  }
  // Scaling avoids overflow when individually valid weights sum beyond Number.MAX_VALUE.
  const maximum = weights.reduce((maximum, weight) => Math.max(maximum, weight), 0);
  if (maximum === 0) return { ok: false, code: 'EMPTY_WEIGHT', message: 'At least one weight must be positive' };
  const scaled = weights.map(value => value / maximum);
  const total = scaled.reduce((sum, value) => sum + value, 0);
  const draw = drawRandom(random);
  let threshold = draw.value * total;
  for (let index = 0; index < scaled.length; index++) {
    threshold -= scaled[index];
    if (threshold < 0) return { ok: true, value: { index, next: draw.next } };
  }
  return { ok: true, value: { index: weights.length - 1 - [...weights].reverse().findIndex(value => value > 0), next: draw.next } };
}
