import { describe, it, expect } from 'vitest';
import {
  createCombat, registerKill, comboActive, decayCombo, comboRemaining,
  COMBO_WINDOW, MAX_MULTIPLIER,
} from '../src/systems/combat.js';

describe('registerKill', () => {
  it('第一次击杀给基础分', () => {
    const s = createCombat();
    const r = registerKill(s, 10, 0);
    expect(r.gained).toBe(10);
    expect(r.combo).toBe(1);
    expect(r.multiplier).toBe(1);
    expect(s.score).toBe(10);
  });

  it('窗口内连杀会涨倍率', () => {
    const s = createCombat();
    registerKill(s, 10, 0);
    registerKill(s, 10, 1);
    registerKill(s, 10, 2);
    const r = registerKill(s, 10, 3); // 第 4 连
    expect(r.combo).toBe(4);
    expect(r.multiplier).toBe(2);
    expect(r.gained).toBe(20);
  });

  it('超出窗口后连击重置', () => {
    const s = createCombat();
    registerKill(s, 10, 0);
    registerKill(s, 10, 1);
    const r = registerKill(s, 10, 1 + COMBO_WINDOW + 0.5);
    expect(r.combo).toBe(1);
    expect(r.multiplier).toBe(1);
    expect(r.chained).toBe(false);
  });

  it('倍率封顶', () => {
    const s = createCombat();
    for (let i = 0; i < 40; i++) registerKill(s, 10, i * 0.2);
    expect(s.multiplier).toBe(MAX_MULTIPLIER);
  });

  it('记录最高连击与总击杀', () => {
    const s = createCombat();
    for (let i = 0; i < 5; i++) registerKill(s, 10, i * 0.1);
    expect(s.bestCombo).toBe(5);
    expect(s.kills).toBe(5);
  });
});

describe('comboActive / decayCombo / comboRemaining', () => {
  it('窗口内连击有效', () => {
    const s = createCombat();
    registerKill(s, 10, 0);
    expect(comboActive(s, 1)).toBe(true);
    expect(comboActive(s, COMBO_WINDOW + 1)).toBe(false);
  });

  it('超时后倍率归位', () => {
    const s = createCombat();
    registerKill(s, 10, 0);
    registerKill(s, 10, 0.5);
    registerKill(s, 10, 1);
    registerKill(s, 10, 1.5); // 第 4 连 → 倍率 2
    expect(s.multiplier).toBe(2);
    expect(decayCombo(s, 1.5 + COMBO_WINDOW + 0.1)).toBe(true);
    expect(s.combo).toBe(0);
    expect(s.multiplier).toBe(1);
  });

  it('decayCombo 幂等', () => {
    const s = createCombat();
    registerKill(s, 10, 0);
    expect(decayCombo(s, 99)).toBe(true);
    expect(decayCombo(s, 99)).toBe(false);
  });

  it('剩余时间随时间递减', () => {
    const s = createCombat();
    registerKill(s, 10, 0);
    expect(comboRemaining(s, 0)).toBeCloseTo(COMBO_WINDOW);
    expect(comboRemaining(s, 1)).toBeCloseTo(COMBO_WINDOW - 1);
    expect(comboRemaining(s, 99)).toBe(0);
  });
});
