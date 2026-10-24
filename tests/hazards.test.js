import { describe, it, expect } from 'vitest';
import {
  inBlast, telegraphProgress, swarmFormation, TELEGRAPH_MS, BLAST_RADIUS, SWARM,
} from '../src/systems/hazards.js';
import { chapterOf, BOSS_EVERY } from '../src/systems/waveDirector.js';

describe('inBlast', () => {
  it('圆心与圈内命中', () => {
    expect(inBlast(100, 100, 100, 100)).toBe(true);
    expect(inBlast(110, 100, 100, 100)).toBe(true);
  });

  it('圈外不命中', () => {
    expect(inBlast(200, 100, 100, 100)).toBe(false);
  });

  it('半径可配置', () => {
    expect(inBlast(180, 100, 100, 100, 100)).toBe(true);
    expect(inBlast(180, 100, 100, 100, 60)).toBe(false);
  });

  it('默认半径是常量值', () => {
    expect(BLAST_RADIUS).toBe(78);
    expect(inBlast(100 + BLAST_RADIUS, 100, 100, 100)).toBe(true);
    expect(inBlast(100 + BLAST_RADIUS + 1, 100, 100, 100)).toBe(false);
  });
});

describe('telegraphProgress', () => {
  it('进度被夹在 0 与 1 之间', () => {
    expect(telegraphProgress(0)).toBe(0);
    expect(telegraphProgress(TELEGRAPH_MS)).toBe(1);
    expect(telegraphProgress(-50)).toBe(0);
    expect(telegraphProgress(99999)).toBe(1);
  });
});

describe('swarmFormation', () => {
  it('数量正确且围绕中心分布', () => {
    const f = swarmFormation(3);
    expect(f).toHaveLength(3);
    for (const p of f) {
      expect(Math.sqrt(p.dx * p.dx + p.dy * p.dy)).toBeCloseTo(26, 5);
    }
  });

  it('单只也要给出一只', () => {
    expect(swarmFormation(1)).toHaveLength(1);
    expect(swarmFormation(0)).toHaveLength(1);
  });

  it('沙丁鱼群属性：快、脆、分低', () => {
    expect(SWARM.hp).toBe(1);
    expect(SWARM.speed).toBeGreaterThan(90);
    expect(SWARM.groupSize).toBe(3);
  });
});

describe('chapterOf', () => {
  it('每 5 波一个章节', () => {
    expect(chapterOf(1).index).toBe(1);
    expect(chapterOf(5).index).toBe(1);
    expect(chapterOf(6).index).toBe(2);
    expect(chapterOf(10).index).toBe(2);
    expect(chapterOf(11).index).toBe(3);
  });

  it('每 5 波的倍数是 Boss 波', () => {
    expect(chapterOf(5).isBoss).toBe(true);
    expect(chapterOf(10).isBoss).toBe(true);
    expect(chapterOf(4).isBoss).toBe(false);
    expect(BOSS_EVERY).toBe(5);
  });

  it('章节名循环取用且非空', () => {
    const a = chapterOf(1).name;
    expect(a).toBeTruthy();
    expect(chapterOf(6).name).toBeTruthy();
    expect(chapterOf(1 + 18 * BOSS_EVERY).name).toBeTruthy();
  });

  it('18 个节气用完后改用物候名（无尽模式不撞名）', () => {
    // 第 19 章（波 91）开始用七十二候
    const c19 = chapterOf(1 + 18 * BOSS_EVERY);
    expect(c19.name).toBe('远洋');
    // 前 18 章仍然是节气
    expect(chapterOf(1).name).toBe('浅滩');
    expect(chapterOf(1 + 17 * BOSS_EVERY).name).toBe('霜降层');
  });
});
