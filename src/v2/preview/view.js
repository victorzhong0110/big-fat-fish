// @ts-check
import { computeCameraBounds } from '../domain/geometry.js';
/** Canvas presentation for the combat preview. Never mutates or simulates game state. */
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
const FISH = [
  '     wwwwwwww     ', '    wppwwwwppw    ', '   vvvvvvvvvvvv   ', '  vVVVVvvvvVVVVv  ', '  vVVfffffffVVVv  ', ' vVVffWfffWffVVv  ', ' vVVffkfffkffVVv  ', ' vVVffbfff bffVVv ', '  VVfffmmmfffVV   ', '  VVVffffffVVV   ', '  VVVwwwwwwVVV   ', '  fwwdwwwwdwwf   ', ' fffSSSSSSSSfff  ', '  GGGGGGGGGGGG   ', ' GSSSSSSSSSSSSG  ', ' GggggggggggggG  ', '  GggggggggggG   ', '   GGGGGGGGGG    ', '    dddddddd     ', '    dd    dd     ', '   vvv    vvv    ',
];
const PALETTE = { w:'#fff9f0',p:'#ddd7ef',v:'#8173cd',V:'#aaa1e6',f:'#ffe0c7',W:'#fff',k:'#384565',b:'#e89dac',m:'#bd6f82',d:'#657fa9',S:'#d6e2e5',G:'#8b9fa8',g:'#a8b9c2' };
/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y */
function drawFish(ctx,x,y) {
  const pixel=2;
  for(let row=0;row<FISH.length;row++)for(let column=0;column<FISH[row].length;column++){
    const color=PALETTE[/** @type {keyof typeof PALETTE} */ (FISH[row][column])];
    if(color){ctx.fillStyle=color;ctx.fillRect(Math.round(x-19+column*pixel),Math.round(y-24+row*pixel),pixel,pixel);}
  }
}
/** Draw one detached projection, including explicit telegraphs and geometry-sized hitboxes.
 * @implementationScope core-preview
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
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
  const gradient=ctx.createLinearGradient(0,0,width,height);gradient.addColorStop(0,'#163d46');gradient.addColorStop(1,'#092630');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  ctx.save();ctx.scale(camera.scale,camera.scale);ctx.translate(-camera.x,-camera.y);
  const hud=/** @type {{map:{width:number;height:number};invulnerable:boolean;aim:{x:number;y:number};rice:number}} */ (view.hud);
  const x0=Math.floor(camera.x/80)*80,y0=Math.floor(camera.y/80)*80;
  for(let x=x0;x<camera.x+width/camera.scale+80;x+=80)for(let y=y0;y<camera.y+height/camera.scale+80;y+=80){ctx.fillStyle='#2a5157';ctx.fillRect(x,y,2,2);if(((x/80)*7+(y/80)*3)%11===0){ctx.strokeStyle='#315a5a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+18,y+28);ctx.quadraticCurveTo(x+10,y+15,x+19,y+3);ctx.stroke();}}
  ctx.strokeStyle='#3b6267';ctx.lineWidth=3;ctx.strokeRect(1,1,hud.map.width-2,hud.map.height-2);
  const sorted=[...view.entities].sort((a,b)=>a.position.y-b.position.y||(a.id<b.id?-1:a.id>b.id?1:0));
  for(const entity of sorted){
    const {x,y}=entity.position;
    if(x<camera.x-100||y<camera.y-100||x>camera.x+width/camera.scale+100||y>camera.y+height/camera.scale+100)continue;
    ctx.fillStyle='#061d2855';ctx.beginPath();ctx.ellipse(x,y+entity.radius*.8,entity.radius*1.15,entity.radius*.38,0,0,Math.PI*2);ctx.fill();
    if(entity.kind==='pickup'&&entity.spriteId!=='riceXp'){ctx.fillStyle=entity.spriteId==='gpuFragment'?'#92cddf':'#b6bcb3';ctx.fillRect(x-7,y-5,14,10);ctx.strokeStyle='#f2ead1';ctx.strokeRect(x-5,y-3,10,6);continue;}
    if(entity.kind==='pickup'&&entity.spriteId==='weapon'){ctx.fillStyle=(entity.quality??0)>0?'#d8b679':'#a9d4c6';ctx.fillRect(x-15,y-8,30,16);ctx.strokeStyle='#e6eee0';ctx.lineWidth=2;ctx.strokeRect(x-15,y-8,30,16);ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#e4e7d4';ctx.fillText(`${entity.modelLabel??'MCP'} · F`,x,y+30);continue;}
    if(entity.kind==='pickup'){ctx.fillStyle='#f8efd8';ctx.fillRect(x-4,y-2,3,6);ctx.fillRect(x+1,y-3,3,6);ctx.fillStyle='#d4d9b8';ctx.fillRect(x-4,y+3,8,2);continue;}
    if(entity.spriteId==='terrain_clutter'){ctx.fillStyle='#5b776c';ctx.fillRect(x-24,y-16,48,32);ctx.strokeStyle='#8ca18b';ctx.lineWidth=2;ctx.strokeRect(x-20,y-12,40,24);ctx.fillStyle='#b3c7ac';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('Bot ↔',x,y+4);continue;}
    if(entity.kind==='obstacle'){
      ctx.fillStyle='#254e54';ctx.beginPath();for(let corner=0;corner<7;corner++){const theta=corner*Math.PI*2/7;const r=entity.radius*(corner%2===0?1:.92);if(corner===0)ctx.moveTo(x+Math.cos(theta)*r,y+Math.sin(theta)*r);else ctx.lineTo(x+Math.cos(theta)*r,y+Math.sin(theta)*r);}ctx.closePath();ctx.fill();ctx.strokeStyle='#43656a';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#3d6264';ctx.fillRect(x-20,y-16,22,5);continue;
    }
    if(entity.spriteId==='world_beacon'){const progress=(entity.objectiveProgress??0)/2100;ctx.strokeStyle=progress>=1?'#a8d997':'#799da2';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,120,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#d9dc9e';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,120,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();ctx.fillStyle=progress>=1?'#c7e3aa':'#749d99';ctx.fillRect(x-14,y-22,28,45);ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillStyle='#dce9d6';ctx.fillText(progress>=1?'信标已点亮':`占领 ${Math.floor(progress*35)} / 35秒`,x,y+48);continue;}
    if(entity.spriteId==='world_gate'){ctx.strokeStyle=entity.unlocked?'#c6dfa4':'#9a8c84';ctx.lineWidth=8;ctx.strokeRect(x-42,y-50,84,90);ctx.font='14px system-ui';ctx.fillStyle='#e3dfc8';ctx.textAlign='center';ctx.fillText(entity.unlocked?'首领入口 · F':'点亮任意两个信标',x,y+66);continue;}
    if(entity.spriteId==='world_cache'){ctx.fillStyle=entity.opened?'#677a6e':'#d5c59b';ctx.fillRect(x-19,y-13,38,26);ctx.fillStyle='#8b926a';ctx.fillRect(x-4,y-13,8,26);ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillStyle='#e8e3c9';ctx.fillText(entity.opened?'已打开':'补给箱 · F',x,y+42);continue;}
    if(entity.spriteId==='claude_seal'){ctx.strokeStyle='#db967c';ctx.lineWidth=3;ctx.strokeRect(x-17,y-17,34,34);ctx.fillStyle='#e8c6a3';ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText(`${Math.ceil(entity.hp)}击`,x,y+5);continue;}
    if(entity.spriteId==='world_blast'){ctx.strokeStyle='#eebd82';ctx.fillStyle='#f8c47622';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,entity.radius,0,Math.PI*2);ctx.fill();ctx.stroke();continue;}
    if(entity.kind==='objective'){
      const pulse=2+Math.sin(view.tick/35)*2;ctx.strokeStyle='#b5dbba44';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,38+pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#8dbbb0';ctx.fillRect(x-17,y-8,34,20);ctx.fillStyle='#d7e7ca';ctx.fillRect(x-12,y-13,24,8);ctx.fillStyle='#446b65';ctx.fillRect(x-8,y-3,16,5);ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#c8e6d4';ctx.fillText('检查点 · F',x,y+49);continue;
    }
    if(entity.spriteId==='distilled_bot'){ctx.globalAlpha=.65;ctx.fillStyle='#a8e5ce';ctx.fillRect(x-9,y-9,18,18);ctx.fillStyle='#28535c';ctx.fillRect(x-5,y-4,3,4);ctx.fillRect(x+2,y-4,3,4);ctx.fillRect(x-4,y+3,8,2);ctx.globalAlpha=1;continue;}
    if(entity.spriteId==='distilled_bubble'){ctx.fillStyle='#c9afff';ctx.beginPath();ctx.arc(x,y,entity.radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#eee2ff';ctx.stroke();continue;}
    if(entity.kind==='projectile'){
      const style=entity.projectileStyle??'';ctx.fillStyle=style==='mcp_batch'?'#efb27b':style==='mcp_return'?'#c8a0ee':style==='mcp_vector'?'#a7e2bc':style==='mcp_stream'?'#9fd9ec':'#bceff6';
      if(style==='mcp_vector'){ctx.save();ctx.translate(x,y);ctx.rotate(entity.facingRadians);ctx.fillRect(-14,-2,28,4);ctx.restore();continue;}
      ctx.beginPath();ctx.arc(x,y,entity.radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle=(entity.quality??0)===2?'#dfb5ff':(entity.quality??0)===1?'#f3da94':'#f1ffff';ctx.lineWidth=1.5;ctx.stroke();
      if(style==='mcp_return'){ctx.beginPath();ctx.arc(x,y,entity.radius+4,entity.facingRadians,entity.facingRadians+Math.PI*1.5);ctx.stroke();}ctx.fillStyle='#fff';ctx.fillRect(x-entity.radius*.3,y-entity.radius*.5,2,2);continue;}

    if(entity.kind==='player'){
      if(entity.shieldAmount>0){ctx.strokeStyle='#9bdef0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,29,0,Math.PI*2);ctx.stroke();}
      ctx.globalAlpha=hud.invulnerable&&view.tick%8<4?.55:1;drawFish(ctx,x,y);ctx.globalAlpha=1;
      ctx.strokeStyle='#d9e7df99';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+hud.aim.x*29,y+hud.aim.y*29);ctx.lineTo(x+hud.aim.x*42,y+hud.aim.y*42);ctx.stroke();continue;
    }
    if(entity.spriteId==='boss_claude'){drawBossWarning(ctx,entity,view.tick);ctx.save();ctx.translate(x,y);ctx.scale(2,2);drawCrab(ctx,0,0,entity.bossTelegraph?10:0);ctx.restore();}
    else if(entity.spriteId==='enemy_claude_guard'){
      if(entity.telegraphRemaining>0){ctx.save();ctx.translate(x,y);ctx.rotate(entity.facingRadians);ctx.fillStyle='#f1a46d33';ctx.strokeStyle='#f9bc81';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,70,-Math.PI/2,Math.PI/2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
      const raised=entity.telegraphRemaining>0?10:0;
      drawCrab(ctx,x,y,raised);
    }else if(entity.spriteId==='enemy_grok_bot'){
      ctx.fillStyle='#91a6a7';ctx.fillRect(x-11,y-14,22,22);ctx.fillStyle='#bcc9c5';ctx.fillRect(x-8,y-17,16,4);ctx.fillStyle='#254348';ctx.fillRect(x-8,y-9,16,8);ctx.fillStyle='#a9f5c8';ctx.fillRect(x-6,y-7,4,3);ctx.fillRect(x+2,y-7,4,3);ctx.fillStyle='#6c858b';ctx.fillRect(x-9,y+9,5,7);ctx.fillRect(x+4,y+9,5,7);ctx.fillStyle='#d3e3d8';ctx.fillRect(x-2,y-21,4,5);
    }
    if(entity.hpFraction<1&&entity.kind==='enemy'){ctx.fillStyle='#0c2530';ctx.fillRect(x-20,y-entity.radius-13,40,4);ctx.fillStyle='#e6a57f';ctx.fillRect(x-20,y-entity.radius-13,40*Math.max(0,entity.hpFraction),4);}
  }
  // Pickups are projected as dedicated display entities by the snapshot.
  for(const popup of popups){const age=(view.tick-popup.tick)/60;if(age<0||age>0.65)continue;ctx.globalAlpha=1-age/.65;ctx.fillStyle='#ffdfb8';ctx.textAlign='center';ctx.font='bold 14px system-ui';ctx.fillText(String(Math.round(popup.amount)),popup.x,popup.y-25-age*25);ctx.globalAlpha=1;}
  ctx.restore();
  if(width>=1000&&height>=500)drawMinimap(ctx,view,width);
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} raised */
function drawCrab(ctx,x,y,raised){
      ctx.fillStyle='#94664f';for(const offset of [-1,1]){ctx.fillRect(x+offset*24-6,y-4-raised,12,13);ctx.fillRect(x+offset*29-4,y-10-raised,8,12);for(let leg=0;leg<3;leg++)ctx.fillRect(x+offset*(20+leg*2)-2,y+leg*6,9,4);}
      ctx.fillStyle='#bf8c67';ctx.fillRect(x-19,y-12,38,29);ctx.fillStyle='#cf9f79';ctx.fillRect(x-14,y-17,28,8);ctx.fillStyle='#fff3d9';ctx.fillRect(x-12,y-14,7,8);ctx.fillRect(x+5,y-14,7,8);ctx.fillStyle='#433e36';ctx.fillRect(x-10,y-12,3,5);ctx.fillRect(x+7,y-12,3,5);ctx.fillRect(x-4,y+5,8,3);
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
 const player=view.entities.find(entity=>entity.kind==='player');for(const entity of view.entities){const interaction=['world_checkpoint','world_cache'].includes(entity.spriteId);if(interaction&&(!hud.treeHints||!player||Math.hypot(entity.position.x-player.position.x,entity.position.y-player.position.y)>300||entity.opened))continue;if(!['world_beacon','world_gate','world_checkpoint','world_cache'].includes(entity.spriteId)&&entity.kind!=='player')continue;const visible=seen.has(`${Math.floor(entity.position.x/160)}:${Math.floor(entity.position.y/160)}`);if(!visible&&!(entity.spriteId==='world_gate'&&entity.unlocked))continue;ctx.fillStyle=entity.kind==='player'?'#fff2cb':entity.spriteId==='world_beacon'?'#acd295':'#d7a180';ctx.fillRect(entity.position.x*scale-2,entity.position.y*scale-2,4,4);}ctx.restore();
}
