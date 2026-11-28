import { describe, it, expect } from 'vitest';
import { loadContentCatalog } from '../../src/v2/content/catalog.js';
import { resolvePrizePresentation } from '../../src/v2/preview/arcadePanels.js';

const catalog = loadContentCatalog();
/** Verified against the #20 sheet. These pairs are the expectation, not a copy of the lookup table. */
const verifiedCells = [
  ['plugin_parallel', 0], ['plugin_local_deploy', 1], ['plugin_quant_int4', 2], ['plugin_rollback_emergency', 3], ['plugin_batch', 4], ['plugin_compress', 5],
  ['plugin_cache', 6], ['plugin_retry', 7], ['plugin_temperature', 8], ['plugin_collect', 9], ['plugin_cooldown', 10], ['plugin_offload', 11],
  ['plugin_keepalive', 12], ['plugin_redirect', 13], ['plugin_backoff', 14], ['plugin_distill', 15], ['plugin_5h', 16], ['plugin_failover', 17],
  ['plugin_sandbox', 18], ['plugin_hallucination', 19], ['plugin_chain', 20], ['plugin_context', 21], ['plugin_hotplug', 22], ['plugin_guard', 23],
  ['plugin_prefill', 24], ['plugin_toolchain', 25], ['plugin_mirror', 26], ['plugin_recursion', 27], ['plugin_moe', 28], ['plugin_speculate', 29],
  ['plugin_window', 30], ['plugin_agent', 31], ['plugin_breaker', 32],
];

describe('prize atlas cells', () => {
  it('pins every official plugin to its approved cell, independent of rarity or catalog order', () => {
    expect(verifiedCells).toHaveLength(33);
    const official = Object.values(catalog.definitions).filter(definition => definition.kind === 'plugin' && definition.parameters.previewAvailable === true).map(definition => definition.id).sort();
    expect(verifiedCells.map(([id]) => id).sort()).toEqual(official);
    for (const [id, cell] of verifiedCells) {
      const definition = catalog.definitions[id];
      const presented = resolvePrizePresentation(definition, 1);
      const recolored = resolvePrizePresentation({ ...definition, parameters: { ...definition.parameters, rarity: definition.parameters.rarity === 'legendary' ? 'common' : 'legendary' } }, 1);
      expect(presented.cell, id).toBe(cell);
      expect(recolored.cell, id).toBe(cell);
      expect(presented.badge).toBe(({common:'白银', advanced:'黄金', legendary:'棱彩'})[definition.parameters.rarity]);
      expect(presented.name).toBe(`${definition.displayName} · 1级`);
      expect(presented.effect).toBe(definition.parameters.rankDescriptions[0]);
      expect(resolvePrizePresentation(definition, 2).effect).toBe(definition.parameters.rankDescriptions[1]);
    }
    expect(new Set(verifiedCells.map(([, cell]) => cell)).size).toBe(33);
  });

  it('shows an unregistered extension on the shared generic cell', () => {
    const extension = { id: 'community.example:toy', kind: 'plugin', displayName: '外来玩具', parameters: { rarity: 'advanced', rankDescriptions: ['冒泡', '再冒泡'] } };
    const view = resolvePrizePresentation(extension, 2);
    expect(view.cell).toBe('generic');
    expect(view.badge).toBe('黄金');
    expect(view.name).toBe('外来玩具 · 2级');
    expect(view.effect).toBe('再冒泡');
  });
});
