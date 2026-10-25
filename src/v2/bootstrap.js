// @ts-check
/**
 * 依赖组装入口；本次不接入旧main.js。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */
import * as dependency1 from './adapters/audio.js';
import * as dependency2 from './adapters/input.js';
import * as dependency3 from './adapters/presentation.js';
import * as dependency4 from './adapters/storage.js';
import * as dependency5 from './application/game.js';
import * as dependency6 from './application/repository.js';
import * as dependency7 from './content/catalog.js';
import * as dependency8 from './content/registry.js';

/**
 * 加载目录、建立适配器与应用，注册宿主循环；未完成前不能从旧入口调用。
 * 调用阶段：bootstrap；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls content/catalog.js#loadContentCatalog
 * @calls content/registry.js#createHandlerRegistry
 * @calls content/catalog.js#validateContentCatalog
 * @calls adapters/storage.js#createStoragePort
 * @calls application/repository.js#readProfileRepository
 * @calls adapters/input.js#createInputAdapter
 * @calls adapters/presentation.js#createPresentationAdapter
 * @calls adapters/audio.js#createAudioAdapter
 * @calls application/game.js#createApplication
 * @calls adapters/input.js#createInputPort
 * @calls adapters/presentation.js#createPresentationPort
 * @calls adapters/audio.js#createAudioPort
 * @param {import('./contracts.d.ts').BootstrapOptions} options
 * @returns {Promise<import('./contracts.d.ts').BrowserRuntime>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export async function bootstrapV2(options) {
  throw new Error('TODO V2: bootstrap.js#bootstrapV2');
}

/**
 * 采样输入/排命令→推进帧→渲染/事件消费→在tick外调度持久化flush；不可重入。
 * 调用阶段：host-frame；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls application/game.js#readApplicationView
 * @calls adapters/input.js#pollInputSamples
 * @calls adapters/input.js#normalizeInputSamples
 * @calls application/game.js#submitApplicationCommand
 * @calls application/game.js#advanceApplicationFrame
 * @calls application/game.js#drainApplicationEvents
 * @calls adapters/presentation.js#renderPresentation
 * @calls adapters/presentation.js#presentDomainEvents
 * @calls adapters/audio.js#playAudioEvents
 * @calls application/game.js#flushPersistenceQueue
 * @param {import('./contracts.d.ts').BrowserRuntime} runtime
 * @param {number} elapsedMs
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function onBrowserFrame(runtime, elapsedMs) {
  throw new Error('TODO V2: bootstrap.js#onBrowserFrame');
}

/**
 * 后台发系统暂停并清输入/挂起音频；恢复等待确认，不补跑。
 * 调用阶段：host-event；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls application/game.js#submitApplicationCommand
 * @calls adapters/input.js#clearHeldInput
 * @calls adapters/audio.js#suspendAudio
 * @param {import('./contracts.d.ts').BrowserRuntime} runtime
 * @param {boolean} hidden
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function onBrowserVisibility(runtime, hidden) {
  throw new Error('TODO V2: bootstrap.js#onBrowserVisibility');
}

/**
 * 接收表现层回传动作，交应用用例后把明确结果/错误交还UI；不改实体。
 * 调用阶段：host-ui；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls application/game.js#dispatchApplicationAction
 * @param {import('./contracts.d.ts').BrowserRuntime} runtime
 * @param {import('./contracts.d.ts').UiAction} action
 * @returns {Promise<import('./contracts.d.ts').Result<import('./contracts.d.ts').ApplicationActionResult>>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export async function onUiAction(runtime, action) {
  throw new Error('TODO V2: bootstrap.js#onUiAction');
}
