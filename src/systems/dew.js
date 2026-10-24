// 潮水：局内货币。
//
// 存在的理由：抽卡是「随机给三张，你选一张」。如果玩家对随机毫无影响力，
// 那么遇到三张废牌时唯一的反应是「认命」——那一局就此报废。
// 潮水把「运气不好」变成「可以花钱解决的问题」，但**花钱本身也是取舍**：
// 潮水还能留给章内异象，于是每一次消费都在两种价值之间做选择。
//
// 这条设计对应 DECISIONS §7 第 3 条（局内商店 / 重随）：
// 商店与重随不是两个系统，是同一个系统——潮水是唯一的硬通货。
// 另见 §5.3：当初推翻「局内货币 + 商店替代抽卡」，是因为它把随机性摊平成数值规划；
// 现在的形态是**反过来**——货币不替代抽卡，只给抽卡一个「纠错」的手段。

/** 基础价格 */
export const DEW_COST = {
  reroll: 8,   // 重随：重抽候选
  banish: 12,  // 放逐：把一张永久踢出本局牌池
  skip: 15,    // 跳过：本次不要装备，保留潮水
  deepen: 24,  // 深化：把一张已有的装备再叠一层
};

/**
 * 深化的价格：同一张装备每深化一次更贵。
 * 一局只有 ~54~66 滴潮水（按波结算 + 异象给的），
 * 所以最多深化 2 次（24 + 34 = 58，几乎花光）——
 * **"拿新牌"、"重随"、"把旧牌变强"必须抢同一份钱**，这才是取舍。
 */
export function deepenCost(count = 0) {
  return DEW_COST.deepen + 10 * Math.max(0, Math.floor(count) || 0);
}

/** 每多重随一次，后续重随变贵（防止在同一个抽卡点上刷到天荒地老） */
export const REROLL_ESCALATION = 4;

/**
 * 第 times 次重随的价格（times 从 0 起）。
 *
 * **times 是「本局」的重随总次数，不是「这一个抽卡点」的次数。**
 * 这一点很关键：如果按抽卡点计数，玩家可以在每个抽卡点各刷两次，
 * 4 个抽卡点 × 2 次 = 8 次重随，牌池基本被刷穿，随机性就没了。
 * 按本局计数 + 递增价格，一局的钱只够刷 3~4 次 —— **必须是取舍**。
 */
export function rerollCost(times = 0) {
  return DEW_COST.reroll + REROLL_ESCALATION * Math.max(0, Math.floor(times) || 0);
}

/**
 * 每波结束给的潮水。
 *
 * **为什么不是"击杀掉落"**：第一版是按击杀概率掉（8%），
 * 实测一局能攒到 100+ 潮水（机器人一场 1000 杀，潮水收入随杀敌数线性膨胀），
 * 结果是"有钱就能把牌池刷穿"。改成**按波结算**之后：
 * 收入固定、可预期（玩家能规划"第三章我有 15 潮水，够重随一次"），
 * 而且不奖励"杀得多"——杀得多本来就该体现在得分上。
 *
 * 曲线：第 1~4 章每波 1 滴，第 2 章 2 滴，第 3 章 3 滴，第 4 章 4 滴。
 * 一局（20 波）合计 54 滴 ≈ 4 次重随。
 */
export function waveDew(wave) {
  return 1 + Math.floor(Math.max(1, Math.floor(wave)) / 5);
}

/**
 * 这一波实际结算的潮水（含章节修正量）。
 *
 * 第六轮：路线可以加潮水（"备战"的货币）。
 * 为什么是潮水而不是掉落 —— 见 systems/routes.js 顶部的说明：
 * 火力等级是指数级的，"掉落更多"等于白送一整级火力。
 */
export function waveDewFor(wave, mods = null) {
  return Math.round(waveDew(wave) * (mods?.dewMul ?? 1));
}

/** 一整局（20 波）能拿到的潮水 */
export function runDew(waves = 20) {
  let total = 0;
  for (let w = 1; w <= Math.max(1, Math.floor(waves)); w++) total += waveDew(w);
  return total;
}

/**
 * 抽卡面板上可用的三个动作。
 * @param {number} dew 当前潮水
 * @param {{rerollTimes?:number, canBanish?:boolean, canSkip?:boolean}} opts
 * @returns {Array<{id:string,label:string,desc:string,cost:number,enabled:boolean}>}
 */
export function draftActions(dew = 0, opts = {}) {
  const { rerollTimes = 0, canBanish = true, canSkip = true } = opts;
  const rr = rerollCost(rerollTimes);
  return [
    { id: 'reroll', label: '重随', desc: '重新抽三张候选', cost: rr, enabled: dew >= rr },
    { id: 'banish', label: '放逐', desc: '永久踢掉一张（先点它，再点那张卡）', cost: DEW_COST.banish, enabled: canBanish && dew >= DEW_COST.banish },
    { id: 'skip', label: '跳过', desc: '本次不要装备，把潮水留住', cost: DEW_COST.skip, enabled: canSkip && dew >= DEW_COST.skip },
  ];
}

/** 按 id 找动作 */
export function actionById(actions, id) {
  return actions.find((a) => a.id === id) || null;
}
