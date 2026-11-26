// @ts-check
const places = /** @type {const} */([
 ['companion_rice','饭团',22,43,'我把饭压缩成了一口。解压要用两碗！'],
 ['companion_patch','补丁',7,65,'这次只修一个小问题。怎么又多了三个？'],
 ['companion_cache','小缓存',31,80,'昨天的剩饭？命中缓存，还是热的！'],
 ['companion_router','路由员',68,80,'最快路线已重算：先去饭桌，再去饭桌。'],
 ['companion_decoy','替身进程',92,67,'你去打首领，我负责显示「正在思考」。'],
 ['companion_rocket','小火箭',85,43,'倒数三二一！等一下，我的午饭呢？'],
 ['facilities','大白饭小餐桌',12,26,''],['range','试射靶桩',77,55,''],
 ['tree','AI 科技树终端',49,28,''],['mods','模组架',89,25,''],['collection','图鉴台',48,77,'']
]);

/** Swim between placed residents and facilities. Coordinates are room percentages.
 * @calls 无内部公开函数。
 * @param {HTMLElement} root
 * @param {import('../contracts.d.ts').Profile} profile
 * @param {(id:string)=>void} open
 * @param {()=>string} companion
 * @param {(id:string)=>void} equip
 * @param {{x:number,y:number}} position
 * @returns {()=>void}
 */
export function mountNestRoom(root,profile,open,companion,equip,position){
  const floor=document.createElement('div'), fish=document.createElement('img'), controls=document.createElement('div'), stick=document.createElement('div'), interact=document.createElement('button'), dialogue=document.createElement('section');
  floor.className='nest-floor';fish.className='nest-fish';fish.src='./art/characters/deepseek.png';fish.alt='大肥鱼';controls.className='room-controls';stick.className='room-stick';stick.ariaLabel='移动摇杆';stick.append(document.createElement('i'));dialogue.className='room-dialogue';dialogue.hidden=true;
  const hint=document.createElement('small');hint.textContent='WASD 游动 · 靠近后按 F';controls.append(stick,hint,interact);floor.append(fish);root.append(floor,controls,dialogue);
  const water=document.createElement('div');water.className='room-water';water.setAttribute('aria-hidden','true');
  for(const [index,x] of [5,27,59,81,94].entries()){
    const grass=document.createElement('i'),bubble=document.createElement('i');
    grass.className='room-kelp';bubble.className='room-air';
    grass.style.left=x+'%';grass.style.bottom=(index%3*3)+'%';
    bubble.style.left=(x-2)+'%';bubble.style.animationDelay=(-index*3)+'s';grass.style.animationDelay=(-index*.65)+'s';
    water.append(grass,bubble);
  }
  floor.prepend(water);
  const visible=places.filter(([id])=>!id.startsWith('companion_')||profile.unlockedCompanions.includes(id));
  /** @param {number} index */
  function sprite(index){const el=document.createElement('i');el.className='room-sprite';el.style.setProperty('--fixture-frame',(index*10)+'%');return el;}
  for(const place of visible){const [id,label,x,y]=place,station=document.createElement('div'),name=document.createElement('span');station.dataset.station=id;station.className='room-fixture';station.style.left=x+'%';station.style.top=y+'%';name.textContent=label;station.append(sprite(places.indexOf(place)),name);floor.append(station);}
  let nearest=/** @type {typeof places[number]|undefined} */(undefined), frame=0,last=0,dx=0,dy=0;
  const keys=new Set(), controller=new AbortController(),options={signal:controller.signal};
  function update(){
    fish.style.left=position.x+'%';fish.style.top=position.y+'%';
    const w=floor.clientWidth,h=floor.clientHeight;
    const distance=(/** @type {typeof places[number]} */ p)=>Math.hypot((p[2]-position.x)*w/100,(p[3]-position.y)*h/100);
    nearest=visible.reduce((a,b)=>distance(a)<distance(b)?a:b);
    if(distance(nearest)>Math.max(38,Math.min(74,Math.min(w,h)*.18)))nearest=undefined;
    interact.disabled=!nearest;interact.textContent=nearest?'F · '+nearest[1]:'F · 交互';floor.dataset.near=nearest?.[0]??'';
  }
  function activate(){
    if(!nearest||!dialogue.hidden)return;
    const [id,label,,,line]=nearest;if(!id.startsWith('companion_')){open(id);return;}
    keys.clear();dx=dy=0;dialogue.replaceChildren();dialogue.hidden=false;
    const portrait=sprite(places.indexOf(nearest)),copy=document.createElement('div'),name=document.createElement('strong'),text=document.createElement('p'),take=document.createElement('button'),close=document.createElement('button');
    name.textContent=label;text.textContent=line;copy.append(name,text);take.textContent=companion()===id?'取消随行':'带它出战';
    take.disabled=!!profile.checkpoint;
    if(take.disabled)take.textContent='冒险中配装锁定';
    take.onclick=()=>{equip(companion()===id?'':id);take.textContent=companion()===id?'取消随行':'带它出战';};close.textContent='结束对话';close.onclick=()=>{dialogue.hidden=true;};dialogue.append(portrait,copy,take,close);close.focus();
  }
  interact.onclick=activate;
  document.addEventListener('keydown',e=>{if(!dialogue.hidden){if(e.code==='Escape'||e.code==='KeyF'&&!e.repeat){dialogue.hidden=true;e.preventDefault();}return;}if(['KeyW','KeyA','KeyS','KeyD','KeyF'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='KeyF'&&!e.repeat)activate();}},options);
  document.addEventListener('keyup',e=>keys.delete(e.code),options);
  /** @param {PointerEvent} e */
  function steer(e){const r=stick.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2),len=Math.max(1,Math.hypot(x,y));dx=x/len;dy=y/len;stick.style.setProperty('--sx',dx*17+'px');stick.style.setProperty('--sy',dy*17+'px');}
  stick.onpointerdown=e=>{stick.setPointerCapture(e.pointerId);steer(e);};stick.onpointermove=e=>{if(stick.hasPointerCapture(e.pointerId))steer(e);};
  function reset(){dx=dy=0;keys.clear();stick.style.removeProperty('--sx');stick.style.removeProperty('--sy');}
  stick.onlostpointercapture=reset;window.addEventListener('blur',reset,options);
  /** @param {number} time */
  function swim(time){const dt=Math.min(.05,(time-(last||time))/1000);last=time;const x=dx+Number(keys.has('KeyD'))-Number(keys.has('KeyA')),y=dy+Number(keys.has('KeyS'))-Number(keys.has('KeyW')),norm=Math.max(1,Math.hypot(x,y));
    if(dialogue.hidden&&(x||y)&&floor.clientWidth){position.x=Math.max(5,Math.min(95,position.x+x/norm*dt*20000/floor.clientWidth));position.y=Math.max(15,Math.min(88,position.y+y/norm*dt*20000/floor.clientHeight));if(x)fish.style.setProperty('--facing',x<0?'-1':'1');update();}
    frame=requestAnimationFrame(swim);
  }
  const resize=new ResizeObserver(update);resize.observe(floor);update();frame=requestAnimationFrame(swim);return ()=>{resize.disconnect();controller.abort();cancelAnimationFrame(frame);};
}
