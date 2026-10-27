// @ts-check
import { serializeCanonical } from '../domain/serialization.js';
import { CATALOG_DATA } from './catalogData.js';
/**
 * 玩法定义与版本的唯一读取入口；数据存在不表示处理器已实现。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 复制版本化内容定义，实际运行能力由注册表独立声明。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @returns {import('../contracts.d.ts').ContentCatalog}
 */
export function loadContentCatalog() {
  return structuredClone(/** @type {import('../contracts.d.ts').ContentCatalog} */ (CATALOG_DATA));
}

/**
 * 校验ID、前置、升级参数、处理器和模型绑定完整性。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * 约束：27树节点、30局内插件、10DSH、16机制、6MCP、8技能、6伙伴、9敌人；覆盖1–15含11级双机制。
 * @calls domain/serialization.js#serializeCanonical
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {import('../contracts.d.ts').HandlerRegistry} registry
 * @returns {import('../contracts.d.ts').ValidationReport}
 */
export function validateContentCatalog(catalog, registry) {
  const diagnostics = /** @type {import('../contracts.d.ts').Diagnostic[]} */ ([]);
  const fail = (/** @type {string} */ message) => diagnostics.push({ code: 'INVALID_CONTENT', message, relatedIds: [] });
  try {
    serializeCanonical(catalog);
    const counts = { tree: 27, facility: 6, plugin: 30, dsh: 10, weapon: 6, skill: 8, companion: 6, enemy: 9, model: 10, mechanic: 16 };
    for (const [kind, count] of Object.entries(counts)) if (Object.values(catalog.definitions).filter(definition => definition.kind === kind && !Object.hasOwn(catalog.modWeapons ?? {},definition.id) && !Object.hasOwn(catalog.modSkills ?? {},definition.id)).length !== count) fail(`Wrong ${kind} count`);
    if (Object.keys(catalog.modWeapons ?? {}).length > 64 || Object.entries(catalog.modWeapons ?? {}).some(([id,recipe]) => catalog.definitions[id]?.kind !== 'weapon' || !['mcp_bubble','mcp_fan','mcp_vector','mcp_stream','mcp_return','mcp_batch'].includes(recipe.templateId) || !id.startsWith(`${recipe.packId}:`) || !catalog.modLock?.some(pack => pack.id === recipe.packId))) fail('Invalid community weapon registration');
    if (Object.keys(catalog.modSkills ?? {}).length > 64 || Object.entries(catalog.modSkills ?? {}).some(([id,recipe]) => {const d=catalog.definitions[id],cooldown=d?.parameters.cooldown,power=d?.parameters.powerMultiplier;return d?.kind!=='skill'||!['skill_cache','skill_batch'].includes(recipe.templateId)||!id.startsWith(`${recipe.packId}:`)||!catalog.modLock?.some(pack=>pack.id===recipe.packId)||typeof cooldown!=='number'||!Number.isFinite(cooldown)||cooldown<3||cooldown>60||typeof power!=='number'||!Number.isFinite(power)||power<.25||power>3;})) fail('Invalid community skill registration');
    for (const [id, definition] of Object.entries(catalog.definitions)) {
      if (definition.id !== id || !id || !definition.displayName || definition.version !== catalog.version) fail(`Invalid definition ${id}`);
      if (definition.kind === 'tree') {
        const prerequisites = definition.parameters.prerequisites;
        if (!Array.isArray(prerequisites) || prerequisites.some(parent => typeof parent !== 'string' || catalog.definitions[parent]?.kind !== 'tree') || !Number.isSafeInteger(definition.parameters.cost) || Number(definition.parameters.cost) < 0) fail(`Invalid tree node ${id}`);
      }
      if (definition.kind === 'weapon' && ['damage', 'interval', 'projectileSpeed', 'projectileRadius', 'pellets', 'spreadRadians', 'range', 'maxHits'].some(key => typeof definition.parameters[key] !== 'number' || Number(definition.parameters[key]) < 0) || definition.kind === 'weapon' && (Number(definition.parameters.interval) <= 0 || Number(definition.parameters.projectileSpeed) <= 0 || !Number.isInteger(definition.parameters.pellets) || Number(definition.parameters.pellets) < 1 || !Number.isInteger(definition.parameters.maxHits) || Number(definition.parameters.maxHits) < 1)) fail(`Invalid weapon ${id}`);
    }
    if (Object.values(catalog.definitions).filter(definition => definition.kind === 'tree').reduce((sum, node) => sum + Number(node.parameters.cost), 0) !== 160) fail('Tree cost must total 160');
    if (catalog.mechanics.length !== 16 || new Set(catalog.mechanics.map(mechanic => mechanic.id)).size !== 16 || Array.from({ length: 15 }, (_, index) => index + 1).some(level => !catalog.mechanics.some(mechanic => mechanic.unlockAt === level))) fail('Missing cumulative mechanisms');
    for (const mechanic of catalog.mechanics) if (!Number.isInteger(mechanic.unlockAt) || !['ai', 'world', 'objective', 'event', 'boss'].includes(mechanic.scope) || mechanic.unlockAt < 1 || mechanic.unlockAt > 15 || catalog.definitions[mechanic.id]?.kind !== 'mechanic' || registry.bindings[mechanic.id] !== mechanic.handlerId) fail(`Invalid mechanism ${mechanic.id}`);
    if (Object.keys(registry.bindings).length !== 95 || Object.keys(registry.bindings).some(id => !catalog.definitions[id])) fail('Handler bindings incomplete');
    if (registry.implementedIds.some(id => !registry.bindings[id] || catalog.definitions[id]?.parameters.previewAvailable !== true)) fail('Runtime capability declaration differs from catalog');
    // Prerequisites are a DAG, not just references to existing nodes.
    const visiting = new Set(), visited = new Set();
    const visit = (/** @type {string} */ id) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error('Tree prerequisite cycle');
      visiting.add(id);
      const parents = catalog.definitions[id]?.parameters.prerequisites;
      if (Array.isArray(parents)) for (const parent of parents) if (typeof parent === 'string') visit(parent);
      visiting.delete(id); visited.add(id);
    };
    for (const definition of Object.values(catalog.definitions).filter(definition => definition.kind === 'tree')) visit(definition.id);
  } catch { fail('Malformed, non-finite or cyclic catalog'); }
  return { valid: diagnostics.length === 0, diagnostics };
}

/**
 * 按稳定ID取得定义；未知ID返回错误，不按显示名猜测。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {import('../contracts.d.ts').Id} definitionId
 * @returns {import('../contracts.d.ts').Result<import('../contracts.d.ts').Definition>}
 */
export function findContentDefinition(catalog, definitionId) {
  const definition = Object.hasOwn(catalog.definitions, definitionId) ? catalog.definitions[definitionId] : undefined;
  return definition ? { ok: true, value: structuredClone(definition) } : { ok: false, code: 'UNKNOWN_CONTENT', message: `Unknown content: ${definitionId}` };
}

/**
 * 列出指定类别定义供候选/图鉴使用。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {Readonly<import('../contracts.d.ts').ContentCatalog>} catalog
 * @param {string} kind
 * @returns {readonly import('../contracts.d.ts').Definition[]}
 */
export function listContentByKind(catalog, kind) {
  return Object.values(catalog.definitions).filter(definition => definition.kind === kind).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(definition => structuredClone(definition));
}
