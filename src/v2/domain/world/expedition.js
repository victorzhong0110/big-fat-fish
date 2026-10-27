// @ts-check
import {createEmptyPlan,createStateChange} from '../plans.js';
import {toJson} from '../serialization.js';
import {distanceSquared} from '../geometry.js';
import {planLifeChange} from '../damage.js';
import {createExpeditionRegionPlan} from './expeditionMap.js';
import {namespaceEncounterPlan} from './encounterIds.js';
import {rebaseRegionTime} from './regionTime.js';
import {expeditionPoint,expeditionRegionScale,localWorldId} from './regionRules.js';
import {planBossEncounter} from './adventure.js';
import {isWorldSafe} from './safety.js';
/** Archive only local state. Player/companion bodies, their statuses/shields, and all build/currency/random/progression state remain global.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').StateSnapshot} s
 * @returns {import('../../contracts.d.ts').RegionArchive}
 */
export function createRegionArchive(s){const travellers=[s.player.entityId,'companion:equipped'],bodies=travellers.map(id=>s.world.entities[id]).filter(Boolean),statuses=new Set(bodies.flatMap(e=>e.statusIds)),shields=new Set(bodies.flatMap(e=>e.shieldIds));return structuredClone({world:{...structuredClone(s.world),entities:Object.fromEntries(Object.entries(s.world.entities).filter(([id])=>!travellers.includes(id)).map(([id,e])=>[id,structuredClone(e)])),statuses:Object.fromEntries(Object.entries(s.world.statuses).filter(([id])=>!statuses.has(id))),shields:Object.fromEntries(Object.entries(s.world.shields).filter(([id])=>!shields.has(id)))},bosses:structuredClone(s.bosses),attackHits:s.attackHits.filter(h=>!travellers.includes(h.targetId)),nextAt:s.spawnDirectorNextAt??720,suspendedAt:s.tick});}
/** Assemble a fresh factory plan without depending on the engine reducer. Only map-construction operations are accepted here.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').SystemPlan} plan
 * @returns {import('../../contracts.d.ts').RegionArchive}
 */
export function assembleRegionArchive(plan){let world=/** @type {import('../../contracts.d.ts').WorldState} */({map:{id:'unpublished',biomeIndex:0,width:3500,height:2600,exploredCells:[],obstacleIds:[],checkpointIds:[],exitIds:[],navigationRevision:0},entities:{},pickups:{},statuses:{},shields:{},objectives:[],spawnQueue:[],budgets:[],pressureEvents:[]}),nextAt=720;for(const ch of plan.changes){const p=JSON.parse(JSON.stringify(ch.payload));switch(ch.operation){case'putEntity':world={...world,entities:{...world.entities,[ch.id]:p}};break;case'putPickup':world={...world,pickups:{...world.pickups,[ch.id]:p}};break;case'setMap':world={...world,map:p};break;case'setObjectives':world={...world,objectives:p.objectives};break;case'setSpawnDirector':world={...world,spawnQueue:p.queue,budgets:p.budgets};nextAt=p.nextAt;break;default:throw new Error(`Unsupported region initialization: ${ch.operation}`);}}return {world,bosses:[],attackHits:[],nextAt,suspendedAt:0};}
/** Safe bidirectional travel swaps the active region once. Saved regions are resumed, never regenerated; absolute NPC timers are rebased to preserve remaining time, and traveller HP/cooldowns/build never reset.
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/serialization.js#toJson
 * @calls domain/world/expedition.js#assembleRegionArchive
 * @calls domain/world/expedition.js#createRegionArchive
 * @calls domain/world/expeditionMap.js#createExpeditionRegionPlan
 * @calls domain/world/regionRules.js#localWorldId
 * @calls domain/world/regionTime.js#rebaseRegionTime
 * @calls domain/world/safety.js#isWorldSafe
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @param {number} target
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planExpeditionTravel(c,target){
 const s=c.state,ex=s.expedition,current=s.world.map.biomeIndex,p=s.world.entities[s.player.entityId];if(!ex||p.runtime.lastRegionTravelTick===s.tick||s.flow.phase!=='exploring'||!Number.isInteger(target)||target<0||target>2||Math.abs(current-target)!==1||s.flow.queuedLevelRewards.length||s.pendingEffects.pending.length||!isWorldSafe(c,p.position)||Number(p.runtime.dashUntil??0)>s.tick)return createEmptyPlan();
 const forward=target>current,portal=s.world.entities[localWorldId(s,forward?'boss:gate':'portal:back')];if(!portal||!portal.runtime.unlocked||distanceSquared(p.position,portal.position)>96**2||forward&&!ex.clearedBiomes.includes(current))return createEmptyPlan();
 const stored=ex.regions[target],raw=stored??assembleRegionArchive(createExpeditionRegionPlan(s.start,c.catalog,target)),region=/** @type {import('../../contracts.d.ts').RegionArchive} */(JSON.parse(JSON.stringify(rebaseRegionTime(toJson(raw),s.tick-raw.suspendedAt)))),world=structuredClone(region.world),arrival=forward?{x:230,y:270}:world.entities[`b${target}:boss:gate`].position,travellers=[s.player.entityId,'companion:equipped'];
 world.map={...world.map,clockOffset:Number(raw.world.map.clockOffset??0)+s.tick-raw.suspendedAt};
 for(const id of travellers){const body=s.world.entities[id];if(!body)continue;const position=id===s.player.entityId?arrival:{x:arrival.x+30,y:arrival.y+20},runtime=id===s.player.entityId?{...body.runtime,lastRegionTravelTick:s.tick,rollbackHistory:[[s.tick,position.x,position.y,Number(body.runtime.hpDamageTotal??0)]]}:{...body.runtime};world.entities={...world.entities,[id]:{...structuredClone(body),position:{...position},previousPosition:{...position},velocity:{x:0,y:0},runtime}};for(const statusId of body.statusIds)if(s.world.statuses[statusId])world.statuses={...world.statuses,[statusId]:structuredClone(s.world.statuses[statusId])};for(const shieldId of body.shieldIds)if(s.world.shields[shieldId])world.shields={...world.shields,[shieldId]:structuredClone(s.world.shields[shieldId])};}
 const regions=[...ex.regions];regions[current]=createRegionArchive(s);regions[target]=null;const expedition={...ex,regions,furthestBiome:Math.max(ex.furthestBiome,target)};
 return {...createEmptyPlan(),changes:[createStateChange('world','expedition','replaceExpeditionWorld',{world,bosses:region.bosses,attackHits:[...s.attackHits.filter(h=>travellers.includes(h.targetId)),...region.attackHits],nextAt:region.nextAt,expedition}),createStateChange('runtime','input','setInput',{...s.input,move:{x:0,y:0},firing:false,heldKeys:[],pointerIds:[]})],events:[{id:`region:${s.runId}:${s.tick}:${target}`,runId:s.runId,tick:s.tick,seq:0,type:'RegionChanged',sourceId:p.id,targetId:null,payload:{from:current,to:target,visited:!!stored}}]};
}
/** Only two real completed regional objectives unlock the area's fixed faction encounter. Reuse the tested Boss behavior and isolate all IDs, positions and static regional strength.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/world/adventure.js#planBossEncounter
 * @calls domain/world/encounterIds.js#namespaceEncounterPlan
 * @calls domain/world/regionRules.js#expeditionPoint
 * @calls domain/world/regionRules.js#expeditionRegionScale
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planExpeditionBossEncounter(c){const s=c.state,ex=s.expedition,index=s.world.map.biomeIndex,primary=s.world.objectives.filter(o=>['beacon','blockade'].includes(o.kind));if(!ex||s.flow.phase!=='exploring'||ex.clearedBiomes.includes(index)||s.bosses.length||primary.filter(o=>o.completed).length<2)return createEmptyPlan();const scale=expeditionRegionScale(index),fake={...s,start:{...s.start,bossFaction:ex.route[index],difficulty:{...s.start.difficulty,hpMultiplier:s.start.difficulty.hpMultiplier*scale.hp,damageMultiplier:s.start.difficulty.damageMultiplier*scale.damage}},world:{...s.world,objectives:primary.map(o=>({...o,kind:'beacon'}))}};const plan=namespaceEncounterPlan(planBossEncounter({...c,state:fake}),s.bosses,`b${index}:`);for(const ch of plan.changes){if(ch.operation==='putEntity'){const e=/** @type {import('../../contracts.d.ts').EntityState} */(/** @type {unknown} */(ch.payload));e.position=expeditionPoint(index,e.position);e.previousPosition={...e.position};if(e.definitionId.startsWith('boss_'))e.runtime={...e.runtime,finalBoss:index===2,expeditionBoss:true,damageMultiplier:s.start.difficulty.damageMultiplier*scale.damage};}if(ch.operation==='setBosses')for(const b of /** @type {{bosses:import('../../contracts.d.ts').BossState[]}} */(/** @type {unknown} */(ch.payload)).bosses)for(const n of b.resetNodes)n.position=expeditionPoint(index,n.position);}return plan;}
/** Count the actual defeated region before final outcome resolution; intermediate death opens passage/rest without victory. Pending Boss-owned births are cancelled and refunded.
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/regionRules.js#localWorldId
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planExpeditionProgression(c){const s=c.state,ex=s.expedition,index=s.world.map.biomeIndex,boss=s.bosses.find(b=>s.world.entities[b.entityId]?.dead);if(!ex||!boss||ex.clearedBiomes.includes(index))return createEmptyPlan();const changes=[createStateChange('runtime','expedition','setExpeditionState',{...ex,clearedBiomes:[...ex.clearedBiomes,index].sort()})];for(const child of Object.values(s.world.entities))if(child.id!==boss.entityId&&child.sourceId===boss.entityId&&(child.runtime.resetNodeOwner===boss.entityId||child.definitionId==='gpt_node_marker'||child.runtime.bossGround===true))changes.push(createStateChange('world',child.id,'removeEntity',{}));if(index<2&&!s.world.entities[s.player.entityId].dead){changes.push(createStateChange('flow','phase','setFlowPhase',{phase:'exploring',resumePhase:null}));const gate=s.world.entities[localWorldId(s,'boss:gate')],rest=s.world.entities[localWorldId(s,'rest')];if(gate)changes.push(createStateChange('entity',gate.id,'setEntityRuntime',{runtime:{...gate.runtime,unlocked:true,interaction:'expeditionExit',targetBiome:index+1}}));if(rest)changes.push(createStateChange('entity',rest.id,'setEntityRuntime',{runtime:{...rest.runtime,unlocked:true}}));}const removed=s.world.spawnQueue.filter(r=>r.bossOwner===boss.entityId);if(removed.length)changes.push(createStateChange('world','expedition','setSpawnDirector',{queue:s.world.spawnQueue.filter(r=>r.bossOwner!==boss.entityId),budgets:s.world.budgets.map(b=>({...b,reserved:b.reserved-removed.filter(r=>r.budgetId===b.id).length})),nextAt:s.spawnDirectorNextAt??720}));return {...createEmptyPlan(),changes};}
/** Independent optional rest: consume the facility exactly once for a 30% max-HP heal OR a quality-2 MCP on the ground. No checkpoint/travel operation calls this function.
 * @calls domain/damage.js#planLifeChange
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/safety.js#isWorldSafe
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @param {string} id
 * @param {'heal'|'weapon'|null} choice
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planExpeditionRest(c,id,choice=null){const s=c.state,e=s.world.entities[id],p=s.world.entities[s.player.entityId];if(!s.expedition||s.flow.phase!=='exploring'||!e||e.runtime.interaction!=='expeditionRest'||e.runtime.unlocked!==true||e.runtime.used===true||distanceSquared(p.position,e.position)>96**2||!isWorldSafe(c,p.position))return createEmptyPlan();if(choice===null&&e.runtime.offeredAt===s.tick)return createEmptyPlan();if(choice===null)return {...createEmptyPlan(),changes:[createStateChange('entity',id,'setEntityRuntime',{runtime:{...e.runtime,offeredAt:s.tick}})],events:[{id:`restOffer:${s.runId}:${s.tick}`,runId:s.runId,tick:s.tick,seq:0,type:'RestOffered',sourceId:p.id,targetId:e.id,payload:{restId:e.id}}]};if(!['heal','weapon'].includes(choice))return createEmptyPlan();const plan=choice==='heal'?planLifeChange(c,p.id,p.maxHp*.3,`rest:${id}`):createEmptyPlan(),changes=[...plan.changes,createStateChange('entity',id,'setEntityRuntime',{runtime:{...e.runtime,used:true}})];if(choice==='weapon'){const definitions=['mcp_vector','mcp_stream','mcp_return','mcp_batch'],definitionId=definitions[(s.seed+s.world.map.biomeIndex)%4],instanceId=`${s.runId}:rest:${id}`,pickupId=`restReward:${id}`;changes.push(createStateChange('world',pickupId,'putPickup',{id:pickupId,kind:'weapon',amount:1,position:e.position,instanceId,collected:false,weapon:{instanceId,definitionId,originalQuality:2,cooldown:0,temporaryQuality:null,updateExpiresAt:null}}));}return {...plan,changes};}
