// 一局（run）的结构：章节、章节主题、胜负与结算。
//
// 纯逻辑：不知道 Phaser、不知道 DOM，只知道 seed 与波次。
import { mulberry32 } from './rng.js';
import { chapterOf } from './waveDirector.js';
import { pickTheme, themeMods } from './themes.js';
import { pickRouteOptions, routeById, mergeChapterMods } from './routes.js';
import { chapterTypeIds } from './enemies.js';
import { FINAL_BOSS_HP_MUL, GRADE_THRESHOLDS } from './difficulty.js';

/** 每章波数 */
export const WAVES_PER_CHAPTER = 5;
/** 一局默认章数 */
export const RUN_CHAPTERS = 4;
/** 终局波（打通它即通关） */
export const FINAL_WAVE = RUN_CHAPTERS * WAVES_PER_CHAPTER;
export { FINAL_BOSS_HP_MUL };

/** 波次 → 章节序号（1 起） */
export function chapterIndexOf(wave) {
  return Math.floor((Math.max(1, Math.floor(wave)) - 1) / WAVES_PER_CHAPTER) + 1;
}

/** 该波是不是某一章的第一波（= 抽卡点） */
export function isChapterStart(wave) {
  return (Math.max(1, Math.floor(wave)) - 1) % WAVES_PER_CHAPTER === 0;
}

/** 章中异象的波次（每章第 3 波：抽卡在章首，异象在章中） */
export function omenWaveOf(chapterIndex) {
  return (Math.max(1, Math.floor(chapterIndex)) - 1) * WAVES_PER_CHAPTER + 3;
}

/** 该波是不是某章的异象波 */
export function isOmenWave(wave) {
  const w = Math.max(1, Math.floor(wave));
  return (w - 1) % WAVES_PER_CHAPTER === 2;
}

/** 该波是不是终局波 */
export function isFinalWave(wave) {
  return Math.floor(wave) === FINAL_WAVE;
}

/**
 * 这只敌人是不是"终局 Boss"。
 *
 * 关键：**按它出生的那一波判定，不按死亡时的当前波次**。
 * 终局 Boss 在第 20 波 2.2 秒时登场，但第 20 波的出怪时间线要到十几秒后才跑完；
 * 玩家若没在波次结束前打死它，波次计数会推进到 21 —— 此时若还用"当前波次"判断，
 * 胜利条件就永远不再成立，这一局既不能赢也不能结束（实测机器人能活到第 29 波）。
 *
 * @param {{type?:string, wave?:number}|null} enemy 出生的敌人体（type + wave）
 * @param {{endless?:boolean}} [opts]
 */
export function isFinalBossEnemy(enemy, opts = {}) {
  if (!enemy || enemy.type !== 'boss') return false;
  if (opts.endless) return false;
  return Math.floor(enemy.wave ?? 0) === FINAL_WAVE;
}

/** 种子加盐，避免不同用途共用同一条随机序列 */
/**
 * 字符串 → 32 位无符号整数（FNV-1a）。
 *
 * **为什么需要**：`hashSeed` 里是 `seed ^ 常量`，而 `^` 会把字符串转成 Number ——
 * `Number('2026-10-24')` 是 **NaN**，`NaN ^ x` 恒等于 0，
 * 于是**任何非数字输入都会得到同一个种子**（实测：不同日期的今日挑战种子完全一样）。
 * 这个坑很安静：不报错，只是所有种子都一样。
 */
export function hashString(str) {
  const s = String(str);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * 「今日挑战」的种子：同一天、所有人拿到同一局。
 *
 * 为什么要有：肉鸽的"再来一局"需要一个**外部节奏** ——
 * 排行榜之外，"今天大家都在打同一局"本身就是回来的理由。
 *
 * @param {string} dateKey 日期键（本地日期，'YYYY-M-D'）
 */
export function dailySeed(dateKey) {
  return (hashString(dateKey) ^ 0xda11) >>> 0;
}

export function hashSeed(seed, salt = 0) {
  // 非数字输入走字符串哈希：否则 `seed ^ 常量` 会把字符串转成 NaN，
  // 而 `NaN ^ x === 0` → 所有输入都得到同一个种子（静默到极点）
  const n = (typeof seed === 'number' && Number.isFinite(seed)) ? seed : hashString(seed);
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ salt, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function makeChapter(index, rng) {
  const waveStart = (index - 1) * WAVES_PER_CHAPTER + 1;
  return {
    index,
    name: chapterOf(waveStart).name,
    waveStart,
    waveEnd: index * WAVES_PER_CHAPTER,
    theme: pickTheme(rng),
    // 第六轮：每章两条候选路线（玩家二选一）
    // 只给"这一章用得上"的路线：它偏置的敌种必须会在这一章出现
    routes: pickRouteOptions(rng, 2, chapterTypeIds(index)),
    // 玩家选中的那条（还没选 = null）
    route: null,
  };
}

/**
 * 选定这一章走哪条路线。
 * @param {object} plan 一局的计划
 * @param {number} index 章节序号（1 起）
 * @param {string} routeId 路线 id
 */
export function chooseRoute(plan, index, routeId) {
  const chapter = ensureChapter(plan, index);
  if (!chapter.routes.includes(routeId)) return null;
  chapter.route = routeId;
  return routeById(routeId);
}

/** 某章选中的路线（还没选就是 null） */
export function routeOfChapter(plan, index) {
  const chapter = ensureChapter(plan, index);
  return chapter.route ? routeById(chapter.route) : null;
}

/** 某波所属章节选中的路线 */
export function routeForWave(plan, wave) {
  return routeOfChapter(plan, chapterIndexOf(wave));
}

/**
 * 生成一局的章节计划（每章一个随机主题）。
 * 同一 seed 必定得到同一份计划——可复盘、可回放。
 */
export function createRunPlan(seed, chapterCount = RUN_CHAPTERS) {
  const rng = mulberry32(hashSeed(seed, 0x5eed));
  const chapters = [];
  let lastThemeId = null;
  for (let i = 0; i < Math.max(1, chapterCount); i++) {
    const chapter = makeChapter(i + 1, rng);
    if (chapter.theme.id === lastThemeId) {
      chapter.theme = pickTheme(rng, lastThemeId);
    }
    lastThemeId = chapter.theme.id;
    chapters.push(chapter);
  }
  return { seed, chapters, rng, endless: false };
}

/** 无尽模式：再往后加一章，主题继续从同一条随机序列里抽 */
export function extendRunPlan(plan) {
  const last = plan.chapters[plan.chapters.length - 1];
  const chapter = makeChapter(plan.chapters.length + 1, plan.rng);
  // 避免和上一章同主题
  if (chapter.theme.id === last?.theme.id) {
    chapter.theme = pickTheme(plan.rng, last.theme.id);
  }
  plan.chapters.push(chapter);
  plan.endless = true;
  return chapter;
}

/** 取某一章（超出计划长度时自动延长——无尽模式） */
export function ensureChapter(plan, index) {
  while (plan.chapters.length < index) extendRunPlan(plan);
  return plan.chapters[index - 1];
}

/** 某波所属章节 */
export function chapterForWave(plan, wave) {
  return ensureChapter(plan, chapterIndexOf(wave));
}

/**
 * 某波的敌人修正量（波次编排只认这个，不认主题名）。
 *
 * 第六轮起，这一章的修正量 = **主题 × 路线**（玩家选的那条）。
 * 叠加上限在 systems/routes.js 的 mergeChapterMods 里。
 */
export function modsForWave(plan, wave) {
  const chapter = chapterForWave(plan, wave);
  const route = chapter.route ? routeById(chapter.route) : null;
  return mergeChapterMods(themeMods(chapter.theme), route?.mods || null);
}

/** 某章的抽卡随机源（与主题随机源分开，互不干扰） */
export function draftRng(plan) {
  return mulberry32(hashSeed(plan.seed, 0xd1a7f));
}

/** 打完某波算清了几章 */
export function chaptersCleared(wave) {
  return Math.max(0, Math.floor((Math.max(1, Math.floor(wave)) - 1) / WAVES_PER_CHAPTER));
}

/**
 * 结算：胜/负 → 评级。
 * 通关按得分分档；失败按清了几章分档。
 *
 * **分档阈值是量出来的，不是拍的**：两次平衡修法（§6.6）之后，
 * 一局的分数量级涨了约 5 倍（实测：第 17 波 45,797 分、第 19 波 63,007 分）。
 * 旧的 S 档门槛（9,000）会让所有人都拿 S，评级就失去了信息量。
 */
export { GRADE_THRESHOLDS };

export function gradeOf({ victory, score = 0, cleared = 0 }) {
  if (victory) {
    if (score >= GRADE_THRESHOLDS.S) return 'S';
    if (score >= GRADE_THRESHOLDS.A) return 'A';
    if (score >= GRADE_THRESHOLDS.B) return 'B';
    return 'C';
  }
  if (cleared >= 3) return 'A';
  if (cleared >= 2) return 'B';
  if (cleared >= 1) return 'C';
  return 'D';
}

/** 拼一份结算数据 */
export function runResult({
  victory = false, score = 0, wave = 0, kills = 0, bestCombo = 0,
  survived = 0, relics = [], seed = 0, endless = false, chapter = '—', best = null,
}) {
  const cleared = victory ? Math.max(clearedChapters(wave), RUN_CHAPTERS) : chaptersCleared(wave);
  return {
    victory, score, wave, kills, bestCombo, survived,
    relics: relics.slice(), seed, endless, chapter,
    best: best ?? score,
    chaptersCleared: cleared,
    grade: gradeOf({ victory, score, cleared }),
  };
}

function clearedChapters(wave) {
  return Math.floor(Math.max(0, Math.floor(wave) - 1) / WAVES_PER_CHAPTER);
}
