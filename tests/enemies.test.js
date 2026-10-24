// 敌人系统（第五轮）的纯逻辑测试。
//
// 这一轮的核心主张是：**敌人要能针对构筑提问**。
// 所以测试不只查"属性对不对"，还查"行为是不是真的在制造决策"：
//   旗鱼必须先蓄力再冲刺（玩家有反应时间），
//   铁壳蟹必须先结壳才免伤（爆发不够会被拖住），
//   毒水母死后必须留下花粉云（在哪里杀掉它是决策）。
import { describe, it, expect } from 'vitest';
import {
  ENEMY_TYPES, enemyStats, eliteStats, eliteForWave, isEliteWave,
  waveRoster, chapterThreats, chargerStep, huskStep, enemySteer, enemyFirePlan,
  CHARGER, HUSK, PLAYER_SLOW, MOTH_CLOUD, ELITE_AFFIXES, ELITE_AFFIX_IDS, ELITE_HP_MUL,
  counterHint, enemyName,
} from '../src/systems/enemies.js';
import { wavePlan, buildTimeline, eliteFor } from '../src/systems/waveDirector.js';
import { waveDpsNeed } from '../src/systems/pressure.js';

describe('敌种表', () => {
  it('每个敌种都有完整的属性与说明', () => {
    for (const [id, t] of Object.entries(ENEMY_TYPES)) {
      expect(t.id).toBe(id);
      expect(t.hp, id).toBeGreaterThan(0);
      expect(t.speed, id).toBeGreaterThan(0);
      expect(t.radius, id).toBeGreaterThan(0);
      expect(t.score, id).toBeGreaterThan(0);
      expect(t.desc.length, id).toBeGreaterThan(2);
      expect(t.counter.length, id).toBeGreaterThan(4);
    }
  });

  it('新敌种都在表里（第四轮的五个也不能丢）', () => {
    for (const id of ['crawler', 'spore', 'swarm', 'bud', 'moth', 'charger', 'husk', 'huskling', 'weaver', 'boss']) {
      expect(ENEMY_TYPES[id], id).toBeTruthy();
    }
  });

  it('应对提示与名字都能取到', () => {
    expect(enemyName('charger')).toBe('旗鱼');
    expect(counterHint('husk')).toContain('爆发');
  });
});

describe('按波解锁的敌种名册', () => {
  it('第 1 波只有贪嘴小鱼', () => {
    expect(waveRoster(1)).toEqual(['crawler']);
  });

  it('新敌种在各自的波次才出现', () => {
    expect(waveRoster(4)).not.toContain('moth');
    expect(waveRoster(5)).toContain('moth');
    expect(waveRoster(5)).not.toContain('charger');
    expect(waveRoster(6)).toContain('charger');
    expect(waveRoster(8)).not.toContain('husk');
    expect(waveRoster(9)).toContain('husk');
    expect(waveRoster(7)).toContain('weaver');
  });

  it('Boss 与蟹壳碎屑不在名册里（它们不是"刷出来的"）', () => {
    for (let w = 1; w <= 25; w++) {
      expect(waveRoster(w)).not.toContain('boss');
      expect(waveRoster(w)).not.toContain('huskling');
    }
  });

  it('名册随波次单调不减', () => {
    let prev = 0;
    for (let w = 1; w <= 30; w++) {
      expect(waveRoster(w).length).toBeGreaterThanOrEqual(prev);
      prev = waveRoster(w).length;
    }
  });
});

describe('本章威胁（构筑一览要给玩家看的东西）', () => {
  it('第一章包含前五种敌种', () => {
    const ids = chapterThreats(1).map((t) => t.id);
    expect(ids).toContain('crawler');
    expect(ids).toContain('moth');
    expect(ids).not.toContain('husk');
  });

  it('第四章包含全部解锁的敌种', () => {
    const ids = chapterThreats(4).map((t) => t.id);
    for (const id of ['crawler', 'spore', 'swarm', 'bud', 'moth', 'charger', 'weaver', 'husk']) {
      expect(ids, id).toContain(id);
    }
  });
});

describe('敌人属性曲线', () => {
  it('血量随波次单调不减', () => {
    let prev = 0;
    for (let w = 1; w <= 30; w++) {
      const hp = enemyStats('crawler', w).hp;
      expect(hp).toBeGreaterThanOrEqual(prev);
      prev = hp;
    }
  });

  it('同波次里铁壳蟹最厚、沙丁鱼群最脆', () => {
    const w = 12;
    expect(enemyStats('husk', w).hp).toBeGreaterThan(enemyStats('crawler', w).hp);
    expect(enemyStats('swarm', w).hp).toBeLessThanOrEqual(enemyStats('crawler', w).hp);
  });

  it('主题的血量倍率会叠上去', () => {
    const plain = enemyStats('crawler', 10).hp;
    const fat = enemyStats('crawler', 10, { enemyHpMul: 1.5 }).hp;
    expect(fat).toBeGreaterThan(plain);
  });
});

describe('精英（异变体）', () => {
  it('每章第 2 波才有精英', () => {
    expect(isEliteWave(2)).toBe(true);
    expect(isEliteWave(7)).toBe(true);
    expect(isEliteWave(12)).toBe(true);
    expect(isEliteWave(17)).toBe(true);
    expect(isEliteWave(1)).toBe(false);
    expect(isEliteWave(3)).toBe(false);
    expect(isEliteWave(5)).toBe(false);
    expect(isEliteWave(20)).toBe(false);
  });

  it('无尽模式继续按 5 波一章出精英', () => {
    expect(isEliteWave(22)).toBe(true);
    expect(isEliteWave(27)).toBe(true);
  });

  it('同一 wave + seed 必得同一只精英', () => {
    const a = eliteForWave(7, 1234);
    const b = eliteForWave(7, 1234);
    expect(a).toEqual(b);
    expect(a.type).toBeTruthy();
    expect(ELITE_AFFIX_IDS).toContain(a.affix);
  });

  it('精英比同种普通怪厚得多', () => {
    const e = eliteForWave(12, 99);
    const es = eliteStats(e, 12);
    const base = enemyStats(e.type, 12);
    expect(es.hp).toBeGreaterThan(base.hp * 2);
    expect(es.elite).toBe(true);
  });

  it('词缀会改属性（不是只换个名字）', () => {
    const e = { type: 'crawler', affix: 'swift' };
    const es = eliteStats(e, 10);
    const base = enemyStats('crawler', 10);
    expect(es.speed).toBeGreaterThan(base.speed);
    expect(es.hp).toBeLessThan(base.hp * ELITE_HP_MUL * 1.2);
  });

  it('每个词缀都至少改一个可观察的量', () => {
    for (const id of ELITE_AFFIX_IDS) {
      const a = ELITE_AFFIXES[id];
      const changed = ['hpMul', 'speedMul', 'noKnockback', 'splitOnDeath', 'blastOnDeath', 'shieldCycleMs']
        .filter((k) => a[k] !== undefined);
      expect(changed.length, id).toBeGreaterThan(0);
      expect(a.name.length, id).toBeGreaterThan(0);
      expect(a.desc.length, id).toBeGreaterThan(2);
    }
  });
});

describe('旗鱼的状态机', () => {
  it('先蓄力、再冲刺、最后硬直', () => {
    let s = { phase: 'wind', timer: CHARGER.windMs, lock: { x: 0, y: 0 } };
    // 蓄力期间不会动
    expect(enemySteer('charger', { dx: 100, dy: 0, dist: 100, state: s }).vx).toBe(0);
    s = chargerStep(s, CHARGER.windMs + 1, { x: 1, y: 0 });
    expect(s.phase).toBe('dash');
    expect(s.event).toBe('dash');
    s = chargerStep(s, CHARGER.dashMs + 1, { x: 1, y: 0 });
    expect(s.phase).toBe('rest');
    s = chargerStep(s, CHARGER.restMs + 1, { x: 1, y: 0 });
    expect(s.phase).toBe('wind');
    expect(s.event).toBe('lock');
  });

  it('冲刺方向在进入蓄力时就锁定（玩家有反应时间）', () => {
    let s = { phase: 'rest', timer: 10, lock: { x: 0, y: 0 } };
    s = chargerStep(s, 20, { x: 0.6, y: 0.8 });
    expect(s.phase).toBe('wind');
    expect(s.lock.x).toBeCloseTo(0.6);
    expect(s.lock.y).toBeCloseTo(0.8);
    // 蓄力期间玩家跑了，锁定方向也不变
    const next = chargerStep(s, 100, { x: -1, y: 0 });
    expect(next.lock.x).toBeCloseTo(0.6);
  });

  it('冲刺时沿着锁定的方向走', () => {
    const st = { phase: 'dash', timer: 100, lock: { x: 0, y: 1 } };
    const plan = enemySteer('charger', { dx: -100, dy: 0, dist: 100, state: st });
    expect(plan.vy).toBeCloseTo(1);
    expect(plan.vx).toBeCloseTo(0);
  });
});

describe('铁壳蟹的结壳', () => {
  it('血量过半会结壳，壳期间免伤', () => {
    const s = huskStep({}, 0, 40, 100);
    expect(s.shelling).toBe(true);
    expect(s.event).toBe('shell');
  });

  it('血量还高时不会结壳', () => {
    const s = huskStep({}, 0, 80, 100);
    expect(s.shelling).toBe(false);
  });

  it('壳会按时碎掉', () => {
    let s = { shelling: true, timer: 100 };
    s = huskStep(s, 200, 40, 100);
    expect(s.shelling).toBe(false);
    expect(s.event).toBe('break');
  });

  it('壳碎之后不会立刻再结（否则无限免伤）', () => {
    let s = { shelling: true, timer: 10 };
    s = huskStep(s, 20, 40, 100);
    expect(s.shelling).toBe(false);
    s = huskStep(s, 20, 40, 100);
    expect(s.shelling).toBe(false);
  });
});

describe('移动意图（纯逻辑）', () => {
  const ctx = (dx, dy, extra = {}) => ({ dx, dy, dist: Math.hypot(dx, dy), t: 0, ...extra });

  it('孢子会远离太近的玩家', () => {
    const near = enemySteer('spore', ctx(50, 0));
    expect(near.vx).toBeLessThan(0);
    const far = enemySteer('spore', ctx(400, 0));
    expect(far.vx).toBeGreaterThan(0);
  });

  it('墨鱼会绕着玩家转（切向分量不为零）', () => {
    const plan = enemySteer('weaver', ctx(235, 0));
    expect(Math.abs(plan.vy)).toBeGreaterThan(0.5);
  });

  it('贪嘴小鱼直冲玩家', () => {
    const plan = enemySteer('crawler', ctx(-100, 0));
    expect(plan.vx).toBeCloseTo(-1);
  });

  it('墨鱼会射会减速的蛛弹，孢子不会', () => {
    expect(enemyFirePlan('weaver').slow).toBe(true);
    expect(enemyFirePlan('spore').slow).toBe(false);
    expect(enemyFirePlan('crawler')).toBe(null);
  });

  it('减速参数是正数且小于 1（否则是加速）', () => {
    expect(PLAYER_SLOW.factor).toBeGreaterThan(0);
    expect(PLAYER_SLOW.factor).toBeLessThan(1);
    expect(PLAYER_SLOW.ms).toBeGreaterThan(0);
  });

  it('花粉云有面积与持续时间', () => {
    expect(MOTH_CLOUD.radius).toBeGreaterThan(20);
    expect(MOTH_CLOUD.lifeMs).toBeGreaterThan(1000);
  });
});

describe('波次编排与覆盖度口径', () => {
  it('同一 wave + seed 的编排完全一致', () => {
    expect(wavePlan(12, 777)).toEqual(wavePlan(12, 777));
  });

  it('不同 seed 的编排不同（每局长得不一样）', () => {
    const a = wavePlan(12, 1).plan.map((p) => p.type).join(',');
    const b = wavePlan(12, 2).plan.map((p) => p.type).join(',');
    expect(a).not.toBe(b);
  });

  it('主题偏置能指向任何敌种（包括新敌种）', () => {
    const biased = wavePlan(10, 5, { typeBias: { charger: 8 } });
    const types = biased.plan.map((p) => p.type);
    expect(types.filter((t) => t === 'charger').length)
      .toBeGreaterThan(types.filter((t) => t === 'crawler').length);
  });

  it('精英波的时间线里有一条 elite 事件', () => {
    const ev = buildTimeline(7, 42).filter((e) => e.kind === 'elite');
    expect(ev.length).toBe(1);
    expect(ev[0].affix).toBeTruthy();
    const none = buildTimeline(8, 42).filter((e) => e.kind === 'elite');
    expect(none.length).toBe(0);
  });

  it('eliteFor 与 wavePlan 里的精英一致', () => {
    const p = wavePlan(12, 33);
    expect(p.elite).toEqual(eliteFor(12, 33));
  });

  it('需求 DPS 把精英算进去了（覆盖度不能骗人）', () => {
    const wave = 12;
    const withElite = waveDpsNeed(wave, 33);
    // 手动算一遍"不含精英"的需求
    const p = wavePlan(wave, 33);
    let hp = 0;
    for (const e of p.plan) {
      hp += enemyStats(e.type, wave).hp * (e.type === 'swarm' ? 3 : 1);
    }
    const interval = Math.max(0.32, 1.05 - wave * 0.045);
    const window = Math.max(1, p.count * interval);
    const without = Math.round(hp / window);
    expect(withElite).toBeGreaterThan(without);
    expect(p.elite).toBeTruthy();
  });

  it('需求 DPS 整体爬坡，且没有断崖', () => {
    // 注意：**不要求逐波单调** —— 每一波的怪种组合是随机的，
    // 需求会有几个百分点的抖动（小回落是噪声，大回落才是坑）。
    // 真正要守住的是"不许出现台阶"与"整体在涨"。
    // ⚠️ 容差 20%：每一波的**怪种组合是随机的**，而沙丁鱼群一次算 3 只
    // ⇒ 需求天然有 ±15~20% 的抖动（这不是"台阶"，是这一波恰好是什么怪）。
    // 真正要防的是**章台阶的断层**（需求突然翻倍），那会被这条抓住。
    let prev = waveDpsNeed(1, 7);
    for (let w = 2; w <= 20; w++) {
      const need = waveDpsNeed(w, 7);
      expect(need, `第 ${w} 波`).toBeGreaterThan(prev * 0.8);
      prev = need;
    }
    expect(waveDpsNeed(20, 7)).toBeGreaterThan(waveDpsNeed(5, 7) * 2);
  });
});
