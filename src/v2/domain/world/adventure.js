// @ts-check
import {createEasterObjectives} from '../easter.js';
import { createEmptyPlan, createStateChange } from '../plans.js';
import { createEntityState } from '../entities.js';
/** Claude短途纵切的连续地图；首领与其他模式不因此宣称完整实现。
 * @implementationScope adventure-slice
 * @calls domain/easter.js#createEasterObjectives
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').StartSnapshot} start
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function createAdventureMapPlan(start, catalog) {
 const changes = /** @type {import('../../contracts.d.ts').StateChange[]} */ ([]);
 const put = (/** @type {import('../../contracts.d.ts').EntityState} */ entity) => changes.push(createStateChange('world', entity.id, 'putEntity', entity));
 const obstacles = [{x:650,y:500},{x:1200,y:600},{x:1800,y:750},{x:1200,y:1400},{x:2200,y:1250},{x:2500,y:1000}];
 const obstacleIds = obstacles.map((point,index)=>{const id=`rock:${index}`;put(createEntityState(id,'terrain_rock','obstacle','neutral',point,{radius:60,hp:9999,maxHp:9999,runtime:{solid:true,highWall:true}}));return id;});
 put(createEntityState('checkpoint:home','world_checkpoint','objective','neutral',{x:230,y:270},{runtime:{interaction:'checkpoint'}}));
 put(createEntityState('checkpoint:central','world_checkpoint','objective','neutral',{x:1500,y:1100},{runtime:{interaction:'checkpoint'}}));
 const objectives = /** @type {import('../../contracts.d.ts').ObjectiveState[]} */ ([]);
 const beacons=[{x:850,y:650},{x:2100,y:500},{x:1500,y:1700}];
 for(let i=0;i<3;i++){
  const id=`beacon:${i}`,position=beacons[i];put(createEntityState(id,'world_beacon','objective','neutral',position,{radius:120,runtime:{interaction:'beacon'}}));
  objectives.push({id,kind:'beacon',active:true,completed:false,progress:0,requiredEntityIds:[],rewardId:`objective:${id}`});
  for(let member=0;member<10;member++){
   const crab=member<2,definitionId=crab?'enemy_claude_guard':'enemy_grok_bot',p=catalog.definitions[definitionId].parameters,theta=member*Math.PI*2/10;
   const enemyId=`resident:${i}:${member}`;put(createEntityState(enemyId,definitionId,'enemy','enemy',{x:position.x+Math.cos(theta)*230,y:position.y+Math.sin(theta)*230},{faction:crab?'claude':'grok',radius:Number(p.radius),hp:Number(p.hp)*start.difficulty.hpMultiplier,maxHp:Number(p.hp)*start.difficulty.hpMultiplier,modelProfileId:crab?'claude_haiku':'grok_bot',rewardPolicy:'normal',distillEligible:true,runtime:{moveSpeed:Number(p.moveSpeed),contactDamage:Number(p.contactDamage)*start.difficulty.damageMultiplier,damageMultiplier:start.difficulty.damageMultiplier,spawnGroup:`beacon:${i}`}}));
  }
 }
 put(createEntityState('boss:gate','world_gate','objective','neutral',{x:2500,y:1700},{radius:70,runtime:{interaction:'bossGate',unlocked:false}}));
 for(let i=0;i<3;i++)put(createEntityState(`cache:${i}`,'world_cache','objective','neutral',[{x:450,y:1000},{x:2000,y:1000},{x:2300,y:2000}][i],{radius:28,runtime:{interaction:'cache',opened:false,secret:i===2}}));
 changes.push(createStateChange('world','adventure:claude-short','setMap',{id:'adventure:claude-short',biomeIndex:0,width:3000,height:2200,exploredCells:[],obstacleIds,checkpointIds:['checkpoint:home','checkpoint:central'],exitIds:['boss:gate'],navigationRevision:0}),createStateChange('world','objectives','setObjectives',{objectives}),createStateChange('world','pursuers','setSpawnDirector',{queue:[],budgets:[{id:'pursuers',total:340,reserved:0,spawned:0,maxAlive:24}],nextAt:720}));
 for(const [index,definitionId]of ['mcp_vector','mcp_stream','mcp_return','mcp_batch'].entries()){
  const id=`equipment:${definitionId}`,instanceId=`${start.runId}:loot:${definitionId}`,position=[{x:500,y:650},{x:1700,y:900},{x:2050,y:1500},{x:2600,y:1950}][index];
  changes.push(createStateChange('world',id,'putPickup',{id,kind:'weapon',amount:1,position,instanceId,collected:false,weapon:{instanceId,definitionId,originalQuality:index<2?0:1,cooldown:0,temporaryQuality:null,updateExpiresAt:null}}));
 }
 for(const [index,definitionId]of ['skill_cache','skill_batch','skill_redirect','skill_sandbox','skill_fork','skill_rollback','skill_overclock'].entries()){
  const id=`equipment:${definitionId}`,instanceId=`${start.runId}:loot:${definitionId}`,position=[{x:650,y:1100},{x:1100,y:800},{x:1600,y:450},{x:380,y:420},{x:1900,y:1300},{x:2600,y:1800},{x:1800,y:1700}][index];
  changes.push(createStateChange('world',id,'putPickup',{id,kind:'skill',amount:1,position,instanceId,collected:false,skill:{instanceId,definitionId,cooldown:0}}));
 }
 put(createEntityState('cache:3','world_cache','objective','neutral',{x:2750,y:500},{radius:28,runtime:{interaction:'cache',opened:false,secret:true}}));
 return {...createEmptyPlan(),changes:[...changes,...createEasterObjectives().changes]};
}
/** 在已开放入口启动一次Claude首领；同一实体/稳定ID不能重复生成。
 * @implementationScope adventure-slice
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planClaudeEncounter(context) {
 const state=context.state;if(state.world.entities['boss:claude']||state.world.objectives.filter(objective=>objective.kind==='beacon'&&objective.completed).length<2)return createEmptyPlan();
 const p=context.catalog.definitions.boss_claude.parameters,entity=createEntityState('boss:claude','boss_claude','enemy','enemy',{x:2550,y:1750},{faction:'claude',radius:45,hp:Number(p.hp)*state.start.difficulty.hpMultiplier,maxHp:Number(p.hp)*state.start.difficulty.hpMultiplier,armor:Number(p.armor),rewardPolicy:'elite',distillEligible:true,runtime:{finalBoss:true,engaged:true,moveSpeed:Number(p.moveSpeed),contactDamage:Number(p.contactDamage)*state.start.difficulty.damageMultiplier,nextClaudeMoveAt:state.tick+120}});
 const boss={entityId:entity.id,faction:'claude',phase:1,telegraph:null,resetNodes:[],resetRemaining:0,resetCooldown:0,spawnGroupSeq:0};
 return {...createEmptyPlan(),changes:[createStateChange('world',entity.id,'putEntity',entity),createStateChange('world','bosses','setBosses',{bosses:[boss]}),createStateChange('flow','phase','setFlowPhase',{phase:'boss',resumePhase:null})]};
}
