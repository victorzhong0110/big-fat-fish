import { describe, it, expect } from 'vitest';
import {
  createRunPlan, extendRunPlan, ensureChapter, chapterIndexOf, isChapterStart, isFinalWave,
  modsForWave, chaptersCleared, gradeOf, runResult, hashSeed, isFinalBossEnemy,
  WAVES_PER_CHAPTER, RUN_CHAPTERS, FINAL_WAVE,
} from '../src/systems/run.js';
import { NEUTRAL_MODS } from '../src/systems/themes.js';

describe('一局的章节结构', () => {
  it('章长与总波数固定', () => {
    expect(WAVES_PER_CHAPTER).toBe(5);
    expect(RUN_CHAPTERS).toBe(4);
    expect(FINAL_WAVE).toBe(20);
  });

  it('波次 → 章节序号', () => {
    expect(chapterIndexOf(1)).toBe(1);
    expect(chapterIndexOf(5)).toBe(1);
    expect(chapterIndexOf(6)).toBe(2);
    expect(chapterIndexOf(20)).toBe(4);
    expect(chapterIndexOf(21)).toBe(5);
  });

  it('每章第一波是抽卡点', () => {
    for (const w of [1, 6, 11, 16]) expect(isChapterStart(w)).toBe(true);
    for (const w of [2, 5, 7, 10, 20]) expect(isChapterStart(w)).toBe(false);
  });

  it('终局波唯一', () => {
    expect(isFinalWave(20)).toBe(true);
    expect(isFinalWave(19)).toBe(false);
    expect(isFinalWave(21)).toBe(false);
  });

  it('打完某波算清了几章', () => {
    expect(chaptersCleared(1)).toBe(0);
    expect(chaptersCleared(5)).toBe(0);
    expect(chaptersCleared(6)).toBe(1);
    expect(chaptersCleared(20)).toBe(3);
  });
});

describe('章节计划', () => {
  it('同一 seed 得到同一份计划', () => {
    const a = createRunPlan(1234);
    const b = createRunPlan(1234);
    expect(a.chapters.map((c) => c.theme.id)).toEqual(b.chapters.map((c) => c.theme.id));
  });

  it('不同 seed 大概率给出不同计划', () => {
    const a = createRunPlan(1).chapters.map((c) => c.theme.id).join('|');
    const b = createRunPlan(2).chapters.map((c) => c.theme.id).join('|');
    expect(a).not.toBe(b);
  });

  it('计划覆盖到终局波', () => {
    const plan = createRunPlan(7);
    expect(plan.chapters).toHaveLength(RUN_CHAPTERS);
    expect(plan.chapters[RUN_CHAPTERS - 1].waveEnd).toBe(FINAL_WAVE);
  });

  it('相邻两章不会用同一个主题', () => {
    for (let seed = 0; seed < 30; seed++) {
      const plan = createRunPlan(seed);
      for (let i = 1; i < plan.chapters.length; i++) {
        expect(plan.chapters[i].theme.id).not.toBe(plan.chapters[i - 1].theme.id);
      }
    }
  });

  it('章节名取节气', () => {
    const plan = createRunPlan(3);
    expect(plan.chapters.map((c) => c.name)).toEqual(['浅滩', '珊瑚雨', '涌浪', '春潮']);
  });

  it('modsForWave 返回该章主题的修正量', () => {
    const plan = createRunPlan(11);
    const mods = modsForWave(plan, 7);
    expect(mods).toBeTruthy();
    expect(mods.enemyCountMul).toBeGreaterThan(0);
  });

  it('无尽模式可以往后加章，且不重复上一章主题', () => {
    const plan = createRunPlan(5);
    const added = extendRunPlan(plan);
    expect(plan.chapters).toHaveLength(RUN_CHAPTERS + 1);
    expect(added.index).toBe(RUN_CHAPTERS + 1);
    expect(added.theme.id).not.toBe(plan.chapters[RUN_CHAPTERS - 1].theme.id);
    expect(plan.endless).toBe(true);
  });

  it('ensureChapter 会自动补齐后面的章', () => {
    const plan = createRunPlan(9);
    const c = ensureChapter(plan, 6);
    expect(c.index).toBe(6);
    expect(plan.chapters.length).toBeGreaterThanOrEqual(6);
  });

  it('hashSeed 同盐同值、异盐异值', () => {
    expect(hashSeed(5, 1)).toBe(hashSeed(5, 1));
    expect(hashSeed(5, 1)).not.toBe(hashSeed(5, 2));
  });
});

describe('结算与评级', () => {
  it('通关按得分分档', () => {
    // 阈值与 GRADE_THRESHOLDS 一致（systems/run.js）
    expect(gradeOf({ victory: true, score: 90000, cleared: 4 })).toBe('S');
    expect(gradeOf({ victory: true, score: 65000, cleared: 4 })).toBe('A');
    expect(gradeOf({ victory: true, score: 45000, cleared: 4 })).toBe('B');
    expect(gradeOf({ victory: true, score: 100, cleared: 4 })).toBe('C');
  });

  it('分档边界是闭区间下界（刚好到线就升级）', () => {
    expect(gradeOf({ victory: true, score: 89999, cleared: 4 })).toBe('A');
    expect(gradeOf({ victory: true, score: 64999, cleared: 4 })).toBe('B');
    expect(gradeOf({ victory: true, score: 44999, cleared: 4 })).toBe('C');
  });

  it('失败按清章数分档', () => {
    expect(gradeOf({ victory: false, cleared: 0 })).toBe('D');
    expect(gradeOf({ victory: false, cleared: 1 })).toBe('C');
    expect(gradeOf({ victory: false, cleared: 2 })).toBe('B');
    expect(gradeOf({ victory: false, cleared: 3 })).toBe('A');
  });

  it('runResult 汇总一局的统计', () => {
    const r = runResult({
      victory: true, score: 70000, wave: 20, kills: 120, bestCombo: 30,
      survived: 300, relics: ['dew_charm'], seed: 1,
    });
    expect(r.victory).toBe(true);
    expect(r.grade).toBe('A');
    expect(r.chaptersCleared).toBe(RUN_CHAPTERS);
    expect(r.relics).toEqual(['dew_charm']);
  });

  it('失败时 runResult 的清章数正确', () => {
    const r = runResult({ victory: false, score: 100, wave: 12 });
    expect(r.chaptersCleared).toBe(2);
    expect(r.grade).toBe('B');
  });
});

describe('终局 Boss 的判定（按出生波次，不按当前波次）', () => {
  it('第 20 波出生的 Boss 就是终局 Boss', () => {
    expect(isFinalBossEnemy({ type: 'boss', wave: FINAL_WAVE })).toBe(true);
  });

  it('回归：波次已经推进到 21，但 20 波出生的 Boss 仍然是终局 Boss', () => {
    // 旧实现用"死亡时的当前波次"判断，玩家没在波次结束前打死它就永远赢不了
    expect(isFinalBossEnemy({ type: 'boss', wave: FINAL_WAVE })).toBe(true);
    expect(isFinalBossEnemy({ type: 'boss', wave: FINAL_WAVE + 1 })).toBe(false);
  });

  it('无尽模式里没有终局 Boss', () => {
    expect(isFinalBossEnemy({ type: 'boss', wave: FINAL_WAVE }, { endless: true })).toBe(false);
  });

  it('普通怪与空值都不是终局 Boss', () => {
    expect(isFinalBossEnemy({ type: 'crawler', wave: FINAL_WAVE })).toBe(false);
    expect(isFinalBossEnemy(null)).toBe(false);
    expect(isFinalBossEnemy(undefined)).toBe(false);
  });

  it('章内 Boss（第 5/10/15 波）不是终局 Boss', () => {
    for (const w of [5, 10, 15]) expect(isFinalBossEnemy({ type: 'boss', wave: w })).toBe(false);
  });
});
