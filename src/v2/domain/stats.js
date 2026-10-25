// @ts-check
/**
 * 基础/来源修饰的分离计算，派生伤害只应用一次。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls listed below are contracts, not implemented execution.
 */
import * as dependency1 from '../content/catalog.js';

/**
 * 由出发树、插件、LoRA、蒸馏与临时状态推导玩家有效属性，不写回基础值。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/stats.js#resolveStatModifier
 * @calls content/catalog.js#findContentDefinition
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').BaseStats}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function derivePlayerStats(state, catalog) {
  throw new Error('TODO V2: domain/stats.js#derivePlayerStats');
}

/**
 * 合并原始品质/28秒临时品质/武器修饰，输出攻击参数。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/stats.js#resolveStatModifier
 * @calls content/catalog.js#findContentDefinition
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {import('../contracts.d.ts').WeaponState} weapon
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').WeaponStats}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function deriveWeaponStats(state, weapon, catalog) {
  throw new Error('TODO V2: domain/stats.js#deriveWeaponStats');
}

/**
 * 同组加算、指定组乘算、最终限幅；不重复处理品质或暴击。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部函数；仅执行本函数契约（尚未实现）。
 * @param {number} base
 * @param {readonly import('../contracts.d.ts').StatModifier[]} modifiers
 * @param {number} minimum
 * @param {number} maximum
 * @returns {number}
 * @throws {Error} TODO placeholder until Grok implements this contract.
 */
export function resolveStatModifier(base, modifiers, minimum, maximum) {
  throw new Error('TODO V2: domain/stats.js#resolveStatModifier');
}
