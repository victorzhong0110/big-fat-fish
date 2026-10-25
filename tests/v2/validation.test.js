import { it, expect } from 'vitest';
import { state, catalog, context, damage } from './fixtures.js';
import { createEmptyPlan, validateSystemPlan } from '../../src/v2/domain/plans.js';
import { commitWorkingState } from '../../src/v2/engine/reducer.js';
import { planQuotaAllowance } from '../../src/v2/domain/quotas.js';
it('returns a diagnostic for null effects instead of crashing the validator', () => {
  expect(validateSystemPlan({ ...createEmptyPlan(), effects: [null] }).valid).toBe(false);
});
it('rejects coerced weapon qualities, non-string IDs and hidden entity writes', () => {
  expect(validateSystemPlan({ ...createEmptyPlan(), changes: [{ target: 'entity', id: 'fish', operation: 'setEntityKinematics', payload: { position: { x: 0, y: 0 }, previousPosition: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, facingRadians: 0, hp: 1 } }] }).valid).toBe(false);
  const plan = { ...createEmptyPlan(), changes: [{ target: 'player', id: 'fish', operation: 'setWeaponUpdate', payload: { instanceId: 'bubble:1', temporaryQuality: null, expiresAt: 300 } }] };
  expect(validateSystemPlan(plan).valid).toBe(false);
  expect(validateSystemPlan({ ...createEmptyPlan(), effects: [{ id: 123, sourceId: 'fish', chainId: 'x', kind: 'x', generation: 0, payload: {} }] }).valid).toBe(false);
});
it('rejects invalid direct quota damage rather than adding a negative ledger entry', () => {
  expect(() => planQuotaAllowance(context(), damage({ baseDamage: -1 }))).toThrow();
  expect(() => planQuotaAllowance(context(), damage({ baseDamage: Infinity }))).toThrow();
});
it('rejects non-finite or duplicate outbox events without publishing a revision', () => {
  const game = state(), event = { id: 'x', runId: game.runId, tick: 0, seq: 0, type: 'test', sourceId: null, targetId: null, payload: { bad: Infinity } };
  expect(() => commitWorkingState(game, game, catalog(), { events: [event], persistence: [], diagnostics: [] })).toThrow();
  event.payload = null;
  expect(() => commitWorkingState(game, game, catalog(), { events: [event, event], persistence: [], diagnostics: [] })).toThrow(); expect(game.revision).toBe(0);
});
it('rejects simultaneous world/UI steps and world progression during a pause', () => {
  const before = state(), after = structuredClone(before); after.tick++; after.uiTick++;
  expect(() => commitWorkingState(before, after, catalog())).toThrow();
  before.flow.phase = 'paused'; after.uiTick = 0;
  expect(() => commitWorkingState(before, after, catalog())).toThrow();
});
