# 大肥鱼桌面版 · 固定规则开发交接

从包含本文档的分支开始。运行 `npm ci` 和 `npm run dev`，在桌面浏览器打开 `/v2.html`。这批工作围绕已接入的难度滚轮、街机奖品台、试射道、气泡泵与跑分小票。美术、动画、投射物轨迹和滚轮手感由界面负责人维护。手机端另排。

## 怎么分派

| 卡 | 本分支已经具备 | 接手后的交付 | 依赖 |
| --- | --- | --- | --- |
| 1　选关数据 | 可滚动预览、锁定剪影、左下机制、正式出发校验 | 把可玩状态、档位名称与探索掉落倍率接到同一规则来源；补边界用例 | 独立 |
| 2　奖品资料 | 33 款奖品图、三种台座、真实抽选与换装命令 | 给图集映射做完整性检查；用真实候选验证重抽、升级和四选特殊局 | 独立 |
| 3　结算凭据 | 小票读真实结算，成功写入档案后显示新增项 | 补齐成就名称与跨检查点的当局凭据，覆盖失败重试和重复结算 | 独立 |
| 4　交互回归 | 装备确认、训练输入、音量存储、模组隔离和科技购买均已接入 | 按下列夹具验收桌面按钮；仅对缺失的断言补测，对确认的偏差修接线 | 独立 |

每张卡可以单独提 PR。多人同时动手时，把纯查询和用例放在表中列出的归属模块，最后只在 `preview/host.js` 的对应入口接线。用开发用存档或测试夹具造边界状态。

## 1　选关数据只维护一份

入口为 `src/v2/preview/host.js` 的 `updateWallet`、`renderBenchmarkBoard` 和 `begin`。解锁规则在 `src/v2/domain/profile/nest.js` 的 `isDifficultyUnlocked` 与 `validateStartRequest`，敌方强度在 `src/v2/domain/difficulty.js`，展示名在内容目录。菜单用 `describeDifficultyAccess` 读取解锁原因，和实际出发校验共用 `isDifficultyUnlocked`。

- 给选择器提供同源的可玩状态及对应的解锁原因。Free 引导和自由练习是 0；剧情、三海域、无尽是 1–15；探索按档读取 `endlessClear:N`。API 入口沿用现有模式与 `apiUnlocked` 限制。模组冒险读取该组合的独立档案。
- 每档的「新增机制」取 `catalog.mechanics.filter(m => m.unlockAt === level)`。战斗快照用累积机制。选到锁定档时传给舞台锁定状态，详情只显示问号，出发键显示解锁条件。
- 在 `src/v2/domain/rewards.js` 抽出探索目标与补给箱共用的倍率查询，由 `planWorldReward` 和难度页共同调用。当前公式是 `1 + (N - 1) × 0.1`，发放时对各类基础数量分别取 `Math.round`。标注「宝箱与目标掉落」，敌方生命倍率另读 `resolveDifficultySnapshot`。API 的可选模型与实战抽取共用 `modelProfileOptions`，名称取内容目录。
- 验收可加入 `tests/v2/benchmark-modes.test.js`、`tests/v2/difficulty-mechanics.test.js`。验证 1、5/6、10/11、15/API、探索锁定及 Free。菜单可用和实际能开局须一致。

| 桌面夹具 | 可观察结果 |
| --- | --- |
| 新档，默认剧情 | B1 可开始；B2 可停靠预览，提示通关 B1；下次打开保留已选择的模式 |
| 最高通关 7，探索凭据只有 `endlessClear:4` | 剧情 B8 可开始；探索 B4 可开始且宝箱/目标为 ×1.3；探索 B5 提示通关无尽 5 |
| B11 已可玩 | 左下同时显示「目标增援信号」与「Claude · Project Glasswing」，不重复列出 B1–10 |
| 已开 API | 在支持 API 的出发模式可选 API；无尽及探索仍走各自的数字档入口 |

## 2　奖品身份、候选与重抽

数据入口是 `src/v2/content/catalogData.js`、`src/v2/domain/draft.js`；表现入口是 `src/v2/preview/arcadePanels.js` 的 `createPrizeButton`。现有清晰可辨的三种台座分别对应 `common` 白银、`advanced` 黄金、`legendary` 棱彩。图集 `public/art/interface/prize-toys.webp` 为 6 × 6，33 个正式插件各有固定格号。未登记的插件使用独立扭蛋图。

1. 给 33 个正式插件的 ID 与格号加完整性断言。每个 ID 指向唯一的非空格，换稀有度或调整目录顺序不会换错图；未登记的扩展使用可识别的通用图形。名称取 `displayName`，效果取 `rankDescriptions[rank - 1]`。
2. 用运行时的 `createPluginChoice`、`planPluginSelection`、`planPluginReroll`、`planPluginSkip` 驱动界面。首个 Lv.2 候选含符合条件的蒸馏；普通局三选，有 `dsh_gpt_preview` 时首次 Lv.2 可有四选。第一次抽取与重抽使用领域层返回的不同 choice ID。
3. 验收三种稀有度各一例、已有一级升二级、一局重抽一次、六个本局槽已满时选新插件。返回候选时原装备仍在，确认后只替换所选插件。候选有棱彩也能立即点击。检查四个候选都有入口。

优先扩展 `tests/v2/growth.test.js`、`tests/v2/plugins-dsh.test.js` 或 `scripts/test-v2-builds-browser.mjs` 中尚未覆盖的部分。抽取权重与前置条件沿用 `createPluginChoice`。

## 3　结算金额与解锁印章

`src/v2/domain/settlement.js` 的 `createSettlement` 给出本局实际带回的碎片、零件和结果；`planSettlementCommit` 负责碎片换卡及结算去重。持久化经 `src/v2/application/repository.js`。档案提交在同一笔事务内按 runId 记录本局解锁和实际入账金额。小票在保存成功后读取这份记录。旧档可从带有对局身份的首发现记录恢复装备名称。

- 给小票提供按 runId 归属的材料、折算卡数、明确的新增解锁名。复用成功提交的结果与稳定事件 ID；老检查点缺少某项依据时，仅显示可验证的内容。成就名称查 `src/v2/content/achievements.js`，装备、DSH、伙伴名称查内容目录。区分已有收藏与本局新增。
- 使用同一个 `settlement:<runId>` 重试；档案写入失败时保留正常重试操作。验证同档案的另一窗口产生进度时，小票不会把对方的解锁印成本局成果。比较提交后的档案还可核对入账金额。
- 做一个先解锁、保存、刷新、继续、结算的夹具，另做同一结算提交两次的夹具。旧存档、原版与模组组合均沿用现有仓储入口。已有实现和用例在 `tests/v2/profile.test.js`、`tests/v2/checkpoint-cycle.test.js`、`tests/v2/mod-adventure.test.js`。

| 条件 | 小票和账本应显示的结果 |
| --- | --- |
| 普通失败，背包 13 碎片、7 零件，无保留加成 | 带回 5 碎片、2 零件；若原碎片为 0，到账 1 张卡、余 0 碎片 |
| 相同背包，带 `tree_explore_c`，普通失败 | 带回 6 碎片、3 零件 |
| 探索失败 | 背包材料带回 0 |
| 探索撤离，同样背包，带 `tree_explore_extract` | 带回 13 碎片、8 零件 |
| 首次完成正式 Free 教学，随后再通关 | 首次 1 张算力卡，重复完成新增 0 张；普通练习不写永久奖励 |

## 4　固定输入与存档回归

| 入口 | 桌面操作与预期 | 对照实现及已有测试 |
| --- | --- | --- |
| 换 MCP | 两槽满，按 F 拾取，依次预览两个槽。取消后地面与携带实例相同；确认替换一个槽后原实例落地，保留冷却和临时品质。再读档可拾回。 | `domain/equipment.js`，`tests/v2/weapons-equipment.test.js`，`scripts/test-v2-equipment-browser.mjs` |
| LoRA | 第一次按下开始、松开、第二次按下确认。用 UI tick 50/51/69/70 分别验证欠拟合/完美/完美/过拟合；超时走领域事件。冻结期间世界时钟不前进。 | `domain/lora.js` 的 `resolveLoraOutcome`，`tests/v2/lora.test.js` |
| 科技芯片 | 点一枚有双前置的芯片。缺一前置或余额不足时购买无效；满足条件后一次扣费、一次写入，重新打开可见已购买。 | `domain/profile/tree.js` 的 `validateTreePurchase`、`planTreePurchase`，`tests/v2/nest-runtime.test.js` |
| 设置 | 两个旋钮各自改值、静音，打开暂停设置核对百分比；刷新后两声道分别恢复。视觉简化与音量独立。 | `src/v2-sound.js`，`scripts/test-v2-audio-browser.mjs` |
| 模组卡带 | 安装示例，启用，进自由练习；再停用，确认原版档案与该组合档案的检查点各自可恢复。损坏包走原有验证与错误提示。 | `src/v2/content/mods.js`、`src/v2/application/modProfile.js`，`tests/v2/mods.test.js`、`tests/v2/mod-adventure.test.js` |

表中 `domain/` 路径相对于 `src/v2/`。纯规则用例优先使用现有 fixtures，涉及按钮才使用浏览器。每张卡交付时附上改动文件、实际命令及边界用例结果。架构签名或依赖改变后先运行 `npm run sync:v2`，再运行以下检查。

```sh
npm run check:v2
npm test
npm run build
# V2_CHROMIUM_EXECUTABLE 指向已安装的 Chromium
npm run test:v2:interface -- --desktop
npm run test:v2:desktop-cards
```
