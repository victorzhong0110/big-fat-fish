// 篝火：章末的休整点（打完 Boss 之后的二选一）。
//
// 为什么要有它（第八轮）：
// 这一局到第七轮为止，**节奏上只有连续的战斗 + 模态面板**：
// 打 → 选路线 → 抽卡 → 打 → 打 …… 没有一个"喘口气"的时刻。
// 而篝火同时解决两件事：
//   ① **节奏**：一章打完之后有一个明确的"结算拍"（肉鸽里的篝火/休息点）；
//   ② **公平**：落后的玩家有**一条回头路**（磨刃），
//      不必因为"这一章手气差"就一路掉到底 ——
//      第四轮记下来的那个问题（「抽到伤害牌 = 抽到死亡牌」）需要一个兜底。
//
// 两个选项刻意做成**同一量级的交换**（生存 ↔ 强度）：
//   休整：回复 3 点生命
//   磨刃：火力等级 +1；**已满级则改为每发伤害 +1**（本局有效）
//
// 纯逻辑：不 import Phaser、不碰 DOM。场景层只负责"把状态机结果落到 run 上"。
import { FIRE_MAX } from './upgrades.js';

/** 篝火的两个选项（顺序 = 面板上的顺序） */
export const CAMP_OPTIONS = [
  {
    id: 'rest',
    name: '蹭珊瑚',
    desc: '回复 3 点生命',
    hint: '挨了打才需要 —— 血量低于一半时它才是对的选项',
  },
  {
    id: 'sharpen',
    name: '磨砺鱼叉',
    desc: '火力等级 +1（已满级则改为潮水 +12）',
    hint: '落后时的回头路；满级后换成备战用的潮水',
  },
];

/** 火力已满时，「磨刃」改给的潮水（备战资源，不再是永久伤害加成） */
export const CAMP_MAX_FIRE_DEW = 12;

/** 休整回多少血 */
export const CAMP_REST_HP = 3;

/**
 * 这个选项现在可选吗？
 * @param {string} id
 * @param {{hp:number,maxHp:number,fireLevel:number}} state
 */
export function campAvailable(id, state) {
  if (id === 'rest') return state.hp < state.maxHp;      // 满血时休整没有意义
  if (id === 'sharpen') return true;
  return false;
}

/**
 * 选一个篝火选项 → 新的状态（纯函数，不改传入对象）。
 *
 * ⚠️ 为什么「满级后」给的是**潮水**而不是「每发伤害 +1」：
 * 最初写的是「每发伤害 +1」，实测（第八轮）**难度直接失控** ——
 * 每章 +1 伤害、4 章叠到 +4（Lv.5 下 5→9 伤害 = **+80% DPS**），
 * 而篝火是**每章都能拿**的 ⇒ 这是一条会自己复利的永久加成。
 * ⇒ 改成给**潮水**（备战货币，不进 DPS 曲线），篝火就只留下「回头路」这一个作用。
 *
 * @param {string} id
 * @param {{hp:number,maxHp:number,fireLevel:number,dew:number}} state
 * @returns {{hp:number,fireLevel:number,dew:number,note:string}}
 */
export function applyCamp(id, state) {
  const next = {
    hp: state.hp,
    maxHp: state.maxHp,
    fireLevel: state.fireLevel,
    dew: state.dew || 0,
    note: '',
  };
  if (id === 'rest') {
    const before = next.hp;
    next.hp = Math.min(next.maxHp, next.hp + CAMP_REST_HP);
    next.note = `回复 ${next.hp - before} 点生命`;
    return next;
  }
  if (id === 'sharpen') {
    if (next.fireLevel < FIRE_MAX) {
      next.fireLevel += 1;
      next.note = `火力等级 → Lv.${next.fireLevel}`;
    } else {
      next.dew += CAMP_MAX_FIRE_DEW;
      next.note = `火力已满级 —— 改为潮水 +${CAMP_MAX_FIRE_DEW}`;
    }
    return next;
  }
  return next;
}

/** 面板上写「这一选会怎样」 */
export function campOptionText(id, state) {
  if (id === 'rest') {
    const gain = Math.min(CAMP_REST_HP, Math.max(0, state.maxHp - state.hp));
    return gain > 0 ? `回复 ${gain} 点生命` : '生命已满，没有可回复的';
  }
  if (id === 'sharpen') {
    return state.fireLevel < FIRE_MAX
      ? `火力等级 Lv.${state.fireLevel} → Lv.${state.fireLevel + 1}`
      : `火力已满级 → 潮水 +${CAMP_MAX_FIRE_DEW}`;
  }
  return '';
}
