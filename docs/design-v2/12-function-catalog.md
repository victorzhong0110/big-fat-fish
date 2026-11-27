# 12 · 全部函数目录与调用契约

当前127个JS模块、453个公开函数：413个有实现，40个明确TODO。core-preview为Free练习，adventure-slice为正式Free引导、原版及隔离模组档的1–15短途、远征、无尽及同档解锁的探索，以及已解锁API；均不能当完整规格已完成。参见[进度与边界](13-development-status.md)。

调用图包含模块私有辅助函数转达的公开调用。TODO列出预定契约；已实现函数列出真实公开依赖。dispatch按内容ID选分支；顺序仍受适用条件约束。

## adapters/audio.js

用户手势播放指定实际音源；不生成代替曲。

[源码](../../src/v2/adapters/audio.js)；层：`adapter`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createAudioAdapter(assets: untyped)` | `AudioHandle` | TODO | 准备音乐/音效资源记录，缺Let Me Go实际文件要报告未接入。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `unlockAudio(handle: untyped)` | `Promise<void>` | TODO | 只在有效用户手势后恢复AudioContext，处理拒绝。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `playAudioEvents(handle: untyped, events: untyped)` | `void` | TODO | 消费可听事件并防重播，不推进任何游戏计时。；；状态权限：仅音频宿主状态 |
| `suspendAudio(handle: untyped)` | `void` | TODO | 暂停/后台处理音频，不用音频时钟改变战斗。；；状态权限：仅音频宿主状态 |
| `disposeAudioAdapter(handle: untyped)` | `void` | TODO | 停止节点/循环、释放资源与监听。；；状态权限：仅音频生命周期 |
| `createAudioPort(handle: untyped)` | `AudioPort` | TODO | 将unlock/play/suspend/dispose绑定为注入端口。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `createAudioAdapter` → 无内部公开函数。
- `unlockAudio` → 无内部公开函数。
- `playAudioEvents` → 无内部公开函数。
- `suspendAudio` → 无内部公开函数。
- `disposeAudioAdapter` → 无内部公开函数。
- `createAudioPort` → `adapters/audio.js#unlockAudio`、`adapters/audio.js#playAudioEvents`、`adapters/audio.js#suspendAudio`、`adapters/audio.js#disposeAudioAdapter`。

公开函数上游：

- `createAudioAdapter` ← `bootstrap.js#bootstrapV2`。
- `unlockAudio` ← `adapters/audio.js#createAudioPort`。
- `playAudioEvents` ← `adapters/audio.js#createAudioPort`、`bootstrap.js#onBrowserFrame`。
- `suspendAudio` ← `adapters/audio.js#createAudioPort`、`bootstrap.js#onBrowserVisibility`。
- `disposeAudioAdapter` ← `adapters/audio.js#createAudioPort`。
- `createAudioPort` ← `bootstrap.js#bootstrapV2`。

## adapters/input.js

键鼠/双摇杆与系统输入归一化；不访问实体。

[源码](../../src/v2/adapters/input.js)；层：`adapter`。

直接依赖：`domain/geometry.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createInputAdapter(mountElementId: untyped)` | `InputHandle` | TODO | 挂载键鼠/触屏监听并返回可清理句柄，默认键与辅助挣脱按01。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `normalizeInputSamples(samples: untyped, previous: untyped, mapping: untyped)` | `CommandBatch` | TODO | 映射移动/瞄准/开火/技能/交互/选择/训练，Space按phase由上层校验；pointercancel清持有状态。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `clearHeldInput(handle: untyped)` | `void` | TODO | 后台/暂停/销毁清理所有指针与持键，避免卡住射击。；；状态权限：仅输入适配器自身宿主状态 |
| `disposeInputAdapter(handle: untyped)` | `void` | TODO | 撤销全部订阅，重复销毁安全。；；状态权限：仅输入适配器监听器生命周期 |
| `pollInputSamples(handle: untyped)` | `readonly InputSample[]` | TODO | 取一次宿主输入缓冲供bootstrap归一化；不调用Session。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `createInputPort(handle: untyped)` | `InputPort` | TODO | 将poll/suspend/dispose绑定为注入端口。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `mapInputTimestampToTick(sample: untyped, mapping: untyped)` | `{ clock: 'world' \| 'ui'; targetTick: Tick }` | TODO | 将有效单调时间戳映射到对应世界/UI tick，LoRA精度不取决于渲染帧；后台/暂停不得快进。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `createInputAdapter` → 无内部公开函数。
- `normalizeInputSamples` → `domain/geometry.js#normalizeVector`、`adapters/input.js#mapInputTimestampToTick`。
- `clearHeldInput` → 无内部公开函数。
- `disposeInputAdapter` → 无内部公开函数。
- `pollInputSamples` → 无内部公开函数。
- `createInputPort` → `adapters/input.js#pollInputSamples`、`adapters/input.js#clearHeldInput`、`adapters/input.js#disposeInputAdapter`。
- `mapInputTimestampToTick` → 无内部公开函数。

公开函数上游：

- `createInputAdapter` ← `bootstrap.js#bootstrapV2`。
- `normalizeInputSamples` ← `bootstrap.js#onBrowserFrame`。
- `clearHeldInput` ← `adapters/input.js#createInputPort`、`bootstrap.js#onBrowserVisibility`。
- `disposeInputAdapter` ← `adapters/input.js#createInputPort`。
- `pollInputSamples` ← `adapters/input.js#createInputPort`、`bootstrap.js#onBrowserFrame`。
- `createInputPort` ← `bootstrap.js#bootstrapV2`。
- `mapInputTimestampToTick` ← `adapters/input.js#normalizeInputSamples`。

## adapters/presentation.js

Phaser只表现，UI只发送UiAction。

[源码](../../src/v2/adapters/presentation.js)；层：`adapter`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createPresentationAdapter(mountElementId: untyped)` | `ViewHandle` | TODO | 建立相机/像素画面/HUD/小窝面板，不启动战斗物理。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `renderPresentation(view: untyped, snapshot: untyped)` | `void` | TODO | 按revision投影实体/模型弱点/LoRA表盘与菜单，不能改hp/cooldown。；；状态权限：仅写Phaser显示对象与DOM，不写核心状态 |
| `renderPixelFish(view: untyped, entity: untyped)` | `void` | TODO | 按09绘制拿铁盆的像素鲸鱼娘，瞄准360°，盆不自带格挡。；；状态权限：仅表现 |
| `renderModelEntity(view: untyped, entity: untyped)` | `void` | TODO | 七种Pets、棕蟹模型外壳/弱点、Bot穿障可读反馈。；；状态权限：仅表现 |
| `renderLoraGauge(view: untyped, snapshot: untyped)` | `void` | TODO | 只显示UI tick决定的指针与区域，不自行判定完美/失败。；；状态权限：仅表现 |
| `renderGamePanels(view: untyped, snapshot: untyped)` | `void` | TODO | 小窝/配装/插件3或4选/暂停/结算互斥面板；手机安全区与44px按钮。；；状态权限：仅表现 |
| `presentDomainEvents(view: untyped, events: untyped)` | `void` | TODO | 按eventId消费一次特效/表情/文字，不能回调伤害入口。；；状态权限：仅表现事件已消费账本 |
| `disposePresentationAdapter(view: untyped)` | `void` | TODO | 清理实体映射、tween、DOM与监听，重开不残留。；；状态权限：仅表现生命周期 |
| `createPresentationPort(view: untyped)` | `PresentationPort` | TODO | 将只读render/present/dispose绑定为注入端口。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `createPresentationAdapter` → 无内部公开函数。
- `renderPresentation` → `adapters/presentation.js#renderPixelFish`、`adapters/presentation.js#renderModelEntity`、`adapters/presentation.js#renderLoraGauge`、`adapters/presentation.js#renderGamePanels`。
- `renderPixelFish` → 无内部公开函数。
- `renderModelEntity` → 无内部公开函数。
- `renderLoraGauge` → 无内部公开函数。
- `renderGamePanels` → 无内部公开函数。
- `presentDomainEvents` → 无内部公开函数。
- `disposePresentationAdapter` → 无内部公开函数。
- `createPresentationPort` → `adapters/presentation.js#renderPresentation`、`adapters/presentation.js#presentDomainEvents`、`adapters/presentation.js#disposePresentationAdapter`。

公开函数上游：

- `createPresentationAdapter` ← `bootstrap.js#bootstrapV2`。
- `renderPresentation` ← `adapters/presentation.js#createPresentationPort`、`bootstrap.js#onBrowserFrame`。
- `renderPixelFish` ← `adapters/presentation.js#renderPresentation`。
- `renderModelEntity` ← `adapters/presentation.js#renderPresentation`。
- `renderLoraGauge` ← `adapters/presentation.js#renderPresentation`。
- `renderGamePanels` ← `adapters/presentation.js#renderPresentation`。
- `presentDomainEvents` ← `adapters/presentation.js#createPresentationPort`、`bootstrap.js#onBrowserFrame`。
- `disposePresentationAdapter` ← `adapters/presentation.js#createPresentationPort`。
- `createPresentationPort` ← `bootstrap.js#bootstrapV2`。

## adapters/storage.js

唯一真实存储I/O适配器，单记录CAS语义。

[源码](../../src/v2/adapters/storage.js)；层：`adapter`。

直接依赖：`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createStoragePort(key: untyped)` | `StoragePort` | 已实现 | 创建带revision的原子记录读写端口，具体选IndexedDB或单键localStorage实现。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `readStorageRecord(key: untyped)` | `Promise<Result<StorageRecord>>` | 已实现 | 读取原始记录并解析，坏档返回错误且不覆盖。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `compareAndSwapStorageRecord(key: untyped, expectedRevision: untyped, next: untyped)` | `Promise<Result<StorageRecord>>` | 已实现 | 原子校验revision并写整条Profile+checkpoint；并发冲突返回错误。；localStorage不具跨标签页CAS能力，若选它必须加可靠单写者协调；否则使用IndexedDB事务。；状态权限：唯一磁盘写者，不能拆余额/检查点两次写 |

公开函数下游：

- `createStoragePort` → `adapters/storage.js#compareAndSwapStorageRecord`、`adapters/storage.js#readStorageRecord`。
- `readStorageRecord` → 无内部公开函数。
- `compareAndSwapStorageRecord` → `domain/serialization.js#serializeCanonical`。

公开函数上游：

- `createStoragePort` ← `bootstrap.js#bootstrapV2`、`preview/host.js#mountCombatPreview`。
- `readStorageRecord` ← `adapters/storage.js#createStoragePort`。
- `compareAndSwapStorageRecord` ← `adapters/storage.js#createStoragePort`。

## application/game.js

游戏用例协调；只依赖核心和端口，不import具体浏览器适配器。

[源码](../../src/v2/application/game.js)；层：`application`。

直接依赖：`application/repository.js`、`content/catalog.js`、`domain/checkpoint.js`、`domain/clock.js`、`domain/difficulty.js`、`domain/profile/nest.js`、`domain/profile/tree.js`、`domain/settlement.js`、`domain/world/map.js`、`engine/session.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createApplication(options: untyped)` | `ApplicationHandle` | TODO | 建立局外档、会话、宿主时钟与持久化队列的唯一应用容器。；；状态权限：拥有应用容器与Profile当前revision；不直接编辑Session内部实体 |
| `startAdventure(app: untyped, request: untyped)` | `Result<GameSession>` | TODO | 校验出发→锁定树/DSH/难度/配装快照→创建新局，旧存档覆盖需明确命令。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `submitApplicationCommand(app: untyped, command: untyped)` | `Result<Command>` | TODO | 将UI/输入动作送入队列，禁止从表现回调重入同一个tick。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `advanceApplicationFrame(app: untyped, elapsedMs: untyped)` | `RenderSnapshot` | TODO | 按宿主调度执行世界/UI步，收集事件与持久化意图，再生成只读快照；无磁盘等待。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `queuePersistenceIntents(app: untyped, intents: untyped)` | `void` | TODO | 只把持久化请求排入串行工作队列，不在tick中写档。；；状态权限：仅写应用持久化待办队列 |
| `flushPersistenceQueue(app: untyped)` | `Promise<Result<StorageRecord>>` | TODO | tick之外串行读取最新Profile、合并请求、CAS一次提交，成功才确认意图。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `saveAdventureCheckpoint(app: untyped)` | `Promise<Result<StorageRecord>>` | TODO | 安全检查→完整快照→与局外档同记录提交，失败原档仍在。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `continueAdventure(app: untyped)` | `Promise<Result<GameSession>>` | TODO | 读有效checkpoint→校验→释放旧会话→恢复新暂停会话，等待继续。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `settleAdventure(app: untyped, outcome: untyped)` | `Promise<Result<StorageRecord>>` | TODO | 按runId生成结算与单写者计划，成功入账才确认结算；API撤回先安全检查。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `submitNestAction(app: untyped, action: untyped)` | `Promise<Result<StorageRecord>>` | TODO | 只在小窝分派树/设施/解锁/DSH装配操作，再原子保存。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `disposeApplication(app: untyped)` | `Promise<void>` | TODO | 先处理待提交事务状态，再释放会话和所有端口；失败不能宣称已保存。；；状态权限：释放应用与端口订阅，关闭后拒绝新命令 |
| `readApplicationView(app: untyped)` | `RenderSnapshot` | TODO | 读取当前小窝或活动会话的显示投影，外部不能修改Profile。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `drainApplicationEvents(app: untyped)` | `readonly DomainEvent[]` | TODO | 一个宿主帧只取一次表现事件批次，同一批交给画面和音频，不重复消费。；；状态权限：仅清应用表现outbox，不改变战斗世界 |
| `dispatchApplicationAction(app: untyped, action: untyped)` | `Promise<Result<ApplicationActionResult>>` | TODO | 小窝/继续/保存/撤回/退出用例的统一UI入口；活动战斗动作只排命令。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `createApplication` → `content/catalog.js#validateContentCatalog`、`domain/settlement.js#validateProfileRecord`、`domain/clock.js#createClockState`。
- `startAdventure` → `domain/profile/nest.js#validateStartRequest`、`domain/difficulty.js#resolveDifficultySnapshot`、`engine/session.js#createGameSession`。
- `submitApplicationCommand` → `engine/session.js#enqueueSessionCommand`。
- `advanceApplicationFrame` → `domain/clock.js#scheduleFrame`、`engine/session.js#stepSessionWorld`、`engine/session.js#stepSessionUi`、`application/game.js#queuePersistenceIntents`、`engine/session.js#readSessionView`、`domain/clock.js#resumeClock`。
- `queuePersistenceIntents` → 无内部公开函数。
- `flushPersistenceQueue` → `application/repository.js#readProfileRepository`、`application/repository.js#mergePersistenceIntents`、`application/repository.js#commitProfilePlan`。
- `saveAdventureCheckpoint` → `engine/session.js#readSessionState`、`domain/checkpoint.js#canCreateCheckpoint`、`domain/checkpoint.js#createCheckpoint`、`application/repository.js#commitProfilePlan`。
- `continueAdventure` → `application/repository.js#readProfileRepository`、`engine/session.js#restoreGameSession`、`engine/session.js#disposeGameSession`。
- `settleAdventure` → `engine/session.js#readSessionState`、`domain/world/map.js#isSafeForInteraction`、`domain/settlement.js#createSettlement`、`domain/settlement.js#planSettlementCommit`、`application/repository.js#commitProfilePlan`。
- `submitNestAction` → `domain/profile/tree.js#planTreePurchase`、`domain/profile/tree.js#planTreeRespec`、`domain/profile/nest.js#planFacilityPurchase`、`domain/profile/nest.js#planPermanentUnlock`、`domain/profile/nest.js#planDshEquipment`、`application/repository.js#commitProfilePlan`。
- `disposeApplication` → `application/game.js#flushPersistenceQueue`、`engine/session.js#disposeGameSession`。
- `readApplicationView` → `engine/session.js#readSessionView`。
- `drainApplicationEvents` → 无内部公开函数。
- `dispatchApplicationAction` → `application/game.js#startAdventure`、`application/game.js#continueAdventure`、`application/game.js#saveAdventureCheckpoint`、`application/game.js#settleAdventure`、`application/game.js#submitNestAction`、`application/game.js#submitApplicationCommand`、`application/game.js#disposeApplication`。

公开函数上游：

- `createApplication` ← `bootstrap.js#bootstrapV2`。
- `startAdventure` ← `application/game.js#dispatchApplicationAction`。
- `submitApplicationCommand` ← `application/game.js#dispatchApplicationAction`、`bootstrap.js#onBrowserFrame`、`bootstrap.js#onBrowserVisibility`。
- `advanceApplicationFrame` ← `bootstrap.js#onBrowserFrame`。
- `queuePersistenceIntents` ← `application/game.js#advanceApplicationFrame`。
- `flushPersistenceQueue` ← `application/game.js#disposeApplication`、`bootstrap.js#onBrowserFrame`。
- `saveAdventureCheckpoint` ← `application/game.js#dispatchApplicationAction`。
- `continueAdventure` ← `application/game.js#dispatchApplicationAction`。
- `settleAdventure` ← `application/game.js#dispatchApplicationAction`。
- `submitNestAction` ← `application/game.js#dispatchApplicationAction`。
- `disposeApplication` ← `application/game.js#dispatchApplicationAction`。
- `readApplicationView` ← `bootstrap.js#onBrowserFrame`。
- `drainApplicationEvents` ← `bootstrap.js#onBrowserFrame`。
- `dispatchApplicationAction` ← `bootstrap.js#onUiAction`。

## application/modProfile.js

Return a stable storage namespace for one exact content version and ordered mod lock.

[源码](../../src/v2/application/modProfile.js)；层：`domain`。

直接依赖：`application/repository.js`、`content/catalog.js`、`content/registry.js`、`domain/serialization.js`、`domain/settlement.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createModProfileNamespace(catalog: untyped)` | `string` | 已实现 | 以内容版本和完整模组锁生成独立存储键；档案仍核对完整锁，校验值不能代替锁。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `createModProfileSnapshot(catalog: untyped, base: untyped, source: untyped)` | `Result<Profile>` | 已实现 | 按用户选择从零或复制原版进度，剔除活动检查点并解锁当前组合的社区装备，创建独立档案快照。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `initializeModProfile(storage: untyped, catalog: untyped, base: untyped, source: untyped)` | `Promise<Result<StorageRecord>>` | 已实现 | 只对缺失的模组档案执行CAS创建；并发创建冲突时读取已存在的获胜档案，不覆盖。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createModProfileNamespace` → `content/catalog.js#validateContentCatalog`、`content/registry.js#createHandlerRegistry`、`domain/serialization.js#createDataDigest`。
- `createModProfileSnapshot` → `application/modProfile.js#createModProfileNamespace`、`content/catalog.js#validateContentCatalog`、`content/registry.js#createHandlerRegistry`、`domain/serialization.js#createDataDigest`、`domain/settlement.js#createDefaultProfile`、`domain/settlement.js#validateProfileRecord`。
- `initializeModProfile` → `application/modProfile.js#createModProfileSnapshot`、`application/repository.js#readProfileRepository`。

公开函数上游：

- `createModProfileNamespace` ← `application/modProfile.js#createModProfileSnapshot`、`preview/host.js#mountCombatPreview`。
- `createModProfileSnapshot` ← `application/modProfile.js#initializeModProfile`。
- `initializeModProfile` ← `preview/host.js#mountCombatPreview`。

## application/nest.js

Execute a nest command against the latest revision; recompute after CAS conflicts, never during a run.

[源码](../../src/v2/application/nest.js)；层：`domain`。

直接依赖：`application/repository.js`、`content/registry.js`、`content/skillCapabilities.js`、`content/weaponCapabilities.js`、`domain/difficulty.js`、`domain/profile/nest.js`、`domain/profile/tree.js`、`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `executeNestAction(storage: untyped, catalog: untyped, action: untyped)` | `Promise<Result<StorageRecord>>` | 已实现 | 读取最新Profile，拒绝活动冒险，规划购买/退款/建设/解锁/DSH并事务提交；CAS冲突最多重算三次。；仅无活动检查点的小窝可执行；冲突重读重算；状态权限：只经注入StoragePort事务修改Profile，不写Session |
| `prepareAdventureStart(profile: untyped, request: untyped, catalog: untyped, runId: untyped)` | `Result<StartSnapshot>` | 已实现 | 校验拥有、难度和档案范围并锁定装备/树/DSH；模组冒险附完整锁，Free引导保持原版。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `executeNestAction` → `application/repository.js#commitProfilePlan`、`application/repository.js#readProfileRepository`、`content/registry.js#createHandlerRegistry`、`domain/profile/nest.js#planDshEquipment`、`domain/profile/nest.js#planFacilityPurchase`、`domain/profile/nest.js#planPermanentUnlock`、`domain/profile/nest.js#planResidentRescue`、`domain/profile/tree.js#planTreePurchase`、`domain/profile/tree.js#planTreeRespec`。
- `prepareAdventureStart` → `content/registry.js#createHandlerRegistry`、`content/skillCapabilities.js#resolveSkillTemplate`、`content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/difficulty.js#resolveDifficultySnapshot`、`domain/profile/nest.js#validateStartRequest`、`domain/serialization.js#serializeCanonical`。

公开函数上游：

- `executeNestAction` ← `preview/nestManager.js#mountNestManager`。
- `prepareAdventureStart` ← `preview/host.js#mountCombatPreview`。

## application/replay.js

可复现录制/摘要入口，与真实session共用路径。

[源码](../../src/v2/application/replay.js)；层：`application`。

直接依赖：`domain/serialization.js`、`engine/session.js`、`engine/snapshot.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `beginRecording(state: untyped)` | `Recording` | 已实现 / isolated-replay | 复制当前完整状态、版本和初始摘要，建立无入队命令的录制分段。；；状态权限：独立数据或隔离Session；无Profile和持久化副作用 |
| `appendRecordedCommands(recording: untyped, commands: untyped)` | `Recording` | 已实现 / isolated-replay | 按实际成功入队顺序追加独立命令副本，拒绝重复ID/序号和超量。；；状态权限：独立数据或隔离Session；无Profile和持久化副作用 |
| `appendRecordingStep(recording: untyped, domain: untyped, advanceClock: untyped, state: untyped)` | `Recording` | 已实现 / isolated-replay | 记录世界/UI步、是否推进指针、命令边界和完整状态摘要；按步序区分同世界tick的多次UI操作。；；状态权限：独立数据或隔离Session；无Profile和持久化副作用 |
| `replayRecording(recording: untyped, catalog: untyped)` | `Result<readonly {tick:Tick;digest:string}[]>` | 已实现 / isolated-replay | 按原命令边界与时钟域执行真实Session，逐步核对摘要；首个分歧停止，始终释放句柄，不执行持久化意图。；；状态权限：独立数据或隔离Session；无Profile和持久化副作用 |

公开函数下游：

- `beginRecording` → `domain/serialization.js#serializeCanonical`、`engine/snapshot.js#createStateDigest`。
- `appendRecordedCommands` → `domain/serialization.js#serializeCanonical`。
- `appendRecordingStep` → `domain/serialization.js#serializeCanonical`、`engine/snapshot.js#createStateDigest`。
- `replayRecording` → `domain/serialization.js#serializeCanonical`、`engine/session.js#createReplaySession`、`engine/session.js#disposeGameSession`、`engine/session.js#enqueueSessionCommand`、`engine/session.js#readSessionState`、`engine/session.js#stepSessionUi`、`engine/session.js#stepSessionWorld`、`engine/snapshot.js#createStateDigest`。

公开函数上游：

- `beginRecording` ← 宿主/工具入口或待编排。
- `appendRecordedCommands` ← 宿主/工具入口或待编排。
- `appendRecordingStep` ← 宿主/工具入口或待编排。
- `replayRecording` ← 宿主/工具入口或待编排。

## application/repository.js

局外档与活动检查点的单写者事务入口。

[源码](../../src/v2/application/repository.js)；层：`application`。

直接依赖：`domain/checkpoint.js`、`domain/modScope.js`、`domain/profile/unlocks.js`、`domain/serialization.js`、`domain/settlement.js`、`versions.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `readProfileRepository(storage: untyped, catalog: untyped)` | `Promise<Result<StorageRecord>>` | 已实现 | 读取并验证完整档案范围；原版缺失时创建默认档，模组档案必须由用户显式创建。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `commitProfilePlan(storage: untyped, plan: untyped, catalog: untyped)` | `Promise<Result<StorageRecord>>` | 已实现 | 校验新旧档案的模组范围及revision后CAS提交；冲突重读，绝不跨范围覆盖。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `mergePersistenceIntents(profile: untyped, intents: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | 按发出顺序合并发现、解锁、存档和结算；模组范围及活动run必须匹配，已结算重复批次仅允许无变化重试。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `readProfileRepository` → `domain/settlement.js#createDefaultProfile`、`domain/settlement.js#validateProfileRecord`。
- `commitProfilePlan` → `domain/modScope.js#createProfileModScope`、`domain/modScope.js#equalModScopes`、`domain/serialization.js#serializeCanonical`、`domain/settlement.js#validateProfileRecord`。
- `mergePersistenceIntents` → `domain/checkpoint.js#validateCheckpoint`、`domain/modScope.js#createProfileModScope`、`domain/modScope.js#equalModScopes`、`domain/profile/unlocks.js#planAchievementUnlock`、`domain/profile/unlocks.js#planBossUnlock`、`domain/profile/unlocks.js#planDiscoveryUnlock`、`domain/profile/unlocks.js#planEasterUnlock`、`domain/profile/unlocks.js#planEndlessClear`、`domain/serialization.js#serializeCanonical`、`domain/settlement.js#planSettlementCommit`、`domain/settlement.js#validateProfileRecord`。

公开函数上游：

- `readProfileRepository` ← `application/game.js#flushPersistenceQueue`、`application/game.js#continueAdventure`、`application/modProfile.js#initializeModProfile`、`application/nest.js#executeNestAction`、`bootstrap.js#bootstrapV2`、`preview/host.js#mountCombatPreview`。
- `commitProfilePlan` ← `application/game.js#flushPersistenceQueue`、`application/game.js#saveAdventureCheckpoint`、`application/game.js#settleAdventure`、`application/game.js#submitNestAction`、`application/nest.js#executeNestAction`、`preview/host.js#mountCombatPreview`。
- `mergePersistenceIntents` ← `application/game.js#flushPersistenceQueue`、`preview/host.js#mountCombatPreview`。

## bootstrap.js

依赖组装入口；本次不接入旧main.js。

[源码](../../src/v2/bootstrap.js)；层：`bootstrap`。

直接依赖：`adapters/audio.js`、`adapters/input.js`、`adapters/presentation.js`、`adapters/storage.js`、`application/game.js`、`application/repository.js`、`content/catalog.js`、`content/registry.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `bootstrapV2(options: untyped)` | `Promise<BrowserRuntime>` | TODO | 加载目录、建立适配器与应用，注册宿主循环；未完成前不能从旧入口调用。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `onBrowserFrame(runtime: untyped, elapsedMs: untyped)` | `void` | TODO | 采样输入/排命令→推进帧→渲染/事件消费→在tick外调度持久化flush；不可重入。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `onBrowserVisibility(runtime: untyped, hidden: untyped)` | `void` | TODO | 后台发系统暂停并清输入/挂起音频；恢复等待确认，不补跑。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `onUiAction(runtime: untyped, action: untyped)` | `Promise<Result<ApplicationActionResult>>` | TODO | 接收表现层回传动作，交应用用例后把明确结果/错误交还UI；不改实体。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `bootstrapV2` → `content/catalog.js#loadContentCatalog`、`content/registry.js#createHandlerRegistry`、`content/catalog.js#validateContentCatalog`、`adapters/storage.js#createStoragePort`、`application/repository.js#readProfileRepository`、`adapters/input.js#createInputAdapter`、`adapters/presentation.js#createPresentationAdapter`、`adapters/audio.js#createAudioAdapter`、`application/game.js#createApplication`、`adapters/input.js#createInputPort`、`adapters/presentation.js#createPresentationPort`、`adapters/audio.js#createAudioPort`。
- `onBrowserFrame` → `application/game.js#readApplicationView`、`adapters/input.js#pollInputSamples`、`adapters/input.js#normalizeInputSamples`、`application/game.js#submitApplicationCommand`、`application/game.js#advanceApplicationFrame`、`application/game.js#drainApplicationEvents`、`adapters/presentation.js#renderPresentation`、`adapters/presentation.js#presentDomainEvents`、`adapters/audio.js#playAudioEvents`、`application/game.js#flushPersistenceQueue`。
- `onBrowserVisibility` → `application/game.js#submitApplicationCommand`、`adapters/input.js#clearHeldInput`、`adapters/audio.js#suspendAudio`。
- `onUiAction` → `application/game.js#dispatchApplicationAction`。

公开函数上游：

- `bootstrapV2` ← 宿主/工具入口或待编排。
- `onBrowserFrame` ← 宿主/工具入口或待编排。
- `onBrowserVisibility` ← 宿主/工具入口或待编排。
- `onUiAction` ← 宿主/工具入口或待编排。

## content/achievements.js

Stable achievement metadata shared by simulation evidence, Profile persistence and the nest collection.

[源码](../../src/v2/content/achievements.js)；层：`content`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|

公开函数下游：


公开函数上游：


## content/catalog.js

读取和验证版本化内容目录、原版绑定与受包锁约束的社区配方。

[源码](../../src/v2/content/catalog.js)；层：`content`。

直接依赖：`content/catalogData.js`、`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `loadContentCatalog()` | `ContentCatalog` | 已实现 | 返回来源于设计表格的正式版本化内容副本；数据存在不表示其处理器已经实现。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `validateContentCatalog(catalog: untyped, registry: untyped)` | `ValidationReport` | 已实现 | 校验原版目录数量、社区MCP/技能注册与包锁、稳定ID/引用、160点树前置DAG及运行能力声明。；27树节点、30局内插件、10DSH、16机制、6MCP、8技能、6伙伴、9敌人；覆盖1–15含11级双机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `findContentDefinition(catalog: untyped, definitionId: untyped)` | `Result<Definition>` | 已实现 | 按稳定ID取得定义；未知ID返回错误，不按显示名猜测。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `listContentByKind(catalog: untyped, kind: untyped)` | `readonly Definition[]` | 已实现 | 列出指定类别定义供候选/图鉴使用。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `loadContentCatalog` → 无内部公开函数。
- `validateContentCatalog` → `domain/serialization.js#serializeCanonical`。
- `findContentDefinition` → 无内部公开函数。
- `listContentByKind` → 无内部公开函数。

公开函数上游：

- `loadContentCatalog` ← `bootstrap.js#bootstrapV2`、`preview/host.js#mountCombatPreview`。
- `validateContentCatalog` ← `application/game.js#createApplication`、`application/modProfile.js#createModProfileNamespace`、`application/modProfile.js#createModProfileSnapshot`、`bootstrap.js#bootstrapV2`、`content/mods.js#composeModCatalog`、`engine/session.js#createGameSession`、`engine/session.js#createReplaySession`、`preview/host.js#mountCombatPreview`。
- `findContentDefinition` ← `domain/stats.js#deriveWeaponStats`、`domain/world/spawning.js#planEnemySpawn`。
- `listContentByKind` ← 宿主/工具入口或待编排。

## content/catalogData.js

content/catalogData.js

[源码](../../src/v2/content/catalogData.js)；层：`content`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|

公开函数下游：


公开函数上游：


## content/handlers/companions.js

companions逐项占位处理器；实际参数仍以玩法规格为准。

[源码](../../src/v2/content/handlers/companions.js)；层：`content-handler`。

直接依赖：`domain/companions.js`、`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planCompanionRice(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | companion_rice / 饭团：玩家生命低于 80% 时治疗 4；未满足条件不开始冷却；20 秒；随行；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planCompanionPatch(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | companion_patch / 补丁：清除玩家一次禁锢/减速；无法解技能或自身封禁；24 秒；随行；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planCompanionCache(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | companion_cache / 小缓存：生成可挡 8 伤的护盾，持续 5 秒，取最大值不叠加；18 秒；随行；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planCompanionRouter(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | companion_router / 路由员：向最近敌人发射 2 个追踪泡，每发 8 伤，600 范围，弹速 380；4 秒；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planCompanionDecoy(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | companion_decoy / 替身进程：放出 3 秒诱饵，吸引 300 内普通敌人；无爆炸；15 秒；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planCompanionRocket(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | companion_rocket / 小火箭：发射一枚瞄准最近目标的火箭，直击 16，爆炸半径 90、12 伤；不触发玩家基础命中插件；7 秒；700 范围；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planCompanionRice` → `domain/companions.js#planCompanionAbility`。
- `planCompanionPatch` → `domain/companions.js#planCompanionAbility`。
- `planCompanionCache` → `domain/companions.js#planCompanionAbility`。
- `planCompanionRouter` → `domain/companions.js#planCompanionAbility`。
- `planCompanionDecoy` → `domain/companions.js#planCompanionAbility`。
- `planCompanionRocket` → `domain/companions.js#planCompanionAbility`。

公开函数上游：

- `planCompanionRice` ← `dispatch/companions.js#dispatchCompanionsHandler`。
- `planCompanionPatch` ← `dispatch/companions.js#dispatchCompanionsHandler`。
- `planCompanionCache` ← `dispatch/companions.js#dispatchCompanionsHandler`。
- `planCompanionRouter` ← `dispatch/companions.js#dispatchCompanionsHandler`。
- `planCompanionDecoy` ← `dispatch/companions.js#dispatchCompanionsHandler`。
- `planCompanionRocket` ← `dispatch/companions.js#dispatchCompanionsHandler`。

## content/handlers/dsh.js

dsh逐项占位处理器；实际参数仍以玩法规格为准。

[源码](../../src/v2/content/handlers/dsh.js)；层：`content-handler`。

直接依赖：`domain/dshCycle.js`、`domain/dshEffects.js`、`domain/lora.js`、`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planDshClaudeAppeal(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | dsh_claude_appeal / 封禁申诉：难度1及以上首次击败Claude；技能/伙伴封禁持续时间×0.8；不缩短普通禁锢，不减少封印物命中数；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDshGptPreview(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | dsh_gpt_preview / 分支预览：难度1及以上首次击败ChatGPT；本局第一次插件选择由3张变4张；首选仍保证含蒸馏，另外3张正常抽；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDshGrokLicense(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | dsh_grok_license / 发射许可：难度1及以上首次击败Grok；每海域开始获得1枚储备火箭；下一次成功装备技能施放时发射，直击30、爆炸20、半径100；每海域只能消耗1次；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDshClaudeAllowlist(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | dsh_claude_allowlist / 白名单：难度10及以上首次击败Claude；出发前选择“保护技能”或“保护伙伴”，每海域免疫第一次该类封禁；不免疫禁锢；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDshGptBranch(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | 更新还是重置的DSH入口：仅装配生效；10秒开奖、300秒触发期，独立0.1%概率将剩余有效期重置为300秒。；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDshGrokSalvage(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | dsh_grok_salvage / 清场回收：难度10及以上首次击败Grok；每12次有正常奖励的真实敌人击杀，装填1枚储备火箭，最多存1枚；下次基础射击后发射，直击20、爆炸15、半径90，触发内置冷却8秒；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDshSleep(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | dsh_sleep / DeepSleep：彩蛋“深度摸鱼”：任一地图隐藏躺椅交互，连续坐满8秒有效时间；连续2秒不移动且不攻击时获得8护盾持续4秒，内置冷却20秒；暂停/面板不累计坐着或不动时间；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDshRice(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | dsh_rice / 开饭协议：彩蛋“饭点”：同一局找到3份不同地点的留言，打开隐藏饭盒并交互；实际治疗的溢出量50%转护盾，上限10、持续5秒；同名盾不叠加，护盾不触发治疗；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDshOpen(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | dsh_open / 开源接口：彩蛋“接口拼图”：同一局用3种不同MCP命中训练装置的3个接口，完成交互；第一海域第一个普通武器箱额外提供另一把标准品质MCP供选择；只能拿其中一把，不能把额外选项转零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDshLora(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | dsh_lora / LoRA微调：难度6及以上首次完整通关正式短途/远征（默认解锁条件）；每次实际升级触发一次指针训练：完美提高本局基础属性；欠拟合/过拟合降低该属性并分别附加负面效果，见下；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planDshClaudeAppeal` → `domain/plans.js#createEmptyPlan`。
- `planDshGptPreview` → `domain/dshEffects.js#planDshEffects`。
- `planDshGrokLicense` → `domain/dshEffects.js#planDshEffects`。
- `planDshClaudeAllowlist` → `domain/plans.js#createEmptyPlan`。
- `planDshGptBranch` → `domain/dshCycle.js#planDshCycleEvent`。
- `planDshGrokSalvage` → `domain/dshEffects.js#planDshEffects`。
- `planDshSleep` → `domain/dshEffects.js#planDshEffects`。
- `planDshRice` → `domain/dshEffects.js#planDshEffects`。
- `planDshOpen` → `domain/dshEffects.js#planDshEffects`。
- `planDshLora` → `domain/lora.js#planLoraLevel`。

公开函数上游：

- `planDshClaudeAppeal` ← 宿主/工具入口或待编排。
- `planDshGptPreview` ← `dispatch/dsh.js#dispatchDshHandler`。
- `planDshGrokLicense` ← `dispatch/dsh.js#dispatchDshHandler`。
- `planDshClaudeAllowlist` ← 宿主/工具入口或待编排。
- `planDshGptBranch` ← `dispatch/dsh.js#dispatchDshHandler`。
- `planDshGrokSalvage` ← `dispatch/dsh.js#dispatchDshHandler`。
- `planDshSleep` ← `dispatch/dsh.js#dispatchDshHandler`。
- `planDshRice` ← `dispatch/dsh.js#dispatchDshHandler`。
- `planDshOpen` ← `dispatch/dsh.js#dispatchDshHandler`。
- `planDshLora` ← `dispatch/dsh.js#dispatchDshHandler`。

## content/handlers/enemies.js

enemies逐项占位处理器；实际参数仍以玩法规格为准。

[源码](../../src/v2/content/handlers/enemies.js)；层：`content-handler`。

直接依赖：`domain/gptPets.js`、`domain/meleeAi.js`、`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planEnemyGptCodex(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | enemy_gpt_codex / Codex · 调度小工人：40 / 105 / 弹体8；停下举工具0.7秒后朝锁定方向发单枚工作泡，弹速200、冷却3秒；射击时不能移动，可趁停顿接近；8；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEnemyGptDewey(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | enemy_gpt_dewey / Dewey · 支援水滴：32 / 90 / 接触6；每5秒为220内一个受伤友军恢复8生命，预先连线1秒；不治疗自己、不跨阵营治疗，打断/击败即可中止；8；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEnemyGptFireball(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | enemy_gpt_fireball / Fireball · 区域封路：36 / 100 / 接触7；朝玩家当前位置投一团火，落点半径70预警1秒后形成3秒火区，每秒6伤；冷却5秒，可走出区域，不贴身自爆；8；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEnemyGptHoots(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | enemy_gpt_hoots / Hoots · 精准瞄准：30 / 75 / 弹体14；350–650距离瞄准线预警1.1秒，锁定后直线发弹、弹速400，冷却4秒；横移或利用礁石遮挡；8；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEnemyGptRocky(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | enemy_gpt_rocky / Rocky · 护队小石头：65 / 65 / 接触10；正面120°有可击破20耐久护盾，破盾后不再生；转身慢，背部可直接命中本体；数值显著低于Claude蟹；8；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEnemyGptSeedy(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | enemy_gpt_seedy / Seedy · 地形干扰：34 / 70 / 接触6；500内放半径65的藤圈，预警1秒、存在4秒，圈内减速25%而非禁锢；每6秒一次，最多2圈，可打掉中心嫩芽（10生命，无奖励）；8；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEnemyGptStacky(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | enemy_gpt_stacky / Stacky · 叠层输出：48 / 85 / 弹体7；初始三层，每损失16生命掉一层；每4秒发当前层数枚扇形弹，预警0.8秒；越受伤输出越少，掉层不变成新敌人、不重复结算；8；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEnemyClaudeGuard(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview | enemy_claude_guard / Claude · 棕蟹：180 / 80 / 接触24、重钳32；基础护甲0，缓慢贴近；Haiku无壳，其他模型外壳/破壳/弱点完整按08；双钳抬起0.9秒后前方70范围重击，冷却4秒，挥击后硬直0.8秒；接触与挥击同帧只取较高一次伤害；24；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEnemyGrokBot(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview | enemy_grok_bot / Grok · 群体Bot：14 / 125 / 接触5；只追赶和近身接触攻击；08指定低矮障碍可穿，高墙/锁门不可穿；从多个合法入口分批涌入，用数量堵住路线，不跳跃、不突进、不远射、不投火箭；4；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEnemyGptBsod(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | planEnemyGptBsod；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planEnemyGptNullSignal(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | planEnemyGptNullSignal；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planEnemyGptCodex` → `domain/gptPets.js#planGptPet`。
- `planEnemyGptDewey` → `domain/gptPets.js#planGptPet`。
- `planEnemyGptFireball` → `domain/gptPets.js#planGptPet`。
- `planEnemyGptHoots` → `domain/gptPets.js#planGptPet`。
- `planEnemyGptRocky` → `domain/gptPets.js#planGptPet`。
- `planEnemyGptSeedy` → `domain/gptPets.js#planGptPet`。
- `planEnemyGptStacky` → `domain/gptPets.js#planGptPet`。
- `planEnemyClaudeGuard` → `domain/meleeAi.js#planMeleeEnemy`。
- `planEnemyGrokBot` → `domain/meleeAi.js#planMeleeEnemy`。
- `planEnemyGptBsod` → `domain/gptPets.js#planGptPet`。
- `planEnemyGptNullSignal` → `domain/gptPets.js#planGptPet`。

公开函数上游：

- `planEnemyGptCodex` ← `dispatch/enemies.js#dispatchEnemiesHandler`。
- `planEnemyGptDewey` ← `dispatch/enemies.js#dispatchEnemiesHandler`。
- `planEnemyGptFireball` ← `dispatch/enemies.js#dispatchEnemiesHandler`。
- `planEnemyGptHoots` ← `dispatch/enemies.js#dispatchEnemiesHandler`。
- `planEnemyGptRocky` ← `dispatch/enemies.js#dispatchEnemiesHandler`。
- `planEnemyGptSeedy` ← `dispatch/enemies.js#dispatchEnemiesHandler`。
- `planEnemyGptStacky` ← `dispatch/enemies.js#dispatchEnemiesHandler`。
- `planEnemyClaudeGuard` ← `dispatch/enemies.js#dispatchEnemiesHandler`。
- `planEnemyGrokBot` ← `dispatch/enemies.js#dispatchEnemiesHandler`。
- `planEnemyGptBsod` ← `dispatch/enemies.js#dispatchEnemiesHandler`。
- `planEnemyGptNullSignal` ← `dispatch/enemies.js#dispatchEnemiesHandler`。

## content/handlers/mechanics.js

16个累计难度机制的逐项处理器。

[源码](../../src/v2/content/handlers/mechanics.js)；层：`content-handler`。

直接依赖：`domain/mechanics.js`、`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planMechanic01Exploration(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_01_exploration（解锁1）/ 正式探索与追兵：在正式连续地图启用驻守、区域目标和01的90秒追兵周期；与Free逐项教学分开；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic02Reinforcements(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_02_reinforcements（解锁2）/ 增援队列：标记遭遇的驻守预算分2–3批，批间隔4秒，入口至少提前1.5秒提示；只分配既有预算，不凭空增加奖励；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic03GptSupport(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_03_gpt_support（解锁3）/ GPT支援协同：Dewey优先治疗Hoots/Seedy等脆弱后排，Rocky在350内可移动到支援单位与玩家之间；各自原技能/冷却不变；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic04ClaudeBreak(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_04_claude_break（解锁4）/ Claude重钳破阵：普通/精英蟹重钳和Boss钳击可击破标记为可破坏的掩体；单次32伤重钳按等额耐久扣除，掩体初值30；其他不可破坏地形不受影响；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic05BossCombo(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_05_boss_combo（解锁5）/ 首领组合技：Boss可以用固定两招顺序衔接，第二招仍有完整预警；Claude钳制后普通挥击，GPT慢泡后区域标记，Grok招兵后单枚火箭；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic06AlarmCache(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_06_alarm_cache（解锁6）/ 警报资源箱：每海域放1个可选警报箱，交互前告知风险；打开后从合法入口产生一场增援，箱内提供2把MCP择1，品质至少增强；该箱与增援各仅结算一次；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic07Tide(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_07_tide（解锁7）/ 周期潮汐：标记水道每30秒切换水流方向，提前3秒箭头预警，水流额外速度60；同样影响可移动敌人，不叠加至超过基础移速的1.8倍；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic08GrokFlanks(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_08_grok_flanks（解锁8）/ Grok两翼合围：群体遭遇预算从两个视野外入口错时入场，间隔2秒；入口布局必须留出至少120宽的可突破通路；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic09GptReposition(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_09_gpt_reposition（解锁9）/ GPT换位保护：支援/远射Pet在玩家120内时向已验证可通行的后撤点移动，最多移动180；Rocky随后保护它，重新站定后再按原预警攻击；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic10BossArena(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_10_boss_arena（解锁10）/ 首领利用场地：Claude场内部署可破掩体；GPT重置节点从5个可见可达候选位置按seed选3个且不重复；Grok招兵在3个合法入口中轮换选2个；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic11ObjectiveSignal(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_11_objective_signal（解锁11）/ 目标增援信号：信标/封锁目标启动后产生1个可见信号装置，生命40；每6秒请求一小批预算内援军，摧毁后停止本次装置增援；增援仍受活敌与入口规则约束；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic11Glasswing(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_11_glasswing（解锁11）/ Claude · Project Glasswing：Claude Boss的控制请求按08进行双倍处理：禁锢时长和挣脱次数×2，技能/伙伴封禁时长×2；不复制伤害/实体/封印物；只声明Glasswing适用/标记；真正控制翻倍唯一在status.resolveControlRequest处理，不抢先再乘一次。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic12GptFourRoles(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_12_gpt_four_roles（解锁12）/ GPT四职能混编：GPT特色遭遇允许同时4种Pets，普通遭遇仍最多3种；应组合前排/支援/远程/干扰，不允许同屏放满7种；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic13Handoff(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_13_handoff（解锁13）/ 遭遇衔接：玩家激活过的精英事件剩余生命/成员总量降至20%时，可提前预告下一批正常追兵，至少3秒后从合法入口进入；只提前原日程，不复制队伍或奖励；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic14Anomaly(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_14_anomaly（解锁14）/ 局部地图异常：每海域最多2次，间隔至少120秒；提前4秒预告，局部潮流反向或标记捷径临时关闭12秒；两种择1，发生在有替代路线的区域；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMechanic15Integration(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | mech_15_integration（解锁15）/ 分段综合压力：每海域设计1个三段遭遇：各段调用两项已经解锁、适用此处的机制，每段最长30秒后停止补兵，清掉必要敌人后进入15秒低压衔接；第三段后正常完成目标；必须已在start.mechanicIds且适用当前场景；返回计划，不直接增兵或递归调度。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planMechanic01Exploration` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic02Reinforcements` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic03GptSupport` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic04ClaudeBreak` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic05BossCombo` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic06AlarmCache` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic07Tide` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic08GrokFlanks` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic09GptReposition` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic10BossArena` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic11ObjectiveSignal` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic11Glasswing` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic12GptFourRoles` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic13Handoff` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic14Anomaly` → `domain/mechanics.js#planMechanicEvent`。
- `planMechanic15Integration` → `domain/mechanics.js#planMechanicEvent`。

公开函数上游：

- `planMechanic01Exploration` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic02Reinforcements` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic03GptSupport` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic04ClaudeBreak` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic05BossCombo` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic06AlarmCache` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic07Tide` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic08GrokFlanks` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic09GptReposition` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic10BossArena` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic11ObjectiveSignal` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic11Glasswing` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic12GptFourRoles` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic13Handoff` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic14Anomaly` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。
- `planMechanic15Integration` ← `dispatch/mechanics.js#dispatchMechanicsHandler`。

## content/handlers/models.js

四档模型逐项接口，Fable/Mythos分别可追溯。

[源码](../../src/v2/content/handlers/models.js)；层：`content-handler`。

直接依赖：`domain/modelProfiles.js`、`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planModelClaudeHaiku(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | Haiku无外壳，无额外基础能力。；同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planModelClaudeSonnet(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | Sonnet全向可伤外壳，破壳一次眩晕后加速。；同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planModelClaudeOpus(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | Opus壳仅侧后270度可伤，破后继承眩晕/加速。；同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planModelClaudeFable(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | API Fable更大、背部120度弱点、破壳不晕并加速。；同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planModelClaudeMythos(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | API Mythos与Fable初值相同但显示名不同，不擅加新强弱。；同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planModelGptAstra(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | Pro七种Pet基础技能；种类和模型profile分离。；同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planModelGptSol(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | Max5x按08逐Pet添加招式扩展，不提前开四种编组。；同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planModelGptTerra(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | Max20x继承Sol，逐Pet强化支援/区域/掉层等行为。；同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planModelGptLuna(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | API继承Terra并开启08指定额外行为，假身/种子不发奖励。；同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planModelGrokBot(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | Grok各档保持同一种Bot基础行为和指定低矮穿障profile，不获得高级技能。；同名参数按profile覆盖一次，禁止把低档/高档两套招式同时复制执行；不清除累计难度机制。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planModelClaudeHaiku` → `domain/modelProfiles.js#planModelProfile`。
- `planModelClaudeSonnet` → `domain/modelProfiles.js#planModelProfile`。
- `planModelClaudeOpus` → `domain/modelProfiles.js#planModelProfile`。
- `planModelClaudeFable` → `domain/modelProfiles.js#planModelProfile`。
- `planModelClaudeMythos` → `domain/modelProfiles.js#planModelProfile`。
- `planModelGptAstra` → `domain/modelProfiles.js#planModelProfile`。
- `planModelGptSol` → `domain/modelProfiles.js#planModelProfile`。
- `planModelGptTerra` → `domain/modelProfiles.js#planModelProfile`。
- `planModelGptLuna` → `domain/modelProfiles.js#planModelProfile`。
- `planModelGrokBot` → `domain/modelProfiles.js#planModelProfile`。

公开函数上游：

- `planModelClaudeHaiku` ← `dispatch/models.js#dispatchModelsHandler`。
- `planModelClaudeSonnet` ← `dispatch/models.js#dispatchModelsHandler`。
- `planModelClaudeOpus` ← `dispatch/models.js#dispatchModelsHandler`。
- `planModelClaudeFable` ← `dispatch/models.js#dispatchModelsHandler`。
- `planModelClaudeMythos` ← `dispatch/models.js#dispatchModelsHandler`。
- `planModelGptAstra` ← `dispatch/models.js#dispatchModelsHandler`。
- `planModelGptSol` ← `dispatch/models.js#dispatchModelsHandler`。
- `planModelGptTerra` ← `dispatch/models.js#dispatchModelsHandler`。
- `planModelGptLuna` ← `dispatch/models.js#dispatchModelsHandler`。
- `planModelGrokBot` ← `dispatch/models.js#dispatchModelsHandler`。

## content/handlers/plugins.js

plugins逐项占位处理器；实际参数仍以玩法规格为准。

[源码](../../src/v2/content/handlers/plugins.js)；层：`content-handler`。

直接依赖：`domain/combatPlugins.js`、`domain/distill.js`、`domain/entities.js`、`domain/plans.js`、`domain/projectiles.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planPluginParallel(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_parallel / 并行调用：每 0.4 秒最多一次基础射击增加左右各一枚 ±12° 投射物，各 0.40W→0.60W；新增弹为 secondary；两条分叉射流；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginBatch(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_batch / 批量处理：每 8→6 次基础武器命中，在目标处爆炸，半径 85，伤害 18；内置冷却 0.5 秒；命中计数与范围圆环；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginCompress(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_compress / 上下文压缩：基础武器射程 ×0.75，武器伤害 +30%→+45%；回旋转折距离同步 ×0.75；泡泡更浓、更短；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginCache(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_cache / 缓存命中：连续命中同一目标 3 次后，基础武器对其额外伤害 +20%→+35%，持续 2 秒；切目标即清层，刷新不叠乘；目标上缓存方块；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginRetry(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_retry / 自动重试：主投射物到期且一次未命中时，向 450 范围最近敌人补一发 0.5W→0.8W 追踪泡；内置冷却 1.5 秒；失败泡泡回转；只重试一次；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginTemperature(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_temperature / 温度采样：每次基础射击 15%→25% 概率变成大泡，主弹伤害 ×1.6、半径 ×1.3；整组只掷一次；变大、有表情的泡泡；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginCollect(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview | plugin_collect / 大白饭回收：大白饭吸附半径 +80→+140；不会加经验倍率或资源收入；吸附范围与颗粒拖尾；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginCooldown(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_cooldown / 空闲算力：连续 3 秒未射击时，装备主动技能剩余冷却每秒额外减少 0.5→0.8 秒；不影响其他计时；技能图标上空闲脉冲；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginOffload(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_offload / 卸载缓存：冲刺结束留下一片半径 75、持续 2 秒尾流，敌人每 0.5 秒受 5→8 伤；同敌每次尾流最多 4 跳；水下尾流；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginKeepalive(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_keepalive / 心跳保活：每 12→9 秒获得 6 护盾，持续 4 秒；同名护盾只刷新，不能囤积；节拍护盾；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginRedirect(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_redirect / 请求转发：基础主投射物首次命中后可弹向 180→260 内另一敌人，伤害 0.5W，最多一次；原生穿透/回旋不再附加转发；折线连接；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginBackoff(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_backoff / 指数退避：实际失去生命后移速 +25%→+35%，持续 2 秒；内置冷却 4 秒，不叠层；受击后加速残影；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginDistill(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview | plugin_distill / 蒸馏：击败敌人积累样本并获取对应属性/派生技能；2级降低所需样本，详见 §6；样本吸收、三条来源进度；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPlugin5h(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview | plugin_5h / 5h限制：每个敌人滚动 10 秒内最多造成 18→12 点防御前伤害，详见 §7；敌人额度条与“已限流”印章；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginFailover(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_failover / 故障转移：每 18→12 秒第一次被禁锢时立即解除，并在 180 范围造成 20 伤；不解除技能/伙伴封禁；封锁碎裂、插件亮起；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginSandbox(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_sandbox / 沙箱隔离：基础武器命中使敌人减速 25%，持续 1.2→2 秒；Boss 效果减半，同名只刷新；明确减速边框；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginHallucination(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_hallucination / 哪来的电脑病毒（幻觉）：使用装备主动技能后生成 3→5 秒鱼形诱饵，吸引 350 内普通敌人；内置冷却 10 秒；半透明笨鱼替身；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginChain(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_chain / 链式调用：每 6→4 次基础武器命中释放一次电链，依次打至多 3 个不同敌人，每次跳距 180，每目标 12 伤；内置冷却 1 秒；三段清晰电链；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginContext(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_context / 长上下文：连续射击时每秒武器伤害 +3%，上限 +18%→+30%；停止射击 1 秒后清空；不是命中叠层；连续输出计量条；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginHotplug(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_hotplug / 热插拔：切 MCP 时发出半径 160 的冲击，造成 25→40 伤并推开普通敌人；内置冷却 6 秒；武器插拔环形波；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginGuard(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview | plugin_guard / 安全对齐：单次防御前伤害达到 20 时获得额外 20→30% 减伤；逐次计算，不截断更小攻击；大伤害护甲闪光；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginPrefill(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_prefill / 预填充：装备主动技能就绪且满 2 秒后，下一次施放效果强化：伤害/护盾/治疗 ×1.4→×1.65；无这些数值的技能持续时间 ×1.25→×1.4；技能就绪蓄满光圈；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginToolchain(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_toolchain / 工具链：使用装备主动技能后的下 3→5 次基础射击，各增加一枚 0.75W 的追踪泡；一次施放刷新次数，不累积；技能后跟随射击；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginMirror(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_mirror / 镜像部署：伙伴产生一次攻击/治疗/护盾后复制该效果的 40%→60%，延迟 0.3 秒，内置冷却 5 秒；诱饵伙伴改为延长 1→2 秒；小镜像伙伴闪现；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginRecursion(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_recursion / 递归：施放批量处理/缓存护盾/沙箱时，0.8 秒后在原位置再执行一次 60%→85% 效果；其他技能复制其无控制的伤害/护盾/治疗部分，若都没有则延长持续 40%→60%；内置冷却 12 秒；第二层调用轮廓；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginMoe(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_moe / 混合专家：每 4→3 次基础射击，按瞄准方向额外发射携带的另一把 MCP 的一组攻击，每枚伤害为它基础伤害的 45%；两把武器冷却独立，不消耗非当前武器冷却；两把 MCP 同时现形；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginSpeculate(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_speculate / 推测执行：冲刺开始后 1 秒内下一次基础射击增加 3 发扇形 0.6W→0.9W 的穿透影泡，每发最多命中 2 个敌人；冲刺后展开巨大扇面；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginWindow(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_window / 窗口溢出：每拾取累计 120→90 大白饭，装备主动技能冷却减少 3 秒并向最近敌人发一枚 25 伤追踪泡；每 tick 最多 1 次，其余次数排队；经验条溢出发射；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginAgent(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_agent / Agent 协作：伙伴每次非镜像能力结束后，装备主动技能剩余冷却减少 1.5→2.5 秒；施放装备技能使伙伴剩余冷却减少 2 秒；双向各有 4 秒内置冷却；玩家与伙伴连线；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginBreaker(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | plugin_breaker / 越狱：每 20→14 秒第一次技能/伙伴封禁命中时立即解除该次封禁；3 秒内所有玩家伤害 +25%；不能破坏 Boss 重置条件；封禁印章反弹；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginLocalDeploy(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | planPluginLocalDeploy；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planPluginQuantInt4(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | planPluginQuantInt4；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planPluginRollbackEmergency(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | planPluginRollbackEmergency；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planPluginParallel` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/projectiles.js#createWeaponProjectile`、`domain/stats.js#derivePlayerStats`。
- `planPluginBatch` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginCompress` → `domain/plans.js#createEmptyPlan`。
- `planPluginCache` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginRetry` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginTemperature` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginCollect` → `domain/plans.js#createEmptyPlan`。
- `planPluginCooldown` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginOffload` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginKeepalive` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginRedirect` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginBackoff` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginDistill` → `domain/distill.js#planDistillEvent`。
- `planPlugin5h` → `domain/plans.js#createEmptyPlan`。
- `planPluginFailover` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginSandbox` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginHallucination` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginChain` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginContext` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginHotplug` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginGuard` → `domain/plans.js#createEmptyPlan`。
- `planPluginPrefill` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginToolchain` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginMirror` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginRecursion` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginMoe` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginSpeculate` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginWindow` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginAgent` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginBreaker` → `domain/combatPlugins.js#planCombatPluginEvent`。
- `planPluginLocalDeploy` → `domain/plans.js#createEmptyPlan`。
- `planPluginQuantInt4` → `domain/plans.js#createEmptyPlan`。
- `planPluginRollbackEmergency` → `domain/plans.js#createEmptyPlan`。

公开函数上游：

- `planPluginParallel` ← `dispatch/plugins.js#dispatchPluginsHandler`、`engine/hooks.js#planEventHooks`。
- `planPluginBatch` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginCompress` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginCache` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginRetry` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginTemperature` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginCollect` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginCooldown` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginOffload` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginKeepalive` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginRedirect` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginBackoff` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginDistill` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPlugin5h` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginFailover` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginSandbox` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginHallucination` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginChain` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginContext` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginHotplug` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginGuard` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginPrefill` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginToolchain` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginMirror` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginRecursion` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginMoe` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginSpeculate` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginWindow` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginAgent` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginBreaker` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginLocalDeploy` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginQuantInt4` ← `dispatch/plugins.js#dispatchPluginsHandler`。
- `planPluginRollbackEmergency` ← `dispatch/plugins.js#dispatchPluginsHandler`。

## content/handlers/skills.js

skills逐项占位处理器；实际参数仍以玩法规格为准。

[源码](../../src/v2/content/handlers/skills.js)；层：`content-handler`。

直接依赖：`domain/abilities.js`、`domain/geometry.js`、`domain/motionSolver.js`、`domain/plans.js`、`domain/shields.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planSkillDisconnect(context: untyped)` | `EffectPlan` | 已实现 / core-preview | skill_disconnect / 断开连接：清除自身禁锢/减速，沿瞄准方向推开 180 范围普通敌人 120 距离；不解除技能封禁，也不能在被封禁时施放；12；初始；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planSkillCache(context: untyped)` | `EffectPlan` | 已实现 / core-preview | skill_cache / 缓存护盾：获得 25 护盾持续 5 秒；护盾不叠加，刷新取较大剩余值；16；6 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planSkillBatch(context: untyped)` | `EffectPlan` | 已实现 | skill_batch / 仿佛看到原子弹爆炸（批量处理）：瞄准方向 400 内、半径 130 的区域在 0.6 秒后爆发 65 伤；有清晰预警；12；8 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planSkillRedirect(context: untyped)` | `EffectPlan` | 已实现 | skill_redirect / 重定向：1.2 秒内将触及半径 90 的可反射敌弹转为朝瞄准方向的己方弹，每枚 15 伤，最多 12 枚；火箭/光束不可反射；15；10 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planSkillSandbox(context: untyped)` | `EffectPlan` | 已实现 | skill_sandbox / 沙箱：瞄准位置放置半径 160、持续 4 秒的区域，普通敌人移速 -50%，Boss -20%；14；8 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planSkillFork(context: untyped)` | `EffectPlan` | 已实现 | skill_fork / 分叉进程：生成持续 4 秒的鱼形诱饵，吸引 450 内非 Boss 普通敌人；结束在 100 范围爆发 25 伤；18；10 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planSkillRollback(context: untyped)` | `EffectPlan` | 已实现 | skill_rollback / 回滚：回到 2 秒前的合法位置，恢复这 2 秒实际失去生命的 40%，上限 15；不恢复资源/护盾/冷却，不复活；目标不合法则就近找点；20；12 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planSkillOverclock(context: untyped)` | `EffectPlan` | 已实现 | skill_overclock / 用户彻底怒了（超频）：4 秒内基础射击间隔 ×0.65、移速 +10%；不影响插件/伙伴内置冷却；18；12 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planSkillDisconnect` → `domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/motionSolver.js#resolveBodyDestination`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planSkillCache` → `domain/shields.js#planShieldGrant`。
- `planSkillBatch` → `domain/abilities.js#planEquippedAbility`。
- `planSkillRedirect` → `domain/abilities.js#planEquippedAbility`。
- `planSkillSandbox` → `domain/abilities.js#planEquippedAbility`。
- `planSkillFork` → `domain/abilities.js#planEquippedAbility`。
- `planSkillRollback` → `domain/abilities.js#planEquippedAbility`。
- `planSkillOverclock` → `domain/abilities.js#planEquippedAbility`。

公开函数上游：

- `planSkillDisconnect` ← `dispatch/skills.js#dispatchSkillsHandler`。
- `planSkillCache` ← `dispatch/skills.js#dispatchSkillsHandler`。
- `planSkillBatch` ← `dispatch/skills.js#dispatchSkillsHandler`。
- `planSkillRedirect` ← `dispatch/skills.js#dispatchSkillsHandler`。
- `planSkillSandbox` ← `dispatch/skills.js#dispatchSkillsHandler`。
- `planSkillFork` ← `dispatch/skills.js#dispatchSkillsHandler`。
- `planSkillRollback` ← `dispatch/skills.js#dispatchSkillsHandler`。
- `planSkillOverclock` ← `dispatch/skills.js#dispatchSkillsHandler`。

## content/handlers/weapons.js

六把MCP的真实行为入口，共用经过模板校验的弹体管线。

[源码](../../src/v2/content/handlers/weapons.js)；层：`content-handler`。

直接依赖：`content/weaponCapabilities.js`、`domain/plans.js`、`domain/projectiles.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planWeaponBubble(context: untyped)` | `EffectPlan` | 已实现 / core-preview | mcp_bubble / 标准输出 · 泡泡接口：1 发泡泡，伤害 12，弹速 600，半径 7，命中消失；0.32 秒；720；初始；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planWeaponFan(context: untyped)` | `EffectPlan` | 已实现 / core-preview | mcp_fan / 多模态 · 扇面接口：5 发，每发 5 伤，扇面总夹角 32°，弹速 550，半径 5；0.70 秒；460；6 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planWeaponVector(context: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | mcp_vector / 向量检索 · 穿透接口：1 发 24 伤，弹速 900，半径 5，最多命中 4 个不同敌人；0.65 秒；900；8 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planWeaponStream(context: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | mcp_stream / 流式输出 · 连发接口：按住每次发 1 个 4 伤微泡，弹速 700，半径 4；0.10 秒；600；8 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planWeaponReturn(context: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | mcp_return / 回调函数 · 回旋接口：1 枚 18 伤回旋泡，弹速 420；到 340 距离后回追发射者，去/回各可命中同敌一次，2 秒到期；0.85 秒；最大离发射点 500；10 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planWeaponBatch(context: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | mcp_batch / 批处理 · 爆破接口：1 枚慢泡，直击 20，爆炸半径 100 造成 12；直击目标可受两段，弹速 350，半径 10；1.10 秒；600；12 零件；仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planWeaponBubble` → `content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/projectiles.js#planNativeProjectiles`。
- `planWeaponFan` → `content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/projectiles.js#planNativeProjectiles`。
- `planWeaponVector` → `content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/projectiles.js#planNativeProjectiles`。
- `planWeaponStream` → `content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/projectiles.js#planNativeProjectiles`。
- `planWeaponReturn` → `content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/projectiles.js#planNativeProjectiles`。
- `planWeaponBatch` → `content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/projectiles.js#planNativeProjectiles`。

公开函数上游：

- `planWeaponBubble` ← `dispatch/weapons.js#dispatchWeaponsHandler`。
- `planWeaponFan` ← `dispatch/weapons.js#dispatchWeaponsHandler`。
- `planWeaponVector` ← `dispatch/weapons.js#dispatchWeaponsHandler`。
- `planWeaponStream` ← `dispatch/weapons.js#dispatchWeaponsHandler`。
- `planWeaponReturn` ← `dispatch/weapons.js#dispatchWeaponsHandler`。
- `planWeaponBatch` ← `dispatch/weapons.js#dispatchWeaponsHandler`。

## content/mods.js

Versioned declarative mod SDK. No dynamic code, global registry mutation or host access.

[源码](../../src/v2/content/mods.js)；层：`content`。

直接依赖：`content/catalog.js`、`content/registry.js`、`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `parseModPackage(text: untyped, base: untyped)` | `ModPackage` | 已实现 | 校验SDK1.0–1.3、依赖、补丁、武器和护盾/爆发技能配方；拒绝未知字段及越界参数。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolveModLoadOrder(packs: untyped)` | `readonly ModPackage[]` | 已实现 | 检查精确依赖版本与冲突，生成稳定拓扑顺序，拒绝依赖环。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `composeModCatalog(base: untyped, packs: untyped)` | `ContentCatalog` | 已实现 | 复核并排序启用包，以独立目录合成武器/技能和补丁，验证字段冲突、命名空间、包锁及指纹。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `parseModPackage` → `content/registry.js#createHandlerRegistry`、`domain/serialization.js#serializeCanonical`。
- `resolveModLoadOrder` → 无内部公开函数。
- `composeModCatalog` → `content/catalog.js#validateContentCatalog`、`content/mods.js#parseModPackage`、`content/mods.js#resolveModLoadOrder`、`content/registry.js#createHandlerRegistry`、`domain/serialization.js#createDataDigest`、`domain/serialization.js#serializeCanonical`。

公开函数上游：

- `parseModPackage` ← `content/mods.js#composeModCatalog`、`preview/modManager.js#mountModManager`。
- `resolveModLoadOrder` ← `content/mods.js#composeModCatalog`。
- `composeModCatalog` ← `preview/modManager.js#mountModManager`。

## content/registry.js

所有内容ID到显式处理器绑定；不构造假可用实例。

[源码](../../src/v2/content/registry.js)；层：`content`。

直接依赖：`content/catalogData.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createHandlerRegistry()` | `HandlerRegistry` | 已实现 | 返回100项设计绑定与显式implementedIds能力集合，不把未实现条目声明为可运行。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `createHandlerRegistry` → 无内部公开函数。

公开函数上游：

- `createHandlerRegistry` ← `application/modProfile.js#createModProfileNamespace`、`application/modProfile.js#createModProfileSnapshot`、`application/nest.js#executeNestAction`、`application/nest.js#prepareAdventureStart`、`bootstrap.js#bootstrapV2`、`content/mods.js#parseModPackage`、`content/mods.js#composeModCatalog`、`domain/draft.js#createPluginChoice`、`engine/session.js#createGameSession`、`engine/session.js#createReplaySession`、`preview/host.js#mountCombatPreview`、`preview/nestManager.js#mountNestManager`。

## content/skillCapabilities.js

Resolve an implemented native skill, or a declarative community recipe owned by a locked package.

[源码](../../src/v2/content/skillCapabilities.js)；层：`content`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveSkillTemplate(catalog: untyped, id: untyped)` | `SkillTemplateId\|null` | 已实现 / core-preview + adventure-slice | 将原版技能或有包锁的社区护盾/爆发配方解析到真实原生行为；未知/未注册返回null。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `listRuntimeSkills(catalog: untyped)` | `readonly string[]` | 已实现 / core-preview + adventure-slice | 列出当前目录确有原生处理器的技能，供Free练习装配菜单选择。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `resolveSkillTemplate` → 无内部公开函数。
- `listRuntimeSkills` → `content/skillCapabilities.js#resolveSkillTemplate`。

公开函数上游：

- `resolveSkillTemplate` ← `application/nest.js#prepareAdventureStart`、`content/skillCapabilities.js#listRuntimeSkills`、`dispatch/skills.js#dispatchSkillsHandler`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/draft.js#createPluginChoice`、`domain/equipment.js#planSkillPickup`、`domain/initial.js#createInitialGameState`、`domain/stateValidation.js#inspectGameState`、`engine/snapshot.js#createRenderSnapshot`。
- `listRuntimeSkills` ← `preview/host.js#mountCombatPreview`、`preview/nestManager.js#mountNestManager`。

## content/weaponCapabilities.js

Resolve native behavior for an official weapon or an explicitly registered community recipe.

[源码](../../src/v2/content/weaponCapabilities.js)；层：`content`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveWeaponTemplate(catalog: untyped, id: untyped)` | `WeaponTemplateId\|null` | 已实现 | 原版六MCP或已锁定社区配方解析为真实原生行为，不执行任意脚本。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `listRuntimeWeapons(catalog: untyped)` | `readonly string[]` | 已实现 | 列出实际可运行的原版与社区MCP，供练习出发选择。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `resolveWeaponTemplate` → 无内部公开函数。
- `listRuntimeWeapons` → `content/weaponCapabilities.js#resolveWeaponTemplate`。

公开函数上游：

- `resolveWeaponTemplate` ← `application/nest.js#prepareAdventureStart`、`content/handlers/weapons.js#planWeaponBubble`、`content/handlers/weapons.js#planWeaponFan`、`content/handlers/weapons.js#planWeaponVector`、`content/handlers/weapons.js#planWeaponStream`、`content/handlers/weapons.js#planWeaponReturn`、`content/handlers/weapons.js#planWeaponBatch`、`content/weaponCapabilities.js#listRuntimeWeapons`、`dispatch/weapons.js#dispatchWeaponsHandler`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/draft.js#createPluginChoice`、`domain/equipment.js#planWeaponPickup`、`domain/initial.js#createInitialGameState`、`domain/projectiles.js#createWeaponProjectile`、`domain/stateValidation.js#inspectGameState`、`preview/host.js#mountCombatPreview`。
- `listRuntimeWeapons` ← `preview/host.js#mountCombatPreview`、`preview/nestManager.js#mountNestManager`。

## dispatch/companions.js

伙伴稳定ID分派，不得把所有候选处理器依次执行。

[源码](../../src/v2/dispatch/companions.js)；层：`dispatch`。

直接依赖：`content/handlers/companions.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `dispatchCompanionsHandler(context: untyped, definitionId: untyped, event: untyped)` | `EffectPlan` | 已实现 | 按合法稳定id和已实现绑定只调用一个对应处理器。；@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `dispatchCompanionsHandler` → `content/handlers/companions.js#planCompanionCache`、`content/handlers/companions.js#planCompanionDecoy`、`content/handlers/companions.js#planCompanionPatch`、`content/handlers/companions.js#planCompanionRice`、`content/handlers/companions.js#planCompanionRocket`、`content/handlers/companions.js#planCompanionRouter`。

公开函数上游：

- `dispatchCompanionsHandler` ← `domain/ai.js#planCompanionAi`。

## dispatch/dsh.js

DSH稳定ID分派，不得把所有候选处理器依次执行。

[源码](../../src/v2/dispatch/dsh.js)；层：`dispatch`。

直接依赖：`content/handlers/dsh.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `dispatchDshHandler(context: untyped, definitionId: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview | 按合法稳定id和已实现绑定只调用一个对应处理器。；@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `dispatchDshHandler` → `content/handlers/dsh.js#planDshGptBranch`、`content/handlers/dsh.js#planDshGptPreview`、`content/handlers/dsh.js#planDshGrokLicense`、`content/handlers/dsh.js#planDshGrokSalvage`、`content/handlers/dsh.js#planDshLora`、`content/handlers/dsh.js#planDshOpen`、`content/handlers/dsh.js#planDshRice`、`content/handlers/dsh.js#planDshSleep`。

公开函数上游：

- `dispatchDshHandler` ← 宿主/工具入口或待编排。

## dispatch/enemies.js

普通敌人稳定ID分派，不得把所有候选处理器依次执行。

[源码](../../src/v2/dispatch/enemies.js)；层：`dispatch`。

直接依赖：`content/handlers/enemies.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `dispatchEnemiesHandler(context: untyped, definitionId: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | 按合法稳定id和已实现绑定只调用一个对应处理器。；@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `dispatchEnemiesHandler` → `content/handlers/enemies.js#planEnemyClaudeGuard`、`content/handlers/enemies.js#planEnemyGptBsod`、`content/handlers/enemies.js#planEnemyGptCodex`、`content/handlers/enemies.js#planEnemyGptDewey`、`content/handlers/enemies.js#planEnemyGptFireball`、`content/handlers/enemies.js#planEnemyGptHoots`、`content/handlers/enemies.js#planEnemyGptNullSignal`、`content/handlers/enemies.js#planEnemyGptRocky`、`content/handlers/enemies.js#planEnemyGptSeedy`、`content/handlers/enemies.js#planEnemyGptStacky`、`content/handlers/enemies.js#planEnemyGrokBot`。

公开函数上游：

- `dispatchEnemiesHandler` ← `domain/ai.js#planEnemyAi`。

## dispatch/mechanics.js

累计机制稳定ID分派，不得把所有候选处理器依次执行。

[源码](../../src/v2/dispatch/mechanics.js)；层：`dispatch`。

直接依赖：`content/handlers/mechanics.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `dispatchMechanicsHandler(context: untyped, definitionId: untyped, event: untyped)` | `EffectPlan` | 已实现 | 按合法稳定id和已实现绑定只调用一个对应处理器。；@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `dispatchMechanicsHandler` → `content/handlers/mechanics.js#planMechanic01Exploration`、`content/handlers/mechanics.js#planMechanic02Reinforcements`、`content/handlers/mechanics.js#planMechanic03GptSupport`、`content/handlers/mechanics.js#planMechanic04ClaudeBreak`、`content/handlers/mechanics.js#planMechanic05BossCombo`、`content/handlers/mechanics.js#planMechanic06AlarmCache`、`content/handlers/mechanics.js#planMechanic07Tide`、`content/handlers/mechanics.js#planMechanic08GrokFlanks`、`content/handlers/mechanics.js#planMechanic09GptReposition`、`content/handlers/mechanics.js#planMechanic10BossArena`、`content/handlers/mechanics.js#planMechanic11Glasswing`、`content/handlers/mechanics.js#planMechanic11ObjectiveSignal`、`content/handlers/mechanics.js#planMechanic12GptFourRoles`、`content/handlers/mechanics.js#planMechanic13Handoff`、`content/handlers/mechanics.js#planMechanic14Anomaly`、`content/handlers/mechanics.js#planMechanic15Integration`。

公开函数上游：

- `dispatchMechanicsHandler` ← 宿主/工具入口或待编排。

## dispatch/models.js

模型阶段稳定ID分派，不得把所有候选处理器依次执行。

[源码](../../src/v2/dispatch/models.js)；层：`dispatch`。

直接依赖：`content/handlers/models.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `dispatchModelsHandler(context: untyped, definitionId: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview + adventure-slice | 按合法稳定id和已实现绑定只调用一个对应处理器。；@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `dispatchModelsHandler` → `content/handlers/models.js#planModelClaudeFable`、`content/handlers/models.js#planModelClaudeHaiku`、`content/handlers/models.js#planModelClaudeMythos`、`content/handlers/models.js#planModelClaudeOpus`、`content/handlers/models.js#planModelClaudeSonnet`、`content/handlers/models.js#planModelGptAstra`、`content/handlers/models.js#planModelGptLuna`、`content/handlers/models.js#planModelGptSol`、`content/handlers/models.js#planModelGptTerra`、`content/handlers/models.js#planModelGrokBot`。

公开函数上游：

- `dispatchModelsHandler` ← 宿主/工具入口或待编排。

## dispatch/plugins.js

局内插件稳定ID分派，不得把所有候选处理器依次执行。

[源码](../../src/v2/dispatch/plugins.js)；层：`dispatch`。

直接依赖：`content/handlers/plugins.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `dispatchPluginsHandler(context: untyped, definitionId: untyped, event: untyped)` | `EffectPlan` | 已实现 | 按合法稳定id和已实现绑定只调用一个对应处理器。；@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `dispatchPluginsHandler` → `content/handlers/plugins.js#planPlugin5h`、`content/handlers/plugins.js#planPluginAgent`、`content/handlers/plugins.js#planPluginBackoff`、`content/handlers/plugins.js#planPluginBatch`、`content/handlers/plugins.js#planPluginBreaker`、`content/handlers/plugins.js#planPluginCache`、`content/handlers/plugins.js#planPluginChain`、`content/handlers/plugins.js#planPluginCollect`、`content/handlers/plugins.js#planPluginCompress`、`content/handlers/plugins.js#planPluginContext`、`content/handlers/plugins.js#planPluginCooldown`、`content/handlers/plugins.js#planPluginDistill`、`content/handlers/plugins.js#planPluginFailover`、`content/handlers/plugins.js#planPluginGuard`、`content/handlers/plugins.js#planPluginHallucination`、`content/handlers/plugins.js#planPluginHotplug`、`content/handlers/plugins.js#planPluginKeepalive`、`content/handlers/plugins.js#planPluginLocalDeploy`、`content/handlers/plugins.js#planPluginMirror`、`content/handlers/plugins.js#planPluginMoe`、`content/handlers/plugins.js#planPluginOffload`、`content/handlers/plugins.js#planPluginParallel`、`content/handlers/plugins.js#planPluginPrefill`、`content/handlers/plugins.js#planPluginQuantInt4`、`content/handlers/plugins.js#planPluginRecursion`、`content/handlers/plugins.js#planPluginRedirect`、`content/handlers/plugins.js#planPluginRetry`、`content/handlers/plugins.js#planPluginRollbackEmergency`、`content/handlers/plugins.js#planPluginSandbox`、`content/handlers/plugins.js#planPluginSpeculate`、`content/handlers/plugins.js#planPluginTemperature`、`content/handlers/plugins.js#planPluginToolchain`、`content/handlers/plugins.js#planPluginWindow`。

公开函数上游：

- `dispatchPluginsHandler` ← 宿主/工具入口或待编排。

## dispatch/skills.js

主动技能稳定ID分派，不得把所有候选处理器依次执行。

[源码](../../src/v2/dispatch/skills.js)；层：`dispatch`。

直接依赖：`content/handlers/skills.js`、`content/skillCapabilities.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `dispatchSkillsHandler(context: untyped, definitionId: untyped)` | `EffectPlan` | 已实现 / core-preview | 先解析技能模板，再调用对应原生处理器；保留社区技能实际ID供事件与存档使用。；@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `dispatchSkillsHandler` → `content/handlers/skills.js#planSkillBatch`、`content/handlers/skills.js#planSkillCache`、`content/handlers/skills.js#planSkillDisconnect`、`content/handlers/skills.js#planSkillFork`、`content/handlers/skills.js#planSkillOverclock`、`content/handlers/skills.js#planSkillRedirect`、`content/handlers/skills.js#planSkillRollback`、`content/handlers/skills.js#planSkillSandbox`、`content/skillCapabilities.js#resolveSkillTemplate`。

公开函数上游：

- `dispatchSkillsHandler` ← `domain/attacks.js#planSkillCast`。

## dispatch/weapons.js

MCP稳定ID分派，不得把所有候选处理器依次执行。

[源码](../../src/v2/dispatch/weapons.js)；层：`dispatch`。

直接依赖：`content/handlers/weapons.js`、`content/weaponCapabilities.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `dispatchWeaponsHandler(context: untyped, definitionId: untyped)` | `EffectPlan` | 已实现 / core-preview | 按合法稳定id和已实现绑定只调用一个对应处理器。；@calls为可能分支，不是执行顺序；未绑定/不适用给诊断，不返回假成功。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `dispatchWeaponsHandler` → `content/handlers/weapons.js#planWeaponBatch`、`content/handlers/weapons.js#planWeaponBubble`、`content/handlers/weapons.js#planWeaponFan`、`content/handlers/weapons.js#planWeaponReturn`、`content/handlers/weapons.js#planWeaponStream`、`content/handlers/weapons.js#planWeaponVector`、`content/weaponCapabilities.js#resolveWeaponTemplate`。

公开函数上游：

- `dispatchWeaponsHandler` ← `domain/attacks.js#planWeaponFire`。

## domain/abilities.js

A bounded legal teleport placement, without tracing the path from the current position.

[源码](../../src/v2/domain/abilities.js)；层：`domain`。

直接依赖：`domain/collision.js`、`domain/entities.js`、`domain/geometry.js`、`domain/plans.js`、`domain/serialization.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `findAbilityPlacement(context: untyped, point: untyped)` | `Vec2` | 已实现 | findAbilityPlacement；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planEquippedAbility(context: untyped, kind: untyped)` | `SystemPlan` | 已实现 | planEquippedAbility；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planAbilityDamage(context: untyped, id: untyped, point: untyped, radius: untyped, amount: untyped, sourceKind: untyped)` | `SystemPlan` | 已实现 | planAbilityDamage；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planAbilityFields(context: untyped)` | `SystemPlan` | 已实现 | planAbilityFields；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planAbilityBursts(context: untyped)` | `SystemPlan` | 已实现 | planAbilityBursts；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolveAbilityMoveScale(state: untyped, entity: untyped)` | `number` | 已实现 | resolveAbilityMoveScale；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `selectAbilityTarget(state: untyped, entity: untyped)` | `DeepReadonly<EntityState>` | 已实现 | selectAbilityTarget；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planAbilityHistory(context: untyped)` | `SystemPlan` | 已实现 | planAbilityHistory；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `findAbilityPlacement` → `domain/collision.js#canTraverseObstacle`、`domain/geometry.js#distanceSquared`。
- `planEquippedAbility` → `domain/abilities.js#findAbilityPlacement`、`domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/stats.js#derivePlayerStats`。
- `planAbilityDamage` → `domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/plans.js#createEmptyPlan`、`domain/serialization.js#toJson`。
- `planAbilityFields` → `domain/entities.js#createEntityState`、`domain/geometry.js#intersectSweptCircles`、`domain/geometry.js#normalizeVector`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planAbilityBursts` → `domain/abilities.js#planAbilityDamage`、`domain/entities.js#createEntityState`、`domain/plans.js#createStateChange`、`domain/plans.js#mergeSystemPlans`。
- `resolveAbilityMoveScale` → `domain/geometry.js#distanceSquared`。
- `selectAbilityTarget` → `domain/geometry.js#distanceSquared`。
- `planAbilityHistory` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `findAbilityPlacement` ← `domain/abilities.js#planEquippedAbility`。
- `planEquippedAbility` ← `content/handlers/skills.js#planSkillBatch`、`content/handlers/skills.js#planSkillRedirect`、`content/handlers/skills.js#planSkillSandbox`、`content/handlers/skills.js#planSkillFork`、`content/handlers/skills.js#planSkillRollback`、`content/handlers/skills.js#planSkillOverclock`。
- `planAbilityDamage` ← `domain/abilities.js#planAbilityBursts`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/combatPlugins.js#planCombatPluginWorld`、`domain/scheduled.js#planScheduledActions`。
- `planAbilityFields` ← `engine/tick.js#advanceWorldTick`。
- `planAbilityBursts` ← `engine/tick.js#advanceWorldTick`。
- `resolveAbilityMoveScale` ← `domain/meleeAi.js#planMeleeEnemy`。
- `selectAbilityTarget` ← `domain/gptPets.js#planGptPet`、`domain/meleeAi.js#planMeleeEnemy`。
- `planAbilityHistory` ← `engine/tick.js#advanceWorldTick`。

## domain/ai.js

AI系统收集意图，模型和难度共同生效。

[源码](../../src/v2/domain/ai.js)；层：`system`。

直接依赖：`dispatch/companions.js`、`dispatch/enemies.js`、`dispatch/mechanics.js`、`dispatch/models.js`、`domain/bosses/claude.js`、`domain/bosses/gpt.js`、`domain/bosses/grok.js`、`domain/companions.js`、`domain/navigation.js`、`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planEnemyAi(context: untyped)` | `SystemPlan` | 已实现 / core-preview + adventure-slice | 按稳定ID分派各普通敌人真实处理器，跳过死亡、首领及禁用AI的实体。；分派为每个合法entity/handler一次，不能把声明的所有分支直接全跑。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planCompanionAi(context: untyped)` | `SystemPlan` | 已实现 | 未封禁时按原冷却和条件自动协助，输出来源companion。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planBossAi(context: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 按阵营分派Claude、ChatGPT和Grok的真实首领处理器，跳过已死亡实体。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planEnemyAi` → `dispatch/enemies.js#dispatchEnemiesHandler`、`domain/plans.js#mergeSystemPlans`。
- `planCompanionAi` → `dispatch/companions.js#dispatchCompanionsHandler`、`domain/companions.js#planCompanionFollow`、`domain/plans.js#mergeSystemPlans`。
- `planBossAi` → `domain/bosses/claude.js#planClaudeBoss`、`domain/bosses/gpt.js#planGptBoss`、`domain/bosses/grok.js#planGrokBoss`、`domain/plans.js#mergeSystemPlans`。

公开函数上游：

- `planEnemyAi` ← `engine/tick.js#advanceWorldTick`。
- `planCompanionAi` ← `engine/tick.js#advanceWorldTick`。
- `planBossAi` ← `engine/tick.js#advanceWorldTick`。

## domain/attacks.js

武器/技能/换装入口；不通过UI直接生成子弹。

[源码](../../src/v2/domain/attacks.js)；层：`system`。

直接依赖：`dispatch/skills.js`、`dispatch/weapons.js`、`domain/equipment.js`、`domain/geometry.js`、`domain/plans.js`、`domain/pluginStats.js`、`domain/projectiles.js`、`domain/serialization.js`、`domain/stats.js`、`domain/treeRuntime.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planWeaponFire(context: untyped)` | `SystemPlan` | 已实现 / core-preview | 按当前六种MCP/社区配方的独立CD与手动瞄准开火，消费一次换枪下一发加成。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planSkillCast(context: untyped)` | `SystemPlan` | 已实现 / core-preview | 以装备技能参数和插件准备倍率施放实际模板，设置独立冷却并发布保留真实ID的SkillCast事件。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDash(context: untyped, command: untyped)` | `SystemPlan` | 已实现 | 检验可用后冲刺/短保护，禁锢中不允许；不给装备技能事件。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planLoadoutChange(context: untyped, command: untyped)` | `SystemPlan` | 已实现 / core-preview | 处理Q切枪与探索地面实例替换；各自保留CD，实际换到当前槽才触发永久换枪效果。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planCollisionEffects(context: untyped, collisions: untyped)` | `SystemPlan` | 已实现 / core-preview | 连续碰撞产去重伤害；回旋碰墙下一步换程，保留本步去程命中；爆破首碰只爆一次。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planWeaponFire` → `dispatch/weapons.js#dispatchWeaponsHandler`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/stats.js#deriveWeaponStats`。
- `planSkillCast` → `dispatch/skills.js#dispatchSkillsHandler`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/pluginStats.js#resolveSkillPreparation`、`domain/serialization.js#toJson`。
- `planDash` → `domain/geometry.js#normalizeVector`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planLoadoutChange` → `domain/equipment.js#planSkillPickup`、`domain/equipment.js#planWeaponPickup`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/treeRuntime.js#planTreeWeaponSwitch`。
- `planCollisionEffects` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/projectiles.js#planProjectileBurst`、`domain/serialization.js#toJson`。

公开函数上游：

- `planWeaponFire` ← `engine/tick.js#advanceWorldTick`。
- `planSkillCast` ← `engine/commands.js#planGameCommand`。
- `planDash` ← `engine/commands.js#planGameCommand`。
- `planLoadoutChange` ← `engine/commands.js#planGameCommand`。
- `planCollisionEffects` ← `engine/tick.js#advanceWorldTick`。

## domain/bosses/claude.js

Claude高数值/封禁招式意图；控制由统一管线处理。

[源码](../../src/v2/domain/bosses/claude.js)；层：`domain`。

直接依赖：`domain/entities.js`、`domain/geometry.js`、`domain/meleeAi.js`、`domain/plans.js`、`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planClaudeBoss(context: untyped, boss: untyped)` | `EffectPlan` | 已实现 / adventure-slice | 规划重钳控制、技能与伙伴封禁、半血扫击和难度连招；Free教学首领只使用钳击。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planClaudeBan(context: untyped, boss: untyped, kind: untyped)` | `EffectPlan` | 已实现 / adventure-slice | 无合法槽则普通攻击；只发一份封禁请求和可破封装置计划。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planClaudeBoss` → `domain/bosses/claude.js#planClaudeBan`、`domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/meleeAi.js#planMeleeEnemy`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`。
- `planClaudeBan` → `domain/entities.js#createEntityState`、`domain/geometry.js#normalizeVector`、`domain/plans.js#createEmptyPlan`、`domain/serialization.js#toJson`。

公开函数上游：

- `planClaudeBoss` ← `domain/ai.js#planBossAi`。
- `planClaudeBan` ← `domain/bosses/claude.js#planClaudeBoss`。

## domain/bosses/gpt.js

ChatGPT三个节点的局部重置事务。

[源码](../../src/v2/domain/bosses/gpt.js)；层：`domain`。

直接依赖：`domain/difficulty.js`、`domain/entities.js`、`domain/geometry.js`、`domain/motionSolver.js`、`domain/plans.js`、`domain/serialization.js`、`domain/world/regionRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planGptBoss(context: untyped, boss: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 按血量/节点/冷却决定读条，保持可被打死；低级基础位置、高级5选3。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planGptReset(context: untyped, boss: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 消耗当前节点，回血、清旧敌弹/回响、预告新波次；不改玩家或sourceId/5h账本。；绝不调用checkpoint.restore或重建整局；当tick已致死则不再重置。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planGptResetInterrupt(context: untyped, boss: untyped, nodeId: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 击碎节点消费一次尝试并进入10秒保护；不恢复Boss血量。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planGptBossEvent(context: untyped, event: untyped)` | `SystemPlan` | 已实现 / adventure-slice | planGptBossEvent；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planGptBoss` → `domain/difficulty.js#resolveSurvivalSpawnMultipliers`、`domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/motionSolver.js#resolveBodyDestination`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`、`domain/world/regionRules.js#expeditionRegionScale`。
- `planGptReset` → `domain/bosses/gpt.js#planGptResetInterrupt`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planGptResetInterrupt` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planGptBossEvent` → `domain/bosses/gpt.js#planGptResetInterrupt`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `planGptBoss` ← `domain/ai.js#planBossAi`。
- `planGptReset` ← `engine/tick.js#advanceWorldTick`。
- `planGptResetInterrupt` ← `domain/bosses/gpt.js#planGptReset`、`domain/bosses/gpt.js#planGptBossEvent`。
- `planGptBossEvent` ← `engine/hooks.js#planEventHooks`。

## domain/bosses/grok.js

Grok首领只有简单火箭和召集人海。

[源码](../../src/v2/domain/bosses/grok.js)；层：`domain`。

直接依赖：`domain/entities.js`、`domain/geometry.js`、`domain/locomotion.js`、`domain/plans.js`、`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planGrokBoss(context: untyped, boss: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 预告单枚可击毁火箭和召兵；50%后仅缩短召兵间隔，不加高级技能。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planGrokBossReinforcements(context: untyped, boss: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 按局部上限/入口预留召兵，召兵无经验资源、每轮最多3个样本。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planGrokProjectiles(context: untyped)` | `SystemPlan` | 已实现 / adventure-slice | planGrokProjectiles；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planGrokBoss` → `domain/bosses/grok.js#planGrokBossReinforcements`、`domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/locomotion.js#resolveEnemyVelocity`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planGrokBossReinforcements` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planGrokProjectiles` → `domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/geometry.js#intersectSweptCircles`、`domain/geometry.js#normalizeVector`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`。

公开函数上游：

- `planGrokBoss` ← `domain/ai.js#planBossAi`。
- `planGrokBossReinforcements` ← `domain/bosses/grok.js#planGrokBoss`。
- `planGrokProjectiles` ← `engine/tick.js#advanceWorldTick`。

## domain/checkpoint.js

完整对局序列化/版本校验，纯计划无I/O。

[源码](../../src/v2/domain/checkpoint.js)；层：`domain`。

直接依赖：`domain/serialization.js`、`domain/stateValidation.js`、`domain/world/map.js`、`versions.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `canCreateCheckpoint(context: untyped)` | `ValidationReport` | 已实现 | 只在安全检查点、无训练/选择/半帧效果时允许保存。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `createCheckpoint(state: untyped)` | `Checkpoint` | 已实现 | 复制完整状态、随机游标、模型壳/LoRA/DSH/事件与去重账本并加摘要。；低层编码器，应用必须先通过canCreateCheckpoint；本函数不执行持久化，也不授予安全/治疗效果。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `validateCheckpoint(checkpoint: untyped, versions: untyped, catalog: untyped)` | `ValidationReport` | 已实现 | 检查版本、完整性、有限数值、机制集合和全部内容引用；失败保留原档。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `restoreCheckpointState(checkpoint: untyped, catalog: untyped)` | `Result<GameState>` | 已实现 | 校验后构建全新对局，先暂停；不回血/发额度/换候选/重抽开奖。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `canCreateCheckpoint` → `domain/world/map.js#isSafeForInteraction`。
- `createCheckpoint` → `domain/serialization.js#createDataDigest`、`domain/serialization.js#serializeCanonical`。
- `validateCheckpoint` → `domain/serialization.js#createDataDigest`、`domain/serialization.js#serializeCanonical`、`domain/stateValidation.js#inspectGameState`。
- `restoreCheckpointState` → `domain/checkpoint.js#validateCheckpoint`、`domain/serialization.js#serializeCanonical`。

公开函数上游：

- `canCreateCheckpoint` ← `application/game.js#saveAdventureCheckpoint`、`preview/host.js#mountCombatPreview`。
- `createCheckpoint` ← `application/game.js#saveAdventureCheckpoint`、`preview/host.js#mountCombatPreview`。
- `validateCheckpoint` ← `application/repository.js#mergePersistenceIntents`、`domain/checkpoint.js#restoreCheckpointState`、`domain/settlement.js#validateProfileRecord`。
- `restoreCheckpointState` ← `engine/session.js#restoreGameSession`。

## domain/clock.js

渲染墙钟与世界/UI固定步之间的调度契约。

[源码](../../src/v2/domain/clock.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createClockState()` | `ClockState` | 已实现 | 建立无积压的世界/UI调度时钟。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `scheduleFrame(clock: untyped, elapsedMs: untyped, phase: untyped)` | `FrameSchedule` | 已实现 | 决定世界和UI各执行多少步，LoRA只走UI，暂停都不走。；世界60Hz，每帧最多8步；积压>1秒性能暂停；后台恢复不得补跑离开期间时间。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `resumeClock(clock: untyped)` | `ClockState` | 已实现 | 清理墙钟基准/性能积压，保留世界逻辑时间。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `createClockState` → 无内部公开函数。
- `scheduleFrame` → 无内部公开函数。
- `resumeClock` → 无内部公开函数。

公开函数上游：

- `createClockState` ← `application/game.js#createApplication`、`preview/host.js#mountCombatPreview`。
- `scheduleFrame` ← `application/game.js#advanceApplicationFrame`、`preview/host.js#mountCombatPreview`。
- `resumeClock` ← `application/game.js#advanceApplicationFrame`、`preview/host.js#mountCombatPreview`。

## domain/collision.js

实体碰撞与Grok部分穿障的唯一规则。

[源码](../../src/v2/domain/collision.js)；层：`domain`。

直接依赖：`domain/geometry.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `canTraverseObstacle(entity: untyped, obstacle: untyped, catalog: untyped)` | `boolean` | 已实现 | 读取同一碰撞矩阵，只有指定Grok/虚影穿低矮障碍，高墙/锁门优先阻挡。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `detectCollisions(context: untyped)` | `CollisionResult` | 已实现 | 生成稳定排序的连续碰撞结果，不直接改血或销毁实体。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `validateSpawnLocation(context: untyped, request: untyped)` | `Result<Vec2>` | 已实现 / adventure-slice | 共享逻辑相机，要求视野外128余量、距玩家420、合法地形和数量上限。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `canTraverseObstacle` → 无内部公开函数。
- `detectCollisions` → `domain/collision.js#canTraverseObstacle`、`domain/geometry.js#intersectSweptCircles`、`domain/geometry.js#normalizeVector`。
- `validateSpawnLocation` → `domain/collision.js#canTraverseObstacle`、`domain/geometry.js#computeCameraBounds`、`domain/geometry.js#distanceSquared`。

公开函数上游：

- `canTraverseObstacle` ← `domain/abilities.js#findAbilityPlacement`、`domain/collision.js#detectCollisions`、`domain/collision.js#validateSpawnLocation`、`domain/motionSolver.js#resolveBodyDestination`、`domain/navigation.js#findNavigationPath`、`domain/navigation.js#chooseRetreatPoint`。
- `detectCollisions` ← `engine/tick.js#advanceWorldTick`。
- `validateSpawnLocation` ← `domain/world/spawning.js#planSpawnSchedule`、`domain/world/spawning.js#planEnemySpawn`。

## domain/combatPlugins.js

@param {import('../contracts.d.ts').EvaluationContext} c @param {import('../contracts.d.ts').Vec2} point @param {number} range @param {readonly string[]} excluded

[源码](../../src/v2/domain/combatPlugins.js)；层：`domain`。

直接依赖：`content/skillCapabilities.js`、`content/weaponCapabilities.js`、`domain/abilities.js`、`domain/entities.js`、`domain/geometry.js`、`domain/motionSolver.js`、`domain/plans.js`、`domain/pluginStats.js`、`domain/projectiles.js`、`domain/scheduled.js`、`domain/serialization.js`、`domain/shields.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planCombatPluginEvent(context: untyped, event: untyped, onlyId: untyped = null)` | `SystemPlan` | 已实现 | planCombatPluginEvent；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planCombatPluginWorld(context: untyped)` | `SystemPlan` | 已实现 | planCombatPluginWorld；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planCombatPluginEvent` → `content/skillCapabilities.js#resolveSkillTemplate`、`content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/abilities.js#planAbilityDamage`、`domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/motionSolver.js#resolveBodyDestination`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/plans.js#mergeSystemPlans`、`domain/pluginStats.js#deriveRawWeaponStats`、`domain/projectiles.js#createWeaponProjectile`、`domain/scheduled.js#scheduleAbilityActions`、`domain/serialization.js#toJson`、`domain/stats.js#derivePlayerStats`。
- `planCombatPluginWorld` → `domain/abilities.js#planAbilityDamage`、`domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/plans.js#mergeSystemPlans`、`domain/serialization.js#toJson`、`domain/shields.js#planShieldGrant`、`domain/stats.js#derivePlayerStats`。

公开函数上游：

- `planCombatPluginEvent` ← `content/handlers/plugins.js#planPluginBatch`、`content/handlers/plugins.js#planPluginCache`、`content/handlers/plugins.js#planPluginRetry`、`content/handlers/plugins.js#planPluginTemperature`、`content/handlers/plugins.js#planPluginCooldown`、`content/handlers/plugins.js#planPluginOffload`、`content/handlers/plugins.js#planPluginKeepalive`、`content/handlers/plugins.js#planPluginRedirect`、`content/handlers/plugins.js#planPluginBackoff`、`content/handlers/plugins.js#planPluginFailover`、`content/handlers/plugins.js#planPluginSandbox`、`content/handlers/plugins.js#planPluginHallucination`、`content/handlers/plugins.js#planPluginChain`、`content/handlers/plugins.js#planPluginContext`、`content/handlers/plugins.js#planPluginHotplug`、`content/handlers/plugins.js#planPluginPrefill`、`content/handlers/plugins.js#planPluginToolchain`、`content/handlers/plugins.js#planPluginMirror`、`content/handlers/plugins.js#planPluginRecursion`、`content/handlers/plugins.js#planPluginMoe`、`content/handlers/plugins.js#planPluginSpeculate`、`content/handlers/plugins.js#planPluginWindow`、`content/handlers/plugins.js#planPluginAgent`、`content/handlers/plugins.js#planPluginBreaker`、`engine/hooks.js#planEventHooks`。
- `planCombatPluginWorld` ← `engine/tick.js#advanceWorldTick`。

## domain/companions.js

One conditionally triggered automatic ability. No cast means no cooldown consumption.

[源码](../../src/v2/domain/companions.js)；层：`domain`。

直接依赖：`domain/entities.js`、`domain/geometry.js`、`domain/plans.js`、`domain/shields.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planCompanionAbility(context: untyped, kind: untyped)` | `SystemPlan` | 已实现 | planCompanionAbility；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planCompanionFollow(context: untyped)` | `SystemPlan` | 已实现 | planCompanionFollow；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planPartnerBanContact(context: untyped)` | `SystemPlan` | 已实现 | planPartnerBanContact；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planCompanionMilestones(context: untyped, event: untyped)` | `SystemPlan` | 已实现 | planCompanionMilestones；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planCompanionAbility` → `domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/shields.js#planShieldGrant`、`domain/stats.js#derivePlayerStats`。
- `planCompanionFollow` → `domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planPartnerBanContact` → `domain/geometry.js#intersectSweptCircles`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planCompanionMilestones` → `domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `planCompanionAbility` ← `content/handlers/companions.js#planCompanionRice`、`content/handlers/companions.js#planCompanionPatch`、`content/handlers/companions.js#planCompanionCache`、`content/handlers/companions.js#planCompanionRouter`、`content/handlers/companions.js#planCompanionDecoy`、`content/handlers/companions.js#planCompanionRocket`。
- `planCompanionFollow` ← `domain/ai.js#planCompanionAi`。
- `planPartnerBanContact` ← `engine/tick.js#advanceWorldTick`。
- `planCompanionMilestones` ← `engine/hooks.js#planEventHooks`。

## domain/currents.js

Current drift uses effective ticks and the normal body solver; native dash/root/shell stun keep their movement rules.

[源码](../../src/v2/domain/currents.js)；层：`domain`。

直接依赖：`domain/geometry.js`、`domain/stats.js`、`domain/world/regionRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveTideVelocity(s: untyped, e: untyped, velocity: untyped, catalog: untyped)` | `Vec2` | 已实现 | resolveTideVelocity；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `resolveTideVelocity` → `domain/geometry.js#distanceSquared`、`domain/stats.js#derivePlayerStats`、`domain/world/regionRules.js#regionWorldTick`。

公开函数上游：

- `resolveTideVelocity` ← `domain/movement.js#planEntityMotion`。

## domain/damage.js

伤害的唯一规划入口；不递归调用击杀或效果钩子。

[源码](../../src/v2/domain/damage.js)；层：`domain`。

直接依赖：`domain/modelProfiles.js`、`domain/pluginStats.js`、`domain/quotas.js`、`domain/random.js`、`domain/shells.js`、`domain/shields.js`、`domain/stats.js`、`domain/treeRuntime.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveDamageRequest(context: untyped, request: untyped)` | `DamageResolution` | 已实现 | 检查命中/无敌，分流外壳，计算额度/护甲/减伤/暴击/盾/生命，产生伤害和死亡候选。；有壳目标先外壳分支；对敌暴击只在原生武器允许处一次计算；额度只用于敌→玩家。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `isDamageRequestValid(context: untyped, request: untyped)` | `boolean` | 已实现 | 检查实体存活、dying、attackId命中去重、来源/链代数与闪避保护。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planLifeChange(context: untyped, targetId: untyped, delta: untyped, causeId: untyped)` | `EffectPlan` | 已实现 | 治疗/生命变动限幅，输出实际治疗和溢出；不自行触发回血递归。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `resolveDamageRequest` → `domain/damage.js#isDamageRequestValid`、`domain/modelProfiles.js#resolvePetGuard`、`domain/modelProfiles.js#resolvePetLinkFactor`、`domain/pluginStats.js#resolveCacheHitFactor`、`domain/quotas.js#planQuotaAllowance`、`domain/random.js#drawRandom`、`domain/shells.js#resolveShellContact`、`domain/shields.js#resolveShieldAbsorption`、`domain/stats.js#derivePlayerStats`、`domain/treeRuntime.js#resolveTreeSurvival`。
- `isDamageRequestValid` → 无内部公开函数。
- `planLifeChange` → 无内部公开函数。

公开函数上游：

- `resolveDamageRequest` ← `engine/effectLoop.js#evaluateEffectRequest`。
- `isDamageRequestValid` ← `domain/damage.js#resolveDamageRequest`。
- `planLifeChange` ← `domain/draft.js#planPluginSkip`、`domain/world/expedition.js#planExpeditionRest`、`engine/effectLoop.js#evaluateEffectRequest`。

## domain/deaths.js

死亡声明、奖励归属和同tick胜负冲突。

[源码](../../src/v2/domain/deaths.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `collectDeathRecords(context: untyped)` | `readonly DeathRecord[]` | 已实现 | 收集本tick第一次致死者，按稳定id生成记录；已dying/已结算不重复。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDeathTransitions(context: untyped, records: untyped)` | `SystemPlan` | 已实现 | 在后续钩子前标记dying/死亡，产生唯一EntityDied与来源事件。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `resolveTerminalOutcome(context: untyped, records: untyped)` | `'victory' \| 'defeat' \| null` | 已实现 | 同时玩家/最终Boss致死判失败；API Boss死亡不胜利，仍保留真实击败解锁事实。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `collectDeathRecords` → 无内部公开函数。
- `planDeathTransitions` → 无内部公开函数。
- `resolveTerminalOutcome` → 无内部公开函数。

公开函数上游：

- `collectDeathRecords` ← `engine/effectLoop.js#drainEffectQueue`。
- `planDeathTransitions` ← `engine/effectLoop.js#drainEffectQueue`。
- `resolveTerminalOutcome` ← `engine/tick.js#advanceWorldTick`。

## domain/difficulty.js

难度累计集合、档位福利和模型阶段解析。

[源码](../../src/v2/domain/difficulty.js)；层：`domain`。

直接依赖：`domain/random.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `introducedMechanics(catalog: untyped, level: untyped)` | `readonly MechanicDefinition[]` | 已实现 | introducedMechanics；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolveDifficultySnapshot(request: untyped, catalog: untyped)` | `Result<DifficultySnapshot>` | 已实现 | 一次性解析0–15/API、静态倍率、完整累计机制和独立Pro福利。；API使用M(15)；常驻机制不能轮换丢失；Pro自带5h仅1–5。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `resolveModelProfileId(difficulty: untyped, faction: untyped, random: untyped)` | `Result<{ profileId: Id; next: RandomState }>` | 已实现 | 选择Haiku/Sonnet/Opus/Fable或Mythos及Astra/Sol/Terra/Luna对应阶段。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `resolveApiSpawnMultipliers(elapsedTicks: untyped)` | `Result<{ hp: number; damage: number; budget: number }>` | 已实现 | 按出生时API有效分钟计算强化，检查数值溢出；不突然给活敌加血。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `resolveSurvivalSpawnMultipliers(difficulty: untyped, elapsedTicks: untyped)` | `Result<{hp:number;damage:number;budget:number}>` | 已实现 | resolveSurvivalSpawnMultipliers；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `introducedMechanics` → 无内部公开函数。
- `resolveDifficultySnapshot` → 无内部公开函数。
- `resolveModelProfileId` → `domain/random.js#drawRandom`。
- `resolveApiSpawnMultipliers` → 无内部公开函数。
- `resolveSurvivalSpawnMultipliers` → `domain/difficulty.js#resolveApiSpawnMultipliers`。

公开函数上游：

- `introducedMechanics` ← `preview/host.js#mountCombatPreview`。
- `resolveDifficultySnapshot` ← `application/game.js#startAdventure`、`application/nest.js#prepareAdventureStart`、`engine/shootingRange.js#createShootingRange`、`preview/host.js#mountCombatPreview`。
- `resolveModelProfileId` ← `domain/world/spawning.js#planEnemySpawn`、`preview/host.js#mountCombatPreview`。
- `resolveApiSpawnMultipliers` ← `domain/difficulty.js#resolveSurvivalSpawnMultipliers`。
- `resolveSurvivalSpawnMultipliers` ← `domain/bosses/gpt.js#planGptBoss`、`domain/world/api.js#planApiBossEncounter`、`domain/world/spawning.js#planEnemySpawn`、`domain/world/spawning.js#planReinforcementGroup`。

## domain/distill.js

三阵营样本、封顶和可见派生能力。

[源码](../../src/v2/domain/distill.js)；层：`domain`。

直接依赖：`domain/entities.js`、`domain/plans.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planDistillEvent(context: untyped, event: untyped)` | `EffectPlan` | 已实现 / core-preview | 启用时处理合法击杀样本/射击/时间事件，回响与辅助实体不提供样本。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `advanceDistillTrack(track: untyped, samples: untyped, required: untyped)` | `DistillTrack` | 已实现 | 样本溢出逐阶，最高3阶；2级插件门槛降低时立即结算。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDistilledAbilities(context: untyped)` | `EffectPlan` | 已实现 / core-preview | Claude受伤盾、GPT追击泡、Grok基础射击Bot虚影；不伪造主动技能施放。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planDistillEvent` → `domain/distill.js#advanceDistillTrack`、`domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/stats.js#derivePlayerStats`。
- `advanceDistillTrack` → 无内部公开函数。
- `planDistilledAbilities` → `domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/stats.js#derivePlayerStats`。

公开函数上游：

- `planDistillEvent` ← `content/handlers/plugins.js#planPluginDistill`、`engine/hooks.js#planEventHooks`。
- `advanceDistillTrack` ← `domain/distill.js#planDistillEvent`、`domain/draft.js#planPluginSelection`。
- `planDistilledAbilities` ← `engine/tick.js#advanceWorldTick`。

## domain/draft.js

候选、升级、换槽与一次性重抽。

[源码](../../src/v2/domain/draft.js)；层：`domain`。

直接依赖：`content/registry.js`、`content/skillCapabilities.js`、`content/weaponCapabilities.js`、`domain/damage.js`、`domain/distill.js`、`domain/plans.js`、`domain/random.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createPluginChoice(context: untyped, reward: untyped)` | `Result<{choice: PluginChoice; nextRandom: RandomState}>` | 已实现 / core-preview | 按权重生成3/DSH首轮4个互异候选，首组保底蒸馏。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginSelection(context: untyped, command: untyped)` | `SystemPlan` | 已实现 / core-preview | 校验choiceId/optionId，升级同id或确认满槽替换，Pro5h单独origin不占槽。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginReroll(context: untyped, command: untyped)` | `SystemPlan` | 已实现 / core-preview | 消费本局有限重抽次数后重建候选，优先避开旧候选；不重复保底蒸馏。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPluginSkip(context: untyped, command: untyped)` | `SystemPlan` | 已实现 / core-preview | 一次跳过治疗8并完成该选择，不转换永久资源。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `createPluginChoice` → `content/registry.js#createHandlerRegistry`、`content/skillCapabilities.js#resolveSkillTemplate`、`content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/random.js#chooseWeightedIndex`。
- `planPluginSelection` → `domain/distill.js#advanceDistillTrack`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planPluginReroll` → `domain/draft.js#createPluginChoice`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planPluginSkip` → `domain/damage.js#planLifeChange`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `createPluginChoice` ← `domain/draft.js#planPluginReroll`、`engine/flow.js#planProgressionPanels`。
- `planPluginSelection` ← `engine/commands.js#planGameCommand`。
- `planPluginReroll` ← `engine/commands.js#planGameCommand`。
- `planPluginSkip` ← `engine/commands.js#planGameCommand`。

## domain/dshCycle.js

10秒开奖、5分钟有效期与极低概率续期彩蛋。

[源码](../../src/v2/domain/dshCycle.js)；层：`domain`。

直接依赖：`content/achievements.js`、`domain/random.js`、`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `readDshCycleTimers(state: untyped)` | `{remaining:number;activeRemaining:number;durationResets:number}` | 已实现 | 读取10秒开奖与300秒有效期；缺失新增字段的旧存档按已过世界时间推导，读档不续期。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planDshCycleEvent(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | 仅有效世界步推进10秒开奖/300秒有效期；50%更新或重置，独立0.1%重置有效期为300秒，原子保存随机游标和续期次数。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planTemporaryWeaponUpdate(context: untyped)` | `EffectPlan` | 已实现 | 仅当前武器实例临时品质+1或最高品质+20%，持续28秒，刷新不叠。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planCooldownReset(context: untyped)` | `EffectPlan` | 已实现 | 仅装备技能、冲刺、伙伴原生冷却置0，封禁/5h/插件冷却不清。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `readDshCycleTimers` → 无内部公开函数。
- `planDshCycleEvent` → `domain/dshCycle.js#planCooldownReset`、`domain/dshCycle.js#planTemporaryWeaponUpdate`、`domain/dshCycle.js#readDshCycleTimers`、`domain/random.js#drawRandom`、`domain/serialization.js#toJson`。
- `planTemporaryWeaponUpdate` → 无内部公开函数。
- `planCooldownReset` → 无内部公开函数。

公开函数上游：

- `readDshCycleTimers` ← `domain/dshCycle.js#planDshCycleEvent`、`preview/host.js#mountCombatPreview`。
- `planDshCycleEvent` ← `content/handlers/dsh.js#planDshGptBranch`、`engine/tick.js#advanceWorldTick`。
- `planTemporaryWeaponUpdate` ← `domain/dshCycle.js#planDshCycleEvent`。
- `planCooldownReset` ← `domain/dshCycle.js#planDshCycleEvent`。

## domain/dshEffects.js

Native casts, credited deaths and real healing feed independent DSH counters. Never emits a native attack event.

[源码](../../src/v2/domain/dshEffects.js)；层：`domain`。

直接依赖：`domain/entities.js`、`domain/plans.js`、`domain/shields.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planDshEffects(context: untyped, event: untyped, onlyId: untyped = null)` | `SystemPlan` | 已实现 | planDshEffects；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planDshEffects` → `domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/plans.js#mergeSystemPlans`、`domain/shields.js#planShieldGrant`、`domain/stats.js#derivePlayerStats`。

公开函数上游：

- `planDshEffects` ← `content/handlers/dsh.js#planDshGptPreview`、`content/handlers/dsh.js#planDshGrokLicense`、`content/handlers/dsh.js#planDshGrokSalvage`、`content/handlers/dsh.js#planDshSleep`、`content/handlers/dsh.js#planDshRice`、`content/handlers/dsh.js#planDshOpen`、`engine/hooks.js#planEventHooks`、`engine/tick.js#advanceWorldTick`、`engine/tick.js#advanceUiTick`。

## domain/easter.js

Place discoverable, reward-free easter objectives in the continuous map.

[源码](../../src/v2/domain/easter.js)；层：`domain`。

直接依赖：`domain/entities.js`、`domain/plans.js`、`domain/serialization.js`、`domain/world/regionRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createEasterObjectives()` | `SystemPlan` | 已实现 | createEasterObjectives；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planEasterEvent(context: untyped, event: untyped)` | `SystemPlan` | 已实现 | planEasterEvent；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planEasterInteraction(context: untyped, entityId: untyped)` | `SystemPlan` | 已实现 | planEasterInteraction；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planEasterAdvance(context: untyped)` | `SystemPlan` | 已实现 | planEasterAdvance；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createEasterObjectives` → `domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planEasterEvent` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planEasterInteraction` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`。
- `planEasterAdvance` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`、`domain/world/regionRules.js#localWorldId`。

公开函数上游：

- `createEasterObjectives` ← `domain/world/adventure.js#createAdventureMapPlan`。
- `planEasterEvent` ← `engine/hooks.js#planEventHooks`。
- `planEasterInteraction` ← `domain/world/map.js#planWorldInteraction`。
- `planEasterAdvance` ← `engine/tick.js#advanceWorldTick`。

## domain/entities.js

Canonical entity constructor; callers provide stable identity and source snapshots.

[源码](../../src/v2/domain/entities.js)；层：`domain`。

直接依赖：`domain/modelProfiles.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createEntityState(id: untyped, definitionId: untyped, kind: untyped, team: untyped, position: untyped, overrides: untyped = {}, difficulty: untyped)` | `EntityState` | 已实现 | 按稳定ID和来源建立完整实体默认值；调用者提供出生参数快照。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createEntityState` → `domain/modelProfiles.js#initializeModelProfile`。

公开函数上游：

- `createEntityState` ← `domain/abilities.js#planEquippedAbility`、`domain/abilities.js#planAbilityFields`、`domain/abilities.js#planAbilityBursts`、`domain/bosses/claude.js#planClaudeBan`、`domain/bosses/gpt.js#planGptBoss`、`domain/bosses/grok.js#planGrokBoss`、`domain/bosses/grok.js#planGrokProjectiles`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/combatPlugins.js#planCombatPluginWorld`、`domain/companions.js#planCompanionAbility`、`domain/companions.js#planCompanionFollow`、`domain/companions.js#planCompanionMilestones`、`domain/distill.js#planDistillEvent`、`domain/distill.js#planDistilledAbilities`、`domain/dshEffects.js#planDshEffects`、`domain/easter.js#createEasterObjectives`、`domain/gptPets.js#planGptPet`、`domain/gptPets.js#planGptFields`、`domain/gptPets.js#planPetModelEvent`、`domain/initial.js#createInitialGameState`、`domain/projectiles.js#createWeaponProjectile`、`domain/projectiles.js#planProjectileBurst`、`domain/scheduled.js#scheduleAbilityActions`、`domain/scheduled.js#planScheduledActions`、`domain/status.js#resolveControlRequest`、`domain/world/adventure.js#createAdventureMapPlan`、`domain/world/adventure.js#planClaudeEncounter`、`domain/world/adventure.js#planBossEncounter`、`domain/world/api.js#planApiWorldAdvance`、`domain/world/expeditionMap.js#createExpeditionRegionPlan`、`domain/world/lateMechanics.js#planObjectiveSignal`、`domain/world/lateMechanics.js#planLateSchedule`、`domain/world/map.js#createMapPlan`、`domain/world/spawning.js#planEnemySpawn`、`domain/world/tutorial.js#createTutorialMapPlan`、`domain/world/tutorial.js#planTutorialBoss`、`engine/shootingRange.js#createShootingRange`。

## domain/equipment.js

探索中MCP交互、满槽预览与实例保留交换。

[源码](../../src/v2/domain/equipment.js)；层：`domain`。

直接依赖：`content/skillCapabilities.js`、`content/weaponCapabilities.js`、`domain/plans.js`、`domain/serialization.js`、`domain/treeRuntime.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planEquipmentInteraction(context: untyped)` | `SystemPlan\|null` | 已实现 / core-preview + adventure-slice | 探索中F就近拾取MCP/技能；MCP空槽填入，满槽或技能发可放弃的替换预览。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planWeaponPickup(context: untyped, pickupId: untyped, slotIndex: untyped)` | `SystemPlan` | 已实现 / core-preview + adventure-slice | 距离/阶段/槽位复核后原子交换实例，原武器留地；品质/冷却/更新有效期不重置；稳定发现事件。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planSkillPickup(context: untyped, pickupId: untyped)` | `SystemPlan` | 已实现 | planSkillPickup；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planEquipmentInteraction` → `domain/equipment.js#planWeaponPickup`、`domain/plans.js#createEmptyPlan`。
- `planWeaponPickup` → `content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`、`domain/treeRuntime.js#planTreeWeaponSwitch`。
- `planSkillPickup` → `content/skillCapabilities.js#resolveSkillTemplate`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`。

公开函数上游：

- `planEquipmentInteraction` ← `domain/world/map.js#planWorldInteraction`。
- `planWeaponPickup` ← `domain/attacks.js#planLoadoutChange`、`domain/equipment.js#planEquipmentInteraction`。
- `planSkillPickup` ← `domain/attacks.js#planLoadoutChange`。

## domain/geometry.js

纯几何计算，无世界状态。

[源码](../../src/v2/domain/geometry.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `normalizeVector(vector: untyped)` | `Vec2` | 已实现 | 归一化输入，零向量保持零，不产生NaN。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `intersectSweptCircles(from: untyped, to: untyped, radius: untyped, target: untyped, targetRadius: untyped)` | `number \| null` | 已实现 | 计算高速移动圆的首个命中时间比例，避免穿透。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `isContactWithinArc(center: untyped, facingRadians: untyped, contact: untyped, arcDegrees: untyped)` | `boolean` | 已实现 | 判定侧后弱点弧，包含08指定边界。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `distanceSquared(a: untyped, b: untyped)` | `number` | 已实现 | 供稳定目标/距离排序；相同距离由上层按entityId裁决。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `computeCameraBounds(position: untyped, map: untyped, viewport: untyped)` | `{x:number;y:number;width:number;height:number}` | 已实现 | 以当前逻辑位置、地图与世界单位视野推导同一相机边界，渲染和出生检查共用。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `normalizeVector` → 无内部公开函数。
- `intersectSweptCircles` → 无内部公开函数。
- `isContactWithinArc` → 无内部公开函数。
- `distanceSquared` → 无内部公开函数。
- `computeCameraBounds` → 无内部公开函数。

公开函数上游：

- `normalizeVector` ← `adapters/input.js#normalizeInputSamples`、`content/handlers/skills.js#planSkillDisconnect`、`domain/abilities.js#planAbilityDamage`、`domain/abilities.js#planAbilityFields`、`domain/attacks.js#planDash`、`domain/bosses/claude.js#planClaudeBoss`、`domain/bosses/claude.js#planClaudeBan`、`domain/bosses/gpt.js#planGptBoss`、`domain/bosses/grok.js#planGrokBoss`、`domain/bosses/grok.js#planGrokProjectiles`、`domain/collision.js#detectCollisions`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/companions.js#planCompanionFollow`、`domain/gptPets.js#planGptPet`、`domain/locomotion.js#resolveEnemyMovementGoal`、`domain/locomotion.js#resolveEnemyVelocity`、`domain/meleeAi.js#planMeleeEnemy`、`domain/motionSolver.js#resolveBodyDestination`、`domain/movement.js#planPlayerMovement`、`domain/movement.js#planEntityMotion`、`domain/movement.js#planPickupMotion`、`domain/status.js#resolveControlRequest`、`engine/commands.js#planGameCommand`。
- `intersectSweptCircles` ← `domain/abilities.js#planAbilityFields`、`domain/bosses/grok.js#planGrokProjectiles`、`domain/collision.js#detectCollisions`、`domain/companions.js#planPartnerBanContact`、`domain/motionSolver.js#resolveBodyDestination`、`domain/movement.js#planEntityMotion`、`domain/navigation.js#findNavigationPath`。
- `isContactWithinArc` ← `domain/shells.js#resolveShellContact`。
- `distanceSquared` ← `content/handlers/skills.js#planSkillDisconnect`、`domain/abilities.js#findAbilityPlacement`、`domain/abilities.js#planAbilityDamage`、`domain/abilities.js#resolveAbilityMoveScale`、`domain/abilities.js#selectAbilityTarget`、`domain/bosses/claude.js#planClaudeBoss`、`domain/bosses/gpt.js#planGptBoss`、`domain/bosses/grok.js#planGrokBoss`、`domain/bosses/grok.js#planGrokProjectiles`、`domain/collision.js#validateSpawnLocation`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/combatPlugins.js#planCombatPluginWorld`、`domain/companions.js#planCompanionAbility`、`domain/companions.js#planCompanionFollow`、`domain/currents.js#resolveTideVelocity`、`domain/gptPets.js#planGptPet`、`domain/gptPets.js#planGptFields`、`domain/locomotion.js#resolveEnemyMovementGoal`、`domain/locomotion.js#resolveEnemyVelocity`、`domain/mechanics.js#planMechanicEvent`、`domain/meleeAi.js#planMeleeEnemy`、`domain/movement.js#planPickupMotion`、`domain/navigation.js#findNavigationPath`、`domain/navigation.js#canCloseMapPassage`、`domain/navigation.js#chooseRetreatPoint`、`domain/status.js#resolveControlRequest`、`domain/world/api.js#canApiWithdraw`、`domain/world/api.js#planApiWorldAdvance`、`domain/world/escort.js#planEscortStart`、`domain/world/escort.js#planEscortAdvance`、`domain/world/expedition.js#planExpeditionTravel`、`domain/world/expedition.js#planExpeditionRest`、`domain/world/extraction.js#canExtract`、`domain/world/extraction.js#planExtraction`、`domain/world/lateMechanics.js#planChallengeInteraction`、`domain/world/lateMechanics.js#planLateSchedule`、`domain/world/map.js#planMapExploration`、`domain/world/map.js#planWorldInteraction`、`domain/world/objectives.js#planObjectiveAdvance`、`domain/world/pressureRules.js#validatePressureReservation`、`domain/world/safety.js#isWorldSafe`、`domain/world/tutorial.js#planTutorialAdvance`、`domain/world/tutorial.js#planTutorialBoss`。
- `computeCameraBounds` ← `domain/collision.js#validateSpawnLocation`、`preview/view.js#getPreviewCamera`。

## domain/gptPets.js

@param {import('../contracts.d.ts').EvaluationContext} c @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} owner @param {import('../contracts.d.ts').Vec2} point @param {string} id @param {number} amount @param {number} speed @param {number} offset

[源码](../../src/v2/domain/gptPets.js)；层：`domain`。

直接依赖：`domain/abilities.js`、`domain/entities.js`、`domain/geometry.js`、`domain/meleeAi.js`、`domain/modelProfiles.js`、`domain/motionSolver.js`、`domain/navigation.js`、`domain/plans.js`、`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planGptPet(context: untyped, kind: untyped)` | `SystemPlan` | 已实现 / core-preview + adventure-slice | planGptPet；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planGptFields(context: untyped)` | `SystemPlan` | 已实现 / core-preview + adventure-slice | planGptFields；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planPetModelEvent(context: untyped, event: untyped)` | `SystemPlan` | 已实现 / core-preview + adventure-slice | planPetModelEvent；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planGptPet` → `domain/abilities.js#selectAbilityTarget`、`domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/meleeAi.js#planMeleeEnemy`、`domain/modelProfiles.js#resolvePetStage`、`domain/motionSolver.js#resolveBodyDestination`、`domain/navigation.js#chooseRetreatPoint`、`domain/navigation.js#findNavigationPath`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`。
- `planGptFields` → `domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/modelProfiles.js#resolvePetStage`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`。
- `planPetModelEvent` → `domain/entities.js#createEntityState`、`domain/modelProfiles.js#resolvePetStage`、`domain/navigation.js#canCloseMapPassage`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `planGptPet` ← `content/handlers/enemies.js#planEnemyGptCodex`、`content/handlers/enemies.js#planEnemyGptDewey`、`content/handlers/enemies.js#planEnemyGptFireball`、`content/handlers/enemies.js#planEnemyGptHoots`、`content/handlers/enemies.js#planEnemyGptRocky`、`content/handlers/enemies.js#planEnemyGptSeedy`、`content/handlers/enemies.js#planEnemyGptStacky`、`content/handlers/enemies.js#planEnemyGptBsod`、`content/handlers/enemies.js#planEnemyGptNullSignal`。
- `planGptFields` ← `engine/tick.js#advanceWorldTick`。
- `planPetModelEvent` ← `engine/hooks.js#planEventHooks`。

## domain/initial.js

Create an unpublished initial state. Map plans are applied before Session publishes it.

[源码](../../src/v2/domain/initial.js)；层：`domain`。

直接依赖：`content/skillCapabilities.js`、`content/weaponCapabilities.js`、`domain/difficulty.js`、`domain/entities.js`、`domain/random.js`、`domain/serialization.js`、`domain/treeRuntime.js`、`domain/world/regionRules.js`、`versions.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createInitialGameState(start: untyped, seed: untyped, catalog: untyped)` | `GameState` | 已实现 / core-preview + adventure-slice | 创建Free引导/练习、短途、远征、探索、无尽或API初态；模组冒险要求显式标记及完整锁，full仍拒绝。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createInitialGameState` → `content/skillCapabilities.js#resolveSkillTemplate`、`content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/entities.js#createEntityState`、`domain/random.js#createRandomStreams`、`domain/serialization.js#serializeCanonical`、`domain/treeRuntime.js#createTreeBaseStats`、`domain/treeRuntime.js#isTreeSnapshotValid`、`domain/world/regionRules.js#resolveExpeditionRoute`。

公开函数上游：

- `createInitialGameState` ← `engine/session.js#createGameSession`、`engine/shootingRange.js#createShootingRange`。

## domain/levels.js

经验溢出、升级队列与LoRA/插件的前后顺序。

[源码](../../src/v2/domain/levels.js)；层：`domain`。

直接依赖：`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planLevelProgression(context: untyped)` | `SystemPlan` | 已实现 / core-preview | 按经验阈值分解升级，API不封顶；生成唯一LevelReward记录，不先开多个面板。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planNextLevelReward(context: untyped)` | `SystemPlan` | 已实现 / core-preview | 取队首：正常生命成长→LoRA→该级插件→下一级；胜负优先。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `isPluginMilestone(level: untyped, mode: untyped)` | `boolean` | 已实现 | 短途/远征固定节点，API31级起每3级；不用旧波次决定插件。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planLevelProgression` → `domain/levels.js#isPluginMilestone`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planNextLevelReward` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `isPluginMilestone` → 无内部公开函数。

公开函数上游：

- `planLevelProgression` ← `engine/flow.js#planProgressionPanels`。
- `planNextLevelReward` ← `engine/flow.js#planProgressionPanels`。
- `isPluginMilestone` ← `domain/levels.js#planLevelProgression`。

## domain/locomotion.js

@typedef {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} Body

[源码](../../src/v2/domain/locomotion.js)；层：`domain`。

直接依赖：`domain/geometry.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveEnemyMovementGoal(context: untyped, entity: untyped, target: untyped)` | `{goal:Vec2;runtime:Runtime}` | 已实现 | resolveEnemyMovementGoal；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolveEnemyVelocity(context: untyped, entity: untyped, target: untyped, desired: untyped, prior: untyped)` | `{velocity:Vec2;runtime:Runtime}` | 已实现 | resolveEnemyVelocity；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `resolveEnemyMovementGoal` → `domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`。
- `resolveEnemyVelocity` → `domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`。

公开函数上游：

- `resolveEnemyMovementGoal` ← `domain/meleeAi.js#planMeleeEnemy`。
- `resolveEnemyVelocity` ← `domain/bosses/grok.js#planGrokBoss`、`domain/meleeAi.js#planMeleeEnemy`。

## domain/lora.js

每次升级的独立UI计时与一次训练判定。

[源码](../../src/v2/domain/lora.js)；层：`domain`。

直接依赖：`domain/random.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planLoraLevel(context: untyped, event: untyped)` | `EffectPlan` | 已实现 | 装配DSH后为实际新等级建立trial队列，不对初始1级训练。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `createLoraTrial(context: untyped, level: untyped)` | `LoraTrialCreation` | 已实现 | 选择训练目标并返回trial与nextRandom；调用者必须在同一计划提交随机游标。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planLoraUiStep(context: untyped)` | `SystemPlan` | 已实现 | 仅在训练运行态推进固定UI时钟，指针左→右2秒，超时过拟合。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planLoraInput(context: untyped, command: untyped)` | `SystemPlan` | 已实现 | 处理StartTraining/ConfirmTraining边沿；左右/完美区边界判定唯一。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `resolveLoraOutcome(trial: untyped)` | `'perfect' \| 'underfit' \| 'overfit'` | 已实现 | 归一化[0.42,0.58]完美，左欠拟合，右/超时过拟合。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planLoraOutcome(context: untyped, trial: untyped)` | `EffectPlan` | 已实现 | 按trialId只改本局指定基础属性一次，并挂对应负面；同类刷新不叠乘。；训练结束进入preparing，世界仍冻结；尚待流程编排处理本级插件与后续升级后再恢复战斗。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planLoraLevel` → 无内部公开函数。
- `createLoraTrial` → `domain/random.js#chooseWeightedIndex`。
- `planLoraUiStep` → `domain/lora.js#planLoraOutcome`。
- `planLoraInput` → `domain/lora.js#planLoraOutcome`、`domain/lora.js#resolveLoraOutcome`。
- `resolveLoraOutcome` → 无内部公开函数。
- `planLoraOutcome` → `domain/lora.js#resolveLoraOutcome`、`domain/stats.js#derivePlayerStats`。

公开函数上游：

- `planLoraLevel` ← `content/handlers/dsh.js#planDshLora`。
- `createLoraTrial` ← `engine/flow.js#planProgressionPanels`。
- `planLoraUiStep` ← `engine/tick.js#advanceUiTick`。
- `planLoraInput` ← `engine/commands.js#planGameCommand`。
- `resolveLoraOutcome` ← `domain/lora.js#planLoraInput`、`domain/lora.js#planLoraOutcome`。
- `planLoraOutcome` ← `domain/lora.js#planLoraUiStep`、`domain/lora.js#planLoraInput`。

## domain/mechanics.js

Immutable cumulative mechanic lookup.

[源码](../../src/v2/domain/mechanics.js)；层：`domain`。

直接依赖：`domain/geometry.js`、`domain/plans.js`、`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `hasMechanic(state: untyped, id: untyped)` | `boolean` | 已实现 | hasMechanic；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planMechanicEvent(context: untyped, event: untyped, onlyId: untyped = null)` | `SystemPlan` | 已实现 | planMechanicEvent；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `hasMechanic` → 无内部公开函数。
- `planMechanicEvent` → `domain/geometry.js#distanceSquared`、`domain/mechanics.js#hasMechanic`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`。

公开函数上游：

- `hasMechanic` ← `domain/mechanics.js#planMechanicEvent`。
- `planMechanicEvent` ← `content/handlers/mechanics.js#planMechanic01Exploration`、`content/handlers/mechanics.js#planMechanic02Reinforcements`、`content/handlers/mechanics.js#planMechanic03GptSupport`、`content/handlers/mechanics.js#planMechanic04ClaudeBreak`、`content/handlers/mechanics.js#planMechanic05BossCombo`、`content/handlers/mechanics.js#planMechanic06AlarmCache`、`content/handlers/mechanics.js#planMechanic07Tide`、`content/handlers/mechanics.js#planMechanic08GrokFlanks`、`content/handlers/mechanics.js#planMechanic09GptReposition`、`content/handlers/mechanics.js#planMechanic10BossArena`、`content/handlers/mechanics.js#planMechanic11ObjectiveSignal`、`content/handlers/mechanics.js#planMechanic11Glasswing`、`content/handlers/mechanics.js#planMechanic12GptFourRoles`、`content/handlers/mechanics.js#planMechanic13Handoff`、`content/handlers/mechanics.js#planMechanic14Anomaly`、`content/handlers/mechanics.js#planMechanic15Integration`、`engine/hooks.js#planEventHooks`、`engine/tick.js#advanceWorldTick`。

## domain/meleeAi.js

Shared navigation/contact logic; only the brown crab has a telegraphed heavy claw.

[源码](../../src/v2/domain/meleeAi.js)；层：`domain`。

直接依赖：`domain/abilities.js`、`domain/geometry.js`、`domain/locomotion.js`、`domain/navigation.js`、`domain/plans.js`、`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planMeleeEnemy(context: untyped, heavyClaw: untyped)` | `SystemPlan` | 已实现 | 处理近身追赶、缓存寻路、接触；棕蟹额外拥有0.9秒预警重钳。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planMeleeEnemy` → `domain/abilities.js#resolveAbilityMoveScale`、`domain/abilities.js#selectAbilityTarget`、`domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/locomotion.js#resolveEnemyMovementGoal`、`domain/locomotion.js#resolveEnemyVelocity`、`domain/navigation.js#findNavigationPath`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`。

公开函数上游：

- `planMeleeEnemy` ← `content/handlers/enemies.js#planEnemyClaudeGuard`、`content/handlers/enemies.js#planEnemyGrokBot`、`domain/bosses/claude.js#planClaudeBoss`、`domain/gptPets.js#planGptPet`。

## domain/modScope.js

Snapshot the exact namespace carried by a modded adventure; ordinary and practice runs have no permanent mod scope.

[源码](../../src/v2/domain/modScope.js)；层：`domain`。

直接依赖：`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createRunModScope(state: untyped)` | `ModScope\|null` | 已实现 | 从模组冒险出发快照提取完整包锁和内容版本；原版与练习没有永久模组范围。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `scopePersistenceIntent(intent: untyped, state: untyped)` | `PersistenceIntent` | 已实现 | 为模组冒险的保存、发现、解锁和结算意图附上完整范围，不修改原意图。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `createProfileModScope(profile: untyped)` | `ModScope\|null` | 已实现 | 读取局外档绑定的完整模组范围；旧原版档案返回空范围。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `equalModScopes(a: untyped, b: untyped)` | `boolean` | 已实现 | 比较完整内容版本和模组锁；非法或非有限数据视为不匹配。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createRunModScope` → 无内部公开函数。
- `scopePersistenceIntent` → `domain/modScope.js#createRunModScope`。
- `createProfileModScope` → 无内部公开函数。
- `equalModScopes` → `domain/serialization.js#serializeCanonical`。

公开函数上游：

- `createRunModScope` ← `domain/modScope.js#scopePersistenceIntent`、`domain/settlement.js#createSettlement`。
- `scopePersistenceIntent` ← `engine/tick.js#advanceWorldTick`、`preview/host.js#mountCombatPreview`。
- `createProfileModScope` ← `application/repository.js#commitProfilePlan`、`application/repository.js#mergePersistenceIntents`、`domain/settlement.js#planSettlementCommit`。
- `equalModScopes` ← `application/repository.js#commitProfilePlan`、`application/repository.js#mergePersistenceIntents`、`domain/settlement.js#planSettlementCommit`。

## domain/modelProfiles.js

Resolve a Pet stage once, independent of its species and cumulative difficulty mechanics.

[源码](../../src/v2/domain/modelProfiles.js)；层：`domain`。

直接依赖：`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolvePetStage(entity: untyped, difficulty: untyped)` | `number` | 已实现 / core-preview + adventure-slice | resolvePetStage；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `initializeModelProfile(entity: untyped, difficulty: untyped)` | `EntityState` | 已实现 / core-preview + adventure-slice | initializeModelProfile；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planModelProfile(context: untyped, event: untyped, profileId: untyped)` | `SystemPlan` | 已实现 / core-preview + adventure-slice | planModelProfile；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolvePetGuard(context: untyped, request: untyped)` | `{blocked:boolean;damage:number;plan:SystemPlan}` | 已实现 / core-preview + adventure-slice | resolvePetGuard；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolvePetLinkFactor(state: untyped, targetId: untyped)` | `number` | 已实现 / core-preview + adventure-slice | resolvePetLinkFactor；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `resolvePetStage` → 无内部公开函数。
- `initializeModelProfile` → `domain/modelProfiles.js#resolvePetStage`。
- `planModelProfile` → `domain/modelProfiles.js#initializeModelProfile`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `resolvePetGuard` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `resolvePetLinkFactor` → `domain/modelProfiles.js#resolvePetStage`。

公开函数上游：

- `resolvePetStage` ← `domain/gptPets.js#planGptPet`、`domain/gptPets.js#planGptFields`、`domain/gptPets.js#planPetModelEvent`、`domain/modelProfiles.js#initializeModelProfile`、`domain/modelProfiles.js#resolvePetLinkFactor`、`engine/snapshot.js#createRenderSnapshot`。
- `initializeModelProfile` ← `domain/entities.js#createEntityState`、`domain/modelProfiles.js#planModelProfile`。
- `planModelProfile` ← `content/handlers/models.js#planModelClaudeHaiku`、`content/handlers/models.js#planModelClaudeSonnet`、`content/handlers/models.js#planModelClaudeOpus`、`content/handlers/models.js#planModelClaudeFable`、`content/handlers/models.js#planModelClaudeMythos`、`content/handlers/models.js#planModelGptAstra`、`content/handlers/models.js#planModelGptSol`、`content/handlers/models.js#planModelGptTerra`、`content/handlers/models.js#planModelGptLuna`、`content/handlers/models.js#planModelGrokBot`。
- `resolvePetGuard` ← `domain/damage.js#resolveDamageRequest`。
- `resolvePetLinkFactor` ← `domain/damage.js#resolveDamageRequest`。

## domain/motionSolver.js

Sweep and slide a circular body along blocking circular terrain, then clamp map bounds.

[源码](../../src/v2/domain/motionSolver.js)；层：`domain`。

直接依赖：`domain/collision.js`、`domain/geometry.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveBodyDestination(context: untyped, entity: untyped, destination: untyped)` | `Vec2` | 已实现 | 实体沿圆形阻挡扫掠并滑动，遵守地图边界与Grok穿障矩阵。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `resolveBodyDestination` → `domain/collision.js#canTraverseObstacle`、`domain/geometry.js#intersectSweptCircles`、`domain/geometry.js#normalizeVector`。

公开函数上游：

- `resolveBodyDestination` ← `content/handlers/skills.js#planSkillDisconnect`、`domain/bosses/gpt.js#planGptBoss`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/gptPets.js#planGptPet`、`domain/movement.js#planEntityMotion`。

## domain/movement.js

玩家/敌人移动与高速扫掠起终点。

[源码](../../src/v2/domain/movement.js)；层：`system`。

直接依赖：`domain/collision.js`、`domain/currents.js`、`domain/geometry.js`、`domain/motionSolver.js`、`domain/plans.js`、`domain/projectiles.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planPlayerMovement(context: untyped, input: untyped)` | `SystemPlan` | 已实现 / core-preview | 归一化移动，冲刺/水流/控制共同作用；LoRA/暂停不更新位置。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEntityMotion(context: untyped)` | `SystemPlan` | 已实现 / core-preview | 统一移动并推进回旋分段/回追/接回、到期爆破及可视效果清理；不跨墙或离线补跑。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPickupMotion(context: untyped)` | `SystemPlan` | 已实现 / core-preview | 计算大白饭吸附/接触拾取意图，半径按01/插件/树定义。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planPlayerMovement` → `domain/geometry.js#normalizeVector`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/stats.js#derivePlayerStats`。
- `planEntityMotion` → `domain/currents.js#resolveTideVelocity`、`domain/geometry.js#intersectSweptCircles`、`domain/geometry.js#normalizeVector`、`domain/motionSolver.js#resolveBodyDestination`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/projectiles.js#planProjectileBurst`。
- `planPickupMotion` → `domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `planPlayerMovement` ← `engine/tick.js#advanceWorldTick`。
- `planEntityMotion` ← `engine/tick.js#advanceWorldTick`。
- `planPickupMotion` ← `engine/tick.js#advanceWorldTick`。

## domain/navigation.js

可达性/寻路与碰撞共享规则。

[源码](../../src/v2/domain/navigation.js)；层：`domain`。

直接依赖：`domain/collision.js`、`domain/geometry.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `findNavigationPath(context: untyped, query: untyped)` | `NavigationResult` | 已实现 | 按实体碰撞profile寻路，Bot不能路径与物理不一致。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `canCloseMapPassage(context: untyped, obstacleId: untyped)` | `boolean` | 已实现 | 关闭捷径前验证主线、检查点和出口仍可达。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `chooseRetreatPoint(context: untyped, entityId: untyped, maxDistance: untyped)` | `Vec2 \| null` | 已实现 | 选择GPT后撤/保护位置，无遮挡合法点才移动。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `findNavigationPath` → `domain/collision.js#canTraverseObstacle`、`domain/geometry.js#distanceSquared`、`domain/geometry.js#intersectSweptCircles`。
- `canCloseMapPassage` → `domain/geometry.js#distanceSquared`、`domain/navigation.js#findNavigationPath`。
- `chooseRetreatPoint` → `domain/collision.js#canTraverseObstacle`、`domain/geometry.js#distanceSquared`、`domain/navigation.js#findNavigationPath`。

公开函数上游：

- `findNavigationPath` ← `domain/gptPets.js#planGptPet`、`domain/meleeAi.js#planMeleeEnemy`、`domain/navigation.js#canCloseMapPassage`、`domain/navigation.js#chooseRetreatPoint`、`domain/world/escort.js#planEscortAdvance`。
- `canCloseMapPassage` ← `domain/gptPets.js#planPetModelEvent`、`domain/world/lateMechanics.js#planLateSchedule`、`domain/world/pressure.js#planPressureEventAdvance`。
- `chooseRetreatPoint` ← `domain/gptPets.js#planGptPet`。

## domain/plans.js

计划的结构合并；不包含玩法分支。

[源码](../../src/v2/domain/plans.js)；层：`domain`。

直接依赖：`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createEmptyPlan()` | `SystemPlan` | 已实现 | 建立各输出队列为空的计划对象。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `mergeSystemPlans(plans: untyped)` | `SystemPlan` | 已实现 | 按调用顺序合并计划，保留稳定事件序号；不执行伤害/存储。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `validateSystemPlan(plan: untyped)` | `ValidationReport` | 已实现 | 拒绝未知状态路径、非法来源、负代数或无穷数值。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `createStateChange(target: untyped, id: untyped, operation: untyped, payload: untyped)` | `StateChange` | 已实现 | 将有类型的数据转换为独立、有限的计划载荷，统一StateChange创建。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createEmptyPlan` → 无内部公开函数。
- `mergeSystemPlans` → `domain/plans.js#createEmptyPlan`。
- `validateSystemPlan` → `domain/serialization.js#serializeCanonical`。
- `createStateChange` → `domain/serialization.js#serializeCanonical`。

公开函数上游：

- `createEmptyPlan` ← `content/handlers/dsh.js#planDshClaudeAppeal`、`content/handlers/dsh.js#planDshClaudeAllowlist`、`content/handlers/plugins.js#planPluginParallel`、`content/handlers/plugins.js#planPluginCompress`、`content/handlers/plugins.js#planPluginCollect`、`content/handlers/plugins.js#planPlugin5h`、`content/handlers/plugins.js#planPluginGuard`、`content/handlers/plugins.js#planPluginLocalDeploy`、`content/handlers/plugins.js#planPluginQuantInt4`、`content/handlers/plugins.js#planPluginRollbackEmergency`、`content/handlers/skills.js#planSkillDisconnect`、`domain/abilities.js#planEquippedAbility`、`domain/abilities.js#planAbilityDamage`、`domain/abilities.js#planAbilityFields`、`domain/abilities.js#planAbilityHistory`、`domain/attacks.js#planWeaponFire`、`domain/attacks.js#planSkillCast`、`domain/attacks.js#planDash`、`domain/attacks.js#planLoadoutChange`、`domain/attacks.js#planCollisionEffects`、`domain/bosses/claude.js#planClaudeBoss`、`domain/bosses/claude.js#planClaudeBan`、`domain/bosses/gpt.js#planGptBoss`、`domain/bosses/gpt.js#planGptReset`、`domain/bosses/gpt.js#planGptResetInterrupt`、`domain/bosses/gpt.js#planGptBossEvent`、`domain/bosses/grok.js#planGrokBoss`、`domain/bosses/grok.js#planGrokBossReinforcements`、`domain/bosses/grok.js#planGrokProjectiles`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/combatPlugins.js#planCombatPluginWorld`、`domain/companions.js#planCompanionAbility`、`domain/companions.js#planCompanionFollow`、`domain/companions.js#planPartnerBanContact`、`domain/companions.js#planCompanionMilestones`、`domain/distill.js#planDistillEvent`、`domain/distill.js#planDistilledAbilities`、`domain/draft.js#planPluginSelection`、`domain/draft.js#planPluginReroll`、`domain/draft.js#planPluginSkip`、`domain/dshEffects.js#planDshEffects`、`domain/easter.js#createEasterObjectives`、`domain/easter.js#planEasterEvent`、`domain/easter.js#planEasterInteraction`、`domain/easter.js#planEasterAdvance`、`domain/equipment.js#planEquipmentInteraction`、`domain/equipment.js#planWeaponPickup`、`domain/equipment.js#planSkillPickup`、`domain/gptPets.js#planGptPet`、`domain/gptPets.js#planGptFields`、`domain/gptPets.js#planPetModelEvent`、`domain/levels.js#planLevelProgression`、`domain/levels.js#planNextLevelReward`、`domain/mechanics.js#planMechanicEvent`、`domain/meleeAi.js#planMeleeEnemy`、`domain/modelProfiles.js#planModelProfile`、`domain/modelProfiles.js#resolvePetGuard`、`domain/movement.js#planPlayerMovement`、`domain/movement.js#planEntityMotion`、`domain/movement.js#planPickupMotion`、`domain/plans.js#mergeSystemPlans`、`domain/projectiles.js#planNativeProjectiles`、`domain/projectiles.js#planProjectileBurst`、`domain/rewards.js#planDeathRewards`、`domain/rewards.js#planWorldReward`、`domain/rewards.js#planTokenCollection`、`domain/scheduled.js#scheduleAbilityActions`、`domain/scheduled.js#planScheduledActions`、`domain/status.js#resolveControlRequest`、`domain/status.js#planEscapeInput`、`domain/status.js#planSealRelease`、`domain/treeRuntime.js#planTreeWeaponSwitch`、`domain/world/adventure.js#createAdventureMapPlan`、`domain/world/adventure.js#planClaudeEncounter`、`domain/world/adventure.js#planBossEncounter`、`domain/world/alarms.js#planAlarmCache`、`domain/world/api.js#planApiWithdrawal`、`domain/world/api.js#planApiBossEncounter`、`domain/world/api.js#planApiWorldAdvance`、`domain/world/api.js#planApiPressure`、`domain/world/apiMaintenance.js#planApiMaintenance`、`domain/world/escort.js#planEscortStart`、`domain/world/escort.js#planEscortAdvance`、`domain/world/expedition.js#planExpeditionTravel`、`domain/world/expedition.js#planExpeditionBossEncounter`、`domain/world/expedition.js#planExpeditionProgression`、`domain/world/expedition.js#planExpeditionRest`、`domain/world/expeditionMaintenance.js#planExpeditionMaintenance`、`domain/world/extraction.js#planExtraction`、`domain/world/lateMechanics.js#planObjectiveSignal`、`domain/world/lateMechanics.js#planChallengeInteraction`、`domain/world/lateMechanics.js#planLateSchedule`、`domain/world/map.js#planMapExploration`、`domain/world/map.js#planWorldInteraction`、`domain/world/objectives.js#planObjectiveAdvance`、`domain/world/objectives.js#planObjectiveCompletion`、`domain/world/pressure.js#planPressureEventAdvance`、`domain/world/spawning.js#planSpawnSchedule`、`domain/world/spawning.js#planEnemySpawn`、`domain/world/spawning.js#planReinforcementGroup`、`domain/world/tutorial.js#createTutorialMapPlan`、`domain/world/tutorial.js#planTutorialAdvance`、`domain/world/tutorial.js#planTutorialBoss`、`domain/world/tutorial.js#planTutorialRetry`、`engine/commands.js#planGameCommand`、`engine/flow.js#planFlowTransition`、`engine/flow.js#planProgressionPanels`、`engine/flow.js#planPause`、`engine/flow.js#planResume`、`engine/tick.js#advanceWorldTick`。
- `mergeSystemPlans` ← `domain/abilities.js#planAbilityBursts`、`domain/ai.js#planEnemyAi`、`domain/ai.js#planCompanionAi`、`domain/ai.js#planBossAi`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/combatPlugins.js#planCombatPluginWorld`、`domain/dshEffects.js#planDshEffects`、`domain/scheduled.js#planScheduledActions`、`engine/hooks.js#planEventHooks`。
- `validateSystemPlan` ← `engine/reducer.js#applySystemPlan`、`engine/reducer.js#applyOwnedTickPlan`、`engine/reducer.js#commitWorkingState`、`engine/reducer.js#commitOwnedTickState`。
- `createStateChange` ← `content/handlers/plugins.js#planPluginParallel`、`content/handlers/skills.js#planSkillDisconnect`、`domain/abilities.js#planEquippedAbility`、`domain/abilities.js#planAbilityFields`、`domain/abilities.js#planAbilityBursts`、`domain/abilities.js#planAbilityHistory`、`domain/attacks.js#planWeaponFire`、`domain/attacks.js#planSkillCast`、`domain/attacks.js#planDash`、`domain/attacks.js#planLoadoutChange`、`domain/attacks.js#planCollisionEffects`、`domain/bosses/claude.js#planClaudeBoss`、`domain/bosses/gpt.js#planGptBoss`、`domain/bosses/gpt.js#planGptReset`、`domain/bosses/gpt.js#planGptResetInterrupt`、`domain/bosses/gpt.js#planGptBossEvent`、`domain/bosses/grok.js#planGrokBoss`、`domain/bosses/grok.js#planGrokBossReinforcements`、`domain/bosses/grok.js#planGrokProjectiles`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/combatPlugins.js#planCombatPluginWorld`、`domain/companions.js#planCompanionAbility`、`domain/companions.js#planCompanionFollow`、`domain/companions.js#planPartnerBanContact`、`domain/companions.js#planCompanionMilestones`、`domain/distill.js#planDistillEvent`、`domain/distill.js#planDistilledAbilities`、`domain/draft.js#planPluginSelection`、`domain/draft.js#planPluginReroll`、`domain/draft.js#planPluginSkip`、`domain/dshEffects.js#planDshEffects`、`domain/easter.js#createEasterObjectives`、`domain/easter.js#planEasterEvent`、`domain/easter.js#planEasterInteraction`、`domain/easter.js#planEasterAdvance`、`domain/equipment.js#planWeaponPickup`、`domain/equipment.js#planSkillPickup`、`domain/gptPets.js#planGptPet`、`domain/gptPets.js#planGptFields`、`domain/gptPets.js#planPetModelEvent`、`domain/levels.js#planLevelProgression`、`domain/levels.js#planNextLevelReward`、`domain/mechanics.js#planMechanicEvent`、`domain/meleeAi.js#planMeleeEnemy`、`domain/modelProfiles.js#planModelProfile`、`domain/modelProfiles.js#resolvePetGuard`、`domain/movement.js#planPlayerMovement`、`domain/movement.js#planEntityMotion`、`domain/movement.js#planPickupMotion`、`domain/projectiles.js#planNativeProjectiles`、`domain/projectiles.js#planProjectileBurst`、`domain/rewards.js#planDeathRewards`、`domain/rewards.js#planWorldReward`、`domain/rewards.js#planTokenCollection`、`domain/scheduled.js#scheduleAbilityActions`、`domain/scheduled.js#planScheduledActions`、`domain/status.js#resolveControlRequest`、`domain/status.js#planEscapeInput`、`domain/status.js#planStatusAdvance`、`domain/status.js#planSealRelease`、`domain/treeRuntime.js#planTreeWeaponSwitch`、`domain/world/adventure.js#createAdventureMapPlan`、`domain/world/adventure.js#planClaudeEncounter`、`domain/world/adventure.js#planBossEncounter`、`domain/world/alarms.js#planAlarmCache`、`domain/world/api.js#planApiWithdrawal`、`domain/world/api.js#planApiBossEncounter`、`domain/world/api.js#planApiWorldAdvance`、`domain/world/api.js#planApiPressure`、`domain/world/apiMaintenance.js#planApiMaintenance`、`domain/world/escort.js#planEscortStart`、`domain/world/escort.js#planEscortAdvance`、`domain/world/expedition.js#planExpeditionTravel`、`domain/world/expedition.js#planExpeditionProgression`、`domain/world/expedition.js#planExpeditionRest`、`domain/world/expeditionMaintenance.js#planExpeditionMaintenance`、`domain/world/expeditionMap.js#createExpeditionRegionPlan`、`domain/world/extraction.js#planExtraction`、`domain/world/lateMechanics.js#planObjectiveSignal`、`domain/world/lateMechanics.js#planChallengeInteraction`、`domain/world/lateMechanics.js#planLateSchedule`、`domain/world/map.js#createMapPlan`、`domain/world/map.js#planMapExploration`、`domain/world/map.js#planWorldInteraction`、`domain/world/objectives.js#planObjectiveAdvance`、`domain/world/objectives.js#planObjectiveCompletion`、`domain/world/pressure.js#planPressureEventAdvance`、`domain/world/spawning.js#planSpawnSchedule`、`domain/world/spawning.js#planEnemySpawn`、`domain/world/spawning.js#planReinforcementGroup`、`domain/world/tutorial.js#createTutorialMapPlan`、`domain/world/tutorial.js#planTutorialAdvance`、`domain/world/tutorial.js#planTutorialBoss`、`domain/world/tutorial.js#planTutorialRetry`、`engine/commands.js#planGameCommand`、`engine/flow.js#planFlowTransition`、`engine/flow.js#planProgressionPanels`、`engine/flow.js#planPause`、`engine/tick.js#advanceWorldTick`。

## domain/pluginStats.js

Active rank, never an archived or difficulty-independent duplicate.

[源码](../../src/v2/domain/pluginStats.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `pluginRank(state: untyped, id: untyped)` | `number` | 已实现 | pluginRank；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `deriveRawWeaponStats(state: untyped, weapon: untyped, catalog: untyped)` | `WeaponStats` | 已实现 | deriveRawWeaponStats；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolveContextWeaponFactor(state: untyped)` | `number` | 已实现 | resolveContextWeaponFactor；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolveCacheHitFactor(state: untyped, request: untyped)` | `number` | 已实现 | resolveCacheHitFactor；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolveSkillPreparation(state: untyped)` | `{power:number;duration:number;push:number}` | 已实现 | resolveSkillPreparation；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `pluginRank` → 无内部公开函数。
- `deriveRawWeaponStats` → 无内部公开函数。
- `resolveContextWeaponFactor` → 无内部公开函数。
- `resolveCacheHitFactor` → 无内部公开函数。
- `resolveSkillPreparation` → `domain/pluginStats.js#pluginRank`。

公开函数上游：

- `pluginRank` ← `domain/pluginStats.js#resolveSkillPreparation`。
- `deriveRawWeaponStats` ← `domain/combatPlugins.js#planCombatPluginEvent`、`domain/projectiles.js#createWeaponProjectile`。
- `resolveContextWeaponFactor` ← `domain/stats.js#deriveWeaponStats`。
- `resolveCacheHitFactor` ← `domain/damage.js#resolveDamageRequest`。
- `resolveSkillPreparation` ← `domain/attacks.js#planSkillCast`。

## domain/profile/nest.js

设施、永久装备/技能、伙伴与出发配装。

[源码](../../src/v2/domain/profile/nest.js)；层：`domain`。

直接依赖：`domain/profile/tree.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planFacilityPurchase(profile: untyped, facilityId: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | 扣零件、建设设施，默认装备仍可用；重复购买拒绝。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPermanentUnlock(profile: untyped, definitionId: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | 已发现且满足设施时购买武器/技能出发选择权，不赠高品质实例。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planDshEquipment(profile: untyped, slots: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | 校验拥有/重复/槽数/选项，只在小窝更换，不改当前出发快照。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `isDifficultyUnlocked(profile: untyped, mode: untyped, level: untyped)` | `boolean` | 已实现 | isDifficultyUnlocked；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `describeDifficultyAccess(profile: untyped, mode: untyped, level: untyped)` | `{playable:boolean, reason:string}` | 已实现 | describeDifficultyAccess；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `offersApiDeparture(profile: untyped, mode: untyped)` | `boolean` | 已实现 | offersApiDeparture；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `validateStartRequest(profile: untyped, request: untyped, catalog: untyped)` | `ValidationReport` | 已实现 | 检查模式/难度/武器/伙伴/设施和活动存档覆盖确认。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planResidentRescue(profile: untyped, companionId: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | planResidentRescue；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planFacilityPurchase` → 无内部公开函数。
- `planPermanentUnlock` → 无内部公开函数。
- `planDshEquipment` → `domain/profile/tree.js#resolveDshSlotCount`。
- `isDifficultyUnlocked` → 无内部公开函数。
- `describeDifficultyAccess` → `domain/profile/nest.js#isDifficultyUnlocked`。
- `offersApiDeparture` → `domain/profile/nest.js#isDifficultyUnlocked`。
- `validateStartRequest` → `domain/profile/nest.js#isDifficultyUnlocked`。
- `planResidentRescue` → 无内部公开函数。

公开函数上游：

- `planFacilityPurchase` ← `application/game.js#submitNestAction`、`application/nest.js#executeNestAction`。
- `planPermanentUnlock` ← `application/game.js#submitNestAction`、`application/nest.js#executeNestAction`。
- `planDshEquipment` ← `application/game.js#submitNestAction`、`application/nest.js#executeNestAction`。
- `isDifficultyUnlocked` ← `domain/profile/nest.js#describeDifficultyAccess`、`domain/profile/nest.js#offersApiDeparture`、`domain/profile/nest.js#validateStartRequest`。
- `describeDifficultyAccess` ← `preview/host.js#mountCombatPreview`。
- `offersApiDeparture` ← `preview/host.js#mountCombatPreview`。
- `validateStartRequest` ← `application/game.js#startAdventure`、`application/nest.js#prepareAdventureStart`。
- `planResidentRescue` ← `application/nest.js#executeNestAction`。

## domain/profile/tree.js

27个永久节点、免费整树退款与DSH槽计算。

[源码](../../src/v2/domain/profile/tree.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `validateTreePurchase(profile: untyped, nodeId: untyped, catalog: untyped)` | `ValidationReport` | 已实现 | 校验前置、余额与DSH基础花费门槛，不消耗资金。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planTreePurchase(profile: untyped, nodeId: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | 一次节点购买与余额扣除作为同个局外计划。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planTreeRespec(profile: untyped, catalog: untyped)` | `ProfilePlan` | 已实现 | 整树按已购成本全退，DSH槽关闭并卸下配装，收藏保留。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `resolveDshSlotCount(profile: untyped, catalog: untyped)` | `number` | 已实现 | 仅根据三个特殊节点返回0–3槽，不根据收藏数量增加槽。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `validateTreePurchase` → 无内部公开函数。
- `planTreePurchase` → `domain/profile/tree.js#validateTreePurchase`。
- `planTreeRespec` → 无内部公开函数。
- `resolveDshSlotCount` → 无内部公开函数。

公开函数上游：

- `validateTreePurchase` ← `domain/profile/tree.js#planTreePurchase`、`domain/settlement.js#validateProfileRecord`、`preview/nestManager.js#mountNestManager`。
- `planTreePurchase` ← `application/game.js#submitNestAction`、`application/nest.js#executeNestAction`。
- `planTreeRespec` ← `application/game.js#submitNestAction`、`application/nest.js#executeNestAction`。
- `resolveDshSlotCount` ← `domain/profile/nest.js#planDshEquipment`、`domain/settlement.js#validateProfileRecord`、`preview/nestManager.js#mountNestManager`。

## domain/profile/unlocks.js

发现/彩蛋/Boss里程碑，独立幂等id。

[源码](../../src/v2/domain/profile/unlocks.js)；层：`domain`。

直接依赖：`content/achievements.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planDiscoveryUnlock(profile: untyped, event: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | 发现/救助立即持久化计划，恢复旧检查点不撤销也不重发资源。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planBossUnlock(profile: untyped, event: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | 数字难度首领触发DSH里程碑；API不发数字成就或为每阶段堆永久账本，仅保留Grok居民事实。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEasterUnlock(profile: untyped, event: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | LoRA/饭点/摸鱼等定义条件的唯一永久解锁计划，不需已开槽。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planAchievementUnlock(profile: untyped, event: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | 校验正式冒险的真实有效期重置事件，永久幂等解锁“这是哪个‘重置’？”，不发资源，练习事件拒绝。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `runReceiptStamps(profile: untyped, runId: untyped, catalog: untyped)` | `string[]` | 已实现 | runReceiptStamps；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planEndlessClear(profile: untyped, event: untyped)` | `void` | 已实现 | planEndlessClear；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planDiscoveryUnlock` → 无内部公开函数。
- `planBossUnlock` → 无内部公开函数。
- `planEasterUnlock` → 无内部公开函数。
- `planAchievementUnlock` → 无内部公开函数。
- `runReceiptStamps` → 无内部公开函数。
- `planEndlessClear` → 无内部公开函数。

公开函数上游：

- `planDiscoveryUnlock` ← `application/repository.js#mergePersistenceIntents`。
- `planBossUnlock` ← `application/repository.js#mergePersistenceIntents`。
- `planEasterUnlock` ← `application/repository.js#mergePersistenceIntents`。
- `planAchievementUnlock` ← `application/repository.js#mergePersistenceIntents`。
- `runReceiptStamps` ← `preview/host.js#mountCombatPreview`。
- `planEndlessClear` ← `application/repository.js#mergePersistenceIntents`。

## domain/projectiles.js

原生/并行弹体工厂、行为快照与一次爆破计划。

[源码](../../src/v2/domain/projectiles.js)；层：`domain`。

直接依赖：`content/weaponCapabilities.js`、`domain/entities.js`、`domain/plans.js`、`domain/pluginStats.js`、`domain/serialization.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createWeaponProjectile(context: untyped, weapon: untyped, stats: untyped, angle: untyped, id: untyped, chainId: untyped, sourceKind: untyped, damage: untyped)` | `EntityState` | 已实现 / core-preview + adventure-slice | 按原生模板建立独立弹体实例；主弹/并行次级弹共用去回程、爆破与品质快照，不重乘输出。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planNativeProjectiles(context: untyped)` | `SystemPlan` | 已实现 / core-preview | 六把MCP按真实参数产弹；每枚独立attackId，每次原生射击仅一个WeaponFired。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planProjectileBurst(context: untyped, projectile: untyped, position: untyped)` | `SystemPlan` | 已实现 / core-preview + adventure-slice | 在碰撞或射程到期点结算一次非暴击范围伤害，生成12tick可视涟漪；不冒充基础命中。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createWeaponProjectile` → `content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/entities.js#createEntityState`、`domain/pluginStats.js#deriveRawWeaponStats`。
- `planNativeProjectiles` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/projectiles.js#createWeaponProjectile`、`domain/stats.js#deriveWeaponStats`。
- `planProjectileBurst` → `domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`。

公开函数上游：

- `createWeaponProjectile` ← `content/handlers/plugins.js#planPluginParallel`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/projectiles.js#planNativeProjectiles`。
- `planNativeProjectiles` ← `content/handlers/weapons.js#planWeaponBubble`、`content/handlers/weapons.js#planWeaponFan`、`content/handlers/weapons.js#planWeaponVector`、`content/handlers/weapons.js#planWeaponStream`、`content/handlers/weapons.js#planWeaponReturn`、`content/handlers/weapons.js#planWeaponBatch`、`preview/arcadePanels.js#createShotLane`。
- `planProjectileBurst` ← `domain/attacks.js#planCollisionEffects`、`domain/movement.js#planEntityMotion`。

## domain/quotas.js

逐来源滚动十秒伤害额度与账本。

[源码](../../src/v2/domain/quotas.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveDamageBudgetSource(state: untyped, sourceId: untyped)` | `Id` | 已实现 | 将火箭/持续区域追溯到发射者，Boss重置保持同一个sourceId。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `pruneDamageBudget(entries: untyped, tick: untyped)` | `readonly DamageBudgetEntry[]` | 已实现 | 移除tick<=当前tick-600的记录，含精确边界。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planQuotaAllowance(context: untyped, request: untyped)` | `QuotaResolution` | 已实现 | 在合法命中后计算5h防御前许可伤害并计划记账；护盾前消耗，额度可为0。；无敌/闪避否决的请求不记账；未持有时保留最近十秒历史用于重新装配。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `resolveDamageBudgetSource` → 无内部公开函数。
- `pruneDamageBudget` → 无内部公开函数。
- `planQuotaAllowance` → `domain/quotas.js#pruneDamageBudget`、`domain/quotas.js#resolveDamageBudgetSource`。

公开函数上游：

- `resolveDamageBudgetSource` ← `domain/quotas.js#planQuotaAllowance`。
- `pruneDamageBudget` ← `domain/quotas.js#planQuotaAllowance`。
- `planQuotaAllowance` ← `domain/damage.js#resolveDamageRequest`。

## domain/random.js

显式随机状态；不使用Math.random。

[源码](../../src/v2/domain/random.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createRandomStreams(seed: untyped)` | `RandomStreams` | 已实现 | 由seed派生世界/奖励/战斗/DSH/LoRA/事件六条随机流。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `drawRandom(random: untyped)` | `RandomDraw` | 已实现 | 返回一次随机值与新游标，不修改输入。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `chooseWeightedIndex(weights: untyped, random: untyped)` | `Result<{ index: number; next: RandomState }>` | 已实现 | 按非负权重选择索引，明确空池/总权重0错误。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `createRandomStreams` → 无内部公开函数。
- `drawRandom` → 无内部公开函数。
- `chooseWeightedIndex` → `domain/random.js#drawRandom`。

公开函数上游：

- `createRandomStreams` ← `domain/initial.js#createInitialGameState`。
- `drawRandom` ← `domain/damage.js#resolveDamageRequest`、`domain/difficulty.js#resolveModelProfileId`、`domain/dshCycle.js#planDshCycleEvent`、`domain/random.js#chooseWeightedIndex`、`domain/rewards.js#planDeathRewards`、`domain/world/map.js#createMapPlan`、`preview/host.js#mountCombatPreview`。
- `chooseWeightedIndex` ← `domain/draft.js#createPluginChoice`、`domain/lora.js#createLoraTrial`。

## domain/rewards.js

实体/群组/箱子/目标奖励计划，无存储I/O。

[源码](../../src/v2/domain/rewards.js)；层：`domain`。

直接依赖：`domain/plans.js`、`domain/random.js`、`domain/serialization.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planDeathRewards(context: untyped, records: untyped)` | `RewardPlan` | 已实现 / core-preview + adventure-slice | 幂等死亡经验/材料；API首领8碎片4零件，普通材料每分钟2碎片1零件，回响/召兵无额外收益。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `explorationLootMultiplier(level: untyped)` | `number` | 已实现 | explorationLootMultiplier；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planWorldReward(context: untyped, rewardId: untyped)` | `RewardPlan` | 已实现 / adventure-slice | 为当前信标/资源箱生成稳定ID的拾取物，永久收入由事务结算处理。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planTokenCollection(context: untyped, pickupId: untyped)` | `SystemPlan` | 已实现 / core-preview | 只消费接触的大白饭/材料；装备走F和实例交换，不自动吸入、不变为资源。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planDeathRewards` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/random.js#drawRandom`、`domain/serialization.js#toJson`。
- `explorationLootMultiplier` → 无内部公开函数。
- `planWorldReward` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/rewards.js#explorationLootMultiplier`。
- `planTokenCollection` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `planDeathRewards` ← `engine/tick.js#advanceWorldTick`。
- `explorationLootMultiplier` ← `domain/rewards.js#planWorldReward`、`preview/host.js#mountCombatPreview`。
- `planWorldReward` ← `domain/world/lateMechanics.js#planLateSchedule`、`domain/world/map.js#planWorldInteraction`、`domain/world/objectives.js#planObjectiveCompletion`。
- `planTokenCollection` ← `engine/effectLoop.js#evaluateEffectRequest`。

## domain/scheduled.js

Store typed declarative delayed actions, never a stale mutable-state replacement plan.

[源码](../../src/v2/domain/scheduled.js)；层：`domain`。

直接依赖：`domain/abilities.js`、`domain/entities.js`、`domain/plans.js`、`domain/serialization.js`、`domain/shields.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `scheduleAbilityActions(context: untyped, id: untyped, delay: untyped, actions: untyped, point: untyped, radius: untyped = 12)` | `SystemPlan` | 已实现 | scheduleAbilityActions；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planScheduledActions(context: untyped)` | `SystemPlan` | 已实现 | planScheduledActions；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `scheduleAbilityActions` → `domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`。
- `planScheduledActions` → `domain/abilities.js#planAbilityDamage`、`domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/plans.js#mergeSystemPlans`、`domain/shields.js#planShieldGrant`。

公开函数上游：

- `scheduleAbilityActions` ← `domain/combatPlugins.js#planCombatPluginEvent`。
- `planScheduledActions` ← `engine/tick.js#advanceWorldTick`。

## domain/serialization.js

规范化纯数据编码与64位校验摘要；非认证签名。

[源码](../../src/v2/domain/serialization.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `serializeCanonical(value: untyped)` | `string` | 已实现 | 按键排序编码有限纯数据；拒绝循环、稀疏数组和不支持的值。；仅对外公开值编码；递归私有encode带祖先检测。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `createDataDigest(value: untyped)` | `string` | 已实现 | 对规范UTF-8数据计算FNV-1a64校验，检测意外损坏与回放偏差。；不用于认证或防篡改。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `toJson(value: untyped)` | `Json` | 已实现 | 在参数边界验证并复制规范纯JSON数据。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `serializeCanonical` → 无内部公开函数。
- `createDataDigest` → `domain/serialization.js#serializeCanonical`。
- `toJson` → `domain/serialization.js#serializeCanonical`。

公开函数上游：

- `serializeCanonical` ← `adapters/storage.js#compareAndSwapStorageRecord`、`application/nest.js#prepareAdventureStart`、`application/replay.js#beginRecording`、`application/replay.js#appendRecordedCommands`、`application/replay.js#appendRecordingStep`、`application/replay.js#replayRecording`、`application/repository.js#commitProfilePlan`、`application/repository.js#mergePersistenceIntents`、`content/catalog.js#validateContentCatalog`、`content/mods.js#parseModPackage`、`content/mods.js#composeModCatalog`、`domain/checkpoint.js#createCheckpoint`、`domain/checkpoint.js#validateCheckpoint`、`domain/checkpoint.js#restoreCheckpointState`、`domain/initial.js#createInitialGameState`、`domain/modScope.js#equalModScopes`、`domain/plans.js#validateSystemPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#createDataDigest`、`domain/serialization.js#toJson`、`domain/settlement.js#validateProfileRecord`、`domain/stateValidation.js#inspectGameState`、`engine/commands.js#validateGameCommand`、`engine/effectLoop.js#evaluateEffectRequest`、`engine/reducer.js#applySystemPlan`、`engine/reducer.js#applyOwnedTickPlan`、`engine/session.js#createReplaySession`。
- `createDataDigest` ← `application/modProfile.js#createModProfileNamespace`、`application/modProfile.js#createModProfileSnapshot`、`content/mods.js#composeModCatalog`、`domain/checkpoint.js#createCheckpoint`、`domain/checkpoint.js#validateCheckpoint`、`engine/snapshot.js#createStateDigest`。
- `toJson` ← `domain/abilities.js#planAbilityDamage`、`domain/attacks.js#planSkillCast`、`domain/attacks.js#planCollisionEffects`、`domain/bosses/claude.js#planClaudeBoss`、`domain/bosses/claude.js#planClaudeBan`、`domain/bosses/gpt.js#planGptBoss`、`domain/bosses/grok.js#planGrokProjectiles`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/combatPlugins.js#planCombatPluginWorld`、`domain/dshCycle.js#planDshCycleEvent`、`domain/easter.js#planEasterInteraction`、`domain/easter.js#planEasterAdvance`、`domain/equipment.js#planWeaponPickup`、`domain/equipment.js#planSkillPickup`、`domain/gptPets.js#planGptPet`、`domain/gptPets.js#planGptFields`、`domain/mechanics.js#planMechanicEvent`、`domain/meleeAi.js#planMeleeEnemy`、`domain/projectiles.js#planProjectileBurst`、`domain/rewards.js#planDeathRewards`、`domain/scheduled.js#scheduleAbilityActions`、`domain/status.js#resolveControlRequest`、`domain/world/expedition.js#planExpeditionTravel`、`engine/snapshot.js#createRenderSnapshot`。

## domain/settlement.js

对局结果与局外余额同事务计划。

[源码](../../src/v2/domain/settlement.js)；层：`domain`。

直接依赖：`domain/checkpoint.js`、`domain/modScope.js`、`domain/profile/tree.js`、`domain/serialization.js`、`versions.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createSettlement(state: untyped, outcome: untyped)` | `Settlement` | 已实现 | 按真实终态生成结算；探索撤离全额带回，失败无材料收入；生存模式生成对局成绩。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planSettlementCommit(profile: untyped, settlement: untyped, catalog: untyped)` | `Result<ProfilePlan>` | 已实现 | 校验结算与档案范围、活动检查点并幂等入账；Free引导首次完成发一张算力卡。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `validateProfileRecord(profile: untyped, catalog: untyped)` | `ValidationReport` | 已实现 | 校验余额/树前置/槽位/去重/活动存档引用；迁移失败不覆盖原数据。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `createDefaultProfile()` | `Profile` | 已实现 | createDefaultProfile；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createSettlement` → `domain/modScope.js#createRunModScope`。
- `planSettlementCommit` → `domain/modScope.js#createProfileModScope`、`domain/modScope.js#equalModScopes`、`domain/settlement.js#validateProfileRecord`。
- `validateProfileRecord` → `domain/checkpoint.js#validateCheckpoint`、`domain/profile/tree.js#resolveDshSlotCount`、`domain/profile/tree.js#validateTreePurchase`、`domain/serialization.js#serializeCanonical`。
- `createDefaultProfile` → 无内部公开函数。

公开函数上游：

- `createSettlement` ← `application/game.js#settleAdventure`、`preview/host.js#mountCombatPreview`。
- `planSettlementCommit` ← `application/game.js#settleAdventure`、`application/repository.js#mergePersistenceIntents`。
- `validateProfileRecord` ← `application/game.js#createApplication`、`application/modProfile.js#createModProfileSnapshot`、`application/repository.js#readProfileRepository`、`application/repository.js#commitProfilePlan`、`application/repository.js#mergePersistenceIntents`、`domain/settlement.js#planSettlementCommit`。
- `createDefaultProfile` ← `application/modProfile.js#createModProfileSnapshot`、`application/repository.js#readProfileRepository`。

## domain/shells.js

普通Claude四阶段外壳与唯一破壳事件。

[源码](../../src/v2/domain/shells.js)；层：`domain`。

直接依赖：`domain/geometry.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveShellContact(context: untyped, request: untyped)` | `ShellResolution` | 已实现 | 按模型朝向/弱点判定壳伤，非弱点0伤，溢出不伤本体。；范围中心重合时用入射方向反向；API背部120°，Opus侧后270°。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planShellBreak(context: untyped, entityId: untyped)` | `EffectPlan` | 已实现 | 只一次破壳：Sonnet/Opus晕后加速，API直接加速不眩晕。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `resolveShellContact` → `domain/geometry.js#isContactWithinArc`、`domain/shells.js#planShellBreak`。
- `planShellBreak` → 无内部公开函数。

公开函数上游：

- `resolveShellContact` ← `domain/damage.js#resolveDamageRequest`。
- `planShellBreak` ← `domain/shells.js#resolveShellContact`。

## domain/shields.js

来源护盾按到期顺序消耗。

[源码](../../src/v2/domain/shields.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveShieldAbsorption(context: untyped, targetId: untyped, damage: untyped)` | `ShieldResolution` | 已实现 | 最早到期优先，相同时按seq；全挡不产生生命受伤。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planShieldGrant(context: untyped, targetId: untyped, sourceId: untyped, amount: untyped, duration: untyped)` | `EffectPlan` | 已实现 | 按同名盾取大/刷新策略授予护盾，不改变最大生命。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `resolveShieldAbsorption` → 无内部公开函数。
- `planShieldGrant` → 无内部公开函数。

公开函数上游：

- `resolveShieldAbsorption` ← `domain/damage.js#resolveDamageRequest`。
- `planShieldGrant` ← `content/handlers/skills.js#planSkillCache`、`domain/combatPlugins.js#planCombatPluginWorld`、`domain/companions.js#planCompanionAbility`、`domain/dshEffects.js#planDshEffects`、`domain/scheduled.js#planScheduledActions`、`engine/effectLoop.js#evaluateEffectRequest`。

## domain/stateValidation.js

保存与提交共用的单局状态不变量检查；避免domain反向依赖engine。

[源码](../../src/v2/domain/stateValidation.js)；层：`domain`。

直接依赖：`content/skillCapabilities.js`、`content/weaponCapabilities.js`、`domain/serialization.js`、`domain/treeRuntime.js`、`domain/world/regionRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `inspectGameState(state: untyped, catalog: untyped)` | `ValidationReport` | 已实现 | 检查版本、有限数据、实体引用、壳、护盾、机制累计集合、槽位与命中账本。；返回诊断，不修改状态；完整内容目录由独立catalog校验。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `inspectGameState` → `content/skillCapabilities.js#resolveSkillTemplate`、`content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/serialization.js#serializeCanonical`、`domain/treeRuntime.js#isTreeSnapshotValid`、`domain/world/regionRules.js#resolveExpeditionRoute`。

公开函数上游：

- `inspectGameState` ← `domain/checkpoint.js#validateCheckpoint`、`engine/reducer.js#validateStateInvariants`。

## domain/stats.js

基础/来源修饰的分离计算，派生伤害只应用一次。

[源码](../../src/v2/domain/stats.js)；层：`domain`。

直接依赖：`content/catalog.js`、`domain/pluginStats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `derivePlayerStats(state: untyped, catalog: untyped)` | `BaseStats` | 已实现 | 从已含出发树加成的baseStats、来源修饰与LoRA修饰推导有效属性；不重复应用树。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `deriveWeaponStats(state: untyped, weapon: untyped, catalog: untyped)` | `WeaponStats` | 已实现 | 合并原始品质/28秒临时品质/武器修饰，输出攻击参数。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `resolveStatModifier(base: untyped, modifiers: untyped, minimum: untyped, maximum: untyped)` | `number` | 已实现 | 同组加算、指定组乘算、最终限幅；不重复处理品质或暴击。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `derivePlayerStats` → `domain/stats.js#resolveStatModifier`。
- `deriveWeaponStats` → `content/catalog.js#findContentDefinition`、`domain/pluginStats.js#resolveContextWeaponFactor`、`domain/stats.js#derivePlayerStats`、`domain/stats.js#resolveStatModifier`。
- `resolveStatModifier` → 无内部公开函数。

公开函数上游：

- `derivePlayerStats` ← `content/handlers/plugins.js#planPluginParallel`、`domain/abilities.js#planEquippedAbility`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/combatPlugins.js#planCombatPluginWorld`、`domain/companions.js#planCompanionAbility`、`domain/currents.js#resolveTideVelocity`、`domain/damage.js#resolveDamageRequest`、`domain/distill.js#planDistillEvent`、`domain/distill.js#planDistilledAbilities`、`domain/dshEffects.js#planDshEffects`、`domain/lora.js#planLoraOutcome`、`domain/movement.js#planPlayerMovement`、`domain/stats.js#deriveWeaponStats`、`domain/status.js#resolveControlRequest`、`preview/host.js#mountCombatPreview`。
- `deriveWeaponStats` ← `domain/attacks.js#planWeaponFire`、`domain/projectiles.js#planNativeProjectiles`、`preview/arcadePanels.js#createShotLane`。
- `resolveStatModifier` ← `domain/stats.js#derivePlayerStats`、`domain/stats.js#deriveWeaponStats`。

## domain/status.js

控制/封禁请求与拦截优先级。

[源码](../../src/v2/domain/status.js)；层：`domain`。

直接依赖：`domain/entities.js`、`domain/geometry.js`、`domain/plans.js`、`domain/serialization.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveControlRequest(context: untyped, request: untyped)` | `ControlResolution` | 已实现 | Glasswing只处理一次，再算抵抗/拦截；返回计划，不立即调用插件。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `applyGlasswingModifier(context: untyped, request: untyped)` | `ControlRequest` | 已实现 | 11级Claude Boss控制时长/禁锢挣脱要求×2；不复制伤害或状态。；使用appliedModifierIds去重；技能/伙伴封禁破封命中数不翻倍。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `selectControlInterceptor(context: untyped, request: untyped)` | `Id \| null` | 已实现 | 按树→故障转移→补丁或白名单→越狱选择第一可用防护，仅消费一份。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEscapeInput(context: untyped, command: untyped)` | `EffectPlan` | 已实现 | 只接受有效按下边沿/辅助节奏，累积挣脱；LoRA界面不接收。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planStatusAdvance(context: untyped)` | `SystemPlan` | 已实现 | 更新控制、免疫和训练负面倒计时；暂停不走，解除不刷新技能。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planSealRelease(context: untyped, event: untyped)` | `SystemPlan` | 已实现 | 封印被主武器击碎时解除对应技能封禁，不重置冷却，不发掉落。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `resolveControlRequest` → `domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/geometry.js#normalizeVector`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`、`domain/stats.js#derivePlayerStats`、`domain/status.js#applyGlasswingModifier`、`domain/status.js#selectControlInterceptor`。
- `applyGlasswingModifier` → 无内部公开函数。
- `selectControlInterceptor` → 无内部公开函数。
- `planEscapeInput` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planStatusAdvance` → `domain/plans.js#createStateChange`。
- `planSealRelease` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `resolveControlRequest` ← `engine/effectLoop.js#evaluateEffectRequest`。
- `applyGlasswingModifier` ← `domain/status.js#resolveControlRequest`。
- `selectControlInterceptor` ← `domain/status.js#resolveControlRequest`。
- `planEscapeInput` ← `engine/commands.js#planGameCommand`。
- `planStatusAdvance` ← `engine/tick.js#advanceWorldTick`。
- `planSealRelease` ← `engine/hooks.js#planEventHooks`。

## domain/treeRuntime.js

Permanent tree runtime rules. All reads use the departure snapshot, never the live Profile.

[源码](../../src/v2/domain/treeRuntime.js)；层：`domain`。

直接依赖：`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `isTreeSnapshotValid(ids: untyped, catalog: untyped)` | `boolean` | 已实现 | 校验出发树ID去重、真实前置与DSH基础树消费门槛。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `createTreeBaseStats(ids: untyped)` | `BaseStats` | 已实现 | 一次构造初始生命/护甲/移速；MCP专属输出由武器派生消费，不影响全部技能。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolveTreeSurvival(state: untyped, hpDamage: untyped)` | `{hpDamage:number; hp:number; invulnerable:number; runtime:Record<string,Json>; events:readonly string[]}` | 已实现 | 实际生命伤害更新无伤时钟；低血治疗一次，致死保命一次并给2秒保护，返回结果不改状态。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planTreeWeaponSwitch(context: untyped)` | `SystemPlan` | 已实现 | 切换成功时规划下一发+25%与1秒移速；分别保存5秒/8秒内置冷却。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `isTreeSnapshotValid` → 无内部公开函数。
- `createTreeBaseStats` → 无内部公开函数。
- `resolveTreeSurvival` → 无内部公开函数。
- `planTreeWeaponSwitch` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `isTreeSnapshotValid` ← `domain/initial.js#createInitialGameState`、`domain/stateValidation.js#inspectGameState`。
- `createTreeBaseStats` ← `domain/initial.js#createInitialGameState`。
- `resolveTreeSurvival` ← `domain/damage.js#resolveDamageRequest`。
- `planTreeWeaponSwitch` ← `domain/attacks.js#planLoadoutChange`、`domain/equipment.js#planWeaponPickup`。

## domain/world/adventure.js

Claude短途纵切的连续地图；首领与其他模式不因此宣称完整实现。

[源码](../../src/v2/domain/world/adventure.js)；层：`domain`。

直接依赖：`domain/easter.js`、`domain/entities.js`、`domain/plans.js`、`domain/world/extraction.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createAdventureMapPlan(start: untyped, catalog: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 构建短途/API海域：信标、检查点、资源箱、装备、驻守敌人和按难度开放的机制。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planClaudeEncounter(context: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 任意两个信标完成后，以稳定ID创建一次Claude首领并切换boss阶段。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planBossEncounter(context: untyped)` | `SystemPlan` | 已实现 / adventure-slice | planBossEncounter；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createAdventureMapPlan` → `domain/easter.js#createEasterObjectives`、`domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planClaudeEncounter` → `domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planBossEncounter` → `domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/adventure.js#planClaudeEncounter`。

公开函数上游：

- `createAdventureMapPlan` ← `domain/world/expeditionMap.js#createExpeditionRegionPlan`、`domain/world/map.js#createMapPlan`。
- `planClaudeEncounter` ← `domain/world/adventure.js#planBossEncounter`。
- `planBossEncounter` ← `domain/world/api.js#planApiBossEncounter`、`domain/world/expedition.js#planExpeditionBossEncounter`、`domain/world/map.js#planWorldInteraction`。

## domain/world/alarms.js

Review risk with F, then confirm within five seconds; one enhanced exclusive choice and one finite wave.

[源码](../../src/v2/domain/world/alarms.js)；层：`domain`。

直接依赖：`domain/plans.js`、`domain/world/pressure.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planAlarmCache(context: untyped, entityId: untyped)` | `SystemPlan` | 已实现 | planAlarmCache；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planAlarmCache` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/pressure.js#reservePressureEvent`。

公开函数上游：

- `planAlarmCache` ← `domain/world/map.js#planWorldInteraction`。

## domain/world/api.js

Safe withdrawal uses the same live threat boundary as saving, plus checkpoint proximity and released movement/fire. No pause can manufacture safety.

[源码](../../src/v2/domain/world/api.js)；层：`domain`。

直接依赖：`domain/difficulty.js`、`domain/entities.js`、`domain/geometry.js`、`domain/plans.js`、`domain/world/adventure.js`、`domain/world/encounterIds.js`、`domain/world/pressureRules.js`、`domain/world/safety.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `canApiWithdraw(c: untyped)` | `boolean` | 已实现 / adventure-slice API | API安全检查点近距离、静止且无射击/在途威胁/首领预警时允许开始返回，不通过暂停制造安全。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planApiWithdrawal(c: untyped, type: untyped)` | `SystemPlan` | 已实现 / adventure-slice API | 开始或取消连续180世界步返回，开始快照位置和实际生命损伤总量，松开不保留旧进度。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planApiBossEncounter(c: untyped)` | `SystemPlan` | 已实现 / adventure-slice API | 复用三阵营真实首领工厂，按阶段重写实体/节点/掩体ID，锁定出生强度，不覆盖已有首领记录。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planApiWorldAdvance(c: untyped, afterCombat: untyped = false)` | `SystemPlan` | 已实现 / adventure-slice API | 每世界步一次推进API时间/分钟限额/五分钟首领预警；伤害后处理阶段结束和返回，死亡优先。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planApiPressure(c: untyped)` | `SystemPlan` | 已实现 / adventure-slice API | 按90秒轮换继承池中的有限额外压力，4秒预警，安全/首领优先；延期不堆积补刷债务。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `canApiWithdraw` → `domain/geometry.js#distanceSquared`、`domain/world/safety.js#isWorldSafe`。
- `planApiWithdrawal` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/api.js#canApiWithdraw`。
- `planApiBossEncounter` → `domain/difficulty.js#resolveSurvivalSpawnMultipliers`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/adventure.js#planBossEncounter`、`domain/world/encounterIds.js#namespaceEncounterPlan`。
- `planApiWorldAdvance` → `domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/api.js#canApiWithdraw`、`domain/world/api.js#planApiBossEncounter`。
- `planApiPressure` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/pressureRules.js#validatePressureReservation`。

公开函数上游：

- `canApiWithdraw` ← `domain/world/api.js#planApiWithdrawal`、`domain/world/api.js#planApiWorldAdvance`、`preview/host.js#mountCombatPreview`。
- `planApiWithdrawal` ← `engine/commands.js#planGameCommand`。
- `planApiBossEncounter` ← `domain/world/api.js#planApiWorldAdvance`。
- `planApiWorldAdvance` ← `domain/world/objectives.js#planApiProgression`。
- `planApiPressure` ← `domain/world/pressure.js#planPressureSchedule`。

## domain/world/apiMaintenance.js

Compact only expired API identities. Attack owners stay until their live projectiles/statuses/shields are gone. Removed source IDs are never reused; old reward events can no longer resolve an entity. Rice/material pickups merge by kind and grid with exact totals.

[源码](../../src/v2/domain/world/apiMaintenance.js)；层：`domain`。

直接依赖：`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planApiMaintenance(c: untyped)` | `SystemPlan` | 已实现 / adventure-slice API | 每600步回收过期死体和已结算临时账本，保留在途攻击来源；按类型/网格等值合并拾取，保留必要遭遇记录。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planApiMaintenance` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `planApiMaintenance` ← `engine/tick.js#advanceWorldTick`。

## domain/world/encounterIds.js

Namespace all newly created encounter identities while preserving marker:<nodeId> derivation. Existing map IDs and content definition IDs stay intact.

[源码](../../src/v2/domain/world/encounterIds.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `namespaceEncounterPlan(plan: untyped, previous: untyped, prefix: untyped)` | `SystemPlan` | 已实现 | namespaceEncounterPlan；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `namespaceEncounterPlan` → 无内部公开函数。

公开函数上游：

- `namespaceEncounterPlan` ← `domain/world/api.js#planApiBossEncounter`、`domain/world/expedition.js#planExpeditionBossEncounter`。

## domain/world/escort.js

Start the optional delivery once, only by interacting within reach. Repeated interaction cannot reset the route, wave budget or reward.

[源码](../../src/v2/domain/world/escort.js)；层：`domain`。

直接依赖：`domain/geometry.js`、`domain/navigation.js`、`domain/plans.js`、`domain/world/lateMechanics.js`、`domain/world/objectives.js`、`domain/world/pressureRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planEscortStart(c: untyped, id: untyped)` | `SystemPlan` | 已实现 | planEscortStart；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planEscortAdvance(c: untyped)` | `SystemPlan` | 已实现 | planEscortAdvance；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planEscortStart` → `domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planEscortAdvance` → `domain/geometry.js#distanceSquared`、`domain/navigation.js#findNavigationPath`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/lateMechanics.js#planObjectiveSignal`、`domain/world/objectives.js#planObjectiveCompletion`、`domain/world/pressureRules.js#validatePressureReservation`。

公开函数上游：

- `planEscortStart` ← `domain/world/map.js#planWorldInteraction`。
- `planEscortAdvance` ← `engine/tick.js#advanceWorldTick`。

## domain/world/expedition.js

Archive only local state. Player/companion bodies, their statuses/shields, and all build/currency/random/progression state remain global.

[源码](../../src/v2/domain/world/expedition.js)；层：`domain`。

直接依赖：`domain/damage.js`、`domain/geometry.js`、`domain/plans.js`、`domain/serialization.js`、`domain/world/adventure.js`、`domain/world/encounterIds.js`、`domain/world/expeditionMap.js`、`domain/world/regionRules.js`、`domain/world/regionTime.js`、`domain/world/safety.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createRegionArchive(s: untyped)` | `RegionArchive` | 已实现 | createRegionArchive；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `assembleRegionArchive(plan: untyped)` | `RegionArchive` | 已实现 | assembleRegionArchive；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planExpeditionTravel(c: untyped, target: untyped)` | `SystemPlan` | 已实现 | planExpeditionTravel；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planExpeditionBossEncounter(c: untyped)` | `SystemPlan` | 已实现 | planExpeditionBossEncounter；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planExpeditionProgression(c: untyped)` | `SystemPlan` | 已实现 | planExpeditionProgression；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planExpeditionRest(c: untyped, id: untyped, choice: untyped = null)` | `SystemPlan` | 已实现 | planExpeditionRest；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createRegionArchive` → 无内部公开函数。
- `assembleRegionArchive` → 无内部公开函数。
- `planExpeditionTravel` → `domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/serialization.js#toJson`、`domain/world/expedition.js#assembleRegionArchive`、`domain/world/expedition.js#createRegionArchive`、`domain/world/expeditionMap.js#createExpeditionRegionPlan`、`domain/world/regionRules.js#localWorldId`、`domain/world/regionTime.js#rebaseRegionTime`、`domain/world/safety.js#isWorldSafe`。
- `planExpeditionBossEncounter` → `domain/plans.js#createEmptyPlan`、`domain/world/adventure.js#planBossEncounter`、`domain/world/encounterIds.js#namespaceEncounterPlan`、`domain/world/regionRules.js#expeditionPoint`、`domain/world/regionRules.js#expeditionRegionScale`。
- `planExpeditionProgression` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/regionRules.js#localWorldId`。
- `planExpeditionRest` → `domain/damage.js#planLifeChange`、`domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/safety.js#isWorldSafe`。

公开函数上游：

- `createRegionArchive` ← `domain/world/expedition.js#planExpeditionTravel`。
- `assembleRegionArchive` ← `domain/world/expedition.js#planExpeditionTravel`。
- `planExpeditionTravel` ← `domain/world/map.js#planWorldInteraction`。
- `planExpeditionBossEncounter` ← `domain/world/map.js#planWorldInteraction`。
- `planExpeditionProgression` ← `engine/tick.js#advanceWorldTick`。
- `planExpeditionRest` ← `domain/world/map.js#planWorldInteraction`、`engine/commands.js#planGameCommand`。

## domain/world/expeditionMaintenance.js

Bound long-region debris without regenerating residents or changing resource totals. Boss/objective identities and every still-referenced attack/status/shield owner remain. Finite reward and pressure ledgers are retained, including pending challenge rewards.

[源码](../../src/v2/domain/world/expeditionMaintenance.js)；层：`domain`。

直接依赖：`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planExpeditionMaintenance(c: untyped)` | `SystemPlan` | 已实现 | planExpeditionMaintenance；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planExpeditionMaintenance` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `planExpeditionMaintenance` ← `engine/tick.js#advanceWorldTick`。

## domain/world/expeditionMap.js

Build one region once. Static entities/budgets/rewards get a regional namespace; instance IDs include the region. Guard camps, equipment and secrets are retained and later archived without regeneration.

[源码](../../src/v2/domain/world/expeditionMap.js)；层：`domain`。

直接依赖：`domain/entities.js`、`domain/plans.js`、`domain/world/adventure.js`、`domain/world/regionRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createExpeditionRegionPlan(start: untyped, catalog: untyped, index: untyped)` | `SystemPlan` | 已实现 | createExpeditionRegionPlan；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createExpeditionRegionPlan` → `domain/entities.js#createEntityState`、`domain/plans.js#createStateChange`、`domain/world/adventure.js#createAdventureMapPlan`、`domain/world/regionRules.js#expeditionPoint`、`domain/world/regionRules.js#expeditionRegionScale`。

公开函数上游：

- `createExpeditionRegionPlan` ← `domain/world/expedition.js#planExpeditionTravel`、`domain/world/map.js#createMapPlan`。

## domain/world/extraction.js

A live player must hold position inside the extraction zone without firing.

[源码](../../src/v2/domain/world/extraction.js)；层：`domain`。

直接依赖：`domain/geometry.js`、`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `extractionDuration(nodes: untyped)` | `number` | 已实现 | extractionDuration；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `canExtract({ state }: untyped)` | `boolean` | 已实现 | canExtract；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planExtraction(context: untyped, action: untyped)` | `SystemPlan` | 已实现 | planExtraction；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `extractionDuration` → 无内部公开函数。
- `canExtract` → `domain/geometry.js#distanceSquared`。
- `planExtraction` → `domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/extraction.js#canExtract`、`domain/world/extraction.js#extractionDuration`。

公开函数上游：

- `extractionDuration` ← `domain/world/extraction.js#planExtraction`、`engine/snapshot.js#createRenderSnapshot`、`preview/host.js#mountCombatPreview`。
- `canExtract` ← `domain/world/extraction.js#planExtraction`、`preview/host.js#mountCombatPreview`。
- `planExtraction` ← `engine/commands.js#planGameCommand`、`engine/tick.js#advanceWorldTick`。

## domain/world/lateMechanics.js

@param {import('../../contracts.d.ts').EvaluationContext} c @param {string} id @param {string} mechanicId @param {string} budgetId @param {Record<string,import('../../contracts.d.ts').Json>} runtime @param {number} warning

[源码](../../src/v2/domain/world/lateMechanics.js)；层：`domain`。

直接依赖：`domain/entities.js`、`domain/geometry.js`、`domain/navigation.js`、`domain/plans.js`、`domain/rewards.js`、`domain/world/pressureRules.js`、`domain/world/regionRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planObjectiveSignal(c: untyped, objectiveId: untyped)` | `SystemPlan` | 已实现 | 首次实际占领信标时生成可摧毁40生命信号，绑定独立有限无奖励援军预算，不能重建刷收益。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planChallengeInteraction(c: untyped, entityId: untyped)` | `SystemPlan` | 已实现 | F主动启动三阵营可选精英或15级三段遭遇；距离/阶段复核后一次提交。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planLateSchedule(c: untyped)` | `SystemPlan` | 已实现 | 协调精英一次奖励、13级衔接、三段遭遇及15秒间隔、每海域两次安全地图异常。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `planObjectiveSignal` → `domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/pressureRules.js#validatePressureReservation`。
- `planChallengeInteraction` → `domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/pressureRules.js#validatePressureReservation`、`domain/world/regionRules.js#localWorldId`。
- `planLateSchedule` → `domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/navigation.js#canCloseMapPassage`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/rewards.js#planWorldReward`、`domain/world/pressureRules.js#validatePressureReservation`、`domain/world/regionRules.js#localWorldId`。

公开函数上游：

- `planObjectiveSignal` ← `domain/world/escort.js#planEscortAdvance`、`domain/world/objectives.js#planObjectiveAdvance`。
- `planChallengeInteraction` ← `domain/world/map.js#planWorldInteraction`。
- `planLateSchedule` ← `domain/world/pressure.js#planPressureSchedule`。

## domain/world/map.js

连续地图生成、探索与安全交互。

[源码](../../src/v2/domain/world/map.js)；层：`domain`。

直接依赖：`domain/easter.js`、`domain/entities.js`、`domain/equipment.js`、`domain/geometry.js`、`domain/plans.js`、`domain/random.js`、`domain/rewards.js`、`domain/world/adventure.js`、`domain/world/alarms.js`、`domain/world/escort.js`、`domain/world/expedition.js`、`domain/world/expeditionMap.js`、`domain/world/lateMechanics.js`、`domain/world/regionRules.js`、`domain/world/safety.js`、`domain/world/tutorial.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createMapPlan(start: untyped, catalog: untyped, random: untyped)` | `SystemPlan` | 已实现 / core-preview + adventure-slice | 按模式生成Free引导/练习、短途/API海域或远征区域；远征包含信标、封锁与护送。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planMapExploration(context: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 按玩家位置揭示160单位网格，只有新格子才生成修改计划。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planWorldInteraction(context: untyped, command: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 探索交互优先装备，再处理补给/首领门/彩蛋证据；Boss不打开换装面板。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `isSafeForInteraction(context: untyped, position: untyped)` | `boolean` | 已实现 | 检查附近敌人、在途攻击、事件危险和检查点规则，不靠暂停制造安全。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `createMapPlan` → `domain/entities.js#createEntityState`、`domain/plans.js#createStateChange`、`domain/random.js#drawRandom`、`domain/world/adventure.js#createAdventureMapPlan`、`domain/world/expeditionMap.js#createExpeditionRegionPlan`、`domain/world/tutorial.js#createTutorialMapPlan`。
- `planMapExploration` → `domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planWorldInteraction` → `domain/easter.js#planEasterInteraction`、`domain/equipment.js#planEquipmentInteraction`、`domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/rewards.js#planWorldReward`、`domain/world/adventure.js#planBossEncounter`、`domain/world/alarms.js#planAlarmCache`、`domain/world/escort.js#planEscortStart`、`domain/world/expedition.js#planExpeditionBossEncounter`、`domain/world/expedition.js#planExpeditionRest`、`domain/world/expedition.js#planExpeditionTravel`、`domain/world/lateMechanics.js#planChallengeInteraction`、`domain/world/regionRules.js#localWorldId`、`domain/world/tutorial.js#planTutorialBoss`。
- `isSafeForInteraction` → `domain/world/safety.js#isWorldSafe`。

公开函数上游：

- `createMapPlan` ← `engine/session.js#createGameSession`。
- `planMapExploration` ← `engine/tick.js#advanceWorldTick`。
- `planWorldInteraction` ← `engine/commands.js#planGameCommand`。
- `isSafeForInteraction` ← `application/game.js#settleAdventure`、`domain/checkpoint.js#canCreateCheckpoint`。

## domain/world/objectives.js

主线/信标/锁门与API首领过程事件。

[源码](../../src/v2/domain/world/objectives.js)；层：`domain`。

直接依赖：`domain/geometry.js`、`domain/plans.js`、`domain/rewards.js`、`domain/world/api.js`、`domain/world/lateMechanics.js`、`domain/world/regionRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planObjectiveAdvance(context: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 在探索阶段处理封锁进度或占领信标；所需进度由目标记录决定，短途默认35秒、远征120秒。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planObjectiveCompletion(context: untyped, objectiveId: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 幂等完成信标、封锁或护送，发放一次目标奖励；累计完成两个后开放本区域首领门。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planApiProgression(context: untyped, afterCombat: untyped = false)` | `SystemPlan` | 已实现 / adventure-slice API | API世界调度入口，分别在战斗前推进时间、战斗后处理首领与撤回，其他模式返回空计划。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planObjectiveAdvance` → `domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/lateMechanics.js#planObjectiveSignal`、`domain/world/objectives.js#planObjectiveCompletion`。
- `planObjectiveCompletion` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/rewards.js#planWorldReward`、`domain/world/regionRules.js#localWorldId`。
- `planApiProgression` → `domain/world/api.js#planApiWorldAdvance`。

公开函数上游：

- `planObjectiveAdvance` ← `engine/tick.js#advanceWorldTick`。
- `planObjectiveCompletion` ← `domain/world/escort.js#planEscortAdvance`、`domain/world/objectives.js#planObjectiveAdvance`。
- `planApiProgression` ← `engine/tick.js#advanceWorldTick`。

## domain/world/pressure.js

累计机制下的压力事件仲裁。

[源码](../../src/v2/domain/world/pressure.js)；层：`domain`。

直接依赖：`domain/geometry.js`、`domain/navigation.js`、`domain/plans.js`、`domain/world/api.js`、`domain/world/lateMechanics.js`、`domain/world/pressureRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planPressureSchedule(context: untyped)` | `SystemPlan` | 已实现 | 从完整已解锁机制池安排适用事件，常驻AI不被轮换移除。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `reservePressureEvent(context: untyped, event: untyped)` | `Result<PressureEvent>` | 已实现 | 先判安全/优先级/预算/双事件容量，失败给原因，不静默新建其他惩罚。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPressureEventAdvance(context: untyped)` | `SystemPlan` | 已实现 | 推进预警/真实出生/信号/临时捷径，结束退回未出生预留；精英超时失败，不发挑战奖励。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planPressureSchedule` → `domain/world/api.js#planApiPressure`、`domain/world/lateMechanics.js#planLateSchedule`。
- `reservePressureEvent` → `domain/world/pressureRules.js#validatePressureReservation`。
- `planPressureEventAdvance` → `domain/navigation.js#canCloseMapPassage`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `planPressureSchedule` ← `engine/tick.js#advanceWorldTick`。
- `reservePressureEvent` ← `domain/world/alarms.js#planAlarmCache`。
- `planPressureEventAdvance` ← `engine/tick.js#advanceWorldTick`。

## domain/world/pressureRules.js

Budget and safety reservation shared by direct interactions and autonomous scheduling.

[源码](../../src/v2/domain/world/pressureRules.js)；层：`domain`。

直接依赖：`domain/geometry.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `validatePressureReservation(context: untyped, event: untyped)` | `Result<PressureEvent>` | 已实现 | 按继承机制、有限预算、预告承诺和两个压力槽校验纯预约，检查点及首领优先。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `validatePressureReservation` → `domain/geometry.js#distanceSquared`。

公开函数上游：

- `validatePressureReservation` ← `domain/world/api.js#planApiPressure`、`domain/world/escort.js#planEscortAdvance`、`domain/world/lateMechanics.js#planObjectiveSignal`、`domain/world/lateMechanics.js#planChallengeInteraction`、`domain/world/lateMechanics.js#planLateSchedule`、`domain/world/pressure.js#reservePressureEvent`。

## domain/world/regionRules.js

Resolve a fixed, previewable permutation without consuming any gameplay random stream.

[源码](../../src/v2/domain/world/regionRules.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolveExpeditionRoute(seed: untyped)` | `readonly Faction[]` | 已实现 | resolveExpeditionRoute；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `expeditionRegionScale(index: untyped)` | `{hp:number;damage:number;speed:number}` | 已实现 | expeditionRegionScale；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `localWorldId(state: untyped, id: untyped)` | `string` | 已实现 | localWorldId；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `expeditionPoint(index: untyped, point: untyped)` | `Vec2` | 已实现 | expeditionPoint；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `regionWorldTick(state: untyped)` | `number` | 已实现 | regionWorldTick；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `resolveExpeditionRoute` → 无内部公开函数。
- `expeditionRegionScale` → 无内部公开函数。
- `localWorldId` → 无内部公开函数。
- `expeditionPoint` → 无内部公开函数。
- `regionWorldTick` → 无内部公开函数。

公开函数上游：

- `resolveExpeditionRoute` ← `domain/initial.js#createInitialGameState`、`domain/stateValidation.js#inspectGameState`、`preview/host.js#mountCombatPreview`。
- `expeditionRegionScale` ← `domain/bosses/gpt.js#planGptBoss`、`domain/world/expedition.js#planExpeditionBossEncounter`、`domain/world/expeditionMap.js#createExpeditionRegionPlan`、`domain/world/spawning.js#planEnemySpawn`。
- `localWorldId` ← `domain/easter.js#planEasterAdvance`、`domain/world/expedition.js#planExpeditionTravel`、`domain/world/expedition.js#planExpeditionProgression`、`domain/world/lateMechanics.js#planChallengeInteraction`、`domain/world/lateMechanics.js#planLateSchedule`、`domain/world/map.js#planWorldInteraction`、`domain/world/objectives.js#planObjectiveCompletion`、`domain/world/spawning.js#planSpawnSchedule`、`preview/host.js#mountCombatPreview`。
- `expeditionPoint` ← `domain/world/expedition.js#planExpeditionBossEncounter`、`domain/world/expeditionMap.js#createExpeditionRegionPlan`。
- `regionWorldTick` ← `domain/currents.js#resolveTideVelocity`、`domain/world/spawning.js#planSpawnSchedule`、`domain/world/spawning.js#planReinforcementGroup`、`engine/snapshot.js#createRenderSnapshot`。

## domain/world/regionTime.js

Rebase only absolute local time keys. Zero remains the inactive/ready sentinel except real history timestamps. Relative durations, HP, cooldown seconds, IDs, coordinates and budgets never change.

[源码](../../src/v2/domain/world/regionTime.js)；层：`domain`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `rebaseRegionTime(value: untyped, delta: untyped)` | `Json` | 已实现 | rebaseRegionTime；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `rebaseRegionTime` → 无内部公开函数。

公开函数上游：

- `rebaseRegionTime` ← `domain/world/expedition.js#planExpeditionTravel`。

## domain/world/safety.js

Shared live safety query for checkpoints and API withdrawal; no dependency on interaction dispatch or pressure schedulers.

[源码](../../src/v2/domain/world/safety.js)；层：`domain`。

直接依赖：`domain/geometry.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `isWorldSafe(context: untyped, position: untyped)` | `boolean` | 已实现 | 共享实际敌人、敌弹、待出生、额外压力与API首领预警的安全判定，检查点和撤回使用同一规则。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `isWorldSafe` → `domain/geometry.js#distanceSquared`。

公开函数上游：

- `isWorldSafe` ← `domain/world/api.js#canApiWithdraw`、`domain/world/expedition.js#planExpeditionTravel`、`domain/world/expedition.js#planExpeditionRest`、`domain/world/map.js#isSafeForInteraction`。

## domain/world/spawning.js

驻守、追兵、Grok群组和API预算。

[源码](../../src/v2/domain/world/spawning.js)；层：`domain`。

直接依赖：`content/catalog.js`、`domain/collision.js`、`domain/difficulty.js`、`domain/entities.js`、`domain/plans.js`、`domain/world/regionRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planSpawnSchedule(context: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 有限短途追兵或持续API混编；API首领期间继续普通生成、优先首领队列，容量不足延期。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planEnemySpawn(context: untyped, request: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 合法位置实际出生时锁定API分钟数值与Fable/Mythos模型，推进一次世界随机流，活体不随时间补血。；模型壳/基础能力在下一阶段按相同profile处理，出生倍率只快照一次；实体来源和奖励策略不丢失。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planReinforcementGroup(context: untyped, groupId: untyped, budgetId: untyped)` | `SystemPlan` | 已实现 / adventure-slice | 按阶段压力和屏幕外规则预留一组Bot预算，不积累补刷债务。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planSpawnSchedule` → `domain/collision.js#validateSpawnLocation`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/regionRules.js#localWorldId`、`domain/world/regionRules.js#regionWorldTick`、`domain/world/spawning.js#planEnemySpawn`、`domain/world/spawning.js#planReinforcementGroup`。
- `planEnemySpawn` → `content/catalog.js#findContentDefinition`、`domain/collision.js#validateSpawnLocation`、`domain/difficulty.js#resolveModelProfileId`、`domain/difficulty.js#resolveSurvivalSpawnMultipliers`、`domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/regionRules.js#expeditionRegionScale`。
- `planReinforcementGroup` → `domain/difficulty.js#resolveSurvivalSpawnMultipliers`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/world/regionRules.js#regionWorldTick`。

公开函数上游：

- `planSpawnSchedule` ← `engine/tick.js#advanceWorldTick`。
- `planEnemySpawn` ← `domain/world/spawning.js#planSpawnSchedule`。
- `planReinforcementGroup` ← `domain/world/spawning.js#planSpawnSchedule`。

## domain/world/tutorial.js

Construct the formal Free lesson as an isolated small sea. It has no permanent loot or adventure easter eggs.

[源码](../../src/v2/domain/world/tutorial.js)；层：`domain`。

直接依赖：`domain/entities.js`、`domain/geometry.js`、`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createTutorialMapPlan(start: untyped, catalog: untyped)` | `SystemPlan` | 已实现 / adventure-slice Free引导 | 创建正式Free引导海域、固定练习敌人、检查点和隐藏教学控制器；不生成普通材料。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planTutorialAdvance(c: untyped)` | `SystemPlan` | 已实现 / adventure-slice Free引导 | 按真实移动射击、经验升级、插件选择、冲刺和挣脱依次推进教学；世界暂停时不推进。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planTutorialBoss(c: untyped)` | `SystemPlan` | 已实现 / adventure-slice Free引导 | 教学完成且玩家靠近入口时创建300生命、仅使用钳击的Claude教学首领。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `planTutorialRetry(c: untyped, deaths: untyped)` | `SystemPlan` | 已实现 / adventure-slice Free引导 | 教学中玩家死亡时回到安全位置重试并保留教学与成长进度；同帧首领死亡亦优先重试。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createTutorialMapPlan` → `domain/entities.js#createEntityState`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planTutorialAdvance` → `domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planTutorialBoss` → `domain/entities.js#createEntityState`、`domain/geometry.js#distanceSquared`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planTutorialRetry` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。

公开函数上游：

- `createTutorialMapPlan` ← `domain/world/map.js#createMapPlan`。
- `planTutorialAdvance` ← `engine/tick.js#advanceWorldTick`。
- `planTutorialBoss` ← `domain/world/map.js#planWorldInteraction`。
- `planTutorialRetry` ← `engine/tick.js#advanceWorldTick`。

## engine/commands.js

用户/系统命令校验与分派。

[源码](../../src/v2/engine/commands.js)；层：`engine`。

直接依赖：`domain/attacks.js`、`domain/draft.js`、`domain/geometry.js`、`domain/lora.js`、`domain/plans.js`、`domain/serialization.js`、`domain/status.js`、`domain/world/api.js`、`domain/world/expedition.js`、`domain/world/extraction.js`、`domain/world/map.js`、`engine/flow.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `validateGameCommand(state: untyped, command: untyped)` | `ValidationReport` | 已实现 / core-preview | 校验战斗与成长命令、choiceId/候选、一次重抽上限、单调序号、时钟域与阶段。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planGameCommand(context: untyped, command: untyped)` | `CommandResult` | 已实现 / core-preview | 预览分派移动/战斗/暂停及插件选择、重抽、跳过；校验后确认单调序号。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `orderPendingCommands(commands: untyped, tick: untyped, clockDomain: untyped)` | `readonly Command[]` | 已实现 | 按targetTick/seq稳定排序，未来命令保留，重复id拒绝。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `validateGameCommand` → `domain/serialization.js#serializeCanonical`。
- `planGameCommand` → `domain/attacks.js#planDash`、`domain/attacks.js#planLoadoutChange`、`domain/attacks.js#planSkillCast`、`domain/draft.js#planPluginReroll`、`domain/draft.js#planPluginSelection`、`domain/draft.js#planPluginSkip`、`domain/geometry.js#normalizeVector`、`domain/lora.js#planLoraInput`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/status.js#planEscapeInput`、`domain/world/api.js#planApiWithdrawal`、`domain/world/expedition.js#planExpeditionRest`、`domain/world/extraction.js#planExtraction`、`domain/world/map.js#planWorldInteraction`、`engine/commands.js#validateGameCommand`、`engine/flow.js#planPause`、`engine/flow.js#planResume`。
- `orderPendingCommands` → 无内部公开函数。

公开函数上游：

- `validateGameCommand` ← `engine/commands.js#planGameCommand`、`engine/session.js#enqueueSessionCommand`。
- `planGameCommand` ← `engine/tick.js#advanceWorldTick`、`engine/tick.js#advanceUiTick`。
- `orderPendingCommands` ← `engine/session.js#stepSessionWorld`、`engine/session.js#stepSessionUi`、`engine/tick.js#advanceWorldTick`、`engine/tick.js#advanceUiTick`。

## engine/effectLoop.js

有界队列处理替代伤害/死亡直接递归。

[源码](../../src/v2/engine/effectLoop.js)；层：`engine`。

直接依赖：`domain/damage.js`、`domain/deaths.js`、`domain/plans.js`、`domain/rewards.js`、`domain/serialization.js`、`domain/shields.js`、`domain/status.js`、`domain/world/spawning.js`、`engine/hooks.js`、`engine/reducer.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `evaluateEffectRequest(context: untyped, request: untyped)` | `SystemPlan` | 已实现 / core-preview + adventure-slice | 处理damage/heal/shield/collect/control；未实现效果明确拒绝。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `drainEffectQueue(context: untyped, queue: untyped)` | `EffectDrain` | 已实现 / core-preview | 稳定顺序执行请求，应用中间计划/死亡声明/事件钩子，再把派生请求排队。；generation<=4、每tick派生<=128；先标dying再钩子；队列循环不递归，禁止自动新开chain绕预算。 返回nextWorking与deaths/outbox，不返回供再次apply的重复计划；调用方接纳结果后继续tick。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `evaluateEffectRequest` → `domain/damage.js#planLifeChange`、`domain/damage.js#resolveDamageRequest`、`domain/rewards.js#planTokenCollection`、`domain/serialization.js#serializeCanonical`、`domain/shields.js#planShieldGrant`、`domain/status.js#resolveControlRequest`。
- `drainEffectQueue` → `domain/deaths.js#collectDeathRecords`、`domain/deaths.js#planDeathTransitions`、`engine/effectLoop.js#evaluateEffectRequest`、`engine/hooks.js#planEventHooks`、`engine/reducer.js#applyOwnedTickPlan`。

公开函数上游：

- `evaluateEffectRequest` ← `engine/effectLoop.js#drainEffectQueue`。
- `drainEffectQueue` ← `engine/tick.js#advanceWorldTick`。

## engine/flow.js

流程转移与升级界面互斥。

[源码](../../src/v2/engine/flow.js)；层：`engine`。

直接依赖：`domain/draft.js`、`domain/levels.js`、`domain/lora.js`、`domain/plans.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planFlowTransition(context: untyped, nextPhase: untyped)` | `SystemPlan` | 已实现 / core-preview | 校验探索、首领、成长面板、暂停与终态的允许转移，恢复时保留原面板。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planProgressionPanels(context: untyped)` | `SystemPlan` | 已实现 / core-preview | 按队首升级逐步开LoRA/插件，不能两个面板抢Space。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planPause(context: untyped, reason: untyped)` | `SystemPlan` | 已实现 / core-preview | 保留所有世界/UI剩余时间，后台/性能暂停清理持有输入。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `planResume(context: untyped)` | `SystemPlan` | 已实现 / core-preview | 恢复战斗或LoRA/插件面板原阶段，保留指针和原世界返回位置，不补跑墙钟。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planFlowTransition` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planProgressionPanels` → `domain/draft.js#createPluginChoice`、`domain/levels.js#planLevelProgression`、`domain/levels.js#planNextLevelReward`、`domain/lora.js#createLoraTrial`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`。
- `planPause` → `domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`engine/flow.js#planFlowTransition`。
- `planResume` → `domain/plans.js#createEmptyPlan`、`engine/flow.js#planFlowTransition`。

公开函数上游：

- `planFlowTransition` ← `engine/flow.js#planPause`、`engine/flow.js#planResume`。
- `planProgressionPanels` ← `engine/tick.js#advanceWorldTick`、`engine/tick.js#advanceUiTick`。
- `planPause` ← `engine/commands.js#planGameCommand`。
- `planResume` ← `engine/commands.js#planGameCommand`。

## engine/hooks.js

事件投影到效果计划，切断伤害与插件的循环依赖。

[源码](../../src/v2/engine/hooks.js)；层：`engine`。

直接依赖：`content/handlers/plugins.js`、`dispatch/dsh.js`、`dispatch/mechanics.js`、`dispatch/models.js`、`dispatch/plugins.js`、`domain/bosses/gpt.js`、`domain/combatPlugins.js`、`domain/companions.js`、`domain/distill.js`、`domain/dshEffects.js`、`domain/easter.js`、`domain/gptPets.js`、`domain/mechanics.js`、`domain/plans.js`、`domain/status.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `planEventHooks(context: untyped, event: untyped)` | `SystemPlan` | 已实现 / core-preview + adventure-slice | 分派蒸馏、封印破坏和并行调用事件；其余首批插件由明确数据消费者处理。；过滤已启用/实际订阅的handler；次级伤害不冒充基础武器命中；不再次发布同eventId。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `planEventHooks` → `content/handlers/plugins.js#planPluginParallel`、`domain/bosses/gpt.js#planGptBossEvent`、`domain/combatPlugins.js#planCombatPluginEvent`、`domain/companions.js#planCompanionMilestones`、`domain/distill.js#planDistillEvent`、`domain/dshEffects.js#planDshEffects`、`domain/easter.js#planEasterEvent`、`domain/gptPets.js#planPetModelEvent`、`domain/mechanics.js#planMechanicEvent`、`domain/plans.js#mergeSystemPlans`、`domain/status.js#planSealRelease`。

公开函数上游：

- `planEventHooks` ← `engine/effectLoop.js#drainEffectQueue`、`engine/tick.js#advanceWorldTick`。

## engine/previewTick.js

A bounded, explicit combat-only slice. Full adventure tick remains separate and unfinished.

[源码](../../src/v2/engine/previewTick.js)；层：`engine`。

直接依赖：`engine/tick.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `advancePreviewWorldTick(state: untyped, commands: untyped, catalog: untyped)` | `TickResult` | 已实现 / core-preview + adventure-slice | 兼容旧纵切调用者，委托唯一engine/tick世界流水线；没有第二套模拟。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `advancePreviewUiCommands(state: untyped, commands: untyped, catalog: untyped, advanceClock: untyped = false)` | `TickResult` | 已实现 / core-preview + adventure-slice | 兼容旧UI入口，委托唯一engine/tick流水线；默认不推进UI时钟。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `advancePreviewWorldTick` → `engine/tick.js#advanceWorldTick`。
- `advancePreviewUiCommands` → `engine/tick.js#advanceUiTick`。

公开函数上游：

- `advancePreviewWorldTick` ← 宿主/工具入口或待编排。
- `advancePreviewUiCommands` ← 宿主/工具入口或待编排。

## engine/reducer.js

唯一状态变更应用器；系统自身只产计划。

[源码](../../src/v2/engine/reducer.js)；层：`engine`。

直接依赖：`domain/plans.js`、`domain/serialization.js`、`domain/stateValidation.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `applySystemPlan(working: untyped, plan: untyped)` | `GameState` | 已实现 | 验证后将计划应用到tick私有工作副本，供下阶段读取。；；状态权限：仅写tick私有工作副本；不修改已发布快照或Profile |
| `applyOwnedTickPlan(working: untyped, plan: untyped)` | `GameState` | 已实现 | applyOwnedTickPlan；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `validateStateInvariants(state: untyped, catalog: untyped)` | `ValidationReport` | 已实现 | 核对有限数值/实体来源/壳状态/机制/槽位/账本等跨模块不变量。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `commitWorkingState(previous: untyped, working: untyped, catalog: untyped, outbox: untyped = { events: [], persistence: [], diagnostics: [] })` | `TickResult` | 已实现 | 验证完整状态、时钟及输出后复制外部工作状态并提交一个revision，保持输入隔离。；；状态权限：唯一GameState提交点；不执行外部I/O |
| `commitOwnedTickState(previous: untyped, working: untyped, catalog: untyped, outbox: untyped)` | `TickResult` | 已实现 / core-preview + adventure-slice | 仅接收tick从完整输入副本独占得到的工作状态；验证状态/输出后移交所有权，避免额外复制；失败不发布。；；状态权限：仅tick私有副本；成功后转移所有权，不可再被调用方修改 |

公开函数下游：

- `applySystemPlan` → `domain/plans.js#validateSystemPlan`、`domain/serialization.js#serializeCanonical`。
- `applyOwnedTickPlan` → `domain/plans.js#validateSystemPlan`、`domain/serialization.js#serializeCanonical`。
- `validateStateInvariants` → `domain/stateValidation.js#inspectGameState`。
- `commitWorkingState` → `domain/plans.js#validateSystemPlan`、`engine/reducer.js#validateStateInvariants`。
- `commitOwnedTickState` → `domain/plans.js#validateSystemPlan`、`engine/reducer.js#validateStateInvariants`。

公开函数上游：

- `applySystemPlan` ← `engine/session.js#createGameSession`。
- `applyOwnedTickPlan` ← `engine/effectLoop.js#drainEffectQueue`、`engine/tick.js#advanceWorldTick`、`engine/tick.js#advanceUiTick`。
- `validateStateInvariants` ← `engine/reducer.js#commitWorkingState`、`engine/reducer.js#commitOwnedTickState`、`engine/session.js#createGameSession`、`engine/session.js#createReplaySession`。
- `commitWorkingState` ← 宿主/工具入口或待编排。
- `commitOwnedTickState` ← `engine/tick.js#advanceWorldTick`、`engine/tick.js#advanceUiTick`。

## engine/session.js

每局唯一状态所有者与公开门面。

[源码](../../src/v2/engine/session.js)；层：`engine`。

直接依赖：`content/catalog.js`、`content/registry.js`、`domain/checkpoint.js`、`domain/initial.js`、`domain/random.js`、`domain/serialization.js`、`domain/world/map.js`、`engine/commands.js`、`engine/reducer.js`、`engine/snapshot.js`、`engine/tick.js`、`versions.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createGameSession(start: untyped, seed: untyped, catalog: untyped)` | `GameSession` | 已实现 / core-preview + adventure-slice | 校验目录与世界后发布私有Session；正式模组使用隔离档案和精确锁。；；状态权限：创建Session私有状态；不接触Profile和宿主对象 |
| `enqueueSessionCommand(session: untyped, command: untyped)` | `Result<Command>` | 已实现 / core-preview | 只排队不重入tick，拒绝终态/重复命令。；；状态权限：只写Session待处理命令队列 |
| `stepSessionWorld(session: untyped)` | `TickResult` | 已实现 / core-preview + adventure-slice | 消费世界命令，经唯一引擎流水线原子提交Free引导/练习、短途、远征或API；无I/O。；；状态权限：唯一门面允许提交世界状态 |
| `stepSessionUi(session: untyped, advanceClock: untyped = true)` | `TickResult` | 已实现 / core-preview + adventure-slice | 消费独立UI命令，经engine/tick推进指针或只flush；暂停保持原面板。；；状态权限：唯一门面允许提交UI状态 |
| `readSessionState(session: untyped)` | `StateSnapshot` | 已实现 | 返回防修改快照或结构化复制，不能泄露私有可变引用。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `readSessionView(session: untyped)` | `RenderSnapshot` | 已实现 | 供表现读取投影，不把整个Session交给Phaser。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `restoreGameSession(checkpoint: untyped, catalog: untyped)` | `Result<GameSession>` | 已实现 / core-preview + adventure-slice | 校验版本、模组锁及状态后构建暂停Session；失败保留原检查点。；；状态权限：构建替代Session，调用者先dispose旧表现订阅 |
| `disposeGameSession(session: untyped)` | `void` | 已实现 | 标记废弃、清队列，后续命令拒绝，不能再结算一次。；；状态权限：释放Session私有资源引用 |
| `createReplaySession(initial: untyped, catalog: untyped)` | `Result<GameSession>` | 已实现 / isolated-replay | 验证版本、内容锁、完整状态不变量后克隆隔离重放Session；不暂停、不读取/写入Profile，不替代检查点。；；状态权限：独立数据或隔离Session；无Profile和持久化副作用 |

公开函数下游：

- `createGameSession` → `content/catalog.js#validateContentCatalog`、`content/registry.js#createHandlerRegistry`、`domain/initial.js#createInitialGameState`、`domain/world/map.js#createMapPlan`、`engine/reducer.js#applySystemPlan`、`engine/reducer.js#validateStateInvariants`。
- `enqueueSessionCommand` → `engine/commands.js#validateGameCommand`。
- `stepSessionWorld` → `engine/commands.js#orderPendingCommands`、`engine/tick.js#advanceUiTick`、`engine/tick.js#advanceWorldTick`。
- `stepSessionUi` → `engine/commands.js#orderPendingCommands`、`engine/tick.js#advanceUiTick`、`engine/tick.js#advanceWorldTick`。
- `readSessionState` → 无内部公开函数。
- `readSessionView` → `engine/snapshot.js#createRenderSnapshot`。
- `restoreGameSession` → `domain/checkpoint.js#restoreCheckpointState`。
- `disposeGameSession` → 无内部公开函数。
- `createReplaySession` → `content/catalog.js#validateContentCatalog`、`content/registry.js#createHandlerRegistry`、`domain/serialization.js#serializeCanonical`、`engine/reducer.js#validateStateInvariants`。

公开函数上游：

- `createGameSession` ← `application/game.js#startAdventure`、`preview/host.js#mountCombatPreview`。
- `enqueueSessionCommand` ← `application/game.js#submitApplicationCommand`、`application/replay.js#replayRecording`、`preview/host.js#mountCombatPreview`。
- `stepSessionWorld` ← `application/game.js#advanceApplicationFrame`、`application/replay.js#replayRecording`、`preview/host.js#mountCombatPreview`。
- `stepSessionUi` ← `application/game.js#advanceApplicationFrame`、`application/replay.js#replayRecording`、`preview/host.js#mountCombatPreview`。
- `readSessionState` ← `application/game.js#saveAdventureCheckpoint`、`application/game.js#settleAdventure`、`application/replay.js#replayRecording`、`preview/host.js#mountCombatPreview`。
- `readSessionView` ← `application/game.js#advanceApplicationFrame`、`application/game.js#readApplicationView`、`preview/host.js#mountCombatPreview`。
- `restoreGameSession` ← `application/game.js#continueAdventure`、`preview/host.js#mountCombatPreview`。
- `disposeGameSession` ← `application/game.js#continueAdventure`、`application/game.js#disposeApplication`、`application/replay.js#replayRecording`、`preview/host.js#mountCombatPreview`。
- `createReplaySession` ← `application/replay.js#replayRecording`。

## engine/shootingRange.js

Start an isolated target lane. Only expose render data and discard persistence intents.

[源码](../../src/v2/engine/shootingRange.js)；层：`engine`。

直接依赖：`domain/difficulty.js`、`domain/entities.js`、`domain/initial.js`、`engine/tick.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createShootingRange(catalog: untyped, profile: untyped, equipped: untyped)` | `{weapon:()=>string,switchWeapon:()=>void,step:(firing:boolean)=>{damage:number,projectiles:{x:number,y:number,radius:number,template:string}[]}}` | 已实现 | createShootingRange；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `createShootingRange` → `domain/difficulty.js#resolveDifficultySnapshot`、`domain/entities.js#createEntityState`、`domain/initial.js#createInitialGameState`、`engine/tick.js#advanceWorldTick`。

公开函数上游：

- `createShootingRange` ← `preview/nestRange.js#mountNestRange`。

## engine/snapshot.js

表现层只读投影，不把活实体对象交给UI。

[源码](../../src/v2/engine/snapshot.js)；层：`engine`。

直接依赖：`content/skillCapabilities.js`、`domain/modelProfiles.js`、`domain/serialization.js`、`domain/world/extraction.js`、`domain/world/regionRules.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `createRenderSnapshot(state: untyped, catalog: untyped)` | `RenderSnapshot` | 已实现 / core-preview + adventure-slice | 只读投影战斗实体、掉落、探索格、Claude预警与首领生命，供Canvas绘制。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `createStateDigest(state: untyped)` | `string` | 已实现 | 稳定序列化关键状态摘要，排除表现随机/宿主对象。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `createRenderSnapshot` → `content/skillCapabilities.js#resolveSkillTemplate`、`domain/modelProfiles.js#resolvePetStage`、`domain/serialization.js#toJson`、`domain/world/extraction.js#extractionDuration`、`domain/world/regionRules.js#regionWorldTick`。
- `createStateDigest` → `domain/serialization.js#createDataDigest`。

公开函数上游：

- `createRenderSnapshot` ← `engine/session.js#readSessionView`。
- `createStateDigest` ← `application/replay.js#beginRecording`、`application/replay.js#appendRecordingStep`、`application/replay.js#replayRecording`。

## engine/tick.js

世界/UI两种固定步的唯一顺序定义。

[源码](../../src/v2/engine/tick.js)；层：`engine`。

直接依赖：`domain/abilities.js`、`domain/ai.js`、`domain/attacks.js`、`domain/bosses/gpt.js`、`domain/bosses/grok.js`、`domain/collision.js`、`domain/combatPlugins.js`、`domain/companions.js`、`domain/deaths.js`、`domain/distill.js`、`domain/dshCycle.js`、`domain/dshEffects.js`、`domain/easter.js`、`domain/gptPets.js`、`domain/lora.js`、`domain/mechanics.js`、`domain/modScope.js`、`domain/movement.js`、`domain/plans.js`、`domain/rewards.js`、`domain/scheduled.js`、`domain/status.js`、`domain/world/apiMaintenance.js`、`domain/world/escort.js`、`domain/world/expedition.js`、`domain/world/expeditionMaintenance.js`、`domain/world/extraction.js`、`domain/world/map.js`、`domain/world/objectives.js`、`domain/world/pressure.js`、`domain/world/spawning.js`、`domain/world/tutorial.js`、`engine/commands.js`、`engine/effectLoop.js`、`engine/flow.js`、`engine/hooks.js`、`engine/reducer.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `advanceWorldTick(state: untyped, commands: untyped, catalog: untyped)` | `TickResult` | 已实现 / core-preview + adventure-slice | 唯一正式固定世界流水线：按阶段读取最新工作副本，执行战斗/探索/压力/成长后只提交一次；未实现运行模式仍拒绝。；@calls是阶段依赖，不是忽略参数全部无条件执行；每阶段apply后下阶段读新工作副本。胜负优先于升级，API首领不胜利。；状态权限：只读输入，返回计划/值；不得修改调用者状态 |
| `advanceUiTick(state: untyped, commands: untyped, catalog: untyped, advanceClock: untyped = false)` | `TickResult` | 已实现 / core-preview + adventure-slice | 唯一UI固定步：按参数推进LoRA或只处理菜单命令，保持世界时间不变。；；状态权限：只读输入，返回计划/值；不得修改调用者状态 |

公开函数下游：

- `advanceWorldTick` → `domain/abilities.js#planAbilityBursts`、`domain/abilities.js#planAbilityFields`、`domain/abilities.js#planAbilityHistory`、`domain/ai.js#planBossAi`、`domain/ai.js#planCompanionAi`、`domain/ai.js#planEnemyAi`、`domain/attacks.js#planCollisionEffects`、`domain/attacks.js#planWeaponFire`、`domain/bosses/gpt.js#planGptReset`、`domain/bosses/grok.js#planGrokProjectiles`、`domain/collision.js#detectCollisions`、`domain/combatPlugins.js#planCombatPluginWorld`、`domain/companions.js#planPartnerBanContact`、`domain/deaths.js#resolveTerminalOutcome`、`domain/distill.js#planDistilledAbilities`、`domain/dshCycle.js#planDshCycleEvent`、`domain/dshEffects.js#planDshEffects`、`domain/easter.js#planEasterAdvance`、`domain/gptPets.js#planGptFields`、`domain/mechanics.js#planMechanicEvent`、`domain/modScope.js#scopePersistenceIntent`、`domain/movement.js#planEntityMotion`、`domain/movement.js#planPickupMotion`、`domain/movement.js#planPlayerMovement`、`domain/plans.js#createEmptyPlan`、`domain/plans.js#createStateChange`、`domain/rewards.js#planDeathRewards`、`domain/scheduled.js#planScheduledActions`、`domain/status.js#planStatusAdvance`、`domain/world/apiMaintenance.js#planApiMaintenance`、`domain/world/escort.js#planEscortAdvance`、`domain/world/expedition.js#planExpeditionProgression`、`domain/world/expeditionMaintenance.js#planExpeditionMaintenance`、`domain/world/extraction.js#planExtraction`、`domain/world/map.js#planMapExploration`、`domain/world/objectives.js#planApiProgression`、`domain/world/objectives.js#planObjectiveAdvance`、`domain/world/pressure.js#planPressureEventAdvance`、`domain/world/pressure.js#planPressureSchedule`、`domain/world/spawning.js#planSpawnSchedule`、`domain/world/tutorial.js#planTutorialAdvance`、`domain/world/tutorial.js#planTutorialRetry`、`engine/commands.js#orderPendingCommands`、`engine/commands.js#planGameCommand`、`engine/effectLoop.js#drainEffectQueue`、`engine/flow.js#planProgressionPanels`、`engine/hooks.js#planEventHooks`、`engine/reducer.js#applyOwnedTickPlan`、`engine/reducer.js#commitOwnedTickState`。
- `advanceUiTick` → `domain/dshEffects.js#planDshEffects`、`domain/lora.js#planLoraUiStep`、`engine/commands.js#orderPendingCommands`、`engine/commands.js#planGameCommand`、`engine/flow.js#planProgressionPanels`、`engine/reducer.js#applyOwnedTickPlan`、`engine/reducer.js#commitOwnedTickState`。

公开函数上游：

- `advanceWorldTick` ← `engine/previewTick.js#advancePreviewWorldTick`、`engine/session.js#stepSessionWorld`、`engine/session.js#stepSessionUi`、`engine/shootingRange.js#createShootingRange`。
- `advanceUiTick` ← `engine/previewTick.js#advancePreviewUiCommands`、`engine/session.js#stepSessionWorld`、`engine/session.js#stepSessionUi`。

## preview/arcadePanels.js

Display-only arcade prizes and paired firing lanes. Gameplay owns the candidates and equipped slots.

[源码](../../src/v2/preview/arcadePanels.js)；层：`host`。

直接依赖：`domain/projectiles.js`、`domain/stats.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `resolvePrizePresentation(definition: untyped, rank: untyped)` | `{cell:number\|'generic';rarity:string;badge:string;name:string;effect:string}` | 已实现 | resolvePrizePresentation；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `createPrizeButton(definition: untyped, rank: untyped)` | `HTMLButtonElement` | 已实现 | createPrizeButton；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `createShotLane(label: untyped, state: untyped, weapon: untyped, catalog: untyped)` | `HTMLElement` | 已实现 | createShotLane；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `resolvePrizePresentation` → 无内部公开函数。
- `createPrizeButton` → `preview/arcadePanels.js#resolvePrizePresentation`。
- `createShotLane` → `domain/projectiles.js#planNativeProjectiles`、`domain/stats.js#deriveWeaponStats`。

公开函数上游：

- `resolvePrizePresentation` ← `preview/arcadePanels.js#createPrizeButton`。
- `createPrizeButton` ← `preview/host.js#mountCombatPreview`。
- `createShotLane` ← `preview/host.js#mountCombatPreview`。

## preview/benchmarkStage.js

Animated previews of the Benchmark ladder, drawn on a shared isometric reef.

[源码](../../src/v2/preview/benchmarkStage.js)；层：`host`。

直接依赖：`preview/characters.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `renderBenchmarkCast(root: untyped, value: untyped, locked: untyped)` | `void` | 已实现 | renderBenchmarkCast；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `renderBenchmarkCast` → `preview/characters.js#characterSource`。

公开函数上游：

- `renderBenchmarkCast` ← `preview/host.js#mountCombatPreview`。

## preview/characters.js

@typedef {{x:number;y:number;w:number;h:number;color:string}} PixelRect

[源码](../../src/v2/preview/characters.js)；层：`host`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `characterSource(name: untyped)` | `string\|null` | 已实现 | characterSource；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `loadCharacterArt(name: untyped)` | `Promise<HTMLImageElement>` | 已实现 | loadCharacterArt；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `drawCharacter(ctx: untyped, name: untyped, x: untyped, y: untyped, size: untyped, pose: untyped = {})` | `boolean` | 已实现 | drawCharacter；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `resolveCharacterModel(id: untyped)` | `string\|null` | 已实现 | resolveCharacterModel；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `characterSource` → 无内部公开函数。
- `loadCharacterArt` → `preview/characters.js#characterSource`。
- `drawCharacter` → `preview/characters.js#characterSource`、`preview/characters.js#loadCharacterArt`。
- `resolveCharacterModel` → 无内部公开函数。

公开函数上游：

- `characterSource` ← `preview/benchmarkStage.js#renderBenchmarkCast`、`preview/characters.js#loadCharacterArt`、`preview/characters.js#drawCharacter`。
- `loadCharacterArt` ← `preview/characters.js#drawCharacter`。
- `drawCharacter` ← `preview/view.js#renderPreviewFrame`。
- `resolveCharacterModel` ← `preview/view.js#renderPreviewFrame`。

## preview/host.js

Mount the opt-in browser preview. Storage is an isolated single-key checkpoint,

[源码](../../src/v2/preview/host.js)；层：`host`。

直接依赖：`adapters/storage.js`、`application/modProfile.js`、`application/nest.js`、`application/repository.js`、`content/achievements.js`、`content/catalog.js`、`content/registry.js`、`content/skillCapabilities.js`、`content/weaponCapabilities.js`、`domain/checkpoint.js`、`domain/clock.js`、`domain/difficulty.js`、`domain/dshCycle.js`、`domain/modScope.js`、`domain/profile/nest.js`、`domain/profile/unlocks.js`、`domain/random.js`、`domain/rewards.js`、`domain/settlement.js`、`domain/stats.js`、`domain/world/api.js`、`domain/world/extraction.js`、`domain/world/regionRules.js`、`engine/session.js`、`preview/arcadePanels.js`、`preview/benchmarkStage.js`、`preview/modManager.js`、`preview/nestManager.js`、`preview/view.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `mountCombatPreview(mountElementId: untyped)` | `() => void` | 已实现 / core-preview + adventure-slice | 组装Free引导/练习、原版及模组短途/远征/API、显式模组档创建、检查点和结算。；；状态权限：宿主入口，只持Session句柄与输入/表现/存储；不直接写GameState |

公开函数下游：

- `mountCombatPreview` → `adapters/storage.js#createStoragePort`、`application/modProfile.js#createModProfileNamespace`、`application/modProfile.js#initializeModProfile`、`application/nest.js#prepareAdventureStart`、`application/repository.js#commitProfilePlan`、`application/repository.js#mergePersistenceIntents`、`application/repository.js#readProfileRepository`、`content/catalog.js#loadContentCatalog`、`content/catalog.js#validateContentCatalog`、`content/registry.js#createHandlerRegistry`、`content/skillCapabilities.js#listRuntimeSkills`、`content/weaponCapabilities.js#listRuntimeWeapons`、`content/weaponCapabilities.js#resolveWeaponTemplate`、`domain/checkpoint.js#canCreateCheckpoint`、`domain/checkpoint.js#createCheckpoint`、`domain/clock.js#createClockState`、`domain/clock.js#resumeClock`、`domain/clock.js#scheduleFrame`、`domain/difficulty.js#introducedMechanics`、`domain/difficulty.js#resolveDifficultySnapshot`、`domain/difficulty.js#resolveModelProfileId`、`domain/dshCycle.js#readDshCycleTimers`、`domain/modScope.js#scopePersistenceIntent`、`domain/profile/nest.js#describeDifficultyAccess`、`domain/profile/nest.js#offersApiDeparture`、`domain/profile/unlocks.js#runReceiptStamps`、`domain/random.js#drawRandom`、`domain/rewards.js#explorationLootMultiplier`、`domain/settlement.js#createSettlement`、`domain/stats.js#derivePlayerStats`、`domain/world/api.js#canApiWithdraw`、`domain/world/extraction.js#canExtract`、`domain/world/extraction.js#extractionDuration`、`domain/world/regionRules.js#localWorldId`、`domain/world/regionRules.js#resolveExpeditionRoute`、`engine/session.js#createGameSession`、`engine/session.js#disposeGameSession`、`engine/session.js#enqueueSessionCommand`、`engine/session.js#readSessionState`、`engine/session.js#readSessionView`、`engine/session.js#restoreGameSession`、`engine/session.js#stepSessionUi`、`engine/session.js#stepSessionWorld`、`preview/arcadePanels.js#createPrizeButton`、`preview/arcadePanels.js#createShotLane`、`preview/benchmarkStage.js#renderBenchmarkCast`、`preview/modManager.js#mountModManager`、`preview/nestManager.js#mountNestManager`、`preview/view.js#getPreviewCamera`、`preview/view.js#renderPreviewFrame`。

公开函数上游：

- `mountCombatPreview` ← 宿主/工具入口或待编排。

## preview/modManager.js

Local community mod manager. Installation is persistent; activation applies only at next departure.

[源码](../../src/v2/preview/modManager.js)；层：`host`。

直接依赖：`content/mods.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `mountModManager(root: untyped, base: untyped, notify: untyped)` | `{getCatalog: () => ContentCatalog; dispose: () => void}` | 已实现 | 提供本地JSON安装、启停与移除；组合影响下次Free练习或独立模组冒险，不热替换对局。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `mountModManager` → `content/mods.js#composeModCatalog`、`content/mods.js#parseModPackage`。

公开函数上游：

- `mountModManager` ← `preview/host.js#mountCombatPreview`。

## preview/nestManager.js

Mount the nest dashboard; Profile changes go through the application service and transactional port.

[源码](../../src/v2/preview/nestManager.js)；层：`host`。

直接依赖：`application/nest.js`、`content/achievements.js`、`content/registry.js`、`content/skillCapabilities.js`、`content/weaponCapabilities.js`、`domain/profile/tree.js`、`preview/nestRange.js`、`preview/nestRoom.js`、`preview/techMap.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `mountNestManager(root: untyped, catalog: untyped, storage: untyped, onProfile: untyped, notify: untyped)` | `{setProfile:(record:StorageRecord\|null)=>void; getLoadout:()=>{weaponIds:string[];skillId:string;companionId:string\|null};dispose:()=>void}` | 已实现 | 组装当前原版或精确模组档案的小窝UI；所有消费经应用服务，不接触GameState。；；状态权限：宿主只读Profile副本，经应用服务消费；不修改GameState |

公开函数下游：

- `mountNestManager` → `application/nest.js#executeNestAction`、`content/registry.js#createHandlerRegistry`、`content/skillCapabilities.js#listRuntimeSkills`、`content/weaponCapabilities.js#listRuntimeWeapons`、`domain/profile/tree.js#resolveDshSlotCount`、`domain/profile/tree.js#validateTreePurchase`、`preview/nestRange.js#mountNestRange`、`preview/nestRoom.js#mountNestRoom`、`preview/techMap.js#renderTechMap`。

公开函数上游：

- `mountNestManager` ← `preview/host.js#mountCombatPreview`。

## preview/nestRange.js

Drive an isolated, unsaved shooting lane with the real world clock and native MCP handlers.

[源码](../../src/v2/preview/nestRange.js)；层：`host`。

直接依赖：`engine/shootingRange.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `mountNestRange(root: untyped, catalog: untyped, profile: untyped, equipped: untyped)` | `()=>void` | 已实现 | mountNestRange；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `mountNestRange` → `engine/shootingRange.js#createShootingRange`。

公开函数上游：

- `mountNestRange` ← `preview/nestManager.js#mountNestManager`。

## preview/nestRoom.js

Swim between placed residents and facilities. Coordinates are room percentages.

[源码](../../src/v2/preview/nestRoom.js)；层：`host`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `mountNestRoom(root: untyped, profile: untyped, open: untyped, companion: untyped, equip: untyped, position: untyped)` | `()=>void` | 已实现 | mountNestRoom；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `mountNestRoom` → 无内部公开函数。

公开函数上游：

- `mountNestRoom` ← `preview/nestManager.js#mountNestManager`。

## preview/techMap.js

Draw the catalog DAG in route lanes. Every edge keeps its actual prerequisite IDs.

[源码](../../src/v2/preview/techMap.js)；层：`host`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `renderTechMap(root: untyped, catalog: untyped, profile: untyped, available: untyped, buy: untyped, view: untyped)` | `void` | 已实现 | renderTechMap；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `renderTechMap` → 无内部公开函数。

公开函数上游：

- `renderTechMap` ← `preview/nestManager.js#mountNestManager`。

## preview/view.js

Canvas presentation for the combat preview. Never mutates or simulates game state.

[源码](../../src/v2/preview/view.js)；层：`host`。

直接依赖：`domain/geometry.js`、`preview/characters.js`。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|
| `getPreviewCamera(view: untyped, width: untyped, height: untyped)` | `{x:number;y:number;scale:number}` | 已实现 / core-preview | 按画面尺寸计算相机与比例，绘制和鼠标映射使用同一投影。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |
| `renderPreviewFrame(ctx: untyped, view: untyped, width: untyped, height: untyped, pixelRatio: untyped, popups: untyped = [])` | `void` | 已实现 / core-preview | 只读绘制实体、米粒、弱点/攻击预警与伤害数字，不模拟战斗。；；状态权限：只读输入、返回值/计划；不得写调用者状态 |

公开函数下游：

- `getPreviewCamera` → `domain/geometry.js#computeCameraBounds`。
- `renderPreviewFrame` → `preview/characters.js#drawCharacter`、`preview/characters.js#resolveCharacterModel`、`preview/view.js#getPreviewCamera`。

公开函数上游：

- `getPreviewCamera` ← `preview/host.js#mountCombatPreview`、`preview/view.js#renderPreviewFrame`。
- `renderPreviewFrame` ← `preview/host.js#mountCombatPreview`。

## versions.js

导出SCHEMA_VERSION与CORE_VERSION，指定读档兼容边界；无函数或运行时组装。

[源码](../../src/v2/versions.js)；层：`contract`。

直接依赖：无。

| 函数签名 | 返回 | 状态/范围 | 功能与约束 |
|---|---|---|---|

公开函数下游：


公开函数上游：


## 内容处理器绑定

| 分类 | 稳定ID | 处理器 |
|---|---|---|
| plugins | `plugin_parallel` | `content/handlers/plugins.js#planPluginParallel` |
| plugins | `plugin_local_deploy` | `content/handlers/plugins.js#planPluginLocalDeploy` |
| plugins | `plugin_quant_int4` | `content/handlers/plugins.js#planPluginQuantInt4` |
| plugins | `plugin_rollback_emergency` | `content/handlers/plugins.js#planPluginRollbackEmergency` |
| plugins | `plugin_batch` | `content/handlers/plugins.js#planPluginBatch` |
| plugins | `plugin_compress` | `content/handlers/plugins.js#planPluginCompress` |
| plugins | `plugin_cache` | `content/handlers/plugins.js#planPluginCache` |
| plugins | `plugin_retry` | `content/handlers/plugins.js#planPluginRetry` |
| plugins | `plugin_temperature` | `content/handlers/plugins.js#planPluginTemperature` |
| plugins | `plugin_collect` | `content/handlers/plugins.js#planPluginCollect` |
| plugins | `plugin_cooldown` | `content/handlers/plugins.js#planPluginCooldown` |
| plugins | `plugin_offload` | `content/handlers/plugins.js#planPluginOffload` |
| plugins | `plugin_keepalive` | `content/handlers/plugins.js#planPluginKeepalive` |
| plugins | `plugin_redirect` | `content/handlers/plugins.js#planPluginRedirect` |
| plugins | `plugin_backoff` | `content/handlers/plugins.js#planPluginBackoff` |
| plugins | `plugin_distill` | `content/handlers/plugins.js#planPluginDistill` |
| plugins | `plugin_5h` | `content/handlers/plugins.js#planPlugin5h` |
| plugins | `plugin_failover` | `content/handlers/plugins.js#planPluginFailover` |
| plugins | `plugin_sandbox` | `content/handlers/plugins.js#planPluginSandbox` |
| plugins | `plugin_hallucination` | `content/handlers/plugins.js#planPluginHallucination` |
| plugins | `plugin_chain` | `content/handlers/plugins.js#planPluginChain` |
| plugins | `plugin_context` | `content/handlers/plugins.js#planPluginContext` |
| plugins | `plugin_hotplug` | `content/handlers/plugins.js#planPluginHotplug` |
| plugins | `plugin_guard` | `content/handlers/plugins.js#planPluginGuard` |
| plugins | `plugin_prefill` | `content/handlers/plugins.js#planPluginPrefill` |
| plugins | `plugin_toolchain` | `content/handlers/plugins.js#planPluginToolchain` |
| plugins | `plugin_mirror` | `content/handlers/plugins.js#planPluginMirror` |
| plugins | `plugin_recursion` | `content/handlers/plugins.js#planPluginRecursion` |
| plugins | `plugin_moe` | `content/handlers/plugins.js#planPluginMoe` |
| plugins | `plugin_speculate` | `content/handlers/plugins.js#planPluginSpeculate` |
| plugins | `plugin_window` | `content/handlers/plugins.js#planPluginWindow` |
| plugins | `plugin_agent` | `content/handlers/plugins.js#planPluginAgent` |
| plugins | `plugin_breaker` | `content/handlers/plugins.js#planPluginBreaker` |
| dsh | `dsh_claude_appeal` | `content/handlers/dsh.js#planDshClaudeAppeal` |
| dsh | `dsh_gpt_preview` | `content/handlers/dsh.js#planDshGptPreview` |
| dsh | `dsh_grok_license` | `content/handlers/dsh.js#planDshGrokLicense` |
| dsh | `dsh_claude_allowlist` | `content/handlers/dsh.js#planDshClaudeAllowlist` |
| dsh | `dsh_gpt_branch` | `content/handlers/dsh.js#planDshGptBranch` |
| dsh | `dsh_grok_salvage` | `content/handlers/dsh.js#planDshGrokSalvage` |
| dsh | `dsh_sleep` | `content/handlers/dsh.js#planDshSleep` |
| dsh | `dsh_rice` | `content/handlers/dsh.js#planDshRice` |
| dsh | `dsh_open` | `content/handlers/dsh.js#planDshOpen` |
| dsh | `dsh_lora` | `content/handlers/dsh.js#planDshLora` |
| weapons | `mcp_bubble` | `content/handlers/weapons.js#planWeaponBubble` |
| weapons | `mcp_fan` | `content/handlers/weapons.js#planWeaponFan` |
| weapons | `mcp_vector` | `content/handlers/weapons.js#planWeaponVector` |
| weapons | `mcp_stream` | `content/handlers/weapons.js#planWeaponStream` |
| weapons | `mcp_return` | `content/handlers/weapons.js#planWeaponReturn` |
| weapons | `mcp_batch` | `content/handlers/weapons.js#planWeaponBatch` |
| skills | `skill_disconnect` | `content/handlers/skills.js#planSkillDisconnect` |
| skills | `skill_cache` | `content/handlers/skills.js#planSkillCache` |
| skills | `skill_batch` | `content/handlers/skills.js#planSkillBatch` |
| skills | `skill_redirect` | `content/handlers/skills.js#planSkillRedirect` |
| skills | `skill_sandbox` | `content/handlers/skills.js#planSkillSandbox` |
| skills | `skill_fork` | `content/handlers/skills.js#planSkillFork` |
| skills | `skill_rollback` | `content/handlers/skills.js#planSkillRollback` |
| skills | `skill_overclock` | `content/handlers/skills.js#planSkillOverclock` |
| companions | `companion_rice` | `content/handlers/companions.js#planCompanionRice` |
| companions | `companion_patch` | `content/handlers/companions.js#planCompanionPatch` |
| companions | `companion_cache` | `content/handlers/companions.js#planCompanionCache` |
| companions | `companion_router` | `content/handlers/companions.js#planCompanionRouter` |
| companions | `companion_decoy` | `content/handlers/companions.js#planCompanionDecoy` |
| companions | `companion_rocket` | `content/handlers/companions.js#planCompanionRocket` |
| enemies | `enemy_gpt_codex` | `content/handlers/enemies.js#planEnemyGptCodex` |
| enemies | `enemy_gpt_dewey` | `content/handlers/enemies.js#planEnemyGptDewey` |
| enemies | `enemy_gpt_fireball` | `content/handlers/enemies.js#planEnemyGptFireball` |
| enemies | `enemy_gpt_hoots` | `content/handlers/enemies.js#planEnemyGptHoots` |
| enemies | `enemy_gpt_rocky` | `content/handlers/enemies.js#planEnemyGptRocky` |
| enemies | `enemy_gpt_seedy` | `content/handlers/enemies.js#planEnemyGptSeedy` |
| enemies | `enemy_gpt_stacky` | `content/handlers/enemies.js#planEnemyGptStacky` |
| enemies | `enemy_claude_guard` | `content/handlers/enemies.js#planEnemyClaudeGuard` |
| enemies | `enemy_grok_bot` | `content/handlers/enemies.js#planEnemyGrokBot` |
| enemies | `enemy_gpt_bsod` | `content/handlers/enemies.js#planEnemyGptBsod` |
| enemies | `enemy_gpt_null-signal` | `content/handlers/enemies.js#planEnemyGptNullSignal` |
| models | `claude_haiku` | `content/handlers/models.js#planModelClaudeHaiku` |
| models | `claude_sonnet` | `content/handlers/models.js#planModelClaudeSonnet` |
| models | `claude_opus` | `content/handlers/models.js#planModelClaudeOpus` |
| models | `claude_fable` | `content/handlers/models.js#planModelClaudeFable` |
| models | `claude_mythos` | `content/handlers/models.js#planModelClaudeMythos` |
| models | `gpt_astra` | `content/handlers/models.js#planModelGptAstra` |
| models | `gpt_sol` | `content/handlers/models.js#planModelGptSol` |
| models | `gpt_terra` | `content/handlers/models.js#planModelGptTerra` |
| models | `gpt_luna` | `content/handlers/models.js#planModelGptLuna` |
| models | `grok_bot` | `content/handlers/models.js#planModelGrokBot` |
| mechanics | `mech_01_exploration` | `content/handlers/mechanics.js#planMechanic01Exploration` |
| mechanics | `mech_02_reinforcements` | `content/handlers/mechanics.js#planMechanic02Reinforcements` |
| mechanics | `mech_03_gpt_support` | `content/handlers/mechanics.js#planMechanic03GptSupport` |
| mechanics | `mech_04_claude_break` | `content/handlers/mechanics.js#planMechanic04ClaudeBreak` |
| mechanics | `mech_05_boss_combo` | `content/handlers/mechanics.js#planMechanic05BossCombo` |
| mechanics | `mech_06_alarm_cache` | `content/handlers/mechanics.js#planMechanic06AlarmCache` |
| mechanics | `mech_07_tide` | `content/handlers/mechanics.js#planMechanic07Tide` |
| mechanics | `mech_08_grok_flanks` | `content/handlers/mechanics.js#planMechanic08GrokFlanks` |
| mechanics | `mech_09_gpt_reposition` | `content/handlers/mechanics.js#planMechanic09GptReposition` |
| mechanics | `mech_10_boss_arena` | `content/handlers/mechanics.js#planMechanic10BossArena` |
| mechanics | `mech_11_objective_signal` | `content/handlers/mechanics.js#planMechanic11ObjectiveSignal` |
| mechanics | `mech_11_glasswing` | `content/handlers/mechanics.js#planMechanic11Glasswing` |
| mechanics | `mech_12_gpt_four_roles` | `content/handlers/mechanics.js#planMechanic12GptFourRoles` |
| mechanics | `mech_13_handoff` | `content/handlers/mechanics.js#planMechanic13Handoff` |
| mechanics | `mech_14_anomaly` | `content/handlers/mechanics.js#planMechanic14Anomaly` |
| mechanics | `mech_15_integration` | `content/handlers/mechanics.js#planMechanic15Integration` |

## 声明式数据消费者

30个技能树节点和6项设施列于manifest.dataDefinitions；来源与参数见content/catalogData.js。数值落表不表示树购买、局外应用或全部运行效果已经实现。
