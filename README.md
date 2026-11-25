# 大肥鱼历险记 · Big Fat Fish

将 AI 模型拟人化的 2D 肉鸽生存射击游戏：玩家操控 **DeepSeek（大肥鱼）**，在深海里迎战 **ChatGPT**、**Claude** 与 **Grok** 阵营的敌人与首领。

## 运行与验证

```bash
npm install
npm run dev        # 启动开发服务器，打开 /v2.html
npm run check:v2   # TypeScript 类型检查 + V2 架构依赖检查
npm test           # 运行 V2 单元测试（tests/v2）
npm run build      # 构建产出到 dist/
```

## 文档导航

* [AI 协作总纲（必读红线）](AGENT.md)
* [品牌与美术界面指南（BRAND_GUIDE）](docs/BRAND_GUIDE.md)
* [后续开发规划与 AI 协作指南](docs/ROADMAP-FUN-GAME.md)
* [设计总览与统一术语](docs/design-v2/00-README.md)
* [实际开发进度](docs/design-v2/13-development-status.md)
* [架构契约与调用规则](docs/design-v2/11-architecture-contracts.md)
* [函数目录](docs/design-v2/12-function-catalog.md)
* [社区模组与 SDK 规范](docs/design-v2/14-community-mods.md)

## 社区模组

V2 出发页下方支持本地 JSON 模组安装、启停和移除，已开放 Free 练习的 MCP 参数/内容名称，以及 SDK 1.0–1.3 独立新 MCP 与技能配方。示例包见 `public/mods/`。

## 版权边界与许可

本项目为社区梗致敬与二创作品，不代表或暗示任何官方授权、赞助或关联。采用 Apache-2.0 协议开源（见 [`LICENSE`](LICENSE)）。
