// @ts-check
import {createShootingRange} from '../engine/shootingRange.js';
/** Drive an isolated, unsaved shooting lane with the real world clock and native MCP handlers.
 * @calls engine/shootingRange.js#createShootingRange
 * @param {HTMLElement} root
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {import('../contracts.d.ts').Profile} profile
 * @param {string[]} equipped
 * @returns {()=>void}
 */
export function mountNestRange(root,catalog,profile,equipped) {
  const lane=createShootingRange(catalog,profile,equipped);
  const canvas=document.createElement('canvas'),fire=document.createElement('button'),swap=document.createElement('button'),result=document.createElement('output');
  canvas.width=440;canvas.height=150;canvas.className='range-view';fire.textContent='开火 · Space';root.append(canvas,fire,swap,result);
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
  const art=new Image(),fish=new Image();art.src='./art/nest/fixtures.png';fish.src='./art/characters/deepseek.png';
  let firing=false,queued=false,frame=0,last=0,carry=0,hits=0,flash=0,damage=0;
  const controller=new AbortController(),options={signal:controller.signal};
  function label(){swap.textContent=catalog.definitions[lane.weapon()].displayName+' · Q';}
  function switchGun(){lane.switchWeapon();label();}
  label();swap.onclick=switchGun;
  let projectiles=/** @type {ReturnType<typeof lane.step>['projectiles']} */([]);
  for(const surface of [fire,canvas])surface.onpointerdown=e=>{surface.setPointerCapture(e.pointerId);firing=true;queued=true;};
  for(const surface of [fire,canvas])surface.onpointerup=surface.onpointercancel=()=>{firing=false;};
  document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();firing=true;if(!e.repeat)queued=true;}if(e.code==='KeyQ'&&!e.repeat)switchGun();},options);
  document.addEventListener('keyup',e=>{if(e.code==='Space')firing=false;},options);
  window.addEventListener('blur',()=>{firing=false;queued=false;},options);
  /** @param {number} time */
  function draw(time){
    if(!ctx)return;carry+=Math.min(64,time-(last||time));last=time;
    while(carry>=1000/60){
      carry-=1000/60;
      const sample=lane.step(firing||queued);queued=false;projectiles=sample.projectiles;
      if(sample.damage>0){hits++;damage=Math.round(sample.damage);flash=12;}
      flash=Math.max(0,flash-1);
    }
    ctx.clearRect(0,0,440,150);ctx.imageSmoothingEnabled=false;
    if(fish.complete&&fish.naturalWidth)ctx.drawImage(fish,44,48,62,64);
    const targetX=280+(flash%4)*2;
    if(art.complete&&art.naturalWidth)ctx.drawImage(art,224,0,32,32,targetX,48,64,64);
    for(const entity of projectiles){
      ctx.fillStyle=entity.template==='mcp_batch'?'#ffbc76':entity.template==='mcp_return'?'#d4b5fd':'#b6ffff';ctx.strokeStyle='#122c40';ctx.lineWidth=2;ctx.beginPath();ctx.arc(entity.x-143,entity.y-190,entity.radius,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    if(flash){ctx.fillStyle='#fff4aa';ctx.font='12px "Fusion Pixel",sans-serif';ctx.fillText('−'+damage,targetX,44-flash/2);}
    result.textContent='命中 '+hits+'　最近伤害 '+damage;result.dataset.hits=String(hits);frame=requestAnimationFrame(draw);
  }
  frame=requestAnimationFrame(draw);return ()=>{cancelAnimationFrame(frame);controller.abort();};
}
