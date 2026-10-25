// @ts-check
import { createEmptyPlan, createStateChange } from './plans.js';

/** Permanent tree runtime rules. All reads use the departure snapshot, never the live Profile. */

/** Validate a complete purchased-node snapshot, including the three DSH slot prerequisites.
 * @calls 无内部公开函数。
 * @param {readonly string[]} ids
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {boolean}
 */
export function isTreeSnapshotValid(ids, catalog) {
  return new Set(ids).size === ids.length && ids.every(id => {
    const p = catalog.definitions[id]?.parameters;
    return catalog.definitions[id]?.kind === 'tree' && Array.isArray(p?.prerequisites) && p.prerequisites.every(parent => typeof parent === 'string' && ids.includes(parent)) && (!p.baseSpendRequired || ids.filter(node => !node.startsWith('tree_dsh_')).reduce((sum, node) => sum + Number(catalog.definitions[node]?.parameters.cost ?? 0), 0) >= Number(p.baseSpendRequired));
  });
}

/** Materialize only initial HP, armor and movement. Weapon-only bonuses remain in weapon derivation.
 * @calls 无内部公开函数。
 * @param {readonly string[]} ids
 * @returns {import('../contracts.d.ts').BaseStats}
 */
export function createTreeBaseStats(ids) {
  return { maxHp: 100 + (ids.includes('tree_body_a') ? 10 : 0) + (ids.includes('tree_body_e') ? 10 : 0), moveSpeed: 220 * (ids.includes('tree_body_c') ? 1.05 : 1), armor: ids.includes('tree_body_b') ? 6 : 0, damageMultiplier: 1, critChance: 0.05, critMultiplier: 1.5 };
}

/** Fold one actual HP-damage result into once-per-run rescue flags and the idle-thread damage clock.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {number} hpDamage
 * @returns {{hpDamage:number; hp:number; invulnerable:number; runtime:Record<string,import('../contracts.d.ts').Json>; events:readonly string[]}}
 */
export function resolveTreeSurvival(state, hpDamage) {
  const player = state.world.entities[state.player.entityId], runtime = { ...player.runtime }, ids = state.start.treeNodeIds, events = /** @type {string[]} */([]);
  let hp = player.hp - hpDamage, invulnerable = 0.6;
  if (hpDamage <= 0) return { hpDamage, hp, invulnerable: state.player.invulnerableRemaining, runtime, events };
  runtime.lastHpDamageAt = state.tick;
  if (hp <= 0 && ids.includes('tree_body_f') && runtime.treeReviveUsed !== true) {
    hp = 1; hpDamage = player.hp - 1; invulnerable = 2; runtime.treeReviveUsed = true; events.push('tree_body_f');
  }
  if (hp > 0 && hp < player.maxHp * 0.25 && ids.includes('tree_body_d') && runtime.treeMealUsed !== true) {
    hp = Math.min(player.maxHp, hp + 12); runtime.treeMealUsed = true; events.push('tree_body_d');
  }
  return { hpDamage, hp: Math.max(0, hp), invulnerable, runtime, events };
}

/** Produce switch-triggered next-shot and movement bonuses with independent saved internal cooldowns.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planTreeWeaponSwitch(context) {
  const state = context.state, player = state.world.entities[state.player.entityId], runtime = { ...player.runtime }, ids = state.start.treeNodeIds;
  let modifiers = [...state.player.modifiers], changed = false;
  if (ids.includes('tree_mcp_b') && Number(runtime.treeSwitchReadyAt ?? 0) <= state.tick) { runtime.treeSwitchShot = true; runtime.treeSwitchReadyAt = state.tick + 300; changed = true; }
  if (ids.includes('tree_mcp_f') && Number(runtime.treeHotSwapReadyAt ?? 0) <= state.tick) {
    runtime.treeHotSwapReadyAt = state.tick + 480; changed = true;
    modifiers = [...modifiers.filter(item => item.id !== 'tree:hotSwap'), { id: 'tree:hotSwap', sourceId: 'tree_mcp_f', stat: 'moveSpeed', operation: 'add', value: state.player.baseStats.moveSpeed * 0.3, expiresAt: state.tick + 60 }];
  }
  return changed ? { ...createEmptyPlan(), changes: [createStateChange('entity', player.id, 'setEntityRuntime', { runtime }), createStateChange('player', player.id, 'setPlayerModifiers', { modifiers: modifiers.map(item => ({ ...item })) })] } : createEmptyPlan();
}
