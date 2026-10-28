import { describe, it, expect } from 'vitest';
import { state, context, catalog, freeze } from './fixtures.js';
import { planLoraLevel, createLoraTrial, planLoraUiStep, planLoraInput, planLoraOutcome } from '../../src/v2/domain/lora.js';
import { applySystemPlan } from '../../src/v2/engine/reducer.js';
import { createEmptyPlan } from '../../src/v2/domain/plans.js';
import { deriveWeaponStats } from '../../src/v2/domain/stats.js';

function prepared(target = 'maxHp') {
  let game = state(); game.level = 2; game.start.dsh = [{ id: 'dsh_lora', options: {} }]; game.lora.pendingLevels = [2];
  const creation = createLoraTrial(context(freeze(structuredClone(game))), 2); creation.trial.target = target;
  game = applySystemPlan(game, { ...createEmptyPlan(), changes: [
    { target: 'runtime', id: 'dsh_lora', operation: 'beginLoraTrial', payload: { trial: creation.trial } },
    { target: 'random', id: 'lora', operation: 'setRandomStream', payload: creation.nextRandom },
  ] });
  return game;
}
const input = (type, id, extra = {}) => ({ id, seq: 1, clock: 'ui', targetTick: 0, type, payload: { edge: 'press', repeat: false }, ...extra });
function start(game) { return applySystemPlan(game, planLoraInput(context(game), input('StartTraining', 'start'))); }
function at(game, ticks) { for (let n = 0; n < ticks; n++) { game.uiTick++; game = applySystemPlan(game, planLoraUiStep(context(game))); } return game; }
function confirm(game) { game = applySystemPlan(game, planLoraInput(context(game), input('ReleaseTraining', 'release', { payload: { edge: 'release' } }))); const plan = planLoraInput(context(game), input('ConfirmTraining', 'confirm')); return { plan, game: applySystemPlan(game, plan) }; }

describe('V2 LoRA training domain', () => {
  it('queues only actual newly gained levels while equipped, excludes initial level and suppresses replayed events', () => {
    let game = state(); game.level = 3;
    const event = { id: 'level:2', runId: game.runId, tick: 0, seq: 0, type: 'LevelGained', sourceId: null, targetId: 'fish', payload: { level: 2 } };
    expect(planLoraLevel(context(game), event).changes).toEqual([]);
    game.start.dsh = [{ id: 'dsh_lora', options: {} }]; game = applySystemPlan(game, planLoraLevel(context(game), event));
    expect(game.lora.pendingLevels).toEqual([2]); expect(planLoraLevel(context(game), event).changes).toEqual([]);
    expect(planLoraLevel(context(game), { ...event, payload: { level: 1 } }).changes).toEqual([]);
    expect(planLoraLevel(context(game), { ...event, payload: { level: 4 } }).changes).toEqual([]);
  });
  it('returns the advanced LoRA RNG explicitly and does not consume other streams', () => {
    const game = prepared(); expect(game.random.lora.cursor).toBe(1); expect(game.random.combat.cursor).toBe(0); expect(game.lora.active.phase).toBe('ready'); expect(game.lora.active.uiTick).toBe(0);
    expect(() => createLoraTrial(context(game), 1)).toThrow();
  });
  it('first press only starts, key repeat/held events and duplicate commands cannot complete training', () => {
    let game = start(prepared()); expect(game.lora.active.phase).toBe('running'); expect(game.lora.resolvedTrialIds).toEqual([]);
    expect(planLoraInput(context(game), input('ConfirmTraining', 'repeat', { payload: { edge: 'press', repeat: true } })).changes).toEqual([]);
    expect(planLoraInput(context(game), input('ConfirmTraining', 'held', { payload: { edge: 'held' } })).changes).toEqual([]);
    expect(planLoraInput(context(game), input('ConfirmTraining', 'start')).changes).toEqual([]);
    expect(planLoraInput(context(game), input('ConfirmTraining', 'world', { clock: 'world' })).changes).toEqual([]);
  });
  it('world pause freezes the pointer and only independent UI steps advance it', () => {
    const game = start(prepared()); game.flow.phase = 'paused'; const frozen = applySystemPlan(game, planLoraUiStep(context(freeze(game)))); expect(frozen.lora.active.uiTick).toBe(0);
  });
  it('perfect maxHP gives +3 without healing, resolves once, and blocks world resumption until the level flow continues', () => {
    let game = start(prepared()); game.world.entities.fish.hp = 37; game = at(game, 60);
    const { plan, game: next } = confirm(freeze(game)); expect(next.world.entities.fish).toMatchObject({ hp: 37, maxHp: 103 }); expect(next.lora.modifiers[0].value).toBe(3); expect(next.lora.resolvedTrialIds).toHaveLength(1); expect(next.flow.phase).toBe('preparing'); expect(next.lora.pendingLevels).toEqual([]);
    expect(planLoraInput(context(next), input('ConfirmTraining', 'confirm2')).changes).toEqual([]);
    expect(planLoraOutcome(context(next), { id: 'lora:run:1:2', level: 2, target: 'maxHp', uiTick: 60, phase: 'resolved', result: 'perfect' }).changes).toEqual([]);
    expect(plan.events[0].payload.actualDelta).toBe(3);
  });
  it('underfit reduces the selected base modifier and gives only the primary weapon an 8s penalty', () => {
    const { game } = confirm(start(prepared('armor')));
    expect(game.lora.modifiers[0]).toMatchObject({ stat: 'armor', value: -1 }); expect(game.lora.underfitRemaining).toBe(8); expect(game.lora.overfitRemaining).toBe(0);
    expect(deriveWeaponStats(game, game.player.loadout.weapons[0], catalog()).damage).toBeCloseTo(9.6);
  });
  it('times out after exactly 120 UI ticks, applies overfit, preserves native cooldown values and never touches world tick', () => {
    const game = at(start(prepared('damageMultiplier')), 120); expect(game.tick).toBe(0); expect(game.uiTick).toBe(120); expect(game.lora.active).toBeNull(); expect(game.lora.overfitRemaining).toBe(8); expect(game.lora.underfitRemaining).toBe(0); expect(game.player.loadout.skillCooldown).toBe(8); expect(game.lora.modifiers[0].value).toBe(-0.01);
  });
  it.each([
    ['maxHp', 30, -20, 3, -2], ['armor', 10, -5, 1, -1], ['damageMultiplier', 0.2, -0.1, 0.02, -0.01], ['moveSpeed', 22, -11, 2.2, -1.1],
  ])('caps %s modifications independently and reports actual delta at the cap', (target, upper, lower, gain, loss) => {
    let game = start(prepared(target)); const modifier = { id: `lora:stat:${target}`, sourceId: 'dsh_lora', stat: target, operation: 'add', value: upper, expiresAt: null }; game.lora.modifiers = [modifier];
    game = at(game, 60); const success = confirm(game); expect(success.game.lora.modifiers[0].value).toBeCloseTo(upper); expect(success.plan.events[0].payload.actualDelta).toBe(0);
    game = start(prepared(target)); game.lora.modifiers = [{ ...modifier, value: lower }]; const failure = confirm(game); expect(failure.game.lora.modifiers[0].value).toBeCloseTo(lower); expect(failure.plan.events[0].payload.actualDelta).toBe(0);
  });
  it('clamps current life to a reduced maxHP without directly killing the fish, and different failure penalties coexist', () => {
    const game = start(prepared()); game.lora.overfitRemaining = 4; const next = confirm(game).game; expect(next.world.entities.fish.hp).toBe(98); expect(next.world.entities.fish.maxHp).toBe(98); expect(next.lora.underfitRemaining).toBe(8); expect(next.lora.overfitRemaining).toBe(4);
  });
});
