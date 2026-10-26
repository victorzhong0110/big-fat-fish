// @ts-check
import{createEmptyPlan,createStateChange,mergeSystemPlans}from'./plans.js';
import{createEntityState}from'./entities.js';
import{planShieldGrant}from'./shields.js';
import{planAbilityDamage}from'./abilities.js';
import{toJson}from'./serialization.js';
/** Store typed declarative delayed actions, never a stale mutable-state replacement plan.
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context @param {string} id @param {number} delay @param {readonly import('../contracts.d.ts').ScheduledAction[]} actions @param {import('../contracts.d.ts').Vec2} point @param {number} radius @returns {import('../contracts.d.ts').SystemPlan}
 */
export function scheduleAbilityActions(context,id,delay,actions,point,radius=12){const entity=createEntityState(id,'scheduled_action','objective','neutral',point,{radius,expiresAt:context.state.tick+delay,runtime:{abilityKind:'queued',scheduled:true,executeAt:context.state.tick+delay,createdAt:context.state.tick,actions:toJson(actions)}});return{...createEmptyPlan(),changes:[createStateChange('world',id,'putEntity',entity)]};}
/** Execute due actions once using current HP/target validity and frozen output snapshots.
 * @calls domain/abilities.js#planAbilityDamage
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/plans.js#mergeSystemPlans
 * @calls domain/shields.js#planShieldGrant
 * @param {import('../contracts.d.ts').EvaluationContext} context @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planScheduledActions(context){
 const state=context.state,plans=[];
 for(const field of Object.values(state.world.entities).filter(e=>e.runtime.scheduled===true&&Number(e.runtime.executeAt)<=state.tick).sort((a,b)=>a.id<b.id?-1:1)){
  plans.push({...createEmptyPlan(),changes:[createStateChange('world',field.id,'removeEntity',{})]});const actions=/** @type {readonly import('../contracts.d.ts').ScheduledAction[]} */(field.runtime.actions);
  for(const[index,action]of actions.entries()){
   const id=`${field.id}:action:${index}`,playerId=state.player.entityId;
   if(action.kind==='heal')plans.push({...createEmptyPlan(),effects:[{id,sourceId:playerId,chainId:field.id,generation:0,kind:'heal',payload:{targetId:playerId,amount:action.amount}}]});
   else if(action.kind==='shield')plans.push(planShieldGrant(context,playerId,action.sourceId,action.amount,action.duration));
   else if(action.kind==='area'){const p=planAbilityDamage(context,id,action.point,action.radius,action.amount,'plugin_secondary');plans.push({...p,changes:[createStateChange('world',id,'putEntity',createEntityState(id,'world_blast','objective','neutral',action.point,{radius:action.radius,expiresAt:state.tick+12,runtime:{visualOnly:true}}))]});}
   else if(action.kind==='zone'){plans.push({...createEmptyPlan(),changes:[createStateChange('world',id,'putEntity',createEntityState(id,'ability_field','objective','neutral',action.point,{radius:action.radius,expiresAt:state.tick+action.duration,runtime:{abilityKind:'sandbox',executeAt:state.tick+action.duration}}))]});}
   else if(action.kind==='extend'){const target=state.world.entities[action.entityId];if(target&&target.expiresAt!==null)plans.push({...createEmptyPlan(),changes:[createStateChange('entity',target.id,'setEntityExpiry',{expiresAt:target.expiresAt+action.duration}),createStateChange('entity',target.id,'setEntityRuntime',{runtime:{...target.runtime,executeAt:Number(target.runtime.executeAt)+action.duration}})]});}
   else if(action.kind==='shots')for(const[n,source]of action.entities.entries()){
    const entity=structuredClone(source),shotId=`${id}:shot:${n}`;entity.id=shotId;entity.attackId=shotId;entity.expiresAt=state.tick+Math.max(1,(source.expiresAt??Number(field.runtime.createdAt)+120)-Number(field.runtime.createdAt));entity.runtime={...entity.runtime,damage:Number(entity.runtime.damage)*action.multiplier,...(entity.runtime.blastDamage!==undefined?{blastDamage:Number(entity.runtime.blastDamage)*action.multiplier}:{}),sourceKind:'plugin_secondary',critEligible:false,chainId:field.id};plans.push({...createEmptyPlan(),changes:[createStateChange('world',shotId,'putEntity',entity)]});
   }
  }
 }
 return mergeSystemPlans(plans);
}
