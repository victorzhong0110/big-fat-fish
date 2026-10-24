// 可复现随机数（mulberry32）：同一 seed 永远同一序列，便于测试与复盘
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 区间随机整数 [min, max] */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** 区间随机浮点 [min, max) */
export function randFloat(rng, min, max) {
  return min + rng() * (max - min);
}
