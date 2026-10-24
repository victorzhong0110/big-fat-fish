import { describe, it, expect } from 'vitest';
import {
  DEW_COST, REROLL_ESCALATION,
  rerollCost, waveDew, runDew, draftActions, actionById, deepenCost,
} from '../src/systems/dew.js';

describe('潮水经济', () => {
  it('重随价格随本局重随次数递增', () => {
    expect(rerollCost(0)).toBe(DEW_COST.reroll);
    expect(rerollCost(1)).toBe(DEW_COST.reroll + REROLL_ESCALATION);
    expect(rerollCost(3)).toBe(DEW_COST.reroll + REROLL_ESCALATION * 3);
  });

  it('重随次数为负或非法时按 0 处理', () => {
    expect(rerollCost(-5)).toBe(DEW_COST.reroll);
    expect(rerollCost(NaN)).toBe(DEW_COST.reroll);
  });

  it('一局的潮水收入是固定的、可预期的（不随杀敌数膨胀）', () => {
    // 20 波 = 4×1 + 5×2 + 5×3 + 5×4 + 1×5 = 54
    expect(runDew(20)).toBe(54);
    expect(runDew(20)).toBe(runDew(20)); // 纯函数
  });

  it('每波潮水随章节递增', () => {
    expect(waveDew(1)).toBe(1);
    expect(waveDew(4)).toBe(1);
    expect(waveDew(5)).toBe(2);
    expect(waveDew(10)).toBe(3);
    expect(waveDew(15)).toBe(4);
    expect(waveDew(20)).toBe(5);
  });

  it('一局的收入只够重随 3~4 次（牌池刷不穿）', () => {
    const total = runDew(20);
    let spent = 0;
    let times = 0;
    while (spent + rerollCost(times) <= total) {
      spent += rerollCost(times);
      times += 1;
    }
    expect(times).toBeGreaterThanOrEqual(3);
    expect(times).toBeLessThanOrEqual(5);
  });

  it('三个动作的价格固定且顺序稳定', () => {
    const acts = draftActions(0);
    expect(acts.map((a) => a.id)).toEqual(['reroll', 'banish', 'skip']);
    expect(acts[0].cost).toBe(DEW_COST.reroll);
    expect(acts[1].cost).toBe(DEW_COST.banish);
    expect(acts[2].cost).toBe(DEW_COST.skip);
  });

  it('潮水不够时动作不可用，够时可用', () => {
    const poor = draftActions(DEW_COST.reroll - 1);
    expect(poor.find((a) => a.id === 'reroll').enabled).toBe(false);
    expect(poor.find((a) => a.id === 'skip').enabled).toBe(false);

    const rich = draftActions(DEW_COST.skip + 5);
    expect(rich.every((a) => a.enabled)).toBe(true);
  });

  it('本局重随次数越多，重随按钮越早变灰', () => {
    // 10 潮水：够第一次重随（8），不够第二次（12）
    const first = draftActions(10, { rerollTimes: 0 });
    const later = draftActions(10, { rerollTimes: 1 });
    expect(first.find((a) => a.id === 'reroll').enabled).toBe(true);
    expect(later.find((a) => a.id === 'reroll').enabled).toBe(false);
  });

  it('canBanish / canSkip 为假时对应动作不可用', () => {
    const acts = draftActions(999, { canBanish: false, canSkip: false });
    expect(acts.find((a) => a.id === 'banish').enabled).toBe(false);
    expect(acts.find((a) => a.id === 'skip').enabled).toBe(false);
    expect(acts.find((a) => a.id === 'reroll').enabled).toBe(true);
  });

  it('深化价格随层数递增，且一局的钱只够深化 2~3 次', () => {
    expect(deepenCost(0)).toBe(DEW_COST.deepen);
    expect(deepenCost(1)).toBe(DEW_COST.deepen + 10);
    expect(deepenCost(3)).toBe(DEW_COST.deepen + 30);
    // 一局 54 滴（不含异象给的）：24 + 34 = 58 > 54 → 最多深化一次
    const budget = runDew(20);
    let spent = 0, times = 0;
    while (spent + deepenCost(times) <= budget) { spent += deepenCost(times); times += 1; }
    expect(times).toBe(1);
    // 算上异象给的 12~14 滴，够两次 —— 但那就没钱重随了（这正是取舍）
    expect(deepenCost(0) + deepenCost(1)).toBeGreaterThan(budget);
    expect(deepenCost(0) + deepenCost(1)).toBeLessThan(budget + 14);
  });

  it('actionById 能按 id 取动作，取不到返回 null', () => {
    const acts = draftActions(10);
    expect(actionById(acts, 'banish').id).toBe('banish');
    expect(actionById(acts, 'nope')).toBe(null);
  });
});

// 第六轮：路线可以加潮水（备战货币）
describe('潮水与章节修正量', () => {
  it('没有修正量时就是原来的收入', async () => {
    const { waveDew, waveDewFor } = await import('../src/systems/dew.js');
    expect(waveDewFor(10)).toBe(waveDew(10));
    expect(waveDewFor(10, {})).toBe(waveDew(10));
  });

  it('路线的潮水倍率会放大这一波的收入', async () => {
    const { waveDew, waveDewFor } = await import('../src/systems/dew.js');
    const base = waveDew(10);
    expect(waveDewFor(10, { dewMul: 1.5 })).toBe(Math.round(base * 1.5));
    expect(waveDewFor(10, { dewMul: 1.5 })).toBeGreaterThan(base);
  });
});
