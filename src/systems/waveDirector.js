// 波次编排：决定每波出什么怪、什么时候出、属性怎么成长
//
// mods（敌人修正量）由章节主题提供：编排只认 mods，不认主题名，
// 这样加一个主题不需要动这里的逻辑。
import { randInt } from './rng.js';
import {
  waveRoster, eliteForWave,
} from './enemies.js';

export const BOSS_EVERY = 5;

// 每 5 波一个章节，名字按海域取
const CHAPTERS = [
  '浅滩', '珊瑚雨', '涌浪', '春潮', '清水带', '藻雨',
  '暖流', '满潮', '洄游', '正午光', '温层', '灼热层',
  '下潜', '暗流', '白雾', '平潮', '冷水', '霜降层',
];

// 18 个海域用完之后（无尽模式第 19 章）改用远洋/深渊这些地名。
// 没有这一步，无尽模式跑到第 19 章就会开始循环同一批名字。
const HOU = [
  '远洋', '深渊', '热泉', '冰盖', '黑烟囱', '白化',
  '珊瑚海', '幽灵水母', '毒雾带', '沉船带', '无光带', '磷光带',
  '巨藻林', '深沟', '暗礁', '鲸落', '盐沼', '极夜',
];

const ALL_CHAPTERS = [...CHAPTERS, ...HOU];

/** 第 wave 波所属章节 */
export function chapterOf(wave) {
  const w = Math.max(1, Math.floor(wave));
  const index = Math.floor((w - 1) / BOSS_EVERY);
  return {
    index: index + 1,
    name: ALL_CHAPTERS[index % ALL_CHAPTERS.length],
    isBoss: w % BOSS_EVERY === 0,
  };
}

/** 造一个可复现的随机器（同一 seed + salt 必得同一序列） */
function makeRng(seed, salt) {
  let a = (seed * 9301 + salt * 49297) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 基础权重：贪嘴小鱼是主力，其余敌种各占一份。
 *
 * 为什么用"份额 + 抖动"而不是纯随机抽取（第五轮改）：
 * 纯随机抽的话，每一波的怪种组合会大幅抖动 —— 而**难度指标必须能读**。
 * 覆盖度（你的 DPS ÷ 这一波需求）只有在需求曲线平滑时才能当尺子用；
 * 随机组合会让需求在相邻波之间跳 15%，尺子就废了。
 *
 * 所以：**份额是确定的**（贪嘴小鱼占一半，其余均分），只有 ±1 只的抖动是随机的。
 * 抖动用 seed 决定 ⇒ 同一 wave + seed 必得同一结果，仍然可复盘。
 */
const BASE_SHARE = {
  crawler: 0.5,   // 主力
  others: 0.5,    // 其余敌种均分这另一半
};

/**
 * 组成这一波的怪种数量表。
 * @param {string[]} roster 这一波解锁的敌种
 * @param {number} count 总数量
 * @param {object} bias 主题偏置（乘在份额上）
 * @param {() => number} rng
 */
function composeWave(roster, count, bias, rng) {
  const others = roster.filter((id) => id !== 'crawler');
  const raw = {};
  let sum = 0;
  for (const id of roster) {
    const share = id === 'crawler'
      ? (others.length ? BASE_SHARE.crawler : 1)
      : (others.length ? BASE_SHARE.others / others.length : 0);
    const w = share * (bias?.[id] ?? 1);
    raw[id] = w;
    sum += w;
  }
  const counts = {};
  let assigned = 0;
  for (const id of roster) {
    const n = Math.floor((raw[id] / (sum || 1)) * count);
    counts[id] = n;
    assigned += n;
  }
  // 余数按份额最大的依次补（保证总数 = count）
  const order = roster.slice().sort((a, b) => (raw[b] / (sum || 1)) - (raw[a] / (sum || 1)));
  let i = 0;
  while (assigned < count && order.length) {
    counts[order[i % order.length]] += 1;
    assigned += 1;
    i += 1;
  }
  // 抖动：每种非贪嘴小鱼类型有 40% 概率 +1（从贪嘴小鱼那里挪）
  let crawler = counts.crawler ?? 0;
  for (const id of others) {
    if (crawler > 1 && rng() < 0.4) {
      counts[id] += 1;
      crawler -= 1;
    }
  }
  counts.crawler = crawler;
  return counts;
}

/** 这一波的精英：类型与词缀（同一 wave + seed 必得同一只）
 *  实现放在 systems/enemies.js（纯函数），这里只是转发。 */
export function eliteFor(wave, seed = 1) {
  return eliteForWave(wave, seed);
}

/**
 * 波次编排的**记忆化缓存**（第九轮加的）。
 *
 * 为什么需要：第九轮机器人要给每张候选牌算"这一章的对症倍率"，
 * 而倍率要遍历这一章的 5 波编排 ⇒ 一次抽卡要算 40（牌池）× 5 波 = 200 次编排。
 * 没有缓存时，实测**面板时间从 ~50 秒涨到 152 秒**（一局的一半时间耗在算账上）。
 *
 * 缓存是安全的：wavePlan 是**纯函数**（同 wave + seed + mods 必得同结果），
 * 缓存只是把同一个调用算一次。
 */
const PLAN_CACHE = new Map();
const PLAN_CACHE_MAX = 400;

/** 第 wave 波的完整编排（纯函数，同 wave 必得同结果） */
export function wavePlan(wave, seed = 1, mods = null) {
  const key = `${wave}|${seed}|${mods ? JSON.stringify(mods) : ''}`;
  const hit = PLAN_CACHE.get(key);
  if (hit) return hit;
  const plan = deepFreeze(buildWavePlan(wave, seed, mods));
  if (PLAN_CACHE.size >= PLAN_CACHE_MAX) PLAN_CACHE.clear();
  PLAN_CACHE.set(key, plan);
  return plan;
}

/**
 * 深冻结：缓存里的对象是**共享引用** ——
 * 谁就地改了它，缓存就被污染，后面的调用会拿到不一样的结果。
 * （编排是纯数据，冻结没有任何副作用。）
 */
function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const v of Object.values(obj)) deepFreeze(v);
  }
  return obj;
}

/** 编排本体（真正干活的地方；缓存由 wavePlan 负责） */
function buildWavePlan(wave, seed = 1, mods = null) {
  const w = Math.max(1, Math.floor(wave));
  const rng = makeRng(seed, w);

  const m = mods || {};
  const countMul = m.enemyCountMul ?? 1;
  const count = Math.max(1, Math.round((3 + Math.floor(w * 1.6)) * countMul));
  const interval = Math.max(0.32, 1.05 - w * 0.045);
  const roster = waveRoster(w);
  const counts = composeWave(roster, count, m.typeBias, rng);
  // 展开成出场序列：同一波里先出现的怪与后出现的怪随机交错
  // （顺序影响玩家的第一反应，所以顺序必须随种子变）。
  const bag = [];
  for (const id of roster) {
    for (let k = 0; k < (counts[id] || 0); k++) bag.push(id);
  }
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  const plan = [];
  for (let i = 0; i < bag.length; i++) {
    plan.push({
      type: bag[i],
      at: Number((i * interval).toFixed(3)),
      jitter: Number((rng() * 0.35).toFixed(3)),
    });
  }
  const elite = eliteFor(w, seed);
  return {
    wave: w,
    count,
    interval,
    boss: w % BOSS_EVERY === 0,
    bossAt: 2.2,
    plan,
    elite,
    chapter: chapterOf(w),
    hpBonus: Math.floor((w - 1) / 3),
    speedBonus: Math.min(w * 4, 46),
  };
}

/** 把编排转成时间线事件（升序） */
export function buildTimeline(wave, seed = 1, mods = null) {
  const p = wavePlan(wave, seed, mods);
  const events = p.plan.map((e, i) => ({
    kind: 'enemy',
    type: e.type,
    at: e.at + e.jitter,
    order: i,
  }));
  // 精英：每章第 2 波登场（章首抽卡之后 —— 你的构筑要立刻证明自己）
  if (p.elite) {
    events.push({ kind: 'elite', type: p.elite.type, affix: p.elite.affix, at: 1.4, order: -1 });
  }
  if (p.boss) {
    events.push({ kind: 'boss', type: 'boss', at: p.bossAt, order: -1 });
  }
  // 主题可以空投深海炸弹
  const hazardEvery = mods?.hazardEverySec ?? 0;
  if (hazardEvery > 0) {
    const last = events.length ? events[events.length - 1].at : 4;
    const endAt = last + 2;
    for (let t = 3; t < endAt; t += hazardEvery) {
      events.push({ kind: 'hazard', type: 'hazard', at: Number(t.toFixed(3)), order: -2 });
    }
  }
  events.sort((a, b) => a.at - b.at || a.order - b.order);
  return events;
}

/** 波次之间的喘息时间（秒） */
export function waveBreather(wave) {
  return Math.max(1.6, 4.2 - wave * 0.18);
}

export { randInt };
