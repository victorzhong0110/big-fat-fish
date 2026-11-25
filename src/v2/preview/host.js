const SOUND_EVENTS=new Set(['WeaponFired','SkillCast','DashStarted','DamageResolved','PickupCollected','LevelGained','ObjectiveCompleted','EquipmentEquipped']);
import {resolveExpeditionRoute,localWorldId} from '../domain/world/regionRules.js';
import {canExtract, EXTRACTION_ID, EXTRACTION_TICKS} from '../domain/world/extraction.js';
import {isDifficultyUnlocked} from '../domain/profile/nest.js';
import {canApiWithdraw} from '../domain/world/api.js';
import {readDshCycleTimers} from '../domain/dshCycle.js';
// @ts-check
import { resolveWeaponTemplate, listRuntimeWeapons } from '../content/weaponCapabilities.js';
import { listRuntimeSkills } from '../content/skillCapabilities.js';
import { mountNestManager } from './nestManager.js';
import { prepareAdventureStart } from '../application/nest.js';
import {createModProfileNamespace,initializeModProfile} from '../application/modProfile.js';
import { mountModManager } from './modManager.js';
import { createStoragePort } from '../adapters/storage.js';
import { readProfileRepository, commitProfilePlan, mergePersistenceIntents } from '../application/repository.js';
import { createSettlement } from '../domain/settlement.js';
import {scopePersistenceIntent} from '../domain/modScope.js';
import { loadContentCatalog, validateContentCatalog } from '../content/catalog.js';
import { createHandlerRegistry } from '../content/registry.js';
import { resolveDifficultySnapshot } from '../domain/difficulty.js';
import { createClockState, scheduleFrame, resumeClock } from '../domain/clock.js';
import { canCreateCheckpoint, createCheckpoint } from '../domain/checkpoint.js';
import { createGameSession, enqueueSessionCommand, readSessionState, readSessionView, stepSessionWorld, stepSessionUi, restoreGameSession, disposeGameSession } from '../engine/session.js';
import { getPreviewCamera, renderPreviewFrame } from './view.js';

/** Mount opt-in Free practice and the Pro1 Claude slice. Practice/modded checkpoints
 * are isolated; the adventure uses transactional permanent Profile storage. Returns cleanup.
 * @implementationScope core-preview + adventure-slice
 * @calls adapters/storage.js#createStoragePort
 * @calls application/modProfile.js#createModProfileNamespace
 * @calls application/modProfile.js#initializeModProfile
 * @calls application/nest.js#prepareAdventureStart
 * @calls application/repository.js#commitProfilePlan
 * @calls application/repository.js#mergePersistenceIntents
 * @calls application/repository.js#readProfileRepository
 * @calls content/catalog.js#loadContentCatalog
 * @calls content/catalog.js#validateContentCatalog
 * @calls content/registry.js#createHandlerRegistry
 * @calls content/skillCapabilities.js#listRuntimeSkills
 * @calls content/weaponCapabilities.js#listRuntimeWeapons
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/checkpoint.js#canCreateCheckpoint
 * @calls domain/checkpoint.js#createCheckpoint
 * @calls domain/clock.js#createClockState
 * @calls domain/clock.js#resumeClock
 * @calls domain/clock.js#scheduleFrame
 * @calls domain/difficulty.js#resolveDifficultySnapshot
 * @calls domain/dshCycle.js#readDshCycleTimers
 * @calls domain/modScope.js#scopePersistenceIntent
 * @calls domain/profile/nest.js#isDifficultyUnlocked
 * @calls domain/settlement.js#createSettlement
 * @calls domain/world/api.js#canApiWithdraw
 * @calls domain/world/extraction.js#canExtract
 * @calls domain/world/regionRules.js#localWorldId
 * @calls domain/world/regionRules.js#resolveExpeditionRoute
 * @calls engine/session.js#createGameSession
 * @calls engine/session.js#disposeGameSession
 * @calls engine/session.js#enqueueSessionCommand
 * @calls engine/session.js#readSessionState
 * @calls engine/session.js#readSessionView
 * @calls engine/session.js#restoreGameSession
 * @calls engine/session.js#stepSessionUi
 * @calls engine/session.js#stepSessionWorld
 * @calls preview/modManager.js#mountModManager
 * @calls preview/nestManager.js#mountNestManager
 * @calls preview/view.js#getPreviewCamera
 * @calls preview/view.js#renderPreviewFrame
 * @param {string} mountElementId
 * @returns {() => void}
 */
export function mountCombatPreview(mountElementId) {
  const mount=document.getElementById(mountElementId);
  if(!mount)throw new Error('Missing preview mount');
  /** @param {string} id @returns {HTMLElement} */
  function node(id){const element=mount?.querySelector(`#${id}`);if(!(element instanceof HTMLElement))throw new Error(`Missing UI ${id}`);return element;}
  const canvas=/** @type {HTMLCanvasElement} */(node('sea'));
  const context=canvas.getContext('2d');if(!context)throw new Error('Canvas2D unavailable');
  const ctx=context;
  const baseCatalog=loadContentCatalog(),registry=createHandlerRegistry(),report=validateContentCatalog(baseCatalog,registry);
  let catalog=baseCatalog;
  if(!report.valid)throw new Error(report.diagnostics.map(item=>item.message).join('; '));
  let checkpointKey='big-fat-fish:v2-combat-preview:checkpoint';
  const baseProfilePort=createStoragePort('big-fat-fish:v2:profile');
  let profilePort=baseProfilePort,profileCatalog=baseCatalog,scopeKey='',scopeGeneration=0,scopeLoading=false,modProfileMissing=false,scopeUnavailable=false,beginWorking=false;
  let profileRecord=/** @type {import('../contracts.d.ts').StorageRecord|null} */(null),profileWorking=false,profileFailed=false,settledRunId='',formal=false,escapePressing=false;
  const pendingPersistence=/** @type {import('../contracts.d.ts').PersistenceIntent[]} */([]);
  let session=/** @type {import('../contracts.d.ts').GameSession|null} */(null);
  let view=/** @type {import('../contracts.d.ts').RenderSnapshot|null} */(null);
  let clock=createClockState(),lastTime=0,sequence=0,frameId=0,disposed=false,saveRequested=false;
  let displayedChoice='',displayedTrial='',blockTrainingClick=false,offeredPickupId='';
  let aim={x:1,y:0},aimDistance=400,mouseFiring=false,stickFiring=false,leftMove={x:0,y:0},lastInput='',toastUntil=0;
  let popups=/** @type {{x:number;y:number;amount:number;tick:number}[]} */([]);
  const keys=new Set();
  const stickResetters=/** @type {(() => void)[]} */([]);
  const removers=/** @type {(() => void)[]} */([]);
  /** @param {EventTarget} target @param {string} type @param {EventListener} listener @param {boolean} capture */
  function on(target,type,listener,capture=false){target.addEventListener(type,listener,capture);removers.push(()=>target.removeEventListener(type,listener,capture));}
  function showHome(){node('home-screen').classList.remove('hidden');node('departure-screen').classList.add('hidden');}
  function showDeparture(){node('home-screen').classList.add('hidden');node('departure-screen').classList.remove('hidden');}
  let preferApi=false;
  const modeSelect=/** @type {HTMLSelectElement} */(node('mode-select'));
  const difficultySelect=/** @type {HTMLSelectElement} */(node('difficulty-select'));
  const modeCards={ 'tutorial-guide':'mode-guide',short:'mode-short',expedition:'mode-expedition',exploration:'mode-exploration',endless:'mode-tower' };
  /** @returns {import('../contracts.d.ts').Mode} */
  function selectedMode() {
    if (difficultySelect.value==='api') return 'api';
    const mode=modeSelect.value.replace(/^mod-/,'');
    if (mode==='tutorial-guide'||mode==='tutorial') return 'tutorial';
    if (mode==='exploration'||mode==='endless'||mode==='expedition') return mode;
    return 'short';
  }
  function syncModeCards(){
    const mode=modeSelect.value.replace(/^mod-/,'');
    for (const [value,id] of Object.entries(modeCards)) node(id).setAttribute('aria-pressed',String(mode===value));
  }
  /** @param {string} message */
  function toast(message){if(disposed)return;node('toast').textContent=message;node('toast').classList.add('visible');toastUntil=performance.now()+3800;}
  function clearInput(){escapePressing=false;for(const reset of stickResetters)reset();keys.clear();mouseFiring=false;stickFiring=false;leftMove={x:0,y:0};lastInput='';node('left-stick').querySelector('span')?.removeAttribute('style');node('right-stick').querySelector('span')?.removeAttribute('style');}
  /** @param {string} type @param {import('../contracts.d.ts').Json} payload @param {'world'|'ui'} domain @returns {boolean} */
  function send(type,payload={},domain='world'){
    if(!session)return false;
    const snapshot=readSessionState(session);
    const command={id:`${snapshot.runId}:input:${sequence}`,seq:sequence++,clock:domain,targetTick:domain==='world'?snapshot.tick+1:snapshot.uiTick,type,payload};
    const accepted=enqueueSessionCommand(session,command);return accepted.ok;
  }
  function pause(){
    if(!session)return;
    const state=readSessionState(session);if(!['exploring','boss','pluginChoice','loraTraining'].includes(state.flow.phase))return;
    clearInput();if(send('Pause',{},'ui'))stepSessionUi(session,false);clock=resumeClock(clock);lastTime=performance.now();
  }
  function resume(){if(!session)return;offeredPickupId='';offeredRestId='';node('equipment-menu').classList.add('hidden');clearInput();node('toast').classList.remove('visible');toastUntil=0;if(send('Resume',{},'ui'))stepSessionUi(session,false);clock=resumeClock(clock);lastTime=performance.now();canvas.focus();}
  /** @param {string} type @param {string|null} optionId @param {string|null} replaceId */
  function choose(type,optionId=null,replaceId=null){if(!session)return;const choice=readSessionState(session).flow.choice;if(!choice)return;clearInput();if(send(type,{choiceId:choice.id,optionId,replaceId},'ui'))stepSessionUi(session,false);clock=resumeClock(clock);lastTime=performance.now();canvas.focus();}
  /** @param {readonly import('../contracts.d.ts').DomainEvent[]} events */
  function showEvents(events){for(const event of events){if(SOUND_EVENTS.has(event.type))window.dispatchEvent(new CustomEvent('fish:game-sound',{detail:{type:event.type}}));if(event.type==='TutorialRetry'){toast('再试一次！回到教学起点，已学步骤保留。');}else if(event.type==='EscortStarted'){toast('护送开始：保持靠近，清除机器人附近的敌人。');}else if(event.type==='RegionChanged'){clearInput();toast(`来到海域${Number(/** @type {{to:number}} */(event.payload).to)+1}。旧海域保留原进度。`);}else if(event.type==='RestOffered'){if(session&&readSessionState(session).flow.phase==='exploring'){offeredRestId=String(/** @type {{restId:string}} */(event.payload).restId);pause();renderRest();}}else if(event.type==='EndlessBenchmarkCleared'){toast(`Benchmark ${String(/** @type {{difficulty:number}} */(event.payload).difficulty)} 已通关，继续爬层或回检查点撤回。`);}else if(event.type==='ApiBossWarning'){toast(`4秒后出现阶段首领：${String(/** @type {{faction:string}} */(event.payload).faction)}。首领死亡后调用继续。`);}else if(event.type==='DshCycleDurationReset'){toast('Reset！');window.dispatchEvent(new CustomEvent('fish:reset-wave'));}else if(event.type==='AlarmOffered'){toast('开启将引来16只Bot。5秒内再次按F确认；离开即可放弃。');}else if(event.type==='EasterCompleted'){toast('发现彩蛋！对应 DSH 插件已加入收藏。');}else if(event.type==='NoteRead'){toast(String(/** @type {{text:string}} */(event.payload).text));}else if(event.type==='CompanionRescued'){toast(`${catalog.definitions[String(/** @type {{companionId:string}} */(event.payload).companionId)]?.displayName??'新伙伴'}：分你一口。一起走吧。`);}else if(event.type==='EquipmentOffered'){offeredPickupId=String(/** @type {{pickupId:string}} */(event.payload).pickupId);pause();renderEquipment();}else if(event.type==='EquipmentEquipped'){toast('装备已更换，原实例留在地面，剩余冷却保留。');}else if(event.type==='TreeTriggered'){toast(/** @type {{nodeId:string}} */(event.payload).nodeId==='tree_body_f'?'我还能游！挡住了这次致命伤害。':'这一口留着：恢复12生命。');}else if(event.type==='LoraResolved'){const p=/** @type {{result:string;actualDelta:number}} */(event.payload);toast(`${p.result==='perfect'?'完美训练！':p.result==='underfit'?'欠拟合':'过拟合'} 属性变化 ${p.actualDelta>0?'+':''}${Number(p.actualDelta.toFixed(3))}`);}else if(event.type==='ObjectiveCompleted'){toast(session&&readSessionState(session).expedition?'区域目标已完成！完成任意两个即可挑战本海域首领。':session&&readSessionState(session).api?'信标已点亮！阶段首领按调用时间出现。':'信标已点亮！占领任意两个即可挑战首领。');}else if(event.type==='ContentDiscovered'){toast(`发现 ${catalog.definitions[String(/** @type {{definitionId:string}} */(event.payload).definitionId)]?.displayName??'新装备'}。`);}else if(event.type==='DshCycleResolved'){toast(/** @type {{outcome:string}} */(event.payload).outcome==='update'?'更新！当前 MCP 强化28秒。':'重置！装备技能和冲刺冷却已清零。');}}}
  /** @param {boolean} release */
  function train(release=false){if(!session)return;const state=readSessionState(session),trial=state.lora.active;if(!trial)return;if(!release&&state.flow.phase!=='loraTraining')return;const type=release?'ReleaseTraining':trial.phase==='ready'?'StartTraining':'ConfirmTraining';if(send(type,{trialId:trial.id,edge:release?'release':'press',repeat:false},'ui')){const result=stepSessionUi(session,false);showEvents(result.events);if(result.next.flow.phase!==state.flow.phase||result.next.lora.active?.phase!==trial.phase){clock=resumeClock(clock);lastTime=performance.now();}}}
  function renderRest(){if(!session||!offeredRestId)return;node('equipment-kicker').textContent='首领后的独立休整 · 战斗已暂停';node('equipment-title').textContent='歇一歇，再出发';node('equipment-description').textContent='本海域只能选择一次：恢复30%最大生命，或取得一把特制MCP。检查点和穿过通道没有恢复效果。';node('equipment-preview').replaceChildren();node('equipment-leave').textContent='暂不休整 · Esc';const options=node('equipment-options');options.replaceChildren();for(const [choice,label]of [['heal','恢复30%最大生命'],['weapon','获得一把特制MCP']]){const button=document.createElement('button');button.type='button';button.dataset.restChoice=choice;button.textContent=label;button.onclick=()=>{const restId=offeredRestId;resume();send('ChooseExpeditionRest',{restId,choice});};options.append(button);}}
  function renderEquipment(){
    node('equipment-kicker').textContent='发现新装备 · 战斗已暂停';node('equipment-leave').textContent='先放在这里 · Esc';
    if(!session||!offeredPickupId)return;const state=readSessionState(session),pickup=state.world.pickups[offeredPickupId],weapon=pickup?.weapon;
    if(pickup?.skill){const skill=pickup.skill,definition=catalog.definitions[skill.definitionId];node('equipment-title').textContent=definition.displayName;node('equipment-description').textContent=`${String(definition.parameters.description).replace(/^[^/]+ \/ [^：]+：/,'')}。换装保留较大的剩余冷却，至少为新技能基础冷却的一半。`;node('equipment-preview').dataset.template=skill.definitionId;node('equipment-preview').replaceChildren();const options=node('equipment-options');options.replaceChildren();const button=document.createElement('button');button.type='button';button.dataset.equipSkill='true';button.textContent=`替换：${catalog.definitions[state.player.loadout.skillId].displayName}`;button.onclick=()=>{const pickupId=offeredPickupId;resume();send('EquipSkillPickup',{pickupId});};options.append(button);return;}
    if(!weapon){offeredPickupId='';offeredRestId='';return;}
    const template=resolveWeaponTemplate(catalog,weapon.definitionId),labels={mcp_bubble:'直线泡泡，命中消失',mcp_fan:'扇面散射，近距离覆盖',mcp_vector:'细长穿透弹，能贯穿多个目标',mcp_stream:'按住持续喷出微泡',mcp_return:'飞出后追回你，去回均可命中',mcp_batch:'慢泡命中后炸开一圈'};
    node('equipment-title').textContent=catalog.definitions[weapon.definitionId].displayName;node('equipment-description').textContent=`${['标准','增强','特制'][weapon.originalQuality]}品质 · ${template?labels[template]:''}。替换后原武器落在这里，不会销毁。`;
    const preview=node('equipment-preview');preview.dataset.template=template??'';preview.replaceChildren();for(let index=0;index<3;index++){const dot=document.createElement('i');dot.style.setProperty('--n',String(index));preview.append(dot);}
    const options=node('equipment-options');options.replaceChildren();for(const [index,current]of state.player.loadout.weapons.entries()){const button=document.createElement('button');button.type='button';button.dataset.equipSlot=String(index);button.textContent=`替换槽${index+1}：${catalog.definitions[current.definitionId].displayName}（${['标准','增强','特制'][current.originalQuality]}）`;button.onclick=()=>{const pickupId=offeredPickupId;resume();send('EquipPickup',{pickupId,slotIndex:index});};options.append(button);}
  }
  let nest=mountNestManager(node('nest-manager'),baseCatalog,profilePort,record=>{profileRecord=record;updateWallet();},toast);removers.push(()=>nest.dispose());
  const mods=mountModManager(node('mods-manager'),baseCatalog,toast);removers.push(()=>mods.dispose());
  try{const savedMode=localStorage.getItem('big-fat-fish:v2:mode'),legacyPractice=!savedMode&&Object.keys(localStorage).some(key=>key.startsWith('big-fat-fish:v2-combat-preview:checkpoint')),mode=savedMode??(legacyPractice?'tutorial':null);if(mode&&['tutorial-guide','tutorial','short','expedition','exploration','endless','mod-short','mod-expedition'].includes(mode))/** @type {HTMLSelectElement} */(node('mode-select')).value=mode;}catch{}
  function isModMode(){return ['mod-short','mod-expedition'].includes(/** @type {HTMLSelectElement} */(node('mode-select')).value);}
  function selectCatalog(adventure=false){catalog=adventure&&!isModMode()?baseCatalog:mods.getCatalog();
    if(!session)for(const [index,id] of ['practice-weapon-a','practice-weapon-b'].entries()){const select=/** @type {HTMLSelectElement} */(node(id)),previous=select.value;select.replaceChildren();for(const weaponId of listRuntimeWeapons(catalog)){const option=document.createElement('option');option.value=weaponId;option.textContent=catalog.definitions[weaponId].displayName;select.append(option);}select.value=listRuntimeWeapons(catalog).includes(previous)?previous:index===0?'mcp_bubble':'mcp_fan';select.disabled=adventure;}
    if(!session){const select=/** @type {HTMLSelectElement} */(node('skill-select')),previous=select.value;select.replaceChildren();for(const id of listRuntimeSkills(catalog)){const option=document.createElement('option');option.value=id;option.textContent=catalog.definitions[id].displayName;select.append(option);}select.value=listRuntimeSkills(catalog).includes(previous)?previous:'skill_cache';}
    checkpointKey=catalog.modLock?.length?`big-fat-fish:v2-combat-preview:checkpoint:${catalog.version}`:'big-fat-fish:v2-combat-preview:checkpoint';}
  let offeredRestId='';
  let withdrawalPointerHeld=false;
  function canWithdrawNow(){
    if (!session) return false;
    const state=readSessionState(session),context={state,catalog,random:state.random.combat,event:null,entityId:null};
    return state.api?canApiWithdraw(context):canExtract(context);
  }
  function refreshContinue(){try{const adventure=/** @type {HTMLSelectElement} */(node('mode-select')).value!=='tutorial';if(!session)selectCatalog(adventure);node('continue').toggleAttribute('disabled',adventure?!profileRecord?.profile.checkpoint:!localStorage.getItem(checkpointKey));}catch{node('continue').setAttribute('disabled','');}}
  function updateDepartureSelection(){
    const mode=selectedMode(),level=Number(difficultySelect.value),hint=node('benchmark-hint');
    const record=profileRecord?.profile.bestEndless?.[level];
    node('boss-select').toggleAttribute('disabled',['api','expedition','exploration','endless'].includes(mode)||modeSelect.value==='tutorial-guide');
    const picked=difficultySelect.selectedOptions[0];
    node('start').toggleAttribute('disabled',beginWorking||scopeLoading||!difficultySelect.value||picked?.disabled===true
      ||isModMode()&&(scopeUnavailable||!profileRecord));
    renderBenchmarkBoard();
    hint.textContent=mode==='exploration'?(difficultySelect.value?'在撤离点长按 F 三秒，才会带回背包里的材料。':'先在无尽模式击败首领，解锁对应的探索难度。')
      :mode==='endless'?(record?`Benchmark ${level} 个人纪录 · 首领 ${record.bossKills} · 击杀 ${record.kills} · 生存 ${Math.floor(record.survivedTicks/60)} 秒`:'击败第一位首领即可通关本档，此后可继续爬层。'):'';
    hint.toggleAttribute('hidden',!hint.textContent);
    syncModeCards();
  }
  function paintLobbyLogo(){
    const canvas=/** @type {HTMLCanvasElement} */(node('pixel-logo'));
    const small=document.createElement('canvas');small.width=310;small.height=52;
    const pen=small.getContext('2d');if(!pen)return;
    pen.font='900 34px "PingFang SC","Microsoft YaHei",sans-serif';pen.textBaseline='middle';
    for(const [dx,dy] of [[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[2,-2],[-2,2],[2,2]]){pen.fillStyle='#111';pen.fillText('大肥鱼历险记',64+dx,28+dy);}
    pen.fillStyle='#75D7ED';pen.fillText('大肥鱼历险记',64,28);
    pen.fillStyle='#111';pen.fillRect(2,20,8,14);pen.fillRect(8,14,30,22);pen.fillRect(18,8,8,8);
    pen.fillStyle='#5B7CFF';pen.fillRect(4,22,4,10);pen.fillRect(10,16,26,18);pen.fillRect(20,10,4,6);
    pen.fillStyle='#F4EFE0';pen.fillRect(28,20,4,4);pen.fillStyle='#111';pen.fillRect(30,22,2,2);pen.fillRect(34,26,4,2);
    canvas.width=small.width*3;canvas.height=small.height*3;
    const out=canvas.getContext('2d');if(!out)return;
    out.imageSmoothingEnabled=false;out.drawImage(small,0,0,canvas.width,canvas.height);
  }
  function renderBenchmarkBoard(){
    const list=node('benchmark-list');list.replaceChildren();
    const raw=difficultySelect.value,level=Number(raw);
    const ranks=/** @type {const} */([['Luna','Haiku'],['Sol','Sonnet'],['Astra','Opus']]);
    const tier=!Number.isInteger(level)||level<1?0:level<=5?0:level<=10?1:2;
    if(modeSelect.value==='tutorial-guide'||raw==='0'){
      node('bench-current').textContent='Free 教学';node('bench-title').textContent='第一次出门';node('bench-models').textContent='跟着提示把第一局打完';node('bench-affixes').replaceChildren();node('bench-reward').textContent='教学局不记 Benchmark';return;
    }
    node('bench-current').textContent=`当前选择 · Benchmark ${level||'—'}`;
    node('bench-title').textContent=`Benchmark ${level||''}`;
    node('bench-models').textContent=`GPT ${ranks[tier][0]} · Claude ${ranks[tier][1]}`;
    const affixes=node('bench-affixes');affixes.replaceChildren();
    for(const mechanic of catalog.mechanics.filter(item=>item.unlockAt===level)){const line=document.createElement('li');line.textContent=mechanic.displayName;affixes.append(line);}
    if(!affixes.childElementCount){const line=document.createElement('li');line.textContent='这一档沿用前面的词缀。';affixes.append(line);}
    const mode=selectedMode();
    const snap=resolveDifficultySnapshot(/** @type {import('../contracts.d.ts').StartRequest} */({mode:mode==='api'?'api':mode==='tutorial'?'short':mode,difficulty:mode==='api'?'api':level,seed:1,weaponIds:['mcp_bubble'],skillId:'skill_disconnect',companionId:null}),catalog);
    node('bench-reward').textContent=`奖励 ${Math.round((snap.ok?snap.value.hpMultiplier:1)*100)}% · 强度 +${Math.max(0,(level||1)-1)}`;
    for(const option of difficultySelect.options){
      if(!/^[1-9]$|^1[0-5]$/.test(option.value))continue;
      const n=Number(option.value),rowTier=n<=5?0:n<=10?1:2,button=document.createElement('button');
      button.type='button';button.className=`bench-row tier-${rowTier+1}`;button.dataset.benchmark=String(n);
      button.setAttribute('aria-pressed',String(option.value===raw));button.disabled=option.disabled;
      const badge=document.createElement('span');badge.className='bench-badge';badge.textContent=ranks[rowTier][0];
      const num=document.createElement('strong');num.textContent=String(n);button.append(badge,num);
      const note=document.createElement('small');note.textContent=option.disabled?'锁':option.value===raw?'当前选择':'';button.append(note);
      button.onclick=()=>{if(button.disabled)return;difficultySelect.value=option.value;difficultySelect.dispatchEvent(new Event('change'));};
      list.append(button);
    }
    list.querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest'});
  }
  function updateWallet(){
    if (disposed) return;
    nest.setProfile(profileRecord);
    const previous=difficultySelect.value,profile=profileRecord?.profile;
    const mode=modeSelect.value.replace(/^mod-/,'');
    difficultySelect.replaceChildren();
    /** @param {string} value @param {string} label @param {boolean} [locked] */
    function addDifficulty(value,label,locked=false){
      const option=document.createElement('option');
      option.value=value;option.textContent=label;option.disabled=locked;difficultySelect.append(option);
    }
    if (mode==='tutorial-guide') {
      addDifficulty('0','Free 0 · 引导教学');
    } else {
      for (let level=1;level<=15;level++) {
        const locked=mode==='exploration'? !profile||!isDifficultyUnlocked(profile,'exploration',level)
          :level>Math.min(15,(profile?.highestDifficulty??0)+1);
        addDifficulty(String(level),`Benchmark ${level}${locked?' · 未解锁':''}`,locked);
      }
      const numericLadder=mode!=='exploration'&&mode!=='endless';
      if (numericLadder&&profile?.apiUnlocked) addDifficulty('api','API调用 · 持续生存 / 三阵营轮换');
      if (preferApi&&numericLadder&&profile?.apiUnlocked) difficultySelect.value='api';
      else {
        const available=Array.from(difficultySelect.options).filter(option=>!option.disabled);
        difficultySelect.value=available.find(option=>option.value===previous)?.value??available[0]?.value??'';
      }
    }
    difficultySelect.disabled=mode==='tutorial-guide';
    const taught=!!profile?.unlockLedger.includes('tutorialReward:free');
    node('mode-guide').classList.toggle('guide-retired',taught);node('mode-guide-more').classList.toggle('hidden',!taught);
    const achievements=profile?.unlockLedger.filter(id=>id.startsWith('achievement')||id.startsWith('tutorialReward')).length??0;
    node('achievement-chip').textContent=`成就 ${achievements}`;
    node('wallet').textContent=profile?`算力卡 ${profile.gpuCards} · 零件 ${profile.parts}`
      :scopeUnavailable&&isModMode()?'请先启用至少一个模组':modProfileMissing?'请先创建这组模组的小窝':scopeLoading?'小窝档案读取中':'小窝档案暂不可用';
    node('mod-profile-setup').classList.toggle('hidden',!(isModMode()&&modProfileMissing));
    node('mod-profile-create').toggleAttribute('disabled',scopeLoading||beginWorking);
    updateDepartureSelection();
    refreshContinue();
  }
  async function syncProfileScope(){
    if(session||beginWorking)return;
    let generation=scopeGeneration;
    try{
      const mod=isModMode(),selected=mod?mods.getCatalog():baseCatalog,unavailable=mod&&!selected.modLock?.length,key=unavailable?'mod:unavailable':mod?createModProfileNamespace(selected):'big-fat-fish:v2:profile';
      if(key===scopeKey){updateWallet();return;}
      generation=++scopeGeneration;scopeKey=key;profileRecord=null;profileCatalog=selected;profilePort=mod&&!unavailable?createStoragePort(key):baseProfilePort;scopeUnavailable=unavailable;scopeLoading=!unavailable;modProfileMissing=false;
      nest.dispose();nest=mountNestManager(node('nest-manager'),selected,profilePort,record=>{if(scopeGeneration===generation){profileRecord=record;updateWallet();}},toast);updateWallet();
      if(unavailable)return;
      const result=await readProfileRepository(profilePort,selected);if(disposed||generation!==scopeGeneration)return;
      scopeLoading=false;if(result.ok)profileRecord=result.value;else if(mod&&result.code==='PROFILE_MISSING')modProfileMissing=true;else toast(`小窝档案读取失败：${result.message}`);updateWallet();
    }catch(error){if(disposed||generation!==scopeGeneration)return;scopeGeneration++;scopeKey='';scopeLoading=false;scopeUnavailable=true;profileRecord=null;updateWallet();toast(`模组小窝不可用：${error instanceof Error?error.message:String(error)}`);}
  }
  async function createSelectedModProfile(){
    if(!isModMode()||!modProfileMissing||scopeLoading||session||beginWorking)return;
    const generation=scopeGeneration,port=profilePort,selected=profileCatalog,source=/** @type {HTMLSelectElement} */(node('mod-profile-source')).value;scopeLoading=true;updateWallet();
    try{
      let vanilla=null;if(source==='copy'){const read=await readProfileRepository(baseProfilePort,baseCatalog);if(!read.ok)throw new Error(read.message);vanilla=read.value.profile;}
      const result=await initializeModProfile(port,selected,baseCatalog,vanilla);if(!result.ok)throw new Error(result.message);
      if(disposed||generation!==scopeGeneration)return;profileRecord=result.value;modProfileMissing=false;toast(source==='copy'?'模组小窝已从原版复制；后续进度独立。':'已创建全新的模组小窝。');
    }catch(error){if(!disposed&&generation===scopeGeneration)toast(`模组小窝未创建：${error instanceof Error?error.message:String(error)}`);}
    finally{if(!disposed&&generation===scopeGeneration){scopeLoading=false;updateWallet();}}
  }
  async function flushProfile(){
    if(profileWorking||!pendingPersistence.length)return;profileWorking=true;profileFailed=false;
    const batch=[...pendingPersistence];
    try{for(let attempt=0;attempt<3;attempt++){
      const current=await readProfileRepository(profilePort,profileCatalog);if(!current.ok)throw new Error(current.message);
      const plan=mergePersistenceIntents(current.value.profile,batch,profileCatalog);if(!plan.ok)throw new Error(plan.message);
      const committed=await commitProfilePlan(profilePort,plan.value,profileCatalog);if(!committed.ok){if(committed.code==='REVISION_CONFLICT')continue;throw new Error(committed.message);}
      profileRecord=committed.value;const ids=new Set(batch.map(intent=>intent.id));for(let i=pendingPersistence.length-1;i>=0;i--)if(ids.has(pendingPersistence[i].id))pendingPersistence.splice(i,1);
      if(session&&profileRecord.profile.settlementLedger.includes(`settlement:${session.runId}`))settledRunId=session.runId;
      updateWallet();return;
    }throw new Error('档案正在被另一个页面更新，请重试。');}catch(error){profileFailed=true;pause();toast(`收获尚未保存：${error instanceof Error?error.message:String(error)}`);}finally{profileWorking=false;}
  }
  /** @param {boolean} restore */
  async function begin(restore=false){
    if(beginWorking||profileWorking||pendingPersistence.length||scopeLoading)return;
    if(isModMode()&&(scopeUnavailable||!profileRecord)){toast('请先启用模组并创建对应的小窝。');return;}
    beginWorking=true;/** @type {HTMLSelectElement} */(node('mode-select')).disabled=true;
    let replacement=/** @type {import('../contracts.d.ts').GameSession|null} */(null);
    node('start').setAttribute('disabled','');node('continue').setAttribute('disabled','');
    try{
      const adventure=/** @type {HTMLSelectElement} */(node('mode-select')).value!=='tutorial';selectCatalog(adventure);
      if(adventure){const record=await readProfileRepository(profilePort,profileCatalog);if(!record.ok)throw new Error(record.message);profileRecord=record.value;
        if(restore){if(!record.value.profile.checkpoint)throw new Error('还没有保存的冒险');const result=restoreGameSession(record.value.profile.checkpoint,catalog);if(!result.ok)throw new Error(result.message);replacement=result.value;}
        else{
          if(record.value.profile.checkpoint)throw new Error('请先继续或放弃现有冒险');
          const seed=Number(/** @type {HTMLInputElement} */(node('seed')).value);if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new Error('请输入有效整数种子');
          const runId=`adventure:${Array.from(crypto.getRandomValues(new Uint32Array(4)),value=>value.toString(16).padStart(8,'0')).join('')}`;
          const guided=/** @type {HTMLSelectElement} */(node('mode-select')).value==='tutorial-guide',prepared=prepareAdventureStart(record.value.profile,guided?{mode:'tutorial',difficulty:0,seed,weaponIds:['mcp_bubble'],skillId:'skill_disconnect',companionId:'companion_rice'}:{mode:selectedMode(),difficulty:(/** @type {HTMLSelectElement} */(node('difficulty-select')).value==='api'?'api':Number(/** @type {HTMLSelectElement} */(node('difficulty-select')).value)),seed,bossFaction:/** @type {import('../contracts.d.ts').Faction} */(/** @type {HTMLSelectElement} */(node('boss-select')).value),...nest.getLoadout()},catalog,runId);if(!prepared.ok)throw new Error(prepared.message);
          replacement=createGameSession(prepared.value,seed,catalog);
          const initial=readSessionState(replacement),checkpoint=createCheckpoint(initial),intent=scopePersistenceIntent({id:checkpoint.id,kind:'checkpoint',payload:/** @type {import('../contracts.d.ts').Json} */(JSON.parse(JSON.stringify(checkpoint)))},initial),plan=mergePersistenceIntents(record.value.profile,[intent],catalog);if(!plan.ok)throw new Error(plan.message);const saved=await commitProfilePlan(profilePort,plan.value,profileCatalog);if(!saved.ok)throw new Error(saved.message);profileRecord=saved.value;
        }
      }else if(restore){
        const raw=localStorage.getItem(checkpointKey);if(!raw)throw new Error('还没有保存的检查点');const result=restoreGameSession(JSON.parse(raw),catalog);if(!result.ok)throw new Error(result.message);replacement=result.value;
      }else{
        const seed=Number(/** @type {HTMLInputElement} */(node('seed')).value);if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new Error('请输入有效整数种子');
        const difficulty=resolveDifficultySnapshot({mode:'tutorial',difficulty:0,seed,weaponIds:['mcp_bubble','mcp_fan'],skillId:'skill_cache',companionId:null},catalog);if(!difficulty.ok)throw new Error(difficulty.message);
        const skillId=/** @type {HTMLSelectElement} */(node('skill-select')).value;
        const practiceWeapons=['practice-weapon-a','practice-weapon-b'].map(id=>/** @type {HTMLSelectElement} */(node(id)).value);if(new Set(practiceWeapons).size!==2)throw new Error('请为练习选择两把不同的MCP');
        replacement=createGameSession({modLock:catalog.modLock??[],runtimeProfile:'core-preview',runId:`preview:${Array.from(crypto.getRandomValues(new Uint32Array(4)),value=>value.toString(16).padStart(8,'0')).join('')}`,treeNodeIds:[],dsh:/** @type {HTMLSelectElement} */(node('dsh-select')).value?[{id:/** @type {HTMLSelectElement} */(node('dsh-select')).value,options:{}}]:[],difficulty:difficulty.value,loadout:{weapons:practiceWeapons.map((id,index)=>({instanceId:`practice:mcp:${index}`,definitionId:id,originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null})),activeWeaponIndex:0,skillId,skillCooldown:0,companionId:/** @type {HTMLSelectElement} */(node('companion-select')).value||null,companionCooldown:0,dashCooldown:0}},seed,catalog);
      }
      if(session)disposeGameSession(session);session=replacement;replacement=null;formal=adventure;settledRunId='';profileFailed=false;sequence=readSessionState(session).lastCommandSeq+1;
      displayedChoice='';displayedTrial='';offeredPickupId='';offeredRestId='';node('equipment-menu').classList.add('hidden');node('lora-menu').classList.add('hidden');node('plugin-menu').classList.add('hidden');view=readSessionView(session);clock=createClockState();lastTime=performance.now();clearInput();popups=[];saveRequested=false;
      node('menu').classList.add('hidden');node('hud').classList.remove('hidden');node('controls').classList.remove('hidden');mount?.classList.add('started');node('mods-panel').classList.add('hidden');node('nest-panel').classList.add('hidden');updateWallet();
      toast(restore?'已恢复原进度，点击继续才开始。':formal&&readSessionState(session).start.guidedTutorial?'Free教学：移动、瞄准并射击，按提示一步步探索。':formal&&readSessionState(session).expedition?'远征：完成每片海域任意两个目标并击败首领，通道可往返。三海域顺序已锁定。':selectedMode()==='exploration'?'击败守卫、搜刮补给，到撤离点长按 F 或交互键三秒。':selectedMode()==='endless'?'两分钟后出现首领。击败第一位首领即可解锁同档探索，之后还能继续爬层。':formal&&readSessionState(session).api?'API调用：敌人随时间增强，每5分钟一位首领。在安全检查点长按F或交互3秒返回。':formal?'点亮任意两个工作区，前往右下方首领入口。F交互，R保存检查点。':'WASD移动，鼠标射击。F交互，R保存起点检查点。');canvas.focus();
    }catch(error){if(replacement)disposeGameSession(replacement);toast(`未能开始：${error instanceof Error?error.message:String(error)}`);}finally{beginWorking=false;/** @type {HTMLSelectElement} */(node('mode-select')).disabled=false;updateWallet();if(!session)void syncProfileScope();}
  }
  function save(){
    if(!session)return;const snapshot=readSessionState(session),validation=canCreateCheckpoint({state:snapshot,catalog,event:null,entityId:null,random:snapshot.random.world});
    if(!validation.valid){toast(validation.diagnostics.map(item=>item.message).join('；').replace('Move within 96 units of a checkpoint','请靠近检查点').replace('Threats or pressure events are still active','附近仍有敌人或在途攻击'));return;}
    const checkpoint=createCheckpoint(snapshot);
    if(formal){pendingPersistence.push(scopePersistenceIntent({id:checkpoint.id,kind:'checkpoint',payload:/** @type {import('../contracts.d.ts').Json} */(JSON.parse(JSON.stringify(checkpoint)))},snapshot));void flushProfile().then(()=>{if(!profileFailed)toast('冒险检查点已保存，生命和冷却原样保留。');});return;}
    try{localStorage.setItem(checkpointKey,JSON.stringify(checkpoint));refreshContinue();toast('检查点已保存，生命、冷却和战斗进度原样保留。');}catch{toast('保存失败，原存档已保留。');}
  }
  /** @param {boolean} release */
  function escape(release=false){if(!session)return;const state=readSessionState(session),player=state.world.entities[state.player.entityId];if(!release&&!player.statusIds.some(id=>state.world.statuses[id]?.kind==='root'))return;escapePressing=!release;send(release?'ReleaseEscape':'EscapePress',{edge:release?'release':'press',repeat:false});}
  function requestSave(){clearInput();saveRequested=true;}
  /** @param {MouseEvent|PointerEvent} event */
  function aimFromPointer(event){if(!view)return;const rect=canvas.getBoundingClientRect(),camera=getPreviewCamera(view,rect.width,rect.height),player=view.entities.find(entity=>entity.kind==='player');if(!player)return;const dx=(event.clientX-rect.left)/camera.scale+camera.x-player.position.x,dy=(event.clientY-rect.top)/camera.scale+camera.y-player.position.y,mag=Math.hypot(dx,dy);if(mag>0){aim={x:dx/mag,y:dy/mag};aimDistance=Math.min(400,mag);}}
  /** @param {string} id @param {boolean} movement */
  function attachStick(id,movement){
    const pad=node(id),knob=pad.querySelector('span');let pointer=/** @type {number|null} */(null),origin={x:0,y:0};
    /** @param {PointerEvent} event */
    const update=event=>{if(event.pointerId!==pointer)return;let dx=event.clientX-origin.x,dy=event.clientY-origin.y;const magnitude=Math.hypot(dx,dy),limit=33;if(magnitude>limit){dx*=limit/magnitude;dy*=limit/magnitude;}if(knob instanceof HTMLElement)knob.style.transform=`translate(${dx}px,${dy}px)`;const norm=Math.hypot(dx,dy);if(movement)leftMove=norm>5?{x:dx/norm,y:dy/norm}:{x:0,y:0};else{if(norm>5){aim={x:dx/norm,y:dy/norm};aimDistance=400;}stickFiring=norm>5;}};
    on(pad,'pointerdown',event=>{const e=/** @type {PointerEvent} */(event);if(!session||!['exploring','boss'].includes(readSessionState(session).flow.phase)||pointer!==null)return;e.preventDefault();e.stopPropagation();pointer=e.pointerId;const bounds=pad.getBoundingClientRect();origin={x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2};pad.setPointerCapture(pointer);update(e);});
    on(pad,'pointermove',event=>update(/** @type {PointerEvent} */(event)));
    const release=/** @type {EventListener} */(event=>{const e=/** @type {PointerEvent} */(event);if(e.pointerId!==pointer)return;pointer=null;if(knob instanceof HTMLElement)knob.style.transform='';if(movement)leftMove={x:0,y:0};else stickFiring=false;});
    on(pad,'pointerup',release);on(pad,'pointercancel',release);on(pad,'lostpointercapture',release);
    stickResetters.push(()=>{const previous=pointer;pointer=null;if(previous!==null&&pad.hasPointerCapture(previous))pad.releasePointerCapture(previous);});
    removers.push(()=>{pointer=null;});
  }
  attachStick('left-stick',true);attachStick('right-stick',false);
  const assist=/** @type {HTMLInputElement} */(node('escape-assist')),homeAssist=/** @type {HTMLInputElement} */(node('home-escape-assist'));
  try{assist.checked=homeAssist.checked=localStorage.getItem('big-fat-fish:v2:escape-assist')==='1';}catch{}
  function saveAssist(){try{localStorage.setItem('big-fat-fish:v2:escape-assist',assist.checked?'1':'0');}catch{}}
  on(assist,'change',()=>{homeAssist.checked=assist.checked;saveAssist();canvas.focus();});
  on(homeAssist,'change',()=>{assist.checked=homeAssist.checked;saveAssist();});
  const simpleHome=/** @type {HTMLInputElement} */(node('home-simple-fx')),simplePause=/** @type {HTMLInputElement} */(node('pause-simple-fx'));
  try{simpleHome.checked=simplePause.checked=localStorage.getItem('big-fat-fish:v2:simple-fx')==='1';}catch{}
  function saveSimple(){try{localStorage.setItem('big-fat-fish:v2:simple-fx',simpleHome.checked?'1':'0');}catch{}}
  on(simpleHome,'change',()=>{simplePause.checked=simpleHome.checked;saveSimple();});
  on(simplePause,'change',()=>{simpleHome.checked=simplePause.checked;saveSimple();canvas.focus();});
  on(node('open-departure'),'click',()=>showDeparture());on(node('back-home'),'click',()=>showHome());
  on(node('open-tree'),'click',()=>{const panel=/** @type {HTMLDetailsElement} */(node('nest-panel'));panel.open=true;panel.querySelector('[data-tab="tree"]')?.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  for (const [mode,id] of Object.entries(modeCards)) on(node(id),'click',()=>{
    preferApi=false;
    modeSelect.value=isModMode()&&['short','expedition'].includes(mode)?`mod-${mode}`:mode;
    modeSelect.dispatchEvent(new Event('change'));
  });
  on(node('mode-guide-more'),'click',()=>{
    modeSelect.value='tutorial-guide';
    modeSelect.dispatchEvent(new Event('change'));
  });
  on(node('escape-input'),'pointerdown',event=>{blockTrainingClick=true;event.preventDefault();escape(false);});on(window,'pointerup',()=>{if(escapePressing)escape(true);});
  for(const id of ['nest-panel','mods-panel','settings-panel'])on(node(id),'toggle',()=>{if(!/** @type {HTMLDetailsElement} */(node(id)).open)return;for(const other of ['nest-panel','mods-panel','settings-panel'])if(other!==id)/** @type {HTMLDetailsElement} */(node(other)).open=false;});
  on(node('mods-manager'),'modschange',()=>{void syncProfileScope();});
  on(node('mod-profile-create'),'click',()=>{void createSelectedModProfile();});
  on(node('mode-select'),'change',()=>{preferApi=false;try{localStorage.setItem('big-fat-fish:v2:mode',/** @type {HTMLSelectElement} */(node('mode-select')).value);}catch{}const adventure=/** @type {HTMLSelectElement} */(node('mode-select')).value!=='tutorial';void syncProfileScope();if(adventure){/** @type {HTMLSelectElement} */(node('skill-select')).value='skill_disconnect';/** @type {HTMLSelectElement} */(node('dsh-select')).value='';}node('skill-select').toggleAttribute('disabled',adventure);node('companion-select').toggleAttribute('disabled',adventure);node('dsh-select').toggleAttribute('disabled',adventure);refreshContinue();});on(node('retry-profile'),'click',()=>{void flushProfile();});on(node('difficulty-select'),'change',()=>{preferApi=difficultySelect.value==='api';updateDepartureSelection();});on(node('interact'),'pointerdown',event=>{if(canWithdrawNow()){event.preventDefault();withdrawalPointerHeld=true;send('StartWithdrawal');}});on(window,'pointerup',()=>{if(withdrawalPointerHeld){withdrawalPointerHeld=false;send('CancelWithdrawal');}});on(node('interact'),'click',()=>{if(!canWithdrawNow())send('Interact');});
  on(node('equipment-leave'),'click',()=>resume());
  on(node('abandon'),'click',()=>{if(send('Abandon',{},'ui')&&session)stepSessionUi(session,false);});
  on(node('start'),'click',()=>begin(false));on(node('continue'),'click',()=>begin(true));on(node('pause'),'click',()=>session&&readSessionState(session).flow.phase==='paused'?resume():pause());on(node('resume'),'click',()=>resume());
  on(node('restart'),'click',()=>{if(formal&&session&&settledRunId!==session.runId){pause();return;}if(session)disposeGameSession(session);session=null;view=null;displayedChoice='';displayedTrial='';offeredPickupId='';offeredRestId='';node('equipment-menu').classList.add('hidden');node('lora-menu').classList.add('hidden');node('plugin-menu').classList.add('hidden');clearInput();node('menu').classList.remove('hidden');showDeparture();node('pause-menu').classList.add('hidden');node('hud').classList.add('hidden');node('controls').classList.add('hidden');mount?.classList.remove('started');node('mods-panel').classList.remove('hidden');node('nest-panel').classList.remove('hidden');void syncProfileScope();refreshContinue();});
  on(window,'pointerdown',()=>{blockTrainingClick=false;},true);on(window,'click',event=>{if(blockTrainingClick&&/** @type {MouseEvent} */(event).detail>0){blockTrainingClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  on(node('training-input'),'pointerdown',event=>{blockTrainingClick=true;event.preventDefault();train(false);});on(window,'pointerup',()=>train(true));on(node('training-input'),'click',event=>{if(/** @type {MouseEvent} */(event).detail===0){train(false);train(true);}});
  on(node('plugin-reroll'),'click',()=>choose('RerollPlugin'));on(node('plugin-skip'),'click',()=>choose('SkipPlugin'));
  on(node('switch'),'click',()=>{send('SwitchWeapon');});on(node('skill'),'click',()=>{send('Skill');});on(node('dash'),'click',()=>{send('Dash');});on(node('checkpoint'),'click',()=>requestSave());
  on(window,'keydown',event=>{const e=/** @type {KeyboardEvent} */(event);if(!session||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;const key=e.code;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key))e.preventDefault();if(e.repeat)return;
    if(key==='Escape'){readSessionState(session).flow.phase==='paused'?resume():pause();return;}keys.add(key);
    if(key==='Space'&&readSessionState(session).flow.phase==='loraTraining'){train(false);return;}
    if(key==='Space'){const state=readSessionState(session);if(state.world.entities[state.player.entityId].statusIds.some(id=>state.world.statuses[id]?.kind==='root'))escape(false);else send('Dash');}else if(key==='KeyE')send('Skill');else if(key==='KeyQ')send('SwitchWeapon');else if(key==='KeyF'){if(canWithdrawNow())send('StartWithdrawal');else send('Interact');}else if(key==='KeyR')requestSave();
  });
  on(window,'keyup',event=>{const key=/** @type {KeyboardEvent} */(event).code;keys.delete(key);if (key==='KeyF'&&session) {
      const state=readSessionState(session);
      if (state.api||state.start.difficulty.mode==='exploration') send('CancelWithdrawal');
    }if(key==='Space'){train(true);if(escapePressing)escape(true);}});
  on(canvas,'pointermove',event=>{const e=/** @type {PointerEvent} */(event);if(e.pointerType==='mouse')aimFromPointer(e);});
  on(canvas,'pointerdown',event=>{const e=/** @type {PointerEvent} */(event);if(e.pointerType==='mouse'&&e.button===0){aimFromPointer(e);mouseFiring=true;canvas.focus();}});
  on(window,'pointerup',event=>{if(/** @type {PointerEvent} */(event).pointerType==='mouse')mouseFiring=false;});
  on(window,'pointercancel',()=>{if(withdrawalPointerHeld){withdrawalPointerHeld=false;send('CancelWithdrawal');}clearInput();train(true);});on(window,'blur',()=>pause());on(document,'visibilitychange',()=>{if(document.hidden)pause();});
  /** @param {number} now */
  function frame(now){
    if(disposed)return;
    try{
      const rect=canvas.getBoundingClientRect(),ratio=Math.min(2,window.devicePixelRatio||1),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
      if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
      if(session){
        const frameState=readSessionState(session);
        if(['exploring','boss'].includes(frameState.flow.phase)){
          const move={x:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+leftMove.x,y:(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+leftMove.y};
          const camera=view?getPreviewCamera(view,width,height):{x:0,y:0,scale:1};const sample={move,aim,aimDistance,firing:mouseFiring||stickFiring,viewport:{width:width/camera.scale,height:height/camera.scale}},encoded=JSON.stringify(sample);if(encoded!==lastInput&&send('SetInput',sample))lastInput=encoded;
        }
        const state=frameState,schedule=scheduleFrame(clock,lastTime?Math.max(0,now-lastTime):0,state.flow.phase);clock=schedule.nextClock;
        if(schedule.performancePause){pause();toast('帧积压较多，已暂停。继续时不会快进战斗。');}
        for(let index=0;index<schedule.worldSteps;index++){
          if(escapePressing&&/** @type {HTMLInputElement} */(node('escape-assist')).checked){const state=readSessionState(session),player=state.world.entities[state.player.entityId];if(player.statusIds.some(id=>state.world.statuses[id]?.kind==='root')&&state.tick-Number(player.runtime.lastEscapeAt??0)>=12)send('EscapeHeld',{edge:'held',repeat:false});}
          const result=stepSessionWorld(session);showEvents(result.events);if(formal)pendingPersistence.push(...result.persistence);
          for(const event of result.events)if(event.type==='DamageResolved'){
            const p=/** @type {{hpDamage:number;shellDamage:number;shieldDamage:number}} */(event.payload),entity=event.targetId?result.next.world.entities[event.targetId]:null;
            if(entity&&p.hpDamage+p.shellDamage>0)popups.push({x:entity.position.x,y:entity.position.y,amount:p.hpDamage+p.shellDamage,tick:result.next.tick});
          }
          if(!['exploring','boss'].includes(result.next.flow.phase))break;
        }
        for(let index=0;index<schedule.uiSteps;index++){const result=stepSessionUi(session,true);showEvents(result.events);if(result.next.flow.phase!=='loraTraining'||result.next.lora.active?.phase!=='running')break;}
        if(saveRequested){const pending=readSessionState(session);if(pending.flow.phase!=='exploring'||!pending.input.firing&&!pending.input.move.x&&!pending.input.move.y){saveRequested=false;save();}}
        const growth=readSessionState(session),choice=growth.flow.choice;
        const trial=growth.lora.active;
        node('lora-menu').classList.toggle('hidden',growth.flow.phase!=='loraTraining');
        if(growth.flow.phase==='loraTraining'&&trial){
          if(displayedTrial!==trial.id){clearInput();clock=resumeClock(clock);displayedTrial=trial.id;}
          const labels={maxHp:'最大生命',damageMultiplier:'通用输出',moveSpeed:'移动速度',armor:'护甲'};
          node('lora-title').textContent=`Lv.${trial.level} · ${trial.phase==='ready'?'训练准备':'训练中'}`;node('lora-target').textContent=`本次微调：${labels[trial.target]}`;node('lora-pointer').style.left=`${trial.uiTick/120*100}%`;node('lora-pointer').parentElement?.setAttribute('aria-valuenow',String(trial.uiTick));node('training-input').textContent=trial.phase==='ready'?'开始训练 · Space':'确认位置 · Space';node('training-input').toggleAttribute('disabled',growth.lora.inputHeld===true);node('lora-description').textContent=trial.phase==='ready'?'首次按下只开始。松开后，在绿色区域再次按下。':growth.lora.inputHeld?'请先松开，再次按下确认。':'指针匀速前进；绿色区域为完美训练，2秒后自动过拟合。';
        }
        if(!trial)displayedTrial='';
        const dshTimers=readDshCycleTimers(growth);node('dsh-label').textContent=[growth.start.dsh.map(slot=>catalog.definitions[slot.id]?.displayName??slot.id).join(' / '),...(growth.start.dsh.some(slot=>slot.id==='dsh_lora')?[`LoRA：欠拟合${growth.lora.underfitRemaining.toFixed(1)}s / 过拟合${growth.lora.overfitRemaining.toFixed(1)}s`]:[]),...(growth.start.dsh.some(slot=>slot.id==='dsh_gpt_branch')?[dshTimers.activeRemaining<=1e-9?'更新/重置：本局效果已结束':`更新/重置：下次${dshTimers.remaining.toFixed(1)}s · 剩余${dshTimers.activeRemaining.toFixed(1)}s`]:[])].filter(Boolean).join(' · ');
        node('plugin-menu').classList.toggle('hidden',growth.flow.phase!=='pluginChoice');
        if(growth.flow.phase==='pluginChoice'&&choice&&choice.id!==displayedChoice){
          clearInput();clock=resumeClock(clock);displayedChoice=choice.id;
          node('plugin-title').textContent=`Lv.${choice.level} · 选择插件`;
          const options=node('plugin-options');options.replaceChildren();
          for(const candidate of choice.candidates){const definition=catalog.definitions[candidate.id],button=document.createElement('button'),icon=document.createElement('span'),title=document.createElement('strong'),description=document.createElement('small');button.type='button';button.dataset.pluginId=candidate.id;icon.className='plugin-symbol';icon.setAttribute('aria-hidden','true');if(candidate.id==='plugin_collect'){const riceIcon=document.createElement('img');riceIcon.src='./art/sprites/rice-bowl.svg';riceIcon.alt='';riceIcon.className='rice-icon';icon.append(riceIcon);}else icon.textContent=candidate.id==='plugin_distill'?'◇':candidate.id==='plugin_5h'?'◷':'✦';title.textContent=`${definition.displayName} · ${candidate.rank}级`;description.textContent=String(/** @type {readonly string[]} */(definition.parameters.rankDescriptions??[])[candidate.rank-1]??'');button.append(icon,title,description);button.onclick=()=>{
            const owned=growth.plugins.filter(p=>p.origin==='run');
            if(candidate.rank===2||owned.length<6){choose('SelectPlugin',candidate.id);return;}
            node('plugin-title').textContent=`装入 ${definition.displayName} · 选择替换`;
            options.replaceChildren();
            for(const old of owned){const replace=document.createElement('button');replace.type='button';replace.dataset.replacePlugin=old.id;replace.textContent=`替换 ${catalog.definitions[old.id].displayName} · ${old.rank}级`;replace.onclick=()=>choose('SelectPlugin',candidate.id,old.id);options.append(replace);}
            const cancel=document.createElement('button');cancel.type='button';cancel.textContent='返回候选';cancel.onclick=()=>{displayedChoice='';};options.append(cancel);
          };options.append(button);}
          node('plugin-reroll').toggleAttribute('disabled',(growth.flow.pluginRerollsUsed??0)>=1);node('plugin-reroll').textContent=`重抽（本局剩余${1-(growth.flow.pluginRerollsUsed??0)}次）`;
        }
        if(growth.flow.phase!=='pluginChoice')displayedChoice='';
        const capped=!growth.api&&growth.level>=(growth.expedition?30:16),xpPercent=capped?100:Math.max(0,Math.min(100,growth.xpRemainder/(20+10*growth.level)*100));node('level').textContent=String(growth.level);node('growth-label').textContent=capped?'本模式等级已满':`${growth.xpRemainder} / ${20+10*growth.level}`;node('growth-fill').style.width=`${xpPercent}%`;node('growth-fill').parentElement?.setAttribute('aria-valuenow',String(Math.round(xpPercent)));
        node('pressure-label').textContent=growth.world.pressureEvents.filter(e=>['telegraph','active'].includes(e.phase)).map(e=>`${String(e.runtime.title??catalog.definitions[e.mechanicId]?.displayName??'增援')} · ${e.phase==='telegraph'?'预警':'进行中'} ${e.remaining.toFixed(1)}s`).join(' / ');
        node('plugins-label').textContent=growth.plugins.map(plugin=>`${catalog.definitions[plugin.id].displayName}${plugin.rank}`).join(' · ');
        node('distill-label').textContent=growth.plugins.some(plugin=>plugin.id==='plugin_distill')?`蒸馏 蟹${growth.distill.claude.stage}阶(${growth.distill.claude.samples}) / GPT${growth.distill.gpt.stage}阶(${growth.distill.gpt.samples}) / Bot${growth.distill.grok.stage}阶(${growth.distill.grok.samples})`:'';
        const player=growth.world.entities[growth.player.entityId],rootId=player.statusIds.find(id=>growth.world.statuses[id]?.kind==='root'),root=rootId?growth.world.statuses[rootId]:null;
        node('escape-input').classList.toggle('hidden',!root);node('escape-assist-label').classList.toggle('hidden',!root);node('escape-count').textContent=root?`${root.completedInputs}/${root.requiredInputs}`:'';
        const completed=growth.world.objectives.filter(objective=>['beacon','blockade','escort'].includes(objective.kind)&&objective.completed).length;const targets=completed>=2?[growth.world.entities[localWorldId(growth,'boss:gate')]]:growth.world.objectives.filter(objective=>objective.active&&!objective.completed).map(objective=>growth.world.entities[objective.id]);const target=targets.filter(Boolean).sort((a,b)=>Math.hypot(a.position.x-player.position.x,a.position.y-player.position.y)-Math.hypot(b.position.x-player.position.x,b.position.y-player.position.y))[0];const distance=target?Math.hypot(target.position.x-player.position.x,target.position.y-player.position.y):0;const direction=target?['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(target.position.y-player.position.y,target.position.x-player.position.x)/(Math.PI/4))+8)%8]:'';node('objective-label').textContent=formal?`${growth.flow.phase==='boss'?'击败首领':completed>=2?`首领入口已开放 · ${direction} ${Math.round(distance)}`:`信标 ${completed}/2 · ${direction} ${Math.round(distance)} · 圈内35秒`}`:'';node('materials-label').textContent=formal?`背包：碎片 ${growth.inventory.gpuFragments} · 零件 ${growth.inventory.parts}`:'';
        const secretHint=/** @type {{targetId?:string;expiresAt?:number}|undefined} */(player.runtime.secretHint),secret=secretHint?.targetId?growth.world.entities[secretHint.targetId]:null;if(secret&&Number(secretHint?.expiresAt)>growth.tick&&secret.runtime.opened!==true){const arrow=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(secret.position.y-player.position.y,secret.position.x-player.position.x)/(Math.PI/4))+8)%8];node('objective-label').textContent+=` · 秘密雷达 ${arrow} ${Math.round(Math.hypot(secret.position.x-player.position.x,secret.position.y-player.position.y))}`;}
        const nearbyWeapon=Object.values(growth.world.pickups).find(pickup=>['weapon','skill'].includes(pickup.kind)&&Math.hypot(pickup.position.x-player.position.x,pickup.position.y-player.position.y)<=96);const nearObjective=Object.values(growth.world.entities).some(entity=>entity.kind==='objective'&&typeof entity.runtime.interaction==='string'&&Math.hypot(entity.position.x-player.position.x,entity.position.y-player.position.y)<=96);mount?.classList.toggle('can-interact',!!nearbyWeapon||nearObjective);const interactLabel=node('interact').firstChild;if(interactLabel)interactLabel.textContent=nearbyWeapon?'拾取装备 ':nearObjective&&Object.values(growth.world.entities).some(entity=>entity.runtime.interaction==='companionRescue'&&Math.hypot(entity.position.x-player.position.x,entity.position.y-player.position.y)<=96)?'分一口 ':'交互 ';
        const boss=growth.bosses.map(boss=>growth.world.entities[boss.entityId]).find(entity=>entity&&!entity.dead);node('boss-hud').classList.toggle('hidden',!boss);if(boss){node('boss-name').textContent=catalog.definitions[boss.definitionId].displayName;const record=growth.bosses.find(b=>b.entityId===boss.id);const reset=/** @type {{completeAt:number}|null} */(boss.runtime.gptReset??null);node('objective-label').textContent=reset?`重新生成 ${(reset.completeAt-growth.tick)/60|0}s · 击毁发亮节点或击杀本体`:record?.faction==='gpt'?`剩余节点 ${record.resetNodes.filter(n=>!n.consumed).length}/3`:'击败首领';node('boss-hp').textContent=`${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;node('boss-fill').style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;}
        if(growth.expedition){const e=growth.expedition,index=growth.world.map.biomeIndex;const escort=growth.world.objectives.find(o=>o.kind==='escort'&&o.active&&!o.completed&&growth.world.entities[o.id]?.runtime.escortState==='active'),robot=escort?growth.world.entities[escort.id]:null;const route=/** @type {readonly {x:number;y:number}[]} */(/** @type {unknown} */(robot?.runtime.escortRoute??[])),destination=escort?route[escort.progress]:null,heading=destination&&robot?['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(destination.y-robot.position.y,destination.x-robot.position.x)/(Math.PI/4))+8)%8]:'';const escortHint=escort&&robot?(Math.hypot(player.position.x-robot.position.x,player.position.y-robot.position.y)>240?'机器人在等你靠近':Object.values(growth.world.entities).some(enemy=>enemy.kind==='enemy'&&enemy.runtime.noAi!==true&&!enemy.dead&&!enemy.dying&&Math.hypot(enemy.position.x-robot.position.x,enemy.position.y-robot.position.y)<=180)?'清除机器人附近的敌人':robot.runtime.escortNoRoute===true?'护送路线被堵住':`护送 ${escort.progress}/3 · ${heading}`):'';node('objective-label').textContent=`海域${index+1}/3 · ${catalog.definitions[`boss_${e.route[index]}`].displayName} · ${e.clearedBiomes.includes(index)?'已击破 · 通道可往返':growth.flow.phase==='boss'?node('objective-label').textContent:escortHint&&completed<2?`目标${completed}/2 · ${escortHint}`:`目标${completed}/2 · ${direction} ${Math.round(distance)}`}`;}
        if(growth.start.guidedTutorial){const stage=String(growth.world.entities['tutorial:director']?.runtime.stage??''),labels=/** @type {Record<string,string>} */({move:'先移动并瞄准射击',collect:'击败敌人并捡大白饭，升级后选择插件',dash:'按 Space / 冲刺，试试躲开攻击',escapeWait:'准备挣脱：留意即将出现的禁锢',escape:'连续按 Space / 挣脱，或用断开连接',checkpoint:'回到检查点按 R 保存，随后按 F 挑战首领',boss:'躲开重钳，击败教学首领'});node('objective-label').textContent=`Free教学 · ${labels[stage]??'继续探索'}`;}
        const exploration=growth.start.difficulty.mode==='exploration',endless=growth.start.difficulty.mode==='endless';
        if (exploration) {
          const exit=growth.world.entities[EXTRACTION_ID],remaining=growth.extractionHold?EXTRACTION_TICKS-growth.tick+growth.extractionHold.startedAt:null;
          const distance=Math.round(Math.hypot(exit.position.x-player.position.x,exit.position.y-player.position.y));
          node('objective-label').textContent=remaining!==null?`撤离中 ${(remaining/60).toFixed(1)} 秒`
            :distance<=exit.radius?'长按 F 或交互键撤离':`搜刮补给后前往撤离点 · 距离 ${distance}`;
          const label=node('interact').firstChild;
          if (label&&distance<=exit.radius&&!nearbyWeapon) label.textContent='长按撤离 ';
        }
        if(growth.api){const a=growth.api;node('objective-label').textContent=`${endless?`无尽 Benchmark ${growth.start.difficulty.level}`:'API调用'} ${Math.floor(a.elapsedTicks/3600)}:${String(Math.floor(a.elapsedTicks/60)%60).padStart(2,'0')} · 首领${a.bossKills} · 有效击杀${a.kills}`+(a.withdrawal?` · 返回 ${(Math.max(0,180-growth.tick+a.withdrawal.startedAt)/60).toFixed(1)}s`:a.bossWarningAt!==null?` · 首领预警 ${(Math.max(0,240-growth.tick+a.bossWarningAt)/60).toFixed(1)}s`:boss?' · 阶段首领不会结束调用':' · 安全检查点长按F返回');const label=node('interact').firstChild;if(label)label.textContent=canWithdrawNow()||a.withdrawal?'长按返回 ':'交互 ';}
        node('companion-label').textContent=growth.player.loadout.companionId?`${catalog.definitions[growth.player.loadout.companionId].displayName} · ${player.statusIds.some(id=>growth.world.statuses[id]?.kind==='companionBan')?'已封禁':growth.player.loadout.companionCooldown>0?growth.player.loadout.companionCooldown.toFixed(1)+'s':'准备协助'}`:'';
        node('skill').toggleAttribute('disabled',growth.player.loadout.skillCooldown>0||player.statusIds.some(id=>growth.world.statuses[id]?.kind==='skillBan'));
        view=readSessionView(session);
        const hud=/** @type {{hp:number;maxHp:number;rice:number;enemies:number;weaponName:string;skillId:string;skillCooldown:number;dashCooldown:number}} */(view.hud);
        node('hp-label').textContent=`${Math.ceil(hud.hp)} / ${Math.ceil(hud.maxHp)}`;node('hp-fill').style.width=`${Math.max(0,hud.hp/hud.maxHp*100)}%`;node('rice').textContent=String(hud.rice);node('enemies').textContent=String(hud.enemies);node('weapon-label').textContent=hud.weaponName;
        const skillLabel=node('skill').firstChild;if(skillLabel)skillLabel.textContent=`${catalog.definitions[hud.skillId]?.displayName??hud.skillId} `;node('skill-cd').textContent=hud.skillCooldown>0?`${hud.skillCooldown.toFixed(1)}s`:'就绪';node('dash-cd').textContent=hud.dashCooldown>0?`${hud.dashCooldown.toFixed(1)}s`:'就绪';node('skill').toggleAttribute('disabled',hud.skillCooldown>0||player.statusIds.some(id=>growth.world.statuses[id]?.kind==='skillBan'));node('dash').toggleAttribute('disabled',hud.dashCooldown>0);
        const terminal=['victory','defeat','withdrawal'].includes(view.phase),stopped=view.phase==='paused'||terminal;
        if(formal&&terminal&&settledRunId!==session.runId&&!pendingPersistence.some(intent=>intent.id===`settlement:${growth.runId}`)){
          const outcome=/** @type {'victory'|'defeat'|'withdrawal'} */(view.phase),settlement=createSettlement(growth,outcome);pendingPersistence.push(scopePersistenceIntent({id:settlement.id,kind:'settlement',payload:/** @type {import('../contracts.d.ts').Json} */(JSON.parse(JSON.stringify(settlement)))},growth));
        }
        if(formal&&pendingPersistence.length&&!profileWorking&&!profileFailed)void flushProfile();
        node('equipment-menu').setAttribute('aria-label',offeredRestId?'选择休整奖励':'选择要替换的装备');node('equipment-menu').classList.toggle('hidden',(!offeredPickupId&&!offeredRestId)||view.phase!=='paused');node('pause-menu').classList.toggle('hidden',!stopped||(!!offeredPickupId||!!offeredRestId)&&view.phase==='paused');node('resume').classList.toggle('hidden',terminal);node('abandon').classList.toggle('hidden',!formal||terminal);node('retry-profile').classList.toggle('hidden',!profileFailed);node('restart').toggleAttribute('disabled',formal&&settledRunId!==session.runId);node('pause-title').textContent=view.phase==='victory'?'带着收获回家！':view.phase==='defeat'?'这次先回小窝':view.phase==='withdrawal'?(exploration?'撤离成功，带收获回家！':'带收获回家！'):'已暂停';node('pause-description').textContent=terminal?(formal?(settledRunId===session.runId?(exploration&&view.phase==='defeat'?'本局战利品已损失。':'收获已保存。可以返回出发页查看小窝余额。'):'正在保存收获，请稍候。失败时可重试，原档不会被覆盖。'):'练习结束，不产生永久资源。'):formal?'战斗已冻结。继续原进度，或明确放弃并按失败结算。':'战斗时间已冻结；回来后不会补跑。';mount?.classList.toggle('stopped',stopped);
        popups=popups.filter(popup=>view&&view.tick-popup.tick<45);renderPreviewFrame(ctx,view,width,height,ratio,popups);
      }else{ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#12333e';ctx.fillRect(0,0,width,height);}
      if(now>toastUntil)node('toast').classList.remove('visible');
    }catch(error){pause();toast(`试作已暂停：${error instanceof Error?error.message:String(error)}`);}
    lastTime=now;frameId=requestAnimationFrame(frame);
  }
  const routeHint=node('expedition-route');function updateRouteHint(){const mode=/** @type {HTMLSelectElement} */(node('mode-select')).value,seed=Number(/** @type {HTMLInputElement} */(node('seed')).value);routeHint.textContent=mode.endsWith('expedition')?`本局首领顺序：${resolveExpeditionRoute(seed).map(f=>catalog.definitions[`boss_${f}`].displayName).join(' → ')}。可往返，第三位首领结束这一趟。`:'';}on(node('mode-select'),'change',updateRouteHint);on(node('seed'),'input',updateRouteHint);updateRouteHint();paintLobbyLogo();
  node('mode-select').dispatchEvent(new Event('change'));refreshContinue();frameId=requestAnimationFrame(frame);
  return ()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frameId);for(const remove of removers)remove();if(session)disposeGameSession(session);clearInput();};
}
