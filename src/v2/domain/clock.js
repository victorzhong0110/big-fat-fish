// @ts-check
/**
 * 渲染墙钟与世界/UI固定步之间的调度契约。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */

/**
 * 建立无积压的世界/UI调度时钟。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @returns {import('../contracts.d.ts').ClockState}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createClockState() {
  throw new Error('TODO V2: domain/clock.js#createClockState');
}

/**
 * 决定世界和UI各执行多少步，LoRA只走UI，暂停都不走。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：世界60Hz，每帧最多8步；积压>1秒性能暂停；后台恢复不得补跑离开期间时间。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').ClockState} clock
 * @param {number} elapsedMs
 * @param {import('../contracts.d.ts').Phase} phase
 * @returns {import('../contracts.d.ts').FrameSchedule}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function scheduleFrame(clock, elapsedMs, phase) {
  throw new Error('TODO V2: domain/clock.js#scheduleFrame');
}

/**
 * 清理墙钟基准/性能积压，保留世界逻辑时间。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').ClockState} clock
 * @returns {import('../contracts.d.ts').ClockState}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function resumeClock(clock) {
  throw new Error('TODO V2: domain/clock.js#resumeClock');
}
