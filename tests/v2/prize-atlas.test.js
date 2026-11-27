import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContentCatalog } from '../../src/v2/content/catalog.js';
import { resolvePrizePresentation } from '../../src/v2/preview/arcadePanels.js';

const catalog = loadContentCatalog();
const atlasPath = join(dirname(fileURLToPath(import.meta.url)), '../../public/art/interface/prize-toys.webp');
/** Verified against the #20 sheet. These pairs are the expectation, not a copy of the lookup table. */
const verifiedCells = [
  ['plugin_parallel', 0], ['plugin_local_deploy', 1], ['plugin_quant_int4', 2], ['plugin_rollback_emergency', 3], ['plugin_batch', 4], ['plugin_compress', 5],
  ['plugin_cache', 6], ['plugin_retry', 7], ['plugin_temperature', 8], ['plugin_collect', 9], ['plugin_cooldown', 10], ['plugin_offload', 11],
  ['plugin_keepalive', 12], ['plugin_redirect', 13], ['plugin_backoff', 14], ['plugin_distill', 15], ['plugin_5h', 16], ['plugin_failover', 17],
  ['plugin_sandbox', 18], ['plugin_hallucination', 19], ['plugin_chain', 20], ['plugin_context', 21], ['plugin_hotplug', 22], ['plugin_guard', 23],
  ['plugin_prefill', 24], ['plugin_toolchain', 25], ['plugin_mirror', 26], ['plugin_recursion', 27], ['plugin_moe', 28], ['plugin_speculate', 29],
  ['plugin_window', 30], ['plugin_agent', 31], ['plugin_breaker', 32],
];

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left), upDistance = Math.abs(estimate - up), diagonal = Math.abs(estimate - left - up + upLeft);
  return leftDistance <= upDistance && leftDistance <= diagonal ? left : upDistance <= diagonal ? up : upLeft;
}

function decodePng(buf) {
  let offset = 8, width = 0, height = 0, chunks = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('Prize sheet PNG is not straight 8-bit RGBA'); }
    if (type === 'IDAT') chunks.push(data);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4, pixels = Buffer.alloc(height * stride);
  let cursor = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor++], row = y * stride, previous = row - stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? pixels[row + x - 4] : 0, up = y ? pixels[previous + x] : 0, upLeft = y && x >= 4 ? pixels[previous + x - 4] : 0, value = raw[cursor++];
      pixels[row + x] = filter === 0 ? value : filter === 1 ? (value + left) & 255 : filter === 2 ? (value + up) & 255 : filter === 3 ? (value + ((left + up) >> 1)) & 255 : (value + paeth(left, up, upLeft)) & 255;
    }
  }
  return { width, height, pixels };
}

function loadAtlas() {
  const dir = mkdtempSync(join(tmpdir(), 'prize-atlas-'));
  const png = join(dir, 'atlas.png');
  try {
    const decoded = spawnSync('dwebp', [atlasPath, '-o', png], { encoding: 'utf8' });
    if (decoded.status !== 0) {
      const converted = spawnSync('sips', ['-s', 'format', 'png', atlasPath, '--out', png], { encoding: 'utf8' });
      if (converted.status !== 0) throw new Error(decoded.stderr || converted.stderr || 'Cannot decode the prize sheet');
    }
    return decodePng(readFileSync(png));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function coloredPixels(atlas, cell) {
  const span = atlas.width / 6, x0 = (cell % 6) * span, y0 = Math.floor(cell / 6) * span;
  let count = 0;
  for (let y = y0; y < y0 + span; y++) for (let x = x0; x < x0 + span; x++) {
    const index = (y * atlas.width + x) * 4;
    const [red, green, blue, alpha] = [atlas.pixels[index], atlas.pixels[index + 1], atlas.pixels[index + 2], atlas.pixels[index + 3]];
    if (alpha > 16 && Math.max(red, green, blue) - Math.min(red, green, blue) > 24) count++;
  }
  return count;
}

const atlas = loadAtlas();

describe('prize atlas cells', () => {
  it('matches the verified plugin-to-cell sheet and every assigned cell contains art', () => {
    expect(verifiedCells).toHaveLength(33);
    const official = Object.values(catalog.definitions).filter(definition => definition.kind === 'plugin' && definition.parameters.previewAvailable === true).map(definition => definition.id).sort();
    expect(verifiedCells.map(([id]) => id).sort()).toEqual(official);
    for (const [id, cell] of verifiedCells) {
      const definition = catalog.definitions[id];
      const presented = resolvePrizePresentation(definition, 1);
      const recolored = resolvePrizePresentation({ ...definition, parameters: { ...definition.parameters, rarity: definition.parameters.rarity === 'legendary' ? 'common' : 'legendary' } }, 1);
      expect(presented.cell, id).toBe(cell);
      expect(recolored.cell, id).toBe(cell);
      expect(coloredPixels(atlas, cell), id).toBeGreaterThan(3000);
      expect(presented.name).toBe(`${definition.displayName} · 1级`);
      expect(presented.effect).toBe(definition.parameters.rankDescriptions[0]);
    }
    for (const empty of [33, 34, 35]) expect(coloredPixels(atlas, empty)).toBeLessThan(2000);
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
