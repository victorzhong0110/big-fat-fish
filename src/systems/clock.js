// 游戏时钟：所有逻辑计时器共用的步长。
//
// 为什么单独抽一个模块？
// 之前 GameScene.update() 里写的是 `const dt = Math.min(0.05, raw)`。
// 60fps 下 raw≈0.016，钳制不生效；可一旦帧率掉到 20fps 以下，
// 逻辑步长就被压到 0.05s，而波次时间线（runTime）仍按墙钟走 ——
// 结果是"玩家射速被悄悄砍掉一半、敌人照常涌来"的死亡螺旋。
// 实测：8fps 时机器人 100 秒只打死 10 只怪（Canvas 渲染器 60fps 时同期能打 21 只）。
//
// 结论：**步长 = 墙钟，帧率无关**。单帧上限 0.5s 只为防卡顿后时间跳跃。
export const MAX_STEP_SEC = 0.5;

/**
 * 墙钟步长（秒）。
 * @param {number} rawSec 距上一帧的真实经过时间
 * @returns {number} 本帧逻辑推进的秒数（0 ~ MAX_STEP_SEC）
 */
export function wallStep(rawSec) {
  if (!Number.isFinite(rawSec) || rawSec <= 0) return 0;
  return Math.min(MAX_STEP_SEC, rawSec);
}

/**
 * 冷却计时器推进。
 * @param {number} remainMs 剩余冷却毫秒
 * @param {number} stepSec 本帧步长（秒）
 * @returns {number} 新的剩余毫秒（<= 0 表示可以出手）
 */
export function tickCooldown(remainMs, stepSec) {
  return remainMs - stepSec * 1000;
}

/** 冷却是否已就绪 */
export function cooldownReady(remainMs) {
  return remainMs <= 0;
}
