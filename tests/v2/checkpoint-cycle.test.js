import { describe, it, expect } from 'vitest';
import { state, context, catalog, entity, freeze } from './fixtures.js';
import { createCheckpoint, canCreateCheckpoint, validateCheckpoint, restoreCheckpointState } from '../../src/v2/domain/checkpoint.js';
import { planCooldownReset, planTemporaryWeaponUpdate, planDshCycleEvent } from '../../src/v2/domain/dshCycle.js';
import { applySystemPlan } from '../../src/v2/engine/reducer.js';
import { createDataDigest } from '../../src/v2/domain/serialization.js';
import { createStateDigest } from '../../src/v2/engine/snapshot.js';
import { deriveWeaponStats } from '../../src/v2/domain/stats.js';

function safeState() {
  const game = state();
  game.world.entities.crab.position = { x: 1500, y: 1500 };
  game.world.entities.checkpoint = entity('checkpoint', { definitionId: 'wall', kind: 'objective', team: 'neutral' });
  game.world.map.checkpointIds = ['checkpoint'];
  return game;
}
function tickEvent(game) { return { id: `tick:${game.tick}`, runId: game.runId, tick: game.tick, seq: 0, type: 'WorldTick', sourceId: null, targetId: null, payload: null }; }
function checksum(checkpoint) { const { digest, ...data } = checkpoint; checkpoint.digest = createDataDigest(data); return checkpoint; }

describe('V2 exact checkpoint continuation', () => {
  it('requires proximity, safety and a fully settled world boundary', () => {
    const game = safeState(); expect(canCreateCheckpoint(context(freeze(structuredClone(game)))).valid).toBe(true);
    game.world.entities.checkpoint.position.x = 1000; expect(canCreateCheckpoint(context(game)).diagnostics.map(d => d.code)).toContain('CHECKPOINT_TOO_FAR'); game.world.entities.checkpoint.position.x = 500;
    game.world.entities.crab.position = { x: 501, y: 500 }; expect(canCreateCheckpoint(context(game)).diagnostics.map(d => d.code)).toContain('CHECKPOINT_UNSAFE'); game.world.entities.crab.position = { x: 1500, y: 1500 };
    game.flow.phase = 'paused'; expect(canCreateCheckpoint(context(game)).valid).toBe(false);
    expect(() => createCheckpoint(game)).toThrow();
  });
  it.each(['choice', 'lora', 'effects', 'rewards', 'boss', 'projectile', 'pressure', 'incoming'])('rejects saving during %s', reason => {
    const game = safeState();
    if (reason === 'choice') game.flow.choice = { id: 'choice' };
    if (reason === 'lora') game.lora.active = { id: 'trial' };
    if (reason === 'effects') game.pendingEffects.pending.push({ id: 'pending' });
    if (reason === 'rewards') game.flow.queuedLevelRewards.push({ id: 'level' });
    if (reason === 'boss') game.bosses.push({ entityId: 'crab', faction: 'claude' });
    if (reason === 'projectile') game.world.entities.rocket = entity('rocket', { kind: 'projectile', position: { x: 1800, y: 1800 } });
    if (reason === 'pressure') game.world.pressureEvents.push({ id: 'pressure', phase: 'telegraph' });
    if (reason === 'incoming') game.world.spawnQueue.push({ id: 'spawn', at: 10, position: { x: 600, y: 500 } });
    expect(canCreateCheckpoint(context(game)).valid).toBe(false);
  });
  it('preserves HP, clocks, all RNG cursors, quotas, shells, cooldowns, and DSH state; starts paused with no rewards', () => {
    const game = safeState(); game.tick = 100; game.revision = 50; game.world.entities.fish.hp = 37;
    game.damageBudgets.crab = [{ tick: 90, spent: 12 }]; game.random.dsh.cursor = 8; game.dshCycle.remaining = 7.5;
    game.world.entities.crab.shell = { maxHp: 80, hp: 13, broken: false, weakArcDegrees: 360, stunRemaining: 0, enraged: false };
    const checkpoint = createCheckpoint(freeze(game)); expect(validateCheckpoint(checkpoint, game.versions, catalog()).valid).toBe(true);
    const result = restoreCheckpointState(JSON.parse(JSON.stringify(checkpoint)), catalog()); expect(result.ok).toBe(true);
    const restored = result.value; expect(restored.flow.phase).toBe('paused'); expect(restored.flow.resumePhase).toBe('exploring');
    restored.flow.phase = 'exploring'; restored.flow.resumePhase = null;
    expect(createStateDigest(restored)).toBe(createStateDigest(game));
    restored.world.entities.fish.hp = 1; expect(checkpoint.state.world.entities.fish.hp).toBe(37); expect(game.world.entities.fish.hp).toBe(37);
  });
  it('rejects corruption and incompatible core/content versions without mutating the original', () => {
    const checkpoint = createCheckpoint(safeState()); const original = JSON.stringify(checkpoint);
    const corrupt = structuredClone(checkpoint); corrupt.state.world.entities.fish.hp = 99; expect(restoreCheckpointState(corrupt, catalog()).ok).toBe(false);
    const incompatible = structuredClone(checkpoint); incompatible.versions.core = 'future'; incompatible.state.versions.core = 'future'; checksum(incompatible); expect(restoreCheckpointState(incompatible, catalog()).ok).toBe(false);
    expect(restoreCheckpointState(checkpoint, { ...catalog(), version: 'future' }).ok).toBe(false);
    expect(JSON.stringify(checkpoint)).toBe(original);
  });
  it('rejects malformed structures, noncumulative mechanics, forged header/revision and pending menus even with recomputed checksum', () => {
    const checkpoint = createCheckpoint(safeState());
    for (const mutate of [c => { c.revision++; }, c => { c.state.start.difficulty.mechanicIds = []; }, c => { delete c.state.lora; }, c => { c.state.flow.queuedLevelRewards.push({ id: 'pending' }); }]) {
      const broken = structuredClone(checkpoint); mutate(broken); checksum(broken); expect(restoreCheckpointState(broken, catalog()).ok).toBe(false);
    }
  });
});

describe('V2 28-second update/reset cycle', () => {
  it('updates only the current weapon instance from its ORIGINAL quality, refreshes without stacking and expires at exactly 28s', () => {
    let game = state(); game.player.loadout.weapons.push({ ...game.player.loadout.weapons[0], instanceId: 'second', originalQuality: 2 });
    game = applySystemPlan(game, planTemporaryWeaponUpdate(context(game))); expect(game.player.loadout.weapons[0].temporaryQuality).toBe(1); expect(game.player.loadout.weapons[1].temporaryQuality).toBeNull();
    game.tick = 10; game = applySystemPlan(game, planTemporaryWeaponUpdate(context(game))); expect(game.player.loadout.weapons[0].temporaryQuality).toBe(1); expect(game.player.loadout.weapons[0].updateExpiresAt).toBe(1690);
    game.tick = 1690; expect(deriveWeaponStats(game, game.player.loadout.weapons[0], catalog()).damage).toBe(12);
    game.player.loadout.activeWeaponIndex = 1; game = applySystemPlan(game, planTemporaryWeaponUpdate(context(game)));
    expect(deriveWeaponStats(game, game.player.loadout.weapons[1], catalog()).damage).toBeCloseTo(12 * 1.3 * 1.2);
  });
  it('resets only native equipped skill/dash/companion cooldowns, retains seals, 5h, HP and plugin timers', () => {
    const game = state(); game.world.entities.fish.hp = 40; game.damageBudgets.crab = [{ tick: 0, spent: 18 }]; game.plugins[0].runtime.cooldown = 9;
    game.world.statuses.seal = { id: 'seal', kind: 'skillBan', sourceId: 'crab', remaining: 8, requiredInputs: 3, completedInputs: 0, modifiersApplied: [] }; game.world.entities.fish.statusIds.push('seal');
    const next = applySystemPlan(freeze(game), planCooldownReset(context(game)));
    expect(next.player.loadout).toMatchObject({ skillCooldown: 0, companionCooldown: 0, dashCooldown: 0 }); expect(next.world.statuses).toEqual(game.world.statuses); expect(next.damageBudgets).toEqual(game.damageBudgets); expect(next.world.entities.fish.hp).toBe(40); expect(next.plugins[0].runtime.cooldown).toBe(9);
  });
  it('does nothing while unequipped, paused or on unrelated/duplicate tick events', () => {
    const game = state(); expect(planDshCycleEvent(context(game), tickEvent(game)).changes).toEqual([]);
    game.start.dsh = [{ id: 'dsh_gpt_branch', options: {} }]; game.flow.phase = 'loraTraining'; expect(planDshCycleEvent(context(game), tickEvent(game)).changes).toEqual([]);
    game.flow.phase = 'exploring'; const plan = planDshCycleEvent(context(freeze(game)), tickEvent(game)); const next = applySystemPlan(game, plan);
    expect(next.dshCycle.remaining).toBeCloseTo(28 - 1 / 60); expect(planDshCycleEvent(context(next), tickEvent(next)).changes).toEqual([]);
  });
  it('fires after exactly 1680 effective ticks and reproduces the same outcome after checkpoint continuation', () => {
    function play(save) {
      let game = safeState(); game.start.dsh = [{ id: 'dsh_gpt_branch', options: {} }]; const events = [];
      for (let tick = 0; tick < 1680; tick++) {
        game.tick = tick; const plan = planDshCycleEvent(context(game), tickEvent(game)); events.push(...plan.events); game = applySystemPlan(game, plan);
        if (save && tick === 1000) { game = restoreCheckpointState(createCheckpoint(game), catalog()).value; game.flow.phase = 'exploring'; game.flow.resumePhase = null; }
      }
      return { game, events };
    }
    const first = play(false), second = play(true); expect(first.events).toHaveLength(1); expect(second.events).toEqual(first.events); expect(first.game.dshCycle.triggerSeq).toBe(1); expect(first.game.random.dsh.cursor).toBe(1); expect(createStateDigest(second.game)).toBe(createStateDigest(first.game));
  });
  it('can draw both outcomes across explicit seeds', () => {
    const outcomes = new Set();
    for (let seed = 0; seed < 100; seed++) { const game = state(); game.start.dsh = [{ id: 'dsh_gpt_branch', options: {} }]; game.dshCycle.remaining = 1 / 60; game.random.dsh = { seed, cursor: 0 }; outcomes.add(planDshCycleEvent(context(game), tickEvent(game)).events[0].payload.outcome); }
    expect(outcomes).toEqual(new Set(['update', 'reset']));
  });
});
