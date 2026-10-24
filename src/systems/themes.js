// 章节主题：一局之内，宏观层面的随机性。
//
// 主题不是「换皮」，而是对当章的波次编排施加一组可断言的修正量（mods）。
// 波次编排只认 mods，不认主题名——这样主题可以自由增删而不动 waveDirector。

/** 无主题时的中性修正量 */
export const NEUTRAL_MODS = {
  enemyHpMul: 1,       // 敌人血量系数
  enemySpeedMul: 1,    // 敌人速度系数
  enemyCountMul: 1,    // 敌人数量系数
  bossHpMul: 1,        // Boss 血量系数
  typeBias: {},        // 敌人类型偏置：{ swarm: 3 } 表示贪嘴小鱼里三成变沙丁鱼群
  scoreMul: 1,         // 得分系数
  dropMul: 1,          // 掉落概率系数
  dewMul: 1,           // 潮水收入系数（路线用：潮水是"备战"的货币）
  hazardEverySec: 0,   // 每隔多少秒空投一枚深海炸弹（0 = 不投）
};

export const THEME_POOL = [
  {
    id: 'swarm_tide', name: '鱼潮', desc: '沙丁鱼成倍涌现',
    mods: { typeBias: { swarm: 3 }, enemySpeedMul: 1.05, enemyCountMul: 1.05 },
  },
  {
    id: 'spore_rain', name: '水母雨', desc: '水母从远处漂来',
    mods: { typeBias: { spore: 3 }, enemySpeedMul: 0.95 },
  },
  {
    id: 'bud_field', name: '海葵阵', desc: '海葵从礁缝里探出',
    mods: { typeBias: { bud: 3 } },
  },
  {
    id: 'gale', name: '急流季', desc: '敌人更快更密，但得分更高',
    mods: { enemySpeedMul: 1.25, enemyCountMul: 1.15, scoreMul: 1.2 },
  },
  {
    id: 'fumigation', name: '毒云', desc: '深海炸弹不停落下',
    mods: { hazardEverySec: 6, enemyCountMul: 0.9 },
  },
  {
    id: 'silence', name: '静默深渊', desc: '不掉落任何补给，但得分 x1.6',
    mods: { dropMul: 0, scoreMul: 1.6, enemyCountMul: 1.1 },
  },
  {
    id: 'feast', name: '盛宴', desc: '敌人更脆，但数量更多',
    mods: { enemyHpMul: 0.8, enemyCountMul: 1.35 },
  },
  {
    id: 'carapace', name: '重甲', desc: '敌人更硬更少，但得分更高',
    mods: { enemyHpMul: 1.35, enemyCountMul: 0.8, scoreMul: 1.15 },
  },
  // 第四轮末补的 4 个：一局有 4 章，从 8 个主题里抽，
  // 重复概率不低；主题池越大，"这一章长什么样"的组合就越多。
  {
    id: 'night_run', name: '夜潜', desc: '夜里的敌人更快，但月光下分数与掉落更高',
    mods: { enemySpeedMul: 1.25, scoreMul: 1.3, dropMul: 1.25 },
  },
  {
    id: 'bloom_tide', name: '鱼汛', desc: '鱼汛：敌人更多，但都更脆，掉落也更充足',
    mods: { enemyCountMul: 1.3, enemyHpMul: 0.9, dropMul: 1.6 },
  },
  {
    id: 'wither', name: '荒芜', desc: '敌人皮厚但迟钝，分数更高',
    mods: { enemyHpMul: 1.3, enemySpeedMul: 0.9, scoreMul: 1.2 },
  },
  {
    id: 'surge', name: '潮涌', desc: '敌人又多又快，但补给变少',
    mods: { enemyCountMul: 1.15, enemySpeedMul: 1.15, dropMul: 0.8 },
  },
  // 第五轮补的 3 个：主题偏置改成"直接加权"之后，
  // 新敌种（毒水母 / 旗鱼 / 铁壳蟹）也能当主题的主角 ——
  // 「这一章长什么样」是肉鸽"每局长得不一样"最直接的一层。
  {
    id: 'moth_swarm', name: '水母汛', desc: '毒水母成群飘来，死了还会留下毒云',
    mods: { typeBias: { moth: 3 }, enemyCountMul: 1.1 },
  },
  {
    id: 'vine_lash', name: '旗鱼阵', desc: '旗鱼四处蓄力冲刺，别站着不动',
    mods: { typeBias: { charger: 3 }, enemySpeedMul: 1.1 },
  },
  {
    id: 'husk_field', name: '甲壳地', desc: '铁壳蟹成群结壳，打不穿就会被拖住',
    mods: { typeBias: { husk: 3 }, enemyCountMul: 0.9, enemyHpMul: 1.1 },
  },
];

export const THEME_BY_ID = Object.fromEntries(THEME_POOL.map((t) => [t.id, t]));

export function themeById(id) {
  return THEME_BY_ID[id] || null;
}

/** 主题 → 完整 mods（缺省项补齐） */
export function themeMods(theme) {
  return { ...NEUTRAL_MODS, ...(theme?.mods || {}) };
}

/**
 * 抽一个主题：不会抽到 excludeId（避免相邻两章重复）。
 * @param {() => number} rng
 * @param {string} [excludeId]
 */
export function pickTheme(rng, excludeId = null) {
  const pool = THEME_POOL.filter((t) => t.id !== excludeId);
  const list = pool.length ? pool : THEME_POOL;
  return list[Math.floor(rng() * list.length) % list.length];
}
