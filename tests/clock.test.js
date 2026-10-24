import { describe, it, expect } from 'vitest';
import { wallStep, tickCooldown, cooldownReady, MAX_STEP_SEC } from '../src/systems/clock.js';

describe('游戏时钟：步长必须帧率无关', () => {
  it('60fps 的帧长原样通过', () => {
    expect(wallStep(1 / 60)).toBeCloseTo(1 / 60, 6);
  });

  it('低帧率下步长不被压缩（回归：曾被钳到 0.05s，导致射速随帧率下降）', () => {
    // 8fps：真实帧长 125ms。若被钳到 0.05，冷却推进会慢 2.5 倍
    expect(wallStep(0.125)).toBeCloseTo(0.125, 6);
    // 20fps 边界
    expect(wallStep(0.05)).toBeCloseTo(0.05, 6);
    // 30fps
    expect(wallStep(1 / 30)).toBeCloseTo(1 / 30, 6);
  });

  it('单帧上限 0.5s，防止卡顿后时间跳跃', () => {
    expect(wallStep(3)).toBe(MAX_STEP_SEC);
    expect(wallStep(0.9)).toBe(MAX_STEP_SEC);
  });

  it('异常输入不产生负步长（非有限值一律按 0 处理，不推进时钟）', () => {
    expect(wallStep(0)).toBe(0);
    expect(wallStep(-1)).toBe(0);
    expect(wallStep(NaN)).toBe(0);
    expect(wallStep(Infinity)).toBe(0);
  });

  it('冷却计时器按步长推进，与帧率无关', () => {
    // 60fps：320ms 冷却需要 320/(1000/60) ≈ 19.2 帧
    let t = 320;
    let frames = 0;
    while (!cooldownReady(t) && frames < 100) {
      t = tickCooldown(t, 1 / 60);
      frames += 1;
    }
    const frames60 = frames;
    // 8fps：同样 320ms 冷却需要 320/125 = 2.56 → 3 帧
    t = 320;
    frames = 0;
    while (!cooldownReady(t) && frames < 100) {
      t = tickCooldown(t, 0.125);
      frames += 1;
    }
    // 关键：低帧率下"每帧推进的冷却"更多，因此真实等待时间应当一致
    expect(frames60 * (1 / 60)).toBeGreaterThan(0.3);
    expect(frames * 0.125).toBeGreaterThan(0.3);
    expect(frames * 0.125).toBeLessThan(0.45);
  });

  it('冷却就绪判定', () => {
    expect(cooldownReady(0)).toBe(true);
    expect(cooldownReady(-5)).toBe(true);
    expect(cooldownReady(1)).toBe(false);
  });
});
