// @ts-check
import { createEntityState } from './entities.js';
import { createEmptyPlan, createStateChange } from './plans.js';
import { deriveWeaponStats } from './stats.js';
import { resolveWeaponTemplate } from '../content/weaponCapabilities.js';
import { toJson } from './serialization.js';

/** Create a native/secondary projectile with its own saved behavior and damage snapshot.
 * @implementationScope core-preview + adventure-slice
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/entities.js#createEntityState
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').WeaponState} weapon
 * @param {import('../contracts.d.ts').WeaponStats} stats
 * @param {number} angle
 * @param {string} id
 * @param {string} chainId
 * @param {'weapon_primary'|'plugin_secondary'} sourceKind
 * @param {number} damage
 * @returns {import('../contracts.d.ts').EntityState}
 */
export function createWeaponProjectile(context, weapon, stats, angle, id, chainId, sourceKind, damage) {
  const player=context.state.world.entities[context.state.player.entityId],template=resolveWeaponTemplate(context.catalog,weapon.definitionId);
  if(!template)throw new Error('Unknown weapon behavior');
  const direction={x:Math.cos(angle),y:Math.sin(angle)},position={x:player.position.x+direction.x*(player.radius+stats.projectileRadius+1),y:player.position.y+direction.y*(player.radius+stats.projectileRadius+1)};
  const runtime=/** @type {Record<string,import('../contracts.d.ts').Json>} */({damage,sourceKind,chainId,maxHits:stats.maxHits,hitTargetIds:[],critEligible:sourceKind==='weapon_primary',weaponTemplate:template,quality:weapon.updateExpiresAt!==null&&weapon.updateExpiresAt>context.state.tick&&weapon.temporaryQuality!==null?weapon.temporaryQuality:weapon.originalQuality});
  const returning=template==='mcp_return';
  if(returning){runtime.returnPhase='outbound';runtime.returnOrigin={...player.position};runtime.returnDistance=340*stats.range/500;runtime.returnMaxDistance=stats.range;runtime.speed=stats.projectileSpeed;}
  if(template==='mcp_batch'){runtime.blastDamage=damage*12/20;runtime.blastRadius=100;}
  return createEntityState(id,'projectile_bubble','projectile','player',position,{radius:stats.projectileRadius,velocity:{x:direction.x*stats.projectileSpeed,y:direction.y*stats.projectileSpeed},facingRadians:angle,sourceId:player.id,attackId:id,expiresAt:context.state.tick+(returning?120:Math.ceil(stats.range/stats.projectileSpeed*60)),runtime});
}

/** One volley, one chain; each pellet has a distinct attack identity. No secondary WeaponFired events.
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/projectiles.js#createWeaponProjectile
 * @calls domain/stats.js#deriveWeaponStats
 * @param {import('../contracts.d.ts').AttackContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planNativeProjectiles(context) {
 const weapon=context.weapon;if(!weapon)throw new Error('Missing equipped weapon');
 const stats=deriveWeaponStats(context.state,weapon,context.catalog),angle=Math.atan2(context.aim.y,context.aim.x),chainId=`shot:${weapon.instanceId}:${context.state.tick}`,changes=[];
 for(let pellet=0;pellet<stats.pellets;pellet++){
  const theta=angle+(stats.pellets===1?0:(pellet/(stats.pellets-1)-.5)*stats.spreadRadians),id=`${chainId}:${pellet}`;
  changes.push(createStateChange('world',id,'putEntity',createWeaponProjectile(context,weapon,stats,theta,id,chainId,'weapon_primary',stats.damage)));
 }
 return {...createEmptyPlan(),changes,events:[{id:chainId,runId:context.state.runId,tick:context.state.tick,seq:0,type:'WeaponFired',sourceId:context.state.player.entityId,targetId:null,payload:{weaponId:weapon.definitionId,pellets:stats.pellets}}]};
}

/** Snapshot one noncritical explosion at impact/range expiry; never emit primary-hit events.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} projectile
 * @param {import('../contracts.d.ts').Vec2} position
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planProjectileBurst(context,projectile,position){
 const amount=Number(projectile.runtime.blastDamage??0),radius=Number(projectile.runtime.blastRadius??0);if(amount<=0||radius<=0)return createEmptyPlan();
 const id=`${projectile.id}:blast`,sourceKind=projectile.runtime.sourceKind==='weapon_primary'?'weapon_secondary':'plugin_secondary';
 const effects=Object.values(context.state.world.entities).filter(target=>target.team==='enemy'&&target.kind==='enemy'&&!target.dead&&!target.dying&&Math.hypot(target.position.x-position.x,target.position.y-position.y)<=radius+target.radius).sort((a,b)=>a.id<b.id?-1:1).map(target=>({id:`${id}:${target.id}`,sourceId:projectile.sourceId,chainId:String(projectile.runtime.chainId),generation:0,kind:'damage',payload:toJson({id:`${id}:${target.id}`,sourceId:projectile.sourceId,creditOwner:projectile.creditOwner,sourceKind,attackId:id,projectileId:null,targetId:target.id,baseDamage:amount,contact:target.position,incomingDirection:{x:target.position.x-position.x,y:target.position.y-position.y},generation:0,chainId:String(projectile.runtime.chainId),critEligible:false,expiresAt:context.state.tick+1})}));
 const visual=createEntityState(id,'world_blast','objective','neutral',position,{radius,expiresAt:context.state.tick+12,runtime:{visualOnly:true,blastRadius:radius}});
 return {...createEmptyPlan(),changes:[createStateChange('world',id,'putEntity',visual)],effects};
}
