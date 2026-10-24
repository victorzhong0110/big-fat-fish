import { describe, it, expect } from 'vitest';
import { createSpawner } from '../src/systems/spawner.js';
import { wavePlan } from '../src/systems/waveDirector.js';

describe('createSpawner', () => {
  it('开局是喘息状态，2 秒后进入第一波', () => {
    const s = createSpawner(1);
    s.start(0);
    expect(s.state).toBe('breather');
    expect(s.update(1.9)).toEqual([]);
    expect(s.update(2.1)).toEqual([]);
    expect(s.wave).toBe(1);
    expect(s.state).toBe('wave');
  });

  it('按时间线依次吐出敌人事件', () => {
    const s = createSpawner(1);
    s.start(0);
    s.update(2.1); // 进入第 1 波，waveStartAt = 2.1
    const first = wavePlan(1).plan[0];
    const fireAt = first.at + first.jitter; // 时间线里的实际触发时刻
    expect(s.update(2.1 + fireAt - 0.01)).toEqual([]);
    const events = s.update(2.1 + fireAt + 0.01);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe('enemy');
    expect(events[0].type).toBe('crawler');
  });

  it('一段时间内吐出的事件数等于本波编排总数', () => {
    const s = createSpawner(1);
    s.start(0);
    s.update(2.1);
    const p = wavePlan(1);
    let count = 0;
    for (let t = 2.1; t < 60; t += 0.05) {
      count += s.update(t).length;
      if (s.state === 'breather') break; // 只统计第 1 波
    }
    expect(count).toBe(p.count);
  });

  it('清空后回到喘息并准备下一波', () => {
    const s = createSpawner(1);
    s.start(0);
    s.update(2.1);
    for (let t = 2.1; t < 40; t += 0.1) {
      s.update(t);
      if (s.state === 'breather') break;
    }
    expect(s.state).toBe('breather');
    expect(s.wave).toBe(1);
  });

  it('连续推进会进入第 2 波', () => {
    const s = createSpawner(1);
    s.start(0);
    let t = 0;
    for (let i = 0; i < 2000; i++) {
      t += 0.05;
      s.update(t);
      if (s.wave >= 2) break;
    }
    expect(s.wave).toBeGreaterThanOrEqual(2);
  });
});

describe('主题接入', () => {
  it('每一波都向 modsFor 索要修正量，并暴露当前波的 mods', () => {
    const seen = [];
    const s = createSpawner(1, { modsFor: (w) => { seen.push(w); return { enemyCountMul: 2 }; } });
    s.start(0);
    s.update(2.1);
    expect(seen).toContain(1);
    expect(s.mods).toEqual({ enemyCountMul: 2 });
  });

  it('毒雾主题会吐出 hazard 事件', () => {
    const s = createSpawner(1, { modsFor: () => ({ hazardEverySec: 2 }) });
    s.start(0);
    s.update(2.1);
    let hazards = 0;
    for (let t = 2.1; t < 60; t += 0.05) {
      hazards += s.update(t).filter((e) => e.kind === 'hazard').length;
      if (s.state === 'breather') break;
    }
    expect(hazards).toBeGreaterThan(0);
  });
});
