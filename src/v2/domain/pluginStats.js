// @ts-check
/** Active rank, never an archived or difficulty-independent duplicate.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state @param {string} id @returns {number}
 */
export function pluginRank(state,id){return state.plugins.find(p=>p.id===id)?.rank??0;}
/** Raw W and shape, including current quality but no tree/plugin/general/critical modifiers.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state @param {import('../contracts.d.ts').WeaponState} weapon @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog @returns {import('../contracts.d.ts').WeaponStats}
 */
export function deriveRawWeaponStats(state,weapon,catalog){
 const p=catalog.definitions[weapon.definitionId].parameters,q=weapon.updateExpiresAt!==null&&weapon.updateExpiresAt>state.tick&&weapon.temporaryQuality!==null?weapon.temporaryQuality:weapon.originalQuality;
 return{damage:Number(p.damage)*[1,1.15,1.3][q],interval:Number(p.interval),projectileSpeed:Number(p.projectileSpeed),projectileRadius:Number(p.projectileRadius),pellets:Number(p.pellets),spreadRadians:Number(p.spreadRadians),range:Number(p.range),maxHits:Number(p.maxHits),damageMultiplierApplied:true};
}
/** Continuous firing bonus is weapon-only; cache is resolved against the actual hit target later.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state @returns {number}
 */
export function resolveContextWeaponFactor(state){const p=state.plugins.find(p=>p.id==='plugin_context');return p?1+Math.min(p.rank===1?.18:.30,Math.floor(Number(p.runtime.firingTicks??0)/60)*.03):1;}
/** A cached target bonus never buffs seals, secondary damage, or a different target.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state @param {import('../contracts.d.ts').DamageRequest} request @returns {number}
 */
export function resolveCacheHitFactor(state,request){const p=state.plugins.find(p=>p.id==='plugin_cache');return p&&request.sourceKind==='weapon_primary'&&p.runtime.targetId===request.targetId&&Number(p.runtime.hits??0)>=3&&Number(p.runtime.until??0)>state.tick?(p.rank===1?1.2:1.35):1;}
/** Prefill is based only on effective world-time readiness, not time spent in a menu.
 * @calls domain/pluginStats.js#pluginRank
 * @param {import('../contracts.d.ts').StateSnapshot} state @returns {{power:number;duration:number;push:number}}
 */
export function resolveSkillPreparation(state){const rank=pluginRank(state,'plugin_prefill'),since=state.world.entities[state.player.entityId].runtime.skillReadySince,ready=rank&&typeof since==='number'&&state.tick-since>=120;return{power:ready?(rank===1?1.4:1.65):1,duration:ready?(rank===1?1.25:1.4):1,push:ready?(rank===1?1.25:1.4):1};}
