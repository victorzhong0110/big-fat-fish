import { it, expect } from 'vitest';
import { state, context, freeze } from './fixtures.js';
import { planStatusAdvance } from '../../src/v2/domain/status.js';
import { applySystemPlan } from '../../src/v2/engine/reducer.js';
import { planShieldGrant } from '../../src/v2/domain/shields.js';
function step(game) { game = structuredClone(game); game.tick++; return applySystemPlan(game, planStatusAdvance(context(freeze(game)))); }
it('advances world timers once per logical tick and freezes all countdowns during pause/LoRA', () => {
  let game = state(); game.player.invulnerableRemaining = 0.6; game.lora.underfitRemaining = 8;
  game = step(game); expect(game.player.invulnerableRemaining).toBeCloseTo(0.6 - 1 / 60);
  expect(planStatusAdvance(context(game)).changes).toEqual([]);
  for (const phase of ['paused', 'loraTraining', 'pluginChoice', 'preparing']) { const modal = { ...game, tick: game.tick + 1, flow: { ...game.flow, phase } }; expect(planStatusAdvance(context(modal)).changes).toEqual([]); }
  for (let tick = 1; tick < 36; tick++) game = step(game); expect(game.player.invulnerableRemaining).toBe(0);
});
it('underfit lasts exactly 480 effective ticks; overfit recovers skill/dash at 0.6× while companion and weapons retain normal recovery', () => {
  let game = state(); game.lora.underfitRemaining = 8; game.lora.overfitRemaining = 8; game.player.loadout.weapons[0].cooldown = 20;
  for (let tick = 0; tick < 480; tick++) game = step(game);
  expect(game.lora.underfitRemaining).toBe(0); expect(game.lora.overfitRemaining).toBe(0);
  expect(game.player.loadout.skillCooldown).toBeCloseTo(3.2); expect(game.player.loadout.dashCooldown).toBe(0); expect(game.player.loadout.companionCooldown).toBeCloseTo(1); expect(game.player.loadout.weapons[0].cooldown).toBeCloseTo(12);
});
it('expires root status and grants two seconds of immunity without resetting equipped cooldowns', () => {
  let game = state(); game.world.statuses.root = { id: 'root', kind: 'root', sourceId: 'crab', remaining: 1 / 60, requiredInputs: 6, completedInputs: 0, modifiersApplied: [] }; game.world.entities.fish.statusIds = ['root'];
  game = step(game); expect(game.world.statuses.root).toBeUndefined(); expect(game.world.entities.fish.statusIds).toEqual([]); expect(game.player.controlImmuneRemaining).toBe(2); expect(game.player.loadout.skillCooldown).toBeCloseTo(8 - 1 / 60);
});
it('freezes banned companion cooldown until the seal expires without giving a free ready ability', () => {
  let game = state(); game.world.statuses.ban = { id: 'ban', kind: 'companionBan', sourceId: 'crab', remaining: 1 / 60, requiredInputs: 3, completedInputs: 0, modifiersApplied: [] }; game.world.entities.fish.statusIds = ['ban'];
  game = step(game); expect(game.player.loadout.companionCooldown).toBe(9); game = step(game); expect(game.player.loadout.companionCooldown).toBeCloseTo(9 - 1 / 60);
});
it('finishes Sonnet/Opus shell stun after exactly 48 ticks, then enrages once', () => {
  let game = state(); game.world.entities.crab.shell = { maxHp: 80, hp: 0, broken: true, weakArcDegrees: 360, stunRemaining: 0.8, enraged: false };
  for (let tick = 0; tick < 47; tick++) game = step(game); expect(game.world.entities.crab.shell.enraged).toBe(false); game = step(game); expect(game.world.entities.crab.shell).toMatchObject({ stunRemaining: 0, enraged: true });
});
it('removes expired shields and dead-source quota entries so API cleanup does not wait for the enemy to attack again', () => {
  let game = state(); game = applySystemPlan(game, planShieldGrant(context(game), 'fish', 'cache', 20, 1)); game.damageBudgets.deadEnemy = [{ tick: 0, spent: 18 }]; game.tick = 599;
  game = step(game); expect(game.damageBudgets.deadEnemy).toBeUndefined(); expect(game.world.shields).toEqual({}); expect(game.world.entities.fish.shieldIds).toEqual([]);
});
