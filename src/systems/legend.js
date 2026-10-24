/* ── 图例（纯逻辑层）─────────────────────────────────────────────
 *
 * 主菜单的图例告诉玩家"场上那些东西是什么、属于哪边"。
 *
 * 为什么它要住在 systems/：
 *  ① **名字**必须来自 `ENEMIES`（同一个事实只能有一份实现 ——
 *     图例手抄一份名字，改名那天就会漂）；
 *  ② **阵营**必须来自 `src/art/avatars.js` 的 `modelOf()`（同理），
 *     但 systems/ 不该反过来依赖渲染层 ⇒ 用**依赖注入**：调用方把
 *     `modelOf` 传进来，本模块保持纯函数、可单测。
 */
import { ENEMY_TYPES, ENEMY_TYPE_IDS } from './enemies.js';

/**
 * 图例条目（按敌种数据排序）。
 * @param {(id:string)=>string} factionOf 敌种 → 阵营标签（由调用方注入）
 * @returns {Array<{id:string,name:string,faction:string}>}
 */
export function legendEntries(factionOf) {
  return ENEMY_TYPE_IDS.map((id) => ({
    id,
    name: ENEMY_TYPES[id].name,
    faction: factionOf ? factionOf(id) : '',
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
