// @ts-check
/**
 * 可复现录制/摘要入口，与真实session共用路径。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */
import * as dependency1 from '../engine/session.js';
import * as dependency2 from '../engine/snapshot.js';

/**
 * 记录版本/seed/出发快照，不记录表现随机。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @returns {import('../contracts.d.ts').Recording}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function beginRecording(state) {
  throw new Error('TODO V2: application/replay.js#beginRecording');
}

/**
 * 记录实际消费tick与seq，不用墙钟回放。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {import('../contracts.d.ts').Recording} recording
 * @param {readonly import('../contracts.d.ts').Command[]} commands
 * @returns {import('../contracts.d.ts').Recording}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function appendRecordedCommands(recording, commands) {
  throw new Error('TODO V2: application/replay.js#appendRecordedCommands');
}

/**
 * 恢复初始条件并走相同Session命令/固定步，逐摘要验证。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls engine/session.js#createGameSession
 * @calls engine/session.js#enqueueSessionCommand
 * @calls engine/session.js#stepSessionWorld
 * @calls engine/session.js#stepSessionUi
 * @calls engine/session.js#readSessionState
 * @calls engine/snapshot.js#createStateDigest
 * @param {import('../contracts.d.ts').Recording} recording
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Result<readonly { tick: import('../contracts.d.ts').Tick; digest: string }[]>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function replayRecording(recording, catalog) {
  throw new Error('TODO V2: application/replay.js#replayRecording');
}
