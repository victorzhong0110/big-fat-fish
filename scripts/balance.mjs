// 平衡测量：一次开浏览器，连打 N 局，输出可比较的表。
//
// 为什么要有这个脚本：
// "这一局难不难"不能用一次试玩回答 —— 单局方差极大（同一份代码，
// 火力等级不同，101 秒打死 10 只 vs 62 秒打死 118 只）。
// 只有**多局 + 同一套统计口径**才能回答"这条难度曲线合不合适"。
//
// 用法：node scripts/balance.mjs [局数] [每局秒数]
// 产出：shots/balance-report.json（给文档/验收流水线读）
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { installBot, pickDraftCard, pickOmenCard, pickRoute, pickCamp } from './bot.mjs';

/**
 * 机器人的"手感"档位。
 * reactMs > 0 = 隔这么久才重算一次移动方向（真人不会每帧改方向）。
 * jitter = 方向抖动幅度（手会抖）。
 */
const BOT_OPTS = (() => {
  const v = process.env.BALANCE_REACT_MS;
  return v ? { reactMs: Number(v), jitter: Number(process.env.BALANCE_JITTER || 0.5) } : {};
})();
import { waveDpsNeed, pressureRatio, waveCounterMult } from '../src/systems/pressure.js';

const RUNS = Number(process.argv[2] || 6);
// **上限按「游戏时钟」算，不是墙钟**。
//
// 为什么：沙箱里是软件渲染 + 上百只怪，帧率会掉到 2~4 fps，
// 而游戏时钟每帧最多推进 0.5 秒（wallStep 的上限）⇒
// **墙钟 400 秒里，游戏只走了 290 秒左右** —— 也就是说按墙钟计时，
// 这一局"玩到第几波"取决于机器的帧率，而不是玩法。
// 用游戏时钟计时，每一局拿到的游戏时长一致，跨轮对照才有意义。
const MAX_SECONDS = Number(process.argv[3] || 400);   // 游戏秒数
const MAX_WALL_SECONDS = MAX_SECONDS * 3;              // 墙钟兜底（帧率再低也不至于无限跑）
const SKILL = process.env.BALANCE_SKILL || 'good';
const ROOT = new URL('../dist/', import.meta.url).pathname;
const SHOTS = new URL('../shots/', import.meta.url).pathname;
const PORT = 8915;
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

/** 跑一局，返回快照 */
async function playRun(page, seed) {
  await page.goto(`http://127.0.0.1:${PORT}/?seed=${seed}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!window.__tulip?.scene(), null, { timeout: 30000 });
  await page.locator('#btn-start').click();
  await installBot(page, BOT_OPTS);

  const started = Date.now();
  const timeline = [];
  let lastWave = 0;
  let snap = null;
  let panelSeconds = 0;      // 停在面板上的总时长（游戏时钟不走）
  let lastTick = Date.now();
  while ((Date.now() - started) / 1000 < MAX_WALL_SECONDS) {
    await page.waitForTimeout(350);
    // 篝火（第八轮）：章末的休整
    const campOpen = await page.evaluate(() => !document.querySelector('#camp')?.hidden);
    if (campOpen) await pickCamp(page);
    // 路线面板（第六轮）：每章开头先选路，再抽卡
    const routeOpen = await page.evaluate(() => !document.querySelector('#route')?.hidden);
    if (routeOpen) await pickRoute(page, SKILL);
    const omenOpen = await page.evaluate(() => !document.querySelector('#omen')?.hidden);
    if (omenOpen) await pickOmenCard(page, SKILL);
    const draftOpen = await page.evaluate(() => !document.querySelector('#draft')?.hidden);
    if (draftOpen) await pickDraftCard(page, SKILL);
    // 面板占掉的墙钟时间：面板打开时游戏时钟是停的
    const nowTick = Date.now();
    if (routeOpen || omenOpen || draftOpen) panelSeconds += (nowTick - lastTick) / 1000;
    lastTick = nowTick;

    const st = await page.evaluate(() => window.__tulip.state());
    if (!st) continue;
    // 游戏时钟够了就收（按**游戏时间**计时，不受帧率影响）
    if ((st.runTime ?? 0) >= MAX_SECONDS) break;
    if (st.wave !== lastWave) {
      lastWave = st.wave;
      const extra = await page.evaluate(() => {
        const s = window.__tulip.scene();
        return {
          fire: s.fireLevel, hp: s.hp, maxHp: s.maxHp, dew: s.run.dew,
          // 实时 DPS 与场上敌人数：这两个数一起看就知道"是打得动还是被打着走"
          dps: Math.round((s.fire.damage * s.fire.bullets) / (s.fire.cooldownMs / 1000)),
          alive: s.enemies.getChildren().length,
          mods: { ...(s.spawner.mods || {}) },
          seed: s.seed,
          // 第九轮：玩家手上的**手段**（对症倍率的输入）
          tags: [...(s.counterTags || [])],
        };
      });
      // **DPS 覆盖度**：这一波需要多少 DPS，玩家实际有多少。
      // 比"死在第几波"稳得多 —— 后者受抽卡运气影响极大（见 DECISIONS §14.5.10）。
      // ⚠️ 第九轮：覆盖度要乘上**对症倍率** —— 否则尺子看不见"构筑对不对症"，
      // 而这正是这一轮要测的东西。
      extra.need = waveDpsNeed(st.wave, extra.seed, extra.mods);
      extra.mult = waveCounterMult(st.wave, extra.seed, extra.mods, extra.tags || []);
      extra.coverage = pressureRatio(extra.dps * extra.mult, extra.need);
      timeline.push({ wave: st.wave, at: Math.round((Date.now() - started) / 1000), ...extra });
    }
    if (st.runState === 'over' || st.runState === 'victory') {
      snap = await page.evaluate(() => {
        const s = window.__tulip.scene();
        return {
          runState: s.runState, wave: s.spawner.wave, score: s.combat.score, kills: s.combat.kills,
          spawned: s.run.spawned,
          relics: [...s.run.relics], dew: s.run.dew, omens: [...s.run.omenIds],
          hp: s.hp, maxHp: s.maxHp, fire: s.fireLevel, seconds: Math.round(s.runTime),
          chapters: s.run.plan.chapters.map((c) => `${c.name}/${c.theme.name}`),
          // 死于哪种怪 + 杀了几个异变体（第五轮：敌种开始"针对构筑"，
          // 于是"死于谁"和"异变体有没有被解决"就成了可测量的东西）
          deathCause: s.run.deathCause || null,
          elitesKilled: s.run.elitesKilled || 0,
          clouds: (s.clouds || []).length,
          routes: (s.run.plan?.chapters || []).map((c) => c.route || '-'),
        };
      });
      break;
    }
  }
  if (!snap) {
    snap = await page.evaluate(() => {
      const s = window.__tulip.scene();
      return {
        runState: 'timeout', wave: s.spawner.wave, score: s.combat.score, kills: s.combat.kills,
        spawned: s.run.spawned,
        relics: [...s.run.relics], dew: s.run.dew, omens: [...s.run.omenIds],
        hp: s.hp, maxHp: s.maxHp, fire: s.fireLevel, seconds: Math.round(s.runTime),
        chapters: s.run.plan.chapters.map((c) => `${c.name}/${c.theme.name}`),
        deathCause: s.run.deathCause || null,
        elitesKilled: s.run.elitesKilled || 0,
        clouds: (s.clouds || []).length,
        routes: (s.run.plan?.chapters || []).map((c) => c.route || '-'),
      };
    });
  }
  snap.seed = seed;
  snap.timeline = timeline;
  // **卡面板检测**：游戏时钟远小于墙钟 = 这一局有大半时间停在面板上
  // （以前机器人在"深化"模式里出不来，整局的时间就此停住，
  //  而报告看起来还像模像样 —— 一次 timeout 的种子就是这样被浪费掉的）。
  snap.wallSeconds = Math.round((Date.now() - started) / 1000);
  snap.panelSeconds = Math.round(panelSeconds);
  // 「卡面板」= 跑满墙钟，但游戏时钟比"墙钟 − 面板时间"还少一大截
  //（说明游戏被冻住了，而不是"面板多"）。
  // ⚠️ 早期版本用「游戏时钟 < 墙钟×0.75」判断，把"帧率低导致时钟落后"也误判成卡面板。
  const unexplained = snap.wallSeconds - snap.panelSeconds - snap.seconds;
  snap.unexplainedSeconds = Math.round(unexplained);
  snap.stuckInPanel = snap.runState === 'timeout' && unexplained > snap.wallSeconds * 0.2;
  return snap;
}

const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e).split('\n').slice(0, 3).join(' ⏎ ')));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const runs = [];
for (let i = 0; i < RUNS; i++) {
  const seed = 1000 + i * 37;
  const r = await playRun(page, seed);
  runs.push(r);
  console.log(
    `seed ${String(seed).padEnd(5)} → ${r.runState.padEnd(7)} 第 ${String(r.wave).padStart(2)} 波 · `
    + `火力 Lv.${r.fire} · 血量 ${r.hp}/${r.maxHp} · 击杀 ${r.kills}/${r.spawned} · 露水 ${r.dew} · 得分 ${r.score} · `
    + `${r.seconds}s（面板 ${r.panelSeconds ?? '-'}s${r.stuckInPanel ? ' ⚠️卡面板' : ''}）`,
  );
  // 第九轮：**每跑完一局就把已有数据落盘** ——
  // 一轮测量要跑 20 多分钟，而中途的每一局都已经是有效数据
  //（以前只有全部跑完才写报告 ⇒ 中途想看一眼都得干等）。
  writeFileSync(
    join(SHOTS, `balance-report-${[BOT_OPTS.reactMs ? `sloppy-${BOT_OPTS.reactMs}` : SKILL, process.env.BALANCE_TAG || ''].filter(Boolean).join('-')}.partial.json`),
    JSON.stringify({ partial: true, done: runs.length, of: RUNS, runs }, null, 2),
    'utf8',
  );
}

// 汇总
const waves = runs.map((r) => r.wave);
const finished = runs.filter((r) => r.runState === 'victory').length;
const reachedFinal = runs.filter((r) => r.wave >= 20).length;
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const summary = {
  runs: runs.length,
  skill: SKILL,
  bot: BOT_OPTS,
  maxSeconds: MAX_SECONDS,
  maxSecondsKind: 'game-time',
  victories: finished,
  reachedWave20: reachedFinal,
  avgWave: Math.round(avg(waves) * 10) / 10,
  minWave: Math.min(...waves),
  maxWave: Math.max(...waves),
  avgSeconds: Math.round(avg(runs.map((r) => r.seconds))),
  avgDew: Math.round(avg(runs.map((r) => r.dew))),
  avgKills: Math.round(avg(runs.map((r) => r.kills))),
  avgSpawned: Math.round(avg(runs.map((r) => r.spawned))),
  avgKillRate: Math.round(avg(runs.map((r) => (r.spawned ? r.kills / r.spawned : 0))) * 100) / 100,
  // 最后一波的 DPS 覆盖度（<1 = 打不动）
  lastCoverage: runs.map((r) => {
    const t = r.timeline || [];
    return t.length ? t[t.length - 1].coverage : null;
  }),
  // **掉队点**：覆盖度第一次跌破 1 的波次（难度曲线的关键指标）。
  // 目标：它在第 14~17 波之间 —— 保底火力撑到那里，之后由构筑决定生死。
  dropWave: runs.map((r) => {
    const t = (r.timeline || []).filter((x) => x.coverage !== null && x.coverage !== undefined);
    const bad = t.find((x) => x.coverage < 1);
    return bad ? bad.wave : null;
  }),
  // 硬指标：击杀数不可能超过生成数（超过 = 有重复结算的 bug）
  killRateOk: runs.every((r) => r.kills <= r.spawned),
  // 卡在面板上的局：这些数据不可信，必须重跑
  stuckRuns: runs.filter((r) => r.stuckInPanel).map((r) => r.seed),
  // 死于哪种怪（第五轮）：新敌种是不是真的在制造压力
  deathCauses: runs.map((r) => r.deathCause || '—'),
  avgElitesKilled: Math.round(avg(runs.map((r) => r.elitesKilled || 0)) * 10) / 10,
  // 每一局走的路线（第六轮）：机器人按覆盖度选，强的贪、弱的稳
  routesChosen: runs.map((r) => (r.routes || []).join('>')),
  errors,
};

console.log('\n汇总：', JSON.stringify(summary, null, 2));
// 按技能 + 手感档位分文件：good / naive / sloppy 的报告要能并排比，
// **不能互相覆盖**（实测 sloppy 档会把 smart 的报告盖掉 —— 名字里必须带上档位）
// 报告文件名：**技能 + 手感档 + 可选的自定义标签**。
// （第四轮踩过"sloppy 档把 smart 的报告盖掉"的坑；第六/七轮又需要把
//  "同一技能、不同版本"的两批数据分开存 ⇒ 留一个 BALANCE_TAG 出口。）
const tag = [BOT_OPTS.reactMs ? `sloppy-${BOT_OPTS.reactMs}` : SKILL, process.env.BALANCE_TAG || '']
  .filter(Boolean).join('-');
writeFileSync(join(SHOTS, `balance-report-${tag}.json`), JSON.stringify({ summary, runs }, null, 2), 'utf8');

await browser.close();
server.close();
process.exit(0);
