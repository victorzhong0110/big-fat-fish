# 14 · 社区模组与开放接口

用户新增要求：像可长期运营的Steam独立游戏，开放社区创作接口，玩家可自行安装模组。此要求属于正式架构范围；原有玩法规格继续有效。游戏里的局内「插件」和局外「DSH插件」是玩法内容；本章的「模组（Mod）」是玩家安装的扩展包，三者不混用。

## 当前可用版本：SDK 1.0 / 1.1 / 1.2 / 1.3

`v2.html`出发页下方有「社区模组」菜单，可导入本地JSON、启用、停用、移除。仓库的[一盆大泡泡示例](../../public/mods/community-bubbles.json)可直接下载、编辑和安装。无需改源码或构建游戏。

当前开放：

- 调整已实现的泡泡/扇面MCP原生参数：伤害、间隔、弹速、半径、弹数、散布、射程、穿透次数。
- 添加基于泡泡/扇面原生行为的独立新MCP，拥有包命名空间ID，可在Free出发列表选装。
- 使用护盾或延迟爆发原生行为添加独立新技能，可调整冷却与效果强度，在Free练习出发时选装。
- 修改已实现内容的显示名称；界面中使用目录名称的地方随之更新，独立叙事文本不自动替换。
- 精确版本依赖、显式冲突、稳定加载顺序、同一字段冲突诊断。
- 启用包的ID、版本和内容校验值写入对局；整组模组目录指纹决定独立练习检查点。

**现阶段仅Free练习生效。** 正式Free引导和短途/远征/API仍使用原版目录与正式Profile。模组不能绕过未完成内容的能力检查；更不能把尚未实现的敌人、地图、伙伴或新处理器伪装成已开放。独立新MCP和两种技能配方已开放；其他新内容、资源包、脚本和创意工坊适配仍待后续实现。

## 玩家工作流

1. 下载或制作`.json`包，在菜单「安装本地模组」选择文件；安装成功后默认停用。
2. 按依赖关系启用所需模组。缺少依赖、版本不符、声明冲突或重复字段写入时，整个启用操作失败，原启用集不变。
3. 选择Free出发。开局只组装一次内容副本，运行中不会被另一个页面的模组启停热替换。
4. 检查点只在相同包集合与内容下可继续。切回原版时原版检查点仍在；换模组包时不覆盖另一组记录。
5. 移除被其他启用包依赖的模组会失败，需先停用依赖者。卸载不会自动删除历史检查点。

安装库使用浏览器本机存储；现阶段不会自动同步其他设备。数据过大/损坏/版本不兼容时停止加载并保留原记录。卸载的包需要重新安装相同内容才能恢复其检查点。内容校验用于兼容和误改检测，不是作者签名或真实性证明。

## 包契约

| 字段 | 规则 |
|---|---|
| `formatVersion` / `apiVersion` | 当前固定formatVersion=`1`，apiVersion=`"1.0"`/`"1.1"`/`"1.2"`/`"1.3"`；支持1.0–1.3，未知版本拒绝 |
| `id` | `作者命名空间.包名`，如`community.bubbles`；不使用显示名查找依赖 |
| `version` | 严格三段数字版本，如`1.0.0` |
| `gameVersion` | 当前要求精确基础内容版本`2.0.0-preview.5`，升级时不默默兼容 |
| `name` / `author` / `description` | 展示文字；使用textContent显示，不作为HTML执行 |
| `dependencies` | `{ "作者.包名": "1.0.0" }`，只接受精确版本；不自动下载 |
| `conflicts` | 互斥包ID数组；任意一方声明即冲突 |
| `patches` | 最多64个补丁，每个目标ID在包内只出现一次；只能修改已实现内容；1.1起有weapons或1.3有skills时可为空 |
| `weapons` | 1.1–1.3可用，最多16个新MCP配方，整组最多64把 |
| `skills` | 1.3可用，最多16个技能配方，整组最多64个 |

SDK1.1起可包含最多16个独立新MCP配方，整组最多64把；SDK1.3另允许每包最多16个新技能、整组最多64个。每个包最多256 KiB，最多安装/启用32包，安装库最多2 MiB。导入数据只认声明字段；未知字段、脚本、函数、URL执行入口、危险属性名、非有限数值都拒绝。参数边界是当前运行性能和数值类型契约，可在后续SDK版本有说明地放宽，不通过偷偷忽略数据兼容。

| MCP参数 | SDK1.0范围 |
|---|---|
| damage | 0–500 |
| interval | 0.05–10秒 |
| projectileSpeed | 20–2000 |
| projectileRadius | 1–40 |
| pellets / maxHits | 整数1–12 |
| spreadRadians | 0–2π |
| range | 20–3000 |

## 已实现公开函数与调用顺序

| 函数 | 功能 / 调用规则 |
|---|---|
| `parseModPackage(text, base)` | 纯解析校验并复制；只接原版目录；返回`ModPackage`或抛出可展示错误 |
| `resolveModLoadOrder(packs)` | 检查重复ID、精确依赖、冲突、环；拓扑排序，独立包按ID排序 |
| `composeModCatalog(base, packs)` | 重新校验全部包→排序→复制基础目录→补丁/新武器及技能配方→锁与指纹→原有目录校验；一次成功返回，不修改原目录 |
| `resolveWeaponTemplate(catalog, id)` | 原版或拥有包锁的社区ID映射到实际原生行为；未知或伪造注册返回null |
| `listRuntimeWeapons(catalog)` | 列出当前实际能跑的MCP供出发下拉列表 |
| `resolveSkillTemplate(catalog, id)` | 原版技能或有包锁的社区技能映射到实际原生行为 |
| `listRuntimeSkills(catalog)` | 列出当前实际能跑的技能供Free练习选装 |
| `mountModManager(root, base, notify)` | 宿主管理安装库与菜单，返回`getCatalog`/`dispose`；不持有Session、不改GameState |

调用关系：`host.begin`→`manager.getCatalog`→`composeModCatalog`→`parseModPackage`/`resolveModLoadOrder`→`validateContentCatalog`→`createGameSession`。Session固定复制目录；原生攻击仍走`deriveWeaponStats`→伤害/碰撞管线，不单开一套伤害实现。

同一内容的不同字段可以由不同包修改；同一字段被两个包写入一律报错，包含两个包ID和字段。依赖只表达加载前置，不暗示授权覆盖。后续若开放显式覆盖协议，要升级API并在菜单展示最终来源。

`StartSnapshot.modLock`与`ContentCatalog.modLock`逐项相同；每项为`{id,version,digest}`。目录版本包含整组锁指纹，检查点恢复同时校验版本和锁。改相同ID/版本的包内容也会产生不同指纹；禁止静默以新版替换老存档需要的内容。

## 完整扩展面的架构约束（尚未开放）

后续按游戏内核完成顺序扩展SDK，以下是明确待实现的接口契约，**表内通用register接口不是当前可调用API；已开放的MCP配方使用下节weapons契约**。

| 扩展面 / 预定函数 | 输入与产物 | 必须走的核心规则 |
|---|---|---|
| `registerModDefinition` | 命名空间内容ID、种类、版本、参数→目录条目 | SDK1.1已支持MCP模板配方；SDK1.3已支持护盾/爆发技能配方；该通用接口将继续支持更多技能/插件/DSH/伙伴/敌人；前置和引用校验后才进入能力表 |
| `registerModRecipe` | 受支持原生行为模板与参数→绑定 | 先支持组合现有能力，不允许声明一个名字就跳过处理器实现检查 |
| `registerModEventHook` | 白名单事件、条件、效果配方→钩子绑定 | 只读快照→有界EffectPlan→原有队列/reducer；同chain去重，防递归自触发 |
| `registerModMap` | 区域/地形/目标/出生/检查点模板→地图定义 | 相同碰撞矩阵、出生安全与目标可达性校验，不能绕过存档边界 |
| `registerModAsset` | 包内相对路径、类型、校验值→资源句柄 | 贴图/像素角色/音效/音乐；资源大小与生命周期由资源适配层负责 |
| `createModProfileNamespace` | 锁指纹、当前正式档的显式副本选择→独立档案 | 模组收益、解锁、成就不回写原版；删模组不破坏原档 |
| `migrateModSave` | 旧锁、旧数据、目标锁、显式迁移→新副本 | 原档备份，验证成功后原子替换；禁止省略缺失敌人或重抽随机结果 |
| `createWorkshopProvider` | 平台适配端口→订阅/下载/更新/发布操作 | 本地安装器不依赖Steam，创意工坊和其他来源共用包校验与锁 |

未来的脚本行为扩展单独建立受限运行时，不直接`eval/import`社区代码到主线程，不把原始Session、文件系统、存储或网络交给事件钩子。超时或超预算要暂停相关运行并展示诊断，不能把半套效果继续提交。脚本包需要自己的明确SDK版本，不能偷偷塞进1.0 JSON包。

## 版本、更新与分发

- 游戏内容版本、Mod SDK版本、各包版本分别管理。兼容范围语法未实现前只认精确版本。
- 下载更新可以后台进行，运行中固定当前包；只在下一次出发应用。恢复旧检查点必须选回相同包内容，或走显式迁移。
- 本地导入、未来文件夹/压缩包、社区仓库与创意工坊都输出同一种经过校验的包。平台不可用时本地模组仍可运行。
- 原版成就和竞速记录需要在接入时根据`modLock`区分；当前未接Steam成就或排行榜，不显示虚假的平台同步状态。
- 提供示例包、SDK契约、兼容诊断和自动化测试，随游戏源码一起维护。每开放一类新内容，都要有至少一个真实可玩的示例和对应的恢复/卸载测试。

## SDK 1.1：添加独立新MCP

安装[铁盆三叉戟](../../public/mods/community-trident.json)并启用后，在Free出发面板的「练习MCP 1/2」中选择它。它是新ID `community.trident:trident`，不替换原版泡泡：3枚9伤弹，0.45秒间隔、两目标穿透；射击仍使用原生管线。

包声明apiVersion为1.1，在weapons中提供`{id,templateId,displayName,parameters}`。id是包内短名（字母开头，可含数字、下划线和短横线）；最终完整ID为`包ID:短名`，不可冒充其他包或原版ID。SDK1.1的templateId仅允许mcp_bubble/mcp_fan（SDK1.2扩展见下），parameters按1.0同一数值边界校验，未填写字段继承**原版**模板，不受其他包的补丁顺序污染。patches可为空；每个包必须至少有补丁或新配方。重复配方、未知字段/模板、越界数值均拒绝。

`ContentCatalog.modWeapons`记录新ID→模板与所属包；目录校验原版6把武器数量及新增注册映射，95项原版绑定不随模组膨胀。Session初态/恢复/分派共同读取该映射和包锁。原生处理器验证所解析模板后按当前社区定义的实际参数产弹，所以不会丢失独立ID或退回原版伤害。模组停用后原版出发选项恢复，历史检查点仍保留；恢复时需重新安装完全相同的包集合。

SDK1.0包继续可用，未添加weapons字段时内容锁保持不变。本轮是添加可选结构；已有preview.5无树/1.0练习存档仍可恢复，运行版本与必填存储结构不变。新增内容仍仅用于Free；原版Pro1、小窝解锁与正式收益不接受社区武器。

## SDK1.2：六种原生行为

apiVersion=1.2支持全部六种templateId：mcp_bubble/mcp_fan/mcp_vector/mcp_stream/mcp_return/mcp_batch，同时可补丁修改这六种原版MCP参数。1.0参数包与1.1泡泡/扇面配方继续按原版本边界校验；不能用1.1偷偷声明回旋/爆破。

[盆来！示例](../../public/mods/community-callback.json)添加独立回旋MCP：14伤、弹速500、射程380、每程最多4目标。回旋的转折距离随射程按340/500同比变化；回追当前玩家，2秒硬寿命，保留原生墙体和每程命中规则。原生回旋默认每程上限100；显式maxHits覆盖仍遵循SDK当前1–12边界。爆破首次碰撞必须爆炸，所以maxHits必须为1；不能声明穿透后连续爆炸。

射击、并行次级弹、品质/临时品质、检查点都走相同的行为快照。爆破溅射伤害为该发伤害的12/20，继承该发已经应用一次的输出，不再重乘；仅主弹直击可暴击，爆炸属于次级伤害。配方不能添加任意事件处理脚本或新的原生行为代码。

## SDK 1.3：添加独立技能

安装[铁盆技能实验室](../../public/mods/community-pot-skills.json)并启用后，在Free练习的技能菜单可选择独立ID `community.pot_skills:lid`（盆盖护盾）或`community.pot_skills:blast`（盆底爆破）。示例分别以9秒冷却产生40点护盾，以15秒冷却产生97.5点延迟爆发；这些是模组参数，不改原版技能。

`skills`条目声明`{id,templateId,displayName,parameters}`，模板目前仅支持`skill_cache`与`skill_batch`。`parameters.cooldown`范围3–60秒，`parameters.powerMultiplier`范围0.25–3，均可省略并分别继承原版冷却和1倍威力。护盾持续时间、爆发半径、延迟、其他技能和任意代码尚不开放；未知模板、参数与字段会报错。1.3包也可继续使用1.2的六种武器模板；旧1.0–1.2包无需修改。

`composeModCatalog`基于原版复制定义并记录所属包；`resolveSkillTemplate`只对已注册且有对应包锁的ID分派原生处理器。效果强度参与真实技能计划，冷却、技能事件、插件递归、批量处理的瞄准预告与检查点走同一管线。事件和存档保留社区技能ID；更换/停用包不会覆盖原版或其他包组的检查点，恢复要求完全相同的锁。社区技能不进入正式小窝资产或正式收益。

## 确定性重放接口（开发工具）

`application/replay.js`现在提供真实实现，可供社区战斗分析器/复现工具导入。它不是可执行模组脚本入口，不改变正式冒险的模组限制。世界与UI统一经过`engine/tick.js`，旧`previewTick`只保留兼容委托。

| 函数 | 功能与调用规则 |
|---|---|
| `beginRecording(state)` | 在没有待入队命令的边界调用，复制完整状态、随机流、内容锁、版本与初始摘要；可从Boss/LoRA状态开始，不能把它当正式检查点 |
| `appendRecordedCommands(recording, commands)` | Session成功接受命令后，按实际入队顺序调用；拒绝的输入不记为成功输入；返回新记录 |
| `appendRecordingStep(recording, domain, advanceClock, nextState)` | 每次真实Session步完成后调用；包括世界冻结调用、UI命令flush与UI指针步；记录该步之前已入队命令数和完整状态摘要 |
| `replayRecording(recording, catalog)` | 独立创建重放Session，按原边界入队并执行；逐步比对世界/UI时钟及摘要；首个分歧返回具体步序，始终释放Session |
| `createReplaySession(initial, catalog)` | 引擎开发入口：验证版本、内容锁、目录和状态不变量后复制状态；不暂停、不读写Profile、不执行持久化意图 |

使用示例（调用者保有原Session及相同目录）：

```js
let recording = beginRecording(readSessionState(session));
const accepted = enqueueSessionCommand(session, command);
if (accepted.ok) recording = appendRecordedCommands(recording, [command]);
const result = stepSessionWorld(session);
recording = appendRecordingStep(recording, 'world', false, result.next);
// LoRA固定指针步使用 stepSessionUi(session, true)，并记录 'ui', true；
// 仅处理菜单/暂停命令使用 stepSessionUi(session, false)，记录 'ui', false。
const verified = replayRecording(recording, catalog);
```

`npm run replay:v2 -- recording.json`可校验原版JSON录像，成功输出已验证步数及最终摘要，失败返回非零退出码。社区内容录像需由调用者传入**相同组装目录**，CLI目前仅加载原版，不会自动安装录像要求的包。摘要检测数据破损与模拟分歧，不是反作弊签名。

单段上限500,000固定步、100,000条命令、64 MiB序列化数据；达到上限时应导出并从无待处理命令的边界另起分段。当前是逐步完整摘要的开发工具，尚未接入生产录像按钮，也未完成40分钟实时录制的性能验收。不能依据此接口宣称已提供录像播放器或创意工坊。
