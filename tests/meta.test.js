import { describe, it, expect } from 'vitest';
import {
  createMeta, sanitizeMeta, memoryForRun, defaultUnlockedRelics, lockedRelics,
  canUnlock, unlockRelic, awardRun, isRelicAvailable, availableRelicIds,
  MEMORY_FLOOR, MEMORY_PER_CHAPTER, MEMORY_VICTORY_BONUS,
} from '../src/systems/meta.js';
import { RELICS, relicById } from '../src/systems/relics.js';

describe('花房记忆（局外元进度）', () => {
  it('新建存档：0 记忆，装备按默认解锁表', () => {
    const m = createMeta();
    expect(m.memory).toBe(0);
    expect(m.unlocked.length).toBe(defaultUnlockedRelics().length);
    expect(m.runs).toBe(0);
  });

  it('默认解锁表不包含任何需要解锁的装备', () => {
    const locked = RELICS.filter((r) => r.unlockCost > 0).map((r) => r.id);
    expect(locked.length).toBeGreaterThan(0);
    for (const id of locked) {
      expect(createMeta().unlocked).not.toContain(id);
    }
  });

  it('至少留一半装备默认可用（不能开局就没牌可抽）', () => {
    const unlocked = defaultUnlockedRelics().length;
    expect(unlocked).toBeGreaterThanOrEqual(RELICS.length / 2);
  });

  it('记忆只解锁内容，不加数值：解锁后属性表不变', async () => {
    const { applyRelics } = await import('../src/systems/relics.js');
    const before = applyRelics([]);
    const m = { ...createMeta(), memory: 999 };
    const res = unlockRelic(m, 'spore_burst');
    expect(res.ok).toBe(true);
    expect(res.meta.unlocked).toContain('spore_burst');
    // 记忆被扣掉，但属性表不受影响（局外进度不改局内数值）
    expect(res.meta.memory).toBe(999 - relicById('spore_burst').unlockCost);
    expect(applyRelics([])).toEqual(before);
  });

  it('记忆不够时解锁失败且不扣钱', () => {
    const m = { ...createMeta(), memory: 1 };
    const res = unlockRelic(m, 'spore_burst');
    expect(res.ok).toBe(false);
    expect(res.meta.memory).toBe(1);
    expect(res.meta.unlocked).not.toContain('spore_burst');
  });

  it('不能重复解锁同一张', () => {
    const m = { ...createMeta(), memory: 999 };
    const first = unlockRelic(m, 'spore_burst');
    const second = unlockRelic(first.meta, 'spore_burst');
    expect(second.ok).toBe(false);
    expect(second.meta.memory).toBe(first.meta.memory);
  });

  it('默认解锁的装备不能"再解锁"（它本来就能用）', () => {
    const m = { ...createMeta(), memory: 999 };
    const res = unlockRelic(m, 'dew_charm');
    expect(res.ok).toBe(false);
  });

  it('canUnlock 与解锁结果一致', () => {
    const m = { ...createMeta(), memory: 20 };
    expect(canUnlock(m, 'spore_burst')).toBe(true);   // 稀有 20
    expect(canUnlock(m, 'glass_petal')).toBe(false);  // 传说 35
    expect(canUnlock(m, 'dew_charm')).toBe(false);    // 默认可用
  });

  it('解锁是纯函数，不改传入的对象', () => {
    const m = { ...createMeta(), memory: 100 };
    const res = unlockRelic(m, 'spore_burst');
    expect(m.memory).toBe(100);
    expect(m.unlocked).not.toContain('spore_burst');
    expect(res.meta).not.toBe(m);
  });

  it('一局结束的奖励随进度增加，通关给得更多', () => {
    const early = memoryForRun({ victory: false, score: 300, chaptersCleared: 0 });
    const mid = memoryForRun({ victory: false, score: 2000, chaptersCleared: 1 });
    const win = memoryForRun({ victory: true, score: 9000, chaptersCleared: 4 });
    expect(early).toBe(MEMORY_FLOOR);
    expect(mid).toBeGreaterThan(early);
    expect(win).toBeGreaterThan(mid);
    expect(win).toBe(MEMORY_PER_CHAPTER * 4 + 36 + MEMORY_VICTORY_BONUS);
  });

  it('奖励公式对负数与非法输入保持稳定', () => {
    expect(memoryForRun({ score: -100, chaptersCleared: -3 })).toBe(MEMORY_FLOOR);
    expect(memoryForRun({})).toBe(MEMORY_FLOOR);
  });

  it('awardRun 累加记忆与局数，并更新最好成绩', () => {
    const m = createMeta();
    const a = awardRun(m, { victory: false, score: 1000, wave: 7, chaptersCleared: 1 });
    expect(a.gained).toBe(memoryForRun({ victory: false, score: 1000, chaptersCleared: 1 }));
    expect(a.meta.memory).toBe(a.gained);
    expect(a.meta.runs).toBe(1);
    const b = awardRun(a.meta, { victory: true, score: 9000, wave: 20, chaptersCleared: 4 });
    expect(b.meta.memory).toBe(a.gained + b.gained);
    expect(b.meta.runs).toBe(2);
    expect(b.meta.bestScore).toBe(9000);
    expect(b.meta.bestWave).toBe(20);
  });

  it('脏存档被清洗成合法值', () => {
    const m = sanitizeMeta({
      memory: 'abc', unlocked: ['not_a_relic', 'dew_charm'], runs: -3, bestScore: 1e9,
    });
    expect(m.memory).toBe(0);
    expect(m.unlocked).toContain('dew_charm');
    expect(m.unlocked).not.toContain('not_a_relic');
    expect(m.runs).toBe(0);
    expect(m.bestScore).toBe(1000000000);
  });

  it('null / 非对象的存档退回默认值', () => {
    expect(sanitizeMeta(null).unlocked).toEqual(defaultUnlockedRelics());
    expect(sanitizeMeta('nope').memory).toBe(0);
  });

  it('lockedRelics 列出还没解锁的装备与价格', () => {
    const list = lockedRelics(createMeta());
    expect(list.length).toBe(RELICS.filter((r) => r.unlockCost > 0).length);
    for (const item of list) expect(item.cost).toBeGreaterThan(0);
  });

  it('availableRelicIds 只给已解锁的装备', () => {
    const m = createMeta();
    const ids = availableRelicIds(m);
    expect(ids).not.toContain('spore_burst');
    expect(ids).toContain('dew_charm');
    const unlocked = unlockRelic({ ...m, memory: 999 }, 'spore_burst');
    expect(availableRelicIds(unlocked.meta)).toContain('spore_burst');
    expect(isRelicAvailable(unlocked.meta, 'spore_burst')).toBe(true);
  });
});
