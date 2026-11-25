import { describe, expect, it } from 'vitest';
import { prepareAdventureStart } from '../../src/v2/application/nest.js';
import { mergePersistenceIntents } from '../../src/v2/application/repository.js';
import { loadContentCatalog } from '../../src/v2/content/catalog.js';
import { canCreateCheckpoint, createCheckpoint } from '../../src/v2/domain/checkpoint.js';
import { ENDLESS_STAGE_TICKS, resolveDifficultySnapshot } from '../../src/v2/domain/difficulty.js';
import { createEntityState } from '../../src/v2/domain/entities.js';
import { resolvePetStage } from '../../src/v2/domain/modelProfiles.js';
import { createDefaultProfile, createSettlement } from '../../src/v2/domain/settlement.js';
import { EXTRACTION_ID, EXTRACTION_TICKS } from '../../src/v2/domain/world/extraction.js';
import { createGameSession, disposeGameSession, readSessionState, restoreGameSession } from '../../src/v2/engine/session.js';
import { advanceWorldTick } from '../../src/v2/engine/tick.js';
import { resolveCharacterModel } from '../../src/v2/preview/characters.js';

const catalog = loadContentCatalog();
const request = (mode, difficulty) => ({
  mode, difficulty, seed: 19, weaponIds: ['mcp_bubble'], skillId: 'skill_disconnect', companionId: null,
});
const context = (state) => ({ state, catalog, entityId: null, event: null, random: state.random.combat });
const intent = (kind, payload) => ({ kind, id: payload.id, payload });
const advance = (state, type) => advanceWorldTick(state, type ? [{
  clock: 'world', id: `command:${state.tick}`, seq: state.lastCommandSeq + 1, targetTick: state.tick + 1, type, payload: {},
}] : [], catalog);

function start(mode, level, profile) {
  const departure = prepareAdventureStart(profile, request(mode, level), catalog, `${mode}:${level}`);
  expect(departure.ok, departure.message).toBe(true);
  const session = createGameSession(departure.value, 19, catalog);
  const state = readSessionState(session);
  disposeGameSession(session);
  return state;
}

function explore(level) {
  const profile = { ...createDefaultProfile(), highestDifficulty: level, apiUnlocked: level === 15, unlockLedger: [`endlessClear:${level}`] };
  const state = start('exploration', level, profile);
  return { state, profile: { ...profile, checkpoint: createCheckpoint(state) } };
}

function placePlayer(state, point) {
  state.world.entities.fish.position = { ...point };
  state.world.entities.fish.previousPosition = { ...point };
}

function finishWithProjectile(state, target) {
  target.hp = 1;
  state.world.entities.finisher = createEntityState('finisher', 'projectile_bubble', 'projectile', 'player', target.position, {
    sourceId: 'fish', attackId: 'finisher', radius: 7, expiresAt: state.tick + 10,
    runtime: { damage: 200, sourceKind: 'weapon_primary', maxHits: 1, hitTargetIds: [], critEligible: false, chainId: 'finisher' },
  });
}

describe('Benchmark tiers and progression', () => {
  it('selects the specified GPT/Claude tier at every numeric level and preserves legacy checkpoint behavior', () => {
    for (let level = 1; level <= 15; level++) {
      const stage = Math.floor((level - 1) / 5);
      const tier = resolveDifficultySnapshot(request('endless', level), catalog).value;
      expect(tier.modelProfileIds.gpt).toBe(['gpt_luna', 'gpt_sol', 'gpt_astra'][stage]);
      expect(tier.modelProfileIds.claude).toBe(['claude_haiku', 'claude_sonnet', 'claude_opus'][stage]);
    }
    const legacy = start('short', 1, createDefaultProfile());
    delete legacy.start.difficulty.petTiers;
    legacy.start.difficulty.modelProfileIds.gpt = 'gpt_astra';
    const restored = restoreGameSession(createCheckpoint(legacy), catalog);
    expect(restored.ok).toBe(true);
    expect(resolvePetStage({ modelProfileId: 'gpt_astra' }, readSessionState(restored.value).start.difficulty)).toBe(0);
    disposeGameSession(restored.value);
  });

  it('unlocks only the Endless Benchmark actually cleared and records an idempotent local best at settlement', () => {
    const profile = { ...createDefaultProfile(), highestDifficulty: 2 };
    expect(prepareAdventureStart(profile, request('exploration', 1), catalog, 'locked').ok).toBe(false);
    expect(prepareAdventureStart(profile, request('exploration', 2), catalog, 'locked').ok).toBe(false);
    expect(prepareAdventureStart(profile, request('endless', 4), catalog, 'locked').ok).toBe(false);

    let state = start('endless', 2, profile);
    profile.checkpoint = createCheckpoint(state);
    state.world.entities = Object.fromEntries(Object.entries(state.world.entities).filter(([, entity]) => entity.kind !== 'enemy'));
    state.spawnDirectorNextAt = ENDLESS_STAGE_TICKS * 2;
    state.tick = ENDLESS_STAGE_TICKS - 1;
    state.api.elapsedTicks = state.tick;
    state.api.lastAdvancedTick = state.tick;
    state.api.materialMinute = Math.floor(state.tick / 3600);

    let result = advance(state);
    expect(result.events.some((event) => event.type === 'ApiBossWarning')).toBe(true);
    expect(result.persistence).toEqual([]);
    state = result.next;
    state.tick += 239;
    state.api.elapsedTicks = state.tick;
    state.api.lastAdvancedTick = state.tick;
    state.api.materialMinute = Math.floor(state.tick / 3600);
    state = advance(state).next;

    const boss = state.world.entities[state.bosses[0].entityId];
    placePlayer(state, { x: boss.position.x - 120, y: boss.position.y });
    finishWithProjectile(state, boss);
    result = advance(state);
    expect(result.next.flow.phase).toBe('exploring');
    expect(result.next.api.bossKills).toBe(1);
    expect(result.next.api.nextBossAt).toBeGreaterThan(result.next.tick);
    const unlocked = mergePersistenceIntents(profile, result.persistence, catalog);
    expect(unlocked.ok, unlocked.message).toBe(true);
    expect(unlocked.value.next.unlockLedger).toContain('endlessClear:2');
    expect(unlocked.value.next.unlockLedger).not.toContain('endlessClear:1');
    expect(mergePersistenceIntents(unlocked.value.next, result.persistence, catalog).value.next).toEqual(unlocked.value.next);
    const concurrent = structuredClone(state);
    concurrent.world.entities.fish.hp = 1;
    concurrent.world.entities.attacker = createEntityState('attacker', 'enemy_grok_bot', 'enemy', 'enemy',
      concurrent.world.entities.fish.position, { faction: 'grok', runtime: { engaged: true, contactDamage: 100 } });
    const mutual = advance(concurrent);
    expect(mutual.next.flow.phase).toBe('defeat');
    expect(mutual.persistence.some((p) => p.payload.type === 'EndlessBenchmarkCleared')).toBe(false);

    result.next.flow.phase = 'defeat';
    const settlement = createSettlement(result.next, 'defeat');
    const committed = mergePersistenceIntents(unlocked.value.next, [intent('settlement', settlement)], catalog);
    expect(committed.ok, committed.message).toBe(true);
    expect(committed.value.next.bestEndless[2]).toMatchObject({ bossKills: 1 });
    expect(committed.value.next.bestApi).toBeUndefined();
    expect(prepareAdventureStart(committed.value.next, request('exploration', 2), catalog, 'open').ok).toBe(true);
    expect(prepareAdventureStart(committed.value.next, request('exploration', 1), catalog, 'locked').ok).toBe(false);
  });
});

describe('Exploration guarded caches and extraction', () => {
  it('uses live, textured elites and grants increasingly valuable cache rewards after defeating the guard', () => {
    const loot = [];
    for (const level of [1, 6, 11]) {
      let { state } = explore(level);
      const [bsod, signal] = ['cacheGuard:1', 'cacheGuard:3'].map((id) => state.world.entities[id]);
      expect([bsod, signal].map(({ definitionId }) => resolveCharacterModel(definitionId))).toEqual(['bsod', 'null-signal']);
      expect([bsod, signal].every(({ rewardPolicy }) => rewardPolicy === 'elite')).toBe(true);
      const cache = state.world.entities['cache:1'];
      placePlayer(state, { x: cache.position.x + 75, y: cache.position.y });
      state = advance(state, 'Interact').next;
      expect(state.world.entities['cache:1'].runtime.opened).toBe(false);
      expect(state.world.pickups['cache:cache:1:gpuFragment']).toBeUndefined();
      finishWithProjectile(state, state.world.entities[bsod.id]);
      state = advance(state).next;
      expect(state.world.entities[bsod.id].dead).toBe(true);
      state = advance(state, 'Interact').next;
      expect(state.world.entities['cache:1'].runtime.opened).toBe(true);
      loot.push([state.world.pickups['cache:cache:1:gpuFragment'].amount,
        state.world.pickups['cache:cache:1:weapon'].weapon.originalQuality]);
    }
    expect(loot).toEqual([[8, 0], [12, 1], [16, 2]]);
  });

  it('uses real world ticks, cancels on release, and brings only collected resources home once', () => {
    let { state, profile } = explore(1);
    state.world.entities = Object.fromEntries(Object.entries(state.world.entities).filter(([, entity]) => entity.kind !== 'enemy'));
    placePlayer(state, state.world.entities[EXTRACTION_ID].position);
    state.inventory = { gpuFragments: 7, parts: 3 };
    state = advance(state, 'StartWithdrawal').next;
    expect(state.extractionHold).not.toBeNull();
    expect(canCreateCheckpoint(context(state)).valid).toBe(false);
    state = advance(state, 'CancelWithdrawal').next;
    expect(state.extractionHold).toBeNull();
    state = advance(state, 'StartWithdrawal').next;
    const started = state.tick;

    for (let ticks = 0; ticks < EXTRACTION_TICKS - 1; ticks++) state = advance(state).next;
    expect(state.flow.phase).toBe('exploring');
    state = advance(state).next;
    expect(state.tick - started).toBe(EXTRACTION_TICKS);
    expect(state.flow.phase).toBe('withdrawal');
    const settlement = createSettlement(state, 'withdrawal');
    const committed = mergePersistenceIntents(profile, [intent('settlement', settlement)], catalog);
    expect(committed.ok, committed.message).toBe(true);
    expect(committed.value.next).toMatchObject({ gpuCards: 1, gpuFragments: 2, parts: 3, checkpoint: null });
    expect(mergePersistenceIntents(committed.value.next, [intent('settlement', settlement)], catalog).value.next).toEqual(committed.value.next);
  });

  it('gives same-tick death priority and pays zero on defeat even with the loss-insurance perk', () => {
    let { state, profile } = explore(1);
    placePlayer(state, state.world.entities[EXTRACTION_ID].position);
    state.inventory = { gpuFragments: 10, parts: 8 };
    state = advance(state, 'StartWithdrawal').next;
    state.tick += EXTRACTION_TICKS - 1;
    state.world.entities.fish.hp = 1;
    state.world.entities.attacker = createEntityState('attacker', 'enemy_grok_bot', 'enemy', 'enemy', state.world.entities.fish.position,
      { faction: 'grok', runtime: { engaged: true, contactDamage: 100 } });
    const terminal = advance(state).next;
    expect(terminal.flow.phase).toBe('defeat');
    expect(terminal.extractionHold).toBeNull();
    terminal.start.treeNodeIds = ['tree_explore_c'];
    const settlement = createSettlement(terminal, 'defeat');
    expect(settlement).toMatchObject({ gpuFragments: 0, parts: 0 });
    const committed = mergePersistenceIntents(profile, [intent('settlement', settlement)], catalog);
    expect(committed.value.next).toMatchObject({ gpuCards: 0, gpuFragments: 0, parts: 0 });
    expect(mergePersistenceIntents(profile, [intent('settlement', {...settlement, mode: 'short', parts: 8})], catalog).ok).toBe(false);
  });
});
