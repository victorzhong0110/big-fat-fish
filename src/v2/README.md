# V2 开发源码

当前113个JS模块、406个公开函数：366个真实实现、40个明确TODO。Free练习、正式短途1–15、三海域远征与通关15后开放的API调用可操作，完整游戏仍未完成。

运行`npm run dev`后打开`/v2.html`。构建同时生成旧index与新v2，旧玩法入口独立保留。世界/UI共用`engine/tick`，Session唯一持有状态；previewTick仅兼容委托，宿主仍是preview/host。通用application/bootstrap及剩余适配器不伪装为已完成。

- [实际范围、远征/API规则、验收和后续任务](../../docs/design-v2/13-development-status.md)
- [架构与调用规则](../../docs/design-v2/11-architecture-contracts.md)
- [逐函数签名、状态权限、功能与上下游](../../docs/design-v2/12-function-catalog.md)
- [数据契约](contracts.d.ts) · [机器可读架构](architecture-manifest.json)

```bash
npm ci
npm run check:v2
npm test -- --maxWorkers=1 --testTimeout=30000
npm run build
V2_CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:v2:api
V2_CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:v2:expedition
```

六MCP、八技能、六伙伴、三十局内插件、十DSH与三阵营首领已有真实消费者；小窝支持27树节点/6设施/3DSH槽。正式Profile通过CAS事务保存发现、里程碑、检查点和一次结算；Free使用隔离调试槽。社区SDK1.0–1.2声明式MCP仅开放Free，示例见public/mods。

API持续刷怪、按出生分钟增强，每5分钟一位阶段首领；首领死亡继续，安全检查点长按F或交互3秒返回。更新/重置每10秒开奖、整个窗口5分钟，极小概率续期提示“Reset！”并在正式冒险解锁“这是哪个‘重置’？”。最终音源、远征长局平衡和更多社区接口仍待完成。

远征三海域按seed预览路线，信标/封锁任选二后挑战区域首领；前两位开放可往返通道和独立休整，第三位结束本局。旧海域冻结并归档，检查点保留所有地区；护送和40分钟以上节奏/性能仍待验收。
