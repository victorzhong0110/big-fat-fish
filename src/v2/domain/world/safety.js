// @ts-check
import {distanceSquared} from '../geometry.js';
/** Shared live safety query for checkpoints and API withdrawal; no dependency on interaction dispatch or pressure schedulers.
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').Vec2} position
 * @returns {boolean}
 */
export function isWorldSafe(context,position){
  const state = context.state;
  if (state.api&&state.api.bossWarningAt!==null) return false;
  if (state.flow.phase !== 'exploring' || state.world.pressureEvents.some(event => event.phase === 'active' || event.phase === 'telegraph')) return false;
  const activeBoss = state.bosses.some(boss => { const entity = state.world.entities[boss.entityId]; return entity && !entity.dead && entity.hp > 0; });
  if (activeBoss) return false;
  if (Object.values(state.world.entities).some(entity => !entity.dead && !entity.dying && entity.runtime.trainingInterface!==true && entity.team === 'enemy' && (entity.expiresAt === null || entity.expiresAt >= state.tick) && (entity.kind === 'projectile' || distanceSquared(entity.position, position) <= 600 ** 2))) return false;
  return !state.world.spawnQueue.some(spawn => spawn.at <= state.tick + 300 && distanceSquared(spawn.position, position) <= 800 ** 2);
}
