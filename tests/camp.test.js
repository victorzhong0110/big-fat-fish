// 篝火（第八轮）的纯逻辑测试。
//
// 这一轮的主张：**落后的人要有一条回头路**。
// 所以测试要守住两件事：
//   ① 两个选项是**同一量级的交换**（回血 vs 变强），不能有一个永远更优；
//   ② 磨刃在**火力满级**之后要改写成"每发伤害 +1" ——
//      否则后期（火力早就满了）这个选项就变成废的，篝火只剩一个有效选项。
import { describe, it, expect } from 'vitest';
import {
  CAMP_OPTIONS, CAMP_REST_HP, CAMP_MAX_FIRE_DEW, campAvailable, applyCamp, campOptionText,
} from '../src/systems/camp.js';
import { FIRE_MAX } from '../src/systems/upgrades.js';

describe('篝火选项', () => {
  it('有两个选项，各有名字/说明/提示', () => {
    expect(CAMP_OPTIONS.length).toBe(2);
    for (const o of CAMP_OPTIONS) {
      expect(o.id).toBeTruthy();
      expect(o.name.length).toBeGreaterThan(0);
      expect(o.desc.length).toBeGreaterThan(2);
      expect(o.hint.length).toBeGreaterThan(2);
    }
    expect(CAMP_OPTIONS.map((o) => o.id).sort()).toEqual(['rest', 'sharpen']);
  });

  it('满血时休整不可选（没血可回）', () => {
    const state = { hp: 5, maxHp: 5, fireLevel: 3 };
    expect(campAvailable('rest', state)).toBe(false);
    expect(campAvailable('rest', { ...state, hp: 3 })).toBe(true);
  });

  it('磨刃总是可选', () => {
    expect(campAvailable('sharpen', { hp: 5, maxHp: 5, fireLevel: 1 })).toBe(true);
    expect(campAvailable('sharpen', { hp: 5, maxHp: 5, fireLevel: FIRE_MAX })).toBe(true);
  });
});

describe('篝火的效果', () => {
  it('休整：回 3 点血，且不超过上限', () => {
    const next = applyCamp('rest', { hp: 1, maxHp: 8, fireLevel: 3, damageBonus: 0 });
    expect(next.hp).toBe(1 + CAMP_REST_HP);
    const capped = applyCamp('rest', { hp: 7, maxHp: 8, fireLevel: 3, damageBonus: 0 });
    expect(capped.hp).toBe(8);
  });

  it('磨刃：火力等级 +1', () => {
    const next = applyCamp('sharpen', { hp: 3, maxHp: 8, fireLevel: 2, dew: 0 });
    expect(next.fireLevel).toBe(3);
    expect(next.dew).toBe(0);
  });

  it('磨刃：火力满级后改给潮水（**不给永久伤害加成**）', () => {
    // 实测教训：永久的「每发伤害 +1」会**每章叠一次** ⇒ 4 章 +4 伤害（+80% DPS），
    // 一条会自己复利的永久加成。改成潮水（备战货币，不进 DPS 曲线）。
    const next = applyCamp('sharpen', { hp: 3, maxHp: 8, fireLevel: FIRE_MAX, dew: 0 });
    expect(next.fireLevel).toBe(FIRE_MAX);
    expect(next.dew).toBe(CAMP_MAX_FIRE_DEW);
    expect(next.damageBonus).toBeUndefined();
  });

  it('不修改传入的状态（纯函数）', () => {
    const state = { hp: 2, maxHp: 8, fireLevel: 2, dew: 0 };
    applyCamp('rest', state);
    applyCamp('sharpen', state);
    expect(state).toEqual({ hp: 2, maxHp: 8, fireLevel: 2, dew: 0 });
  });

  it('面板上写清「这一选会怎样」', () => {
    expect(campOptionText('rest', { hp: 1, maxHp: 8, fireLevel: 3, damageBonus: 0 })).toContain('3');
    expect(campOptionText('sharpen', { hp: 1, maxHp: 8, fireLevel: 3, dew: 0 })).toContain('Lv.4');
    expect(campOptionText('sharpen', { hp: 1, maxHp: 8, fireLevel: FIRE_MAX, dew: 0 })).toContain('潮水');
  });
});
