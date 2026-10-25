# V2 开发源码

当前89个JS模块、333个公开函数：197个有实现，136个显式TODO。**Free练习与Pro1 Claude短途纵切可操作，完整游戏仍未完成。** `implementationScope: core-preview`标记当前范围有限的实现。

运行`npm run dev`后打开`/v2.html`。构建同时生成旧版index与新试作v2，不替换旧入口。键鼠WASD/瞄准射击，Q换MCP，E技能，Space冲刺，F交互，R检查点，Esc暂停；手机双摇杆与按钮。

- [实际完成范围、运行/验收和后续任务](../../docs/design-v2/13-development-status.md)
- [架构与调用规则](../../docs/design-v2/11-architecture-contracts.md)
- [逐函数签名/状态/功能/上下游](../../docs/design-v2/12-function-catalog.md)
- [数据类型](contracts.d.ts) · [机器可读架构](architecture-manifest.json)

```bash
npm ci
npm run sync:v2
npm run check:v2
npm run test:v2
npm test
npm run build
V2_CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:v2:browser
```

当前世界入口是engine/previewTick，宿主是preview/host，Session唯一持有单局状态。正式bootstrap/application/engine/tick仍保持TODO；full模式明确拒绝。未实现内容不得靠空返回蒙混可用性：registry的95项设计绑定与20项已开放能力分开校验。武器/技能/树等定义存在不代表运行效果已实现。

Free使用独立localStorage调试槽；Pro1使用正式IndexedDB Profile，已接通结算与原子删档。首批6插件可选，蒸馏按阵营积累。小窝已接通27节点购买/全退、设施、永久解锁、实际树效果和4种DSH配装；伙伴效果及全内容仍待开发。最终像素资源和指定音乐待接入。

社区SDK1.0–1.2：菜单导入参数包或独立新MCP配方，在练习出发列表选择；示例见public/mods。小窝消费由application/nest编排，全部经StoragePort事务；活动冒险期间禁止更改。

六把MCP均有真实行为，Pro1四处新增发现点；F探索拾取/满槽替换，原实例留地并保存品质/CD/临时更新。`npm run test:v2:equipment`验证实际键鼠与触控流程。技能地面换装/完整8技能与伙伴仍待接通。
