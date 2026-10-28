// @ts-check
import {createEmptyPlan,createStateChange} from './plans.js';
import {createEntityState} from './entities.js';
import {derivePlayerStats} from './stats.js';
import {normalizeVector,distanceSquared,intersectSweptCircles} from './geometry.js';
import {planShieldGrant} from './shields.js';
import {toJson} from './serialization.js';

/** One conditionally triggered automatic ability. No cast means no cooldown consumption.
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/shields.js#planShieldGrant
 * @calls domain/stats.js#derivePlayerStats
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {'rice'|'patch'|'cache'|'router'|'decoy'|'rocket'} kind
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planCompanionAbility(context,kind){
 const state=context.state,player=state.world.entities[state.player.entityId],companionId=`companion_${kind}`,id=`${companionId}:${state.tick}`;
 if(state.player.loadout.companionId!==companionId||state.player.loadout.companionCooldown>1e-9||player.statusIds.some(key=>state.world.statuses[key]?.kind==='companionBan'))return createEmptyPlan();
 const changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../contracts.d.ts').EffectRequest[]} */([]),cooldowns={rice:20,patch:24,cache:18,router:4,decoy:15,rocket:7};
 if(kind==='rice'){
  if(player.hp>=player.maxHp*.8)return createEmptyPlan();effects.push({id,sourceId:player.id,chainId:id,generation:0,kind:'heal',payload:{targetId:player.id,amount:4}});
 }else if(kind==='patch'){
  const removed=player.statusIds.filter(key=>['root','slow'].includes(state.world.statuses[key]?.kind));if(!removed.length)return createEmptyPlan();
  for(const key of removed)changes.push(createStateChange('world',key,'removeStatus',{}));changes.push(createStateChange('entity',player.id,'setStatusIds',{ids:player.statusIds.filter(key=>!removed.includes(key))}));if(removed.some(key=>state.world.statuses[key]?.kind==='root'))changes.push(createStateChange('player',player.id,'setControlImmune',{remaining:2}));
 }else if(kind==='cache')changes.push(...planShieldGrant(context,player.id,companionId,8,5).changes);
 else if(kind==='decoy'){
  const entity=createEntityState(id,'ability_decoy','decoy','neutral',player.position,{expiresAt:state.tick+180,runtime:{abilityKind:'companionDecoy',lureRadius:300,executeAt:state.tick+180}});changes.push(createStateChange('world',id,'putEntity',entity));
 }else{
  const range=kind==='router'?600:700,target=Object.values(state.world.entities).filter(e=>e.kind==='enemy'&&!e.dead&&!e.dying&&e.runtime.noRewardTarget!==true&&typeof e.runtime.sealStatusId!=='string'&&e.runtime.sealProjectile!==true&&distanceSquared(e.position,player.position)<=range**2).sort((a,b)=>distanceSquared(a.position,player.position)-distanceSquared(b.position,player.position)||(a.id<b.id?-1:1))[0];if(!target)return createEmptyPlan();
  const origin=state.world.entities['companion:equipped']?.position??player.position,angle=Math.atan2(target.position.y-origin.y,target.position.x-origin.x),output=derivePlayerStats(state,context.catalog).damageMultiplier;
  for(let n=0;n<(kind==='router'?2:1);n++){
   const theta=angle+(kind==='router'?(n-.5)*.12:0),speed=kind==='router'?380:350,projectileId=`${id}:${n}`,runtime=/** @type {Record<string,import('../contracts.d.ts').Json>} */({sourceKind:'companion',chainId:id,damage:(kind==='router'?8:16)*output,maxHits:1,hitTargetIds:[],critEligible:false});
   if(kind==='router'){runtime.homingTargetId=target.id;runtime.speed=speed;}else{runtime.weaponTemplate='mcp_batch';runtime.blastDamage=12*output;runtime.blastRadius=90;runtime.rocket=true;runtime.reflectable=false;}
   const shot=createEntityState(projectileId,'projectile_bubble','projectile','player',origin,{sourceId:player.id,attackId:projectileId,radius:kind==='router'?5:9,velocity:{x:Math.cos(theta)*speed,y:Math.sin(theta)*speed},expiresAt:state.tick+Math.ceil(range/speed*60),runtime});changes.push(createStateChange('world',projectileId,'putEntity',shot));
  }
 }
 changes.push(createStateChange('player',player.id,'setLoadout',{...state.player.loadout,companionCooldown:cooldowns[kind]*(state.start.treeNodeIds.includes('tree_explore_d')?.9:1)}));
 return {...createEmptyPlan(),changes,effects,events:[{id,runId:state.runId,tick:state.tick,seq:0,type:'CompanionActed',sourceId:player.id,targetId:null,payload:{companionId}}]};
}

/** Follow is cosmetic and nonblocking, and freezes together with abilities while banned.
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planCompanionFollow(context){
 const state=context.state,id=state.player.loadout.companionId,player=state.world.entities[state.player.entityId];if(!id||player.statusIds.some(key=>state.world.statuses[key]?.kind==='companionBan'))return createEmptyPlan();
 const current=state.world.entities['companion:equipped'],desired={x:Math.max(12,Math.min(state.world.map.width-12,player.position.x-46)),y:Math.max(12,Math.min(state.world.map.height-12,player.position.y+26))};
 if(!current)return {...createEmptyPlan(),changes:[createStateChange('world','companion:equipped','putEntity',createEntityState('companion:equipped',id,'companion','player',desired,{radius:12,runtime:{nonblocking:true}}))]};
 const d=normalizeVector({x:desired.x-current.position.x,y:desired.y-current.position.y}),distance=Math.sqrt(distanceSquared(desired,current.position)),step=Math.min(distance,320/60),position=distance>240?desired:{x:current.position.x+d.x*step,y:current.position.y+d.y*step};
 return {...createEmptyPlan(),changes:[createStateChange('entity',current.id,'setEntityRuntime',{runtime:{...current.runtime,visualFacing:Math.abs(position.x-current.position.x)>.01?Math.sign(position.x-current.position.x):Number(current.runtime.visualFacing??1)}}),createStateChange('entity',current.id,'setEntityKinematics',{position,previousPosition:current.position,velocity:{x:0,y:0},facingRadians:Math.atan2(d.y,d.x)})]};
}

/** Partner ban bullets can be shot down before contact; successful contact requests the normal control pipeline.
 * @calls domain/geometry.js#intersectSweptCircles
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planPartnerBanContact(context){
 const state=context.state,partner=state.world.entities['companion:equipped'],changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../contracts.d.ts').EffectRequest[]} */([]);
 for(const shot of Object.values(state.world.entities).filter(e=>e.runtime.sealProjectile===true&&!e.dead)){
  if(shot.expiresAt!==null&&shot.expiresAt<=state.tick){changes.push(createStateChange('world',shot.id,'removeEntity',{}));continue;}
  if(!partner||intersectSweptCircles(shot.previousPosition,shot.position,shot.radius,partner.position,partner.radius)===null)continue;
  const id=`${shot.id}:ban`;effects.push({id,sourceId:shot.sourceId,chainId:id,generation:0,kind:'control',payload:{id,sourceId:shot.sourceId,targetId:state.player.entityId,kind:'companionBan',baseDuration:10,baseRequiredInputs:3,appliedModifierIds:[]}});changes.push(createStateChange('world',shot.id,'removeEntity',{}));
 }
 return {...createEmptyPlan(),changes,effects};
}

/** Emit stable, reward-free rescue facts for actual quest evidence.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planCompanionMilestones(context,event){
 const state=context.state,player=state.world.entities[state.player.entityId],changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),rescued=[];
 if(event.type==='EntityDied'&&event.targetId&&(typeof state.world.entities[event.targetId]?.runtime.sealStatusId==='string'||state.world.entities[event.targetId]?.runtime.sealProjectile===true))rescued.push('companion_patch');
 if(event.type==='ResetCracked')rescued.push('companion_decoy');
 if(event.type==='ContentDiscovered'){
  const id=String(/** @type {{definitionId:string}} */(event.payload).definitionId);if(context.catalog.definitions[id]?.kind==='weapon'){
   const ids=[...new Set([...state.start.loadout.weapons.map(w=>w.definitionId),.../** @type {readonly string[]} */(player.runtime.discoveredWeaponIds??[]),id])];changes.push(createStateChange('entity',player.id,'setEntityRuntime',{runtime:{...player.runtime,discoveredWeaponIds:ids}}));if(ids.length>=2)rescued.push('companion_router');
  }
 }
 if(event.type==='CacheOpened'){
  const p=/** @type {{cacheId:string;secret:boolean}} */(event.payload);if(p.secret){const ids=[...new Set([.../** @type {readonly string[]} */(player.runtime.secretCacheIds??[]),p.cacheId])];changes.push(createStateChange('entity',player.id,'setEntityRuntime',{runtime:{...player.runtime,secretCacheIds:ids}}));if(ids.length>=2)rescued.push('companion_cache');}
 }
 const events=rescued.map(companionId=>({id:`rescue:${companionId}`,runId:state.runId,tick:state.tick,seq:0,type:'CompanionRescued',sourceId:player.id,targetId:null,payload:{companionId}}));
 return {...createEmptyPlan(),changes,events,persistence:events.map(e=>({id:e.id,kind:'discovery',payload:toJson(e)}))};
}
