// @ts-check
/**
 * 唯一真实存储I/O适配器，单记录CAS语义。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */

/**
 * 创建带revision的原子记录读写端口，具体选IndexedDB或单键localStorage实现。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls adapters/storage.js#readStorageRecord
 * @calls adapters/storage.js#compareAndSwapStorageRecord
 * @param {string} key
 * @returns {import('../contracts.d.ts').StoragePort}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createStoragePort(key) {
  throw new Error('TODO V2: adapters/storage.js#createStoragePort');
}

/**
 * 读取原始记录并解析，坏档返回错误且不覆盖。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {string} key
 * @returns {Promise<import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export async function readStorageRecord(key) {
  throw new Error('TODO V2: adapters/storage.js#readStorageRecord');
}

/**
 * 原子校验revision并写整条Profile+checkpoint；并发冲突返回错误。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：唯一磁盘写者，不能拆余额/检查点两次写。
 * 约束：localStorage不具跨标签页CAS能力，若选它必须加可靠单写者协调；否则使用IndexedDB事务。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {string} key
 * @param {number} expectedRevision
 * @param {import('../contracts.d.ts').StorageRecord} next
 * @returns {Promise<import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export async function compareAndSwapStorageRecord(key, expectedRevision, next) {
  throw new Error('TODO V2: adapters/storage.js#compareAndSwapStorageRecord');
}
