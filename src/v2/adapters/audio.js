// @ts-check
/**
 * 用户手势播放指定实际音源；不生成代替曲。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 准备音乐/音效资源记录，缺Let Me Go实际文件要报告未接入。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {readonly import('../contracts.d.ts').AssetRequest[]} assets
 * @returns {import('../contracts.d.ts').AudioHandle}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createAudioAdapter(assets) {
  throw new Error('TODO V2: adapters/audio.js#createAudioAdapter');
}

/**
 * 只在有效用户手势后恢复AudioContext，处理拒绝。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').AudioHandle} handle
 * @returns {Promise<void>}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export async function unlockAudio(handle) {
  throw new Error('TODO V2: adapters/audio.js#unlockAudio');
}

/**
 * 消费可听事件并防重播，不推进任何游戏计时。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：仅音频宿主状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').AudioHandle} handle
 * @param {readonly import('../contracts.d.ts').DomainEvent[]} events
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function playAudioEvents(handle, events) {
  throw new Error('TODO V2: adapters/audio.js#playAudioEvents');
}

/**
 * 暂停/后台处理音频，不用音频时钟改变战斗。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：仅音频宿主状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').AudioHandle} handle
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function suspendAudio(handle) {
  throw new Error('TODO V2: adapters/audio.js#suspendAudio');
}

/**
 * 停止节点/循环、释放资源与监听。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：仅音频生命周期。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').AudioHandle} handle
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function disposeAudioAdapter(handle) {
  throw new Error('TODO V2: adapters/audio.js#disposeAudioAdapter');
}

/**
 * 将unlock/play/suspend/dispose绑定为注入端口。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls adapters/audio.js#unlockAudio
 * @calls adapters/audio.js#playAudioEvents
 * @calls adapters/audio.js#suspendAudio
 * @calls adapters/audio.js#disposeAudioAdapter
 * @param {import('../contracts.d.ts').AudioHandle} handle
 * @returns {import('../contracts.d.ts').AudioPort}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createAudioPort(handle) {
  throw new Error('TODO V2: adapters/audio.js#createAudioPort');
}
