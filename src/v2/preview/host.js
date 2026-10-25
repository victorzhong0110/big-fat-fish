// @ts-check
import { resolveWeaponTemplate, listRuntimeWeapons } from '../content/weaponCapabilities.js';
import { mountNestManager } from './nestManager.js';
import { prepareAdventureStart } from '../application/nest.js';
import { mountModManager } from './modManager.js';
import { createStoragePort } from '../adapters/storage.js';
import { readProfileRepository, commitProfilePlan, mergePersistenceIntents } from '../application/repository.js';
import { createSettlement } from '../domain/settlement.js';
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
 * @calls application/nest.js#prepareAdventureStart
 * @calls application/repository.js#commitProfilePlan
 * @calls application/repository.js#mergePersistenceIntents
 * @calls application/repository.js#readProfileRepository
 * @calls content/catalog.js#loadContentCatalog
 * @calls content/catalog.js#validateContentCatalog
 * @calls content/registry.js#createHandlerRegistry
 * @calls content/weaponCapabilities.js#listRuntimeWeapons
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @calls domain/checkpoint.js#canCreateCheckpoint
 * @calls domain/checkpoint.js#createCheckpoint
 * @calls domain/clock.js#createClockState
 * @calls domain/clock.js#resumeClock
 * @calls domain/clock.js#scheduleFrame
 * @calls domain/difficulty.js#resolveDifficultySnapshot
 * @calls domain/settlement.js#createSettlement
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
  const profilePort=createStoragePort('big-fat-fish:v2:profile');
  let profileRecord=/** @type {import('../contracts.d.ts').StorageRecord|null} */(null),profileWorking=false,profileFailed=false,settledRunId='',formal=false,escapePressing=false;
  const pendingPersistence=/** @type {import('../contracts.d.ts').PersistenceIntent[]} */([]);
  let session=/** @type {import('../contracts.d.ts').GameSession|null} */(null);
  let view=/** @type {import('../contracts.d.ts').RenderSnapshot|null} */(null);
  let clock=createClockState(),lastTime=0,sequence=0,frameId=0,disposed=false,saveRequested=false;
  let displayedChoice='',displayedTrial='',blockTrainingClick=false,offeredPickupId='';
  let aim={x:1,y:0},mouseFiring=false,stickFiring=false,leftMove={x:0,y:0},lastInput='',toastUntil=0;
  let popups=/** @type {{x:number;y:number;amount:number;tick:number}[]} */([]);
  const keys=new Set();
  const stickResetters=/** @type {(() => void)[]} */([]);
  const removers=/** @type {(() => void)[]} */([]);
  /** @param {EventTarget} target @param {string} type @param {EventListener} listener @param {boolean} capture */
  function on(target,type,listener,capture=false){target.addEventListener(type,listener,capture);removers.push(()=>target.removeEventListener(type,listener,capture));}
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
  function resume(){if(!session)return;offeredPickupId='';node('equipment-menu').classList.add('hidden');clearInput();node('toast').classList.remove('visible');toastUntil=0;if(send('Resume',{},'ui'))stepSessionUi(session,false);clock=resumeClock(clock);lastTime=performance.now();canvas.focus();}
  /** @param {string} type @param {string|null} optionId */
  function choose(type,optionId=null){if(!session)return;const choice=readSessionState(session).flow.choice;if(!choice)return;clearInput();if(send(type,{choiceId:choice.id,optionId},'ui'))stepSessionUi(session,false);clock=resumeClock(clock);lastTime=performance.now();canvas.focus();}
  /** @param {readonly import('../contracts.d.ts').DomainEvent[]} events */
  function showEvents(events){for(const event of events){if(event.type==='EquipmentOffered'){offeredPickupId=String(/** @type {{pickupId:string}} */(event.payload).pickupId);pause();renderEquipment();}else if(event.type==='EquipmentEquipped'){toast('已更换MCP，原武器留在地面，品质和冷却保留。');}else if(event.type==='TreeTriggered'){toast(/** @type {{nodeId:string}} */(event.payload).nodeId==='tree_body_f'?'我还能游！挡住了这次致命伤害。':'这一口留着：恢复12生命。');}else if(event.type==='LoraResolved'){const p=/** @type {{result:string;actualDelta:number}} */(event.payload);toast(`${p.result==='perfect'?'完美训练！':p.result==='underfit'?'欠拟合':'过拟合'} 属性变化 ${p.actualDelta>0?'+':''}${Number(p.actualDelta.toFixed(3))}`);}else if(event.type==='ObjectiveCompleted'){toast('信标已点亮！占领任意两个即可挑战首领。');}else if(event.type==='ContentDiscovered'){toast(`发现 ${catalog.definitions[String(/** @type {{definitionId:string}} */(event.payload).definitionId)]?.displayName??'新装备'}。`);}else if(event.type==='DshCycleResolved'){toast(/** @type {{outcome:string}} */(event.payload).outcome==='update'?'更新！当前 MCP 强化28秒。':'重置！装备技能和冲刺冷却已清零。');}}}
  /** @param {boolean} release */
  function train(release=false){if(!session)return;const state=readSessionState(session),trial=state.lora.active;if(!trial)return;if(!release&&state.flow.phase!=='loraTraining')return;const type=release?'ReleaseTraining':trial.phase==='ready'?'StartTraining':'ConfirmTraining';if(send(type,{trialId:trial.id,edge:release?'release':'press',repeat:false},'ui')){const result=stepSessionUi(session,false);showEvents(result.events);if(result.next.flow.phase!==state.flow.phase||result.next.lora.active?.phase!==trial.phase){clock=resumeClock(clock);lastTime=performance.now();}}}
  function renderEquipment(){
    if(!session||!offeredPickupId)return;const state=readSessionState(session),pickup=state.world.pickups[offeredPickupId],weapon=pickup?.weapon;if(!weapon){offeredPickupId='';return;}
    const template=resolveWeaponTemplate(catalog,weapon.definitionId),labels={mcp_bubble:'直线泡泡，命中消失',mcp_fan:'扇面散射，近距离覆盖',mcp_vector:'细长穿透弹，能贯穿多个目标',mcp_stream:'按住持续喷出微泡',mcp_return:'飞出后追回你，去回均可命中',mcp_batch:'慢泡命中后炸开一圈'};
    node('equipment-title').textContent=catalog.definitions[weapon.definitionId].displayName;node('equipment-description').textContent=`${['标准','增强','特制'][weapon.originalQuality]}品质 · ${template?labels[template]:''}。替换后原武器落在这里，不会销毁。`;
    const preview=node('equipment-preview');preview.dataset.template=template??'';preview.replaceChildren();for(let index=0;index<3;index++){const dot=document.createElement('i');dot.style.setProperty('--n',String(index));preview.append(dot);}
    const options=node('equipment-options');options.replaceChildren();for(const [index,current]of state.player.loadout.weapons.entries()){const button=document.createElement('button');button.type='button';button.dataset.equipSlot=String(index);button.textContent=`替换槽${index+1}：${catalog.definitions[current.definitionId].displayName}（${['标准','增强','特制'][current.originalQuality]}）`;button.onclick=()=>{const pickupId=offeredPickupId;resume();send('EquipPickup',{pickupId,slotIndex:index});};options.append(button);}
  }
  const nest=mountNestManager(node('nest-manager'),baseCatalog,profilePort,record=>{profileRecord=record;updateWallet();},toast);removers.push(()=>nest.dispose());
  const mods=mountModManager(node('mods-manager'),baseCatalog,toast);removers.push(()=>mods.dispose());
  function selectCatalog(adventure=false){catalog=adventure?baseCatalog:mods.getCatalog();
    if(!session)for(const [index,id] of ['practice-weapon-a','practice-weapon-b'].entries()){const select=/** @type {HTMLSelectElement} */(node(id)),previous=select.value;select.replaceChildren();for(const weaponId of listRuntimeWeapons(catalog)){const option=document.createElement('option');option.value=weaponId;option.textContent=catalog.definitions[weaponId].displayName;select.append(option);}select.value=listRuntimeWeapons(catalog).includes(previous)?previous:index===0?'mcp_bubble':'mcp_fan';select.disabled=adventure;}
    checkpointKey=catalog.modLock?.length?`big-fat-fish:v2-combat-preview:checkpoint:${catalog.version}`:'big-fat-fish:v2-combat-preview:checkpoint';}
  function refreshContinue(){try{const adventure=/** @type {HTMLSelectElement} */(node('mode-select')).value==='short';if(!session)selectCatalog(adventure);node('continue').toggleAttribute('disabled',adventure?!profileRecord?.profile.checkpoint:!localStorage.getItem(checkpointKey));}catch{node('continue').setAttribute('disabled','');}}
  function updateWallet(){if(disposed)return;nest.setProfile(profileRecord);node('wallet').textContent=profileRecord?`小窝 · 算力卡 ${profileRecord.profile.gpuCards} · 碎片 ${profileRecord.profile.gpuFragments}/5 · 零件 ${profileRecord.profile.parts}`:'小窝档案暂不可用';refreshContinue();}
  async function loadProfile(){const result=await readProfileRepository(profilePort,baseCatalog);if(result.ok)profileRecord=result.value;else toast(`小窝档案读取失败：${result.message}`);updateWallet();}
  async function flushProfile(){
    if(profileWorking||!pendingPersistence.length)return;profileWorking=true;profileFailed=false;
    const batch=[...pendingPersistence];
    try{for(let attempt=0;attempt<3;attempt++){
      const current=await readProfileRepository(profilePort,baseCatalog);if(!current.ok)throw new Error(current.message);
      const plan=mergePersistenceIntents(current.value.profile,batch,baseCatalog);if(!plan.ok)throw new Error(plan.message);
      const committed=await commitProfilePlan(profilePort,plan.value,baseCatalog);if(!committed.ok){if(committed.code==='REVISION_CONFLICT')continue;throw new Error(committed.message);}
      profileRecord=committed.value;const ids=new Set(batch.map(intent=>intent.id));for(let i=pendingPersistence.length-1;i>=0;i--)if(ids.has(pendingPersistence[i].id))pendingPersistence.splice(i,1);
      if(session&&profileRecord.profile.settlementLedger.includes(`settlement:${session.runId}`))settledRunId=session.runId;
      updateWallet();return;
    }throw new Error('档案正在被另一个页面更新，请重试。');}catch(error){profileFailed=true;pause();toast(`收获尚未保存：${error instanceof Error?error.message:String(error)}`);}finally{profileWorking=false;}
  }
  /** @param {boolean} restore */
  async function begin(restore=false){
    if(profileWorking||pendingPersistence.length)return;
    let replacement=/** @type {import('../contracts.d.ts').GameSession|null} */(null);
    node('start').setAttribute('disabled','');node('continue').setAttribute('disabled','');
    try{
      const adventure=/** @type {HTMLSelectElement} */(node('mode-select')).value==='short';selectCatalog(adventure);
      if(adventure){const record=await readProfileRepository(profilePort,baseCatalog);if(!record.ok)throw new Error(record.message);profileRecord=record.value;
        if(restore){if(!record.value.profile.checkpoint)throw new Error('还没有保存的冒险');const result=restoreGameSession(record.value.profile.checkpoint,catalog);if(!result.ok)throw new Error(result.message);replacement=result.value;}
        else{
          if(record.value.profile.checkpoint)throw new Error('请先继续或放弃现有冒险');
          const seed=Number(/** @type {HTMLInputElement} */(node('seed')).value);if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new Error('请输入有效整数种子');
          const runId=`adventure:${Array.from(crypto.getRandomValues(new Uint32Array(4)),value=>value.toString(16).padStart(8,'0')).join('')}`;
          const prepared=prepareAdventureStart(record.value.profile,{mode:'short',difficulty:1,seed,...nest.getLoadout(),companionId:null},catalog,runId);if(!prepared.ok)throw new Error(prepared.message);
          replacement=createGameSession(prepared.value,seed,catalog);
          const checkpoint=createCheckpoint(readSessionState(replacement)),plan=mergePersistenceIntents(record.value.profile,[{id:checkpoint.id,kind:'checkpoint',payload:/** @type {import('../contracts.d.ts').Json} */(JSON.parse(JSON.stringify(checkpoint)))}],catalog);if(!plan.ok)throw new Error(plan.message);const saved=await commitProfilePlan(profilePort,plan.value,baseCatalog);if(!saved.ok)throw new Error(saved.message);profileRecord=saved.value;
        }
      }else if(restore){
        const raw=localStorage.getItem(checkpointKey);if(!raw)throw new Error('还没有保存的检查点');const result=restoreGameSession(JSON.parse(raw),catalog);if(!result.ok)throw new Error(result.message);replacement=result.value;
      }else{
        const seed=Number(/** @type {HTMLInputElement} */(node('seed')).value);if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new Error('请输入有效整数种子');
        const difficulty=resolveDifficultySnapshot({mode:'tutorial',difficulty:0,seed,weaponIds:['mcp_bubble','mcp_fan'],skillId:'skill_cache',companionId:null},catalog);if(!difficulty.ok)throw new Error(difficulty.message);
        const skillId=/** @type {HTMLSelectElement} */(node('skill-select')).value;
        const practiceWeapons=['practice-weapon-a','practice-weapon-b'].map(id=>/** @type {HTMLSelectElement} */(node(id)).value);if(new Set(practiceWeapons).size!==2)throw new Error('请为练习选择两把不同的MCP');
        replacement=createGameSession({modLock:catalog.modLock??[],runtimeProfile:'core-preview',runId:`preview:${Array.from(crypto.getRandomValues(new Uint32Array(4)),value=>value.toString(16).padStart(8,'0')).join('')}`,treeNodeIds:[],dsh:/** @type {HTMLSelectElement} */(node('dsh-select')).value?[{id:/** @type {HTMLSelectElement} */(node('dsh-select')).value,options:{}}]:[],difficulty:difficulty.value,loadout:{weapons:practiceWeapons.map((id,index)=>({instanceId:`practice:mcp:${index}`,definitionId:id,originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null})),activeWeaponIndex:0,skillId,skillCooldown:0,companionId:null,companionCooldown:0,dashCooldown:0}},seed,catalog);
      }
      if(session)disposeGameSession(session);session=replacement;replacement=null;formal=adventure;settledRunId='';profileFailed=false;sequence=readSessionState(session).lastCommandSeq+1;
      displayedChoice='';displayedTrial='';offeredPickupId='';node('equipment-menu').classList.add('hidden');node('lora-menu').classList.add('hidden');node('plugin-menu').classList.add('hidden');view=readSessionView(session);clock=createClockState();lastTime=performance.now();clearInput();popups=[];saveRequested=false;
      node('menu').classList.add('hidden');node('hud').classList.remove('hidden');node('controls').classList.remove('hidden');mount?.classList.add('started');node('mods-panel').classList.add('hidden');node('nest-panel').classList.add('hidden');updateWallet();
      toast(restore?'已恢复原进度，点击继续才开始。':formal?'占领任意两个信标，前往右下方首领入口。F交互，R保存检查点。':'WASD移动，鼠标射击。F交互，R保存起点检查点。');canvas.focus();
    }catch(error){if(replacement)disposeGameSession(replacement);toast(`未能开始：${error instanceof Error?error.message:String(error)}`);}finally{node('start').removeAttribute('disabled');refreshContinue();}
  }
  function save(){
    if(!session)return;const snapshot=readSessionState(session),validation=canCreateCheckpoint({state:snapshot,catalog,event:null,entityId:null,random:snapshot.random.world});
    if(!validation.valid){toast(validation.diagnostics.map(item=>item.message).join('；').replace('Move within 96 units of a checkpoint','请靠近检查点').replace('Threats or pressure events are still active','附近仍有敌人或在途攻击'));return;}
    const checkpoint=createCheckpoint(snapshot);
    if(formal){pendingPersistence.push({id:checkpoint.id,kind:'checkpoint',payload:/** @type {import('../contracts.d.ts').Json} */(JSON.parse(JSON.stringify(checkpoint)))});void flushProfile().then(()=>{if(!profileFailed)toast('冒险检查点已保存，生命和冷却原样保留。');});return;}
    try{localStorage.setItem(checkpointKey,JSON.stringify(checkpoint));refreshContinue();toast('检查点已保存，生命、冷却和战斗进度原样保留。');}catch{toast('保存失败，原存档已保留。');}
  }
  /** @param {boolean} release */
  function escape(release=false){if(!session)return;const state=readSessionState(session),player=state.world.entities[state.player.entityId];if(!release&&!player.statusIds.some(id=>state.world.statuses[id]?.kind==='root'))return;escapePressing=!release;send(release?'ReleaseEscape':'EscapePress',{edge:release?'release':'press',repeat:false});}
  function requestSave(){clearInput();saveRequested=true;}
  /** @param {MouseEvent|PointerEvent} event */
  function aimFromPointer(event){if(!view)return;const rect=canvas.getBoundingClientRect(),camera=getPreviewCamera(view,rect.width,rect.height),player=view.entities.find(entity=>entity.kind==='player');if(!player)return;const dx=(event.clientX-rect.left)/camera.scale+camera.x-player.position.x,dy=(event.clientY-rect.top)/camera.scale+camera.y-player.position.y,mag=Math.hypot(dx,dy);if(mag>0)aim={x:dx/mag,y:dy/mag};}
  /** @param {string} id @param {boolean} movement */
  function attachStick(id,movement){
    const pad=node(id),knob=pad.querySelector('span');let pointer=/** @type {number|null} */(null),origin={x:0,y:0};
    /** @param {PointerEvent} event */
    const update=event=>{if(event.pointerId!==pointer)return;let dx=event.clientX-origin.x,dy=event.clientY-origin.y;const magnitude=Math.hypot(dx,dy),limit=33;if(magnitude>limit){dx*=limit/magnitude;dy*=limit/magnitude;}if(knob instanceof HTMLElement)knob.style.transform=`translate(${dx}px,${dy}px)`;const norm=Math.hypot(dx,dy);if(movement)leftMove=norm>5?{x:dx/norm,y:dy/norm}:{x:0,y:0};else{if(norm>5)aim={x:dx/norm,y:dy/norm};stickFiring=norm>5;}};
    on(pad,'pointerdown',event=>{const e=/** @type {PointerEvent} */(event);if(!session||!['exploring','boss'].includes(readSessionState(session).flow.phase)||pointer!==null)return;e.preventDefault();e.stopPropagation();pointer=e.pointerId;const bounds=pad.getBoundingClientRect();origin={x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2};pad.setPointerCapture(pointer);update(e);});
    on(pad,'pointermove',event=>update(/** @type {PointerEvent} */(event)));
    const release=/** @type {EventListener} */(event=>{const e=/** @type {PointerEvent} */(event);if(e.pointerId!==pointer)return;pointer=null;if(knob instanceof HTMLElement)knob.style.transform='';if(movement)leftMove={x:0,y:0};else stickFiring=false;});
    on(pad,'pointerup',release);on(pad,'pointercancel',release);on(pad,'lostpointercapture',release);
    stickResetters.push(()=>{const previous=pointer;pointer=null;if(previous!==null&&pad.hasPointerCapture(previous))pad.releasePointerCapture(previous);});
    removers.push(()=>{pointer=null;});
  }
  attachStick('left-stick',true);attachStick('right-stick',false);
  on(node('escape-assist'),'change',()=>canvas.focus());
  on(node('escape-input'),'pointerdown',event=>{blockTrainingClick=true;event.preventDefault();escape(false);});on(window,'pointerup',()=>{if(escapePressing)escape(true);});
  on(node('nest-panel'),'toggle',()=>{if(/** @type {HTMLDetailsElement} */(node('nest-panel')).open)/** @type {HTMLDetailsElement} */(node('mods-panel')).open=false;});
  on(node('mods-panel'),'toggle',()=>{if(/** @type {HTMLDetailsElement} */(node('mods-panel')).open)/** @type {HTMLDetailsElement} */(node('nest-panel')).open=false;});
  on(node('mods-manager'),'modschange',()=>refreshContinue());
  on(node('mode-select'),'change',()=>{const adventure=/** @type {HTMLSelectElement} */(node('mode-select')).value==='short';if(adventure){/** @type {HTMLSelectElement} */(node('skill-select')).value='skill_disconnect';/** @type {HTMLSelectElement} */(node('dsh-select')).value='';}node('skill-select').toggleAttribute('disabled',adventure);node('dsh-select').toggleAttribute('disabled',adventure);refreshContinue();});on(node('retry-profile'),'click',()=>{void flushProfile();});on(node('interact'),'click',()=>{send('Interact');});
  on(node('equipment-leave'),'click',()=>resume());
  on(node('abandon'),'click',()=>{if(send('Abandon',{},'ui')&&session)stepSessionUi(session,false);});
  on(node('start'),'click',()=>begin(false));on(node('continue'),'click',()=>begin(true));on(node('pause'),'click',()=>session&&readSessionState(session).flow.phase==='paused'?resume():pause());on(node('resume'),'click',()=>resume());
  on(node('restart'),'click',()=>{if(formal&&session&&settledRunId!==session.runId){pause();return;}if(session)disposeGameSession(session);session=null;view=null;displayedChoice='';displayedTrial='';offeredPickupId='';node('equipment-menu').classList.add('hidden');node('lora-menu').classList.add('hidden');node('plugin-menu').classList.add('hidden');clearInput();node('menu').classList.remove('hidden');node('pause-menu').classList.add('hidden');node('hud').classList.add('hidden');node('controls').classList.add('hidden');mount?.classList.remove('started');node('mods-panel').classList.remove('hidden');node('nest-panel').classList.remove('hidden');refreshContinue();});
  on(window,'pointerdown',()=>{blockTrainingClick=false;},true);on(window,'click',event=>{if(blockTrainingClick&&/** @type {MouseEvent} */(event).detail>0){blockTrainingClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  on(node('training-input'),'pointerdown',event=>{blockTrainingClick=true;event.preventDefault();train(false);});on(window,'pointerup',()=>train(true));on(node('training-input'),'click',event=>{if(/** @type {MouseEvent} */(event).detail===0){train(false);train(true);}});
  on(node('plugin-reroll'),'click',()=>choose('RerollPlugin'));on(node('plugin-skip'),'click',()=>choose('SkipPlugin'));
  on(node('switch'),'click',()=>{send('SwitchWeapon');});on(node('skill'),'click',()=>{send('Skill');});on(node('dash'),'click',()=>{send('Dash');});on(node('checkpoint'),'click',()=>requestSave());
  on(window,'keydown',event=>{const e=/** @type {KeyboardEvent} */(event);if(!session||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;const key=e.code;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key))e.preventDefault();if(e.repeat)return;
    if(key==='Escape'){readSessionState(session).flow.phase==='paused'?resume():pause();return;}keys.add(key);
    if(key==='Space'&&readSessionState(session).flow.phase==='loraTraining'){train(false);return;}
    if(key==='Space'){const state=readSessionState(session);if(state.world.entities[state.player.entityId].statusIds.some(id=>state.world.statuses[id]?.kind==='root'))escape(false);else send('Dash');}else if(key==='KeyE')send('Skill');else if(key==='KeyQ')send('SwitchWeapon');else if(key==='KeyF')send('Interact');else if(key==='KeyR')requestSave();
  });
  on(window,'keyup',event=>{const key=/** @type {KeyboardEvent} */(event).code;keys.delete(key);if(key==='Space'){train(true);if(escapePressing)escape(true);}});
  on(canvas,'pointermove',event=>{const e=/** @type {PointerEvent} */(event);if(e.pointerType==='mouse')aimFromPointer(e);});
  on(canvas,'pointerdown',event=>{const e=/** @type {PointerEvent} */(event);if(e.pointerType==='mouse'&&e.button===0){aimFromPointer(e);mouseFiring=true;canvas.focus();}});
  on(window,'pointerup',event=>{if(/** @type {PointerEvent} */(event).pointerType==='mouse')mouseFiring=false;});
  on(window,'pointercancel',()=>{clearInput();train(true);});on(window,'blur',()=>pause());on(document,'visibilitychange',()=>{if(document.hidden)pause();});
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
          const camera=view?getPreviewCamera(view,width,height):{x:0,y:0,scale:1};const sample={move,aim,firing:mouseFiring||stickFiring,viewport:{width:width/camera.scale,height:height/camera.scale}},encoded=JSON.stringify(sample);if(encoded!==lastInput&&send('SetInput',sample))lastInput=encoded;
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
        node('dsh-label').textContent=growth.start.dsh.map(slot=>catalog.definitions[slot.id]?.displayName??slot.id).join(' / ')+(growth.start.dsh.some(slot=>slot.id==='dsh_lora')?`LoRA：欠拟合${growth.lora.underfitRemaining.toFixed(1)}s / 过拟合${growth.lora.overfitRemaining.toFixed(1)}s`:growth.start.dsh.some(slot=>slot.id==='dsh_gpt_branch')?`更新/重置：${growth.dshCycle.remaining.toFixed(1)}s`:'');
        node('plugin-menu').classList.toggle('hidden',growth.flow.phase!=='pluginChoice');
        if(growth.flow.phase==='pluginChoice'&&choice&&choice.id!==displayedChoice){
          clearInput();clock=resumeClock(clock);displayedChoice=choice.id;
          node('plugin-title').textContent=`Lv.${choice.level} · 选择插件`;
          const options=node('plugin-options');options.replaceChildren();
          for(const candidate of choice.candidates){const definition=catalog.definitions[candidate.id],button=document.createElement('button'),title=document.createElement('strong'),description=document.createElement('small');button.type='button';button.dataset.pluginId=candidate.id;title.textContent=`${definition.displayName} · ${candidate.rank}级`;description.textContent=String(/** @type {readonly string[]} */(definition.parameters.rankDescriptions??[])[candidate.rank-1]??'');button.append(title,description);button.onclick=()=>choose('SelectPlugin',candidate.id);options.append(button);}
          node('plugin-reroll').toggleAttribute('disabled',(growth.flow.pluginRerollsUsed??0)>=1);node('plugin-reroll').textContent=`重抽（本局剩余${1-(growth.flow.pluginRerollsUsed??0)}次）`;
        }
        if(growth.flow.phase!=='pluginChoice')displayedChoice='';
        node('level').textContent=String(growth.level);node('growth-label').textContent=growth.level>=16?'本模式等级已满':`${growth.xpRemainder} / ${20+10*growth.level}`;
        node('plugins-label').textContent=growth.plugins.map(plugin=>`${catalog.definitions[plugin.id].displayName}${plugin.rank}`).join(' · ');
        node('distill-label').textContent=growth.plugins.some(plugin=>plugin.id==='plugin_distill')?`蒸馏 蟹${growth.distill.claude.stage}阶(${growth.distill.claude.samples}) / GPT${growth.distill.gpt.stage}阶(${growth.distill.gpt.samples}) / Bot${growth.distill.grok.stage}阶(${growth.distill.grok.samples})`:'';
        const player=growth.world.entities[growth.player.entityId],rootId=player.statusIds.find(id=>growth.world.statuses[id]?.kind==='root'),root=rootId?growth.world.statuses[rootId]:null;
        node('escape-input').classList.toggle('hidden',!root);node('escape-assist-label').classList.toggle('hidden',!root);node('escape-count').textContent=root?`${root.completedInputs}/${root.requiredInputs}`:'';
        const completed=growth.world.objectives.filter(objective=>objective.kind==='beacon'&&objective.completed).length;const targets=completed>=2?[growth.world.entities['boss:gate']]:growth.world.objectives.filter(objective=>objective.active&&!objective.completed).map(objective=>growth.world.entities[objective.id]);const target=targets.filter(Boolean).sort((a,b)=>Math.hypot(a.position.x-player.position.x,a.position.y-player.position.y)-Math.hypot(b.position.x-player.position.x,b.position.y-player.position.y))[0];const distance=target?Math.hypot(target.position.x-player.position.x,target.position.y-player.position.y):0;const direction=target?['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(target.position.y-player.position.y,target.position.x-player.position.x)/(Math.PI/4))+8)%8]:'';node('objective-label').textContent=formal?`${growth.flow.phase==='boss'?'击败封禁管理员':completed>=2?`首领入口已开放 · ${direction} ${Math.round(distance)}`:`信标 ${completed}/2 · ${direction} ${Math.round(distance)} · 圈内35秒`}`:'';node('materials-label').textContent=formal?`背包：碎片 ${growth.inventory.gpuFragments} · 零件 ${growth.inventory.parts}`:'';
        const secretHint=/** @type {{targetId?:string;expiresAt?:number}|undefined} */(player.runtime.secretHint),secret=secretHint?.targetId?growth.world.entities[secretHint.targetId]:null;if(secret&&Number(secretHint?.expiresAt)>growth.tick&&secret.runtime.opened!==true){const arrow=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(secret.position.y-player.position.y,secret.position.x-player.position.x)/(Math.PI/4))+8)%8];node('objective-label').textContent+=` · 秘密雷达 ${arrow} ${Math.round(Math.hypot(secret.position.x-player.position.x,secret.position.y-player.position.y))}`;}
        const nearbyWeapon=Object.values(growth.world.pickups).find(pickup=>pickup.kind==='weapon'&&Math.hypot(pickup.position.x-player.position.x,pickup.position.y-player.position.y)<=96);const interactLabel=node('interact').firstChild;if(interactLabel)interactLabel.textContent=nearbyWeapon?'拾取MCP ':'交互 ';
        const boss=growth.bosses.map(boss=>growth.world.entities[boss.entityId]).find(entity=>entity&&!entity.dead);node('boss-hud').classList.toggle('hidden',!boss);if(boss){node('boss-hp').textContent=`${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;node('boss-fill').style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;}
        node('skill').toggleAttribute('disabled',growth.player.loadout.skillCooldown>0||player.statusIds.some(id=>growth.world.statuses[id]?.kind==='skillBan'));
        view=readSessionView(session);
        const hud=/** @type {{hp:number;maxHp:number;rice:number;enemies:number;weaponName:string;skillId:string;skillCooldown:number;dashCooldown:number}} */(view.hud);
        node('hp-label').textContent=`${Math.ceil(hud.hp)} / ${Math.ceil(hud.maxHp)}`;node('hp-fill').style.width=`${Math.max(0,hud.hp/hud.maxHp*100)}%`;node('rice').textContent=String(hud.rice);node('enemies').textContent=String(hud.enemies);node('weapon-label').textContent=hud.weaponName;
        const skillLabel=node('skill').firstChild;if(skillLabel)skillLabel.textContent=hud.skillId==='skill_cache'?'缓存护盾 ':'断开连接 ';node('skill-cd').textContent=hud.skillCooldown>0?`${hud.skillCooldown.toFixed(1)}s`:'就绪';node('dash-cd').textContent=hud.dashCooldown>0?`${hud.dashCooldown.toFixed(1)}s`:'就绪';node('skill').toggleAttribute('disabled',hud.skillCooldown>0||player.statusIds.some(id=>growth.world.statuses[id]?.kind==='skillBan'));node('dash').toggleAttribute('disabled',hud.dashCooldown>0);
        const terminal=['victory','defeat','withdrawal'].includes(view.phase),stopped=view.phase==='paused'||terminal;
        if(formal&&terminal&&settledRunId!==session.runId&&!pendingPersistence.some(intent=>intent.id===`settlement:${growth.runId}`)){
          const outcome=/** @type {'victory'|'defeat'|'withdrawal'} */(view.phase),settlement=createSettlement(growth,outcome);pendingPersistence.push({id:settlement.id,kind:'settlement',payload:/** @type {import('../contracts.d.ts').Json} */(JSON.parse(JSON.stringify(settlement)))});
        }
        if(formal&&pendingPersistence.length&&!profileWorking&&!profileFailed)void flushProfile();
        node('equipment-menu').classList.toggle('hidden',!offeredPickupId||view.phase!=='paused');node('pause-menu').classList.toggle('hidden',!stopped||!!offeredPickupId&&view.phase==='paused');node('resume').classList.toggle('hidden',terminal);node('abandon').classList.toggle('hidden',!formal||terminal);node('retry-profile').classList.toggle('hidden',!profileFailed);node('restart').toggleAttribute('disabled',formal&&settledRunId!==session.runId);node('pause-title').textContent=view.phase==='victory'?'带着收获回家！':view.phase==='defeat'?'这次先回小窝':'已暂停';node('pause-description').textContent=terminal?(formal?(settledRunId===session.runId?'收获已保存。可以返回出发页查看小窝余额。':'正在保存收获，请稍候。失败时可重试，原档不会被覆盖。'):'练习结束，不产生永久资源。'):formal?'战斗已冻结。继续原进度，或明确放弃并按失败结算。':'战斗时间已冻结；回来后不会补跑。';mount?.classList.toggle('stopped',stopped);
        popups=popups.filter(popup=>view&&view.tick-popup.tick<45);renderPreviewFrame(ctx,view,width,height,ratio,popups);
      }else{ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#12333e';ctx.fillRect(0,0,width,height);}
      if(now>toastUntil)node('toast').classList.remove('visible');
    }catch(error){pause();toast(`试作已暂停：${error instanceof Error?error.message:String(error)}`);}
    lastTime=now;frameId=requestAnimationFrame(frame);
  }
  void loadProfile();refreshContinue();frameId=requestAnimationFrame(frame);
  return ()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frameId);for(const remove of removers)remove();if(session)disposeGameSession(session);clearInput();};
}
