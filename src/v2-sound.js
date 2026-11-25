// Preview host audio. The generic architecture AudioPort remains separate.
const ACTIONS=new Set(['WeaponFired','SkillCast','DashStarted','DamageResolved']);
const REWARDS=new Set(['PickupCollected','LevelGained','ObjectiveCompleted','EquipmentEquipped']);
export function mountSound(){
 const music=document.querySelector('#background-music');if(!music)return;
 const read=(key,fallback)=>{try{const value=localStorage.getItem(`big-fat-fish:v2:${key}`);return value===null?fallback:JSON.parse(value);}catch{return fallback;}};
 const volume=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(100,value)):50;
 const settings={music:{volume:volume(read('music-volume',35)),muted:read('music-muted',false)===true},sfx:{volume:volume(read('sfx-volume',50)),muted:read('sfx-muted',false)===true}};
 let context,musicGain,sfxGain,unlocked=false,failed=false;const buffers=new Map(),sources=new Set(),media=new Set(),last=new Map();let loading;
 const ui=[];
 function persist(){for(const [kind,s] of Object.entries(settings))for(const [key,value] of Object.entries(s))try{localStorage.setItem(`big-fat-fish:v2:${kind}-${key}`,JSON.stringify(value));}catch{}}
 function sync(){
  const m=settings.music,s=settings.sfx;music.muted=m.muted;if(musicGain){music.volume=1;musicGain.gain.value=m.muted?0:m.volume/100;}else music.volume=m.volume/100;
  if(sfxGain)sfxGain.gain.value=s.muted?0:s.volume/100;
  if(s.muted||!s.volume){for(const source of sources){try{source.stop();}catch{}}sources.clear();for(const audio of media){audio.pause();audio.currentTime=0;}media.clear();}
  const desk=document.querySelector('.radio-desk');
  if(desk){desk.style.setProperty('--volume',String(m.muted?0:m.volume));desk.dataset.muted=String(m.muted||!m.volume||music.paused);}
  const dial=document.querySelector('#dial-value');if(dial)dial.textContent=m.muted?'静音':m.volume+'%';
  for(const row of ui){const state=settings[row.kind];row.slider.value=String(state.volume);row.value.textContent=`${state.volume}%`;row.mute.checked=state.muted;row.status.textContent=row.kind==='music'?(failed?'音乐加载失败':state.muted?'已静音':!unlocked?'点击或按键后播放':music.paused?'等待播放':'正在播放 Let Me Go'):state.muted?'已静音':'战斗与菜单音效';}
 }
 function ensureGraph(){
  if(context)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  try{context=new C();musicGain=context.createGain();sfxGain=context.createGain();context.createMediaElementSource(music).connect(musicGain);musicGain.connect(context.destination);sfxGain.connect(context.destination);sync();}catch{context=undefined;musicGain=undefined;sfxGain=undefined;}
 }
 function decode(){if(!context)return Promise.resolve();if(!loading)loading=Promise.all(['action','reward'].map(async kind=>{try{const response=await fetch(`./audio/sfx/${kind==='action'?'message_sent':'message_received'}.wav`);if(!response.ok)throw Error('Missing SFX');buffers.set(kind,await context.decodeAudioData(await response.arrayBuffer()));}catch{/* Media fallback stays available. */}}));return loading;}
 async function playMusic(){if(!unlocked||document.hidden)return;try{if(context&&context.state!=='running'&&context.state!=='closed')await context.resume();await music.play();failed=false;}catch{/* Browser may require another gesture. */}sync();}
 function unlock(){unlocked=true;ensureGraph();if(context&&context.state!=='running')context.resume().catch(()=>{});decode();playMusic();}
 function effect(kind){
  const s=settings.sfx;if(!unlocked||document.hidden||s.muted||!s.volume)return;
  const now=performance.now();if(now-(last.get(kind)??-Infinity)<140)return;last.set(kind,now);
  if(context&&buffers.has(kind)&&sfxGain){if(context.state!=='running')context.resume().catch(()=>{});const source=context.createBufferSource();source.buffer=buffers.get(kind);source.connect(sfxGain);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();};source.start();return;}
  if(context&&loading){decode().then(()=>{if(buffers.has(kind)){last.delete(kind);effect(kind);}});return;}
  const audio=new Audio(`./audio/sfx/${kind==='action'?'message_sent':'message_received'}.wav`);audio.volume=s.volume/100;media.add(audio);audio.onended=()=>media.delete(audio);audio.play().catch(()=>media.delete(audio));
 }
 const target=document.querySelector('#audio-settings');
 if(target){
  const box=document.createElement('fieldset');box.className='sound-settings';const legend=document.createElement('legend');legend.textContent='声音设置';box.append(legend);
  for(const kind of ['music','sfx']){const row=document.createElement('div');row.className='sound-row';const label=document.createElement('label'),slider=document.createElement('input'),value=document.createElement('output'),muteLabel=document.createElement('label'),mute=document.createElement('input'),status=document.createElement('small');
   slider.id=`home-${kind}-volume`;slider.type='range';slider.min='0';slider.max='100';slider.step='1';label.htmlFor=slider.id;label.textContent=kind==='music'?'背景音乐':'音效';mute.type='checkbox';mute.id=`home-${kind}-muted`;muteLabel.append(mute,' 静音');status.className='sound-status';row.append(label,slider,value,muteLabel,status);box.append(row);ui.push({kind,slider,value,mute,status});
   slider.oninput=()=>{settings[kind].volume=volume(Number(slider.value));persist();sync();};mute.onchange=()=>{settings[kind].muted=mute.checked;persist();sync();};
  }target.append(box);
 }
 music.loop=true;music.addEventListener('playing',()=>{failed=false;sync();});music.addEventListener('error',()=>{failed=true;sync();});
 document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);
 document.addEventListener('click',e=>{if(e.target instanceof Element&&e.target.closest('button,summary'))effect('action');});
 window.addEventListener('fish:game-sound',e=>{const type=e.detail?.type;if(REWARDS.has(type))effect('reward');else if(ACTIONS.has(type))effect('action');});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){music.pause();for(const source of sources)try{source.stop();}catch{}sources.clear();for(const audio of media)audio.pause();media.clear();}else playMusic();});sync();
}
