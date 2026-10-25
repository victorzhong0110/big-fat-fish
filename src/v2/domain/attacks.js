// @ts-check
/**
 * 武器/技能/换装入口；不通过UI直接生成子弹。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../dispatch/skills.js';
import * as dependency2 from '../dispatch/weapons.js';
import * as dependency3 from './geometry.js';
import * as dependency4 from './stats.js';

/**
 * 按当前MCP冷却和瞄准产生一组攻击，保留各武器冷却。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/stats.js#deriveWeaponStats
 * @calls dispatch/weapons.js#dispatchWeaponsHandler
 * @param {import('../contracts.d.ts').AttackContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planWeaponFire(context) {
  throw new Error('TODO V2: domain/attacks.js#planWeaponFire');
}

/**
 * 检验控制/封禁/冷却后派发主动技能，成功才生成SkillCast事件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls dispatch/skills.js#dispatchSkillsHandler
 * @param {import('../contracts.d.ts').AttackContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planSkillCast(context) {
  throw new Error('TODO V2: domain/attacks.js#planSkillCast');
}

/**
 * 检验可用后冲刺/短保护，禁锢中不允许；不给装备技能事件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/geometry.js#normalizeVector
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planDash(context, command) {
  throw new Error('TODO V2: domain/attacks.js#planDash');
}

/**
 * 切枪/换技能/地面实例交换，遵守冷却继承，不重复产装备。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planLoadoutChange(context, command) {
  throw new Error('TODO V2: domain/attacks.js#planLoadoutChange');
}

/**
 * 将碰撞翻译为唯一伤害/控制/拾取请求，不直接递归结算。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').CollisionResult} collisions
 * @returns {import('../contracts.d.ts').SystemPlan}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function planCollisionEffects(context, collisions) {
  throw new Error('TODO V2: domain/attacks.js#planCollisionEffects');
}
