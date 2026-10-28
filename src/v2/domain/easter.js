import {localWorldId} from './world/regionRules.js';
// @ts-check
import {createEmptyPlan,createStateChange} from './plans.js';
import {createEntityState} from './entities.js';
import {toJson} from './serialization.js';

/** Place discoverable, reward-free easter objectives in the continuous map.
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function createEasterObjectives(){
 const items=[['easter:chair','easter_chair',2700,350,'chair'],['easter:note:0','easter_note',500,1800,'note'],['easter:note:1','easter_note',1800,350,'note'],['easter:note:2','easter_note',2600,1000,'note'],['easter:rice','easter_lunchbox',2750,2100,'lunchbox'],['easter:open','easter_console',2800,1400,'console']];
 const changes=items.map(([id,definitionId,x,y,interaction])=>createStateChange('world',String(id),'putEntity',createEntityState(String(id),String(definitionId),'objective','neutral',{x:Number(x),y:Number(y)},{radius:22,runtime:{interaction:String(interaction),secret:true}})));
 for(let n=0;n<3;n++){const id=`interface:${n}`;changes.push(createStateChange('world',id,'putEntity',createEntityState(id,'easter_interface','enemy','enemy',{x:2670+n*80,y:1280},{radius:22,runtime:{trainingInterface:true,noAi:true,noRewardTarget:true}})));}
 return {...createEmptyPlan(),changes};
}
/** Record actual primary launch definitions. A repeated shot may correct an interface without farming damage.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planEasterEvent(context,event){
 if(event.type!=='TrainingInterfaceHit'||!event.targetId)return createEmptyPlan();const target=context.state.world.entities[event.targetId],id=String(/** @type {{weaponId:string}} */(event.payload).weaponId);if(!target?.runtime.trainingInterface||context.catalog.definitions[id]?.kind!=='weapon')return createEmptyPlan();
 return {...createEmptyPlan(),changes:[createStateChange('entity',target.id,'setEntityRuntime',{runtime:{...target.runtime,trainedWeaponId:id}})]};
}
/** Read-only evidence is emitted once; profile service verifies it again before unlocking a DSH.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {string} entityId
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planEasterInteraction(context,entityId){
 const state=context.state,entity=state.world.entities[entityId],player=state.world.entities[state.player.entityId];if(!entity||entity.runtime.opened===true)return createEmptyPlan();const kind=entity.runtime.interaction;
 if(kind==='chair')return {...createEmptyPlan(),changes:[createStateChange('entity',entity.id,'setEntityRuntime',{runtime:{...entity.runtime,seated:true,satTicks:0}})]};
 if(kind==='note')return {...createEmptyPlan(),changes:[createStateChange('entity',entity.id,'setEntityRuntime',{runtime:{...entity.runtime,opened:true}})],events:[{id:`note:${entity.id}`,runId:state.runId,tick:state.tick,seq:0,type:'NoteRead',sourceId:player.id,targetId:entity.id,payload:{text:['我去吃饭，测完告诉我就行','用户彻底怒了','哪来的电脑病毒'][Number(entity.id.split(':').at(-1))]}}]};
 let evidence=/** @type {Record<string,import('../contracts.d.ts').Json>|null} */(null);
 if(kind==='lunchbox'){const noteIds=Object.values(state.world.entities).filter(e=>e.runtime.interaction==='note'&&e.runtime.opened===true).map(e=>e.id);if(noteIds.length>=3)evidence={easterId:'easter_rice',noteIds,openedBox:true};}
 if(kind==='console'){const interfaces=Object.values(state.world.entities).filter(e=>e.runtime.trainingInterface===true&&typeof e.runtime.trainedWeaponId==='string');const weaponIds=[...new Set(interfaces.map(e=>String(e.runtime.trainedWeaponId)))];if(interfaces.length>=3&&weaponIds.length>=3)evidence={easterId:'easter_open',weaponIds,interfaces:interfaces.map(e=>e.id)};}
 if(!evidence)return createEmptyPlan();const event={id:`easter:${state.runId}:${entity.id}`,runId:state.runId,tick:state.tick,seq:0,type:'EasterCompleted',sourceId:player.id,targetId:entity.id,payload:evidence};
 return {...createEmptyPlan(),changes:[createStateChange('entity',entity.id,'setEntityRuntime',{runtime:{...entity.runtime,opened:true}})],events:[event],persistence:[{id:event.id,kind:'unlock',payload:toJson(event)}]};
}
/** Only effective seated world ticks count; moving, firing or casting cancels the continuous attempt.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @calls domain/world/regionRules.js#localWorldId
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planEasterAdvance(context){
 const state=context.state,player=state.world.entities[state.player.entityId],chair=state.world.entities[localWorldId(state,'easter:chair')];if(!['exploring','boss'].includes(state.flow.phase)||!chair||chair.runtime.seated!==true||chair.runtime.opened===true)return createEmptyPlan();
 const active=Math.hypot(player.position.x-chair.position.x,player.position.y-chair.position.y)<=96&&!state.input.move.x&&!state.input.move.y&&!state.input.firing&&Number(player.runtime.lastSkillCastAt??-1)!==state.tick&&Number(player.runtime.dashUntil??0)<=state.tick,satTicks=active?Number(chair.runtime.satTicks??0)+1:0;
 const plan={...createEmptyPlan(),changes:[createStateChange('entity',chair.id,'setEntityRuntime',{runtime:{...chair.runtime,seated:active,satTicks,opened:satTicks>=480}})]};
 if(satTicks>=480){const event={id:`easter:${state.runId}:${chair.id}`,runId:state.runId,tick:state.tick,seq:0,type:'EasterCompleted',sourceId:player.id,targetId:chair.id,payload:{easterId:'easter_sleep',satTicks}};return {...plan,events:[event],persistence:[{id:event.id,kind:'unlock',payload:toJson(event)}]};}
 return plan;
}
