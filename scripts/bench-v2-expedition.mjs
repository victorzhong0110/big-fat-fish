import {performance} from 'node:perf_hooks';
import {loadContentCatalog} from '../src/v2/content/catalog.js';
import {resolveDifficultySnapshot} from '../src/v2/domain/difficulty.js';
import {createGameSession,readSessionState,disposeGameSession,createReplaySession,stepSessionWorld} from '../src/v2/engine/session.js';
import {applySystemPlan} from '../src/v2/engine/reducer.js';
import {planExpeditionBossEncounter,planExpeditionProgression,planExpeditionTravel} from '../src/v2/domain/world/expedition.js';
// Controlled five-second sample with two suspended regions, ordinary living residents and nearby combat.
// It is a regression probe, not a 40-minute endurance or player-experience test.
const catalog=loadContentCatalog();
const start={runtimeProfile:'adventure-slice',runId:'benchmark:expedition',treeNodeIds:[],dsh:[],difficulty:resolveDifficultySnapshot({mode:'expedition',difficulty:1},catalog).value,loadout:{weapons:[{instanceId:'bubble',definitionId:'mcp_bubble',originalQuality:0,cooldown:0,temporaryQuality:null,updateExpiresAt:null}],activeWeaponIndex:0,skillId:'skill_disconnect',skillCooldown:0,companionId:null,companionCooldown:0,dashCooldown:0}};
const initial=createGameSession(start,19,catalog);let s=readSessionState(initial);disposeGameSession(initial);
const context=()=>({state:s,catalog,event:null,entityId:null,random:s.random.world});
for(let n=0;n<2;n++){
 for(const o of s.world.objectives.slice(0,2)){o.completed=true;o.active=false;o.progress=o.requiredProgress;for(const id of o.requiredEntityIds){const e=s.world.entities[id];e.hp=0;e.dead=true;e.dying=true;}}
 s=applySystemPlan(s,planExpeditionBossEncounter(context()));const boss=s.world.entities[s.bosses[0].entityId];boss.hp=0;boss.dead=true;boss.dying=true;s=applySystemPlan(s,planExpeditionProgression(context()));s.tick++;s.world.entities.fish.position={...s.world.entities[`b${n}:boss:gate`].position};s=applySystemPlan(s,planExpeditionTravel(context(),n+1));
 if(s.world.map.biomeIndex!==n+1)throw Error('Benchmark fixture did not enter the next region');
}
s.world.entities.fish.position={x:1000,y:1800};s.world.entities.fish.previousPosition={...s.world.entities.fish.position};s.player.invulnerableRemaining=30;s.input.viewport={width:800,height:500};const session=createReplaySession(s,catalog);if(!session.ok)throw Error(session.message);
const samples=[];try{for(let i=0;i<300;i++){const t=performance.now(),result=stepSessionWorld(session.value);samples.push(performance.now()-t);if(result.next.flow.phase!=='exploring')throw Error(`Benchmark stopped early in ${result.next.flow.phase}`);}const end=readSessionState(session.value);samples.sort((a,b)=>a-b);console.log(JSON.stringify({scope:'300 world steps; controlled two-archive fixture; not endurance or mobile validation',sampleTicks:samples.length,activeEntities:Object.keys(end.world.entities).length,archivedEntities:end.expedition.regions.filter(Boolean).map(r=>Object.keys(r.world.entities).length),meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95Ms:samples[Math.floor(samples.length*.95)],maxMs:samples.at(-1)},null,2));}finally{disposeGameSession(session.value);}
