import { describe, it, expect } from 'vitest';
import {
  OMEN_POOL, OMEN_BY_ID, OMEN_STAT_KEYS, OMEN_ADVERSE_STATS, optionHasCost,
  drawOmen, statEffects, instantEffects, applyStatEffects,
} from '../src/systems/omens.js';
import { createStats, BASE_STATS } from '../src/systems/relics.js';
import { mulberry32 } from '../src/systems/rng.js';

describe('章内异象', () => {
  it('每个异象都有两个互斥选项，且名字/描述齐全', () => {
    expect(OMEN_POOL.length).toBeGreaterThanOrEqual(12);
    for (const o of OMEN_POOL) {
      expect(o.options.length).toBe(2);
      for (const opt of o.options) {
        expect(opt.id).toBeTruthy();
        expect(opt.name).toBeTruthy();
        expect(opt.desc).toBeTruthy();
        expect(Array.isArray(opt.effects)).toBe(true);
        expect(opt.effects.length).toBeGreaterThan(0);
      }
      expect(new Set(o.options.map((x) => x.id)).size).toBe(2);
    }
  });

  it('每个选项都带代价：至少有一个非正向效果', () => {
    // 「只给好处」的东西不叫选择，叫补给。
    for (const o of OMEN_POOL) {
      for (const opt of o.options) {
        expect(optionHasCost(opt.effects)).toBe(true);
      }
    }
  });

  it('「越高越糟」的属性方向被单独标出来', () => {
    // enemyHpMul 乘 1.15 是代价（敌人更硬），moveSpeedMul 乘 1.15 是好处
    expect(OMEN_ADVERSE_STATS.has('enemyHpMul')).toBe(true);
    expect(OMEN_ADVERSE_STATS.has('enemyCountMul')).toBe(true);
    expect(OMEN_ADVERSE_STATS.has('moveSpeedMul')).toBe(false);
    expect(optionHasCost([{ kind: 'stat', stat: 'enemyHpMul', op: 'mul', value: 1.15 }])).toBe(true);
    expect(optionHasCost([{ kind: 'stat', stat: 'moveSpeedMul', op: 'mul', value: 1.15 }])).toBe(false);
  });

  it('属性表字段名都在白名单里（拼错会静默失效）', () => {
    for (const o of OMEN_POOL) {
      for (const opt of o.options) {
        for (const e of statEffects(opt.effects)) {
          expect(OMEN_STAT_KEYS.has(e.stat)).toBe(true);
        }
      }
    }
  });

  it('异象 id 唯一', () => {
    const ids = OMEN_POOL.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(OMEN_BY_ID).length).toBe(ids.length);
  });

  it('抽到的异象不会重复抽已经出现过的', () => {
    const rng = mulberry32(7);
    const taken = [];
    for (let i = 0; i < OMEN_POOL.length; i++) {
      const o = drawOmen(rng, { taken });
      expect(taken).not.toContain(o.id);
      taken.push(o.id);
    }
  });

  it('全部抽完后会重新从完整池子里抽（不会抽不出东西）', () => {
    const rng = mulberry32(3);
    const all = OMEN_POOL.map((o) => o.id);
    const o = drawOmen(rng, { taken: all });
    expect(OMEN_POOL.some((x) => x.id === o.id)).toBe(true);
  });

  it('applyStatEffects 按 add / mul 正确改写属性表', () => {
    const s = createStats();
    applyStatEffects(s, [
      { kind: 'stat', stat: 'damageMul', op: 'mul', value: 1.3 },
      { kind: 'stat', stat: 'damageAdd', op: 'add', value: 2 },
      { kind: 'heal', value: 3 },
    ]);
    expect(s.damageMul).toBeCloseTo(1.3);
    expect(s.damageAdd).toBe(2);
  });

  it('未知字段被忽略，不会把属性表写坏', () => {
    const s = createStats();
    applyStatEffects(s, [{ kind: 'stat', stat: 'notAField', op: 'add', value: 5 }]);
    expect(s.notAField).toBeUndefined();
    expect(s.damageAdd).toBe(0);
  });

  it('statEffects / instantEffects 把两类效果分开', () => {
    const effs = [
      { kind: 'stat', stat: 'damageAdd', op: 'add', value: 1 },
      { kind: 'heal', value: 2 },
      { kind: 'dew', value: 3 },
    ];
    expect(statEffects(effs).length).toBe(1);
    expect(instantEffects(effs).length).toBe(2);
  });

  it('异象也能授予「转化型」能力（不必只有装备能给）', () => {
    // 「旧钟·听秒」给 comboDamagePerStack +1 —— 与装备「连击漩涡」同一套字段
    const bell = OMEN_BY_ID.old_bell.options.find((o) => o.id === 'listen');
    const fx = statEffects(bell.effects);
    expect(fx.some((e) => e.stat === 'comboDamagePerStack')).toBe(true);
  });

  it('异象白名单与属性表字段保持一致（漏一个 = 那个效果被静默丢弃）', () => {
    // 之前就踩过：装备加了 8 个「转化型」字段，异象的白名单没同步
    // → 异象写 comboDamagePerStack 会被 statEffects 过滤掉，效果**静默消失**
    const missing = Object.keys(BASE_STATS).filter((k) => !OMEN_STAT_KEYS.has(k));
    expect(missing).toEqual([]);
  });
});
