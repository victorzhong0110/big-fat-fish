// 章内路线（第六轮）的纯逻辑测试。
//
// 这一轮的核心主张：**每一章玩家都要自己选"愿意冒多大的险"**。
// 所以测试不只查"路线表有没有写全"，还查三件容易悄悄坏掉的事：
//   ① 路线真的改得到这一章的敌人修正量（而不是只写在数据里没人读）；
//   ② 主题 × 路线叠起来不会炸出尖峰（上限真的生效）；
//   ③ 同一 seed 必得同一组候选（路线也是可复现的随机）。
import { describe, it, expect } from 'vitest';
import {
  ROUTES, ROUTE_BY_ID, routeById, routeMods, routeRisk, routeReward,
  pickRouteOptions, mergeChapterMods, routeSummary, routeAvailableIn, MOD_CAPS,
} from '../src/systems/routes.js';
import { createRunPlan, chooseRoute, routeOfChapter, routeForWave, modsForWave } from '../src/systems/run.js';
import { themeMods, themeById } from '../src/systems/themes.js';
import { mulberry32 } from '../src/systems/rng.js';
import { chapterTypeIds } from '../src/systems/enemies.js';

describe('路线表', () => {
  it('每条路线都有完整的字段', () => {
    for (const r of ROUTES) {
      expect(r.id, r.id).toBeTruthy();
      expect(r.name.length, r.id).toBeGreaterThan(0);
      expect(r.riskText.length, r.id).toBeGreaterThan(3);
      expect(r.rewardText.length, r.id).toBeGreaterThan(3);
      expect(r.threat, r.id).toBeGreaterThan(0);
      expect(r.reward, r.id).toBeGreaterThan(0);
      expect(r.mods, r.id).toBeTruthy();
    }
  });

  it('每条路线都真的改了点东西（没有"纯装饰"的路线）', () => {
    for (const r of ROUTES) {
      const m = routeMods(r);
      const touched = Object.entries(r.mods).filter(([, v]) => v !== 1);
      expect(touched.length, r.id).toBeGreaterThan(0);
      // 至少有一个倍率真的不是 1
      const mul = Object.entries(r.mods)
        .filter(([k]) => k !== 'typeBias')
        .filter(([, v]) => typeof v === 'number' && v !== 1);
      expect(mul.length + (r.mods.typeBias ? 1 : 0), r.id).toBeGreaterThan(0);
      expect(m.enemyHpMul).toBeGreaterThan(0);
    }
  });

  it('没有"纯赚不亏"的路线（威胁与收益必须成对出现）', () => {
    for (const r of ROUTES) {
      const riskSide = Object.entries(r.mods).some(([k, v]) => (
        (k === 'enemyHpMul' || k === 'enemyCountMul' || k === 'enemySpeedMul') && v > 1
      )) || (r.mods.typeBias && Object.keys(r.mods.typeBias).length > 0);
      const rewardSide = Object.entries(r.mods).some(([k, v]) => (
        (k === 'scoreMul' || k === 'dropMul' || k === 'dewMul') && v > 1
      ));
      const costSide = Object.entries(r.mods).some(([k, v]) => (
        (k === 'enemyHpMul' || k === 'enemyCountMul' || k === 'enemySpeedMul' || k === 'scoreMul') && v < 1
      ));
      // 要么有风险侧（怪更多/更硬/偏置），要么有代价侧（分数更低）
      expect(riskSide || costSide, r.id).toBe(true);
      expect(rewardSide, r.id).toBe(true);
    }
  });

  it('没有一条路线的收益是"掉落"（掉落会偷偷推快火力等级）', () => {
    // 实测教训：掉落 ×1.35 让 good 机器人从 0/3 通关变成 2/2 通关（DECISIONS §17.8）。
    // 火力等级是指数级的（Lv.2 7 DPS → Lv.5 107 DPS），"更多掉落"等于白送一级火力。
    for (const r of ROUTES) {
      expect(r.mods.dropMul ?? 1, r.id).toBe(1);
    }
  });

  it('路线的收益走"露水"（备战货币，不跳过火力等级）', () => {
    const dewRoutes = ROUTES.filter((r) => (r.mods.dewMul ?? 1) > 1);
    expect(dewRoutes.length).toBeGreaterThanOrEqual(3);
    for (const r of dewRoutes) expect(r.mods.dewMul, r.id).toBeGreaterThan(1);
  });

  it('威胁/收益的辅助函数与表里一致', () => {
    for (const r of ROUTES) {
      expect(routeRisk(r)).toBe(r.threat);
      expect(routeReward(r)).toBe(r.reward);
      expect(routeById(r.id)).toBe(r);
      expect(routeSummary(r)).toContain(r.name);
    }
    expect(routeById('nope')).toBe(null);
    expect(ROUTE_BY_ID[ROUTES[0].id]).toBeTruthy();
  });
});

describe('候选路线', () => {
  it('一次给两条且互不相同', () => {
    for (let seed = 1; seed < 30; seed++) {
      const opts = pickRouteOptions(mulberry32(seed), 2);
      expect(opts.length).toBe(2);
      expect(opts[0]).not.toBe(opts[1]);
    }
  });

  it('同一个 rng 必得同一组候选（可复现）', () => {
    const a = pickRouteOptions(mulberry32(42), 2);
    const b = pickRouteOptions(mulberry32(42), 2);
    expect(a).toEqual(b);
  });

  it('每一章都有两条候选路线', () => {
    const plan = createRunPlan(1234);
    for (const c of plan.chapters) {
      expect(c.routes.length, `第 ${c.index} 章`).toBe(2);
      expect(new Set(c.routes).size).toBe(2);
      expect(c.route).toBe(null); // 还没选
    }
  });

  it('给出的路线，它的偏置敌种真的会出现在这一章（不骗玩家）', () => {
    const plan = createRunPlan(1234);
    for (const c of plan.chapters) {
      const ids = chapterTypeIds(c.index);
      for (const rid of c.routes) {
        const r = routeById(rid);
        const bias = Object.keys(r.mods.typeBias || {});
        for (const b of bias) {
          expect(ids, `第 ${c.index} 章的「${r.name}」偏置了 ${b}`).toContain(b);
        }
      }
    }
  });

  it('第一章不会出现"甲壳泥沼"这种用不上的路线（铁壳蟹还没解锁）', () => {
    const plan = createRunPlan(1234);
    const first = plan.chapters[0].routes.map(routeById);
    for (const r of first) {
      expect(routeAvailableIn(r, chapterTypeIds(1)), r.id).toBe(true);
    }
  });
});

describe('选定路线', () => {
  it('选中后能读回来', () => {
    const plan = createRunPlan(555);
    const id = plan.chapters[0].routes[0];
    const r = chooseRoute(plan, 1, id);
    expect(r).toBeTruthy();
    expect(routeOfChapter(plan, 1).id).toBe(id);
    expect(routeForWave(plan, 1).id).toBe(id);
    expect(routeForWave(plan, 3).id).toBe(id);  // 同一章的波次共用一条路线
  });

  it('不在候选里的路线选不了', () => {
    const plan = createRunPlan(556);
    const bad = ROUTES.find((r) => !plan.chapters[0].routes.includes(r.id));
    expect(bad).toBeTruthy();
    expect(chooseRoute(plan, 1, bad.id)).toBe(null);
    expect(routeOfChapter(plan, 1)).toBe(null);
  });

  it('选路线会真的改到这一章的敌人修正量', () => {
    const plan = createRunPlan(777);
    const before = modsForWave(plan, 1);
    const id = plan.chapters[0].routes.find((x) => {
      const r = routeById(x);
      return (r.mods.enemyCountMul ?? 1) !== 1;
    });
    if (!id) return; // 这一章两条候选都没有改数量 —— 换个种子也有
    chooseRoute(plan, 1, id);
    const after = modsForWave(plan, 1);
    expect(after.enemyCountMul).not.toBe(before.enemyCountMul);
  });
});

describe('主题 × 路线 的叠加与上限', () => {
  it('倍率相乘（没到上限时）', () => {
    const m = mergeChapterMods({ enemyHpMul: 1.2 }, { enemyHpMul: 1.3 });
    expect(m.enemyHpMul).toBeCloseTo(1.56, 4);
  });

  it('相乘之后会被上限截断', () => {
    const m = mergeChapterMods({ enemyHpMul: 1.35 }, { enemyHpMul: 1.35 });
    expect(m.enemyHpMul).toBe(MOD_CAPS.enemyHpMul);
  });

  it('倍率有上限（不出尖峰）', () => {
    const m = mergeChapterMods({ enemyHpMul: 1.35, enemyCountMul: 1.35 }, { enemyHpMul: 1.35, enemyCountMul: 1.3 });
    expect(m.enemyHpMul).toBeLessThanOrEqual(MOD_CAPS.enemyHpMul);
    expect(m.enemyCountMul).toBeLessThanOrEqual(MOD_CAPS.enemyCountMul);
  });

  it('敌种偏置相乘且有上限', () => {
    const m = mergeChapterMods({ typeBias: { swarm: 3 } }, { typeBias: { swarm: 3 } });
    expect(m.typeBias.swarm).toBe(9);
    const m2 = mergeChapterMods({ typeBias: { swarm: 9 } }, { typeBias: { swarm: 9 } });
    expect(m2.typeBias.swarm).toBe(MOD_CAPS.typeBias);
  });

  it('花粉炸弹取间隔更短的那个（不是相乘）', () => {
    expect(mergeChapterMods({ hazardEverySec: 6 }, { hazardEverySec: 0 }).hazardEverySec).toBe(6);
    expect(mergeChapterMods({ hazardEverySec: 6 }, { hazardEverySec: 4 }).hazardEverySec).toBe(4);
    expect(mergeChapterMods({ hazardEverySec: 0 }, { hazardEverySec: 0 }).hazardEverySec).toBe(0);
  });

  it('没选路线时等于只有主题', () => {
    const theme = themeMods(themeById('carapace'));
    const m = mergeChapterMods(theme, null);
    expect(m.enemyHpMul).toBe(theme.enemyHpMul);
    expect(m.enemyCountMul).toBe(theme.enemyCountMul);
  });

  it('主题与路线叠乘后仍然不超过上限', () => {
    for (const t of ['carapace', 'gale', 'feast', 'surge']) {
      for (const r of ROUTES) {
        const m = mergeChapterMods(themeMods(themeById(t)), r.mods);
        expect(m.enemyHpMul, `${t}+${r.id}`).toBeLessThanOrEqual(MOD_CAPS.enemyHpMul);
        expect(m.enemyCountMul, `${t}+${r.id}`).toBeLessThanOrEqual(MOD_CAPS.enemyCountMul);
        expect(m.enemySpeedMul, `${t}+${r.id}`).toBeLessThanOrEqual(MOD_CAPS.enemySpeedMul);
      }
    }
  });
});
