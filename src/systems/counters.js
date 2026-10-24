// 克制关系：装备提供什么手段 ↔ 敌种怕什么。
//
// ⚠️ 第九轮：**克制从"提示"变成了"乘算"**。
//
// 为什么要改（第八轮的两条实测逼出来的）：
//   ① 两种构筑的 DPS 只差 10~30% ⇒ **不存在一条需求曲线能把它们分开**；
//   ② 覆盖度在第 15 波之后还有 1.4~1.9 ⇒ **玩家从来不缺 DPS**。
// ⇒ 既然 DPS 不是瓶颈，"构筑决定生死"的钥匙就不该是"更大的数字"，
//   而该是**"对的手段"**：抽到一张对症的牌，伤害 ×1.6；不对症，×1。
// ⇒ 于是「路线（决定这一章出什么怪）× 装备（决定你有什么手段）」第一次咬合在一起：
//   选甲壳泥沼（铁壳蟹成堆）就得有爆发，选珊瑚径（旗鱼成堆）就得有减速/机动。
//
// 这一轮立的三条硬规矩：
//   ① **标签跟着数据走**：由属性表推导，不另写一份标签表
//      （改数值不改标签 ⇒ 面板上的标注就成了谎言）。
//   ② **标签要稀缺**：判据收紧之后每个手段只有 3~4 张装备能提供。
//      （旧判据里"每发伤害 +1"也算爆发 ⇒ 什么牌都是爆发 ⇒ 克制等于没有。）
//   ③ **敌种的弱点要集中**：一只怪只怕 1~2 种手段，
//      否则"对症"退化成"多半能中一点"。
//
// ⚠️ 纯逻辑：不 import Phaser、不碰 DOM，可单测。
import { applyRelics } from './relics.js';
import { enemyBase } from './enemies.js';

/** 手段标签 → 人话 */
export const COUNTER_TAGS = {
  slow: '减速',
  burst: '爆发',
  area: '范围',
  mobility: '机动',
};

/**
 * 对症倍率：打"怕这个手段"的怪时，伤害 ×这个数。
 *
 * 为什么是 2.0（第九轮实测定的）：
 * 手段之间"这一章能命中多少血量"的差距实测是 **20~50 个百分点**
 * （范围 69~73% / 机动 52~61% / 爆发 32~40% / 减速 22~40%），
 * 倍率 1.6 只能把这段差距放大成 ~13~30% 的有效 DPS 差，
 * 2.0 才放大成 **25~50%** —— 那才是能翻盘的数量级。
 *
 * ⚠️ 这条会改写第八轮那把尺子：覆盖度现在要把倍率算进去
 * （见 systems/pressure.js 的 waveCounterMult / chapterCounterMult）。
 */
export const COUNTER_MULT = 2.5;

/**
 * 克制倍率曲线的指数（第九轮）。
 *
 * 线性曲线（指数 1）下，"凑齐四种手段"与"随手拿两张"的最终倍率只差 20.4%
 * ⇒ 浏览器实测里两种策略都能通关 ⇒ 机制等于没生效。
 * ⇒ 指数 1.5 把差距拉到 **38%**，同时**单张对症牌仍有 23% 的提升**
 * （玩家拿一张牌立刻感觉得到，不会觉得"这张没用"）。
 */
export const COUNTER_CURVE_EXP = 2.0;

/**
 * 敌种 → 它怕什么（手段标签）。
 *
 * 集中化的理由（第九轮）：一只怪只该怕 1~2 种手段。
 * 以前每种怪都怕 2~3 种，"对症"就退化成"多半能中一点" ⇒ 什么构筑都半对症。
 *
 * ⚠️ **最关键的一条：四种手段的"命中集合"要尽量不重叠**（第九轮实测逼出来的）。
 *
 * 为什么（这是这一轮最贵的教训）：
 * 弱点分配听起来只要"语义上说得通"就行，**实际上它决定了这个机制成不成立**。
 * 第一版按语义分（贪嘴小鱼吃范围、沙丁鱼群吃范围、海葵吃范围/爆发…），
 * 结果「范围」一只手段就命中本章 **71% 的血量** ⇒
 * 拿到一张对症牌 ≈ 吃满倍率 ⇒ "凑齐手段"没有价值
 * ⇒ 实测（离线对照 3000 局，同一串随机数）：
 *     按稀有度挑 1.842 倍 vs 按对症挑 1.986 倍 —— **只差 7.8%**。
 *
 * 改成**互不重叠**的分配（下面这张表）：
 *   围上来的（贪嘴小鱼）/ 远程的（孢子、墨鱼）怕 **机动**
 *   成群的（沙丁鱼群、海葵、蟹壳碎屑）怕 **范围**
 *   飘的与冲的（毒水母、旗鱼）怕 **减速**
 *   硬的（铁壳蟹、Boss）怕 **爆发**
 * ⇒ 单一手段的命中率降到 **8% ~ 61%**，但**四种凑齐能覆盖九成血量**
 * ⇒ 同样的对照实验：**1.588 倍 vs 1.912 倍 —— 差 20.4%**（从 7.8% 翻到 20.4%）。
 *
 * ⚠️ 注意「机动」一家独大（48~61%）：贪嘴小鱼占一半的数量，
 * 而它是唯一吃机动的 ⇒ 这是结构决定的，改不掉（改掉要动怪种构成，代价太大）。
 * 好在**互不重叠**已经让"只拿到机动"远不如"四种凑齐"。
 */
export const ENEMY_COUNTERS = {
  crawler: ['mobility'],
  spore: ['mobility'],
  swarm: ['area'],
  bud: ['area'],
  moth: ['slow'],
  charger: ['slow'],
  husk: ['burst'],
  huskling: ['area', 'slow'],
  weaver: ['mobility'],
  boss: ['burst'],
};

/**
 * 从属性表推导"这套构筑提供哪些手段"。
 *
 * 为什么从 stats 推导，而不是从 relic id 推导：
 *   ① **深化**会让同一张牌变强（第二层起给标签专属加成）；
 *   ② **角色起始装备**也会给手段 —— 它不在"玩家抽到的牌"里。
 * ⇒ 只有一个入口（属性表）能保证"面板上写的手段 = 实际生效的手段"。
 *
 * 判据（第九轮收紧过一轮，收紧的理由见文件头规矩②）：
 *   爆发 = **单点输出真的上去了**，不是"每发伤害 +1"这种平铺。
 *   范围 = 一次能覆盖多个目标（爆裂 / 穿透 / 弹道分散）。
 */
export function tagsFromStats(s = {}) {
  const tags = [];
  if ((s.slowOnHit ?? 0) >= 0.2) tags.push('slow');
  if ((s.explodeDamage ?? 0) > 0 || (s.pierce ?? 0) >= 1 || (s.spreadAddDeg ?? 0) >= 5) tags.push('area');
  if ((s.critChance ?? 0) >= 0.15
    || (s.critMultAdd ?? 0) >= 0.5
    || (s.bulletsAdd ?? 0) >= 2
    || (s.damageMul ?? 1) >= 1.2
    || (s.comboDamagePerStack ?? 0) >= 1
    || (s.killDamagePerKill ?? 0) >= 1) tags.push('burst');
  // 「机动」用**加法标记**判定，不看最终的乘算结果 ——
  // 否则「迁徙根 +7%」会被「凋零之种 -18%」抹掉，
  // 连带把玩家手里那张牌的**手段**也抹掉（实测踩到过：种子 1037）。
  if ((s.moveSpeedBonus ?? 0) >= 5 || (s.dashCooldownMul ?? 1) <= 0.95) tags.push('mobility');
  return tags;
}

/**
 * 这张装备提供哪些手段（由属性表推导，不另写一份标签表 ——
// **标签必须跟着数据走**，否则改数值不改标签，标注就变成谎言）。
 */
export function relicTags(id) {
  return tagsFromStats(applyRelics([id]));
}

/**
 * 一组装备提供的手段（并集）。
 *
 * ⚠️ 这里用的是"每张牌单独算再取并集"，不是"把整副牌合成一张再算"——
 * 后者会因为乘算合并（两个 0.9 变成 0.81）而误判。
 * 真正的"这套构筑的手段"用 tagsFromStats(applyBuild(...))，见 characters.js。
 */
export function relicTagsOf(ids = []) {
  const set = new Set();
  for (const id of ids) for (const t of relicTags(id)) set.add(t);
  return [...set];
}

/**
 * 这套手段打这个敌种，伤害 ×几。
 * @param {string} enemyType 敌种 id
 * @param {string[]} tags 玩家提供的手段
 */
export function counterMult(enemyType, tags = []) {
  if (!tags || !tags.length) return 1;
  const weak = ENEMY_COUNTERS[enemyType] || [];
  return weak.some((t) => tags.includes(t)) ? COUNTER_MULT : 1;
}

/**
 * 这张装备在"这些怪"面前对不对症。
 * @param {string} relicId
 * @param {string[]} enemyIds 本章会出现的敌种 id
 * @returns {{tags:string[], hit:string[]}} 提供的手段 / 实际对得上的怪
 */
export function countersFor(relicId, enemyIds = []) {
  const tags = relicTags(relicId);
  const hit = enemyIds.filter((id) => (ENEMY_COUNTERS[id] || []).some((t) => tags.includes(t)));
  return { tags, hit };
}

/** 面板上的一句话："对症：机动 → 旗鱼、墨鱼（伤害 ×1.6）" */
export function counterNote(relicId, enemyIds = []) {
  const { tags, hit } = countersFor(relicId, enemyIds);
  if (!tags.length || !hit.length) return '';
  const names = hit.map((id) => enemyBase(id).name || id);
  return `对症：${tags.map((t) => COUNTER_TAGS[t]).join(' / ')} → ${names.join('、')}（伤害 ×${COUNTER_MULT}）`;
}
