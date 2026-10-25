// @ts-check
import { toJson } from './serialization.js';
import { createEmptyPlan, createStateChange } from './plans.js';
/**
 * 武器/技能/换装入口；不通过UI直接生成子弹。
 * Incremental V2 implementation. Per-function status is in architecture-manifest.json.
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
 * @implementationScope core-preview
 * @calls dispatch/weapons.js#dispatchWeaponsHandler
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/stats.js#deriveWeaponStats
 * @param {import('../contracts.d.ts').AttackContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planWeaponFire(context) {
  const state = context.state, weapon = context.weapon;
  if (!state.input.firing || !weapon || weapon.cooldown > 1e-9 || !['exploring', 'boss'].includes(state.flow.phase)) return createEmptyPlan();
  const stats = dependency4.deriveWeaponStats(state, weapon, context.catalog);
  const plan = dependency2.dispatchWeaponsHandler(context, weapon.definitionId);
  return { ...plan, changes: [...plan.changes, createStateChange('player', state.player.entityId, 'setLoadout', { ...state.player.loadout, weapons: state.player.loadout.weapons.map(item => item.instanceId === weapon.instanceId ? { ...item, cooldown: stats.interval } : item) })] };
}

/**
 * 检验控制/封禁/冷却后派发主动技能，成功才生成SkillCast事件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls dispatch/skills.js#dispatchSkillsHandler
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').AttackContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planSkillCast(context) {
  const state = context.state, player = state.world.entities[state.player.entityId];
  if (state.player.loadout.skillCooldown > 0 || player.statusIds.some(id => state.world.statuses[id]?.kind === 'skillBan')) return createEmptyPlan();
  const plan = dependency1.dispatchSkillsHandler(context, state.player.loadout.skillId);
  const cooldown = Number(context.catalog.definitions[state.player.loadout.skillId]?.parameters.cooldown);
  if (!Number.isFinite(cooldown) || cooldown < 3) throw new Error('Invalid equipped skill cooldown');
  return { ...plan, changes: [...plan.changes, createStateChange('player', player.id, 'setLoadout', { ...state.player.loadout, skillCooldown: cooldown })], events: [...plan.events, { id: `skill:${state.tick}`, runId: state.runId, tick: state.tick, seq: 0, type: 'SkillCast', sourceId: player.id, targetId: null, payload: { skillId: state.player.loadout.skillId } }] };
}

/**
 * 检验可用后冲刺/短保护，禁锢中不允许；不给装备技能事件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planDash(context, command) {
  const state = context.state, player = state.world.entities[state.player.entityId];
  if (state.player.loadout.dashCooldown > 0 || player.statusIds.some(id => state.world.statuses[id]?.kind === 'root')) return createEmptyPlan();
  const input = state.input.move.x || state.input.move.y ? state.input.move : state.input.aim;
  const direction = dependency3.normalizeVector(input);
  return { ...createEmptyPlan(), changes: [
    createStateChange('entity', player.id, 'setEntityRuntime', { runtime: { ...player.runtime, dashUntil: state.tick + 11, dashDirection: { ...direction } } }),
    createStateChange('player', player.id, 'setLoadout', { ...state.player.loadout, dashCooldown: 3 }),
    createStateChange('player', player.id, 'setInvulnerable', { remaining: Math.max(0.18, state.player.invulnerableRemaining) }),
  ] };
}

/**
 * 切枪/换技能/地面实例交换，遵守冷却继承，不重复产装备。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planLoadoutChange(context, command) {
  const state = context.state;
  if (command.type !== 'SwitchWeapon') throw new Error('Ground equipment swaps are not available in the combat preview');
  const player = state.world.entities[state.player.entityId];
  if (Number(player.runtime.switchReadyAt ?? 0) > state.tick || state.player.loadout.weapons.length < 2) return createEmptyPlan();
  return { ...createEmptyPlan(), changes: [createStateChange('player', player.id, 'setLoadout', { ...state.player.loadout, activeWeaponIndex: (state.player.loadout.activeWeaponIndex + 1) % state.player.loadout.weapons.length }), createStateChange('entity', player.id, 'setEntityRuntime', { runtime: { ...player.runtime, switchReadyAt: state.tick + 18 } })] };
}

/**
 * 将碰撞翻译为唯一伤害/控制/拾取请求，不直接递归结算。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').CollisionResult} collisions
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planCollisionEffects(context, collisions) {
  const state = context.state, changes = /** @type {import('../contracts.d.ts').StateChange[]} */ ([]), effects = /** @type {import('../contracts.d.ts').EffectRequest[]} */ ([]);
  const local = new Map();
  for (const collision of collisions.hits) {
    const projectile = state.world.entities[collision.sourceId], target = state.world.entities[collision.targetId];
    if (!projectile || !target || projectile.runtime.exhausted === true) continue;
    const progress = local.get(projectile.id) ?? { hits: /** @type {string[]} */ ([.../** @type {readonly string[]} */ (projectile.runtime.hitTargetIds ?? [])]), exhausted: false };
    if (progress.exhausted || progress.hits.includes(target.id)) continue;
    if (target.kind === 'obstacle') progress.exhausted = true;
    else {
      progress.hits.push(target.id);
      const time = collision.timeOfImpact;
      const atImpact = { x: target.previousPosition.x + (target.position.x - target.previousPosition.x) * time, y: target.previousPosition.y + (target.position.y - target.previousPosition.y) * time };
      const request = { id: `damage:${projectile.id}:${target.id}`, sourceId: projectile.sourceId, creditOwner: projectile.creditOwner, sourceKind: projectile.runtime.sourceKind ?? 'weapon_primary', attackId: projectile.attackId, projectileId: projectile.id, targetId: target.id, baseDamage: Number(projectile.runtime.damage), contact: { x: target.position.x + collision.contact.x - atImpact.x, y: target.position.y + collision.contact.y - atImpact.y }, incomingDirection: collision.incomingDirection, generation: 0, chainId: String(projectile.runtime.chainId), critEligible: projectile.runtime.critEligible === true, expiresAt: projectile.expiresAt };
      effects.push({ id: request.id, sourceId: request.sourceId, chainId: request.chainId, generation: 0, kind: 'damage', payload: toJson(request) });
      progress.exhausted = progress.hits.length >= Number(projectile.runtime.maxHits ?? 1);
    }
    local.set(projectile.id, progress);
  }
  for (const [id, progress] of local) changes.push(createStateChange('entity', id, 'setEntityRuntime', { runtime: { ...state.world.entities[id].runtime, hitTargetIds: progress.hits, exhausted: progress.exhausted } }));
  return { ...createEmptyPlan(), changes, effects };
}
