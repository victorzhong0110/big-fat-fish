// @ts-check
import { selectAbilityTarget,resolveAbilityMoveScale } from './abilities.js';
import { createEmptyPlan, createStateChange } from './plans.js';
import { distanceSquared, normalizeVector } from './geometry.js';
import { findNavigationPath } from './navigation.js';
import { toJson } from './serialization.js';
/** Shared navigation/contact logic; only the brown crab has a telegraphed heavy claw.
 * @calls domain/abilities.js#resolveAbilityMoveScale
 * @calls domain/abilities.js#selectAbilityTarget
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/navigation.js#findNavigationPath
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {boolean} heavyClaw
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planMeleeEnemy(context, heavyClaw) {
  const state = context.state, entity = context.entityId ? state.world.entities[context.entityId] : null, player = entity?selectAbilityTarget(state,entity):state.world.entities[state.player.entityId];
  if (!entity || entity.dead || entity.dying || entity.hp <= 0 || player.hp <= 0) return createEmptyPlan();
  const distance = Math.sqrt(distanceSquared(entity.position, player.position));
  const runtime = { ...entity.runtime };
  if (distance > 650 && runtime.engaged !== true && entity.hp === entity.maxHp) return createEmptyPlan();
  runtime.engaged = true;
  let velocity = { x: 0, y: 0 }, facing = entity.facingRadians, attackDamage = 0;
  const stunned = entity.shell && entity.shell.stunRemaining > 0;
  const winding = Number(runtime.windupEnd ?? 0) > 0;
  const clawCooldown = Number(runtime.nextHeavyAt ?? 0);
  if (!stunned && heavyClaw && winding && state.tick >= Number(runtime.windupEnd)) {
    const direction = normalizeVector({ x: player.position.x - entity.position.x, y: player.position.y - entity.position.y });
    if (distance <= 70 + player.radius && direction.x * Math.cos(facing) + direction.y * Math.sin(facing) >= 0) attackDamage = 32 * Number(runtime.damageMultiplier ?? 1);
    runtime.windupEnd = 0; runtime.recoilUntil = state.tick + 48; runtime.nextHeavyAt = state.tick + 240;
  } else if (!stunned && heavyClaw && !winding && distance <= 130 && state.tick >= clawCooldown && state.tick >= Number(runtime.recoilUntil ?? 0)) {
    runtime.windupEnd = state.tick + 54;
  } else if (!stunned && !winding && state.tick >= Number(runtime.recoilUntil ?? 0)) {
    let waypoint = /** @type {import('../contracts.d.ts').Vec2 | null} */ (runtime.waypoint ?? null);
    if (runtime.pathTargetId!==player.id || !waypoint || state.tick >= Number(runtime.nextPathAt ?? 0) || distanceSquared(entity.position, waypoint) < 20 ** 2) {
      const result = findNavigationPath(context, { entityId: entity.id, origin: entity.position, destination: player.position, collisionProfileId: entity.collisionProfileId });
      waypoint = result.path[0] ?? null; runtime.waypoint = waypoint ? { ...waypoint } : null; runtime.nextPathAt = state.tick + 15; runtime.pathTargetId=player.id;
    }
    if (waypoint) {
      const direction = normalizeVector({ x: waypoint.x - entity.position.x, y: waypoint.y - entity.position.y });
      const speed = Number(runtime.moveSpeed ?? 80) * (entity.shell?.enraged ? 1.35 : 1) * resolveAbilityMoveScale(state,entity);
      velocity = { x: direction.x * speed, y: direction.y * speed };
      const desired = Math.atan2(direction.y, direction.x), difference = Math.atan2(Math.sin(desired - facing), Math.cos(desired - facing));
      facing += Math.max(-Math.PI / 90, Math.min(Math.PI / 90, difference));
    }
  }
  if (!stunned && distance <= entity.radius + player.radius + 2 && state.tick >= Number(runtime.nextContactAt ?? 0)) attackDamage = Math.max(attackDamage, Number(runtime.contactDamage ?? 0));
  const effects = /** @type {import('../contracts.d.ts').EffectRequest[]} */ ([]);
  if (attackDamage > 0 && player.kind!=='decoy') {
    runtime.nextContactAt = state.tick + 60;
    const id = `melee:${entity.id}:${state.tick}`;
    effects.push({ id, chainId: id, generation: 0, sourceId: entity.id, kind: 'damage', payload: toJson({ id, sourceId: entity.id, creditOwner: 'enemy', sourceKind: 'enemy', attackId: id, projectileId: null, targetId: player.id, baseDamage: attackDamage, contact: entity.position, incomingDirection: normalizeVector({ x: player.position.x - entity.position.x, y: player.position.y - entity.position.y }), generation: 0, chainId: id, critEligible: false, expiresAt: state.tick }) });
  }
  return { ...createEmptyPlan(), changes: [createStateChange('entity', entity.id, 'setEntityRuntime', { runtime }), createStateChange('entity', entity.id, 'setEntityKinematics', { position: entity.position, previousPosition: entity.previousPosition, velocity, facingRadians: facing })], effects };
}
