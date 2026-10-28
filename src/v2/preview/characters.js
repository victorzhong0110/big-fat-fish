// @ts-check
// Use the previously reviewed generated art unchanged. No substitute redraws.
/** @typedef {{tick?:number;moving?:boolean;attacking?:boolean;controlled?:boolean;hurt?:boolean;facing?:number;horizontal?:number;hopPhase?:number;stage?:number}} Pose */
export const CHARACTER_NAMES=Object.freeze(['deepseek','claude','grok','codex','dewey','fireball','hoots','rocky','seedy','stacky','bsod','null-signal']);
/** @type {Map<string,{image:HTMLImageElement;ready:boolean;promise:Promise<HTMLImageElement>}>} */
const images=new Map();
/** Resolve a reviewed source image without changing its pixels.
 * @calls 无内部公开函数。
 * @param {string} name @returns {string|null}
 */
export function characterSource(name){
 if(name==='fish')name='deepseek';
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
 const entry=images.get(name);if(!entry){loadCharacterArt(name).catch(()=>{});return false;}if(!entry.ready)return false;
 const image=entry.image;
 // Approved Claude SVG has a 512-square artboard; only its crab occupies this box.
 const crop=name==='claude'?{x:16,y:176,w:384,h:240}:{x:0,y:0,w:image.naturalWidth,h:image.naturalHeight};
 const scale=size/Math.max(crop.w,crop.h),w=crop.w*scale,h=crop.h*scale,tick=pose.tick??0;
 const phase=pose.hopPhase??16;
 const bob=pose.controlled?0:name==='grok'?Math.sin(Math.PI*Math.min(16,phase)/16)*14:pose.moving?Math.floor(tick/7)%2*2:0;
 const recoil=pose.attacking&&!pose.controlled&&tick%12<4?2:0;
 ctx.save();ctx.imageSmoothingEnabled=false;if(pose.hurt)ctx.globalAlpha*=.55;
 ctx.translate(Math.round(x-Math.cos(pose.facing??0)*recoil),Math.round(y-bob));ctx.scale((pose.horizontal??Math.cos(pose.facing??0))<0?-1:1,1);
 ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,Math.round(-w/2),Math.round(-h/2),w,h);ctx.restore();return true;
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
 if(id==='boss_gpt')return 'codex';
 return null;
}
