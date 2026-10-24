// 平衡报告的**汇总口径**（纯函数，可单测、可重算）。
//
// 为什么把它从 balance.mjs 里抽出来：
//  ① 一次测量要跑 20 多分钟，**中途改口径**就会让"改前 / 改后"两份数据不可比；
//     抽成纯函数后，**可以对旧报告重算**（同一份实现 ⇒ 不会漂）。
//  ② 汇总口径本身有坑，必须能单测：
//     **`deathCause` 记的是"最后一次打中你的是谁"，不是"你死于谁"**
//     （GameScene.hurtPlayer 每次受击都会写它）——
//     于是"超时的局"也会出现在"死于什么"这个列表里，
//     读报告的人会以为"3 局死于毒云"，其实那 3 局是**超时**的。
//     ⇒ 这里把三种结局**分开报**。
//
// 用法（重算旧报告的汇总）：
//   node scripts/balanceSummary.mjs shots/balance-report-smart.json [...]
export function buildSummary(runs, opts = {}) {
  const {
    skill = 'unknown',
    bot = {},
    maxSeconds = null,
    maxSecondsKind = 'game-time',
  } = opts;
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const waves = runs.map((r) => r.wave);

  // **三种结局必须分开**：通关 / 阵亡 / 超时（时限到了还没打完）。
  const outcomeOf = (r) => {
    if (r.runState === 'victory') return 'victory';
    if (r.runState === 'over' || r.runState === 'death') return 'death';
    return 'timeout';
  };
  const outcomes = runs.map(outcomeOf);
  const died = runs.filter((r) => outcomeOf(r) === 'death');
  const timedOut = runs.filter((r) => outcomeOf(r) === 'timeout');

  return {
    runs: runs.length,
    skill,
    bot,
    maxSeconds,
    maxSecondsKind,
    victories: outcomes.filter((o) => o === 'victory').length,
    deaths: died.length,
    timeouts: timedOut.length,
    reachedWave20: runs.filter((r) => r.wave >= 20).length,
    avgWave: Math.round(avg(waves) * 10) / 10,
    minWave: waves.length ? Math.min(...waves) : null,
    maxWave: waves.length ? Math.max(...waves) : null,
    avgSeconds: Math.round(avg(runs.map((r) => r.seconds || 0))),
    avgDew: Math.round(avg(runs.map((r) => r.dew || 0))),
    avgKills: Math.round(avg(runs.map((r) => r.kills || 0))),
    avgSpawned: Math.round(avg(runs.map((r) => r.spawned || 0))),
    avgKillRate: Math.round(avg(runs.map((r) => (r.spawned ? r.kills / r.spawned : 0))) * 100) / 100,
    /** 每局的结局（按局序）—— 读报告先看这个，别看平均 */
    outcomes,
    /** 最后一波的 DPS 覆盖度（<1 = 打不动） */
    lastCoverage: runs.map((r) => {
      const t = r.timeline || [];
      return t.length ? t[t.length - 1].coverage : null;
    }),
    /** 掉队点：覆盖度第一次跌破 1 的波次（难度曲线的关键指标） */
    dropWave: runs.map((r) => {
      const t = (r.timeline || []).filter((x) => x.coverage !== null && x.coverage !== undefined);
      const bad = t.find((x) => x.coverage < 1);
      return bad ? bad.wave : null;
    }),
    /** 硬指标：击杀数不可能超过生成数（超过 = 有重复结算的 bug） */
    killRateOk: runs.every((r) => (r.kills || 0) <= (r.spawned || 0)),
    /** 卡在面板上的局：这些数据不可信，必须重跑 */
    stuckRuns: runs.filter((r) => r.stuckInPanel).map((r) => r.seed),
    /**
     * **真正的死因**（只收阵亡的局）。
     * ⚠️ 超时的局没有死因 —— 它只是"没在时限内打完"。
     */
    deathCauses: died.map((r) => r.deathCause || '—'),
    /**
     * "最后一次打中你的是谁"（每一局都有，**不是死因**）。
     * 用来回答"最后是谁在追着我打"，不能当成"死于谁"读。
     */
    lastHitSources: runs.map((r) => r.deathCause || '—'),
    avgElitesKilled: Math.round(avg(runs.map((r) => r.elitesKilled || 0)) * 10) / 10,
    /** 每一局走的路线 */
    routesChosen: runs.map((r) => (r.routes || []).join('>')),
  };
}

// ── CLI：重算已有报告的汇总 ───────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('balanceSummary.mjs')) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  for (const file of process.argv.slice(2)) {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    if (!raw.runs) { console.log(`${file}: 没有 runs，跳过`); continue; }
    const old = raw.summary || {};
    const summary = buildSummary(raw.runs, {
      skill: old.skill,
      bot: old.bot,
      maxSeconds: old.maxSeconds,
      maxSecondsKind: old.maxSecondsKind,
    });
    writeFileSync(file, JSON.stringify({ ...raw, summary }, null, 2), 'utf8');
    console.log(`${file} → 结局 ${summary.outcomes.join('/')} · 通关 ${summary.victories} · 阵亡 ${summary.deaths} · 超时 ${summary.timeouts}`);
  }
}
