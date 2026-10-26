// @ts-check
/**
 * 累计机制稳定ID分派，不得把所有候选处理器依次执行。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../content/handlers/mechanics.js';

/**
 * 按合法稳定id和已实现绑定只调用一个对应处理器。
 * 调用阶段：dispatch；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。
 * @calls content/handlers/mechanics.js#planMechanic01Exploration
 * @calls content/handlers/mechanics.js#planMechanic02Reinforcements
 * @calls content/handlers/mechanics.js#planMechanic03GptSupport
 * @calls content/handlers/mechanics.js#planMechanic04ClaudeBreak
 * @calls content/handlers/mechanics.js#planMechanic05BossCombo
 * @calls content/handlers/mechanics.js#planMechanic06AlarmCache
 * @calls content/handlers/mechanics.js#planMechanic07Tide
 * @calls content/handlers/mechanics.js#planMechanic08GrokFlanks
 * @calls content/handlers/mechanics.js#planMechanic09GptReposition
 * @calls content/handlers/mechanics.js#planMechanic10BossArena
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} definitionId
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function dispatchMechanicsHandler(context, definitionId, event) {
  if(definitionId==='mech_01_exploration')return dependency1.planMechanic01Exploration(context,event);
  if(definitionId==='mech_02_reinforcements')return dependency1.planMechanic02Reinforcements(context,event);
  if(definitionId==='mech_03_gpt_support')return dependency1.planMechanic03GptSupport(context,event);
  if(definitionId==='mech_04_claude_break')return dependency1.planMechanic04ClaudeBreak(context,event);
  if(definitionId==='mech_05_boss_combo')return dependency1.planMechanic05BossCombo(context,event);
  if(definitionId==='mech_06_alarm_cache')return dependency1.planMechanic06AlarmCache(context,event);
  if(definitionId==='mech_07_tide')return dependency1.planMechanic07Tide(context,event);
  if(definitionId==='mech_08_grok_flanks')return dependency1.planMechanic08GrokFlanks(context,event);
  if(definitionId==='mech_09_gpt_reposition')return dependency1.planMechanic09GptReposition(context,event);
  if(definitionId==='mech_10_boss_arena')return dependency1.planMechanic10BossArena(context,event);
  throw new Error(`Unimplemented mechanic: ${definitionId}`);
}
