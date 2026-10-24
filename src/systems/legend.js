/* ── 图例（纯逻辑层）─────────────────────────────────────────────
 *
 * 主菜单的图例告诉玩家"场上那些东西是什么、属于哪边"。
 *
 * 为什么它要住在 systems/：
 *  ① **名字**必须来自 `ENEMY_TYPES`（同一个事实只能有一份实现 ——
 *     图例手抄一份名字，改名那天就会漂）；
 *  ② **阵营**必须来自 `src/art/avatars.js` 的 `modelOf()`（同理），
 *     但 systems/ 不该反过来依赖渲染层 ⇒ 用**依赖注入**：调用方把
 *     阵营函数传进来，本模块保持纯函数、可单测。
 *
 * 🔴 **图例不许手抄名字**：第十四轮换皮（深海）→ 第十五轮又换皮
 *    （Codex 小工人 / Claude Buddy 物种），每一次换名都会让
 *    "HTML 里手写的那一份"过期 —— 而且**过期了不报错**，
 *    屏幕上会出现两套名字（数据一套、图例一套）。
 *    ⇒ 现在图例**整块由数据生成**（含名字、阵营、按角色的一句话说明），
 *    HTML 里只留一个空容器 ⇒ **漂移在结构上不可能发生**。
 */
import { ENEMY_TYPES, ENEMY_TYPE_IDS } from './enemies.js';

/**
 * 按角色给一句话说明（**角色是稳定的概念**，不随换皮变 ⇒ 不会漂）。
 * 键 = ENEMY_TYPES[id].role。
 */
export const ROLE_HINTS = {
  chaser: '贴身追着你，数量取胜',
  ranged: '远程弹幕，注意走位',
  swarm: '一次刷出一窝，绕圈扑上来',
  splitter: '死亡后分裂成两只',
  bomber: '慢慢飘过来，死了炸开',
  dasher: '蓄力后朝你锁定的方向冲刺',
  tank: '血量过半会结壳免伤',
  boss: '每 5 波一场，分三个阶段',
};

/**
 * 图例里**不是敌种**的补充行（机制概念，不随换皮变）。
 * 例：「异变体」是每章第 2 波带词缀的精英 —— 玩家会在战场上见到它，
 * 但它不是 `ENEMY_TYPES` 里的一个类型 ⇒ 单独列，不进数据表。
 */
export const LEGEND_EXTRA_ROWS = [
  { dot: 'boss', name: '异变体', hint: '每章第 2 波，带词缀' },
];

/**
 * 图例条目（按敌种数据排序）。
 * @param {(id:string)=>string} factionOf 敌种 → 阵营**标签**（由调用方注入）
 * @returns {Array<{id:string,name:string,faction:string,hint:string}>}
 */
export function legendEntries(factionOf) {
  return ENEMY_TYPE_IDS.map((id) => ({
    id,
    name: ENEMY_TYPES[id].name,
    faction: factionOf ? factionOf(id) : '',
    hint: ROLE_HINTS[ENEMY_TYPES[id].role] || '',
  }));
}

/**
 * 按 id 取图例条目。
 * @param {Array<{id:string}>} entries
 * @param {string} id
 */
export function legendEntry(entries, id) {
  return entries.find((e) => e.id === id) || null;
}
