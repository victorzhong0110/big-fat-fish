import {screenAreas} from './guide-hotspots.js';
import {BUOY_OFFSETS, BUOY_SECONDS, STATION_RADIUS, tuneStation} from './v2/domain/world/beacon.js';

const byId = id => document.getElementById(id);
const images = {
  harbor:'harbor/moonbreaker.webp', seabed:'harbor/seabed.webp', fish:'characters/deepseek.png',
  crab:'characters/claude-attack.png', bot:'characters/grok.png', cannon:'weapons/bubble-cannon.png',
  mast:'harbor/props/beacon.png', chip:'harbor/props/cartridge.png', radio:'harbor/props/console.png',
  gear:'harbor/props/gear.png', bowl:'sprites/rice-bowl.svg',
};
const asset = name => window.fishGuideArt?.[name] || './art/' + images[name];
const sprites = Object.fromEntries(Object.keys(images).map(name => {const im=new Image();im.src=asset(name);return [name,im];}));
const photo = (name,cls) => `<img class="${cls}" alt="" src="${asset(name)}">`;
const choose = (group, value, key) => group.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===value)));
const studioEnabled = document.body.dataset.studio === 'true' || new URLSearchParams(location.search).has('studio');
byId('studio-tab').hidden=!studioEnabled;
byId('screens-tab').hidden=!studioEnabled;
if (studioEnabled) byId('book-title').textContent='目标界面与实战手册';
let panel='', version='port', selected=0, sailed=false, conceptPage='entry';
let sampleMode=1;
const sampleSettings={music:35,sfx:50,simple:false};
const sampleRoutes=[
  ['码头试音','在岸边试试移动、射击和冲刺。','radio'],
  ['晚饭呼叫','接通两座电台，再去闸口找首领。','mast'],
  ['沿海送信','穿过三片海，把晚饭消息送到最后一班。','bowl'],
  ['通宵值班','通关难度 15 后开放。','chip']
];
function renderPageStudy(scene) {
  if (version==='port') {
    const key=conceptPage+'-wide';
    scene.innerHTML='<img class="study-capture" alt="月潮电台的正式游戏界面">';
    scene.firstElementChild.src=window.fishScreenPhotos?.[key] ?? './guide/screens/'+key+'.webp';
    return;
  }
  const chart=version==='chart';
  const art=conceptPage==='modes'?sampleRoutes[sampleMode][2]:conceptPage==='audio'?'radio':chart?'mast':'fish';
  const stamp=chart?'港务局 · 领航图册':'口袋街机';
  const nav='<button class="study-back" data-page="title">返回标题</button>';
  let copy;
  if(conceptPage==='title'){
    copy=`<small>${stamp}</small><h3>大肥鱼<br>历险记</h3><p>${chart?'从这张图，去找最后一班值夜人。':'饭团就位，泡泡炮装填完毕。'}</p><div class="study-buttons"><button data-page="modes">${chart?'摊开航图':'开始游戏'} →</button><button data-page="audio">设置</button></div>`;
  } else if(conceptPage==='modes'){
    copy=`<small>${stamp}</small><h3>${chart?'航线一览':'选择关卡'}</h3><div class="study-routes">${sampleRoutes.map(([n],i)=>`<button data-sample-mode="${i}" aria-pressed="${i===sampleMode}">${n}</button>`).join('')}</div><p aria-live="polite">${sampleRoutes[sampleMode][1]}</p>${nav}`;
  } else{
    const slider=(key,label)=>`<label class="study-slider">${label}<input aria-label="${label}" data-sample-sound="${key}" type="range" min="0" max="100" value="${sampleSettings[key]}"><output>${sampleSettings[key]}%</output></label>`;
    copy=`<small>${stamp}</small><h3>${chart?'领航设置':'机台设置'}</h3>${slider('music','音乐')}${slider('sfx','音效')}<label class="study-check"><input data-sample-fx type="checkbox" ${sampleSettings.simple?'checked':''}> 简化特效</label>${nav}`;
  }
  scene.innerHTML=`<div class="study-art">${photo('seabed','study-water')}${photo(art,'study-object')}</div><div class="study-copy">${copy}</div>`;
}
const stops=['盐风修船厂','浮标邮局','海沟气象站'];
const gear=[['冲刺尾流','甩开追兵，让它从尾流里走过。','gear','wake'],['浮标调频','穿过副浮标，把跑位变成调频进度。','mast','beacon'],['蟹壳弱侧','迎面打不动？看看它转身的那一刻。','chip','shell']];
const versionCaptions={
  port:'月潮电台沿用主角原画的靛蓝与海沫白，标题、模式与设置可逐页对照。',
  chart:'领航海图把路线放在正中央。选任意电台，查看接近方式，再看领航简报。适合以探索选择为主的版本。',
  deck:'口袋街机把第一屏交给配装。切换装备即可看打法，再一键观看实战。适合碎片时间和重复挑战。',
};
function renderConcept(){
  const scene=byId('scene');scene.className='scene '+version+(version==='port'&&sailed?' port-battle':'');
  choose(byId('versions'),version,'version');
  choose(byId('concept-pages'),conceptPage,'page');
  byId('concept-caption').textContent=versionCaptions[version];
  if(conceptPage!=='entry'){
    scene.className='scene study '+version;
    renderPageStudy(scene);return;
  }
  if(version==='port'){
    scene.innerHTML=photo(sailed?'seabed':'harbor','plate')+photo('fish','actor')+`<div class="port-copy"><small>BIG FAT FISH</small><h3>${sailed?'晚饭呼叫':'大肥鱼'}</h3><p>${sailed?'盐风修船厂 · 收到第一段杂音。':'深夜食堂电台<br>「开饭了。听得见吗？」'}</p><button class="action" data-sail>${sailed?'返回港口':'出海喊人 →'}</button></div>`;
  }else if(version==='chart'){
    const coords=[[29,67],[48,27],[76,50]], xy=coords[selected];
    scene.innerHTML=photo('seabed','plate')+`<div class="map-sheet"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M8 87 Q26 79 ${xy[0]} ${xy[1]}" fill="none" stroke="#674e40" stroke-width=".8" stroke-dasharray="2 1.5"/></svg>${coords.map(([x,y],i)=>`<button class="chart-pin" style="left:${x}%;top:${y}%" data-stop="${i}" aria-pressed="${i===selected}">${stops[i]}</button>`).join('')}</div><aside class="chart-key"><small>沿海航图</small><h3>${stops[selected]}</h3><p>${sailed?'航向已选。靠近亮浮标，让信号穿过浪声。':['西南船坞。修船工刚敲过收工铃。','北侧水道。邮差还等着最后一只饭盒。','外海静风区。先听观测员报一段天气。'][selected]}</p><button class="action" data-sail>${sailed?'重新选线':'沿这条线走'}</button></aside>`;
  }else{
    const [name,copy,art]=gear[selected];scene.innerHTML=`<div class="deck-stage">${photo('seabed','plate')}${photo(art,'big-prop')}</div><div class="deck-text"><small>随船装备</small><h3>${name}</h3><p>${copy}</p><div class="deck-strip">${gear.map(([title,,image],i)=>`<button aria-label="${title}" aria-pressed="${i===selected}" data-gear="${i}">${photo(image,'')}</button>`).join('')}</div><button class="action" data-watch>看实战 →</button></div>`;
  }
}
byId('concept-pages').onclick=e=>{const button=e.target.closest('[data-page]');if(button){conceptPage=button.dataset.page;renderConcept();}};
byId('scene').oninput=e=>{
  const slider=e.target;
  if(slider.dataset.sampleSound){
    sampleSettings[slider.dataset.sampleSound]=Number(slider.value);
    slider.parentElement.querySelector('output').textContent=slider.value+'%';
  }else if(slider.hasAttribute('data-sample-fx'))sampleSettings.simple=slider.checked;
};
byId('versions').onclick=e=>{const v=e.target.closest('[data-version]');if(v){version=v.dataset.version;sailed=false;selected=0;renderConcept();}};
byId('scene').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.page){conceptPage=b.dataset.page;}
  else if(b.dataset.sampleMode!=null){sampleMode=Number(b.dataset.sampleMode);}
  else if(b.hasAttribute('data-sail'))sailed=!sailed;
  else if(b.dataset.stop!=null||b.dataset.gear!=null){selected=Number(b.dataset.stop??b.dataset.gear);sailed=false;}
  else if(b.hasAttribute('data-watch')){openLesson(gear[selected][3]);return;}
  renderConcept();
};

const lessons={
  beacon:{title:'边走，边接通信号',desc:'圈内持续调频。三盏副浮标各送五秒进度，每盏只能点亮一次。出圈躲招，回来接着调。',variants:['绕标接力','原地守台'],duration:38,speed:3},
  wake:{title:'让追兵吃你的尾流',desc:'一级「卸载缓存」冲刺时放出六发泡泡。落点的水流持续两秒，每半秒打五点基础伤害，相当于每秒十点。',variants:['让追兵穿过','从敌人身旁冲走'],duration:6,speed:1},
  shell:{title:'等钳子转开，再开火',desc:'浅色弧线标出壳的弱侧。正面弹开，打中弱侧才会削掉壳；壳破以后，下一发才伤到本体。',variants:['绕到背面','一直正面打'],duration:7,speed:1},
};
let lesson='beacon',variant=0,time=0,running=false,frame=0,lastTime=0,traces=[];
const motionOK=!matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas=byId('drill'),ctx=canvas.getContext('2d');
const center={x:0,y:0};
function samplePath(t,keys){
  for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){
    const [t0,x0,y0]=keys[i-1],[t1,x1,y1]=keys[i],u=(t-t0)/(t1-t0);
    return {x:x0+(x1-x0)*u,y:y0+(y1-y0)*u};
  }
  return {x:keys.at(-1)[1],y:keys.at(-1)[2]};
}
function buoyTrace(){
  const offsets=BUOY_OFFSETS;
  const route=variant===0?[[0,-285,0],[3,offsets[2].x,offsets[2].y],[6.3,offsets[0].x,offsets[0].y],[9,254,-95],[11,260,-100],[14,offsets[1].x,offsets[1].y],[18,65,45],[38,65,45]]:[[0,-285,0],[2,0,18],[38,0,18]];
  let state={id:'demo',kind:'beacon',progress:0,requiredProgress:2100,buoyMask:0},reached=0;
  traces=[];
  for(let tick=0;tick<=38*60;tick++){
    const pos=samplePath(tick/60,route), inside=Math.hypot(pos.x,pos.y)<=STATION_RADIUS;
    if(tick&&inside&&state.progress<2100)state=tuneStation(state,center,pos);
    if(!reached&&state.progress>=2100)reached=tick;
    traces.push({pos,inside,progress:state.progress,mask:state.buoyMask,reached});
  }
}
function paint(name,x,y,size,flip=false){
  const im=sprites[name];if(!im.complete||!im.naturalWidth)return;
  const scale=size/Math.max(im.naturalWidth,im.naturalHeight);
  ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
  ctx.drawImage(im,-im.naturalWidth*scale/2,-im.naturalHeight*scale/2,im.naturalWidth*scale,im.naturalHeight*scale);ctx.restore();
}
function arc(x,y,r,a,b,color,width){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.arc(x,y,r,a,b);ctx.stroke();}
function bubble(x,y,r){ctx.fillStyle='#7ad3ec';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();arc(x-1,y-1,r*.58,3.4,5,'#eefffa',2);}
function label(str,x,y){ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.strokeStyle='#142b40';ctx.lineWidth=4;ctx.strokeText(str,x,y);ctx.fillStyle='#fff2ce';ctx.fillText(str,x,y);}
function readout(title,note){
  byId('readout').textContent=title;
  if(byId('comment').textContent!==note)byId('comment').textContent=note;
}
function drawBeacon(){
  const r=traces[Math.min(traces.length-1,Math.round(time*60))],cx=330,cy=216,scale=.7;
  ctx.setLineDash([8,9]);arc(cx,cy,STATION_RADIUS*scale,0,2*Math.PI,'#a8cfcb',2);ctx.setLineDash([]);
  arc(cx,cy,STATION_RADIUS*scale,-Math.PI/2,-Math.PI/2+2*Math.PI*r.progress/2100,'#ffce7b',4);
  paint('mast',cx,cy,76);
  for(const [i,p] of BUOY_OFFSETS.entries()){
    const x=cx+p.x*scale,y=cy+p.y*scale,lit=r.mask&(1<<i);paint('mast',x,y,37);label(lit?'✓':'+'+BUOY_SECONDS+'秒',x,y+28);
  }
  paint('fish',cx+r.pos.x*scale,cy+r.pos.y*scale,54);
  const note=r.reached?`电台在第 ${(r.reached/60).toFixed(1)} 秒接通。试试另一条路线。`:!r.inside?(r.progress?'已离圈。躲过危险，进度停在这里。':'游进信号圈，开始调频。'):variant===1?'站在圈内也能完成。留意外圈的三盏浮标。':r.mask?'浮标已经点亮。折返碰同一盏不会重复加速。':'沿圈边走位，擦过亮浮标。';
  readout(`调频 ${Math.floor(r.progress/60)} / 35 秒`,note);
}
function drawWake(){
  const dash=Math.max(0,Math.min(1,(time-1.15)/.18)),x=225+dash*120,y=230;
  const age=time-1.33,enemyY=variant?343:236,enemyX=300+Math.min(time,3)*13;
  if(age>=0&&age<2){for(let i=0;i<5;i++){const u=(age*.9+i*.2)%1;ctx.beginPath();ctx.strokeStyle=`rgba(167,239,235,${.8*(1-u)})`;ctx.lineWidth=3;ctx.ellipse(345,230,12+u*61,10+u*55,-.3,i,i+3.5);ctx.stroke();}}
  if(time>=1.15&&time<1.95){const dist=(time-1.15)*190;for(let i=0;i<6;i++)bubble(225+Math.cos(i*Math.PI/3)*dist,230+Math.sin(i*Math.PI/3)*dist,5);}
  paint('fish',x,y,72);paint('bot',enemyX,enemyY,54);
  const hits=variant?0:Math.min(4,Math.max(0,Math.floor((age+.000001)/.5)));
  label(`${40-hits*5} / 40`,enemyX,enemyY-36);
  readout(`尾流基础伤害 ${hits*5}`,time<1.15?'冲刺键就绪。留意落点和追兵的位置。':age<2?variant?'追兵走在水流外，没有受到尾流伤害。':'追兵停在水流里，每半秒受到一次伤害。':`两秒结束。这个目标受到 ${hits*5} 点尾流基础伤害。`);
}
function drawShell(){
  const cx=360,cy=220,theta=variant?0:Math.PI*Math.min(1,Math.max(0,(time-1.2)/2)),px=cx+Math.cos(theta)*156,py=cy+Math.sin(theta)*88;
  const impacts=[1,3.6,4.6,5.6],backHits=variant?0:impacts.slice(1).filter(s=>time>=s).length,armor=Math.max(0,2-backHits);
  paint('crab',cx,cy,112);if(armor){arc(cx,cy,59,0,Math.PI*2,'#846e69',2);arc(cx,cy,59,Math.PI*.67,Math.PI*1.33,'#ffe6a9',5);}
  paint('fish',px,py,65,px>cx);
  for(const impact of impacts){const u=(time-impact+.36)/.36;if(u>=0&&u<1)bubble(px+(cx-px)*u,py+(cy-py)*u,6);if(time>=impact&&time<impact+.4)label(impact===1||variant?'弹开':backHits===3?'击中本体':armor?'裂纹':'破壳',cx,cy-72);}
  readout(armor?'硬壳 · '+armor+'/2':'外壳已破',variant?'每一发都打在正面，蟹壳完好。':time<1.2?'正面射击被壳弹开。':time<3.4?'沿浅色弧线绕到背面。':backHits<2?'第一发弱侧命中，只打掉壳的耐久。':'壳已经碎了，现在可以打到本体。');
}
function draw(){
  const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);ctx.fillStyle='#29485a';ctx.fillRect(0,0,W,H);
  ctx.imageSmoothingEnabled=false;
  if(sprites.seabed.complete&&sprites.seabed.naturalWidth){ctx.globalAlpha=.82;ctx.drawImage(sprites.seabed,0,0,W,H);ctx.globalAlpha=1;}
  if(lesson==='beacon')drawBeacon();else if(lesson==='wake')drawWake();else drawShell();
  const l=lessons[lesson];byId('clock').textContent='演示速度 '+l.speed+'×';
  byId('elapsed').textContent=time.toFixed(1)+' / '+l.duration+'s';byId('scrub').value=Math.round(time/l.duration*1000);
}
function tick(now){
  if(!running)return;
  if(!document.hidden&&lastTime)time=(time+Math.min(.1,(now-lastTime)/1000)*lessons[lesson].speed)%lessons[lesson].duration;
  lastTime=now;draw();frame=requestAnimationFrame(tick);
}
function play(on){cancelAnimationFrame(frame);running=on;lastTime=0;byId('play').textContent=on?'暂停':'播放';if(on)frame=requestAnimationFrame(tick);}
function resetLesson(){
  time=0;const l=lessons[lesson];choose(byId('lessons'),lesson,'lesson');
  byId('lesson-title').textContent=l.title;byId('lesson-desc').textContent=l.desc;
  byId('variants').innerHTML=l.variants.map((v,i)=>`<button data-v="${i}" aria-pressed="${i===variant}">${v}</button>`).join('');
  if(lesson==='beacon')buoyTrace();draw();play(motionOK&&panel==='demos');
}
function show(id){
  panel=id;for(const name of ['screens','studio','demos','rules'])byId(name).hidden=name!==id;
  for(const [name,tab] of [['screens','screens-tab'],['studio','studio-tab'],['demos','demo-tab'],['rules','rules-tab']])byId(tab).setAttribute('aria-pressed',String(id===name));
  play(false);
  if(id==='screens')renderScreen();
  if(id==='studio')renderConcept();if(id==='demos')resetLesson();
}
function openLesson(id){lesson=id;variant=0;show('demos');}
const screens = [
  ['title','标题界面','在月浪下开始航行。已有存档时，标题下会出现继续航程。'],
  ['modes','模式选择','切换航程，查看电台位置与岛链。点航程难度可以试探更深的海层。'],
  ['depth','海沟测深','在游戏里拖探针、点海床或使用方向键，即可预览十五层敌情。解锁后的海层才可用于出航。'],
  ['audio','设置 · 声音','音乐与音效可以分别调节或静音。唱片中央的标记随音乐音量变化，静音时唱片停转。'],
  ['controls','设置 · 操作与画面','需要时打开按住挣脱或简化特效。修改即时保存。'],
  ['nest','小窝配装','选好下趟要带的武器、主动技能和随行伙伴。'],
  ['gallery','角色图鉴','翻看角色原画，切换移动、攻击、受控和受击姿态。'],
  ['workshop','模组工坊','在修船厂安装和管理社区模组。带模组出海会使用独立小窝。'],
  ['sea','战斗画面','移动、射击和冲刺在同一张海图上进行。右上角可以暂停。'],
  ['pause','航行暂停','停下读本航次的电台记录、调整设置，或继续航行。'],
  ['return','返港结算','这里展示短途中途返港的结果。回港后可以再翻一遍这趟听到的留言。']
];
const targetNames = Object.fromEntries(screens.map(([id,title])=>[id,title]));
targetNames['modes-guide']='选择教学';targetNames['modes-expedition']='选择远征';targetNames.back='返回';
let currentScreen = 0;
let modeShot = 'modes';
let settingsFrom = 'title';
function jumpTo(target) {
  const previous = screens[currentScreen][0];
  if (target === 'back') target = settingsFrom;
  if (target === 'audio' && previous !== 'controls') settingsFrom = previous === 'pause' ? 'pause' : 'title';
  if (target.startsWith('modes')) modeShot=target;
  const index=screens.findIndex(([id]) => id === (target.startsWith('modes')?'modes':target));
  if(index >= 0){currentScreen=index;renderScreen();}
}
let screenFormat = matchMedia('(max-width:600px)').matches ? 'phone' : 'wide';
for (const screen of screens) {
  const button = document.createElement('button');
  button.type='button';button.textContent=screen[1];
  button.addEventListener('click', () => { jumpTo(screen[0]); });
  byId('screen-index').append(button);
}
function renderScreen() {
  const [id, title, desc] = screens[currentScreen];
  const key=(id==='modes'?modeShot:id)+'-'+screenFormat;
  const photo=byId('screen-photo');
  photo.src=window.fishScreenPhotos?.[key] ?? './guide/screens/'+key+'.webp';
  const links=byId('screen-links');links.replaceChildren();
  for(const [target, box] of screenAreas[key] ?? []) {
    const link=document.createElement('button');link.type='button';link.className='photo-link';
    link.setAttribute('aria-label',id==='modes'&&target==='modes'?'选择短途':targetNames[target]);
    const [x,y,width,height]=box;
    Object.assign(link.style,{left:x+'%',top:y+'%',width:width+'%',height:height+'%'});
    link.onclick=()=>jumpTo(target);links.append(link);
  }
  photo.alt=title+'，'+(screenFormat==='wide'?'桌面':'手机')+'实拍';
  byId('screen-name').textContent=title;byId('screen-description').textContent=desc;
  byId('screen-next').textContent=currentScreen===screens.length-1?'回到标题 ↺':'下一页 →';
  byId('screens').dataset.format=screenFormat;
  Array.from(byId('screen-index').children).forEach((b,i)=>b.setAttribute('aria-pressed',String(i===currentScreen)));
  choose(byId('screen-formats'),screenFormat,'format');
}
byId('screen-formats').onclick=event=>{
  const button=event.target.closest('[data-format]');if(!button)return;
  screenFormat=button.dataset.format;renderScreen();
};
byId('screen-next').onclick=()=>jumpTo(screens[(currentScreen+1)%screens.length][0]);
byId('screens-tab').onclick=()=>show('screens');
byId('studio-tab').onclick=()=>show('studio');byId('demo-tab').onclick=()=>show('demos');byId('rules-tab').onclick=()=>show('rules');
byId('lessons').onclick=e=>{const b=e.target.closest('[data-lesson]');if(b)openLesson(b.dataset.lesson);};
byId('variants').onclick=e=>{const b=e.target.closest('[data-v]');if(b){variant=Number(b.dataset.v);resetLesson();}};
byId('rules').onclick=e=>{const b=e.target.closest('[data-jump]');if(b)openLesson(b.dataset.jump);};
byId('play').onclick=()=>play(!running);byId('replay').onclick=()=>{time=0;draw();play(true);};
byId('scrub').oninput=e=>{play(false);time=Number(e.target.value)*lessons[lesson].duration/1000;draw();};
for(const im of Object.values(sprites))im.addEventListener('load',()=>{if(panel==='demos')draw();});
document.addEventListener('visibilitychange',()=>{lastTime=0;});
const requested=new URLSearchParams(location.search).get('lesson') ?? new URLSearchParams(location.hash.slice(1)).get('lesson');
if(requested&&Object.hasOwn(lessons,requested))lesson=requested;
show(requested&&Object.hasOwn(lessons,requested)?'demos':location.hash==='#handbook'?'rules':studioEnabled?'screens':'demos');
