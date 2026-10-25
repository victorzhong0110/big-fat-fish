// @ts-check
/**
 * 设施、永久装备/技能、伙伴与出发配装。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from './tree.js';

/**
 * 扣零件、建设设施，默认装备仍可用；重复购买拒绝。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').Id} facilityId
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planFacilityPurchase(profile, facilityId, catalog) {
  throw new Error('TODO V2: domain/profile/nest.js#planFacilityPurchase');
}

/**
 * 已发现且满足设施时购买武器/技能出发选择权，不赠高品质实例。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').Id} definitionId
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planPermanentUnlock(profile, definitionId, catalog) {
  throw new Error('TODO V2: domain/profile/nest.js#planPermanentUnlock');
}

/**
 * 校验拥有/重复/槽数/选项，只在小窝更换，不改当前出发快照。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/profile/tree.js#resolveDshSlotCount
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {readonly import('../../contracts.d.ts').DshSlot[]} slots
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planDshEquipment(profile, slots, catalog) {
  throw new Error('TODO V2: domain/profile/nest.js#planDshEquipment');
}

/**
 * 检查模式/难度/武器/伙伴/设施和活动存档覆盖确认。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').StartRequest} request
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').ValidationReport}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function validateStartRequest(profile, request, catalog) {
  throw new Error('TODO V2: domain/profile/nest.js#validateStartRequest');
}
