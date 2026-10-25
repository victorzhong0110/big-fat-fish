// @ts-check
/** Resolve native behavior for an official weapon or an explicitly registered community recipe.
 * @calls 无内部公开函数。
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {string} id
 * @returns {'mcp_bubble'|'mcp_fan'|null}
 */
export function resolveWeaponTemplate(catalog, id) {
  if (catalog.definitions[id]?.kind !== 'weapon') return null;
  if (id === 'mcp_bubble' || id === 'mcp_fan') return id;
  const recipe = catalog.modWeapons?.[id];
  return recipe && (recipe.templateId === 'mcp_bubble' || recipe.templateId === 'mcp_fan') && catalog.modLock?.some(pack => pack.id === recipe.packId) ? recipe.templateId : null;
}

/** List only weapons whose native behavior can actually run in this runtime.
 * @calls content/weaponCapabilities.js#resolveWeaponTemplate
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @returns {readonly string[]}
 */
export function listRuntimeWeapons(catalog) {
  return Object.keys(catalog.definitions).filter(id => resolveWeaponTemplate(catalog,id) !== null).sort();
}
