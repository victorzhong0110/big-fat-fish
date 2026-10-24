import { describe, it, expect } from 'vitest';
import {
  ARCHETYPES, countByTag, activeArchetypes, applyArchetypes,
} from '../src/systems/archetypes.js';
import { RELICS, relicById, createStats } from '../src/systems/relics.js';

describe('流派（标签协同）', () => {
  it('按标签统计装备数量（只数真实存在的）', () => {
    const counts = countByTag(['polished_stamen', 'nectary', 'not_a_relic']);
    expect(counts['攻击']).toBe(1);
    expect(counts['生存']).toBe(1);
  });

  it('每个流派的标签在装备池里真的存在（拼错标签 = 流派永远不生效）', () => {
    const tags = new Set(RELICS.map((r) => r.tag));
    for (const a of ARCHETYPES) {
      expect(tags.has(a.tag)).toBe(true);
    }
  });

  it('每个流派都攒得出来（池子里的同标签装备数 ≥ 门槛）', () => {
    for (const a of ARCHETYPES) {
      const n = RELICS.filter((r) => r.tag === a.tag).length;
      expect(n).toBeGreaterThanOrEqual(a.every);
    }
  });

  it('不到门槛不激活', () => {
    expect(activeArchetypes(['polished_stamen'])).toEqual([]);
  });

  it('到门槛就激活，档数 = 数量 ÷ 门槛', () => {
    const attack = RELICS.filter((r) => r.tag === '攻击').map((r) => r.id);
    const list = activeArchetypes(attack.slice(0, 4));
    const edge = list.find((a) => a.id === 'edge');
    expect(edge).toBeTruthy();
    expect(edge.tiers).toBe(1);   // 4 件 ÷ 每 3 件一档 = 1 档
    expect(edge.count).toBe(4);
    expect(edge.tag).toBe('攻击');
  });

  it('加法型流派把加成写进属性表', () => {
    const attack = RELICS.filter((r) => r.tag === '攻击').map((r) => r.id);
    const stats = createStats();
    applyArchetypes(stats, attack.slice(0, 4));
    expect(stats.damageAdd).toBe(1);
  });

  it('乘法型流派按档数重复相乘', () => {
    const survival = RELICS.filter((r) => r.tag === '生存').map((r) => r.id);
    const stats = createStats();
    applyArchetypes(stats, survival.slice(0, 4)); // 4 件 ÷ 每 2 件一档 = 2 档
    expect(stats.maxHpAdd).toBe(2);
    const mob = RELICS.filter((r) => r.tag === '机动').map((r) => r.id);
    const s2 = createStats();
    applyArchetypes(s2, mob.slice(0, 2)); // 2 件 = 1 档
    expect(s2.moveSpeedMul).toBeCloseTo(1.05);
  });

  it('加成只作用在属性表上，不改装备本身', () => {
    const before = { ...relicById('polished_stamen') };
    const attack = RELICS.filter((r) => r.tag === '攻击').map((r) => r.id);
    const stats = createStats();
    applyArchetypes(stats, attack.slice(0, 4));
    expect(relicById('polished_stamen')).toEqual(before);
  });

  it('不认识的装备 id 不影响统计（脏数据不炸）', () => {
    expect(() => activeArchetypes(['nope', 'polished_stamen'])).not.toThrow();
    expect(activeArchetypes(['nope']).length).toBe(0);
  });
});
