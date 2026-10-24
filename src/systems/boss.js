// Boss：每章一个不同的异变体。
//
// 为什么要有多个 Boss（第七轮）：
// 第六轮之前，一局里的四场 Boss 战**都是同一只**（深渊巨鲸）。
// 肉鸽的高潮是"每章的最终战"，四场一模一样 = 高潮重复四次 = 局与局之间没有差别。
// 而"每局长得不一样"这件事，Boss 是最显眼的一环（玩家记得住 Boss）。
//
// 这一轮做四个：**每章一个**（第 1~4 章各一只），
// 每个 Boss 有自己的"招牌机制"，所以它对构筑的要求也不同。
//
// 纯逻辑：不 import Phaser、不碰 DOM。状态机（结壳 / 冲刺 / 召唤）都在这里，
// 渲染层只负责把状态机算出来的意图变成速度、弹幕与召唤。
/** Boss 的阶段数（三个阶段：追踪 → 变化 → 狂暴） */
export const BOSS_PHASE_COUNT = 3;

/**
 * Boss 表。
 *
 * phases[i] = 第 i+1 阶段的参数（与第五轮那套字段一致）：
 *   speedMul 移动速度倍率
 *   burst    环形弹幕发数
 *   burstMs  环形弹幕间隔
 *   aimed    瞄准三连发间隔
 *   bombMs   深海炸弹间隔（0 = 不放）
 *   tint     阶段主题色
 *
 * special = 招牌机制：
 *   'shell'  结壳：定期免疫伤害（考爆发）
 *   'summon' 召唤：定期召出小怪（考清场）
 *   'charge' 冲刺：定期蓄力后直线突进（考走位）
 */
export const BOSSES = [
  {
    id: 'wither_lord',
    name: '深渊领主',
    tag: '追踪 + 环形弹幕 + 深海炸弹',
    desc: '一路追着你转，第三章开始往下丢深海炸弹。',
    counter: '贴脸时它的环形弹幕会打到自己 —— 敢贴上去就能换 DPS',
    texture: 'boss',
    special: null,
    phases: [
      { speedMul: 1.0, burst: 10, burstMs: 2600, aimed: 1400, bombMs: 0, tint: 'ff5d8f' },
      { speedMul: 1.35, burst: 16, burstMs: 2000, aimed: 1500, bombMs: 0, tint: 'ff87ad' },
      { speedMul: 1.75, burst: 22, burstMs: 1500, aimed: 1100, bombMs: 3200, tint: 'a06bff' },
    ],
  },
  {
    id: 'stone_warden',
    name: '巨甲蟹',
    tag: '结壳免伤 + 甩出海葵',
    desc: '每隔几秒就结一次壳，壳硬得打不动；壳碎时甩出两只海葵。',
    counter: '壳只挡 1.1 秒 —— 爆发够就能在壳碎前打穿它',
    texture: 'boss_stone',
    special: 'shell',
    phases: [
      { speedMul: 0.8, burst: 8, burstMs: 3000, aimed: 1800, bombMs: 0, tint: '9fb4c8' },
      { speedMul: 0.95, burst: 12, burstMs: 2400, aimed: 1600, bombMs: 0, tint: 'b9c8d6' },
      { speedMul: 1.1, burst: 16, burstMs: 1900, aimed: 1300, bombMs: 0, tint: 'e0ecf5' },
    ],
  },
  {
    id: 'pollen_queen',
    name: '母巢',
    tag: '召唤毒水母 + 旋转弹幕',
    desc: '身边永远飘着毒水母，弹幕是转着圈的螺旋。',
    counter: '螺旋弹幕有个缺口 —— 站对了位置就几乎不掉血',
    texture: 'boss_pollen',
    special: 'summon',
    phases: [
      { speedMul: 1.15, burst: 12, burstMs: 2600, aimed: 1600, bombMs: 0, tint: 'ffd27a' },
      { speedMul: 1.3, burst: 16, burstMs: 2100, aimed: 1400, bombMs: 0, tint: 'ffe9a8' },
      { speedMul: 1.45, burst: 20, burstMs: 1700, aimed: 1200, bombMs: 2600, tint: 'fff6d8' },
    ],
  },
  {
    id: 'thorn_king',
    name: '棘刺之王',
    tag: '蓄力突进 + 瞄准三连发',
    desc: '蓄力半秒就朝你冲过来，冲完还要愣一会儿 —— 那是你的输出窗口。',
    counter: '它冲刺后有 0.9 秒硬直 —— 那半秒能打掉它一大截血',
    texture: 'boss_thorn',
    special: 'charge',
    phases: [
      { speedMul: 1.0, burst: 8, burstMs: 3200, aimed: 1500, bombMs: 0, tint: '7fd8ff' },
      { speedMul: 1.2, burst: 12, burstMs: 2700, aimed: 1300, bombMs: 0, tint: 'a6e6ff' },
      { speedMul: 1.4, burst: 16, burstMs: 2200, aimed: 1100, bombMs: 2400, tint: 'd6f4ff' },
    ],
  },
];

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

export function bossById(id) {
  return BOSS_BY_ID[id] || BOSSES[0];
}

/**
 * 第 chapter 章是哪个 Boss（每章一个，从第 1 章起循环）。
 * 纯函数：同一个章节永远同一个 Boss（可复现、可预期）。
 */
export function bossForChapter(chapterIndex) {
  const i = Math.max(1, Math.floor(chapterIndex)) - 1;
  return BOSSES[i % BOSSES.length];
}

/** 血量比例 → 阶段号 */
export function bossPhase(hp, maxHp) {
  if (maxHp <= 0) return 1;
  const r = Math.max(0, hp) / maxHp;
  if (r > 0.66) return 1;
  if (r > 0.33) return 2;
  return 3;
}

/** 阶段是否刚发生跃迁（用于播报与视觉反馈） */
export function phaseChanged(oldPhase, newPhase) {
  return newPhase > oldPhase;
}

/**
 * 某个 Boss 某个阶段的参数。
 *
 * 兼容旧签名：`bossPhaseStats(phase)` 等价于「凋零之主的第 phase 阶段」
 * （第五轮只有一只 Boss 时的用法，测试与别处都这么调）。
 * @param {string|number} bossIdOrPhase
 * @param {number} [phase]
 */
export function bossPhaseStats(bossIdOrPhase, phase) {
  const isId = typeof bossIdOrPhase === 'string';
  const bossId = isId ? bossIdOrPhase : 'wither_lord';
  const p = isId ? (phase || 1) : (bossIdOrPhase || 1);
  const boss = bossById(bossId);
  const idx = Math.min(BOSS_PHASE_COUNT, Math.max(1, Math.floor(p))) - 1;
  return boss.phases[idx];
}

/** 阶段二的环形弹幕带旋转（每圈偏移一点） */
export function burstOffset(phase, tick) {
  return phase >= 2 ? (tick % 4) * 0.22 : 0;
}

/* ── 招牌机制的状态机 ─────────────────────────────────── */

/** 石壳守卫：结壳 / 碎壳 */
export const BOSS_SHELL = { cycleMs: 4200, shellMs: 1100 };

/**
 * 结壳状态机（纯函数）。
 * 结壳期间**免疫伤害** —— 这是 Boss 版的"爆发检查"。
 * @param {{shelling?:boolean,timer?:number,cycle?:number}} state
 * @param {number} dtMs
 * @returns {{shelling:boolean,timer:number,cycle:number,event:string|null}}
 */
export function bossShellStep(state = {}, dtMs = 0) {
  let shelling = !!state.shelling;
  let timer = (state.timer ?? 0) - dtMs;
  let cycle = (state.cycle ?? BOSS_SHELL.cycleMs) - dtMs;
  let event = null;
  if (shelling) {
    if (timer <= 0) { shelling = false; timer = 0; event = 'break'; }
  } else if (cycle <= 0) {
    shelling = true;
    timer = BOSS_SHELL.shellMs;
    cycle = BOSS_SHELL.cycleMs;
    event = 'shell';
  }
  return { shelling, timer, cycle, event };
}

/** 母巢：召唤 */
export const BOSS_SUMMON = { everyMs: 3400, count: 2 };

/** 召唤状态机（纯函数） */
export function bossSummonStep(state = {}, dtMs = 0) {
  let timer = (state.timer ?? BOSS_SUMMON.everyMs) - dtMs;
  let event = null;
  if (timer <= 0) { timer = BOSS_SUMMON.everyMs; event = 'summon'; }
  return { timer, event };
}

/** 荆棘王：蓄力冲刺 */
export const BOSS_CHARGE = { windMs: 700, dashMs: 520, restMs: 900, dashMul: 4.2 };

/**
 * 冲刺状态机（纯函数）。
 * 与普通敌种的「旗鱼」同构，但更大更快。
 * @param {{phase?:string,timer?:number,lock?:{x:number,y:number}}} state
 * @param {number} dtMs
 * @param {{x:number,y:number}} toPlayer 指向玩家的单位向量
 */
export function bossChargeStep(state = {}, dtMs = 0, toPlayer = { x: 0, y: 0 }) {
  let phase = state.phase || 'wind';
  let timer = (state.timer ?? BOSS_CHARGE.windMs) - dtMs;
  let lock = state.lock || { x: 0, y: 0 };
  let event = null;
  if (phase === 'wind') {
    if (timer <= 0) { phase = 'dash'; timer = BOSS_CHARGE.dashMs; event = 'dash'; }
  } else if (phase === 'dash') {
    if (timer <= 0) { phase = 'rest'; timer = BOSS_CHARGE.restMs; event = 'rest'; }
  } else {
    if (timer <= 0) {
      phase = 'wind';
      timer = BOSS_CHARGE.windMs;
      lock = { x: toPlayer.x, y: toPlayer.y };
      event = 'lock';
    }
  }
  return { phase, timer, lock, event };
}
