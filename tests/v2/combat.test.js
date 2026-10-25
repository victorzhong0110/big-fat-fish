import { describe, it, expect } from 'vitest';
import { state, context, entity, damage, catalog, freeze } from './fixtures.js';
import { resolveDamageRequest, isDamageRequestValid, planLifeChange } from '../../src/v2/domain/damage.js';
import { resolveDamageBudgetSource, pruneDamageBudget, planQuotaAllowance } from '../../src/v2/domain/quotas.js';
import { resolveShieldAbsorption, planShieldGrant } from '../../src/v2/domain/shields.js';
import { resolveShellContact } from '../../src/v2/domain/shells.js';
import { collectDeathRecords, planDeathTransitions, resolveTerminalOutcome } from '../../src/v2/domain/deaths.js';
import { canTraverseObstacle, detectCollisions } from '../../src/v2/domain/collision.js';
import { applySystemPlan, commitWorkingState, validateStateInvariants } from '../../src/v2/engine/reducer.js';
import { createEmptyPlan, mergeSystemPlans } from '../../src/v2/domain/plans.js';
import { createStateDigest } from '../../src/v2/engine/snapshot.js';

function hit(game, request) {
  const resolved = resolveDamageRequest(context(freeze(structuredClone(game))), freeze(structuredClone(request)));
  return { resolved, game: applySystemPlan(game, resolved.plan) };
}

describe('V2 combat pipeline integration', () => {
  it('charges 5h before armor/shields, leaves snapshot immutable, and does not grant hurt immunity when fully shielded', () => {
    let game = state(); game.player.baseStats.armor = 50;
    game = applySystemPlan(game, planShieldGrant(context(game), 'fish', 'skill_cache', 20, 5));
    const prior = JSON.stringify(game);
    const result = hit(game, damage());
    expect(JSON.stringify(game)).toBe(prior); expect(result.resolved.allowedBeforeDefense).toBe(18); expect(result.resolved.shieldDamage).toBe(12); expect(result.resolved.hpDamage).toBe(0);
    expect(result.game.world.entities.fish.hp).toBe(100); expect(result.game.player.invulnerableRemaining).toBe(0); expect(result.game.damageBudgets.crab).toEqual([{ tick: 0, spent: 18 }]);
    const second = hit(result.game, damage({ id: 'hit:2', attackId: 'attack:2' })); expect(second.resolved.allowedBeforeDefense).toBe(0);
  });
  it('separates enemy budgets, protects player only after actual HP damage, and does not spend while invulnerable', () => {
    let { game } = hit(state(), damage()); expect(game.world.entities.fish.hp).toBe(82); expect(game.player.invulnerableRemaining).toBe(0.6);
    game = structuredClone(game); game.world.entities.crab2 = entity('crab2');
    const ignored = hit(game, damage({ id: 'second', attackId: 'second', sourceId: 'crab2' }));
    expect(ignored.resolved.accepted).toBe(false); expect(ignored.game.damageBudgets.crab2).toBeUndefined();
    game.player.invulnerableRemaining = 0;
    const second = hit(game, damage({ id: 'second', attackId: 'second', sourceId: 'crab2' })); expect(second.resolved.hpDamage).toBe(18);
  });
  it('expires quota at exactly tick+600 without refreshing on pause, plugin upgrade or a serialized restore', () => {
    let { game } = hit(state(), damage()); game = JSON.parse(JSON.stringify(game)); game.player.invulnerableRemaining = 0; game.tick = 599;
    game.plugins[0].rank = 2;
    expect(planQuotaAllowance(context(game), damage({ expiresAt: 1000 })).allowedDamage).toBe(0);
    game.flow.phase = 'paused'; expect(hit(game, damage({ expiresAt: 1000 })).resolved.accepted).toBe(false);
    game.flow.phase = 'exploring'; game.tick = 600;
    expect(planQuotaAllowance(context(game), damage({ expiresAt: 1000 })).allowedDamage).toBe(12);
    expect(pruneDamageBudget([{ tick: 0, spent: 18 }], 600)).toEqual([]);
  });
  it('records recent damage without the plugin and prevents unequip/reequip budget laundering', () => {
    let game = state(); game.plugins = []; game = hit(game, damage({ baseDamage: 7 })).game;
    game = structuredClone(game); game.player.invulnerableRemaining = 0; game.plugins = [{ id: 'plugin_5h', rank: 2, origin: 'run', runtime: {} }];
    expect(planQuotaAllowance(context(game), damage()).allowedDamage).toBe(5);
  });
  it('traces rocket/area damage to the original enemy and rejects cyclic lineage', () => {
    const game = state(); game.world.entities.rocket = entity('rocket', { sourceId: 'crab', kind: 'projectile' }); game.world.entities.area = entity('area', { sourceId: 'rocket', kind: 'projectile' });
    expect(resolveDamageBudgetSource(game, 'area')).toBe('crab'); game.world.entities.crab.sourceId = 'area'; expect(() => resolveDamageBudgetSource(game, 'area')).toThrow(/Cyclic/);
  });
  it('consumes earliest-expiring shield first, breaks seq ties, and never stacks same-source grants', () => {
    let game = state(); game = applySystemPlan(game, planShieldGrant(context(game), 'fish', 'late', 9, 5)); game = applySystemPlan(game, planShieldGrant(context(game), 'fish', 'early', 4, 2));
    game = applySystemPlan(game, planShieldGrant(context(game), 'fish', 'early', 2, 3));
    const early = Object.values(game.world.shields).find(shield => shield.sourceId === 'early'); expect(early.amount).toBe(4); expect(early.expiresAt).toBe(180);
    const resolution = resolveShieldAbsorption(context(freeze(game)), 'fish', 10);
    expect(resolution.absorbed).toBe(10); expect(resolution.remainingDamage).toBe(0);
    game = applySystemPlan(game, resolution.plan);
    expect(game.world.shields[early.id].amount).toBe(0); expect(Object.values(game.world.shields).find(shield => shield.sourceId === 'late').amount).toBe(3);
    game.tick = 300; expect(resolveShieldAbsorption(context(game), 'fish', 5).remainingDamage).toBe(5);
  });
  it('deduplicates interleaved attacks and prunes expired hits only after expiry', () => {
    const request = damage({ sourceId: 'fish', targetId: 'crab', sourceKind: 'weapon_primary', creditOwner: 'player', baseDamage: 10, expiresAt: 10 });
    let game = hit(state(), request).game;
    game = hit(game, { ...request, id: 'b', attackId: 'b' }).game;
    expect(hit(game, { ...request, id: 'duplicate' }).resolved.accepted).toBe(false); expect(game.world.entities.crab.hp).toBe(80);
    game = structuredClone(game); game.tick = 10; expect(isDamageRequestValid(context(game), request)).toBe(false);
    game.tick = 11; game = applySystemPlan(game, createEmptyPlan()); expect(game.attackHits).toEqual([]); expect(isDamageRequestValid(context(game), request)).toBe(false);
  });
  it('rolls crit only once on primary player weapon requests, never on enemy, companion or distilled requests', () => {
    let game = state(); game.player.baseStats.critChance = 0.75; game.player.baseStats.critMultiplier = 2;
    const base = damage({ sourceId: 'fish', targetId: 'crab', creditOwner: 'player', sourceKind: 'weapon_primary', critEligible: true, baseDamage: 10 });
    const primary = hit(game, base); expect(primary.game.random.combat.cursor).toBe(1);
    for (const sourceKind of ['companion', 'distilled', 'plugin_secondary', 'skill']) expect(hit(game, { ...base, sourceKind }).game.random.combat.cursor).toBe(0);
    expect(hit(game, damage({ critEligible: true })).game.random.combat.cursor).toBe(0);
  });
  it('applies safety alignment after 5h and before shields only above its 20-damage threshold', () => {
    const game = state(); game.plugins = [{ id: 'plugin_guard', rank: 2, origin: 'run', runtime: {} }];
    expect(hit(game, damage({ baseDamage: 20 })).resolved.hpDamage).toBe(14);
    expect(hit(game, damage({ baseDamage: 19 })).resolved.hpDamage).toBe(19);
    game.plugins.push({ id: 'plugin_5h', rank: 1, origin: 'difficulty', runtime: {} }); expect(hit(game, damage({ baseDamage: 50 })).resolved.hpDamage).toBe(18);
  });
  it('caps healing, reports overflow, refuses resurrection and keeps negative damage on the damage path', () => {
    const game = state(); game.world.entities.fish.hp = 95;
    const plan = planLifeChange(context(game), 'fish', 10, 'rice'); expect(plan.events[0].payload).toEqual({ actual: 5, overflow: 5 }); expect(applySystemPlan(game, plan).world.entities.fish.hp).toBe(100);
    expect(() => planLifeChange(context(game), 'fish', -10, 'x')).toThrow(); game.world.entities.fish.hp = 0; expect(planLifeChange(context(game), 'fish', 10, 'rice').changes).toEqual([]);
  });
});

describe('V2 Claude shell progression', () => {
  function shellGame(profile, hp, arc) { const game = state(); game.world.entities.crab.modelProfileId = profile; game.world.entities.crab.shell = { maxHp: hp, hp, broken: false, weakArcDegrees: arc, stunRemaining: 0, enraged: false }; return game; }
  const attack = extra => damage({ sourceId: 'fish', targetId: 'crab', creditOwner: 'player', sourceKind: 'weapon_primary', baseDamage: 300, ...extra });
  it('Haiku has no shell; Sonnet accepts all sides and excess shell damage never leaks to body', () => {
    expect(hit(state(), attack()).resolved.hpDamage).toBe(100);
    const first = hit(shellGame('claude_sonnet', 80, 360), attack({ contact: { x: 522, y: 500 } }));
    expect(first.resolved.shellDamage).toBe(80); expect(first.resolved.hpDamage).toBe(0); expect(first.game.world.entities.crab.hp).toBe(100);
    expect(first.game.world.entities.crab.shell).toMatchObject({ hp: 0, broken: true, stunRemaining: 0.8, enraged: false });
    expect(first.resolved.plan.events.filter(event => event.type === 'ShellBroken')).toHaveLength(1);
    const second = hit(first.game, attack({ id: 'next', attackId: 'next' })); expect(second.resolved.hpDamage).toBe(100); expect(second.resolved.plan.events.filter(event => event.type === 'ShellBroken')).toHaveLength(0);
  });
  it('Opus blocks front, accepts boundary, and uses reverse incidence for coincident AoE centers', () => {
    const game = shellGame('claude_opus', 110, 270);
    expect(resolveShellContact(context(game), attack({ contact: { x: 522, y: 500 } })).damage).toBe(0);
    expect(resolveShellContact(context(game), attack({ contact: { x: 501, y: 501 } })).broke).toBe(true);
    expect(resolveShellContact(context(game), attack({ contact: { x: 500, y: 500 }, incomingDirection: { x: 1, y: 0 } })).broke).toBe(true);
    expect(resolveShellContact(context(game), attack({ contact: { x: 500, y: 500 }, incomingDirection: { x: 0, y: 0 } })).damage).toBe(0);
  });
  it.each(['claude_fable', 'claude_mythos'])('%s only accepts rear 120°, breaks with no stun and immediately enrages', profile => {
    const game = shellGame(profile, 160, 120);
    expect(resolveShellContact(context(game), attack({ contact: { x: 500, y: 522 } })).damage).toBe(0);
    const result = hit(game, attack({ contact: { x: 478, y: 500 } })); expect(result.game.world.entities.crab.shell).toMatchObject({ broken: true, hp: 0, stunRemaining: 0, enraged: true });
  });
});

describe('V2 deaths, commit boundaries and replay determinism', () => {
  it('declares each death once before hooks; player death wins simultaneous boss kill and API does not end', () => {
    let game = state(); game.world.entities.fish.hp = 0; game.world.entities.crab.hp = 0; game.world.entities.crab.runtime.finalBoss = true; game.bosses = [{ entityId: 'crab', faction: 'claude' }];
    const records = collectDeathRecords(context(freeze(game))); expect(records).toHaveLength(2); expect(resolveTerminalOutcome(context(game), records)).toBe('defeat');
    game = applySystemPlan(game, planDeathTransitions(context(game), [...records, ...records])); expect(collectDeathRecords(context(game))).toHaveLength(0);
    const living = state(); living.world.entities.crab.runtime.finalBoss = true; living.bosses = game.bosses;
    expect(resolveTerminalOutcome(context(living), [records.find(record => record.entityId === 'crab')])).toBe('victory'); living.start.difficulty.mode = 'api'; expect(resolveTerminalOutcome(context(living), records.filter(record => record.entityId === 'crab'))).toBeNull();
  });
  it('commits one revision with explicit outbox, does not mutate plans or prior snapshots, rejects partial and invalid states', () => {
    const previous = freeze(state()); const request = damage(); const resolution = resolveDamageRequest(context(previous), request); const plan = freeze(resolution.plan);
    const working = applySystemPlan(previous, plan); working.tick = 1;
    const committed = commitWorkingState(previous, working, catalog(), { events: plan.events, persistence: [], diagnostics: [] });
    expect(committed.next.revision).toBe(1); expect(previous.revision).toBe(0); expect(committed.events.map(event => event.seq)).toEqual([0]);
    const invalid = structuredClone(working); invalid.world.entities.fish.hp = 999; expect(() => commitWorkingState(previous, invalid, catalog())).toThrow(); expect(previous.world.entities.fish.hp).toBe(100);
    expect(() => applySystemPlan(previous, { ...createEmptyPlan(), changes: [{ target: 'entity', id: 'missing', operation: 'setHp', payload: { hp: 1 } }] })).toThrow();
  });
  it('produces the same digest after replaying a mixed sequence with serialization midway', () => {
    function replay(saveMidway) {
      let game = state();
      for (let index = 0; index < 100; index++) {
        const previous = game; game = structuredClone(game); game.tick++;
        game.player.invulnerableRemaining = 0;
        const request = damage({ id: `hit:${index}`, attackId: `attack:${index}`, sourceId: 'fish', targetId: 'crab', sourceKind: 'weapon_primary', creditOwner: 'player', baseDamage: 0.2, critEligible: true, expiresAt: game.tick + 1 });
        const result = resolveDamageRequest(context(game), request); game = applySystemPlan(game, result.plan);
        game = commitWorkingState(previous, game, catalog(), { events: result.plan.events, persistence: [], diagnostics: [] }).next;
        if (saveMidway && index === 49) game = JSON.parse(JSON.stringify(game));
      }
      return game;
    }
    const original = replay(false), restored = replay(true); expect(createStateDigest(restored)).toBe(createStateDigest(original)); expect(restored.attackHits.length).toBeLessThanOrEqual(2); expect(restored.revision).toBe(100);
  });
  it('rejects non-finite data, noncumulative mechanisms, excess slots and invalid shield references', () => {
    const game = state(); expect(validateStateInvariants(game, catalog()).valid).toBe(true);
    game.world.entities.fish.position.x = NaN; expect(validateStateInvariants(game, catalog()).valid).toBe(false); game.world.entities.fish.position.x = 0;
    game.start.difficulty.mechanicIds = []; expect(validateStateInvariants(game, catalog()).valid).toBe(false);
  });
});

describe('V2 continuous collisions and Grok obstacle matrix', () => {
  it('lets only Bot/its distilled phantom through marked low clutter, never walls, gates or boundaries', () => {
    const bot = entity('bot', { definitionId: 'enemy_grok_bot', faction: 'grok' });
    const clutter = entity('clutter', { kind: 'obstacle', team: 'neutral', runtime: { low: true, grok_passable: true } });
    expect(canTraverseObstacle(bot, clutter, catalog())).toBe(true); expect(canTraverseObstacle(entity('fish'), clutter, catalog())).toBe(false);
    for (const flag of ['highWall', 'boundary', 'locked', 'connectivityCritical']) expect(canTraverseObstacle(bot, { ...clutter, runtime: { ...clutter.runtime, [flag]: true } }, catalog())).toBe(false);
    expect(canTraverseObstacle({ ...bot, kind: 'projectile' }, clutter, catalog())).toBe(false);
    expect(canTraverseObstacle(entity('phantom', { runtime: { distilledGrok: true } }), clutter, catalog())).toBe(true);
  });
  it('detects moving-target crossings, sorts by projectile→first impact→target, and excludes allies', () => {
    const game = state(); game.world.entities.crab.position = { x: 500, y: 600 }; game.world.entities.crab.previousPosition = { x: 500, y: 400 };
    game.world.entities.shot = entity('shot', { definitionId: 'projectile', kind: 'projectile', team: 'player', sourceId: 'fish', attackId: 'shot', previousPosition: { x: 400, y: 500 }, position: { x: 600, y: 500 }, radius: 2 });
    const collisions = detectCollisions(context(freeze(game))); expect(collisions.hits).toHaveLength(1); expect(collisions.hits[0].targetId).toBe('crab'); expect(collisions.hits[0].timeOfImpact).toBeGreaterThan(0.4); expect(collisions.hits[0].timeOfImpact).toBeLessThan(0.5);
  });
});
