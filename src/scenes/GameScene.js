import Phaser from 'phaser';
import { createTextures } from '../art/textures.js';
import { createSpawner } from '../systems/spawner.js';
import { createCombat, registerKill, decayCombo, comboRemaining, COMBO_WINDOW } from '../systems/combat.js';
import {
  fireStats, enemyStats, INVULN_MS, DASH_COOLDOWN_MS, DASH_DURATION_MS, DASH_SPEED, PLAYER_MAX_HP,
  chapterStartFire,
} from '../systems/upgrades.js';
import {
  enemySteer, enemyFirePlan, enemyName, eliteStats, chargerStep, huskStep, chapterThreats,
  deathCauseName, CHARGER, HUSK, PLAYER_SLOW, MOTH_CLOUD, ELITE_AFFIXES,
} from '../systems/enemies.js';
import {
  bossPhase, bossPhaseStats, phaseChanged, burstOffset, bossById, bossForChapter,
  bossShellStep, bossSummonStep, bossChargeStep, BOSS_SHELL, BOSS_SUMMON, BOSS_CHARGE,
} from '../systems/boss.js';
import { inBlast, telegraphProgress, swarmFormation, TELEGRAPH_MS, BLAST_RADIUS, SWARM } from '../systems/hazards.js';
import { chapterOf } from '../systems/waveDirector.js';
import { wallStep } from '../systems/clock.js';
import { deriveFireStats, relicById } from '../systems/relics.js';
import { applyBuild, characterCards, characterById, initialRelics, DEFAULT_CHARACTER } from '../systems/characters.js';
import { drawRelicOptions } from '../systems/draft.js';
import { draftActions, actionById, waveDew, waveDewFor, deepenCost } from '../systems/dew.js';
import { drawOmen, statEffects, instantEffects, applyStatEffects } from '../systems/omens.js';
import { comboDamageBonus, lowHpDamageMul, killDamageBonus, slowFactor } from '../systems/transforms.js';
import { waveDpsNeed, dpsOf, pressureRatio, waveCounterMult, chapterCounterMult, chapterCounterBreakdown, bossFightSeconds } from '../systems/pressure.js';
import { counterMult, tagsFromStats, counterNote } from '../systems/counters.js';
import { activeArchetypes } from '../systems/archetypes.js';
import { availableRelicIds, lockedRelics, unlockRelic, awardRun } from '../systems/meta.js';
import { loadMeta, saveMeta } from '../meta-store.js';
import {
  createRunPlan, modsForWave, ensureChapter, chapterIndexOf, isFinalWave,
  runResult, hashSeed, FINAL_BOSS_HP_MUL, isFinalBossEnemy, omenWaveOf, dailySeed,
  chooseRoute, routeOfChapter,
} from '../systems/run.js';
import { routeById } from '../systems/routes.js';
import { CAMP_OPTIONS, campAvailable, applyCamp, campOptionText } from '../systems/camp.js';
import { mulberry32 } from '../systems/rng.js';
import { hud, nextUnlockHint } from '../hud.js';
import { sfx, bgm } from '../audio.js';
import { touch } from '../touch.js';

export const ARENA = { width: 960, height: 600 };

/**
 * 大肥鱼的内心 OS（第十四轮彩蛋）。
 *
 * 来源：DeepSeek 社区二创「蓝色大肥鱼 / 鲸鱼娘」最有名的几句 ——
 * 「我去吃饭了，测完告诉我就行」（名场面）、「真当我是便宜货啊」（傲娇）、
 * 「用户彻底怒了」（思考链碎碎念）、DeepSleep（深度求索，深度睡眠）等。
 * ⚠️ **按章确定性轮换**（不用随机数）⇒ 不影响任何可复现性，也不进任何 RNG 流。
 */
const FISH_QUIPS = [
  '「我去吃饭了，测完告诉我就行。」',
  '「摸鱼中……（其实在算伤害）」',
  '「今天吃白饭，明天吃红烧肉。」',
  '「真当我是便宜货啊。」',
  '「用户彻底怒了。」',
  '「DeepSleep：深度求索，深度睡眠。」',
];
const PLAYER_SPEED = 235;
const BEST_KEY = 'tulip-guard-best';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  create() {
    createTextures(this);
    this.runState = 'idle';
    this.runTime = 0;
    this.characterId = DEFAULT_CHARACTER;
    // 局外存档：深海藏品（只解锁内容，不加数值）
    this.meta = loadMeta();
    this.resetRun();

    // 地面与场地
    this.add.tileSprite(0, 0, ARENA.width, ARENA.height, 'soil').setOrigin(0, 0).setDepth(-10);
    this.add.rectangle(ARENA.width / 2, ARENA.height / 2, ARENA.width, ARENA.height)
      .setStrokeStyle(2, 0x322b47, 0.9).setDepth(-9);
    for (let i = 0; i < 10; i++) {
      this.add.image(40 + (i * 97) % (ARENA.width - 80), 30 + (i * 61) % (ARENA.height - 60), 'bloom')
        .setAlpha(0.07).setScale(2.4).setDepth(-8);
    }

    // 分组
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.eBullets = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.hazards = this.add.group();

    // 玩家
    this.player = this.physics.add.sprite(ARENA.width / 2, ARENA.height / 2, 'player');
    this.player.setCollideWorldBounds(true).setDepth(20);

    // 粒子发射器
    this.fxPetal = this.add.particles(0, 0, 'dot', {
      lifespan: 460, speed: { min: 40, max: 200 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 0.95, end: 0 }, blendMode: 'ADD', emitting: false, tint: 0xff87ad,
    });
    this.fxSpark = this.add.particles(0, 0, 'dot', {
      lifespan: 240, speed: { min: 90, max: 260 }, scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false, tint: 0xfff0f5,
    });
    this.fxHeal = this.add.particles(0, 0, 'dot', {
      lifespan: 520, speed: { min: 20, max: 90 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', emitting: false, tint: 0x58d68d,
    });

    // 输入
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SHIFT,SPACE,P,ONE,TWO,THREE,FOUR');
    this.keys.SHIFT.on('down', () => this.tryDash());
    // 暂停键走全局监听：面板打开时（runState 不是 playing）场景内的 P 键没有意义，
    // 但玩家在暂停面板上按 P 必须能解除暂停，所以监听挂在 window 上
    this.pauseKeyHandler = (e) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.togglePause();
      }
    };
    window.addEventListener('keydown', this.pauseKeyHandler);
    this.events.once('shutdown', () => window.removeEventListener('keydown', this.pauseKeyHandler));
    this.pointerDown = false;
    this.input.on('pointerdown', () => { this.pointerDown = true; });
    this.input.on('pointerup', () => { this.pointerDown = false; });
    this.input.on('gameout', () => { this.pointerDown = false; });

    // 碰撞
    // 注意：Phaser 在「组 vs 单个对象」的重叠回调里，参数顺序是 (单个对象, 组内成员)，
    // 下面统一用 other() 取出真正关心的一方，避免拿错对象（曾导致拾取道具时销毁玩家）
    const other = (a, b, self) => (a === self ? b : a);
    this.physics.add.overlap(this.bullets, this.enemies, (a, b) => {
      const bullet = a.getData?.('damage') !== undefined ? a : b;
      const enemy = bullet === a ? b : a;
      this.hitEnemy(bullet, enemy);
    });
    this.physics.add.overlap(this.eBullets, this.player, (a, b) => this.hurtPlayer(other(a, b, this.player)));
    this.physics.add.overlap(this.enemies, this.player, (a, b) => this.touchEnemy(other(a, b, this.player)));
    this.physics.add.overlap(this.pickups, this.player, (a, b) => this.collect(other(a, b, this.player)));

    this.bindUi();
    this.syncHud(true);
    hud.showMenu(true);
    hud.showHud(false);
    hud.showRoster(characterCards(), this.characterId);
    hud.setDaily(`今日挑战 · 种子 ${this.dailySeedValue()}`);
    this.refreshMetaPanel();
  }

  /* ── 冻结 / 解冻 ───────────────────── */
  /**
   * 冻结游戏（抽卡面板、异象面板、暂停面板打开时）。
   *
   * **为什么不用 `this.scene.pause()`**：
   * Phaser 在场景暂停时会把键盘事件队列整个丢掉 —— `KeyboardManager.postUpdate`
   * 每帧末尾无条件 `this.queue = []`，而队列里的事件本来是要由
   * `KeyboardPlugin.update()` 消费的；场景暂停时插件不跑，事件就永远不会被消费。
   * 于是"面板期间按下的键"会被静默吞掉：玩家的体感是
   * **「我明明还按着 D，选完卡游戏却不动了，得松手再按一次」**。
   * （实测：Canvas 渲染器下自动化试玩按 D 3 秒，玩家坐标纹丝不动。）
   *
   * 改成「只暂停物理世界 + 用 runState 挡住 update()」：
   * 物理停摆（敌人、子弹、玩家都不动），逻辑停摆（runTime 不走，波次不走），
   * **但键盘始终是准的**。
   *
   * 代价：面板打开时场景的补间/定时器仍在走（拾取物的消失倒计时之类），
   * 属于可接受的视觉噪音；换来的是"面板关掉后按键立刻生效"。
   */
  freeze() {
    this.physics.world.pause();
  }

  /** 解冻（与 freeze 配对） */
  thaw() {
    this.physics.world.resume();
  }

  /* ── 流程 ─────────────────────────── */
  bindUi() {
    hud.init({
      onStart: () => {
        sfx.unlock();
        bgm.loadPreference();
        bgm.start();            // 第十四轮：BG M 在**用户手势之后**起步（浏览器的自动播放策略）
        this.startRun();
      },
      onResume: () => this.setPaused(false),
      onRestart: () => {
        sfx.unlock();
        bgm.loadPreference();
        bgm.start();
        this.startRun();
      },
      onMenu: () => this.toMenu(),
      onContinue: () => this.continueEndless(),
      onRetrySeed: () => this.retrySameSeed(),
      onSelectCharacter: (id) => {
        this.characterId = id;
        sfx.pickup();
      },
      onBuild: () => {
        // 打开构筑一览 = 暂停（面板读的是活数据，暂停时不会边看边被打）
        if (this.runState === 'playing') this.setPaused(true);
      },
      onMusic: () => {
        sfx.unlock();
        bgm.loadPreference();
        const on = bgm.toggle();
        return on;
      },
      onDaily: () => {
        sfx.unlock();
        bgm.loadPreference();
        bgm.start();
        this.startRun(this.dailySeedValue(), 0, true);
      },
    });
  }

  /** 刷新主菜单里的「深海藏品」面板 */
  refreshMetaPanel() {
    hud.showMeta({
      memory: this.meta.memory,
      locked: lockedRelics(this.meta),
      onUnlock: (id) => this.unlockMetaRelic(id),
    });
  }

  /** 用记忆解锁一件装备（解锁后它才会进这一局的牌池） */
  unlockMetaRelic(id) {
    const res = unlockRelic(this.meta, id);
    if (!res.ok) {
      hud.banner(res.reason || '解锁失败', 1400);
      return;
    }
    this.meta = res.meta;
    saveMeta(this.meta);
    sfx.upgrade();
    hud.banner(`解锁装备 · ${relicById(id)?.name || ''}`, 1600);
    this.refreshMetaPanel();
  }

  resetRun(seedOverride = null, variant = 0, daily = false) {
    // 一局的身份：种子决定章节主题、抽卡候选、掉落位
    // ?seed= 指定的种子只作用于"下一次开局"，之后的"再来一局"重新随机
    const forced = Number.isInteger(seedOverride) ? seedOverride : this.registry.get('seed');
    this.seed = Number.isInteger(forced) ? forced : ((Math.random() * 0xffffffff) >>> 0);
    this.run = {
      seed: this.seed,
      plan: createRunPlan(this.seed),
      // 角色的起始装备排在第一位：HUD 徽章、结算页、抽卡池排除都靠这一条
      relics: initialRelics(this.characterId),
      drafted: new Set(),
      endless: false,
      // 构筑变体：同种子重打时递增 → 章节主题不变（同一关），抽卡候选重洗（换个解法）
      variant,
      draftRng: mulberry32(hashSeed(this.seed ^ Math.imul(variant + 1, 0x9e3779b9), 0xd1a7f)),
      // 潮水：局内货币，用来在抽卡时重随 / 放逐 / 跳过
      dew: 0,
      // 放逐掉的装备 id（本局牌池里永久移除）
      banished: [],
      // 抽卡面板的状态（当前抽卡点、是否处于放逐模式）
      draftState: { chapter: 1, mode: 'pick', options: [] },
      // 本局已经重随过几次（重随价格按本局总次数递增）
      rerollTotal: 0,
      // 深化的层数：{ 装备 id: 层数 }
      deepened: {},
      // 无尽模式的里程碑：送过礼物的波次
      gifted: new Set(),
      // 是不是「今日挑战」（决定结算页怎么写这局）
      daily,
      // 每波的"压力"：玩家 DPS ÷ 该波需求（战败时画成强度曲线，复盘用）
      pressure: [],
      // 本局的局外奖励是否已经结算过（一局只给一次）
      memoryAwarded: false,
      // 累计生成的敌人数（平衡报告里用来看击杀率）
      spawned: 0,
      // 已经结算过几波潮水（自动化试玩用来验证"按波结算"确实在发生）
      dewWaves: 0,
      // 异象：抽到的异象 id（不重复）、已选异象的属性修正、已触发过的章
      omenIds: [],
      omenStats: [],
      omensSeen: new Set(),
      omenRng: mulberry32(hashSeed(this.seed, 0x0ae2d)),
      // ── 第五轮：精英与战利品 ──
      // 战利品用**独立的随机流**：打死精英不该改变后面抽卡的结果
      lootRng: mulberry32(hashSeed(this.seed, 0x1007)),
      elitesKilled: 0,
      // 死于哪种怪（平衡报告要看这个）
      deathCause: null,
    };
    this.stats = applyBuild(this.run.relics, this.characterId, this.run.deepened);
    this.counterTags = tagsFromStats(this.stats);
    this.combat = createCombat();
    this.spawner = createSpawner(this.seed, {
      modsFor: (w) => this.modsFor(w),
      // 第六轮：**这一波的怪在波次推进的那一刻生成**，
      // 所以章首的路线必须在推进之前选好，否则这一波会按"没选路线"的 mods 生成。
      beforeWave: (w) => this.beforeWave(w),
    });
    this.maxHp = Math.max(1, PLAYER_MAX_HP + this.stats.maxHpAdd);
    this.hp = this.maxHp;
    this.shield = 0;
    this.fireLevel = 1;
    this.fire = deriveFireStats(1, this.stats);
    this.shootTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.invulnUntil = 0;
    this.rageUntil = 0;
    // 第五轮：玩家减速（墨鱼的蛛弹）与毒云
    this.playerSlowUntil = 0;
    this.clouds = [];
    this.pendingLoot = null;
    this.pendingCamp = null;
    this.lastWave = 0;
    this.runTime = 0;
    this.lastFrameAt = 0;
    this.dashDir = { x: 0, y: 0 };
    this.startedAt = 0;
    this.bossSeen = false;
    this.explodeDepth = 0;
  }

  /**
   * 某一波的敌人修正量 = 章节主题 mods × 玩家构筑里的敌人数量/血量系数。
   * 异象可以改敌人数量与血量，但改不了主题（主题是这一章的地貌），
   * 所以两者相乘而不是互相覆盖。
   *
   * **但叠乘要设上限**：主题（盛宴 ×1.35 数量）+ 异象（×1.25 数量）叠起来是 ×1.69，
   * 那一章的需求会**突然**跳上去，而玩家还带着上一章的构筑 ——
   * 实测机器人就是这样在两局里都只剩 1 点血阵亡的。
   *
   * 上限的写法是**相对的**而不是绝对的：
   * 「主题倍率原样保留，玩家构筑的加成最多再乘 1.25」。
   * 这样主题的性格（盛宴就是怪多）不被削弱，而异象最多只能在主题之上再加两成半 ——
   * **难度平滑爬升，不该有尖峰。**
   */
  modsFor(wave) {
    const m = modsForWave(this.run.plan, wave);
    const s = this.stats || {};
    return {
      ...m,
      enemyCountMul: (m.enemyCountMul ?? 1) * Math.min(1.25, s.enemyCountMul ?? 1),
      enemyHpMul: (m.enemyHpMul ?? 1) * Math.min(1.2, s.enemyHpMul ?? 1),
    };
  }

  /**
   * 开一局。
   * @param {number|null} seedOverride 指定种子（"同种子再来一局"用）
   * @param {number} variant 构筑变体号：同种子换构筑时递增，
   *        让抽卡候选重新随机（否则"同种子"会给出完全相同的一局）
   */
  startRun(seedOverride = null, variant = 0, daily = false) {
    this.enemies?.clear(true, true);
    this.bullets?.clear(true, true);
    this.eBullets?.clear(true, true);
    this.pickups?.clear(true, true);
    this.hazards?.clear(true, true);
    this.clearClouds();
    this.resetRun(seedOverride, variant, daily);
    this.registry.set('seed', null); // URL 指定的种子只用于这一局
    this.player.setPosition(ARENA.width / 2, ARENA.height / 2).setAlpha(1).setVelocity(0, 0);
    this.runState = 'playing';
    this.spawner.start(0);
    hud.showMenu(false);
    hud.hideGameOver();
    hud.hideVictory();
    hud.hideDraft();
    hud.hideOmen();
    hud.hideRoute();
    hud.showHud(true);
    hud.setBest(this.bestScore());
    hud.banner('准备迎敌', 1200);
    this.syncHud(true);
    // 开局：先选第一章的路，再抽这一章的装备
    this.openChapterStart(1, 1);
  }

  toMenu() {
    this.runState = 'idle';
    this.enemies?.clear(true, true);
    this.bullets?.clear(true, true);
    this.eBullets?.clear(true, true);
    this.pickups?.clear(true, true);
    this.clearClouds();
    this.hazards?.clear(true, true);
    hud.hideGameOver();
    hud.hideVictory();
    hud.hideDraft();
    hud.hideOmen();
    hud.hideRoute();
    hud.showHud(false);
    hud.showMenu(true);
    hud.showRoster(characterCards(), this.characterId);
    hud.setDaily(`今日挑战 · 种子 ${this.dailySeedValue()}`);
    this.refreshMetaPanel();
  }

  togglePause() {
    if (this.runState === 'playing') this.setPaused(true);
    else if (this.runState === 'paused') this.setPaused(false);
  }

  setPaused(v) {
    if (v && this.runState !== 'playing') return;
    if (!v && this.runState !== 'paused') return;
    if (v) this.refreshBuildPanel();
    this.runState = v ? 'paused' : 'playing';
    if (v) this.freeze();
    else {
      // 恢复后别把暂停时长算进游戏时钟
      this.lastFrameAt = performance.now();
      this.thaw();
    }
    hud.showPause(v);
    hud.showHint(!v);
  }

  /** 今天的日期键（本地日期） */
  dailyKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  /** 今日挑战的种子（同一天所有人拿到同一局） */
  dailySeedValue() {
    return dailySeed(this.dailyKey());
  }

  /**
   * 某一波的 Boss 血量（这一波没有 Boss 则返回 null）。
   *
   * 为什么单独算（第九轮）：Boss 是**单挑**，它的血量装不进"波次需求"那个口径
   * （早先一直没算 ⇒ 第 20 波的覆盖度虚高了一倍，Boss 战从没被尺子测到）。
   * ⇒ 它用另一个指标：**这场 Boss 战预计打几秒**。
   */
  bossHpForWave(wave) {
    const w = Math.max(1, Math.floor(wave));
    if (w % 5 !== 0) return null;
    const hp = enemyStats('boss', w, this.spawner?.mods || {}).hp;
    if (isFinalWave(w) && !this.run?.endless) return Math.round(hp * FINAL_BOSS_HP_MUL);
    return hp;
  }

  /**
   * 刷新「构筑一览」面板（暂停时打开）。
   * 这里把三件事放在一起：**你有多少 DPS**、**这一波需要多少 DPS**、**你造出了什么**。
   * 前两个的比值（压力）就是"构筑决定生死"的那把尺子 —— 玩家看得见它，
   * 构筑的决策才有分量（否则就是盲建）。
   */
  refreshBuildPanel() {
    const dps = dpsOf(this.fire);
    const wave = Math.max(1, this.spawner?.wave ?? 1);
    const need = waveDpsNeed(wave, this.seed, this.spawner?.mods || {});
    // 第九轮：覆盖度要算上**对症倍率** ——
    // 否则"构筑对不对症"在这把尺子上完全看不见（第八轮的核心问题）。
    const mult = waveCounterMult(wave, this.seed, this.spawner?.mods || {}, this.counterTags || []);
    hud.showBuild({
      fire: this.fire,
      stats: this.stats,
      dps,
      need,
      mult,
      coverage: pressureRatio(dps * mult, need),
      archetypes: activeArchetypes(this.run?.relics ?? []),
      relics: this.run?.relics ?? [],
      deepened: this.run?.deepened ?? {},
      // 本章会遇到哪些怪 + 各自的应对（第五轮）
      threats: chapterThreats(chapterIndexOf(this.spawner?.wave ?? 1)),
      // 这一章走的哪条路线（第六轮）
      route: routeOfChapter(this.run?.plan, chapterIndexOf(this.spawner?.wave ?? 1)),
      // 第九轮：这套构筑的**手段**与它们对这一章的加成
      tags: this.counterTags || [],
      chapterMult: chapterCounterMult(
        chapterIndexOf(this.spawner?.wave ?? 1),
        this.seed,
        this.spawner?.mods || {},
        this.counterTags || [],
      ),
      // 第九轮：Boss 战预计几秒（Boss 是单挑，**装不进覆盖度那个口径**）
      bossSeconds: bossFightSeconds(this.bossHpForWave(wave), dps * mult),
    });
  }

  /* ── 构筑：路线 → 抽卡 ─────────────── */
  /**
   * 章首：先选这一章走哪条路，再抽这一章的装备。
   *
   * 为什么是这个顺序（第六轮）：**先选战场，再选装备**。
   * 玩家看到"这一章是枯沼（硬壳免伤）"，才知道该拿哪张装备去应对。
   * 顺序反过来（先抽卡再选路）的话，抽卡时手里没有信息，
   * 路线选择就退化成"随便挑一个"。
   */
  openChapterStart(chapterIndex, wave = null) {
    const chapter = ensureChapter(this.run.plan, chapterIndex);
    const w = wave ?? this.spawner.wave;
    // 无尽里程碑：每 10 波（25/35/45…）是章首，那一章白挑两张。
    // 里程碑正好是章首，所以它和章首抽卡是同一次机会（不额外开面板）。
    const isGift = !!(this.run.endless && w % 10 === 5 && !this.run.gifted.has(w));
    if (isGift) this.run.gifted.add(w);
    if (!chapter.route) {
      this.pendingGift = isGift;
      this.pendingChapter = chapterIndex;
      this.runState = 'route';
      const options = (chapter.routes || []).map(routeById).filter(Boolean);
      if (!options.length) {
        // 没有候选（理论上不会发生）——直接进抽卡，别把玩家卡住
        this.openDraft(chapterIndex, isGift);
        return;
      }
      hud.showRoute({
        kicker: `第 ${chapter.index} 章 · ${chapter.name}`,
        theme: chapter.theme,
        options,
        threats: chapterThreats(chapterIndex),
        // 大肥鱼的内心 OS（第十四轮彩蛋）：社区二创里最有名的几句。
        // ⚠️ **按章确定性轮换**，不用随机数 ⇒ 不会影响任何可复现性。
        quip: FISH_QUIPS[(chapter.index - 1) % FISH_QUIPS.length],
        onPick: (routeId) => this.chooseRoute(routeId),
      });
      this.freeze();
      return;
    }
    this.openDraft(chapterIndex, isGift);
    if (isGift) hud.banner(`无尽里程碑 · 第 ${w} 波 · 白挑两张`, 2000);
  }

  /**
   * 波次推进前的闸门：这一波之前还有没有没做的决定？
   * 返回 false = 这一波先别开始。
   */
  beforeWave(nextWave) {
    const ci = chapterIndexOf(nextWave);
    const chapter = ensureChapter(this.run.plan, ci);
    if (chapter.route) return true;           // 路线选过了 → 可以开波
    this.openChapterStart(ci, nextWave);      // 打开路线面板（游戏暂停）
    return false;
  }

  /** 选定这一章的路线，然后进抽卡 */
  chooseRoute(routeId) {
    if (this.runState !== 'route') return;
    // 章号用开面板时记下的那个：**不能从当前波次反推**
    // （开局那一刻波次还是 0，而无尽模式里波次会先跑过章首）
    const chapterIndex = this.pendingChapter || 1;
    const route = chooseRoute(this.run.plan, chapterIndex, routeId);
    if (!route) return;
    hud.hideRoute();
    sfx.pickup();
    hud.banner(`路线 · ${route.name}`, 1400);
    this.openDraft(chapterIndex, this.pendingGift);
    this.pendingGift = false;
  }

  /* ── 构筑：抽卡 ─────────────────────── */
  /** 打开某一章的抽卡面板（游戏暂停） */
  openDraft(chapterIndex, gift = false) {
    const chapter = ensureChapter(this.run.plan, chapterIndex);
    // 章首抽卡与里程碑赠礼**共用这一次机会**（里程碑波正好是章首）
    this.run.drafted.add(chapterIndex);
    if (!gift) {
      this.applyChapterStart(chapter);
    }
    this.runState = 'draft';
    this.run.draftState = { chapter: chapterIndex, mode: 'pick', options: [], gift, giftLeft: gift ? 2 : 1 };
    this.renderDraft();
    this.freeze();
  }

  /** 重新渲染抽卡面板（抽卡 / 重随 / 放逐都走这里） */
  renderDraft() {
    const st = this.run.draftState;
    const chapter = ensureChapter(this.run.plan, st.chapter);
    const count = 3 + this.stats.extraDraft;
    const options = drawRelicOptions(this.run.draftRng, {
      owned: this.run.relics,
      count,
      chapter: st.chapter,
      banished: this.run.banished,
      // 局外还没解锁的装备不进牌池
      available: availableRelicIds(this.meta),
    });
    st.options = options;
    const actions = st.gift ? [] : draftActions(this.run.dew, {
      rerollTimes: this.run.rerollTotal,
      canBanish: options.length > 0,
      canSkip: true,
    });
    // 深化：只能深化自己已有的装备（赠礼模式没有这些动作）
    if (this.run.relics.length && st.mode !== 'deepen' && !st.gift) {
      actions.push({
        id: 'deepen',
        label: '深化',
        desc: '把已有的一张装备再叠一层（本次不再拿新牌）',
        cost: deepenCost(0),
        enabled: this.run.dew >= deepenCost(0),
      });
    }
    const route = routeOfChapter(this.run.plan, st.chapter);
    hud.showDraft({
      chapter: st.gift
        ? `无尽里程碑 · 第 ${this.spawner.wave} 波 · 白挑 ${st.giftLeft ?? 1} 张`
        : `第 ${chapter.index} 章 · ${chapter.name}`,
      theme: chapter.theme,
      route,
      options,
      dew: this.run.dew,
      actions,
      mode: st.mode,
      // 当前成型的流派（玩家要能看见自己在建什么，否则协同机制等于不存在）
      archetypes: activeArchetypes(this.run.relics),
      owned: this.run.relics,
      deepened: this.run.deepened,
      gift: !!st.gift,
      // 本章威胁（第五轮）：抽卡时就知道这一章会遇到什么
      threats: chapterThreats(st.chapter),
      // 第九轮：**篝火预告**（第八轮 §22 列的必做项）——
      // 玩家在打第四章之前不知道"打完有篝火"，于是那条回头路形同虚设。
      camp: isFinalBossEnemy({ type: 'boss', wave: st.chapter * 5 }, { endless: this.run.endless })
        ? ''
        : '打完本章的 Boss 后可在篝火休整（回血 / 磨刃）',
      // 第九轮：这一章**需要哪一招**（各手段能命中本章多少血量）+ 你已有什么手段
      counters: chapterCounterBreakdown(st.chapter, this.seed, this.modsFor(this.spawner?.pendingWave || this.spawner?.wave || 1)),
      playerTags: this.counterTags || [],
      onPick: (id) => (st.gift ? this.giftRelic(id) : this.chooseRelic(id)),
      onAction: (id) => this.draftAction(id),
    });
  }

  /** 抽卡面板上的三个动作：重随 / 放逐 / 跳过 */
  draftAction(id) {
    if (this.runState !== 'draft') return;
    const st = this.run.draftState;
    // 深化不在 draftActions 的三个动作里（它针对的是"自己已有的装备"），单独处理
    if (id === 'deepen') {
      if (!this.run.relics.length) return;
      st.mode = st.mode === 'deepen' ? 'pick' : 'deepen';
      this.renderDraft();
      return;
    }
    const acts = draftActions(this.run.dew, { rerollTimes: this.run.rerollTotal });
    const act = actionById(acts, id);
    if (!act || !act.enabled) return;
    if (id === 'reroll') {
      this.run.dew -= act.cost;
      this.run.rerollTotal += 1;
      st.mode = 'pick';
      this.renderDraft();
      sfx.pickup();
      hud.banner(`重随候选 · 花费 ${act.cost} 潮水`, 1200);
    } else if (id === 'banish') {
      // 进入放逐模式：此时不扣钱，点了卡才扣
      st.mode = st.mode === 'banish' ? 'pick' : 'banish';
      this.renderDraft();
    } else if (id === 'skip') {
      this.run.dew -= act.cost;
      this.closeDraft();
      sfx.pickup();
      hud.banner(`你转身离开了装备 · 花费 ${act.cost} 潮水`, 1400);
    }
    this.syncHud(true);
  }

  /** 放逐一张：永久踢出本局牌池，然后重抽 */
  banishRelic(id) {
    const cost = actionById(draftActions(this.run.dew), 'banish').cost;
    if (this.run.dew < cost) {
      hud.banner('潮水不够', 1000);
      this.run.draftState.mode = 'pick';
      this.renderDraft();
      return;
    }
    this.run.dew -= cost;
    this.run.banished.push(id);
    this.run.draftState.mode = 'pick';
    this.renderDraft();
    sfx.pickup();
    hud.banner(`放逐 · ${relicById(id)?.name || ''}（${cost} 潮水）`, 1400);
    this.syncHud(true);
  }

  /** 选定一张装备（放逐模式下则是放逐它） */
  chooseRelic(id) {
    if (this.runState !== 'draft') return;
    if (this.run.draftState.mode === 'banish') {
      this.banishRelic(id);
      return;
    }
    if (this.run.draftState.mode === 'deepen') {
      this.deepenRelic(id);
      return;
    }
    const relic = relicById(id);
    if (!relic) return;
    this.run.relics.push(id);
    this.recomputeStats();
    this.closeDraft();
    sfx.upgrade();
    hud.banner(`获得装备 · ${relic.name}`, 1500);
    this.syncHud(true);
  }

  /**
   * 无尽模式的里程碑赠礼：**这一章白挑两张**。
   *
   * 为什么是"挑两张"而不是"额外送一张"：里程碑波（25/35/45）正好是**章首**，
   * 章首本来就要抽卡 —— 所以赠礼不能是"再开一次面板"（会与章首抽卡打架），
   * 只能是"这次多挑一张"。这样没有额外的流程，玩家一看就懂。
   */
  giftRelic(id) {
    if (this.runState !== 'draft') return;
    const relic = relicById(id);
    if (!relic) return;
    this.run.relics.push(id);
    this.recomputeStats();
    sfx.upgrade();
    hud.banner(`里程碑赠礼 · ${relic.name}`, 1800);
    if ((this.run.draftState.giftLeft ?? 1) > 1) {
      this.run.draftState.giftLeft -= 1;
      this.renderDraft(); // 再抽三个，继续挑（面板不关）
      this.syncHud(true);
      return;
    }
    this.closeDraft();
  }

  /** 深化一张已有的装备（花潮水，效果再叠一层） */
  deepenRelic(id) {
    if (!this.run.relics.includes(id)) {
      hud.banner('只能深化自己已有的装备', 1200);
      this.renderDraft();
      return;
    }
    const layers = this.run.deepened[id] || 0;
    const cost = deepenCost(layers);
    if (this.run.dew < cost) {
      hud.banner('潮水不够', 1000);
      this.renderDraft();
      return;
    }
    this.run.dew -= cost;
    this.run.deepened[id] = layers + 1;
    // 模式一定要复位：深化虽然会收起面板，但抽卡状态还留着，
    // 任何"再打开抽卡面板"的路径都会掉进深化模式（自动化试玩实测踩到了）。
    this.run.draftState.mode = 'pick';
    this.recomputeStats();
    sfx.upgrade();
    hud.banner(`深化 · ${relicById(id)?.name || ''}（第 ${layers + 1} 层）`, 1600);
    // **深化是"替代"而不是"追加"**：这一章的抽卡机会用掉了，
    // 不再拿新牌。否则深化永远是白拿的（拿牌本来就不要花钱），
    // "拿新牌 vs 把旧牌变强"这个取舍就不存在了。
    this.closeDraft();
  }

  /**
   * 精英战利品：异变体死后从三份装备里挑一份（只能拿一份）。
   *
   * 为什么用**独立的随机流**（lootRng）：如果战利品和章首抽卡共用一条随机序列，
   * 打死精英会**改变后面抽卡的结果** —— 玩家的构筑就被一场战斗的运气绑架了。
   * 两条流分开：抽卡是什么永远只由抽卡决定。
   */
  openLoot(loot) {
    const options = drawRelicOptions(this.run.lootRng, {
      owned: this.run.relics,
      count: 3,
      chapter: 3, // 战利品按第 3 章的稀有度权重（偏高一点，算是奖励）
      banished: this.run.banished,
      available: availableRelicIds(this.meta),
    });
    if (!options.length) {
      hud.banner('没有可拿的装备', 1200);
      return;
    }
    this.runState = 'draft';
    hud.showDraft({
      chapter: '异变体战利品',
      loot: true,
      options,
      dew: this.run.dew,
      actions: [{ id: 'loot-skip', label: '不拿', desc: '换成 8 潮水', cost: 0, enabled: true }],
      mode: 'pick',
      archetypes: activeArchetypes(this.run.relics),
      owned: this.run.relics,
      deepened: this.run.deepened,
      onPick: (id) => this.chooseLoot(id),
      onAction: (id) => this.lootAction(id),
    });
    this.freeze();
  }

  /** 拿一份战利品 */
  chooseLoot(id) {
    if (this.runState !== 'draft') return;
    const relic = relicById(id);
    if (!relic) return;
    this.run.relics.push(id);
    this.recomputeStats();
    this.closeDraft();
    sfx.upgrade();
    hud.banner(`战利品 · ${relic.name}`, 1600);
    this.syncHud(true);
  }

  /** 放弃战利品，换成潮水 */
  lootAction(id) {
    if (this.runState !== 'draft' || id !== 'loot-skip') return;
    this.addDew(8);
    this.closeDraft();
    sfx.pickup();
    hud.banner('你放过了残骸里的装备 · +8 潮水', 1400);
  }

  /* ── 篝火：章末的休整 ─────────────── */
  /** 打开篝火面板（游戏暂停） */
  openCamp() {
    const state = {
      hp: this.hp,
      maxHp: this.maxHp,
      fireLevel: this.fireLevel,
      dew: this.run.dew,
    };
    const options = CAMP_OPTIONS.map((o) => ({
      ...o,
      desc: campOptionText(o.id, state),
      enabled: campAvailable(o.id, state),
    }));
    const usable = options.filter((o) => o.enabled);
    if (!usable.length) return;            // 没有可选项（满血且……）—— 直接跳过
    this.runState = 'camp';
    hud.showCamp({
      kicker: `珊瑚休整 · 第 ${chapterIndexOf(this.spawner.wave)} 章之后`,
      // 第十四轮彩蛋：大肥鱼最出名的内心 OS ——
      // 「我去吃饭了，测完告诉我就行」（社区二创里的名场面）。
      desc: '这一章打完了。珊瑚还没凉 —— 只能选一样。\n「我去吃饭了，测完告诉我就行。」',
      options,
      onPick: (id) => this.chooseCamp(id),
    });
    this.freeze();
  }

  /** 选一个篝火选项 */
  chooseCamp(id) {
    if (this.runState !== 'camp') return;
    const state = {
      hp: this.hp,
      maxHp: this.maxHp,
      fireLevel: this.fireLevel,
      dew: this.run.dew,
    };
    if (!campAvailable(id, state)) return;
    const next = applyCamp(id, state);
    this.hp = next.hp;
    this.fireLevel = next.fireLevel;
    this.run.dew = next.dew;
    this.recomputeStats();
    hud.hideCamp();
    this.closeDraft();                      // 复用它的"恢复游戏"流程
    sfx.upgrade();
    hud.banner(`篝火 · ${next.note}`, 1800);
    this.syncHud(true);
  }

  /** 关掉抽卡面板并恢复游戏（面板停留多久都不算进游戏时钟） */
  closeDraft() {
    hud.hideDraft();
    this.runState = 'playing';
    this.lastFrameAt = performance.now();
    this.thaw();
    this.syncHud(true);
  }

  /* ── 构筑：章内异象 ─────────────────── */
  /** 打开某一章的异象面板（游戏暂停） */
  openOmen(chapterIndex) {
    const chapter = ensureChapter(this.run.plan, chapterIndex);
    this.run.omensSeen.add(chapterIndex);
    this.runState = 'omen';
    const omen = drawOmen(this.run.omenRng, { taken: this.run.omenIds });
    this.run.omenIds.push(omen.id);
    this.currentOmen = omen;
    hud.showOmen({
      kicker: `第 ${chapter.index} 章 · 深海异象`,
      desc: omen.desc,
      options: omen.options,
      // 本章威胁（第五轮）：异象是"要不要吃这个红利"的决策，
      // 看得见这一章的怪，才知道该不该为它冒险
      threats: chapterThreats(chapter.index),
      onPick: (optId) => this.chooseOmen(optId),
    });
    this.freeze();
  }

  /** 选定一个异象结果（optId 为 null = 转身离开） */
  chooseOmen(optId) {
    if (this.runState !== 'omen') return;
    const omen = this.currentOmen;
    const opt = optId ? omen?.options.find((o) => o.id === optId) : null;
    if (optId && !opt) return;
    if (opt) {
      this.applyOmen(opt);
      sfx.upgrade();
      hud.banner(`${omen.name} · ${opt.name}`, 1600);
    } else {
      hud.banner('你转身离开了异象', 1200);
    }
    hud.hideOmen();
    this.runState = 'playing';
    this.lastFrameAt = performance.now();
    this.thaw();
    this.syncHud(true);
  }

  /** 应用异象：属性修正永久生效，立刻结算的一次性效果当场生效 */
  applyOmen(opt) {
    const fx = statEffects(opt.effects);
    if (fx.length) {
      this.run.omenStats.push(...fx);
      this.recomputeStats();
    }
    for (const e of instantEffects(opt.effects)) {
      if (e.kind === 'heal') this.healPlayer(e.value);
      else if (e.kind === 'hurt') this.loseHp(e.value);
      else if (e.kind === 'dew') this.addDew(e.value);
      else if (e.kind === 'shield') this.addShield(e.value);
    }
  }

  /** 章节开始时的固定收益 */
  applyChapterStart(chapter) {
    if (this.stats.chapterHeal > 0) this.healPlayer(this.stats.chapterHeal);
    if (this.stats.shieldPerChapter > 0) {
      this.shield = Math.min(this.stats.shieldMax, this.shield + this.stats.shieldPerChapter);
    }
    // 火力保底：每章 +1 级（见 systems/upgrades.js 的 chapterStartFire）
    const nextFire = chapterStartFire(this.fireLevel);
    let fireNote = '';
    if (nextFire !== this.fireLevel) {
      this.fireLevel = nextFire;
      this.fire = deriveFireStats(this.fireLevel, this.stats);
      fireNote = ` · 火力 Lv.${this.fireLevel}`;
    }
    // 一条横幅说完（两次 banner 会互相覆盖，闪一下就没了）
    hud.banner(
      `第 ${chapter.index} 章 · ${chapter.name}${fireNote}\n${chapter.theme.name}：${chapter.theme.desc}`,
      2400,
    );
  }

  /** 重新计算属性表（角色 + 火力等级 + 装备 + 异象的永久修正） */
  recomputeStats() {
    const oldMax = this.maxHp;
    this.stats = applyBuild(this.run.relics, this.characterId, this.run.deepened);
    // 异象改的是属性表，必须在每次重算时重新叠加（否则会被构筑重算覆盖掉）
    if (this.run.omenStats.length) applyStatEffects(this.stats, this.run.omenStats);
    this.fire = deriveFireStats(this.fireLevel, this.stats);
    // 第九轮：**手段标签跟着属性表走** ——
    // 深化、角色起始装备、异象给的修正都会体现在这里，
    // 保证"面板上写的手段 = 实际生效的手段"。
    this.counterTags = tagsFromStats(this.stats);
    this.maxHp = Math.max(1, PLAYER_MAX_HP + this.stats.maxHpAdd);
    if (this.maxHp > oldMax) this.hp += this.maxHp - oldMax;
    this.hp = Math.max(0, Math.min(this.hp, this.maxHp));
    this.shield = Math.min(this.shield, this.stats.shieldMax);
    // 连击窗口：基准 2.5 秒 + 装备加成（毫秒换算成秒）
    this.combat.windowSec = (COMBO_WINDOW * 1000 + this.stats.comboWindowAddMs) / 1000;
  }

  gameOver() {
    this.runState = 'over';
    const survived = Math.round((this.runTime || 0) * 10) / 10;
    this.pointerDown = false;
    sfx.gameover();
    this.cameras.main.shake(420, 0.012);
    const best = Math.max(this.bestScore(), this.combat.score);
    try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* 隐私模式下忽略 */ }
    hud.setBest(best);
    hud.showHud(false);
    const result = runResult({
      victory: false,
      score: this.combat.score,
      wave: this.spawner.wave,
      kills: this.combat.kills,
      bestCombo: this.combat.bestCombo,
      survived,
      relics: this.run.relics,
      seed: this.seed,
      endless: this.run.endless,
      chapter: chapterOf(this.spawner.wave).name,
      best,
    });
    result.memoryGained = this.awardMemory(result);
    result.archetypes = activeArchetypes(this.run.relics);
    result.deepened = { ...this.run.deepened };
    result.nextUnlock = nextUnlockHint(this.meta.memory, lockedRelics(this.meta));
    result.daily = this.run.daily ? { key: this.dailyKey(), seed: this.seed } : null;
    result.pressure = [...this.run.pressure];
    // 死于什么（第五轮）：死因就是"敌人向构筑提问"的证据
    result.deathCause = this.run.deathCause ? deathCauseName(this.run.deathCause) : null;
    hud.showGameOver(result, {
      onMenu: () => this.toMenu(),
      onRetrySeed: () => this.retrySameSeed(),
    });
  }

  /**
   * 同种子再来一局：同一颗种子 = 同样的章节主题与同样的异象，
   * 但抽卡候选会重新随机 —— **"换个构筑再打一遍同一局"**。
   * 这是肉鸽里最上瘾的循环之一：同一关换个解法。
   */
  retrySameSeed() {
    const seed = this.seed;
    const variant = (this.run?.variant ?? 0) + 1;
    sfx.unlock();
    this.startRun(seed, variant);
    hud.banner(`同种子重来 · ${seed} · 第 ${variant + 1} 套构筑`, 1800);
  }

  /** 局外奖励：把本局表现折成「深海藏品」并入存档（只解锁内容，不加数值）
   *
   *  **一局只结算一次**：通关后可以继续无尽，如果无尽里又死了，
   *  不应该再给一次记忆（否则"通关后继续刷"是最优刷记忆的姿势）。
   */
  awardMemory(result) {
    if (this.run.memoryAwarded) return 0;
    this.run.memoryAwarded = true;
    const { meta, gained } = awardRun(this.meta, {
      victory: !!result.victory,
      score: result.score || 0,
      wave: result.wave || 0,
      chaptersCleared: result.chaptersCleared || 0,
    });
    this.meta = meta;
    saveMeta(this.meta);
    this.refreshMetaPanel();
    return gained;
  }

  /** 打赢终局 Boss */
  victory() {
    this.runState = 'victory';
    this.pointerDown = false;
    sfx.bossKill();
    this.cameras.main.shake(600, 0.02);
    this.cameras.main.flash(420, 255, 220, 140);
    hud.hideDraft();
    hud.banner('深海守住了！', 2200);
    const result = runResult({
      victory: true,
      score: this.combat.score,
      wave: this.spawner.wave,
      kills: this.combat.kills,
      bestCombo: this.combat.bestCombo,
      survived: this.runTime,
      relics: this.run.relics,
      seed: this.seed,
    });
    result.memoryGained = this.awardMemory(result);
    result.archetypes = activeArchetypes(this.run.relics);
    result.deepened = { ...this.run.deepened };
    result.nextUnlock = nextUnlockHint(this.meta.memory, lockedRelics(this.meta));
    result.daily = this.run.daily ? { key: this.dailyKey(), seed: this.seed } : null;
    result.pressure = [...this.run.pressure];
    hud.showHud(false);
    hud.showVictory(result, {
      onContinue: () => this.continueEndless(),
      onMenu: () => this.toMenu(),
    });
  }

  /** 通关后继续无尽：章节继续往后长，构筑保留 */
  continueEndless() {
    this.run.endless = true;
    hud.hideVictory();
    this.runState = 'playing';
    hud.showHud(true);
    hud.banner('无尽模式：继续往后', 2000);
    this.syncHud(true);
  }

  bestScore() {
    try { return Number(localStorage.getItem(BEST_KEY) || 0); } catch { return 0; }
  }

  /* ── 主循环 ───────────────────────── */
  update(time, delta) {
    // 篝火面板：章末的休整（同样在下一帧开，不能打断物理步）
    if (this.pendingCamp && this.runState === 'playing') {
      this.pendingCamp = null;
      this.openCamp();
      return;
    }
    // 精英战利品面板：上一帧的物理回调里记下的，在这里开（不能打断物理步）
    if (this.pendingLoot && this.runState === 'playing') {
      const loot = this.pendingLoot;
      this.pendingLoot = null;
      this.openLoot(loot);
      return;
    }
    if (this.runState !== 'playing') return;
    // 逻辑步长 = 真实墙钟（单帧上限 0.5s）。
    //
    // 关键：所有计时器（射速、冲刺、弹幕存活、敌人出招）都必须用同一个步长。
    // 之前这里用 min(0.05, raw) 做了钳制，60fps 下没差别，但帧率一低，
    // 玩家的射速会被悄悄砍掉一半以上，而波次时间线仍按墙钟推进 ——
    // 结果是"越卡越难"的死亡螺旋（实测 8fps 时机器人 100 秒只打死 10 只）。
    const nowMs = performance.now();
    const raw = this.lastFrameAt ? (nowMs - this.lastFrameAt) / 1000 : 0;
    this.lastFrameAt = nowMs;
    const dt = wallStep(raw);
    this.runTime += dt;

    this.movePlayer(dt);
    this.handleFiring(dt);
    this.spawnFromTimeline();
    if (this.runState !== 'playing') return; // 抽卡面板可能刚刚打开
    this.updateEnemies(dt);
    this.updateClouds(dt);
    this.cullBullets(dt);
    this.magnetPickups();
    decayCombo(this.combat, this.runTime);
    this.syncHud(false);
  }

  movePlayer(dt) {
    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) vy += 1;
    if (touch.enabled) { vx += touch.move.x; vy += touch.move.y; }
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }

    this.dashCooldown = Math.max(0, this.dashCooldown - dt * 1000);
    if (this.dashTimer > 0) {
      this.dashTimer -= dt * 1000;
      this.player.setVelocity(this.dashDir.x * DASH_SPEED, this.dashDir.y * DASH_SPEED);
      this.fxSpark.explode(2, this.player.x, this.player.y);
    } else {
      this.player.setVelocity(vx * this.moveSpeed(), vy * this.moveSpeed());
    }
    if (len > 0.05) this.dashDir = { x: vx, y: vy };

    // 无敌闪烁
    const invuln = this.runTime * 1000 < this.invulnUntil;
    this.player.setAlpha(invuln ? 0.45 + 0.55 * Math.abs(Math.sin(this.runTime * 22)) : 1);
  }

  moveSpeed() {
    // 墨鱼的蛛弹会黏住玩家：被减速时移速打折（考验「机动」构筑）
    const slowed = this.runTime * 1000 < (this.playerSlowUntil || 0);
    return PLAYER_SPEED * this.stats.moveSpeedMul * (slowed ? PLAYER_SLOW.factor : 1);
  }

  tryDash() {
    if (this.runState !== 'playing' || this.dashCooldown > 0 || this.dashTimer > 0) return;
    this.dashTimer = DASH_DURATION_MS;
    this.dashCooldown = DASH_COOLDOWN_MS * this.stats.dashCooldownMul;
    this.invulnUntil = Math.max(this.invulnUntil, this.runTime * 1000 + DASH_DURATION_MS);
    sfx.dash();
  }

  handleFiring(dt) {
    this.shootTimer -= dt * 1000;
    const wantFire = this.pointerDown || this.keys.SPACE.isDown || touch.autoFire;
    if (!wantFire || this.shootTimer > 0) return;
    const stats = this.fire;
    const auto = this.keys.SPACE.isDown || touch.autoFire;
    const target = auto ? this.nearestEnemy() : null;
    const angle = target
      ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)
      : Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.activePointer.worldX, this.input.activePointer.worldY);
    this.fireAt(angle, stats);
    this.shootTimer = stats.cooldownMs;
  }

  fireAt(angle, stats) {
    const spread = Phaser.Math.DegToRad(stats.spreadDeg);
    const rage = this.runTime < this.rageUntil ? this.stats.rageMul : 1;
    // 转化型装备的伤害加成：连击 / 击杀数 / 低血（见 systems/transforms.js）
    // —— 一次射击算一次，不要放进下面的每颗子弹循环里
    const stackDmg = comboDamageBonus(this.combat.combo, this.stats.comboDamagePerStack, this.stats.comboDamageCap)
      + killDamageBonus(this.combat.kills, this.stats.killDamagePerKill, this.stats.killDamageCap);
    const hpMul = lowHpDamageMul(this.hp, this.maxHp, this.stats.lowHpThreshold, this.stats.lowHpDamageMul);
    for (let i = 0; i < stats.bullets; i++) {
      const offset = stats.bullets === 1 ? 0 : (i - (stats.bullets - 1) / 2) * (spread / Math.max(1, stats.bullets - 1));
      const a = angle + offset;
      const b = this.bullets.create(this.player.x, this.player.y, 'petal');
      b.setDepth(15);
      b.setRotation(a);
      b.setVelocity(Math.cos(a) * stats.bulletSpeed, Math.sin(a) * stats.bulletSpeed);
      const crit = Math.random() < stats.critChance;
      const dmg = Math.max(1, Math.round((stats.damage + stackDmg) * rage * hpMul * (crit ? stats.critMult : 1)));
      b.setData('damage', dmg);
      b.setData('crit', crit);
      b.setData('pierceLeft', stats.pierce);
      b.setData('hitIds', []);
      b.setData('range', stats.range);
      b.setData('life', stats.range / stats.bulletSpeed);
      if (crit) {
        b.setTint(0xfff0a0);
        b.setScale(1.3);
      }
    }
    sfx.shoot(this.fireLevel);
  }

  nearestEnemy() {
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies.getChildren()) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  /* ── 生成 ─────────────────────────── */
  spawnFromTimeline() {
    // 一波打完（生成阶段结束）→ 按波结算潮水
    // 收入固定、可预期：不随杀敌数膨胀，避免"有钱就能把牌池刷穿"（见 systems/dew.js）
    const wasWave = this.spawner.state === 'wave';
    const events = this.spawner.update(this.runTime);
    if (wasWave && this.spawner.state === 'breather') {
      this.run.dewWaves += 1;
      // 潮水收入含章节修正量（路线的"潮水更多"）
      this.addDew(waveDewFor(this.spawner.wave, this.spawner.mods));
    }
    for (const ev of events) {
      if (ev.type === 'swarm') {
        this.spawnSwarm();
        continue;
      }
      if (ev.kind === 'hazard') {
        this.dropPollenBomb();
        continue;
      }
      if (ev.kind === 'elite') {
        // 异变体：每章第 2 波登场，章首抽卡之后 —— 构筑要立刻证明自己
        this.spawnEnemy(ev.type, { elite: { affix: ev.affix } });
        const affix = ELITE_AFFIXES[ev.affix];
        hud.banner(`异变体 · ${affix?.name ?? ''} ${enemyName(ev.type)}`, 1800);
        sfx.boss();
        continue;
      }
      this.spawnEnemy(ev.type);
      if (ev.kind === 'boss') {
        // 第七轮：Boss 有名字与招牌机制，登场时要让玩家知道"这一场要防什么"
        const boss = bossById(bossForChapter(chapterIndexOf(this.spawner.wave)).id);
        sfx.boss();
        hud.banner(`${boss.name} 来了 · ${boss.tag}`, 2200);
      }
    }
    if (this.spawner.wave !== this.lastWave) {
      this.lastWave = this.spawner.wave;
      const w = this.lastWave;
      if (w > 1) sfx.wave();
      // 章节第一波 → 抽卡（游戏暂停等玩家做决定）
      const ci = chapterIndexOf(w);
      // 记录这一波的"压力"（你的 DPS ÷ 这一波需要多少 DPS）——
      // 结算页画成强度曲线：玩家一眼能看出"从哪一波开始跟不上"。
      // 第九轮：DPS 改成**有效 DPS**（乘上对症倍率），
      // 否则"构筑对不对症"在曲线上完全看不见。
      const dpsNow = dpsOf(this.fire);
      const needNow = waveDpsNeed(w, this.seed, this.spawner.mods);
      const multNow = waveCounterMult(w, this.seed, this.spawner.mods, this.counterTags || []);
      this.run.pressure.push({
        wave: w,
        dps: dpsNow,
        need: needNow,
        mult: multNow,
        coverage: pressureRatio(dpsNow * multNow, needNow),
      });
      // 章首的**路线与抽卡**已经在闸门（beforeWave）里做完了：
      // 闸门保证"先选路、再抽卡"，而且这一波的怪是选好路线之后才生成的。
      // （直接跳波的无尽/自动化路径也走同一道闸门 —— 见 spawner.skipTo。）
      // 这里只剩章中的异象。
      // 章节中段 → 深海异象（另一个取舍点）
      if (w === omenWaveOf(ci) && !this.run.omensSeen.has(ci)) {
        this.openOmen(ci);
        return;
      }
      const chapter = chapterOf(w);
      hud.banner(`第 ${w} 波 · ${chapter.name}`, 1100);
    }
  }

  spawnEnemy(type, opts = {}) {
    const elite = opts.elite || null;
    const stats = elite
      ? eliteStats(elite, this.spawner.wave, this.spawner.mods)
      : enemyStats(type, this.spawner.wave, this.spawner.mods);
    // 注意：敌人血量的倍率已经全部并进 modsFor（主题 × 构筑，且有上限），
    // 这里**不能再乘一次** this.stats.enemyHpMul —— 以前两处各乘一半，
    // 叠乘出的是"主题 × 构筑 × 构筑"的尖峰。
    let hp = opts.hp ?? Math.max(1, Math.round(stats.hp));
    if (type === 'boss' && isFinalWave(this.spawner.wave) && !this.run.endless) {
      hp = Math.round(hp * FINAL_BOSS_HP_MUL);
    }
    const spot = opts.x !== undefined ? { x: opts.x, y: opts.y } : this.pickSpawnPoint();
    // 第七轮：每章一个 Boss（Boss 的身份由**章节**决定，不是随机的 —— 可预期、可记）
    const bossId = type === 'boss'
      ? (opts.bossId || bossForChapter(chapterIndexOf(this.spawner.wave)).id)
      : null;
    const tex = type === 'boss' ? bossById(bossId).texture : type;
    const e = this.physics.add.sprite(spot.x, spot.y, tex);
    e.setDepth(10);
    e.setData('type', type);
    e.setData('wave', this.spawner.wave);
    e.setData('hp', hp);
    e.setData('maxHp', hp);
    e.setData('speed', stats.speed);
    e.setData('score', stats.score);
    e.setData('fireTimer', 1200 + Math.random() * 800);
    e.setData('burstTimer', 2600);
    e.setData('burstTick', 0);
    e.setData('bombTimer', 3200);
    e.setData('phase', 1);
    e.setData('shard', Boolean(opts.shard));
    e.setData('thornAt', 0);
    // ── 第五轮：精英与新敌种的私有状态 ──
    e.setData('bossId', bossId);
    e.setData('shellState', { shelling: false, timer: 0, cycle: BOSS_SHELL.cycleMs });
    e.setData('summonState', { timer: BOSS_SUMMON.everyMs });
    e.setData('chargeState', { phase: 'wind', timer: BOSS_CHARGE.windMs, lock: { x: 0, y: 0 } });
    e.setData('elite', Boolean(elite));
    e.setData('affix', elite?.affix ?? null);
    e.setData('chg', { phase: 'wind', timer: CHARGER.windMs, lock: { x: 0, y: 0 } });
    e.setData('huskState', { shelling: false, timer: 0 });
    e.setData('mothPhase', Math.random() * Math.PI * 2);
    e.setData('shielded', false);
    e.setData('shieldTimer', 0);
    e.setData('shieldCycle', ELITE_AFFIXES[elite?.affix]?.shieldCycleMs ?? 0);
    // 生成计数：用来在平衡报告里算"击杀率"（击杀 / 生成）
    this.run.spawned += 1;
    let baseScale = 1;
    if (opts.shard) baseScale = 0.62;
    if (elite) {
      baseScale = 1.34;
      const affix = ELITE_AFFIXES[elite.affix];
      e.setTint(parseInt(affix?.tint ?? 'ff5d8f', 16));
      e.setData('noKnockback', Boolean(affix?.noKnockback));
    }
    e.setData('baseScale', baseScale);
    e.setScale(baseScale);
    if (type === 'boss') {
      e.setImmovable(false);
      e.setScale(1);
      baseScale = 1;
      if (isFinalWave(this.spawner.wave) && !this.run.endless) {
        baseScale = 1.16;
        e.setScale(1.16);
        e.setTint(0xc06bff);
      }
    }
    this.enemies.add(e);
    this.fxSpark.explode(10, e.x, e.y);
    return e;
  }

  /** 沙丁鱼群：一次刷一窝，环形散开 */
  spawnSwarm() {
    const spot = this.pickSpawnPoint();
    const form = swarmFormation(SWARM.groupSize);
    for (const off of form) {
      const e = this.spawnEnemy('swarm');
      e.setPosition(spot.x + off.dx, spot.y + off.dy);
      e.setScale(0.9);
    }
    this.fxSpark.explode(14, spot.x, spot.y);
  }

  pickSpawnPoint() {
    const m = 46;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: m, y: m + Math.random() * (ARENA.height - m * 2) };
    if (side === 1) return { x: ARENA.width - m, y: m + Math.random() * (ARENA.height - m * 2) };
    if (side === 2) return { x: m + Math.random() * (ARENA.width - m * 2), y: m };
    return { x: m + Math.random() * (ARENA.width - m * 2), y: ARENA.height - m };
  }

  /* ── 敌人行为 ─────────────────────── */
  updateEnemies(dt) {
    const dtMs = dt * 1000;
    for (const e of this.enemies.getChildren()) {
      const type = e.getData('type');
      // 命中减速（转化型装备「霜之锋」）：减速期间速度打折
      const slow = slowFactor(this.stats.slowOnHit, e.getData('slowUntil') || 0, this.runTime * 1000);
      const speed = (e.getData('speed') || 0) * slow;
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);
      const toPlayer = Math.atan2(dy, dx);

      // 精英「帷幕」的周期护盾：不打穿它就等于白打
      if (e.getData('elite')) this.updateEliteShield(e, dtMs);

      // ── 每种敌种自己的状态机 ──
      let state = { phase: e.getData('mothPhase') || 0 };
      if (type === 'charger') {
        const prev = e.getData('chg') || { phase: 'wind', timer: CHARGER.windMs, lock: { x: 0, y: 0 } };
        const next = chargerStep(prev, dtMs, { x: Math.cos(toPlayer), y: Math.sin(toPlayer) });
        e.setData('chg', next);
        state = next;
        // 只在**阶段切换**时改缩放：每帧 setScale 会和命中时的受击动画打架
        if (next.event) {
          const base = e.getData('baseScale') || 1;
          e.setScale(next.phase === 'wind' ? base * 0.76 : (next.phase === 'dash' ? base * 1.15 : base));
          if (next.event === 'lock') e.setTint(0xffe27a);
          // 冲刺时恢复本色 —— 精英要恢复自己的词缀颜色，不能被清成默认
          if (next.event === 'dash') this.applyEnemyTint(e);
        }
      } else if (type === 'husk') {
        const prev = e.getData('huskState') || { shelling: false, timer: 0 };
        const next = huskStep(prev, dtMs, e.getData('hp') || 1, e.getData('maxHp') || 1);
        e.setData('huskState', next);
        state = next;
        if (next.event === 'shell') {
          e.setTint(0x9fb4c8);
          hud.banner('铁壳蟹结壳了 —— 爆发不够就打不穿', 1200);
        }
        if (next.event === 'break') this.applyEnemyTint(e);
      }

      // ── 移动意图由纯逻辑给（systems/enemies.js 的 enemySteer）──
      const plan = enemySteer(type, { dx, dy, dist, t: this.runTime, state });
      const mul = type === 'charger' && state.phase === 'dash' ? CHARGER.dashMul : 1;
      e.setVelocity(plan.vx * speed * mul, plan.vy * speed * mul);

      // ── 射击意图也由纯逻辑给 ──
      const fp = enemyFirePlan(type);
      if (fp) {
        const t = (e.getData('fireTimer') || 0) - dtMs;
        e.setData('fireTimer', t);
        if (t <= 0) {
          e.setData('fireTimer', fp.cooldownMs);
          this.enemyShoot(e, toPlayer, fp.cooldownMs, fp.count, fp.speed, dt, fp.slow);
        }
      }

      if (type === 'boss') {
        const bossId = e.getData('bossId') || 'wither_lord';
        const boss = bossById(bossId);
        const phase = e.getData('phase') || 1;
        const ps = bossPhaseStats(bossId, phase);
        // 移动方向：默认朝玩家；招牌机制会改写它
        let dirX = Math.cos(toPlayer);
        let dirY = Math.sin(toPlayer);
        let speedMul = ps.speedMul;

        // ── 招牌机制（第七轮）──
        if (boss.special === 'shell') {
          const st = bossShellStep(e.getData('shellState') || {}, dtMs);
          e.setData('shellState', st);
          e.setData('shelling', st.shelling);
          if (st.event === 'shell') {
            e.setTint(0xe0ecf5);
            hud.banner('石壳守卫结壳了 —— 爆发不够就打不穿', 1200);
          }
          if (st.event === 'break') {
            e.clearTint();
            // 壳碎时甩出两只海葵
            for (let i = 0; i < 2; i++) {
              const shard = this.spawnEnemy('bud');
              shard.setPosition(e.x + (i ? 34 : -34), e.y + (i ? 18 : -18));
            }
          }
          if (st.shelling) { dirX = 0; dirY = 0; }   // 结壳时不动
        } else if (boss.special === 'summon') {
          const st = bossSummonStep(e.getData('summonState') || {}, dtMs);
          e.setData('summonState', st);
          if (st.event === 'summon') {
            for (let i = 0; i < BOSS_SUMMON.count; i++) {
              const m = this.spawnEnemy('moth');
              m.setPosition(e.x + (i ? 44 : -44), e.y + (i ? 22 : -22));
            }
          }
        } else if (boss.special === 'charge') {
          const st = bossChargeStep(e.getData('chargeState') || {}, dtMs, { x: dirX, y: dirY });
          e.setData('chargeState', st);
          const base = e.getData('baseScale') || 1;
          if (st.event === 'lock') e.setTint(0xffe27a);
          if (st.event === 'dash') {
            // 冲刺时恢复**阶段色**（不是清成默认色 —— 那会盖掉阶段提示）
            e.setTint(parseInt(ps.tint, 16));
            e.setScale(base * 1.1);
          }
          if (st.phase === 'dash') {
            dirX = st.lock.x; dirY = st.lock.y;
            speedMul = ps.speedMul * BOSS_CHARGE.dashMul;
          } else {
            // 蓄力与硬直都不动（硬直是玩家的输出窗口）
            dirX = 0; dirY = 0;
            if (st.event) e.setScale(base * (st.phase === 'wind' ? 0.85 : 1));
          }
        }

        e.setVelocity(dirX * speed * speedMul, dirY * speed * speedMul);
        const ft = (e.getData('fireTimer') || 0) - dtMs;
        e.setData('fireTimer', ft);
        if (ft <= 0) {
          e.setData('fireTimer', ps.aimed);
          this.enemyShoot(e, toPlayer, ps.aimed, 3, 120, dt);
        }
        const burst = e.getData('burstTimer') - dtMs;
        e.setData('burstTimer', burst);
        if (burst <= 0) {
          e.setData('burstTimer', ps.burstMs);
          this.radialBurst(e, ps.burst, 130, burstOffset(phase, e.getData('burstTick') || 0));
          e.setData('burstTick', (e.getData('burstTick') || 0) + 1);
        }
        if (ps.bombMs > 0) {
          const bomb = e.getData('bombTimer') - dtMs;
          e.setData('bombTimer', bomb);
          if (bomb <= 0) {
            e.setData('bombTimer', ps.bombMs);
            this.dropPollenBomb();
          }
        }
      }
    }
  }

  /** 敌人本来的颜色：精英是词缀色，普通怪是默认色 */
  applyEnemyTint(e) {
    const affix = ELITE_AFFIXES[e.getData('affix')];
    if (affix?.tint) e.setTint(parseInt(affix.tint, 16));
    else e.clearTint();
  }

  /**
   * 精英「帷幕」：每 3 秒张开 0.9 秒的护盾（期间免疫伤害）。
   *
   * 为什么值得单独一条：它把"构筑够不够"从**总量**变成**节奏** ——
   * 一个爆发够但断断续续的构筑可能一直打不穿它。
   */
  updateEliteShield(e, dtMs) {
    const cycle = e.getData('shieldCycle') || 0;
    if (!cycle) return;
    const shielded = e.getData('shielded');
    if (shielded) {
      const left = (e.getData('shieldTimer') || 0) - dtMs;
      if (left <= 0) {
        e.setData('shielded', false);
        e.setData('shieldCycle', cycle);
        e.clearTint();
        const affix = ELITE_AFFIXES[e.getData('affix')];
        e.setTint(parseInt(affix?.tint ?? 'ff5d8f', 16));
      } else {
        e.setData('shieldTimer', left);
      }
      return;
    }
    const left = (e.getData('shieldCycle') || 0) - dtMs;
    if (left <= 0) {
      const affix = ELITE_AFFIXES[e.getData('affix')];
      e.setData('shielded', true);
      e.setData('shieldTimer', affix?.shieldMs ?? 900);
      e.setTint(0xffffff);
    } else {
      e.setData('shieldCycle', left);
    }
  }

  /**
   * 开火（只负责"现在射出去"，冷却由调用方自己算 ——
   * 以前冷却藏在��个函数里，导致同一只敌人的计时器被算两遍）。
   */
  enemyShoot(enemy, angle, cooldownMs, count, speed, dt, slow = false) {
    for (let i = 0; i < count; i++) {
      const a = angle + (count === 1 ? 0 : (i - (count - 1) / 2) * 0.16);
      const b = this.eBullets.create(enemy.x, enemy.y, 'spike');
      b.setDepth(8);
      b.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
      b.setData('life', 6);
      b.setData('enemyBullet', true);
      // 记下是哪一种怪射的：战败时要能回答"死于哪种怪"
      b.setData('type', enemy.getData('type') || 'unknown');
      // 墨鱼的蛛弹：命中会让玩家减速（考验「机动」）
      if (slow) b.setData('slow', true);
    }
  }

  radialBurst(enemy, count, speed, offset = 0) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + this.runTime + offset;
      const b = this.eBullets.create(enemy.x, enemy.y, 'spike');
      b.setDepth(8);
      b.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
      b.setData('life', 6);
      b.setData('enemyBullet', true);
    }
  }

  /* ── 伤害与结算 ───────────────────── */
  /** 敌人碰到玩家：荆棘反伤 + 正常受伤 */
  touchEnemy(enemy) {
    if (this.runState !== 'playing') return;
    if (this.stats.thorns > 0 && enemy?.active) {
      const next = enemy.getData('thornAt') || 0;
      if (this.runTime >= next) {
        enemy.setData('thornAt', this.runTime + 0.5);
        this.damageEnemy(enemy, this.stats.thorns);
      }
    }
    this.hurtPlayer(enemy);
  }

  hitEnemy(bullet, enemy) {
    if (!bullet?.active || !enemy?.active) return;
    if (enemy === this.player) return;
    // 穿透：同一颗子弹不会对同一个敌人重复生效
    const rawHitIds = bullet.getData('hitIds');
    const hitIds = Array.isArray(rawHitIds) ? rawHitIds : [];
    if (hitIds.includes(enemy.id)) return;
    hitIds.push(enemy.id);
    bullet.setData('hitIds', hitIds);

    const dmg = bullet.getData('damage') || 1;
    const pierceLeft = bullet.getData('pierceLeft') || 0;
    if (pierceLeft > 0) bullet.setData('pierceLeft', pierceLeft - 1);
    else bullet.destroy();

    sfx.hit();
    this.fxSpark.explode(5, enemy.x, enemy.y);
    // 命中减速（转化型装备「霜之锋」）
    if (this.stats.slowOnHit > 0) {
      enemy.setData('slowUntil', this.runTime * 1000 + this.stats.slowDurationMs);
    }
    this.damageEnemy(enemy, dmg);
  }

  /**
   * 这个敌人的"对症倍率"（第九轮）。
   *
   * 为什么在**扣血入口**算，而不是在开枪时算：
   * 子弹是**穿体的**（穿透装备会让同一颗子弹打中多只），
   * 每只怪怕的手段不一样 ⇒ 倍率必须按**被打的那只**算。
   */
  counterMultFor(enemy) {
    const type = enemy?.getData?.('type');
    if (!type) return 1;
    return counterMult(type, this.counterTags || []);
  }

  /** 统一的扣血入口：血量归零就走击杀流程 */
  damageEnemy(enemy, dmg) {
    if (!enemy?.active) return;
    // 已经在死亡流程里的敌人不再重复结算。
    //
    // 以前这里没有这道闸：「击杀爆裂」会在敌人**还没被 destroy** 的时候
    // 把它自己也算进爆炸范围（距离 0）→ damageEnemy 再算一次 → killEnemy 再跑一次
    // → **一次击杀被记成两次，分数与击杀数都被灌水**。
    // 症状：平衡报告里"击杀数 / 生成数"大于 1（物理上不可能）。
    if (enemy.getData('dying')) return;
    // 铁壳蟹的「结壳」期间免疫伤害：爆发不够的构筑会被它拖住。
    // 精英「帷幕」的护盾同理（护盾期间打它等于白打）。
    if (enemy.getData('huskState')?.shelling || enemy.getData('shielded') || enemy.getData('shelling')) {
      this.fxSpark.explode(3, enemy.x, enemy.y);
      return;
    }
    const mult = this.counterMultFor(enemy);
    const hp = (enemy.getData('hp') || 1) - dmg * mult;
    enemy.setData('hp', hp);
    if (hp <= 0) {
      enemy.setData('dying', true);
      // 第九轮：对症击杀给一声反馈（让玩家能"听见"自己打对了）
      if (mult > 1) sfx.counter();
      this.killEnemy(enemy);
    } else {
      // 第九轮：**对症的命中打得更"响"** ——
      // 放大幅度比普通命中更大（1.36 vs 1.22），玩家一眼能看出"这一下打对了"。
      // 为什么用放大而不是改颜色：精英本来就有自己的 tint（按词缀染色），
      // 改 tint 会把那个信息抹掉。
      const punch = mult > 1 ? 1.36 : 1.22;
      this.tweens.add({ targets: enemy, scaleX: punch, scaleY: punch, duration: mult > 1 ? 95 : 70, yoyo: true });
      if (enemy.getData('type') === 'boss') this.updateBossPhase(enemy, hp);
    }
  }

  /** Boss 阶段推进：换挡时播报、换色、轻微震屏 */
  updateBossPhase(boss, hp) {
    const maxHp = boss.getData('maxHp') || 1;
    const oldPhase = boss.getData('phase') || 1;
    const next = bossPhase(hp, maxHp);
    if (!phaseChanged(oldPhase, next)) return;
    boss.setData('phase', next);
    // 阶段参数要按**这只 Boss**取（第七轮：每只 Boss 的阶段强度不同）
    const ps = bossPhaseStats(boss.getData('bossId') || 'wither_lord', next);
    boss.setTint(parseInt(ps.tint, 16));
    this.cameras.main.shake(300, 0.007);
    this.fxPetal.explode(28, boss.x, boss.y);
    const bossName = bossById(boss.getData('bossId') || 'wither_lord').name;
    hud.banner(`${bossName} · 第 ${next} 阶段`, 1500);
    sfx.boss();
  }

  /** 深海炸弹：先预警圈，再爆炸，圈内受伤 */
  dropPollenBomb() {
    const a = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 120;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(a) * r, 30, ARENA.width - 30);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(a) * r, 30, ARENA.height - 30);
    const warn = this.add.image(x, y, 'hazard').setDepth(3).setScale(0.2).setAlpha(0.85);
    this.hazards.add(warn);
    this.tweens.add({
      targets: warn, scale: 1, duration: TELEGRAPH_MS, ease: 'Quad.easeIn',
    });
    this.time.delayedCall(TELEGRAPH_MS, () => {
      if (!warn.active) return;
      const hit = inBlast(this.player.x, this.player.y, x, y, BLAST_RADIUS);
      this.fxPetal.explode(24, x, y);
      this.fxSpark.explode(16, x, y);
      this.cameras.main.shake(180, 0.006);
      warn.destroy();
      // 伤害同样尊重无敌帧：冲刺的无敌窗口不该被范围伤害无视
      if (hit) this.hurtPlayer({});
    });
  }

  /**
   * 毒云：毒水母（或爆烈精英）死亡后留下的一团残留毒素。
   *
   * 为什么要有这个东西：它让"在哪里杀掉它"变成一个决策 ——
   * 在玩家脚下杀掉毒水母，等于给自己挖坑。
   * 这是本轮里**第一个真正要求玩家改变位置**的机制。
   */
  spawnPollenCloud(x, y, radius = MOTH_CLOUD.radius, lifeMs = MOTH_CLOUD.lifeMs) {
    const shape = this.add.circle(x, y, radius, 0xffbe5c, 0.28).setDepth(3);
    const ring = this.add.circle(x, y, radius * 0.62, 0xffe9b0, 0.18).setDepth(3);
    this.clouds.push({ x, y, radius, life: lifeMs, maxLife: lifeMs, tick: MOTH_CLOUD.tickMs, shape, ring });
  }

  /** 毒云：每 tick 结算一次伤害，然后淡出 */
  updateClouds(dt) {
    const dtMs = dt * 1000;
    if (!this.clouds || !this.clouds.length) return;
    for (const c of this.clouds) {
      c.life -= dtMs;
      c.tick -= dtMs;
      if (c.tick <= 0) {
        c.tick = MOTH_CLOUD.tickMs;
        const d = Math.hypot(this.player.x - c.x, this.player.y - c.y);
        if (d <= c.radius) {
          this.hurtPlayer({}, 'moth_cloud');
        }
      }
      const k = Math.max(0, c.life / c.maxLife);
      c.shape.setAlpha(0.28 * k);
      c.ring.setAlpha(0.18 * k);
      c.shape.setScale(1 + (1 - k) * 0.12);
      if (c.life <= 0) {
        c.shape.destroy();
        c.ring.destroy();
      }
    }
    this.clouds = this.clouds.filter((c) => c.life > 0);
  }

  /** 清掉所有毒云（重开 / 回菜单时用） */
  clearClouds() {
    for (const c of this.clouds || []) {
      c.shape?.destroy();
      c.ring?.destroy();
    }
    this.clouds = [];
  }

  killEnemy(enemy) {
    const type = enemy.getData('type');
    const score = enemy.getData('score') || 10;
    const isShard = enemy.getData('shard');
    const base = isShard ? Math.round(score / 2) : score;
    const gained = Math.max(1, Math.round(base * this.scoreMul()));
    const r = registerKill(this.combat, gained, this.runTime);
    this.fxPetal.explode(type === 'boss' ? 46 : 16, enemy.x, enemy.y);
    if (type === 'boss') {
      sfx.bossKill();
      this.cameras.main.shake(520, 0.016);
      this.cameras.main.flash(260, 255, 120, 190);
      hud.banner('Boss 倒下了！', 1500);
    } else {
      sfx.kill();
      this.cameras.main.shake(90, 0.0025);
    }
    // 击杀爆裂（装备）
    this.explodeAt(enemy.x, enemy.y);
    // 击杀回血（装备）
    this.maybeKillHeal();
    // 海葵死亡后分裂
    if (type === 'bud') {
      for (let i = 0; i < 2; i++) {
        const shard = this.spawnEnemy('crawler', { shard: true, hp: 1 });
        shard.setPosition(enemy.x + (i ? 18 : -18), enemy.y + (i ? 10 : -10));
      }
    }
    // ── 第五轮：新敌种的死亡效果 ──
    // 毒水母：死时炸开一团残留毒素（在云里站着会持续掉血）
    if (type === 'moth') {
      this.spawnPollenCloud(enemy.x, enemy.y, MOTH_CLOUD.radius, MOTH_CLOUD.lifeMs);
    }
    // 铁壳蟹：壳碎时甩出碎片
    if (type === 'husk') {
      for (let i = 0; i < HUSK.split; i++) {
        const shard = this.spawnEnemy('huskling', { hp: 1 });
        shard.setPosition(enemy.x + (i ? 22 : -22), enemy.y + (i ? 12 : -12));
      }
    }
    // 精英：词缀效果 + 战利品
    // 第八轮：打完一章的 Boss → 篝火（终局 Boss 不开，那是通关）
    if (type === 'boss' && !isFinalBossEnemy(
      { type: 'boss', wave: enemy.getData('wave') }, { endless: this.run.endless },
    )) {
      this.pendingCamp = { wave: enemy.getData('wave') };
    }
    if (enemy.getData('elite')) {
      const affix = ELITE_AFFIXES[enemy.getData('affix')];
      if (affix?.splitOnDeath) {
        for (let i = 0; i < affix.splitOnDeath; i++) {
          const s2 = this.spawnEnemy(type);
          s2.setPosition(enemy.x + (i ? 26 : -26), enemy.y + (i ? 14 : -14));
        }
      }
      if (affix?.blastOnDeath) {
        this.spawnPollenCloud(enemy.x, enemy.y, MOTH_CLOUD.radius * 1.3, MOTH_CLOUD.lifeMs);
      }
      this.run.elitesKilled = (this.run.elitesKilled || 0) + 1;
      // 战利品面板在**下一帧**开：killEnemy 是在物理回调里被调用的，
      // 直接在这里开面板会打断当前这一帧的物理步。
      this.pendingLoot = { type, affix: enemy.getData('affix') };
    }
    this.dropLoot(enemy.x, enemy.y);
    // 终局 Boss：按"它出生的那一波"判定（见 systems/run.js 的 isFinalBossEnemy）
    const wasFinal = isFinalBossEnemy(
      { type: enemy.getData('type'), wave: enemy.getData('wave') },
      { endless: this.run.endless },
    );
    enemy.destroy();
    this.syncHud(true);
    if (wasFinal) this.victory();
    return r;
  }

  /** 击杀爆裂：装备「孢子爆裂」的效果 */
  explodeAt(x, y) {
    if (this.stats.explodeDamage <= 0 || this.explodeDepth > 2) return;
    this.explodeDepth += 1;
    this.fxPetal.explode(14, x, y);
    for (const e of this.enemies.getChildren()) {
      if (!e.active) continue;
      if (Phaser.Math.Distance.Between(x, y, e.x, e.y) <= this.stats.explodeRadius) {
        this.damageEnemy(e, this.stats.explodeDamage);
      }
    }
    this.explodeDepth -= 1;
  }

  /** 击杀回血（装备） */
  maybeKillHeal() {
    if (this.stats.killHealEvery > 0 && this.combat.kills % this.stats.killHealEvery === 0) {
      this.healPlayer(1);
    } else if (this.stats.killHealChance > 0 && Math.random() < this.stats.killHealChance) {
      this.healPlayer(1);
    }
  }

  healPlayer(n) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    if (this.hp > before) {
      this.fxHeal.explode(14, this.player.x, this.player.y);
      sfx.upgrade();
    }
  }

  /** 直接扣血（异象用）：至少留 1 点血，异象不该把人直接打死 */
  loseHp(n) {
    const before = this.hp;
    this.hp = Math.max(1, this.hp - n);
    if (this.hp < before) {
      this.fxPetal.explode(14, this.player.x, this.player.y);
      sfx.hurt();
    }
  }

  /** 加护盾 */
  addShield(n) {
    this.shield = Math.min(this.stats.shieldMax, this.shield + n);
  }

  /** 增减潮水（局内货币） */
  addDew(n) {
    this.run.dew = Math.max(0, this.run.dew + n);
    hud.setDew(this.run.dew);
    if (n > 0) this.floatText(this.player.x, this.player.y - 26, `+${n} 潮水`, '#8fd3ff');
  }

  /** 飘字：给"刚刚发生了什么"一个视觉落点 */
  floatText(x, y, text, color = '#8fd3ff') {
    const t = this.add.text(x, y, text, {
      fontSize: '13px', fontFamily: 'monospace', color, stroke: '#0b0a10', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: t, y: y - 24, alpha: 0, duration: 720, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /** 当前得分倍率：装备 × 章节主题 */
  scoreMul() {
    return this.stats.scoreMul * (this.spawner.mods?.scoreMul ?? 1);
  }

  dropLoot(x, y) {
    const dropMul = this.spawner.mods?.dropMul ?? 1;
    if (dropMul <= 0) return;
    const roll = Math.random();
    if (this.hp < this.maxHp && roll < 0.09 * dropMul) this.dropPickup(x, y, 'nectar');
    else if (this.fireLevel < 5 && roll < 0.3 * dropMul) this.dropPickup(x, y, 'bloom');
    else if (roll < 0.62 * dropMul) this.dropPickup(x, y, 'seed');
  }

  dropPickup(x, y, kind) {
    const p = this.pickups.create(x, y, kind);
    p.setDepth(6);
    p.setData('kind', kind);
    p.setVelocity((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60);
    this.tweens.add({ targets: p, scaleX: 1.2, scaleY: 1.2, duration: 420, yoyo: true, repeat: -1 });
    this.time.delayedCall(12000, () => p.destroy());
  }

  /** 拾取吸附：半径由装备决定 */
  magnetPickups() {
    // 基础半径 56（原来 40）：火力等级曾经只能靠捡磨砺石提升，
    // 捡不到就会掉进"打不动 → 死得早 → 更捡不到"的螺旋（见 DECISIONS §6.6）
    const radius = 56 + this.stats.pickupRadiusAdd;
    for (const p of this.pickups.getChildren()) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      if (d < radius && d > 0.001) {
        const a = Phaser.Math.Angle.Between(p.x, p.y, this.player.x, this.player.y);
        const pull = 260 * (1 - d / radius) + 60;
        p.setVelocity(Math.cos(a) * pull, Math.sin(a) * pull);
      } else {
        p.setVelocity(p.body.velocity.x * 0.9, p.body.velocity.y * 0.9);
      }
    }
  }

  collect(pickup) {
    const kind = pickup?.getData?.('kind');
    if (!kind || !pickup.active) return;
    pickup.destroy();
    if (kind === 'seed') {
      this.combat.score += Math.max(1, Math.round(15 * this.scoreMul()));
      sfx.pickup();
    } else if (kind === 'bloom') {
      if (this.fireLevel < 5) {
        this.fireLevel += 1;
        this.fire = deriveFireStats(this.fireLevel, this.stats);
        sfx.upgrade();
        hud.banner(`火力提升 Lv.${this.fireLevel}`, 900);
      } else {
        this.combat.score += Math.max(1, Math.round(60 * this.scoreMul()));
        sfx.pickup();
      }
    } else if (kind === 'nectar') {
      this.healPlayer(1);
    }
    this.syncHud(true);
  }

  hurtPlayer(source, cause = null) {
    if (this.runState !== 'playing') return;
    if (!source || source === this.player) return;
    const invulnMs = INVULN_MS + this.stats.invulnAddMs;
    if (this.runTime * 1000 < this.invulnUntil) return;
    // 记录"是谁打死的"：平衡报告要能回答"死于哪种怪"，
    // 否则新敌种到底加了多少压力，只能靠感觉。
    this.run.deathCause = cause || source.getData?.('type') || (source.getData?.('enemyBullet') ? 'bullet' : 'hazard');
    // 只有敌方弹幕会被打掉；撞上来的敌人只是被弹开
    if (source.getData?.('enemyBullet')) source.destroy();
    // 墨鱼的蛛弹：命中后减速
    if (source.getData?.('slow')) {
      this.playerSlowUntil = Math.max(this.playerSlowUntil || 0, this.runTime * 1000 + PLAYER_SLOW.ms);
      hud.banner('被蛛网黏住了', 900);
    }
    // 撞上来的敌人被弹开，避免贴脸连续掉血
    if (source.body && !source.getData?.('noKnockback')) {
      const a = Phaser.Math.Angle.Between(this.player.x, this.player.y, source.x, source.y);
      source.setVelocity(Math.cos(a) * 240, Math.sin(a) * 240);
    }
    // 护盾优先挡下伤害
    if (this.shield > 0) {
      this.shield -= 1;
      this.fxSpark.explode(10, this.player.x, this.player.y);
      sfx.hit();
      this.syncHud(true);
      return;
    }
    this.hp -= 1;
    this.invulnUntil = this.runTime * 1000 + invulnMs;
    if (this.stats.rageMs > 0) this.rageUntil = this.runTime + this.stats.rageMs / 1000;
    sfx.hurt();
    this.cameras.main.shake(260, 0.009);
    this.fxPetal.explode(20, this.player.x, this.player.y);
    if (this.hp <= 0) {
      this.hp = 0;
      this.gameOver();
    }
    this.syncHud(true);
  }

  cullBullets(dt) {
    for (const b of this.bullets.getChildren()) {
      const life = (b.getData('life') || 1) - dt;
      b.setData('life', life);
      const out = b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20;
      if (life <= 0 || out) b.destroy();
    }
    for (const b of this.eBullets.getChildren()) {
      const life = (b.getData('life') || 6) - dt;
      b.setData('life', life);
      const out = b.x < -30 || b.x > ARENA.width + 30 || b.y < -30 || b.y > ARENA.height + 30;
      if (life <= 0 || out) b.destroy();
    }
  }

  /* ── HUD 同步 ─────────────────────── */
  syncHud(force) {
    this.hudTimer = (this.hudTimer || 0) + 1;
    if (!force && this.hudTimer % 6 !== 0) return;
    const chapter = chapterOf(Math.max(1, this.spawner.wave));
    const theme = this.run.plan.chapters[chapter.index - 1]?.theme;
    hud.setHp(this.hp, this.maxHp, this.shield);
    hud.setScore(this.combat.score);
    hud.setWave(Math.max(1, this.spawner.wave), chapter.name, theme?.name);
    hud.setFire(this.fireLevel);
    hud.setHero(characterById(this.characterId)?.name || '—');
    hud.setBest(Math.max(this.bestScore(), this.combat.score));
    hud.setRelics(this.run.relics, this.run.deepened);
    hud.setDps(dpsOf(this.fire));
    hud.setArchetypes(activeArchetypes(this.run.relics));
    hud.setDew(this.run.dew);
    hud.setCombo(
      this.combat.combo,
      this.combat.multiplier,
      comboRemaining(this.combat, this.runTime) / Math.max(0.001, this.combat.windowSec),
    );
  }
}
