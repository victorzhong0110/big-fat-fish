// @ts-check
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
 * @calls domain/world/objectives.js#planObjectiveCompletion
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planObjectiveAdvance(context) {
  const state=context.state;if(state.start.runtimeProfile!=='adventure-slice'||state.flow.phase!=='exploring')return createEmptyPlan();
  const player=state.world.entities[state.player.entityId],next=state.world.objectives.map(objective=>({...objective}));
  const completing=next.find(objective=>objective.active&&!objective.completed&&state.world.entities[objective.id]&&distanceSquared(player.position,state.world.entities[objective.id].position)<=120**2);
  if(!completing)return createEmptyPlan();
  if(completing.progress>=2099)return planObjectiveCompletion(context,completing.id);
  completing.progress++;
  return {...createEmptyPlan(),changes:[createStateChange('world','objectives','setObjectives',{objectives:next})]};
}

/**
 * 唯一奖励/开门事件；正式最后Boss可请求胜利，API仅记阶段。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/rewards.js#planWorldReward
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').Id} objectiveId
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planObjectiveCompletion(context, objectiveId) {
  const state=context.state,objective=state.world.objectives.find(item=>item.id===objectiveId);
  if(!objective||objective.completed||objective.progress<2099)return createEmptyPlan();
  const objectives=state.world.objectives.map(item=>item.id===objectiveId?{...item,progress:2100,completed:true,active:false}:item),reward=dependency1.planWorldReward(context,objective.rewardId);
  const changes=[...reward.plan.changes,createStateChange('world','objectives','setObjectives',{objectives})];
  const gate=state.world.entities['boss:gate'];if(gate&&objectives.filter(item=>item.kind==='beacon'&&item.completed).length>=2)changes.push(createStateChange('entity',gate.id,'setEntityRuntime',{runtime:{...gate.runtime,unlocked:true}}));
  return {...reward.plan,changes,events:[...reward.plan.events,{id:`objective:${objectiveId}:completed`,runId:state.runId,tick:state.tick,seq:0,type:'ObjectiveCompleted',sourceId:state.player.entityId,targetId:objectiveId,payload:{objectiveId}}]};
}

/**
 * 推进API时间、5分钟Boss日程与材料分钟限额，Boss死不结束局。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planApiProgression(context) {
  throw new Error('TODO V2: domain/world/objectives.js#planApiProgression');
}
