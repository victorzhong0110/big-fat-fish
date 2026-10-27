import {RESET_ACHIEVEMENT} from '../content/achievements.js';
// @ts-check
import { executeNestAction } from '../application/nest.js';
import { validateTreePurchase, resolveDshSlotCount } from '../domain/profile/tree.js';
import { createHandlerRegistry } from '../content/registry.js';

/** Mount the nest dashboard; Profile changes go through the application service and transactional port.
 * @calls application/nest.js#executeNestAction
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/profile/tree.js#resolveDshSlotCount
 * @calls domain/profile/tree.js#validateTreePurchase
 * @param {HTMLElement} root
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {import('../contracts.d.ts').StoragePort} storage
 * @param {(record:import('../contracts.d.ts').StorageRecord) => void} onProfile
 * @param {(message:string) => void} notify
 * @returns {{setProfile:(record:import('../contracts.d.ts').StorageRecord|null)=>void; getLoadout:()=>{weaponIds:string[];skillId:string;companionId:string|null};dispose:()=>void}}
 */
export function mountNestManager(root, catalog, storage, onProfile, notify) {
  let record = /** @type {import('../contracts.d.ts').StorageRecord|null} */(null), busy = false, disposed = false, tab = 'tree', weaponIds = ['mcp_bubble'], skillId = 'skill_disconnect', companionId='companion_rice';
  const available = createHandlerRegistry().implementedIds, title = document.createElement('p'), tabs = document.createElement('nav'), body = document.createElement('div');
  title.className = 'nest-balance'; tabs.className = 'nest-tabs'; tabs.setAttribute('aria-label','小窝设施'); body.className = 'nest-content'; root.append(title,tabs,body);
  /** @param {string} text @returns {HTMLButtonElement} */
  function button(text) { const node = document.createElement('button'); node.type = 'button'; node.textContent = text; return node; }
  for (const [id,label] of [['tree','饭碗 · 技能树'],['facilities','设施'],['gear','MCP与技能'],['dsh','DSH'],['collection','发现与伙伴']]) {
    const item=button(label);item.dataset.tab=id;item.onclick=()=>{tab=id;render();};tabs.append(item);
  }
  /** @param {import('../contracts.d.ts').NestAction} action */
  async function act(action) {
    if(busy||disposed)return;busy=true;render();
    try {const result=await executeNestAction(storage,catalog,action);if(disposed)return;if(!result.ok){notify(`小窝未修改：${result.message}`);return;}record=result.value;onProfile(result.value);notify(action.type==='respec'?'已全额退还技能树算力卡，卸下DSH，收藏保留。':'小窝已保存。');}
    catch(error){if(!disposed)notify(`小窝保存失败：${String(error)}`);}finally{busy=false;if(!disposed)render();}
  }
  /** @param {string} heading @param {string} text @returns {HTMLElement} */
  function card(heading,text){const node=document.createElement('article'),h=document.createElement('strong'),p=document.createElement('p');node.className='nest-card';h.textContent=heading;p.textContent=text;node.append(h,p);body.append(node);return node;}
  /** @param {import('../contracts.d.ts').Profile} profile */
  function loadoutControls(profile) {
    weaponIds=weaponIds.filter(id=>profile.unlockedWeapons.includes(id)&&available.includes(id));if(!weaponIds.length)weaponIds=['mcp_bubble'];
    if(!profile.purchasedTree.includes('tree_mcp_d'))weaponIds=weaponIds.slice(0,1);
    if(!profile.unlockedSkills.includes(skillId)||!available.includes(skillId))skillId='skill_disconnect';
    const slots=profile.purchasedTree.includes('tree_mcp_d')?2:1;
    for(let index=0;index<slots+1;index++){
      const isSkill=index===slots,label=document.createElement('label'),select=document.createElement('select');label.textContent=isSkill?'主动技能':`出发MCP ${index+1}`;select.dataset.loadout=isSkill?'skill':`weapon-${index}`;
      const ids=(isSkill?profile.unlockedSkills:profile.unlockedWeapons).filter(id=>available.includes(id));
      if(!isSkill&&index===1){const option=document.createElement('option');option.value='';option.textContent='不携带第二把';select.append(option);}
      for(const id of ids){const option=document.createElement('option');option.value=id;option.textContent=catalog.definitions[id].displayName;select.append(option);}
      select.value=isSkill?skillId:weaponIds[index]??'';select.disabled=busy||!!profile.checkpoint;
      select.onchange=()=>{if(isSkill)skillId=select.value;else {const next=[...weaponIds];next[index]=select.value;weaponIds=next.filter(Boolean);if(new Set(weaponIds).size!==weaponIds.length){weaponIds=weaponIds.slice(0,1);notify('第二把请选择不同的MCP。');render();}}};label.append(select);body.append(label);
    }
    const companionLabel=document.createElement('label'),companionSelect=document.createElement('select');companionLabel.textContent='随行伙伴';companionSelect.dataset.loadout='companion';const empty=document.createElement('option');empty.value='';empty.textContent='独自出门';companionSelect.append(empty);
    const companionIds=profile.unlockedCompanions.filter(id=>available.includes(id)&&(id==='companion_rice'||profile.facilities.includes('home_guest')));for(const id of companionIds){const option=document.createElement('option');option.value=id;option.textContent=catalog.definitions[id].displayName;companionSelect.append(option);}if(!companionIds.includes(companionId))companionId='';companionSelect.value=companionId;companionSelect.disabled=busy||!!profile.checkpoint;companionSelect.onchange=()=>{companionId=companionSelect.value;};companionLabel.append(companionSelect);body.append(companionLabel);
    const note=document.createElement('p');note.className='scope-note';note.textContent='此配装用于下次Pro1出发。每局一位随行伙伴；被封禁时能力、跟随与冷却冻结。Free练习使用出发页试用设置。';body.append(note);
  }
  function render() {
    if(disposed)return;body.replaceChildren();
    for(const item of tabs.querySelectorAll('button'))item.setAttribute('aria-pressed',String(item.dataset.tab===tab));
    if(!record){title.textContent='小窝档案读取中，暂不能消费资源。';return;}
    const profile=record.profile,locked=busy||!!profile.checkpoint;
    title.textContent=`算力卡 ${profile.gpuCards} · 碎片 ${profile.gpuFragments}/5 · 零件 ${profile.parts}${profile.checkpoint?' · 冒险进行中，成长与配装已锁定':''}`;
    if(tab==='tree'){
      const respec=button('免费重置整棵树');respec.disabled=locked||!profile.purchasedTree.length;respec.dataset.action='respec';respec.onclick=()=>{void act({type:'respec'});};body.append(respec);
      for(const [prefix,name] of [['tree_body_','干饭体魄'],['tree_mcp_','MCP熟练'],['tree_skill_','技能调度'],['tree_explore_','探索与伙伴'],['tree_dsh_','DSH槽位']]){
        const heading=document.createElement('h3');heading.textContent=name;body.append(heading);
        for(const definition of Object.values(catalog.definitions).filter(item=>item.kind==='tree'&&item.id.startsWith(prefix))){
          const owned=profile.purchasedTree.includes(definition.id),p=definition.parameters,parents=Array.isArray(p.prerequisites)?p.prerequisites.map(id=>catalog.definitions[String(id)]?.displayName??String(id)):[];
          const pending='';
          const node=card(definition.displayName,`${p.effect}${pending} · ${p.cost}算力卡${parents.length?` · 前置：${parents.join('、')}`:''}${p.baseSpendRequired?` · 基础树消费至少${p.baseSpendRequired}卡`:''}${p.requiresAnyDsh?' · 先发现任一DSH':''}`);
          node.dataset.treeId=definition.id;const buy=button(owned?'已点亮':'点亮节点');buy.disabled=locked||owned||!validateTreePurchase(profile,definition.id,catalog).valid;buy.onclick=()=>{void act({type:'buyTree',id:definition.id});};node.append(buy);
        }
      }
    }else if(tab==='facilities'){
      for(const definition of Object.values(catalog.definitions).filter(item=>item.kind==='facility')){const owned=profile.facilities.includes(definition.id),cost=Number(definition.parameters.partCost);const node=card(definition.displayName,`${definition.parameters.effect} · ${cost}零件`),buy=button(owned?'已建成':'建设');buy.disabled=locked||owned||profile.parts<cost;buy.onclick=()=>{void act({type:'build',id:definition.id});};node.dataset.facilityId=definition.id;node.append(buy);}
    }else if(tab==='gear'){
      loadoutControls(profile);
      for(const definition of Object.values(catalog.definitions).filter(item=>['weapon','skill'].includes(item.kind))){const weapon=definition.kind==='weapon',owned=(weapon?profile.unlockedWeapons:profile.unlockedSkills).includes(definition.id),found=profile.discovered.includes(definition.id),facility=weapon?'home_bench':'home_terminal',cost=Number(definition.parameters.partCost);const node=card(definition.displayName,`${owned?'已解锁':found?'已发现':'尚未发现'} · ${cost}零件 · 需要${catalog.definitions[facility].displayName}${available.includes(definition.id)?'':' · 运行效果待开放'}`),buy=button(owned?'已解锁':'永久解锁');buy.disabled=locked||owned||!found||!profile.facilities.includes(facility)||profile.parts<cost||!available.includes(definition.id);buy.onclick=()=>{void act({type:'unlock',id:definition.id});};node.dataset.gearId=definition.id;node.append(buy);}
    }else if(tab==='dsh'){
      const note=document.createElement('p');note.textContent=`已开放 ${resolveDshSlotCount(profile,catalog)} / 3 槽，已装 ${profile.equippedDsh.length} 件。先击败首领或发现彩蛋，再点亮特殊节点。`;body.append(note);
      for(const definition of Object.values(catalog.definitions).filter(item=>item.kind==='dsh')){
        const owned=profile.unlockedDsh.includes(definition.id),equipped=profile.equippedDsh.some(slot=>slot.id===definition.id),node=card(definition.displayName,`${String(definition.parameters.description).replace(/^[^/]+ \/ [^：]+：/,'').replace(/；详细边界见下$/,'')} · ${owned?'已收藏':'尚未发现'}${available.includes(definition.id)?'':' · 运行效果待开放'}`),select=document.createElement('select');
        if(definition.id==='dsh_claude_allowlist'){for(const [value,label] of [['skillBan','保护技能'],['companionBan','保护伙伴']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}select.value=profile.equippedDsh.find(slot=>slot.id===definition.id)?.options.protect??'skillBan';select.disabled=locked;node.append(select);}
        const toggle=button(equipped?'卸下':'装配');toggle.disabled=locked||!owned||!available.includes(definition.id)||!equipped&&profile.equippedDsh.length>=resolveDshSlotCount(profile,catalog);toggle.onclick=()=>{void act({type:'equipDsh',slots:equipped?profile.equippedDsh.filter(slot=>slot.id!==definition.id):[...profile.equippedDsh,{id:definition.id,options:definition.id==='dsh_claude_allowlist'?{protect:select.value}:{}}]});};
        if(definition.id==='dsh_claude_allowlist')select.onchange=()=>{if(equipped)void act({type:'equipDsh',slots:profile.equippedDsh.map(slot=>slot.id===definition.id?{...slot,options:{protect:select.value}}:slot)});};node.dataset.dshId=definition.id;node.append(toggle);
      }
    }else{
      if(profile.bestApi){const r=profile.bestApi;card('API调用 · 个人记录',`最长${Math.floor(r.survivedTicks/3600)}分${Math.floor(r.survivedTicks/60)%60}秒 · 最多首领${r.bossKills} · 最高有效击杀${r.kills} · 最高等级${r.maxLevel}`);}
      const achievement=RESET_ACHIEVEMENT,achievementCard=card(achievement.name,`${profile.unlockLedger.includes(achievement.ledgerId)?'成就已解锁':'成就未解锁'} · ${achievement.description}`);achievementCard.dataset.achievementId=achievement.id;
      card('我去吃饭，测完告诉我就行',`已经发现 ${profile.discovered.length} 件内容，收藏 ${profile.unlockedDsh.length} 件DSH。收获来自实际探索与结算，小窝不自动生产资源。`);
      const tasks={companion_rice:'最初的小伙伴。',companion_patch:'破坏一处Claude封禁装置。',companion_cache:'打开两个不同地点的秘密箱。',companion_router:'同一局发现两种MCP。',companion_decoy:'破解一次ChatGPT重置。',companion_rocket:'击败Grok首领后在这里接回。'};
      for(const [id,task]of Object.entries(tasks)){const owned=profile.unlockedCompanions.includes(id),node=card(catalog.definitions[id].displayName,`${owned?'已入住':'尚未救助'} · ${task}`),interact=button(owned?'聊聊':'接回伙伴');interact.disabled=locked||!owned&&(id!=='companion_rocket'||!profile.unlockLedger.includes('milestone:grok-defeated'));interact.onclick=()=>{if(owned)notify(`${catalog.definitions[id].displayName}：${id==='companion_rice'?'出门别忘了带饭，饿了就回来。':id==='companion_router'?'两把MCP各有用处，试试切换打法。':'一起出门吧，我会跟紧你的铁盆。'}`);else void act({type:'rescue',id});};node.dataset.residentId=id;node.append(interact);}
      for(const id of profile.discovered)card(catalog.definitions[id]?.displayName??id,catalog.definitions[id]?.kind==='companion'?'已入住 · 可在出发配装中选择随行。':'已记录发现。');
    }
  }
  return {setProfile(value){record=value?structuredClone(value):null;render();},getLoadout(){const profile=record?.profile;return {weaponIds:weaponIds.filter(id=>profile?.unlockedWeapons.includes(id)).slice(0,profile?.purchasedTree.includes('tree_mcp_d')?2:1),skillId:profile?.unlockedSkills.includes(skillId)?skillId:'skill_disconnect',companionId:companionId&&profile?.unlockedCompanions.includes(companionId)&&(companionId==='companion_rice'||profile.facilities.includes('home_guest'))?companionId:null};},dispose(){disposed=true;root.replaceChildren();}};
}
