// @ts-check
/**
 * Phaser只表现，UI只发送UiAction。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 建立相机/像素画面/HUD/小窝面板，不启动战斗物理。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {string} mountElementId
 * @returns {import('../contracts.d.ts').ViewHandle}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createPresentationAdapter(mountElementId) {
  throw new Error('TODO V2: adapters/presentation.js#createPresentationAdapter');
}

/**
 * 按revision投影实体/模型弱点/LoRA表盘与菜单，不能改hp/cooldown。
 * 调用阶段：render；下游模式：sequence。
 * 状态权限：仅写Phaser显示对象与DOM，不写核心状态。
 * @calls adapters/presentation.js#renderPixelFish
 * @calls adapters/presentation.js#renderModelEntity
 * @calls adapters/presentation.js#renderLoraGauge
 * @calls adapters/presentation.js#renderGamePanels
 * @param {import('../contracts.d.ts').ViewHandle} view
 * @param {import('../contracts.d.ts').RenderSnapshot} snapshot
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function renderPresentation(view, snapshot) {
  throw new Error('TODO V2: adapters/presentation.js#renderPresentation');
}

/**
 * 按09绘制拿铁盆的像素鲸鱼娘，瞄准360°，盆不自带格挡。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：仅表现。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').ViewHandle} view
 * @param {import('../contracts.d.ts').RenderEntity} entity
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function renderPixelFish(view, entity) {
  throw new Error('TODO V2: adapters/presentation.js#renderPixelFish');
}

/**
 * 七种Pets、棕蟹模型外壳/弱点、Bot穿障可读反馈。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：仅表现。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').ViewHandle} view
 * @param {import('../contracts.d.ts').RenderEntity} entity
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function renderModelEntity(view, entity) {
  throw new Error('TODO V2: adapters/presentation.js#renderModelEntity');
}

/**
 * 只显示UI tick决定的指针与区域，不自行判定完美/失败。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：仅表现。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').ViewHandle} view
 * @param {import('../contracts.d.ts').RenderSnapshot} snapshot
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function renderLoraGauge(view, snapshot) {
  throw new Error('TODO V2: adapters/presentation.js#renderLoraGauge');
}

/**
 * 小窝/配装/插件3或4选/暂停/结算互斥面板；手机安全区与44px按钮。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：仅表现。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').ViewHandle} view
 * @param {import('../contracts.d.ts').RenderSnapshot} snapshot
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function renderGamePanels(view, snapshot) {
  throw new Error('TODO V2: adapters/presentation.js#renderGamePanels');
}

/**
 * 按eventId消费一次特效/表情/文字，不能回调伤害入口。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：仅表现事件已消费账本。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').ViewHandle} view
 * @param {readonly import('../contracts.d.ts').DomainEvent[]} events
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function presentDomainEvents(view, events) {
  throw new Error('TODO V2: adapters/presentation.js#presentDomainEvents');
}

/**
 * 清理实体映射、tween、DOM与监听，重开不残留。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：仅表现生命周期。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').ViewHandle} view
 * @returns {void}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function disposePresentationAdapter(view) {
  throw new Error('TODO V2: adapters/presentation.js#disposePresentationAdapter');
}

/**
 * 将只读render/present/dispose绑定为注入端口。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls adapters/presentation.js#renderPresentation
 * @calls adapters/presentation.js#presentDomainEvents
 * @calls adapters/presentation.js#disposePresentationAdapter
 * @param {import('../contracts.d.ts').ViewHandle} view
 * @returns {import('../contracts.d.ts').PresentationPort}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function createPresentationPort(view) {
  throw new Error('TODO V2: adapters/presentation.js#createPresentationPort');
}
