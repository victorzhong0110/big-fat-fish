// @ts-check
/**
 * 27个永久节点、免费整树退款与DSH槽计算。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 校验前置、余额与DSH基础花费门槛，不消耗资金。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').Id} nodeId
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').ValidationReport}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function validateTreePurchase(profile, nodeId, catalog) {
  throw new Error('TODO V2: domain/profile/tree.js#validateTreePurchase');
}

/**
 * 一次节点购买与余额扣除作为同个局外计划。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/profile/tree.js#validateTreePurchase
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').Id} nodeId
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planTreePurchase(profile, nodeId, catalog) {
  throw new Error('TODO V2: domain/profile/tree.js#planTreePurchase');
}

/**
 * 整树按已购成本全退，DSH槽关闭并卸下配装，收藏保留。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').ProfilePlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planTreeRespec(profile, catalog) {
  throw new Error('TODO V2: domain/profile/tree.js#planTreeRespec');
}

/**
 * 仅根据三个特殊节点返回0–3槽，不根据收藏数量增加槽。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {number}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function resolveDshSlotCount(profile, catalog) {
  throw new Error('TODO V2: domain/profile/tree.js#resolveDshSlotCount');
}
