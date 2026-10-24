// 平衡报告汇总口径的守护（scripts/balanceSummary.mjs）。
//
// 为什么它值得单测：这份汇总**曾经骗人** ——
// `deathCauses` 收的是 `run.deathCause`，而那个字段是
// 「**最后一次打中你的是谁**」（每次受击都写），不是「你死于谁」；
// 于是**超时的局**也被列进了"死于什么"里。
// 读报告的人会得出"3 局死于毒云"，其实那 3 局只是**没在时限内打完**。
import { describe, it, expect } from 'vitest';
import { buildSummary } from '../scripts/balanceSummary.mjs';

const run = (o) => ({
  runState: 'timeout', wave: 18, seconds: 250, dew: 40, kills: 500, spawned: 520,
  deathCause: null, elitesKilled: 3, routes: ['a', 'b'], timeline: [{ wave: 18, coverage: 1.2 }],
  ...o,
});

describe('平衡汇总：三种结局必须分开报', () => {
  it('通关 / 阵亡 / 超时分别计数', () => {
    const s = buildSummary([
      run({ runState: 'victory', wave: 20 }),
      run({ runState: 'over', wave: 12, deathCause: '毒云' }),
      run({ runState: 'timeout', wave: 18 }),
      run({ runState: 'timeout', wave: 19 }),
    ]);
    expect(s.victories).toBe(1);
    expect(s.deaths).toBe(1);
    expect(s.timeouts).toBe(2);
    expect(s.outcomes).toEqual(['victory', 'death', 'timeout', 'timeout']);
  });

  it('deathCauses 只收**阵亡**的局（超时的局没有死因）', () => {
    const s = buildSummary([
      run({ runState: 'over', wave: 9, deathCause: '毒云' }),
      run({ runState: 'timeout', wave: 18, deathCause: '敌方弹幕' }),
    ]);
    expect(s.deathCauses).toEqual(['毒云']);
    // "最后一次打中你的是谁"仍然每局都有，但它不是死因
    expect(s.lastHitSources).toEqual(['毒云', '敌方弹幕']);
  });

  it('平均值 / 极值照旧算得出来', () => {
    const s = buildSummary([
      run({ wave: 10, kills: 100, spawned: 120, seconds: 100, dew: 10 }),
      run({ wave: 20, kills: 200, spawned: 200, seconds: 200, dew: 30 }),
    ]);
    expect(s.avgWave).toBe(15);
    expect(s.minWave).toBe(10);
    expect(s.maxWave).toBe(20);
    expect(s.avgSeconds).toBe(150);
    expect(s.avgDew).toBe(20);
    expect(s.avgKillRate).toBeCloseTo((100 / 120 + 1) / 2, 2);
    expect(s.reachedWave20).toBe(1);
  });

  it('击杀数超过生成数 ⇒ killRateOk = false（有重复结算的 bug）', () => {
    expect(buildSummary([run({ kills: 10, spawned: 9 })]).killRateOk).toBe(false);
    expect(buildSummary([run({ kills: 9, spawned: 10 })]).killRateOk).toBe(true);
  });

  it('卡在面板上的局要单独标出来（那些数据不可信）', () => {
    const s = buildSummary([run({ seed: 1111, stuckInPanel: true }), run({ seed: 2222 })]);
    expect(s.stuckRuns).toEqual([1111]);
  });

  it('掉队点 = 覆盖度第一次跌破 1 的波次', () => {
    const s = buildSummary([run({
      timeline: [{ wave: 10, coverage: 1.4 }, { wave: 12, coverage: 0.8 }, { wave: 14, coverage: 0.5 }],
    })]);
    expect(s.dropWave[0]).toBe(12);
    expect(s.lastCoverage[0]).toBe(0.5);
  });

  it('空输入不炸', () => {
    const s = buildSummary([]);
    expect(s.runs).toBe(0);
    expect(s.avgWave).toBe(0);
    expect(s.minWave).toBeNull();
    expect(s.victories).toBe(0);
  });
});
