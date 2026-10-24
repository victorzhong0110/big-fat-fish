// 抽卡：局内构筑的核心决策点。
//
// 规则全部写在纯函数里：给定 rng 与已持有的装备，一定得到同一组候选。
import { RELICS, RARITIES, relicById } from './relics.js';
import { relicTags } from './counters.js';
import { relicValue } from './relicValue.js';

/** 章节越深，稀有度权重越偏向高稀有 */
const RARITY_WEIGHTS = [
  { common: 75, rare: 22, legendary: 3 },  // 第 1 章
  { common: 60, rare: 30, legendary: 10 }, // 第 2 章
  { common: 48, rare: 34, legendary: 18 }, // 第 3 章及以后
];

function weightsFor(chapter) {
  return RARITY_WEIGHTS[Math.min(RARITY_WEIGHTS.length - 1, Math.max(0, chapter - 1))];
}

/**
 * 抽 count 张互不相同的候选装备。
 * - 已持有的装备不再出现（每张只拿一次）
 * - 诅咒装备从第 3 章才开始进入牌池
 * - available 给定时，只有名单内的装备能进池（局外未解锁的不进牌池）
 * @param {() => number} rng
 * @param {{owned?:string[], count?:number, chapter?:number, banished?:string[], available?:string[]}} opts
 * @returns {Array<object>} 装备对象数组
 */
export function drawRelicOptions(rng, opts = {}) {
  const { owned = [], count = 3, chapter = 1, banished = [], available = null } = opts;
  const banned = new Set([...owned, ...banished]);
  const w = weightsFor(chapter);
  const allowCursed = chapter >= 3;
  const allow = available ? new Set(available) : null;

  const pool = RELICS.filter((r) => {
    if (banned.has(r.id)) return false;
    if (r.cursed && !allowCursed) return false;
    if (allow && !allow.has(r.id)) return false;
    return true;
  });
  if (!pool.length) return [];

  const picked = [];
  const remaining = pool.slice();
  const want = Math.max(0, Math.min(count, remaining.length));
  while (picked.length < want && remaining.length) {
    const total = remaining.reduce((sum, r) => sum + (w[r.rarity] ?? 0), 0);
    if (total <= 0) break;
    let roll = rng() * total;
    let idx = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      roll -= w[remaining[i].rarity] ?? 0;
      if (roll <= 0) { idx = i; break; }
    }
    picked.push(remaining.splice(idx, 1)[0]);
  }
  return applyCounterFloor(picked, remaining, rng);
}

/**
 * **手段保底**（第十一轮）。
 *
 * 为什么需要（第九轮的实测）：
 * 种子 1037 连续**十二波**一张"对症牌"都没抽到（有效倍率恒为 1.00）⇒
 * 它的 DPS 卡在保底火力 15~29 ⇒ 覆盖度跌破 1 ⇒ **第 7 波就死**。
 * ⇒ 「对症」虽然是决定性的机制，但**抽卡是随机的**：
 * **抽不到就是纯运气** —— 机制再强，一次坏运气就足以否掉整局。
 *
 * ⇒ 修法：**候选里至少给一张带手段的牌**（从还没抽走的牌里换一张进去）。
 * ⇒ 这不是"送牌"：玩家仍然可以在三张里挑，
 * 只是**不会整整一章都看不到任何"对症"选项**。
 *
 * ⚠️ 为什么**不**改成"必定给一张新手段牌"：
 * 那会**把构筑锁死**（玩家被迫去补手段，构筑变成填表）⇒
 * 只保证"**看得见**"，不保证"**拿得到**"。
 */
function applyCounterFloor(picked, remaining, rng) {
  if (!picked.length) return picked;
  if (picked.some((r) => relicTags(r.id).length)) return picked;
  const tagPool = remaining.filter((r) => relicTags(r.id).length);
  if (!tagPool.length) return picked;
  const idx = Math.floor(rng() * tagPool.length);
  // **换掉候选里"收益最低"的那张**（而不是随便换一张）——
  // 否则保底会顺手吃掉玩家最需要的伤害牌（实测：普通 DPS 会掉 ~17%）。
  // ⇒ 换最没用的那张 ⇒ 保底的代价降到最小。
  let worst = 0;
  let worstPct = Infinity;
  picked.forEach((r, i) => {
    const pct = relicValue(r.id, []).pct;
    if (pct < worstPct) { worstPct = pct; worst = i; }
  });
  picked[worst] = tagPool[idx];
  return picked;
}

/** 候选里有没有诅咒卡（供 UI 标注） */
export function hasCursed(options) {
  return options.some((r) => r.cursed);
}

/** 装备的稀有度标签（纯展示用） */
export function rarityLabel(relic) {
  return RARITIES[relic?.rarity]?.label || '普通';
}
