# V2 开发源码

当前72个JS模块、299个公开函数：60个已有实现，239个仍显式抛TODO。**启动入口、Session、地图和界面尚未接通，不能作为V2可玩版本启动。** 旧版入口独立保留。

- [实际实现范围与后续任务](../../docs/design-v2/13-development-status.md)
- [架构与调用顺序](../../docs/design-v2/11-architecture-contracts.md)
- [逐函数状态、功能与上下游](../../docs/design-v2/12-function-catalog.md)
- [数据与端口类型](contracts.d.ts)
- [机器可读依赖与实现状态](architecture-manifest.json)

```bash
npm ci
npm run check:v2   # strict/checkJs + AST接口/依赖/调用图/剩余TODO检查
npm run test:v2    # 110项V2规则及集成边界测试
npm test          # 共500项，含旧版390项
npm run build     # 目前只构建旧版入口
```

后续按06实现任务顺序推进。未实现的函数继续明确失败，不能用空return、空存档或空战斗伪装完成。原占位函数名保持，新增序列化/不变量函数与必要签名调整已经同步到manifest和目录。

`applySystemPlan`只应用changes；效果队列与outbox由编排器管理。`commitWorkingState(previous, working, catalog, outbox)`显式接收领域事件/持久化意图/诊断。`createLoraTrial`返回trial及nextRandom，二者必须一起提交。完整规则与剩余工作见13。
