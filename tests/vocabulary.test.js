// 世界观词汇守护：换皮之后**旧词不许漏回玩家眼前**。
//
// 为什么需要：第十四轮把「郁金香花园」整体换成「大肥鱼的深海」，
// 但**换皮是分散在几十个文件里的手工替换** —— 漏掉一处不会报错，
// 只会在某个面板上冒出一句「孢子爆浆」。
// ⇒ 与其靠眼睛扫一遍（下次改名又漏），不如写一条会红的守护。
//
// 🔴 扫描口径：先**去掉注释**再扫 —— 注释里提到旧词是允许的
// （那是给维护者看的历史说明），玩家看不到。
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;
const ROOT = new URL('../', import.meta.url).pathname;

/** 旧世界观的词（玩家-visible 的那些） */
const BANNED = [
  '露水', '郁金香', '花房', '遗物', '篝火',
  '花粉蛾', '花蕊', '苔虫', '蜂群', '石芽', '跃动藤', '结网者', '枯壳',
  '凋零之主', '荆棘王', '巨型郁金香', '花粉之后', '孢子',
];

/** 递归列出 src/ 下的 .js 文件 */
function jsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...jsFiles(p));
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

/** 去掉 JS 注释（够用即可：行注释 + 块注释） */
function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

/** 去掉 HTML 注释 */
function stripHtmlComments(src) {
  return src.replace(/<!--[\s\S]*?-->/g, ' ');
}

describe('世界观词汇：旧皮不许漏回来', () => {
  it('src/ 下的玩家可见文本里没有旧词汇', () => {
    const files = jsFiles(SRC);
    expect(files.length).toBeGreaterThan(10);
    const hits = [];
    for (const f of files) {
      const code = stripJsComments(readFileSync(f, 'utf8'));
      for (const w of BANNED) {
        if (code.includes(w)) {
          const line = code.slice(0, code.indexOf(w)).split('\n').length;
          hits.push(`${f.replace(ROOT, '')}:${line} 「${w}」`);
        }
      }
    }
    expect(hits, `旧词汇残留：\n${hits.join('\n')}`).toEqual([]);
  });

  it('index.html（菜单 / 图例 / 按钮）里没有旧词汇', () => {
    const html = stripHtmlComments(readFileSync(join(ROOT, 'index.html'), 'utf8'));
    const hits = BANNED.filter((w) => html.includes(w));
    expect(hits, `index.html 里有旧词汇：${hits.join('、')}`).toEqual([]);
  });

  it('新世界的关键词真的在用（不然这条守护会把"全删了"也判成通过）', () => {
    const html = stripHtmlComments(readFileSync(join(ROOT, 'index.html'), 'utf8'));
    const code = stripJsComments(readFileSync(join(SRC, 'systems', 'relics.js'), 'utf8'));
    expect(html).toMatch(/大肥鱼|深海/);
    expect(code).toMatch(/珍珠|珊瑚|鱼叉|贝壳|海螺/);
  });
});
