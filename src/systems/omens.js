// 章内异象：章节中段的一次「二选一」。
//
// 抽卡解决的是「我要往哪个方向长」，异象解决的是「我愿意为这个方向付出什么」。
// 因此异象的每个选项都必须**有代价**——只给好处的东西不叫选择，叫补给。
//
// 效果用声明式描述，纯逻辑层只负责「抽到哪个异象、给出哪两个选项」；
// 真正结算在场景适配层完成，因为有的效果是立刻回血/掉血，不是属性表能表达的。
//
// 两种效果分开处理：
// - kind:'stat'  → 改属性表，**永久生效**（存进 run.omenStats，每次重算属性表时叠加）
// - kind:'heal'/'hurt'/'dew'/'shield' → 立刻结算一次
//
// 参见 DECISIONS §7 第 4 条（章内小事件）。

/**
 * 每个属性字段的「方向」：true = 越高越好，false = 越高越糟。
 * 方向必须写全——判断一个异象选项是不是纯增益，取决于每个字段是好是坏：
 * cooldownMul 乘 1.08（射速变慢）是代价，moveSpeedMul 乘 1.12 才是好处。
 * 漏写一个字段 = 漏判一次代价 = 出现"白给"的选项。
 */
export const OMEN_STAT_DIRECTION = {
  // 攻击
  damageAdd: true, damageMul: true, bulletsAdd: true, bulletSpeedAdd: true,
  critChance: true, critMultAdd: true, pierce: true,
  cooldownMul: false, spreadAddDeg: false, // 射击间隔越大越慢；散布越大越不准
  cooldownAddMs: false, // 同上：加的是"多等一会儿"，越大越糟
  rangeAdd: true,
  // 生存
  maxHpAdd: true, invulnAddMs: true, shieldMax: true, shieldPerChapter: true, thorns: true,
  chapterHeal: true, killHealEvery: true, killHealChance: true,
  // 机动
  moveSpeedMul: true, pickupRadiusAdd: true, dashCooldownMul: false,
  // 「机动手段」的来源标记（第九轮）：异象目前不改它，
  // 但它必须在白名单里 —— 白名单漏字段 = 那个效果被静默丢弃（这条测试抓到过）。
  moveSpeedBonus: true,
  // 规则
  scoreMul: true, comboWindowAddMs: true, rageMs: true, rageMul: true, extraDraft: true,
  // 转化（与装备共用同一套字段，见 systems/transforms.js）
  comboDamagePerStack: true, comboDamageCap: true,
  lowHpDamageMul: true, lowHpThreshold: true, // 阈值越高越早触发 → 越好
  slowOnHit: true, slowDurationMs: true,
  killDamagePerKill: true, killDamageCap: true,
  explodeDamage: true, explodeRadius: true,
  // 站在敌人那边
  enemyHpMul: false, enemyCountMul: false,
};

/** 属性表里可以被异象改动的字段（白名单，防止拼错字段名静默失效） */
export const OMEN_STAT_KEYS = new Set(Object.keys(OMEN_STAT_DIRECTION));

/** 这些属性「越高越糟」——它们是站在敌人那边的系数 */
export const OMEN_ADVERSE_STATS = new Set(
  Object.keys(OMEN_STAT_DIRECTION).filter((k) => !OMEN_STAT_DIRECTION[k]),
);

/**
 * 这个选项里有没有「代价」——纯增益的东西不叫选择，叫补给。
 * 纯函数，放在数据旁边，规则和数据一起被测。
 */
export function optionHasCost(effects = []) {
  for (const e of effects) {
    if (e.kind === 'hurt' && e.value > 0) return true;
    if (e.kind === 'dew' && e.value < 0) return true;
    if (e.kind !== 'stat') continue;
    const better = OMEN_STAT_DIRECTION[e.stat];
    if (better === undefined) continue; // 未知字段不参与判断
    if (e.op === 'add') {
      if (better ? e.value < 0 : e.value > 0) return true;
    } else if (e.op === 'mul') {
      if (better ? e.value < 1 : e.value > 1) return true;
    }
  }
  return false;
}

/**
 * 异象池。
 * 每个异象两个互斥选项；效果列表里的 stat 项会永久改写属性表。
 */
export const OMEN_POOL = [
  {
    id: 'withered_bed',
    name: '枯萎的珊瑚床',
    desc: '一排干透的珊瑚，根还活着。',
    options: [
      {
        id: 'offer', name: '献祭', desc: '生命 -2，每发伤害 +30%',
        effects: [{ kind: 'hurt', value: 2 }, { kind: 'stat', stat: 'damageMul', op: 'mul', value: 1.3 }],
      },
      {
        id: 'draw', name: '汲取', desc: '回复 2 生命，每发伤害 -15%',
        effects: [{ kind: 'heal', value: 2 }, { kind: 'stat', stat: 'damageMul', op: 'mul', value: 0.85 }],
      },
    ],
  },
  {
    id: 'golden_pollen',
    name: '金色浮游',
    desc: '一小团悬在空中的金粉，像碎掉的日光。',
    options: [
      {
        id: 'gather', name: '采集', desc: '获得 12 潮水，敌人生命 +15%',
        effects: [{ kind: 'dew', value: 12 }, { kind: 'stat', stat: 'enemyHpMul', op: 'mul', value: 1.15 }],
      },
      {
        id: 'sift', name: '淘洗', desc: '敌人生命 -10%，失去 8 潮水',
        effects: [{ kind: 'stat', stat: 'enemyHpMul', op: 'mul', value: 0.9 }, { kind: 'dew', value: -8 }],
      },
    ],
  },
  {
    id: 'deep_roots',
    name: '深根',
    desc: '海床裂开，底下是纠缠成团的根。',
    options: [
      {
        id: 'root', name: '扎根', desc: '最大生命 +2，移动速度 -12%',
        effects: [{ kind: 'stat', stat: 'maxHpAdd', op: 'add', value: 2 }, { kind: 'stat', stat: 'moveSpeedMul', op: 'mul', value: 0.88 }],
      },
      {
        id: 'uproot', name: '拔根', desc: '移动速度 +12%，最大生命 -1',
        effects: [{ kind: 'stat', stat: 'moveSpeedMul', op: 'mul', value: 1.12 }, { kind: 'stat', stat: 'maxHpAdd', op: 'add', value: -1 }, { kind: 'hurt', value: 1 }],
      },
    ],
  },
  {
    id: 'hive',
    name: '野生鱼巢',
    desc: '悬在暗流里的鱼巢，窸窣声让人牙酸。',
    options: [
      {
        id: 'enrage', name: '激怒', desc: '敌人数量 +25%，每发伤害 +2',
        effects: [{ kind: 'stat', stat: 'enemyCountMul', op: 'mul', value: 1.25 }, { kind: 'stat', stat: 'damageAdd', op: 'add', value: 2 }],
      },
      {
        id: 'smoke', name: '熏走', desc: '敌人数量 -15%，射击间隔 +8%',
        effects: [{ kind: 'stat', stat: 'enemyCountMul', op: 'mul', value: 0.85 }, { kind: 'stat', stat: 'cooldownMul', op: 'mul', value: 1.08 }],
      },
    ],
  },
  {
    id: 'dewdrop',
    name: '悬露',
    desc: '一颗不落地的水珠，映出整片海。',
    options: [
      {
        id: 'catch', name: '承接', desc: '回复 3 生命，移动速度 -8%',
        effects: [{ kind: 'heal', value: 3 }, { kind: 'stat', stat: 'moveSpeedMul', op: 'mul', value: 0.92 }],
      },
      {
        id: 'seal', name: '封存', desc: '获得 14 潮水，最大生命 -1',
        effects: [{ kind: 'dew', value: 14 }, { kind: 'stat', stat: 'maxHpAdd', op: 'add', value: -1 }],
      },
    ],
  },
  {
    id: 'withered_vine',
    name: '枯藤',
    desc: '一段干枯的触须，缠得又紧又牢。',
    options: [
      {
        id: 'bind', name: '缠绕', desc: '护盾上限 +1、每章 +1 护盾，射击间隔 +8%',
        effects: [{ kind: 'stat', stat: 'shieldMax', op: 'add', value: 1 }, { kind: 'stat', stat: 'shieldPerChapter', op: 'add', value: 1 }, { kind: 'stat', stat: 'cooldownMul', op: 'mul', value: 1.08 }],
      },
      {
        id: 'cut', name: '斩断', desc: '射击间隔 -10%，最大生命 -1',
        effects: [{ kind: 'stat', stat: 'cooldownMul', op: 'mul', value: 0.9 }, { kind: 'stat', stat: 'maxHpAdd', op: 'add', value: -1 }, { kind: 'hurt', value: 1 }],
      },
    ],
  },
  {
    id: 'old_echo',
    name: '旧日残影',
    desc: '一条还没长大的鱼，影子先动了。',
    options: [
      {
        id: 'listen', name: '聆听', desc: '连击窗口 +1 秒，得分 -12%',
        effects: [{ kind: 'stat', stat: 'comboWindowAddMs', op: 'add', value: 1000 }, { kind: 'stat', stat: 'scoreMul', op: 'mul', value: 0.88 }],
      },
      {
        id: 'banish', name: '驱散', desc: '得分 +18%，生命 -1',
        effects: [{ kind: 'stat', stat: 'scoreMul', op: 'mul', value: 1.18 }, { kind: 'hurt', value: 1 }],
      },
    ],
  },
  {
    id: 'bud_blessing',
    name: '海葵的祝福',
    desc: '一朵裂开的海葵，缝里透出微光。',
    options: [
      {
        id: 'accept', name: '接受', desc: '击杀爆裂伤害 +2、范围 +20，敌人生命 +10%',
        effects: [{ kind: 'stat', stat: 'explodeDamage', op: 'add', value: 2 }, { kind: 'stat', stat: 'explodeRadius', op: 'add', value: 20 }, { kind: 'stat', stat: 'enemyHpMul', op: 'mul', value: 1.1 }],
      },
      {
        id: 'refuse', name: '拒绝', desc: '受击无敌 +0.5 秒，敌人数量 -10%，最大生命 -1',
        effects: [{ kind: 'stat', stat: 'invulnAddMs', op: 'add', value: 500 }, { kind: 'stat', stat: 'enemyCountMul', op: 'mul', value: 0.9 }, { kind: 'stat', stat: 'maxHpAdd', op: 'add', value: -1 }, { kind: 'hurt', value: 1 }],
      },
    ],
  },
  {
    id: 'gust',
    name: '起风了',
    desc: '暗流从远处涌来，带着咸腥的味道。',
    options: [
      {
        id: 'ride', name: '借风', desc: '弹速 +120，暴击率 +6%，移动速度 -8%',
        effects: [{ kind: 'stat', stat: 'bulletSpeedAdd', op: 'add', value: 120 }, { kind: 'stat', stat: 'critChance', op: 'add', value: 0.06 }, { kind: 'stat', stat: 'moveSpeedMul', op: 'mul', value: 0.92 }],
      },
      {
        id: 'against', name: '逆风', desc: '冲刺冷却 -30%，移动速度 +6%，每发伤害 -1',
        effects: [{ kind: 'stat', stat: 'dashCooldownMul', op: 'mul', value: 0.7 }, { kind: 'stat', stat: 'moveSpeedMul', op: 'mul', value: 1.06 }, { kind: 'stat', stat: 'damageAdd', op: 'add', value: -1 }],
      },
    ],
  },
  {
    id: 'cracked_ground',
    name: '碎裂的地面',
    desc: '地砖裂成蛛网，缝里透出热气。',
    options: [
      {
        id: 'stand', name: '站稳', desc: '每发伤害 +1，移动速度 -10%',
        effects: [{ kind: 'stat', stat: 'damageAdd', op: 'add', value: 1 }, { kind: 'stat', stat: 'moveSpeedMul', op: 'mul', value: 0.9 }],
      },
      {
        id: 'run', name: '疾走', desc: '移动速度 +12%，敌人数量 +10%',
        effects: [{ kind: 'stat', stat: 'moveSpeedMul', op: 'mul', value: 1.12 }, { kind: 'stat', stat: 'enemyCountMul', op: 'mul', value: 1.1 }],
      },
    ],
  },
  {
    id: 'old_bell',
    name: '旧钟',
    desc: '钟埋在土里，只剩半截露在外面。',
    options: [
      {
        id: 'listen', name: '听秒', desc: '连击窗口 +0.8 秒，每层连击每发伤害 +1，但每发伤害 -1',
        effects: [{ kind: 'stat', stat: 'comboWindowAddMs', op: 'add', value: 800 }, { kind: 'stat', stat: 'comboDamagePerStack', op: 'add', value: 1 }, { kind: 'stat', stat: 'damageAdd', op: 'add', value: -1 }],
      },
      {
        id: 'still', name: '停摆', desc: '得分 +15%，每章开始回复 -1',
        effects: [{ kind: 'stat', stat: 'scoreMul', op: 'mul', value: 1.15 }, { kind: 'stat', stat: 'chapterHeal', op: 'add', value: -1 }],
      },
    ],
  },
  {
    id: 'toxic_marsh',
    name: '毒沼',
    desc: '一洼泛着油光的绿水，边缘在冒泡。',
    options: [
      {
        id: 'dive', name: '下潜', desc: '击杀回血概率 +12%，敌人生命 +15%',
        effects: [{ kind: 'stat', stat: 'killHealChance', op: 'add', value: 0.12 }, { kind: 'stat', stat: 'enemyHpMul', op: 'mul', value: 1.15 }],
      },
      {
        id: 'wade', name: '涉水', desc: '敌人生命 -12%，移动速度 -6%',
        effects: [{ kind: 'stat', stat: 'enemyHpMul', op: 'mul', value: 0.88 }, { kind: 'stat', stat: 'moveSpeedMul', op: 'mul', value: 0.94 }],
      },
    ],
  },
  {
    id: 'loose_feather',
    name: '落羽',
    desc: '一片不属于任何鸟的羽毛，贴在地面上一动不动。',
    options: [
      {
        id: 'glide', name: '借它滑行', desc: '弹速 +100，暴击伤害 +40%，最大生命 -1',
        effects: [{ kind: 'stat', stat: 'bulletSpeedAdd', op: 'add', value: 100 }, { kind: 'stat', stat: 'critMultAdd', op: 'add', value: 0.4 }, { kind: 'stat', stat: 'maxHpAdd', op: 'add', value: -1 }],
      },
      {
        id: 'pin', name: '按住它', desc: '冲刺冷却 -30%，受击无敌 +0.3 秒，移动速度 -6%',
        effects: [{ kind: 'stat', stat: 'dashCooldownMul', op: 'mul', value: 0.7 }, { kind: 'stat', stat: 'invulnAddMs', op: 'add', value: 300 }, { kind: 'stat', stat: 'moveSpeedMul', op: 'mul', value: 0.94 }],
      },
    ],
  },
];

export const OMEN_BY_ID = Object.fromEntries(OMEN_POOL.map((o) => [o.id, o]));

/**
 * 抽一个异象（不重复抽已经出现过的）。
 * @param {() => number} rng
 * @param {{taken?:string[]}} opts
 */
export function drawOmen(rng, opts = {}) {
  const taken = opts.taken || [];
  const pool = OMEN_POOL.filter((o) => !taken.includes(o.id));
  const list = pool.length ? pool : OMEN_POOL;
  const idx = Math.floor(rng() * list.length) % list.length;
  return list[idx];
}

/**
 * 这些属性「越高越糟」——它们是站在敌人那边的系数。
 * 判断一个选项是不是「纯增益」时必须区分方向：
 * enemyHpMul 乘 1.15 是代价（敌人更硬），moveSpeedMul 乘 0.88 才是代价。
 */

/** 取出效果列表里的「属性表修正」部分 */
export function statEffects(effects = []) {
  return effects.filter((e) => e.kind === 'stat' && OMEN_STAT_KEYS.has(e.stat));
}

/**
 * 把属性表修正写进 stats（原地修改）。
 * 未知字段直接忽略——异象不该把属性表写坏。
 */
export function applyStatEffects(stats, effects = []) {
  for (const e of statEffects(effects)) {
    if (e.op === 'mul') stats[e.stat] *= e.value;
    else if (e.op === 'add') stats[e.stat] += e.value;
  }
  return stats;
}

/** 取出「立刻结算」的部分 */
export function instantEffects(effects = []) {
  return effects.filter((e) => e.kind !== 'stat');
}
