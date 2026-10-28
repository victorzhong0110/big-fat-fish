// @ts-check
/** Resolve an implemented native skill, or a declarative community recipe owned by a locked package.
 * @implementationScope core-preview + adventure-slice
 * @calls 无内部公开函数。
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {string} id
 * @returns {import('../contracts.d.ts').SkillTemplateId|null}
 */
export function resolveSkillTemplate(catalog,id){
 if(catalog.definitions[id]?.kind!=='skill')return null;
 if(['skill_cache','skill_disconnect','skill_batch','skill_redirect','skill_sandbox','skill_fork','skill_rollback','skill_overclock'].includes(id))return /** @type {import('../contracts.d.ts').SkillTemplateId} */(id);
 const recipe=catalog.modSkills?.[id];return recipe&&['skill_cache','skill_batch'].includes(recipe.templateId)&&id.startsWith(`${recipe.packId}:`)&&catalog.modLock?.some(pack=>pack.id===recipe.packId)?recipe.templateId:null;
}

/** List the skills whose native behavior is actually available in this catalog.
 * @implementationScope core-preview + adventure-slice
 * @calls content/skillCapabilities.js#resolveSkillTemplate
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {readonly string[]}
 */
export function listRuntimeSkills(catalog){return Object.keys(catalog.definitions).filter(id=>resolveSkillTemplate(catalog,id)!==null).sort();}
