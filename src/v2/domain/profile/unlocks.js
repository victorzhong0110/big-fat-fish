// @ts-check
import { RESET_ACHIEVEMENT } from '../../content/achievements.js';
import { recordRunReceipt } from './receipts.js';
import { createDefaultProfile } from '../settlement.js';
/**
 * 发现/彩蛋/Boss里程碑，独立幂等id。
 * Incremental implementation; unavailable functions remain explicit TODOs.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/** @param {import('../../contracts.d.ts').Profile} profile
 * @param {string} runId
 * @param {import('../../contracts.d.ts').Profile} next
 * @param {import('../../contracts.d.ts').DomainEvent[]} [events]
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
function unlockPlan(profile, runId, next, events = []) {
  return { ok: true, value: { expectedRevision: profile.revision, next: recordRunReceipt(profile, next, runId), events } };
}

/**
 * 发现/救助立即持久化计划，恢复旧检查点不撤销也不重发资源。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/profile/receipts.js#recordRunReceipt
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
export function planDiscoveryUnlock(profile, event, catalog) {
  const payload = /** @type {{definitionId?:string;companionId?:string}} */ (event.payload);
  const rescue = event.type === 'CompanionRescued';
  const id = rescue ? payload?.companionId : payload?.definitionId;
  if ((!rescue && event.type !== 'ContentDiscovered') || !id || !catalog.definitions[id] || (rescue && catalog.definitions[id].kind !== 'companion')) {
    return { ok: false, code: 'INVALID_DISCOVERY', message: 'Discovery must reference known content or a rescued companion' };
  }
  const ledgerId = `discovery:${event.id}`;
  const next = structuredClone(profile);
  if (profile.discoveryLedger.includes(ledgerId)) return { ok: true, value: { expectedRevision: profile.revision, next, events: [] } };
  next.revision++;
  next.discoveryLedger = [...profile.discoveryLedger, ledgerId];
  next.discovered = [...new Set([...profile.discovered, id])];
  if (rescue) next.unlockedCompanions = [...new Set([...profile.unlockedCompanions, id])];
  return unlockPlan(profile, event.runId, next);
}

/**
 * 真实Boss击败满足数字难度DSH，API不冒充数字关；完整通关才开下一难度。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/profile/receipts.js#recordRunReceipt
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
export function planBossUnlock(profile, event, catalog) {
  const payload = /** @type {{faction?:string;difficulty?:number|string;mode?:string;entityId?:string}} */ (event.payload);
  const rewards = {
    claude: ['dsh_claude_appeal', 'dsh_claude_allowlist'],
    gpt: ['dsh_gpt_preview', 'dsh_gpt_branch'],
    grok: ['dsh_grok_license', 'dsh_grok_salvage']
  };
  if (event.type !== 'BossDefeated' || !payload?.entityId || !Object.hasOwn(rewards, payload.faction ?? '')
    || !['short', 'expedition', 'endless', 'api'].includes(payload.mode ?? '')) {
    return { ok: false, code: 'INVALID_BOSS_UNLOCK', message: 'Expected an actual boss-defeat event' };
  }
  const next = structuredClone(profile);
  const milestone = 'milestone:grok-defeated';
  const firstGrok = payload.faction === 'grok' && !profile.unlockLedger.includes(milestone);
  if (payload.mode === 'api') {
    if (firstGrok) {
      next.revision++;
      next.unlockLedger = [...profile.unlockLedger, milestone];
    }
    return { ok: true, value: { expectedRevision: profile.revision, next, events: [] } };
  }
  const bossId = `boss:${event.runId}:${payload.entityId}`;
  if (profile.unlockLedger.includes(bossId)) return { ok: true, value: { expectedRevision: profile.revision, next, events: [] } };
  const level = payload.difficulty;
  const earned = new Set(profile.unlockedDsh);
  if (typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 15) {
    const [base, advanced] = rewards[/** @type {keyof typeof rewards} */ (payload.faction)];
    earned.add(base);
    if (level >= 10) earned.add(advanced);
  }
  if ([...earned].some(id => catalog.definitions[id]?.kind !== 'dsh')) {
    return { ok: false, code: 'MISSING_DSH', message: 'Unlock references missing content' };
  }
  next.revision++;
  next.unlockedDsh = [...earned];
  next.unlockLedger = [...profile.unlockLedger, bossId, ...(firstGrok ? [milestone] : [])];
  return unlockPlan(profile, event.runId, next);
}

/**
 * LoRA/饭点/摸鱼等定义条件的唯一永久解锁计划，不需已开槽。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/profile/receipts.js#recordRunReceipt
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
export function planEasterUnlock(profile, event, catalog) {
  const p = /** @type {{easterId?:string;satTicks?:number;noteIds?:string[];openedBox?:boolean;weaponIds?:string[];interfaces?:string[]}} */ (event.payload);
  const dshId = { easter_sleep: 'dsh_sleep', easter_rice: 'dsh_rice', easter_open: 'dsh_open' }[/** @type {'easter_sleep'|'easter_rice'|'easter_open'} */ (p?.easterId)];
  const unique = (/** @type {readonly string[]|undefined} */ values) => Array.isArray(values) && values.every(id => typeof id === 'string' && id) ? new Set(values).size : 0;
  const valid = p?.easterId === 'easter_sleep' ? Number.isSafeInteger(p.satTicks) && Number(p.satTicks) >= 480 : p?.easterId === 'easter_rice' ? unique(p.noteIds) >= 3 && p.openedBox === true : unique(p?.weaponIds) >= 3 && p.weaponIds?.every(id => catalog.definitions[id]?.kind === 'weapon') && unique(p.interfaces) >= 3;
  if (event.type !== 'EasterCompleted' || !dshId || !valid) return { ok: false, code: 'INVALID_EASTER', message: 'Easter egg requires its completed evidence' };
  const id = `easter:${dshId}`;
  if (profile.unlockLedger.includes(id)) return { ok: true, value: { expectedRevision: profile.revision, next: structuredClone(profile), events: [] } };
  return unlockPlan(profile, event.runId, { ...structuredClone(profile), revision: profile.revision + 1, unlockedDsh: [...new Set([...profile.unlockedDsh, dshId])], unlockLedger: [...profile.unlockLedger,id] });
}

/** Persist the rare duration-reset achievement once, independently of later defeat, DSH slots or tree refunds. Practice events never qualify and the achievement grants no currency.
 * @calls domain/profile/receipts.js#recordRunReceipt
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
export function planAchievementUnlock(profile,event,catalog){
 const p=/** @type {{achievementId?:string;mode?:string;activeRemaining?:number;durationResets?:number}|null} */(event.payload),a=RESET_ACHIEVEMENT;
 if(event.type!=='DshCycleDurationReset'||event.sourceId!=='dsh_gpt_branch'||!event.runId||p?.achievementId!==a.id||!['short','expedition','endless','exploration','api'].includes(p.mode??'')||p.activeRemaining!==300||!Number.isSafeInteger(p.durationResets)||Number(p.durationResets)<1)return {ok:false,code:'INVALID_ACHIEVEMENT',message:'Expected an actual formal-adventure duration-reset event'};
 if(profile.unlockLedger.includes(a.ledgerId))return {ok:true,value:{expectedRevision:profile.revision,next:structuredClone(profile),events:[]}};
 return unlockPlan(profile, event.runId,
   { ...structuredClone(profile), revision: profile.revision + 1, unlockLedger: [...profile.unlockLedger, a.ledgerId] },
   [{ ...event, id: `${event.runId}:${a.ledgerId}`, type: 'AchievementUnlocked', payload: {achievementId:a.id, name:a.name} }]);
}

/** Display confirmed award IDs; old vanilla checkpoints can also prove their first recorded equipment discovery.
 * @calls domain/settlement.js#createDefaultProfile
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {string} runId
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {string[]}
 */
export function runReceiptStamps(profile, runId, catalog) {
  const earned = new Set(profile.receipts?.runs.find(receipt => receipt.runId === runId)?.unlocks);
  // Legacy canonical discovery events included the run and equipment ID. Other legacy unlocks did not record their owner.
  const legacyCount = profile.receipts?.legacyDiscoveryCount ?? profile.discoveryLedger.length;
  if (legacyCount && !profile.modLock?.length) {
    const prefix = 'discovery:discovery:';
    const seen = new Set(createDefaultProfile().discovered);
    for (const entry of profile.discoveryLedger.slice(0, legacyCount)) {
      if (!entry.startsWith(prefix)) continue;
      // Vanilla equipment IDs have no colon. The run ID itself can contain several.
      const separator = entry.lastIndexOf(':');
      const id = entry.slice(separator + 1);
      if (seen.has(id)) continue;
      seen.add(id);
      const kind = catalog.definitions[id]?.kind;
      if ((kind === 'weapon' || kind === 'skill') && entry.slice(prefix.length, separator) === runId) earned.add(id);
    }
  }
  return [...earned].map(id => {
    if (id === RESET_ACHIEVEMENT.ledgerId) return RESET_ACHIEVEMENT.name;
    if (id === 'api') return 'API 调用';
    if (id.startsWith('benchmark:')) return 'Benchmark ' + id.slice('benchmark:'.length);
    if (id.startsWith('endlessClear:')) return '探索 Benchmark ' + id.slice('endlessClear:'.length);
    return catalog.definitions[id]?.displayName;
  }).filter(name => typeof name === 'string');
}

/** Record only the exact cleared Benchmark in the profile for the active Endless run.
 * @calls domain/profile/receipts.js#recordRunReceipt
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
export function planEndlessClear(profile, event) {
  const {difficulty} = /** @type {{difficulty?:number}} */ (event.payload ?? {});
  const reject = {ok:/** @type {const} */(false),code:'INVALID_ENDLESS_CLEAR',message:'Expected a matching Endless Benchmark clear'};
  if (event.type!=='EndlessBenchmarkCleared'||!event.runId||event.id!==`endlessClear:${event.runId}`
    ||!event.targetId||typeof difficulty!=='number'||!Number.isInteger(difficulty)||difficulty<1||difficulty>15) return reject;
  const key = `endlessClear:${difficulty}`;
  if (profile.unlockLedger.includes(key)) {
    return {ok:true,value:{expectedRevision:profile.revision,next:structuredClone(profile),events:[]}};
  }
  const active = profile.checkpoint?.state;
  if (active?.runId!==event.runId||active.start.difficulty.mode!=='endless'||active.start.difficulty.level!==difficulty) return reject;
  const highestDifficulty = Math.max(profile.highestDifficulty, difficulty);
  const next = {...structuredClone(profile),revision:profile.revision+1,highestDifficulty,apiUnlocked:highestDifficulty>=15,
    unlockLedger:[...profile.unlockLedger,key]};
  return unlockPlan(profile, event.runId, next);
}
