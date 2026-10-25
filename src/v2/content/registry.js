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
  return { bindings: Object.fromEntries(CONTENT_BINDINGS.map(binding => [binding.id, `${binding.module}#${binding.function}`])), implementedIds: ['mcp_bubble', 'mcp_fan', 'skill_cache', 'skill_disconnect', 'enemy_claude_guard', 'enemy_grok_bot', 'plugin_collect', 'plugin_5h', 'plugin_guard', 'plugin_distill', 'dsh_lora', 'dsh_gpt_branch'] };
}
