// @ts-check
import { toJson } from '../domain/serialization.js';
/**
 * 表现层只读投影，不把活实体对象交给UI。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

import { createDataDigest } from '../domain/serialization.js';

/**
 * 将模型名/壳弱点/LoRA/插件/额度与角色位置投影到只读显示DTO。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').RenderSnapshot}
 */
export function createRenderSnapshot(state, catalog) {
  const player = state.world.entities[state.player.entityId], weapon = state.player.loadout.weapons[state.player.loadout.activeWeaponIndex];
  const pickups = Object.values(state.world.pickups).filter(pickup => !pickup.collected).map(pickup => ({ projectileStyle:'',quality:pickup.weapon?.originalQuality??0,effectRadius:0,bossTelegraph:null,objectiveProgress:0,unlocked:false,opened:false,id: pickup.id, kind: /** @type {const} */ ('pickup'), team: /** @type {const} */ ('neutral'), radius: pickup.kind==='weapon'?14:5, position: { ...pickup.position }, facingRadians: 0, spriteId: pickup.kind, modelLabel: pickup.weapon?catalog.definitions[pickup.weapon.definitionId]?.displayName??null:null, hp: 1, maxHp: 1, hpFraction: 1, weakArcDegrees: null, statusLabels: [], telegraphRemaining: 0, shieldAmount: 0 }));
  return { revision: state.revision, tick: state.tick, uiTick: state.uiTick, phase: state.flow.phase,
    entities: Object.values(state.world.entities).filter(entity => !entity.dead).map(entity => ({ projectileStyle:String(entity.runtime.weaponTemplate??''),quality:Number(entity.runtime.quality??0),effectRadius:Number(entity.runtime.blastRadius??0),bossTelegraph: entity.runtime.claudeMove ?? null, objectiveProgress: state.world.objectives.find(objective=>objective.id===entity.id)?.progress ?? 0, unlocked:entity.runtime.unlocked===true,opened:entity.runtime.opened===true,id: entity.id, kind: entity.kind, team: entity.team, radius: entity.radius, position: { ...entity.position }, facingRadians: entity.facingRadians, spriteId: entity.runtime.distilledGrok === true ? 'distilled_bot' : entity.runtime.homingTargetId ? 'distilled_bubble' : entity.definitionId, modelLabel: entity.modelProfileId ? catalog.definitions[entity.modelProfileId]?.displayName ?? null : null, hp: entity.hp, maxHp: entity.maxHp, hpFraction: entity.hp / entity.maxHp, weakArcDegrees: entity.shell && !entity.shell.broken ? entity.shell.weakArcDegrees : null, statusLabels: entity.statusIds.map(id => state.world.statuses[id]?.kind).filter(Boolean), telegraphRemaining: Math.max(0, Number(entity.runtime.windupEnd ?? 0) - state.tick) / 60, shieldAmount: entity.shieldIds.reduce((sum, id) => sum + (state.world.shields[id]?.amount ?? 0), 0) })).concat(pickups),
    hud: toJson({ hp: player.hp, maxHp: player.maxHp, rice: state.totalTokens, treeHints: state.start.treeNodeIds.includes('tree_explore_b'), enemies: Object.values(state.world.entities).filter(entity => entity.kind === 'enemy' && !entity.dead).length, weaponId: weapon.definitionId, weaponName: catalog.definitions[weapon.definitionId]?.displayName ?? weapon.definitionId, skillId: state.player.loadout.skillId, skillCooldown: state.player.loadout.skillCooldown, dashCooldown: state.player.loadout.dashCooldown, map: { ...state.world.map }, aim: state.input.aim, invulnerable: state.player.invulnerableRemaining > 0 }),
    panel: state.flow.phase === 'paused' ? { title: '已暂停' } : state.flow.phase === 'defeat' ? { title: '这次先回小窝' } : null,
  };
}

/**
 * 稳定序列化关键状态摘要，排除表现随机/宿主对象。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/serialization.js#createDataDigest
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @returns {string}
 */
export function createStateDigest(state) {
  return createDataDigest(state);
}
