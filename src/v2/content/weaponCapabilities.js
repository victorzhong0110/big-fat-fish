// @ts-check
/** Resolve native behavior for an official weapon or an explicitly registered community recipe.
 * @calls 无内部公开函数。
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {string} id
 * @returns {import('../contracts.d.ts').WeaponTemplateId|null}
 */
export function resolveWeaponTemplate(catalog, id) {
  if (catalog.definitions[id]?.kind !== 'weapon') return null;
  if (['mcp_bubble','mcp_fan','mcp_vector','mcp_stream','mcp_return','mcp_batch'].includes(id)) return /** @type {import('../contracts.d.ts').WeaponTemplateId} */(id);
  const recipe = catalog.modWeapons?.[id];
  return recipe && ['mcp_bubble','mcp_fan','mcp_vector','mcp_stream','mcp_return','mcp_batch'].includes(recipe.templateId) && catalog.modLock?.some(pack => pack.id === recipe.packId) ? recipe.templateId : null;
}

/** List only weapons whose native behavior can actually run in this runtime.
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {readonly string[]}
 */
export function listRuntimeWeapons(catalog) {
  return Object.keys(catalog.definitions).filter(id => resolveWeaponTemplate(catalog,id) !== null).sort();
}
