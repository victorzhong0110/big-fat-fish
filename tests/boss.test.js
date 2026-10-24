import { describe, it, expect } from 'vitest';
import {
  bossPhase, bossPhaseStats, phaseChanged, burstOffset, BOSS_PHASE_COUNT,
  BOSSES, bossForChapter, bossById, bossShellStep, bossSummonStep, bossChargeStep,
  BOSS_SHELL, BOSS_SUMMON, BOSS_CHARGE,
} from '../src/systems/boss.js';

describe('bossPhase', () => {
  it('血量比例决定阶段', () => {
    expect(bossPhase(100, 100)).toBe(1);
    expect(bossPhase(70, 100)).toBe(1);
    expect(bossPhase(66, 100)).toBe(2);
    expect(bossPhase(34, 100)).toBe(2);
    expect(bossPhase(33, 100)).toBe(3);
    expect(bossPhase(1, 100)).toBe(3);
  });

  it('边界值按"大于"判定', () => {
    expect(bossPhase(67, 100)).toBe(1);
    expect(bossPhase(66, 100)).toBe(2);
    expect(bossPhase(34, 100)).toBe(2);
    expect(bossPhase(33, 100)).toBe(3);
  });

  it('异常输入不崩', () => {
    expect(bossPhase(10, 0)).toBe(1);
    expect(bossPhase(-5, 100)).toBe(3);
  });

  it('阶段数固定为 3', () => {
    expect(BOSS_PHASE_COUNT).toBe(3);
  });
});

describe('phaseChanged', () => {
  it('只在阶段上升时为真', () => {
    expect(phaseChanged(1, 2)).toBe(true);
    expect(phaseChanged(2, 3)).toBe(true);
    expect(phaseChanged(2, 2)).toBe(false);
    expect(phaseChanged(3, 1)).toBe(false);
  });
});

describe('bossPhaseStats', () => {
  it('阶段越高弹幕越密、移速越快', () => {
    const p1 = bossPhaseStats(1);
    const p2 = bossPhaseStats(2);
    const p3 = bossPhaseStats(3);
    expect(p3.burst).toBeGreaterThan(p2.burst);
    expect(p2.burst).toBeGreaterThan(p1.burst);
    expect(p3.speedMul).toBeGreaterThan(p2.speedMul);
    expect(p2.speedMul).toBeGreaterThan(p1.speedMul);
    expect(p3.burstMs).toBeLessThan(p2.burstMs);
  });

  it('只有第三阶段放花粉炸弹', () => {
    expect(bossPhaseStats(1).bombMs).toBe(0);
    expect(bossPhaseStats(2).bombMs).toBe(0);
    expect(bossPhaseStats(3).bombMs).toBeGreaterThan(0);
  });

  it('阶段越界时收敛到合法区间', () => {
    expect(bossPhaseStats(0)).toEqual(bossPhaseStats(1));
    expect(bossPhaseStats(99)).toEqual(bossPhaseStats(3));
  });
});

describe('burstOffset', () => {
  it('一阶段不旋转，二三阶段带偏移', () => {
    expect(burstOffset(1, 3)).toBe(0);
    expect(burstOffset(2, 3)).toBeGreaterThan(0);
    expect(burstOffset(3, 5)).toBeGreaterThan(0);
  });

  it('偏移按 4 拍循环', () => {
    expect(burstOffset(3, 4)).toBe(0);
    expect(burstOffset(3, 5)).toBeCloseTo(burstOffset(3, 1), 5);
  });
});

// ── 第七轮：每章一个 Boss ─────────────────────────────
describe('Boss 表', () => {
  it('有四只 Boss，id / 名字 / 纹理 / 应对提示都齐', () => {
    expect(BOSSES.length).toBe(4);
    const ids = new Set();
    for (const b of BOSSES) {
      expect(b.id).toBeTruthy();
      expect(ids.has(b.id)).toBe(false);   // id 不重复
      ids.add(b.id);
      expect(b.name.length).toBeGreaterThan(1);
      expect(b.tag.length).toBeGreaterThan(2);
      expect(b.desc.length).toBeGreaterThan(4);
      expect(b.counter.length).toBeGreaterThan(4);
      expect(b.texture).toBeTruthy();
      expect(b.phases.length).toBe(3);
    }
  });

  it('每只 Boss 都有三个阶段，且阶段越靠后越凶', () => {
    for (const b of BOSSES) {
      const [p1, p2, p3] = b.phases;
      expect(p3.burst, b.id).toBeGreaterThan(p1.burst);
      expect(p3.speedMul, b.id).toBeGreaterThanOrEqual(p1.speedMul);
      expect(p3.aimed, b.id).toBeLessThanOrEqual(p1.aimed);
    }
  });

  it('招牌机制只在这三只里有（结壳 / 召唤 / 冲刺）', () => {
    const specials = BOSSES.map((b) => b.special).filter(Boolean).sort();
    expect(specials).toEqual(['charge', 'shell', 'summon']);
  });

  it('纹理互不相同（不然换了 Boss 看不出来）', () => {
    const tex = BOSSES.map((b) => b.texture);
    expect(new Set(tex).size).toBe(tex.length);
  });
});

describe('每章一个 Boss', () => {
  it('第 1~4 章各对应一只', () => {
    expect(bossForChapter(1).id).toBe('wither_lord');
    expect(bossForChapter(2).id).toBe('stone_warden');
    expect(bossForChapter(3).id).toBe('pollen_queen');
    expect(bossForChapter(4).id).toBe('thorn_king');
  });

  it('同一个章节永远同一只 Boss（可预期）', () => {
    for (let c = 1; c <= 12; c++) {
      expect(bossForChapter(c).id).toBe(bossForChapter(c).id);
    }
  });

  it('无尽模式继续往后循环', () => {
    expect(bossForChapter(5).id).toBe(BOSSES[0].id);
    expect(bossForChapter(6).id).toBe(BOSSES[1].id);
  });

  it('不同章节的 Boss 阶段参数互不相同', () => {
    const a = bossPhaseStats(bossForChapter(1).id, 1);
    const b = bossPhaseStats(bossForChapter(2).id, 1);
    expect(a.burst).not.toBe(b.burst);
  });
});

describe('招牌机制的状态机', () => {
  it('巨甲蟹：定期结壳，壳碎后恢复', () => {
    let st = bossShellStep({}, 16);
    expect(st.shelling).toBe(false);
    // 推进一个周期
    st = bossShellStep({ shelling: false, timer: 0, cycle: 10 }, 20);
    expect(st.shelling).toBe(true);
    expect(st.event).toBe('shell');
    st = bossShellStep(st, BOSS_SHELL.shellMs + 10);
    expect(st.shelling).toBe(false);
    expect(st.event).toBe('break');
  });

  it('母巢：到点就召唤', () => {
    const st = bossSummonStep({ timer: 10 }, 20);
    expect(st.event).toBe('summon');
    expect(st.timer).toBe(BOSS_SUMMON.everyMs);
  });

  it('棘刺之王：蓄力 → 冲刺 → 硬直 → 重新蓄力', () => {
    let st = bossChargeStep({ phase: 'wind', timer: 10, lock: { x: 0, y: 0 } }, 20, { x: 1, y: 0 });
    expect(st.phase).toBe('dash');
    expect(st.event).toBe('dash');
    st = bossChargeStep(st, BOSS_CHARGE.dashMs + 10, { x: 1, y: 0 });
    expect(st.phase).toBe('rest');
    st = bossChargeStep(st, BOSS_CHARGE.restMs + 10, { x: 0.6, y: 0.8 });
    expect(st.phase).toBe('wind');
    expect(st.lock.x).toBeCloseTo(0.6);
    expect(st.lock.y).toBeCloseTo(0.8);
  });

  it('棘刺之王冲刺时沿锁定方向走', () => {
    const st = { phase: 'dash', timer: 100, lock: { x: 0, y: 1 } };
    const next = bossChargeStep(st, 16, { x: 1, y: 0 });
    expect(next.lock.x).toBe(0);
    expect(next.lock.y).toBe(1);
  });
});
