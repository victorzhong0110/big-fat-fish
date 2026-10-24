// 敌人：类型表、行为状态机、精英词缀、应对提示。
//
// 为什么单独一个模块（第五轮）：
// 第四轮之前的五个敌种（贪嘴小鱼 / 水母 / 沙丁鱼群 / 海葵 / Boss）**行为几乎一样** ——
// 除了孢子会保持距离、其余全是"朝玩家冲"。于是构筑只被当作**算术题**：
// 覆盖度够就打，过不了就死。DPS 再高也是同一套打法，"构筑"只改变数字，不改变行为。
//
// 真正的肉鸽里，构筑要改变的是**打法**：遇到不同的怪，要用不同的手段。
// 所以第五轮给敌人补上**会针对构筑提问的行为**：
//   旗鱼  —— 蓄力冲刺：纯 DPS 无解，必须走位（考验「机动」）
//   毒水母  —— 死亡留云：不能让它死在你脚下（考验「控场 / 远程」）
//   枯  壳  —— 结壳免伤：爆发不够就打不穿（考验「爆发」）
//   墨鱼  —— 蛛弹减速：被黏住就跑不动（考验「机动 / 生存」）
//
// 纯逻辑：不 import Phaser、不碰 DOM，全部可单测。
// 渲染层只负责把 steer() 的结果变成速度、把状态机的时间推进下去。
import { ENEMY_HP_PER_WAVE, CHAPTER_HP_BASE, bossHpForChapter } from './difficulty.js';

/**
 * 敌种表。
 * hp/speed/score 是**基础值**，实际值还要加波次成长（见 enemyStats）。
 * desc 是它"做什么"，counter 是"该怎么应对"（构筑一览里给玩家看）。
 */
export const ENEMY_TYPES = {
  crawler: {
    id: 'crawler', name: '贪嘴小鱼', role: 'chaser',
    hp: 1, radius: 14, speed: 52, score: 10,
    desc: '贴身追着你咬，数量取胜',
    counter: '很脆，但会围上来 —— 留出走位空间，别被按在墙角',
  },
  spore: {
    id: 'spore', name: '水母', role: 'ranged',
    hp: 2, radius: 16, speed: 44, score: 20,
    desc: '与你保持距离并射击',
    counter: '它怕近战 —— 贴上去或用远程压制，「机动」构筑更从容',
  },
  swarm: {
    id: 'swarm', name: '沙丁鱼群', role: 'swarm',
    hp: 1, radius: 11, speed: 96, score: 8,
    desc: '一次刷出一窝，绕圈扑上来',
    counter: '单发伤害就够 —— 弹数、爆裂、穿透类装备吃得很饱',
  },
  bud: {
    id: 'bud', name: '海葵', role: 'splitter',
    hp: 4, radius: 23, speed: 34, score: 35,
    desc: '死亡后分裂成两只贪嘴小鱼',
    counter: '需要范围伤害一次清干净，否则越打越多',
  },
  moth: {
    id: 'moth', name: '毒水母', role: 'bomber',
    hp: 1, radius: 12, speed: 38, score: 14,
    desc: '慢慢飘过来，被击杀时炸开一团残留毒素',
    counter: '别让它死在你脚下 —— 拉开距离打，或用范围伤害提前引爆远处',
  },
  charger: {
    id: 'charger', name: '旗鱼', role: 'dasher',
    hp: 2, radius: 15, speed: 60, score: 18,
    desc: '蓄力后朝你锁定的方向直线冲刺',
    counter: '冲刺会打断它的蓄力 —— 「机动」构筑能主动撞断它',
  },
  husk: {
    id: 'husk', name: '铁壳蟹', role: 'tank',
    hp: 8, radius: 24, speed: 26, score: 60,
    desc: '血量过半会结壳免伤，壳碎时分裂出碎片',
    counter: '爆发不够就打不穿壳 —— 低射速构筑会在这里被拖住',
  },
  huskling: {
    id: 'huskling', name: '蟹壳碎屑', role: 'swarm',
    hp: 1, radius: 10, speed: 110, score: 8,
    desc: '铁壳蟹碎裂时甩出的碎片',
    counter: '脆但极快 —— 壳碎的那一瞬间不要站在原地',
  },
  weaver: {
    id: 'weaver', name: '墨鱼', role: 'ranged',
    hp: 3, radius: 16, speed: 70, score: 40,
    desc: '绕着你转，射出黏滞的墨弹（命中会减速）',
    counter: '被蛛弹黏住就甩不掉 —— 「机动」构筑能一直保持距离',
  },
  boss: {
    id: 'boss', name: '深渊巨鲸', role: 'boss',
    hp: 40, radius: 54, speed: 30, score: 400,
    desc: '每 5 波一场，分三个阶段',
    counter: '阶段会换弹幕与移速 —— 盯着它的动作打，别站在弹幕的圆周上',
  },
};

export const ENEMY_TYPE_IDS = Object.keys(ENEMY_TYPES);

export function enemyBase(type) {
  return ENEMY_TYPES[type] || ENEMY_TYPES.crawler;
}

/** 敌种 → 名字（UI 用） */
export function enemyName(type) {
  return enemyBase(type).name;
}

/** 敌种 → 应对提示（构筑一览里给玩家看） */
export function counterHint(type) {
  return enemyBase(type).counter;
}

/**
 * 死因 → 玩家能读的名字。
 *
 * 为什么结算页要写"你死于什么"：这一轮的核心主张是"敌人会向构筑提问"，
 * 那么**死因就是最直接的证据** —— 玩家看到"死于旗鱼"，下一次就会想着躲它。
 * 只写"你死了"等于浪费了这条信息。
 */
export function deathCauseName(cause) {
  switch (cause) {
    case 'moth_cloud': return '毒云';
    case 'hazard': return '深海炸弹';
    case 'bullet': return '敌方弹幕';
    case 'boss': return '深渊巨鲸';
    case 'spore': return '孢子的弹幕';
    case 'weaver': return '墨鱼的蛛弹';
    default:
      return ENEMY_TYPES[cause]?.name || '不明之敌';
  }
}

/**
 * 每一波的敌种名册（按波次逐步解锁）。
 *
 * 为什么按波解锁而不是随机：新手波全是贪嘴小鱼没有判断价值，
 * 而**每一波都能看到新怪**是肉鸽推进感的主要来源之一。
 */
export const TYPE_UNLOCK = {
  crawler: 1,
  spore: 2,
  swarm: 3,
  bud: 4,
  moth: 5,
  charger: 6,
  weaver: 7,
  husk: 9,
};

/** 第 wave 波会出现哪些敌种（纯函数） */
export function waveRoster(wave) {
  const w = Math.max(1, Math.floor(wave));
  return ENEMY_TYPE_IDS.filter((id) => (TYPE_UNLOCK[id] ?? 99) <= w && id !== 'boss' && id !== 'huskling');
}

/** 某一章（5 波）会遇到的全部敌种 —— 构筑一览的「本章威胁」用这个 */
export function chapterThreats(chapterIndex) {
  return chapterTypeIds(chapterIndex).map((id) => ({ id, ...enemyBase(id) }));
}

/** 某一章会出现的敌种 id（该章 5 波的名册并集） */
export function chapterTypeIds(chapterIndex) {
  const idx = Math.max(1, Math.floor(chapterIndex));
  const waves = [(idx - 1) * 5 + 1, (idx - 1) * 5 + 5];
  const set = new Set();
  for (let w = waves[0]; w <= waves[1]; w++) {
    for (const t of waveRoster(w)) set.add(t);
  }
  return [...set];
}

/**
 * 血量成长（普通怪：章内线性 + 章间台阶；Boss：按章查表）。
 *
 * 台阶的来历见 systems/difficulty.js 的 CHAPTER_HP_BONUS：
 * 玩家的强度是按章台阶上去的（火力等级 +1 + 章首装备），
 * 需求必须**在同一个地方**台阶，否则后面几章玩家越滚越强。
 *
 * ⚠️ Boss 改成了**按章查表**（第九轮）：旧公式是按"保底火力"标定的，
 * 玩家 DPS 涨到保底线的 2~3 倍之后 Boss 变成 7 秒纸糊。
 * 详见 systems/difficulty.js 的 BOSS_HP_BY_CHAPTER 注释。
 */
export function hpBonusOf(type, wave) {
  const w = Math.max(1, Math.floor(wave));
  if (type === 'boss') {
    const chapter = Math.floor((w - 1) / 5) + 1;   // w5 → 第 1 章
    return bossHpForChapter(chapter) - ENEMY_TYPES.boss.hp;
  }
  const chapter = Math.floor((w - 1) / 5);           // 0 起
  const inChapter = (w - 1) % 5;
  // 章间台阶是**乘法**（CHAPTER_HP_BASE 递归算好的表）——
  // 绝对加值会在章交界处暴增（实测第 5→6 波需求 ×4 ⇒ 机器人直接死）。
  const base = CHAPTER_HP_BASE[Math.min(chapter, CHAPTER_HP_BASE.length - 1)] || 0;
  return base + Math.floor(inChapter * ENEMY_HP_PER_WAVE);
}

/** 速度成长 */
export function speedBonusOf(type, wave) {
  const w = Math.max(1, Math.floor(wave));
  return type === 'boss' ? Math.min(w, 12) : Math.min(w * 4, 46);
}

/**
 * 敌种在某一波的实际属性。
 * mods 是章节主题给的修正量（血量/速度倍率）。
 */
export function enemyStats(type, wave, mods = null) {
  const base = enemyBase(type);
  const w = Math.max(1, Math.floor(wave));
  const m = mods || {};
  const hpMul = (m.enemyHpMul ?? 1) * (type === 'boss' ? (m.bossHpMul ?? 1) : 1);
  const speedMul = m.enemySpeedMul ?? 1;
  return {
    type,
    hp: Math.max(1, Math.round((base.hp + hpBonusOf(type, w)) * hpMul)),
    radius: base.radius,
    speed: Math.round((base.speed + speedBonusOf(type, w)) * speedMul),
    score: base.score,
  };
}

/* ── 精英（异变体）───────────────────────────────────────── */

/**
 * 精英词缀：一只被"改造"过的怪。
 *
 * 为什么要词缀而不是直接给一个更胖的怪：胖怪只是"更多血"，
 * 词缀改的是**它怎么打你** —— 这才是构筑要回答的问题。
 */
export const ELITE_AFFIXES = {
  swift: {
    id: 'swift', name: '疾行', desc: '速度 ×1.5，血量 ×0.85',
    hpMul: 0.85, speedMul: 1.5, tint: '7fd8ff',
  },
  bulwark: {
    id: 'bulwark', name: '硬化', desc: '血量 ×1.6，速度 ×0.75，免疫击退',
    hpMul: 1.6, speedMul: 0.75, noKnockback: true, tint: '9fb4c8',
  },
  splitter: {
    id: 'splitter', name: '分裂', desc: '死亡时分裂出两只同类',
    hpMul: 1.15, speedMul: 1, splitOnDeath: 2, tint: 'b6ff7a',
  },
  volatile: {
    id: 'volatile', name: '爆烈', desc: '死亡时炸开一团毒云',
    hpMul: 1.1, speedMul: 1, blastOnDeath: true, tint: 'ff9f5d',
  },
  veiled: {
    id: 'veiled', name: '帷幕', desc: '每 3 秒张开 0.9 秒的护盾',
    hpMul: 1.25, speedMul: 0.9, shieldCycleMs: 3000, shieldMs: 900, tint: 'c9a6ff',
  },
};

export const ELITE_AFFIX_IDS = Object.keys(ELITE_AFFIXES);

/** 精英的血量倍率（相对同种普通怪） */
export const ELITE_HP_MUL = 2.6;

/** 精英出场的波次：每章第 2 波（章首抽卡之后立刻检验构筑） */
export function isEliteWave(wave) {
  const w = Math.max(1, Math.floor(wave));
  return w >= 2 && (w - 2) % 5 === 0;
}

/** 精英可以是哪些敌种（受波次解锁限制） */
export function eliteTypesForWave(wave) {
  const w = Math.max(1, Math.floor(wave));
  return ['crawler', 'spore', 'bud', 'moth', 'charger', 'weaver', 'husk']
    .filter((id) => (TYPE_UNLOCK[id] ?? 99) <= w);
}

/** 精英的属性 */
export function eliteStats(elite, wave, mods = null) {
  if (!elite) return null;
  const s = enemyStats(elite.type, wave, mods);
  const affix = ELITE_AFFIXES[elite.affix] || null;
  return {
    ...s,
    hp: Math.max(1, Math.round(s.hp * ELITE_HP_MUL * (affix?.hpMul ?? 1))),
    speed: Math.max(1, Math.round(s.speed * (affix?.speedMul ?? 1))),
    score: Math.round(s.score * 4),
    elite: true,
    affix: elite.affix,
  };
}

/** 造一个可复现的随机器（同一 seed + salt 必得同一序列） */
function makeRng(seed, salt) {
  let a = (Math.imul(seed >>> 0, 9301) + Math.imul(salt >>> 0, 49297)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 这一波的精英：类型 + 词缀（同一 wave + seed 必得同一只）。
 *
 * 确定性来自**纯函数**：波次编排与平衡脚本都要能算出"这一波会有什么样的精英"，
 * 否则覆盖度口径就漏了精英（见 systems/pressure.js）。
 */
export function eliteForWave(wave, seed = 1) {
  const w = Math.max(1, Math.floor(wave));
  if (!isEliteWave(w)) return null;
  const rng = makeRng(seed, w * 7919 + 13);
  const types = eliteTypesForWave(w);
  if (!types.length) return null;
  const type = types[Math.floor(rng() * types.length) % types.length];
  const affix = ELITE_AFFIX_IDS[Math.floor(rng() * ELITE_AFFIX_IDS.length) % ELITE_AFFIX_IDS.length];
  return { type, affix };
}

/* ── 行为 ──────────────────────────────────────────────── */

/** 旗鱼的三个阶段 */
export const CHARGER = {
  windMs: 800,   // 蓄力（此时方向已锁定，玩家有 0.8 秒反应）
  dashMs: 300,   // 冲刺
  restMs: 420,   // 硬直（冲刺后动不了 —— 玩家的输出窗口）
  dashMul: 5.2,  // 冲刺速度倍率
};

/**
 * 旗鱼的状态机（纯函数）。
 *
 * 关键：**方向在进入蓄力时就锁定**，不是冲刺时才瞄准 ——
 * 否则玩家看到它"冲过来"时已经躲不开了，那是不可读的。
 *
 * @param {{phase?:string,timer?:number,lock?:{x:number,y:number}}} state
 * @param {number} dtMs 本帧经过的毫秒
 * @param {{x:number,y:number}} toPlayer 指向玩家的单位向量（只在锁向时用）
 */
export function chargerStep(state = {}, dtMs = 0, toPlayer = { x: 0, y: 0 }) {
  let phase = state.phase || 'wind';
  let timer = (state.timer ?? CHARGER.windMs) - dtMs;
  let lock = state.lock || { x: 0, y: 0 };
  let event = null;
  if (phase === 'wind') {
    if (timer <= 0) { phase = 'dash'; timer = CHARGER.dashMs; event = 'dash'; }
  } else if (phase === 'dash') {
    if (timer <= 0) { phase = 'rest'; timer = CHARGER.restMs; event = 'rest'; }
  } else {
    if (timer <= 0) {
      phase = 'wind';
      timer = CHARGER.windMs;
      lock = { x: toPlayer.x, y: toPlayer.y };
      event = 'lock';
    }
  }
  return { phase, timer, lock, event };
}

/** 铁壳蟹的结壳规则 */
export const HUSK = {
  shellAt: 0.45,  // 血量比例低于此值开始结壳
  shellMs: 1100,  // 结壳持续
  split: 2,       // 壳碎时甩出几片
};

/**
 * 铁壳蟹的结壳状态机（纯函数）。
 * 结壳期间**免疫伤害** —— 这是"爆发不够"最直接的表达。
 */
export function huskStep(state = {}, dtMs = 0, hp = 0, maxHp = 0) {
  let shelling = !!state.shelling;
  let timer = (state.timer ?? 0) - dtMs;
  // 一生只结一次壳：否则它永远在 45% 血量以下 → 壳碎了立刻再结 → **无限免伤**。
  // 「爆发不够会被拖住」是设计意图，「永远打不死」是 bug。
  // 「已经结过一次」这件事必须能从状态里读出来：
  // 只要此刻正结着壳，就认为这次机会已经用掉（否则状态被外部构造出来时能钻空子）。
  let used = !!state.used || shelling;
  let event = null;
  if (!shelling && !used && maxHp > 0 && hp > 0 && hp / maxHp <= HUSK.shellAt) {
    shelling = true;
    used = true;
    timer = HUSK.shellMs;
    event = 'shell';
  } else if (shelling && timer <= 0) {
    shelling = false;
    timer = 0;
    event = 'break';
  }
  return { shelling, timer, used, event };
}

/** 墨鱼的蛛弹：命中让玩家减速 */
export const PLAYER_SLOW = { factor: 0.68, ms: 1200 };

/** 毒水母死亡留下的毒云 */
export const MOTH_CLOUD = { radius: 62, lifeMs: 2600, tickMs: 500 };

/**
 * 敌人这一帧的移动意图（纯函数）。
 *
 * 返回的 vx/vy 是**单位方向**（长度 ≤ 1），由场景乘以速度 ——
 * 这样"往哪走"是规则，"走多快"是数值，两边可以分别测。
 *
 * @param {string} type 敌种
 * @param {object} ctx
 *   dx, dy  从敌人指向玩家的向量（未归一化）
 *   dist    与玩家的距离
 *   t       本局已进行的秒数（周期行为用）
 *   state   该敌人的私有状态（旗鱼 / 铁壳蟹用）
 */
export function enemySteer(type, ctx) {
  const dx = ctx.dx || 0;
  const dy = ctx.dy || 0;
  const dist = ctx.dist ?? Math.hypot(dx, dy);
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  const t = ctx.t || 0;
  const state = ctx.state || {};

  switch (type) {
    case 'spore': {
      // 远处靠近、太近后退、中间绕圈
      const approach = dist > 250 ? 1 : (dist < 185 ? -1 : 0);
      const strafe = Math.sin(t * 1.4 + (state.phase || 0)) * 0.7;
      return { vx: ux * approach - uy * strafe, vy: uy * approach + ux * strafe };
    }
    case 'moth': {
      // 慢速斜向飘：轨迹是波浪，不是直线（直线太容易预判）
      const wob = Math.sin(t * 2.2 + (state.phase || 0)) * 0.55;
      return { vx: ux * 0.85 - uy * wob, vy: uy * 0.85 + ux * wob };
    }
    case 'charger': {
      const phase = state.phase || 'wind';
      if (phase === 'dash') {
        const lock = state.lock || { x: ux, y: uy };
        return { vx: lock.x, vy: lock.y };
      }
      // 蓄力与硬直都不动：一个是给玩家反应时间，一个是输出窗口
      return { vx: 0, vy: 0 };
    }
    case 'weaver': {
      // 维持 210~260 的环带并持续绕圈
      const band = 235;
      const approach = dist > band + 25 ? 1 : (dist < band - 25 ? -1 : 0);
      const strafe = 0.95;
      return { vx: ux * approach - uy * strafe, vy: uy * approach + ux * strafe };
    }
    case 'husk':
    case 'huskling':
    case 'bud':
    case 'crawler':
    case 'swarm':
    default:
      return { vx: ux, vy: uy };
  }
}

/** 敌种的射击意图（纯函数）：返回 null 表示不射击 */
export function enemyFirePlan(type, state = {}) {
  switch (type) {
    case 'spore':
      return { count: 1, cooldownMs: 1500, speed: 150, slow: false };
    case 'weaver':
      return { count: 1, cooldownMs: 1600, speed: 132, slow: true };
    default:
      return null;
  }
}
