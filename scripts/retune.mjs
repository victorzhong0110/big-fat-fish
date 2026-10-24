// 难度重算：给定实测的 DPS 曲线与目标覆盖度，反推「需求曲线」应该是多少，
// 再反推 `ENEMY_HP_PER_WAVE` 取多少才能对得上。
//
// 为什么要有这个脚本：第四轮定下"掉队点落在第 14~17 波"这个目标，
// 但构筑一变强（第五轮：一局的遗物来源从 4 次变成 8 次），
// 同一个系数就会让掉队点往后挪。**系数不能拍，只能反推。**
//
// 用法：node scripts/retune.mjs <新报告> <旧报告> [目标覆盖度 JSON]
import { readFileSync } from 'node:fs';
import { waveDpsNeed } from '../src/systems/pressure.js';
import { ENEMY_HP_PER_WAVE } from '../src/systems/difficulty.js';

const [, , newFile, oldFile, targetJson] = process.argv;
if (!newFile || !oldFile) {
  console.error('用法：node scripts/retune.mjs <新报告> <旧报告> [目标覆盖度 JSON]');
  process.exit(1);
}

/** 目标覆盖度：默认沿用第四轮「好构筑」的曲线形状（掉队点在第 16 波附近） */
const TARGET = targetJson
  ? JSON.parse(readFileSync(targetJson, 'utf8'))
  : {
    10: 3.0, 12: 2.4, 14: 1.7, 15: 1.3, 16: 1.0, 17: 0.9, 18: 0.87, 19: 0.85, 20: 0.82,
  };

const newer = JSON.parse(readFileSync(newFile, 'utf8'));
const older = JSON.parse(readFileSync(oldFile, 'utf8'));

/** 把一局所有 run 的同一波取平均 */
function avgAt(report, wave, field) {
  const vals = report.runs
    .map((r) => (r.timeline || []).find((t) => t.wave === wave))
    .filter(Boolean)
    .map((t) => t[field])
    .filter((v) => typeof v === 'number');
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

console.log('当前 ENEMY_HP_PER_WAVE =', ENEMY_HP_PER_WAVE);
console.log('\n波次 | 旧报告 dps | 新报告 dps | 旧 need | 新 need | 旧覆盖 | 新覆盖 | 目标覆盖 | 需要的 need');
const rows = [];
for (let w = 10; w <= 20; w++) {
  const oDps = avgAt(older, w, 'dps');
  const nDps = avgAt(newer, w, 'dps');
  const oNeed = avgAt(older, w, 'need');
  const nNeed = avgAt(newer, w, 'need');
  const oCov = avgAt(older, w, 'coverage');
  const nCov = avgAt(newer, w, 'coverage');
  const tgt = TARGET[w] ?? null;
  const needForTarget = tgt && nDps ? Math.round(nDps / tgt) : null;
  console.log(
    `${String(w).padStart(3)} | ${String(oDps ?? '-').padStart(10)} | ${String(nDps ?? '-').padStart(10)} | `
    + `${String(oNeed ?? '-').padStart(8)} | ${String(nNeed ?? '-').padStart(8)} | `
    + `${String(oCov ?? '-').padStart(8)} | ${String(nCov ?? '-').padStart(8)} | ${String(tgt ?? '-').padStart(8)} | `
    + `${String(needForTarget ?? '-').padStart(10)}`,
  );
  rows.push({ w, nDps, needForTarget, nNeed });
}

// 反推系数：need(w) ≈ (floor((w-1)·k) + avgBase) / interval(w)
// 用 w=16 与 w=20 两点做最小二乘式的估计（avgBase 取 2.0）
const AVG_BASE = 2.0;
const pts = rows.filter((r) => r.needForTarget && r.nNeed);
if (pts.length) {
  // need 与 (hpBonus + avgBase)/interval 成正比 → 用比例反推 k
  const ratio = pts.map((r) => {
    const interval = Math.max(0.32, 1.05 - r.w * 0.045);
    const curHp = Math.floor((r.w - 1) * ENEMY_HP_PER_WAVE);
    const curAvg = (r.nNeed * interval) - curHp;      // 由实测 need 反推平均基础血量
    const targetAvg = (r.needForTarget * interval) - AVG_BASE;
    const hpNeeded = targetAvg;                       // hpBonus + avgBase = targetAvg
    const k = hpNeeded / (r.w - 1);
    return { w: r.w, k };
  });
  console.log('\n按每个波次反推的系数 k：', ratio.map((r) => `w${r.w}:${r.k.toFixed(2)}`).join(' '));
  const ks = ratio.map((r) => r.k);
  console.log('中位数 k ≈', ks.sort((a, b) => a - b)[Math.floor(ks.length / 2)].toFixed(3));
}
