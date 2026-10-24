import { describe, it, expect } from 'vitest';
import {
  comboDamageBonus, lowHpDamageMul, killDamageBonus, slowFactor,
} from '../src/systems/transforms.js';

describe('转化型装备的规则', () => {
  it('连击增伤：每层 +N，最多 cap 层', () => {
    expect(comboDamageBonus(0, 1, 6)).toBe(0);
    expect(comboDamageBonus(3, 1, 6)).toBe(3);
    expect(comboDamageBonus(20, 1, 6)).toBe(6);
    expect(comboDamageBonus(5, 2, 6)).toBe(10);
  });

  it('连击增伤：没配这个装备就是 0（不能影响旧行为）', () => {
    expect(comboDamageBonus(50, 0, 6)).toBe(0);
    expect(comboDamageBonus(50, 1, 0)).toBe(50); // cap=0 表示不限
  });

  it('连击增伤：负数连击不会给出负伤害', () => {
    expect(comboDamageBonus(-3, 1, 6)).toBe(0);
  });

  it('低血增伤：低于阈值才生效', () => {
    // 血量 3 / 上限 5 = 60% > 40% 阈值 → 不触发
    expect(lowHpDamageMul(3, 5, 0.4, 1.8)).toBe(1);
    // 血量 1 / 上限 5 = 20% < 40% → 触发
    expect(lowHpDamageMul(1, 5, 0.4, 1.8)).toBe(1.8);
  });

  it('低血增伤：阈值与倍率没配就不生效', () => {
    expect(lowHpDamageMul(1, 5, 0, 1.8)).toBe(1);
    expect(lowHpDamageMul(1, 5, 0.4, 1)).toBe(1);
    expect(lowHpDamageMul(0, 0, 0.4, 1.8)).toBe(1);
  });

  it('击杀增伤：按击杀数叠，最多 cap 层', () => {
    expect(killDamageBonus(0, 1, 12)).toBe(0);
    expect(killDamageBonus(7, 1, 12)).toBe(7);
    expect(killDamageBonus(999, 1, 12)).toBe(12);
    expect(killDamageBonus(5, 0, 12)).toBe(0);
  });

  it('命中减速：在有效期内打折，过期或没配就是 1', () => {
    expect(slowFactor(0, 1000, 500)).toBe(1);      // 没有减速强度
    expect(slowFactor(0.35, 1000, 1500)).toBe(1);  // 已过期
    expect(slowFactor(0.35, 1000, 500)).toBeCloseTo(0.65);
  });

  it('命中减速：强度最多 90%（不能把敌人钉死）', () => {
    expect(slowFactor(5, 1000, 500)).toBeCloseTo(0.1);
    expect(slowFactor(-1, 1000, 500)).toBe(1);
  });
});
