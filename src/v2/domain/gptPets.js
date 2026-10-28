// @ts-check
import {canCloseMapPassage,chooseRetreatPoint,findNavigationPath} from './navigation.js';
import {createEmptyPlan,createStateChange,mergeSystemPlans} from './plans.js';
import {createEntityState} from './entities.js';
import {resolvePetStage} from './modelProfiles.js';
import {planMeleeEnemy} from './meleeAi.js';
import {selectAbilityTarget} from './abilities.js';
import {distanceSquared,normalizeVector} from './geometry.js';
import {resolveBodyDestination} from './motionSolver.js';
import {toJson} from './serialization.js';

/** @param {import('../contracts.d.ts').EvaluationContext} c @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} owner @param {import('../contracts.d.ts').Vec2} point @param {string} id @param {number} amount @param {number} speed @param {number} offset */
function shot(c,owner,point,id,amount,speed,offset=0){const a=Math.atan2(point.y-owner.position.y,point.x-owner.position.x)+offset;return createStateChange('world',id,'putEntity',createEntityState(id,'projectile_bubble','projectile','enemy',owner.position,{sourceId:owner.id,attackId:id,radius:6,velocity:{x:Math.cos(a)*speed,y:Math.sin(a)*speed},expiresAt:c.state.tick+Math.ceil(1000/speed*60),runtime:{sourceKind:'enemy',chainId:id,damage:amount*Number(owner.runtime.damageMultiplier??1),maxHits:1,hitTargetIds:[],critEligible:false,reflectable:true}}));}
/** @param {import('../contracts.d.ts').EvaluationContext} c @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} owner @param {'fire'|'vine'} kind @param {import('../contracts.d.ts').Vec2} point @param {string} id @param {boolean} aftershock */
function zone(c,owner,kind,point,id,aftershock=false){const stage=resolvePetStage(owner),core=kind==='vine'||stage>=2,duration=kind==='vine'?240:stage>=2?240:180;return createStateChange('world',id,'putEntity',createEntityState(id,core?'gpt_core':'gpt_zone',core?'enemy':'objective',core?'enemy':'neutral',point,{sourceId:owner.id,radius:core?12:kind==='fire'?70:65,hp:core?10:1,maxHp:core?10:1,expiresAt:c.state.tick+60+duration,runtime:{petZone:kind,zoneRadius:kind==='fire'?70:65,activeAt:c.state.tick+60,nextDamageAt:c.state.tick+60,bornAt:c.state.tick,stage,noAi:true,noRewardTarget:true,aftershock,spawnGroup:String(owner.runtime.spawnGroup??''),wave:id.split(':zone:')[0],untargetable:!core}}));}
/** @param {import('../contracts.d.ts').EvaluationContext} c @param {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} e @param {string} id @param {number} duration */
function auxiliary(c,e,id,duration){return createStateChange('world',id,'putEntity',createEntityState(id,'gpt_decoy','enemy','enemy',e.position,{sourceId:e.id,radius:14,hp:8,maxHp:8,expiresAt:c.state.tick+duration,runtime:{noAi:true,noRewardTarget:true,auxiliary:true}}));}

/** Seven separate Pet roles share bounded telegraph scheduling, never copy seven scripts onto one species.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/abilities.js#selectAbilityTarget
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @calls domain/meleeAi.js#planMeleeEnemy
 * @calls domain/modelProfiles.js#resolvePetStage
 * @calls domain/motionSolver.js#resolveBodyDestination
 * @calls domain/navigation.js#chooseRetreatPoint
 * @calls domain/navigation.js#findNavigationPath
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {'codex'|'dewey'|'fireball'|'hoots'|'rocky'|'seedy'|'stacky'} kind
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planGptPet(context,kind){
 const state=context.state,entity=context.entityId?state.world.entities[context.entityId]:null;if(!entity||entity.dead||entity.dying)return createEmptyPlan();const player=selectAbilityTarget(state,entity),distance=Math.sqrt(distanceSquared(entity.position,player.position)),stage=resolvePetStage(entity),support=kind==='rocky'&&state.start.difficulty.mechanicIds.includes('mech_03_gpt_support')&&Number(entity.runtime.guardHp)>0?Object.values(state.world.entities).filter(e=>['enemy_gpt_dewey','enemy_gpt_hoots','enemy_gpt_seedy'].includes(e.definitionId)&&!e.dead&&distanceSquared(entity.position,e.position)<=350**2).sort((a,b)=>distanceSquared(entity.position,a.position)-distanceSquared(entity.position,b.position)||(a.id<b.id?-1:1))[0]:null,guardDirection=support?normalizeVector({x:player.position.x-support.position.x,y:player.position.y-support.position.y}):null,base=planMeleeEnemy(support&&guardDirection?{...context,movementGoal:{x:support.position.x+guardDirection.x*70,y:support.position.y+guardDirection.y*70}}:context,false),changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../contracts.d.ts').EffectRequest[]} */([]),runtime={...entity.runtime,.../** @type {{runtime:Record<string,import('../contracts.d.ts').Json>}|undefined} */(base.changes.find(c=>c.operation==='setEntityRuntime')?.payload)?.runtime},id=`pet:${entity.id}:${state.tick}`;
 if(state.start.difficulty.mechanicIds.includes('mech_09_gpt_reposition')&&['dewey','hoots','seedy'].includes(kind)&&distance<120&&!runtime.petCast&&!runtime.retreatPoint&&state.tick>=Number(runtime.repositionReadyAt??0)){const point=chooseRetreatPoint(context,entity.id,180);if(point){runtime.retreatPoint=point;runtime.retreatRoute=findNavigationPath(context,{entityId:entity.id,origin:entity.position,destination:point,collisionProfileId:entity.collisionProfileId}).path.map(p=>({...p}));runtime.petReadyAt=Math.max(Number(runtime.petReadyAt??0),state.tick+90);runtime.repositionReadyAt=state.tick+360;}}
 if(distance>700&&runtime.engaged!==true&&entity.hp===entity.maxHp)return base;
 runtime.engaged=true;
 const cast=/** @type {{executeAt:number;point:import('../contracts.d.ts').Vec2;targets?:string[];index:number;total:number}|null} */(runtime.petCast??null),cooldown={codex:180,dewey:300,fireball:300,hoots:240,rocky:0,seedy:360,stacky:240}[kind];let stopped=!['rocky','codex','dewey','fireball'].includes(kind)&&(distance<=500||!!cast);
 if(kind==='stacky'){
  const layers=Math.max(1,Math.ceil(entity.hp/(entity.maxHp/(stage>=1?4:3)))),previous=Number(runtime.stackLayers??(stage>=1?4:3));runtime.stackLayers=layers;
  if(layers<previous&&stage>=2){const current=Object.values(state.world.entities).filter(e=>e.runtime.stackOwner===entity.id&&!e.dead).length;for(let n=0;n<Math.min(previous-layers,2-current);n++){const cloneId=`${id}:dummy:${n}`,change=auxiliary(context,entity,cloneId,120),body=/** @type {import('../contracts.d.ts').EntityState} */(JSON.parse(JSON.stringify(change.payload)));body.runtime={...body.runtime,stackOwner:entity.id};changes.push({...change,payload:toJson(body)});}if(stage>=3){runtime.dropVolleyAt=state.tick+48;runtime.dropAim={...player.position};}}
  if(Number(runtime.dropVolleyAt??0)>0&&Number(runtime.dropVolleyAt)<=state.tick){for(let n=0;n<3;n++)changes.push(shot(context,entity,/** @type {import('../contracts.d.ts').Vec2} */(runtime.dropAim),`${id}:drop:${n}`,5,140,(n-1)*Math.PI/6));runtime.dropVolleyAt=0;}
 }
 if(kind==='codex'&&stage>=3&&state.tick>=Number(runtime.decoyReadyAt??600)&&!Object.values(state.world.entities).some(e=>e.runtime.toolOwner===entity.id&&!e.dead)){const change=auxiliary(context,entity,`${id}:tool`,240),body=/** @type {import('../contracts.d.ts').EntityState} */(JSON.parse(JSON.stringify(change.payload)));body.runtime={...body.runtime,toolOwner:entity.id};changes.push({...change,payload:toJson(body)});runtime.decoyReadyAt=state.tick+600;}
 if(cast&&state.tick>=cast.executeAt){
  if(['codex','hoots','stacky'].includes(kind)){
   const count=kind==='stacky'?Number(runtime.stackLayers):1,amount=kind==='hoots'?14:kind==='codex'?8:7,speed=kind==='hoots'?400:200;
   for(let n=0;n<count;n++)changes.push(shot(context,entity,cast.point,`${id}:shot:${n}`,amount,speed,(n-(count-1)/2)*Math.PI/12));
   if(cast.index+1<cast.total){const index=cast.index+1,delay=kind==='hoots'?42:stage>=2?30:21;runtime.petCast={...cast,index,executeAt:state.tick+delay,point:kind==='hoots'||stage>=2?{...player.position}:cast.point};}
   else{runtime.petCast=null;runtime.petReadyAt=state.tick+cooldown;if(kind==='hoots'&&stage>=2){const d=normalizeVector({x:entity.position.x-player.position.x,y:entity.position.y-player.position.y}),position=resolveBodyDestination(context,entity,{x:entity.position.x+d.x*100,y:entity.position.y+d.y*100});runtime.retreatPoint=position;}}
  }else if(kind==='dewey'){
   for(const targetId of cast.targets??[]){const target=state.world.entities[targetId];if(!target||target.dead||target.dying||distanceSquared(entity.position,target.position)>220**2)continue;effects.push({id:`${id}:heal:${targetId}`,sourceId:entity.id,chainId:id,generation:0,kind:'heal',payload:{targetId,amount:8}});if(stage>=2){const overflow=Math.max(0,8-(target.maxHp-target.hp));if(overflow)effects.push({id:`${id}:shield:${targetId}`,sourceId:entity.id,chainId:id,generation:0,kind:'shield',payload:{targetId,amount:Math.min(6,overflow*.5),duration:3}});}}
   runtime.petCast=null;runtime.petReadyAt=state.tick+cooldown;
  }
 }else if(!cast&&state.tick>=Number(runtime.tacticalDashUntil??0)&&(!runtime.retreatPoint||kind==='dewey'&&stage>=3)&&kind!=='rocky'&&state.tick>=Number(runtime.petReadyAt??0)&&(kind==='dewey'||distance<=650)&&(kind!=='hoots'||distance>=350)){
  if(kind==='fireball'||kind==='seedy'){
   const existing=Object.values(state.world.entities).filter(e=>e.sourceId===entity.id&&e.runtime.petZone==='vine'&&!e.dead).length;
   if(kind==='fireball'||distance<=500&&existing<(stage>=1?2:1)){
    const count=stage>=1?2:1,points=[{...player.position},{x:Math.min(state.world.map.width-75,Math.max(75,player.position.x+(player.position.x+180<state.world.map.width-75?180:-180))),y:player.position.y}];
    for(let n=0;n<count;n++)if(kind==='fireball'||existing+n<2)changes.push(zone(context,entity,kind==='fireball'?'fire':'vine',points[n],`${id}:zone:${n}`,kind==='fireball'&&stage>=3&&n===0));runtime.petReadyAt=state.tick+cooldown;
   }
  }else{
   const targets=Object.values(state.world.entities).filter(e=>e.id!==entity.id&&e.kind==='enemy'&&e.faction==='gpt'&&!e.dead&&!e.dying&&e.runtime.noRewardTarget!==true&&(e.hp<e.maxHp||stage>=2)&&distanceSquared(entity.position,e.position)<=220**2).sort((a,b)=>(state.start.difficulty.mechanicIds.includes('mech_03_gpt_support')?Number(['enemy_gpt_hoots','enemy_gpt_seedy'].includes(b.definitionId))-Number(['enemy_gpt_hoots','enemy_gpt_seedy'].includes(a.definitionId)):0)||a.hp/a.maxHp-b.hp/b.maxHp||(a.id<b.id?-1:1)).slice(0,stage>=1?2:1);
   if(kind!=='dewey'||targets.length){runtime.petCast={executeAt:state.tick+{codex:42,dewey:60,hoots:66,stacky:48}[kind],point:{...player.position},index:0,total:kind==='codex'&&stage>=1?2:kind==='hoots'&&stage>=1?stage>=3?3:2:1,targets:targets.map(e=>e.id)};stopped=true;
    if(kind==='dewey'&&stage>=3){const guard=Object.values(state.world.entities).filter(e=>e.definitionId==='enemy_gpt_rocky'&&!e.dead&&Number(e.runtime.guardHp)>0&&distanceSquared(entity.position,e.position)<=340**2).sort((a,b)=>distanceSquared(entity.position,a.position)-distanceSquared(entity.position,b.position)||(a.id<b.id?-1:1))[0];if(guard){const d=normalizeVector({x:guard.position.x-entity.position.x,y:guard.position.y-entity.position.y}),step=Math.min(120,Math.sqrt(distanceSquared(entity.position,guard.position))),position=resolveBodyDestination(context,entity,{x:entity.position.x+d.x*step,y:entity.position.y+d.y*step});runtime.retreatPoint=position;}}
   }
  }
 }
 if(kind==='hoots'&&distance<350&&!cast)stopped=false;
 if(runtime.leashRadius&&runtime.retreatPoint){const home=/** @type {import('../contracts.d.ts').Vec2} */(runtime.movementHome),point=/** @type {import('../contracts.d.ts').Vec2} */(runtime.retreatPoint);if(distanceSquared(home,point)>Number(runtime.leashRadius)**2){const d=normalizeVector({x:point.x-home.x,y:point.y-home.y});runtime.retreatPoint={x:home.x+d.x*Number(runtime.leashRadius),y:home.y+d.y*Number(runtime.leashRadius)};runtime.retreatRoute=findNavigationPath(context,{entityId:entity.id,origin:entity.position,destination:/** @type {import('../contracts.d.ts').Vec2} */(runtime.retreatPoint),collisionProfileId:entity.collisionProfileId}).path.map(p=>({...p}));}}
 const route=/** @type {readonly import('../contracts.d.ts').Vec2[]} */(runtime.retreatRoute??[]);if(route[0]&&distanceSquared(route[0],entity.position)<4**2)runtime.retreatRoute=route.slice(1).map(p=>({...p}));const retreat=/** @type {import('../contracts.d.ts').Vec2|null} */(/** @type {readonly import('../contracts.d.ts').Vec2[]} */(runtime.retreatRoute??[])[0]??runtime.retreatPoint??null);if(retreat&&distanceSquared(/** @type {import('../contracts.d.ts').Vec2} */(runtime.retreatPoint),entity.position)<4**2){runtime.retreatPoint=null;runtime.retreatRoute=[];}
 const movement=base.changes.filter(c=>c.operation!=='setEntityRuntime').map(c=>{if(retreat&&runtime.retreatPoint&&(kind==='dewey'||!runtime.petCast)&&c.operation==='setEntityKinematics'){const d=normalizeVector({x:retreat.x-entity.position.x,y:retreat.y-entity.position.y}),speed=Math.min(150,Math.sqrt(distanceSquared(retreat,entity.position))*60);return {...c,payload:toJson({.../** @type {object} */(c.payload),velocity:{x:d.x*speed,y:d.y*speed}})};}if(kind==='hoots'&&distance<350&&!cast&&c.operation==='setEntityKinematics'){const d=normalizeVector({x:entity.position.x-player.position.x,y:entity.position.y-player.position.y});return {...c,payload:toJson({.../** @type {object} */(c.payload),velocity:{x:d.x*Number(entity.runtime.moveSpeed??75),y:d.y*Number(entity.runtime.moveSpeed??75)}})};}if((!stopped&&(!runtime.petCast||kind==='dewey'))||c.operation!=='setEntityKinematics')return c;return {...c,payload:toJson({.../** @type {object} */(c.payload),velocity:{x:0,y:0}})};});
 return {...createEmptyPlan(),changes:[...movement,...changes,createStateChange('entity',entity.id,'setEntityRuntime',{runtime:{.../** @type {{runtime:object}|undefined} */(base.changes.find(c=>c.operation==='setEntityRuntime')?.payload)?.runtime,...runtime}})],effects:[...base.effects,...effects],events:base.events};
}

/** Advance telegraphed fire/vines, one-shot seeds and bounded, rewardless auxiliary lifetimes.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/modelProfiles.js#resolvePetStage
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planGptFields(context){
 const state=context.state,player=state.world.entities[state.player.entityId],changes=/** @type {import('../contracts.d.ts').StateChange[]} */([]),effects=/** @type {import('../contracts.d.ts').EffectRequest[]} */([]);
 for(const field of Object.values(state.world.entities).filter(e=>e.runtime.petZone||e.runtime.auxiliary===true)){
  if(field.dead||field.expiresAt!==null&&field.expiresAt<=state.tick){
   if(field.runtime.petZone==='fire'&&field.runtime.aftershock===true&&!field.dead){const owner=state.world.entities[field.sourceId];if(owner&&!owner.dead){const point={x:Math.max(75,Math.min(state.world.map.width-75,field.position.x-180)),y:field.position.y};changes.push(zone(context,owner,'fire',point,`${field.id}:aftershock`));}}
   changes.push(createStateChange('world',field.id,'removeEntity',{}));continue;
  }
  if(!field.runtime.petZone||Number(field.runtime.activeAt)>state.tick)continue;const owner=state.world.entities[field.sourceId],radius=Number(field.runtime.zoneRadius),inside=distanceSquared(player.position,field.position)<=(radius+player.radius)**2,id=`${field.id}:${state.tick}`,rt={...field.runtime};
  if(field.runtime.petZone==='fire'&&Number(field.runtime.nextDamageAt)<=state.tick){if(inside)effects.push({id,sourceId:field.sourceId,chainId:field.id,generation:0,kind:'damage',payload:toJson({id,sourceId:field.sourceId,creditOwner:'enemy',sourceKind:'enemy',attackId:id,projectileId:null,targetId:player.id,baseDamage:6*Number(owner?.runtime.damageMultiplier??1),contact:field.position,incomingDirection:{x:0,y:1},generation:0,chainId:field.id,critEligible:false,expiresAt:state.tick+1})});rt.nextDamageAt=state.tick+60;}
  if(field.runtime.petZone==='vine'&&inside)effects.push({id,sourceId:field.sourceId,chainId:field.id,generation:0,kind:'control',payload:{id,sourceId:field.sourceId,targetId:player.id,kind:'slow',baseDuration:.25,baseRequiredInputs:0,appliedModifierIds:[]}});
  if(field.runtime.petZone==='vine'&&Number(field.runtime.stage)>=3){if(!rt.seedAim&&state.tick>=Number(rt.bornAt)+120){rt.seedAim={...player.position};rt.seedFireAt=state.tick+42;}if(rt.seedAim&&rt.seedFired!==true&&state.tick>=Number(rt.seedFireAt)){const origin={...field,sourceId:field.sourceId,runtime:{...field.runtime,damageMultiplier:Number(owner?.runtime.damageMultiplier??1)}};const change=shot(context,origin,/** @type {import('../contracts.d.ts').Vec2} */(rt.seedAim),`${field.id}:seed`,6,150),body=/** @type {import('../contracts.d.ts').EntityState} */(JSON.parse(JSON.stringify(change.payload)));body.sourceId=field.sourceId;changes.push({...change,payload:toJson(body)});rt.seedFired=true;}}
  changes.push(createStateChange('entity',field.id,'setEntityRuntime',{runtime:rt}));
 }
 for(const rubble of Object.values(state.world.entities).filter(e=>e.runtime.temporaryRubble===true&&Number(e.expiresAt)<=state.tick)){changes.push(createStateChange('world',rubble.id,'removeEntity',{}));}
 const expired=Object.values(state.world.entities).filter(e=>e.runtime.temporaryRubble===true&&Number(e.expiresAt)<=state.tick).map(e=>e.id);if(expired.length)changes.push(createStateChange('world',state.world.map.id,'setMap',{...state.world.map,obstacleIds:state.world.map.obstacleIds.filter(id=>!expired.includes(id)),navigationRevision:state.world.map.navigationRevision+1}));
 const vines=Object.values(state.world.entities).filter(e=>e.runtime.petZone==='vine'&&Number(e.runtime.stage)>=2&&!e.dead&&Number(e.runtime.activeAt)<=state.tick&&Number(e.expiresAt)>state.tick);
 for(const a of vines){const b=vines.find(e=>e.id>a.id&&e.runtime.wave===a.runtime.wave&&e.sourceId===a.sourceId);if(!b)continue;const dx=b.position.x-a.position.x,dy=b.position.y-a.position.y,t=Math.max(0,Math.min(1,((player.position.x-a.position.x)*dx+(player.position.y-a.position.y)*dy)/(dx*dx+dy*dy||1))),near=distanceSquared(player.position,{x:a.position.x+dx*t,y:a.position.y+dy*t})<=(player.radius+10)**2;if(near){const id=`vineLink:${a.id}:${state.tick}`;effects.push({id,sourceId:a.sourceId,chainId:a.id,generation:0,kind:'control',payload:{id,sourceId:a.sourceId,targetId:player.id,kind:'slow',baseDuration:.25,baseRequiredInputs:0,appliedModifierIds:[]}});}}
 return {...createEmptyPlan(),changes,effects};
}

/** Luna Rocky's one-off broken guard leaves temporary low clutter; it cannot become another health bar.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/entities.js#createEntityState
 * @calls domain/modelProfiles.js#resolvePetStage
 * @calls domain/navigation.js#canCloseMapPassage
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planPetModelEvent(context,event){
 const state=context.state,entity=event.targetId?state.world.entities[event.targetId]:null;
 if(event.type!=='RockyGuardBroken'||!entity||resolvePetStage(entity)<3||state.world.entities[`rubble:${entity.id}`])return createEmptyPlan();
 const id=`rubble:${entity.id}`,rubble=createEntityState(id,'terrain_clutter','obstacle','neutral',entity.position,{radius:45,hp:9999,maxHp:9999,expiresAt:state.tick+180,runtime:{low:true,grok_passable:true,solid:true,temporaryRubble:true}});
 const prospective={...context,state:{...state,world:{...state.world,entities:{...state.world.entities,[id]:rubble}}}};if(!canCloseMapPassage(prospective,id))return createEmptyPlan();
 return {...createEmptyPlan(),changes:[createStateChange('world',id,'putEntity',rubble),createStateChange('world',state.world.map.id,'setMap',{...state.world.map,obstacleIds:[...state.world.map.obstacleIds,id],navigationRevision:state.world.map.navigationRevision+1})]};
}
