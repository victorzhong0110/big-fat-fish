// @ts-check
/**
 * 设施、永久装备/技能、伙伴与出发配装。
 * Incremental implementation; unavailable functions remain explicit TODOs.
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
 */
export function planFacilityPurchase(profile, facilityId, catalog) {
  const definition = catalog.definitions[facilityId], cost = Number(definition?.parameters.partCost);
  if (definition?.kind !== 'facility' || !Number.isSafeInteger(cost) || cost < 0 || profile.facilities.includes(facilityId) || profile.parts < cost) return { ok: false, code: 'FACILITY_REJECTED', message: 'Facility is unknown, owned or unaffordable' };
  return { ok: true, value: { expectedRevision: profile.revision, next: { ...structuredClone(profile), revision: profile.revision + 1, parts: profile.parts - cost, facilities: [...profile.facilities, facilityId] }, events: [] } };
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
 */
export function planPermanentUnlock(profile, definitionId, catalog) {
  const definition = catalog.definitions[definitionId], cost = Number(definition?.parameters.partCost);
  const weapon = definition?.kind === 'weapon', skill = definition?.kind === 'skill';
  const owned = weapon ? profile.unlockedWeapons : profile.unlockedSkills;
  if (!weapon && !skill || !Number.isSafeInteger(cost) || cost < 0 || !profile.discovered.includes(definitionId) || owned.includes(definitionId) || profile.parts < cost || !profile.facilities.includes(weapon ? 'home_bench' : 'home_terminal')) return { ok: false, code: 'UNLOCK_REJECTED', message: 'Discover the item, build its facility and provide the required parts' };
  const next = { ...structuredClone(profile), revision: profile.revision + 1, parts: profile.parts - cost };
  if (weapon) next.unlockedWeapons = [...owned, definitionId]; else next.unlockedSkills = [...owned, definitionId];
  return { ok: true, value: { expectedRevision: profile.revision, next, events: [] } };
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
 */
export function planDshEquipment(profile, slots, catalog) {
  const ids = slots.map(slot => slot.id);
  if (slots.length > dependency1.resolveDshSlotCount(profile, catalog) || new Set(ids).size !== ids.length || slots.some(slot => !profile.unlockedDsh.includes(slot.id) || catalog.definitions[slot.id]?.kind !== 'dsh' || Object.values(slot.options).some(value => typeof value !== 'string') || slot.id === 'dsh_claude_allowlist' && !['skillBan', 'companionBan'].includes(slot.options.protect))) return { ok: false, code: 'DSH_EQUIPMENT_REJECTED', message: 'Invalid DSH ownership, slots, duplicate or protection option' };
  return { ok: true, value: { expectedRevision: profile.revision, next: { ...structuredClone(profile), revision: profile.revision + 1, equippedDsh: structuredClone(slots) }, events: [] } };
}

/** Numeric runs open one tier at a time. Exploration requires proof for that exact Benchmark.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').Mode} mode
 * @param {number|'api'} level
 * @returns {boolean}
 */
export function isDifficultyUnlocked(profile, mode, level) {
  if (mode==='tutorial') return level===0;
  if (mode==='api') return level==='api' && profile.apiUnlocked;
  if (typeof level!=='number'||!Number.isInteger(level)||level<1||level>15) return false;
  if (mode==='exploration') return profile.unlockLedger.includes(`endlessClear:${level}`);
  return ['short','expedition','endless'].includes(mode) && level<=profile.highestDifficulty+1;
}

/**
 * 检查模式/难度/武器/伙伴/设施和活动存档覆盖确认。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/profile/nest.js#isDifficultyUnlocked
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').StartRequest} request
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').ValidationReport}
 */
export function validateStartRequest(profile, request, catalog) {
  const diagnostics = /** @type {import('../../contracts.d.ts').Diagnostic[]} */ ([]);
  const fail = (/** @type {string} */ message) => diagnostics.push({ code: 'START_REJECTED', message, relatedIds: [] });
  if (!Number.isSafeInteger(request.seed) || request.seed < 0 || request.seed > 0xffffffff) fail('Invalid seed');
  if (!['tutorial', 'short', 'expedition', 'exploration', 'endless', 'api'].includes(request.mode)) fail('Unknown mode');
  if (!isDifficultyUnlocked(profile, request.mode, request.difficulty)) {
    fail(request.mode==='exploration'?'先在无尽模式通关同一档 Benchmark。':'Difficulty is not unlocked for this mode');
  }
  if (request.weaponIds.length < 1 || request.weaponIds.length > 2 || new Set(request.weaponIds).size !== request.weaponIds.length || request.weaponIds.some(id => !profile.unlockedWeapons.includes(id) || catalog.definitions[id]?.kind !== 'weapon') || request.weaponIds.length === 2 && !profile.purchasedTree.includes('tree_mcp_d')) fail('Invalid owned weapon loadout or second start slot');
  if (!profile.unlockedSkills.includes(request.skillId) || catalog.definitions[request.skillId]?.kind !== 'skill') fail('Skill is not owned');
  if (request.companionId !== null && !profile.unlockedCompanions.includes(request.companionId)) fail('Companion is not available');
  if (profile.checkpoint) fail('An active checkpoint exists; explicitly retire it before starting another run');
  return { valid: !diagnostics.length, diagnostics };
}

/** Bring the rescued rocket resident home after the actual Grok boss milestone and an explicit nest interaction.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').Id} companionId
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
export function planResidentRescue(profile,companionId,catalog){
 if(companionId!=='companion_rocket'||!profile.unlockLedger.includes('milestone:grok-defeated')||profile.unlockedCompanions.includes(companionId)||catalog.definitions[companionId]?.kind!=='companion')return {ok:false,code:'RESCUE_REJECTED',message:'先击败Grok首领，再来接回小火箭。'};
 return {ok:true,value:{expectedRevision:profile.revision,next:{...structuredClone(profile),revision:profile.revision+1,unlockedCompanions:[...profile.unlockedCompanions,companionId],discovered:[...new Set([...profile.discovered,companionId])],discoveryLedger:[...profile.discoveryLedger,'discovery:rescue:companion_rocket']},events:[]}};
}
