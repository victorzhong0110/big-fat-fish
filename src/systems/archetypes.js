// 流派：按标签凑数的协同奖励。
//
// 为什么需要它：34 张装备各自都是独立的加法，**"我要建什么"没有答案** ——
// 拿两张伤害牌和拿一张伤害牌加一张护盾牌，区别只是数字分布。
// 流派把"同标签凑够数量"变成一条明规则：
// **玩家开始为"凑流派"而选牌，选牌从"这张强不强"变成"我要不要这个流派"。**
//
// 这也是 roguelike 的经典张力：**为了流派可能要拿一张自己并不需要的牌**
// （Slay the Spire 的"牌组稀释"）—— 但反过来也成立：
// 一套成型流派的收益（下面的加成）往往大于单张的边际收益。
//
// 纯逻辑：加成用声明式的 add / mul 描述，套用规则写在 `applyArchetypes`。
import { relicById } from './relics.js';

/**
 * 流派表。
 * every = 每几张同标签装备算一档；每档给一次 add/mul。
 */
export const ARCHETYPES = [
  {
    id: 'edge',
    name: '锋锐',
    tag: '攻击',
    every: 3,
    add: { damageAdd: 1 },
    desc: '每 3 件攻击装备，每发伤害 +1',
  },
  {
    id: 'bulwark',
    name: '坚韧',
    tag: '生存',
    every: 2,
    add: { maxHpAdd: 1 },
    desc: '每 2 件生存装备，最大生命 +1',
  },
  {
    id: 'fleet',
    name: '疾行',
    tag: '机动',
    every: 2,
    mul: { moveSpeedMul: 1.05 },
    desc: '每 2 件机动装备，移动速度 +5%',
  },
  {
    id: 'law',
    name: '法则',
    tag: '规则',
    every: 2,
    mul: { scoreMul: 1.08 },
    desc: '每 2 件规则装备，得分 +8%',
  },
];

/** 按标签统计装备数量（只数真实存在的装备） */
export function countByTag(relicIds = []) {
  const counts = {};
  for (const id of relicIds) {
    const r = relicById(id);
    if (!r) continue;
    counts[r.tag] = (counts[r.tag] || 0) + 1;
  }
  return counts;
}

/**
 * 当前生效的流派（纯查询，不改任何东西）。
 * @returns {Array<{id,name,tag,count,tiers,desc}>}
 */
export function activeArchetypes(relicIds = []) {
  const counts = countByTag(relicIds);
  const out = [];
  for (const a of ARCHETYPES) {
    const count = counts[a.tag] || 0;
    const tiers = Math.floor(count / a.every);
    if (tiers <= 0) continue;
    // 带上完整的流派定义（含 add/mul），这样套用时不用再查一次表
    out.push({ ...a, count, tiers });
  }
  return out;
}

/**
 * 把流派加成写进属性表（原地修改）。
 * 加成按档数重复套用：add 字段做加法，mul 字段做乘法。
 */
export function applyArchetypes(stats, relicIds = []) {
  for (const a of activeArchetypes(relicIds)) {
    const tiers = a.tiers;
    for (let i = 0; i < tiers; i++) {
      for (const [k, v] of Object.entries(a.add || {})) {
        stats[k] = (stats[k] ?? 0) + v;
      }
      for (const [k, v] of Object.entries(a.mul || {})) {
        stats[k] = (stats[k] ?? 1) * v;
      }
    }
  }
  return stats;
}
