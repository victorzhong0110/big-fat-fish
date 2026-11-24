// @ts-check
/**
 * 局内插件稳定ID分派，不得把所有候选处理器依次执行。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../content/handlers/plugins.js';

/**
 * 按合法稳定id和已实现绑定只调用一个对应处理器。
 * 调用阶段：dispatch；下游模式：dispatch。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。
 * @calls content/handlers/plugins.js#planPlugin5h
 * @calls content/handlers/plugins.js#planPluginAgent
 * @calls content/handlers/plugins.js#planPluginBackoff
 * @calls content/handlers/plugins.js#planPluginBatch
 * @calls content/handlers/plugins.js#planPluginBreaker
 * @calls content/handlers/plugins.js#planPluginCache
 * @calls content/handlers/plugins.js#planPluginChain
 * @calls content/handlers/plugins.js#planPluginCollect
 * @calls content/handlers/plugins.js#planPluginCompress
 * @calls content/handlers/plugins.js#planPluginContext
 * @calls content/handlers/plugins.js#planPluginCooldown
 * @calls content/handlers/plugins.js#planPluginDistill
 * @calls content/handlers/plugins.js#planPluginFailover
 * @calls content/handlers/plugins.js#planPluginGuard
 * @calls content/handlers/plugins.js#planPluginHallucination
 * @calls content/handlers/plugins.js#planPluginHotplug
 * @calls content/handlers/plugins.js#planPluginKeepalive
 * @calls content/handlers/plugins.js#planPluginLocalDeploy
 * @calls content/handlers/plugins.js#planPluginMirror
 * @calls content/handlers/plugins.js#planPluginMoe
 * @calls content/handlers/plugins.js#planPluginOffload
 * @calls content/handlers/plugins.js#planPluginParallel
 * @calls content/handlers/plugins.js#planPluginPrefill
 * @calls content/handlers/plugins.js#planPluginQuantInt4
 * @calls content/handlers/plugins.js#planPluginRecursion
 * @calls content/handlers/plugins.js#planPluginRedirect
 * @calls content/handlers/plugins.js#planPluginRetry
 * @calls content/handlers/plugins.js#planPluginRollbackEmergency
 * @calls content/handlers/plugins.js#planPluginSandbox
 * @calls content/handlers/plugins.js#planPluginSpeculate
 * @calls content/handlers/plugins.js#planPluginTemperature
 * @calls content/handlers/plugins.js#planPluginToolchain
 * @calls content/handlers/plugins.js#planPluginWindow
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} definitionId
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function dispatchPluginsHandler(context, definitionId, event) {
  if(definitionId==='plugin_parallel')return dependency1.planPluginParallel(context,event);
  if(definitionId==='plugin_batch')return dependency1.planPluginBatch(context,event);
  if(definitionId==='plugin_compress')return dependency1.planPluginCompress(context,event);
  if(definitionId==='plugin_cache')return dependency1.planPluginCache(context,event);
  if(definitionId==='plugin_retry')return dependency1.planPluginRetry(context,event);
  if(definitionId==='plugin_temperature')return dependency1.planPluginTemperature(context,event);
  if(definitionId==='plugin_collect')return dependency1.planPluginCollect(context,event);
  if(definitionId==='plugin_cooldown')return dependency1.planPluginCooldown(context,event);
  if(definitionId==='plugin_offload')return dependency1.planPluginOffload(context,event);
  if(definitionId==='plugin_keepalive')return dependency1.planPluginKeepalive(context,event);
  if(definitionId==='plugin_redirect')return dependency1.planPluginRedirect(context,event);
  if(definitionId==='plugin_backoff')return dependency1.planPluginBackoff(context,event);
  if(definitionId==='plugin_distill')return dependency1.planPluginDistill(context,event);
  if(definitionId==='plugin_5h')return dependency1.planPlugin5h(context,event);
  if(definitionId==='plugin_failover')return dependency1.planPluginFailover(context,event);
  if(definitionId==='plugin_sandbox')return dependency1.planPluginSandbox(context,event);
  if(definitionId==='plugin_hallucination')return dependency1.planPluginHallucination(context,event);
  if(definitionId==='plugin_chain')return dependency1.planPluginChain(context,event);
  if(definitionId==='plugin_context')return dependency1.planPluginContext(context,event);
  if(definitionId==='plugin_hotplug')return dependency1.planPluginHotplug(context,event);
  if(definitionId==='plugin_guard')return dependency1.planPluginGuard(context,event);
  if(definitionId==='plugin_prefill')return dependency1.planPluginPrefill(context,event);
  if(definitionId==='plugin_toolchain')return dependency1.planPluginToolchain(context,event);
  if(definitionId==='plugin_mirror')return dependency1.planPluginMirror(context,event);
  if(definitionId==='plugin_recursion')return dependency1.planPluginRecursion(context,event);
  if(definitionId==='plugin_moe')return dependency1.planPluginMoe(context,event);
  if(definitionId==='plugin_speculate')return dependency1.planPluginSpeculate(context,event);
  if(definitionId==='plugin_window')return dependency1.planPluginWindow(context,event);
  if(definitionId==='plugin_agent')return dependency1.planPluginAgent(context,event);
  if(definitionId==='plugin_breaker')return dependency1.planPluginBreaker(context,event);
  if(definitionId==='plugin_local_deploy')return dependency1.planPluginLocalDeploy(context,event);
  if(definitionId==='plugin_quant_int4')return dependency1.planPluginQuantInt4(context,event);
  if(definitionId==='plugin_rollback_emergency')return dependency1.planPluginRollbackEmergency(context,event);
  throw new Error('Unknown plugin');
}
