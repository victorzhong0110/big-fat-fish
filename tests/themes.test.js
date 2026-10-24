import { describe, it, expect } from 'vitest';
import { THEME_POOL, themeMods, pickTheme, NEUTRAL_MODS } from '../src/systems/themes.js';
import { mulberry32 } from '../src/systems/rng.js';

describe('章节主题', () => {
  it('主题池够大，一局不会总是同一种', () => {
    // 一局 4 章，从池里抽 —— 池子越大，"这一章长什么样"的组合越多
    expect(THEME_POOL.length).toBeGreaterThanOrEqual(12);
    const ids = THEME_POOL.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每个主题都有一句人话描述（主题是玩家看得见的东西）', () => {
    for (const t of THEME_POOL) {
      expect(t.name).toBeTruthy();
      expect(t.desc).toBeTruthy();
      expect(t.desc.length).toBeGreaterThan(4);
    }
  });

  it('主题的修正量都在合理范围内（不会有一章直接没法打）', () => {
    for (const t of THEME_POOL) {
      const m = themeMods(t);
      expect(m.enemyHpMul).toBeGreaterThanOrEqual(0.7);
      expect(m.enemyHpMul).toBeLessThanOrEqual(1.5);
      expect(m.enemyCountMul).toBeGreaterThanOrEqual(0.7);
      expect(m.enemyCountMul).toBeLessThanOrEqual(1.45);
      expect(m.enemySpeedMul).toBeGreaterThanOrEqual(0.85);
      expect(m.enemySpeedMul).toBeLessThanOrEqual(1.35);
      expect(m.scoreMul).toBeGreaterThanOrEqual(0.9);
      expect(m.scoreMul).toBeLessThanOrEqual(1.7);
    }
  });

  it('每个主题都给出可用的修正量', () => {
    for (const t of THEME_POOL) {
      const m = themeMods(t);
      expect(m.enemyHpMul).toBeGreaterThan(0);
      expect(m.enemyCountMul).toBeGreaterThan(0);
      expect(m.scoreMul).toBeGreaterThan(0);
      expect(m.typeBias).toBeTruthy();
    }
  });

  it('themeMods 补齐缺省项', () => {
    const m = themeMods({ id: 'x', mods: { enemyHpMul: 2 } });
    expect(m.enemyHpMul).toBe(2);
    expect(m.enemySpeedMul).toBe(NEUTRAL_MODS.enemySpeedMul);
    expect(m.hazardEverySec).toBe(0);
  });

  it('没有主题时返回中性修正量', () => {
    expect(themeMods(null)).toEqual(NEUTRAL_MODS);
  });

  it('同一 rng 抽到的主题可复现', () => {
    const a = pickTheme(mulberry32(7));
    const b = pickTheme(mulberry32(7));
    expect(a.id).toBe(b.id);
  });

  it('不会抽到被排除的主题', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const t = pickTheme(rng, 'gale');
      expect(t.id).not.toBe('gale');
    }
  });
});
