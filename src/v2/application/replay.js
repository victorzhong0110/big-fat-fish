// @ts-check
import {createReplaySession,enqueueSessionCommand,stepSessionWorld,stepSessionUi,readSessionState,disposeGameSession} from '../engine/session.js';
import {createStateDigest} from '../engine/snapshot.js';
import {serializeCanonical} from '../domain/serialization.js';
const MAX_STEPS=500000,MAX_COMMANDS=100000,MAX_BYTES=64*1024*1024;
/** Detached recording boundary. Start only when the caller has no queued Session commands; the complete random streams, content lock and UI/Boss state are preserved.
 * @implementationScope isolated-replay
 * @calls domain/serialization.js#serializeCanonical
 * @calls engine/snapshot.js#createStateDigest
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @returns {import('../contracts.d.ts').Recording}
 */
export function beginRecording(state){
 const initial=/** @type {import('../contracts.d.ts').GameState} */(JSON.parse(serializeCanonical(state)));
 return {versions:{...initial.versions},initial,initialDigest:createStateDigest(initial),commands:[],digests:[],steps:[]};
}
/** Append only commands already accepted by the live Session, in their actual enqueue order. Rejected commands are never recorded as successful input.
 * @implementationScope isolated-replay
 * @calls domain/serialization.js#serializeCanonical
 * @param {import('../contracts.d.ts').Recording} recording
 * @param {readonly import('../contracts.d.ts').Command[]} commands
 * @returns {import('../contracts.d.ts').Recording}
 */
export function appendRecordedCommands(recording,commands){
 if(recording.commands.length+commands.length>MAX_COMMANDS)throw new Error('Recording command limit reached; start a new segment');
 const ids=new Set(recording.commands.map(c=>c.id)),seqs=new Set(recording.commands.map(c=>c.seq));
 for(const c of commands){if(typeof c.id!=='string'||!Number.isSafeInteger(c.seq)||ids.has(c.id)||seqs.has(c.seq))throw new Error('Invalid or duplicate recording command');ids.add(c.id);seqs.add(c.seq);}
 return {...recording,commands:[...recording.commands,...JSON.parse(serializeCanonical(commands))]};
}
/** Record every executed fixed step, including UI command flushes and frozen-world calls. The step ordinal disambiguates multiple UI decisions at one world tick.
 * @implementationScope isolated-replay
 * @calls domain/serialization.js#serializeCanonical
 * @calls engine/snapshot.js#createStateDigest
 * @param {import('../contracts.d.ts').Recording} recording
 * @param {'world'|'ui'} domain
 * @param {boolean} advanceClock
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @returns {import('../contracts.d.ts').Recording}
 */
export function appendRecordingStep(recording,domain,advanceClock,state){
 if(recording.steps.length>=MAX_STEPS)throw new Error('Recording step limit reached; start a new segment');
 if(!['world','ui'].includes(domain)||typeof advanceClock!=='boolean'||state.runId!==recording.initial.runId||serializeCanonical(state.versions)!==serializeCanonical(recording.versions))throw new Error('Invalid recording step');
 const digest=createStateDigest(state),step={domain,advanceClock,commandCount:recording.commands.length,tick:state.tick,uiTick:state.uiTick,digest};
 return {...recording,steps:[...recording.steps,step],digests:[...recording.digests,{tick:state.tick,digest}]};
}
/** Re-execute the exact command enqueue batches and fixed-step domains through the live Session engine. Compare every recorded digest; stop at the first divergence, always dispose the isolated Session, never apply persistence intents.
 * @implementationScope isolated-replay
 * @calls domain/serialization.js#serializeCanonical
 * @calls engine/session.js#createReplaySession
 * @calls engine/session.js#disposeGameSession
 * @calls engine/session.js#enqueueSessionCommand
 * @calls engine/session.js#readSessionState
 * @calls engine/session.js#stepSessionUi
 * @calls engine/session.js#stepSessionWorld
 * @calls engine/snapshot.js#createStateDigest
 * @param {import('../contracts.d.ts').Recording} recording
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../contracts.d.ts').Result<readonly {tick:import('../contracts.d.ts').Tick;digest:string}[]>}
 */
export function replayRecording(recording,catalog){
 /** @type {import('../contracts.d.ts').GameSession|null} */let session=null;
 try{
  if(!Array.isArray(recording.steps)||!Array.isArray(recording.commands)||!Array.isArray(recording.digests)||recording.steps.length>MAX_STEPS||recording.commands.length>MAX_COMMANDS||recording.digests.length!==recording.steps.length||new TextEncoder().encode(serializeCanonical(recording)).length>MAX_BYTES)return {ok:false,code:'REPLAY_LIMIT',message:'Malformed or oversized recording'};
  if(serializeCanonical(recording.versions)!==serializeCanonical(recording.initial.versions)||recording.initialDigest!==createStateDigest(recording.initial))return {ok:false,code:'REPLAY_INITIAL',message:'Recording initial state or version header was modified'};
  const restored=createReplaySession(recording.initial,catalog);if(!restored.ok)return restored;session=restored.value;
  let cursor=0;const digests=/** @type {{tick:number;digest:string}[]} */([]);
  for(let index=0;index<recording.steps.length;index++){
   const step=recording.steps[index];if(!['world','ui'].includes(step.domain)||typeof step.advanceClock!=='boolean'||!Number.isSafeInteger(step.commandCount)||step.commandCount<cursor||step.commandCount>recording.commands.length)return {ok:false,code:'REPLAY_STEP',message:`Invalid input boundary at step ${index}`};
   while(cursor<step.commandCount){const accepted=enqueueSessionCommand(session,recording.commands[cursor++]);if(!accepted.ok)return {ok:false,code:'REPLAY_COMMAND',message:`Step ${index}: ${accepted.message}`};}
   const result=step.domain==='world'?stepSessionWorld(session):stepSessionUi(session,step.advanceClock),digest=createStateDigest(result.next),expected=recording.digests[index];
   if(result.next.tick!==step.tick||result.next.uiTick!==step.uiTick||digest!==step.digest||expected.tick!==step.tick||expected.digest!==digest)return {ok:false,code:'REPLAY_DIVERGENCE',message:`First divergence at step ${index} (${step.domain}, world ${result.next.tick}, UI ${result.next.uiTick})`};
   digests.push({tick:result.next.tick,digest});
  }
  if(cursor!==recording.commands.length)return {ok:false,code:'REPLAY_UNSTEPPED',message:'Recording contains commands after its last fixed step'};
  // Reading the final state uses the same detached boundary as downstream community tools.
  if(readSessionState(session).runId!==recording.initial.runId)return {ok:false,code:'REPLAY_STATE',message:'Recording run identity changed'};
  return {ok:true,value:digests};
 }catch{return {ok:false,code:'REPLAY_MALFORMED',message:'Malformed recording data or invalid simulation step'};}
 finally{if(session)disposeGameSession(session);}
}
