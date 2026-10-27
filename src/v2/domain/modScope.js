// @ts-check
import {serializeCanonical} from './serialization.js';
/** Snapshot the exact namespace carried by a modded adventure; ordinary and practice runs have no permanent mod scope.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @returns {import('../contracts.d.ts').ModScope|null}
 */
export function createRunModScope(state){
 if(state.start.moddedAdventure!==true)return null;
 return {contentVersion:state.versions.content,modLock:structuredClone(state.start.modLock??[])};
}

/** Bind a persistence intent to the run's mod namespace without modifying its original payload.
 * @calls domain/modScope.js#createRunModScope
 * @param {import('../contracts.d.ts').PersistenceIntent} intent
 * @param {import('../contracts.d.ts').StateSnapshot} state
 * @returns {import('../contracts.d.ts').PersistenceIntent}
 */
export function scopePersistenceIntent(intent,state){const modScope=createRunModScope(state);return modScope?{...intent,modScope}:{...intent};}

/** Return the permanent profile's expected namespace; legacy vanilla profiles have no scope.
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').Profile} profile
 * @returns {import('../contracts.d.ts').ModScope|null}
 */
export function createProfileModScope(profile){return profile.modLock?.length?{contentVersion:profile.modContentVersion??'',modLock:structuredClone(profile.modLock)}:null;}

/** Compare complete scope data and fail closed on malformed or non-finite input.
 * @calls domain/serialization.js#serializeCanonical
 * @param {import('../contracts.d.ts').ModScope|null|undefined} a
 * @param {import('../contracts.d.ts').ModScope|null|undefined} b
 * @returns {boolean}
 */
export function equalModScopes(a,b){try{return serializeCanonical(a??null)===serializeCanonical(b??null);}catch{return false;}}
