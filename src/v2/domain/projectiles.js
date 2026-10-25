// @ts-check
import { createEntityState } from './entities.js';
import { createEmptyPlan, createStateChange } from './plans.js';
import { deriveWeaponStats } from './stats.js';
/** Native MCP projectiles use one hit identity per pellet; a volley shares its chain.
 * @implementationScope core-preview
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/stats.js#deriveWeaponStats
 * @param {import('../contracts.d.ts').AttackContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planNativeProjectiles(context) {
  const weapon = context.weapon;
  if (!weapon) throw new Error('Missing equipped weapon');
  const stats = deriveWeaponStats(context.state, weapon, context.catalog);
  const player = context.state.world.entities[context.state.player.entityId];
  const angle = Math.atan2(context.aim.y, context.aim.x), chainId = `shot:${weapon.instanceId}:${context.state.tick}`;
  const changes = [];
  for (let pellet = 0; pellet < stats.pellets; pellet++) {
    const theta = angle + (stats.pellets === 1 ? 0 : (pellet / (stats.pellets - 1) - 0.5) * stats.spreadRadians);
    const direction = { x: Math.cos(theta), y: Math.sin(theta) }, id = `${chainId}:${pellet}`;
    const position = { x: player.position.x + direction.x * (player.radius + stats.projectileRadius + 1), y: player.position.y + direction.y * (player.radius + stats.projectileRadius + 1) };
    const projectile = createEntityState(id, 'projectile_bubble', 'projectile', 'player', position, { radius: stats.projectileRadius, velocity: { x: direction.x * stats.projectileSpeed, y: direction.y * stats.projectileSpeed }, facingRadians: theta, sourceId: player.id, attackId: id, expiresAt: context.state.tick + Math.ceil(stats.range / stats.projectileSpeed * 60), runtime: { damage: stats.damage, sourceKind: 'weapon_primary', chainId, maxHits: stats.maxHits, hitTargetIds: [], critEligible: true } });
    changes.push(createStateChange('world', id, 'putEntity', projectile));
  }
  return { ...createEmptyPlan(), changes, events: [{ id: chainId, runId: context.state.runId, tick: context.state.tick, seq: 0, type: 'WeaponFired', sourceId: player.id, targetId: null, payload: { weaponId: weapon.definitionId, pellets: stats.pellets } }] };
}
