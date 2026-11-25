// @ts-check
import { planMeleeEnemy } from '../../domain/meleeAi.js';
/**
 * enemies逐项占位处理器；实际参数仍以玩法规格为准。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import {planGptPet} from '../../domain/gptPets.js';
import * as dependency1 from '../../domain/plans.js';

/**
 * enemy_gpt_codex / Codex · 调度小工人：40 / 105 / 弹体8；停下举工具0.7秒后朝锁定方向发单枚工作泡，弹速200、冷却3秒；射击时不能移动，可趁停顿接近；8
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/gptPets.js#planGptPet
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyGptCodex(context, event) {
  return planGptPet(context,'codex');
}

/**
 * enemy_gpt_dewey / Dewey · 支援水滴：32 / 90 / 接触6；每5秒为220内一个受伤友军恢复8生命，预先连线1秒；不治疗自己、不跨阵营治疗，打断/击败即可中止；8
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/gptPets.js#planGptPet
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyGptDewey(context, event) {
  return planGptPet(context,'dewey');
}

/**
 * enemy_gpt_fireball / Fireball · 区域封路：36 / 100 / 接触7；朝玩家当前位置投一团火，落点半径70预警1秒后形成3秒火区，每秒6伤；冷却5秒，可走出区域，不贴身自爆；8
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/gptPets.js#planGptPet
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyGptFireball(context, event) {
  return planGptPet(context,'fireball');
}

/**
 * enemy_gpt_hoots / Hoots · 精准瞄准：30 / 75 / 弹体14；350–650距离瞄准线预警1.1秒，锁定后直线发弹、弹速400，冷却4秒；横移或利用礁石遮挡；8
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/gptPets.js#planGptPet
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyGptHoots(context, event) {
  return planGptPet(context,'hoots');
}

/**
 * enemy_gpt_rocky / Rocky · 护队小石头：65 / 65 / 接触10；正面120°有可击破20耐久护盾，破盾后不再生；转身慢，背部可直接命中本体；数值显著低于Claude蟹；8
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/gptPets.js#planGptPet
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyGptRocky(context, event) {
  return planGptPet(context,'rocky');
}

/**
 * enemy_gpt_seedy / Seedy · 地形干扰：34 / 70 / 接触6；500内放半径65的藤圈，预警1秒、存在4秒，圈内减速25%而非禁锢；每6秒一次，最多2圈，可打掉中心嫩芽（10生命，无奖励）；8
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/gptPets.js#planGptPet
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyGptSeedy(context, event) {
  return planGptPet(context,'seedy');
}

/**
 * enemy_gpt_stacky / Stacky · 叠层输出：48 / 85 / 弹体7；初始三层，每损失16生命掉一层；每4秒发当前层数枚扇形弹，预警0.8秒；越受伤输出越少，掉层不变成新敌人、不重复结算；8
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/gptPets.js#planGptPet
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyGptStacky(context, event) {
  return planGptPet(context,'stacky');
}

/**
 * enemy_claude_guard / Claude · 棕蟹：180 / 80 / 接触24、重钳32；基础护甲0，缓慢贴近；Haiku无壳，其他模型外壳/破壳/弱点完整按08；双钳抬起0.9秒后前方70范围重击，冷却4秒，挥击后硬直0.8秒；接触与挥击同帧只取较高一次伤害；24
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview
 * @calls domain/meleeAi.js#planMeleeEnemy
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyClaudeGuard(context, event) {
  return planMeleeEnemy(context, true);
}

/**
 * enemy_grok_bot / Grok · 群体Bot：14 / 125 / 接触5；只追赶和近身接触攻击；08指定低矮障碍可穿，高墙/锁门不可穿；从多个合法入口分批涌入，用数量堵住路线，不跳跃、不突进、不远射、不投火箭；4
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview
 * @calls domain/meleeAi.js#planMeleeEnemy
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyGrokBot(context, event) {
  return planMeleeEnemy(context, false);
}

/** Blue screen elite guards a high-value cache with area damage.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/gptPets.js#planGptPet
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyGptBsod(context, event) {
  return planGptPet(context,'fireball');
}

/** Null Signal elite guards a high-value cache with movement disruption.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/gptPets.js#planGptPet
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').DomainEvent} event
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planEnemyGptNullSignal(context, event) {
  return planGptPet(context,'seedy');
}
