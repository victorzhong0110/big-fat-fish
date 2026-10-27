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
  if(state.start.runtimeProfile!=='adventure-slice'||!['exploring','boss'].includes(state.flow.phase))return createEmptyPlan();
  if(state.world.pressureEvents.some(e=>e.phase==='queued'&&e.runtime.kind==='coordinator'&&Number(e.runtime.gapUntil)>state.tick))return createEmptyPlan();
  const due=[...state.world.spawnQueue].filter(request=>request.at<=state.tick&&(state.api!==null||state.flow.phase!=='boss'||!!request.bossOwner&&state.bosses.some(b=>b.entityId===request.bossOwner&&!state.world.entities[b.entityId]?.dead))).sort((a,b)=>(state.api?Number(!!b.bossOwner)-Number(!!a.bossOwner):0)||a.at-b.at||(a.id<b.id?-1:1))[0];
  if(due){
    const player=state.world.entities[state.player.entityId];
    const candidates=[due.position,...Array.from({length:16},(_,i)=>({x:player.position.x+Math.cos((i+Number(due.id.split(':').at(-1)||0))*Math.PI/8)*800,y:player.position.y+Math.sin((i+Number(due.id.split(':').at(-1)||0))*Math.PI/8)*800}))];
    for(const position of candidates){if(state.start.difficulty.mechanicIds.includes('mech_08_grok_flanks')&&due.enemyId==='enemy_grok_bot'&&(due.position.x<player.position.x?position.x>player.position.x-420:position.x<player.position.x+420))continue;const request={...due,position};if(dependency2.validateSpawnLocation(context,request).ok)return planEnemySpawn(context,request);}
    return createEmptyPlan();
  }
  if(state.flow.phase==='boss'&&!state.api||state.api&&(state.api.withdrawal||state.tick<state.api.calmUntil))return createEmptyPlan();
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
 * @calls domain/difficulty.js#resolveApiSpawnMultipliers
 * @calls domain/difficulty.js#resolveModelProfileId
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').SpawnRequest} request
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planEnemySpawn(context, request) {
  const state=context.state;if(request.at>state.tick||state.world.entities[request.id])return createEmptyPlan();
  if(context.catalog.definitions[request.enemyId]?.kind!=='enemy')throw new Error('Unknown enemy species');
  const validation=dependency2.validateSpawnLocation(context,request);if(!validation.ok)return createEmptyPlan();
  const definition=dependency1.findContentDefinition(context.catalog,request.enemyId);if(!definition.ok)throw new Error(definition.message);
  const p=definition.value.parameters,grok=request.enemyId==='enemy_grok_bot';
  const budget=state.world.budgets.find(item=>item.id===request.budgetId);if(!budget||budget.reserved<1||budget.spawned>=budget.total)return createEmptyPlan();
  const strength=state.api?dependency3.resolveApiSpawnMultipliers(state.api.elapsedTicks):{ok:/** @type {const} */(true),value:{hp:state.start.difficulty.hpMultiplier,damage:state.start.difficulty.damageMultiplier,budget:state.start.difficulty.spawnBudgetMultiplier}};if(!strength.ok)throw new Error(strength.message);
  const profile=state.api?dependency3.resolveModelProfileId(state.start.difficulty,/** @type {import('../../contracts.d.ts').Faction} */(p.faction),state.random.world):{ok:/** @type {const} */(true),value:{profileId:request.modelProfileId,next:state.random.world}};if(!profile.ok)throw new Error(profile.message);
  const entity=createEntityState(request.id,request.enemyId,'enemy','enemy',validation.value,{faction:/** @type {import('../../contracts.d.ts').Faction} */(p.faction),radius:Number(p.radius)*(request.elite?1.25:1),hp:Number(p.hp)*strength.value.hp*(request.elite?2:1),maxHp:Number(p.hp)*strength.value.hp*(request.elite?2:1),modelProfileId:profile.value.profileId,rewardPolicy:request.rewardPolicy,distillEligible:request.distillEligible,runtime:{birthMinute:state.api?Math.floor(state.api.elapsedTicks/3600):0,elite:request.elite===true,...(request.bossOwner?{bossOwner:request.bossOwner,bossGrokSample:request.bossGrokSample===true}:{}),engaged:true,moveSpeed:Number(p.moveSpeed),contactDamage:Number(p.contactDamage)*strength.value.damage*(request.elite?1.2:1),damageMultiplier:strength.value.damage*(request.elite?1.2:1),groupId:request.groupId,spawnGroup:request.groupId}});
  return {...createEmptyPlan(),changes:[...(state.api?[createStateChange('random','world','setRandomStream',profile.value.next)]:[]),createStateChange('world',entity.id,'putEntity',entity),createStateChange('world',request.budgetId,'setSpawnDirector',{queue:state.world.spawnQueue.filter(item=>item.id!==request.id),budgets:state.world.budgets.map(item=>item.id===budget.id?{...item,reserved:item.reserved-1,spawned:item.spawned+1}:item),nextAt:state.spawnDirectorNextAt??720})]};
}

/**
 * 为一组入口/信号援军预留预算和奖励策略；同group只排一次。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/difficulty.js#resolveApiSpawnMultipliers
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
  const concentrated=state.tick/60%90>=50,strength=state.api?dependency3.resolveApiSpawnMultipliers(state.api.elapsedTicks):null;if(strength&&!strength.ok)throw new Error(strength.message);const count=Math.min(20,Math.floor((concentrated?8:6)*(strength?.ok?strength.value.budget:1)),budget.total-budget.spawned-budget.reserved);
  if(count<=0)return createEmptyPlan();
  const player=state.world.entities[state.player.entityId],queue=[...state.world.spawnQueue];
  for(let i=0;i<count;i++){const angle=(i+state.seed%16)*Math.PI/8,flanks=state.start.difficulty.mechanicIds.includes('mech_08_grok_flanks'),right=i>=Math.ceil(count/2),grokBoss=state.api&&state.bosses.some(b=>b.faction==='grok'&&!state.world.entities[b.entityId]?.dead),species=state.api?(i%6===4?'enemy_claude_guard':i%6===5||grokBoss?['enemy_gpt_codex','enemy_gpt_dewey','enemy_gpt_hoots','enemy_gpt_rocky','enemy_gpt_fireball','enemy_gpt_seedy','enemy_gpt_stacky'][Math.floor(state.tick/720+i)%7]:'enemy_grok_bot'):'enemy_grok_bot',faction=species==='enemy_grok_bot'?'grok':species==='enemy_claude_guard'?'claude':'gpt';queue.push({id:`${groupId}:${i}`,groupId,budgetId,enemyId:species,position:flanks?{x:player.position.x+(right?800:-800),y:player.position.y+(right?200:-200)}:{x:player.position.x+Math.cos(angle)*800,y:player.position.y+Math.sin(angle)*800},at:state.tick+90+(flanks?(right?120:0)+(i%Math.ceil(count/2))*5:i*5),modelProfileId:state.start.difficulty.modelProfileIds[faction],rewardPolicy:'normal',distillEligible:true});}
  return {...createEmptyPlan(),changes:[createStateChange('world',budgetId,'setSpawnDirector',{queue,budgets:state.world.budgets.map(item=>item.id===budgetId?{...item,reserved:item.reserved+count}:item),nextAt:state.tick+(concentrated?480:720)})]};
}
