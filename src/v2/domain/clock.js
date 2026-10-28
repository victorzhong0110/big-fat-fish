// @ts-check
/**
 * 渲染墙钟与世界/UI固定步之间的调度契约。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 建立无积压的世界/UI调度时钟。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @returns {import('../contracts.d.ts').ClockState}
 */
export function createClockState() {
  return { accumulatorMs: 0, suspended: false, backlogMs: 0, domain: null };
}

/**
 * 决定世界和UI各执行多少步，LoRA只走UI，暂停都不走。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：世界60Hz，每帧最多8步；积压>1秒性能暂停；后台恢复不得补跑离开期间时间。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').ClockState} clock
 * @param {number} elapsedMs
 * @param {import('../contracts.d.ts').Phase} phase
 * @returns {import('../contracts.d.ts').FrameSchedule}
 */
export function scheduleFrame(clock, elapsedMs, phase) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || !Number.isFinite(clock.accumulatorMs) || clock.accumulatorMs < 0) throw new RangeError('Invalid clock delta');
  const domain = phase === 'exploring' || phase === 'boss' ? 'world' : phase === 'loraTraining' ? 'ui' : null;
  if (clock.suspended || domain === null) return { worldSteps: 0, uiSteps: 0, nextClock: { ...clock, accumulatorMs: 0, backlogMs: 0, domain }, performancePause: false };
  // Discard substep debt across modal transitions: world time must never leak into LoRA.
  const accumulatorMs = (clock.domain === domain ? clock.accumulatorMs : 0) + elapsedMs;
  if (accumulatorMs > 1000) return { worldSteps: 0, uiSteps: 0, nextClock: { accumulatorMs: 0, backlogMs: accumulatorMs, suspended: true, domain }, performancePause: true };
  const steps = Math.min(8, Math.floor((accumulatorMs + 1e-9) / (1000 / 60)));
  const remainder = Math.max(0, accumulatorMs - steps * (1000 / 60));
  return { worldSteps: domain === 'world' ? steps : 0, uiSteps: domain === 'ui' ? steps : 0, nextClock: { accumulatorMs: remainder, backlogMs: remainder, suspended: false, domain }, performancePause: false };
}

/**
 * 清理墙钟基准/性能积压，保留世界逻辑时间。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').ClockState} clock
 * @returns {import('../contracts.d.ts').ClockState}
 */
export function resumeClock(clock) {
  return { ...clock, accumulatorMs: 0, backlogMs: 0, suspended: false, domain: null };
}
