// @ts-check
import {planEasterInteraction} from '../easter.js';
import { planEquipmentInteraction } from '../equipment.js';
import { createAdventureMapPlan, planClaudeEncounter } from './adventure.js';
import { createEmptyPlan } from '../plans.js';
import { createStateChange } from '../plans.js';
import { createEntityState } from '../entities.js';
/**
 * 连续地图生成、探索与安全交互。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */
import * as dependency1 from '../geometry.js';
import * as dependency2 from '../random.js';
import * as dependency3 from '../rewards.js';

/**
 * 按模式生成连续地图、合法目标/检查点/箱子；不生成房间清场门。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview + adventure-slice
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createStateChange
 * @calls domain/random.js#drawRandom
 * @calls domain/world/adventure.js#createAdventureMapPlan
 * @param {import('../../contracts.d.ts').StartSnapshot} start
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @param {import('../../contracts.d.ts').RandomState} random
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function createMapPlan(start, catalog, random) {
  if (start.runtimeProfile === 'adventure-slice') return createAdventureMapPlan(start, catalog);
  if (start.runtimeProfile !== 'core-preview') throw new Error('Full adventure map generation is not implemented');
  const changes = /** @type {import('../../contracts.d.ts').StateChange[]} */ ([]);
  const rocks = [{ x: 650, y: 420 }, { x: 650, y: 610 }, { x: 1150, y: 420 }, { x: 1450, y: 800 }, { x: 1750, y: 500 }];
  const obstacleIds = rocks.map((point, index) => {
    const id = `rock:${index}`;
    changes.push(createStateChange('world', id, 'putEntity', createEntityState(id, 'terrain_rock', 'obstacle', 'neutral', point, { radius: 48, hp: 9999, maxHp: 9999, runtime: { highWall: true, solid: true } })));
    return id;
  });
  const clutter = createEntityState('clutter:0', 'terrain_clutter', 'obstacle', 'neutral', { x: 1120, y: 920 }, { radius: 26, hp: 99, maxHp: 99, runtime: { low: true, grok_passable: true, solid: true } });
  obstacleIds.push(clutter.id); changes.push(createStateChange('world', clutter.id, 'putEntity', clutter));
  const checkpoint = createEntityState('checkpoint:home', 'world_checkpoint', 'objective', 'neutral', { x: 230, y: 270 }, { radius: 28, runtime: { interaction: 'checkpoint' } });
  changes.push(createStateChange('world', checkpoint.id, 'putEntity', checkpoint));
  const map = { id: 'preview:continuous-sea', biomeIndex: 0, width: 2200, height: 1400, exploredCells: [], obstacleIds, checkpointIds: [checkpoint.id], exitIds: [], navigationRevision: 0 };
  changes.push(createStateChange('world', map.id, 'setMap', map));
  const draw = dependency2.drawRandom(random);
  const positions = [{ x: 900, y: 300 }, { x: 1000, y: 650 }, { x: 1550, y: 380 }, { x: 1750, y: 1000 }, { x: 1200, y: 1050 }, { x: 1900, y: 700 }];
  positions.forEach((point, index) => {
    const grok = index >= 3, definitionId = grok ? 'enemy_grok_bot' : 'enemy_claude_guard';
    const p = catalog.definitions[definitionId]?.parameters;
    if (!p) throw new Error('Missing preview enemy');
    for (let member = 0; member < (grok ? 4 : 1); member++) {
    const id = `resident:${index}:${member}`;
    changes.push(createStateChange('world', id, 'putEntity', createEntityState(id, definitionId, 'enemy', 'enemy', { x: point.x + (grok ? (member % 2) * 30 : 0), y: point.y + Math.floor(member / 2) * 30 + (draw.value - 0.5) * 90 }, {
      faction: grok ? 'grok' : 'claude', hp: Number(p.hp) * start.difficulty.hpMultiplier, maxHp: Number(p.hp) * start.difficulty.hpMultiplier, radius: Number(p.radius), modelProfileId: grok ? 'grok_bot' : 'claude_haiku', rewardPolicy: 'normal', distillEligible: true,
      runtime: { moveSpeed: Number(p.moveSpeed), contactDamage: Number(p.contactDamage) * start.difficulty.damageMultiplier, damageMultiplier: start.difficulty.damageMultiplier, nextAttackAt: 0, spawnGroup: 'residents' },
    })));
    }
  });
  changes.push(createStateChange('random', 'world', 'setRandomStream', draw.next));
  return { changes, effects: [], events: [], persistence: [], diagnostics: [] };
}

/**
 * 更新可见格、秘密方向与发现事件，已发现id不重复发资源。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planMapExploration(context) {
  const state=context.state,player=state.world.entities[state.player.entityId],size=160,cx=Math.floor(player.position.x/size),cy=Math.floor(player.position.y/size),cells=new Set(state.world.map.exploredCells);
  for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const x=cx+dx,y=cy+dy;if(x>=0&&y>=0&&x*size<state.world.map.width&&y*size<state.world.map.height)cells.add(`${x}:${y}`);}
  const changes = cells.size === state.world.map.exploredCells.length ? [] : [createStateChange('world',state.world.map.id,'setMap',{...state.world.map,exploredCells:[...cells].sort()})];
  const hinted = /** @type {readonly number[]} */(player.runtime.secretHintBiomes ?? []);
  if (state.start.treeNodeIds.includes('tree_explore_f') && !hinted.includes(state.world.map.biomeIndex)) {
    const secret = Object.values(state.world.entities).filter(entity => entity.runtime.secret === true && entity.runtime.opened !== true && dependency1.distanceSquared(player.position,entity.position) <= 350 ** 2).sort((a,b)=>a.id.localeCompare(b.id))[0];
    if (secret) changes.push(createStateChange('entity',player.id,'setEntityRuntime',{runtime:{...player.runtime,secretHintBiomes:[...hinted,state.world.map.biomeIndex],secretHint:{targetId:secret.id,expiresAt:state.tick+360}}}));
  }
  return {...createEmptyPlan(),changes};
}

/**
 * F/触屏选择最近交互目标，校验距离与安全状态；不直接读写存储。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope adventure-slice
 * @calls domain/easter.js#planEasterInteraction
 * @calls domain/equipment.js#planEquipmentInteraction
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/rewards.js#planWorldReward
 * @calls domain/world/adventure.js#planClaudeEncounter
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').Command} command
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planWorldInteraction(context, command) {
  const state = context.state, player = state.world.entities[state.player.entityId];
  if (state.flow.phase !== 'exploring') return createEmptyPlan();
  const equipment=planEquipmentInteraction(context);if(equipment)return equipment;
  const candidates = Object.values(state.world.entities).filter(entity => entity.kind === 'objective' && ['cache','bossGate','chair','note','lunchbox','console'].includes(String(entity.runtime.interaction)) && dependency1.distanceSquared(entity.position, player.position) <= 96 ** 2).sort((a,b)=>dependency1.distanceSquared(a.position,player.position)-dependency1.distanceSquared(b.position,player.position)||(a.id<b.id?-1:1));
  const entity = candidates[0]; if (!entity) return createEmptyPlan();
  if(['chair','note','lunchbox','console'].includes(String(entity.runtime.interaction)))return planEasterInteraction(context,entity.id);
  if (entity.runtime.interaction === 'bossGate') return planClaudeEncounter(context);
  if (entity.runtime.opened === true) return createEmptyPlan();
  const reward = dependency3.planWorldReward(context, `cache:${entity.id}`);
  const changes=[...reward.plan.changes,createStateChange('entity',entity.id,'setEntityRuntime',{runtime:{...entity.runtime,opened:true}})],events=[...reward.plan.events,{id:`cacheOpened:${state.runId}:${entity.id}`,runId:state.runId,tick:state.tick,seq:0,type:'CacheOpened',sourceId:player.id,targetId:entity.id,payload:{cacheId:entity.id,secret:entity.runtime.secret===true}}],persistence=[...reward.plan.persistence];
  if(entity.id==='cache:0'&&state.start.dsh.some(slot=>slot.id==='dsh_open')&&state.world.map.biomeIndex===0){
    for(const [i,definitionId]of ['mcp_fan','mcp_vector'].entries()){const instanceId=`${state.runId}:open:${i}`,id=`open:${entity.id}:${i}`;changes.push(createStateChange('world',id,'putPickup',{id,kind:'weapon',amount:1,position:{x:entity.position.x+(i?35:-35),y:entity.position.y},instanceId,collected:false,exclusiveGroup:`open:${state.runId}`,weapon:{instanceId,definitionId,originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null}}));}
  }else if(entity.id==='cache:0'&&state.player.loadout.weapons.length<2&&!state.player.loadout.weapons.some(weapon=>weapon.definitionId==='mcp_fan')){
    changes.push(createStateChange('player',player.id,'setLoadout',{...state.player.loadout,weapons:[...state.player.loadout.weapons,{instanceId:`${state.runId}:found:fan`,definitionId:'mcp_fan',originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null}]}));
    const event={id:`discovery:${state.runId}:mcp_fan`,runId:state.runId,tick:state.tick,seq:0,type:'ContentDiscovered',sourceId:player.id,targetId:entity.id,payload:{definitionId:'mcp_fan'}};events.push(event);persistence.push({id:event.id,kind:'discovery',payload:/** @type {import('../../contracts.d.ts').Json} */(JSON.parse(JSON.stringify(event)))});
  }
  return {...reward.plan,changes,events,persistence};
}

/**
 * 检查附近敌人、在途攻击、事件危险和检查点规则，不靠暂停制造安全。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/geometry.js#distanceSquared
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @param {import('../../contracts.d.ts').Vec2} position
 * @returns {boolean}
 */
export function isSafeForInteraction(context, position) {
  const state = context.state;
  if (state.flow.phase !== 'exploring' || state.world.pressureEvents.some(event => event.phase === 'active' || event.phase === 'telegraph')) return false;
  const activeBoss = state.bosses.some(boss => { const entity = state.world.entities[boss.entityId]; return entity && !entity.dead && entity.hp > 0; });
  if (activeBoss) return false;
  if (Object.values(state.world.entities).some(entity => !entity.dead && !entity.dying && entity.team === 'enemy' && (entity.expiresAt === null || entity.expiresAt >= state.tick) && (entity.kind === 'projectile' || dependency1.distanceSquared(entity.position, position) <= 600 ** 2))) return false;
  return !state.world.spawnQueue.some(spawn => spawn.at <= state.tick + 300 && dependency1.distanceSquared(spawn.position, position) <= 800 ** 2);
}
