import { ENDLESS_STAGE_TICKS } from './difficulty.js';
import {resolveExpeditionRoute} from './world/regionRules.js';
import { resolveWeaponTemplate } from '../content/weaponCapabilities.js';
import { resolveSkillTemplate } from '../content/skillCapabilities.js';
// @ts-check
import { createTreeBaseStats, isTreeSnapshotValid } from './treeRuntime.js';
import { serializeCanonical } from './serialization.js';
import { createRandomStreams } from './random.js';
import { createEntityState } from './entities.js';
import { CORE_VERSION, SCHEMA_VERSION } from '../versions.js';
/** Create an unpublished initial state. Map plans are applied before Session publishes it.
 * @implementationScope core-preview + adventure-slice
 * @calls content/skillCapabilities.js#resolveSkillTemplate
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/entities.js#createEntityState
 * @calls domain/random.js#createRandomStreams
 * @calls domain/serialization.js#serializeCanonical
 * @calls domain/treeRuntime.js#createTreeBaseStats
 * @calls domain/treeRuntime.js#isTreeSnapshotValid
 * @calls domain/world/regionRules.js#resolveExpeditionRoute
 * @param {import('../contracts.d.ts').StartSnapshot} start
 * @param {number} seed
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').GameState}
 */
export function createInitialGameState(start, seed, catalog) {
  if (serializeCanonical(start.modLock ?? []) !== serializeCanonical(catalog.modLock ?? [])) throw new Error('Run mod lock differs from catalog');
  if(start.moddedAdventure!==undefined&&typeof start.moddedAdventure!=='boolean')throw new Error('Invalid mod adventure marker');
  if (catalog.modLock?.length && start.runtimeProfile !== 'core-preview' && (start.runtimeProfile!=='adventure-slice'||start.moddedAdventure!==true||start.guidedTutorial===true) || (!catalog.modLock?.length||start.runtimeProfile!=='adventure-slice') && start.moddedAdventure===true) throw new Error('Modded permanent adventure requires an isolated profile and exact lock');
  if (!start.runId || !Number.isSafeInteger(seed)) throw new Error('Caller must provide a stable unique runId and integer seed');
  const timedSurvival = start.difficulty.mode === 'api' || start.difficulty.mode === 'endless';
  const exploration = start.difficulty.mode === 'exploration';
  const free=start.runtimeProfile==='core-preview'&&start.difficulty.mode==='tutorial'&&start.difficulty.level===0;
  const level = start.difficulty.level;
  const numeric = ['short', 'expedition', 'exploration', 'endless'].includes(start.difficulty.mode)
    && typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 15;
  const guided = start.runtimeProfile === 'adventure-slice' && start.guidedTutorial === true
    && start.difficulty.mode === 'tutorial' && level === 0;
  const adventure = start.runtimeProfile === 'adventure-slice' && (numeric || start.difficulty.mode === 'api' && level === 'api');
  if (!free && !guided && !adventure) throw new Error('Unsupported preview runtime or departure difficulty; full bootstrap is unfinished');
  if(start.guidedTutorial===true&&!guided)throw new Error('Invalid guided tutorial profile');
  if(start.bossFaction!==undefined&&!['claude','gpt','grok'].includes(start.bossFaction))throw new Error('Invalid boss faction');
  const supportedDsh = start.runtimeProfile === 'core-preview' ? ['dsh_lora', 'dsh_gpt_branch'] : ['dsh_lora', 'dsh_gpt_branch', 'dsh_claude_appeal', 'dsh_claude_allowlist','dsh_gpt_preview','dsh_grok_license','dsh_grok_salvage','dsh_sleep','dsh_rice','dsh_open'];
  if (!isTreeSnapshotValid(start.treeNodeIds, catalog) || start.runtimeProfile === 'core-preview' && start.treeNodeIds.length || start.dsh.length > (start.runtimeProfile === 'core-preview' ? 1 : 3) || start.dsh.some(slot => !supportedDsh.includes(slot.id)) || start.loadout.companionId !== null && catalog.definitions[start.loadout.companionId]?.kind !== 'companion') throw new Error('Tree, unimplemented DSH and companion startup are not enabled in this preview');
  if (new Set(start.dsh.map(slot => slot.id)).size !== start.dsh.length || start.runtimeProfile === 'adventure-slice' && start.dsh.length > start.treeNodeIds.filter(id => ['tree_dsh_a','tree_dsh_b','tree_dsh_c'].includes(id)).length || start.dsh.some(slot => slot.id === 'dsh_claude_allowlist' && !['skillBan','companionBan'].includes(slot.options.protect))) throw new Error('Invalid departure DSH slots');
  if (start.loadout.weapons.some(weapon => resolveWeaponTemplate(catalog,weapon.definitionId) === null) || resolveSkillTemplate(catalog,start.loadout.skillId) === null) throw new Error('Unsupported preview loadout');
  const baseStats = createTreeBaseStats(start.treeNodeIds);
  return {
    ...(exploration ? { extractionHold: null } : {}),
    expedition:start.difficulty.mode==='expedition'?{route:resolveExpeditionRoute(seed),clearedBiomes:[],furthestBiome:0,regions:[null,null,null]}:null,versions: { schema: SCHEMA_VERSION, core: CORE_VERSION, content: catalog.version }, runId: start.runId, seed, tick: 0, uiTick: 0, revision: 0, lastWorldAdvanceTick: null,
    input: { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, firing: false, heldKeys: [], pointerIds: [] }, lastCommandSeq: -1,
    start: structuredClone(start), flow: { phase: 'exploring', resumePhase: null, queuedLevelRewards: [], choice: null, settlementPending: false, pluginRerollsUsed: 0 }, random: createRandomStreams(seed),
    player: { entityId: 'fish', baseStats, modifiers: [], loadout: structuredClone(start.loadout), invulnerableRemaining: 0, controlImmuneRemaining: 0 },
    world: { map: { id: 'unpublished', biomeIndex: 0, width: 2200, height: 1400, exploredCells: [], obstacleIds: [], checkpointIds: [], exitIds: [], navigationRevision: 0 }, entities: { fish: createEntityState('fish', 'player_fish', 'player', 'player', { x: 230, y: 270 }, { hp: baseStats.maxHp, maxHp: baseStats.maxHp, runtime:{rollbackHistory:[[0,230,270,0]],hpDamageTotal:0,skillReadySince:0} }) }, pickups: {}, statuses: {}, shields: {}, objectives: [], spawnQueue: [], budgets: [], pressureEvents: [] },
    level: 1, xpRemainder: 0, totalTokens: 0, plugins: start.difficulty.difficultyPerkIds.includes('plugin_5h') ? [{ id: 'plugin_5h', rank: 1, origin: 'difficulty', runtime: {} }] : [], dshRuntime: {}, dshCycle: { remaining: 10, activeRemaining: 300, durationResets: 0, pendingOutcome: null, triggerSeq: 0, lastAdvancedTick: null },
    lora: { inputHeld: false, active: null, pendingLevels: [], modifiers: [], underfitRemaining: 0, overfitRemaining: 0, resolvedTrialIds: [] }, distillRuntime: {}, distill: { claude: { stage: 0, samples: 0 }, gpt: { stage: 0, samples: 0 }, grok: { stage: 0, samples: 0 } }, damageBudgets: {}, bosses: [], api: timedSurvival?{elapsedTicks:0,bossIndex:0,materialMinute:0,fragmentsThisMinute:0,partsThisMinute:0,lastAdvancedTick:null,nextBossAt:start.difficulty.mode==='endless'?ENDLESS_STAGE_TICKS:18000,bossWarningAt:null,calmUntil:0,nextPressureAt:5400,pressureSeq:0,kills:0,bossKills:0,withdrawal:null}:null, inventory: { gpuFragments: 0, parts: 0 }, attackHits: [], processedRewardIds: [], processedCommandIds: [], pendingEffects: { pending: [], processedIds: [], spawnedThisTick: 0 },
  };
}
