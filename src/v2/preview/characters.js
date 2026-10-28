// @ts-check
// Hand-authored integer-grid rigs. Reference screenshots are never loaded.
/** @typedef {{x:number;y:number;w:number;h:number;color:string}} PixelRect */
/** @typedef {{tick?:number;moving?:boolean;attacking?:boolean;controlled?:boolean;hurt?:boolean;facing?:number;stage?:number}} Pose */
export const CHARACTER_NAMES=Object.freeze(['fish','deepseek','claude','grok','codex','dewey','fireball','hoots','rocky','seedy','stacky','bsod','null-signal','rice','patch','cache','router','rocket']);
const ink='#202333',cream='#fff0de',white='#fffaf1';
/** Build detached pixel geometry on a 40 × 40 grid. Pose is presentation only.
 * @calls 无内部公开函数。
 * @param {string} name @param {Pose} [pose] @returns {PixelRect[]}
 */
export function createCharacterPixels(name,pose={}){
 if(!CHARACTER_NAMES.includes(name))name='cache';
 /** @type {PixelRect[]} */const out=[];
 const tick=pose.tick??0,step=pose.moving&&!pose.controlled?Math.floor(tick/7)%4:0,stride=step===1?1:step===3?-1:0;
 const bob=pose.controlled?0:pose.moving?Math.abs(stride):Math.floor(tick/40)%2,blink=pose.controlled||tick%210>201,attack=pose.attacking&&!pose.controlled&&tick%12<8?2:0;
 /** @param {number} x @param {number} y @param {number} w @param {number} h @param {string} color */
 const r=(x,y,w,h,color)=>out.push({x,y:y-bob,w,h,color:pose.hurt&&color!==ink?white:color});
 /** @param {number} x @param {number} y @param {number} w @param {number} h @param {string} color */
 const box=(x,y,w,h,color)=>{r(x,y,w,h,ink);r(x+1,y+1,w-2,h-2,color);};
 /** @param {number} x @param {number} y @param {string} [color] */
 const eyes=(x,y,color=ink)=>{r(x,y,2,blink?1:3,color);r(x+8,y,2,blink?1:3,color);if(!blink){r(x,y,1,1,white);r(x+8,y,1,1,white);}};
 /** @param {string} color */
 const feet=color=>{box(13,32+stride,5,4,color);box(23,32-stride,5,4,color);};
 if(name==='fish'||name==='deepseek'){
  feet('#424d7d');box(12,24,17,10,'#3a426d');r(18,25,5,7,'#eef0f7');r(5,19,7,12,ink);r(2,23,9,6,ink);r(3,24,9,3,'#5365ac');r(5,27,8,3,'#7488cf');
  box(10,8,22,18,'#495b9c');r(12,8,18,4,'#677dc0');r(11,13,3,12,'#5c72b1');box(16,14,14,11,cream);r(18,24,9,2,cream);r(15,13,7,4,'#5368a9');r(21,12,5,7,'#5368a9');r(27,13,4,4,'#5368a9');r(15,14,2,10,'#697fc0');eyes(18,19,'#354363');r(17,23,2,1,'#e8b6bd');r(28,23,2,1,'#e8b6bd');r(23,24,2,1,'#b97f91');
  r(11,7,4,4,white);r(14,5,4,5,white);r(18,4,4,5,white);r(22,4,4,5,white);r(26,5,4,5,white);r(30,7,3,4,white);r(15,8,15,2,'#cecce9');r(23,1,3,4,ink);r(24,1,4,2,'#8297d6');
  if(name==='fish'){
   box(8+attack,26-attack,26,7,'#9babbd');r(10+attack,26-attack,22,2,'#e1e8eb');r(12+attack,32-attack,19,2,'#687b96');r(15+attack,34-attack,13,1,ink);r(11+attack,29-attack,3,3,'#d5e2e8');r(28+attack,29-attack,4,3,'#c5d4df');r(7+attack,28-attack,3,3,cream);r(33+attack,28-attack,3,3,cream);
  }else{
   // DeepSeek intentionally has no basin, plus signs or replacement prop.
   box(11,26-stride,4,7,'#5b6aa4');r(12,31-stride,3,3,cream);box(29,26+stride-attack,4,7,'#5b6aa4');r(29,31+stride-attack,3,3,cream);r(17,31,3,2,'#94a6d8');r(24,31,3,2,'#94a6d8');
  }
 }else if(name==='claude'){
  for(const side of [-1,1]){const cx=side<0?4:31;for(let i=0;i<3;i++){r(side<0?7-i:28+i,26+i*2+stride*side,5,2,ink);r(side<0?6-i:30+i,27+i*2+stride*side,4,1,'#ae7756');}box(cx,15-attack,6,9,'#b87753');r(cx+1,13-attack,2,4,'#d99569');r(cx+4,13-attack,2,4,'#d99569');}
  box(10,16,21,14,'#bf805d');r(13,14,15,3,'#df9b70');r(12,18,17,2,'#d58d64');r(14,19,3,5,ink);r(24,19,3,5,ink);r(15,19,1,2,white);r(25,19,1,2,white);r(18,26,5,1,'#7c4f43');
  if((pose.stage??0)>0){r(12,15,17,3,'#946249');r(15,14,11,2,'#edb78b');r(11,19,2,7,'#875d4a');r(29,19,2,7,'#875d4a');}
 }else if(name==='grok'){
  feet('#777f88');box(10,12,22,18,'#919ba2');r(13,10,16,3,'#c0c7c6');box(13,16,16,8,'#28343e');r(16,18,3,3,'#b3e5c2');r(24,18,3,3,'#b3e5c2');r(19,26,6,1,'#414c57');r(20,7,2,4,'#6b7881');r(19,6,4,2,'#becbc8');box(7,23-stride,4,8,'#717d85');box(31,23+stride-attack,4,8,'#717d85');
  if(pose.stage===4){box(32,8,5,22,'#b2b6bc');r(33,6,3,3,'#d79469');r(33,31,3,4,'#e7b66c');}
 }else if(name==='codex'){
  feet('#416ee4');box(12,25,17,9,'#4267d9');r(17,28,2,1,white);r(19,29,2,1,white);r(17,30,2,1,white);r(23,31,3,1,white);box(7,10,27,17,'#567ff1');r(10,7,20,5,'#789cf9');r(5,14,4,8,'#4b6fe0');r(32,14,4,8,'#4b6fe0');box(12,14,18,10,'#203351');r(14,15,14,1,'#8fcaf2');r(16,20,3,1,'#9ee4f0');r(24,20,3,1,'#9ee4f0');r(15,19,1,1,'#9ee4f0');r(23,19,1,1,'#9ee4f0');box(8,27-stride,5,5,'#6086ef');box(29,27+stride-attack,5,5,'#6086ef');
 }else if(name==='dewey'){
  feet('#42b9df');r(19,5,3,4,ink);r(17,9,7,4,ink);r(14,13,13,4,ink);box(10,17,21,15,'#49c4e9');r(13,15,15,5,'#71dcf4');r(16,11,9,5,'#92e5f3');r(18,8,5,4,'#b8f3f9');r(13,20,4,5,'#c4f6f7');r(11,26,4,4,'#2ca8d2');eyes(17,23);r(15,28,2,1,'#ed9cae');r(27,28,2,1,'#ed9cae');r(7,28-stride,4,2,'#3a93af');r(31,28+stride,4,2,'#3a93af');
 }else if(name==='fireball'){
  feet('#d7a166');box(15,26,12,8,'#f0bd77');r(20,28,2,4,'#88623d');r(16,32,10,1,'#c2854d');r(18,5-attack,4,11,'#ed7132');r(21,9-attack,4,8,'#ffb347');r(14,13,5,6,'#fa9838');r(27,14,3,6,'#eb5e2e');box(9,17,23,11,'#ed7132');r(12,18,17,8,'#ffe9a5');r(11,20,19,4,'#ffe9a5');eyes(16,22,'#78472e');r(20,26,4,1,'#b9673c');
 }else if(name==='hoots'){
  feet('#e6a54c');box(9,13,24,19,'#be722f');r(13,10,15,5,'#d58c36');r(10,18,22,11,'#e1a447');r(14,27,14,4,'#d38b33');box(10,15,10,10,'#fbe5ae');box(21,15,10,10,'#fbe5ae');r(20,18,1,2,ink);eyes(15,18);r(19,23,5,2,'#8a4b2d');r(21,25,1,2,'#f0b058');r(6,23-stride,4,7,'#ba6d2d');r(33,23+stride-attack,3,7,'#ba6d2d');r(17,29,1,2,'#f0c477');r(24,29,1,2,'#f0c477');
 }else if(name==='rocky'){
  feet('#857969');box(8,17,26,15,'#8a7c66');r(11,13,20,6,'#b2a48a');r(15,10,3,4,'#8c826c');r(23,11,3,3,'#c6b394');box(12,20,18,10,'#dbccb0');eyes(16,24);r(14,29,3,1,'#b78d81');r(26,29,2,1,'#b78d81');r(6,26-stride,3,5,'#9a886e');r(34,26+stride-attack,2,5,'#9a886e');
 }else if(name==='seedy'){
  feet('#9caa67');box(14,27,14,7,'#c9c593');box(9,16,24,13,'#b7a67f');r(12,18,18,9,'#fff0cf');eyes(16,22,'#68554d');r(20,27,4,1,'#d4aa94');r(20,9,2,7,'#7b9456');r(16,8-stride,6,3,'#a9c967');r(12,7-stride,5,3,'#b9d77b');r(22,6+stride,8,3,'#94b64e');r(26,5+stride,6,2,'#c9d67c');r(18,30,2,3,'#f2e7b8');r(24,30,2,3,'#f2e7b8');
 }else if(name==='stacky'){
  feet('#5a536e');for(let i=0;i<3;i++){const shift=i===0?stride:0;box(11+shift,12+i*7,20,8,'#6d648a');r(14+shift,14+i*7,14,4,'#302f45');r(17+shift,15+i*7,2,2,'#b9aed6');r(24+shift,15+i*7,2,2,'#b9aed6');r(8,17+i*7,3,3,'#4c455e');r(31,17+i*7,3,3,'#4c455e');}r(20,7,2,5,'#7c719b');r(23,5,2,2,'#c6b1dc');
 }else if(['bsod','null-signal','cache','router'].includes(name)){
  const dark=name==='null-signal',green=name==='router';feet(dark?'#35333e':'#b8c4d1');box(15,27,12,7,dark?'#343342':'#dce2e6');box(9,13,24,15,dark?'#35333e':'#c2cdd5');r(12,16,18,9,dark?'#10141e':green?'#397b7b':'#2784de');eyes(16,20,dark?'#e47b67':'#c3f0f9');r(21,8,1,5,'#7f8b9f');r(22,6,4,2,dark?'#57536c':'#67c6e9');r(8,29-stride,5,2,dark?'#3e3a49':'#e1e5dc');r(29,29+stride-attack,5,2,dark?'#3e3a49':'#e1e5dc');if(green){r(18,29,2,2,'#608a82');r(23,29,2,2,'#608a82');}
 }else if(name==='rice'){
  feet('#d5dbd3');box(10,22,22,10,'#bad4df');r(12,20,18,4,white);r(15,17,12,4,white);r(18,15,6,3,white);r(12,23,18,2,'#f3f0dd');eyes(16,26,'#445767');r(18,30,7,1,'#82a8bb');
 }else if(name==='patch'){
  feet('#719b79');box(10,14,22,17,'#8ab496');r(13,16,16,4,'#b0d2ab');eyes(16,23);r(18,28,6,1,'#e4eed1');r(18,9,5,6,'#e9eac9');r(15,11,11,2,'#e9eac9');
 }else if(name==='rocket'){
  feet('#c9c3b2');box(15,12,12,20,'#d1d6d3');r(18,8,6,5,'#cf8d65');r(20,6,2,3,'#e2b77e');box(17,17,8,7,'#46869a');r(19,18,2,2,'#c7f4ee');r(11,26-stride,4,7,'#ba7c5c');r(27,26+stride,4,7,'#ba7c5c');r(18,32,6,3,attack?'#f5c15c':'#9d7d61');
 }
 if(['codex','dewey','fireball','hoots','rocky','seedy','stacky'].includes(name))for(let n=0;n<Math.min(4,pose.stage??0);n++)r(9+n*3,34,2,1,'#ead3a1');
 return out;
}
/** Draw an integer-scaled rig, mirrored toward its actual facing.
 * @calls preview/characters.js#createCharacterPixels
 * @param {CanvasRenderingContext2D} ctx @param {string} name @param {number} x @param {number} y @param {number} size @param {Pose} [pose]
 */
export function drawCharacter(ctx,name,x,y,size,pose={}){
 const scale=Math.max(1,Math.round(size/40));ctx.save();ctx.translate(Math.round(x),Math.round(y));if(Math.cos(pose.facing??0)<-.15)ctx.scale(-1,1);
 for(const p of createCharacterPixels(name,pose)){ctx.fillStyle=p.color;ctx.fillRect((p.x-20)*scale,(p.y-20)*scale,p.w*scale,p.h*scale);}ctx.restore();
}
/** Static export from exactly the same rig as combat.
 * @calls preview/characters.js#createCharacterPixels
 * @param {string} name @param {Pose} [pose] @returns {string}
 */
export function characterSvg(name,pose={}){
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="160" height="160" shape-rendering="crispEdges">${createCharacterPixels(name,pose).map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`).join('')}</svg>`;
}
/** Resolve combat actor IDs; DeepSeek is the existing decoy companion's skin.
 * @calls 无内部公开函数。
 * @param {string} id @returns {string|null}
 */
export function resolveCharacterModel(id){
 if(['player_fish','player','fish'].includes(id))return 'fish';
 if(id.startsWith('enemy_gpt_')){const name=id.slice(10);return CHARACTER_NAMES.includes(name)?name:'codex';}
 if(['enemy_claude_guard','boss_claude'].includes(id))return 'claude';
 if(['enemy_grok_bot','boss_grok','distilled_bot'].includes(id))return 'grok';
 if(id==='boss_gpt')return 'codex';
 const companions=/** @type {Record<string,string>} */({companion_rice:'rice',companion_patch:'patch',companion_cache:'cache',companion_router:'router',companion_decoy:'deepseek',companion_rocket:'rocket'});return companions[id]??null;
}
