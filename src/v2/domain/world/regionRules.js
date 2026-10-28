// @ts-check
/** Resolve a fixed, previewable permutation without consuming any gameplay random stream.
 * @calls 无内部公开函数。
 * @param {number} seed
 * @returns {readonly import('../../contracts.d.ts').Faction[]}
 */
export function resolveExpeditionRoute(seed){const routes=/** @type {import('../../contracts.d.ts').Faction[][]} */([['claude','gpt','grok'],['claude','grok','gpt'],['gpt','claude','grok'],['gpt','grok','claude'],['grok','claude','gpt'],['grok','gpt','claude']]);return [...routes[(seed>>>0)%6]];}
/** Fixed regional birth multipliers. Never read the player's damage or build.
 * @calls 无内部公开函数。
 * @param {number} index @returns {{hp:number;damage:number;speed:number}}
 */
export function expeditionRegionScale(index){if(!Number.isInteger(index)||index<0||index>2)throw new RangeError('Invalid expedition region');return {hp:[1,1.65,2.4][index],damage:[1,1.15,1.3][index],speed:[1,1.03,1.06][index]};}
/** Local stable identifiers remain unchanged for existing short/API saves.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').StateSnapshot} state @param {string} id @returns {string}
 */
export function localWorldId(state,id){return state.start.difficulty.mode==='expedition'?`b${state.world.map.biomeIndex}:${id}`:id;}
/** Reflect/expand the three layouts inside 3500×2600. Player arrival stays at the separate safe inlet.
 * @calls 无内部公开函数。
 * @param {number} index @param {import('../../contracts.d.ts').Vec2} point @returns {import('../../contracts.d.ts').Vec2}
 */
export function expeditionPoint(index,point){const x=point.x*1.15,y=point.y*1.1;return {x:Math.max(100,Math.min(3400,index===1?3500-x:x)),y:Math.max(100,Math.min(2500,index===2?2600-y:y))};}

/** Effective time in the active sea, excluding every interval spent elsewhere. Existing short/API time stays global.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').StateSnapshot} state
 * @returns {number}
 */
export function regionWorldTick(state){return state.tick-(state.expedition?Number(state.world.map.clockOffset??0):0);}
