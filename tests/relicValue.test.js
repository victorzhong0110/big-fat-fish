// 装备价值评估（第十轮）的纯逻辑测试。
//
// 为什么要有这个模块：第九轮实测发现
// **"按稀有度挑"的机器人抽到的全是「看起来是增益、实际不增伤」的牌**
// （蜜腺 / 连击花环 / 疾影 / 轻花粉囊）⇒ DPS 卡在保底线 15~29 ⇒ 第 7~12 波就死。
// ⇒ 面板必须写清「这张牌给伤害带来什么」——
// **这一组断言就是把那个坑钉住**：改了数值或加了新牌，断言会红。
import { describe, it, expect } from 'vitest';
import { relicValue, dpsGainOf, transformDpsGain } from '../src/systems/relicValue.js';
import { applyRelics } from '../src/systems/relics.js';
import { RELICS } from '../src/systems/relics.js';

describe('装备价值（第十轮）', () => {
  it('🔴 不增伤的牌必须明说"不提高伤害"（这正是 good 踩的坑）', () => {
    // 这些牌在面板上看着都是增益：回血 / 连击窗口 / 冲刺冷却 / 射速
    // —— 但它们**一个都不提高伤害**。
    for (const id of ['nectary', 'combo_wreath', 'swift_shadow', 'dew_charm', 'migrating_root', 'thorn_spike', 'gold_core']) {
      const v = relicValue(id, []);
      expect(v.pct, `${id} 不该有伤害收益`).toBe(0);
      expect(v.text, id).toContain('不提高伤害');
    }
  });

  it('提高伤害的牌必须给出正百分比', () => {
    // ⚠️ 「暴击率 +8%」也算提高伤害 —— 口径里**必须含暴击期望**，
    // 否则这张牌会被判成"不提高伤害"（= 面板在撒谎）。
    for (const id of ['polished_stamen', 'frost_edge', 'bouncing_pollen', 'twin_petal', 'sharp_blade']) {
      const v = relicValue(id, []);
      expect(v.pct, `${id} 该有伤害收益`).toBeGreaterThan(0);
      expect(v.text, id).toMatch(/伤害 \+\d+%/);
    }
  });

  it('⚠️ 条件性收益不能被写成"不提高伤害"（那是在冤枉一张好牌）', () => {
    // 「致命芬芳」给的是**暴击伤害**：没有暴击率时期望收益确实是 0，
    // 但它不是"没用"，而是"要配暴击率" ⇒ 面板必须写出这个前提。
    const v = relicValue('fatal_scent', []);
    expect(v.pct).toBe(0);
    expect(v.text).not.toBe('不提高伤害');
    expect(v.text).toContain('要配暴击率');
    // 配上了暴击率 ⇒ 它就变成一张正常的伤害牌
    const v2 = relicValue('fatal_scent', ['sharp_blade']);
    expect(v2.pct).toBeGreaterThan(0);
    expect(v2.text).toContain('伤害 +');
  });

  it('转化型必须标"满层估计"（理论值不能当保证）', () => {
    const v = relicValue('combo_forge', []);
    expect(v.estimate).toBe(true);
    expect(v.text).toContain('满层估计');
  });

  it('手段标签能被读出来，且能说出"这张补上了什么"', () => {
    const v = relicValue('frost_edge', [], { tags: [] });
    expect(v.tags).toContain('slow');
    expect(v.gainTags).toContain('slow');
    // 已经有了的手段不再算"新增"
    const v2 = relicValue('frost_edge', [], { tags: ['slow'] });
    expect(v2.gainTags).not.toContain('slow');
  });

  it('每张装备都能被估值（没有"算不出来"的牌）', () => {
    for (const r of RELICS) {
      const v = relicValue(r.id, []);
      expect(typeof v.text, r.id).toBe('string');
      expect(v.text.length, r.id).toBeGreaterThan(0);
    }
  });

  it('⚠️ 伤害**加值**可加，但 DPS/百分比不可加（它们是乘算的）', () => {
    // 两张"每发伤害 +1" ⇒ 加值 1 + 1 = 2（可加）
    const a = applyRelics(['polished_stamen']).damageAdd;
    const b = applyRelics(['frost_edge']).damageAdd;
    const both = applyRelics(['polished_stamen', 'frost_edge']).damageAdd;
    expect(both, `${a} + ${b} ≠ ${both}`).toBe(a + b);
    // 而 DPS 是乘算的：两张 +21% 的牌合起来不是 +42%
    const one = dpsGainOf('polished_stamen', []).pct;
    const two = dpsGainOf('frost_edge', []).pct;
    const bothPct = dpsGainOf('polished_stamen', ['frost_edge']).pct;
    expect(bothPct).toBeLessThan(one + two);
  });

  it('转化型的潜在收益能被单独估出来（否则它会被判成废物）', () => {
    expect(transformDpsGain('combo_forge', [])).toBeGreaterThan(0);
    expect(transformDpsGain('nectary', [])).toBe(0);
  });
});
