import { describe, it, expect } from 'vitest';
import { loadContentCatalog, validateContentCatalog } from '../../src/v2/content/catalog.js';
import { createHandlerRegistry } from '../../src/v2/content/registry.js';
import { resolveDifficultySnapshot } from '../../src/v2/domain/difficulty.js';
import { createGameSession, enqueueSessionCommand, readSessionState, readSessionView, stepSessionWorld, stepSessionUi, disposeGameSession, restoreGameSession } from '../../src/v2/engine/session.js';
import { createCheckpoint, canCreateCheckpoint } from '../../src/v2/domain/checkpoint.js';
import { advancePreviewWorldTick } from '../../src/v2/engine/previewTick.js';
import { applySystemPlan } from '../../src/v2/engine/reducer.js';
import { createStateChange, createEmptyPlan } from '../../src/v2/domain/plans.js';
import { createEntityState } from '../../src/v2/domain/entities.js';
import { createStateDigest } from '../../src/v2/engine/snapshot.js';
import { findNavigationPath } from '../../src/v2/domain/navigation.js';
import { resolveBodyDestination } from '../../src/v2/domain/motionSolver.js';
const catalog=loadContentCatalog();
export function start(runId='preview:test') {
  return { runtimeProfile:'core-preview',runId,treeNodeIds:[],dsh:[],difficulty:resolveDifficultySnapshot({mode:'tutorial',difficulty:0},catalog).value,loadout:{weapons:['bubble','fan'].map(name=>({instanceId:name,definitionId:`mcp_${name}`,originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null})),activeWeaponIndex:0,skillId:'skill_cache',skillCooldown:0,companionId:null,companionCooldown:0,dashCooldown:0} };
}
function command(session,type,payload={},clock='world',seq=0,targetTick=readSessionState(session).tick+1) { return enqueueSessionCommand(session,{id:`cmd:${seq}`,seq,clock,targetTick:clock==='ui'?0:targetTick,type,payload}); }
function ctx(state) {return {state,catalog,random:state.random.combat,entityId:null,event:null};}

describe('source-backed V2 catalog',()=>{
 it('has all declared categories, exact 160-GPU tree cost, explicit runtime capabilities and detached loads',()=>{
  const registry=createHandlerRegistry();expect(validateContentCatalog(catalog,registry)).toEqual({valid:true,diagnostics:[]});expect(registry.implementedIds).toHaveLength(95);expect(Object.keys(registry.bindings)).toHaveLength(95);
  const copy=loadContentCatalog();copy.definitions.mcp_bubble.parameters.damage=99;expect(loadContentCatalog().definitions.mcp_bubble.parameters.damage).toBe(12);
 });
 it('rejects missing data, wrong tree totals, cyclic prerequisites and false capabilities',()=>{
  const broken=loadContentCatalog();delete broken.definitions.mcp_fan;expect(validateContentCatalog(broken,createHandlerRegistry()).valid).toBe(false);
  const cyclic=loadContentCatalog();cyclic.definitions.tree_body_a.parameters.prerequisites=['tree_body_f'];expect(validateContentCatalog(cyclic,createHandlerRegistry()).valid).toBe(false);
  const registry=createHandlerRegistry();registry.implementedIds.push('boss_gpt');expect(validateContentCatalog(catalog,registry).valid).toBe(false);
 });
});
describe('private V2 Session and command boundaries',()=>{
 it('requires explicit preview scope/identity and refuses to pretend full gameplay exists',()=>{
  expect(()=>createGameSession({...start(),runtimeProfile:'full'},19,catalog)).toThrow(/unfinished/);
  expect(()=>createGameSession({...start(),runId:undefined},19,catalog)).toThrow(/runId/);
  expect(()=>createGameSession({...start(),dsh:[{id:'dsh_open',options:{}}]},19,catalog)).toThrow(/not enabled/);
 });
 it('owns its state, start/catalog copies and output snapshots; disposed handles cannot operate',()=>{
  const initial=start(), data=loadContentCatalog(), session=createGameSession(initial,19,data);
  initial.loadout.weapons[0].definitionId='missing';data.definitions.mcp_bubble.parameters.damage=999;
  const snapshot=readSessionState(session);snapshot.world.entities.fish.hp=1;expect(readSessionState(session).world.entities.fish.hp).toBe(100);
  const view=readSessionView(session);view.entities[0].position.x=9999;expect(readSessionState(session).world.entities.fish.position.x).toBe(230);
  disposeGameSession(session);disposeGameSession(session);expect(()=>stepSessionWorld(session)).toThrow(/disposed/);
 });
 it('preserves future commands, rejects duplicate/unsupported input and acknowledges monotonic sequences',()=>{
  const s=createGameSession(start(),19,catalog);expect(command(s,'SetInput',{move:{x:1,y:0},aim:{x:1,y:0},firing:false},'world',0,5).ok).toBe(true);
  expect(command(s,'SetInput',{},'world',1).ok).toBe(false);expect(command(s,'unknown',{},'world',2).ok).toBe(false);
  for(let i=0;i<4;i++)stepSessionWorld(s);expect(readSessionState(s).world.entities.fish.position.x).toBe(230);
  stepSessionWorld(s);expect(readSessionState(s).world.entities.fish.position.x).toBeGreaterThan(230);expect(readSessionState(s).lastCommandSeq).toBe(0);
  expect(command(s,'Dash',{},'world',0).ok).toBe(false);
 });
 it('pauses immediately, clears held input, stops both clocks and resumes without advancing a tick',()=>{
  const s=createGameSession(start(),19,catalog);command(s,'SetInput',{move:{x:1,y:0},aim:{x:1,y:0},firing:true},'world',0);stepSessionWorld(s);
  command(s,'Pause',{},'ui',1);stepSessionUi(s);const paused=readSessionState(s);expect(paused.flow.phase).toBe('paused');expect(paused.input.firing).toBe(false);
  for(let n=0;n<20;n++){stepSessionWorld(s);stepSessionUi(s);}expect(readSessionState(s).tick).toBe(paused.tick);expect(readSessionState(s).uiTick).toBe(0);
  command(s,'Resume',{},'ui',2);stepSessionUi(s);expect(readSessionState(s).flow.phase).toBe('exploring');expect(readSessionState(s).tick).toBe(paused.tick);
 });
 it('runs native bubble/fan fire, preserves weapon cooldown when switching, and caches shield with native cooldown',()=>{
  const s=createGameSession(start(),19,catalog);command(s,'SetInput',{move:{x:0,y:0},aim:{x:1,y:0},firing:true},'world',0);stepSessionWorld(s);
  expect(Object.values(readSessionState(s).world.entities).filter(e=>e.kind==='projectile')).toHaveLength(1);
  command(s,'SwitchWeapon',{},'world',1);stepSessionWorld(s);expect(Object.values(readSessionState(s).world.entities).filter(e=>e.kind==='projectile')).toHaveLength(6);
  expect(readSessionState(s).player.loadout.weapons[0].cooldown).toBeGreaterThan(0);command(s,'Skill',{},'world',2);stepSessionWorld(s);expect(Object.values(readSessionState(s).world.shields)[0].amount).toBe(25);
  expect(readSessionState(s).player.loadout.skillCooldown).toBeGreaterThan(15.9);
 });
 it('checkpoint continuation reproduces identical future ticks once explicitly resumed',()=>{
  const s=createGameSession(start(),19,catalog);for(let n=0;n<5;n++)stepSessionWorld(s);
  const saved=readSessionState(s);const checkpoint=createCheckpoint(saved);const restored=restoreGameSession(checkpoint,catalog);expect(restored.ok).toBe(true);
  command(restored.value,'Resume',{},'ui',0);stepSessionUi(restored.value);
  // Match the acknowledged Resume command on the original so the complete state/ledger is comparable.
  command(s,'Pause',{},'ui',0);stepSessionUi(s);command(s,'Resume',{},'ui',1);stepSessionUi(s);
  command(s,'SetInput',{move:{x:1,y:0},aim:{x:1,y:0},firing:false},'world',2);
  command(restored.value,'SetInput',{move:{x:1,y:0},aim:{x:1,y:0},firing:false},'world',2);
  for(let n=0;n<80;n++){stepSessionWorld(s);stepSessionWorld(restored.value);}
  const a=readSessionState(s),b=readSessionState(restored.value);expect(b.world).toEqual(a.world);expect(b.random).toEqual(a.random);expect(b.player).toEqual(a.player);
 });
});
describe('connected combat geometry/rewards',()=>{
 it('slides bodies along terrain, prevents high-speed wall tunnelling and navigates around the same blocking geometry',()=>{
  const session=createGameSession(start(),19,catalog),state=readSessionState(session);state.world.entities.fish.position={x:500,y:420};
  const result=resolveBodyDestination(ctx(state),state.world.entities.fish,{x:800,y:420});expect(result.x).toBeLessThan(650-48-16+0.01);
  const path=findNavigationPath(ctx(state),{entityId:'fish',origin:{x:500,y:420},destination:{x:800,y:420},collisionProfileId:'body'});expect(path.reachable).toBe(true);expect(path.path.length).toBeGreaterThan(1);
 });
 it('stops a projectile at an intervening wall, without damaging an enemy behind it',()=>{
  const session=createGameSession(start(),19,catalog);let state=readSessionState(session);state.world.entities={fish:state.world.entities.fish};state.world.entities.fish.position={x:300,y:300};
  const wall=createEntityState('wall','terrain_rock','obstacle','neutral',{x:400,y:300},{radius:25,hp:99,maxHp:99,runtime:{highWall:true}});
  const enemy=createEntityState('target','enemy_grok_bot','enemy','enemy',{x:500,y:300},{hp:14,maxHp:14,radius:12,faction:'grok',rewardPolicy:'normal',runtime:{moveSpeed:0,contactDamage:0}});
  state=applySystemPlan(state,{...createEmptyPlan(),changes:[createStateChange('world','wall','putEntity',wall),createStateChange('world','target','putEntity',enemy)]});state.input.firing=true;
  for(let n=0;n<80;n++)state=advancePreviewWorldTick(state,[],catalog).next;
  expect(state.world.entities.target.hp).toBe(14);
 });
 it('kills once, drops real rice, absorbs it through movement and does not turn it into permanent currency',()=>{
  const session=createGameSession(start(),19,catalog);let state=readSessionState(session);state.world.entities={fish:state.world.entities.fish};
  const target=createEntityState('target','enemy_grok_bot','enemy','enemy',{x:300,y:270},{hp:10,maxHp:10,radius:12,faction:'grok',rewardPolicy:'normal',distillEligible:true,runtime:{moveSpeed:0,contactDamage:0}});
  state=applySystemPlan(state,{...createEmptyPlan(),changes:[createStateChange('world','target','putEntity',target)]});state.input.firing=true;
  for(let n=0;n<80;n++)state=advancePreviewWorldTick(state,[],catalog).next;
  expect(state.world.entities.target.dead).toBe(true);expect(state.totalTokens).toBe(4);expect(state.processedRewardIds.filter(id=>id==='deathReward:target')).toHaveLength(1);expect(state.inventory).toEqual({gpuFragments:0,parts:0});
 });
 it('same seed, initial run identity and logical commands reproduce an identical 120-tick state',()=>{
  function simulate(){const s=createGameSession(start(),91,catalog);command(s,'SetInput',{move:{x:0,y:1},aim:{x:1,y:0},firing:true},'world',0);for(let n=0;n<120;n++)stepSessionWorld(s);return createStateDigest(readSessionState(s));}
  expect(simulate()).toBe(simulate());
 });
});

it('navigation is invariant to entity dictionary insertion order across checkpoint serialization',()=>{
  const session=createGameSession(start(),31,catalog),state=readSessionState(session);
  state.world.entities.fish.position={x:500,y:420};
  const query={entityId:'fish',origin:{x:500,y:420},destination:{x:1800,y:800},collisionProfileId:'body'};
  const first=findNavigationPath(ctx(state),query);
  state.world.entities=Object.fromEntries(Object.entries(state.world.entities).reverse());
  expect(findNavigationPath(ctx(state),query)).toEqual(first);
});
