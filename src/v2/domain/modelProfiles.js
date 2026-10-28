// @ts-check
import {createEmptyPlan,createStateChange} from './plans.js';
/** Resolve a Pet stage once, independent of its species and cumulative difficulty mechanics.
 * @implementationScope core-preview + adventure-slice
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').EntityState|import('../contracts.d.ts').DeepReadonly<import('../contracts.d.ts').EntityState>} entity
 * @returns {number}
 */
export function resolvePetStage(entity){return Math.max(0,['gpt_astra','gpt_sol','gpt_terra','gpt_luna'].indexOf(String(entity.modelProfileId)));}
/** Snapshot model body/shell parameters at birth; never regenerate a broken shell or heal on a later profile event.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#resolvePetStage
 * @param {import('../contracts.d.ts').EntityState} entity
 * @returns {import('../contracts.d.ts').EntityState}
 */
export function initializeModelProfile(entity){
 if(entity.kind!=='enemy'||!entity.modelProfileId||entity.runtime.modelInitialized===true||entity.definitionId.startsWith('boss_'))return entity;
 const next=structuredClone(entity),profile=entity.modelProfileId;next.runtime={...next.runtime,modelInitialized:true};
 if(profile.startsWith('claude_')){const hp=(/** @type {Record<string,number>} */({claude_sonnet:80,claude_opus:110,claude_fable:160,claude_mythos:160}))[profile],api=['claude_fable','claude_mythos'].includes(profile);next.radius=hp?api?34:26:22;if(hp)next.shell={maxHp:hp*entity.maxHp/180,hp:hp*entity.maxHp/180,broken:false,weakArcDegrees:profile==='claude_sonnet'?360:profile==='claude_opus'?270:120,stunRemaining:0,enraged:false};}
 if(entity.definitionId==='enemy_gpt_rocky'){const guard=resolvePetStage(entity)>=1?35:20;next.runtime={...next.runtime,guardHp:guard*entity.maxHp/65,guardMaxHp:guard*entity.maxHp/65};}
 if(entity.definitionId==='enemy_gpt_stacky'&&resolvePetStage(entity)>=1){next.maxHp*=4/3;next.hp*=4/3;next.runtime={...next.runtime,stackLayers:4};}
 return next;
}
/** Public model handler: only an explicit birth event can apply parameters to an uninitialized body.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#initializeModelProfile
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DomainEvent} event
 * @param {string} profileId
 * @returns {import('../contracts.d.ts').SystemPlan}
 */
export function planModelProfile(context,event,profileId){
 const entity=context.entityId?context.state.world.entities[context.entityId]:null;if(event.type!=='EntitySpawned'||!entity||entity.modelProfileId!==profileId||entity.runtime.modelInitialized===true)return createEmptyPlan();
 const next=initializeModelProfile(structuredClone(entity));return {...createEmptyPlan(),changes:[createStateChange('entity',entity.id,'setModelBody',{hp:next.hp,maxHp:next.maxHp,radius:next.radius,shell:next.shell,runtime:next.runtime})]};
}

/** Rocky protects only its forward 120 degrees; the back remains directly vulnerable and the guard never regenerates.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../contracts.d.ts').EvaluationContext} context
 * @param {import('../contracts.d.ts').DamageRequest} request
 * @returns {{blocked:boolean;damage:number;plan:import('../contracts.d.ts').SystemPlan}}
 */
export function resolvePetGuard(context,request){
 const state=context.state,e=state.world.entities[request.targetId],empty={blocked:false,damage:0,plan:createEmptyPlan()};if(e?.definitionId!=='enemy_gpt_rocky'||Number(e.runtime.guardHp??0)<=0)return empty;
 let x=request.contact.x-e.position.x,y=request.contact.y-e.position.y;if(x===0&&y===0){x=-request.incomingDirection.x;y=-request.incomingDirection.y;}const angle=Math.atan2(y,x)-e.facingRadians,difference=Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)));if(difference>Math.PI/3+1e-12)return empty;
 const damage=Math.min(Number(e.runtime.guardHp),request.baseDamage),left=Number(e.runtime.guardHp)-damage,event={id:`rockyGuard:${e.id}`,runId:state.runId,tick:state.tick,seq:0,type:'RockyGuardBroken',sourceId:e.id,targetId:e.id,payload:{}};
 return {blocked:true,damage,plan:{...createEmptyPlan(),changes:[createStateChange('entity',e.id,'setEntityRuntime',{runtime:{...e.runtime,guardHp:left}})],events:left===0?[event]:[]}};
}
/** Only one live, guarded Terra/Luna Rocky in range can reduce a GPT ally's damage; links never stack.
 * @implementationScope core-preview + adventure-slice
 * @calls domain/modelProfiles.js#resolvePetStage
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @param {string} targetId
 * @returns {number}
 */
export function resolvePetLinkFactor(state,targetId){const target=state.world.entities[targetId];if(target?.faction!=='gpt')return 1;return Object.values(state.world.entities).some(e=>e.id!==targetId&&e.definitionId==='enemy_gpt_rocky'&&!e.dead&&!e.dying&&Number(e.runtime.guardHp??0)>0&&resolvePetStage(e)>=2&&(e.position.x-target.position.x)**2+(e.position.y-target.position.y)**2<=220**2)?.8:1;}
