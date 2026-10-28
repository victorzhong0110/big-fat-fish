// @ts-check
import { serializeCanonical } from '../domain/serialization.js';
/**
 * 唯一真实存储I/O适配器，单记录CAS语义。
 * Incremental implementation; unavailable functions remain explicit TODOs.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 创建带revision的原子记录读写端口，具体选IndexedDB或单键localStorage实现。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls adapters/storage.js#compareAndSwapStorageRecord
 * @calls adapters/storage.js#readStorageRecord
 * @param {string} key
 * @returns {import('../contracts.d.ts').StoragePort}
 */
export function createStoragePort(key) {
  if (!key || typeof key !== 'string') throw new Error('Storage key is required');
  return { read: () => readStorageRecord(key), compareAndSwap: (expectedRevision, next) => compareAndSwapStorageRecord(key, expectedRevision, next) };
}

/**
 * 读取原始记录并解析，坏档返回错误且不覆盖。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {string} key
 * @returns {Promise<import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>>}
 */
export async function readStorageRecord(key) {
  return transactRecord(key, null, null);
}

/**
 * 原子校验revision并写整条Profile+checkpoint；并发冲突返回错误。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：唯一磁盘写者，不能拆余额/检查点两次写。
 * 约束：localStorage不具跨标签页CAS能力，若选它必须加可靠单写者协调；否则使用IndexedDB事务。
 * @calls domain/serialization.js#serializeCanonical
 * @param {string} key
 * @param {number} expectedRevision
 * @param {import('../contracts.d.ts').StorageRecord} next
 * @returns {Promise<import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>>}
 */
export async function compareAndSwapStorageRecord(key, expectedRevision, next) {
  try { serializeCanonical(next); } catch { return { ok: false, code: 'INVALID_STORAGE_RECORD', message: 'Storage requires finite plain data' }; }
  if (!Number.isSafeInteger(next.revision) || !Number.isSafeInteger(expectedRevision) || expectedRevision < -1 || next.revision !== expectedRevision + 1 || next.profile.revision !== next.revision) return { ok: false, code: 'INVALID_STORAGE_REVISION', message: 'CAS requires the next consecutive revision' };
  return transactRecord(key, expectedRevision, structuredClone(next));
}

/** @param {string} key @param {number|null} expected @param {import('../contracts.d.ts').StorageRecord|null} next @returns {Promise<import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>>} */
async function transactRecord(key, expected, next) {
 if (typeof indexedDB === 'undefined') return { ok: false, code: 'STORAGE_UNAVAILABLE', message: 'IndexedDB is unavailable' };
 return new Promise(resolve => {
  let settled = false;
  /** @param {import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>} result */
  const finish = result => { if (!settled) { settled = true; resolve(result); } };
  let open;
  try { open = indexedDB.open('big-fat-fish-v2', 1); } catch { finish({ ok: false, code: 'STORAGE_OPEN_FAILED', message: 'Unable to open profile database' }); return; }
  open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains('profiles')) open.result.createObjectStore('profiles'); };
  open.onerror = () => finish({ ok: false, code: 'STORAGE_OPEN_FAILED', message: open.error?.message ?? 'Unable to open profile database' });
  open.onblocked = () => finish({ ok: false, code: 'STORAGE_BLOCKED', message: 'Close an older database connection and retry' });
  open.onsuccess = () => {
   const database = open.result; if (settled) { database.close(); return; }
   database.onversionchange = () => database.close();
   let transaction;
   try { transaction = database.transaction('profiles', expected === null ? 'readonly' : 'readwrite'); } catch { database.close(); finish({ ok: false, code: 'STORAGE_TRANSACTION_FAILED', message: 'Unable to start profile transaction' }); return; }
   const store = transaction.objectStore('profiles');
   let result = /** @type {import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>} */ ({ ok: false, code: 'STORAGE_FAILED', message: 'Profile transaction did not finish' });
   const get = store.get(key);
   get.onsuccess = () => {
    const current = /** @type {import('../contracts.d.ts').StorageRecord|undefined} */ (get.result);
    if (current && (!Number.isSafeInteger(current.revision) || current.revision < 0 || current.profile?.revision !== current.revision)) { result = { ok: false, code: 'STORAGE_CORRUPT', message: 'Stored record has an invalid revision; original retained' }; return; }
    if (expected === null) { result = current ? { ok: true, value: structuredClone(current) } : { ok: false, code: 'PROFILE_MISSING', message: 'No profile exists' }; return; }
    if ((current?.revision ?? -1) !== expected) { result = { ok: false, code: 'REVISION_CONFLICT', message: 'Profile changed; read and recalculate before retrying' }; return; }
    if (!next) { result = { ok: false, code: 'INVALID_STORAGE_RECORD', message: 'Missing next profile' }; return; }
    try { store.put(next, key); result = { ok: true, value: structuredClone(next) }; } catch { transaction.abort(); }
   };
   transaction.oncomplete = () => { database.close(); finish(result); };
   transaction.onerror = transaction.onabort = () => { database.close(); finish({ ok: false, code: 'STORAGE_WRITE_FAILED', message: transaction.error?.message ?? 'Profile transaction aborted; original retained' }); };
  };
 });
}
