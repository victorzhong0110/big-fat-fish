// @ts-check
/**
 * 局外档与活动检查点的单写者事务入口。
 * Incremental implementation; unavailable functions remain explicit TODOs.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../domain/profile/unlocks.js';
import * as dependency2 from '../domain/settlement.js';
import { validateCheckpoint } from '../domain/checkpoint.js';
import { CORE_VERSION, SCHEMA_VERSION } from '../versions.js';
import { serializeCanonical } from '../domain/serialization.js';

/**
 * 通过注入存储读取并验证档案，坏档不覆盖；不在世界tick内等待I/O。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/settlement.js#createDefaultProfile
 * @calls domain/settlement.js#validateProfileRecord
 * @param {import('../contracts.d.ts').StoragePort} storage
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {Promise<import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>>}
 */
export async function readProfileRepository(storage, catalog) {
  let result = await storage.read();
  if (!result.ok && result.code === 'PROFILE_MISSING') { const profile = dependency2.createDefaultProfile(); result = await storage.compareAndSwap(-1, { revision: 0, profile }); if (!result.ok && result.code === 'REVISION_CONFLICT') result = await storage.read(); }
  if (!result.ok) return result;
  const validation = dependency2.validateProfileRecord(result.value.profile, catalog);
  if (!validation.valid || result.value.revision !== result.value.profile.revision) return { ok: false, code: 'INVALID_PROFILE', message: validation.diagnostics.map(item => item.message).join('; ') || 'Profile revision mismatch' };
  return { ok: true, value: structuredClone(result.value) };
}

/**
 * 以expectedRevision原子提交一个余额/解锁/检查点计划；冲突必须重读重算，不覆盖他人更新。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/serialization.js#serializeCanonical
 * @calls domain/settlement.js#validateProfileRecord
 * @param {import('../contracts.d.ts').StoragePort} storage
 * @param {import('../contracts.d.ts').ProfilePlan} plan
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {Promise<import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>>}
 */
export async function commitProfilePlan(storage, plan, catalog) {
  const validation = dependency2.validateProfileRecord(plan.next, catalog);
  if (!validation.valid) return { ok: false, code: 'INVALID_PROFILE', message: validation.diagnostics.map(item => item.message).join('; ') };
  if (plan.next.revision === plan.expectedRevision) { const current = await storage.read(); if (!current.ok) return current; return current.value.revision === plan.expectedRevision && serializeCanonical(current.value.profile) === serializeCanonical(plan.next) ? current : { ok: false, code: 'REVISION_CONFLICT', message: 'No-op plan does not match the stored profile' }; }
  if (plan.next.revision !== plan.expectedRevision + 1) return { ok: false, code: 'INVALID_PROFILE_REVISION', message: 'Profile plans advance one revision' };
  return storage.compareAndSwap(plan.expectedRevision, { revision: plan.next.revision, profile: structuredClone(plan.next) });
}

/**
 * 稳定顺序合并发现/解锁/结算/存档，读取账本去重，输出单次revision计划。
 * 调用阶段：query；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/checkpoint.js#validateCheckpoint
 * @calls domain/profile/unlocks.js#planBossUnlock
 * @calls domain/profile/unlocks.js#planDiscoveryUnlock
 * @calls domain/profile/unlocks.js#planEasterUnlock
 * @calls domain/serialization.js#serializeCanonical
 * @calls domain/settlement.js#planSettlementCommit
 * @calls domain/settlement.js#validateProfileRecord
 * @param {import('../contracts.d.ts').Profile} profile
 * @param {readonly import('../contracts.d.ts').PersistenceIntent[]} intents
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').ProfilePlan>}
 */
export function mergePersistenceIntents(profile, intents, catalog) {
  const initial = dependency2.validateProfileRecord(profile, catalog);
  if (!initial.valid) return { ok: false, code: 'INVALID_PROFILE', message: initial.diagnostics.map(item => item.message).join('; ') };
  let next = structuredClone(profile);
  const events = /** @type {import('../contracts.d.ts').DomainEvent[]} */ ([]);
  const seen = new Set();
  // Caller order is logical emission order: discover/boss facts survive a subsequent defeat.
  for (const intent of intents) {
    if (!intent.id || !['discovery', 'checkpoint', 'settlement', 'unlock'].includes(intent.kind)) return { ok: false, code: 'INVALID_PERSISTENCE_INTENT', message: 'Unknown persistence intent or missing identity' };
    if (seen.has(intent.id)) continue; seen.add(intent.id);
    let result;
    if (intent.kind === 'settlement') result = dependency2.planSettlementCommit(next, /** @type {import('../contracts.d.ts').Settlement} */ (JSON.parse(serializeCanonical(intent.payload))), catalog);
    else if (intent.kind === 'checkpoint') {
      const checkpoint = /** @type {import('../contracts.d.ts').Checkpoint} */ (JSON.parse(serializeCanonical(intent.payload)));
      const valid = validateCheckpoint(checkpoint, { schema: SCHEMA_VERSION, core: CORE_VERSION, content: catalog.version }, catalog);
      if (!valid.valid || next.settlementLedger.includes(`settlement:${checkpoint.state.runId}`) || next.checkpoint && next.checkpoint.state.runId !== checkpoint.state.runId) return { ok: false, code: 'CHECKPOINT_REJECTED', message: 'Invalid, settled or conflicting checkpoint' };
      if (next.checkpoint && checkpoint.revision < next.checkpoint.revision) return { ok: false, code: 'CHECKPOINT_STALE', message: 'Older checkpoint cannot replace newer progress' };
      next = { ...next, revision: next.revision + 1, checkpoint }; continue;
    } else {
      const event = /** @type {import('../contracts.d.ts').DomainEvent} */ (JSON.parse(serializeCanonical(intent.payload)));
      result = intent.kind === 'discovery' ? dependency1.planDiscoveryUnlock(next, event, catalog) : event.type === 'BossDefeated' ? dependency1.planBossUnlock(next, event, catalog) : dependency1.planEasterUnlock(next, event, catalog);
    }
    if (!result.ok) return result;
    next = result.value.next; events.push(...result.value.events);
  }
  const changed = serializeCanonical({ ...next, revision: profile.revision }) !== serializeCanonical(profile);
  next.revision = profile.revision + (changed ? 1 : 0);
  const validation = dependency2.validateProfileRecord(next, catalog);
  if (!validation.valid) return { ok: false, code: 'INVALID_PROFILE', message: validation.diagnostics.map(item => item.message).join('; ') };
  return { ok: true, value: { expectedRevision: profile.revision, next, events } };
}
