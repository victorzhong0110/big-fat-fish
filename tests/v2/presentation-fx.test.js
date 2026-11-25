import {describe,it,expect,vi} from 'vitest';
import {renderPreviewFrame} from '../../src/v2/preview/view.js';

function mock(){
 const arcs=[];
 const ctx={
  canvas:{ownerDocument:null},
  imageSmoothingEnabled:false,fillStyle:'',strokeStyle:'',lineWidth:1,globalAlpha:1,font:'',textAlign:'',globalCompositeOperation:'source-over',
  setTransform(){},clearRect(){},save(){},restore(){},scale(){},translate(){},rotate(){},
  beginPath(){},arc(_x,_y,radius){arcs.push(radius);},fill(){},stroke(){},fillRect(){},strokeRect(){},
  moveTo(){},lineTo(){},ellipse(){},closePath(){},fillText(){},setLineDash(){},drawImage(){},
  createLinearGradient(){return {addColorStop(){}};},
 };
 return {ctx,arcs};
}
function frame(tick,entities,phase='exploring'){
 return {revision:tick,tick,uiTick:tick,phase,entities,hud:{map:{width:2200,height:1400,exploredCells:[]},invulnerable:false,aim:{x:1,y:0},rice:0,aimDistance:400,overclock:false,treeHints:false},panel:null};
}
function shot(id='pellet'){
 return {id,kind:'projectile',team:'player',hp:1,maxHp:1,hpFraction:1,radius:6,position:{x:400,y:400},facingRadians:0,spriteId:'mcp_bubble',modelLabel:null,horizontalFacing:1,hopPhase:16,moving:true,attacking:false,telegraphRemaining:0,shieldAmount:0,statusLabels:[],weakArcDegrees:null,projectileStyle:'mcp_bubble',quality:0};
}
function blast(){
 return {id:'blast',kind:'objective',team:'neutral',hp:1,maxHp:1,hpFraction:1,radius:80,position:{x:400,y:400},facingRadians:0,spriteId:'world_blast',modelLabel:null,horizontalFacing:1,hopPhase:16,moving:false,attacking:false,telegraphRemaining:0,shieldAmount:0,statusLabels:[],weakArcDegrees:null};
}
function draw(ctx,view){renderPreviewFrame(ctx,view,900,600,1);}
function body(id,spriteId,kind,extra={}){
 return {id,kind,team:'neutral',hp:8,maxHp:8,hpFraction:1,radius:20,position:{x:480,y:360},facingRadians:0,spriteId,modelLabel:null,horizontalFacing:1,hopPhase:16,moving:false,attacking:false,telegraphRemaining:0,shieldAmount:0,statusLabels:[],weakArcDegrees:null,objectiveProgress:0,objectiveRequired:0,...extra};
}
function isolate(ctx){draw(ctx,frame(500,[]));draw(ctx,frame(0,[]));}

describe('combat presentation effects',()=>{
 it('sparks a vanished projectile, redraws without duplicating, and freezes while paused',()=>{
  const {ctx,arcs}=mock();isolate(ctx);
  draw(ctx,frame(1,[shot()]));
  const before=arcs.length;
  draw(ctx,frame(2,[]));
  const spawned=arcs.length-before;
  expect(spawned).toBeGreaterThanOrEqual(4);expect(spawned).toBeLessThanOrEqual(6);
  const redraw=arcs.length;
  draw(ctx,frame(2,[]));
  expect(arcs.length-redraw).toBe(spawned);
  const paused=arcs.length;
  draw(ctx,{...frame(30,[]),phase:'paused'});
  expect(arcs.length-paused).toBe(spawned);
  const expired=arcs.length;
  draw(ctx,frame(30,[]));
  expect(arcs.length-expired).toBe(0);
 });
 it('halves sparks and skips shake setup when simplified effects are on',()=>{
  const memory=new Map([['big-fat-fish:v2:simple-fx','1']]);
  vi.stubGlobal('localStorage',{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)});
  try{
   const {ctx,arcs}=mock();isolate(ctx);
   draw(ctx,frame(1,[shot('simple')]));
   const before=arcs.length;
   draw(ctx,frame(2,[]));
   const spawned=arcs.length-before;
   expect(spawned).toBeGreaterThanOrEqual(2);expect(spawned).toBeLessThanOrEqual(3);
   const beforeBlast=arcs.length;
   draw(ctx,frame(3,[blast()]));
   draw(ctx,frame(4,[blast()]));
   const rings=arcs.slice(beforeBlast).filter(radius=>radius>8&&radius<70);
   expect(rings.length).toBeGreaterThan(0);
  }finally{vi.unstubAllGlobals();}
 });
 it('tiles a low-contrast cyan floor and keeps decoy nonsense off the screen',()=>{
  vi.stubGlobal('Image',class {set src(_){} onload(){} onerror(){}});
  try{
   const tiles=[],texts=[];
   const {ctx}=mock();
   const fillStyle={current:'#000'};
   Object.defineProperty(ctx,'fillStyle',{get(){return fillStyle.current;},set(value){fillStyle.current=value;}});
   ctx.fillRect=(x,y,w,h)=>{if(w===32&&h===32)tiles.push(fillStyle.current);};
   ctx.fillText=text=>texts.push(String(text));
   draw(ctx,frame(8,[body('decoy','companion_decoy','decoy'),body('exit','world_extraction','objective',{objectiveProgress:90,objectiveRequired:180,radius:48})]));
   expect(tiles.length).toBeGreaterThan(4);
   expect(new Set(tiles).size).toBeGreaterThan(1);
   expect(tiles.every(color=>['#14384A','#163D4E','#184556'].includes(color))).toBe(true);
   expect(texts.join('')).not.toMatch(/重新编译|上下文|错误答案/);
   expect(texts.some(text=>text==='1.5'||text.includes('撤离'))).toBe(true);
  }finally{vi.unstubAllGlobals();}
 });
});
