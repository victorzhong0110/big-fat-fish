// 装备的"价值"：把一张候选牌翻译成**玩家能比较的数字**。
//
// 为什么需要它（第十轮）：
// 第九轮的实测把一个老问题摆到了台面上 ——
// **"按稀有度挑"的机器人抽到的全是「看起来是增益、实际不增伤」的牌**：
//   蜜腺（普通）每 10 杀回 1 血 ／ 连击花环（稀有）连击窗口 +1.2 秒 ／
//   疾影（稀有）冲刺冷却 -25% ／ 轻气鳔（普通）射速 -10%
// ⇒ 它的 DPS 卡在保底线 **15~29**（而会构筑的那档是 110~138）⇒
//   覆盖度掉到 0.62 ⇒ **第 7~12 波就死**。
//
// ⇒ 也就是说：**稀有度和描述会把人骗到"防御/便利牌"上**，而伤害才是命。
// ⇒ 面板必须写清「**这张牌给你的伤害带来什么**」——
// 玩家有这张信息，机器人（只看稀有度）没有 ⇒ 这正是我们要的差距。
//
// ⚠️ 纯逻辑：不 import Phaser、不碰 DOM，可单测。
// （`scripts/bot.mjs` 的选牌评分也读这里 —— **同一份实现**，不写第二遍。）
import { relicById, applyRelics, deriveFireStats } from './relics.js';
import { expectedDps } from './upgrades.js';
import { relicTags } from './counters.js';

/** 评估用的基准火力等级（Lv.5 = 一局后期的水平，用来算百分比） */
const BASE_FIRE_LEVEL = 5;

/** Lv.5 口径下的 DPS */
function dpsOfStats(stats) {
  return expectedDps(deriveFireStats(BASE_FIRE_LEVEL, stats));
}

/**
 * 一张装备改了哪些属性（用于识别"转化型"）。
 * @param {string} id
 */
export function relicDelta(id) {
  const base = applyRelics([]);
  const after = applyRelics([id]);
  const d = {};
  for (const k of Object.keys(base)) if (after[k] !== base[k]) d[k] = after[k] - base[k];
  return d;
}

/**
 * 转化型装备的**潜在** DPS 收益（它们的收益不在属性表里，是运行时算的）。
 *
 * 为什么要估：只看属性表会把「连击熔炉」「汲能之根」判成废物（实测 DPS 收益 = 0），
 * 而它们在实战里是三张最强的牌之一。
 */
export function transformDpsGain(id, owned) {
  const d = relicDelta(id);
  const fire = deriveFireStats(BASE_FIRE_LEVEL, applyRelics(owned));
  const perShot = fire.bullets / (fire.cooldownMs / 1000);
  const dps = expectedDps(fire);
  let gain = 0;
  if (d.comboDamagePerStack) {
    const stacks = owned.reduce((a, x) => a + (relicDelta(x).comboDamagePerStack || 0), 0) + d.comboDamagePerStack;
    // **3 层**（不是上限 6 层）：实战里连击很难叠满，
    // 按 6 层算会让面板把「连击熔炉」写成 +120% ⇒ **理论值当保证**。
    // ⇒ 取保守值，并在文案里标"满层估计"。
    gain += stacks * 3 * perShot;
  }
  if (d.killDamagePerKill) {
    gain += d.killDamagePerKill * 6 * perShot; // 6 个击杀（不是上限 12）
  }
  if (d.lowHpDamageMul) gain += dps * d.lowHpDamageMul; // 压血线时的乘区
  return gain;
}

/**
 * 一张候选牌带来的**等效 DPS 变化**（Lv.5 口径的绝对值 + 百分比）。
 * @param {string} id
 * @param {string[]} owned 已有装备
 * @returns {{dps:number, pct:number}}
 */
export function dpsGainOf(id, owned = []) {
  const base = dpsOfStats(applyRelics(owned));
  const next = dpsOfStats(applyRelics([...owned, id]));
  const dps = (next - base) + transformDpsGain(id, owned);
  return { dps, pct: base > 0 ? dps / base : 0 };
}

/**
 * 面板上写给玩家看的一句话。
 * @param {string} id 候选装备 id
 * @param {string[]} owned 已有装备
 * @param {{tags?:string[]}} ctx 当前已有的手段（用于说"这一张补上了什么"）
 * @returns {{text:string, pct:number, tags:string[], gainTags:string[]}}
 */
export function relicValue(id, owned = [], ctx = {}) {
  const r = relicById(id);
  const { dps, pct } = dpsGainOf(id, owned);
  const tags = relicTags(id);
  const mine = ctx.tags || [];
  const gainTags = tags.filter((t) => !mine.includes(t));
  const pctText = Math.round(pct * 100);
  // 转化型（连击熔炉 / 汲能之根 / 背水）的收益是**上限估计**
  // —— 它们的真实收益取决于"连击能不能叠满"，面板必须说清楚，
  // 否则玩家会拿一个理论值当保证（这条与「印出来的数字必须有机制」同源）。
  const estimate = Math.abs(transformDpsGain(id, owned)) > 0.001;
  let text;
  if (pct > 0) text = `伤害 +${pctText}%`;
  else if (pct < 0) text = `伤害 ${pctText}%`;
  else text = '不提高伤害';
  if (estimate) text += '（满层估计）';

  // ⚠️ **条件性收益不能被写成"不提高伤害"**（第十一轮修的）。
  // 「致命芬芳」给的是**暴击伤害**，在没有暴击率的时候它的期望收益确实是 0 ——
  // 但它不是"没用"，而是"**要配暴击率**"。
  // ⇒ 写成「不提高伤害」等于**面板在冤枉一张好牌**（玩家会以为它坏了）。
  const base = applyRelics(owned);
  const ownCritMult = applyRelics([id]).critMultAdd ?? 0;
  if (pct === 0 && ownCritMult > 0 && (base.critChance ?? 0) < 0.15) {
    text = `暴击伤害 +${Math.round(ownCritMult * 100)}%（要配暴击率）`;
  }
  return { id, name: r?.name || id, dps, pct, tags, gainTags, text, estimate };
}
