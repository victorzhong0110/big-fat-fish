import {drawRandom} from './random.js';
// @ts-check
import { toJson } from './serialization.js';
import { createEmptyPlan, createStateChange } from './plans.js';
/**
 * 实体/群组/箱子/目标奖励计划，无存储I/O。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 按阵营掉经验，精英群仅一箱；无奖励回响/装置排除。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/random.js#drawRandom
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {readonly import('../contracts.d.ts').DeathRecord[]} records
 * @returns {import('../contracts.d.ts').RewardPlan}
 */
export function planDeathRewards(context, records) {
  const state = context.state, changes = /** @type {import('../contracts.d.ts').StateChange[]} */ ([]), rewardIds = [];
  const api=state.api?{...state.api}:null;let rewardRandom={...state.random.reward};
  const seen = new Set(state.processedRewardIds), events=/** @type {import('../contracts.d.ts').DomainEvent[]} */ ([]),persistence=/** @type {import('../contracts.d.ts').PersistenceIntent[]} */ ([]);
  for (const record of records) {
    const entity = state.world.entities[record.entityId], rewardId = `deathReward:${record.entityId}`;
    if (!entity || record.creditOwner !== 'player' || record.rewardPolicy === 'none' || seen.has(rewardId)) continue;
    seen.add(rewardId);if(api){api.kills++;if(state.bosses.some(b=>b.entityId===entity.id))api.bossKills++;else{const fragment=drawRandom(rewardRandom),part=drawRandom(fragment.next);rewardRandom=part.next;for(const[kind,allowed]of /** @type {[string,boolean][]} */([['gpuFragment',fragment.value<.08&&api.fragmentsThisMinute<2],['part',part.value<.04&&api.partsThisMinute<1]])){if(!allowed)continue;if(kind==='gpuFragment')api.fragmentsThisMinute++;else api.partsThisMinute++;const id=`${rewardId}:${kind}`;changes.push(createStateChange('world',id,'putPickup',{id,kind,amount:1,position:entity.position,instanceId:null,collected:false}));}}}
    if(state.bosses.some(boss=>boss.entityId===entity.id)){const event={id:`bossDefeated:${entity.id}`,runId:state.runId,tick:state.tick,seq:0,type:'BossDefeated',sourceId:record.sourceId,targetId:entity.id,payload:{entityId:entity.id,faction:record.faction,difficulty:state.start.difficulty.level,mode:state.start.difficulty.mode}};events.push(event);persistence.push({id:`unlock:${event.id}`,kind:'unlock',payload:toJson(event)});changes.push(createStateChange('progression',rewardId,'addCollectedResource',{kind:'gpuFragment',amount:api?8:10}),createStateChange('progression',rewardId,'addCollectedResource',{kind:'part',amount:api?4:6}));}
    const amount = state.bosses.some(boss => boss.entityId === entity.id) ? 120 : record.rewardPolicy === 'elite' ? 32 : record.faction === 'claude' ? 24 : record.faction === 'gpt' ? 8 : 4;
    changes.push(createStateChange('world', rewardId, 'putPickup', { id: rewardId, kind: 'riceXp', amount, position: entity.position, instanceId: null, collected: false }));
    changes.push(createStateChange('runtime', rewardId, 'recordReward', {})); rewardIds.push(rewardId);
  }
  if(api&&rewardIds.length)changes.push(createStateChange('runtime','api','setApiState',api),createStateChange('random','reward','setRandomStream',rewardRandom));
  return { plan: { ...createEmptyPlan(), changes,events,persistence }, rewardIds };
}

/** 探索宝箱与目标掉落倍率。敌方生命另读 resolveDifficultySnapshot。
 * @calls 无内部公开函数。
 * @param {number} level
 * @returns {number}
 */
export function explorationLootMultiplier(level){
  if(!Number.isInteger(level)||level<1||level>15)return 1;
  return 1+(level-1)*0.1;
}

/**
 * 按stable rewardId发箱子/任务奖励，API分钟材料限额先校验。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/rewards.js#explorationLootMultiplier
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} rewardId
 * @returns {import('../contracts.d.ts').RewardPlan}
 */
export function planWorldReward(context, rewardId) {
  const state=context.state;if(state.processedRewardIds.includes(rewardId))return {plan:createEmptyPlan(),rewardIds:[]};
  const objective=state.world.objectives.find(item=>item.rewardId===rewardId),cache=rewardId.startsWith('cache:')?state.world.entities[rewardId.slice(6)]:null;
  const entity=objective?state.world.entities[objective.id]:cache;
  if(!entity||!objective&&!cache||cache?.runtime.opened===true)return {plan:createEmptyPlan(),rewardIds:[]};
  const exploration=state.start.difficulty.mode==='exploration';
  const level=Number(state.start.difficulty.level);
  const guardId=cache?.runtime.guardId;
  if (typeof guardId==='string'&&!state.world.entities[guardId]?.dead) return {plan:createEmptyPlan(),rewardIds:[]};
  const multiplier=exploration?explorationLootMultiplier(level):1;
  const amounts=objective?{riceXp:80,gpuFragment:2,part:3}:guardId?{riceXp:60,gpuFragment:8,part:5}:{riceXp:40,gpuFragment:5,part:2};
  const changes=[createStateChange('runtime',rewardId,'recordReward',{})];
  for(const [kind,amount]of Object.entries(amounts)){
    const id=`${rewardId}:${kind}`;
    changes.push(createStateChange('world',id,'putPickup',{id,kind,amount:Math.round(amount*multiplier),position:entity.position,instanceId:null,collected:false}));
  }
  if (exploration&&typeof cache?.runtime.weaponId==='string') {
    const id=`${rewardId}:weapon`,instanceId=`${state.runId}:${id}`,definitionId=cache.runtime.weaponId;
    const originalQuality=level<=5?0:level<=10?1:2;
    changes.push(createStateChange('world',id,'putPickup',{id,kind:'weapon',amount:1,position:entity.position,instanceId,collected:false,
      weapon:{instanceId,definitionId,originalQuality,cooldown:0,temporaryQuality:null,updateExpiresAt:null}}));
  }
  return {plan:{...createEmptyPlan(),changes},rewardIds:[rewardId]};
}

/**
 * 接触/吸附到达后才收大白饭，等值合并不改经验；永久材料另记背包。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} pickupId
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planTokenCollection(context, pickupId) {
  const state = context.state, pickup = state.world.pickups[pickupId], player = state.world.entities[state.player.entityId];
  if (!pickup || pickup.collected || (pickup.position.x - player.position.x) ** 2 + (pickup.position.y - player.position.y) ** 2 > 40 ** 2) return createEmptyPlan();
  if (!['riceXp', 'gpuFragment', 'part'].includes(pickup.kind)) return createEmptyPlan();
  const collect=pickup.kind==='riceXp'?state.plugins.find(plugin=>plugin.id==='plugin_collect'):null;
  const riceBoost = pickup.kind === 'riceXp' && state.start.treeNodeIds.includes('tree_body_context')
    ? [createStateChange('entity', player.id, 'setEntityRuntime', {runtime: {...player.runtime, riceBoostUntil: state.tick + 180}})] : [];
  const heal=collect?collect.rank===1?1:2:0;
  return { ...createEmptyPlan(), changes: [...riceBoost, createStateChange('world', pickupId, 'removePickup', {}), createStateChange('progression', pickupId, 'addCollectedResource', { kind: pickup.kind, amount: pickup.amount }),...(heal>0?[createStateChange('entity',player.id,'setHp',{hp:Math.min(player.maxHp,player.hp+heal)})]:[])], events: [{ id: `collected:${pickupId}`, runId: state.runId, tick: state.tick, seq: 0, type: 'PickupCollected', sourceId: player.id, targetId: null, payload: { kind: pickup.kind, amount: pickup.amount } }] };
}
