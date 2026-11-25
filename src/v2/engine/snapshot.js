import {STATION_RADIUS} from '../domain/world/beacon.js';
import {regionWorldTick} from '../domain/world/regionRules.js';
import {resolveSkillTemplate} from '../content/skillCapabilities.js';
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
 * @calls content/skillCapabilities.js#resolveSkillTemplate
 * @calls domain/serialization.js#toJson
 * @calls domain/world/regionRules.js#regionWorldTick
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').RenderSnapshot}
 */
export function createRenderSnapshot(state, catalog) {
  const player = state.world.entities[state.player.entityId], weapon = state.player.loadout.weapons[state.player.loadout.activeWeaponIndex];
  const pickups = Object.values(state.world.pickups).filter(pickup => !pickup.collected).map(pickup => ({horizontalFacing:1,hopPhase:16,dashWarning:null,moving:false,attacking:false,currentDirection:0,currentWarning:false,alarmArmed:false,petCast:null,petZone:'',guardHp:0,linkEnd:null, abilityKind:'',reflected:0,projectileStyle:'',quality:pickup.weapon?.originalQuality??0,effectRadius:0,bossTelegraph:null,buoyMask:0,objectiveProgress:0,objectiveRequired:0,unlocked:false,opened:false,id: pickup.id, kind: /** @type {const} */ ('pickup'), team: /** @type {const} */ ('neutral'), radius: ['weapon','skill'].includes(pickup.kind)?14:5, position: { ...pickup.position }, facingRadians: 0, spriteId: pickup.kind, modelLabel: pickup.weapon?catalog.definitions[pickup.weapon.definitionId]?.displayName??null:pickup.skill?catalog.definitions[pickup.skill.definitionId]?.displayName??null:null, hp: 1, maxHp: 1, hpFraction: 1, weakArcDegrees: null, statusLabels: [], telegraphRemaining: 0, shieldAmount: 0 }));
  return { revision: state.revision, tick: state.tick, uiTick: state.uiTick, phase: state.flow.phase,
    entities: Object.values(state.world.entities).filter(entity => !entity.dead&&entity.runtime.hidden!==true&&!(typeof entity.runtime.hiddenBy==='string'&&state.world.entities[entity.runtime.hiddenBy]?.hp>0)).map(entity => ({horizontalFacing:Number(entity.runtime.visualFacing??(entity.velocity.x<0?-1:1)),hopPhase:Number(entity.runtime.hopPhase??16),dashWarning:Number(entity.runtime.tacticalWindupUntil??0)>state.tick?{point:entity.runtime.dashAim,remaining:(Number(entity.runtime.tacticalWindupUntil)-state.tick)/60}:null,moving:Math.hypot(entity.velocity.x,entity.velocity.y)>.1||Math.hypot(entity.position.x-entity.previousPosition.x,entity.position.y-entity.previousPosition.y)>.01,attacking:entity.kind==='player'&&state.input.firing,currentDirection:entity.runtime.currentZone===true?((Math.floor(regionWorldTick(state)/1800)%2?-1:1)*(state.world.pressureEvents.some(e=>e.phase==='active'&&e.runtime.kind==='tideReverse'&&e.runtime.currentId===entity.id)?-1:1)):0,currentWarning:entity.runtime.currentZone===true&&regionWorldTick(state)%1800>=1620,alarmArmed:Number(entity.runtime.armedUntil??0)>=state.tick&&!!entity.runtime.armedUntil,petCast:entity.runtime.petCast??null,petZone:entity.runtime.bossGround===true?(Number(entity.runtime.revealAt)>state.tick?'answerUnknown':entity.runtime.danger===true?'answerDanger':'answerSafe'):String(entity.runtime.petZone??''),guardHp:Number(entity.runtime.guardHp??0),linkEnd:entity.runtime.petZone==='vine'&&Number(entity.runtime.stage)>=2&&Number(entity.runtime.activeAt)<=state.tick?Object.values(state.world.entities).find(e=>e.id>entity.id&&e.runtime.wave===entity.runtime.wave&&e.sourceId===entity.sourceId&&!e.dead&&Number(e.expiresAt)>state.tick)?.position??null:null, abilityKind:String(entity.runtime.abilityKind??''),reflected:Number(entity.runtime.reflected??0),projectileStyle:String(entity.runtime.weaponTemplate??''),quality:Number(entity.runtime.quality??0),effectRadius:Number(entity.runtime.zoneRadius??entity.runtime.blastRadius??0),bossTelegraph: entity.runtime.claudeMove??entity.runtime.rocketCast??entity.runtime.gptCast??null, buoyMask:entity.definitionId==='world_beacon'?(state.world.objectives.find(o=>o.id===entity.id)?.buoyMask??0):0, objectiveProgress: state.world.objectives.find(objective=>objective.id===entity.id)?.progress ?? 0,objectiveRequired:state.world.objectives.find(o=>o.id===entity.id)?.requiredProgress??2100, unlocked:entity.definitionId==='world_challenge'?entity.runtime.started!==true:entity.runtime.shortcut===true?entity.runtime.solid===false:entity.runtime.unlocked===true,opened:entity.runtime.used===true||entity.runtime.opened===true||entity.runtime.completed===true||state.world.objectives.some(o=>o.id===entity.id&&o.completed),id: entity.id, kind: entity.kind, team: entity.team, radius: entity.definitionId==='world_beacon'?STATION_RADIUS:entity.radius, position: { ...entity.position }, facingRadians: entity.facingRadians, spriteId: entity.runtime.distilledGrok === true ? 'distilled_bot' : entity.runtime.homingTargetId ? 'distilled_bubble' : entity.definitionId, modelLabel:entity.definitionId==='world_escort'?escortLabel(state,entity,player):entity.definitionId==='world_blockade_core'?(/** @type {readonly string[]} */(entity.runtime.lockedByIds??[]).some(id=>!state.world.entities[id]?.dead)?'先击毁供能柱':'封锁核心'):entity.runtime.interaction==='expeditionBack'?`返回海域${Number(entity.runtime.targetBiome)+1} · F`:entity.runtime.interaction==='expeditionExit'?`前往海域${Number(entity.runtime.targetBiome)+1} · F`:entity.definitionId==='world_rest'?(entity.runtime.used===true?'已休整':entity.runtime.unlocked===true?'独立休整 · F':'首领后开放'):entity.definitionId==='world_challenge'?(entity.runtime.failed===true?'部署中断':entity.runtime.challengeKind==='integration'?'三段综合遭遇':`精英挑战 · ${String(entity.runtime.challengeKind)}`):entity.runtime.trainingInterface===true?(entity.runtime.trainedWeaponId?catalog.definitions[String(entity.runtime.trainedWeaponId)]?.displayName??'已训练':'射击接口'):entity.kind==='companion'?catalog.definitions[entity.definitionId].displayName:entity.modelProfileId ? catalog.definitions[entity.modelProfileId]?.displayName ?? null : null, hp: entity.hp, maxHp: entity.maxHp, hpFraction: entity.hp / entity.maxHp, weakArcDegrees: entity.shell && !entity.shell.broken ? entity.shell.weakArcDegrees : null, statusLabels: (entity.kind==='companion'?player.statusIds:entity.statusIds).map(id => state.world.statuses[id]?.kind).filter(Boolean), telegraphRemaining: Math.max(0, Number(entity.runtime.executeAt??entity.runtime.activeAt??entity.runtime.windupEnd ?? 0) - state.tick) / 60, shieldAmount: entity.shieldIds.reduce((sum, id) => sum + (state.world.shields[id]?.amount ?? 0), 0) })).concat(pickups),
    hud: toJson({ hp: player.hp, maxHp: player.maxHp, rice: state.totalTokens, treeHints: state.start.treeNodeIds.includes('tree_explore_b'), enemies: Object.values(state.world.entities).filter(entity => entity.kind === 'enemy' && !entity.dead && entity.runtime.hidden!==true).length, weaponId: weapon.definitionId, weaponName: catalog.definitions[weapon.definitionId]?.displayName ?? weapon.definitionId, skillId: state.player.loadout.skillId, skillTemplateId:resolveSkillTemplate(catalog,state.player.loadout.skillId), skillCooldown: state.player.loadout.skillCooldown, dashCooldown: state.player.loadout.dashCooldown, map: { ...state.world.map },waterFaction:state.start.difficulty.mode==='short'?(state.start.bossFaction??'claude'):null,expeditionRoute:state.expedition?.route??null,clearedBiomes:state.expedition?.clearedBiomes??[],aim: state.input.aim, aimDistance:state.input.aimDistance??400,overclock:state.player.modifiers.some(m=>m.sourceId==='skill_overclock'&&(m.expiresAt===null||m.expiresAt>state.tick)),invulnerable: state.player.invulnerableRemaining > 0 }),
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

/** @param {import('../contracts.d.ts').StateSnapshot} state @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} robot @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} player */
function escortLabel(state,robot,player){const goal=state.world.objectives.find(o=>o.id===robot.id);if(robot.runtime.escortState==='ready')return '补给机器人 · F 开始护送';if(robot.runtime.escortState==='arrived')return '补给已送达';if(Math.hypot(robot.position.x-player.position.x,robot.position.y-player.position.y)>240)return '等待大肥鱼靠近';if(Object.values(state.world.entities).some(e=>e.kind==='enemy'&&e.runtime.noAi!==true&&!e.dead&&!e.dying&&Math.hypot(e.position.x-robot.position.x,e.position.y-robot.position.y)<=180))return '清除附近敌人';if(robot.runtime.escortNoRoute===true)return '路线被堵住';return `护送中 ${goal?.progress??0}/3`; }
