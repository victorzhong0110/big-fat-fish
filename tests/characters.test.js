import { describe, it, expect } from 'vitest';
import {
  CHARACTERS, characterById, applyCharacter, applyBuild, startRelicOf,
  initialRelics, characterCards, DEFAULT_CHARACTER,
} from '../src/systems/characters.js';
import { createStats, relicById, applyRelics } from '../src/systems/relics.js';

describe('角色的起始装备', () => {
  it('起始装备必须是默认可用的（不能给一件局外还没解锁的牌）', () => {
    for (const c of CHARACTERS) {
      const r = relicById(c.startRelic);
      expect(r, `${c.name} 的起始装备 ${c.startRelic} 不存在`).toBeTruthy();
      expect(r.unlockCost, `${c.name} 的起始装备 ${r.name} 默认是锁着的`).toBe(0);
    }
  });
});

describe('角色池', () => {
  it('有五个角色，id 唯一', () => {
    expect(CHARACTERS.length).toBe(5);
    const ids = CHARACTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每个角色都有起始装备，且该装备真实存在', () => {
    for (const c of CHARACTERS) {
      expect(c.startRelic).toBeTruthy();
      expect(relicById(c.startRelic)).toBeTruthy();
    }
  });

  it('characterById 查得到 / 查不到返回 null', () => {
    expect(characterById('gardener')?.name).toBe('大肥鱼');
    expect(characterById('nobody')).toBeNull();
    expect(characterById(undefined)).toBeNull();
  });

  it('默认角色有效', () => {
    expect(characterById(DEFAULT_CHARACTER)).toBeTruthy();
  });

  it('角色修正只作用在属性表上（大肥鱼：血+1、每章回血、移速-5%）', () => {
    const s = createStats();
    applyCharacter(s, 'gardener');
    expect(s.maxHpAdd).toBe(1);
    expect(s.chapterHeal).toBe(1);
    expect(s.moveSpeedMul).toBeCloseTo(0.95, 6);
  });

  it('急先锋：伤害+1、射速更快、暴击更高、生命更低', () => {
    const s = createStats();
    applyCharacter(s, 'scout');
    expect(s.damageAdd).toBe(1);
    expect(s.cooldownMul).toBeLessThan(1);
    expect(s.critChance).toBeCloseTo(0.12, 6);
    expect(s.maxHpAdd).toBe(-1);
  });

  it('铁甲蟹：荆棘反伤 + 移速变慢', () => {
    const s = createStats();
    applyCharacter(s, 'smith');
    expect(s.thorns).toBe(3);
    expect(s.moveSpeedMul).toBeCloseTo(0.9, 6);
    expect(s.dashCooldownMul).toBeCloseTo(1.25, 6);
  });

  it('applyBuild = 角色 + 装备（装备叠加在角色之上）', () => {
    const s = applyBuild(['polished_stamen', 'sharp_blade'], 'gardener');
    // 大肥鱼 +1 血 / +1 每章回血 / 0.95 移速，再加两张普通装备
    expect(s.maxHpAdd).toBe(1);
    expect(s.chapterHeal).toBe(1);
    expect(s.damageAdd).toBe(1);      // 抛光花蕊
    expect(s.critChance).toBeCloseTo(0.08, 6); // 锐利花刃
  });

  it('applyBuild 与 applyRelics 在无角色时一致（不改变旧行为）', () => {
    const ids = ['polished_stamen', 'thorn_spike'];
    expect(applyBuild(ids, null)).toEqual(applyRelics(ids));
    expect(applyBuild(ids, 'nobody')).toEqual(applyRelics(ids));
  });

  it('角色的起始装备是装备列表的第一项（因此会从抽卡池里消失）', () => {
    expect(initialRelics('smith')).toEqual([startRelicOf('smith')]);
    expect(initialRelics('smith')[0]).toBe('boiling_nectar');
  });

  it('换角色会换掉牌池里的一张牌', () => {
    const pool = new Set(CHARACTERS.map((c) => c.startRelic));
    expect(pool.size).toBe(CHARACTERS.length); // 每个角色的起始装备互不相同
  });

  it('characterCards 带上起始装备的名字，供 UI 直接渲染', () => {
    const cards = characterCards();
    expect(cards.length).toBe(CHARACTERS.length);
    expect(cards[0].startRelicName).toBe(relicById('nectary').name);
    expect(cards[0].startRelicDesc).toBe(relicById('nectary').desc);
    expect(cards.every((c) => c.notes.length > 0)).toBe(true);
  });
});
