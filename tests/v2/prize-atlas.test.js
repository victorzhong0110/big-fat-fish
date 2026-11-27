import { describe, it, expect } from 'vitest';
import { loadContentCatalog } from '../../src/v2/content/catalog.js';
import { resolvePrizePresentation } from '../../src/v2/preview/arcadePanels.js';

const catalog = loadContentCatalog();
const official = Object.values(catalog.definitions).filter(definition => definition.kind === 'plugin' && definition.parameters.previewAvailable === true);

describe('prize atlas cells', () => {
  it('assigns each official plugin a unique cell that ignores catalog order and rarity', () => {
    const forward = [...official].sort((a, b) => a.id.localeCompare(b.id));
    const cells = forward.map(definition => resolvePrizePresentation(definition, 1).cell);
    expect(official).toHaveLength(33);
    expect(new Set(cells).size).toBe(33);
    expect(cells.every(cell => typeof cell === 'number' && cell >= 0 && cell < 33)).toBe(true);
    for (const definition of [...forward].reverse()) {
      const swapped = { ...definition, parameters: { ...definition.parameters, rarity: definition.parameters.rarity === 'legendary' ? 'common' : 'legendary' } };
      expect(resolvePrizePresentation(swapped, 1).cell).toBe(resolvePrizePresentation(definition, 1).cell);
    }
    for (const rarity of ['common', 'advanced', 'legendary']) {
      const definition = official.find(item => item.parameters.rarity === rarity);
      const view = resolvePrizePresentation(definition, 1);
      const badge = rarity === 'legendary' ? '棱彩' : rarity === 'advanced' ? '黄金' : '白银';
      expect(view.badge).toBe(badge);
      expect(view.name).toBe(`${definition.displayName} · 1级`);
      expect(view.effect).toBe(definition.parameters.rankDescriptions[0]);
      expect(resolvePrizePresentation(definition, 2).effect).toBe(definition.parameters.rankDescriptions[1]);
    }
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
