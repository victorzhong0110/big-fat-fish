import { describe, it, expect } from 'vitest';
import { loadContentCatalog } from '../../src/v2/content/catalog.js';
import { createInitialGameState } from '../../src/v2/domain/initial.js';
import { resolveDifficultySnapshot } from '../../src/v2/domain/difficulty.js';
import { createEntityState } from '../../src/v2/domain/entities.js';
import { advancePreviewWorldTick, advancePreviewUiCommands } from '../../src/v2/engine/previewTick.js';
import { createPluginChoice, planPluginSelection, planPluginReroll, planPluginSkip } from '../../src/v2/domain/draft.js';
import { planLevelProgression } from '../../src/v2/domain/levels.js';
import { advanceDistillTrack, planDistillEvent, planDistilledAbilities } from '../../src/v2/domain/distill.js';
import { applySystemPlan, validateStateInvariants } from '../../src/v2/engine/reducer.js';
import { derivePlayerStats } from '../../src/v2/domain/stats.js';
import { inspectGameState } from '../../src/v2/domain/stateValidation.js';
import { createCheckpoint, restoreCheckpointState } from '../../src/v2/domain/checkpoint.js';
import { detectCollisions } from '../../src/v2/domain/collision.js';
import { planEntityMotion } from '../../src/v2/domain/movement.js';
import { planCollisionEffects } from '../../src/v2/domain/attacks.js';
import { drainEffectQueue } from '../../src/v2/engine/effectLoop.js';
import { freeze } from './fixtures.js';
const catalog=loadContentCatalog();
function game(){return createInitialGameState({runtimeProfile:'core-preview',runId:'growth:test',treeNodeIds:[],dsh:[],difficulty:resolveDifficultySnapshot({mode:'tutorial',difficulty:0},catalog).value,loadout:{weapons:[{instanceId:'bubble',definitionId:'mcp_bubble',originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null}],activeWeaponIndex:0,skillId:'skill_cache',skillCooldown:0,companionId:null,companionCooldown:0,dashCooldown:0}},19,catalog);}
function ctx(state){return {state,catalog,random:state.random.reward,event:null,entityId:null};}
function plugin(id='plugin_distill',rank=1){return {id,rank,origin:'run',runtime:{}};}
function ui(state,type,extra={}){return {id:`cmd:${state.lastCommandSeq+1}`,seq:state.lastCommandSeq+1,targetTick:state.uiTick,clock:'ui',type,payload:{choiceId:state.flow.choice?.id,...extra}};}
function apply(state,plan){return applySystemPlan(state,plan);}
function gain(amount=120){let s=game();s.world.pickups.rice={id:'rice',kind:'riceXp',amount,position:{...s.world.entities.fish.position},collected:false,instanceId:null};return advancePreviewWorldTick(freeze(s),[],catalog).next;}
function death(state,faction='claude',policy='normal',id='crab'){
 state.world.entities[id]=createEntityState(id,faction==='grok'?'enemy_grok_bot':'enemy_claude_guard','enemy','enemy',{x:400,y:270},{hp:0,dead:true,dying:true,faction,rewardPolicy:policy,distillEligible:true});
 return {id:`death:${id}`,runId:state.runId,tick:state.tick,seq:0,type:'EntityDied',sourceId:'fish',targetId:id,payload:{entityId:id,sourceId:'fish',creditOwner:'player',faction,rewardPolicy:policy,distillEligible:true,groupId:null}};
}
describe('connected XP and plugin progression',()=>{
 it('uses actual rice collection, saves overflow, grows HP once and freezes before the next level',()=>{
  const s=gain();expect(s.totalTokens).toBe(120);expect(s.level).toBe(2);expect(s.xpRemainder).toBe(90);expect(s.flow.phase).toBe('pluginChoice');expect(s.world.entities.fish.hp).toBe(102);expect(s.player.baseStats.maxHp).toBe(102);expect(s.flow.choice.candidates).toHaveLength(3);expect(s.flow.choice.candidates[0]).toEqual({id:'plugin_distill',rank:1});expect(validateStateInvariants(s,catalog).valid).toBe(true);
  const frozen=advancePreviewWorldTick(s,[],catalog);expect(frozen.next).toEqual(s);
 });
 it('resolves one choice before subsequent levels, with exact thresholds and no duplicate healing',()=>{
  let s=gain();const first=ui(s,'SelectPlugin',{optionId:'plugin_distill'});s=advancePreviewUiCommands(s,[first],catalog).next;
  expect(s.level).toBe(4);expect(s.xpRemainder).toBe(0);expect(s.world.entities.fish.hp).toBe(106);expect(s.flow.phase).toBe('pluginChoice');expect(s.flow.choice.level).toBe(4);expect(s.plugins).toEqual([plugin()]);
  const before=structuredClone(s);s=advancePreviewUiCommands(s,[first],catalog).next;expect(s.player).toEqual(before.player);expect(s.flow.choice).toEqual(before.flow.choice);
  s=advancePreviewUiCommands(s,[ui(s,'SkipPlugin')],catalog).next;expect(s.flow.phase).toBe('exploring');expect(s.tick).toBe(1);expect(s.uiTick).toBe(0);expect(s.world.entities.fish.hp).toBe(106);expect(s.inventory).toEqual({gpuFragments:0,parts:0});
 });
 it('does not level on insufficient XP, during pause, or beyond the finite mode cap',()=>{
  let s=game();s.xpRemainder=29;expect(planLevelProgression(ctx(s)).changes).toEqual([]);s.xpRemainder=100;s.flow.phase='paused';expect(planLevelProgression(ctx(s)).changes).toEqual([]);s.flow.phase='exploring';s.level=16;expect(planLevelProgression(ctx(s)).changes).toEqual([]);
 });
 it('gives terminal defeat priority over waiting XP and never revives a dead player through growth',()=>{
  const s=game();s.xpRemainder=100;s.world.entities.fish.hp=0;s.world.entities.fish.dead=true;s.world.entities.fish.dying=true;s.flow.phase='defeat';expect(planLevelProgression(ctx(s)).changes).toEqual([]);
 });
 it('draws deterministic unique candidates without mutating its input or combat RNG',()=>{
  const s=gain();s.flow.choice=null;const reward=s.flow.queuedLevelRewards[0],before=structuredClone(s);const a=createPluginChoice(ctx(freeze(s)),reward),b=createPluginChoice(ctx(s),reward);expect(a).toEqual(b);expect(s).toEqual(before);expect(a.value.nextRandom.cursor).toBeGreaterThan(s.random.reward.cursor);expect(new Set(a.value.choice.candidates.map(c=>c.id)).size).toBe(3);
 });
 it('spends exactly one whole-run reroll, prioritizes unseen cards and rejects old choice IDs',()=>{
  let s=gain(),old=s.flow.choice;const unseen=['plugin_collect','plugin_5h','plugin_guard','plugin_distill'].find(id=>!old.candidates.some(c=>c.id===id));s=advancePreviewUiCommands(s,[ui(s,'RerollPlugin')],catalog).next;expect(s.flow.pluginRerollsUsed).toBe(1);expect(s.flow.choice.id).not.toBe(old.id);expect(s.flow.choice.candidates[0].id).toBe(unseen);expect(planPluginReroll(ctx(s),ui(s,'RerollPlugin')).changes).toEqual([]);expect(planPluginSelection(ctx(s),{payload:{choiceId:old.id,optionId:'plugin_distill'}}).changes).toEqual([]);
  s=advancePreviewUiCommands(s,[ui(s,'SkipPlugin')],catalog).next;expect(s.flow.choice.rerollsUsed).toBe(1);expect(planPluginReroll(ctx(s),ui(s,'RerollPlugin')).changes).toEqual([]);
 });
 it('does not offer rank-two plugins again and permits an empty pool with a skip',()=>{
  const s=gain();s.flow.choice=null;s.plugins=['plugin_collect','plugin_guard','plugin_5h','plugin_distill'].map(id=>plugin(id,2));const choice=createPluginChoice(ctx(s),s.flow.queuedLevelRewards[0]).value.choice;expect(choice.candidates).toEqual([]);s.flow.choice=choice;expect(planPluginSkip(ctx(s),ui(s,'SkipPlugin')).changes.length).toBeGreaterThan(0);
 });
 it('upgrades in place, preserves origin, and lowers distillation thresholds immediately',()=>{
  let s=gain();s.plugins=[plugin('plugin_distill')];s.distill.claude={stage:0,samples:5};s.flow.choice.candidates=[{id:'plugin_distill',rank:2}];s=apply(s,planPluginSelection(ctx(s),ui(s,'SelectPlugin',{optionId:'plugin_distill'})));expect(s.plugins).toEqual([plugin('plugin_distill',2)]);expect(s.distill.claude).toEqual({stage:1,samples:1});
 });
 it('refuses checkpoint saves during choice, then preserves plugins and RNG after settling rewards',()=>{
  let s=gain();expect(()=>createCheckpoint(s)).toThrow(/settled/);s=advancePreviewUiCommands(s,[ui(s,'SelectPlugin',{optionId:'plugin_distill'})],catalog).next;s=advancePreviewUiCommands(s,[ui(s,'SkipPlugin')],catalog).next;const checkpoint=createCheckpoint(s),result=restoreCheckpointState(checkpoint,catalog);expect(result.ok).toBe(true);expect(result.value.plugins).toEqual(s.plugins);expect(result.value.random).toEqual(s.random);expect(result.value.level).toBe(4);expect(result.value.world.entities.fish.hp).toBe(106);
 });
 it('rejects corrupted pending choice, sample tracks and reroll counters',()=>{
  const s=gain();s.flow.choice.candidates.push(s.flow.choice.candidates[0]);expect(inspectGameState(s,catalog).valid).toBe(false);const t=game();t.distill.grok.stage=3;t.distill.grok.samples=1;expect(inspectGameState(t,catalog).valid).toBe(false);const u=game();u.flow.pluginRerollsUsed=2;expect(inspectGameState(u,catalog).valid).toBe(false);
 });
});
describe('distillation: credited kills and persistent sample tracks',()=>{
 it('converts overflow, caps at three stages, and rejects invalid/overflowed counts',()=>{
  expect(advanceDistillTrack({stage:0,samples:5},8,6)).toEqual({stage:2,samples:1});expect(advanceDistillTrack({stage:2,samples:5},100,6)).toEqual({stage:3,samples:0});expect(()=>advanceDistillTrack({stage:0,samples:0},1,0)).toThrow();expect(()=>advanceDistillTrack({stage:0,samples:1},Number.MAX_SAFE_INTEGER,6)).toThrow();
 });
 it('awards normal/elite Claude 3/6, GPT 1/3, Grok group member 1, boss 6',()=>{
  for(const [faction,policy,boss,expected] of [['claude','normal',false,3],['claude','elite',false,6],['gpt','normal',false,1],['gpt','elite',false,3],['grok','group',false,1],['grok','normal',true,6]]){const s=game();s.plugins=[plugin()];const event=death(s,faction,policy);if(boss)s.bosses=[{entityId:'crab'}];const result=apply(s,planDistillEvent(ctx(freeze(s)),event));expect(result.distill[faction]).toEqual(advanceDistillTrack({stage:0,samples:0},expected,faction==='grok'?10:6));}
 });
 it('rejects echo/rewardless, enemy-credit and ineligible deaths; never awards a repeated event',()=>{
  let s=game();s.plugins=[plugin()];const event=death(s);s=apply(s,planDistillEvent(ctx(s),event));expect(planDistillEvent(ctx(s),event).changes).toEqual([]);
  for(const patch of [{rewardPolicy:'none'},{creditOwner:'enemy'},{distillEligible:false}]){const t=game();t.plugins=[plugin()];const e=death(t);Object.assign(e.payload,patch);expect(planDistillEvent(ctx(t),e).changes).toEqual([]);}
 });
 it('requires currently equipped distill; removal freezes progress and disables passive bonuses',()=>{
  let s=game();const event=death(s);expect(planDistillEvent(ctx(s),event).changes).toEqual([]);s.plugins=[plugin()];s.distill.claude={stage:3,samples:0};s.distill.grok={stage:3,samples:0};expect(derivePlayerStats(s,catalog).armor).toBe(18);expect(derivePlayerStats(s,catalog).moveSpeed).toBeCloseTo(239.8);s.plugins=[];expect(derivePlayerStats(s,catalog).armor).toBe(0);expect(derivePlayerStats(s,catalog).moveSpeed).toBe(220);expect(s.distill.claude.stage).toBe(3);
 });
 it('creates a Claude shield only after actual HP damage, with a persistent ten-second cooldown',()=>{
  let s=game();s.plugins=[plugin()];s.distill.claude={stage:2,samples:0};const event={id:'hurt',runId:s.runId,tick:0,seq:0,type:'DamageResolved',sourceId:'crab',targetId:'fish',payload:{hpDamage:0}};expect(planDistillEvent(ctx(s),event).effects).toEqual([]);event.payload.hpDamage=1;const plan=planDistillEvent(ctx(s),event);expect(plan.effects[0].payload).toEqual({targetId:'fish',amount:8,duration:2});s=apply(s,plan);expect(planDistillEvent(ctx(s),event).effects).toEqual([]);s.plugins=[];s.tick=599;s.plugins=[plugin()];expect(planDistillEvent(ctx(s),event).effects).toEqual([]);s.tick=600;expect(planDistillEvent(ctx(s),event).effects).toHaveLength(1);
 });
 it('keeps GPT bubble ready without a target; fires two homing bubbles with one output multiplier',()=>{
  let s=game();s.plugins=[plugin()];s.distill.gpt={stage:3,samples:0};s.player.baseStats.damageMultiplier=2;expect(planDistilledAbilities(ctx(s)).changes).toEqual([]);s.world.entities.target=createEntityState('target','enemy_grok_bot','enemy','enemy',{x:350,y:270});s=apply(s,planDistilledAbilities(ctx(s)));const bubbles=Object.values(s.world.entities).filter(e=>e.kind==='projectile');expect(bubbles).toHaveLength(2);expect(bubbles[0].runtime.damage).toBe(24);expect(bubbles[0].runtime.sourceKind).toBe('distilled');expect(bubbles[0].runtime.critEligible).toBe(false);expect(planDistilledAbilities(ctx(s)).changes).toEqual([]);s.world.entities.target.position={x:230,y:400};const moved=apply(s,planEntityMotion(ctx(s)));expect(moved.world.entities[bubbles[0].id].velocity.y).toBeGreaterThan(300);
 });
 it('counts volleys rather than pellets, caps Grok echoes at four and does not trigger before learning',()=>{
  let s=game();s.plugins=[plugin()];const event=i=>({id:`shot:${i}`,runId:s.runId,tick:s.tick,seq:0,type:'WeaponFired',sourceId:'fish',targetId:null,payload:{pellets:5}});for(let i=0;i<10;i++)s=apply(s,planDistillEvent(ctx(s),event(i)));expect(s.distillRuntime).toEqual({});s.distill.grok={stage:3,samples:0};for(let i=0;i<7;i++)s=apply(s,planDistillEvent(ctx(s),event(i)));expect(Object.keys(s.world.entities)).toHaveLength(1);s=apply(s,planDistillEvent(ctx(s),event(7)));expect(Object.values(s.world.entities).filter(e=>e.runtime.distilledGrok)).toHaveLength(4);s.tick=240;for(let i=0;i<8;i++)s=apply(s,planDistillEvent(ctx(s),event(i+20)));expect(Object.values(s.world.entities).filter(e=>e.runtime.distilledGrok&&e.expiresAt>=s.tick)).toHaveLength(4);
 });
 it('Grok echoes pass low clutter but stop at a high wall, and collide with the first enemy once',()=>{
  let s=game();s.plugins=[plugin()];s.distill.grok={stage:1,samples:0};s.distillRuntime={shots:7};s=apply(s,planDistillEvent(ctx(s),{id:'shot',type:'WeaponFired'}));const bot=Object.values(s.world.entities).find(e=>e.runtime.distilledGrok);bot.previousPosition={x:230,y:270};bot.position={x:330,y:270};s.world.entities.low=createEntityState('low','terrain_clutter','obstacle','neutral',{x:260,y:270},{radius:5,runtime:{solid:true,low:true,grok_passable:true}});s.world.entities.wall=createEntityState('wall','terrain_rock','obstacle','neutral',{x:300,y:270},{radius:5,runtime:{solid:true,highWall:true}});let hits=detectCollisions(ctx(s)).hits.filter(hit=>hit.sourceId===bot.id);expect(hits.map(h=>h.targetId)).toEqual(['wall']);delete s.world.entities.wall;delete s.world.entities.low;s.world.entities.target=createEntityState('target','enemy_grok_bot','enemy','enemy',{x:290,y:270},{hp:14,maxHp:14});const plan=planCollisionEffects(ctx(s),detectCollisions(ctx(s)));expect(plan.effects.filter(effect=>effect.payload.projectileId===bot.id)).toHaveLength(1);
 });
 it('actually hooks credited death samples and Claude shield grants through the bounded effect loop',()=>{
  let s=game();s.plugins=[plugin()];s.distill.claude={stage:1,samples:0};s.world.entities.crab=createEntityState('crab','enemy_claude_guard','enemy','enemy',{x:400,y:270},{faction:'claude',hp:10,maxHp:10,rewardPolicy:'normal',distillEligible:true});
  const req={id:'hit',sourceId:'fish',creditOwner:'player',sourceKind:'weapon_primary',attackId:'attack',projectileId:null,targetId:'crab',baseDamage:12,contact:{x:400,y:270},incomingDirection:{x:1,y:0},generation:0,chainId:'hit',critEligible:false,expiresAt:10};const result=drainEffectQueue(ctx(s),{pending:[{id:'hit',chainId:'hit',sourceId:'fish',kind:'damage',generation:0,payload:req}],processedIds:[],spawnedThisTick:0});expect(result.deaths).toHaveLength(1);expect(result.nextWorking.distill.claude.samples).toBe(3);expect(result.nextWorking.world.entities.crab.dead).toBe(true);
  const enemy=createEntityState('attacker','enemy_grok_bot','enemy','enemy',{x:230,y:270},{faction:'grok'});s.world.entities.attacker=enemy;
  const hurt={...req,id:'hurt',sourceId:'attacker',creditOwner:'enemy',sourceKind:'enemy',attackId:'hurt',targetId:'fish',baseDamage:10};const defended=drainEffectQueue(ctx(s),{pending:[{id:'hurt',chainId:'hurt',sourceId:'attacker',kind:'damage',generation:0,payload:hurt}],processedIds:[],spawnedThisTick:0});expect(defended.nextWorking.world.entities.fish.hp).toBeLessThan(100);expect(Object.values(defended.nextWorking.world.shields)[0].amount).toBe(5);expect(defended.nextWorking.distillRuntime.shieldReadyAt).toBe(600);
 });
});
