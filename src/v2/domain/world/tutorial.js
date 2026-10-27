// @ts-check
import {createEmptyPlan,createStateChange} from '../plans.js';
import {createEntityState} from '../entities.js';
import {distanceSquared} from '../geometry.js';

/** Construct the formal Free lesson as an isolated small sea. It has no permanent loot or adventure easter eggs.
 * @implementationScope adventure-slice Free引导
 * @calls domain/entities.js#createEntityState
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').StartSnapshot} start
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function createTutorialMapPlan(start,catalog){
 const changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]),put=(/** @type {import('../../contracts.d.ts').EntityState} */ e)=>changes.push(createStateChange('world',e.id,'putEntity',e));
 put(createEntityState('checkpoint:home','world_checkpoint','objective','neutral',{x:230,y:270},{radius:28,runtime:{interaction:'checkpoint'}}));
 put(createEntityState('tutorial:gate','world_gate','objective','neutral',{x:230,y:365},{radius:40,runtime:{interaction:'tutorialGate',unlocked:false}}));
 put(createEntityState('tutorial:director','world_checkpoint','objective','neutral',{x:50,y:50},{runtime:{hidden:true,stage:'move',moved:false,aimed:false,rootAt:null}}));
 put(createEntityState('tutorial:trainer','easter_interface','enemy','enemy',{x:1500,y:900},{runtime:{hidden:true,noAi:true,untargetable:true,trainingInterface:true}}));
 for(const [n,definitionId,position] of /** @type {[number,string,import('../../contracts.d.ts').Vec2][]} */([[0,'enemy_claude_guard',{x:890,y:300}],[1,'enemy_grok_bot',{x:760,y:470}],[2,'enemy_grok_bot',{x:900,y:520}]])){
  const p=catalog.definitions[definitionId].parameters,crab=n===0,hp=Number(p.hp)*start.difficulty.hpMultiplier;
  put(createEntityState(`tutorial:enemy:${n}`,definitionId,'enemy','enemy',position,{faction:crab?'claude':'grok',radius:Number(p.radius),hp,maxHp:hp,modelProfileId:crab?start.difficulty.modelProfileIds.claude:'grok_bot',rewardPolicy:'normal',distillEligible:true,runtime:{moveSpeed:Number(p.moveSpeed),contactDamage:Number(p.contactDamage)*start.difficulty.damageMultiplier,damageMultiplier:start.difficulty.damageMultiplier,spawnGroup:'tutorial'}}));
 }
 changes.push(createStateChange('world','tutorial:sea','setMap',{id:'tutorial:sea',biomeIndex:0,width:1600,height:1000,exploredCells:[],obstacleIds:[],checkpointIds:['checkpoint:home'],exitIds:['tutorial:gate'],navigationRevision:0}),createStateChange('world','objectives','setObjectives',{objectives:[]}),createStateChange('world','tutorial','setSpawnDirector',{queue:[],budgets:[],nextAt:Number.MAX_SAFE_INTEGER}));
 return {...createEmptyPlan(),changes};
}

/** Advance instructions using real world actions, level-choice resolution and control removal. Paused/UI time never advances this lesson.
 * @implementationScope adventure-slice Free引导
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planTutorialAdvance(c){
 const s=c.state,d=s.world.entities['tutorial:director'],p=s.world.entities[s.player.entityId];if(!s.start.guidedTutorial||!d||s.flow.phase!=='exploring'||p.dead)return createEmptyPlan();const rt={...d.runtime},stage=String(rt.stage),changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]);
 if(stage==='move'){const moved=rt.moved===true||distanceSquared(p.position,{x:230,y:270})>=80**2,aimed=rt.aimed===true||s.input.firing;if(moved!==rt.moved||aimed!==rt.aimed){rt.moved=moved;rt.aimed=aimed;if(moved&&aimed)rt.stage='collect';}else return createEmptyPlan();}
 else if(stage==='collect'){if(s.level<2||s.flow.queuedLevelRewards.length||s.flow.choice)return createEmptyPlan();rt.stage='dash';}
 else if(stage==='dash'){if(Number(p.runtime.dashUntil??0)<=s.tick)return createEmptyPlan();rt.stage='escapeWait';rt.rootAt=s.tick+90;}
 else if(stage==='escapeWait'){
  if(s.tick<Number(rt.rootAt))return createEmptyPlan();const id=`control:${p.id}:root`;if(p.statusIds.includes(id))return createEmptyPlan();
  changes.push(createStateChange('world',id,'setStatus',{id,kind:'root',sourceId:'tutorial:trainer',remaining:120,requiredInputs:3,completedInputs:0,modifiersApplied:[]}),createStateChange('entity',p.id,'setStatusIds',{ids:[...p.statusIds,id]}),createStateChange('entity',p.id,'setEntityRuntime',{runtime:{...p.runtime,escapeHeld:false,lastEscapeAt:s.tick-6}}));rt.stage='escape';rt.rootAt=null;
 }
 else if(stage==='escape'){
  if(p.statusIds.some(id=>s.world.statuses[id]?.kind==='root'))return createEmptyPlan();if(s.player.controlImmuneRemaining<=0){rt.stage='escapeWait';rt.rootAt=s.tick+60;}else{rt.stage='checkpoint';const gate=s.world.entities['tutorial:gate'];changes.push(createStateChange('entity',gate.id,'setEntityRuntime',{runtime:{...gate.runtime,unlocked:true}}));}
 }else return createEmptyPlan();
 changes.push(createStateChange('entity',d.id,'setEntityRuntime',{runtime:rt}));return {...createEmptyPlan(),changes,events:[{id:`tutorial:stage:${s.runId}:${s.tick}`,runId:s.runId,tick:s.tick,seq:0,type:'TutorialStageChanged',sourceId:p.id,targetId:null,payload:{stage:rt.stage}}]};
}

/** Start only the tutorial's 300-HP Claude encounter after the lesson and a nearby explicit interaction.
 * @implementationScope adventure-slice Free引导
 * @calls domain/entities.js#createEntityState
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planTutorialBoss(c){const s=c.state,d=s.world.entities['tutorial:director'],gate=s.world.entities['tutorial:gate'],p=s.world.entities[s.player.entityId];if(!s.start.guidedTutorial||s.flow.phase!=='exploring'||d?.runtime.stage!=='checkpoint'||!gate||distanceSquared(p.position,gate.position)>96**2||s.bosses.length)return createEmptyPlan();const definition=c.catalog.definitions.boss_claude.parameters,id='tutorial:boss',body=createEntityState(id,'boss_claude','enemy','enemy',{x:850,y:480},{faction:'claude',radius:45,hp:300,maxHp:300,armor:0,rewardPolicy:'none',distillEligible:false,runtime:{finalBoss:true,guidedBoss:true,engaged:true,moveSpeed:Number(definition.moveSpeed),contactDamage:Number(definition.contactDamage)*.5,damageMultiplier:.5,nextClaudeMoveAt:s.tick+120}}),boss={entityId:id,faction:'claude',phase:1,telegraph:null,resetNodes:[],resetRemaining:0,resetCooldown:0,spawnGroupSeq:0};return {...createEmptyPlan(),changes:[createStateChange('world',id,'putEntity',body),createStateChange('world','bosses','setBosses',{bosses:[boss]}),createStateChange('entity',d.id,'setEntityRuntime',{runtime:{...d.runtime,stage:'boss'}}),createStateChange('flow','phase','setFlowPhase',{phase:'boss',resumePhase:null})]};}

/** Tutorial-only retry after an actual player death. Clear control/shields, return to the lesson start and reset a live tutorial Boss; carried experience and completed lesson steps are retained.
 * @implementationScope adventure-slice Free引导
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @param {readonly import('../../contracts.d.ts').DeathRecord[]} deaths
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planTutorialRetry(c,deaths){const s=c.state,p=s.world.entities[s.player.entityId],d=s.world.entities['tutorial:director'];if(!s.start.guidedTutorial||!d||!deaths.some(x=>x.entityId===p.id))return createEmptyPlan();const changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]);for(const id of p.statusIds)changes.push(createStateChange('world',id,'removeStatus',{}));for(const id of p.shieldIds)changes.push(createStateChange('world',id,'removeShield',{}));changes.push(createStateChange('entity',p.id,'reviveTutorialEntity',{hp:p.maxHp}),createStateChange('entity',p.id,'setStatusIds',{ids:[]}),createStateChange('entity',p.id,'setShieldIds',{ids:[]}),createStateChange('entity',p.id,'setEntityKinematics',{position:{x:230,y:270},previousPosition:{x:230,y:270},velocity:{x:0,y:0},facingRadians:p.facingRadians}),createStateChange('entity',p.id,'setEntityRuntime',{runtime:{...p.runtime,dashUntil:0,escapeHeld:false,rollbackHistory:[[s.tick,230,270,Number(p.runtime.hpDamageTotal??0)]]}}),createStateChange('player',p.id,'setInvulnerable',{remaining:3}),createStateChange('runtime','input','setInput',{...s.input,move:{x:0,y:0},firing:false,heldKeys:[],pointerIds:[]}));
 if(d.runtime.stage==='escape')changes.push(createStateChange('entity',d.id,'setEntityRuntime',{runtime:{...d.runtime,stage:'escapeWait',rootAt:s.tick+90}}));
 const b=s.world.entities['tutorial:boss'];if(b&&d.runtime.stage==='boss')changes.push(createStateChange('entity',b.id,'reviveTutorialEntity',{hp:300}),createStateChange('entity',b.id,'setEntityKinematics',{position:{x:850,y:480},previousPosition:{x:850,y:480},velocity:{x:0,y:0},facingRadians:0}),createStateChange('entity',b.id,'setEntityRuntime',{runtime:{...b.runtime,claudeMove:null,claudeMoveIndex:0,nextClaudeMoveAt:s.tick+120}}));
 return {...createEmptyPlan(),changes,events:[{id:`tutorial:retry:${s.runId}:${s.tick}`,runId:s.runId,tick:s.tick,seq:0,type:'TutorialRetry',sourceId:p.id,targetId:null,payload:{stage:d.runtime.stage}}]};}
