// @ts-check
// Use the previously reviewed generated art unchanged. No substitute redraws.
/** @typedef {{tick?:number;moving?:boolean;attacking?:boolean;controlled?:boolean;hurt?:boolean;facing?:number;horizontal?:number;hopPhase?:number;stage?:number;scaleX?:number;scaleY?:number;flash?:boolean;cannon?:boolean}} Pose */
/** @type {HTMLCanvasElement|null} */
let flashCanvas=null;
export const CHARACTER_NAMES=Object.freeze(['deepseek','claude','grok','codex','dewey','fireball','hoots','rocky','seedy','stacky','bsod','null-signal','chatgpt']);
/** State sheets are not gallery characters. Claude's attack/hurt files are full PNGs, not the SVG crop. */
/** @type {Readonly<Record<string, string>>} */
const VARIANT_FILES=Object.freeze({'deepseek-hurt':'deepseek-hurt.png','chatgpt-attack':'chatgpt-attack.png','chatgpt-hurt':'chatgpt-hurt.png','claude-attack':'claude-attack.png','claude-hurt':'claude-hurt.png','grok-attack':'grok-attack.png','grok-hurt':'grok-hurt.png'});
const CANNON_SRC='./art/weapons/bubble-cannon.png';
const CANNON_SIZE={w:1536,h:1024},CANNON_GRIP={x:557.5,y:721},CANNON_TIP={x:1173,y:477};
const CANNON_AXIS={x:CANNON_TIP.x-CANNON_GRIP.x,y:CANNON_TIP.y-CANNON_GRIP.y};
const CANNON_AXIS_LENGTH=Math.hypot(CANNON_AXIS.x,CANNON_AXIS.y),CANNON_AXIS_ANGLE=Math.atan2(CANNON_AXIS.y,CANNON_AXIS.x);
/** @type {{image:HTMLImageElement;ready:boolean}|null} */
let cannonArt=null;
/** @type {Map<string,{image:HTMLImageElement;ready:boolean;promise:Promise<HTMLImageElement>}>} */
const images=new Map();
/** Resolve a reviewed source image without changing its pixels.
 * @calls 无内部公开函数。
 * @param {string} name @returns {string|null}
 */
export function characterSource(name){
 if(name==='fish')name='deepseek';
 if(VARIANT_FILES[name])return `./art/characters/${VARIANT_FILES[name]}`;
 return CHARACTER_NAMES.includes(name)?`./art/characters/${name}.${name==='claude'?'svg':'png'}`:null;
}
/** Load each approved full-resolution image once. No re-encoding or traced shapes.
 * @calls preview/characters.js#characterSource
 * @param {string} name @returns {Promise<HTMLImageElement>}
 */
export function loadCharacterArt(name){
 const existing=images.get(name);if(existing)return existing.promise;
 const source=characterSource(name);if(!source)return Promise.reject(new Error(`No approved character art: ${name}`));
 const image=new Image();let resolveImage=/** @type {(image:HTMLImageElement)=>void} */(()=>{}),rejectImage=/** @type {(error:Error)=>void} */(()=>{});
 const promise=new Promise((resolve,reject)=>{resolveImage=resolve;rejectImage=reject;});
 const entry={image,ready:false,promise};images.set(name,entry);
 image.onload=()=>{entry.ready=true;resolveImage(image);};image.onerror=()=>rejectImage(new Error(`Character art unavailable: ${name}`));image.src=source;return promise;
}
/** Prefer a ready hurt/attack sheet. An unloaded sheet falls back to the base picture plus the procedural flash.
 * @param {string} name @param {Pose} pose @returns {string}
 */
function posedArtName(name,pose){
 const wantHurt=(pose.hurt||pose.flash)&&characterSource(`${name}-hurt`);
 const wantAttack=name!=='deepseek'&&pose.attacking&&!pose.controlled&&characterSource(`${name}-attack`);
 const candidate=wantHurt?`${name}-hurt`:wantAttack?`${name}-attack`:name;
 if(candidate===name)return name;
 const entry=images.get(candidate);
 if(!entry||!entry.ready){loadCharacterArt(candidate).catch(()=>{});return name;}
 return candidate;
}
/** Draw the reviewed artwork with its aspect ratio and details intact. Movement
 * and recoil are whole-image offsets, not newly invented animation frames.
 * Horizontal movement mirrors all artwork, as requested.
 * @calls preview/characters.js#characterSource
 * @calls preview/characters.js#loadCharacterArt
 * @param {CanvasRenderingContext2D} ctx @param {string} name @param {number} x @param {number} y @param {number} size @param {Pose} [pose]
 * @returns {boolean}
 */
export function drawCharacter(ctx,name,x,y,size,pose={}){
 if(!characterSource(name))return false;
 const artName=posedArtName(name,pose);
 const entry=images.get(artName);if(!entry){loadCharacterArt(artName).catch(()=>{});return false;}if(!entry.ready)return false;
 const image=entry.image;
 // The SVG crop belongs only to the base Claude crab. Attack and hurt PNGs are full pictures.
 const crop=artName==='claude'?{x:16,y:176,w:384,h:240}:{x:0,y:0,w:image.naturalWidth,h:image.naturalHeight};
 const stateSheet=artName!==name;
 const scale=size/Math.max(crop.w,crop.h),w=crop.w*scale,h=crop.h*scale,tick=pose.tick??0;
 const phase=pose.hopPhase??16;
 const grounded=name==='grok'&&phase>=16&&!pose.controlled;
 const bob=pose.controlled?0:!grounded&&name==='grok'?Math.sin(Math.PI*Math.min(16,phase)/16)*14:pose.moving?Math.floor(tick/7)%2*2:0;
 const recoil=pose.attacking&&!pose.controlled&&tick%12<4?2:0;
 const breathe=grounded?1+Math.sin(tick/14)*1.5/Math.max(size,1):1;
 const sx=(pose.scaleX??1)*breathe,sy=(pose.scaleY??1)*breathe;
 const flip=(pose.horizontal??Math.cos(pose.facing??0))<0?-1:1;
 const originX=Math.round(x-Math.cos(pose.facing??0)*recoil),originY=Math.round(y-bob);
 ctx.save();ctx.imageSmoothingEnabled=false;if(pose.hurt&&!pose.flash&&!stateSheet)ctx.globalAlpha*=.55;
 ctx.translate(originX,originY);
 if(pose.flash&&!stateSheet){ctx.scale(flip*sx,sy);if(!paintWhiteSilhouette(ctx,image,crop,w,h))ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,Math.round(-w/2),Math.round(-h/2),w,h);}
 else if(sx!==1||sy!==1){ctx.scale(flip*sx,sy);ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,Math.round(-w/2),Math.round(-h/2),w,h);}
 else{ctx.scale(flip,1);ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,Math.round(-w/2),Math.round(-h/2),w,h);}
 ctx.restore();
 if(pose.cannon&&name==='deepseek')drawBubbleCannon(ctx,originX,originY,size,pose);
 return true;
}
/** Toy bubble cannon over the fish's hands. Grip stays put; the barrel follows aim. Left aim flips vertically so the muzzle stays upright.
 * @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} size @param {Pose} pose
 */
function drawBubbleCannon(ctx,x,y,size,pose){
 const image=ensureCannon();if(!image)return;
 const reach=34*(size/80),scale=reach/CANNON_AXIS_LENGTH,facing=pose.facing??0,tick=pose.tick??0;
 const kick=pose.attacking&&!pose.controlled?4*(1-(tick%8)/8):0;
 const mirror=(pose.horizontal??1)<0?-1:1,hand=size/80;
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.translate(x-Math.cos(facing)*kick+8*hand*mirror,y-Math.sin(facing)*kick+14*hand);
 ctx.rotate(facing-CANNON_AXIS_ANGLE);
 if(Math.cos(facing)<0)ctx.scale(1,-1);
 ctx.drawImage(image,-CANNON_GRIP.x*scale,-CANNON_GRIP.y*scale,CANNON_SIZE.w*scale,CANNON_SIZE.h*scale);
 ctx.restore();
}
/** @returns {HTMLImageElement|null} */
function ensureCannon(){
 if(cannonArt?.ready)return cannonArt.image;
 if(!cannonArt){const image=new Image();cannonArt={image,ready:false};image.onload=()=>{if(cannonArt)cannonArt.ready=true;};image.src=CANNON_SRC;}
 return null;
}
/** White hit silhouette on a transparent canvas so source-atop does not paint the sea.
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} image
 * @param {{x:number;y:number;w:number;h:number}} crop
 * @param {number} w
 * @param {number} h
 * @returns {boolean}
 */
function paintWhiteSilhouette(ctx,image,crop,w,h){
 const doc=ctx.canvas.ownerDocument;if(!doc)return false;
 const width=Math.ceil(w)+2,height=Math.ceil(h)+2;
 if(!flashCanvas)flashCanvas=doc.createElement('canvas');
 if(flashCanvas.width<width)flashCanvas.width=width;
 if(flashCanvas.height<height)flashCanvas.height=height;
 const off=flashCanvas.getContext('2d');if(!off)return false;
 off.setTransform(1,0,0,1,0,0);off.clearRect(0,0,flashCanvas.width,flashCanvas.height);off.imageSmoothingEnabled=false;
 const dx=Math.round((flashCanvas.width-w)/2),dy=Math.round((flashCanvas.height-h)/2);
 off.drawImage(image,crop.x,crop.y,crop.w,crop.h,dx,dy,w,h);
 off.globalCompositeOperation='source-atop';off.fillStyle='#fff';off.fillRect(0,0,flashCanvas.width,flashCanvas.height);off.globalCompositeOperation='source-over';
 ctx.drawImage(flashCanvas,Math.round(-w/2)-dx,Math.round(-h/2)-dy);return true;
}
/** Bind existing gameplay roles to reviewed appearances; abilities do not change.
 * @calls 无内部公开函数。
 * @param {string} id @returns {string|null}
 */
export function resolveCharacterModel(id){
 if(['player_fish','player','fish'].includes(id))return 'deepseek';
 if(id.startsWith('enemy_gpt_')){const name=id.slice(10);return CHARACTER_NAMES.includes(name)?name:'codex';}
 if(['enemy_claude_guard','boss_claude'].includes(id))return 'claude';
 if(['enemy_grok_bot','boss_grok','distilled_bot'].includes(id))return 'grok';
 if(id==='boss_gpt')return 'chatgpt';
 return null;
}
