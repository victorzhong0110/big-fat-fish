// 「压力」：把"这一波要多少 DPS"与"我现在有多少 DPS"算成同一个口径。
//
// 为什么单独一个模块：这两个数在别处都被算过，但口径不一致 ——
// 平衡脚本里算需求用的是"敌人总血量 ÷ 生成窗口"，
// 玩家手上的 DPS 却是"火力等级 + 装备 + 流派"三处拼出来的。
// **口径不一致就没法比较**，所以把两边收进同一个纯模块，谁用都调同一份。
//
// 纯逻辑：不 import Phaser、不碰 DOM，可单测。
import { wavePlan } from './waveDirector.js';
import { enemyStats, eliteStats } from './enemies.js';
import { counterMult, COUNTER_MULT, COUNTER_CURVE_EXP } from './counters.js';
import { expectedDps } from './upgrades.js';

/**
 * 某一波"需要多少 DPS"：这一波所有敌人的总血量 ÷ 生成窗口。
 *
 * 生成窗口 = 出怪位数量 × 出怪间隔（相位机的间隔有下限 0.32 秒）。
 * 沙丁鱼群位一次刷 3 只，所以按"位"算再乘 3。
 *
 * ⚠️ **这里不含 Boss**（第九轮查出来的口径漏洞）：
 * Boss 是**单挑**（一只、不是一波 35 只），它的血量按"波次生成窗口"分摊是错的
 * —— 早先一直没算，于是第 20 波的覆盖度虚高了将近一倍，
 * 而"Boss 战是构筑的考试"这个设计意图**从来没被任何尺子测到过**。
 * ⇒ Boss 的压力用另一个指标看：**bossFightSeconds**（这场 Boss 战要打几秒）。
 */
export function waveDpsNeed(wave, seed = 1, mods = null) {
  const p = wavePlan(wave, seed, mods || {});
  let hp = 0;
  for (const e of p.plan) {
    hp += enemyStats(e.type, wave, mods || {}).hp * (e.type === 'swarm' ? 3 : 1);
  }
  // 精英（每章第 2 波）也要算进需求 ——
  // 否则覆盖度会把精英当成"白送"，玩家面板上的压力比就会骗人。
  if (p.elite) {
    const es = eliteStats(p.elite, wave, mods || {});
    if (es) hp += es.hp;
  }
  const interval = Math.max(0.32, 1.05 - wave * 0.045);
  const windowSec = Math.max(1, p.count * interval);
  return Math.round(hp / windowSec);
}

/**
 * 这一波里"对症"带来的**加权伤害倍率**（按血量加权，第九轮）。
 *
 * 为什么按血量加权而不是按种类数：
 * 贪嘴小鱼占一波的一半数量，但它只有 1 点血 ——
 * 按种类数算会把"能不能秒掉贪嘴小鱼"放大成"能不能打这一波"，
 * 按血量算才与 waveDpsNeed 的口径一致（需求也是按血量算的）。
 *
 * ⚠️ **这里不含 Boss**（第九轮）：
 * Boss 是**单挑**（一只、2000+ 血），把它混进"这一波"的血量加权，
 * 会让普通怪的权重被压到 5% 以下 —— 那一波就变成"只看 Boss"了。
 * ⇒ Boss 的手段需求另看：**bossFightSeconds**。
 */
export function waveCounterMult(wave, seed = 1, mods = null, tags = []) {
  if (!tags || !tags.length) return 1;
  // 第九轮：记忆化（第九轮的实测：没有缓存时机器人一局有 193 秒耗在算账上）
  const key = `${wave}|${seed}|${mods ? JSON.stringify(mods) : ''}|${tags.slice().sort().join(',')}`;
  const hit = CM_CACHE.get(key);
  if (hit !== undefined) return hit;
  const out = computeWaveCounterMult(wave, seed, mods, tags);
  if (CM_CACHE.size >= 2000) CM_CACHE.clear();
  CM_CACHE.set(key, out);
  return out;
}

/** 对症倍率的缓存（key 里含手段集合 ⇒ 组合很少，命中率极高） */
const CM_CACHE = new Map();

function computeWaveCounterMult(wave, seed, mods, tags) {
  const p = wavePlan(wave, seed, mods || {});
  let total = 0;
  let matched = 0;
  const add = (type, hp) => {
    if (hp <= 0) return;
    total += hp;
    if (counterMult(type, tags) > 1) matched += hp;
  };
  for (const e of p.plan) {
    const s = enemyStats(e.type, wave, mods || {});
    add(e.type, s.hp * (e.type === 'swarm' ? 3 : 1));
  }
  if (p.elite) {
    const es = eliteStats(p.elite, wave, mods || {});
    if (es) add(p.elite.type, es.hp);
  }
  if (!total) return 1;
  // ⚠️ 指数曲线（第九轮）：**"凑齐手段"要比"单张对症牌"值钱得多**。
  //
  // 为什么（实测逼出来的，见 DECISIONS §23.16）：
  // 线性曲线下，"按稀有度挑"与"按对症挑"的最终倍率只差 20.4%
  // ⇒ 浏览器实测里两者都能通关 ⇒ 机制等于没生效。
  // 指数 1.5 把差距拉到 38%，而**单张对症牌仍有 23% 的提升**（玩家感觉得到）。
  //
  // 曲线与单怪倍率是**自洽**的：share = 1（全部命中）时结果 = COUNTER_MULT。
  const share = matched / total;
  return 1 + (COUNTER_MULT - 1) * Math.pow(share, COUNTER_CURVE_EXP);
}

/**
 * 整章（5 波）的平均对症倍率 —— 抽卡面板与机器人评分用。
 * @param {number} chapterIndex 章序号（1 起）
 */
export function chapterCounterMult(chapterIndex, seed = 1, mods = null, tags = []) {
  const idx = Math.max(1, Math.floor(chapterIndex));
  const first = (idx - 1) * 5 + 1;
  const last = first + 4;
  let sum = 0;
  for (let w = first; w <= last; w++) sum += waveCounterMult(w, seed, mods, tags);
  return sum / 5;
}

/**
 * 这一章里**每种手段各自**能命中多少血量（0~1）。
 *
 * 为什么要有这个（第九轮）：抽卡面板上写"对症 → 贪嘴小鱼"只说"这张牌能治谁"，
 * 但玩家真正要决定的是"**这一章我最缺哪一招**"。
 * ⇒ 面板把这四个数摆出来，玩家一眼能看出自己缺的是哪一格。
 *
 * 口径与 waveCounterMult 一致：**按血量加权，不含 Boss**。
 */
export function chapterCounterBreakdown(chapterIndex, seed = 1, mods = null, tags = ['area', 'burst', 'slow', 'mobility']) {
  const idx = Math.max(1, Math.floor(chapterIndex));
  const first = (idx - 1) * 5 + 1;
  const last = first + 4;
  const out = {};
  for (const t of tags) out[t] = 0;
  let total = 0;
  for (let w = first; w <= last; w++) {
    const p = wavePlan(w, seed, mods || {});
    const add = (type, hp) => {
      if (hp <= 0) return;
      total += hp;
      for (const t of tags) if (counterMult(type, [t]) > 1) out[t] += hp;
    };
    for (const e of p.plan) {
      const s = enemyStats(e.type, w, mods || {});
      add(e.type, s.hp * (e.type === 'swarm' ? 3 : 1));
    }
    if (p.elite) {
      const es = eliteStats(p.elite, w, mods || {});
      if (es) add(p.elite.type, es.hp);
    }
  }
  if (!total) return out;
  for (const t of tags) out[t] = Math.round((out[t] / total) * 100) / 100;
  return out;
}

/**
 * Boss 战预计要打几秒（玩家 DPS ÷ Boss 血量的倒数）。
 *
 * 为什么单独一个指标（第九轮）：
 * Boss 是单挑，"这一波需要多少 DPS"这个口径**装不下它**。
 * 而它恰恰是**构筑的考试** —— 血量 ×2.0 的终局 Boss，
 * 保底构筑（107 DPS）要打 60 秒，中位构筑（200 DPS）打 30 秒。
 * ⇒ 这个数字直接说"你的构筑够不够格打赢最后一场"。
 */
export function bossFightSeconds(bossHp, playerDps) {
  if (!bossHp || !playerDps) return null;
  return Math.round((bossHp / playerDps) * 10) / 10;
}

/** 玩家的实际 DPS（由射击参数算出） */
export function dpsOf(fire) {
  if (!fire) return 0;
  return Math.round(expectedDps(fire));
}

/**
 * 「压力比」：玩家 DPS ÷ 该波需求。
 * >1 = 打得动；<1 = 会越积越多。
 * 这就是"构筑决定生死"的那把尺子 —— 玩家看得到它，就知道自己的构筑够不够。
 *
 * ⚠️ 第九轮起，这把尺子要乘上**对症倍率**（waveCounterMult）——
 * 否则"构筑对不对症"在尺子上完全看不见（第九轮的核心问题）。
 */
export function pressureRatio(playerDps, needDps) {
  if (!needDps) return null;
  return Math.round((playerDps / needDps) * 100) / 100;
}
