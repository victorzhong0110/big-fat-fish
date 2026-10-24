// 自动试跑：用一只"会躲会打"的机器人替玩家打完一整局，
// 用来回答一个问题——这局到底能不能被打完（20 波）？难度曲线是不是合理。
//
// 用法：node scripts/autoplay.mjs [seed] [maxSeconds]
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { installBot, pickDraftCard, pickOmenCard, pickRoute, pickCamp } from './bot.mjs';

const SEED = process.argv[2] ? Number(process.argv[2]) : null;
const MAX_SECONDS = Number(process.argv[3] || 420);
const RENDERER = process.env.AUTOPLAY_RENDERER || '';
const SKILL = process.env.AUTOPLAY_SKILL || 'good';
const ROOT = new URL('../dist/', import.meta.url).pathname;
const SHOTS = new URL('../shots/', import.meta.url).pathname;
const PORT = Number(process.env.AUTOPLAY_PORT || 8912);
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
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e).split('\n').slice(0, 3).join(' ⏎ ')));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const url = `http://127.0.0.1:${PORT}/${SEED !== null ? `?seed=${SEED}` : ''}${RENDERER ? (SEED !== null ? '&' : '?') + 'renderer=' + RENDERER : ''}`;
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => !!window.__tulip?.scene(), null, { timeout: 30000 });
await page.locator('#btn-start').click();

/** 装上机器人（共享的势场走位 + 真实输入通道） */
await installBot(page);

const started = Date.now();
let result = null;
let lastWave = 0;
const timeline = [];

/** 从页面里读一份本局快照 */
async function readState(page) {
  return page.evaluate(() => {
    const s = window.__tulip.scene();
    return {
      runState: s.runState,
      wave: s.spawner.wave,
      score: s.combat.score,
      kills: s.combat.kills,
      bestCombo: s.combat.bestCombo,
      relics: [...s.run.relics],
      dew: s.run.dew,
      omens: [...s.run.omenIds],
      banished: [...s.run.banished],
      memory: s.meta?.memory ?? 0,
      hp: s.hp,
      maxHp: s.maxHp,
      fire: s.fireLevel,
      seed: s.seed,
      seconds: Math.round(s.runTime),
      chapterNames: s.run.plan.chapters.map((c) => `${c.name}/${c.theme.name}`),
    };
  });
}

while ((Date.now() - started) / 1000 < MAX_SECONDS) {
  await page.waitForTimeout(400);
  // 篝火（第八轮）：章末的休整
  const campOpen = await page.evaluate(() => !document.querySelector('#camp')?.hidden);
  if (campOpen) {
    await pickCamp(page);
  }
  // 路线面板（第六轮）：每章开头先选路，再抽卡
  const routeOpen = await page.evaluate(() => !document.querySelector('#route')?.hidden);
  if (routeOpen) {
    await pickRoute(page, SKILL);
  }
  // 异象面板：选一个结果
  const omenOpen = await page.evaluate(() => !document.querySelector('#omen')?.hidden);
  if (omenOpen) {
    await pickOmenCard(page, SKILL);
  }
  // 抽卡面板：按技能等级选一张
  const draftOpen = await page.evaluate(() => !document.querySelector('#draft')?.hidden);
  if (draftOpen) {
    await pickDraftCard(page, SKILL);
  }
  const st = await page.evaluate(() => window.__tulip.state());
  if (!st) continue;
  if (st.wave !== lastWave) {
    lastWave = st.wave;
    const extra = await page.evaluate(() => {
      const s = window.__tulip.scene();
      return {
        fire: s.fireLevel, hp: s.hp, maxHp: s.maxHp, dmg: s.fire.damage,
        bullets: s.fire.bullets, cd: s.fire.cooldownMs, dew: s.run.dew,
      };
    });
    timeline.push({ wave: st.wave, at: Math.round((Date.now() - started) / 1000), ...extra });
    console.log(`  波次 ${st.wave} · ${Math.round((Date.now() - started) / 1000)}s · 血量 ${extra.hp}/${extra.maxHp} · 火力 Lv.${extra.fire} · 露水 ${extra.dew} · DPS≈${Math.round(extra.dmg * extra.bullets / (extra.cd / 1000))}`);
  }
  if (st.runState === 'over' || st.runState === 'victory') {
    result = await readState(page);
    break;
  }
}

// 超时也要留下数据：没写下来的那一局等于没跑
if (!result) result = await readState(page);

const report = {
  seed: SEED,
  renderer: RENDERER || 'auto',
  skill: SKILL,
  outcome: result ? result.runState : 'timeout',
  wave: result?.wave ?? lastWave,
  score: result?.score ?? 0,
  kills: result?.kills ?? 0,
  fire: result?.fire ?? 0,
  relics: result?.relics ?? [],
  dew: result?.dew ?? 0,
  omens: result?.omens ?? [],
  banished: result?.banished ?? [],
  memory: result?.memory ?? 0,
  hp: result?.hp ?? 0,
  maxHp: result?.maxHp ?? 0,
  seconds: result?.seconds ?? 0,
  chapters: result?.chapterNames ?? [],
  timeline,
  errors,
};
writeFileSync(join(SHOTS, `autoplay-${SEED ?? 'random'}.json`), JSON.stringify(report, null, 2), 'utf8');
console.log(`\nseed=${SEED} 渲染器=${RENDERER || 'auto'} 技能=${SKILL} → ${report.outcome} 第 ${report.wave} 波 · 得分 ${report.score} · 击杀 ${report.kills} · ${report.seconds}s`);

await browser.close();
server.close();
process.exit(0);
