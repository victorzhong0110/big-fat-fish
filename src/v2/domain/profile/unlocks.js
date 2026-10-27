import {RESET_ACHIEVEMENT} from '../../content/achievements.js';
// @ts-check
/**
 * 发现/彩蛋/Boss里程碑，独立幂等id。
 * Incremental implementation; unavailable functions remain explicit TODOs.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 发现/救助立即持久化计划，恢复旧检查点不撤销也不重发资源。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
export function planDiscoveryUnlock(profile, event, catalog) {
  const payload = /** @type {{definitionId?:string;companionId?:string}} */ (event.payload);
  const id = event.type === 'CompanionRescued' ? payload?.companionId : payload?.definitionId;
  if (!['ContentDiscovered', 'CompanionRescued'].includes(event.type) || !id || !catalog.definitions[id] || event.type === 'CompanionRescued' && catalog.definitions[id].kind !== 'companion') return { ok: false, code: 'INVALID_DISCOVERY', message: 'Discovery must reference known content or a rescued companion' };
  const ledgerId = `discovery:${event.id}`;
  if (profile.discoveryLedger.includes(ledgerId)) return { ok: true, value: { expectedRevision: profile.revision, next: structuredClone(profile), events: [] } };
  return { ok: true, value: { expectedRevision: profile.revision, next: { ...structuredClone(profile), revision: profile.revision + 1, discovered: [...new Set([...profile.discovered, id])], unlockedCompanions: event.type === 'CompanionRescued' ? [...new Set([...profile.unlockedCompanions, id])] : [...profile.unlockedCompanions], discoveryLedger: [...profile.discoveryLedger, ledgerId] }, events: [] } };
}

/**
 * 真实Boss击败满足数字难度DSH，API不冒充数字关；完整通关才开下一难度。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
export function planBossUnlock(profile, event, catalog) {
  const p = /** @type {{faction?:string;difficulty?:number|string;mode?:string;entityId?:string}} */ (event.payload);
  if (event.type !== 'BossDefeated' || !['claude', 'gpt', 'grok'].includes(p?.faction ?? '') || !p?.entityId || !['short', 'expedition', 'api'].includes(p.mode ?? '')) return { ok: false, code: 'INVALID_BOSS_UNLOCK', message: 'Expected an actual boss-defeat event' };
  if(p.mode==='api'){const milestone='milestone:grok-defeated',newMilestone=p.faction==='grok'&&!profile.unlockLedger.includes(milestone);return {ok:true,value:{expectedRevision:profile.revision,next:{...structuredClone(profile),revision:profile.revision+(newMilestone?1:0),unlockLedger:newMilestone?[...profile.unlockLedger,milestone]:[...profile.unlockLedger]},events:[]}};}
  const id = `boss:${event.runId}:${p.entityId}`;
  if (profile.unlockLedger.includes(id)) return { ok: true, value: { expectedRevision: profile.revision, next: structuredClone(profile), events: [] } };
  const number = typeof p.difficulty === 'number' && Number.isInteger(p.difficulty) && p.difficulty >= 1 && p.difficulty <= 15 && p.mode !== 'api' ? p.difficulty : 0;
  const base = { claude: 'dsh_claude_appeal', gpt: 'dsh_gpt_preview', grok: 'dsh_grok_license' }[/** @type {'claude'|'gpt'|'grok'} */ (p.faction)];
  const advanced = { claude: 'dsh_claude_allowlist', gpt: 'dsh_gpt_branch', grok: 'dsh_grok_salvage' }[/** @type {'claude'|'gpt'|'grok'} */ (p.faction)];
  const unlocked = [...profile.unlockedDsh, ...(number >= 1 ? [base] : []), ...(number >= 10 ? [advanced] : [])];
  if (unlocked.some(id => catalog.definitions[id]?.kind !== 'dsh')) return { ok: false, code: 'MISSING_DSH', message: 'Unlock references missing content' };
  return { ok: true, value: { expectedRevision: profile.revision, next: { ...structuredClone(profile), revision: profile.revision + 1, unlockedDsh: [...new Set(unlocked)], unlockLedger: [...new Set([...profile.unlockLedger,id,...(p.faction==='grok'?['milestone:grok-defeated']:[])])] }, events: [] } };
}

/**
 * LoRA/饭点/摸鱼等定义条件的唯一永久解锁计划，不需已开槽。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
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
  return { ok: true, value: { expectedRevision: profile.revision, next: { ...structuredClone(profile), revision: profile.revision + 1, unlockedDsh: [...new Set([...profile.unlockedDsh, dshId])], unlockLedger: [...profile.unlockLedger,id] }, events: [] } };
}

/** Persist the rare duration-reset achievement once, independently of later defeat, DSH slots or tree refunds. Practice events never qualify and the achievement grants no currency.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
export function planAchievementUnlock(profile,event,catalog){
 const p=/** @type {{achievementId?:string;mode?:string;activeRemaining?:number;durationResets?:number}|null} */(event.payload),a=RESET_ACHIEVEMENT;
 if(event.type!=='DshCycleDurationReset'||event.sourceId!=='dsh_gpt_branch'||!event.runId||p?.achievementId!==a.id||!['short','expedition','api'].includes(p.mode??'')||p.activeRemaining!==300||!Number.isSafeInteger(p.durationResets)||Number(p.durationResets)<1)return {ok:false,code:'INVALID_ACHIEVEMENT',message:'Expected an actual formal-adventure duration-reset event'};
 if(profile.unlockLedger.includes(a.ledgerId))return {ok:true,value:{expectedRevision:profile.revision,next:structuredClone(profile),events:[]}};
 return {ok:true,value:{expectedRevision:profile.revision,next:{...structuredClone(profile),revision:profile.revision+1,unlockLedger:[...profile.unlockLedger,a.ledgerId]},events:[{...event,id:`${event.runId}:${a.ledgerId}`,type:'AchievementUnlocked',payload:{achievementId:a.id,name:a.name}}]}};
}
