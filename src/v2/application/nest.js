// @ts-check
import { readProfileRepository, commitProfilePlan } from './repository.js';
import { planTreePurchase, planTreeRespec } from '../domain/profile/tree.js';
import { planFacilityPurchase, planPermanentUnlock, planDshEquipment, validateStartRequest, planResidentRescue } from '../domain/profile/nest.js';
import { resolveDifficultySnapshot } from '../domain/difficulty.js';
import { createHandlerRegistry } from '../content/registry.js';

/** Execute a nest command against the latest revision; recompute after CAS conflicts, never during a run.
 * @calls application/repository.js#commitProfilePlan
 * @calls application/repository.js#readProfileRepository
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/profile/nest.js#planDshEquipment
 * @calls domain/profile/nest.js#planFacilityPurchase
 * @calls domain/profile/nest.js#planPermanentUnlock
 * @calls domain/profile/nest.js#planResidentRescue
 * @calls domain/profile/tree.js#planTreePurchase
 * @calls domain/profile/tree.js#planTreeRespec
 * @param {import('../contracts.d.ts').StoragePort} storage
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {import('../contracts.d.ts').NestAction} action
 * @returns {Promise<import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>>}
 */
export async function executeNestAction(storage, catalog, action) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const record = await readProfileRepository(storage, catalog); if (!record.ok) return record;
    const profile = record.value.profile;
    if (profile.checkpoint) return { ok: false, code: 'NEST_RUN_ACTIVE', message: '请先继续或放弃现有冒险，再调整永久成长与配装。' };
    let plan = /** @type {import('../contracts.d.ts').Result<import('../contracts.d.ts').ProfilePlan>} */({ok:false,code:'UNKNOWN_NEST_ACTION',message:'Unknown nest command'});
    if (action.type === 'buyTree') plan = planTreePurchase(profile, action.id, catalog);
    else if (action.type === 'respec') plan = { ok: true, value: planTreeRespec(profile, catalog) };
    else if (action.type === 'build') plan = planFacilityPurchase(profile, action.id, catalog);
    else if(action.type==='rescue')plan=planResidentRescue(profile,action.id,catalog);
    else if (action.type === 'unlock') plan = planPermanentUnlock(profile, action.id, catalog);
    else if (action.type === 'equipDsh') {
      if (action.slots.some(slot => !createHandlerRegistry().implementedIds.includes(slot.id))) return { ok: false, code: 'UNAVAILABLE_DSH', message: '此DSH运行效果尚未开放。' };
      plan = planDshEquipment(profile, action.slots, catalog);
    } else return { ok: false, code: 'UNKNOWN_NEST_ACTION', message: 'Unknown nest command' };
    if (!plan.ok) return plan;
    const committed = await commitProfilePlan(storage, plan.value, catalog);
    if (committed.ok || committed.code !== 'REVISION_CONFLICT') return committed;
  }
  return { ok: false, code: 'REVISION_CONFLICT', message: '另一个页面正在修改小窝，请重试。' };
}

/** Validate permanent ownership and current runtime capabilities before building the immutable departure snapshot.
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/difficulty.js#resolveDifficultySnapshot
 * @calls domain/profile/nest.js#validateStartRequest
 * @param {import('../contracts.d.ts').Profile} profile
 * @param {import('../contracts.d.ts').StartRequest} request
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {string} runId
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').StartSnapshot>}
 */
export function prepareAdventureStart(profile, request, catalog, runId) {
  const validation = validateStartRequest(profile, request, catalog);
  if (!validation.valid) return { ok: false, code: 'START_REJECTED', message: validation.diagnostics.map(item => item.message).join('; ') };
  if(request.mode==='tutorial'){
    if(request.difficulty!==0||request.weaponIds.length!==1||request.weaponIds[0]!=='mcp_bubble'||request.skillId!=='skill_disconnect'||request.companionId!=='companion_rice'||!runId)return {ok:false,code:'UNSUPPORTED_TUTORIAL',message:'教学使用基础MCP、断开连接和饭团。'};
    const difficulty=resolveDifficultySnapshot(request,catalog);if(!difficulty.ok)return difficulty;
    return {ok:true,value:{runtimeProfile:'adventure-slice',guidedTutorial:true,runId,treeNodeIds:[],dsh:[],difficulty:difficulty.value,loadout:{weapons:[{instanceId:`${runId}:weapon:0`,definitionId:'mcp_bubble',originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null}],activeWeaponIndex:0,skillId:'skill_disconnect',skillCooldown:0,companionId:'companion_rice',companionCooldown:0,dashCooldown:0}}};
  }
  const available = createHandlerRegistry().implementedIds;
  if (request.bossFaction!==undefined&&!['claude','gpt','grok'].includes(request.bossFaction)||!['short','api','expedition'].includes(request.mode) || (request.mode!=='api'&&(typeof request.difficulty!=='number'||request.difficulty<1||request.difficulty>15)) || request.companionId !== null && !available.includes(request.companionId) || request.weaponIds.some(id => !available.includes(id)) || !available.includes(request.skillId) || profile.equippedDsh.some(slot => !available.includes(slot.id)) || !runId) return { ok: false, code: 'UNSUPPORTED_RUNTIME', message: '当前开放Pro1–Max20x15短途、三海域远征与已解锁的API调用。' };
  const difficulty = resolveDifficultySnapshot(request, catalog); if (!difficulty.ok) return difficulty;
  return { ok: true, value: { runtimeProfile: 'adventure-slice',bossFaction:request.bossFaction??'claude', runId, treeNodeIds: [...profile.purchasedTree], dsh: structuredClone(profile.equippedDsh), difficulty: difficulty.value, loadout: { weapons: request.weaponIds.map((id, index) => ({ instanceId: `${runId}:weapon:${index}`, definitionId: id, originalQuality: 0, cooldown: 0, temporaryQuality: null, updateExpiresAt: null })), activeWeaponIndex: 0, skillId: request.skillId, skillCooldown: 0, companionId: request.companionId, companionCooldown: 0, dashCooldown: 0 } } };
}
