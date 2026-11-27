import {describe,it,expect} from 'vitest';
import {loadContentCatalog} from '../../src/v2/content/catalog.js';
import {createDefaultProfile,validateProfileRecord,createSettlement,planSettlementCommit} from '../../src/v2/domain/settlement.js';
import {validateTreePurchase,planTreePurchase,planTreeRespec,resolveDshSlotCount} from '../../src/v2/domain/profile/tree.js';
import {planFacilityPurchase,planPermanentUnlock,planDshEquipment,validateStartRequest} from '../../src/v2/domain/profile/nest.js';
import {planBossUnlock,planDiscoveryUnlock,planEasterUnlock,runReceiptStamps} from '../../src/v2/domain/profile/unlocks.js';
import {RESET_ACHIEVEMENT} from '../../src/v2/content/achievements.js';
import {readProfileRepository,commitProfilePlan,mergePersistenceIntents} from '../../src/v2/application/repository.js';
import {state,freeze} from './fixtures.js';
const catalog=loadContentCatalog();
const event=(type,payload,id='event:1')=>({id,runId:'run:1',tick:10,seq:0,type,sourceId:null,targetId:null,payload});
function purchase(profile,id){const result=planTreePurchase(profile,id,catalog);expect(result.ok,result.message).toBe(true);return result.value.next;}
function funded(){return {...createDefaultProfile(),gpuCards:200,parts:200};}
function memory(){let record=null;return {read:async()=>record?{ok:true,value:structuredClone(record)}:{ok:false,code:'PROFILE_MISSING',message:'Missing'},compareAndSwap:async(expected,next)=>{if((record?.revision??-1)!==expected)return {ok:false,code:'REVISION_CONFLICT',message:'Conflict'};record=structuredClone(next);return {ok:true,value:structuredClone(record)};}};}
describe('permanent profile and tree contracts',()=>{
 it('starts with default equipment and facilities, no free money, and detached collections',()=>{const a=createDefaultProfile(),b=createDefaultProfile();expect(validateProfileRecord(a,catalog).valid).toBe(true);expect([a.gpuCards,a.gpuFragments,a.parts]).toEqual([0,0,0]);a.facilities.push('home_shelf');expect(b.facilities).toEqual(['home_bowl','home_map']);});
 it('requires both merge prerequisites and exact funds; purchases deduct once without mutating input',()=>{let p=funded();expect(validateTreePurchase(p,'tree_body_b',catalog).valid).toBe(false);p=purchase(p,'tree_body_a');expect(p.gpuCards).toBe(199);expect(validateTreePurchase(p,'tree_body_a',catalog).valid).toBe(false);p=purchase(p,'tree_body_b');p=purchase(p,'tree_body_c');expect(validateTreePurchase(p,'tree_body_e',catalog).valid).toBe(false);p=purchase(p,'tree_body_d');const before=structuredClone(p),result=planTreePurchase(freeze(p),'tree_body_e',catalog);expect(result.ok).toBe(true);expect(p).toEqual(before);expect(validateProfileRecord(result.value.next,catalog).valid).toBe(true);});
 it('requires a DSH collection before opening slots, and counts base spending separately',()=>{let p=funded();expect(planTreePurchase(p,'tree_dsh_a',catalog).ok).toBe(false);p.unlockedDsh=['dsh_lora'];p=purchase(p,'tree_dsh_a');expect(resolveDshSlotCount(p,catalog)).toBe(1);expect(planTreePurchase(p,'tree_dsh_b',catalog).ok).toBe(false);for(const id of ['a','b','c','d','e','f'])p=purchase(p,`tree_body_${id}`);p=purchase(p,'tree_dsh_b');expect(resolveDshSlotCount(p,catalog)).toBe(2);expect(planTreePurchase(p,'tree_dsh_c',catalog).ok).toBe(false);for(const id of ['a','b','c','d','e','f'])p=purchase(p,`tree_skill_${id}`);p=purchase(p,'tree_dsh_c');expect(resolveDshSlotCount(p,catalog)).toBe(3);expect(validateProfileRecord(p,catalog).valid).toBe(true);});
 it('refunds the legacy 160-card tree and preserves DSH collection while closing slots',()=>{let p=funded();p.unlockedDsh=['dsh_lora'];for(const branch of ['body','mcp','skill','explore'])for(const node of ['a','b','c','d','e','f'])p=purchase(p,`tree_${branch}_${node}`);for(const node of ['a','b','c'])p=purchase(p,`tree_dsh_${node}`);expect(p.gpuCards).toBe(40);p.equippedDsh=[{id:'dsh_lora',options:{}}];const respec=planTreeRespec(freeze(p),catalog);expect(respec.next.gpuCards).toBe(200);expect(respec.next.purchasedTree).toEqual([]);expect(respec.next.equippedDsh).toEqual([]);expect(respec.next.unlockedDsh).toEqual(['dsh_lora']);});
 it('requires both routes for alignment and refunds the expanded investment',()=>{
   let p=funded();
   for(const id of ['tree_body_a','tree_body_b','tree_body_c'])p=purchase(p,id);
   expect(validateTreePurchase(p,'tree_body_context',catalog).valid).toBe(false);
   for(const id of ['tree_mcp_a','tree_mcp_b','tree_mcp_c','tree_mcp_heavy','tree_body_context'])p=purchase(p,id);
   expect(validateProfileRecord(p,catalog).valid).toBe(true);
   expect(planTreeRespec(p,catalog).next.gpuCards).toBe(200);
 });
 it('enforces discovery, facility and part costs before buying permanent loadout choices',()=>{let p=funded();expect(planPermanentUnlock(p,'mcp_fan',catalog).ok).toBe(false);p.discovered.push('mcp_fan');expect(planPermanentUnlock(p,'mcp_fan',catalog).ok).toBe(false);p=planFacilityPurchase(p,'home_bench',catalog).value.next;expect(p.parts).toBe(194);p=planPermanentUnlock(p,'mcp_fan',catalog).value.next;expect(p.parts).toBe(188);expect(p.unlockedWeapons).toEqual(['mcp_bubble','mcp_fan']);expect(planPermanentUnlock(p,'mcp_fan',catalog).ok).toBe(false);expect(planFacilityPurchase(p,'home_bench',catalog).ok).toBe(false);});
 it('rejects unowned, duplicate or over-capacity DSH and requires the allowlist protection choice',()=>{let p=funded();p.unlockedDsh=['dsh_lora','dsh_claude_allowlist'];expect(planDshEquipment(p,[{id:'dsh_lora',options:{}}],catalog).ok).toBe(false);p=purchase(p,'tree_dsh_a');expect(planDshEquipment(p,[{id:'dsh_lora',options:{}}],catalog).ok).toBe(true);expect(planDshEquipment(p,[{id:'dsh_lora',options:{}},{id:'dsh_lora',options:{}}],catalog).ok).toBe(false);expect(planDshEquipment(p,[{id:'dsh_claude_allowlist',options:{}}],catalog).ok).toBe(false);expect(planDshEquipment(p,[{id:'dsh_claude_allowlist',options:{protect:'skillBan'}}],catalog).ok).toBe(true);});
 it('validates mode gates, one/two starting MCPs and an explicit active-checkpoint retirement',()=>{let p=funded();const request={mode:'short',difficulty:1,seed:0,weaponIds:['mcp_bubble'],skillId:'skill_disconnect',companionId:'companion_rice'};expect(validateStartRequest(p,request,catalog).valid).toBe(true);expect(validateStartRequest(p,{...request,difficulty:2},catalog).valid).toBe(false);expect(validateStartRequest(p,{...request,mode:'api',difficulty:'api'},catalog).valid).toBe(false);expect(validateStartRequest(p,{...request,weaponIds:['mcp_bubble','mcp_fan']},catalog).valid).toBe(false);p.checkpoint={};expect(validateStartRequest(p,request,catalog).valid).toBe(false);});
 it('rejects corrupt balances, duplicate references, broken prerequisite DAGs and invalid slot counts',()=>{for(const patch of [{gpuFragments:5},{gpuCards:-1},{revision:Infinity},{purchasedTree:['tree_body_e']},{unlockedWeapons:['missing']},{equippedDsh:[{id:'dsh_lora',options:{}}]},{apiUnlocked:true},{settlementLedger:['x','x']}])expect(validateProfileRecord({...createDefaultProfile(),...patch},catalog).valid).toBe(false);});
});
describe('permanent unlocks and one-transaction settlement',()=>{
 it('records high-difficulty boss base+advanced DSH without slots, but not next difficulty or LoRA',()=>{const p=createDefaultProfile(),e=event('BossDefeated',{faction:'gpt',difficulty:10,mode:'short',entityId:'boss'}),result=planBossUnlock(freeze(p),e,catalog);expect(result.value.next.unlockedDsh).toEqual(['dsh_gpt_preview','dsh_gpt_branch']);expect(result.value.next.highestDifficulty).toBe(0);expect(result.value.next.equippedDsh).toEqual([]);expect(planBossUnlock(result.value.next,e,catalog).value.next).toEqual(result.value.next);const api=planBossUnlock(p,event('BossDefeated',{faction:'gpt',difficulty:'api',mode:'api',entityId:'boss'}),catalog);expect(api.value.next.unlockedDsh).toEqual([]);});
 it('discoveries are immediate and repeat-safe; companion rescue unlocks its selection without resources',()=>{let p=createDefaultProfile();const e=event('ContentDiscovered',{definitionId:'mcp_fan'});p=planDiscoveryUnlock(p,e,catalog).value.next;expect(p.discovered).toContain('mcp_fan');expect(p.unlockedWeapons).not.toContain('mcp_fan');expect(planDiscoveryUnlock(p,e,catalog).value.next).toEqual(p);p=planDiscoveryUnlock(p,event('CompanionRescued',{companionId:'companion_patch'},'rescue'),catalog).value.next;expect(p.unlockedCompanions).toContain('companion_patch');expect(p.parts).toBe(0);});
 it('checks actual timed and unique-item evidence for each easter egg, with one unlock only',()=>{const p=createDefaultProfile();expect(planEasterUnlock(p,event('EasterCompleted',{easterId:'easter_sleep',satTicks:479}),catalog).ok).toBe(false);const sleep=planEasterUnlock(p,event('EasterCompleted',{easterId:'easter_sleep',satTicks:480}),catalog).value.next;expect(sleep.unlockedDsh).toEqual(['dsh_sleep']);expect(planEasterUnlock(sleep,event('EasterCompleted',{easterId:'easter_sleep',satTicks:900}),catalog).value.next).toEqual(sleep);expect(planEasterUnlock(p,event('EasterCompleted',{easterId:'easter_rice',noteIds:['a','a','b'],openedBox:true}),catalog).ok).toBe(false);expect(planEasterUnlock(p,event('EasterCompleted',{easterId:'easter_open',weaponIds:['mcp_bubble','mcp_fan','mcp_vector'],interfaces:['a','b','c']}),catalog).ok).toBe(true);});
 it('computes defeat 40/50 percent with floor, excludes XP and refuses a nonterminal or non-API withdrawal',()=>{const s=state();s.inventory={gpuFragments:9,parts:9};expect(()=>createSettlement(s,'defeat')).toThrow();s.flow.phase='defeat';let a=createSettlement(s,'defeat');expect([a.gpuFragments,a.parts]).toEqual([3,3]);s.start.treeNodeIds=['tree_explore_c'];a=createSettlement(s,'defeat');expect([a.gpuFragments,a.parts]).toEqual([4,4]);s.flow.phase='withdrawal';expect(()=>createSettlement(s,'withdrawal')).toThrow();});
 it('prints the receipt amounts for defeat, insured defeat, exploration loss and extraction',()=>{
  const carried=(mode,outcome,tree)=>{const s=state();s.start.difficulty.mode=mode;s.start.treeNodeIds=tree;s.inventory={gpuFragments:13,parts:7};s.flow.phase=outcome;return createSettlement(s,outcome);};
  const defeat=carried('short','defeat',[]);expect([defeat.gpuFragments,defeat.parts]).toEqual([5,2]);
  let profile=createDefaultProfile();const committed=planSettlementCommit(profile,defeat,catalog);expect(committed.ok,committed.message).toBe(true);expect([committed.value.next.gpuCards,committed.value.next.gpuFragments,committed.value.next.parts]).toEqual([1,0,2]);
  expect(planSettlementCommit(committed.value.next,defeat,catalog).value.next).toEqual(committed.value.next);
  expect([carried('short','defeat',['tree_explore_c']).gpuFragments,carried('short','defeat',['tree_explore_c']).parts]).toEqual([6,3]);
  expect([carried('exploration','defeat',[]).gpuFragments,carried('exploration','defeat',[]).parts]).toEqual([0,0]);
  const home=carried('exploration','withdrawal',['tree_explore_extract']);expect([home.gpuFragments,home.parts]).toEqual([13,8]);
  const practice=state();practice.start.difficulty.mode='tutorial';practice.inventory={gpuFragments:13,parts:7};practice.flow.phase='victory';expect(createSettlement(practice,'victory').tutorialCompleted).toBeUndefined();
  const first={...defeat,id:'settlement:tutorial',runId:'tutorial',outcome:'victory',mode:'tutorial',difficulty:0,gpuFragments:0,parts:0,bossKills:1,tutorialCompleted:true};
  profile={...createDefaultProfile(),checkpoint:{state:{runId:'tutorial',start:{guidedTutorial:true,difficulty:{mode:'tutorial',level:0}}}}};
  const opened=planSettlementCommit(profile,first,catalog);expect(opened.value.next.gpuCards).toBe(1);expect(opened.value.next.unlockLedger).toContain('tutorialReward:free');
  const again=planSettlementCommit({...opened.value.next,checkpoint:{state:{runId:'tutorial-2',start:{guidedTutorial:true,difficulty:{mode:'tutorial',level:0}}}}},{...first,id:'settlement:tutorial-2',runId:'tutorial-2'},catalog);
  expect(again.value.next.gpuCards).toBe(1);
 });
 it('keeps this run’s saved discoveries on the receipt and leaves another window’s collection off it',()=>{
  let profile=createDefaultProfile();
  const discover=(runId,definitionId)=>planDiscoveryUnlock(profile,{id:`discovery:${runId}:${definitionId}`,runId,tick:1,seq:0,type:'ContentDiscovered',sourceId:'fish',targetId:null,payload:{definitionId}},catalog).value.next;
  profile=discover('run:1','mcp_fan');
  expect(runReceiptStamps(profile,'run:1',catalog)).toEqual([catalog.definitions.mcp_fan.displayName]);
  profile=discover('run:2','mcp_vector');
  expect(runReceiptStamps(profile,'run:1',catalog)).toEqual([catalog.definitions.mcp_fan.displayName]);
  expect(runReceiptStamps(profile,'run:2',catalog)).toEqual([catalog.definitions.mcp_vector.displayName]);
  profile=discover('run:3','mcp_fan');
  expect(runReceiptStamps(profile,'run:3',catalog)).toEqual([]);
  profile=planBossUnlock(profile,{id:'boss-event',runId:'run:1',tick:2,seq:0,type:'BossDefeated',sourceId:'fish',targetId:'boss:claude',payload:{faction:'claude',difficulty:1,mode:'short',entityId:'boss:claude'}},catalog).value.next;
  expect(runReceiptStamps(profile,'run:1',catalog)).toContain(catalog.definitions.dsh_claude_appeal.displayName);
  expect(runReceiptStamps(profile,'run:9',catalog)).toEqual([]);
  expect(RESET_ACHIEVEMENT.name).toBe('这是哪个‘重置’？');
 });
 it('settles once, converts five fragments per GPU card, clears matching checkpoint in the same profile',()=>{let p=createDefaultProfile();p.gpuFragments=4;const s={id:'settlement:run:1',runId:'run:1',outcome:'defeat',gpuFragments:7,parts:3,survivedTicks:100,bossKills:1,discoveries:[]};p.checkpoint={state:{runId:'run:1'}};const result=planSettlementCommit(p,s,catalog);expect(result.ok).toBe(true);p=result.value.next;expect([p.gpuCards,p.gpuFragments,p.parts]).toEqual([2,1,3]);expect(p.checkpoint).toBeNull();expect(planSettlementCommit(p,s,catalog).value.next).toEqual(p);expect(planSettlementCommit({...p,settlementLedger:[],checkpoint:{state:{runId:'other'}}},s,catalog).code).toBe('ACTIVE_RUN_CONFLICT');});
 it('keeps intermediate boss DSH after defeat; only a complete formal victory opens LoRA and next level',()=>{let p=createDefaultProfile();p=planBossUnlock(p,event('BossDefeated',{faction:'claude',difficulty:10,mode:'expedition',entityId:'boss'}),catalog).value.next;const s={id:'settlement:run:1',runId:'run:1',outcome:'defeat',gpuFragments:0,parts:0,survivedTicks:100,bossKills:1,discoveries:[],difficulty:10,mode:'expedition'};p=planSettlementCommit(p,s,catalog).value.next;expect(p.unlockedDsh).toContain('dsh_claude_allowlist');expect(p.unlockedDsh).not.toContain('dsh_lora');expect(p.highestDifficulty).toBe(0);const victory=planSettlementCommit(p,{...s,id:'settlement:run:2',runId:'run:2',outcome:'victory',difficulty:6},catalog).value.next;expect(victory.highestDifficulty).toBe(6);expect(victory.unlockedDsh).toContain('dsh_lora');});
 it('merges discoveries and settlement in one revision and refuses a bad later intent atomically',()=>{const p=createDefaultProfile(),settlement={id:'settlement:run:1',runId:'run:1',outcome:'defeat',gpuFragments:5,parts:2,survivedTicks:100,bossKills:0,discoveries:[]},intents=[{id:'discover',kind:'discovery',payload:event('ContentDiscovered',{definitionId:'mcp_fan'})},{id:'settle',kind:'settlement',payload:settlement}];const a=mergePersistenceIntents(freeze(p),intents,catalog);expect(a.ok).toBe(true);expect(a.value.next.revision).toBe(1);expect(a.value.next.discovered).toContain('mcp_fan');expect(a.value.next.gpuCards).toBe(1);const bad=mergePersistenceIntents(p,[...intents,{id:'bad',kind:'discovery',payload:event('ContentDiscovered',{definitionId:'missing'})}],catalog);expect(bad.ok).toBe(false);expect(p.gpuCards).toBe(0);});
});
describe('repository compare-and-swap boundary',()=>{
 it('initializes only a missing profile, validates content and gives detached records',async()=>{const storage=memory();const result=await readProfileRepository(storage,catalog);expect(result.ok).toBe(true);result.value.profile.parts=100;expect((await storage.read()).value.profile.parts).toBe(0);});
 it('rejects stale plans and never silently retries a purchase against a different balance',async()=>{const storage=memory();await readProfileRepository(storage,catalog);const a={expectedRevision:0,next:{...createDefaultProfile(),revision:1,parts:2},events:[]},b={expectedRevision:0,next:{...createDefaultProfile(),revision:1,parts:3},events:[]};expect((await commitProfilePlan(storage,a,catalog)).ok).toBe(true);expect((await commitProfilePlan(storage,b,catalog)).code).toBe('REVISION_CONFLICT');expect((await storage.read()).value.profile.parts).toBe(2);});
 it('deduplicated no-op plans do not advance the record revision or write corrupt profiles',async()=>{const storage=memory();await readProfileRepository(storage,catalog);const p=createDefaultProfile();expect((await commitProfilePlan(storage,{expectedRevision:0,next:p,events:[]},catalog)).value.revision).toBe(0);expect((await commitProfilePlan(storage,{expectedRevision:0,next:{...p,revision:1,parts:-1},events:[]},catalog)).ok).toBe(false);expect((await storage.read()).value.profile.parts).toBe(0);});
});

it('applies the heavy tradeoff and refreshes the rice speed boost only on rice pickup',async()=>{
 const {planTokenCollection}=await import('../../src/v2/domain/rewards.js');
 const {deriveWeaponStats}=await import('../../src/v2/domain/stats.js');
 const s=state(),weapon=s.player.loadout.weapons[0],stats=()=>deriveWeaponStats(s,weapon,catalog),base=stats();
 s.start.treeNodeIds=['tree_mcp_heavy','tree_body_context'];
 expect(stats().damage).toBeCloseTo(base.damage*1.3);
 expect(stats().interval).toBeCloseTo(base.interval*1.18);
 s.world.pickups.rice={kind:'riceXp',amount:1,position:s.world.entities.fish.position};
 const ctx={state:s,catalog,event:null,entityId:null,random:s.random.combat};
 const change=planTokenCollection(ctx,'rice').changes.find(item=>item.operation==='setEntityRuntime');
 expect(change.payload.runtime.riceBoostUntil).toBe(180);
 s.world.entities.fish.runtime=change.payload.runtime;
 expect(stats().interval).toBeCloseTo(base.interval*1.18/1.2);
 s.tick=180;expect(stats().interval).toBeCloseTo(base.interval*1.18);
 s.world.pickups.rice.kind='part';
 expect(planTokenCollection(ctx,'rice').changes.some(item=>item.payload.runtime)).toBe(false);
});
