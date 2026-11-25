import { describe, it, expect } from 'vitest';
import { createRandomStreams, drawRandom, chooseWeightedIndex } from '../../src/v2/domain/random.js';
import { normalizeVector, intersectSweptCircles, isContactWithinArc, distanceSquared } from '../../src/v2/domain/geometry.js';
import { createClockState, scheduleFrame, resumeClock } from '../../src/v2/domain/clock.js';
import { createEmptyPlan, mergeSystemPlans, validateSystemPlan } from '../../src/v2/domain/plans.js';
import { serializeCanonical, createDataDigest } from '../../src/v2/domain/serialization.js';
import { resolveStatModifier, derivePlayerStats, deriveWeaponStats } from '../../src/v2/domain/stats.js';
import { resolveDifficultySnapshot, resolveModelProfileId, resolveApiSpawnMultipliers } from '../../src/v2/domain/difficulty.js';
import { isPluginMilestone } from '../../src/v2/domain/levels.js';
import { resolveLoraOutcome } from '../../src/v2/domain/lora.js';
import { applyGlasswingModifier } from '../../src/v2/domain/status.js';
import { findContentDefinition, listContentByKind } from '../../src/v2/content/catalog.js';
import { createStateDigest } from '../../src/v2/engine/snapshot.js';
import { state, context, catalog, freeze } from './fixtures.js';

describe('V2 deterministic random streams', () => {
  it('repeats after serialization, has six independent streams and never mutates inputs', () => {
    const streams = freeze(createRandomStreams(-42));
    expect(new Set(Object.values(streams).map(stream => stream.seed)).size).toBe(6);
    let random = streams.world;
    const draws = [];
    for (let n = 0; n < 10000; n++) { const draw = drawRandom(random); expect(draw.value).toBeGreaterThanOrEqual(0); expect(draw.value).toBeLessThan(1); draws.push(draw.value); random = draw.next; }
    expect(random.cursor).toBe(10000);
    expect(streams.world.cursor).toBe(0);
    expect(drawRandom(JSON.parse(JSON.stringify(random)))).toEqual(drawRandom(random));
    expect(draws.slice(0, 100).length).toBe(new Set(draws.slice(0, 100)).size);
    expect(drawRandom(streams.world)).not.toEqual(drawRandom(streams.reward));
  });
  it.each([[], [0, 0], [1, -1], [NaN], [Infinity]].map(weights => [weights]))('rejects invalid weighted pools %j without consuming randomness', weights => {
    expect(chooseWeightedIndex(weights, { seed: 1, cursor: 0 }).ok).toBe(false);
  });
  it('handles huge weights and excludes zero-weight entries', () => {
    let random = { seed: 1, cursor: 0 };
    const counts = [0, 0, 0];
    for (let n = 0; n < 10000; n++) { const result = chooseWeightedIndex([0, Number.MAX_VALUE, Number.MAX_VALUE], random); expect(result.ok).toBe(true); counts[result.value.index]++; random = result.value.next; }
    expect(counts[0]).toBe(0); expect(counts[1]).toBeGreaterThan(4500); expect(counts[1]).toBeLessThan(5500);
  });
  it('rejects invalid seeds and cursor overflow', () => {
    expect(() => createRandomStreams(NaN)).toThrow();
    expect(() => drawRandom({ seed: 1, cursor: Number.MAX_SAFE_INTEGER })).toThrow();
  });
});

describe('V2 geometry', () => {
  it('normalizes zero, diagonal and enormous finite vectors', () => {
    expect(normalizeVector({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(normalizeVector({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 });
    expect(Math.hypot(...Object.values(normalizeVector({ x: 1e308, y: 1e308 })))).toBeCloseTo(1);
    expect(() => normalizeVector({ x: Infinity, y: 1 })).toThrow();
    expect(distanceSquared({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });
  it.each([
    [{ x: 0, y: 0 }, { x: 1000, y: 0 }, 1, { x: 500, y: 0 }, 9, 0.49],
    [{ x: 0, y: 0 }, { x: 10, y: 0 }, 1, { x: 5, y: 2 }, 1, 0.5],
    [{ x: 0, y: 0 }, { x: 10, y: 0 }, 1, { x: 5, y: 3 }, 1, null],
    [{ x: 0, y: 0 }, { x: 0, y: 0 }, 1, { x: 0, y: 0 }, 1, 0],
    [{ x: 0, y: 0 }, { x: 0, y: 0 }, 1, { x: 5, y: 0 }, 1, null],
    [{ x: 0, y: 0 }, { x: -10, y: 0 }, 1, { x: 5, y: 0 }, 1, null],
  ])('calculates sweep contact %#', (from, to, radius, target, tr, expected) => {
    const actual = intersectSweptCircles(from, to, radius, target, tr);
    if (expected === null) expect(actual).toBeNull(); else expect(actual).toBeCloseTo(expected);
  });
  it.each([0, Math.PI / 3, -Math.PI, Math.PI * 40])('preserves weak arc boundary under rotation %s', facing => {
    const point = angle => ({ x: Math.cos(angle + facing), y: Math.sin(angle + facing) });
    expect(isContactWithinArc({ x: 0, y: 0 }, facing, point(Math.PI / 4), 270)).toBe(true);
    expect(isContactWithinArc({ x: 0, y: 0 }, facing, point(Math.PI / 4 - 0.001), 270)).toBe(false);
    expect(isContactWithinArc({ x: 0, y: 0 }, facing, point(2 * Math.PI / 3), 120)).toBe(true);
    expect(isContactWithinArc({ x: 0, y: 0 }, facing, point(2 * Math.PI / 3 - 0.001), 120)).toBe(false);
  });
});

describe('V2 world/UI scheduling', () => {
  function stepsAt(fps) { let clock = createClockState(), steps = 0; for (let n = 0; n < fps * 10; n++) { const frame = scheduleFrame(clock, 1000 / fps, 'exploring'); steps += frame.worldSteps; clock = frame.nextClock; } return steps; }
  it('runs 600 world ticks in ten seconds at 30/60/120fps', () => { expect([30, 60, 120].map(stepsAt)).toEqual([600, 600, 600]); });
  it('uses only UI during LoRA and drops clock debt across domain changes', () => {
    const clock = scheduleFrame(createClockState(), 10, 'exploring').nextClock;
    const frame = scheduleFrame(clock, 10, 'loraTraining'); expect(frame.worldSteps).toBe(0); expect(frame.uiSteps).toBe(0);
    expect(scheduleFrame(frame.nextClock, 10, 'loraTraining').uiSteps).toBe(1);
  });
  it.each(['paused', 'pluginChoice', 'victory', 'defeat', 'withdrawal'])('does not run time in %s', phase => {
    const frame = scheduleFrame(createClockState(), 10000, phase); expect(frame.worldSteps + frame.uiSteps).toBe(0); expect(frame.performancePause).toBe(false);
  });
  it('preserves eight-step backlog but pauses instead of catching up after a long interruption', () => {
    const first = scheduleFrame(createClockState(), 500, 'exploring'); expect(first.worldSteps).toBe(8); expect(first.nextClock.backlogMs).toBeCloseTo(500 - 8 * 1000 / 60);
    const suspended = scheduleFrame(first.nextClock, 1000, 'exploring'); expect(suspended.performancePause).toBe(true);
    expect(scheduleFrame(suspended.nextClock, 10, 'exploring').worldSteps).toBe(0);
    expect(scheduleFrame(resumeClock(suspended.nextClock), 1000 / 60, 'exploring').worldSteps).toBe(1);
  });
});

describe('V2 content, stats and cumulative difficulty', () => {
  it('returns detached, sorted definitions and does not resolve prototype properties', () => {
    const data = catalog(); const result = findContentDefinition(data, 'mcp_bubble'); result.value.parameters.damage = 99;
    expect(data.definitions.mcp_bubble.parameters.damage).toBe(12); expect(findContentDefinition(data, 'toString').ok).toBe(false);
    const weapons = listContentByKind(data, 'weapon'); expect(weapons).toHaveLength(1); weapons[0].displayName = 'other'; expect(data.definitions.mcp_bubble.displayName).toBe('泡泡接口');
  });
  it('adds before multiplying, clamps stats and ignores expired modifiers', () => {
    const mod = (value, operation = 'add') => ({ id: 'x', sourceId: 'x', stat: 'armor', operation, value, expiresAt: null });
    expect(resolveStatModifier(10, [mod(5), mod(2, 'multiply')], 0, 60)).toBe(30);
    expect(resolveStatModifier(10, [mod(100)], 0, 60)).toBe(60);
    const game = state(); game.tick = 60; game.player.modifiers = [{ ...mod(100), expiresAt: 60 }]; expect(derivePlayerStats(game, catalog()).armor).toBe(0);
    game.lora.modifiers = [mod(100)]; expect(derivePlayerStats(game, catalog()).armor).toBe(60);
  });
  it('applies quality, output, LoRA primary penalty and temporary update exactly once', () => {
    const game = state(), weapon = game.player.loadout.weapons[0];
    game.player.baseStats.damageMultiplier = 2; weapon.originalQuality = 2; weapon.temporaryQuality = 2; weapon.updateExpiresAt = 100;
    game.lora.underfitRemaining = 8;
    expect(deriveWeaponStats(game, weapon, catalog()).damage).toBeCloseTo(12 * 1.3 * 2 * 1.2 * 0.8);
    game.tick = 100; expect(deriveWeaponStats(game, weapon, catalog()).damage).toBeCloseTo(12 * 1.3 * 2 * 0.8);
    expect(deriveWeaponStats(game, weapon, catalog()).damageMultiplierApplied).toBe(true);
  });
  it('accumulates all 16 mechanics and separates the Pro perk at 5→6', () => {
    let previous = [];
    for (let level = 1; level <= 15; level++) {
      const result = resolveDifficultySnapshot({ mode: 'short', difficulty: level }, catalog()); expect(result.ok).toBe(true);
      for (const id of previous) expect(result.value.mechanicIds).toContain(id);
      expect(result.value.mechanicIds.length).toBe(level + (level >= 11 ? 1 : 0));
      expect(result.value.difficultyPerkIds).toEqual(level <= 5 ? ['plugin_5h'] : []); previous = result.value.mechanicIds;
    }
    const api = resolveDifficultySnapshot({ mode: 'api', difficulty: 'api' }, catalog()).value;
    expect(api.mechanicIds).toEqual(previous); expect(api.modelProfileIds).toEqual({ claude: 'claude_fable', gpt: 'gpt_terra', grok: 'grok_bot' });
    expect(resolveDifficultySnapshot({ mode: 'short', difficulty: 0 }, catalog()).ok).toBe(false);
    expect(resolveDifficultySnapshot({ mode: 'tutorial', difficulty: 0 }, catalog()).value.mechanicIds).toEqual([]);
  });
  it('chooses only the API Claude display variant and preserves other streams', () => {
    const difficulty = resolveDifficultySnapshot({ mode: 'api', difficulty: 'api' }, catalog()).value, random = { seed: 1, cursor: 0 };
    const result = resolveModelProfileId(difficulty, 'claude', random).value;
    expect(['claude_fable', 'claude_mythos']).toContain(result.profileId); expect(result.next.cursor).toBe(1);
    expect(resolveModelProfileId(difficulty, 'gpt', random).value).toEqual({ profileId: 'gpt_terra', next: random });
  });
  it('locks API spawn multipliers at whole minutes and rejects numeric overflow', () => {
    expect(resolveApiSpawnMultipliers(3599).value.hp).toBe(1.84); expect(resolveApiSpawnMultipliers(3600).value.hp).toBeCloseTo(1.84 * 1.06);
    expect(resolveApiSpawnMultipliers(3600 * 100).value.budget).toBe(2.5);
    expect(resolveApiSpawnMultipliers(Number.MAX_SAFE_INTEGER).ok).toBe(false); expect(resolveApiSpawnMultipliers(-1).ok).toBe(false);
  });
  it('uses fixed finite milestones and continues at 31/34/37 in API', () => {
    expect([1, 2, 4, 7, 16, 19].filter(level => isPluginMilestone(level, 'short'))).toEqual([2, 4, 7, 16]);
    expect([28, 30, 31, 32, 34, 37].filter(level => isPluginMilestone(level, 'api'))).toEqual([28, 31, 34, 37]);
  });
});

describe('V2 canonical state integrity and plan guards', () => {
  it('normalizes key insertion order, hashes all state and isolates sources', () => {
    expect(serializeCanonical({ z: 2, a: [1, 0] })).toBe('{"a":[1,0],"z":2}');
    expect(createDataDigest({ a: 1, b: 2 })).toBe(createDataDigest({ b: 2, a: 1 }));
    const game = state(); const digest = createStateDigest(freeze(game)); expect(createStateDigest(JSON.parse(JSON.stringify(game)))).toBe(digest);
    const altered = structuredClone(game); altered.random.dsh.cursor++; expect(createStateDigest(altered)).not.toBe(digest);
  });
  it.each([NaN, Infinity, undefined, new Date(), new Array(2), { bad: undefined }, JSON.parse('{"__proto__":1}')])('rejects invalid plain data %#', value => { expect(() => serializeCanonical(value)).toThrow(); });
  it('rejects cycles but allows shared plain values', () => { const cycle = {}; cycle.self = cycle; expect(() => serializeCanonical(cycle)).toThrow(); const shared = { x: 1 }; expect(() => serializeCanonical([shared, shared])).not.toThrow(); });
  it('returns fresh queues, preserves merge order and validates unknown operations', () => {
    const a = createEmptyPlan(), b = createEmptyPlan(); a.changes.push({ target: 'entity', id: 'fish', operation: 'setHp', payload: { hp: 99 } });
    expect(b.changes).toHaveLength(0); expect(mergeSystemPlans([a, b]).changes).toEqual(a.changes); expect(validateSystemPlan(a).valid).toBe(true);
    expect(validateSystemPlan({ ...a, changes: [{ ...a.changes[0], operation: 'assignAnyPath' }] }).valid).toBe(false);
    expect(validateSystemPlan({ ...a, changes: [{ ...a.changes[0], payload: { hp: NaN } }] }).valid).toBe(false);
  });
});

describe('V2 special mechanic boundaries', () => {
  it.each([[50, 'underfit'], [51, 'perfect'], [69, 'perfect'], [70, 'overfit'], [120, 'overfit']])('judges LoRA UI tick %d as %s', (uiTick, result) => { expect(resolveLoraOutcome({ uiTick })).toBe(result); });
  it('doubles Claude Boss control exactly once and keeps seal break hits unchanged', () => {
    const game = state(); game.start.difficulty.mechanicIds.push('mech_11_glasswing'); game.bosses = [{ entityId: 'crab', faction: 'claude' }];
    const request = { id: 'root', sourceId: 'crab', targetId: 'fish', kind: 'root', baseDuration: 4, baseRequiredInputs: 6, appliedModifierIds: [] };
    const modified = applyGlasswingModifier(context(freeze(game)), freeze(request)); expect(modified.baseDuration).toBe(8); expect(modified.baseRequiredInputs).toBe(12);
    expect(applyGlasswingModifier(context(game), modified)).toEqual(modified);
    expect(applyGlasswingModifier(context(game), { ...request, kind: 'skillBan', baseDuration: 8, baseRequiredInputs: 3 }).baseRequiredInputs).toBe(3);
    expect(applyGlasswingModifier(context({ ...game, bosses: [] }), request)).toEqual(request);
  });
});


it('honors the 2.5× movement cap and 0.025-second weapon interval floor', () => {
  const game = state();
  game.player.modifiers = [{ id: 'speed', sourceId: 'test', stat: 'moveSpeed', operation: 'multiply', value: 10, expiresAt: null }, { id: 'rate', sourceId: 'test', stat: 'weaponInterval', operation: 'multiply', value: 0.001, expiresAt: null }];
  expect(derivePlayerStats(game, catalog()).moveSpeed).toBe(220 * 2.5);
  expect(deriveWeaponStats(game, game.player.loadout.weapons[0], catalog()).interval).toBe(0.025);
});
