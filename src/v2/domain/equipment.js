// @ts-check
import { planTreeWeaponSwitch } from './treeRuntime.js';
import { createEmptyPlan,createStateChange } from './plans.js';
import { resolveWeaponTemplate } from '../content/weaponCapabilities.js';
import { toJson } from './serialization.js';

/** F interacts with the closest weapon; fill an empty slot or emit a reviewable replacement offer.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/equipment.js#planWeaponPickup
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan|null}
 */
export function planEquipmentInteraction(context){
 const state=context.state,player=state.world.entities[state.player.entityId];if(state.flow.phase!=='exploring')return null;
 const pickup=Object.values(state.world.pickups).filter(p=>p.kind==='weapon'&&!p.collected&&p.weapon&&Math.hypot(p.position.x-player.position.x,p.position.y-player.position.y)<=96).sort((a,b)=>Math.hypot(a.position.x-player.position.x,a.position.y-player.position.y)-Math.hypot(b.position.x-player.position.x,b.position.y-player.position.y)||(a.id<b.id?-1:1))[0];
 if(!pickup)return null;
 if(state.player.loadout.weapons.length<2)return planWeaponPickup(context,pickup.id,state.player.loadout.weapons.length);
 return {...createEmptyPlan(),events:[{id:`offer:${pickup.id}:${state.tick}`,runId:state.runId,tick:state.tick,seq:0,type:'EquipmentOffered',sourceId:player.id,targetId:pickup.id,payload:{pickupId:pickup.id}}]};
}

/** Swap actual instances atomically. The displaced weapon stays on the ground with its own quality/update/CD.
 * @implementationScope core-preview + adventure-slice
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @calls domain/treeRuntime.js#planTreeWeaponSwitch
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {string} pickupId
 * @param {number} slotIndex
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planWeaponPickup(context,pickupId,slotIndex){
 const state=context.state,player=state.world.entities[state.player.entityId],pickup=state.world.pickups[pickupId],weapons=[...state.player.loadout.weapons];
 if(state.flow.phase!=='exploring'||!pickup||pickup.collected||pickup.kind!=='weapon'||!pickup.weapon||!resolveWeaponTemplate(context.catalog,pickup.weapon.definitionId)||!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>1||slotIndex>weapons.length||Math.hypot(pickup.position.x-player.position.x,pickup.position.y-player.position.y)>96)return createEmptyPlan();
 const changes=[createStateChange('world',pickup.id,'removePickup',{})],displaced=weapons[slotIndex];
 if(displaced){const id=`drop:${displaced.instanceId}`;changes.push(createStateChange('world',id,'putPickup',{id,kind:'weapon',amount:1,position:pickup.position,instanceId:displaced.instanceId,collected:false,weapon:{...displaced}}));}
 weapons[slotIndex]=structuredClone(pickup.weapon);
 changes.push(createStateChange('player',player.id,'setLoadout',{...state.player.loadout,weapons}));
 if(displaced&&slotIndex===state.player.loadout.activeWeaponIndex)changes.push(...planTreeWeaponSwitch(context).changes);
 const discovery={id:`discovery:${state.runId}:${pickup.weapon.definitionId}`,runId:state.runId,tick:state.tick,seq:0,type:'ContentDiscovered',sourceId:player.id,targetId:pickup.id,payload:{definitionId:pickup.weapon.definitionId}};
 return {...createEmptyPlan(),changes,events:[discovery,{...discovery,id:`equip:${pickup.id}:${state.tick}`,type:'EquipmentEquipped',payload:{definitionId:pickup.weapon.definitionId,slotIndex}}],persistence:[{id:discovery.id,kind:'discovery',payload:toJson(discovery)}]};
}
