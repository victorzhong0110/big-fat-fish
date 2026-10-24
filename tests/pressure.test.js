import { describe, it, expect } from 'vitest';
import {
  waveDpsNeed, dpsOf, pressureRatio,
  waveCounterMult, chapterCounterMult, bossFightSeconds,
} from '../src/systems/pressure.js';
import { COUNTER_MULT } from '../src/systems/counters.js';

describe('压力（你的 DPS ÷ 这一波需要多少 DPS）', () => {
  it('需求 DPS 随波次单调不减', () => {
    const needs = [1, 5, 10, 13, 17, 20].map((w) => waveDpsNeed(w, 1000, {}));
    for (let i = 1; i < needs.length; i++) expect(needs[i]).toBeGreaterThan(needs[i - 1]);
  });

  it('关键波次的需求量级（钉住难度曲线的形状）', () => {
    // 第九轮重算（retune2 反解）：引入「对症 ×2.5」之后，
    // **会构筑的玩家**的有效 DPS 涨了一倍多 ⇒ 需求必须同步抬，
    // 否则"会构筑"与"不会构筑"两档都轻松通关 ⇒ 机制等于没生效。
    // 现在：第 5 波 19 DPS；第 20 波 370 DPS。
    // 保底构筑（Lv.5 = 107 DPS、**没有任何手段**）在第 20 波只剩 ×0.29 ⇒
    // **保底构筑撑不住主线**（这是刻意的：构筑必须参与）。
    expect(waveDpsNeed(5, 1000, {})).toBe(14);
    expect(waveDpsNeed(20, 1000, {})).toBe(194);
    const floor = dpsOf({ damage: 5, bullets: 3, cooldownMs: 140 });
    expect(floor).toBe(107);
    expect(pressureRatio(floor, waveDpsNeed(20, 1000, {}))).toBeCloseTo(0.55, 2);
  });

  it('主题的加成会抬高需求（同一波不同主题不同需求）', () => {
    const plain = waveDpsNeed(15, 1000, {});
    const hard = waveDpsNeed(15, 1000, { enemyHpMul: 1.35 });
    expect(hard).toBeGreaterThan(plain);
  });

  it('DPS 计算：伤害 × 弹数 ÷ 冷却', () => {
    expect(dpsOf({ damage: 3, bullets: 3, cooldownMs: 140 })).toBe(64);
    expect(dpsOf(null)).toBe(0);
    expect(dpsOf({ damage: 1, bullets: 1, cooldownMs: 0 })).toBe(1000); // 不除以 0
  });

  it('压力比：需求为 0 时返回 null（不假装有答案）', () => {
    expect(pressureRatio(100, 0)).toBe(null);
    expect(pressureRatio(100, 200)).toBe(0.5);
  });
});

describe('对症倍率（第九轮：克制变成了真机制）', () => {
  it('没有手段时倍率是 1', () => {
    expect(waveCounterMult(10, 1000, {}, [])).toBe(1);
    expect(chapterCounterMult(2, 1000, {}, [])).toBe(1);
  });

  it('有手段时倍率 > 1，且不超过 COUNTER_MULT', () => {
    const m = waveCounterMult(10, 1000, {}, ['area']);
    expect(m).toBeGreaterThan(1);
    expect(m).toBeLessThanOrEqual(COUNTER_MULT);
  });

  it('四种手段的命中率**有差别**（否则"读对症"是白读）', () => {
    // 第九轮实测：范围 69~73% / 机动 52~61% / 爆发 32~40% / 减速 22~40%
    // ⇒ 最高的与最低的至少差 10 个百分点，倍率差 ≥ 0.2。
    const ms = ['area', 'burst', 'slow', 'mobility'].map((t) => chapterCounterMult(4, 1000, {}, [t]));
    const spread = Math.max(...ms) - Math.min(...ms);
    expect(spread, `四种手段的倍率只差 ${spread.toFixed(2)}`).toBeGreaterThan(0.2);
  });

  it('⚠️ 倍率口径**不含 Boss**（Boss 是单挑，另算秒数）', () => {
    // Boss 波（w20）的倍率必须与小怪波同量级 ——
    // 否则那一波的覆盖度就变成"只看 Boss"。
    const bossWave = waveCounterMult(20, 1000, {}, ['area']);
    const smallWave = waveCounterMult(18, 1000, {}, ['area']);
    expect(Math.abs(bossWave - smallWave)).toBeLessThan(0.2);
  });

  it('倍率曲线是**凸**的：凑齐手段远比单张值钱（第九轮）', () => {
    // 线性曲线下两种策略只差 20.4% ⇒ 实测里都能通关 ⇒ 机制等于没生效。
    // 指数曲线把差距拉到 38%，而单张对症牌仍有 23% 的提升。
    const all = chapterCounterMult(4, 1000, {}, ['area', 'burst', 'slow', 'mobility']);
    const one = chapterCounterMult(4, 1000, {}, ['area']);
    const gapAll = all - 1;
    const gapOne = one - 1;
    // "凑齐"相对"单张"的富余度，必须明显大于线性时的富余度
    expect(gapAll / gapOne).toBeGreaterThan(1.6);
  });

  it('Boss 战秒数：血量 ÷ DPS', () => {
    expect(bossFightSeconds(4000, 200)).toBe(20);
    expect(bossFightSeconds(4000, 107)).toBeCloseTo(37.4, 1);
    expect(bossFightSeconds(0, 200)).toBe(null);
    expect(bossFightSeconds(4000, 0)).toBe(null);
  });
});
