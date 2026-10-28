// @ts-check
import {validateContentCatalog} from '../content/catalog.js';
import {createHandlerRegistry} from '../content/registry.js';
import {createDataDigest} from '../domain/serialization.js';
import {createDefaultProfile,validateProfileRecord} from '../domain/settlement.js';
import {readProfileRepository} from './repository.js';

/** Return a stable storage namespace for one exact content version and ordered mod lock.
 * A matching profile also stores and verifies the complete lock, not just this checksum.
 * @calls content/catalog.js#validateContentCatalog
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/serialization.js#createDataDigest
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {string}
 */
export function createModProfileNamespace(catalog){
 if(!catalog.modLock?.length||!validateContentCatalog(catalog,createHandlerRegistry()).valid)throw new Error('需要有效且已启用的模组');
 return `big-fat-fish:v2:profile:mods:${createDataDigest({version:catalog.version,lock:catalog.modLock})}`;
}

/** Create a detached, explicitly chosen new or vanilla-copy mod profile; never carry an active checkpoint.
 * Community weapons and skills are available as starting choices only inside this mod scope.
 * @calls application/modProfile.js#createModProfileNamespace
 * @calls content/catalog.js#validateContentCatalog
 * @calls content/registry.js#createHandlerRegistry
 * @calls domain/serialization.js#createDataDigest
 * @calls domain/settlement.js#createDefaultProfile
 * @calls domain/settlement.js#validateProfileRecord
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} base
 * @param {import('../contracts.d.ts').Profile|null} source
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').Profile>}
 */
export function createModProfileSnapshot(catalog,base,source){
 try{
  createModProfileNamespace(catalog);
  if(base.modLock?.length||catalog.version!==`${base.version}+mods.${createDataDigest(catalog.modLock??[]).slice('fnv1a64:'.length)}`||!validateContentCatalog(base,createHandlerRegistry()).valid)return {ok:false,code:'MOD_PROFILE_CATALOG',message:'模组和基础内容版本不匹配。'};
  const original=source??createDefaultProfile(),validation=validateProfileRecord(original,base);
  if(!validation.valid)return {ok:false,code:'MOD_PROFILE_SOURCE',message:'原版小窝档案无效，无法复制。'};
  const weapons=Object.keys(catalog.modWeapons??{}),skills=Object.keys(catalog.modSkills??{}),profile={...structuredClone(original),revision:0,checkpoint:null,modLock:structuredClone(catalog.modLock??[]),modContentVersion:catalog.version,discovered:[...new Set([...original.discovered,...weapons,...skills])],unlockedWeapons:[...new Set([...original.unlockedWeapons,...weapons])],unlockedSkills:[...new Set([...original.unlockedSkills,...skills])]};
  const report=validateProfileRecord(profile,catalog);if(!report.valid)return {ok:false,code:'MOD_PROFILE_INVALID',message:report.diagnostics.map(d=>d.message).join('; ')};
  return {ok:true,value:profile};
 }catch(error){return {ok:false,code:'MOD_PROFILE_CATALOG',message:error instanceof Error?error.message:String(error)};}
}

/** Initialize a missing mod namespace exactly once; concurrent creation reads the winning record without replacing it.
 * @calls application/modProfile.js#createModProfileSnapshot
 * @calls application/repository.js#readProfileRepository
 * @param {import('../contracts.d.ts').StoragePort} storage
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} base
 * @param {import('../contracts.d.ts').Profile|null} source
 * @returns {Promise<import('../contracts.d.ts').Result<import('../contracts.d.ts').StorageRecord>>}
 */
export async function initializeModProfile(storage,catalog,base,source){
 const existing=await storage.read();if(existing.ok)return readProfileRepository(storage,catalog);if(existing.code!=='PROFILE_MISSING')return existing;
 const made=createModProfileSnapshot(catalog,base,source);if(!made.ok)return made;
 const saved=await storage.compareAndSwap(-1,{revision:0,profile:made.value});
 if(!saved.ok&&saved.code==='REVISION_CONFLICT')return readProfileRepository(storage,catalog);
 return saved;
}
