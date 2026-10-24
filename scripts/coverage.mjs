// 覆盖度轨迹分析：读平衡报告，把"你的 DPS ÷ 这一波需求"画成一条可比的曲线。
//
// 为什么要有这个脚本：平衡报告是 JSON，人看 JSON 里的 timeline 很难比出形状。
// 而这一轮要回答的核心问题是"**构筑变强之后，掉队点有没有往后挪**" ——
// 那需要把两版报告的曲线并排看。
//
// 用法：node scripts/coverage.mjs [报告文件...]（默认读 shots/ 下最新的三份）
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = new URL('../shots/', import.meta.url).pathname;

function load(file) {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  return j;
}

/** 一局里的覆盖度曲线 */
function curve(run) {
  return (run.timeline || [])
    .filter((t) => t.coverage !== null && t.coverage !== undefined)
    .map((t) => `w${t.wave}:${t.coverage}`);
}

/** 掉队点：覆盖度第一次跌破 1 的波次 */
function dropWave(run) {
  const t = (run.timeline || []).find((x) => x.coverage !== null && x.coverage < 1);
  return t ? t.wave : null;
}

const files = process.argv.slice(2);
let list = files;
if (!list.length) {
  list = readdirSync(SHOTS)
    .filter((f) => f.startsWith('balance-report') && f.endsWith('.json'))
    .map((f) => join(SHOTS, f))
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
    .slice(-3);
}

for (const f of list) {
  const j = load(f);
  const name = f.split('/').pop();
  console.log(`\n═══ ${name} · skill=${j.summary.skill} · bot=${JSON.stringify(j.summary.bot || {})}`);
  console.log(`    通关 ${j.summary.victories}/${j.summary.runs} · 平均波次 ${j.summary.avgWave} · `
    + `掉队点 ${JSON.stringify(j.summary.dropWave)} · 卡面板 ${JSON.stringify(j.summary.stuckRuns || [])}`);
  if (j.summary.deathCauses) console.log(`    死因 ${JSON.stringify(j.summary.deathCauses)}`);
  for (const r of j.runs) {
    console.log(`  ── seed ${r.seed} ${r.runState} 第 ${r.wave} 波 · 血量 ${r.hp}/${r.maxHp} · `
      + `遗物 ${(r.relics || []).length} 件 · 掉队点 ${dropWave(r)}`);
    console.log(`     ${curve(r).join(' ')}`);
  }
}
