import { describe, it, expect } from 'vitest';
import {
  fireStats, clampFire, enemyStats, FIRE_MAX, PLAYER_MAX_HP, INVULN_MS, DASH_COOLDOWN_MS,
} from '../src/systems/upgrades.js';
import { waveDpsNeed } from '../src/systems/pressure.js';

describe('fireStats', () => {
  it('等级被夹在 1..5', () => {
    expect(clampFire(0)).toBe(1);
    expect(clampFire(99)).toBe(FIRE_MAX);
    expect(clampFire(3.9)).toBe(3);
  });

  it('火力越高伤害与射速越强', () => {
    const l1 = fireStats(1);
    const l5 = fireStats(5);
    expect(l5.damage).toBeGreaterThan(l1.damage);
    expect(l5.cooldownMs).toBeLessThan(l1.cooldownMs);
    expect(l5.bulletSpeed).toBeGreaterThan(l1.bulletSpeed);
  });

  it('2 级开始双发，4 级开始三发', () => {
    expect(fireStats(1).bullets).toBe(1);
    expect(fireStats(2).bullets).toBe(2);
    expect(fireStats(3).bullets).toBe(2);
    expect(fireStats(4).bullets).toBe(3);
    expect(fireStats(5).bullets).toBe(3);
  });

  it('射速有下限，不会变成零间隔', () => {
    expect(fireStats(5).cooldownMs).toBeGreaterThanOrEqual(95);
  });
});

describe('火力曲线（第四轮末改：伤害随等级线性增长）', () => {
  it('伤害随等级线性增长（1..5）', () => {
    expect([1, 2, 3, 4, 5].map((l) => fireStats(l).damage)).toEqual([1, 2, 3, 4, 5]);
  });

  it('火力保底线能勉强打完 20 波（第 20 波需求 ≈ 99 DPS）', () => {
    const dps = [1, 2, 3, 4, 5].map((l) => {
      const f = fireStats(l);
      return (f.damage * f.bullets) / (f.cooldownMs / 1000);
    });
    expect(dps[4]).toBeGreaterThan(99);   // 保底够用
    expect(dps[4]).toBeLessThan(120);     // 但也只是勉强
    for (let i = 1; i < dps.length; i++) expect(dps[i]).toBeGreaterThan(dps[i - 1]);
  });
});

describe('enemyStats', () => {
  it('血量随波次增长', () => {
    expect(enemyStats('crawler', 10).hp).toBeGreaterThan(enemyStats('crawler', 1).hp);
    expect(enemyStats('boss', 20).hp).toBeGreaterThan(enemyStats('boss', 5).hp);
  });

  it('普通敌人的血量曲线是「章内线性 + 章间台阶」（第八轮）', () => {
    // 钉住难度曲线：玩家的强度是**按章台阶**上去的（火力等级 +1 + 章首装备），
    // 需求也必须在同一个地方台阶（见 systems/difficulty.js 的 CHAPTER_HP_BONUS）。
    // 第一章没变（base 0），后面每章一级台阶。
    // ⚠️ 第九轮重算（retune2 反解 + 两次返工）：
    // 引入「对症 ×2.5」之后，会构筑的玩家的**有效 DPS** 涨了一倍多 ⇒ 需求必须同步抬。
    // 章内斜率 1.25 → 2.0；章间台阶从**绝对加值**改成**乘法**（×1.35）——
    // 绝对加值会让需求在章交界处暴增（实测第 5→6 波 ×4 ⇒ 机器人直接死）。
    for (const [w, hp] of [[1, 1], [5, 9], [6, 11], [10, 19], [15, 33], [20, 52]]) {
      expect(enemyStats('crawler', w).hp, `第 ${w} 波`).toBe(hp);
    }
    // 章交界处**不许暴增**（这一条是第九轮真踩过的坑）
    const jump = enemyStats('crawler', 6).hp / enemyStats('crawler', 5).hp;
    expect(jump, `第 5→6 波血量跳了 ${jump.toFixed(2)} 倍`).toBeLessThan(1.6);
  });

  it('保底构筑撑不住主线（构筑必须出力）', () => {
    // 火力保底线 Lv.5 = 5 伤害 × 3 弹 ÷ 140ms ≈ 107 DPS；
    // 第 20 波的需求比它高 ⇒ **一颗装备不吃的保底玩家走不到通关**（这是刻意的）。
    const dps = (5 * 3) / (140 / 1000); // Lv.5：5 伤害 × 3 弹 ÷ 140ms
    // 覆盖度 = 保底 DPS ÷ 需求 < 1 ⇒ 保底构筑过不去
    expect(dps / waveDpsNeed(20, 1000, {})).toBeLessThan(1);
  });

  it('Boss 血量按章查表（第九轮重做，见 difficulty.js 的 BOSS_HP_BY_CHAPTER）', () => {
    // ⚠️ 第九轮**推翻**了旧断言「Boss 血量按波次平方走」：
    // 旧公式是按"保底火力 107 DPS"标定的，而实测玩家在第 20 波有 178~298 DPS
    // ⇒ 终局 Boss（1440 血）7 秒就死 ⇒ **Boss 战从考试退化成过场动画**。
    // 新表按"实测 DPS × 目标战斗时长"反推。
    expect(enemyStats('boss', 5).hp).toBe(1540);
    expect(enemyStats('boss', 10).hp).toBe(2860);
    expect(enemyStats('boss', 15).hp).toBe(3740);
    expect(enemyStats('boss', 20).hp).toBe(4400);
    // 后面的 Boss 相对前面越来越重
    expect(enemyStats('boss', 20).hp / enemyStats('boss', 10).hp).toBeGreaterThan(1.4);
    // 无尽模式继续往后（不能停住 ⇒ 血量会倒退）
    expect(enemyStats('boss', 25).hp).toBeGreaterThan(enemyStats('boss', 20).hp);
  });

  it('终局 Boss 是"构筑的考试"（第九轮：它必须打得够久）', () => {
    // 终局 Boss = 2000 × FINAL_BOSS_HP_MUL(2.0) = 4000 血
    const hp = enemyStats('boss', 20).hp * 2;
    // 中位构筑（实测第 20 波**有效** DPS 475，含对症倍率）⇒ ~19 秒
    expect(hp / 475).toBeGreaterThanOrEqual(15);
    // 保底构筑（107 DPS、没有任何手段）⇒ 82 秒 ⇒ 它本来就该输
    expect(hp / 107).toBeGreaterThan(60);
  });

  it('速度加成有上限', () => {
    const slow = enemyStats('crawler', 100);
    expect(slow.speed).toBeLessThanOrEqual(60 + 46);
  });

  it('分值随类型不同', () => {
    expect(enemyStats('boss', 1).score).toBeGreaterThan(enemyStats('bud', 1).score);
    expect(enemyStats('bud', 1).score).toBeGreaterThan(enemyStats('crawler', 1).score);
  });
});

describe('常量', () => {
  it('玩家血量、无敌与冲刺数值合理', () => {
    expect(PLAYER_MAX_HP).toBe(5);
    expect(INVULN_MS).toBeGreaterThan(0);
    expect(DASH_COOLDOWN_MS).toBeGreaterThan(500);
  });
});
