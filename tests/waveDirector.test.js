import { describe, it, expect } from 'vitest';
import { wavePlan, buildTimeline, waveBreather, BOSS_EVERY } from '../src/systems/waveDirector.js';

describe('wavePlan', () => {
  it('同一波号永远得到同一编排', () => {
    expect(wavePlan(3)).toEqual(wavePlan(3));
  });

  it('怪数随波次增长', () => {
    expect(wavePlan(1).count).toBeLessThan(wavePlan(8).count);
    expect(wavePlan(1).count).toBeLessThan(wavePlan(20).count);
  });

  it('第 2 波起出现孢子，第 4 波起出现海葵', () => {
    const types = (w) => new Set(wavePlan(w).plan.map((p) => p.type));
    expect(types(1)).toEqual(new Set(['crawler']));
    expect(types(2).has('spore')).toBe(true);
    expect(types(4).has('bud')).toBe(true);
  });

  it('每 5 波出一次 boss', () => {
    expect(wavePlan(5).boss).toBe(true);
    expect(wavePlan(10).boss).toBe(true);
    expect(wavePlan(4).boss).toBe(false);
    expect(BOSS_EVERY).toBe(5);
  });

  it('出怪间隔随波次收紧', () => {
    expect(wavePlan(10).interval).toBeLessThan(wavePlan(1).interval);
    expect(wavePlan(50).interval).toBeGreaterThanOrEqual(0.32);
  });

  it('血量与速度加成单调不减', () => {
    expect(wavePlan(6).hpBonus).toBeGreaterThanOrEqual(wavePlan(3).hpBonus);
    expect(wavePlan(30).speedBonus).toBeLessThanOrEqual(46);
  });
});

describe('buildTimeline', () => {
  it('事件按时间升序', () => {
    const tl = buildTimeline(6);
    const times = tl.map((e) => e.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('boss 事件出现在时间线里', () => {
    const tl = buildTimeline(5);
    expect(tl.filter((e) => e.kind === 'boss')).toHaveLength(1);
    expect(tl.find((e) => e.kind === 'boss').at).toBeCloseTo(2.2);
  });

  it('事件总数等于怪数（boss 另计）', () => {
    const p = wavePlan(4);
    const tl = buildTimeline(4);
    expect(tl.filter((e) => e.kind === 'enemy')).toHaveLength(p.count);
  });
});

describe('waveBreather', () => {
  it('喘息时间随波次缩短但有下限', () => {
    expect(waveBreather(1)).toBeGreaterThan(waveBreather(15));
    expect(waveBreather(99)).toBeGreaterThanOrEqual(1.6);
  });
});

describe('主题修正量（mods）', () => {
  it('不传 mods 时行为与从前一致', () => {
    expect(wavePlan(3)).toEqual(wavePlan(3));
    expect(wavePlan(1).plan.every((p) => p.type === 'crawler')).toBe(true);
  });

  it('数量倍率放大本波怪数', () => {
    const base = wavePlan(6);
    const more = wavePlan(6, 1, { enemyCountMul: 1.5 });
    expect(more.count).toBe(Math.round(base.count * 1.5));
  });

  it('类型偏置把一部分贪嘴小鱼换成沙丁鱼群', () => {
    const p = wavePlan(6, 1, { typeBias: { swarm: 3 } });
    const swarmCount = p.plan.filter((e) => e.type === 'swarm').length;
    const plain = wavePlan(6).plan.filter((e) => e.type === 'swarm').length;
    expect(swarmCount).toBeGreaterThan(plain);
  });

  it('偏置不会凭空多出敌人', () => {
    const base = wavePlan(6);
    const biased = wavePlan(6, 1, { typeBias: { swarm: 3 } });
    expect(biased.count).toBe(base.count);
  });

  it('同波同 mods 必得同编排', () => {
    const mods = { typeBias: { swarm: 3 }, enemyCountMul: 1.2 };
    expect(wavePlan(7, 5, mods)).toEqual(wavePlan(7, 5, mods));
  });

  it('毒雾主题会在时间线里空投花粉炸弹', () => {
    const tl = buildTimeline(6, 1, { hazardEverySec: 3 });
    const hazards = tl.filter((e) => e.kind === 'hazard');
    expect(hazards.length).toBeGreaterThan(0);
    expect(tl.map((e) => e.at)).toEqual([...tl.map((e) => e.at)].sort((a, b) => a - b));
  });

  it('没有毒雾主题时不会凭空出现炸弹事件', () => {
    const tl = buildTimeline(6);
    expect(tl.filter((e) => e.kind === 'hazard')).toHaveLength(0);
  });
});
