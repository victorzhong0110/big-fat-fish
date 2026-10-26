// @ts-check
import {createEmptyPlan,createStateChange} from '../plans.js';
import {reservePressureEvent} from './pressure.js';
/** Review risk with F, then confirm within five seconds; one enhanced exclusive choice and one finite wave.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/pressure.js#reservePressureEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context @param {string} entityId
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planAlarmCache(context,entityId){
 const s=context.state,e=s.world.entities[entityId];if(!e||e.runtime.opened===true||s.flow.phase!=='exploring')return createEmptyPlan();
 if(Number(e.runtime.armedUntil??0)<s.tick||!e.runtime.armedUntil)return {...createEmptyPlan(),changes:[createStateChange('entity',e.id,'setEntityRuntime',{runtime:{...e.runtime,armedUntil:s.tick+300}})],events:[{id:`alarmOffer:${e.id}:${s.tick}`,runId:s.runId,tick:s.tick,seq:0,type:'AlarmOffered',sourceId:s.player.entityId,targetId:e.id,payload:{}}]};
 const id=`pressure:alarm:${e.id}`,event=/** @type {import('../../contracts.d.ts').PressureEvent} */({id,mechanicId:'mech_06_alarm_cache',phase:'queued',startedAt:null,remaining:1.5,budgetId:`alarm:${e.id}`,runtime:{kind:'alarm',count:16}}),r=reservePressureEvent(context,event);if(!r.ok)return {...createEmptyPlan(),diagnostics:[{code:r.code,message:r.message,relatedIds:[e.id]}]};
 const changes=[createStateChange('entity',e.id,'setEntityRuntime',{runtime:{...e.runtime,opened:true}}),createStateChange('world','pressure','setPressureEvents',{events:[...s.world.pressureEvents,r.value]})],ids=['mcp_bubble','mcp_fan','mcp_vector','mcp_stream','mcp_return','mcp_batch'];
 for(let n=0;n<2;n++){const definitionId=ids[(s.seed+s.world.map.biomeIndex+n*3)%6],instanceId=`${s.runId}:alarm:${e.id}:${n}`,pickupId=`${e.id}:choice:${n}`;changes.push(createStateChange('world',pickupId,'putPickup',{id:pickupId,kind:'weapon',amount:1,position:{x:e.position.x+(n?35:-35),y:e.position.y},instanceId,collected:false,exclusiveGroup:e.id,weapon:{instanceId,definitionId,originalQuality:1,cooldown:0,temporaryQuality:null,updateExpiresAt:null}}));}
 return {...createEmptyPlan(),changes};
}
