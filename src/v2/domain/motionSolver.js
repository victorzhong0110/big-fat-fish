// @ts-check
import { canTraverseObstacle } from './collision.js';
import { intersectSweptCircles, normalizeVector } from './geometry.js';
/** Sweep and slide a circular body along blocking circular terrain, then clamp map bounds.
 * @calls domain/collision.js#canTraverseObstacle
 * @calls domain/geometry.js#intersectSweptCircles
 * @calls domain/geometry.js#normalizeVector
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} entity
 * @param {import('../contracts.d.ts').Vec2} destination
 * @returns {import('../contracts.d.ts').Vec2}
 */
export function resolveBodyDestination(context, entity, destination) {
  const map = context.state.world.map,home=/** @type {import('../contracts.d.ts').Vec2|undefined} */(entity.runtime.movementHome),leash=Number(entity.runtime.leashRadius??0);
  if(home&&leash>0){const dx=destination.x-home.x,dy=destination.y-home.y,length=Math.hypot(dx,dy);if(length>leash)destination={x:home.x+dx/length*leash,y:home.y+dy/length*leash};}
  let from = { ...entity.position }, to = { ...destination };
  const obstacles = Object.values(context.state.world.entities).filter(obstacle => obstacle.kind === 'obstacle' && !canTraverseObstacle(entity, obstacle, context.catalog)).sort((a, b) => a.id < b.id ? -1 : 1);
  for (let pass = 0; pass < 3; pass++) {
    let first = 1, blocker = null;
    for (const obstacle of obstacles) {
      const time = intersectSweptCircles(from, to, entity.radius, obstacle.position, obstacle.radius);
      if (time !== null && time < first) { first = time; blocker = obstacle; }
    }
    if (!blocker) { from = to; break; }
    const safe = Math.max(0, first - 1e-5);
    const contact = { x: from.x + (to.x - from.x) * safe, y: from.y + (to.y - from.y) * safe };
    const normal = normalizeVector({ x: contact.x - blocker.position.x, y: contact.y - blocker.position.y });
    const remaining = { x: to.x - contact.x, y: to.y - contact.y };
    const inward = Math.min(0, remaining.x * normal.x + remaining.y * normal.y);
    to = { x: contact.x + remaining.x - inward * normal.x, y: contact.y + remaining.y - inward * normal.y };
    from = contact;
  }
  if(home&&leash>0&&Math.hypot(entity.position.x-home.x,entity.position.y-home.y)<=leash+1e-6&&Math.hypot(from.x-home.x,from.y-home.y)>leash+1e-6)return {...entity.position};
  return { x: Math.max(entity.radius, Math.min(map.width - entity.radius, from.x)), y: Math.max(entity.radius, Math.min(map.height - entity.radius, from.y)) };
}
