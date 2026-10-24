// 深海藏品：局外元进度。
//
// 关键设计（DECISIONS §4 / §5.2）：**只解锁内容，不加数值**。
// 永久数值强化（+1 初始生命、+10% 伤害）会让老玩家的难度曲线崩塌、
// 新玩家永远追不上，而且直接削弱局内构筑的意义——
// 玩家会想「这局不拿装备也行，反正我元进度堆上去了」。
//
// 于是记忆只能做一件事：**把更多装备放进牌池**。
// 牌池越大，每局能长出的构筑越不一样——这恰好服务「每局开局长得都不一样」。

import { RELICS, relicById } from './relics.js';

/** 存档版本（结构变了就 +1，旧档按缺省值补齐） */
export const META_VERSION = 1;

/** localStorage 键（存储适配在 src/meta-store.js，纯逻辑层不碰浏览器 API） */
export const META_STORAGE_KEY = 'tulip-guard-meta-v1';

/** 一局最少给的记忆（保证每局都有进展感） */
export const MEMORY_FLOOR = 6;

/** 每清一章给的记忆 */
export const MEMORY_PER_CHAPTER = 12;

/** 通关额外给的记忆 */
export const MEMORY_VICTORY_BONUS = 40;

/** 得分换记忆的除数 */
export const MEMORY_PER_SCORE = 250;

/**
 * 一局结束后该给多少记忆。
 * @param {{victory?:boolean, score?:number, chaptersCleared?:number}} r
 */
export function memoryForRun({ victory = false, score = 0, chaptersCleared = 0 } = {}) {
  const raw = MEMORY_PER_CHAPTER * Math.max(0, Math.floor(chaptersCleared))
    + Math.floor(Math.max(0, score) / MEMORY_PER_SCORE)
    + (victory ? MEMORY_VICTORY_BONUS : 0);
  return Math.max(MEMORY_FLOOR, raw);
}

/** 默认解锁的装备（unlockCost 为 0 的那些） */
export function defaultUnlockedRelics() {
  return RELICS.filter((r) => !r.unlockCost).map((r) => r.id);
}

/** 一份全新的存档 */
export function createMeta() {
  return {
    version: META_VERSION,
    memory: 0,
    unlocked: defaultUnlockedRelics(),
    runs: 0,
    bestScore: 0,
    bestWave: 0,
  };
}

/**
 * 清洗读出来的存档：字段缺失/类型不对/含不存在的装备 id，都要修正。
 * 存档是用户可改的，脏数据不该让游戏起不来。
 */
export function sanitizeMeta(raw) {
  const base = createMeta();
  if (!raw || typeof raw !== 'object') return base;
  const unlocked = Array.isArray(raw.unlocked) ? raw.unlocked : base.unlocked;
  const valid = unlocked.filter((id) => !!relicById(id));
  const seen = new Set();
  const merged = [];
  for (const id of [...valid, ...base.unlocked]) {
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return {
    version: META_VERSION,
    memory: Number.isFinite(raw.memory) ? Math.max(0, Math.floor(raw.memory)) : 0,
    unlocked: merged,
    runs: Number.isFinite(raw.runs) ? Math.max(0, Math.floor(raw.runs)) : 0,
    bestScore: Number.isFinite(raw.bestScore) ? Math.max(0, Math.floor(raw.bestScore)) : 0,
    bestWave: Number.isFinite(raw.bestWave) ? Math.max(0, Math.floor(raw.bestWave)) : 0,
  };
}

/** 当前还没解锁的装备（带价格） */
export function lockedRelics(meta) {
  const owned = new Set(meta?.unlocked || []);
  return RELICS
    .filter((r) => r.unlockCost && !owned.has(r.id))
    .map((r) => ({ id: r.id, name: r.name, rarity: r.rarity, desc: r.desc, cost: r.unlockCost }));
}

/** 能不能解锁某张装备 */
export function canUnlock(meta, relicId) {
  const relic = relicById(relicId);
  if (!relic || !relic.unlockCost) return false;
  if ((meta?.unlocked || []).includes(relicId)) return false;
  return (meta?.memory || 0) >= relic.unlockCost;
}

/**
 * 解锁一张装备（纯函数，不改传入对象）。
 * @returns {{meta:object, ok:boolean, reason?:string}}
 */
export function unlockRelic(meta, relicId) {
  const relic = relicById(relicId);
  if (!relic) return { meta, ok: false, reason: '没有这件装备' };
  if (!relic.unlockCost) return { meta, ok: false, reason: '它本来就可用' };
  if ((meta.unlocked || []).includes(relicId)) return { meta, ok: false, reason: '已经解锁过了' };
  if ((meta.memory || 0) < relic.unlockCost) return { meta, ok: false, reason: '记忆不够' };
  return {
    meta: { ...meta, memory: meta.memory - relic.unlockCost, unlocked: [...meta.unlocked, relicId] },
    ok: true,
  };
}

/**
 * 一局结束后把奖励并进存档（纯函数）。
 * @param {object} meta 当前存档
 * @param {{victory?:boolean, score?:number, wave?:number, chaptersCleared?:number}} result
 */
export function awardRun(meta, result = {}) {
  const gained = memoryForRun(result);
  return {
    meta: {
      ...meta,
      memory: (meta.memory || 0) + gained,
      runs: (meta.runs || 0) + 1,
      bestScore: Math.max(meta.bestScore || 0, result.score || 0),
      bestWave: Math.max(meta.bestWave || 0, result.wave || 0),
    },
    gained,
  };
}

/** 某张装备在当前存档下是否可用（进牌池） */
export function isRelicAvailable(meta, relicId) {
  const relic = relicById(relicId);
  if (!relic) return false;
  if (!relic.unlockCost) return true;
  return (meta?.unlocked || []).includes(relicId);
}

/** 当前存档能用的装备 id 列表（抽卡牌池用） */
export function availableRelicIds(meta) {
  return RELICS.filter((r) => isRelicAvailable(meta, r.id)).map((r) => r.id);
}
