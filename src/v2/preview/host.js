// @ts-check
import { loadContentCatalog, validateContentCatalog } from '../content/catalog.js';
import { createHandlerRegistry } from '../content/registry.js';
import { resolveDifficultySnapshot } from '../domain/difficulty.js';
import { createClockState, scheduleFrame, resumeClock } from '../domain/clock.js';
import { canCreateCheckpoint, createCheckpoint } from '../domain/checkpoint.js';
import { createGameSession, enqueueSessionCommand, readSessionState, readSessionView, stepSessionWorld, stepSessionUi, restoreGameSession, disposeGameSession } from '../engine/session.js';
import { getPreviewCamera, renderPreviewFrame } from './view.js';

/** Mount the opt-in browser preview. Storage is an isolated single-key checkpoint,
 * not the unfinished permanent Profile economy. Returns complete listener/RAF cleanup.
 * @implementationScope core-preview
 * @calls content/catalog.js#loadContentCatalog
 * @calls content/catalog.js#validateContentCatalog
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/checkpoint.js#canCreateCheckpoint
 * @calls domain/checkpoint.js#createCheckpoint
 * @calls domain/clock.js#createClockState
 * @calls domain/clock.js#resumeClock
 * @calls domain/clock.js#scheduleFrame
 * @calls domain/difficulty.js#resolveDifficultySnapshot
 * @calls engine/session.js#createGameSession
 * @calls engine/session.js#disposeGameSession
 * @calls engine/session.js#enqueueSessionCommand
 * @calls engine/session.js#readSessionState
 * @calls engine/session.js#readSessionView
 * @calls engine/session.js#restoreGameSession
 * @calls engine/session.js#stepSessionUi
 * @calls engine/session.js#stepSessionWorld
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
  const catalog=loadContentCatalog(),registry=createHandlerRegistry(),report=validateContentCatalog(catalog,registry);
  if(!report.valid)throw new Error(report.diagnostics.map(item=>item.message).join('; '));
  const checkpointKey='big-fat-fish:v2-combat-preview:checkpoint';
  let session=/** @type {import('../contracts.d.ts').GameSession|null} */(null);
  let view=/** @type {import('../contracts.d.ts').RenderSnapshot|null} */(null);
  let clock=createClockState(),lastTime=0,sequence=0,frameId=0,disposed=false,saveRequested=false;
  let displayedChoice='',displayedTrial='',blockTrainingClick=false;
  let aim={x:1,y:0},mouseFiring=false,stickFiring=false,leftMove={x:0,y:0},lastInput='',toastUntil=0;
  let popups=/** @type {{x:number;y:number;amount:number;tick:number}[]} */([]);
  const keys=new Set();
  const stickResetters=/** @type {(() => void)[]} */([]);
  const removers=/** @type {(() => void)[]} */([]);
  /** @param {EventTarget} target @param {string} type @param {EventListener} listener @param {boolean} capture */
  function on(target,type,listener,capture=false){target.addEventListener(type,listener,capture);removers.push(()=>target.removeEventListener(type,listener,capture));}
  /** @param {string} message */
  function toast(message){node('toast').textContent=message;node('toast').classList.add('visible');toastUntil=performance.now()+3800;}
  function clearInput(){for(const reset of stickResetters)reset();keys.clear();mouseFiring=false;stickFiring=false;leftMove={x:0,y:0};lastInput='';node('left-stick').querySelector('span')?.removeAttribute('style');node('right-stick').querySelector('span')?.removeAttribute('style');}
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
  function resume(){if(!session)return;clearInput();node('toast').classList.remove('visible');toastUntil=0;if(send('Resume',{},'ui'))stepSessionUi(session,false);clock=resumeClock(clock);lastTime=performance.now();canvas.focus();}
  /** @param {string} type @param {string|null} optionId */
  function choose(type,optionId=null){if(!session)return;const choice=readSessionState(session).flow.choice;if(!choice)return;clearInput();if(send(type,{choiceId:choice.id,optionId},'ui'))stepSessionUi(session,false);clock=resumeClock(clock);lastTime=performance.now();canvas.focus();}
  /** @param {readonly import('../contracts.d.ts').DomainEvent[]} events */
  function showEvents(events){for(const event of events){if(event.type==='LoraResolved'){const p=/** @type {{result:string;actualDelta:number}} */(event.payload);toast(`${p.result==='perfect'?'完美训练！':p.result==='underfit'?'欠拟合':'过拟合'} 属性变化 ${p.actualDelta>0?'+':''}${Number(p.actualDelta.toFixed(3))}`);}else if(event.type==='DshCycleResolved'){toast(/** @type {{outcome:string}} */(event.payload).outcome==='update'?'更新！当前 MCP 强化28秒。':'重置！装备技能和冲刺冷却已清零。');}}}
  /** @param {boolean} release */
  function train(release=false){if(!session)return;const state=readSessionState(session),trial=state.lora.active;if(!trial)return;if(!release&&state.flow.phase!=='loraTraining')return;const type=release?'ReleaseTraining':trial.phase==='ready'?'StartTraining':'ConfirmTraining';if(send(type,{trialId:trial.id,edge:release?'release':'press',repeat:false},'ui')){const result=stepSessionUi(session,false);showEvents(result.events);if(result.next.flow.phase!==state.flow.phase||result.next.lora.active?.phase!==trial.phase){clock=resumeClock(clock);lastTime=performance.now();}}}
  function refreshContinue(){try{node('continue').toggleAttribute('disabled',!localStorage.getItem(checkpointKey));}catch{node('continue').setAttribute('disabled','');}}
  /** @param {boolean} restore */
  function begin(restore=false){
    try{
      let replacement;
      if(restore){
        const raw=localStorage.getItem(checkpointKey);if(!raw){toast('还没有保存的检查点。');return;}
        const result=restoreGameSession(JSON.parse(raw),catalog);
        if(!result.ok){toast(`无法继续：${result.message}。原存档已保留。`);return;}
        replacement=result.value;
      }else{
        const seed=Number(/** @type {HTMLInputElement} */(node('seed')).value);
        if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff){toast('请输入 0–4294967295 的整数种子。');return;}
        const difficulty=resolveDifficultySnapshot({mode:'tutorial',difficulty:0,seed,weaponIds:['mcp_bubble','mcp_fan'],skillId:'skill_cache',companionId:null},catalog);
        if(!difficulty.ok)throw new Error(difficulty.message);
        const skillId=/** @type {HTMLSelectElement} */(node('skill-select')).value;
        replacement=createGameSession({runtimeProfile:'core-preview',runId:`preview:${Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join('')}`,treeNodeIds:[],dsh:/** @type {HTMLSelectElement} */(node('dsh-select')).value?[{id:/** @type {HTMLSelectElement} */(node('dsh-select')).value,options:{}}]:[],difficulty:difficulty.value,loadout:{weapons:['bubble','fan'].map(name=>({instanceId:`mcp:${name}`,definitionId:`mcp_${name}`,originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null})),activeWeaponIndex:0,skillId,skillCooldown:0,companionId:null,companionCooldown:0,dashCooldown:0}},seed,catalog);
      }
      if(session)disposeGameSession(session);session=replacement;sequence=readSessionState(session).lastCommandSeq+1;
      displayedChoice='';displayedTrial='';node('lora-menu').classList.add('hidden');node('plugin-menu').classList.add('hidden');view=readSessionView(session);clock=createClockState();lastTime=performance.now();clearInput();popups=[];saveRequested=false;
      node('menu').classList.add('hidden');node('hud').classList.remove('hidden');node('controls').classList.remove('hidden');mount?.classList.add('started');
      if(restore)toast('已恢复到检查点原进度。点击“继续游”恢复战斗。');else toast('起点的饭盆是检查点。WASD 移动，按住左键射击。');
      canvas.focus();
    }catch(error){toast(`未能开始：${error instanceof Error?error.message:String(error)}`);}
  }
  function save(){
    if(!session)return;
    const snapshot=readSessionState(session);
    const validation=canCreateCheckpoint({state:snapshot,catalog,event:null,entityId:null,random:snapshot.random.world});
    if(!validation.valid){toast(validation.diagnostics.map(item=>item.message).join('；').replace('Move within 96 units of a checkpoint','请回到起点检查点附近').replace('Threats or pressure events are still active','附近仍有敌人或在途攻击'));return;}
    try{localStorage.setItem(checkpointKey,JSON.stringify(createCheckpoint(snapshot)));refreshContinue();toast('检查点已保存，生命、冷却和战斗进度原样保留。');}catch{toast('保存失败，原存档未被主动清除。请检查浏览器存储空间。');}
  }
  function requestSave(){clearInput();saveRequested=true;}
  /** @param {MouseEvent|PointerEvent} event */
  function aimFromPointer(event){if(!view)return;const rect=canvas.getBoundingClientRect(),camera=getPreviewCamera(view,rect.width,rect.height),player=view.entities.find(entity=>entity.kind==='player');if(!player)return;const dx=(event.clientX-rect.left)/camera.scale+camera.x-player.position.x,dy=(event.clientY-rect.top)/camera.scale+camera.y-player.position.y,mag=Math.hypot(dx,dy);if(mag>0)aim={x:dx/mag,y:dy/mag};}
  /** @param {string} id @param {boolean} movement */
  function attachStick(id,movement){
    const pad=node(id),knob=pad.querySelector('span');let pointer=/** @type {number|null} */(null),origin={x:0,y:0};
    /** @param {PointerEvent} event */
    const update=event=>{if(event.pointerId!==pointer)return;let dx=event.clientX-origin.x,dy=event.clientY-origin.y;const magnitude=Math.hypot(dx,dy),limit=33;if(magnitude>limit){dx*=limit/magnitude;dy*=limit/magnitude;}if(knob instanceof HTMLElement)knob.style.transform=`translate(${dx}px,${dy}px)`;const norm=Math.hypot(dx,dy);if(movement)leftMove=norm>5?{x:dx/norm,y:dy/norm}:{x:0,y:0};else{if(norm>5)aim={x:dx/norm,y:dy/norm};stickFiring=norm>5;}};
    on(pad,'pointerdown',event=>{const e=/** @type {PointerEvent} */(event);if(!session||readSessionState(session).flow.phase!=='exploring'||pointer!==null)return;e.preventDefault();e.stopPropagation();pointer=e.pointerId;const bounds=pad.getBoundingClientRect();origin={x:bounds.left+bounds.width/2,y:bounds.top+bounds.height/2};pad.setPointerCapture(pointer);update(e);});
    on(pad,'pointermove',event=>update(/** @type {PointerEvent} */(event)));
    const release=/** @type {EventListener} */(event=>{const e=/** @type {PointerEvent} */(event);if(e.pointerId!==pointer)return;pointer=null;if(knob instanceof HTMLElement)knob.style.transform='';if(movement)leftMove={x:0,y:0};else stickFiring=false;});
    on(pad,'pointerup',release);on(pad,'pointercancel',release);on(pad,'lostpointercapture',release);
    stickResetters.push(()=>{const previous=pointer;pointer=null;if(previous!==null&&pad.hasPointerCapture(previous))pad.releasePointerCapture(previous);});
    removers.push(()=>{pointer=null;});
  }
  attachStick('left-stick',true);attachStick('right-stick',false);
  on(node('start'),'click',()=>begin(false));on(node('continue'),'click',()=>begin(true));on(node('pause'),'click',()=>session&&readSessionState(session).flow.phase==='paused'?resume():pause());on(node('resume'),'click',()=>resume());
  on(node('restart'),'click',()=>{if(session)disposeGameSession(session);session=null;view=null;displayedChoice='';displayedTrial='';node('lora-menu').classList.add('hidden');node('plugin-menu').classList.add('hidden');clearInput();node('menu').classList.remove('hidden');node('pause-menu').classList.add('hidden');node('hud').classList.add('hidden');node('controls').classList.add('hidden');mount?.classList.remove('started');refreshContinue();});
  on(window,'pointerdown',()=>{blockTrainingClick=false;},true);on(window,'click',event=>{if(blockTrainingClick&&/** @type {MouseEvent} */(event).detail>0){blockTrainingClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
  on(node('training-input'),'pointerdown',event=>{blockTrainingClick=true;event.preventDefault();train(false);});on(window,'pointerup',()=>train(true));on(node('training-input'),'click',event=>{if(/** @type {MouseEvent} */(event).detail===0){train(false);train(true);}});
  on(node('plugin-reroll'),'click',()=>choose('RerollPlugin'));on(node('plugin-skip'),'click',()=>choose('SkipPlugin'));
  on(node('switch'),'click',()=>{send('SwitchWeapon');});on(node('skill'),'click',()=>{send('Skill');});on(node('dash'),'click',()=>{send('Dash');});on(node('checkpoint'),'click',()=>requestSave());
  on(window,'keydown',event=>{const e=/** @type {KeyboardEvent} */(event);if(!session||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;const key=e.code;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key))e.preventDefault();if(e.repeat)return;
    if(key==='Escape'){readSessionState(session).flow.phase==='paused'?resume():pause();return;}keys.add(key);
    if(key==='Space'&&readSessionState(session).flow.phase==='loraTraining'){train(false);return;}
    if(key==='Space')send('Dash');else if(key==='KeyE')send('Skill');else if(key==='KeyQ')send('SwitchWeapon');else if(key==='KeyF')requestSave();
  });
  on(window,'keyup',event=>{const key=/** @type {KeyboardEvent} */(event).code;keys.delete(key);if(key==='Space')train(true);});
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
        if(frameState.flow.phase==='exploring'){
          const move={x:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+leftMove.x,y:(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+leftMove.y};
          const sample={move,aim,firing:mouseFiring||stickFiring},encoded=JSON.stringify(sample);if(encoded!==lastInput&&send('SetInput',sample))lastInput=encoded;
        }
        const state=frameState,schedule=scheduleFrame(clock,lastTime?Math.max(0,now-lastTime):0,state.flow.phase);clock=schedule.nextClock;
        if(schedule.performancePause){pause();toast('帧积压较多，已暂停。继续时不会快进战斗。');}
        for(let index=0;index<schedule.worldSteps;index++){
          const result=stepSessionWorld(session);showEvents(result.events);
          for(const event of result.events)if(event.type==='DamageResolved'){
            const p=/** @type {{hpDamage:number;shellDamage:number;shieldDamage:number}} */(event.payload),entity=event.targetId?result.next.world.entities[event.targetId]:null;
            if(entity&&p.hpDamage+p.shellDamage>0)popups.push({x:entity.position.x,y:entity.position.y,amount:p.hpDamage+p.shellDamage,tick:result.next.tick});
          }
          if(result.next.flow.phase!=='exploring')break;
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
        node('dsh-label').textContent=growth.start.dsh.some(slot=>slot.id==='dsh_lora')?`LoRA：欠拟合${growth.lora.underfitRemaining.toFixed(1)}s / 过拟合${growth.lora.overfitRemaining.toFixed(1)}s`:growth.start.dsh.some(slot=>slot.id==='dsh_gpt_branch')?`更新/重置：${growth.dshCycle.remaining.toFixed(1)}s`:'';
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
        view=readSessionView(session);
        const hud=/** @type {{hp:number;maxHp:number;rice:number;enemies:number;weaponName:string;skillId:string;skillCooldown:number;dashCooldown:number}} */(view.hud);
        node('hp-label').textContent=`${Math.ceil(hud.hp)} / ${Math.ceil(hud.maxHp)}`;node('hp-fill').style.width=`${Math.max(0,hud.hp/hud.maxHp*100)}%`;node('rice').textContent=String(hud.rice);node('enemies').textContent=String(hud.enemies);node('weapon-label').textContent=hud.weaponName;
        const skillLabel=node('skill').firstChild;if(skillLabel)skillLabel.textContent=hud.skillId==='skill_cache'?'缓存护盾 ':'断开连接 ';node('skill-cd').textContent=hud.skillCooldown>0?`${hud.skillCooldown.toFixed(1)}s`:'就绪';node('dash-cd').textContent=hud.dashCooldown>0?`${hud.dashCooldown.toFixed(1)}s`:'就绪';node('skill').toggleAttribute('disabled',hud.skillCooldown>0);node('dash').toggleAttribute('disabled',hud.dashCooldown>0);
        const stopped=view.phase==='paused'||view.phase==='defeat';node('pause-menu').classList.toggle('hidden',!stopped);node('resume').classList.toggle('hidden',view.phase==='defeat');node('pause-title').textContent=view.phase==='defeat'?'这次先回小窝':'已暂停';node('pause-description').textContent=view.phase==='defeat'?'本轮战斗结束。已保存的试作检查点仍可继续，不产生永久资源。':'战斗时间已冻结；回来后不会补跑。';mount?.classList.toggle('stopped',stopped);
        popups=popups.filter(popup=>view&&view.tick-popup.tick<45);renderPreviewFrame(ctx,view,width,height,ratio,popups);
      }else{ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#12333e';ctx.fillRect(0,0,width,height);}
      if(now>toastUntil)node('toast').classList.remove('visible');
    }catch(error){pause();toast(`试作已暂停：${error instanceof Error?error.message:String(error)}`);}
    lastTime=now;frameId=requestAnimationFrame(frame);
  }
  refreshContinue();frameId=requestAnimationFrame(frame);
  return ()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frameId);for(const remove of removers)remove();if(session)disposeGameSession(session);clearInput();};
}
