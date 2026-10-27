// @ts-check
import {createEntityState} from '../entities.js';
import { createEmptyPlan, createStateChange } from '../plans.js';
import { planMeleeEnemy } from '../meleeAi.js';
import { distanceSquared, normalizeVector } from '../geometry.js';
import { toJson } from '../serialization.js';
/** @typedef {{kind:string;executeAt:number;index:number;point:import('../../contracts.d.ts').Vec2;facing:number;strip:number}} ClaudeMove */
/**
 * Claude高数值/封禁招式意图；控制由统一管线处理。
 * ARCHITECTURE SCAFFOLD ONLY — all bodies are placeholders.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 推进预警/招式/恢复，按5/10/11级机制加入组合/场地/Glasswing请求标记。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/bosses/claude.js#planClaudeBan
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/meleeAi.js#planMeleeEnemy
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planClaudeBoss(context, boss) {
  const state = context.state, entity = state.world.entities[boss.entityId], player = state.world.entities[state.player.entityId];
  if (!entity || entity.dead || player.dead || !['exploring', 'boss'].includes(state.flow.phase)) return createEmptyPlan();
  const base = planMeleeEnemy({ ...context, entityId: entity.id }, false);
  const runtimeChange = base.changes.find(change => change.operation === 'setEntityRuntime');
  const runtime = { ...entity.runtime, .../** @type {{runtime?:Record<string,import('../../contracts.d.ts').Json>}} */ (runtimeChange?.payload ?? {}).runtime };
  const changes = [...base.changes.filter(change => change.operation !== 'setEntityRuntime')], effects = [...base.effects],events=[...base.events];
  const move = /** @type {ClaudeMove|null} */ (runtime.claudeMove ?? null);
  const index = Number(runtime.claudeMoveIndex ?? 0), phase = entity.hp <= entity.maxHp * 0.5 ? 2 : 1;
  if (move) {
    changes.push(createStateChange('entity', entity.id, 'setEntityKinematics', { position: entity.position, previousPosition: entity.previousPosition, velocity: { x: 0, y: 0 }, facingRadians: move.facing }));
    if (state.tick >= move.executeAt) {
      const distance = Math.sqrt(distanceSquared(entity.position, player.position));
      const direction = normalizeVector({ x: player.position.x - entity.position.x, y: player.position.y - entity.position.y });
      const inClaw = distance <= 160 + player.radius && direction.x * Math.cos(move.facing) + direction.y * Math.sin(move.facing) >= Math.SQRT1_2;
      if ((move.kind === 'clamp' || move.kind === 'strike') && inClaw) {
        effects.push(bossDamage(context, boss, 26, `${move.index}:claw`));
        if (move.kind === 'clamp') effects.push(controlEffect(context, boss, 'root', 4, 6, `${move.index}:root`));
      } else if (move.kind === 'skillBan' && distanceSquared(player.position, move.point) <= (90 + player.radius) ** 2) effects.push(...planClaudeBan(context, boss, 'skillBan').effects);
      else if(move.kind==='companionBan'){const ban=planClaudeBan(context,boss,'companionBan');changes.push(...ban.changes);effects.push(...ban.effects);}
      else if (move.kind === 'sweep' && Math.abs(player.position.x - (move.point.x + (move.strip - 1) * 180)) <= 45 + player.radius && Math.abs(player.position.y - move.point.y) <= 400 + player.radius) effects.push(bossDamage(context, boss, 30, `${move.index}:strip:${move.strip}`));
      if(['clamp','strike'].includes(move.kind))events.push({id:`claw:${entity.id}:${state.tick}`,runId:state.runId,tick:state.tick,seq:0,type:'HeavyClawResolved',sourceId:entity.id,targetId:null,payload:{point:entity.position,facing:move.facing,range:160,cosine:Math.SQRT1_2,amount:26*state.start.difficulty.damageMultiplier}});
      if(move.kind==='clamp'&&state.start.difficulty.mechanicIds.includes('mech_05_boss_combo'))runtime.claudeMove=toJson({kind:'strike',executeAt:state.tick+42,index:move.index,point:{...player.position},facing:Math.atan2(player.position.y-entity.position.y,player.position.x-entity.position.x),strip:0});
      else if (move.kind === 'sweep' && move.strip < 2) runtime.claudeMove = toJson({ ...move, strip: move.strip + 1, executeAt: state.tick + 60 });
      else { runtime.claudeMove = null; runtime.claudeMoveIndex = move.index + 1; runtime.nextClaudeMoveAt = state.tick + 90; }
    }
  } else if (state.tick >= Number(runtime.nextClaudeMoveAt ?? 120)) {
    const kinds = entity.runtime.guidedBoss===true?['clamp']:phase === 2 ? ['clamp', 'skillBan', 'companionBan', 'sweep'] : ['clamp', 'skillBan', 'companionBan'];
    let kind = kinds[index % kinds.length]; if (kind === 'companionBan' && !state.player.loadout.companionId) kind = 'strike';
    // Do not start a melee move from the far side of the map; walk into readable range first.
    if (!['clamp', 'strike'].includes(kind) || distanceSquared(entity.position, player.position) <= 260 ** 2) {
      const facing = Math.atan2(player.position.y - entity.position.y, player.position.x - entity.position.x);
      runtime.claudeMove = toJson({ kind, executeAt: state.tick + (kind === 'skillBan' ? 72 : kind === 'sweep' ? 60 : kind === 'companionBan' ? 48 : 54), index, point: { ...player.position }, facing, strip: 0 });
      changes.push(createStateChange('entity', entity.id, 'setEntityKinematics', { position: entity.position, previousPosition: entity.previousPosition, velocity: { x: 0, y: 0 }, facingRadians: facing }));
    }
  }
  changes.push(createStateChange('entity', entity.id, 'setEntityRuntime', { runtime }));
  return { ...createEmptyPlan(), changes, effects,events };
}

/**
 * 无合法槽则普通攻击；只发一份封禁请求和可破封装置计划。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/serialization.js#toJson
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').BossState} boss
 * @param {'skillBan' | 'companionBan'} kind
 * @returns {import('../../contracts.d.ts').EffectPlan}
 */
export function planClaudeBan(context, boss, kind) {
  if (kind === 'companionBan' && !context.state.player.loadout.companionId) return { ...createEmptyPlan(), effects: [bossDamage(context, boss, 26, 'empty-companion-strike')] };
  if(kind==='companionBan'){const state=context.state,entity=state.world.entities[boss.entityId],partner=state.world.entities['companion:equipped']??state.world.entities[state.player.entityId],direction=normalizeVector({x:partner.position.x-entity.position.x,y:partner.position.y-entity.position.y}),id=`ban-shot:${entity.id}:${state.tick}`,hits=state.start.treeNodeIds.includes('tree_explore_e')?2:3;return {...createEmptyPlan(),changes:[{target:'world',id,operation:'putEntity',payload:toJson(createEntityState(id,'claude_ban_projectile','enemy','enemy',entity.position,{hp:hits,maxHp:hits,radius:14,sourceId:entity.id,velocity:{x:direction.x*240,y:direction.y*240},expiresAt:state.tick+240,rewardPolicy:'none',distillEligible:false,runtime:{noAi:true,sealProjectile:true,noRewardTarget:true}}))}]};}
  return { ...createEmptyPlan(), effects: [controlEffect(context, boss, kind, 8, 3, kind)] };
}

/** @param {import('../../contracts.d.ts').EvaluationContext} context @param {import('../../contracts.d.ts').BossState} boss @param {number} damage @param {string} suffix @returns {import('../../contracts.d.ts').EffectRequest} */
function bossDamage(context, boss, damage, suffix) {
 const state = context.state, entity = state.world.entities[boss.entityId], player = state.world.entities[state.player.entityId], id = `claude:${boss.entityId}:${state.tick}:${suffix}`;
 return { id, chainId: id, sourceId: entity.id, generation: 0, kind: 'damage', payload: toJson({ id, sourceId: entity.id, creditOwner: 'enemy', sourceKind: 'enemy', attackId: id, projectileId: null, targetId: player.id, baseDamage: damage * Number(entity.runtime.damageMultiplier??state.start.difficulty.damageMultiplier), contact: entity.position, incomingDirection: normalizeVector({ x: player.position.x - entity.position.x, y: player.position.y - entity.position.y }), generation: 0, chainId: id, critEligible: false, expiresAt: state.tick }) };
}
/** @param {import('../../contracts.d.ts').EvaluationContext} context @param {import('../../contracts.d.ts').BossState} boss @param {import('../../contracts.d.ts').ControlRequest['kind']} kind @param {number} duration @param {number} required @param {string} suffix @returns {import('../../contracts.d.ts').EffectRequest} */
function controlEffect(context, boss, kind, duration, required, suffix) {
 const state = context.state, id = `claude:${boss.entityId}:${state.tick}:${suffix}:control`;
 return { id, chainId: id, sourceId: boss.entityId, generation: 0, kind: 'control', payload: { id, sourceId: boss.entityId, targetId: state.player.entityId, kind, baseDuration: duration, baseRequiredInputs: required, appliedModifierIds: [] } };
}
