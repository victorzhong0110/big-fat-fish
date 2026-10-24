import { describe, it, expect } from 'vitest';
import {
  RELICS, RARITIES, relicById, applyRelics, createStats, deriveFireStats, BASE_STATS, deepenRelic,
  DEEPEN_TAG_BONUS,
} from '../src/systems/relics.js';
import { applyBuild } from '../src/systems/characters.js';

describe('装备池', () => {
  it('id 唯一，字段齐全', () => {
    const ids = RELICS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of RELICS) {
      expect(r.name).toBeTruthy();
      expect(r.desc).toBeTruthy();
      expect(RARITIES[r.rarity]).toBeTruthy();
      expect(typeof r.apply).toBe('function');
    }
  });

  it('数量足够撑起多局构筑', () => {
    expect(RELICS.length).toBeGreaterThanOrEqual(30);
  });

  it('存在"转化型"装备（改变打法，不只是数字变大）', () => {
    // 见 systems/transforms.js：如果所有装备都只是加法，构筑就只是"更大的数字"
    const transform = RELICS.filter((r) => r.apply && (
      r.id === 'combo_forge' || r.id === 'frost_edge' || r.id === 'last_stand' || r.id === 'soul_drain'
    ));
    expect(transform.length).toBe(4);
  });

  it('转化型装备真的改写了对应的转化字段', () => {
    const s = applyRelics(['combo_forge', 'frost_edge', 'last_stand', 'soul_drain']);
    expect(s.comboDamagePerStack).toBe(1);
    expect(s.comboDamageCap).toBe(6);
    expect(s.slowOnHit).toBeCloseTo(0.35);
    expect(s.slowDurationMs).toBe(800);
    expect(s.lowHpDamageMul).toBeCloseTo(1.8);
    expect(s.lowHpThreshold).toBe(0.4);
    expect(s.killDamagePerKill).toBe(1);
    expect(s.killDamageCap).toBe(12);
    // 背水是诅咒卡：代价必须真的在
    expect(s.maxHpAdd).toBe(-1);
  });

  it('不拿转化型装备时，这些字段全是默认值（不会影响旧行为）', () => {
    const s = applyRelics(['dew_charm']);
    expect(s.comboDamagePerStack).toBe(0);
    expect(s.lowHpDamageMul).toBe(1);
    expect(s.lowHpThreshold).toBe(0);
    expect(s.slowOnHit).toBe(0);
    expect(s.killDamagePerKill).toBe(0);
  });

  it('诅咒卡必须显式标记，且都带代价', () => {
    const cursed = RELICS.filter((r) => r.cursed);
    expect(cursed.length).toBeGreaterThanOrEqual(3);
    for (const r of cursed) {
      // 诅咒卡要么减血、要么减速、要么加敌人血量
      const risky = r.cursed && (r.tag === '诅咒' || r.apply);
      expect(risky).toBeTruthy();
    }
  });
});

describe('applyRelics', () => {
  it('空列表得到基准属性表', () => {
    expect(applyRelics([])).toEqual(BASE_STATS);
  });

  it('不修改传入的基准表（纯函数）', () => {
    const s = createStats();
    applyRelics(['dew_charm']);
    expect(s.maxHpAdd).toBe(0);
  });

  it('加法类装备按数量叠加', () => {
    const s = applyRelics(['dew_charm', 'polished_stamen']);
    expect(s.maxHpAdd).toBe(1);
    expect(s.damageAdd).toBe(1);
  });

  it('乘法类装备按系数相乘', () => {
    const s = applyRelics(['migrating_root', 'rewind_bloom']);
    expect(s.moveSpeedMul).toBeCloseTo(1.07 * 1.05, 6);
  });

  it('互相冲突的装备同时持有时两边都生效（代价不会消失）', () => {
    const s = applyRelics(['hollow_core', 'dew_charm']);
    expect(s.maxHpAdd).toBe(-1); // -2 + 1
    expect(s.damageAdd).toBe(2);
  });

  it('未知 id 被忽略而不是崩溃', () => {
    expect(applyRelics(['not_a_relic']).damageAdd).toBe(0);
    expect(relicById('not_a_relic')).toBeNull();
  });
});

describe('深化（把已有的装备再叠一层）', () => {
  it('每张装备深化后都会真的变强（不能有"深化了但没变化"的）', () => {
    for (const r of RELICS) {
      const base = createStats();
      r.apply(base);                                   // 一层
      const deep = createStats();
      r.apply(deep);                                   // 一层
      deepenRelic(r.id).apply(deep);                    // 再叠一层
      const changed = Object.keys(base).some((k) => base[k] !== deep[k]);
      expect(changed, `${r.id} 深化后没有变化`).toBe(true);
    }
  });

  it('深化的装备保留原来的 id 与名字前缀', () => {
    const d = deepenRelic('combo_forge');
    expect(d.name).toContain('连击漩涡');
    expect(d.deep).toBe(true);
  });

  it('applyBuild 会把深化层数叠加上去', () => {
    const plain = applyBuild(['combo_forge'], 'gardener');
    const deep = applyBuild(['combo_forge'], 'gardener', { combo_forge: 1 });
    expect(plain.comboDamagePerStack).toBe(1);
    expect(deep.comboDamagePerStack).toBe(2);
    expect(deep.comboDamageCap).toBe(6);
  });

  it('第二层起按标签给专属加成（每一张装备的第二层都有意义）', () => {
    // 攻击牌：第二层起 +1 伤害
    const one = applyBuild(['polished_stamen'], 'scout', { polished_stamen: 1 });
    const two = applyBuild(['polished_stamen'], 'scout', { polished_stamen: 2 });
    expect(two.damageAdd).toBe(one.damageAdd + 2); // 再叠一次原效果 + 标签加成
    // 生存牌：第二层起 +1 最大生命
    const hp1 = applyBuild(['nectary'], 'scout', { nectary: 1 });
    const hp2 = applyBuild(['nectary'], 'scout', { nectary: 2 });
    expect(hp2.maxHpAdd).toBe(hp1.maxHpAdd + 1);
    // 机动牌：第二层 = 再叠一次原效果（×1.07）+ 标签加成（×1.05）
    const m1 = applyBuild(['migrating_root'], 'scout', { migrating_root: 1 });
    const m2 = applyBuild(['migrating_root'], 'scout', { migrating_root: 2 });
    expect(m2.moveSpeedMul).toBeCloseTo(m1.moveSpeedMul * 1.07 * 1.05, 6);
  });

  it('每个标签都有专属加成规则（拼错标签 = 那一类没有加成）', () => {
    const tags = new Set(RELICS.map((r) => r.tag));
    for (const tag of tags) {
      expect(DEEPEN_TAG_BONUS[tag], `标签 ${tag} 没有专属加成`).toBeTruthy();
    }
  });

  it('不存在的装备深化后返回 null', () => {
    expect(deepenRelic('nope')).toBe(null);
  });
});

describe('deriveFireStats', () => {
  it('无装备时等价于裸火力等级', () => {
    const s = deriveFireStats(1, createStats());
    expect(s.damage).toBe(1);
    expect(s.bullets).toBe(1);
  });

  it('伤害与弹数被装备改写', () => {
    const stats = applyRelics(['polished_stamen', 'twin_petal']);
    const s = deriveFireStats(1, stats);
    expect(s.damage).toBe(2);
    expect(s.bullets).toBe(2);
  });

  it('射速不会变成零或负数', () => {
    const s = deriveFireStats(5, applyRelics(['light_pollen', 'light_pollen', 'light_pollen']));
    expect(s.cooldownMs).toBeGreaterThanOrEqual(45);
  });

  it('暴击率被夹在 0..0.8', () => {
    const s = deriveFireStats(1, applyRelics(['sharp_blade', 'sharp_blade', 'sharp_blade', 'sharp_blade']));
    expect(s.critChance).toBeLessThanOrEqual(0.8);
    expect(s.critChance).toBeGreaterThan(0);
  });

  it('火力等级越高基础伤害越高，装备在其上叠加', () => {
    const stats = applyRelics(['polished_stamen']);
    expect(deriveFireStats(5, stats).damage).toBe(deriveFireStats(1, stats).damage + 4);
  });
});
