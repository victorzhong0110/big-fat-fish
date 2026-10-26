// @ts-check
import { validateContentCatalog } from '../content/catalog.js';
import { createHandlerRegistry } from '../content/registry.js';
import { createInitialGameState } from '../domain/initial.js';
import { advanceWorldTick, advanceUiTick } from './tick.js';
import {SCHEMA_VERSION,CORE_VERSION} from '../versions.js';
import { serializeCanonical } from '../domain/serialization.js';
import { validateGameCommand, orderPendingCommands } from './commands.js';
/**
 * 每局唯一状态所有者与公开门面。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../domain/checkpoint.js';
import * as dependency2 from '../domain/random.js';
import * as dependency3 from '../domain/world/map.js';
import * as dependency4 from './reducer.js';
import * as dependency5 from './snapshot.js';
import * as dependency6 from './tick.js';

/** @type {WeakMap<import('../contracts.d.ts').GameSession, { state: import('../contracts.d.ts').GameState; catalog: import('../contracts.d.ts').ContentCatalog; commands: import('../contracts.d.ts').Command[]; disposed: boolean; running: boolean }>} */
const sessions = new WeakMap();
/** @param {import('../contracts.d.ts').GameSession} session */
function getRecord(session) {
  const record = sessions.get(session);
  if (!record || record.disposed) throw new Error('Unknown or disposed Session');
  return record;
}
/** @param {import('../contracts.d.ts').GameSession} session @param {'world' | 'ui'} domain @param {boolean} advanceClock @returns {import('../contracts.d.ts').TickResult} */
function step(session, domain, advanceClock = false) {
  const record = getRecord(session);
  if (record.running) throw new Error('Reentrant Session step');
  record.running = true;
  try {
    const tick = domain === 'world' ? record.state.tick + 1 : record.state.uiTick;
    const due = orderPendingCommands(record.commands, tick, domain);
    const next = domain === 'world' ? advanceWorldTick(record.state, due, record.catalog) : advanceUiTick(record.state, due, record.catalog, advanceClock);
    record.state = next.next;
    if (domain === 'ui' || next.next.tick === tick) {
      const consumed = new Set(due.map(command => command.id)); record.commands = record.commands.filter(command => !consumed.has(command.id));
    }
    return structuredClone(next);
  } finally { record.running = false; }
}

/**
 * 建立尚未发布的Session并初始化世界/随机/流程，只有此处持有可提交状态。
 * 调用阶段：initialize；下游模式：sequence。
 * 状态权限：创建Session私有状态；不接触Profile和宿主对象。
 * @implementationScope core-preview + adventure-slice
 * @calls content/catalog.js#validateContentCatalog
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/initial.js#createInitialGameState
 * @calls domain/world/map.js#createMapPlan
 * @calls engine/reducer.js#applySystemPlan
 * @calls engine/reducer.js#validateStateInvariants
 * @param {import('../contracts.d.ts').StartSnapshot} start
 * @param {number} seed
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').GameSession}
 */
export function createGameSession(start, seed, catalog) {
  const contentReport = validateContentCatalog(catalog, createHandlerRegistry());
  if (!contentReport.valid) throw new Error(contentReport.diagnostics.map(item => item.message).join('; '));
  const record = { state: createInitialGameState(start, seed, catalog), catalog: structuredClone(catalog), commands: /** @type {import('../contracts.d.ts').Command[]} */ ([]), disposed: false, running: false };
  const plan = dependency3.createMapPlan(start, record.catalog, record.state.random.world);
  record.state = dependency4.applySystemPlan(record.state, plan);
  const validation = dependency4.validateStateInvariants(record.state, record.catalog);
  if (!validation.valid) throw new Error(validation.diagnostics.map(diagnostic => diagnostic.message).join('; '));
  const handle = Object.freeze({ get runId() { return record.state.runId; }, get revision() { return record.state.revision; } });
  sessions.set(handle, record); return handle;
}

/**
 * 只排队不重入tick，拒绝终态/重复命令。
 * 调用阶段：enqueue；下游模式：sequence。
 * 状态权限：只写Session待处理命令队列。
 * @implementationScope core-preview
 * @calls engine/commands.js#validateGameCommand
 * @param {import('../contracts.d.ts').GameSession} session
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').Command>}
 */
export function enqueueSessionCommand(session, command) {
  const record = getRecord(session);
  const validation = validateGameCommand(record.state, command);
  if (!validation.valid) return { ok: false, code: validation.diagnostics[0].code, message: validation.diagnostics[0].message };
  if (record.commands.length >= 256 || record.commands.some(item => item.id === command.id || item.seq === command.seq)) return { ok: false, code: 'COMMAND_QUEUE_REJECTED', message: 'Duplicate command or bounded queue is full' };
  const copy = structuredClone(command); record.commands.push(copy); return { ok: true, value: structuredClone(copy) };
}

/**
 * 消费当前tick命令并调用世界步一次，提交后发布输出。
 * 调用阶段：world-tick；下游模式：sequence。
 * 状态权限：唯一门面允许提交世界状态。
 * @implementationScope core-preview + adventure-slice
 * @calls engine/commands.js#orderPendingCommands
 * @calls engine/tick.js#advanceUiTick
 * @calls engine/tick.js#advanceWorldTick
 * @param {import('../contracts.d.ts').GameSession} session
 * @returns {import('../contracts.d.ts').TickResult}
 */
export function stepSessionWorld(session) {
  return step(session, 'world');
}

/**
 * 执行UI步，LoRA指针使用独立时钟。
 * 调用阶段：ui-tick；下游模式：sequence。
 * 状态权限：唯一门面允许提交UI状态。
 * @implementationScope core-preview + adventure-slice
 * @calls engine/commands.js#orderPendingCommands
 * @calls engine/tick.js#advanceUiTick
 * @calls engine/tick.js#advanceWorldTick
 * @param {import('../contracts.d.ts').GameSession} session
 * @param {boolean} advanceClock
 * @returns {import('../contracts.d.ts').TickResult}
 */
export function stepSessionUi(session, advanceClock = true) {
  return step(session, 'ui', advanceClock);
}

/**
 * 返回防修改快照或结构化复制，不能泄露私有可变引用。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').GameSession} session
 * @returns {import('../contracts.d.ts').StateSnapshot}
 */
export function readSessionState(session) {
  return structuredClone(getRecord(session).state);
}

/**
 * 供表现读取投影，不把整个Session交给Phaser。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls engine/snapshot.js#createRenderSnapshot
 * @param {import('../contracts.d.ts').GameSession} session
 * @returns {import('../contracts.d.ts').RenderSnapshot}
 */
export function readSessionView(session) {
  const record = getRecord(session);
  return dependency5.createRenderSnapshot(record.state, record.catalog);
}

/**
 * 校验并创建新的暂停Session，不在旧局上部分覆盖。
 * 调用阶段：restore；下游模式：sequence。
 * 状态权限：构建替代Session，调用者先dispose旧表现订阅。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/checkpoint.js#restoreCheckpointState
 * @param {import('../contracts.d.ts').Checkpoint} checkpoint
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').GameSession>}
 */
export function restoreGameSession(checkpoint, catalog) {
  const result = dependency1.restoreCheckpointState(checkpoint, catalog);
  if (!result.ok) return result;
  if (!['core-preview', 'adventure-slice'].includes(String(result.value.start.runtimeProfile))) return { ok: false, code: 'UNSUPPORTED_RUNTIME', message: 'Only Free practice and short difficulties 1–15 can currently be restored' };
  const record = { state: result.value, catalog: structuredClone(catalog), commands: [], disposed: false, running: false };
  const handle = Object.freeze({ get runId() { return record.state.runId; }, get revision() { return record.state.revision; } });
  sessions.set(handle, record); return { ok: true, value: handle };
}

/**
 * 标记废弃、清队列，后续命令拒绝，不能再结算一次。
 * 调用阶段：dispose；下游模式：sequence。
 * 状态权限：释放Session私有资源引用。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').GameSession} session
 * @returns {void}
 */
export function disposeGameSession(session) {
  const record = sessions.get(session);
  if (!record || record.disposed) return;
  record.disposed = true; record.commands.length = 0; sessions.delete(session);
}

/** Create an isolated simulation from a recorded boundary, including Boss/UI states. This is not a checkpoint restore and produces no persistence or Profile writes.
 * @implementationScope isolated-replay
 * @calls content/catalog.js#validateContentCatalog
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/serialization.js#serializeCanonical
 * @calls engine/reducer.js#validateStateInvariants
 * @param {import('../contracts.d.ts').StateSnapshot} initial
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').GameSession>}
 */
export function createReplaySession(initial,catalog){
 try{
  serializeCanonical(initial);
  if(initial.versions.schema!==SCHEMA_VERSION||initial.versions.core!==CORE_VERSION||initial.versions.content!==catalog.version)return {ok:false,code:'REPLAY_VERSION',message:'Incompatible recording versions'};
  if(!['core-preview','adventure-slice'].includes(String(initial.start.runtimeProfile))||serializeCanonical(initial.start.modLock??[])!==serializeCanonical(catalog.modLock??[]))return {ok:false,code:'REPLAY_CONTENT',message:'Recording runtime/content lock differs'};
  const report=validateContentCatalog(catalog,createHandlerRegistry()),invariants=dependency4.validateStateInvariants(initial,catalog);
  if(!report.valid||!invariants.valid)return {ok:false,code:'REPLAY_STATE',message:[...report.diagnostics,...invariants.diagnostics].map(d=>d.message).join('; ')};
  const record={state:structuredClone(initial),catalog:structuredClone(catalog),commands:[],disposed:false,running:false};
  const handle=Object.freeze({get runId(){return record.state.runId;},get revision(){return record.state.revision;}});sessions.set(handle,record);return {ok:true,value:handle};
 }catch{return {ok:false,code:'REPLAY_STATE',message:'Malformed recording state'};}
}
