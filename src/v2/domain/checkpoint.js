// @ts-check
/**
 * 完整对局序列化/版本校验，纯计划无I/O。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from './world/map.js';
import { serializeCanonical, createDataDigest } from './serialization.js';
import { inspectGameState } from './stateValidation.js';
import { SCHEMA_VERSION, CORE_VERSION } from '../versions.js';

/**
 * 只在安全检查点、无训练/选择/半帧效果时允许保存。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/world/map.js#isSafeForInteraction
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').ValidationReport}
 */
export function canCreateCheckpoint(context) {
  const state = context.state;
  const diagnostics = /** @type {import('../contracts.d.ts').Diagnostic[]} */ ([]);
  const player = state.world.entities[state.player.entityId];
  if (!player || player.hp <= 0 || player.dead || player.dying) diagnostics.push({ code: 'CHECKPOINT_DEAD', message: 'A living player is required', relatedIds: [] });
  if (state.flow.phase !== 'exploring' || state.flow.choice || state.flow.queuedLevelRewards.length || state.lora.active || state.lora.pendingLevels.length || state.pendingEffects.pending.length || state.flow.settlementPending) diagnostics.push({ code: 'CHECKPOINT_BUSY', message: 'Finish combat and pending level/effect processing', relatedIds: [] });
  if (state.start.runtimeProfile === 'core-preview' && (state.input.firing || state.input.move.x || state.input.move.y)) diagnostics.push({ code: 'CHECKPOINT_INPUT_ACTIVE', message: 'Release movement and shooting before saving', relatedIds: [] });
  const nearby = player && state.world.map.checkpointIds.some(id => {
    const checkpoint = state.world.entities[id];
    return checkpoint && !checkpoint.dead && (checkpoint.position.x - player.position.x) ** 2 + (checkpoint.position.y - player.position.y) ** 2 <= 96 ** 2;
  });
  if (!nearby) diagnostics.push({ code: 'CHECKPOINT_TOO_FAR', message: 'Move within 96 units of a checkpoint', relatedIds: [] });
  if (player && !dependency1.isSafeForInteraction(context, player.position)) diagnostics.push({ code: 'CHECKPOINT_UNSAFE', message: 'Threats or pressure events are still active', relatedIds: [] });
  return { valid: diagnostics.length === 0, diagnostics };
}

/**
 * 复制完整状态、随机游标、模型壳/LoRA/DSH/事件与去重账本并加摘要。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/serialization.js#createDataDigest
 * @calls domain/serialization.js#serializeCanonical
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @returns {import('../contracts.d.ts').Checkpoint}
 */
export function createCheckpoint(state) {
  if (state.flow.phase !== 'exploring' || state.flow.choice || state.lora.active || state.flow.queuedLevelRewards.length || state.pendingEffects.pending.length || state.flow.settlementPending) throw new Error('Checkpoint requires a settled exploration boundary');
  const snapshot = /** @type {import('../contracts.d.ts').GameState} */ (JSON.parse(serializeCanonical(state)));
  const id = `checkpoint:${JSON.stringify([state.runId, state.tick, state.revision])}`;
  const data = { id, versions: { ...state.versions }, revision: state.revision, state: snapshot };
  return { ...data, digest: createDataDigest(data) };
}

/**
 * 检查版本、完整性、有限数值、机制集合和全部内容引用；失败保留原档。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/serialization.js#createDataDigest
 * @calls domain/serialization.js#serializeCanonical
 * @calls domain/stateValidation.js#inspectGameState
 * @param {import('../contracts.d.ts').Checkpoint} checkpoint
 * @param {import('../contracts.d.ts').Versions} versions
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').ValidationReport}
 */
export function validateCheckpoint(checkpoint, versions, catalog) {
  const diagnostics = /** @type {import('../contracts.d.ts').Diagnostic[]} */ ([]);
  try {
    if (checkpoint.versions.schema !== versions.schema || checkpoint.versions.core !== versions.core || checkpoint.versions.content !== versions.content || checkpoint.versions.content !== catalog.version) diagnostics.push({ code: 'CHECKPOINT_VERSION', message: 'Checkpoint version is incompatible', relatedIds: [] });
    const { digest, ...data } = checkpoint;
    if (createDataDigest(data) !== digest) diagnostics.push({ code: 'CHECKPOINT_DIGEST', message: 'Checkpoint checksum mismatch', relatedIds: [] });
    if (!checkpoint.id || checkpoint.revision !== checkpoint.state.revision || serializeCanonical(checkpoint.versions) !== serializeCanonical(checkpoint.state.versions)) diagnostics.push({ code: 'CHECKPOINT_HEADER', message: 'Checkpoint header differs from state', relatedIds: [] });
    diagnostics.push(...inspectGameState(checkpoint.state, catalog).diagnostics);
    const state = checkpoint.state;
    if (state.flow.phase !== 'exploring' || state.world.entities[state.player.entityId]?.hp <= 0 || state.flow.choice || state.flow.queuedLevelRewards.length || state.lora.active || state.lora.pendingLevels.length || state.pendingEffects.pending.length || state.flow.settlementPending) diagnostics.push({ code: 'CHECKPOINT_BOUNDARY', message: 'Checkpoint contains an unsettled boundary', relatedIds: [] });
  } catch { diagnostics.push({ code: 'CHECKPOINT_MALFORMED', message: 'Malformed checkpoint data', relatedIds: [] }); }
  return { valid: diagnostics.length === 0, diagnostics };
}

/**
 * 校验后构建全新对局，先暂停；不回血/发额度/换候选/重抽开奖。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/checkpoint.js#validateCheckpoint
 * @calls domain/serialization.js#serializeCanonical
 * @param {import('../contracts.d.ts').Checkpoint} checkpoint
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').GameState>}
 */
export function restoreCheckpointState(checkpoint, catalog) {
  const report = validateCheckpoint(checkpoint, { schema: SCHEMA_VERSION, core: CORE_VERSION, content: catalog.version }, catalog);
  if (!report.valid) return { ok: false, code: 'CHECKPOINT_INVALID', message: report.diagnostics.map(item => item.message).join('; ') };
  const state = /** @type {import('../contracts.d.ts').GameState} */ (JSON.parse(serializeCanonical(checkpoint.state)));
  state.flow.resumePhase = state.flow.phase;
  state.flow.phase = 'paused';
  return { ok: true, value: state };
}
