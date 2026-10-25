# V2架构骨架

本目录只定义架构，**不能作为可玩版本启动**。共69个JS模块、296个具名函数、95项内容处理器绑定，函数体统一抛TODO错误；旧版入口未接入此目录。

- [架构与调用顺序](../../docs/design-v2/11-architecture-contracts.md)
- [完整函数目录](../../docs/design-v2/12-function-catalog.md)
- [数据与端口类型](contracts.d.ts)
- [机器可读函数/依赖/内容绑定](architecture-manifest.json)

实现时先读玩法规格00–09，再按06分步填写。保持函数签名/状态权限/调用顺序；新增公共接口需要同步manifest与函数目录。核心状态与碰撞归Session/Reducer，Phaser只表现；世界/UI独立固定步，所有I/O在tick之外执行。

同目录的模块import只表示允许依赖，没有顶层初始化/自动运行。TODO错误是明确的未实现标记，不要改成假成功、空存档或空战斗结果。
