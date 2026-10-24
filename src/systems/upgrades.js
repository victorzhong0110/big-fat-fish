// 武器成长与敌人属性曲线
import { FIRE_PER_CHAPTER, ENEMY_HP_PER_WAVE } from './difficulty.js';
// 敌种表与属性计算搬到了 systems/enemies.js（第五轮）：
// 敌种的行为、精英词缀、应对提示需要和属性放在一起，
// 否则"这个怪克制什么"这种知识会被拆散在两个文件里。
import { enemyStats } from './enemies.js';

export const FIRE_MAX = 5;

/**
 * 期望 DPS（**含暴击期望**）—— 所有地方算"DPS"都用这一份。
 *
 * 为什么必须算暴击（第十轮）：
 * 面板上「暴击率 +8%」「暴击伤害 +70%」这两类牌，
 * 在**只算 damage × bullets ÷ 冷却**的口径下收益是 **0**
 * ⇒ 面板会写"不提高伤害" ⇒ **面板在撒谎**（第九轮实测里已经能踩到这个坑）。
 *
 * 口径：每发伤害的期望 = damage × (1 + critChance × (critMult - 1))
 */
export function expectedDps(fire) {
  if (!fire) return 0;
  const critExpect = 1 + (fire.critChance ?? 0) * ((fire.critMult ?? 2) - 1);
  return (fire.damage * critExpect * fire.bullets) / Math.max(0.001, fire.cooldownMs / 1000);
}

export function clampFire(level) {
  return Math.max(1, Math.min(FIRE_MAX, Math.floor(level)));
}

/**
 * 章节开始时的火力保底：+1 级（上限 FIRE_MAX）。
 *
 * 为什么需要它：火力等级原本**只**靠捡「磨砺石」掉落提升，
 * 捡不到就一直卡在 Lv.1（3.1 DPS）。而实测的自动试玩里，
 * 机器人有相当比例的局从头到尾停在 Lv.1，10 杀就死在第 9 波——
 * 20 波的主线根本走不到，「一局有始有终」成了空话。
 * 章节开始 +1 级 = 保底成长线：磨砺石掉落变成"加速"而不是"唯一的路"。
 * 代价：火力等级的成长被部分固定化，捡磨砺石的爽感下降一点（可接受，见 DECISIONS §6.6）。
 */
export function chapterStartFire(level) {
  return clampFire(level + FIRE_PER_CHAPTER);
}

/**
 * 火力等级 → 射击参数
 *
 * **伤害随等级线性增长（1..5）**，这是第四轮末改的：
 * 原来是 `1 + floor((l-1)/2)` —— Lv.1 与 Lv.2 都是 1 点伤害、Lv.3 与 Lv.4 都是 2 点，
 * 于是火力等级的成长**几乎全来自弹数与冷却**，
 * 火力保底线（不吃任何装备）的上限只有 64 DPS，
 * 而第 20 波需要 99 DPS → **"一张伤害牌都没抽到"就必然死在第 12~14 波**（实测）。
 *
 * 改成线性之后，保底线是 107 DPS，**刚好能打完但打得很勉强**：
 *   第 2 章 Lv.3 = 26 DPS ↔ 第 10 波需要 29（0.9×，构筑从这里开始要紧）
 *   第 3 章 Lv.4 = 65 DPS ↔ 第 15 波需要 67（0.97×，边缘）
 *   第 4 章 Lv.5 = 107 DPS ↔ 第 20 波需要 99（1.08×，勉强）
 * 也就是：**保底能通关，构筑决定通关的余量** —— 这才是肉该有的形状。
 */
export function fireStats(level) {
  const l = clampFire(level);
  return {
    level: l,
    damage: 1 + (l - 1),  // 1,2,3,4,5 —— 与等级线性
    bullets: l >= 4 ? 3 : l >= 2 ? 2 : 1,
    spreadDeg: l >= 4 ? 16 : l >= 2 ? 9 : 0,
    cooldownMs: Math.max(95, 320 - (l - 1) * 45),
    bulletSpeed: 430 + (l - 1) * 25,
    range: 520,
  };
}

/**
 * 敌人属性曲线搬到了 systems/enemies.js（第五轮）。
 * 这里保留一个转发导出，别处（GameScene / pressure / 测试）照旧 import。
 */
export { enemyStats };

/** 玩家受伤后的无敌时长（毫秒） */
export const INVULN_MS = 1200;

/** 玩家冲刺冷却与持续（毫秒） */
export const DASH_COOLDOWN_MS = 1600;
export const DASH_DURATION_MS = 180;
export const DASH_SPEED = 720;

/** 玩家初始与上限血量 */
export const PLAYER_MAX_HP = 5;
