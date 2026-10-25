// @ts-check
import { createEmptyPlan,createStateChange } from '../plans.js';
import { createEntityState } from '../entities.js';
/**
 * 驻守、追兵、Grok群组和API预算。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../../content/catalog.js';
import * as dependency2 from '../collision.js';
import * as dependency3 from '../difficulty.js';

/**
 * 推进合法生成日程，额度/局部容量满则延期，合并久积压，保持Grok人海方向。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/collision.js#validateSpawnLocation
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/spawning.js#planEnemySpawn
 * @calls domain/world/spawning.js#planReinforcementGroup
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planSpawnSchedule(context) {
  const state=context.state;
  if(state.start.runtimeProfile!=='adventure-slice'||state.flow.phase!=='exploring')return createEmptyPlan();
  const due=[...state.world.spawnQueue].filter(request=>request.at<=state.tick).sort((a,b)=>a.at-b.at||(a.id<b.id?-1:1))[0];
  if(due){
    const player=state.world.entities[state.player.entityId];
    const candidates=[due.position,...Array.from({length:16},(_,i)=>({x:player.position.x+Math.cos((i+Number(due.id.split(':').at(-1)||0))*Math.PI/8)*800,y:player.position.y+Math.sin((i+Number(due.id.split(':').at(-1)||0))*Math.PI/8)*800}))];
    for(const position of candidates){const request={...due,position};if(dependency2.validateSpawnLocation(context,request).ok)return planEnemySpawn(context,request);}
    return createEmptyPlan();
  }
  if(state.world.spawnQueue.length||state.tick<Number(state.spawnDirectorNextAt??720))return createEmptyPlan();
  const cycleSeconds=state.tick/60%90;
  if(cycleSeconds>=70)return {...createEmptyPlan(),changes:[createStateChange('world','pursuers','setSpawnDirector',{queue:state.world.spawnQueue,budgets:state.world.budgets,nextAt:Math.ceil((Math.floor(state.tick/5400)+1)*5400)})]};
  return planReinforcementGroup(context,`pursuers:${state.tick}`,'pursuers');
}

/**
 * 建立稳定实体id/奖励来源/出生时倍率和模型壳，提交生成计划。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：模型壳/基础能力在下一阶段按相同profile处理，出生倍率只快照一次；实体来源和奖励策略不丢失。
 * @implementationScope adventure-slice
 * @calls content/catalog.js#findContentDefinition
 * @calls domain/collision.js#validateSpawnLocation
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').SpawnRequest} request
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planEnemySpawn(context, request) {
  const state=context.state;if(request.at>state.tick||state.world.entities[request.id])return createEmptyPlan();
  if(!['enemy_claude_guard','enemy_grok_bot'].includes(request.enemyId))throw new Error('Enemy spawning currently supports Claude/Grok only');
  const validation=dependency2.validateSpawnLocation(context,request);if(!validation.ok)return createEmptyPlan();
  const definition=dependency1.findContentDefinition(context.catalog,request.enemyId);if(!definition.ok)throw new Error(definition.message);
  const p=definition.value.parameters,grok=request.enemyId==='enemy_grok_bot';
  if(!grok&&request.modelProfileId!=='claude_haiku')throw new Error('Shell model spawning is not connected yet');
  const budget=state.world.budgets.find(item=>item.id===request.budgetId);if(!budget||budget.reserved<1||budget.spawned>=budget.total)return createEmptyPlan();
  const entity=createEntityState(request.id,request.enemyId,'enemy','enemy',validation.value,{faction:grok?'grok':'claude',radius:Number(p.radius),hp:Number(p.hp)*state.start.difficulty.hpMultiplier,maxHp:Number(p.hp)*state.start.difficulty.hpMultiplier,modelProfileId:request.modelProfileId,rewardPolicy:request.rewardPolicy,distillEligible:request.distillEligible,runtime:{engaged:true,moveSpeed:Number(p.moveSpeed),contactDamage:Number(p.contactDamage)*state.start.difficulty.damageMultiplier,damageMultiplier:state.start.difficulty.damageMultiplier,groupId:request.groupId,spawnGroup:request.groupId}});
  return {...createEmptyPlan(),changes:[createStateChange('world',entity.id,'putEntity',entity),createStateChange('world',request.budgetId,'setSpawnDirector',{queue:state.world.spawnQueue.filter(item=>item.id!==request.id),budgets:state.world.budgets.map(item=>item.id===budget.id?{...item,reserved:item.reserved-1,spawned:item.spawned+1}:item),nextAt:state.spawnDirectorNextAt??720})]};
}

/**
 * 为一组入口/信号援军预留预算和奖励策略；同group只排一次。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').Id} groupId
 * @param {import('../../contracts.d.ts').Id} budgetId
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planReinforcementGroup(context, groupId, budgetId) {
  const state=context.state,budget=state.world.budgets.find(item=>item.id===budgetId);
  if(!budget||state.world.spawnQueue.some(item=>item.groupId===groupId)||!state.input.viewport)return createEmptyPlan();
  const concentrated=state.tick/60%90>=50,count=Math.min(concentrated?8:6,budget.total-budget.spawned-budget.reserved);
  if(count<=0)return createEmptyPlan();
  const player=state.world.entities[state.player.entityId],queue=[...state.world.spawnQueue];
  for(let i=0;i<count;i++){const angle=(i+state.seed%16)*Math.PI/8;queue.push({id:`${groupId}:${i}`,groupId,budgetId,enemyId:'enemy_grok_bot',position:{x:player.position.x+Math.cos(angle)*800,y:player.position.y+Math.sin(angle)*800},at:state.tick+90+i*5,modelProfileId:'grok_bot',rewardPolicy:'normal',distillEligible:true});}
  return {...createEmptyPlan(),changes:[createStateChange('world',budgetId,'setSpawnDirector',{queue,budgets:state.world.budgets.map(item=>item.id===budgetId?{...item,reserved:item.reserved+count}:item),nextAt:state.tick+(concentrated?480:720)})]};
}
