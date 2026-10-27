// @ts-check
/** Rebase only absolute local time keys. Zero remains the inactive/ready sentinel except real history timestamps. Relative durations, HP, cooldown seconds, IDs, coordinates and budgets never change.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Json} value
 * @param {number} delta
 * @returns {import('../../contracts.d.ts').Json}
 */
export function rebaseRegionTime(value,delta){if(!Number.isSafeInteger(delta)||delta<0)throw new RangeError('Invalid regional suspension time');const history=new Set(['bornAt','createdAt','startedAt','deathAt']);
 /** @type {(v:import('../../contracts.d.ts').Json,key?:string)=>import('../../contracts.d.ts').Json} */
 const visit=(/** @type {import('../../contracts.d.ts').Json} */v,/** @type {string} */key='')=>{if(typeof v==='number'&&Number.isSafeInteger(v)&&(v>0||v===0&&history.has(key))&&/(?:At|Until|End|Tick)$/.test(key)){const next=v+delta;if(!Number.isSafeInteger(next))throw new RangeError('Regional clock overflow');return next;}if(Array.isArray(v))return v.map(x=>visit(x));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x,k)]));return v;};return visit(value);}
