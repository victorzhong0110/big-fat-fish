// @ts-check
import { validateCheckpoint } from './checkpoint.js';
import { CORE_VERSION, SCHEMA_VERSION } from '../versions.js';
import { serializeCanonical } from './serialization.js';
import { validateTreePurchase, resolveDshSlotCount } from './profile/tree.js';
/**
 * 对局结果与局外余额同事务计划。
 * Incremental implementation; unavailable functions remain explicit TODOs.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 计算成功/失败40或50%/API主动撤回，资源向下取整；本局id固定。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {'victory' | 'defeat' | 'withdrawal'} outcome
 * @returns {import('../contracts.d.ts').Settlement}
 */
export function createSettlement(state, outcome) {
  if (state.flow.phase !== outcome || !['victory', 'defeat', 'withdrawal'].includes(outcome) || outcome === 'withdrawal' && state.start.difficulty.mode !== 'api'||state.api&&outcome==='victory') throw new Error('Settlement must describe a terminal run');
  const keep = outcome === 'defeat' ? state.start.treeNodeIds.includes('tree_explore_c') ? 0.5 : 0.4 : 1;
  return { id: `settlement:${state.runId}`, runId: state.runId, outcome, gpuFragments: Math.floor(state.inventory.gpuFragments * keep), parts: Math.floor(state.inventory.parts * keep), survivedTicks: state.tick, bossKills: state.expedition?.clearedBiomes.length??state.api?.bossKills??state.bosses.filter(boss => state.world.entities[boss.entityId]?.dead).length,...(state.api?{apiResult:{survivedTicks:state.api.elapsedTicks,bossKills:state.api.bossKills,kills:state.api.kills,maxLevel:state.level}}:{}), discoveries: [], difficulty: state.start.difficulty.level, mode: state.start.difficulty.mode };
}

/**
 * 去重、入账、碎片换卡、解锁并清当前检查点，单个revision计划。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/settlement.js#validateProfileRecord
 * @param {import('../contracts.d.ts').Profile} profile
 * @param {import('../contracts.d.ts').Settlement} settlement
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').ProfilePlan>}
 */
export function planSettlementCommit(profile, settlement, catalog) {
  if (settlement.id !== `settlement:${settlement.runId}` || !['victory', 'defeat', 'withdrawal'].includes(settlement.outcome) || ![settlement.gpuFragments, settlement.parts, settlement.survivedTicks, settlement.bossKills].every(value => Number.isSafeInteger(value) && value >= 0)) return { ok: false, code: 'INVALID_SETTLEMENT', message: 'Invalid settlement identity or resources' };
  if(settlement.mode==='api'&&(settlement.outcome==='victory'||!settlement.apiResult||!['survivedTicks','bossKills','kills','maxLevel'].every(k=>Number.isSafeInteger(settlement.apiResult?.[/** @type {keyof import('../contracts.d.ts').ApiRecord} */(k)])&&Number(settlement.apiResult?.[/** @type {keyof import('../contracts.d.ts').ApiRecord} */(k)])>=0)))return {ok:false,code:'INVALID_SETTLEMENT',message:'API requires a valid survival record and cannot end in victory'};
  if (profile.settlementLedger.includes(settlement.id)) return { ok: true, value: { expectedRevision: profile.revision, next: structuredClone(profile), events: [] } };
  if (profile.checkpoint && profile.checkpoint.state.runId !== settlement.runId) return { ok: false, code: 'ACTIVE_RUN_CONFLICT', message: 'Cannot settle over another active run' };
  const fragments = profile.gpuFragments + settlement.gpuFragments;
  const difficulty = settlement.outcome === 'victory' && ['short', 'expedition'].includes(settlement.mode ?? '') && typeof settlement.difficulty === 'number' ? settlement.difficulty : 0;
  const highestDifficulty = Math.max(profile.highestDifficulty, difficulty);
  const next = { ...structuredClone(profile), revision: profile.revision + 1, gpuCards: profile.gpuCards + Math.floor(fragments / 5), gpuFragments: fragments % 5, parts: profile.parts + settlement.parts, highestDifficulty, apiUnlocked: highestDifficulty >= 15, unlockedDsh: difficulty >= 6 ? [...new Set([...profile.unlockedDsh, 'dsh_lora'])] : [...profile.unlockedDsh], discovered: [...new Set([...profile.discovered, ...settlement.discoveries])], settlementLedger: [...profile.settlementLedger, settlement.id], checkpoint: null };
  if(settlement.mode==='api'&&settlement.apiResult){const result=settlement.apiResult,previous=profile.bestApi;next.bestApi={survivedTicks:Math.max(previous?.survivedTicks??0,result.survivedTicks),bossKills:Math.max(previous?.bossKills??0,result.bossKills),kills:Math.max(previous?.kills??0,result.kills),maxLevel:Math.max(previous?.maxLevel??0,result.maxLevel)};}
  const report = validateProfileRecord(next, catalog);
  if (!report.valid) return { ok: false, code: 'INVALID_SETTLEMENT', message: report.diagnostics.map(item => item.message).join('; ') };
  return { ok: true, value: { expectedRevision: profile.revision, next, events: [] } };
}

/**
 * 校验余额/树前置/槽位/去重/活动存档引用；迁移失败不覆盖原数据。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/checkpoint.js#validateCheckpoint
 * @calls domain/profile/tree.js#resolveDshSlotCount
 * @calls domain/profile/tree.js#validateTreePurchase
 * @calls domain/serialization.js#serializeCanonical
 * @param {import('../contracts.d.ts').Profile} profile
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').ValidationReport}
 */
export function validateProfileRecord(profile, catalog) {
  const diagnostics = /** @type {import('../contracts.d.ts').Diagnostic[]} */ ([]);
  const fail = (/** @type {string} */ message) => diagnostics.push({ code: 'INVALID_PROFILE', message, relatedIds: [] });
  try {
    serializeCanonical(profile);
    if (profile.version !== 1 || !['revision', 'gpuCards', 'gpuFragments', 'parts', 'highestDifficulty'].every(key => Number.isSafeInteger(profile[/** @type {'revision'|'gpuCards'|'gpuFragments'|'parts'|'highestDifficulty'} */ (key)]) && Number(profile[/** @type {'revision'|'gpuCards'|'gpuFragments'|'parts'|'highestDifficulty'} */ (key)]) >= 0) || profile.gpuFragments >= 5 || profile.highestDifficulty > 15 || typeof profile.apiUnlocked !== 'boolean' || profile.apiUnlocked !== (profile.highestDifficulty >= 15)) fail('Invalid profile version, balances or progression');
    if(profile.bestApi&&!['survivedTicks','bossKills','kills','maxLevel'].every(k=>Number.isSafeInteger(profile.bestApi?.[/** @type {keyof import('../contracts.d.ts').ApiRecord} */(k)])&&Number(profile.bestApi?.[/** @type {keyof import('../contracts.d.ts').ApiRecord} */(k)])>=0))fail('Invalid API personal best');
    for (const key of /** @type {const} */ (['purchasedTree', 'discovered', 'unlockedWeapons', 'unlockedSkills', 'unlockedCompanions', 'unlockedDsh', 'facilities', 'discoveryLedger', 'unlockLedger', 'settlementLedger'])) { const ids = profile[key]; if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !id)) fail(`Invalid ${key}`); }
    for (const [ids, kind] of /** @type {[readonly string[], string][]} */ ([[profile.purchasedTree, 'tree'], [profile.unlockedWeapons, 'weapon'], [profile.unlockedSkills, 'skill'], [profile.unlockedCompanions, 'companion'], [profile.unlockedDsh, 'dsh'], [profile.facilities, 'facility']])) if (ids.some(id => catalog.definitions[id]?.kind !== kind)) fail(`Unknown ${kind} reference`);
    if (profile.discovered.some(id => !catalog.definitions[id])) fail('Unknown discovery reference');
    for (const id of profile.purchasedTree) { const cost = Number(catalog.definitions[id]?.parameters.cost); const report = validateTreePurchase({ ...profile, gpuCards: Number.MAX_SAFE_INTEGER, purchasedTree: profile.purchasedTree.filter(node => node !== id) }, id, catalog); if (!Number.isSafeInteger(cost) || !report.valid) fail('Purchased tree violates prerequisites'); }
    const equipped = profile.equippedDsh.map(slot => slot.id);
    if (equipped.length > resolveDshSlotCount(profile, catalog) || new Set(equipped).size !== equipped.length || profile.equippedDsh.some(slot => !profile.unlockedDsh.includes(slot.id) || Object.values(slot.options).some(value => typeof value !== 'string') || slot.id === 'dsh_claude_allowlist' && !['skillBan', 'companionBan'].includes(slot.options.protect))) fail('Invalid DSH equipment');
    if (profile.checkpoint && !validateCheckpoint(profile.checkpoint, { schema: SCHEMA_VERSION, core: CORE_VERSION, content: catalog.version }, catalog).valid) fail('Invalid checkpoint payload');
    if (profile.checkpoint && (profile.settlementLedger.includes(`settlement:${profile.checkpoint.state.runId}`) || !profile.checkpoint.digest || profile.checkpoint.state.flow.phase !== 'exploring')) fail('Checkpoint belongs to a settled run or invalid boundary');
  } catch { fail('Malformed profile'); }
  return { valid: !diagnostics.length, diagnostics };
}

/** 新档只含默认装备/设施，不赠算力卡或免费收入。
 * @calls 无内部公开函数。
 * @returns {import('../contracts.d.ts').Profile}
 */
export function createDefaultProfile() {
 return { version: 1, revision: 0, gpuCards: 0, gpuFragments: 0, parts: 0, purchasedTree: [], discovered: ['mcp_bubble', 'skill_disconnect', 'companion_rice'], unlockedWeapons: ['mcp_bubble'], unlockedSkills: ['skill_disconnect'], unlockedCompanions: ['companion_rice'], unlockedDsh: [], equippedDsh: [], highestDifficulty: 0, apiUnlocked: false, facilities: ['home_bowl', 'home_map'], discoveryLedger: [], unlockLedger: [], settlementLedger: [], checkpoint: null };
}
