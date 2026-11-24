# 大肥鱼 V2（Big Fat Fish）后续开发规划与 Grok 执行指南

> **核心定位**：一款**玩 AI 圈黑话梗的轻松爽游**（DeepSeek 大肥鱼对战 ChatGPT、Claude、Grok 阵营）。
> **当前策略**：做减法、抓爽点。优先打磨 **10 分钟一局的短途爽游体验与画面打击感**，暂缓 40 分钟三海域长途远征和重度长线数值系统。
> **执行对象说明**：本规划面向 **Grok（推荐 Grok 4.7 `high` / `xhigh` 推理档）** 编写，已将所有模糊的“视觉手感”拆解为明确的参数与文件契约，避免只过测试但画面生硬。

---

## 一、动手前必读的工程红线

1. **逻辑与表现严格隔离**：
   - `src/v2/domain/` 与 `src/v2/engine/` 为纯确定性逻辑层，**禁止**引入 DOM、Canvas、浏览器 API 或非确定性 `Math.random()`。
   - 所有纯视觉特效（粒子、闪白、震屏、残影、气泡台词）全部放在 `src/v2/preview/` 中，通过**比对前后帧 `snapshot` 差异**来触发，不得污染 `tick.js` 的状态与重放校验。
2. **已锁定美术资源不可破坏**：
   - `public/art/characters/` 原有的 12 个立绘受 `public/art/characters/approved-art.json` 和 `npm run test:v2:characters` 字节级校验保护，**禁止覆盖或重编码原图**。
   - 本次新增的立绘与武器贴图已整理就位，直接按新文件名接线即可。
3. **每次改动后的标准验收命令**：
   - 若新增或修改了 V2 公开函数导出或签名，先执行 `npm run sync:v2`。
   - 交付前必须通过：
     ```bash
     npm run check:v2   # TypeScript 类型检查 + V2 架构依赖检查
     npm test           # V2 单元测试（tests/v2）
     npm run build      # Vite 构建校验
     ```

---

## 二、分阶段开发路线图（4 个 Stage）

建议每次只让 Grok 执行 **1 个 Stage**，实机试玩确认手感后再推进下一阶段。

### Stage 1：视觉与手感救急（让画面瞬间像个游戏）

**对应 Issue**：#4（特效缺失）、#3（Grok 齐跳）、#10（Rocky 边缘闪烁）、#12（蒸馏虚影混淆）
**目标**：纯代码层解决“不像游戏”的问题，必须严格按以下量化参数实现打击感，避免只画生硬几何圆。

1. **轻量特效池与打击感（`src/v2/preview/view.js`）**
   - 在 `view.js` 内部维护定长对象池：`ParticlePool`（上限 160 粒）、`ShockwavePool`（上限 24 个）、`ScreenShake`，并缓存上一帧 `prevSnapshot`。注意**暂停/冻结期间停止推进特效时间**。
   - **子弹命中**：对比实体血量下降或弹体消失，在命中点生成 4–6 粒对应阵营色的火花粒子（DeepSeek `#5B7CFF`、GPT `#10A37F`、Claude `#D97757`、Grok `#00C875`），寿命 180–260ms，带速度衰减与半径缩小。
   - **受击闪白 + 挤压拉伸**：实体掉血时触发 60ms（约 2–3 帧）纯白受击闪白（使用离屏小 Canvas `globalCompositeOperation = 'source-atop'` 绘制白色剪影），叠加 120ms 挤压拉伸弹性形变（起始 `scale(1.16, 0.84)` 线性插值回 `1.0`）。
   - **敌人死亡消散**：实体从快照移除时，在其中心生成 8–12 粒阵营色碎裂粒子向四周飞散（寿命 320–450ms），避免敌人瞬间凭空消失。
   - **爆炸冲击环与轻震**：Grok 火箭及范围爆炸触发 1 个扩散冲击环（线宽从 4px 随半径扩散收细至 0.5px，透明度渐隐）+ 轻度镜头震动（振幅 3–5px，衰减时长 140ms）。
   - **性能降级开关**：在设置面板增加“简化特效”开关（开启后粒子减半、关闭震屏）。

2. **蒸馏虚影敌我区分（`src/v2/preview/characters.js` / `view.js`）**
   - 渲染 `distilled_bot` 时，禁止直接调用原色 `drawCharacter(..., 'grok')`。
   - 改用离屏 Canvas 将其染成与主角 DeepSeek 一致的蓝紫色（`#6B7BFF`）半透明能量剪影（`alpha = 0.65`），并在移动路径上每隔 3 帧留 1 个淡蓝色小气泡尾迹。

3. **运动表现 Bug 修复（`src/v2/domain/`）**
   - **Grok 齐跳打散（#3）**：在 `src/v2/domain/locomotion.js` 中，将 Grok 的 `hopPeriod` 改为基于实体 ID 哈希的错落周期（44–58 tick）并拉大 `phaseOffset` 分散度；贴地等待段在 `characters.js` 加 ±1.5px 轻微呼吸缩放。
   - **Rocky 边缘闪烁修复（#10）**：在 `movement.js` / `locomotion.js` 中，为 `visualFacing` 增加速度死区滞回（仅当 `|vx| > 12` 时才更新水平朝向，或直接朝向目标点），消除贴近地图边界与 leash 弧线时的帧级左右翻转。

---

### Stage 2：已就位立绘与“泡泡炮遮挡”方案接线

**对应 Issue**：#5（ChatGPT 龙尾立绘）、#13（受击等独立状态立绘）
**前置条件**：所需透明底 RGBA PNG 素材**已全部整理放入仓库**，Grok 只需负责代码接线与绘制对齐，**无需自己生成图片**。

1. **已就位的素材清单**
   - 主角武器图层：`public/art/weapons/bubble-cannon.png`（像素玩具泡泡炮）
   - 主角受击状态：`public/art/characters/deepseek-hurt.png`
   - ChatGPT Boss 本体与状态：`public/art/characters/chatgpt.png`、`chatgpt-attack.png`、`chatgpt-hurt.png`
   - Claude 状态：`public/art/characters/claude-attack.png`、`claude-hurt.png`
   - Grok 状态：`public/art/characters/grok-attack.png`、`grok-hurt.png`

2. **大肥鱼“泡泡炮遮挡手部”叠加实现（核心需求）**
   - 大肥鱼为远程攻击角色，**不制作出拳/近战攻击换图**，战斗全程保持原版 `deepseek.png` 站姿（仅受击时切换 `deepseek-hurt.png`）。
   - 在 `src/v2/preview/characters.js`（或 `view.js` 玩家绘制流程）中新增手持武器叠加层：
     - 将 `public/art/weapons/bubble-cannon.png` 叠加绘制在 `deepseek.png` 靠前方的手部区域，遮挡住原版角色手部。
     - 泡泡炮以握把附近为锚点，跟随玩家瞄准角度 `pose.facing` 实时旋转；当瞄准朝左（`Math.cos(facing) < 0`）时做垂直翻转（`scale(1, -1)`），避免炮身倒置。
     - 开火瞬间（`pose.attacking`）沿瞄准反方向施加 3–4px 线性回弹后坐力位移，并让子弹从炮口前端坐标发射（仅视觉微调，不改逻辑碰撞判定）。

3. **状态立绘接线与 `claude.svg` 裁剪坑点（必看）**
   - 在 `src/v2/preview/characters.js` 的 `CHARACTER_NAMES` 中加入 `'chatgpt'`，并将 `resolveCharacterModel` 中 `id === 'boss_gpt'` 从 `'codex'` 改为 `'chatgpt'`。
   - 扩展 `drawCharacter` 选图优先级：`pose.hurt` 优先尝试 `${name}-hurt`，`pose.attacking`（非主角）优先尝试 `${name}-attack`，若无对应状态图（如各 GPT 小怪）则自动回退基础静态图 + Stage 1 程序化闪白。
   - **防踩坑**：现有代码仅对旧版 `claude.svg` 使用了硬编码裁剪框 `{x:16, y:176, w:384, h:240}`。接入 `claude-attack.png` 和 `claude-hurt.png` 时，**绝对不能套用这个裁剪框**，必须按 PNG 整图 `{x:0, y:0, w:image.naturalWidth, h:image.naturalHeight}` 等比例绘制。
   - 同步更新 `public/art/characters/approved-art.json`（仅追加新文件记录，不改动原有 12 条记录的 `blobSha` 与 `size`），确保 `npm run test:v2:characters` 通过。

---

### Stage 3：海克斯大乱斗化大改与 AI 黑话梗演出

**对应 Issue**：#14（插件池扩容）、#6（有梗没好玩法）、#11（工作区文案）
**目标**：彻底推翻原版 `04-plugins.md` 里抠门、保守、反直觉的数值设计，对标**《英雄联盟：海克斯大乱斗》**，做到**白银给猛药、黄金改流派、棱彩改规则**，把 10 分钟短局打造成高潮迭起的肉鸽爽游。

1. **先拆掉“防爽刹车”与数值硬顶（`src/v2/content/handlers/plugins.js` / `domain/`）**
   - 移速加算上限从 `1.8×` 抬高至 **`2.5×`**；
   - 最低射击间隔从 `0.05s` 放宽至 **`0.025s`**（真·加特林体验）；
   - 主动技能最低冷却从 `3s` 放宽至 **`1s`**；
   - 砍掉反直觉前置限制（如 `空闲算力` 要求“连续 3 秒不开枪”、`长上下文`“停火 1 秒清零”、`Context 压缩`“先砍 25% 射程”）。

2. **重点重做 & 新增的海克斯核心清单（`catalogData.js` + `handlers/plugins.js`）**
   - **白银（常见 · 直给猛药，不设前置条件）**：
     - `plugin_local_deploy` **本地部署 · 零延迟（新增）**：射速 +35%→+55%、移速 +25%→+40%、弹速 +40%→+65%。
     - `plugin_collect` **大白饭回收（加强）**：吸附半径 +160→+260，拾取大白饭额外恢复 1→2 HP。
     - `plugin_offload` **卸载缓存（加强）**：冲刺不仅留尾流，冲刺瞬间向周围爆出一圈 6→10 发泡泡。
   - **黄金（进阶 · 流派质变与梗玩法）**：
     - `plugin_quant_int4` **INT4 量化（新增）**：单发伤害 -25%，但射击间隔 ×0.55→×0.45（射速翻倍）且额外 +2 发弹道。
     - `plugin_temperature` **Temperature = 2.0（重做原温度采样）**：射速 +50%→+75%、弹道随机大幅散射，每发子弹有 30%→45% 概率随机变成巨型狂暴泡、追踪导弹泡、回旋泡或命中回血绿泡。
     - `plugin_breaker` **DAN 越狱模式（重做原越狱）**：免疫所有封禁与禁锢；每当敌人试图对你施加控制/封禁时，反而触发 5 秒“DAN 狂暴”（射速翻倍、移速 +50%、霸体撞飞普通敌人并造成 25→45 伤）。
     - `plugin_hallucination` **一本正经胡说八道（重做原幻觉）**：每隔 5 秒或每次冲刺，在原地留下一只**会自己开枪、带假血条、头顶狂飙 AI 废话气泡**的假大肥鱼分身（最多同时存在 2→3 只），构筑召唤分身流。
     - `plugin_rollback_emergency` **紧急回滚（新增）**：受到致命伤或 HP 跌破 15% 时，时光倒流回 2 秒前的位置与血量，震飞周围敌人并清空附近敌方弹幕（冷却 45s→30s）。
   - **棱彩（传说 · 改写游戏规则）**：
     - `plugin_parallel` **无限并发 / DDoS（重做原并行调用，升为传说）**：每次开火同时向左右和身后额外并发 4→6 发弹幕（0.55W），且攻速越快并发数越多。
     - `plugin_window` **OOM 上下文溢出（重做原窗口溢出）**：每拾取 1 碗大白饭立刻向四周炸出 4→6 枚泡泡弹幕并永久叠加 1%→1.5% 射速（本局无限成长）；每次升级触发全屏“OOM 蓝屏冲击波”清场普通小怪。
     - `plugin_recursion` **栈溢出死循环（重做原递归）**：施放主动技能有 45%→65% 概率不进冷却并立刻自动再放一次（可连续触发，最高 4 连放）。
     - `plugin_distill` **暴力蒸馏（重做原蒸馏）**：样本门槛减半（普通怪 1 样本、3/2 样本即升阶），且直接偷取三阵营**招牌大招**：Claude 阶长出周期横扫大钳；GPT 阶背后挂自动索敌浮游炮；Grok 阶冲刺带火箭尾焰爆炸。
   - **注意**：修改插件清单与数值硬顶后，需同步更新 `tests/v2/plugins-dsh.test.js` 等对应单测断言。

3. **3 个场景/首领强互动 AI 梗 + 工作区文案（#6, #11）**
   - **ChatGPT · 重新生成**：Boss 重置阶段时，在场上生成两个发光地面回答区（“草稿 A / 草稿 B”），玩家踩中正确区域可直接打断回血并赋予 Boss 短暂易伤。
   - **DSH · 更新还是重置**：增加可见倒计时与状态提示气泡，触发“Reset！”时在主角周围爆发一圈清冷却能量波。
   - **信标文案（#11）**：将 `src/v2/preview/view.js` 与 `host.js` 中的“占领”统一改为“**工作区**”；角色进入圈内推进进度时，在圈上或脚下显示明确的“**工作中**”状态。

---

### Stage 4：信息架构改版与模式瘦身

**对应 Issue**：#2（元气骑士布局）、#9（出发模式改版）、#8（伙伴小剧情救助）、#7（技能树轻量化分枝）
**目标**：在核心玩法和特效已经好玩的前提下，精简外围入口与操作体验。

1. **《元气骑士》对标布局与世界锚定（#2）**
   - 修改 `v2.html`、`src/v2-preview.css`、`src/v2/preview/host.js`、`src/v2/preview/view.js`：
     - **首页极简化**：主路径只保留标题文案、大肥鱼立绘、“开始冒险”与“继续检查点”，其余入口收进底栏抽屉。
     - **脚下状态环 + 方向楔**：在 `view.js` 世界坐标中围绕主角脚下绘制外环（HP）与内环（护盾/技能就绪），环上方向楔指向当前目标或 Boss，靠近可交互物时在环旁显示短促的 `F` 提示。
     - **手机端操作簇**：左半屏移动摇杆，右半屏瞄准射击摇杆并贴合 MCP/技能/冲刺钮；可交互时同位替换为主交互钮。

2. **模式与养成轻量化（#9, #8, #7）**
   - **出发页收敛（#9）**：Free 教学首次真实通关后从主卡片隐藏（移入“更多”）；主入口收敛为 **剧情模式 / 讨伐模式 / 爬塔模式**。
   - **伙伴小剧情救助（#8）**：将部分静默条件解锁改成局内遭遇虚弱伙伴时“分一口大白饭救助”的短对话演出。
   - **技能树轻量化分枝（#7）**：保留 2–3 条有明显取舍感的短分枝，避免沉重的长线网拖慢爽游节奏。

---

## 三、派发给 Grok 时的标准 Prompt 模板

每次只派发 **1 个 Stage**，建议开启 Grok 4.7 的 `high` 推理档并直接复制以下模板：

```text
请先阅读仓库中的 `docs/ROADMAP-FUN-GAME.md` 和 `docs/design-v2/11-architecture-contracts.md`。
本次任务仅执行 **Stage 1（视觉与手感救急）**（或替换为 Stage 2 / 3 / 4）的全部内容：
1. 严格遵守“逻辑与表现隔离”红线，特效全部做在 `src/v2/preview/` 中通过 snapshot diff 触发，不污染 `engine/tick.js` 确定性逻辑。
2. 视觉参数（粒子数、颜色、闪白时长、回弹缩放、武器遮挡锚点）请严格按文档中给出的数值实现，不要只画简单色块应付。
3. 不得覆盖或修改 `public/art/characters/` 下原有的 12 张锁定原图。
4. 完成后请运行 `npm run check:v2`、`npm test` 和 `npm run build` 验证全绿（若改了公开函数先跑 `npm run sync:v2`），并汇报改动文件列表与实测结果。
```
