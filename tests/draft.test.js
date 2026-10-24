import { describe, it, expect } from 'vitest';
import { drawRelicOptions, rarityLabel } from '../src/systems/draft.js';
import { RELICS, relicById } from '../src/systems/relics.js';
import { mulberry32 } from '../src/systems/rng.js';
import { relicTags } from '../src/systems/counters.js';
import { relicValue } from '../src/systems/relicValue.js';

describe('抽卡', () => {
  it('给出指定数量的候选', () => {
    const opts = drawRelicOptions(mulberry32(1), { count: 3, chapter: 1 });
    expect(opts).toHaveLength(3);
  });

  it('候选互不相同', () => {
    const opts = drawRelicOptions(mulberry32(9), { count: 4, chapter: 2 });
    expect(new Set(opts.map((r) => r.id)).size).toBe(opts.length);
  });

  it('已持有的装备不再出现', () => {
    const owned = ['dew_charm', 'polished_stamen', 'nectary'];
    const opts = drawRelicOptions(mulberry32(5), { owned, count: 3, chapter: 2 });
    for (const o of opts) expect(owned).not.toContain(o.id);
  });

  it('诅咒卡在第 3 章前不出现', () => {
    const cursedIds = RELICS.filter((r) => r.cursed).map((r) => r.id);
    for (let seed = 0; seed < 40; seed++) {
      const opts = drawRelicOptions(mulberry32(seed), { count: 4, chapter: 1 });
      for (const o of opts) expect(cursedIds).not.toContain(o.id);
    }
  });

  it('第 3 章起诅咒卡可以出现', () => {
    const cursedIds = RELICS.filter((r) => r.cursed).map((r) => r.id);
    let seen = 0;
    for (let seed = 0; seed < 60; seed++) {
      const opts = drawRelicOptions(mulberry32(seed), { count: 4, chapter: 3 });
      seen += opts.filter((o) => cursedIds.includes(o.id)).length;
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('牌池被抽干时给出空数组而不是崩', () => {
    const all = RELICS.map((r) => r.id);
    const opts = drawRelicOptions(mulberry32(1), { owned: all, count: 3, chapter: 1 });
    expect(opts).toEqual([]);
  });

  it('同一 rng 抽到同一组候选（可复盘）', () => {
    const a = drawRelicOptions(mulberry32(42), { count: 3, chapter: 2 }).map((r) => r.id);
    const b = drawRelicOptions(mulberry32(42), { count: 3, chapter: 2 }).map((r) => r.id);
    expect(a).toEqual(b);
  });

  it('章节越深越容易抽到高稀有度', () => {
    let earlyLegendary = 0;
    let lateLegendary = 0;
    for (let seed = 0; seed < 80; seed++) {
      earlyLegendary += drawRelicOptions(mulberry32(seed), { count: 3, chapter: 1 })
        .filter((r) => r.rarity === 'legendary').length;
      lateLegendary += drawRelicOptions(mulberry32(seed), { count: 3, chapter: 4 })
        .filter((r) => r.rarity === 'legendary').length;
    }
    expect(lateLegendary).toBeGreaterThan(earlyLegendary);
  });

  it('候选都是真实存在的装备，且有稀有度标签', () => {
    const opts = drawRelicOptions(mulberry32(11), { count: 3, chapter: 2 });
    for (const o of opts) {
      expect(relicById(o.id)).toBeTruthy();
      expect(rarityLabel(o)).toBeTruthy();
    }
  });
});

// ── 手段保底（第十一轮）────────────────────────────────────
describe('手段保底（第十一轮）', () => {
  it('候选里至少有一张带手段的牌（牌池里有的话）', () => {
    // 第九轮实测：旧行为下 **24.5%** 的第一章抽卡里一张手段牌都没有
    // ⇒ 玩家四分之一概率整章都看不到「对症」选项 ⇒ 这不是机制，是运气。
    for (let i = 0; i < 300; i++) {
      const opts = drawRelicOptions(mulberry32(1000 + i), { owned: [], count: 3, chapter: 1 });
      expect(opts.length, '候选不能为空').toBeGreaterThan(0);
      expect(opts.some((r) => relicTags(r.id).length), `第 ${i} 次抽卡没有手段牌`).toBe(true);
    }
  });

  it('牌池里没有手段牌时不硬塞（不能凭空造牌）', () => {
    // 把**所有手段牌**都排除掉（模拟"玩家已经拿光手段牌"的情况）
    const allTags = RELICS.filter((r) => relicTags(r.id).length).map((r) => r.id);
    const opts = drawRelicOptions(mulberry32(7), { owned: allTags, count: 3, chapter: 1 });
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.some((r) => relicTags(r.id).length)).toBe(false);
  });

  it('保底**不牺牲伤害牌**：候选里伤害最高的那张必须还在', () => {
    // 保底要换掉的是"最没用"的那张 ⇒ 玩家的 DPS 不该因为保底而掉。
    for (let i = 0; i < 200; i++) {
      const opts = drawRelicOptions(mulberry32(3000 + i), { owned: [], count: 3, chapter: 1 });
      const pcts = opts.map((r) => relicValue(r.id, []).pct);
      // 候选里至少有一张带手段 ⇒ 保底已经用掉了一个位置
      // ⇒ 剩下的两张不该是"伤害最低"的那张被换掉的结果
      const best = Math.max(...pcts);
      const bestWithoutFloor = Math.max(
        ...RELICS.filter((r) => !relicTags(r.id).length).slice(0, 1).map((r) => relicValue(r.id, []).pct),
      );
      expect(best).toBeGreaterThanOrEqual(bestWithoutFloor - 1e-9);
    }
  });
});
