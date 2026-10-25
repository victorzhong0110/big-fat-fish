// @ts-check
/**
 * 每局唯一状态所有者与公开门面。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../domain/checkpoint.js';
import * as dependency2 from '../domain/random.js';
import * as dependency3 from '../domain/world/map.js';
import * as dependency4 from './reducer.js';
import * as dependency5 from './snapshot.js';
import * as dependency6 from './tick.js';

/**
 * 建立尚未发布的Session并初始化世界/随机/流程，只有此处持有可提交状态。
 * 调用阶段：initialize；下游模式：sequence。
 * 状态权限：创建Session私有状态；不接触Profile和宿主对象。
 * @calls domain/random.js#createRandomStreams
 * @calls domain/world/map.js#createMapPlan
 * @calls engine/reducer.js#validateStateInvariants
 * @param {import('../contracts.d.ts').StartSnapshot} start
 * @param {number} seed
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').GameSession}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createGameSession(start, seed, catalog) {
  throw new Error('TODO V2: engine/session.js#createGameSession');
}

/**
 * 只排队不重入tick，拒绝终态/重复命令。
 * 调用阶段：enqueue；下游模式：sequence。
 * 状态权限：只写Session待处理命令队列。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').GameSession} session
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').Command>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function enqueueSessionCommand(session, command) {
  throw new Error('TODO V2: engine/session.js#enqueueSessionCommand');
}

/**
 * 消费当前tick命令并调用世界步一次，提交后发布输出。
 * 调用阶段：world-tick；下游模式：sequence。
 * 状态权限：唯一门面允许提交世界状态。
 * @calls engine/tick.js#advanceWorldTick
 * @param {import('../contracts.d.ts').GameSession} session
 * @returns {import('../contracts.d.ts').TickResult}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function stepSessionWorld(session) {
  throw new Error('TODO V2: engine/session.js#stepSessionWorld');
}

/**
 * 执行UI步，LoRA指针使用独立时钟。
 * 调用阶段：ui-tick；下游模式：sequence。
 * 状态权限：唯一门面允许提交UI状态。
 * @calls engine/tick.js#advanceUiTick
 * @param {import('../contracts.d.ts').GameSession} session
 * @returns {import('../contracts.d.ts').TickResult}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function stepSessionUi(session) {
  throw new Error('TODO V2: engine/session.js#stepSessionUi');
}

/**
 * 返回防修改快照或结构化复制，不能泄露私有可变引用。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').GameSession} session
 * @returns {import('../contracts.d.ts').StateSnapshot}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function readSessionState(session) {
  throw new Error('TODO V2: engine/session.js#readSessionState');
}

/**
 * 供表现读取投影，不把整个Session交给Phaser。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls engine/snapshot.js#createRenderSnapshot
 * @param {import('../contracts.d.ts').GameSession} session
 * @returns {import('../contracts.d.ts').RenderSnapshot}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function readSessionView(session) {
  throw new Error('TODO V2: engine/session.js#readSessionView');
}

/**
 * 校验并创建新的暂停Session，不在旧局上部分覆盖。
 * 调用阶段：restore；下游模式：sequence。
 * 状态权限：构建替代Session，调用者先dispose旧表现订阅。
 * @calls domain/checkpoint.js#restoreCheckpointState
 * @param {import('../contracts.d.ts').Checkpoint} checkpoint
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').GameSession>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function restoreGameSession(checkpoint, catalog) {
  throw new Error('TODO V2: engine/session.js#restoreGameSession');
}

/**
 * 标记废弃、清队列，后续命令拒绝，不能再结算一次。
 * 调用阶段：dispose；下游模式：sequence。
 * 状态权限：释放Session私有资源引用。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').GameSession} session
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function disposeGameSession(session) {
  throw new Error('TODO V2: engine/session.js#disposeGameSession');
}
