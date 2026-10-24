// 架构守护：src/systems/ 必须是**纯逻辑层**。
//
// 为什么要有这条：本项目的铁律是「规则写在可单测的纯逻辑层，渲染层只做适配」。
// 一旦 systems/ 里出现 window/document/Phaser，
// 那些模块就没法在 Node 里单测了 —— 而且症状往往不是"跑不起来"，
// 而是"某条规则悄悄只在浏览器里生效"（第十轮踩过：数值口径分了两份）。
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../src/systems/', import.meta.url).pathname;
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.js'));

/** 去掉注释再扫：注释里提到 window/localStorage 是允许的（那是给人看的说明） */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

describe('systems/ 纯度守护', () => {
  it('systems/ 不是空的（否则这条守护是空转）', () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  it('systems/ 里不碰浏览器 API，也不 import Phaser', () => {
    const banned = [
      { re: /\bwindow\b/, name: 'window' },
      { re: /\bdocument\b/, name: 'document' },
      { re: /\blocalStorage\b/, name: 'localStorage' },
      { re: /\bnavigator\b/, name: 'navigator' },
      { re: /\bfetch\s*\(/, name: 'fetch' },
      { re: /\bPhaser\b/, name: 'Phaser' },
    ];
    for (const f of FILES) {
      const code = stripComments(readFileSync(join(DIR, f), 'utf8'));
      for (const { re, name } of banned) {
        expect(re.test(code), `${f} 用到了 ${name}：纯逻辑层不许碰它`).toBe(false);
      }
    }
  });

  it('systems/ 不反向依赖渲染层（不许 import scenes/ 或 audio.js）', () => {
    for (const f of FILES) {
      const code = stripComments(readFileSync(join(DIR, f), 'utf8'));
      expect(code, `${f} 反向依赖了渲染层`).not.toMatch(/from\s+['"][^'"]*(scenes|audio\.js|hud\.js)/);
    }
  });

  it('systems/ 内部不许出现循环 import（会连测试都加载不了）', () => {
    const graph = new Map();
    for (const f of FILES) {
      const code = stripComments(readFileSync(join(DIR, f), 'utf8'));
      const deps = [...code.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]);
      graph.set(f, deps.filter((d) => FILES.includes(d)));
    }
    // DFS 查环：只有**回到还在栈里的节点**才是环。
    // ⚠️ 第一版写成"访问过就报错" ⇒ 把菱形依赖（A→C、B→C）误判成环，
    //    第一版守护报的红全是它自己的错。
    const state = new Map();
    let cycle = null;
    const walk = (n, stack) => {
      const st = state.get(n);
      if (st === 'doing') { cycle = [...stack, n]; return; }
      if (st === 'done') return;
      state.set(n, 'doing');
      for (const d of graph.get(n) || []) {
        if (cycle) return;
        walk(d, [...stack, n]);
      }
      state.set(n, 'done');
    };
    for (const f of FILES) {
      if (cycle) break;
      walk(f, []);
    }
    expect(cycle, cycle ? `循环 import: ${cycle.join(' → ')}` : '').toBeNull();
  });
});
