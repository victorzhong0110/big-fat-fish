// @ts-check
/**
 * plugins逐项占位处理器；实际参数仍以玩法规格为准。
 * Incremental implementation; unavailable functions remain explicit TODOs.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import{planCombatPluginEvent}from'../../domain/combatPlugins.js';
import { createWeaponProjectile } from '../../domain/projectiles.js';
import { createEntityState } from '../../domain/entities.js';
import { derivePlayerStats } from '../../domain/stats.js';
import * as dependency1 from '../../domain/distill.js';
import * as dependency2 from '../../domain/plans.js';

/**
 * plugin_parallel / 并行调用：每 0.4 秒最多一次基础射击增加左右各一枚 ±12° 投射物，各 0.40W→0.60W；新增弹为 secondary；两条分叉射流
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/projectiles.js#createWeaponProjectile
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginParallel(context, event) {
  const state=context.state,plugin=state.plugins.find(item=>item.id==='plugin_parallel'),weapon=state.player.loadout.weapons[state.player.loadout.activeWeaponIndex];
  if(!plugin||event.type!=='WeaponFired'||event.sourceId!==state.player.entityId)return dependency2.createEmptyPlan();
  const p=context.catalog.definitions[weapon.definitionId].parameters,player=state.world.entities[state.player.entityId];
  const quality=weapon.updateExpiresAt!==null&&weapon.updateExpiresAt>state.tick&&weapon.temporaryQuality!==null?weapon.temporaryQuality:weapon.originalQuality;
  const damage=Number(p.damage)*[1,1.15,1.3][quality]*.55*derivePlayerStats(state,context.catalog).damageMultiplier;
  const interval=Number(p.interval),extra=Math.max(0,Math.min(4,Math.floor((.32-interval)/.05))),count=(plugin.rank===1?4:6)+extra;
  const changes=[],stats={damage,interval,projectileSpeed:Number(p.projectileSpeed),projectileRadius:Number(p.projectileRadius),pellets:1,spreadRadians:0,range:Number(p.range),maxHits:Number(p.maxHits),damageMultiplierApplied:true};
  const aim=Math.atan2(state.input.aim.y,state.input.aim.x);
  for(let n=0;n<count;n++){const angle=aim+Math.PI/2+(count===1?Math.PI/2:n/(count-1)*Math.PI),id=`parallel:${event.id}:${n}`;changes.push(dependency2.createStateChange('world',id,'putEntity',createWeaponProjectile(context,weapon,stats,angle,id,event.id,'plugin_secondary',damage)));}
  return {...dependency2.createEmptyPlan(),changes};
}

/**
 * plugin_batch / 批量处理：每 8→6 次基础武器命中，在目标处爆炸，半径 85，伤害 18；内置冷却 0.5 秒；命中计数与范围圆环
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginBatch(context, event) {
  return planCombatPluginEvent(context,event,'plugin_batch');
}

/**
 * plugin_compress / 上下文压缩：基础武器射程 ×0.75，武器伤害 +30%→+45%；回旋转折距离同步 ×0.75；泡泡更浓、更短
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginCompress(context, event) {
  return dependency2.createEmptyPlan(); // Declarative weapon-stat consumer.
}

/**
 * plugin_cache / 缓存命中：连续命中同一目标 3 次后，基础武器对其额外伤害 +20%→+35%，持续 2 秒；切目标即清层，刷新不叠乘；目标上缓存方块
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginCache(context, event) {
  return planCombatPluginEvent(context,event,'plugin_cache');
}

/**
 * plugin_retry / 自动重试：主投射物到期且一次未命中时，向 450 范围最近敌人补一发 0.5W→0.8W 追踪泡；内置冷却 1.5 秒；失败泡泡回转；只重试一次
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginRetry(context, event) {
  return planCombatPluginEvent(context,event,'plugin_retry');
}

/**
 * plugin_temperature / 温度采样：每次基础射击 15%→25% 概率变成大泡，主弹伤害 ×1.6、半径 ×1.3；整组只掷一次；变大、有表情的泡泡
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginTemperature(context, event) {
  return planCombatPluginEvent(context,event,'plugin_temperature');
}

/**
 * plugin_collect / 大白饭回收：大白饭吸附半径 +80→+140；不会加经验倍率或资源收入；吸附范围与颗粒拖尾
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginCollect(context, event) {
  return dependency2.createEmptyPlan(); // Declarative consumer: movement, quota or damage resolver.
}

/**
 * plugin_cooldown / 空闲算力：连续 3 秒未射击时，装备主动技能剩余冷却每秒额外减少 0.5→0.8 秒；不影响其他计时；技能图标上空闲脉冲
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginCooldown(context, event) {
  return planCombatPluginEvent(context,event,'plugin_cooldown');
}

/**
 * plugin_offload / 卸载缓存：冲刺结束留下一片半径 75、持续 2 秒尾流，敌人每 0.5 秒受 5→8 伤；同敌每次尾流最多 4 跳；水下尾流
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginOffload(context, event) {
  return planCombatPluginEvent(context,event,'plugin_offload');
}

/**
 * plugin_keepalive / 心跳保活：每 12→9 秒获得 6 护盾，持续 4 秒；同名护盾只刷新，不能囤积；节拍护盾
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginKeepalive(context, event) {
  return planCombatPluginEvent(context,event,'plugin_keepalive');
}

/**
 * plugin_redirect / 请求转发：基础主投射物首次命中后可弹向 180→260 内另一敌人，伤害 0.5W，最多一次；原生穿透/回旋不再附加转发；折线连接
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginRedirect(context, event) {
  return planCombatPluginEvent(context,event,'plugin_redirect');
}

/**
 * plugin_backoff / 指数退避：实际失去生命后移速 +25%→+35%，持续 2 秒；内置冷却 4 秒，不叠层；受击后加速残影
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginBackoff(context, event) {
  return planCombatPluginEvent(context,event,'plugin_backoff');
}

/**
 * plugin_distill / 蒸馏：击败敌人积累样本并获取对应属性/派生技能；2级降低所需样本，详见 §6；样本吸收、三条来源进度
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview
 * @calls domain/distill.js#planDistillEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginDistill(context, event) {
  return dependency1.planDistillEvent(context, event);
}

/**
 * plugin_5h / 5h限制：每个敌人滚动 10 秒内最多造成 18→12 点防御前伤害，详见 §7；敌人额度条与“已限流”印章
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPlugin5h(context, event) {
  return dependency2.createEmptyPlan(); // Declarative consumer: movement, quota or damage resolver.
}

/**
 * plugin_failover / 故障转移：每 18→12 秒第一次被禁锢时立即解除，并在 180 范围造成 20 伤；不解除技能/伙伴封禁；封锁碎裂、插件亮起
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginFailover(context, event) {
  return planCombatPluginEvent(context,event,'plugin_failover');
}

/**
 * plugin_sandbox / 沙箱隔离：基础武器命中使敌人减速 25%，持续 1.2→2 秒；Boss 效果减半，同名只刷新；明确减速边框
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginSandbox(context, event) {
  return planCombatPluginEvent(context,event,'plugin_sandbox');
}

/**
 * plugin_hallucination / 哪来的电脑病毒（幻觉）：使用装备主动技能后生成 3→5 秒鱼形诱饵，吸引 350 内普通敌人；内置冷却 10 秒；半透明笨鱼替身
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginHallucination(context, event) {
  return planCombatPluginEvent(context,event,'plugin_hallucination');
}

/**
 * plugin_chain / 链式调用：每 6→4 次基础武器命中释放一次电链，依次打至多 3 个不同敌人，每次跳距 180，每目标 12 伤；内置冷却 1 秒；三段清晰电链
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginChain(context, event) {
  return planCombatPluginEvent(context,event,'plugin_chain');
}

/**
 * plugin_context / 长上下文：连续射击时每秒武器伤害 +3%，上限 +18%→+30%；停止射击 1 秒后清空；不是命中叠层；连续输出计量条
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginContext(context, event) {
  return planCombatPluginEvent(context,event,'plugin_context');
}

/**
 * plugin_hotplug / 热插拔：切 MCP 时发出半径 160 的冲击，造成 25→40 伤并推开普通敌人；内置冷却 6 秒；武器插拔环形波
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginHotplug(context, event) {
  return planCombatPluginEvent(context,event,'plugin_hotplug');
}

/**
 * plugin_guard / 安全对齐：单次防御前伤害达到 20 时获得额外 20→30% 减伤；逐次计算，不截断更小攻击；大伤害护甲闪光
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginGuard(context, event) {
  return dependency2.createEmptyPlan(); // Declarative consumer: movement, quota or damage resolver.
}

/**
 * plugin_prefill / 预填充：装备主动技能就绪且满 2 秒后，下一次施放效果强化：伤害/护盾/治疗 ×1.4→×1.65；无这些数值的技能持续时间 ×1.25→×1.4；技能就绪蓄满光圈
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginPrefill(context, event) {
  return planCombatPluginEvent(context,event,'plugin_prefill');
}

/**
 * plugin_toolchain / 工具链：使用装备主动技能后的下 3→5 次基础射击，各增加一枚 0.75W 的追踪泡；一次施放刷新次数，不累积；技能后跟随射击
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginToolchain(context, event) {
  return planCombatPluginEvent(context,event,'plugin_toolchain');
}

/**
 * plugin_mirror / 镜像部署：伙伴产生一次攻击/治疗/护盾后复制该效果的 40%→60%，延迟 0.3 秒，内置冷却 5 秒；诱饵伙伴改为延长 1→2 秒；小镜像伙伴闪现
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginMirror(context, event) {
  return planCombatPluginEvent(context,event,'plugin_mirror');
}

/**
 * plugin_recursion / 递归：施放批量处理/缓存护盾/沙箱时，0.8 秒后在原位置再执行一次 60%→85% 效果；其他技能复制其无控制的伤害/护盾/治疗部分，若都没有则延长持续 40%→60%；内置冷却 12 秒；第二层调用轮廓
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginRecursion(context, event) {
  return planCombatPluginEvent(context,event,'plugin_recursion');
}

/**
 * plugin_moe / 混合专家：每 4→3 次基础射击，按瞄准方向额外发射携带的另一把 MCP 的一组攻击，每枚伤害为它基础伤害的 45%；两把武器冷却独立，不消耗非当前武器冷却；两把 MCP 同时现形
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginMoe(context, event) {
  return planCombatPluginEvent(context,event,'plugin_moe');
}

/**
 * plugin_speculate / 推测执行：冲刺开始后 1 秒内下一次基础射击增加 3 发扇形 0.6W→0.9W 的穿透影泡，每发最多命中 2 个敌人；冲刺后展开巨大扇面
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginSpeculate(context, event) {
  return planCombatPluginEvent(context,event,'plugin_speculate');
}

/**
 * plugin_window / 窗口溢出：每拾取累计 120→90 大白饭，装备主动技能冷却减少 3 秒并向最近敌人发一枚 25 伤追踪泡；每 tick 最多 1 次，其余次数排队；经验条溢出发射
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginWindow(context, event) {
  return planCombatPluginEvent(context,event,'plugin_window');
}

/**
 * plugin_agent / Agent 协作：伙伴每次非镜像能力结束后，装备主动技能剩余冷却减少 1.5→2.5 秒；施放装备技能使伙伴剩余冷却减少 2 秒；双向各有 4 秒内置冷却；玩家与伙伴连线
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginAgent(context, event) {
  return planCombatPluginEvent(context,event,'plugin_agent');
}

/**
 * plugin_breaker / 越狱：每 20→14 秒第一次技能/伙伴封禁命中时立即解除该次封禁；3 秒内所有玩家伤害 +25%；不能破坏 Boss 重置条件；封禁印章反弹
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/combatPlugins.js#planCombatPluginEvent
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginBreaker(context, event) {
  return planCombatPluginEvent(context,event,'plugin_breaker');
}

/** plugin_local_deploy / 本地部署 · 零延迟：射速、移速、弹速直接加成，由属性派生消费。
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginLocalDeploy(context, event) {
  return dependency2.createEmptyPlan();
}

/** plugin_quant_int4 / INT4 量化：降单发、砍间隔、多两发，由属性派生消费。
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginQuantInt4(context, event) {
  return dependency2.createEmptyPlan();
}

/** plugin_rollback_emergency / 紧急回滚：致命伤或低血时由伤害结算倒回两秒前。
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planPluginRollbackEmergency(context, event) {
  return dependency2.createEmptyPlan();
}
