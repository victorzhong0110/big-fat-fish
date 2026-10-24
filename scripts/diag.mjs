// 诊断脚本：跑 20 秒自动试玩，dump 玩家/敌人/子弹的实时状态
// 用法：node scripts/diag.mjs [seed]
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const SEED = process.argv[2] ? Number(process.argv[2]) : null;
const RENDERER = process.argv[3] || '';
const ROOT = new URL('../dist/', import.meta.url).pathname;
const PORT = Number(process.env.DIAG_PORT || 8950);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(ROOT, rel === '/' ? 'index.html' : rel);
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)));
await page.goto(`http://127.0.0.1:${PORT}/${SEED !== null ? `?seed=${SEED}` : ''}${RENDERER ? (SEED !== null ? '&' : '?') + 'renderer=' + RENDERER : ''}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.__tulip?.scene(), null, { timeout: 30000 });
await page.locator('#btn-start').click();
await page.waitForTimeout(500);
// 选第一张卡
const cards = page.locator('#draft-cards .card');
if (await cards.count()) await cards.nth(0).click();
await page.waitForTimeout(300);

// 装机器人（与 autoplay 相同）
await page.evaluate(() => {
  const loop = () => {
    requestAnimationFrame(loop);
    const sc = window.__tulip.scene();
    if (!sc || sc.runState !== 'playing') return;
    const p = sc.player;
    let fx = 0; let fy = 0;
    for (const e of sc.enemies.getChildren()) {
      const dx = p.x - e.x; const dy = p.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d < 240) { fx += (dx / (d || 1)); fy += (dy / (d || 1)); }
    }
    sc.keys.A.isDown = fx < -0.35;
    sc.keys.D.isDown = fx > 0.35;
    sc.keys.W.isDown = fy < -0.35;
    sc.keys.S.isDown = fy > 0.35;
    sc.keys.SPACE.isDown = true;
  };
  requestAnimationFrame(loop);
});

for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(3000);
  const dump = await page.evaluate(() => {
    const s = window.__tulip.scene();
    const bl = s.bullets.getChildren();
    return {
      runState: s.runState,
      runTime: Math.round(s.runTime * 10) / 10,
      wave: s.spawner.wave,
      kills: s.combat.kills,
      score: s.combat.score,
      fire: s.fireLevel,
      damage: s.fire.damage,
      bulletsInWorld: bl.length,
      enemies: s.enemies.getChildren().length,
      enemyHp: s.enemies.getChildren().slice(0, 4).map((e) => `${e.getData('type')}:${e.getData('hp')}`),
      enemyPos: s.enemies.getChildren().slice(0, 3).map((e) => `${Math.round(e.x)},${Math.round(e.y)}`),
      playerPos: `${Math.round(s.player.x)},${Math.round(s.player.y)}`,
      bulletSample: bl.slice(0, 3).map((b) => `${b.getData('damage')}@${Math.round(b.x)},${Math.round(b.y)} v=${Math.round(b.body?.velocity?.x ?? 0)}`),
      spaceDown: s.keys.SPACE.isDown,
      shootTimer: Math.round(s.shootTimer),
      lastFrameAge: Math.round(performance.now() - s.lastFrameAt),
      fps: Math.round(s.game.loop.actualFps),
      gameDelta: Math.round(s.game.loop.delta),
    };
  });
  console.log(JSON.stringify(dump));
}

await browser.close();
server.close();
process.exit(0);
