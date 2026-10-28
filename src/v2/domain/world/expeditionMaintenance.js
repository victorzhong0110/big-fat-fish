// @ts-check
import {createEmptyPlan,createStateChange} from '../plans.js';
/** Bound long-region debris without regenerating residents or changing resource totals. Boss/objective identities and every still-referenced attack/status/shield owner remain. Finite reward and pressure ledgers are retained, including pending challenge rewards.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planExpeditionMaintenance(c){
 const s=c.state;if(!s.expedition||s.tick%600)return createEmptyPlan();const bodies=Object.values(s.world.entities),keep=new Set([...s.bosses.map(b=>b.entityId),...s.world.objectives.flatMap(o=>o.requiredEntityIds),...bodies.filter(e=>e.sourceId!==e.id).map(e=>e.sourceId),...Object.values(s.world.statuses).map(e=>e.sourceId),...Object.values(s.world.shields).map(e=>e.sourceId)]),changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]);
 for(const e of bodies)if(e.kind==='enemy'&&e.dead&&s.tick-Number(e.runtime.deathAt??0)>=720&&!keep.has(e.id))changes.push(createStateChange('world',e.id,'removeEntity',{}));
 const groups=/** @type {Map<string,import('../../contracts.d.ts').PickupState[]>} */(new Map());for(const p of Object.values(s.world.pickups).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)){if(!['riceXp','gpuFragment','part'].includes(p.kind)||p.collected)continue;const key=`${p.kind}:${Math.floor(p.position.x/160)}:${Math.floor(p.position.y/160)}`,group=groups.get(key)??[];group.push(p);groups.set(key,group);}
 for(const group of groups.values()){if(group.length<2)continue;const amount=group.reduce((n,p)=>n+p.amount,0);if(!Number.isSafeInteger(amount))throw new Error('Expedition pickup total exceeds numeric range');changes.push(createStateChange('world',group[0].id,'putPickup',{...group[0],amount}));for(const p of group.slice(1))changes.push(createStateChange('world',p.id,'removePickup',{}));}
 return {...createEmptyPlan(),changes};
}
