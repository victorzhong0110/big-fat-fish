// 克制关系（第七轮起）的纯逻辑测试。
//
// 第九轮把克制从"提示"变成了**乘算**（伤害 ×1.6），
// 所以这一轮的测试要守住三件事：
//   ① 标签是从属性表**推导**的（不是另写一份表 —— 否则改数值不改标签，标注就变成谎言）；
//   ② 每种敌种都有它怕的东西（没有"无解怪"的静默空洞）；
//   ③ **每个手段都有牌可打**（没有"只有一张牌能提供"的手段 —— 那会让"抽到对症"变成运气）。
//
// ⚠️ 第九轮**推翻**了第七轮的一条断言：
//   旧断言：「每发伤害 +1 的装备带 burst」。
//   推翻理由：那会让**每一张攻击牌**都算爆发 ⇒ 什么构筑都是爆发 ⇒ 克制等于没有。
//   新判据：爆发 = **单点输出真的上去了**（暴击率/暴击伤害/多弹/伤害倍率/转化型）。
import { describe, it, expect } from 'vitest';
import {
  COUNTER_TAGS, ENEMY_COUNTERS, COUNTER_MULT, COUNTER_CURVE_EXP, relicTags, relicTagsOf,
  countersFor, counterNote, counterMult, tagsFromStats,
} from '../src/systems/counters.js';
import { chapterCounterBreakdown, chapterCounterMult } from '../src/systems/pressure.js';
import { applyBuild } from '../src/systems/characters.js';
import { ENEMY_TYPES } from '../src/systems/enemies.js';
import { RELICS } from '../src/systems/relics.js';

describe('克制关系表', () => {
  it('每种敌种都有它怕的手段', () => {
    for (const id of Object.keys(ENEMY_TYPES)) {
      const list = ENEMY_COUNTERS[id];
      expect(list, id).toBeTruthy();
      expect(list.length, id).toBeGreaterThan(0);
      for (const tag of list) {
        expect(COUNTER_TAGS[tag], `${id}.${tag}`).toBeTruthy();
      }
    }
  });

  it('手段标签只有四种（别越加越多）', () => {
    expect(Object.keys(COUNTER_TAGS).sort()).toEqual(['area', 'burst', 'mobility', 'slow']);
  });

  it('每种手段至少有 3 张装备能提供（否则"抽到对症"是运气不是决策）', () => {
    const counts = {};
    for (const r of RELICS) {
      for (const t of relicTags(r.id)) counts[t] = (counts[t] || 0) + 1;
    }
    for (const tag of Object.keys(COUNTER_TAGS)) {
      expect(counts[tag] ?? 0, `${tag} 只有 ${counts[tag] ?? 0} 张牌能提供`).toBeGreaterThanOrEqual(3);
    }
  });

  it('敌种的弱点是集中的（一只怪最多怕两种手段）', () => {
    // 集中化是第九轮的前提：弱点太散 ⇒ "对症"退化成"多半能中一点"。
    for (const [id, list] of Object.entries(ENEMY_COUNTERS)) {
      expect(list.length, `${id} 怕 ${list.length} 种手段，太散`).toBeLessThanOrEqual(2);
    }
  });
});

describe('装备的手段（从属性表推导）', () => {
  it('减速类装备带 slow', () => {
    expect(relicTags('frost_edge')).toContain('slow');
    expect(relicTags('chill_petal')).toContain('slow');
  });

  it('爆裂类装备带 area', () => {
    expect(relicTags('spore_burst')).toContain('area');
    expect(relicTags('pollen_burst')).toContain('area');
  });

  it('机动类装备带 mobility', () => {
    expect(relicTags('migrating_root')).toContain('mobility');
    expect(relicTags('long_root')).toContain('mobility');
  });

  it('真正的爆发装备带 burst（暴击/多弹/转化型）', () => {
    expect(relicTags('fatal_scent')).toContain('burst');
    expect(relicTags('crown_of_petals')).toContain('burst');
    expect(relicTags('combo_forge')).toContain('burst');
    expect(relicTags('soul_drain')).toContain('burst');
  });

  it('⚠️ 平铺的小数值不算爆发（第九轮收紧的判据）', () => {
    // 「每发伤害 +1」以前算爆发 ⇒ 每一张攻击牌都算 ⇒ 克制等于没有。
    expect(relicTags('polished_stamen')).not.toContain('burst');
    expect(relicTags('wither_seed')).not.toContain('burst');
    expect(relicTags('twin_petal')).not.toContain('burst');
  });

  it('纯分数类装备不带任何手段（它不解决任何怪）', () => {
    expect(relicTags('gold_core')).toEqual([]);
    expect(relicTags('golden_pollen')).toEqual([]);
  });

  it('标签可以从任意属性表推导（深化/角色起始装备走同一条路）', () => {
    expect(tagsFromStats({ slowOnHit: 0.3, slowDurationMs: 900 })).toContain('slow');
    expect(tagsFromStats({ explodeDamage: 2 })).toContain('area');
    expect(tagsFromStats({ critChance: 0.2 })).toContain('burst');
    // ⚠️ 移速是乘算的：只看最终 moveSpeedMul 的话，
    // 「迁徙根 +7%」会被「凋零之种 -18%」抹掉，连带把「机动」这个手段也抹掉
    // （实测：种子 1037 抽到迁徙根，面板上的手段却一个都没有 ⇒ 整局倍率恒为 1.0）。
    expect(tagsFromStats({ moveSpeedMul: 1.1 })).not.toContain('mobility');
    expect(tagsFromStats({ moveSpeedBonus: 7 })).toContain('mobility');
    expect(tagsFromStats({})).toEqual([]);
  });

  it('一组装备的手段取并集', () => {
    const tags = relicTagsOf(['frost_edge', 'spore_burst', 'long_root']);
    expect(tags.sort()).toEqual(['area', 'mobility', 'slow']);
  });
});

describe('对症判定', () => {
  it('机动装备对得上围上来的与远程的怪', () => {
    const { hit } = countersFor('migrating_root', ['charger', 'weaver', 'crawler', 'swarm']);
    expect(hit).toContain('weaver');
    expect(hit).toContain('crawler');
    // ⚠️ 第九轮把弱点表改成**互不重叠**的分配（实测决定的，见 counters.js 的注释）：
    // 机动只吃「围上来的 / 远程的」，范围只吃「成群的」。
    expect(hit).not.toContain('swarm');
    expect(hit).not.toContain('charger');
  });

  it('爆发装备对得上铁壳蟹', () => {
    const { hit } = countersFor('fatal_scent', ['husk', 'crawler']);
    expect(hit).toContain('husk');
    expect(hit).not.toContain('crawler');
  });

  it('范围装备对得上成群的怪', () => {
    const { hit } = countersFor('spore_burst', ['bud', 'moth', 'husk', 'swarm']);
    expect(hit).toContain('bud');
    expect(hit).toContain('swarm');
    expect(hit).not.toContain('husk');
  });

  it('减速装备对得上飘的与冲的怪', () => {
    const { hit } = countersFor('frost_edge', ['moth', 'charger', 'crawler']);
    expect(hit).toContain('moth');
    expect(hit).toContain('charger');
    expect(hit).not.toContain('crawler');
  });

  it('对不上的时候不编话（返回空串）', () => {
    expect(counterNote('gold_core', ['charger', 'husk'])).toBe('');
    expect(counterNote('fatal_scent', [])).toBe('');
  });

  it('对得上的时候写出人话（并且写明倍率）', () => {
    const note = counterNote('migrating_root', ['weaver']);
    expect(note).toContain('对症');
    expect(note).toContain('机动');
    expect(note).toContain('墨鱼');
    expect(note).toContain(`×${COUNTER_MULT}`);
  });
});

describe('对症倍率（第九轮：克制变成了真机制）', () => {
  it('没有手段时倍率是 1', () => {
    expect(counterMult('husk', [])).toBe(1);
  });

  it('手段对得上时倍率是 COUNTER_MULT', () => {
    expect(counterMult('husk', ['burst'])).toBe(COUNTER_MULT);
    expect(counterMult('crawler', ['mobility'])).toBe(COUNTER_MULT);
  });

  it('手段对不上时倍率是 1', () => {
    expect(counterMult('husk', ['slow'])).toBe(1);
    expect(counterMult('spore', ['area'])).toBe(1);
    expect(counterMult('weaver', ['area'])).toBe(1);
    expect(counterMult('crawler', ['area'])).toBe(1);
  });

});

describe('⚠️ 弱点集合必须互不重叠（第九轮最贵的一条教训）', () => {
  it('单一手段的命中率不超过 70%（不然"一张对症牌"就吃满倍率）', () => {
    // 第一版按语义分，范围一家独大到 71% ⇒ "按对症挑"与"按稀有度挑"只差 7.8%
    // ⇒ 机制等于没有。改成互不重叠之后，单一手段全部降到 8%~61%。
    for (let ch = 1; ch <= 4; ch++) {
      const bd = chapterCounterBreakdown(ch, 1000, {});
      for (const [tag, share] of Object.entries(bd)) {
        expect(share, `第${ch}章 ${tag} 命中 ${(share * 100).toFixed(0)}%，太高`).toBeLessThan(0.7);
      }
    }
  });

  it('四种手段凑齐能覆盖八成以上的血量（所以"凑齐"值得追求）', () => {
    for (let ch = 1; ch <= 4; ch++) {
      const all = chapterCounterMult(ch, 1000, {}, ['area', 'burst', 'slow', 'mobility']);
      // 倍率 = 1 + (MULT-1) × 命中率^指数 ⇒ 反解要先开根
      const share = Math.pow((all - 1) / (COUNTER_MULT - 1), 1 / COUNTER_CURVE_EXP);
      expect(share, `第${ch}章凑齐只覆盖 ${(share * 100).toFixed(0)}%`).toBeGreaterThan(0.8);
    }
  });

  it('Boss 只吃爆发（最终决战是构筑的考试）', () => {
    expect(ENEMY_COUNTERS.boss).toEqual(['burst']);
    expect(ENEMY_COUNTERS.husk).toEqual(['burst']);
  });
});

describe('深化也能给手段（第九轮：抽不到对症牌时的唯一补救路径）', () => {
  it('把普通牌深化成对症牌', () => {
    // 双瓣齐射深化一层 ⇒ 穿透 ⇒ 范围
    const a = applyBuild(['twin_petal'], null, { twin_petal: 1 });
    expect(tagsFromStats(a)).toContain('area');
    // 抛光花蕊深化两层 ⇒ 暴击率到 16% ⇒ 爆发
    const b = applyBuild(['polished_stamen'], null, { polished_stamen: 2 });
    expect(tagsFromStats(b)).toContain('burst');
  });

  it('不是每张牌都能深化成对症牌（生存牌不给手段 —— 语义说不通）', () => {
    const s = applyBuild(['dew_charm'], null, { dew_charm: 2 });
    expect(tagsFromStats(s)).toEqual([]);
  });

  it('深化不会破坏原有的手段（霜之鳍深化后仍是减速）', () => {
    const s = applyBuild(['frost_edge'], null, { frost_edge: 2 });
    expect(tagsFromStats(s)).toContain('slow');
  });
});
