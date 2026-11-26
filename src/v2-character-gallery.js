import {drawCharacter,loadCharacterArt} from './v2/preview/characters.js';

const spreads = [
  ['ChatGPT', [
    ['chatgpt','ChatGPT','白龙少女会尝试重新生成。打断发亮的节点可以阻止重置。'],
    ['codex','Codex','贴近战场的小帮手，和其他 Pets 一起行动。'],
    ['dewey','Dewey','为受伤的队友回血，尤其照顾脆弱的后排。'],
    ['fireball','Fireball','看准火球落点，游出烧起来的那片海床。'],
    ['hoots','Hoots','后排的远射手，前排队友会掩护它。'],
    ['rocky','Rocky','站到玩家和支援单位之间，为后排挡住火力。'],
    ['seedy','Seedy','藤圈会减慢游速，打掉中心的嫩芽就能脱身。'],
    ['stacky','Stacky','一层发一枚扇形弹。打掉上层，下轮弹幕就会变稀。']
  ]],
  ['Claude',[['claude','Claude · 陶土蟹','重钳落下前会预警。绕到侧面，寻找外壳上的弱点。']]],
  ['Grok',[['grok','Grok Bot','一跳一停地逼近。两翼合围时，中间仍有路可走。']]],
  ['DeepSeek',[['deepseek','大肥鱼 · DeepSeek','带上 MCP 泡泡炮，捡大白饭，边游边整活。']]],
  ['探索',[['bsod','BSOD','守着高价值补给的蓝屏怪。'],['null-signal','Null Signal','藏在海底探索区的断网守卫。']]]
];

/** A foldout spread keeps the silhouettes of each faction at the same scale. */
export function mountCharacterGallery(){
  const root=document.querySelector('#character-gallery'),panel=document.querySelector('#characters-panel');
  if(!root||!panel)return;
  const element=(tag,cls)=>Object.assign(document.createElement(tag),{className:cls});
  const tabs=element('nav','faction-tabs'),lineup=element('div','foldout-lineup');
  tabs.ariaLabel='选择阵营';
  const detail=element('div','foldout-detail'),title=document.createElement('h3'),copy=document.createElement('p');
  detail.ariaLive='polite';detail.append(title,copy);
  const controls=element('div','model-controls');
  const label=document.createElement('label'),select=document.createElement('select');
  label.textContent='动作 ';select.id='model-pose';
  for(const [id,name] of [['idle','原图'],['move','移动反馈'],['attack','攻击反馈'],['control','受控'],['hurt','受击']])select.add(new Option(name,id));
  label.append(select);
  let facing=0;const turn=document.createElement('button');turn.type='button';turn.textContent='转向';turn.onclick=()=>{facing=facing?0:Math.PI;};
  controls.append(label,turn);root.append(tabs,lineup,detail,controls);
  const views=[];let active,selectedAt=0,frameId=0;
  function inspect(member,animate){
    active=member;selectedAt=animate?performance.now():-Infinity;
    for(const v of views)v.button.setAttribute('aria-pressed',String(v===member));
    title.textContent=member.label;copy.textContent=member.description;
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      member.button.animate([{translate:'0 4px'},{translate:'0 -8px'},{translate:'0 0'}],{duration:420});
      if(member.name==='dewey'){
        const heart=element('i','gallery-heal');heart.ariaHidden='true';heart.textContent='✚';
        const target=views.find(v=>v.name==='hoots');target?.button.append(heart);
        heart.animate([{opacity:0,translate:'0 0'},{opacity:1,offset:.3},{opacity:0,translate:'0 -22px'}],{duration:780}).finished.then(()=>heart.remove());
      }
    }
  }
  for(const [faction,members] of spreads){
    const tab=document.createElement('button');tab.type='button';tab.textContent=faction;tabs.append(tab);
    for(const [name,display,description] of members){
      const button=element('button','foldout-member');button.type='button';
      const canvas=document.createElement('canvas');canvas.width=canvas.height=144;canvas.dataset.model=name;canvas.ariaHidden='true';
      const caption=document.createElement('span');caption.textContent=display;button.append(canvas,caption);lineup.append(button);
      const member={canvas,button,name,label:display,description,faction};views.push(member);
      button.onclick=()=>inspect(member,true);
    }
    tab.onclick=()=>{
      for(const item of tabs.children)item.setAttribute('aria-pressed',String(item===tab));
      for(const v of views){v.button.hidden=v.faction!==faction;if(!v.button.hidden)loadCharacterArt(v.name).catch(()=>{v.canvas.ariaLabel='角色图像加载失败';});}
      lineup.scrollLeft=0;inspect(views.find(v=>v.faction===faction),false);
    };
  }
  tabs.firstElementChild.click();
  function frame(now){
    if(!panel.open||document.hidden){frameId=0;return;}
    const tick=Math.floor(now*.06);
    for(const v of views){
      if(v.button.hidden)continue;
      const ctx=v.canvas.getContext('2d');ctx.clearRect(0,0,144,144);ctx.imageSmoothingEnabled=false;
      const action=active===v&&now-selectedAt<650;
      drawCharacter(ctx,v.name,72,72,132,{tick,moving:select.value==='move',attacking:action||select.value==='attack'&&tick%30<15,controlled:select.value==='control',hopPhase:v.name==='grok'&&(action||select.value==='move')?Math.min(16,tick%48):16,hurt:select.value==='hurt'&&tick%30<5,facing});
    }
    frameId=requestAnimationFrame(frame);
  }
  const resume=()=>{if(panel.open&&!document.hidden&&!frameId)frameId=requestAnimationFrame(frame);};
  panel.addEventListener('toggle',resume);document.addEventListener('visibilitychange',resume);resume();
}
