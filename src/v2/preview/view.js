// @ts-check
/** Canvas presentation for the combat preview. Never mutates or simulates game state. */
/** Camera projection shared by drawing and pointer-to-world mapping.
 * @implementationScope core-preview
 * @calls 无内部公开函数。
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
  return { x: Math.max(0, Math.min(hud.map.width - worldWidth, (player?.position.x ?? 230) - worldWidth / 2)), y: Math.max(0, Math.min(hud.map.height - worldHeight, (player?.position.y ?? 270) - worldHeight / 2)), scale };
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
    if(entity.kind==='pickup'){ctx.fillStyle='#f8efd8';ctx.fillRect(x-4,y-2,3,6);ctx.fillRect(x+1,y-3,3,6);ctx.fillStyle='#d4d9b8';ctx.fillRect(x-4,y+3,8,2);continue;}
    if(entity.spriteId==='terrain_clutter'){ctx.fillStyle='#5b776c';ctx.fillRect(x-24,y-16,48,32);ctx.strokeStyle='#8ca18b';ctx.lineWidth=2;ctx.strokeRect(x-20,y-12,40,24);ctx.fillStyle='#b3c7ac';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('Bot ↔',x,y+4);continue;}
    if(entity.kind==='obstacle'){
      ctx.fillStyle='#254e54';ctx.beginPath();for(let corner=0;corner<7;corner++){const theta=corner*Math.PI*2/7;const r=entity.radius*(corner%2===0?1:.92);if(corner===0)ctx.moveTo(x+Math.cos(theta)*r,y+Math.sin(theta)*r);else ctx.lineTo(x+Math.cos(theta)*r,y+Math.sin(theta)*r);}ctx.closePath();ctx.fill();ctx.strokeStyle='#43656a';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#3d6264';ctx.fillRect(x-20,y-16,22,5);continue;
    }
    if(entity.kind==='objective'){
      const pulse=2+Math.sin(view.tick/35)*2;ctx.strokeStyle='#b5dbba44';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,38+pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#8dbbb0';ctx.fillRect(x-17,y-8,34,20);ctx.fillStyle='#d7e7ca';ctx.fillRect(x-12,y-13,24,8);ctx.fillStyle='#446b65';ctx.fillRect(x-8,y-3,16,5);ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillStyle='#c8e6d4';ctx.fillText('检查点 · F',x,y+49);continue;
    }
    if(entity.kind==='projectile'){ctx.fillStyle='#bceff6';ctx.beginPath();ctx.arc(x,y,entity.radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f1ffff';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(x-entity.radius*.3,y-entity.radius*.5,2,2);continue;}
    if(entity.kind==='player'){
      if(entity.shieldAmount>0){ctx.strokeStyle='#9bdef0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,29,0,Math.PI*2);ctx.stroke();}
      ctx.globalAlpha=hud.invulnerable&&view.tick%8<4?.55:1;drawFish(ctx,x,y);ctx.globalAlpha=1;
      ctx.strokeStyle='#d9e7df99';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+hud.aim.x*29,y+hud.aim.y*29);ctx.lineTo(x+hud.aim.x*42,y+hud.aim.y*42);ctx.stroke();continue;
    }
    if(entity.spriteId==='enemy_claude_guard'){
      if(entity.telegraphRemaining>0){ctx.save();ctx.translate(x,y);ctx.rotate(entity.facingRadians);ctx.fillStyle='#f1a46d33';ctx.strokeStyle='#f9bc81';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,70,-Math.PI/2,Math.PI/2);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
      const raised=entity.telegraphRemaining>0?10:0;
      ctx.fillStyle='#94664f';for(const offset of [-1,1]){ctx.fillRect(x+offset*24-6,y-4-raised,12,13);ctx.fillRect(x+offset*29-4,y-10-raised,8,12);for(let leg=0;leg<3;leg++)ctx.fillRect(x+offset*(20+leg*2)-2,y+leg*6,9,4);}
      ctx.fillStyle='#bf8c67';ctx.fillRect(x-19,y-12,38,29);ctx.fillStyle='#cf9f79';ctx.fillRect(x-14,y-17,28,8);ctx.fillStyle='#fff3d9';ctx.fillRect(x-12,y-14,7,8);ctx.fillRect(x+5,y-14,7,8);ctx.fillStyle='#433e36';ctx.fillRect(x-10,y-12,3,5);ctx.fillRect(x+7,y-12,3,5);ctx.fillRect(x-4,y+5,8,3);
    }else if(entity.spriteId==='enemy_grok_bot'){
      ctx.fillStyle='#91a6a7';ctx.fillRect(x-11,y-14,22,22);ctx.fillStyle='#bcc9c5';ctx.fillRect(x-8,y-17,16,4);ctx.fillStyle='#254348';ctx.fillRect(x-8,y-9,16,8);ctx.fillStyle='#a9f5c8';ctx.fillRect(x-6,y-7,4,3);ctx.fillRect(x+2,y-7,4,3);ctx.fillStyle='#6c858b';ctx.fillRect(x-9,y+9,5,7);ctx.fillRect(x+4,y+9,5,7);ctx.fillStyle='#d3e3d8';ctx.fillRect(x-2,y-21,4,5);
    }
    if(entity.hpFraction<1&&entity.kind==='enemy'){ctx.fillStyle='#0c2530';ctx.fillRect(x-20,y-entity.radius-13,40,4);ctx.fillStyle='#e6a57f';ctx.fillRect(x-20,y-entity.radius-13,40*Math.max(0,entity.hpFraction),4);}
  }
  // Pickups are projected as dedicated display entities by the snapshot.
  for(const popup of popups){const age=(view.tick-popup.tick)/60;if(age<0||age>0.65)continue;ctx.globalAlpha=1-age/.65;ctx.fillStyle='#ffdfb8';ctx.textAlign='center';ctx.font='bold 14px system-ui';ctx.fillText(String(Math.round(popup.amount)),popup.x,popup.y-25-age*25);ctx.globalAlpha=1;}
  ctx.restore();
}
