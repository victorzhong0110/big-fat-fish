// @ts-check
import{createEmptyPlan,createStateChange,mergeSystemPlans}from'./plans.js';
import{createEntityState}from'./entities.js';
import{derivePlayerStats}from'./stats.js';
import{deriveRawWeaponStats}from'./pluginStats.js';
import{createWeaponProjectile}from'./projectiles.js';
import{resolveWeaponTemplate}from'../content/weaponCapabilities.js';
import{distanceSquared,normalizeVector}from'./geometry.js';
import{resolveBodyDestination}from'./motionSolver.js';
import{planAbilityDamage}from'./abilities.js';
import{planShieldGrant}from'./shields.js';
import{scheduleAbilityActions}from'./scheduled.js';
import{toJson}from'./serialization.js';

/** @param {import('../contracts.d.ts').EvaluationContext} c @param {import('../contracts.d.ts').Vec2} point @param {number} range @param {readonly string[]} excluded */
function nearest(c,point,range=10000,excluded=[]){return Object.values(c.state.world.entities).filter(e=>e.kind==='enemy'&&!e.dead&&!e.dying&&e.runtime.noAi!==true&&!excluded.includes(e.id)&&distanceSquared(e.position,point)<=range**2).sort((a,b)=>distanceSquared(a.position,point)-distanceSquared(b.position,point)||(a.id<b.id?-1:1))[0];}
/** @param {import('../contracts.d.ts').EvaluationContext} c @param {string} id @param {import('../contracts.d.ts').Vec2} point @param {number} amount @param {string} chain @param {string|null} targetId @param {number} maxHits @param {number} angle */
function bubble(c,id,point,amount,chain,targetId=null,maxHits=1,angle=Math.atan2(c.state.input.aim.y,c.state.input.aim.x)){
 return createEntityState(id,'projectile_bubble','projectile','player',point,{sourceId:c.state.player.entityId,attackId:id,radius:6,velocity:{x:Math.cos(angle)*450,y:Math.sin(angle)*450},expiresAt:c.state.tick+180,runtime:{damage:amount,sourceKind:'plugin_secondary',chainId:chain,maxHits,hitTargetIds:[],critEligible:false,...(targetId?{homingTargetId:targetId,speed:450}:{})}});
}
/** @param {import('../contracts.d.ts').EvaluationContext} c @param {string} targetId @param {number} amount @param {string} id @param {string} chain */
function damage(c,targetId,amount,id,chain){const target=c.state.world.entities[targetId];return{id,sourceId:c.state.player.entityId,chainId:chain,generation:0,kind:'damage',payload:toJson({id,sourceId:c.state.player.entityId,creditOwner:'player',sourceKind:'plugin_secondary',attackId:id,projectileId:null,targetId,baseDamage:amount,contact:target.position,incomingDirection:{x:0,y:0},generation:0,chainId:chain,critEligible:false,expiresAt:c.state.tick+1})};}

/** Apply actual native events to plugin counters and queued actions. Secondary events cannot become native casts.
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/abilities.js#planAbilityDamage
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/motionSolver.js#resolveBodyDestination
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/plans.js#mergeSystemPlans
 * @calls domain/pluginStats.js#deriveRawWeaponStats
 * @calls domain/projectiles.js#createWeaponProjectile
 * @calls domain/scheduled.js#scheduleAbilityActions
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @param {string|null} onlyId
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planCombatPluginEvent(context,event,onlyId=null){
 const state=context.state,player=state.world.entities[state.player.entityId],current=state.player.loadout.weapons[state.player.loadout.activeWeaponIndex],raw=deriveRawWeaponStats(state,current,context.catalog),output=derivePlayerStats(state,context.catalog).damageMultiplier,p=/** @type {Record<string,import('../contracts.d.ts').Json>} */(event.payload??{}),target=event.targetId?state.world.entities[event.targetId]:null;
 const plugins=state.plugins.map(plugin=>({...plugin,runtime:{...plugin.runtime}})),changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../contracts.d.ts').EffectRequest[]} */([]),extra=/** @type {import('../contracts.d.ts').SystemPlan[]} */([]);
 let changed=false,modifiers=[...state.player.modifiers],modChanged=false,loadout={...state.player.loadout},loadChanged=false;
 const nativeShot=event.type==='WeaponFired'&&event.sourceId===player.id,nativeSkill=event.type==='SkillCast'&&event.sourceId===player.id,primaryHit=event.type==='DamageResolved'&&p.sourceKind==='weapon_primary'&&Number(p.hpDamage??0)+Number(p.shellDamage??0)>0&&target?.team==='enemy'&&target.runtime.noRewardTarget!==true&&target.runtime.sealProjectile!==true&&typeof target.runtime.sealStatusId!=='string';
 if(nativeShot&&!onlyId)changes.push(createStateChange('entity',player.id,'setEntityRuntime',{runtime:{...player.runtime,lastShotAt:state.tick}}));
 for(const plugin of plugins){
  if(onlyId&&plugin.id!==onlyId)continue;const rt=plugin.runtime,rank=plugin.rank,id=`${plugin.id}:${event.id}`,ready=Number(rt.readyAt??0)<=state.tick;
  if(plugin.id==='plugin_cache'&&primaryHit){rt.hits=rt.targetId===target?.id&&Number(rt.until??0)>state.tick?Number(rt.hits??0)+1:1;rt.targetId=target?.id??null;rt.until=state.tick+120;changed=true;}
  if((plugin.id==='plugin_batch'||plugin.id==='plugin_chain')&&primaryHit){rt.hits=Number(rt.hits??0)+1;rt.point={.../** @type {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} */(target).position};rt.targetId=target?.id??null;changed=true;}
  if(plugin.id==='plugin_sandbox'&&primaryHit&&target){changes.push(createStateChange('entity',target.id,'setEntityRuntime',{runtime:{...target.runtime,pluginSlowUntil:state.tick+(rank===1?72:120)}}));}
  if(plugin.id==='plugin_redirect'&&primaryHit&&target){
   const shot=typeof p.attackId==='string'?state.world.entities[p.attackId]:null,template=shot?.runtime.weaponTemplate??resolveWeaponTemplate(context.catalog,current.definitionId);
   if(shot&&Number(shot.runtime.maxHits??1)===1&&!['mcp_vector','mcp_return'].includes(String(template))){const list=/** @type {readonly string[]} */(rt.forwarded??[]);if(!list.includes(String(p.attackId))){rt.forwarded=[...list.slice(-127),String(p.attackId)];changed=true;const next=nearest(context,target.position,rank===1?180:260,[target.id]);if(next)changes.push(createStateChange('world',id,'putEntity',bubble(context,id,target.position,Number(shot.runtime.rawW??raw.damage)*.5*output,event.id,next.id)));}}
  }
  if(plugin.id==='plugin_retry'&&event.type==='PrimaryProjectileExpired'&&ready){const point=/** @type {import('../contracts.d.ts').Vec2} */(p.position),enemy=nearest(context,point,450);if(enemy){changes.push(createStateChange('world',id,'putEntity',bubble(context,id,point,Number(p.rawW)*(rank===1?.5:.8)*output,event.id,enemy.id)));rt.readyAt=state.tick+90;changed=true;}}
  if(plugin.id==='plugin_backoff'&&event.type==='DamageResolved'&&event.targetId===player.id&&Number(p.hpDamage)>0&&ready){modifiers=[...modifiers.filter(m=>m.id!=='plugin:backoff'),{id:'plugin:backoff',sourceId:plugin.id,stat:'moveSpeed',operation:'add',value:state.player.baseStats.moveSpeed*(rank===1?.25:.35),expiresAt:state.tick+120}];modChanged=true;rt.readyAt=state.tick+240;changed=true;}
  if(plugin.id==='plugin_toolchain'&&nativeSkill){rt.charges=rank===1?3:5;changed=true;}
  if(plugin.id==='plugin_toolchain'&&nativeShot&&Number(rt.charges??0)>0){const enemy=nearest(context,player.position,900);if(enemy){changes.push(createStateChange('world',id,'putEntity',bubble(context,id,player.position,raw.damage*.75*output,event.id,enemy.id)));rt.charges=Number(rt.charges)-1;changed=true;}}
  if(plugin.id==='plugin_hallucination'&&nativeSkill&&ready){const duration=rank===1?180:300;changes.push(createStateChange('world',id,'putEntity',createEntityState(id,'ability_decoy','decoy','neutral',player.position,{expiresAt:state.tick+duration,runtime:{abilityKind:'companionDecoy',lureRadius:350,executeAt:state.tick+duration}})));rt.readyAt=state.tick+600;changed=true;}
  if(plugin.id==='plugin_hotplug'&&(event.type==='WeaponSwitched'||event.type==='EquipmentEquipped'&&context.catalog.definitions[String(p.definitionId)]?.kind==='weapon'&&Number(p.slotIndex)===loadout.activeWeaponIndex)&&ready){extra.push(planAbilityDamage(context,id,player.position,160,(rank===1?25:40)*output,'plugin_secondary'));for(const e of Object.values(state.world.entities).filter(e=>e.kind==='enemy'&&!e.dead&&e.runtime.noAi!==true&&!state.bosses.some(b=>b.entityId===e.id)&&distanceSquared(e.position,player.position)<=160**2)){const d=normalizeVector({x:e.position.x-player.position.x,y:e.position.y-player.position.y}),position=resolveBodyDestination(context,e,{x:e.position.x+d.x*80,y:e.position.y+d.y*80});changes.push(createStateChange('entity',e.id,'setEntityKinematics',{position,previousPosition:position,velocity:e.velocity,facingRadians:e.facingRadians}));}rt.readyAt=state.tick+360;changed=true;}
  if(plugin.id==='plugin_speculate'&&event.type==='DashStarted'){rt.until=state.tick+60;rt.charged=true;changed=true;}
  if(plugin.id==='plugin_speculate'&&nativeShot&&rt.charged===true&&Number(rt.until)>=state.tick){for(let n=0;n<3;n++){const shotId=`${id}:${n}`,angle=Math.atan2(state.input.aim.y,state.input.aim.x)+(n-1)*Math.PI/12;changes.push(createStateChange('world',shotId,'putEntity',bubble(context,shotId,player.position,raw.damage*(rank===1?.6:.9)*output,event.id,null,2,angle)));}rt.charged=false;changed=true;}
  if(plugin.id==='plugin_moe'&&nativeShot&&loadout.weapons.length>1){rt.shots=Number(rt.shots??0)+1;const threshold=rank===1?4:3;if(Number(rt.shots)>=threshold){rt.shots=Number(rt.shots)-threshold;const other=loadout.weapons[(loadout.activeWeaponIndex+1)%loadout.weapons.length],stats=deriveRawWeaponStats(state,other,context.catalog),angle=Math.atan2(state.input.aim.y,state.input.aim.x);for(let n=0;n<stats.pellets;n++){const theta=angle+(stats.pellets===1?0:(n/(stats.pellets-1)-.5)*stats.spreadRadians),shotId=`${id}:${n}`;changes.push(createStateChange('world',shotId,'putEntity',createWeaponProjectile(context,other,stats,theta,shotId,event.id,'plugin_secondary',stats.damage*.45*output)));}}changed=true;}
  if(plugin.id==='plugin_window'&&event.type==='PickupCollected'&&p.kind==='riceXp'){const sum=Number(rt.tokens??0)+Number(p.amount),threshold=rank===1?120:90;rt.pending=Number(rt.pending??0)+Math.floor(sum/threshold);rt.tokens=sum%threshold;changed=true;}
  if(plugin.id==='plugin_agent'){
   if(event.type==='CompanionActed'&&Number(rt.toSkillAt??0)<=state.tick){loadout.skillCooldown=Math.max(0,loadout.skillCooldown-(rank===1?1.5:2.5));loadChanged=true;rt.toSkillAt=state.tick+240;changed=true;}
   if(nativeSkill&&Number(rt.toCompanionAt??0)<=state.tick){loadout.companionCooldown=Math.max(0,loadout.companionCooldown-2);loadChanged=true;rt.toCompanionAt=state.tick+240;changed=true;}
  }
  if(plugin.id==='plugin_mirror'&&event.type==='CompanionActed'&&ready){
   const companionId=String(p.companionId),multiplier=rank===1?.4:.6,actions=/** @type {import('../contracts.d.ts').ScheduledAction[]} */([]);
   if(companionId==='companion_rice')actions.push({kind:'heal',amount:4*multiplier});
   else if(companionId==='companion_cache')actions.push({kind:'shield',amount:8*multiplier,duration:5,sourceId:plugin.id});
   else if(companionId==='companion_decoy')actions.push({kind:'extend',entityId:`companion_decoy:${state.tick}`,duration:rank===1?60:120});
   else if(['companion_router','companion_rocket'].includes(companionId)){const shots=Object.values(state.world.entities).filter(e=>e.id.startsWith(`${companionId}:${state.tick}:`)&&e.kind==='projectile').map(e=>structuredClone(e));if(shots.length)actions.push({kind:'shots',entities:shots,multiplier});}
   if(actions.length){extra.push(scheduleAbilityActions(context,id,18,actions,player.position));rt.readyAt=state.tick+300;changed=true;}
  }
  if(plugin.id==='plugin_recursion'&&nativeSkill&&ready){
   const skill=String(p.skillId),multiplier=rank===1?.6:.85,field=state.world.entities[`ability:${skill.slice(6)}:${state.tick}`],actions=/** @type {import('../contracts.d.ts').ScheduledAction[]} */([]);
   if(skill==='skill_batch'&&field)actions.push({kind:'area',point:{...field.position},radius:130,amount:Number(field.runtime.damage)*multiplier});
   else if(skill==='skill_cache')actions.push({kind:'shield',amount:25*Number(p.power??1)*multiplier,duration:5,sourceId:plugin.id});
   else if(skill==='skill_sandbox'&&field)actions.push({kind:'zone',point:{...field.position},radius:160,duration:Math.round((Number(field.runtime.executeAt)-state.tick)*multiplier)});
   else if(skill==='skill_rollback'){for(const effect of /** @type {readonly import('../contracts.d.ts').EffectRequest[]} */(JSON.parse(JSON.stringify(p.effects??[]))))if(effect.kind==='heal')actions.push({kind:'heal',amount:Number(/** @type {{amount:number}} */(effect.payload).amount)*multiplier});}
   else if(field)changes.push(createStateChange('entity',field.id,'setEntityExpiry',{expiresAt:Number(field.expiresAt)+Math.round((Number(field.runtime.executeAt)-state.tick)*(rank===1?.4:.6))}),createStateChange('entity',field.id,'setEntityRuntime',{runtime:{...field.runtime,executeAt:Number(field.runtime.executeAt)+Math.round((Number(field.runtime.executeAt)-state.tick)*(rank===1?.4:.6))}}));
   else if(skill==='skill_overclock'){modifiers=modifiers.map(m=>m.sourceId==='skill_overclock'&&m.expiresAt!==null?{...m,expiresAt:m.expiresAt+Math.round((m.expiresAt-state.tick)*(rank===1?.4:.6))}:m);modChanged=true;}
   if(actions.length)extra.push(scheduleAbilityActions(context,id,48,actions,field?.position??player.position,field?.radius??12));if(actions.length||field||skill==='skill_overclock'){rt.readyAt=state.tick+720;changed=true;}
  }
 }
 if(changed)changes.push(createStateChange('progression','plugins','setPlugins',{plugins}));if(modChanged)changes.push(createStateChange('player',player.id,'setPlayerModifiers',{modifiers:modifiers.map(m=>({...m}))}));if(loadChanged)changes.push(createStateChange('player',player.id,'setLoadout',loadout));
 return mergeSystemPlans([{...createEmptyPlan(),changes,effects},...extra]);
}

/** Advance world-time-only counters, independent internal cooldowns and delayed token triggers.
 * @calls domain/abilities.js#planAbilityDamage
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/plans.js#mergeSystemPlans
 * @calls domain/serialization.js#toJson
 * @calls domain/shields.js#planShieldGrant
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').EvaluationContext} context @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planCombatPluginWorld(context){
 const state=context.state,player=state.world.entities[state.player.entityId],plugins=state.plugins.map(p=>({...p,runtime:{...p.runtime}})),changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../contracts.d.ts').EffectRequest[]} */([]),extra=/** @type {import('../contracts.d.ts').SystemPlan[]} */([]),output=derivePlayerStats(state,context.catalog).damageMultiplier;
 let changed=false,loadout={...state.player.loadout},loadChanged=false;
 for(const plugin of plugins){const rt=plugin.runtime,rank=plugin.rank,id=`${plugin.id}:world:${state.tick}`;
  if(plugin.id==='plugin_context'){if(state.input.firing){rt.firingTicks=Number(rt.firingTicks??0)+1;rt.idleTicks=0;}else{rt.idleTicks=Number(rt.idleTicks??0)+1;if(Number(rt.idleTicks)>=60)rt.firingTicks=0;}changed=true;}
  if(plugin.id==='plugin_cooldown'&&state.tick-Number(player.runtime.lastShotAt??0)>=180){loadout.skillCooldown=Math.max(0,loadout.skillCooldown-(rank===1?.5:.8)/60);loadChanged=true;}
  if(plugin.id==='plugin_keepalive'){if(rt.readyAt===undefined){rt.readyAt=state.tick+(rank===1?720:540);changed=true;}else if(Number(rt.readyAt)<=state.tick){extra.push(planShieldGrant(context,player.id,plugin.id,6,4));rt.readyAt=state.tick+(rank===1?720:540);changed=true;}}
  if(plugin.id==='plugin_offload'&&Number(player.runtime.dashUntil??0)===state.tick){const field=createEntityState(id,'plugin_field','objective','neutral',player.position,{radius:75,expiresAt:state.tick+120,runtime:{abilityKind:'trail',nextAt:state.tick+30,hits:{},damage:(rank===1?5:8)*output}});changes.push(createStateChange('world',id,'putEntity',field));}
  if(plugin.id==='plugin_window'&&Number(rt.pending??0)>0){rt.pending=Number(rt.pending)-1;changed=true;loadout.skillCooldown=Math.max(0,loadout.skillCooldown-3);loadChanged=true;const target=nearest(context,player.position);if(target)changes.push(createStateChange('world',id,'putEntity',bubble(context,id,player.position,25*output,id,target.id)));}
  if(['plugin_batch','plugin_chain'].includes(plugin.id)&&Number(rt.hits??0)>=(plugin.id==='plugin_batch'?rank===1?8:6:rank===1?6:4)&&Number(rt.readyAt??0)<=state.tick){
   rt.hits=Number(rt.hits)-(plugin.id==='plugin_batch'?rank===1?8:6:rank===1?6:4);rt.readyAt=state.tick+(plugin.id==='plugin_batch'?30:60);changed=true;const point=/** @type {import('../contracts.d.ts').Vec2} */(rt.point??player.position);
   if(plugin.id==='plugin_batch')extra.push(planAbilityDamage(context,id,point,85,18*output,'plugin_secondary'));
   else{let at=point,excluded=/** @type {string[]} */([]);for(let n=0;n<3;n++){const target=n===0&&typeof rt.targetId==='string'&&state.world.entities[rt.targetId]&&!state.world.entities[rt.targetId].dead?state.world.entities[rt.targetId]:nearest(context,at,180,excluded);if(!target)break;excluded.push(target.id);effects.push(damage(context,target.id,12*output,`${id}:${n}`,id));at=target.position;}}
  }
 }
 for(const field of Object.values(state.world.entities).filter(e=>e.runtime.abilityKind==='trail')){
  const hits=/** @type {Record<string,number>} */(field.runtime.hits??{}),next={...hits};if(Number(field.runtime.nextAt)<=state.tick){for(const target of Object.values(state.world.entities).filter(e=>e.kind==='enemy'&&!e.dead&&distanceSquared(e.position,field.position)<=(field.radius+e.radius)**2)){if((next[target.id]??0)>=4)continue;next[target.id]=(next[target.id]??0)+1;effects.push(damage(context,target.id,Number(field.runtime.damage),`${field.id}:${target.id}:${next[target.id]}`,field.id));}changes.push(createStateChange('entity',field.id,'setEntityRuntime',{runtime:{...field.runtime,hits:next,nextAt:state.tick+30}}));}
  if(field.expiresAt!==null&&field.expiresAt<=state.tick)changes.push(createStateChange('world',field.id,'removeEntity',{}));
 }
 if(changed)changes.push(createStateChange('progression','plugins','setPlugins',{plugins}));if(loadChanged)changes.push(createStateChange('player',player.id,'setLoadout',loadout));
 return mergeSystemPlans([{...createEmptyPlan(),changes,effects},...extra]);
}
