# 《郁金香守卫者》肉鸽版 · 收尾独立复验

生成时间：2026-10-24 20:52:37 CST

复验对象：`/workspace/tulip/game`（工作区最新状态）

判据原则：**以机器字段为准**（`victories` / `reachedWave20` / `hp` / `runState`），
不以手写表格的转述为准；每条结论都标注它出自哪个文件、哪个字段。

## 0. 环境与源码指纹
```
date: 2026-10-24 20:52:37 CST
game dir: /workspace/tulip/game
src js files: 32
src lines:    7283
systems:      25
tests:        24
DECISIONS:    3704 lines
AGENT.md:     310 lines
src sha256:   ef2d889e4ac4cff8dcd287689b8cd37d
dist sha256:  a28137d5788c3fd489df0aa01865f37e
dist mtime:   2026-10-24 20:23:36.982569464
```

## 01-vitest
```
 ✓ tests/draft.test.js (12 tests) 575ms
 ✓ tests/enemies.test.js (38 tests) 176ms
 ✓ tests/run.test.js (24 tests) 122ms
 ✓ tests/counters.test.js (27 tests) 95ms
 ✓ tests/routes.test.js (21 tests) 107ms
 ✓ tests/omens.test.js (12 tests) 75ms
 ✓ tests/relics.test.js (23 tests) 102ms
 ✓ tests/upgrades.test.js (14 tests) 15ms
 ✓ tests/relicValue.test.js (8 tests) 74ms
 ✓ tests/boss.test.js (22 tests) 54ms
 ✓ tests/themes.test.js (8 tests) 64ms
 ✓ tests/pressure.test.js (11 tests) 17ms
 ✓ tests/meta.test.js (16 tests) 54ms
 ✓ tests/waveDirector.test.js (17 tests) 19ms
 ✓ tests/hazards.test.js (12 tests) 12ms
 ✓ tests/characters.test.js (13 tests) 76ms
 ✓ tests/spawner.test.js (7 tests) 24ms
 ✓ tests/dew.test.js (13 tests) 22ms
 ✓ tests/archetypes.test.js (9 tests) 12ms
 ✓ tests/transforms.test.js (8 tests) 8ms
 ✓ tests/camp.test.js (8 tests) 9ms
 ✓ tests/combat.test.js (9 tests) 9ms
 ✓ tests/clock.test.js (6 tests) 8ms


 Test Files  24 passed (24)
      Tests  343 passed (343)
   Start at  20:52:51
   Duration  127.39s (transform 4.02s, setup 0ms, collect 7.99s, tests 2.21s, environment 20ms, prepare 49.52s)

```
- 退出码：**0** ｜ 耗时 139s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/01-vitest.log`

## 02-playtest-webgl
```
✅ 花粉之后会召唤花粉蛾 — 召唤 2 只
✅ 荆棘王会蓄力后冲刺 — 阶段=dash
✅ 抽卡面板标出「对症」的怪（克制关系写给玩家看） — 对症：范围 → 蜂群、石芽（伤害 ×2.5）
✅ 打死 Boss 后弹出篝火（章末休整） — 2 个选项 · pending=true · runState=playing
✅ 篝火「休整」会回血 — 1 → 4
✅ 篝火「磨刃」会加火力（满级则改给露水） — 火力 3→4 · 露水 39→39
✅ 构筑一览列出属性表 — 18 行
✅ HUD 显示 DPS 读数 — DPS 215
✅ 构筑一览给出压力比（你的 DPS ÷ 本波需求） — 215 ÷ 25 = ×9.78
✅ 构筑一览列出本局遗物 — 4 件
✅ 构筑一览列出本章威胁与应对 — 8 行
✅ 对症倍率真的接进伤害结算（按被打的那只怪算） — 手段 ["slow","burst"] → 苔虫 ×1 / 枯壳 ×2.5
✅ 无尽模式第 25 波弹出里程碑赠礼
✅ 赠礼面板标出里程碑 — 无尽里程碑 · 第 24 波 · 白挑 2 张
✅ 赠礼面板没有露水动作（白拿） — 0 个动作
✅ 里程碑第一次挑完面板不关（还要挑第二张） — 4 → 5
✅ 里程碑白挑两张遗物 — 4 → 6
✅ 里程碑之后回到 playing
✅ 暂停面板出现
✅ 恢复后回到 playing — {"runState":"playing","runTime":40.799699999988064,"hp":4,"maxHp":4,"shield":0,"score":503,"combo":0,"kills":5,"spawned":81,"wave":25,"fire":4,"enemies":34,"relics":["twin_petal","frost_edge","swift_pollen","sharp_blade","chill_petal","storm_pollen"],"dew":39,"dewWaves":2,"banished":["gold_core"],"archetypes":[{"id":"edge","name":"锋锐","tiers":2}],"omens":["golden_pollen"],"memory":180,"unlocked":["dew_charm","sturdy_calyx","polished_stamen","twin_petal","light_pollen","swift_pollen","sharp_blade","fatal_scent","nectary","thick_leaf","bouncing_pollen","migrating_root","thorn_spike","long_root","twin_mirror","boiling_nectar","gold_core","combo_wreath","bulwark_bud","vengeful_core","wither_seed","hollow_core","crown_of_petals","storm_pollen","combo_forge","frost_edge","light_step","swift_shadow","guide_flower","chill_petal","spore_burst"],"seed":1355010337,"character":"scout","theme":""}
✅ 暂停中按 P 可解除暂停 — 按下前=paused 松开后=playing
✅ 结算面板出现
✅ 结算显示分数 — score=503
✅ 结算含击杀/存活/章节/评级 — 击杀=5 存活=43s 章节=清明 评级=A
✅ 结算列出本局遗物 — 6 件遗物
✅ 结算显示获得的花房记忆 — 花房记忆 +50
✅ 结算显示本局种子（可复现/可分享） — 本局种子 1355010337
✅ 结算写明死于什么 — 死于 · 花粉炸弹
✅ 结算给出下一个解锁目标（局外进度接得上） — 可以解锁「霜露结晶」了（20 记忆）
✅ 结算画出这一局的强度曲线（每波一根柱） — 8 根
```
- 退出码：**137** ｜ 耗时 162s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/02-playtest-webgl.log`

## 03-playtest-canvas
```
✅ 连击系统生效 — combo=4
✅ 第 3 波弹出花园异象
✅ 异象给出两个互斥选项 — 2 个
✅ 异象可以转身离开 — 1 个离开按钮
✅ 选完异象回到 playing — playing
✅ 异象改了属性表 — omenStats=3
✅ 异象被记录下来 — ["gust"]
✅ 第 2 章开始时先弹路线面板 — 2 条路线
✅ 路线面板写出威胁与收益 — 
        1
        威胁 ×1.3
        棘径
        跃动藤成群冲刺，走位吃紧
 
✅ 选定的路线真的改到这一章的敌人修正量 — 路线=thorn_path 数量 1.05→1.05
✅ 第 2 章开始时再次弹抽卡 — 3 张候选
✅ 抽卡面板标出章节 — 第 2 章 · 雨水
✅ 深化面板标出每张遗物的价格 — ["swift_pollen:24","fatal_scent:24"]
✅ 深化面板渲染出卡片（每张带价格与说明） — 2 张
✅ 深化会再叠一层效果 — 层数 1，遗物 swift_pollen
✅ 深化要花露水 — 露水 36
✅ 深化会结束本次抽卡（深化是"替代"而不是"追加"） — playing
✅ 第二章抽卡后遗物变为 3 个（起始 1 + 抽到 2） — relics=["swift_pollen","fatal_scent","crown_of_petals"]
✅ 第二章抽卡后回到 playing
✅ 深化面板（手里有可深化的牌时）写出新增手段 — 普通
双瓣齐射
弹数 +1，射速 -6%
深化：效果再叠一层（本次不再拿新牌）· 24 露水
深化后新增手段：范围、爆发（伤害 ×2.5）
✅ 四个章节各有主题 — ["石芽阵","蜂潮","毒雾","藤鞭"]
```
- 退出码：**137** ｜ 耗时 50s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/03-playtest-canvas.log`

## 04-build-singlefile
```
OK /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/round2-out/rogue-latest.html 1350739 bytes
```
- 退出码：**0** ｜ 耗时 0s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/04-build-singlefile.log`

## 05-singlefile-external-links
```
OK: 零外链（除 w3.org 命名空间与 phaser 署名）
```
- 退出码：**0** ｜ 耗时 0s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/05-singlefile-external-links.log`

## 06-guard-hud
```
❌ HUD 几何守护：13 组重叠
   #wave × .hearts  125×17px = 2133px²（占小元素 99%）
   #dew × #fire-level  39×28px = 1096px²（占小元素 64%）
   #fire-level × #combo  60×16px = 999px²（占小元素 43%）
   #hero × #fire-level  32×28px = 909px²（占小元素 71%）
   #hero × #combo  46×16px = 759px²（占小元素 59%）
   #dew × #combo  16×16px = 265px²（占小元素 16%）
   #hero × #combo-text  14×16px = 233px²（占小元素 19%）
   #wave × #combo  9×16px = 157px²（占小元素 5%）
   #wave × #combo-text  9×16px = 157px²（占小元素 13%）
   #hero × #score  15×8px = 128px²（占小元素 33%）
   #fire-level × #score  15×8px = 128px²（占小元素 33%）
   #combo × .hearts  11×11px = 121px²（占小元素 6%）
   #combo-text × .hearts  11×11px = 121px²（占小元素 10%）

参考修法（注入后 13 组 → 0 组）：
   .relics { width: auto; flex: 0 1 auto; }
   .hud-group { flex: 0 1 auto; }
   .tag { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
```
- 退出码：**1** ｜ 耗时 16s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/06-guard-hud.log`

## 07-verify-singlefile
```
✅ 页面标题正确 郁金香守卫者 · Tulip Guard
✅ 主菜单渲染 
✅ 主菜单有今日挑战入口 
✅ 游戏场景已建立 
✅ 开局先进入路线选择 route
✅ 路线二选一（每章选战场） 2 条候选
✅ 抽卡面板有 3 张候选 3 张
✅ 抽卡后进入战斗 playing
✅ 开火后有击杀或敌人生成 kills=0 spawned=4
✅ HUD 显示波次 
✅ 构筑面板可打开 
控制台错误：0
```
- 退出码：**0** ｜ 耗时 52s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/07-verify-singlefile.log`

## 08-balance-latest
```
--- smart  (balance-report-smart.json, mtime 1792845955) ---
 runs 3 | skill smart | maxSeconds 250 game-time
 victories(通关) 1 | reachedWave20 3
 avgWave 20.7 | min 20 | max 22
 lastCoverage [1.53, 0.97, 2.42] | avgKillRate 0.94 | avgDew 53
 dropWave [5, 21, None] | deathCauses ['boss', 'charger', 'spore']
   wave  20 state=over     hp=0/7 cause=boss killed=546/595 relics=6
   wave  22 state=timeout  hp=6/6 cause=charger killed=672/733 relics=6
   wave  20 state=victory  hp=9/9 cause=spore killed=658/662 relics=7

--- good  (balance-report-good.json, mtime 1792839428) ---
 runs 2 | skill good | maxSeconds 250 game-time
 victories(通关) 0 | reachedWave20 0
 avgWave 9.5 | min 7 | max 12
 lastCoverage [1.22, 0.88] | avgKillRate 0.18 | avgDew 28
 dropWave [7, 7] | deathCauses ['swarm', 'crawler']
   wave  12 state=over     hp=0/6 cause=swarm killed=17/208 relics=4
   wave   7 state=over     hp=0/6 cause=crawler killed=23/82 relics=3

```
- 退出码：**0** ｜ 耗时 1s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/08-balance-latest.log`

## 09-counters-sim
```
局数 3000（同一串随机数，两种策略各跑一遍）
策略   | 最终倍率(第四章口径) | 平均手段数 | 有手段的局
good   |              1.956 |      2.925 |      100%
smart  |              2.425 |      3.799 |      100%

smart 比 good 高 24.0% 的有效倍率
普通 DPS：good 223.184  smart 218.102
有效 DPS：good 436.5  smart 528.9  ⇒ smart 高 21.2%

各章的单独倍率（无手段 → 只带一种手段）：
  第1章 area=33% burst=0% slow=6% mobility=61%
  第2章 area=32% burst=3% slow=13% mobility=51%
  第3章 area=31% burst=7% slow=13% mobility=48%
  第4章 area=29% burst=8% slow=14% mobility=50%
```
- 退出码：**0** ｜ 耗时 12s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/09-counters-sim.log`

## 10-hud-css-source
```
--- .relics ---
.relics {
  display: flex; flex-wrap: wrap; gap: 4px;
  width: 100%; justify-content: center;
}
--- .tag ---
.tag {
  font-size: 12.5px;
  color: var(--dim);
  font-family: var(--mono);
  padding: 3px 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #ffffff06;
  white-space: nowrap;
}
--- .hud-group ---
.hud-group { display: flex; align-items: center; gap: 12px; min-width: 0; }
.hud-group.center { flex-direction: column; gap: 3px; }
.hud-group.right { justify-content: flex-end; }

.hearts { display: flex; gap: 5px; }
.heart {
  width: 17px; height: 17px;
  background: linear-gradient(180deg, var(--pink), #d63b6d);
  clip-path: path("M8.5 16C4 12 0 9.2 0 5.8A4.8 4.8 0 0 1 8.5 3 4.8 4.8 0 0 1 17 5.8C17 9.2 13 12 8.5 16Z");
  box-shadow: 0 0 10px rgba(255, 93, 143, .5);
}
```
- 退出码：**0** ｜ 耗时 1s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/10-hud-css-source.log`

## 11-counter-wiring
```
29-import { availableRelicIds, lockedRelics, unlockRelic, awardRun } from '../systems/meta.js';
30-import { loadMeta, saveMeta } from '../meta-store.js';
31-import {
32-  createRunPlan, modsForWave, ensureChapter, chapterIndexOf, isFinalWave,
33-  runResult, hashSeed, FINAL_BOSS_HP_MUL, isFinalBossEnemy, omenWaveOf, dailySeed,
--
1609-   * 子弹是**穿体的**（穿透遗物会让同一颗子弹打中多只），
1610-   * 每只怪怕的手段不一样 ⇒ 倍率必须按**被打的那只**算。
1611-   */
1612:  counterMultFor(enemy) {
1613-    const type = enemy?.getData?.('type');
1614-    if (!type) return 1;
1615:    return counterMult(type, this.counterTags || []);
1616-  }
1617-
1618-  /** 统一的扣血入口：血量归零就走击杀流程 */
1619-  damageEnemy(enemy, dmg) {
1620-    if (!enemy?.active) return;
1621-    // 已经在死亡流程里的敌人不再重复结算。
--
1631-      this.fxSpark.explode(3, enemy.x, enemy.y);
1632-      return;
1633-    }
1634:    const mult = this.counterMultFor(enemy);
1635-    const hp = (enemy.getData('hp') || 1) - dmg * mult;
1636-    enemy.setData('hp', hp);
1637-    if (hp <= 0) {
1638-      enemy.setData('dying', true);
1639-      // 第九轮：对症击杀给一声反馈（让玩家能"听见"自己打对了）
1640-      if (mult > 1) sfx.counter();
```
- 退出码：**0** ｜ 耗时 1s ｜ 完整日志 `/workspace/round2-out/final-verify/logs/11-counter-wiring.log`

## 退出码汇总
```
```

--- 全量日志目录：`/workspace/round2-out/final-verify/logs` ---
