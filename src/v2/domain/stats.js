// @ts-check
/**
 * 基础/来源修饰的分离计算，派生伤害只应用一次。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../content/catalog.js';

/**
 * 由出发树、插件、LoRA、蒸馏与临时状态推导玩家有效属性，不写回基础值。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/stats.js#resolveStatModifier
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').BaseStats}
 */
export function derivePlayerStats(state, catalog) {
  // Start tree bonuses are materialized once in baseStats; handlers own source modifiers.
  // Expired temporary modifiers are ignored even before the cleanup phase removes them.
  const modifiers = [...state.player.modifiers, ...state.lora.modifiers].filter(modifier => modifier.expiresAt === null || modifier.expiresAt > state.tick);
  const base = state.player.baseStats;
  if (state.plugins.some(plugin => plugin.id === 'plugin_distill')) {
    modifiers.push({ id: 'distill:armor', sourceId: 'plugin_distill', stat: 'armor', operation: 'add', value: state.distill.claude.stage * 6, expiresAt: null });
    modifiers.push({ id: 'distill:speed', sourceId: 'plugin_distill', stat: 'moveSpeed', operation: 'add', value: base.moveSpeed * state.distill.grok.stage * 0.03, expiresAt: null });
  }
  return {
    maxHp: resolveStatModifier(base.maxHp, modifiers.filter(m => m.stat === 'maxHp'), 1, Number.MAX_SAFE_INTEGER),
    moveSpeed: resolveStatModifier(base.moveSpeed, modifiers.filter(m => m.stat === 'moveSpeed'), 1, base.moveSpeed * 1.8),
    armor: resolveStatModifier(base.armor, modifiers.filter(m => m.stat === 'armor'), 0, 60),
    damageMultiplier: resolveStatModifier(base.damageMultiplier, modifiers.filter(m => m.stat === 'damageMultiplier'), 0, Number.MAX_SAFE_INTEGER),
    critChance: resolveStatModifier(base.critChance, modifiers.filter(m => m.stat === 'critChance'), 0, 0.75),
    critMultiplier: resolveStatModifier(base.critMultiplier, modifiers.filter(m => m.stat === 'critMultiplier'), 1, Number.MAX_SAFE_INTEGER),
  };
}

/**
 * 合并原始品质/28秒临时品质/武器修饰，输出攻击参数。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls content/catalog.js#findContentDefinition
 * @calls domain/stats.js#derivePlayerStats
 * @calls domain/stats.js#resolveStatModifier
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {import('../contracts.d.ts').WeaponState} weapon
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').WeaponStats}
 */
export function deriveWeaponStats(state, weapon, catalog) {
  const found = dependency1.findContentDefinition(catalog, weapon.definitionId);
  if (!found.ok || found.value.kind !== 'weapon') throw new Error(`Unknown weapon: ${weapon.definitionId}`);
  const p = found.value.parameters;
  const required = ['damage', 'interval', 'projectileSpeed', 'projectileRadius', 'pellets', 'spreadRadians', 'range', 'maxHits'];
  if (required.some(key => typeof p[key] !== 'number' || !Number.isFinite(p[key]) || Number(p[key]) < 0) || Number(p.interval) === 0 || Number(p.pellets) < 1 || Number(p.maxHits) < 1 || !Number.isInteger(p.pellets) || !Number.isInteger(p.maxHits)) throw new Error('Invalid weapon parameters');
  const updated = weapon.updateExpiresAt !== null && weapon.updateExpiresAt > state.tick;
  const quality = updated && weapon.temporaryQuality !== null ? weapon.temporaryQuality : weapon.originalQuality;
  if (![0, 1, 2].includes(quality)) throw new Error('Invalid weapon quality');
  const qualityMultiplier = [1, 1.15, 1.3][quality];
  const modifiers = state.player.modifiers.filter(modifier => modifier.expiresAt === null || modifier.expiresAt > state.tick);
  const player = derivePlayerStats(state, catalog);
  const topUpdate = updated && weapon.originalQuality === 2 ? 1.2 : 1;
  const underfit = state.lora.underfitRemaining > 0 ? 0.8 : 1;
  const compress=state.plugins.find(plugin=>plugin.id==='plugin_compress');
  return { damage: (compress?compress.rank===1?1.3:1.45:1)*Number(p.damage) * qualityMultiplier * player.damageMultiplier * topUpdate * underfit,
    interval: resolveStatModifier(Number(p.interval), modifiers.filter(modifier => modifier.stat === 'weaponInterval'), 0.05, Number.MAX_SAFE_INTEGER),
    projectileSpeed: Number(p.projectileSpeed), projectileRadius: Number(p.projectileRadius), pellets: Number(p.pellets), spreadRadians: Number(p.spreadRadians), range: Number(p.range)*(compress?0.75:1), maxHits: Number(p.maxHits), damageMultiplierApplied: true,
  };
}

/**
 * 同组加算、指定组乘算、最终限幅；不重复处理品质或暴击。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {number} base
 * @param {readonly import('../contracts.d.ts').StatModifier[]} modifiers
 * @param {number} minimum
 * @param {number} maximum
 * @returns {number}
 */
export function resolveStatModifier(base, modifiers, minimum, maximum) {
  if (![base, minimum, maximum].every(Number.isFinite) || minimum > maximum || modifiers.some(modifier => !Number.isFinite(modifier.value) || !['add', 'multiply'].includes(modifier.operation))) throw new RangeError('Invalid stat modifier');
  const additive = modifiers.filter(modifier => modifier.operation === 'add').reduce((sum, modifier) => sum + modifier.value, 0);
  const multiplier = modifiers.filter(modifier => modifier.operation === 'multiply').reduce((product, modifier) => product * modifier.value, 1);
  const result = (base + additive) * multiplier;
  if (!Number.isFinite(result)) throw new RangeError('Stat calculation overflow');
  return Math.min(maximum, Math.max(minimum, result));
}
