// @ts-check
import {createAdventureMapPlan} from './adventure.js';
import {createEntityState} from '../entities.js';
import {createStateChange} from '../plans.js';
import {expeditionPoint,expeditionRegionScale} from './regionRules.js';
/** Build one region once. Static entities/budgets/rewards get a regional namespace; instance IDs include the region. Guard camps, equipment and secrets are retained and later archived without regeneration.
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/adventure.js#createAdventureMapPlan
 * @calls domain/world/regionRules.js#expeditionPoint
 * @calls domain/world/regionRules.js#expeditionRegionScale
 * @param {import('../../contracts.d.ts').StartSnapshot} start
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @param {number} index
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function createExpeditionRegionPlan(start,catalog,index){
 const prefix=`b${index}:`,scale=expeditionRegionScale(index),base=createAdventureMapPlan({...start,runId:`${start.runId}:b${index}`,difficulty:{...start.difficulty,hpMultiplier:start.difficulty.hpMultiplier*scale.hp,damageMultiplier:start.difficulty.damageMultiplier*scale.damage}},catalog),ids=new Map();
 for(const ch of base.changes){if(['putEntity','putPickup','setMap'].includes(ch.operation))ids.set(ch.id,prefix+ch.id);if(ch.operation==='setObjectives')for(const o of /** @type {{objectives:readonly import('../../contracts.d.ts').ObjectiveState[]}} */(/** @type {unknown} */(ch.payload)).objectives){ids.set(o.id,prefix+o.id);ids.set(o.rewardId,prefix+o.rewardId);}if(ch.operation==='setSpawnDirector')for(const b of /** @type {{budgets:readonly import('../../contracts.d.ts').EncounterBudget[]}} */(/** @type {unknown} */(ch.payload)).budgets)ids.set(b.id,prefix+b.id);}
 for(let n=0;n<3;n++)ids.set(`signalBudget:beacon:${n}`,`signalBudget:${prefix}beacon:${n}`);for(const faction of ['claude','gpt','grok'])ids.set(`eliteBudget:elite:${faction}`,`eliteBudget:${prefix}elite:${faction}`);ids.set('alarm:alarm:0',`alarm:${prefix}alarm:0`);
 const rewrite=(/** @type {import('../../contracts.d.ts').Json} */value)=>JSON.parse(JSON.stringify(value,(_k,v)=>typeof v==='string'?(ids.get(v)??v):v)),changes=base.changes.map(ch=>({...ch,id:ids.get(ch.id)??ch.id,payload:rewrite(ch.payload)}));
 for(const ch of changes){if(ch.operation==='putEntity'){const e=/** @type {import('../../contracts.d.ts').EntityState} */(/** @type {unknown} */(ch.payload));e.position=expeditionPoint(index,e.position);e.previousPosition={...e.position};if(e.kind==='enemy')e.runtime={...e.runtime,moveSpeed:Number(e.runtime.moveSpeed??0)*scale.speed};if(e.id===`${prefix}checkpoint:home`)e.position=e.previousPosition={x:230,y:270};if(e.runtime.campIndex!==undefined)e.runtime={...e.runtime,campPrefix:prefix};}if(ch.operation==='putPickup'){const p=/** @type {import('../../contracts.d.ts').PickupState} */(/** @type {unknown} */(ch.payload));p.position=expeditionPoint(index,p.position);}if(ch.operation==='setMap'){const m=/** @type {import('../../contracts.d.ts').MapState} */(/** @type {unknown} */(ch.payload));m.width=3500;m.height=2600;m.biomeIndex=index;m.clockOffset=0;if(index>0)m.exitIds=[...m.exitIds,`${prefix}portal:back`];}}
 const kinds=[['beacon','blockade','beacon'],['blockade','beacon','blockade'],['beacon','blockade','blockade']][index];
 for(const ch of changes)if(ch.operation==='setObjectives')for(const o of /** @type {{objectives:import('../../contracts.d.ts').ObjectiveState[]}} */(/** @type {unknown} */(ch.payload)).objectives){if(o.kind!=='beacon')continue;const n=Number(o.id.split(':').at(-1));o.kind=kinds[n];o.requiredProgress=o.kind==='beacon'?7200:4;if(o.kind==='blockade')o.requiredEntityIds=[`${o.id}:relay:0`,`${o.id}:relay:1`,`${o.id}:relay:2`,`${o.id}:core`];}
 for(let n=0;n<3;n++){if(kinds[n]!=='blockade')continue;const marker=/** @type {import('../../contracts.d.ts').EntityState} */(changes.find(c=>c.operation==='putEntity'&&c.id===`${prefix}beacon:${n}`)?.payload);marker.definitionId='world_blockade';marker.radius=45;marker.runtime={...marker.runtime,interaction:'blockade'};const nodes=[`${marker.id}:relay:0`,`${marker.id}:relay:1`,`${marker.id}:relay:2`];for(let j=0;j<4;j++){const relay=j<3,id=relay?nodes[j]:`${marker.id}:core`,offset=[{x:-220,y:-60},{x:220,y:-60},{x:0,y:220},{x:0,y:0}][j],hp=(relay?70:220)*start.difficulty.hpMultiplier*scale.hp;changes.push(createStateChange('world',id,'putEntity',createEntityState(id,relay?'world_blockade_relay':'world_blockade_core','enemy','enemy',{x:marker.position.x+offset.x,y:marker.position.y+offset.y},{hp,maxHp:hp,radius:relay?18:30,rewardPolicy:'none',distillEligible:false,runtime:{noAi:true,noRewardTarget:true,blockadeCore:!relay,lockedByIds:relay?[]:nodes,objectiveId:marker.id}})));}}
 if(index>0)changes.push(createStateChange('world',`${prefix}portal:back`,'putEntity',createEntityState(`${prefix}portal:back`,'world_gate','objective','neutral',{x:120,y:270},{radius:45,runtime:{interaction:'expeditionBack',unlocked:true,targetBiome:index-1}})));
 if(index<2){const gate=/** @type {import('../../contracts.d.ts').EntityState} */(changes.find(c=>c.id===`${prefix}boss:gate`&&c.operation==='putEntity')?.payload);changes.push(createStateChange('world',`${prefix}rest`,'putEntity',createEntityState(`${prefix}rest`,'world_rest','objective','neutral',{x:gate.position.x+140,y:gate.position.y},{radius:25,runtime:{interaction:'expeditionRest',unlocked:false,used:false}})));}
 return {...base,changes};
}
