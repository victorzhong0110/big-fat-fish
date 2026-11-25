import {STATION_RADIUS,tuneStation} from './beacon.js';
import {localWorldId} from './regionRules.js';
import {planApiWorldAdvance} from './api.js';
// @ts-check
import {planObjectiveSignal} from './lateMechanics.js';
import { createEmptyPlan, createStateChange } from '../plans.js';
import { distanceSquared } from '../geometry.js';
/**
 * 主线/信标/锁门与API首领过程事件。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../rewards.js';

/**
 * 根据实际目标实体和占领进度完成目标，不把生成完当清场。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/beacon.js#tuneStation
 * @calls domain/world/lateMechanics.js#planObjectiveSignal
 * @calls domain/world/objectives.js#planObjectiveCompletion
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planObjectiveAdvance(context) {
  const state=context.state;if(state.start.runtimeProfile!=='adventure-slice'||state.flow.phase!=='exploring')return createEmptyPlan();
  const player=state.world.entities[state.player.entityId],next=state.world.objectives.map(objective=>({...objective}));
  const blockade=next.find(o=>o.kind==='blockade'&&o.active&&!o.completed&&o.requiredEntityIds.some(id=>state.world.entities[id]?.hp<state.world.entities[id]?.maxHp));
  if(blockade){const signal=planObjectiveSignal(context,blockade.id);if(signal.changes.length)return signal;const progress=blockade.requiredEntityIds.filter(id=>state.world.entities[id]?.dead).length;if(progress>=blockade.requiredEntityIds.length)return planObjectiveCompletion({...context,state:{...state,world:{...state.world,objectives:next.map(o=>o.id===blockade.id?{...o,progress}:o)}}},blockade.id);if(progress!==blockade.progress){blockade.progress=progress;return {...createEmptyPlan(),changes:[createStateChange('world','objectives','setObjectives',{objectives:next})]};}}
  const completing=next.find(objective=>objective.kind==='beacon'&&objective.active&&!objective.completed&&state.world.entities[objective.id]&&distanceSquared(player.position,state.world.entities[objective.id].position)<=STATION_RADIUS**2);
  if(!completing)return createEmptyPlan();
  const signal=planObjectiveSignal(context,completing.id);if(signal.changes.length)return signal;
  const tuned=tuneStation(completing,state.world.entities[completing.id].position,player.position);
  const objectives=next.map(o=>o.id===tuned.id?tuned:o);
  if(tuned.progress===(tuned.requiredProgress??2100)){
    return planObjectiveCompletion({...context,state:{...state,world:{...state.world,objectives}}},tuned.id);
  }
  return {...createEmptyPlan(),changes:[createStateChange('world','objectives','setObjectives',{objectives})]};
}

/**
 * 唯一奖励/开门事件；正式最后Boss可请求胜利，API仅记阶段。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/rewards.js#planWorldReward
 * @calls domain/world/regionRules.js#localWorldId
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').Id} objectiveId
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planObjectiveCompletion(context, objectiveId) {
  const state=context.state,objective=state.world.objectives.find(item=>item.id===objectiveId);
  if(!objective||objective.completed||objective.progress<Number(objective.requiredProgress??2100)-1||objective.kind==='blockade'&&objective.requiredEntityIds.some(id=>!state.world.entities[id]?.dead)||objective.kind==='escort'&&(objective.progress!==objective.requiredProgress||state.world.entities[objective.id]?.runtime.escortState!=='arrived'))return createEmptyPlan();
  const objectives=state.world.objectives.map(item=>item.id===objectiveId?{...item,progress:Number(item.requiredProgress??2100),completed:true,active:false}:item),reward=dependency1.planWorldReward(context,objective.rewardId);
  const changes=[...reward.plan.changes,createStateChange('world','objectives','setObjectives',{objectives})];
  const gate=state.world.entities[localWorldId(state,'boss:gate')];if(gate&&objectives.filter(item=>['beacon','blockade','escort'].includes(item.kind)&&item.completed).length>=2)changes.push(createStateChange('entity',gate.id,'setEntityRuntime',{runtime:{...gate.runtime,unlocked:true}}));
  return {...reward.plan,changes,events:[...reward.plan.events,{id:`objective:${objectiveId}:completed`,runId:state.runId,tick:state.tick,seq:0,type:'ObjectiveCompleted',sourceId:state.player.entityId,targetId:objectiveId,payload:{objectiveId}}]};
}

/**
 * 推进API时间、5分钟Boss日程与材料分钟限额，Boss死不结束局。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice API
 * @calls domain/world/api.js#planApiWorldAdvance
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 * @param {boolean} afterCombat
 */
export function planApiProgression(context,afterCombat=false) {return planApiWorldAdvance(context,afterCombat);}
