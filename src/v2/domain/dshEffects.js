// @ts-check
import {createEmptyPlan,createStateChange,mergeSystemPlans} from './plans.js';
import {createEntityState} from './entities.js';
import {derivePlayerStats} from './stats.js';
import {planShieldGrant} from './shields.js';

/** Native casts, credited deaths and real healing feed independent DSH counters. Never emits a native attack event.
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/plans.js#mergeSystemPlans
 * @calls domain/shields.js#planShieldGrant
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @param {string|null} onlyId
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planDshEffects(context,event,onlyId=null){
 const state=context.state,player=state.world.entities[state.player.entityId],payload=/** @type {Record<string,import('../contracts.d.ts').Json>} */(event.payload),plans=/** @type {import('../contracts.d.ts').SystemPlan[]} */([]),changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]);
 for(const slot of state.start.dsh){if(onlyId&&slot.id!==onlyId)continue;const rt=/** @type {Record<string,import('../contracts.d.ts').Json>} */({.../** @type {Record<string,import('../contracts.d.ts').Json>} */(state.dshRuntime[slot.id]??{})});let changed=false,rocket=0;
  if(slot.id==='dsh_grok_license'&&event.type==='SkillCast'&&event.sourceId===player.id){const biomes=/** @type {readonly number[]} */(rt.usedBiomes??[]);if(!biomes.includes(state.world.map.biomeIndex)){rt.usedBiomes=[...biomes,state.world.map.biomeIndex];changed=true;rocket=30;}}
  if(slot.id==='dsh_grok_salvage'){
   if(event.type==='EntityDied'&&payload.creditOwner==='player'&&payload.rewardPolicy!=='none'&&event.targetId){const enemy=state.world.entities[event.targetId],key=`salvage:${event.id}`;if(enemy?.kind==='enemy'&&enemy.dead&&!state.processedRewardIds.includes(key)){rt.kills=Math.min(12,Number(rt.kills??0)+1);changed=true;changes.push(createStateChange('runtime',key,'recordReward',{}));}}
   if(event.type==='WeaponFired'&&event.sourceId===player.id&&Number(rt.kills??0)>=12&&Number(rt.readyAt??0)<=state.tick){rocket=20;rt.kills=0;rt.readyAt=state.tick+480;changed=true;}
  }
  if(slot.id==='dsh_rice'&&event.type==='LifeRestored'&&event.targetId===player.id&&Number(payload.overflow)>0)plans.push(planShieldGrant(context,player.id,slot.id,Math.min(10,Number(payload.overflow)*.5),5));
  if(slot.id==='dsh_sleep'&&event.type==='WorldTick'){
   const previous=/** @type {{x:number;y:number}|undefined} */(rt.position),still=previous&&previous.x===player.position.x&&previous.y===player.position.y&&!state.input.firing&&Number(player.runtime.lastSkillCastAt??-1)!==state.tick&&Number(player.runtime.lastShotAt??-1)!==state.tick&&Number(player.runtime.dashUntil??0)<=state.tick;
   rt.idle=still?Math.min(120,Number(rt.idle??0)+1):0;rt.position={...player.position};changed=true;
   if(Number(rt.idle)>=120&&Number(rt.readyAt??0)<=state.tick){plans.push(planShieldGrant(context,player.id,slot.id,8,4));rt.readyAt=state.tick+1200;rt.idle=0;}
  }
  if(rocket){const id=`${slot.id}:${event.id}`,angle=Math.atan2(state.input.aim.y,state.input.aim.x),output=derivePlayerStats(state,context.catalog).damageMultiplier;changes.push(createStateChange('world',id,'putEntity',createEntityState(id,'projectile_bubble','projectile','player',player.position,{sourceId:player.id,attackId:id,radius:9,velocity:{x:Math.cos(angle)*350,y:Math.sin(angle)*350},expiresAt:state.tick+120,runtime:{sourceKind:'dsh',chainId:event.id,damage:rocket*output,weaponTemplate:'mcp_batch',blastDamage:(rocket===30?20:15)*output,blastRadius:rocket===30?100:90,maxHits:1,hitTargetIds:[],critEligible:false,rocket:true,reflectable:false}})));}
  if(changed)changes.push(createStateChange('runtime',slot.id,'setDshRuntime',{runtime:rt}));
 }
 return mergeSystemPlans([{...createEmptyPlan(),changes},...plans]);
}
