/** Occupation area and the three one-use relay buoys, in world units. */
export const STATION_RADIUS = 240;
export const BUOY_TOUCH_RADIUS = 38;
export const BUOY_SECONDS = 5;
export const BUOY_OFFSETS = Object.freeze([{x:0,y:-148},{x:136,y:78},{x:-136,y:78}]);

/** Count active time and a one-time boost for swimming past an unlit buoy.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').ObjectiveState} objective
 * @param {import('../../contracts.d.ts').Vec2} center
 * @param {import('../../contracts.d.ts').Vec2} player
 * @returns {import('../../contracts.d.ts').ObjectiveState}
 */
export function tuneStation(objective, center, player) {
  let mask = objective.buoyMask ?? 0, gain = 1;
  for (const [index, delta] of BUOY_OFFSETS.entries()) {
    if (mask & (1 << index)) continue;
    if (Math.hypot(player.x - center.x - delta.x, player.y - center.y - delta.y) <= BUOY_TOUCH_RADIUS) {
      mask |= 1 << index;
      gain += BUOY_SECONDS * 60;
    }
  }
  return {...objective, buoyMask:mask, progress:Math.min(objective.requiredProgress ?? 2100,objective.progress + gain)};
}
