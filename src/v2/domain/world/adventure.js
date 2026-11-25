// @ts-check
import {STATION_RADIUS} from './beacon.js';
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
 const mapId=start.difficulty.mode==='api'?'adventure:api-sea':'adventure:claude-short';const staged=start.difficulty.mechanicIds.includes('mech_02_reinforcements'),campBudgets=/** @type {import('../../contracts.d.ts').EncounterBudget[]} */([]);
 const changes = /** @type {import('../../contracts.d.ts').StateChange[]} */ ([]);
 const put = (/** @type {import('../../contracts.d.ts').EntityState} */ entity) => changes.push(createStateChange('world', entity.id, 'putEntity', entity));
 const obstacles = [{x:650,y:500},{x:1200,y:600},{x:1800,y:750},{x:1200,y:1400},{x:2200,y:1250},{x:2500,y:1000}];
 const obstacleIds = obstacles.map((point,index)=>{const id=`rock:${index}`;put(createEntityState(id,'terrain_rock','obstacle','neutral',point,{radius:60,hp:9999,maxHp:9999,runtime:{solid:true,highWall:true}}));return id;});
 put(createEntityState('checkpoint:home','world_checkpoint','objective','neutral',{x:230,y:270},{runtime:{interaction:'checkpoint'}}));
 put(createEntityState('checkpoint:central','world_checkpoint','objective','neutral',{x:1500,y:1100},{runtime:{interaction:'checkpoint'}}));
 const objectives = /** @type {import('../../contracts.d.ts').ObjectiveState[]} */ ([]);
 const beacons=[{x:850,y:650},{x:2100,y:500},{x:1500,y:1700}];
 for(let i=0;i<3;i++){
  const id=`beacon:${i}`,position=beacons[i];put(createEntityState(id,'world_beacon','objective','neutral',position,{radius:STATION_RADIUS,runtime:{interaction:'beacon',reinforcementPending:staged,campIndex:i,campPrefix:''}}));
  objectives.push({id,kind:'beacon',active:true,completed:false,progress:0,requiredEntityIds:[],rewardId:`objective:${id}`});
  if(staged)campBudgets.push({id:`camp:${i}`,total:10,reserved:0,spawned:4,maxAlive:10});
  for(let member=0;member<(staged?4:10);member++){
   const crab=member<2,pet=member>=2&&member<5,petGroups=[['codex','dewey','rocky'],['fireball','hoots','seedy'],['stacky','codex','dewey']],definitionId=crab?'enemy_claude_guard':pet?`enemy_gpt_${petGroups[i][member-2]}`:'enemy_grok_bot',p=catalog.definitions[definitionId].parameters,theta=member*Math.PI*2/10;
   const enemyId=`resident:${i}:${member}`;put(createEntityState(enemyId,definitionId,'enemy','enemy',{x:position.x+Math.cos(theta)*230,y:position.y+Math.sin(theta)*230},{faction:crab?'claude':pet?'gpt':'grok',radius:Number(p.radius),hp:Number(p.hp)*start.difficulty.hpMultiplier,maxHp:Number(p.hp)*start.difficulty.hpMultiplier,modelProfileId:crab?start.difficulty.modelProfileIds.claude:pet?start.difficulty.modelProfileIds.gpt:'grok_bot',rewardPolicy:'normal',distillEligible:true,runtime:{moveSpeed:Number(p.moveSpeed),contactDamage:Number(p.contactDamage)*start.difficulty.damageMultiplier,damageMultiplier:start.difficulty.damageMultiplier,spawnGroup:`beacon:${i}`}}));
  }
 }
 if(start.difficulty.mode!=='api')put(createEntityState('boss:gate','world_gate','objective','neutral',{x:2500,y:1700},{radius:70,runtime:{interaction:'bossGate',unlocked:false}}));
 for(let i=0;i<3;i++)put(createEntityState(`cache:${i}`,'world_cache','objective','neutral',[{x:450,y:1000},{x:2000,y:1000},{x:2300,y:2000}][i],{radius:28,runtime:{interaction:'cache',opened:false,secret:i===2}}));
 changes.push(createStateChange('world',mapId,'setMap',{id:mapId,biomeIndex:0,width:3000,height:2200,exploredCells:[],obstacleIds,checkpointIds:['checkpoint:home','checkpoint:central'],exitIds:start.difficulty.mode==='api'?[]:['boss:gate'],navigationRevision:0}),createStateChange('world','objectives','setObjectives',{objectives}),createStateChange('world','pursuers','setSpawnDirector',{queue:[],budgets:[{id:'pursuers',total:340,reserved:0,spawned:0,maxAlive:24}],nextAt:720}));
 for(const [index,definitionId]of ['mcp_vector','mcp_stream','mcp_return','mcp_batch'].entries()){
  const id=`equipment:${definitionId}`,instanceId=`${start.runId}:loot:${definitionId}`,position=[{x:500,y:650},{x:1700,y:900},{x:2050,y:1500},{x:2600,y:1950}][index];
  changes.push(createStateChange('world',id,'putPickup',{id,kind:'weapon',amount:1,position,instanceId,collected:false,weapon:{instanceId,definitionId,originalQuality:index<2?0:1,cooldown:0,temporaryQuality:null,updateExpiresAt:null}}));
 }
 for(const [index,definitionId]of ['skill_cache','skill_batch','skill_redirect','skill_sandbox','skill_fork','skill_rollback','skill_overclock'].entries()){
  const id=`equipment:${definitionId}`,instanceId=`${start.runId}:loot:${definitionId}`,position=[{x:650,y:1100},{x:1100,y:800},{x:1600,y:450},{x:380,y:420},{x:1900,y:1300},{x:2600,y:1800},{x:1800,y:1700}][index];
  changes.push(createStateChange('world',id,'putPickup',{id,kind:'skill',amount:1,position,instanceId,collected:false,skill:{instanceId,definitionId,cooldown:0}}));
 }
 if(start.difficulty.mechanicIds.includes('mech_04_claude_break'))for(const[n,position]of [{x:1100,y:900},{x:2250,y:1700}].entries()){const id=`cover:${n}`;obstacleIds.push(id);put(createEntityState(id,'terrain_breakable','obstacle','neutral',position,{radius:35,hp:30,maxHp:30,runtime:{solid:true,breakable:true}}));put(createEntityState(`cache:cover:${n}`,'world_cache','objective','neutral',position,{radius:28,runtime:{interaction:'cache',opened:false,secret:true,hiddenBy:id}}));}
 if(start.difficulty.mechanicIds.includes('mech_06_alarm_cache')){const id='alarm:0';put(createEntityState(id,'world_alarm','objective','neutral',{x:1900,y:1500},{radius:30,runtime:{interaction:'alarmCache',opened:false}}));campBudgets.push({id:`alarm:${id}`,total:16,reserved:0,spawned:0,maxAlive:24});}
 if(start.difficulty.mechanicIds.includes('mech_07_tide'))put(createEntityState('current:0','world_current','objective','neutral',{x:1320,y:850},{radius:160,runtime:{currentZone:true}}));
 for(const[n,faction]of ['claude','gpt','grok'].entries()){const id=`elite:${faction}`;put(createEntityState(id,'world_challenge','objective','neutral',[{x:1000,y:1900},{x:2650,y:350},{x:500,y:1600}][n],{radius:28,runtime:{interaction:'challenge',challengeKind:faction,started:false}}));campBudgets.push({id:`eliteBudget:${id}`,total:faction==='grok'?24:1,reserved:0,spawned:0,maxAlive:faction==='grok'?24:2});}
 if(start.difficulty.mechanicIds.includes('mech_11_objective_signal'))for(let i=0;i<3;i++)campBudgets.push({id:`signalBudget:beacon:${i}`,total:30,reserved:0,spawned:0,maxAlive:12});
 if(start.difficulty.mechanicIds.includes('mech_14_anomaly')){put(createEntityState('shortcut:0','terrain_shortcut','obstacle','neutral',{x:1150,y:1100},{radius:45,hp:9999,maxHp:9999,runtime:{solid:false,shortcut:true}}));obstacleIds.push('shortcut:0');campBudgets.push({id:'anomalyBudget',total:0,reserved:0,spawned:0,maxAlive:0});}
 if(start.difficulty.mechanicIds.includes('mech_15_integration')){const id='integration:0';put(createEntityState(id,'world_challenge','objective','neutral',{x:800,y:1900},{radius:30,runtime:{interaction:'challenge',challengeKind:'integration',started:false}}));put(createEntityState('current:integration','world_current','objective','neutral',{x:800,y:1900},{radius:160,runtime:{currentZone:true}}));objectives.push({id,kind:'integration',active:true,completed:false,progress:0,requiredEntityIds:[],rewardId:`objective:${id}`});campBudgets.push({id:'integrationBudget',total:32,reserved:0,spawned:0,maxAlive:16});}
 put(createEntityState('cache:3','world_cache','objective','neutral',{x:2750,y:500},{radius:28,runtime:{interaction:'cache',opened:false,secret:true}}));
 changes.push(createStateChange('world','objectives','setObjectives',{objectives}));
 const mapChange=changes.find(c=>c.operation==='setMap');if(mapChange)changes.push(createStateChange('world',mapId,'setMap',{.../** @type {object} */(mapChange.payload),obstacleIds}));
 changes.push(createStateChange('world','pursuers','setSpawnDirector',{queue:[],budgets:[{id:'pursuers',total:start.difficulty.mode==='api'?Number.MAX_SAFE_INTEGER:Math.floor(340*start.difficulty.spawnBudgetMultiplier),reserved:0,spawned:0,maxAlive:24},...campBudgets],nextAt:720}));
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
 return {...createEmptyPlan(),changes:[createStateChange('world',entity.id,'putEntity',entity),...arenaCoverChanges(context),createStateChange('world','bosses','setBosses',{bosses:[boss]}),createStateChange('flow','phase','setFlowPhase',{phase:'boss',resumePhase:null})]};
}

/** Start the selected real faction encounter after two beacons; old snapshots default to Claude.
 * @implementationScope adventure-slice
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/adventure.js#planClaudeEncounter
 * @param {import('../../contracts.d.ts').EvaluationContext} context
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planBossEncounter(context){
 const state=context.state,faction=state.start.bossFaction??'claude';if(faction==='claude')return planClaudeEncounter(context);
 if(state.bosses.length||state.world.objectives.filter(o=>o.kind==='beacon'&&o.completed).length<2)return createEmptyPlan();
 const definitionId=`boss_${faction}`,p=context.catalog.definitions[definitionId].parameters,id=`boss:${faction}`,entity=createEntityState(id,definitionId,'enemy','enemy',{x:2550,y:1750},{faction,radius:42,hp:Number(p.hp)*state.start.difficulty.hpMultiplier,maxHp:Number(p.hp)*state.start.difficulty.hpMultiplier,armor:0,rewardPolicy:'elite',distillEligible:true,runtime:{finalBoss:true,engaged:true,damageMultiplier:state.start.difficulty.damageMultiplier,gptReadyAt:state.tick+120,echoReadyAt:state.tick+720,rocketReadyAt:state.tick+180,nextWaveAt:state.tick+120}}),boss=/** @type {import('../../contracts.d.ts').BossState} */({entityId:id,faction,phase:1,telegraph:null,resetNodes:[],resetRemaining:0,resetCooldown:0,spawnGroupSeq:0}),changes=[createStateChange('world',id,'putEntity',entity)];
 if(faction==='gpt'){
  const points=[{x:2350,y:1500},{x:2750,y:1600},{x:2500,y:2000},{x:2250,y:1850},{x:2800,y:1900}],high=state.start.difficulty.mechanicIds.includes('mech_10_boss_arena'),start=state.seed%(high?5:3);
  boss.resetNodes=Array.from({length:3},(_,n)=>({id:`node:${id}:${n}`,hp:45,consumed:false,position:points[(start+n)%(high?5:3)]}));
  for(const node of boss.resetNodes)changes.push(createStateChange('world',`marker:${node.id}`,'putEntity',createEntityState(`marker:${node.id}`,'gpt_node_marker','objective','neutral',node.position,{radius:22,sourceId:id})));
 }
 changes.push(createStateChange('world','bosses','setBosses',{bosses:[boss]}),createStateChange('flow','phase','setFlowPhase',{phase:'boss',resumePhase:null}));return {...createEmptyPlan(),changes};
}

/** @param {import('../../contracts.d.ts').EvaluationContext} context */
function arenaCoverChanges(context){const s=context.state;if(!s.start.difficulty.mechanicIds.includes('mech_10_boss_arena'))return[];const ids=['arena:cover:0','arena:cover:1'],changes=ids.map((id,n)=>createStateChange('world',id,'putEntity',createEntityState(id,'terrain_breakable','obstacle','neutral',[{x:2450,y:1620},{x:2680,y:1800}][n],{radius:35,hp:30,maxHp:30,runtime:{solid:true,breakable:true}})));changes.push(createStateChange('world',s.world.map.id,'setMap',{...s.world.map,obstacleIds:[...s.world.map.obstacleIds,...ids],navigationRevision:s.world.map.navigationRevision+1}));return changes;}
