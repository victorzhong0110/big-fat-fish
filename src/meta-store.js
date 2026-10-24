// 深海藏品的存储适配层。
//
// **为什么单独一个文件**：src/systems/ 下全部是纯逻辑模块，不碰浏览器 API，
// 因此可以单测、可以在 Node 里跑。这里的 localStorage 读写是唯一有副作用的部分，
// 单独隔离，systems/meta.js 保持纯函数。
import { createMeta, sanitizeMeta, META_STORAGE_KEY } from './systems/meta.js';

/** 读存档（读不出来或坏了就退回默认值） */
export function loadMeta() {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return createMeta();
    return sanitizeMeta(JSON.parse(raw));
  } catch {
    // 隐私模式 / 存储被禁 / JSON 坏了 —— 都不该让游戏起不来
    return createMeta();
  }
}

/** 写存档 */
export function saveMeta(meta) {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}
