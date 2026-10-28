// @ts-check
import {normalizeVector,distanceSquared} from './geometry.js';
/** @typedef {import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} Body */
/** @typedef {Record<string,import('../contracts.d.ts').Json>} Runtime */
/** Stable stagger/handedness without consuming combat RNG. @param {string} id */
function offset(id){let n=0;for(const c of id)n=(n*31+c.charCodeAt(0))>>>0;return n;}
/** Choose a tactical goal independently of attacks. Homes/ranges are stored in
 * runtime so pursuit cannot drag sentries away and checkpoints keep territory.
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @param {import('../contracts.d.ts').EvaluationContext} context @param {Body} entity @param {Body} target
 * @returns {{goal:import('../contracts.d.ts').Vec2;runtime:Runtime}}
 */
export function resolveEnemyMovementGoal(context,entity,target){
 const id=entity.definitionId,mode=['enemy_grok_bot','boss_grok'].includes(id)?'hop':id==='enemy_gpt_fireball'?'dash':['enemy_gpt_codex','enemy_gpt_dewey'].includes(id)?'orbit':['enemy_gpt_hoots','enemy_gpt_seedy','enemy_gpt_stacky','enemy_gpt_rocky'].includes(id)?'guard':'pursue';
 const home=/** @type {import('../contracts.d.ts').Vec2} */(entity.runtime.movementHome??entity.position),runtime=/** @type {Runtime} */({...entity.runtime,movementMode:mode,movementHome:{...home}});
 let goal={...target.position};
 if(mode==='orbit'){
  const delta={x:target.position.x-entity.position.x,y:target.position.y-entity.position.y},distance=Math.hypot(delta.x,delta.y),d=normalizeVector(distance?delta:{x:1,y:0}),range=id==='enemy_gpt_dewey'?290:270,radial=Math.max(-1.5,Math.min(1.5,(distance-range)/65)),side=offset(entity.id)%2?1:-1;
  const move=normalizeVector({x:d.x*radial-d.y*side,y:d.y*radial+d.x*side});goal={x:entity.position.x+move.x*100,y:entity.position.y+move.y*100};
 }else if(mode==='guard'){
  const radius=id==='enemy_gpt_hoots'?150:id==='enemy_gpt_seedy'?100:id==='enemy_gpt_stacky'?120:230;runtime.leashRadius=radius;
  const distance=Math.sqrt(distanceSquared(entity.position,target.position));
  if(distance>650)goal={...home};
  else if(id==='enemy_gpt_hoots'&&distance<370){const d=normalizeVector({x:entity.position.x-target.position.x,y:entity.position.y-target.position.y});goal={x:entity.position.x+d.x*100,y:entity.position.y+d.y*100};}
  else if(id==='enemy_gpt_rocky')goal={...target.position};
  else goal={...home};
  const d={x:goal.x-home.x,y:goal.y-home.y},length=Math.hypot(d.x,d.y);if(length>radius)goal={x:home.x+d.x/length*radius,y:home.y+d.y/length*radius};
 }
 const map=context.state.world.map;goal={x:Math.max(entity.radius,Math.min(map.width-entity.radius,goal.x)),y:Math.max(entity.radius,Math.min(map.height-entity.radius,goal.y))};return{goal,runtime};
}
/** Convert navigated velocity into real stop/start hops or a locked dash. These
 * are physical velocities, not cosmetic offsets; ordinary collision still runs.
 * @calls domain/geometry.js#distanceSquared
 * @calls domain/geometry.js#normalizeVector
 * @param {import('../contracts.d.ts').EvaluationContext} context @param {Body} entity @param {Body} target @param {import('../contracts.d.ts').Vec2} desired @param {Runtime} prior
 * @returns {{velocity:import('../contracts.d.ts').Vec2;runtime:Runtime}}
 */
export function resolveEnemyVelocity(context,entity,target,desired,prior){
 const runtime={...prior},tick=context.state.tick,mode=String(runtime.movementMode??''),speed=Math.hypot(desired.x,desired.y);let velocity={...desired};
 if(mode==='hop'){
  const clock=tick+offset(entity.id)%48,cycle=Math.floor(clock/48),phase=clock%48;
  if(speed>0&&phase<16){if(runtime.hopCycle!==cycle){runtime.hopCycle=cycle;runtime.hopDirection=normalizeVector(desired);}const d=/** @type {import('../contracts.d.ts').Vec2} */(runtime.hopDirection??normalizeVector(desired));velocity={x:d.x*speed*3,y:d.y*speed*3};runtime.hopPhase=phase;}
  else{velocity={x:0,y:0};runtime.hopPhase=16;}
 }else if(mode==='dash'){
  const distance=Math.sqrt(distanceSquared(entity.position,target.position));
  if(!runtime.petCast&&speed>0&&tick>=Number(runtime.nextTacticalDashAt??0)&&distance>=110&&distance<=430){runtime.tacticalWindupUntil=tick+36;runtime.tacticalDashUntil=tick+60;runtime.nextTacticalDashAt=tick+240;runtime.dashAim={...target.position};runtime.tacticalDashDirection=normalizeVector({x:target.position.x-entity.position.x,y:target.position.y-entity.position.y});}
  if(tick<Number(runtime.tacticalWindupUntil??0))velocity={x:0,y:0};
  else if(tick<Number(runtime.tacticalDashUntil??0)){const d=/** @type {import('../contracts.d.ts').Vec2} */(runtime.tacticalDashDirection);velocity={x:d.x*speed*3.6,y:d.y*speed*3.6};}
 }
 return{velocity,runtime};
}
