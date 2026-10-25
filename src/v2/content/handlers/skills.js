// @ts-check
import { planShieldGrant } from '../../domain/shields.js';
import { createEmptyPlan, createStateChange } from '../../domain/plans.js';
import { resolveBodyDestination } from '../../domain/motionSolver.js';
import { normalizeVector, distanceSquared } from '../../domain/geometry.js';
/**
 * skills逐项占位处理器；实际参数仍以玩法规格为准。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../../domain/plans.js';

/**
 * skill_disconnect / 断开连接：清除自身禁锢/减速，沿瞄准方向推开 180 范围普通敌人 120 距离；不解除技能封禁，也不能在被封禁时施放；12；初始
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/motionSolver.js#resolveBodyDestination
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planSkillDisconnect(context) {
  const state = context.state, player = state.world.entities[state.player.entityId];
  const removed = player.statusIds.filter(id => ['root', 'slow'].includes(state.world.statuses[id]?.kind));
  const changes = /** @type {import('../../contracts.d.ts').StateChange[]} */ ([]);
  for (const id of removed) changes.push(createStateChange('world', id, 'removeStatus', {}));
  if (removed.some(id => state.world.statuses[id]?.kind === 'root')) changes.push(createStateChange('player', player.id, 'setControlImmune', { remaining: Math.max(2, state.player.controlImmuneRemaining) }));
  changes.push(createStateChange('entity', player.id, 'setStatusIds', { ids: player.statusIds.filter(id => !removed.includes(id)) }));
  for (const enemy of Object.values(state.world.entities).filter(entity => entity.kind === 'enemy' && !entity.dead && !state.bosses.some(boss => boss.entityId === entity.id) && distanceSquared(entity.position, player.position) <= 180 ** 2)) {
    let direction = normalizeVector({ x: enemy.position.x - player.position.x, y: enemy.position.y - player.position.y });
    if (!direction.x && !direction.y) direction = context.aim;
    const position = resolveBodyDestination(context, enemy, { x: enemy.position.x + direction.x * 120, y: enemy.position.y + direction.y * 120 });
    changes.push(createStateChange('entity', enemy.id, 'setEntityKinematics', { position, previousPosition: position, velocity: enemy.velocity, facingRadians: enemy.facingRadians }));
  }
  return { ...createEmptyPlan(), changes };
}

/**
 * skill_cache / 缓存护盾：获得 25 护盾持续 5 秒；护盾不叠加，刷新取较大剩余值；16；6 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @implementationScope core-preview
 * @calls domain/shields.js#planShieldGrant
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planSkillCache(context) {
  return planShieldGrant(context, context.state.player.entityId, 'skill_cache', 25, 5);
}

/**
 * skill_batch / 仿佛看到原子弹爆炸（批量处理）：瞄准方向 400 内、半径 130 的区域在 0.6 秒后爆发 65 伤；有清晰预警；12；8 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planSkillBatch(context) {
  throw new Error('TODO V2: content/handlers/skills.js#planSkillBatch');
}

/**
 * skill_redirect / 重定向：1.2 秒内将触及半径 90 的可反射敌弹转为朝瞄准方向的己方弹，每枚 15 伤，最多 12 枚；火箭/光束不可反射；15；10 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planSkillRedirect(context) {
  throw new Error('TODO V2: content/handlers/skills.js#planSkillRedirect');
}

/**
 * skill_sandbox / 沙箱：瞄准位置放置半径 160、持续 4 秒的区域，普通敌人移速 -50%，Boss -20%；14；8 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planSkillSandbox(context) {
  throw new Error('TODO V2: content/handlers/skills.js#planSkillSandbox');
}

/**
 * skill_fork / 分叉进程：生成持续 4 秒的鱼形诱饵，吸引 450 内非 Boss 普通敌人；结束在 100 范围爆发 25 伤；18；10 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planSkillFork(context) {
  throw new Error('TODO V2: content/handlers/skills.js#planSkillFork');
}

/**
 * skill_rollback / 回滚：回到 2 秒前的合法位置，恢复这 2 秒实际失去生命的 40%，上限 15；不恢复资源/护盾/冷却，不复活；目标不合法则就近找点；20；12 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planSkillRollback(context) {
  throw new Error('TODO V2: content/handlers/skills.js#planSkillRollback');
}

/**
 * skill_overclock / 用户彻底怒了（超频）：4 秒内基础射击间隔 ×0.65、移速 +10%；不影响插件/伙伴内置冷却；18；12 零件
 * 调用阶段：content-handler；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：仅处理此内容自身的合法事件；按context状态返回变化/效果请求，不直接伤害、存储或再次派发钩子。
 * @calls domain/plans.js#createEmptyPlan
 * @param {import('../../contracts.d.ts').AttackContext} context
 * @returns {import('../../contracts.d.ts').EffectPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planSkillOverclock(context) {
  throw new Error('TODO V2: content/handlers/skills.js#planSkillOverclock');
}
