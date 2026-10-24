// 敌人化身（GPT Blossom / Claude 星芒）的**预览图**生成器。
//
// 用法：node scripts/avatar-preview.mjs
// 产出：shots/avatar-preview.png
//
// 为什么需要它：这套图形是**纯几何**画出来的（不 import Phaser），
// 所以可以用一个"把 Graphics 调用录成 SVG"的壳子离线渲染 ——
// 这样**改一个参数就能立刻看到效果**，不必启动整个游戏。
// 同时它也是单测的基础（见 tests/avatars.test.js：同一个壳子断言调用序列）。
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENEMY_AVATAR, BOSS_AVATAR, drawAvatar, modelLabelOf, petNameOf } from '../src/art/avatars.js';
import { svgGraphics } from '../src/art/graphics-probe.js';

const SHOTS = new URL('../shots/', import.meta.url).pathname;

const CELL = 150;
const COLS = 7;

function render() {
  const ids = [...Object.keys(ENEMY_AVATAR), ...Object.keys(BOSS_AVATAR)];
  const rows = Math.ceil(ids.length / COLS);
  const W = COLS * CELL + 40;
  const H = rows * CELL + 60;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  svg += `<rect width="${W}" height="${H}" fill="#0b0a10"/>`;
  svg += `<defs><pattern id="g" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="none" stroke="#1c1a26" stroke-width="1"/></pattern></defs>`;
  svg += `<text x="20" y="30" fill="#e8e6f0" font-family="monospace" font-size="16">敌人化身预览 · GPT = Codex 小工人（淡紫） vs Claude = Buddy 物种（陶土橙）</text>`;

  ids.forEach((id, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = 20 + col * CELL + CELL / 2;
    const cy = 60 + row * CELL + CELL / 2 - 8;
    const g = svgGraphics();
    drawAvatar(g, id, { cx, cy, r: 44 });
    svg += `<g>${g.toSVG()}</g>`;
    svg += `<text x="${cx}" y="${cy + 68}" fill="#cfcbe0" font-family="monospace" font-size="11" text-anchor="middle">${id} · ${petNameOf(id)}</text>`;
    svg += `<text x="${cx}" y="${cy + 83}" fill="${modelLabelOf(id) === 'Claude' ? '#d97757' : '#10a37f'}" font-family="monospace" font-size="10" text-anchor="middle">${modelLabelOf(id)}</text>`;
  });
  svg += '</svg>';
  return svg;
}

const svg = render();
writeFileSync(join(SHOTS, 'avatar-preview.svg'), svg, 'utf8');

const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 560 }, deviceScaleFactor: 2 });
await page.setContent(`<body style="margin:0;background:#0b0a10">${svg}</body>`);
await page.screenshot({ path: join(SHOTS, 'avatar-preview.png'), fullPage: true });
await browser.close();
console.log('wrote shots/avatar-preview.png');
