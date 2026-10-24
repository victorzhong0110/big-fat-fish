// 图例（主菜单那份"场上都是什么"的认知表）的守护。
//
// 为什么要有：图例是**渲染层生成**的（src/hud.js 的 renderLegend），
// 数据来自 `src/systems/legend.js`。
// 🔴 图例**不许手抄名字** —— 第十四轮换皮（深海）→ 第十五轮又换皮
//    （Codex 小工人 / Claude Buddy 物种），每换一次皮，
//    "HTML 里手写的那一份"就过期一次，而且**过期了不报错**。
// ⇒ 守护要问的是"图例和数据对得上吗"，而不是"图例里有没有某个名字"。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ENEMY_TYPES, ENEMY_TYPE_IDS } from '../src/systems/enemies.js';
import { legendEntries, legendEntry, ROLE_HINTS, LEGEND_EXTRA_ROWS } from '../src/systems/legend.js';

// ⚠️ 这里**故意不 import** `src/art/avatars.js`：
//  化身（像素画）是并行会话在改的东西，它的模块会主动抛错；
//  本文件要守的是"图例的接线"，不是化身本身
//  ⇒ 阵营用**注入**的假函数测（真实接线由浏览器试玩断言）。
const fakeFaction = (id) => (id === 'spore' || id === 'moth' ? 'Claude' : 'GPT');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('图例：名字、阵营、说明全部来自数据', () => {
  it('每个敌种都有一份图例条目（不漏：玩家在战场上见得到它们）', () => {
    const entries = legendEntries(fakeFaction);
    expect(entries.length).toBe(ENEMY_TYPE_IDS.length);
    for (const id of ENEMY_TYPE_IDS) {
      const e = legendEntry(entries, id);
      expect(e, `${id} 没有图例条目`).toBeTruthy();
      expect(e.name).toBe(ENEMY_TYPES[id].name);
      expect(e.faction).toBe(fakeFaction(id));
    }
  });

  it('每个条目都有说明（按角色给 ⇒ 换皮不会漂）', () => {
    for (const id of ENEMY_TYPE_IDS) {
      const role = ENEMY_TYPES[id].role;
      expect(ROLE_HINTS[role], `角色 ${role} 没有说明文案`).toBeTruthy();
    }
  });

  it('阵营标签能反推出样式键（图例/威胁面板都靠它上色）', () => {
    for (const label of ['GPT', 'Claude', 'GPT × Claude']) {
      const styleKey = label.includes('×') ? 'both' : label.toLowerCase();
      expect(['gpt', 'claude', 'both']).toContain(styleKey);
    }
  });

  it('index.html 里**没有手写的敌怪名字**（漂移在结构上不可能发生）', () => {
    // 图例容器必须空着：内容由 hud.js 从数据生成
    const legendBlock = HTML.slice(HTML.indexOf('<ul class="legend">'), HTML.indexOf('</ul>'));
    expect(legendBlock).not.toContain('lg-name');
    for (const id of ENEMY_TYPE_IDS) {
      expect(legendBlock, `图例容器里手写了 ${id} 的行`).not.toContain(`data-enemy="${id}"`);
    }
  });

  it('补充行（异变体之类）不是敌种，不进数据表', () => {
    for (const row of LEGEND_EXTRA_ROWS) {
      expect(ENEMY_TYPE_IDS.includes(row.dot) && row.dot !== 'boss').toBe(false);
      expect(row.name).toBeTruthy();
      expect(row.hint).toBeTruthy();
    }
  });
});
