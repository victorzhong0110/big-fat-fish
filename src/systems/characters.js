// 角色池：局与局之间最直观的差异来源。
//
// 角色 = 起始数值修正 + 一条被动 + 一件起始装备。
//
// 设计约束（沿用 DECISIONS §8）：
// 1. 角色也只改**属性表**，不直接改玩法代码 —— 与装备共用同一套表达。
// 2. 角色的起始装备**进入 run.relics 的第一个位置**，
//    因此它会：出现在 HUD 徽章上、出现在结算页、并从抽卡池里被移除。
//    → 换角色等于换掉牌池里的一张牌，"每局长得不一样"多了一层来源。
import { createStats, relicById, deepenRelic, applyDeepenTagBonus } from './relics.js';
import { applyArchetypes } from './archetypes.js';

/**
 * @typedef {Object} Character
 * @property {string} id
 * @property {string} name 名字
 * @property {string} title 称号
 * @property {string} desc 玩法描述（UI 展示）
 * @property {string[]} notes 数值摘要（UI 展示）
 * @property {string} startRelic 起始装备 id
 * @property {(s:object)=>void} apply 对属性表的修正
 * @property {number} unlockCost 解锁所需潮水（0 = 默认解锁）
 */

export const CHARACTERS = [
  {
    id: 'gardener',
    name: '大肥鱼',
    title: '吃白饭的大肥鱼',
    desc: '用一碗饭换命：血更厚，每章回一点血，靠续航磨死敌人。',
    notes: ['生命 6', '每章回复 1', '移速 -5%'],
    startRelic: 'nectary',
    unlockCost: 0,
    apply: (s) => { s.maxHpAdd += 1; s.chapterHeal += 1; s.moveSpeedMul *= 0.95; },
  },
  {
    id: 'scout',
    name: '急先锋',
    title: '别叫我摸鱼',
    desc: '用速度换容错：伤害更高、射得更快、暴击更狠，但血薄得经不起一次失误。',
    notes: ['生命 4', '每发伤害 +1', '射速 +18%', '暴击率 +12%'],
    startRelic: 'swift_pollen',
    unlockCost: 0,
    apply: (s) => {
      s.maxHpAdd -= 1;
      s.damageAdd += 1;
      s.cooldownMul *= 0.85;
      s.critChance += 0.12;
      s.critMultAdd += 0.4;
    },
  },
  {
    id: 'apothecary',
    name: '夜宵厨师',
    title: '续命的汤锅',
    desc: '不靠硬扛，靠续命：击杀会回复生命，但初始血量更薄。',
    notes: ['生命 4', '每 8 杀回 1 血', '击杀回血 +12%'],
    // 起始装备必须是**默认可用**的（否则会拿到一件局外还没解锁的牌，语义不对）
    startRelic: 'bulwark_bud',
    unlockCost: 0,
    apply: (s) => {
      s.maxHpAdd -= 1;
      s.killHealEvery = 8;
      s.killHealChance += 0.12;
    },
  },
  {
    id: 'windrunner',
    name: '摸鱼达人',
    title: '上班时间到了',
    desc: '不靠站得稳，靠跑得快：移速与冲刺都强，但初始血量更薄。',
    notes: ['生命 4', '移速 +12%', '冲刺冷却 -35%'],
    startRelic: 'long_root',
    unlockCost: 0,
    apply: (s) => {
      s.maxHpAdd -= 1;
      s.moveSpeedMul *= 1.12;
      s.dashCooldownMul *= 0.65;
    },
  },
  {
    id: 'smith',
    name: '铁甲蟹',
    title: '壳硬心软',
    desc: '用机动换硬度：血最厚，撞到敌人会反弹伤害，但跑不快、冲刺也更慢。',
    notes: ['生命 6', '海胆棘刺反伤 3', '移速 -10%', '冲刺冷却 +25%'],
    startRelic: 'boiling_nectar',
    unlockCost: 0,
    apply: (s) => {
      s.maxHpAdd += 1;
      s.moveSpeedMul *= 0.9;
      s.dashCooldownMul *= 1.25;
      s.thorns = 3;
    },
  },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export function characterById(id) {
  return CHARACTER_BY_ID[id] || null;
}

/** 默认角色（玩家还没选过时的兜底） */
export const DEFAULT_CHARACTER = 'gardener';

/**
 * 把角色的修正写进属性表（原地修改）。
 * @param {object} stats 属性表
 * @param {string|object} character 角色 id 或角色对象
 */
export function applyCharacter(stats, character) {
  const ch = typeof character === 'string' ? characterById(character) : character;
  if (ch?.apply) ch.apply(stats);
  return stats;
}

/**
 * 算出一局的最终属性表 = 角色修正 + 装备修正 + 流派协同。
 * 顺序：先角色，后装备（装备是叠加层，可以盖过角色的起点），
 * 最后套流派加成（流派是"整体"层面的加成，必须在单件装备之后）。
 * @param {string[]} relicIds 装备 id 列表（第一个是角色起始装备）
 * @param {string|object} character 角色 id 或角色对象
 */
export function applyBuild(relicIds = [], character = null, deepened = {}) {
  const stats = createStats();
  applyCharacter(stats, character);
  for (const id of relicIds) {
    const r = relicById(id);
    if (!r) continue;
    r.apply(stats);
    // 深化：同一张装备每多一层，就再叠一次它的效果；
    // **第二层起**额外给该标签的专属加成（见 relics.js 的 DEEPEN_TAG_BONUS）
    const layers = Math.max(0, deepened[id] || 0);
    if (layers > 0) {
      const deep = deepenRelic(id);
      for (let i = 0; i < layers; i++) {
        deep.apply(stats);
        if (i >= 1) applyDeepenTagBonus(stats, r.tag);
      }
    }
  }
  applyArchetypes(stats, relicIds);
  return stats;
}

/** 角色的起始装备 id（没有则 null） */
export function startRelicOf(character) {
  const ch = typeof character === 'string' ? characterById(character) : character;
  return ch?.startRelic || null;
}

/**
 * 一局开始时的装备列表 = 角色起始装备。
 * （抽到的东西后面再 push 进去。）
 */
export function initialRelics(character) {
  const id = startRelicOf(character);
  return id ? [id] : [];
}

/** 角色列表（UI 展示用，带起始装备的名字） */
export function characterCards(characters = CHARACTERS) {
  return characters.map((c) => ({
    id: c.id,
    name: c.name,
    title: c.title,
    desc: c.desc,
    notes: c.notes,
    startRelicName: relicById(c.startRelic)?.name || '—',
    startRelicDesc: relicById(c.startRelic)?.desc || '',
    unlockCost: c.unlockCost,
  }));
}
