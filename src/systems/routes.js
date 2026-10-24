// 章内路线：每章开头二选一，决定"这一章长什么样"。
//
// 为什么要有它（第六轮）：
// 前五轮把构筑做深了（装备 / 转化型 / 流派 / 深化 / 异象 / 异变体战利品），
// 但**一局仍然是��条直线**：4 章 × 5 波，章节主题是抽出来的，玩家只能接受。
// 真正的肉鸽里，每一章都要玩家自己选：
// **这一章我愿意冒多大的险，换多少收益。**
//
// 路线与主题的分工：
//   主题 = 这一章的"地貌"（种子决定，玩家只能接受）
//   路线 = 这一章的"走法"（玩家二选一）—— 先选战场，再抽卡备战
//
// ⚠️ 与 DECISIONS §5.1 的关系：§5.1 推翻的是**节点地图**
//（"加一层节点地图会让核心玩法退化成点节点"）。
// 路线**不是节点地图**：它不增加任何"点节点"的步骤，只在章首多一次二选一，
// 核心玩法（一遍跑一边打）完全不受影响。§5.1 的理由不适用，但"分支由抽卡承担"
// 那句结论要在这里被部分修正：**分支由抽卡 + 路线共同承担**。
//
// 纯逻辑：不 import Phaser、不碰 DOM，全部可单测。
import { NEUTRAL_MODS } from './themes.js';

/**
 * 路线表。
 *
 * 每条路线都是一笔**交换**：给你一样东西（收益），拿走另一样东西（风险）。
 * 没有"纯赚"的路线 —— 否则玩家永远选它，决策就退化成点击。
 *
 * 🔴 **为什么收益是"潮水"而不是"掉落"**（第六轮实测后改的）：
 * 最初写的是"掉落 ×1.35 / 1.6"，实测**把 good 机器人从 0/3 通关变成了 2/2 通关**。
 * 原因：**火力等级是指数级的**（Lv.2 = 7 DPS → Lv.5 = 107 DPS，差 15 倍），
 * 而掉落的"磨砺石"直接加火力等级 ⇒ "掉落更多"这条奖励**偷偷把主成长轴推快了**，
 * 等于白送一整级火力。
 * ⇒ 收益改成**潮水**（局内的"备战"货币：重随 / 放逐 / 深化），
 * 它能让构筑变好，但**不会跳过火力等级**。
 * 这是本轮最有价值的实测结论（见 DECISIONS §17.8）。
 *
 * risk / reward 是**设计出来的综合数**，不是机械乘积：
 * 例如「甲壳泥沼」敌人数量其实少了，但铁壳蟹会结壳免伤 ⇒ 真实威胁高于数量乘积。
 * 这两个数是机器人策略与面板文案共用的口径（见 routeRisk / routeReward）。
 */
export const ROUTES = [
  {
    id: 'dense_grove', name: '藻林', threat: 1.15, reward: 1.25,
    riskText: '敌人多三成，走位空间被挤掉',
    rewardText: '潮水更多（能多重随、多深化）',
    mods: { enemyCountMul: 1.3, dewMul: 1.5 },
  },
  {
    id: 'stone_field', name: '礁石区', threat: 1.2, reward: 1.2,
    riskText: '敌人更硬更少，爆发不够就拖住',
    rewardText: '分数更高',
    mods: { enemyHpMul: 1.35, enemyCountMul: 0.85, scoreMul: 1.4 },
  },
  {
    id: 'thorn_path', name: '珊瑚径', threat: 1.3, reward: 1.2,
    riskText: '旗鱼成群冲刺，走位吃紧',
    rewardText: '分数更高',
    mods: { typeBias: { charger: 3 }, enemySpeedMul: 1.1, scoreMul: 1.35 },
  },
  {
    id: 'spore_hollow', name: '水母穴', threat: 1.1, reward: 1.25,
    riskText: '水母远程压制，不能一直贴脸',
    rewardText: '潮水更多（能多重随、多深化）',
    mods: { typeBias: { spore: 3 }, enemyHpMul: 0.9, dewMul: 1.4 },
  },
  {
    id: 'husk_marsh', name: '甲壳泥沼', threat: 1.35, reward: 1.25,
    riskText: '铁壳蟹结壳免伤，低爆发会被拖住',
    rewardText: '分数更高',
    mods: { typeBias: { husk: 3 }, enemyCountMul: 0.9, scoreMul: 1.45 },
  },
  {
    id: 'green_house', name: '暖流湾', threat: 0.85, reward: 1.3,
    riskText: '敌人更少更慢，但也赚不到分',
    rewardText: '潮水最多（这一章几乎不用怕）',
    mods: { enemyCountMul: 0.85, enemySpeedMul: 0.9, dewMul: 1.6, scoreMul: 0.9 },
  },
];

export const ROUTE_BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

export function routeById(id) {
  return ROUTE_BY_ID[id] || null;
}

/** 路线 → 完整 mods（缺省项补齐，与主题同一套字段） */
export function routeMods(route) {
  return { ...NEUTRAL_MODS, ...(route?.mods || {}) };
}

/** 路线 → 综合威胁（越大越难） */
export function routeRisk(route) {
  return route?.threat ?? 1;
}

/** 路线 → 综合收益（越大越赚） */
export function routeReward(route) {
  return route?.reward ?? 1;
}

/**
 * 一条路线在某一章能不能用：**它偏置的敌种必须真的会在这一章出现**。
 *
 * 为什么要有这条过滤：敌种是**按波解锁**的（铁壳蟹第 9 波才出现），
 * 而路线偏置只作用于"已经在名册里"的敌种。
 * 如果在第一章给玩家「甲壳泥沼」这条路线，铁壳蟹一只都不会出现 ——
 * **面板上写着"铁壳蟹成群"，实际什么都没发生**：那是在骗玩家。
 *
 * ⇒ 不满足条件的路线**这一章不出现**。
 * （代价：第一章的候选池从 6 条缩到 4 条 —— 这是"每条路线都兑现承诺"的代价，值得。）
 */
export function routeAvailableIn(route, typeIds) {
  const bias = route?.mods?.typeBias || {};
  const keys = Object.keys(bias);
  if (!keys.length) return true;
  const set = new Set(typeIds || []);
  return keys.every((id) => set.has(id));
}

/**
 * 抽这一章的候选路线（2 条，互不相同，且这一章用得上）。
 * 用调用方给的 rng ⇒ 同一 seed 必得同一组候选。
 * @param {() => number} rng
 * @param {number} count 候选条数
 * @param {string[]} [typeIds] 这一章会出现的敌种（过滤用）
 */
export function pickRouteOptions(rng, count = 2, typeIds = null) {
  const pool = ROUTES.filter((r) => routeAvailableIn(r, typeIds));
  const usable = pool.length >= count ? pool : ROUTES.slice();
  const out = [];
  for (let i = 0; i < Math.min(count, usable.length); i++) {
    const idx = Math.floor(rng() * usable.length) % usable.length;
    out.push(usable.splice(idx, 1)[0].id);
  }
  return out;
}

/**
 * 主题与路线的叠加上限。
 *
 * 为什么必须有上限：主题 ×1.35（硬壳）再叠路线 ×1.35（石圃）= ×1.82，
 * 而需求是**线性**乘在血量上的 —— 那一章会突然比前后章难一大截，
 * 玩家带着上一章的构筑进章就被抬走。
 * 第四轮就定过"难度平滑爬升不出尖峰"，这一轮把它扩展到路线层。
 */
export const MOD_CAPS = {
  enemyHpMul: 1.7,
  enemyCountMul: 1.6,
  enemySpeedMul: 1.5,
  bossHpMul: 1.6,
  typeBias: 9,       // 单个敌种的偏置上限
};

/**
 * 主题 mods + 路线 mods → 这一章真正生效的 mods（含上限）。
 *
 * 规则：
 * - 倍率类：相乘，然后按上限截断；
 * - typeBias：相乘（主题偏置 × 路线偏置），再截断；
 * - hazardEverySec：取**较短**的间隔（炸弹更多 = 更难），不是相乘。
 */
export function mergeChapterMods(theme, route) {
  const t = theme || {};
  const r = route || {};
  const out = { ...NEUTRAL_MODS, ...t };
  for (const k of ['enemyHpMul', 'enemySpeedMul', 'enemyCountMul', 'bossHpMul', 'scoreMul', 'dropMul', 'dewMul']) {
    out[k] = (t[k] ?? 1) * (r[k] ?? 1);
  }
  const bias = { ...(t.typeBias || {}) };
  for (const [id, w] of Object.entries(r.typeBias || {})) {
    bias[id] = Math.min(MOD_CAPS.typeBias, (bias[id] ?? 1) * w);
  }
  out.typeBias = bias;
  // 深海炸弹是"周期"不是"倍率"：取间隔更短的那个（更多 = 更难）
  const th = t.hazardEverySec ?? 0;
  const rh = r.hazardEverySec ?? 0;
  out.hazardEverySec = th && rh ? Math.min(th, rh) : Math.max(th, rh);
  for (const [k, cap] of Object.entries(MOD_CAPS)) {
    if (k === 'typeBias') continue;
    if (typeof out[k] === 'number' && out[k] > cap) out[k] = cap;
  }
  return out;
}

/** 面板上的一句话：这条路线拿什么、换什么 */
export function routeSummary(route) {
  if (!route) return '';
  return `${route.name} · ${route.riskText}；${route.rewardText}`;
}
