// @ts-check
import {distanceSquared} from '../geometry.js';
/** Budget and safety reservation shared by direct interactions and autonomous scheduling.
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').PressureEvent} event
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').PressureEvent>}
 */
export function validatePressureReservation(context,event){
 const s=context.state,player=s.world.entities[s.player.entityId],fail=(/** @type {string} */message)=>({ok:/** @type {const} */(false),code:'PRESSURE_DEFERRED',message});
 if(s.flow.phase!=='exploring'||s.bosses.some(b=>!s.world.entities[b.entityId]?.dead)||s.world.map.checkpointIds.some(id=>s.world.entities[id]&&distanceSquared(player.position,s.world.entities[id].position)<=220**2))return fail('Boss/checkpoint safety has priority');
 if(!s.start.difficulty.mechanicIds.includes(event.mechanicId)||s.world.pressureEvents.some(e=>e.id===event.id)||s.world.pressureEvents.filter(e=>['telegraph','active'].includes(e.phase)).length>=2)return fail('Missing mechanic, duplicate or both pressure slots occupied');
 const budget=s.world.budgets.find(b=>b.id===event.budgetId);const promised=s.world.pressureEvents.filter(e=>e.phase==='telegraph'&&e.budgetId===event.budgetId).reduce((n,e)=>n+Number(e.runtime.count??0),0);if(!budget||budget.total-budget.spawned-budget.reserved-promised<Number(event.runtime.count??0))return fail('Encounter budget unavailable');
 if(!event.id||!Number.isFinite(event.remaining)||event.remaining<1.5)return fail('A complete visible warning is required');
 return {ok:true,value:{...structuredClone(event),phase:'telegraph',startedAt:s.tick,runtime:{...event.runtime,activateAt:s.tick+Math.ceil(event.remaining*60)}}};
}
