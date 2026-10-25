// @ts-check
import { createRandomStreams } from './random.js';
import { createEntityState } from './entities.js';
import { CORE_VERSION, SCHEMA_VERSION } from '../versions.js';
/** Create an unpublished initial state. Map plans are applied before Session publishes it.
 * @implementationScope core-preview
 * @calls domain/entities.js#createEntityState
 * @calls domain/random.js#createRandomStreams
 * @param {import('../contracts.d.ts').StartSnapshot} start
 * @param {number} seed
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').GameState}
 */
export function createInitialGameState(start, seed, catalog) {
  if (!start.runId || !Number.isSafeInteger(seed)) throw new Error('Caller must provide a stable unique runId and integer seed');
  if (start.runtimeProfile !== 'core-preview' || start.difficulty.mode !== 'tutorial' || start.difficulty.level !== 0) throw new Error('Only the explicit Free combat preview is available; full adventure runtime is unfinished');
  if (start.treeNodeIds.length || start.dsh.length || start.loadout.companionId !== null) throw new Error('Tree, DSH and companion startup are not enabled in this preview');
  if (start.loadout.weapons.some(weapon => !['mcp_bubble', 'mcp_fan'].includes(weapon.definitionId)) || !['skill_cache', 'skill_disconnect'].includes(start.loadout.skillId)) throw new Error('Unsupported preview loadout');
  return {
    versions: { schema: SCHEMA_VERSION, core: CORE_VERSION, content: catalog.version }, runId: start.runId, seed, tick: 0, uiTick: 0, revision: 0, lastWorldAdvanceTick: null,
    input: { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, firing: false, heldKeys: [], pointerIds: [] }, lastCommandSeq: -1,
    start: structuredClone(start), flow: { phase: 'exploring', resumePhase: null, queuedLevelRewards: [], choice: null, settlementPending: false }, random: createRandomStreams(seed),
    player: { entityId: 'fish', baseStats: { maxHp: 100, moveSpeed: 220, armor: 0, damageMultiplier: 1, critChance: 0.05, critMultiplier: 1.5 }, modifiers: [], loadout: structuredClone(start.loadout), invulnerableRemaining: 0, controlImmuneRemaining: 0 },
    world: { map: { id: 'unpublished', biomeIndex: 0, width: 2200, height: 1400, exploredCells: [], obstacleIds: [], checkpointIds: [], exitIds: [], navigationRevision: 0 }, entities: { fish: createEntityState('fish', 'player_fish', 'player', 'player', { x: 230, y: 270 }, { hp: 100, maxHp: 100 }) }, pickups: {}, statuses: {}, shields: {}, objectives: [], spawnQueue: [], budgets: [], pressureEvents: [] },
    level: 1, xpRemainder: 0, totalTokens: 0, plugins: [], dshRuntime: {}, dshCycle: { remaining: 28, pendingOutcome: null, triggerSeq: 0, lastAdvancedTick: null },
    lora: { active: null, pendingLevels: [], modifiers: [], underfitRemaining: 0, overfitRemaining: 0, resolvedTrialIds: [] }, distill: { claude: { stage: 0, samples: 0 }, gpt: { stage: 0, samples: 0 }, grok: { stage: 0, samples: 0 } }, damageBudgets: {}, bosses: [], api: null, inventory: { gpuFragments: 0, parts: 0 }, attackHits: [], processedRewardIds: [], processedCommandIds: [], pendingEffects: { pending: [], processedIds: [], spawnedThisTick: 0 },
  };
}
