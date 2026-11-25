// @ts-check
import { drawCharacter, resolveCharacterModel } from './characters.js';
import { computeCameraBounds } from '../domain/geometry.js';
/** Canvas presentation for the combat preview. Never mutates or simulates game state. */

const PARTICLE_LIMIT=160,SHOCK_LIMIT=24,FX_FROZEN=new Set(['paused','loraTraining','pluginChoice','victory','defeat','withdrawal','preparing']);
/** @typedef {{alive:boolean,x:number,y:number,vx:number,vy:number,born:number,life:number,radius:number,color:string,front:boolean}} FxParticle */
/** @typedef {{alive:boolean,x:number,y:number,born:number,life:number,radius:number}} FxShock */
/** @typedef {{hp:number,x:number,y:number,kind:string,spriteId:string,team:string,radius:number,progress:number,required:number}} FxBody */
/** @returns {FxParticle} */
function blankParticle(){return {alive:false,x:0,y:0,vx:0,vy:0,born:0,life:1,radius:2,color:'#5B7CFF',front:true};}
const fx={
 tick:/** @type {number|null} */(null),
 prev:/** @type {Map<string,FxBody>} */(new Map()),
 particles:Array.from({length:PARTICLE_LIMIT},blankParticle),
 cursor:0,
 shocks:Array.from({length:SHOCK_LIMIT},()=>({alive:false,x:0,y:0,born:0,life:12,radius:80})),
 shockCursor:0,
 hits:/** @type {Map<string,number>} */(new Map()),
 shakeBorn:-1000,
 shakeAmp:0,
};
/** @type {HTMLCanvasElement|null} */
let distilledCanvas=null;
let resetWave=false;
if(typeof window!=='undefined')window.addEventListener('fish:reset-wave',()=>{resetWave=true;});
/** @param {string} text */
function fxHash(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n>>>0;}
function simpleEffects(){try{return localStorage.getItem('big-fat-fish:v2:simple-fx')==='1';}catch{return false;}}
function resetPresentationEffects(){fx.tick=null;fx.prev=new Map();fx.cursor=0;fx.shockCursor=0;fx.hits.clear();fx.shakeBorn=-1000;fx.shakeAmp=0;for(const particle of fx.particles)particle.alive=false;for(const shock of fx.shocks)shock.alive=false;}
/** @param {string} spriteId @param {string} kind @param {string} team */
function factionColor(spriteId,kind,team){
 if(kind==='player'||spriteId==='distilled_bot')return '#5B7CFF';
 if(spriteId.includes('claude'))return '#D97757';
 if(spriteId.includes('grok'))return '#00C875';
 if(spriteId.startsWith('enemy_gpt')||spriteId.startsWith('gpt_')||spriteId==='boss_gpt')return '#10A37F';
 if(kind==='projectile')return team==='player'?'#5B7CFF':'#D97757';
 return team==='player'?'#5B7CFF':'#10A37F';
}
/** @param {FxParticle} particle */
function spawnParticle(particle){const slot=fx.particles[fx.cursor%PARTICLE_LIMIT];fx.cursor++;Object.assign(slot,particle,{alive:true});}
/** @param {number} x @param {number} y @param {number} count @param {string} color @param {number} lifeBase @param {number} lifeSpan @param {number} speed @param {number} born @param {boolean} simple @param {number} radius */
function emitBurst(x,y,count,color,lifeBase,lifeSpan,speed,born,simple,radius){
 const n=simple?Math.max(1,Math.floor(count/2)):count,seed=fxHash(`${x}:${y}:${born}:${color}`);
 for(let i=0;i<n;i++){const ang=Math.PI*2*i/n+(seed%7)*0.05,life=lifeBase+(fxHash(`${seed}:${i}`)%lifeSpan),sp=speed*(0.75+(fxHash(`${seed}:s:${i}`)%5)*0.08);spawnParticle({alive:true,x,y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,born,life,radius,color,front:true});}
}
/** @param {import('../contracts.d.ts').RenderSnapshot} view */
function syncPresentationEffects(view){
 if(fx.tick!==null&&view.tick<fx.tick)resetPresentationEffects();
 if(FX_FROZEN.has(view.phase)||fx.tick===view.tick)return;
 const simple=simpleEffects(),current=new Map();
 for(const entity of view.entities)current.set(entity.id,{hp:entity.hp,x:entity.position.x,y:entity.position.y,kind:entity.kind,spriteId:entity.spriteId,team:entity.team,radius:entity.radius,progress:entity.objectiveProgress??0,required:entity.objectiveRequired??0});
 if(fx.tick!==null){
  const explained=new Set();
  for(const [id,prev] of fx.prev){
   if(current.has(id))continue;
   if(prev.spriteId==='world_extraction'&&prev.progress>0){emitBurst(prev.x,prev.y,12,'#FFF8E7',22,8,2.2,view.tick,simple,4.4);continue;}
   if(prev.kind==='projectile'){
    emitBurst(prev.x,prev.y,4+(fxHash(id)%3),factionColor(prev.spriteId,prev.kind,prev.team),11,5,2.4,view.tick,simple,2.6);
    let nearest=/** @type {string|null} */(null),best=48*48;
    for(const [otherId,now] of current){const before=fx.prev.get(otherId);if(!before||now.hp>=before.hp-0.01)continue;const distance=(now.x-prev.x)**2+(now.y-prev.y)**2;if(distance<=best){best=distance;nearest=otherId;}}
    if(nearest){explained.add(nearest);fx.hits.set(nearest,view.tick);}
   }else if(['player','enemy','companion','decoy'].includes(prev.kind)&&prev.spriteId!=='grok_rocket')emitBurst(prev.x,prev.y,8+(fxHash(id)%5),factionColor(prev.spriteId,prev.kind,prev.team),19,9,3.4,view.tick,simple,4.2);
  }
  for(const [id,now] of current){
   const prev=fx.prev.get(id);
   if(!prev){if(now.spriteId==='world_blast'){const slot=fx.shocks[fx.shockCursor%SHOCK_LIMIT];fx.shockCursor++;Object.assign(slot,{alive:true,x:now.x,y:now.y,born:view.tick,life:12,radius:Math.max(36,now.radius)});if(!simple){fx.shakeBorn=view.tick;fx.shakeAmp=3+(fxHash(id)%3);}}continue;}
   if(now.hp<prev.hp-0.01&&!explained.has(id)&&!['pickup','projectile'].includes(now.kind)){emitBurst(now.x,now.y,4+(fxHash(`${id}:hit`)%3),factionColor(now.spriteId,now.kind,now.team),11,5,2.1,view.tick,simple,2.6);fx.hits.set(id,view.tick);}
   if(now.spriteId==='distilled_bot'&&Math.hypot(now.x-prev.x,now.y-prev.y)>0.4){let trail=false;for(let tick=(fx.tick??view.tick)+1;tick<=view.tick;tick++)if(tick%(simple?6:3)===0)trail=true;if(trail)spawnParticle({alive:true,x:now.x,y:now.y-8,vx:0,vy:-0.12,born:view.tick,life:18,radius:3.2,color:'#A9C0FF',front:false});}
   if(now.spriteId==='world_extraction'&&now.progress>prev.progress){spawnParticle({alive:true,x:now.x+(fxHash(`${id}:${view.tick}`)%7)-3,y:now.y-8,vx:0,vy:-1.1,born:view.tick,life:26,radius:3.4,color:'#75D7ED',front:true});if(now.required>0&&prev.progress<now.required&&now.progress>=now.required)emitBurst(now.x,now.y,10,'#F4B77F',20,8,2.1,view.tick,simple,4);}
  }
 }
 for(const [id,born] of [...fx.hits])if((view.tick-born)*1000/60>=120)fx.hits.delete(id);
 fx.prev=current;fx.tick=view.tick;
}
function presentationShake(){
 if(simpleEffects()||fx.shakeAmp<=0||fx.tick===null)return {x:0,y:0};
 const age=fx.tick-fx.shakeBorn,duration=140/1000*60;if(age<0||age>=duration)return {x:0,y:0};
 const fall=1-age/duration,angle=(fxHash(String(fx.shakeBorn))%360)*Math.PI/180;return {x:Math.cos(angle)*fx.shakeAmp*fall,y:Math.sin(angle)*fx.shakeAmp*fall};
}
/** @param {CanvasRenderingContext2D} ctx @param {boolean} front */
function drawPresentationEffects(ctx,front){
 const now=fx.tick??0;
 for(const particle of fx.particles){
  if(particle.front!==front||!particle.alive)continue;
  const age=now-particle.born;if(age<0||age>=particle.life)continue;
  const t=age/particle.life,travel=age-age*age/(2*particle.life);
  ctx.save();ctx.globalAlpha=1-t;ctx.fillStyle=particle.color;ctx.beginPath();ctx.arc(particle.x+particle.vx*travel,particle.y+particle.vy*travel,Math.max(0.4,particle.radius*(1-t)),0,Math.PI*2);ctx.fill();ctx.restore();
 }
 if(!front)return;
 for(const shock of fx.shocks){
  if(!shock.alive)continue;const age=now-shock.born;if(age<0||age>=shock.life)continue;const t=age/shock.life;
  ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle='#F3D7A4';ctx.lineWidth=4+(0.5-4)*t;ctx.beginPath();ctx.arc(shock.x,shock.y,6+(shock.radius-6)*t,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
}
/** @param {import('../contracts.d.ts').RenderEntity} entity @param {import('./characters.js').Pose} pose */
function poseFor(entity,pose){
 const born=fx.hits.get(entity.id);if(born===undefined||fx.tick===null)return pose;
 const ageMs=(fx.tick-born)*1000/60;if(ageMs<0||ageMs>=120)return pose;
 const t=ageMs/120;return {...pose,scaleX:1.16+(1-1.16)*t,scaleY:0.84+(1-0.84)*t,flash:ageMs<60};
}
/** @param {CanvasRenderingContext2D} ctx @param {string} name @param {number} x @param {number} y @param {number} size @param {import('./characters.js').Pose} pose @param {import('../contracts.d.ts').RenderEntity} entity */
function drawActor(ctx,name,x,y,size,pose,entity){return drawCharacter(ctx,name,x,y,size,poseFor(entity,pose));}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {import('./characters.js').Pose} pose */
function drawDistilled(ctx,x,y,pose){
 const doc=ctx.canvas.ownerDocument;if(!doc)return;
 if(!distilledCanvas){distilledCanvas=doc.createElement('canvas');distilledCanvas.width=96;distilledCanvas.height=96;}
 const off=distilledCanvas.getContext('2d');if(!off)return;
 off.setTransform(1,0,0,1,0,0);off.clearRect(0,0,96,96);off.imageSmoothingEnabled=false;
 if(!drawCharacter(off,'grok',48,48,40,pose))return;
 if(!pose.flash){off.globalCompositeOperation='source-atop';off.fillStyle='#6B7BFF';off.fillRect(0,0,96,96);off.globalCompositeOperation='source-over';}
 ctx.save();ctx.globalAlpha*=pose.flash?1:0.65;ctx.drawImage(distilledCanvas,Math.round(x-48),Math.round(y-48));ctx.restore();
}
/** @param {CanvasRenderingContext2D} ctx @param {{x:number;y:number;scale:number}} camera @param {number} width @param {number} height @param {{width:number;height:number}} map */
function drawSeabed(ctx,camera,width,height,map){
 const colors=['#14384A','#163D4E','#184556'];
 const left=Math.max(0,Math.floor(camera.x/32)*32),top=Math.max(0,Math.floor(camera.y/32)*32);
 const right=Math.min(map.width,camera.x+width/camera.scale+32),bottom=Math.min(map.height,camera.y+height/camera.scale+32);
 for(let ty=top;ty<bottom;ty+=32)for(let tx=left;tx<right;tx+=32){
  const h=fxHash(`${tx}:${ty}`);ctx.fillStyle=colors[h%3];ctx.fillRect(tx,ty,32,32);
  if(h%5===0){ctx.fillStyle='#1C4C5A';ctx.fillRect(tx+(h%14),ty+10+((h>>3)%12),12,2);ctx.fillRect(tx+((h>>5)%12),ty+22,8,2);}
  if(h%23===0){const bx=tx+8+(h%14),by=ty+8+((h>>4)%12);ctx.fillStyle='#245868';ctx.fillRect(bx,by,4,4);ctx.fillStyle=colors[h%3];ctx.fillRect(bx+1,by+1,2,2);}
 }
}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} w @param {number} h @param {string} fill */
function pixelBlock(ctx,x,y,w,h,fill){ctx.fillStyle='#111';ctx.fillRect(x-2,y-2,w+4,h+4);ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {string} text */
function pixelLabel(ctx,x,y,text){ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#111';ctx.fillText(text,x+1,y+1);ctx.fillStyle='#F4EFE0';ctx.fillText(text,x,y);}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} radius */
function drawCoral(ctx,x,y,radius){
 const r=Math.max(18,radius);
 pixelBlock(ctx,x-r*.15,y-r*.05,r*.7,r*.85,'#1D6A52');
 pixelBlock(ctx,x-r*.72,y+r*.08,r*.42,r*.5,'#248F68');
 pixelBlock(ctx,x+r*.28,y-r*.42,r*.32,r*.48,'#166B4E');
}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {boolean} open */
function drawCrate(ctx,x,y,open){
 pixelBlock(ctx,x-18,y-14,36,28,open?'#6B5344':'#C4A574');
 ctx.fillStyle='#111';ctx.fillRect(x-2,y-12,4,24);ctx.fillRect(x-16,y-2,32,4);
 if(!open){ctx.fillStyle='#8A6230';ctx.fillRect(x-12,y-10,8,5);}
}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {boolean} lit @param {number} tick */
function drawBuoy(ctx,x,y,lit,tick){
 pixelBlock(ctx,x-3,y-4,6,34,'#5C4632');
 pixelBlock(ctx,x-14,y-26,20,14,lit&&tick%20<10?'#FFF8E7':'#75D7ED');
 ctx.fillStyle='#111';ctx.fillRect(x-2,y-22,4,6);
}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {string} fill */
function drawShell(ctx,x,y,fill){pixelBlock(ctx,x-8,y-3,16,10,fill);ctx.fillStyle='#111';ctx.fillRect(x-5,y,10,2);ctx.fillRect(x-1,y-1,2,6);}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y */
function drawBlindBox(ctx,x,y){pixelBlock(ctx,x-12,y-10,24,22,'#5B7CFF');pixelBlock(ctx,x-8,y-16,16,6,'#75D7ED');ctx.fillStyle='#111';ctx.fillRect(x-2,y-6,4,10);ctx.fillRect(x-6,y-2,12,4);}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {boolean} rare */
function drawWeaponDrop(ctx,x,y,rare){pixelBlock(ctx,x-16,y-5,28,12,rare?'#F4B77F':'#75D7ED');pixelBlock(ctx,x+8,y-9,8,8,'#F4EFE0');}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} radius @param {number} progress @param {number} required @param {number} tick */
function drawExtractionPillar(ctx,x,y,radius,progress,required,tick){
 pixelBlock(ctx,x-18,y+10,36,12,'#1D4E63');
 for(let i=0;i<4;i++){const bob=(tick+i*9)%28,by=y+4-i*14-bob*.25,s=8+(i%2)*4;ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x,by,s/2+2,0,Math.PI*2);ctx.fill();ctx.fillStyle=progress>0?'#FFF8E7':'#75D7ED';ctx.beginPath();ctx.arc(x,by,s/2,0,Math.PI*2);ctx.fill();}
 ctx.strokeStyle='#111';ctx.lineWidth=6;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle=progress>0?'#FFF8E7':'#75D7ED';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,radius,progress>0?-Math.PI/2:0,progress>0?-Math.PI/2+Math.PI*2*progress:Math.PI*2);ctx.stroke();
 const seconds=required>0?Math.max(0,(required-progress)/60):0;
 pixelLabel(ctx,x,y-radius-10,progress>0?seconds.toFixed(1):'撤离');
}
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} radius @param {'bsod'|'null-signal'} kind @param {boolean} drawn */
function drawEliteMark(ctx,x,y,radius,kind,drawn){
 const w=radius*2+8,h=radius*2+12;
 if(!drawn){pixelBlock(ctx,x-radius,y-radius-2,w-8,h-8,kind==='bsod'?'#1A3A8A':'#102838');ctx.fillStyle=kind==='bsod'?'#75D7ED':'#F4EFE0';for(let row=0;row<4;row++)ctx.fillRect(x-radius+6,y-radius+6+row*6,radius-4-(row%2)*8,2);}
 ctx.strokeStyle='#111';ctx.lineWidth=4;ctx.strokeRect(x-radius-4,y-radius-6,w,h);
 ctx.strokeStyle=kind==='bsod'?'#5B7CFF':'#F4EFE0';ctx.lineWidth=2;ctx.strokeRect(x-radius-1,y-radius-3,w-6,h-6);
}
/** Camera projection shared by drawing and pointer-to-world mapping.
 * @implementationScope core-preview
 * @calls domain/geometry.js#computeCameraBounds
 * @param {import('../contracts.d.ts').RenderSnapshot} view
 * @param {number} width
 * @param {number} height
 * @returns {{x:number;y:number;scale:number}}
 */
export function getPreviewCamera(view, width, height) {
  const player = view.entities.find(entity => entity.kind === 'player');
  const hud = /** @type {{map:{width:number;height:number}}} */ (view.hud);
  const scale = Math.max(0.7, Math.min(1, width / 900, height / 600));
  const worldWidth = width / scale, worldHeight = height / scale;
  const bounds=computeCameraBounds(player?.position??{x:230,y:270},hud.map,{width:worldWidth,height:worldHeight});
  return {x:bounds.x,y:bounds.y,scale};
}
/** Draw one detached projection, including explicit telegraphs and geometry-sized hitboxes.
 * @implementationScope core-preview
 * @calls preview/characters.js#drawCharacter
 * @calls preview/characters.js#resolveCharacterModel
 * @calls preview/view.js#getPreviewCamera
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../contracts.d.ts').RenderSnapshot} view
 * @param {number} width
 * @param {number} height
 * @param {number} pixelRatio
 * @param {readonly {x:number;y:number;amount:number;tick:number}[]} popups
 * @returns {void}
 */
export function renderPreviewFrame(ctx,view,width,height,pixelRatio,popups=[]) {
  const camera=getPreviewCamera(view,width,height);
  syncPresentationEffects(view);
  if(resetWave){resetWave=false;const fish=view.entities.find(entity=>entity.kind==='player');if(fish){const slot=fx.shocks[fx.shockCursor%SHOCK_LIMIT];fx.shockCursor++;Object.assign(slot,{alive:true,x:fish.position.x,y:fish.position.y,born:view.tick,life:18,radius:150});fx.shakeBorn=view.tick;fx.shakeAmp=5;}}
  const shake=presentationShake();
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#0F2C3D';ctx.fillRect(0,0,width,height);
  ctx.save();if(shake.x||shake.y)ctx.translate(shake.x,shake.y);ctx.scale(camera.scale,camera.scale);ctx.translate(-camera.x,-camera.y);
  const hud=/** @type {{map:{width:number;height:number};invulnerable:boolean;aim:{x:number;y:number};rice:number;skillId?:string;skillTemplateId?:string;skillCooldown?:number;aimDistance?:number;overclock?:boolean}} */ (view.hud);
  drawSeabed(ctx,camera,width,height,hud.map);
  ctx.strokeStyle='#1E4A58';ctx.lineWidth=3;ctx.strokeRect(1,1,hud.map.width-2,hud.map.height-2);
  drawPresentationEffects(ctx,false);
  const fish=view.entities.find(e=>e.kind==='player'),skillTemplate=hud.skillTemplateId??hud.skillId??'';if(fish&&['skill_batch','skill_sandbox'].includes(skillTemplate)&&Number(hud.skillCooldown??0)<=0&&['exploring','boss'].includes(view.phase)){const distance=hud.aimDistance??400,cx=Math.max(0,Math.min(hud.map.width,fish.position.x+hud.aim.x*distance)),cy=Math.max(0,Math.min(hud.map.height,fish.position.y+hud.aim.y*distance));ctx.strokeStyle='#e1ddbc55';ctx.setLineDash([5,7]);ctx.beginPath();ctx.arc(cx,cy,skillTemplate==='skill_batch'?130:160,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  const sorted=[...view.entities].sort((a,b)=>a.position.y-b.position.y||(a.id<b.id?-1:a.id>b.id?1:0));
  for(const entity of sorted){
    const {x,y}=entity.position;
    if(x<camera.x-100||y<camera.y-100||x>camera.x+width/camera.scale+100||y>camera.y+height/camera.scale+100)continue;
    ctx.fillStyle='#061d2855';ctx.beginPath();ctx.ellipse(x,y+entity.radius*.8,entity.radius*1.15,entity.radius*.38,0,0,Math.PI*2);ctx.fill();
    if(entity.kind==='pickup'&&['gpuFragment','part'].includes(entity.spriteId)){drawShell(ctx,x,y,entity.spriteId==='gpuFragment'?'#75D7ED':'#C4A574');continue;}
    if(entity.kind==='pickup'&&entity.spriteId==='skill'){drawBlindBox(ctx,x,y);pixelLabel(ctx,x,y+28,`${entity.modelLabel??'技能'} · F`);continue;}
    if(entity.spriteId==='world_escort'){ctx.fillStyle='#a9d9c9';ctx.fillRect(x-22,y-17,44,32);ctx.fillStyle='#dbe9c6';ctx.fillRect(x-16,y-25,32,10);ctx.fillStyle='#315961';ctx.fillRect(x-12,y-8,6,6);ctx.fillRect(x+6,y-8,6,6);ctx.fillRect(x-12,y+16,8,5);ctx.fillRect(x+4,y+16,8,5);ctx.strokeStyle='#dfe8c3';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+Math.cos(entity.facingRadians)*29,y+Math.sin(entity.facingRadians)*29);ctx.lineTo(x+Math.cos(entity.facingRadians)*39,y+Math.sin(entity.facingRadians)*39);ctx.stroke();ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#e9edd4';ctx.fillText(entity.modelLabel??'补给机器人',x,y+42);continue;}
    if(entity.spriteId==='world_blockade_core'||entity.spriteId==='world_blockade_relay'){const relay=entity.spriteId==='world_blockade_relay';ctx.fillStyle=relay?'#d2b278':'#a69cc5';ctx.fillRect(x-entity.radius,y-entity.radius,entity.radius*2,entity.radius*2);ctx.strokeStyle='#e6d7aa';ctx.lineWidth=3;ctx.strokeRect(x-entity.radius-4,y-entity.radius-4,entity.radius*2+8,entity.radius*2+8);ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#efe9cc';ctx.fillText(`${relay?'供能柱':entity.modelLabel} · ${Math.ceil(entity.hp)}`,x,y+entity.radius+24);continue;}
    if(entity.spriteId==='world_blockade'){ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillStyle='#cdb5db';ctx.fillText(entity.opened?'封锁已解除':`解除封锁 ${entity.objectiveProgress??0}/4`,x,y-65);continue;}
    if(entity.spriteId==='world_rest'){ctx.strokeStyle='#c2d4cc';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,25,0,Math.PI);ctx.stroke();ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#eee3ba';ctx.fillText(entity.modelLabel??'独立休整',x,y+42);continue;}
    if(entity.spriteId==='world_signal'){drawBuoy(ctx,x,y,true,view.tick);pixelLabel(ctx,x,y+42,`信号 ${Math.ceil(entity.hp)}`);continue;}
    if(entity.spriteId==='world_challenge'){ctx.fillStyle=entity.opened?'#789b86':'#b69e88';ctx.fillRect(x-24,y-20,48,40);ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#ebdcb8';ctx.fillText(entity.opened?'挑战完成':`${entity.modelLabel??'挑战'}${entity.unlocked?' · F':' · 已启动'}`,x,y+40);continue;}
    if(entity.spriteId==='terrain_shortcut'){ctx.strokeStyle=entity.unlocked?'#82baa8':'#bc9278';ctx.lineWidth=4;ctx.setLineDash(entity.unlocked?[5,8]:[]);ctx.strokeRect(x-40,y-40,80,80);ctx.setLineDash([]);ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle='#e5dbb7';ctx.fillText(entity.unlocked?'捷径开放':'捷径暂闭',x,y+58);continue;}
    if(entity.spriteId==='world_current'){ctx.strokeStyle=entity.currentWarning?'#f0cf8a':'#78b8c5';ctx.setLineDash([7,8]);ctx.beginPath();ctx.arc(x,y,entity.radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#a7d6d5';ctx.font='24px system-ui';ctx.textAlign='center';ctx.fillText(entity.currentDirection===1?'→ → →':'← ← ←',x,y);ctx.font='11px system-ui';ctx.fillText(entity.currentWarning?'3秒内转向':'水流 +60',x,y+22);continue;}
    if(entity.spriteId==='world_alarm'){drawCrate(ctx,x,y,entity.opened===true);pixelLabel(ctx,x,y+36,entity.opened?'已开启':entity.alarmArmed?'再按 F':'警报箱 · F');continue;}
    if(entity.spriteId==='terrain_breakable'){drawCrate(ctx,x,y,false);pixelLabel(ctx,x,y+36,`可破坏 · ${Math.ceil(entity.hp)}`);continue;}
    if(entity.petZone){const draft=entity.id.includes(':draft:'),r=entity.effectRadius??70;ctx.strokeStyle=entity.petZone==='answerDanger'?'#ee977b':entity.petZone==='answerSafe'?'#8ecbd9':entity.petZone==='answerUnknown'?'#c6b3dc':entity.petZone==='fire'?'#e5996c':'#a5ce86';ctx.fillStyle=entity.petZone==='answerDanger'?'#ed8d6b66':entity.petZone==='answerSafe'?'#83b7c51a':entity.telegraphRemaining>0?'#ddc89718':entity.petZone==='fire'?'#d5765f55':'#92ba7544';ctx.setLineDash(entity.telegraphRemaining>0?[7,5]:[]);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);if(entity.linkEnd){ctx.strokeStyle='#a3ce84';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(entity.linkEnd.x,entity.linkEnd.y);ctx.stroke();}if(entity.spriteId==='gpt_core'){ctx.fillStyle='#d8dfb4';ctx.fillRect(x-6,y-8,12,16);}if(draft){ctx.fillStyle='#f4efe0';ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText(entity.id.endsWith(':0')?'草稿 A':'草稿 B',x,y+4);}continue;}
    if(entity.petCast&&typeof entity.petCast==='object'&&!Array.isArray(entity.petCast)){const cast=/** @type {{point:import('../contracts.d.ts').Vec2;executeAt:number}} */(entity.petCast);ctx.strokeStyle='#e9c995';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(cast.point.x,cast.point.y);ctx.stroke();ctx.setLineDash([]);}
    if(entity.abilityKind&&entity.kind!=='decoy'){const kind=entity.abilityKind;ctx.strokeStyle=kind==='batch'?'#e7c68a':kind==='sandbox'?'#a9d997':'#bddaf5';ctx.fillStyle=kind==='sandbox'?'#a4d38b22':kind==='batch'?'#e2c28c22':'#afd8f311';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,entity.radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#e9ead5';ctx.fillText(kind==='batch'?`批量处理 ${entity.telegraphRemaining.toFixed(1)}`:kind==='redirect'?`反射 ${entity.reflected??0}/12`:kind==='queued'?'延迟调用':kind==='trail'?'尾流':'沙箱',x,y-entity.radius-8);continue;}
    if(entity.kind==='decoy'){ctx.globalAlpha=.45;drawActor(ctx,'deepseek',x,y,80,{tick:view.tick,moving:entity.moving,attacking:entity.attacking,facing:entity.facingRadians,horizontal:entity.horizontalFacing,hopPhase:entity.hopPhase,controlled:entity.statusLabels?.includes('root')},entity);ctx.globalAlpha=1;if(entity.hp>1){ctx.fillStyle='#0c2530';ctx.fillRect(x-18,y-52,36,4);ctx.fillStyle='#8fd0ff';ctx.fillRect(x-18,y-52,36*Math.max(0,entity.hpFraction),4);}continue;}
    if(entity.dashWarning&&typeof entity.dashWarning==='object'&&!Array.isArray(entity.dashWarning)){const warning=/** @type {{point:import('../contracts.d.ts').Vec2;remaining:number}} */(entity.dashWarning);ctx.strokeStyle='#f4b77f';ctx.lineWidth=4;ctx.setLineDash([8,6]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(warning.point.x,warning.point.y);ctx.stroke();ctx.setLineDash([]);}
    const model=resolveCharacterModel(entity.spriteId);
    const stage=entity.modelStage??(/mythos|fable/i.test(entity.modelLabel??'')?3:/opus/i.test(entity.modelLabel??'')?2:/sonnet/i.test(entity.modelLabel??'')?1:0);
    const pose={tick:view.tick,moving:entity.moving,attacking:entity.attacking||entity.telegraphRemaining>0,facing:entity.facingRadians,horizontal:entity.horizontalFacing,hopPhase:entity.hopPhase,stage,hurt:popups.some(p=>Math.hypot(p.x-x,p.y-y)<entity.radius&&view.tick-p.tick>=0&&view.tick-p.tick<5),controlled:entity.statusLabels?.some(s=>['root','stun','companionBan'].includes(s))};
    if(entity.kind==='companion'){
      const banned=entity.statusLabels.includes('companionBan');ctx.globalAlpha=banned?.35:1;if(!drawActor(ctx,model??'',x,y,40,pose,entity)){ctx.save();ctx.translate(x,y);ctx.scale((entity.horizontalFacing??1)<0?-1:1,1);ctx.fillStyle=entity.spriteId==='companion_rice'?'#eee8cf':entity.spriteId==='companion_patch'?'#a1d6a0':entity.spriteId==='companion_rocket'?'#e4a278':'#a8bde0';ctx.fillRect(-10,-9,20,18);ctx.fillStyle='#31505b';ctx.fillRect(-6,-4,3,4);ctx.fillRect(3,-4,3,4);ctx.restore();}ctx.globalAlpha=1;
      ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle='#d5e1d0';ctx.fillText(`${entity.modelLabel??'伙伴'}${model==='deepseek'?' · DeepSeek':''}`,x,y+27);if(banned){ctx.strokeStyle='#d8947d';ctx.strokeRect(x-17,y-17,34,34);}continue;
    }
    if(entity.spriteId.startsWith('enemy_gpt_')){
      const name=model==='bsod'?'蓝屏':model==='null-signal'?'断网':entity.spriteId.slice(10),r=entity.radius,elite=model==='bsod'||model==='null-signal';
      const drawn=drawActor(ctx,model??'codex',x,y,Math.max(40,r*2.4),pose,entity);
      if(elite)drawEliteMark(ctx,x,y,r,model==='bsod'?'bsod':'null-signal',drawn);
      if(Number(entity.guardHp)>0){ctx.strokeStyle='#d6e0dd';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,r+5,entity.facingRadians-Math.PI/3,entity.facingRadians+Math.PI/3);ctx.stroke();}
      ctx.fillStyle='#eee2c8';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(`${name} · ${entity.modelLabel??'Luna'}`,x,y-r-12);ctx.fillStyle='#533f3d';ctx.fillRect(x-18,y+r+6,36,4);ctx.fillStyle='#cebd95';ctx.fillRect(x-18,y+r+6,36*entity.hpFraction,4);continue;
    }
    if(entity.spriteId==='claude_ban_projectile'){ctx.strokeStyle='#e0a188';ctx.lineWidth=3;ctx.strokeRect(x-12,y-12,24,24);ctx.fillStyle='#edc4a0';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(String(Math.ceil(entity.hp)),x,y+4);continue;}
    if(entity.kind==='pickup'&&entity.spriteId==='weapon'){drawWeaponDrop(ctx,x,y,(entity.quality??0)>0);pixelLabel(ctx,x,y+26,`${entity.modelLabel??'MCP'} · F`);continue;}
    if(entity.kind==='pickup'){drawRiceBowl(ctx,x,y);continue;}
    if(entity.spriteId==='terrain_clutter'){drawCoral(ctx,x,y,22);continue;}
    if(entity.kind==='obstacle'){drawCoral(ctx,x,y,entity.radius);continue;}
    if(entity.spriteId==='world_beacon'){const required=entity.objectiveRequired??2100,progress=(entity.objectiveProgress??0)/required,working=!!fish&&Math.hypot(fish.position.x-x,fish.position.y-y)<=120&&progress<1;ctx.strokeStyle=progress>=1?'#8EE0A8':'#245868';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,120,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#FFF8E7';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,120,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,Math.min(1,progress)));ctx.stroke();drawBuoy(ctx,x,y,progress>=1||working,view.tick);pixelLabel(ctx,x,y+46,progress>=1?'已点亮':working?`工作中 ${Math.floor(progress*required/60)}/${Math.round(required/60)}`:'工作区');continue;}
    if(entity.spriteId==='world_extraction'){drawExtractionPillar(ctx,x,y,entity.radius,entity.objectiveProgress??0,entity.objectiveRequired??180,view.tick);continue;}
    if(entity.spriteId==='world_gate'){const open=entity.unlocked===true;pixelBlock(ctx,x-34,y-28,12,64,open?'#8EE0A8':'#6B5344');pixelBlock(ctx,x+22,y-28,12,64,open?'#8EE0A8':'#6B5344');pixelBlock(ctx,x-34,y-40,68,14,open?'#C4A574':'#5C4632');pixelLabel(ctx,x,y+52,entity.modelLabel??(open?'首领入口 · F':'完成任意两个目标'));continue;}
    if(entity.spriteId.startsWith('easter_')){const consoleEgg=entity.spriteId==='easter_console';if(consoleEgg){pixelBlock(ctx,x-14,y-12,28,22,entity.opened?'#245868':'#1A3A8A');ctx.fillStyle='#75D7ED';ctx.fillRect(x-8,y-6,16,2);ctx.fillRect(x-8,y-1,10,2);}else if(entity.spriteId==='easter_lunchbox')drawCrate(ctx,x,y,entity.opened===true);else drawShell(ctx,x,y,entity.opened?'#6B8F78':'#F4EFE0');const labels=/** @type {Record<string,string>} */({easter_chair:'坐下 · F',easter_note:'留言 · F',easter_lunchbox:'找齐留言 · F',easter_console:'蓝屏彩蛋 · F',easter_interface:entity.modelLabel??'射击接口'});pixelLabel(ctx,x,y+32,entity.opened?'已发现':labels[entity.spriteId]??'秘密');continue;}
    if(entity.spriteId==='world_cache'){drawCrate(ctx,x,y,entity.opened===true);pixelLabel(ctx,x,y+36,entity.opened?'已打开':entity.modelLabel??'补给箱 · F');continue;}
    if(entity.spriteId==='claude_seal'){ctx.strokeStyle='#db967c';ctx.lineWidth=3;ctx.strokeRect(x-17,y-17,34,34);ctx.fillStyle='#e8c6a3';ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText(`${Math.ceil(entity.hp)}击`,x,y+5);continue;}
    if(entity.spriteId==='world_blast'){ctx.strokeStyle='#eebd82';ctx.fillStyle='#f8c47622';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,entity.radius,0,Math.PI*2);ctx.fill();ctx.stroke();continue;}
    if(entity.id.startsWith('rescue:')){const lines={'companion_patch':['封禁装置把我卡在这里了。','分我一口大白饭，我跟你走。'],'companion_cache':['两个箱子我都看见了。','分我一口，我帮你记路。'],'companion_router':['你已经摸到两把接口了。','分我一口，我帮你换着打。'],'companion_decoy':['刚才那次重置被你拆穿了。','分我一口，我留个替身给你。']};const pair=entity.spriteId==='companion_patch'?lines.companion_patch:entity.spriteId==='companion_cache'?lines.companion_cache:entity.spriteId==='companion_router'?lines.companion_router:entity.spriteId==='companion_decoy'?lines.companion_decoy:['我有点虚。','分我一口大白饭。'];const riceHud=Number(/** @type {{rice?:number}|null} */(view.hud&&typeof view.hud==='object'&&!Array.isArray(view.hud)?view.hud:null)?.rice??0);const line=riceHud<1&&!view.entities.some(other=>other.spriteId==='riceXp'&&Math.hypot(other.position.x-x,other.position.y-y)<=96)?'先去捡一口大白饭。':pair[Math.floor(view.tick/120)%2];ctx.globalAlpha=.6;drawActor(ctx,entity.spriteId==='companion_patch'?'claude':entity.spriteId==='companion_router'?'grok':'deepseek',x,y,52,{tick:view.tick,moving:false,attacking:false,facing:0,horizontal:1,hopPhase:16},entity);ctx.globalAlpha=1;ctx.fillStyle='#0c2530ee';ctx.fillRect(x-78,y-58,156,22);ctx.fillStyle='#f4efe0';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText(line,x,y-43);continue;}
    if(entity.kind==='objective'){
      const pulse=2+Math.sin(view.tick/35)*2;ctx.strokeStyle='#b5dbba44';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,38+pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#8dbbb0';ctx.fillRect(x-17,y-8,34,20);ctx.fillStyle='#d7e7ca';ctx.fillRect(x-12,y-13,24,8);ctx.fillStyle='#446b65';ctx.fillRect(x-8,y-3,16,5);ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#c8e6d4';ctx.fillText('检查点 · F',x,y+49);continue;
    }
    if(entity.spriteId==='distilled_bot'){drawDistilled(ctx,x,y,poseFor(entity,{tick:view.tick,moving:entity.moving,facing:entity.facingRadians,horizontal:entity.horizontalFacing,hopPhase:entity.hopPhase}));continue;}
    if(entity.spriteId==='distilled_bubble'){ctx.fillStyle='#c9afff';ctx.beginPath();ctx.arc(x,y,entity.radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#eee2ff';ctx.stroke();continue;}
    if(entity.kind==='projectile'){
      const style=entity.projectileStyle??'';let drawX=x,drawY=y;
      // Player bubbles already leave the body at radius 16 + projectile radius + 1. Pull any that still sit behind the cannon mouth up to that mouth. Collision stays on the real position.
      if(fish&&style.startsWith('mcp_')){const dx=x-fish.position.x,dy=y-fish.position.y,along=dx*Math.cos(entity.facingRadians)+dy*Math.sin(entity.facingRadians),mouth=42;if(along>0&&along<mouth){drawX+=Math.cos(entity.facingRadians)*(mouth-along);drawY+=Math.sin(entity.facingRadians)*(mouth-along);}}
      ctx.fillStyle=style==='mcp_batch'?'#efb27b':style==='mcp_return'?'#c8a0ee':style==='mcp_vector'?'#a7e2bc':style==='mcp_stream'?'#9fd9ec':'#bceff6';
      if(style==='mcp_vector'){ctx.save();ctx.translate(drawX,drawY);ctx.rotate(entity.facingRadians);ctx.fillRect(-14,-2,28,4);ctx.restore();continue;}
      ctx.beginPath();ctx.arc(drawX,drawY,entity.radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle=(entity.quality??0)===2?'#dfb5ff':(entity.quality??0)===1?'#f3da94':'#f1ffff';ctx.lineWidth=1.5;ctx.stroke();
      if(style==='mcp_return'){ctx.beginPath();ctx.arc(drawX,drawY,entity.radius+4,entity.facingRadians,entity.facingRadians+Math.PI*1.5);ctx.stroke();}ctx.fillStyle='#fff';ctx.fillRect(drawX-entity.radius*.3,drawY-entity.radius*.5,2,2);continue;}

    if(entity.kind==='player'){
      const footY=y+46,rx=42,ry=15,hp=Math.max(0,Math.min(1,entity.hpFraction??0)),shield=Number(entity.shieldAmount??0),skillReady=Number(hud.skillCooldown??1)<=0;
      const rim=(/** @type {number} */ ang,/** @type {number} */ outerX,/** @type {number} */ outerY)=>{const ux=Math.cos(ang),uy=Math.sin(ang),t=1/Math.hypot(ux/outerX,uy/outerY);return {x:x+ux*t,y:footY+uy*t};};
      ctx.lineCap='round';ctx.lineWidth=4;ctx.strokeStyle='#244659cc';ctx.beginPath();ctx.ellipse(x,footY,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#f19b91';ctx.beginPath();ctx.ellipse(x,footY,rx,ry,0,-Math.PI/2,-Math.PI/2+Math.PI*2*hp);ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle='#1c3d4ecc';ctx.beginPath();ctx.ellipse(x,footY,28,10,0,0,Math.PI*2);ctx.stroke();const inner=shield>0?Math.min(1,shield/20):skillReady?1:0;if(inner>0){ctx.strokeStyle=shield>0?'#9bdef0':'#8ee0a8';ctx.beginPath();ctx.ellipse(x,footY,28,10,0,-Math.PI/2,-Math.PI/2+Math.PI*2*inner);ctx.stroke();}
      const foes=view.entities.filter(other=>other.kind==='enemy'&&(other.hp??1)>0);const aimAt=foes.find(other=>String(other.spriteId).startsWith('boss_'))??foes.reduce((best,other)=>!best||Math.hypot(other.position.x-x,other.position.y-y)<Math.hypot(best.position.x-x,best.position.y-y)?other:best,/** @type {typeof foes[number]|null} */(null));if(aimAt){const ang=Math.atan2(aimAt.position.y-footY,aimAt.position.x-x),tip=rim(ang,rx+16,ry+6),left=rim(ang+.55,rx,ry),right=rim(ang-.55,rx,ry);ctx.fillStyle='#f4e7c2';ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(left.x,left.y);ctx.lineTo(right.x,right.y);ctx.fill();}
      if(hud.overclock){ctx.strokeStyle='#ef997b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,31+Math.sin(view.tick/4)*2,0,Math.PI*2);ctx.stroke();}
      if(entity.shieldAmount>0){ctx.strokeStyle='#9bdef0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,29,0,Math.PI*2);ctx.stroke();}
      ctx.globalAlpha=hud.invulnerable&&view.tick%8<4?.55:1;drawActor(ctx,'deepseek',x,y,80,{tick:view.tick,moving:entity.moving,attacking:entity.attacking,facing:entity.facingRadians,horizontal:entity.horizontalFacing,hopPhase:entity.hopPhase,controlled:entity.statusLabels?.includes('root'),cannon:true},entity);ctx.globalAlpha=1;
      if(view.entities.some(other=>other.id!==entity.id&&Math.hypot(other.position.x-x,other.position.y-y)<=96&&(other.kind==='objective'||other.id.startsWith('rescue:')||other.kind==='pickup'&&['weapon','skill'].includes(String(other.spriteId))))){ctx.fillStyle='#0b2434';ctx.fillRect(x+rx+6,footY-16,18,18);ctx.fillStyle='#f4efe0';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('F',x+rx+15,footY-2);}
      ctx.strokeStyle='#d9e7df99';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+hud.aim.x*29,y+hud.aim.y*29);ctx.lineTo(x+hud.aim.x*42,y+hud.aim.y*42);ctx.stroke();continue;
    }
    if(['boss_gpt','boss_grok'].includes(entity.spriteId)){const warning=/** @type {{point?:import('../contracts.d.ts').Vec2;executeAt?:number}|null} */(entity.bossTelegraph);if(warning?.point){ctx.strokeStyle='#ecc4a2';ctx.lineWidth=3;ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(warning.point.x,warning.point.y);ctx.stroke();ctx.setLineDash([]);}drawActor(ctx,model??'grok',x,y,120,{...pose,stage:entity.spriteId==='boss_grok'?4:stage},entity);continue;}
    if(entity.spriteId==='grok_rocket'){ctx.fillStyle='#e0ae7d';ctx.save();ctx.translate(x,y);ctx.rotate(entity.facingRadians);ctx.fillRect(-15,-7,30,14);ctx.fillStyle='#ecce9c';ctx.fillRect(-21,-4,6,8);ctx.restore();continue;}
    if(entity.spriteId==='gpt_reset_node'||entity.spriteId==='gpt_node_marker'){ctx.strokeStyle=entity.spriteId==='gpt_reset_node'?'#f4d48d':'#a49abc';ctx.lineWidth=3;ctx.strokeRect(x-18,y-18,36,36);if(entity.spriteId==='gpt_reset_node'){ctx.fillStyle='#d2b482';ctx.fillRect(x-12,y-12,24,24);ctx.fillStyle='#f5e5c8';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(String(Math.ceil(entity.hp)),x,y+35);}continue;}
    if(entity.spriteId==='boss_claude'){drawBossWarning(ctx,entity,view.tick);ctx.save();ctx.translate(x,y);ctx.scale(2,2);drawActor(ctx,'claude',0,0,80,pose,entity);ctx.restore();}
    else if(entity.spriteId==='enemy_claude_guard'){
      if(entity.telegraphRemaining>0){ctx.save();ctx.translate(x,y);ctx.rotate(entity.facingRadians);ctx.fillStyle='#f1a46d33';ctx.strokeStyle='#f9bc81';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,70,-Math.PI/2,Math.PI/2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
      drawActor(ctx,'claude',x,y,Math.max(40,entity.radius*2.4),pose,entity);
      if(entity.weakArcDegrees!==null){
        // The pale arc marks the actual vulnerable side; the muted outline is the shell.
        const r=entity.radius+7,half=entity.weakArcDegrees*Math.PI/360,back=entity.facingRadians+Math.PI;
        ctx.lineWidth=3;ctx.strokeStyle='#9c715e';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='#ffe4b2';ctx.beginPath();ctx.arc(x,y,r,back-half,back+half);ctx.stroke();
      }
    }else if(entity.spriteId==='enemy_grok_bot'){
      drawActor(ctx,'grok',x,y,40,pose,entity);
    }
    if(entity.hpFraction<1&&entity.kind==='enemy'){ctx.fillStyle='#0c2530';ctx.fillRect(x-20,y-entity.radius-13,40,4);ctx.fillStyle='#e6a57f';ctx.fillRect(x-20,y-entity.radius-13,40*Math.max(0,entity.hpFraction),4);}
  }
  drawPresentationEffects(ctx,true);
  // Pickups are projected as dedicated display entities by the snapshot.
  for(const popup of popups){const age=(view.tick-popup.tick)/60;if(age<0||age>0.65)continue;ctx.globalAlpha=1-age/.65;ctx.fillStyle='#ffdfb8';ctx.textAlign='center';ctx.font='bold 14px system-ui';ctx.fillText(String(Math.round(popup.amount)),popup.x,popup.y-25-age*25);ctx.globalAlpha=1;}
  ctx.restore();
  if(width>=1000&&height>=500)drawMinimap(ctx,view,width);
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y */
function drawRiceBowl(ctx,x,y){
  ctx.fillStyle='#fffaf0';ctx.fillRect(x-5,y-8,10,3);ctx.fillRect(x-8,y-5,16,4);
  ctx.fillStyle='#dcecf1';ctx.fillRect(x-9,y-1,18,3);ctx.fillRect(x-7,y+2,14,4);ctx.fillRect(x-5,y+6,10,2);
  ctx.fillStyle='#6fa7bb';ctx.fillRect(x-9,y-1,18,2);ctx.fillRect(x-5,y+8,10,2);
}
/** @param {CanvasRenderingContext2D} ctx @param {import('../contracts.d.ts').RenderEntity} entity @param {number} tick */
function drawBossWarning(ctx,entity,tick){
 const move=/** @type {{kind:string;point:{x:number;y:number};facing:number;executeAt:number;strip:number}|null} */(entity.bossTelegraph??null);if(!move)return;
 ctx.strokeStyle='#f4bd8b';ctx.fillStyle='#df947a44';ctx.lineWidth=3;
 if(move.kind==='clamp'||move.kind==='strike'){ctx.beginPath();ctx.moveTo(entity.position.x,entity.position.y);ctx.arc(entity.position.x,entity.position.y,160,move.facing-Math.PI/4,move.facing+Math.PI/4);ctx.closePath();ctx.fill();ctx.stroke();}
 else if(move.kind==='sweep'){for(let i=move.strip;i<3;i++){ctx.globalAlpha=i===move.strip?1:.4;ctx.fillRect(move.point.x+(i-1)*180-45,move.point.y-400,90,800);ctx.strokeRect(move.point.x+(i-1)*180-45,move.point.y-400,90,800);}ctx.globalAlpha=1;}
 else {ctx.beginPath();ctx.arc(move.point.x,move.point.y,90,0,Math.PI*2);ctx.fill();ctx.stroke();}
 ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffe4bb';ctx.fillText(`${move.kind==='skillBan'?'技能封禁':move.kind==='companionBan'?'助战封禁':move.kind==='sweep'?'批量执法':'钳制'} ${Math.max(0,(move.executeAt-tick)/60).toFixed(1)}s`,move.point.x,move.point.y-110);
}

/** @param {CanvasRenderingContext2D} ctx @param {import('../contracts.d.ts').RenderSnapshot} view @param {number} width */
function drawMinimap(ctx,view,width){
 const hud=/** @type {{map:{width:number;height:number;exploredCells:readonly string[]};treeHints:boolean}} */(view.hud),scale=150/hud.map.width,x=width-174,y=130,seen=new Set(hud.map.exploredCells);
 ctx.save();ctx.translate(x,y);ctx.fillStyle='#071e29df';ctx.fillRect(-5,-5,160,hud.map.height*scale+10);ctx.strokeStyle='#85a19a55';ctx.strokeRect(-5,-5,160,hud.map.height*scale+10);ctx.fillStyle='#32565a';for(const id of seen){const[cx,cy]=id.split(':').map(Number);ctx.fillRect(cx*160*scale,cy*160*scale,160*scale,160*scale);}
 const player=view.entities.find(entity=>entity.kind==='player');for(const entity of view.entities){const interaction=['world_checkpoint','world_cache'].includes(entity.spriteId);if(interaction&&(!hud.treeHints||!player||Math.hypot(entity.position.x-player.position.x,entity.position.y-player.position.y)>300||entity.opened))continue;if(!['world_beacon','world_blockade','world_escort','world_gate','world_rest','world_checkpoint','world_cache','world_extraction'].includes(entity.spriteId)&&entity.kind!=='player')continue;const visible=seen.has(`${Math.floor(entity.position.x/160)}:${Math.floor(entity.position.y/160)}`);if(!visible&&entity.spriteId!=='world_extraction'&&!(entity.spriteId==='world_gate'&&entity.unlocked))continue;ctx.fillStyle=entity.kind==='player'?'#fff2cb':['world_beacon','world_blockade','world_escort'].includes(entity.spriteId)?'#acd295':'#d7a180';ctx.fillRect(entity.position.x*scale-2,entity.position.y*scale-2,4,4);}ctx.restore();
}
