import { describe, it, expect } from 'vitest';
import { mulberry32, randInt, randFloat } from '../src/systems/rng.js';

describe('mulberry32', () => {
  it('同 seed 产出同一序列', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('不同 seed 产出不同序列', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('输出落在 [0,1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 2000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('randInt / randFloat', () => {
  it('randInt 覆盖区间两端', () => {
    const rng = mulberry32(3);
    const seen = new Set();
    for (let i = 0; i < 500; i++) seen.add(randInt(rng, 1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('randFloat 落在区间内', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const v = randFloat(rng, -2, 5);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
  });
});
