// 难度重算（第九轮版）：由**实测 DPS 曲线**与**目标覆盖度**反推需求系数。
//
// 为什么要有这个脚本（第九轮的教训）：
//   ① **标定会过期** —— 第四轮定的系数在"构筑只有 4 次挑选"时是对的，
//      第六轮变成 8 次之后旧系数作废；第九轮引入"对症 ×2"之后又作废一次。
//   ② 靠手调 `ENEMY_HP_PER_WAVE` / `CHAPTER_HP_BONUS` 是**拍脑袋** ——
//      需求 = (基础血量 + 台阶) ÷ 出怪窗口，三个东西互相咬合。
//
// 这个脚本做的是**反解**：
//   目标覆盖度 → 目标需求 DPS → 目标血量 → 拆成「章内斜率 + 章间台阶」。
//
// 用法：
//   node scripts/retune2.mjs <报告.json> [目标JSON]
//   目标JSON 形如 { "16": 1.6, "17": 1.5, "18": 1.5, "20": 1.5 }
//   （缺省用一组"中期宽、后期紧"的默认形状）
//
// ⚠️ **第九轮的警告**：引入「对症 ×2」之后，覆盖度里已经**混进了构筑质量**
// （它乘的是"有效 DPS"）。⇒ **不能拿它当"难度"的代理去反推需求** ——
// 那会把"好构筑更强"当成"需求太低"，进而把需求抬到谁都打不动。
//
// ⇒ 这个脚本只在**对症倍率之前**的版本上可信；
// 引入倍率之后，标定口径要换成下面两个**不被倍率污染**的量：
//   ① **需求 ÷ 保底 DPS**（保底构筑 = 什么都不拿，它没有倍率）
//   ② **机器人对照**（smart vs good 的通关率与死因）
import { readFileSync } from 'node:fs';
import { wavePlan } from '../src/systems/waveDirector.js';
import { enemyStats } from '../src/systems/enemies.js';
import { ENEMY_HP_PER_WAVE, CHAPTER_HP_BONUS } from '../src/systems/difficulty.js';

/** 缺省目标：中期宽（构筑起效）→ 后期紧（第四章是考试） */
const DEFAULT_TARGET = {
  10: 2.4, 12: 2.1, 14: 1.8, 15: 1.7, 16: 1.6, 17: 1.5, 18: 1.5, 19: 1.5, 20: 1.5,
};

const [, , file, targetJson] = process.argv;
if (!file) {
  console.error('用法：node scripts/retune2.mjs <报告.json> [目标JSON]');
  process.exit(1);
}
const TARGET = targetJson ? JSON.parse(readFileSync(targetJson, 'utf8')) : DEFAULT_TARGET;

/**
 * 一波里"平均基础血量"（不含台阶、不含波次成长）。
 * 需求 = (平均基础血量 + 台阶) ÷ 出怪窗口 ⇒ 反推台阶要用到它。
 */
function avgBaseHp(wave, seed) {
  const p = wavePlan(wave, seed, {});
  let sum = 0;
  for (const e of p.plan) {
    const base = { crawler: 1, spore: 2, swarm: 1, bud: 4, moth: 1, charger: 2, husk: 8, weaver: 3, huskling: 1 }[e.type] ?? 2;
    sum += base * (e.type === 'swarm' ? 3 : 1);
  }
  return p.plan.length ? sum / p.plan.length : 2;
}

const report = JSON.parse(readFileSync(file, 'utf8'));

/** 取所有 run 在某波的平均 dps / mult / coverage */
function avgAt(wave, field) {
  const vals = report.runs
    .map((r) => (r.timeline || []).find((t) => t.wave === wave))
    .filter(Boolean)
    .map((t) => t[field])
    .filter((v) => typeof v === 'number');
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** 每一波的"有效 DPS"（含对症倍率） */
function effDpsAt(wave) {
  const dps = avgAt(wave, 'dps');
  const mult = avgAt(wave, 'mult');
  if (dps === null) return null;
  return dps * (mult ?? 1);
}

console.log('当前 ENEMY_HP_PER_WAVE =', ENEMY_HP_PER_WAVE, ' CHAPTER_HP_BONUS =', JSON.stringify(CHAPTER_HP_BONUS));
console.log('\n波次 | 有效DPS | 当前need | 当前覆盖 | 目标覆盖 | 目标need | 目标台阶');
const rows = [];
for (const w of Object.keys(TARGET).map(Number).sort((a, b) => a - b)) {
  const eff = effDpsAt(w);
  const need = avgAt(w, 'need');
  const cov = avgAt(w, 'coverage');
  const tgt = TARGET[w];
  if (eff === null || !need) continue;
  const tgtNeed = eff / tgt;
  const interval = Math.max(0.32, 1.05 - w * 0.045);
  const base = avgBaseHp(w, 1000);
  const needBonus = Math.max(0, Math.round(tgtNeed * interval - base));
  console.log(
    `${String(w).padStart(4)} | ${String(Math.round(eff)).padStart(7)} | ${String(need).padStart(9)} | `
    + `${String(cov).padStart(9)} | ${String(tgt).padStart(9)} | ${String(Math.round(tgtNeed)).padStart(9)} | `
    + `${String(needBonus).padStart(9)}`,
  );
  rows.push({ w, needBonus, tgtNeed, eff });
}

/**
 * 拆成「章内斜率 + 章间台阶」。
 *
 * 台阶 = 该章各波**目标台阶的最小值**减去章内偏移
 * （取最小值 ⇒ 需求不会低于目标；宁可略紧也不要松）。
 * 章内斜率 = 同章相邻两波目标台阶的差（取中位数，避免被单波噪声带偏）。
 */
const byChapter = new Map();
for (const r of rows) {
  const ch = Math.floor((r.w - 1) / 5);
  if (!byChapter.has(ch)) byChapter.set(ch, []);
  byChapter.get(ch).push(r);
}

const slopeSamples = [];
for (const [ch, list] of byChapter) {
  if (list.length >= 2) {
    const sorted = list.slice().sort((a, b) => a.w - b.w);
    for (let i = 1; i < sorted.length; i++) {
      const dw = sorted[i].w - sorted[i - 1].w;
      slopeSamples.push((sorted[i].needBonus - sorted[i - 1].needBonus) / dw);
    }
  }
}
const slope = slopeSamples.length
  ? Math.max(0.5, Math.round((slopeSamples.sort((a, b) => a - b)[Math.floor(slopeSamples.length / 2)] + 0.001) * 100) / 100)
  : ENEMY_HP_PER_WAVE;

const bonus = [];
for (let ch = 0; ch < 4; ch++) {
  const list = byChapter.get(ch) || [];
  if (!list.length) { bonus.push(bonus[ch - 1] ?? 0); continue; }
  const minBonus = Math.min(...list.map((r) => r.needBonus));
  const inChapter = (list[0].w - 1) % 5;
  const value = Math.max(0, Math.round(minBonus - Math.floor(inChapter * slope)));
  bonus.push(value);
}
// 台阶必须递增（否则章与章交界处敌人血量会倒退）
for (let i = 1; i < bonus.length; i++) {
  const floor = bonus[i - 1] + Math.ceil(4 * slope);
  if (bonus[i] < floor) bonus[i] = floor;
}

console.log('\n建议值：');
console.log('  ENEMY_HP_PER_WAVE =', slope);
console.log('  CHAPTER_HP_BONUS =', JSON.stringify(bonus));
console.log('\n（改完记得重跑：npx vitest run && node scripts/balance.mjs）');
