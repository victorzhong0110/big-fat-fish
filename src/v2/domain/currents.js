// @ts-check
import {distanceSquared} from './geometry.js';
import {derivePlayerStats} from './stats.js';
/** Current drift uses effective ticks and the normal body solver; native dash/root/shell stun keep their movement rules.
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').StateSnapshot} s
 * @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} e
 * @param {import('../contracts.d.ts').Vec2} velocity
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Vec2}
 */
export function resolveTideVelocity(s,e,velocity,catalog){
 if(!s.start.difficulty.mechanicIds.includes('mech_07_tide')||!['player','enemy'].includes(e.kind)||e.runtime.noAi===true||e.shell&&e.shell.stunRemaining>0||e.id===s.player.entityId&&(Number(e.runtime.dashUntil??0)>s.tick||e.statusIds.some(id=>s.world.statuses[id]?.kind==='root')))return velocity;
 const zone=Object.values(s.world.entities).find(z=>z.runtime.currentZone===true&&distanceSquared(e.position,z.position)<=z.radius**2);if(!zone)return velocity;
 const reversed=s.world.pressureEvents.some(p=>p.phase==='active'&&p.runtime.kind==='tideReverse'&&p.runtime.currentId===zone.id),direction=(Math.floor(s.tick/1800)%2?-1:1)*(reversed?-1:1),v={x:velocity.x+60*direction,y:velocity.y},speed=Math.hypot(v.x,v.y),cap=(e.kind==='player'?derivePlayerStats(s,catalog).moveSpeed:Number(e.runtime.moveSpeed??80))*1.8;
 return speed>cap?{x:v.x*cap/speed,y:v.y*cap/speed}:v;
}
