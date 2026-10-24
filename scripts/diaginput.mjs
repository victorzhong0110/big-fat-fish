// 输入诊断：抽卡之后键盘还灵不灵？
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const RENDERER = process.argv[2] || 'canvas';
const ROOT = new URL('../dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(ROOT, rel === '/' ? 'index.html' : rel);
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(8956, r));
const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 200)));
await page.goto(`http://127.0.0.1:8956/?renderer=${RENDERER}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.__tulip?.scene(), null, { timeout: 30000 });

const snap = () => page.evaluate(() => {
  const s = window.__tulip.scene();
  const sys = s.sys;
  return {
    runState: s.runState,
    sysStatus: sys.settings.status,   // 0 STOPPED 1 STARTING 2 RUNNING 3 PAUSED 4 SLEEPING
    active: sys.settings.active,
    inputActive: sys.canInput(),
    keyD: s.keys.D.isDown,
    cursorRight: s.cursors.right.isDown,
    velX: Math.round(s.player.body?.velocity?.x ?? 0),
    x: Math.round(s.player.x),
    focused: document.activeElement?.tagName + '#' + (document.activeElement?.id || ''),
    queueLen: s.input.keyboard.manager.queue.length,
    fps: Math.round(s.game.loop.actualFps),
  };
});

await page.locator('#btn-start').click();
await page.waitForTimeout(600);
console.log('draft open  ', JSON.stringify(await snap()));
await page.locator('#draft-cards .card').first().click();
await page.waitForTimeout(400);
console.log('after pick  ', JSON.stringify(await snap()));
await page.keyboard.down('KeyD');
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(300);
  console.log(`hold D +${(i + 1) * 300}ms`, JSON.stringify(await snap()));
}
await page.keyboard.up('KeyD');
await page.waitForTimeout(200);
console.log('after up    ', JSON.stringify(await snap()));

await browser.close();
server.close();
process.exit(0);
