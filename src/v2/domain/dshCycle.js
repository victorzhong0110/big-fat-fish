// @ts-check
/**
 * 10秒开奖、5分钟有效期与极低概率续期彩蛋。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from './random.js';

export const DSH_CYCLE_INTERVAL_SECONDS = 10;
export const DSH_CYCLE_DURATION_SECONDS = 300;
export const DSH_CYCLE_REFRESH_CHANCE = 0.001;

/** Read detached cycle timers, including old schema-6 checkpoints: infer their remaining lifetime from effective world time, never grant a fresh five minutes on load.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @returns {{remaining:number;activeRemaining:number;durationResets:number}}
 */
export function readDshCycleTimers(state){
 const cycle=state.dshCycle;
 return {remaining:Math.min(DSH_CYCLE_INTERVAL_SECONDS,cycle.remaining),activeRemaining:cycle.activeRemaining??Math.max(0,DSH_CYCLE_DURATION_SECONDS-(cycle.lastAdvancedTick??Math.max(0,state.tick-1))/60),durationResets:cycle.durationResets??0};
}

/**
 * 在有效世界时间推进开奖，暂停/训练不走；结束态取消。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/dshCycle.js#planCooldownReset
 * @calls domain/dshCycle.js#planTemporaryWeaponUpdate
 * @calls domain/dshCycle.js#readDshCycleTimers
 * @calls domain/random.js#drawRandom
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planDshCycleEvent(context, event) {
  const state = context.state;
  const empty = { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  if (!state.start.dsh.some(slot => slot.id === 'dsh_gpt_branch') || !['exploring', 'boss'].includes(state.flow.phase) || event.type !== 'WorldTick' || event.tick !== state.tick || event.runId !== state.runId || state.dshCycle.lastAdvancedTick === state.tick) return empty;
  const timers=readDshCycleTimers(state);
  if(timers.activeRemaining<=1e-9)return empty;
  const remaining=Math.max(0,timers.remaining-1/60),activeRemaining=Math.max(0,timers.activeRemaining-1/60);
  const cycle={...state.dshCycle,...timers,remaining:remaining<=1e-9?0:remaining,activeRemaining:activeRemaining<=1e-9?0:activeRemaining,lastAdvancedTick:state.tick};
  if(remaining>1e-9)return {...empty,changes:[{target:'runtime',id:'dsh_gpt_branch',operation:'setDshCycle',payload:cycle}]};
  const draw=dependency1.drawRandom(state.random.dsh),refreshDraw=dependency1.drawRandom(draw.next);
  const outcome=draw.value<0.5?'update':'reset',durationRefreshed=refreshDraw.value<DSH_CYCLE_REFRESH_CHANCE;
  const result=outcome==='update'?planTemporaryWeaponUpdate(context):planCooldownReset(context);
  const nextCycle={...cycle,remaining:DSH_CYCLE_INTERVAL_SECONDS,activeRemaining:durationRefreshed?DSH_CYCLE_DURATION_SECONDS:cycle.activeRemaining,durationResets:cycle.durationResets+(durationRefreshed?1:0),pendingOutcome:null,triggerSeq:cycle.triggerSeq+1};
  const resolved={id:`dshcycle:${state.runId}:${nextCycle.triggerSeq}`,runId:state.runId,tick:state.tick,seq:0,type:'DshCycleResolved',sourceId:'dsh_gpt_branch',targetId:state.player.entityId,payload:{outcome,durationRefreshed,activeRemaining:nextCycle.activeRemaining}};
  return {...result,changes:[...result.changes,
    {target:'random',id:'dsh',operation:'setRandomStream',payload:{...refreshDraw.next}},
    {target:'runtime',id:'dsh_gpt_branch',operation:'setDshCycle',payload:nextCycle}
  ],events:[...result.events,resolved,...(durationRefreshed?[{...resolved,id:`${resolved.id}:duration-reset`,type:'DshCycleDurationReset',payload:{activeRemaining:DSH_CYCLE_DURATION_SECONDS,durationResets:nextCycle.durationResets}}]:[])]};
}

/**
 * 仅当前武器实例临时品质+1或最高品质+20%，持续28秒，刷新不叠。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planTemporaryWeaponUpdate(context) {
  const state = context.state, weapon = state.player.loadout.weapons[state.player.loadout.activeWeaponIndex];
  if (!weapon) return { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  return { changes: [{ target: 'player', id: state.player.entityId, operation: 'setWeaponUpdate', payload: { instanceId: weapon.instanceId, temporaryQuality: Math.min(2, weapon.originalQuality + 1), expiresAt: state.tick + 1680 } }], effects: [], events: [], persistence: [], diagnostics: [] };
}

/**
 * 仅装备技能、冲刺、伙伴原生冷却置0，封禁/5h/插件冷却不清。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planCooldownReset(context) {
  return { changes: [{ target: 'player', id: context.state.player.entityId, operation: 'resetEquipmentCooldowns', payload: {} }], effects: [], events: [], persistence: [], diagnostics: [] };
}
