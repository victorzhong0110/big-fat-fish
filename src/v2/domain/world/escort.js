// @ts-check
import {distanceSquared} from '../geometry.js';
import {findNavigationPath} from '../navigation.js';
import {createEmptyPlan,createStateChange} from '../plans.js';
import {planObjectiveSignal} from './lateMechanics.js';
import {planObjectiveCompletion} from './objectives.js';
import {validatePressureReservation} from './pressureRules.js';

/** Start the optional delivery once, only by interacting within reach. Repeated interaction cannot reset the route, wave budget or reward.
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @param {string} id
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planEscortStart(c,id){
 const s=c.state,robot=s.world.entities[id],player=s.world.entities[s.player.entityId],goal=s.world.objectives.find(o=>o.id===id&&o.kind==='escort');
 if(!s.expedition||s.flow.phase!=='exploring'||!robot||!goal||!goal.active||goal.completed||robot.runtime.escortState!=='ready'||distanceSquared(player.position,robot.position)>96**2)return createEmptyPlan();
 return {...createEmptyPlan(),changes:[createStateChange('entity',id,'setEntityRuntime',{runtime:{...robot.runtime,escortState:'active',escortNextWaveAt:s.tick+600}})],events:[{id:`escort:start:${id}`,runId:s.runId,tick:s.tick,seq:0,type:'EscortStarted',sourceId:player.id,targetId:id,payload:{objectiveId:id}}]};
}

/** Advance the active region's delivery after combat. The robot follows a collision-checked route only while the player is nearby and no ordinary foe crowds it. Four finite, visible-warning waves use the shared pressure arbiter; completion and reward require reaching every waypoint.
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/navigation.js#findNavigationPath
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @calls domain/world/lateMechanics.js#planObjectiveSignal
 * @calls domain/world/objectives.js#planObjectiveCompletion
 * @calls domain/world/pressureRules.js#validatePressureReservation
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planEscortAdvance(c){
 const s=c.state;if(!s.expedition||s.flow.phase!=='exploring')return createEmptyPlan();const goal=s.world.objectives.find(o=>o.kind==='escort'&&o.active&&!o.completed&&s.world.entities[o.id]?.runtime.escortState==='active');if(!goal)return createEmptyPlan();
 const robot=s.world.entities[goal.id],player=s.world.entities[s.player.entityId],near=distanceSquared(player.position,robot.position)<=240**2;
 const blocked=Object.values(s.world.entities).some(e=>e.kind==='enemy'&&e.runtime.noAi!==true&&!e.dead&&!e.dying&&distanceSquared(e.position,robot.position)<=180**2);
 if(!near||blocked)return createEmptyPlan();
 if(robot.runtime.signalCreated!==true){const signal=planObjectiveSignal(c,goal.id);if(signal.changes.length)return signal;}
 const waveSeq=Number(robot.runtime.escortWaveSeq??0);
 if(waveSeq<4&&s.tick>=Number(robot.runtime.escortNextWaveAt??Number.MAX_SAFE_INTEGER)){
  const event=/** @type {import('../../contracts.d.ts').PressureEvent} */({id:`pressure:${goal.id}:escort:${waveSeq}`,mechanicId:'mech_01_exploration',budgetId:`escortBudget:${goal.id}`,phase:'queued',startedAt:null,remaining:4,runtime:{kind:'escort',objectiveId:goal.id,count:4,durationTicks:840,species:['enemy_grok_bot','enemy_grok_bot','enemy_grok_bot','enemy_gpt_dewey'],title:'护送途中 · 追兵'}}),reserved=validatePressureReservation(c,event);
  if(reserved.ok)return {...createEmptyPlan(),changes:[createStateChange('world','pressure','setPressureEvents',{events:[...s.world.pressureEvents,reserved.value]}),createStateChange('entity',robot.id,'setEntityRuntime',{runtime:{...robot.runtime,escortWaveSeq:waveSeq+1,escortNextWaveAt:s.tick+1320}})]};
 }
 const route=/** @type {readonly import('../../contracts.d.ts').Vec2[]} */(/** @type {unknown} */(robot.runtime.escortRoute)),revision=s.world.map.navigationRevision;
 let path=/** @type {import('../../contracts.d.ts').Vec2[]} */(structuredClone(robot.runtime.escortPath??[])),pathRevision=Number(robot.runtime.escortPathRevision??-1),noRoute=robot.runtime.escortNoRoute===true;
 if(pathRevision!==revision||!path.length&&!noRoute){const result=findNavigationPath(c,{entityId:robot.id,origin:robot.position,destination:route[goal.progress],collisionProfileId:robot.collisionProfileId});path=[...result.path];pathRevision=revision;noRoute=!result.reachable;}
 if(!path.length){if(robot.runtime.escortPathRevision===revision&&robot.runtime.escortNoRoute===noRoute)return createEmptyPlan();return {...createEmptyPlan(),changes:[createStateChange('entity',robot.id,'setEntityRuntime',{runtime:{...robot.runtime,escortPath:[],escortPathRevision:revision,escortNoRoute:noRoute}})]};}
 const target=path[0],dx=target.x-robot.position.x,dy=target.y-robot.position.y,distance=Math.hypot(dx,dy),step=Math.min(distance,36/60),position=distance?{x:robot.position.x+dx/distance*step,y:robot.position.y+dy/distance*step}:{...target},facing=distance?Math.atan2(dy,dx):robot.facingRadians;
 if(distance<=36/60)path.shift();const legDone=path.length===0,progress=goal.progress+(legDone?1:0),arrived=progress===route.length;
 const runtime={...robot.runtime,escortPath:path,escortPathRevision:pathRevision,escortNoRoute:noRoute,escortState:arrived?'arrived':'active'},changes=[createStateChange('entity',robot.id,'setEntityKinematics',{position,previousPosition:robot.position,velocity:{x:0,y:0},facingRadians:facing}),createStateChange('entity',robot.id,'setEntityRuntime',{runtime})];
 if(!legDone)return {...createEmptyPlan(),changes};
 const objectives=s.world.objectives.map(o=>o.id===goal.id?{...o,progress}:o);
 if(!arrived)return {...createEmptyPlan(),changes:[...changes,createStateChange('world','objectives','setObjectives',{objectives})]};
 const fake={...s,world:{...s.world,entities:{...s.world.entities,[robot.id]:{...robot,position,runtime}},objectives}},completion=planObjectiveCompletion({...c,state:fake},goal.id);
 return {...completion,changes:[...changes,...completion.changes]};
}
