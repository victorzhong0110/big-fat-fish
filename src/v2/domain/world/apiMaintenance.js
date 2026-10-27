// @ts-check
import {createEmptyPlan,createStateChange} from '../plans.js';
/** Compact only expired API identities. Attack owners stay until their live projectiles/statuses/shields are gone. Removed source IDs are never reused; old reward events can no longer resolve an entity. Rice/material pickups merge by kind and grid with exact totals.
 * @implementationScope adventure-slice API
 * @calls domain/plans.js#createEmptyPlan
 * @calls domain/plans.js#createStateChange
 * @param {import('../../contracts.d.ts').EvaluationContext} c
 * @returns {import('../../contracts.d.ts').SystemPlan}
 */
export function planApiMaintenance(c){
 const s=c.state;if(!s.api||s.tick%600)return createEmptyPlan();const bodies=Object.values(s.world.entities),referenced=new Set([...bodies.filter(e=>{const owner=s.world.entities[e.sourceId];return e.sourceId!==e.id&&!(owner?.dead&&owner.runtime.apiStage===true&&s.tick-Number(owner.runtime.deathAt??0)>=720&&['objective','obstacle'].includes(e.kind));}).map(e=>e.sourceId),...Object.values(s.world.statuses).map(e=>e.sourceId),...Object.values(s.world.shields).map(e=>e.sourceId)]),removed=new Set(),changes=/** @type {import('../../contracts.d.ts').StateChange[]} */([]);
 for(const e of bodies){if(e.id===s.player.entityId||!e.dead||s.tick-Number(e.runtime.deathAt??0)<720||referenced.has(e.id))continue;removed.add(e.id);if(e.runtime.apiStage===true){const prefix=e.id.split(':').slice(0,2).join(':')+':';for(const child of bodies)if(child.id.startsWith(prefix)&&['obstacle','objective'].includes(child.kind))removed.add(child.id);}}
 for(const id of removed)changes.push(createStateChange('world',id,'removeEntity',{}));
 const retired=new Set([...removed].flatMap(id=>[`deathReward:${id}`,`distill:death:${id}`,`salvage:death:${id}`]));
 changes.push(createStateChange('runtime','api','compactApiLedgers',{rewardIds:s.processedRewardIds.filter(id=>!retired.has(id)&&(!id.startsWith('growth:')||id===`growth:${s.runId}:level:${s.level}`)),resolvedTrialIds:s.lora.resolvedTrialIds.slice(-64)}));
 if(removed.size){changes.push(createStateChange('world','bosses','setBosses',{bosses:s.bosses.filter(b=>!removed.has(b.entityId))}));const obstacles=s.world.map.obstacleIds.filter(id=>!removed.has(id));if(obstacles.length!==s.world.map.obstacleIds.length)changes.push(createStateChange('world',s.world.map.id,'setMap',{...s.world.map,obstacleIds:obstacles,navigationRevision:s.world.map.navigationRevision+1}));}
 const events=s.world.pressureEvents.filter(e=>!['completed','cancelled'].includes(e.phase)||e.phase==='completed'&&e.runtime.kind==='elite'&&s.world.entities[String(e.runtime.eliteOwner)]?.runtime.completed!==true||e.runtime.biome!==undefined&&!e.runtime.parentId||e.runtime.parentId&&s.world.pressureEvents.some(p=>p.id===e.runtime.parentId&&p.phase==='queued'));
 changes.push(createStateChange('world','pressure','setPressureEvents',{events}),createStateChange('world','api','setSpawnDirector',{queue:s.world.spawnQueue,budgets:s.world.budgets.filter(b=>!b.id.startsWith('grokWave:')||b.reserved>0||events.some(e=>e.budgetId===b.id)||bodies.some(e=>!removed.has(e.id)&&e.runtime.spawnGroup===b.id&&!e.dead)),nextAt:s.spawnDirectorNextAt??720}));
 const groups=/** @type {Map<string,import('../../contracts.d.ts').PickupState[]>} */(new Map());for(const p of Object.values(s.world.pickups).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)){if(!['riceXp','gpuFragment','part'].includes(p.kind)||p.collected)continue;const key=`${p.kind}:${Math.floor(p.position.x/160)}:${Math.floor(p.position.y/160)}`,group=groups.get(key)??[];group.push(p);groups.set(key,group);}
 for(const group of groups.values()){if(group.length<2)continue;const amount=group.reduce((n,p)=>n+p.amount,0);if(!Number.isSafeInteger(amount))throw new Error('API pickup total exceeds numeric range');changes.push(createStateChange('world',group[0].id,'putPickup',{...group[0],amount}));for(const p of group.slice(1))changes.push(createStateChange('world',p.id,'removePickup',{}));}
 return {...createEmptyPlan(),changes};
}
