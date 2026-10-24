// 图例（主菜单那份"场上都是什么"的认知表）的守护。
//
// 为什么要有：图例是**手写 HTML**，而敌种名字与阵营**在数据里**。
// 手抄的那份一定会漂（改名那天没人记得改图例）⇒ 用数据生成 + 守护对账。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ENEMY_TYPES, ENEMY_TYPE_IDS } from '../src/systems/enemies.js';
import { legendEntries, legendEntry } from '../src/systems/legend.js';
import { modelOf, modelLabelOf } from '../src/art/avatars.js';

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

/** 抓出图例里每一行的 data-enemy 与它写着的名字 */
function legendRows() {
  const out = [];
  const re = /<li data-enemy="([^"]+)">.*?<b class="lg-name">([^<]*)<\/b>/g;
  let m;
  while ((m = re.exec(HTML)) !== null) out.push({ id: m[1], name: m[2] });
  return out;
}

describe('图例：名字与阵营都来自数据', () => {
  it('图例每一行都指向一个真实存在的敌种', () => {
    const rows = legendRows();
    expect(rows.length).toBeGreaterThan(5);
    for (const r of rows) {
      expect(ENEMY_TYPE_IDS.includes(r.id), `图例里的 ${r.id} 不在敌种表里`).toBe(true);
    }
  });

  it('图例里手写的名字必须与数据一致（不许漂）', () => {
    for (const r of legendRows()) {
      const e = ENEMY_TYPES[r.id];
      expect(r.name, `图例里 ${r.id} 的名字与数据不一致`).toBe(e.name);
    }
  });

  it('每个敌种都能拿到图例条目与阵营标签', () => {
    const entries = legendEntries((id) => modelLabelOf(id));
    expect(entries.length).toBe(ENEMY_TYPE_IDS.length);
    for (const id of ENEMY_TYPE_IDS) {
      const e = ENEMY_TYPES[id];
      const entry = legendEntry(entries, e.id);
      expect(entry, `${e.id} 没有图例条目`).toBeTruthy();
      expect(entry.name).toBe(e.name);
      expect(entry.faction).toBeTruthy();
      expect(entry.faction).toBe(modelLabelOf(e.id));
    }
  });

  it('阵营映射是单一来源：modelOf 与 modelLabelOf 对得上', () => {
    for (const id of ENEMY_TYPE_IDS) {
      const e = ENEMY_TYPES[id];
      const key = modelOf(e.id);
      const label = modelLabelOf(e.id);
      expect(['gpt', 'claude', 'both']).toContain(key);
      expect(label).toBeTruthy();
      // 标签必须能反推出样式键（图例/威胁面板都靠它上色）
      const styleKey = label.includes('×') ? 'both' : label.toLowerCase();
      expect(styleKey).toBe(key);
    }
  });

  it('图例的 faction 芯片是每个敌种一行都有的（阵营不能只靠颜色）', () => {
    const withChip = (HTML.match(/<li data-enemy="[^"]+"><i class="dot [^"]+"><\/i><b class="lg-name">[^<]*<\/b><i class="faction"><\/i>/g) || []).length;
    expect(withChip).toBe(legendRows().length);
  });
});
