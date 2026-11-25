# 大肥鱼历险记（Big Fat Fish）— AI 协作总纲（必读）

> **⚠️ 唯一锁定主题（不可违背）**
> **从现在开始，本游戏的主题 100% 锁死为「AI 圈黑话梗轻松爽游」。**
> **严禁**再引入任何文艺航海、深夜食堂、月潮电台、修船厂、码头值班等跑偏世界观与文案设定。

---

## 1. 必读文档顺序

1. [界面与美术改版开发规格（UI-ART-OVERHAUL-SPEC.md）](docs/UI-ART-OVERHAUL-SPEC.md) — **当前界面、玩法联动与美术改版的完整执行清单**
2. [品牌与美术/界面规范（BRAND_GUIDE.md）](docs/BRAND_GUIDE.md) — **所有涉及界面、美术、素材、文案的改动必须严格遵守**
3. [V2 开发规划与协作指南（ROADMAP-FUN-GAME.md）](docs/ROADMAP-FUN-GAME.md) — 玩法与阶段目标
4. [架构契约（11-architecture-contracts.md）](docs/design-v2/11-architecture-contracts.md) — 分层与类型约束

---

## 2. 主题与世界观红线

- **主角**：DeepSeek（大肥鱼），举着像素泡泡炮在深海里快乐整活。
- **对手**：ChatGPT（白龙少女 Boss + Codex Pets）、Claude（陶土蟹 Boss + 封禁机制）、Grok（绿机器人 Boss + 火箭/Bot 群）。
- **核心调性**：轻松、搞笑、快节奏爽游（10 分钟短局 + 海克斯大乱斗式质变强化）。
- **不强行赛博/服务器化**：大白饭（代指 Token）就是一碗可爱的白米饭，珊瑚礁就是珊瑚礁；可以有轻度 AI 梗道具（如开源盲盒、蓝屏怪、算力基站），但**不要把所有海底元素都硬改成冰冷的电脑机房或服务器机柜**。

---

## 3. 美术与前端设计红线

- **唯一画风**：统一为 **Q 版粗黑边像素风**（向 `public/art/characters/` 现有立绘对齐）。
- **严禁画风混搭**：禁止引入高清二次元插画、写实照片海面纹理或立体拟物道具。
- **素材来源**：地形地砖、障碍物、箱子、UI 边框、小图标优先从 **CC0 / 开源像素素材库**（如 Kenney、OpenGameArt、itch.io CC0 像素包）挑选同画风素材，不必全部重新生成。
- **HUD 不遮挡**：局内禁止在左下角或操作区叠加常驻大弹窗；AI 梗台词只用轻量短气泡（头顶或顶部一闪而过）。

---

## 4. 工程与验证铁律

- **逻辑与表现隔离**：`src/v2/domain/` 和 `src/v2/engine/` 禁止碰 DOM、Canvas 或非确定性 `Math.random()`；视觉表现全部放在 `src/v2/preview/`。
- **已锁定原图保护**：禁止覆盖 `public/art/characters/approved-art.json` 中已锁定的原图文件。
- **交付前必跑全绿**：
  ```bash
  npm run check:v2
  npm test
  npm run build
  ```
