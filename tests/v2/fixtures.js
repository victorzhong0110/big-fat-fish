import { SCHEMA_VERSION, CORE_VERSION } from '../../src/v2/versions.js';
import { createRandomStreams } from '../../src/v2/domain/random.js';

export function entity(id, overrides = {}) {
  return {
    id, definitionId: id === 'fish' ? 'player_fish' : 'enemy_claude_crab', kind: id === 'fish' ? 'player' : 'enemy',
    faction: id === 'fish' ? null : 'claude', team: id === 'fish' ? 'player' : 'enemy',
    position: { x: 500, y: 500 }, previousPosition: { x: 500, y: 500 }, velocity: { x: 0, y: 0 }, facingRadians: 0, radius: 22,
    hp: 100, maxHp: 100, armor: 0, shieldIds: [], statusIds: [], modelProfileId: null, shell: null, collisionProfileId: 'body',
    sourceId: id, creditOwner: id === 'fish' ? 'player' : 'enemy', attackId: null, rewardPolicy: 'normal', distillEligible: true,
    dying: false, dead: false, expiresAt: null, timers: {}, runtime: {}, ...overrides,
  };
}
export function catalog() {
  const definitions = Object.fromEntries(['player_fish', 'enemy_claude_crab', 'enemy_grok_bot', 'projectile', 'wall'].map(id => [id, { id, kind: 'entity', displayName: id, parameters: {}, version: 'v2-core.1' }]));
  definitions.mcp_bubble = { id: 'mcp_bubble', kind: 'weapon', displayName: '泡泡接口', version: 'v2-core.1', parameters: { damage: 12, interval: 0.32, projectileSpeed: 600, projectileRadius: 7, pellets: 1, spreadRadians: 0, range: 720, maxHits: 1 } };
  const mechanics = Array.from({ length: 15 }, (_, index) => ({ id: `mech_${index + 1}`, kind: 'mechanic', displayName: `机制${index + 1}`, parameters: {}, version: 'v2-core.1', unlockAt: index + 1, scope: 'world', appliesTo: [], handlerId: 'pending', exclusions: [] }));
  mechanics.push({ ...mechanics[10], id: 'mech_11_glasswing' });
  return { version: 'v2-core.1', definitions, mechanics };
}
export function state() {
  return {
    versions: { schema: SCHEMA_VERSION, core: CORE_VERSION, content: 'v2-core.1' }, runId: 'run:1', seed: 19, tick: 0, uiTick: 0, revision: 0, lastWorldAdvanceTick: null, lastCommandSeq: -1, input: { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, firing: false, heldKeys: [], pointerIds: [] },
    start: { treeNodeIds: [], dsh: [], loadout: { weapons: [{ instanceId: 'bubble:1', definitionId: 'mcp_bubble', originalQuality: 0, cooldown: 0, temporaryQuality: null, updateExpiresAt: null }], activeWeaponIndex: 0, skillId: 'skill_disconnect', skillCooldown: 8, companionId: 'companion_rice', companionCooldown: 9, dashCooldown: 4 }, difficulty: { level: 1, mode: 'short', mechanicIds: ['mech_1'], difficultyPerkIds: ['plugin_5h'], modelProfileIds: { claude: 'claude_haiku', gpt: 'gpt_astra', grok: 'grok_bot' }, hpMultiplier: 1, damageMultiplier: 1, spawnBudgetMultiplier: 1 } },
    flow: { phase: 'exploring', resumePhase: null, queuedLevelRewards: [], choice: null, settlementPending: false }, random: createRandomStreams(19),
    player: { entityId: 'fish', baseStats: { maxHp: 100, moveSpeed: 220, armor: 0, damageMultiplier: 1, critChance: 0.05, critMultiplier: 1.5 }, modifiers: [], loadout: { weapons: [{ instanceId: 'bubble:1', definitionId: 'mcp_bubble', originalQuality: 0, cooldown: 0, temporaryQuality: null, updateExpiresAt: null }], activeWeaponIndex: 0, skillId: 'skill_disconnect', skillCooldown: 8, companionId: 'companion_rice', companionCooldown: 9, dashCooldown: 4 }, invulnerableRemaining: 0, controlImmuneRemaining: 0 },
    world: { map: { id: 'sea', biomeIndex: 0, width: 2000, height: 2000, exploredCells: [], obstacleIds: [], checkpointIds: [], exitIds: [], navigationRevision: 0 }, entities: { fish: entity('fish'), crab: entity('crab') }, pickups: {}, statuses: {}, shields: {}, objectives: [], spawnQueue: [], budgets: [], pressureEvents: [] },
    level: 1, xpRemainder: 0, totalTokens: 0, plugins: [{ id: 'plugin_5h', rank: 1, origin: 'difficulty', runtime: {} }], dshRuntime: {}, dshCycle: { remaining: 10, activeRemaining: 300, durationResets: 0, pendingOutcome: null, triggerSeq: 0, lastAdvancedTick: null },
    lora: { active: null, pendingLevels: [], modifiers: [], underfitRemaining: 0, overfitRemaining: 0, resolvedTrialIds: [] }, distill: { claude: { stage: 0, samples: 0 }, gpt: { stage: 0, samples: 0 }, grok: { stage: 0, samples: 0 } }, damageBudgets: {}, bosses: [], api: null, inventory: { gpuFragments: 0, parts: 0 }, attackHits: [], processedRewardIds: [], processedCommandIds: [], pendingEffects: { pending: [], processedIds: [], spawnedThisTick: 0 },
  };
}
export function context(game = state()) { return { state: game, catalog: catalog(), event: null, entityId: null, random: game.random.combat }; }
export function damage(overrides = {}) {
  return { id: 'hit:1', sourceId: 'crab', creditOwner: 'enemy', sourceKind: 'enemy', attackId: 'attack:1', projectileId: null, targetId: 'fish', baseDamage: 24, contact: { x: 480, y: 500 }, incomingDirection: { x: 1, y: 0 }, generation: 0, chainId: 'chain:1', critEligible: false, expiresAt: 300, ...overrides };
}
export function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
