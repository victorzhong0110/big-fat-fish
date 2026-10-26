// @ts-check
import { CONTENT_BINDINGS } from './catalogData.js';
/**
 * 所有内容ID到显式处理器绑定；不构造假可用实例。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 根据architecture-manifest的绑定构建注册表；缺实现标记必须阻止玩法入口启动。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @returns {import('../contracts.d.ts').HandlerRegistry}
 */
export function createHandlerRegistry() {
  return { bindings: Object.fromEntries(CONTENT_BINDINGS.map(binding => [binding.id, `${binding.module}#${binding.function}`])), implementedIds: ["companion_rice","companion_patch","companion_cache","companion_router","companion_decoy","companion_rocket","mcp_bubble","mcp_fan","mcp_vector","mcp_stream","mcp_return","mcp_batch","skill_cache","skill_disconnect","skill_batch","skill_redirect","skill_sandbox","skill_fork","skill_rollback","skill_overclock","enemy_claude_guard","enemy_grok_bot","plugin_collect","plugin_5h","plugin_guard","plugin_distill","dsh_lora","dsh_gpt_branch","dsh_claude_appeal","dsh_claude_allowlist","plugin_compress","plugin_parallel","plugin_batch","plugin_cache","plugin_retry","plugin_temperature","plugin_cooldown","plugin_offload","plugin_keepalive","plugin_redirect","plugin_backoff","plugin_failover","plugin_sandbox","plugin_hallucination","plugin_chain","plugin_context","plugin_hotplug","plugin_prefill","plugin_toolchain","plugin_mirror","plugin_recursion","plugin_moe","plugin_speculate","plugin_window","plugin_agent","plugin_breaker","dsh_gpt_preview","dsh_grok_license","dsh_grok_salvage","dsh_sleep","dsh_rice","dsh_open","enemy_gpt_codex","enemy_gpt_dewey","enemy_gpt_fireball","enemy_gpt_hoots","enemy_gpt_rocky","enemy_gpt_seedy","enemy_gpt_stacky","claude_haiku","claude_sonnet","claude_opus","claude_fable","claude_mythos","gpt_astra","gpt_sol","gpt_terra","gpt_luna","grok_bot","mech_01_exploration","mech_02_reinforcements","mech_03_gpt_support","mech_04_claude_break","mech_05_boss_combo","mech_06_alarm_cache","mech_07_tide","mech_08_grok_flanks","mech_09_gpt_reposition","mech_10_boss_arena"] };
}
