// @ts-check
/**
 * 表现层只读投影，不把活实体对象交给UI。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

import { createDataDigest } from '../domain/serialization.js';

/**
 * 将模型名/壳弱点/LoRA/插件/额度与角色位置投影到只读显示DTO。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').RenderSnapshot}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createRenderSnapshot(state, catalog) {
  throw new Error('TODO V2: engine/snapshot.js#createRenderSnapshot');
}

/**
 * 稳定序列化关键状态摘要，排除表现随机/宿主对象。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/serialization.js#createDataDigest
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @returns {string}
 */
export function createStateDigest(state) {
  return createDataDigest(state);
}
