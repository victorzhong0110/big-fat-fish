// @ts-check
/** Namespace all newly created encounter identities while preserving marker:<nodeId> derivation. Existing map IDs and content definition IDs stay intact.
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').SystemPlan} plan
 * @param {readonly import('../../contracts.d.ts').BossState[]} previous
 * @param {string} prefix
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function namespaceEncounterPlan(plan,previous,prefix){const ids=new Map();for(const ch of plan.changes)if(ch.operation==='putEntity')ids.set(ch.id,`${prefix}${ch.id}`);const record=/** @type {{bosses:readonly import('../../contracts.d.ts').BossState[]}|undefined} */(plan.changes.find(ch=>ch.operation==='setBosses')?.payload);for(const b of record?.bosses??[])for(const n of b.resetNodes){ids.set(n.id,`${prefix}${n.id}`);ids.set(`marker:${n.id}`,`marker:${prefix}${n.id}`);}const rewrite=(/** @type {import('../../contracts.d.ts').Json} */value)=>JSON.parse(JSON.stringify(value,(_k,v)=>typeof v==='string'?(ids.get(v)??v):v));const changes=plan.changes.map(ch=>({...ch,id:ids.get(ch.id)??ch.id,payload:rewrite(ch.payload)}));for(const ch of changes)if(ch.operation==='setBosses'){const p=/** @type {{bosses:import('../../contracts.d.ts').BossState[]}} */(/** @type {unknown} */(ch.payload));p.bosses=[...structuredClone(previous),...p.bosses];}return {...plan,changes};}
