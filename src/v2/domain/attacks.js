// @ts-check
import{resolveSkillPreparation}from'./pluginStats.js';
import { planWeaponPickup,planSkillPickup } from './equipment.js';
import { planProjectileBurst } from './projectiles.js';
import { planTreeWeaponSwitch } from './treeRuntime.js';
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
  const temperature=state.plugins.find(p=>p.id==='plugin_temperature');
  const plan = dependency2.dispatchWeaponsHandler(context, weapon.definitionId);
  if(temperature)for(const change of plan.changes){if(change.operation!=='putEntity')continue;const shot=/** @type {{kind?:string;id?:string;radius?:number;runtime?:Record<string,import('../contracts.d.ts').Json>}} */(change.payload);if(shot.kind!=='projectile'||!shot.runtime)continue;let n=2166136261;for(const c of String(shot.id))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;if((n%1000)/1000>=(temperature.rank===1?.3:.45))continue;const kind=n%4;if(kind===0){shot.runtime.damage=Number(shot.runtime.damage)*1.8;shot.radius=Number(shot.radius)*1.6;}else if(kind===1){const foe=Object.values(state.world.entities).filter(e=>e.kind==='enemy'&&!e.dead).sort((a,b)=>a.id<b.id?-1:1)[0];if(foe){shot.runtime.homingTargetId=foe.id;shot.runtime.speed=480;}}else if(kind===2){shot.runtime.returnPhase='outbound';shot.runtime.returnOrigin={...state.world.entities[state.player.entityId].position};shot.runtime.returnDistance=280;shot.runtime.returnMaxDistance=420;shot.runtime.speed=420;}else shot.runtime.healOnHit=temperature.rank===1?2:4;}
  const player = state.world.entities[state.player.entityId];
  const consumed = player.runtime.treeSwitchShot === true ? [createStateChange('entity', player.id, 'setEntityRuntime', { runtime: { ...player.runtime, treeSwitchShot: false } })] : [];
  return { ...plan, changes: [...plan.changes, ...consumed, createStateChange('player', state.player.entityId, 'setLoadout', { ...state.player.loadout, weapons: state.player.loadout.weapons.map(item => item.instanceId === weapon.instanceId ? { ...item, cooldown: stats.interval } : item) })] };
}

/**
 * 检验控制/封禁/冷却后派发主动技能，成功才生成SkillCast事件。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls dispatch/skills.js#dispatchSkillsHandler
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/pluginStats.js#resolveSkillPreparation
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').AttackContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planSkillCast(context) {
  const state = context.state, player = state.world.entities[state.player.entityId];
  if (state.player.loadout.skillCooldown > 0 || player.statusIds.some(id => state.world.statuses[id]?.kind === 'skillBan')) return createEmptyPlan();
  const preparation=resolveSkillPreparation(state),power=preparation.power*Number(context.catalog.definitions[state.player.loadout.skillId]?.parameters.powerMultiplier??1);
  const plan = dependency1.dispatchSkillsHandler({...context,skillPower:power,skillDuration:preparation.duration,skillPush:preparation.push}, state.player.loadout.skillId);
  const cooldown = Number(context.catalog.definitions[state.player.loadout.skillId]?.parameters.cooldown);
  if (!Number.isFinite(cooldown) || cooldown < 1) throw new Error('Invalid equipped skill cooldown');
  return { ...plan, changes: [...plan.changes,createStateChange('entity',player.id,'setEntityRuntime',{runtime:{...player.runtime,skillReadySince:null,lastSkillCastAt:state.tick}}), createStateChange('player', player.id, 'setLoadout', { ...state.player.loadout, skillCooldown: cooldown * (state.start.treeNodeIds.includes('tree_skill_a') ? 0.96 : 1) * (state.start.treeNodeIds.includes('tree_skill_e') ? 0.94 : 1) })], events: [...plan.events, { id: `skill:${state.tick}`, runId: state.runId, tick: state.tick, seq: 0, type: 'SkillCast', sourceId: player.id, targetId: null, payload: { skillId: state.player.loadout.skillId,effects:toJson(plan.effects),power,duration:preparation.duration } }] };
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
    createStateChange('player', player.id, 'setLoadout', { ...state.player.loadout, dashCooldown: 3 * (state.start.treeNodeIds.includes('tree_skill_c') ? 0.95 : 1) }),
    createStateChange('player', player.id, 'setInvulnerable', { remaining: Math.max(0.18, state.player.invulnerableRemaining) }),
  ],events:[{id:`dash:${state.tick}`,runId:state.runId,tick:state.tick,seq:0,type:'DashStarted',sourceId:player.id,targetId:null,payload:{}}] };
}

/**
 * 切枪/换技能/地面实例交换，遵守冷却继承，不重复产装备。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/equipment.js#planSkillPickup
 * @calls domain/equipment.js#planWeaponPickup
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/treeRuntime.js#planTreeWeaponSwitch
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').Command} command
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planLoadoutChange(context, command) {
  const state = context.state;
  if(command.type==='EquipSkillPickup')return planSkillPickup(context,String(/** @type {{pickupId:string}} */(command.payload).pickupId));
  if(command.type==='EquipPickup'){const p=/** @type {{pickupId:string;slotIndex:number}} */(command.payload);return planWeaponPickup(context,p.pickupId,p.slotIndex);}
  if (command.type !== 'SwitchWeapon') throw new Error('Ground equipment swaps are not available in the combat preview');
  const player = state.world.entities[state.player.entityId];
  if (Number(player.runtime.switchReadyAt ?? 0) > state.tick || state.player.loadout.weapons.length < 2) return createEmptyPlan();
  const treePlan = planTreeWeaponSwitch(context), runtime = treePlan.changes.find(change => change.operation === 'setEntityRuntime')?.payload;
  const mergedRuntime = runtime && typeof runtime === 'object' && !Array.isArray(runtime) ? /** @type {Record<string,import('../contracts.d.ts').Json>} */(runtime).runtime : player.runtime;
  return { ...treePlan,events:[{id:`switch:${state.tick}`,runId:state.runId,tick:state.tick,seq:0,type:'WeaponSwitched',sourceId:player.id,targetId:null,payload:{}}], changes: [...treePlan.changes.filter(change => change.operation !== 'setEntityRuntime'), createStateChange('player', player.id, 'setLoadout', { ...state.player.loadout, activeWeaponIndex: (state.player.loadout.activeWeaponIndex + 1) % state.player.loadout.weapons.length }), createStateChange('entity', player.id, 'setEntityRuntime', { runtime: { .../** @type {Record<string,import('../contracts.d.ts').Json>} */(mergedRuntime), switchReadyAt: state.tick + 18 } })] };
}

/**
 * 将碰撞翻译为唯一伤害/控制/拾取请求，不直接递归结算。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @implementationScope core-preview
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/projectiles.js#planProjectileBurst
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').CollisionResult} collisions
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planCollisionEffects(context, collisions) {
 const state=context.state,changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../contracts.d.ts').EffectRequest[]} */([]);
 const local=new Map();
 for(const collision of collisions.hits){
  const projectile=state.world.entities[collision.sourceId],target=state.world.entities[collision.targetId];if(!projectile||!target||projectile.runtime.exhausted===true)continue;
  const progress=local.get(projectile.id)??{hits:/** @type {string[]} */([.../** @type {readonly string[]} */(projectile.runtime.hitTargetIds??[])]),exhausted:false,stop:false,turnAt:/** @type {import('../contracts.d.ts').Vec2|null} */(null)};
  if(progress.exhausted||progress.stop||progress.hits.includes(target.id))continue;
  const time=collision.timeOfImpact,impact={x:projectile.previousPosition.x+(projectile.position.x-projectile.previousPosition.x)*time,y:projectile.previousPosition.y+(projectile.position.y-projectile.previousPosition.y)*time};
  if(target.kind==='obstacle'){
    if(projectile.runtime.returnPhase==='outbound'){progress.stop=true;progress.turnAt={x:impact.x-collision.incomingDirection.x,y:impact.y-collision.incomingDirection.y};}
    else progress.exhausted=true;
  }else{
    progress.hits.push(target.id);const atImpact={x:target.previousPosition.x+(target.position.x-target.previousPosition.x)*time,y:target.previousPosition.y+(target.position.y-target.previousPosition.y)*time};
    const request={id:`damage:${projectile.attackId}:${target.id}`,sourceId:projectile.sourceId,creditOwner:projectile.creditOwner,sourceKind:projectile.runtime.sourceKind??'weapon_primary',attackId:projectile.attackId,projectileId:projectile.id,targetId:target.id,baseDamage:Number(projectile.runtime.damage),contact:{x:target.position.x+collision.contact.x-atImpact.x,y:target.position.y+collision.contact.y-atImpact.y},incomingDirection:collision.incomingDirection,generation:0,chainId:String(projectile.runtime.chainId),critEligible:projectile.runtime.critEligible===true,expiresAt:projectile.expiresAt};
    effects.push({id:request.id,sourceId:request.sourceId,chainId:request.chainId,generation:0,kind:'damage',payload:toJson(request)});
    progress.exhausted=progress.hits.length>=Number(projectile.runtime.maxHits??1);
  }
  if(projectile.runtime.weaponTemplate==='mcp_batch'){const burst=planProjectileBurst(context,projectile,impact);changes.push(...burst.changes);effects.push(...burst.effects);progress.exhausted=true;}
  local.set(projectile.id,progress);
 }
 for(const [id,progress]of local){const projectile=state.world.entities[id];changes.push(createStateChange('entity',id,'setEntityRuntime',{runtime:{...projectile.runtime,hitTargetIds:progress.hits,exhausted:progress.exhausted,...(progress.turnAt?{returnPhase:'turnPending'}:{})}}));if(progress.turnAt)changes.push(createStateChange('entity',id,'setEntityKinematics',{position:progress.turnAt,previousPosition:progress.turnAt,velocity:projectile.velocity,facingRadians:projectile.facingRadians}));}
 return {...createEmptyPlan(),changes,effects};
}
