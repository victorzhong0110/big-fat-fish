// 连击实测：把「连击熔炉这类牌按 3 层算」这个**拍出来的数**换成实测值。
//
// 背景（src/systems/relicValue.js:53-58）：
//   「连击熔炉」的收益 = 每层连击每发伤害 +1（上限 6 层）。
//   面板/机器人估值时**按 3 层算**，注释写的是"实战里连击很难叠满，
//   按 6 层算会把面板写成 +120% ⇒ 理论值当保证"。
//   ⇒ **3 这个数没有任何实测支撑**，是拍的。
//
// 这个脚本做的事：让机器人真打若干局，在**每一帧**采样 combat.combo，
// 然后报出：
//   · 连击的时间加权平均（这才是 DPS 估值该用的口径）
//   · 中位数 / p90 / 最大值
//   · 有效层数（min(combo, 6)）的平均 —— 连击熔炉的伤害口径
//   · 各档位（0 / 1-3 / 4-6 / 7+）的时间占比
//
// 用法：node scripts/combo-stats.mjs [局数] [每局游戏秒数]
// 产出：shots/combo-stats.json
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { installBot, pickDraftCard, pickOmenCard, pickRoute, pickCamp } from './bot.mjs';

const RUNS = Number(process.argv[2] || 2);
const MAX_SECONDS = Number(process.argv[3] || 150);   // 游戏秒数
const SKILL = process.env.BALANCE_SKILL || 'smart';
const ROOT = new URL('../dist/', import.meta.url).pathname;
const SHOTS = new URL('../shots/', import.meta.url).pathname;
const PORT = 8917;
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

/** 在页面里挂一个逐帧探针，记录每帧的连击数 */
const installProbe = (page) => page.evaluate(() => {
  const s = window.__tulip.scene();
  if (!s || s.__comboProbe) return false;
  s.__comboProbe = [];
  const orig = s.update.bind(s);
  s.update = (time, delta) => {
    orig(time, delta);
    s.__comboProbe.push(s.combat?.combo ?? 0);
  };
  return true;
});

async function playRun(page, seed) {
  await page.goto(`http://127.0.0.1:${PORT}/?seed=${seed}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__tulip?.scene(), null, { timeout: 30000 });
  await page.locator('#btn-start').click();
  await installBot(page);
  await installProbe(page);

  const started = Date.now();
  let outcome = 'timeout';
  while ((Date.now() - started) / 1000 < MAX_SECONDS * 3) {
    await page.waitForTimeout(300);
    const campOpen = await page.evaluate(() => !document.querySelector('#camp')?.hidden);
    if (campOpen) await pickCamp(page);
    const routeOpen = await page.evaluate(() => !document.querySelector('#route')?.hidden);
    if (routeOpen) await pickRoute(page, SKILL);
    const omenOpen = await page.evaluate(() => !document.querySelector('#omen')?.hidden);
    if (omenOpen) await pickOmenCard(page, SKILL);
    const draftOpen = await page.evaluate(() => !document.querySelector('#draft')?.hidden);
    if (draftOpen) await pickDraftCard(page, SKILL);

    const st = await page.evaluate(() => window.__tulip.state());
    if (!st) continue;
    if ((st.runTime ?? 0) >= MAX_SECONDS) { outcome = 'timeout'; break; }
    if (st.runState === 'over' || st.runState === 'victory') { outcome = st.runState; break; }
  }
  return page.evaluate(() => {
    const s = window.__tulip.scene();
    return {
      outcome: s.runState, wave: s.spawner.wave, kills: s.combat.kills,
      bestCombo: s.combat.bestCombo, score: s.combat.score,
      samples: s.__comboProbe || [],
    };
  });
}

/** 统计：连击的时间分布（每一帧 = 一个时间片） */
function stats(samples) {
  const n = samples.length;
  if (!n) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const capped = samples.map((c) => Math.min(c, 6));
  const effMean = capped.reduce((a, b) => a + b, 0) / n;
  const q = (p) => sorted[Math.min(n - 1, Math.floor(p * n))];
  return {
    frames: n,
    mean: +mean.toFixed(3),
    median: q(0.5),
    p90: q(0.9),
    p99: q(0.99),
    max: sorted[n - 1],
    /** 连击熔炉的伤害口径：min(combo, 6) 的时间加权平均 */
    effectiveStacks: +effMean.toFixed(3),
    /** 有效层数 ≥ 3 的时间占比（当前估值假设"一直 3 层"，看它站不站得住） */
    shareAtLeast3: +(capped.filter((c) => c >= 3).length / n).toFixed(3),
    shareAtLeast4: +(capped.filter((c) => c >= 4).length / n).toFixed(3),
    shareAtLeast6: +(capped.filter((c) => c >= 6).length / n).toFixed(3),
    shareZero: +(samples.filter((c) => c === 0).length / n).toFixed(3),
  };
}

const results = [];
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
for (let i = 0; i < RUNS; i++) {
  const seed = 1000 + i * 37;
  const r = await playRun(page, seed);
  const st = stats(r.samples);
  results.push({ seed, ...r, samples: undefined, stats: st });
  console.log(`seed ${seed} → ${r.outcome} 第 ${r.wave} 波 · 击杀 ${r.kills} · 最高连击 ${r.bestCombo}` +
    (st ? ` · 连击均值 ${st.mean} / 有效层 ${st.effectiveStacks} / p90 ${st.p90}` : ''));
}

const merged = results.filter((r) => r.stats);
const summary = {
  skill: SKILL,
  runs: RUNS,
  maxSeconds: MAX_SECONDS,
  perRun: results,
  avgEffectiveStacks: merged.length
    ? +(merged.reduce((a, r) => a + r.stats.effectiveStacks, 0) / merged.length).toFixed(3)
    : null,
  avgMeanCombo: merged.length
    ? +(merged.reduce((a, r) => a + r.stats.mean, 0) / merged.length).toFixed(3)
    : null,
  avgShareAtLeast3: merged.length
    ? +(merged.reduce((a, r) => a + r.stats.shareAtLeast3, 0) / merged.length).toFixed(3)
    : null,
  /** 当前 relicValue.js 里写死的假设 */
  assumedStacks: 3,
};
console.log('\n汇总：', JSON.stringify({
  avgEffectiveStacks: summary.avgEffectiveStacks,
  avgMeanCombo: summary.avgMeanCombo,
  avgShareAtLeast3: summary.avgShareAtLeast3,
  assumedStacks: summary.assumedStacks,
}, null, 2));

writeFileSync(join(SHOTS, 'combo-stats.json'), JSON.stringify(summary, null, 2), 'utf8');
await browser.close();
server.close();
