// @ts-check
/**
 * 伤害的唯一规划入口；不递归调用击杀或效果钩子。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import {resolvePetGuard,resolvePetLinkFactor} from './modelProfiles.js';
import{resolveCacheHitFactor}from'./pluginStats.js';
import { resolveTreeSurvival } from './treeRuntime.js';
import * as dependency1 from './quotas.js';
import * as dependency2 from './shells.js';
import * as dependency3 from './shields.js';
import * as dependency4 from './stats.js';
import * as dependency5 from './random.js';

/**
 * 检查命中/无敌，分流外壳，计算额度/护甲/减伤/暴击/盾/生命，产生伤害和死亡候选。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：有壳目标先外壳分支；对敌暴击只在原生武器允许处一次计算；额度只用于敌→玩家。
 * @calls domain/damage.js#isDamageRequestValid
 * @calls domain/modelProfiles.js#resolvePetGuard
 * @calls domain/modelProfiles.js#resolvePetLinkFactor
 * @calls domain/pluginStats.js#resolveCacheHitFactor
 * @calls domain/quotas.js#planQuotaAllowance
 * @calls domain/random.js#drawRandom
 * @calls domain/shells.js#resolveShellContact
 * @calls domain/shields.js#resolveShieldAbsorption
 * @calls domain/stats.js#derivePlayerStats
 * @calls domain/treeRuntime.js#resolveTreeSurvival
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DamageRequest} request
 * @returns {import('../contracts.d.ts').DamageResolution}
 */
export function resolveDamageRequest(context, request) {
  const empty = { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  if (!isDamageRequestValid(context, request)) return { accepted: false, allowedBeforeDefense: 0, shellDamage: 0, shieldDamage: 0, hpDamage: 0, plan: empty };
  const state = context.state, target = state.world.entities[request.targetId];
  const plans = /** @type {import('../contracts.d.ts').SystemPlan[]} */ ([]);
  const changes = /** @type {import('../contracts.d.ts').StateChange[]} */ ([{ target: 'runtime', id: request.id, operation: 'registerHit', payload: { attackId: request.attackId, targetId: request.targetId, expiresAt: request.expiresAt } }]);
  if(target.runtime.trainingInterface===true){const weaponId=String(request.projectileId?state.world.entities[request.projectileId]?.runtime.weaponDefinitionId??'':'');return {accepted:true,allowedBeforeDefense:0,hpDamage:0,shieldDamage:0,shellDamage:0,plan:{...empty,changes,events:[{id:`training:${request.id}`,runId:state.runId,tick:state.tick,seq:0,type:'TrainingInterfaceHit',sourceId:request.sourceId,targetId:target.id,payload:{weaponId}}]}};}
  const seal = typeof target.runtime.sealStatusId === 'string'||target.runtime.sealProjectile===true;
  let incoming = seal ? 1 : (target.runtime.toolOwner?Math.max(target.hp,request.baseDamage):request.baseDamage)*resolveCacheHitFactor(state,request);
  if (target.id === state.player.entityId && state.world.entities[request.sourceId].team === 'enemy') {
    const quota = dependency1.planQuotaAllowance(context, request);
    incoming = quota.allowedDamage; plans.push(quota.plan);
  }
  if(target.runtime.gptReset)incoming*=.7;
  incoming*=resolvePetLinkFactor(state,target.id);
  const guard=resolvePetGuard(context,{...request,baseDamage:incoming});
  const shell=guard.blocked?{blocked:true,damage:guard.damage,plan:guard.plan}:dependency2.resolveShellContact(context,{...request,baseDamage:incoming});
  plans.push(shell.plan);
  let hpDamage = 0, shieldDamage = 0;
  const treeEvents = /** @type {import('../contracts.d.ts').DomainEvent[]} */([]);
  if (!shell.blocked) {
    const stats = target.id === state.player.entityId ? dependency4.derivePlayerStats(state, context.catalog) : null;
    let damage = incoming * 100 / (100 + Math.max(0, Math.min(60, stats?.armor ?? target.armor)));
    const guard = target.id === state.player.entityId ? state.plugins.find(plugin => plugin.id === 'plugin_guard') : null;
    if (guard && incoming >= 20) damage *= guard.rank === 1 ? 0.8 : 0.7;
    // Only primary weapon requests may roll the player's crit stream; output was applied at attack construction.
    const primary = !seal && request.sourceKind === 'weapon_primary' && request.critEligible && target.team === 'enemy';
    if (primary) {
      const playerStats = dependency4.derivePlayerStats(state, context.catalog);
      const draw = dependency5.drawRandom(state.random.combat);
      changes.push({ target: 'random', id: 'combat', operation: 'setRandomStream', payload: { ...draw.next } });
      if (draw.value < playerStats.critChance) damage *= playerStats.critMultiplier;
    }
    const shield = dependency3.resolveShieldAbsorption(context, target.id, damage);
    plans.push(shield.plan); shieldDamage = shield.absorbed;
    hpDamage = Math.min(target.hp, shield.remainingDamage);
    if (hpDamage > 0) {
      const survival = target.id === state.player.entityId ? resolveTreeSurvival(state, hpDamage) : null;
      if (survival) hpDamage = survival.hpDamage;
      changes.push({ target: 'entity', id: target.id, operation: 'setHp', payload: { hp: survival?.hp ?? target.hp - hpDamage } });
      changes.push({ target: 'entity', id: target.id, operation: 'setDamageCredit', payload: { sourceId: request.sourceId, creditOwner: request.creditOwner } });
      if (survival) {
        for (const nodeId of survival.events) treeEvents.push({id:`tree:${nodeId}:${request.id}`,runId:state.runId,tick:state.tick,seq:treeEvents.length,type:'TreeTriggered',sourceId:target.id,targetId:target.id,payload:{nodeId}});
        changes.push({ target: 'entity', id: target.id, operation: 'setEntityRuntime', payload: { runtime: { ...survival.runtime, hpDamageTotal:Number(target.runtime.hpDamageTotal??0)+hpDamage, lastDamageSourceId: request.sourceId, lastDamageCreditOwner: request.creditOwner } } });
        changes.push({ target: 'player', id: target.id, operation: 'setInvulnerable', payload: { remaining: survival.invulnerable } });
      }
    }
  }
  const event = { id: `damage:${request.id}`, runId: state.runId, tick: state.tick, seq: 0, type: 'DamageResolved', sourceId: request.sourceId, targetId: target.id, payload: { hpDamage, shieldDamage, shellDamage: shell.damage, attackId: request.attackId, sourceKind: request.sourceKind } };
  return { accepted: true, allowedBeforeDefense: incoming, shellDamage: shell.damage, shieldDamage, hpDamage, plan: {
    changes: [...plans.flatMap(plan => plan.changes), ...changes], effects: plans.flatMap(plan => plan.effects), events: [...plans.flatMap(plan => plan.events), ...treeEvents, event], persistence: [], diagnostics: plans.flatMap(plan => plan.diagnostics),
  } };
}

/**
 * 检查实体存活、dying、attackId命中去重、来源/链代数与闪避保护。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DamageRequest} request
 * @returns {boolean}
 */
export function isDamageRequestValid(context, request) {
  const state = context.state, target = state.world.entities[request.targetId];
  const source = state.world.entities[request.sourceId];
  if (!target || !source || target.dead || target.dying || target.hp <= 0 || !request.id || !request.attackId || !request.chainId) return false;
  if (![request.baseDamage, request.contact.x, request.contact.y, request.incomingDirection.x, request.incomingDirection.y].every(Number.isFinite) || request.baseDamage <= 0) return false;
  if (!Number.isSafeInteger(request.generation) || request.generation < 0 || request.generation > 4 || !Number.isSafeInteger(request.expiresAt) || request.expiresAt < state.tick) return false;
  const breakable=target.kind==='obstacle'&&target.runtime.breakable===true&&source.faction==='claude'&&request.sourceKind==='enemy';
  if (source.team === target.team || target.team === 'neutral'&&!breakable || !['exploring', 'boss'].includes(state.flow.phase)) return false;
  if (request.projectileId !== null) {
    const projectile = state.world.entities[request.projectileId];
    if (!projectile || projectile.dead || projectile.dying || projectile.attackId !== request.attackId || projectile.sourceId !== request.sourceId) return false;
  }
  if(target.runtime.trainingInterface===true&&request.sourceKind!=='weapon_primary')return false;
  if ((typeof target.runtime.sealStatusId === 'string'||target.runtime.sealProjectile===true) && request.sourceKind !== 'weapon_primary') return false;
  if (target.id === state.player.entityId && state.player.invulnerableRemaining > 0) return false;
  return !state.attackHits.some(hit => hit.attackId === request.attackId && hit.targetId === request.targetId && hit.expiresAt >= state.tick);
}

/**
 * 治疗/生命变动限幅，输出实际治疗和溢出；不自行触发回血递归。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Id} targetId
 * @param {number} delta
 * @param {import('../contracts.d.ts').Id} causeId
 * @returns {import('../contracts.d.ts').EffectPlan}
 */
export function planLifeChange(context, targetId, delta, causeId) {
  if (!Number.isFinite(delta)) throw new RangeError('Invalid life change');
  const state = context.state, target = state.world.entities[targetId];
  if (delta < 0) throw new RangeError('Damage must use resolveDamageRequest');
  if (!target || target.dead || target.dying || target.hp <= 0 || delta === 0) return { changes: [], effects: [], events: [], persistence: [], diagnostics: [] };
  const actual = Math.min(delta, Math.max(0, target.maxHp - target.hp));
  return { changes: [{ target: 'entity', id: targetId, operation: 'setHp', payload: { hp: target.hp + actual } }], effects: [], persistence: [], diagnostics: [],
    events: [{ id: `heal:${causeId}:${targetId}`, runId: state.runId, tick: state.tick, seq: 0, type: 'LifeRestored', sourceId: causeId, targetId, payload: { actual, overflow: delta - actual } }],
  };
}
