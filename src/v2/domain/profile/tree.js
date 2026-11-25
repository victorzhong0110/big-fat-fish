// @ts-check
/**
 * 30个永久节点、免费整树退款与DSH槽计算。
 * Incremental implementation; unavailable functions remain explicit TODOs.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 校验前置、余额与DSH基础花费门槛，不消耗资金。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').Id} nodeId
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').ValidationReport}
 */
export function validateTreePurchase(profile, nodeId, catalog) {
  const definition = catalog.definitions[nodeId], p = definition?.parameters;
  const diagnostics = /** @type {import('../../contracts.d.ts').Diagnostic[]} */ ([]);
  const fail = (/** @type {string} */ message) => diagnostics.push({ code: 'TREE_PURCHASE_REJECTED', message, relatedIds: [nodeId] });
  if (definition?.kind !== 'tree' || !p || !Number.isSafeInteger(p.cost) || Number(p.cost) < 0) fail('Unknown tree node');
  else {
    if (profile.purchasedTree.includes(nodeId)) fail('Node already owned');
    if (profile.gpuCards < Number(p.cost)) fail('Not enough GPU cards');
    if (!Array.isArray(p.prerequisites) || !p.prerequisites.every(id => typeof id === 'string' && profile.purchasedTree.includes(id))) fail('Missing prerequisite');
    if (p.requiresAnyDsh === true && !profile.unlockedDsh.length) fail('Discover a DSH plugin first');
    const spent = profile.purchasedTree.filter(id => !id.startsWith('tree_dsh_')).reduce((sum, id) => sum + Number(catalog.definitions[id]?.parameters.cost ?? 0), 0);
    if (spent < Number(p.baseSpendRequired ?? 0)) fail('Not enough cards spent on base branches');
  }
  return { valid: !diagnostics.length, diagnostics };
}

/**
 * 一次节点购买与余额扣除作为同个局外计划。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls domain/profile/tree.js#validateTreePurchase
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {import('../../contracts.d.ts').Id} nodeId
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').Result<import('../../contracts.d.ts').ProfilePlan>}
 */
export function planTreePurchase(profile, nodeId, catalog) {
  const validation = validateTreePurchase(profile, nodeId, catalog);
  if (!validation.valid) return { ok: false, code: validation.diagnostics[0].code, message: validation.diagnostics.map(item => item.message).join('; ') };
  return { ok: true, value: { expectedRevision: profile.revision, next: { ...structuredClone(profile), revision: profile.revision + 1, gpuCards: profile.gpuCards - Number(catalog.definitions[nodeId].parameters.cost), purchasedTree: [...profile.purchasedTree, nodeId] }, events: [] } };
}

/**
 * 整树按已购成本全退，DSH槽关闭并卸下配装，收藏保留。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {import('../../contracts.d.ts').ProfilePlan}
 */
export function planTreeRespec(profile, catalog) {
  const refund = profile.purchasedTree.reduce((sum, id) => { const definition = catalog.definitions[id]; if (definition?.kind !== 'tree' || !Number.isSafeInteger(definition.parameters.cost)) throw new Error('Unknown purchased node requires migration'); return sum + Number(definition.parameters.cost); }, 0);
  return { expectedRevision: profile.revision, next: { ...structuredClone(profile), revision: profile.revision + 1, gpuCards: profile.gpuCards + refund, purchasedTree: [], equippedDsh: [] }, events: [] };
}

/**
 * 仅根据三个特殊节点返回0–3槽，不根据收藏数量增加槽。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../../contracts.d.ts').Profile} profile
 * @param {Readonly<import('../../contracts.d.ts').ContentCatalog>} catalog
 * @returns {number}
 */
export function resolveDshSlotCount(profile, catalog) {
  return ['tree_dsh_a', 'tree_dsh_b', 'tree_dsh_c'].filter(id => catalog.definitions[id]?.kind === 'tree' && profile.purchasedTree.includes(id)).length;
}
