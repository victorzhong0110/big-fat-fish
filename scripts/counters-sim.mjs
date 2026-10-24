// 对症机制的**离线对照实验**（第九轮）：
// 同一个牌池、同一串随机数，"按稀有度挑"与"按对症挑"最后差多少？
//
// 为什么要有这个脚本：
// 浏览器测量一局要 8~9 分钟，而这里要回答的问题是
// "**同样的运气下，两种选牌策略的有效倍率差多少**"——
// 那是一个**纯组合**问题，不需要跑游戏。
//
// 用法：node scripts/counters-sim.mjs [局数] [种子]
import { RELICS, relicById, applyRelics, deriveFireStats } from '../src/systems/relics.js';
import { chapterCounterBreakdown, chapterCounterMult } from '../src/systems/pressure.js';
import { relicTagsOf } from '../src/systems/counters.js';
import { drawRelicOptions } from '../src/systems/draft.js';

const RUNS = Number(process.argv[2] || 2000);
const SEED0 = Number(process.argv[3] || 12345);

/**
 * 抽一次三选一。
 *
 * ⚠️ 第十一轮修正：**这里必须用游戏真正的抽卡逻辑**（`systems/draft.js` 的
 * `drawRelicOptions`），不能自己写一份 ——
 * 之前这里自己抽 ⇒ **「手段保底」这种改动它完全测不到** ⇒
 * 离线对照会给出"没变化"的假结论。
 * ⇒ 凡是**对照实验**，它的抽卡必须与被测对象走同一条路。
 */
function draw(rng, owned, banished, chapter) {
  const opts = drawRelicOptions(rng, { owned, count: 3, chapter, banished });
  return opts.map((r) => r.id);
}

/** 确定性随机 */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RARITY_W = { common: 60, rare: 30, legendary: 10 };

/** good 的判据：按稀有度挑（传奇 > 稀有 > 普通，诅咒 -0.3） */
function pickGood(ids) {
  let best = -Infinity;
  let idx = 0;
  ids.forEach((id, i) => {
    const r = relicById(id);
    const w = RARITY_W[r.rarity] === undefined ? 0 : (r.rarity === 'legendary' ? 2 : r.rarity === 'rare' ? 1 : 0);
    const s = w - (r.cursed ? 0.3 : 0);
    if (s > best) { best = s; idx = i; }
  });
  return ids[idx];
}

/** smart 的判据：按**边际对症倍率**挑（这一章的怪 + 你已有的手段） */
function pickSmart(ids, owned, chapter) {
  let best = -Infinity;
  let idx = 0;
  const before = chapterCounterMult(chapter, 1000, {}, relicTagsOf(owned));
  ids.forEach((id, i) => {
    const after = chapterCounterMult(chapter, 1000, {}, relicTagsOf([...owned, id]));
    let s = after - before;
    const r = relicById(id);
    // 稀有度只当平局时的加分（真人也会偏好稀有的）
    s += (r.rarity === 'legendary' ? 0.02 : r.rarity === 'rare' ? 0.01 : 0);
    if (s > best) { best = s; idx = i; }
  });
  return ids[idx];
}

const stats = { good: [], smart: [] };
const dpsStats = { good: [], smart: [] };
const tagCount = { good: [], smart: [] };
for (let n = 0; n < RUNS; n++) {
  const rng = makeRng(SEED0 + n * 7919);
  for (const strat of ['good', 'smart']) {
    const owned = [];
    for (let chapter = 1; chapter <= 4; chapter++) {
      for (let k = 0; k < 2; k++) {           // 每章两次挑选（章首 + 异变体战利品）
        const ids = draw(rng, owned, [], chapter);
        if (!ids.length) break;
        const pick = strat === 'good' ? pickGood(ids) : pickSmart(ids, owned, chapter);
        owned.push(pick);
      }
    }
    const tags = relicTagsOf(owned);
    tagCount[strat].push(tags.length);
    // 最终倍率：按**第四章**的口径算（构筑定型后）
    stats[strat].push(chapterCounterMult(4, 1000, {}, tags));
    // 普通 DPS（Lv.5 口径）："对症"不该是"强"的替代品 ——
    // 如果手段牌不带 DPS，smart 为了对症就得放弃伤害牌 ⇒ 有效 DPS 反而不占优。
    const fire = deriveFireStats(5, applyRelics(owned));
    dpsStats[strat].push((fire.damage * fire.bullets) / (fire.cooldownMs / 1000));
  }
}

const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(3);
console.log(`局数 ${RUNS}（同一串随机数，两种策略各跑一遍）`);
console.log('策略   | 最终倍率(第四章口径) | 平均手段数 | 有手段的局');
for (const strat of ['good', 'smart']) {
  const withTag = tagCount[strat].filter((t) => t > 0).length;
  console.log(`${strat.padEnd(6)} | ${avg(stats[strat]).padStart(18)} | ${avg(tagCount[strat]).padStart(10)} | `
    + `${String(Math.round((withTag / RUNS) * 100)).padStart(8)}%`);
}
const d = (avg(stats.smart) - avg(stats.good)) / avg(stats.good);
console.log(`\nsmart 比 good 高 ${(d * 100).toFixed(1)}% 的有效倍率`);
console.log('普通 DPS：good', avg(dpsStats.good), ' smart', avg(dpsStats.smart));
console.log('有效 DPS：good', (avg(dpsStats.good) * avg(stats.good)).toFixed(1),
  ' smart', (avg(dpsStats.smart) * avg(stats.smart)).toFixed(1),
  ` ⇒ smart 高 ${(((avg(dpsStats.smart) * avg(stats.smart)) / (avg(dpsStats.good) * avg(stats.good)) - 1) * 100).toFixed(1)}%`);
console.log('\n各章的单独倍率（无手段 → 只带一种手段）：');
for (let ch = 1; ch <= 4; ch++) {
  const bd = chapterCounterBreakdown(ch, 1000, {});
  console.log(`  第${ch}章`, Object.entries(bd).map(([k, v]) => `${k}=${Math.round(v * 100)}%`).join(' '));
}
