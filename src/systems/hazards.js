// 地面危险物（深海炸弹）与编队生成：纯逻辑，便于单测
/** 预警 → 爆炸 的两个阶段时长（毫秒） */
export const TELEGRAPH_MS = 1200;
export const BLAST_RADIUS = 78;

/** 预警圈内是否会被炸到 */
export function inBlast(x, y, cx, cy, radius = BLAST_RADIUS) {
  const dx = x - cx;
  const dy = y - cy;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

/** 预警圈的显示进度 0→1 */
export function telegraphProgress(elapsed, total = TELEGRAPH_MS) {
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, elapsed / total));
}

/**
 * 编队生成：沙丁鱼群一次刷多只，围绕中心呈环形分布。
 * @returns {Array<{dx:number, dy:number}>} 相对生成点的偏移
 */
export function swarmFormation(count, radius = 26) {
  const n = Math.max(1, count);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n;
    out.push({ dx: Math.cos(a) * radius, dy: Math.sin(a) * radius });
  }
  return out;
}

/** 沙丁鱼群单只属性：更快、更脆、分更低 */
export const SWARM = {
  hp: 1,
  speed: 96,
  score: 8,
  radius: 11,
  groupSize: 3,
};
