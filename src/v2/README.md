# V2 开发源码

当前81个JS模块、311个公开函数：115个有实现，196个显式TODO。**独立战斗试作可启动，完整冒险仍未完成。** `implementationScope: core-preview`标记当前范围有限的实现。

运行`npm run dev`后打开`/v2.html`。构建同时生成旧版index与新试作v2，不替换旧入口。键鼠WASD/瞄准射击，Q换MCP，E技能，Space冲刺，F检查点，Esc暂停；手机双摇杆与按钮。

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

当前世界入口是engine/previewTick，宿主是preview/host，Session唯一持有单局状态。正式bootstrap/application/engine/tick仍保持TODO；full模式明确拒绝。未实现内容不得靠空返回蒙混可用性：registry的95项设计绑定与6项已开放能力分开校验。武器/技能/树等定义存在不代表运行效果已实现。

试作浏览器存档使用独立localStorage调试检查点；不包含完整Profile经济或CAS结算。大白饭可拾取，暂未转换等级/插件。最终像素资源和指定音乐待接入。
