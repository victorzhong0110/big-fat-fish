// DOM 覆盖层控制器：HUD、菜单、暂停、抽卡、异象、结算、深海藏品
import { relicById } from './systems/relics.js';
import { rarityLabel } from './systems/draft.js';
import { deepenCost } from './systems/dew.js';
import { counterNote, ENEMY_COUNTERS, COUNTER_TAGS, COUNTER_MULT, tagsFromStats } from './systems/counters.js';
import { relicValue } from './systems/relicValue.js';
import { applyBuild } from './systems/characters.js';
import { ARCHETYPES, countByTag } from './systems/archetypes.js';

const $ = (s) => document.querySelector(s);

const el = {
  hud: $('#hud'),
  hearts: $('#hearts'),
  shields: $('#shields'),
  fire: $('#fire-level'),
  score: $('#score'),
  combo: $('#combo'),
  comboText: $('#combo-text'),
  comboFill: $('#combo-fill'),
  wave: $('#wave'),
  hero: $('#hero'),
  best: $('#best'),
  relics: $('#relics'),
  hudArchetypes: $('#hud-archetypes'),
  banner: $('#banner'),
  menu: $('#menu'),
  pause: $('#pause'),
  over: $('#over'),
  draft: $('#draft'),
  roster: $('#roster'),
  victory: $('#victory'),
  finalScore: $('#final-score'),
  finalWave: $('#final-wave'),
  finalCombo: $('#final-combo'),
  finalChapter: $('#final-chapter'),
  finalKills: $('#final-kills'),
  finalSurvived: $('#final-survived'),
  finalGrade: $('#final-grade'),
  finalBest: $('#final-best'),
  finalRelics: $('#over-relics'),
  overRelics: $('#over-relics'),
  overMemory: $('#over-memory'),
  overCause: $('#over-cause'),
  overArchetypes: $('#over-archetypes'),
  overNext: $('#over-next'),
  overPressure: $('#over-pressure'),
  victoryPressure: $('#victory-pressure'),
  victoryNext: $('#victory-next'),
  draftArchetypes: $('#draft-archetypes'),
  draftThreats: $('#draft-threats'),
  draftCounters: $('#draft-counters'),
  victoryArchetypes: $('#victory-archetypes'),
  overSeed: $('#over-seed'),
  victoryScore: $('#victory-score'),
  victoryWave: $('#victory-wave'),
  victoryKills: $('#victory-kills'),
  victoryGrade: $('#victory-grade'),
  victoryRelics: $('#victory-relics'),
  victoryMemory: $('#victory-memory'),
  victorySeed: $('#victory-seed'),
  draftKicker: $('#draft-kicker'),
  draftTitle: $('#draft-title'),
  draftSub: $('#draft-sub'),
  draftCards: $('#draft-cards'),
  draftDew: $('#draft-dew'),
  draftActions: $('#draft-actions'),
  hintbar: $('#hintbar'),
  btnStart: $('#btn-start'),
  btnResume: $('#btn-resume'),
  btnRestart: $('#btn-restart'),
  btnMenu: $('#btn-menu'),
  btnOverMenu: $('#btn-over-menu'),
  btnContinue: $('#btn-continue'),
  btnVictoryMenu: $('#btn-victory-menu'),
  btnRetrySeed: $('#btn-retry-seed'),
  btnOverRetrySeed: $('#btn-over-retry-seed'),
  dew: $('#dew'),
  dps: $('#dps'),
  btnBuild: $('#btn-build'),
  btnDaily: $('#btn-daily'),
  btnMusic: $('#btn-music'),
  buildStats: $('#build-stats'),
  buildArchetypes: $('#build-archetypes'),
  buildRelics: $('#build-relics'),
  buildThreats: $('#build-threats'),
  buildRoute: $('#build-route'),
  camp: $('#camp'),
  campKicker: $('#camp-kicker'),
  campDesc: $('#camp-desc'),
  campCards: $('#camp-cards'),
  route: $('#route'),
  routeKicker: $('#route-kicker'),
  routeDesc: $('#route-desc'),
  routeCards: $('#route-cards'),
  routeThreats: $('#route-threats'),
  omen: $('#omen'),
  omenKicker: $('#omen-kicker'),
  omenDesc: $('#omen-desc'),
  omenCards: $('#omen-cards'),
  omenThreats: $('#omen-threats'),
  memoryCount: $('#memory-count'),
  memoryNote: $('#memory-note'),
  unlockList: $('#unlock-list'),
};

let bannerTimer = null;
let lastHp = -1;
let lastMax = -1;
let lastShield = -1;
let lastRelicKey = '';
let lastArchetypeKey = '';

let draftOptions = [];
let draftPick = null;
let selectCharacter = null;
let draftMode = 'pick';
let omenOptions = [];
let omenPick = null;
let routeOptions = [];
let routePick = null;
let campOptions = [];
let campPick = null;
let lastDew = -1;

/** 角色卡：点击即选中，回调给场景 */
function renderRoster(cards, selectedId) {
  if (!el.roster) return;
  el.roster.innerHTML = '';
  for (const c of cards) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `card char${c.id === selectedId ? ' selected' : ''}`;
    b.dataset.id = c.id;
    b.setAttribute('aria-pressed', c.id === selectedId ? 'true' : 'false');
    b.innerHTML = `
      <span class="card-rarity">${c.title}</span>
      <b class="card-name">${c.name}</b>
      <span class="card-desc">${c.desc}</span>
      <span class="card-tag">${c.notes.join(' · ')}</span>
      <span class="card-tag">起始装备 · ${c.startRelicName}：${c.startRelicDesc}</span>`;
    b.addEventListener('click', () => {
      for (const other of el.roster.querySelectorAll('.card')) {
        other.classList.remove('selected');
        other.setAttribute('aria-pressed', 'false');
      }
      b.classList.add('selected');
      b.setAttribute('aria-pressed', 'true');
      selectCharacter?.(c.id);
    });
    el.roster.append(b);
  }
}

/** 下一个解锁目标（把局外进度接到"刚打完一局"这个时刻） */
export function nextUnlockHint(memory, locked) {
  const next = locked && locked[0];
  if (!next) return '所有装备都已解锁 —— 去开一局吧';
  const lack = Math.max(0, next.cost - memory);
  if (lack <= 0) return `可以解锁「${next.name}」了（${next.cost} 记忆）`;
  return `再攒 ${lack} 记忆可解锁「${next.name}」`;
}

/**
 * 构筑一览：把属性表变成人能读的一行行。
 *
 * 为什么需要：这是一个**构筑游戏**，41 张装备 + 4 个流派 + 8 个转化字段，
 * 而 HUD 上只显示血量与火力等级 —— **玩家在盲建**。
 * 决策要有分量，前提是玩家看得见自己造出了什么。
 */
const BUILD_ROWS = [
  ['伤害', (f) => `${f.damage}`],
  ['弹数', (f) => `${f.bullets}`],
  ['射速', (f) => `${f.cooldownMs} ms`],
  ['暴击率', (f) => `${Math.round(f.critChance * 100)}%`],
  ['暴击倍率', (f) => `×${f.critMult.toFixed(1)}`],
  ['移速', (f, st) => `×${st.moveSpeedMul.toFixed(2)}`],
  ['冲刺冷却', (f, st) => `×${st.dashCooldownMul.toFixed(2)}`],
  ['受击无敌', (f, st) => `${Math.round(1200 + st.invulnAddMs)} ms`],
  ['护盾上限', (f, st) => `${st.shieldMax}`],
  ['荆棘反伤', (f, st) => `${st.thorns}`],
  ['击杀回血', (f, st) => (st.killHealChance > 0
    ? `${Math.round(st.killHealChance * 100)}%/次`
    : (st.killHealEvery > 0 ? `每 ${st.killHealEvery} 杀` : '—'))],
  ['连击窗口', (f, st) => `${(2.5 + st.comboWindowAddMs / 1000).toFixed(1)} s`],
  ['得分倍率', (f, st) => `×${st.scoreMul.toFixed(2)}`],
  ['敌人生命', (f, st) => `×${st.enemyHpMul.toFixed(2)}`],
  ['连击增伤', (f, st) => (st.comboDamagePerStack > 0 ? `每层 +${st.comboDamagePerStack}` : '—')],
  ['击杀增伤', (f, st) => (st.killDamagePerKill > 0 ? `每杀 +${st.killDamagePerKill}` : '—')],
];

function renderBuildStats(container, { fire, stats, dps, need, coverage, mult, chapterMult, bossSeconds, tags }) {
  if (!container) return;
  container.innerHTML = '';
  for (const [label, fn] of BUILD_ROWS) {
    const row = document.createElement('div');
    row.className = 'build-stat';
    const l = document.createElement('span');
    l.textContent = label;
    const v = document.createElement('b');
    v.textContent = String(fn(fire, stats));
    row.append(l, v);
    container.append(row);
  }
  // 压力：你的 DPS 与这一波需要多少 DPS
  const p = document.createElement('div');
  p.className = 'build-stat build-pressure' + (coverage === null ? '' : (coverage >= 1 ? ' hi' : ' lo'));
  const pl = document.createElement('span');
  pl.textContent = '压力（DPS ÷ 需求）';
  const pv = document.createElement('b');
  pv.textContent = need
    ? `${dps} ÷ ${need} = ×${coverage}`
    : `${dps}`;
  p.append(pl, pv);
  container.append(p);
  // 第九轮：**对症倍率**（这一波你的手段能放大多少伤害）。
  // 为什么单独一行：它是"构筑对不对症"的唯一可见反馈 ——
  // 玩家必须能看见"我这套构筑在这一章值不值"。
  if (mult && Math.abs(mult - 1) > 0.005) {
    const row = document.createElement('div');
    row.className = 'build-stat build-counter';
    const l = document.createElement('span');
    l.textContent = '对症加成（手段克制）';
    const v = document.createElement('b');
    v.textContent = `×${mult.toFixed(2)}${chapterMult ? ` · 整章 ×${chapterMult.toFixed(2)}` : ''}`;
    row.append(l, v);
    container.append(row);
  }
  // 第九轮：Boss 战预计几秒（Boss 是单挑，装不进"压力"那个口径）。
  if (bossSeconds) {
    const row = document.createElement('div');
    row.className = 'build-stat build-boss';
    const l = document.createElement('span');
    l.textContent = 'Boss 战预计';
    const v = document.createElement('b');
    v.textContent = `${bossSeconds} 秒`;
    row.append(l, v);
    container.append(row);
  }
}

/**
 * 强度曲线：每波一根柱，高度 = 覆盖度（你的 DPS ÷ 该波需求）。
 * 绿 = 打得动，琥珀 = 勉强，红 = 跟不上。
 *
 * 为什么画：**战败之后玩家最想知道的是"我从哪一波开始跟不上了"**，
 * 一根柱子比一句话更直观（也让真人试玩能直接看出曲线形状）。
 */
function renderPressure(container, list) {
  if (!container) return;
  container.innerHTML = '';
  if (!list || !list.length) return;
  const max = Math.max(1.4, ...list.map((p) => p.coverage ?? 0));
  for (const p of list) {
    const c = p.coverage ?? 0;
    const cls = c >= 1 ? 'ok' : (c >= 0.8 ? 'mid' : 'bad');
    const bar = document.createElement('div');
    bar.className = `pressure-bar ${cls}`;
    bar.style.height = `${Math.max(8, Math.round((c / max) * 100))}%`;
    bar.title = `第 ${p.wave} 波 · 你的 DPS ${p.dps} ÷ 需要 ${p.need} = ×${c}`;
    container.append(bar);
  }
}

/**
 * 流派行：显示当前成型的流派（名称 + 档位）。
 * 不显示的话玩家根本不知道自己正在建什么 —— 协同机制等于不存在。
 */
function renderArchetypes(container, list) {
  if (!container) return;
  container.innerHTML = '';
  if (!list || !list.length) return;
  for (const a of list) {
    const chip = document.createElement('span');
    chip.className = 'arch-chip';
    chip.title = a.desc;
    chip.textContent = `${a.name} ${a.tiers} 档 · ${a.count} 件${a.tag}`;
    container.append(chip);
  }
}

/**
 * 「本章威胁」：这一章会遇到哪些怪，以及**它们各自的应对**。
 *
 * 为什么需要：第五轮给敌人加了四种"会针对构筑提问"的行为
 * （冲刺 / 毒云 / 结壳 / 减速）。如果玩家不知道这一章要面对什么，
 * 新机制就只是"突然变难"而不是"需要换个打法"——
 * **看得见威胁，才谈得上针对它构筑**。
 */
function renderThreats(container, list, tags = []) {
  if (!container) return;
  container.innerHTML = '';
  // 空列表就整块留白（战利品面板不传威胁 —— 那不是"选章节"的场合）
  if (!list || !list.length) return;
  for (const t of list) {
    const row = document.createElement('div');
    row.className = 'threat-row';
    // 第九轮：标出"你现在的手段对它对不对症" ——
    // 克制从提示变成机制之后，玩家必须能一眼看出**哪只怪已经被你克住**。
    const weak = (ENEMY_COUNTERS[t.id] || []).filter((x) => tags.includes(x));
    const mark = weak.length
      ? `<i class="weak">已克制 ×${COUNTER_MULT}（${weak.map((x) => COUNTER_TAGS[x]).join('/')}）</i>`
      : '';
    row.innerHTML = `
      <i class="dot ${t.id}"></i>
      <b>${t.name}</b>
      <span>${t.desc}</span>
      <em>${t.counter}</em>
      ${mark}`;
    container.append(row);
  }
}

/** 深海藏品：解锁面板（记忆余额 + 还没解锁的装备） */
function renderUnlocks(memory, locked, onUnlock) {
  if (!el.unlockList) return;
  if (el.memoryCount) el.memoryCount.textContent = `记忆 ${memory}`;
  if (el.memoryNote) {
    const next = locked[0];
    el.memoryNote.textContent = next
      ? `下一件：${next.name}（${next.rarity === 'legendary' ? '传说' : '稀有'}）· 需 ${next.cost} 记忆`
      : '所有装备都已解锁 —— 去开一局吧';
  }
  el.unlockList.innerHTML = '';
  for (const item of locked) {
    const b = document.createElement('button');
    b.type = 'button';
    const afford = memory >= item.cost;
    b.className = `card relic-unlock ${item.rarity}${afford ? '' : ' locked'}`;
    b.innerHTML = `
      <span class="card-rarity">${item.rarity === 'legendary' ? '传说' : '稀有'}</span>
      <b class="card-name">${item.name}</b>
      <span class="card-desc">${item.desc}</span>
      <span class="card-tag">${afford ? `解锁 · ${item.cost} 记忆` : `需要 ${item.cost} 记忆`}</span>`;
    b.disabled = !afford;
    b.addEventListener('click', () => onUnlock?.(item.id));
    el.unlockList.append(b);
  }
}

/** 评级兜底（正常路径由 systems/run.js 的 gradeOf 给出，阈值必须一致） */
function gradeOf(score) {
  if (score >= 60000) return 'S';
  if (score >= 40000) return 'A';
  if (score >= 25000) return 'B';
  return 'C';
}

/** 装备列表 → 小徽章行（深化过的显示层数） */
function renderRelicChips(container, ids, deepened = {}) {
  if (!container) return;
  container.innerHTML = '';
  for (const id of ids) {
    const r = relicById(id);
    if (!r) continue;
    const layers = deepened[id] || 0;
    const chip = document.createElement('span');
    chip.className = `chip ${r.rarity}${r.cursed ? ' cursed' : ''}${layers ? ' deep' : ''}`;
    chip.textContent = layers ? `${r.name}·深${layers}` : r.name;
    chip.title = `${r.tag} · ${r.desc}${layers ? `（已深化 ${layers} 层）` : ''}`;
    container.append(chip);
  }
}

export const hud = {
  init(handlers) {
    el.btnStart.addEventListener('click', () => handlers.onStart?.());
    el.btnResume.addEventListener('click', () => handlers.onResume?.());
    el.btnRestart.addEventListener('click', () => handlers.onRestart?.());
    el.btnMenu?.addEventListener('click', () => handlers.onMenu?.());
    el.btnOverMenu?.addEventListener('click', () => handlers.onMenu?.());
    el.btnContinue?.addEventListener('click', () => handlers.onContinue?.());
    el.btnVictoryMenu?.addEventListener('click', () => handlers.onMenu?.());
    el.btnBuild?.addEventListener('click', () => handlers.onBuild?.());
    el.btnDaily?.addEventListener('click', () => handlers.onDaily?.());
    el.btnMusic?.addEventListener('click', () => {
      const on = handlers.onMusic?.();
      if (el.btnMusic) el.btnMusic.textContent = `音乐：${on ? '开' : '关'}`;
    });
    el.btnRetrySeed?.addEventListener('click', () => handlers.onRetrySeed?.());
    el.btnOverRetrySeed?.addEventListener('click', () => handlers.onRetrySeed?.());
    selectCharacter = (id) => handlers.onSelectCharacter?.(id);
    // 数字键快速选卡（抽卡面板 / 异象面板）
    window.addEventListener('keydown', (e) => {
      const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (idx < 0) return;
      if (!el.draft.hidden) {
        e.preventDefault();
        if (draftOptions[idx]) draftPick?.(draftOptions[idx].id);
        return;
      }
      if (!el.camp.hidden) {
        e.preventDefault();
        if (idx < campOptions.length) campPick?.(campOptions[idx].id);
        return;
      }
      if (!el.route.hidden) {
        e.preventDefault();
        if (idx < routeOptions.length) routePick?.(routeOptions[idx].id);
        return;
      }
      if (!el.omen.hidden) {
        e.preventDefault();
        if (idx < omenOptions.length) omenPick?.(omenOptions[idx].id);
      }
    });
  },
  showMenu(v = true) { el.menu.hidden = !v; },
  showPause(v = true) { el.pause.hidden = !v; },
  showHud(v = true) { el.hud.hidden = !v; },
  showHint(v = true) { el.hintbar.hidden = !v; },

  /** 角色选择区 */
  showRoster(cards, selectedId) { renderRoster(cards, selectedId); },

  setHp(hp, max, shield = 0) {
    if (hp === lastHp && max === lastMax && shield === lastShield) return;
    lastHp = hp; lastMax = max; lastShield = shield;
    el.hearts.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const d = document.createElement('i');
      d.className = i < hp ? 'heart' : 'heart empty';
      el.hearts.append(d);
    }
    el.shields.innerHTML = '';
    for (let i = 0; i < shield; i++) {
      const d = document.createElement('i');
      d.className = 'shield';
      el.shields.append(d);
    }
  },

  setScore(n) { el.score.textContent = String(n); },
  setBest(n) { el.best.textContent = `最高 ${n}`; },
  setWave(n, chapter, theme) {
    const parts = [`第 ${n} 波`];
    if (chapter) parts.push(chapter);
    if (theme) parts.push(theme);
    el.wave.textContent = parts.join(' · ');
  },
  setFire(level) { el.fire.textContent = `火力 Lv.${level}`; },

  /** 当前守护者（角色）名字 */
  setHero(name) {
    if (!el.hero) return;
    if (el.hero.textContent === name) return;
    el.hero.textContent = name;
  },

  setRelics(ids = [], deepened = {}) {
    const key = ids.join('|') + '#' + JSON.stringify(deepened);
    if (key === lastRelicKey) return;
    lastRelicKey = key;
    renderRelicChips(el.relics, ids, deepened);
  },

  /** HUD 上常驻显示当前流派（打的时候也要看得见自己在建什么） */
  setArchetypes(list = []) {
    const key = list.map((a) => `${a.id}:${a.tiers}`).join('|');
    if (key === lastArchetypeKey) return;
    lastArchetypeKey = key;
    renderArchetypes(el.hudArchetypes, list);
  },

  setCombo(combo, multiplier, ratio) {
    if (combo < 2) {
      el.combo.hidden = true;
      return;
    }
    el.combo.hidden = false;
    el.comboText.textContent = `连击 x${multiplier} · ${combo}`;
    el.comboFill.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
  },

  banner(text, ms = 1400) {
    el.banner.textContent = text;
    el.banner.hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { el.banner.hidden = true; }, ms);
  },

  /**
   * 抽卡面板：展示本章主题与候选装备。
   * mode='pick' 点卡=拿；mode='banish' 点卡=放逐。
   */
  showDraft({
    chapter = '', theme = null, options = [], onPick = null,
    dew = 0, actions = [], mode = 'pick', onAction = null, archetypes = [], owned = [],
    deepened = {}, gift = false, loot = false, threats = [], route = null,
    counters = null, playerTags = [], camp = '',
  }) {
    draftOptions = options;
    draftPick = onPick;
    draftMode = mode;
    el.draftKicker.textContent = chapter;
    if (el.draftTitle) el.draftTitle.textContent = loot ? '战利品' : '选择一份装备';
    const routeNote = route ? ` ｜ 本章路线：${route.name} —— ${route.rewardText}` : '';
    // 第九轮：篝火预告（终局那一章没有篝火 ⇒ 不预告）
    const campNote = camp ? ` ｜ ${camp}` : '';
    el.draftSub.textContent = loot
      ? '异变体的残骸里还剩一份装备 —— 只能拿一份'
      : mode === 'banish'
        ? '放逐模式：点一张卡，把它永久踢出这一局的牌池'
        : mode === 'deepen'
          ? '深化模式：点一张你已有的装备，把它的效果再叠一层'
          : gift
            ? '无尽里程碑：这一章白挑两张，不花潮水'
            : (theme ? `本章主题：${theme.name} —— ${theme.desc}${routeNote}${campNote}` : `选择一份装备${campNote}`);
    renderArchetypes(el.draftArchetypes, archetypes);
    // 第九轮：**这一章需要哪一招**（每种手段能命中本章多少血量）+
    // **你已经有什么手段** ⇒ 玩家一眼能看出自己缺哪一格。
    if (el.draftCounters) {
      const c = counters || {};
      const parts = Object.keys(c).map((t) => `${COUNTER_TAGS[t]} ${Math.round(c[t] * 100)}%`);
      const mine = (playerTags || []).map((t) => COUNTER_TAGS[t]).join('、');
      el.draftCounters.textContent = parts.length
        ? `本章手段需求：${parts.join(' · ')}　｜　你的手段：${mine || '（还没有）'}（伤害 ×${COUNTER_MULT}）`
        : '';
    }
    // 本章威胁：在**做决策的那一刻**就告诉玩家这一章要面对什么 ——
    // 决策要有分量，前提是玩家知道自己在为什么做准备。
    renderThreats(el.draftThreats, threats);
    el.draftCards.innerHTML = '';
    if (mode === 'deepen') {
      // 深化模式：列出自己已有的装备，点一张就深化它
      //
      // 价格必须**逐张显示**：深化的价格随层数上涨（24 + 10×层数），
      // 以前面板只写"效果再叠一层"、不写价格 ——
      // 玩家（和机器人）点下去才发现潮水不够，**卡在深化模式里出不来**。
      // 现在每张卡写清自己的价格，买不起的直接置灰。
      const enemyIds = (threats || []).map((t) => t.id);
      for (const id of owned) {
        const r = relicById(id);
        if (!r) continue;
        const layers = deepened[id] || 0;
        const cost = deepenCost(layers);
        const afford = dew >= cost;
        const note = counterNote(r.id, enemyIds);
        // 第九轮：**深化能给手段**（把普通牌深化成对症牌）⇒ 面板必须写出来，
        // 否则玩家不知道"再深一层就能拿到范围"。
        const tagsNow = tagsFromStats(applyBuild(owned, null, deepened));
        const tagsAfter = tagsFromStats(applyBuild(owned, null, { ...deepened, [id]: layers + 1 }));
        const tagsAfter2 = tagsFromStats(applyBuild(owned, null, { ...deepened, [id]: layers + 2 }));
        const gained = tagsAfter.filter((t) => !tagsNow.includes(t));
        const gainedNext = tagsAfter2.filter((t) => !tagsAfter.includes(t));
        const deepenTag = gained.length
          ? `深化后新增手段：${gained.map((t) => COUNTER_TAGS[t]).join('、')}（伤害 ×${COUNTER_MULT}）`
          : (gainedNext.length
            ? `再深一层可得：${gainedNext.map((t) => COUNTER_TAGS[t]).join('、')}`
            : '');
        const card = document.createElement('button');
        card.type = 'button';
        card.dataset.id = id; // 机器人要按 id 选要深化的那张（见 scripts/bot.mjs）
        card.dataset.cost = String(cost);
        card.className = `card ${r.rarity}${r.cursed ? ' cursed' : ''}${afford ? '' : ' off'}`;
        card.disabled = !afford;
        card.innerHTML = `
          <span class="card-rarity">${rarityLabel(r)}${r.cursed ? ' · 诅咒' : ''}</span>
          <b class="card-name">${r.name}${layers ? ` ·深 ${layers} 层` : ''}</b>
          <span class="card-desc">${r.desc}</span>
          <span class="card-tag">深化：效果再叠一层（本次不再拿新牌）· ${cost} 潮水${afford ? '' : '（买不起）'}</span>
          ${deepenTag ? `<span class="card-tag counter">${deepenTag}</span>` : ''}
          ${note ? `<span class="card-tag counter">${note}</span>` : ''}`;
        card.addEventListener('click', () => onPick?.(id));
        el.draftCards.append(card);
      }
      el.draft.hidden = false;
      return;
    }
    // 手上同标签的件数 → 让玩家在**决策当下**看见"这张会不会凑成流派"
    const ownedTags = countByTag(owned);
    // 本章的敌种 → 候选卡上标"对症"（第七轮）
    const enemyIds = (threats || []).map((t) => t.id);
    options.forEach((r, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.dataset.id = r.id; // 自动化脚本要按装备 id 评估候选（见 scripts/bot.mjs）
      card.className = `card ${r.rarity}${r.cursed ? ' cursed' : ''}${mode === 'banish' ? ' banishable' : ''}`;
      const arch = ARCHETYPES.find((a) => a.tag === r.tag);
      let tagText = r.tag;
      if (arch) {
        const have = ownedTags[r.tag] || 0;
        const next = have + 1;
        const tiers = Math.floor(have / arch.every);
        tagText = next % arch.every === 0
          ? `${r.tag} · 拿了就凑成「${arch.name} ${tiers + 1} 档」`
          : `${r.tag} · 「${arch.name}」${tiers} 档`;
      }
      const note = counterNote(r.id, enemyIds);
      // 第十轮：**写清这张牌给伤害带来什么** ——
      // 实测发现"只看稀有度"会全挑到不增伤的牌（蜜腺 / 连击花环 / 疾影 …）
      // ⇒ DPS 卡在保底线 ⇒ 第 7~12 波就死。玩家有这张信息就不会踩同一个坑。
      const value = relicValue(r.id, owned, { tags: playerTags });
      card.innerHTML = `
        <span class="card-key">${i + 1}</span>
        <span class="card-rarity">${rarityLabel(r)}${r.cursed ? ' · 诅咒' : ''}</span>
        <b class="card-name">${r.name}</b>
        <span class="card-desc">${r.desc}</span>
        <span class="card-tag">${tagText}</span>
        <span class="card-tag value ${value.pct > 0 ? 'up' : (value.pct < 0 ? 'down' : 'flat')}">${value.text}</span>
        ${note ? `<span class="card-tag counter">${note}</span>` : ''}`;
      card.addEventListener('click', () => onPick?.(r.id));
      el.draftCards.append(card);
    });
    // 潮水与三个动作
    if (el.draftDew) el.draftDew.textContent = `潮水 ${dew}`;
    if (el.draftActions) {
      el.draftActions.innerHTML = '';
      for (const a of actions) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `act${a.enabled ? '' : ' off'}${mode === a.id ? ' on' : ''}`;
        b.dataset.id = a.id;
        b.disabled = !a.enabled;
        b.innerHTML = `<b>${a.label}</b><span>${a.cost ? `${a.cost} 潮水 · ` : ''}${a.desc}</span>`;
        b.addEventListener('click', () => onAction?.(a.id));
        el.draftActions.append(b);
      }
    }
    el.draft.hidden = false;
  },

  hideDraft() {
    el.draft.hidden = true;
    draftOptions = [];
    draftPick = null;
    draftMode = 'pick';
  },

  /** 篝火面板：章末的休整（休整 / 磨刃，二选一） */
  showCamp({ kicker = '', desc = '', options = [], onPick = null }) {
    campOptions = options;
    campPick = onPick;
    el.campKicker.textContent = kicker;
    el.campDesc.textContent = desc;
    el.campCards.innerHTML = '';
    options.forEach((o, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `card camp${o.enabled ? '' : ' off'}`;
      card.dataset.id = o.id;
      card.disabled = !o.enabled;
      card.innerHTML = `
        <span class="card-key">${i + 1}</span>
        <b class="card-name">${o.name}</b>
        <span class="card-desc">${o.desc}</span>
        <span class="card-tag">${o.hint || ''}</span>`;
      card.addEventListener('click', () => onPick?.(o.id));
      el.campCards.append(card);
    });
    el.camp.hidden = false;
  },

  hideCamp() {
    el.camp.hidden = true;
    campOptions = [];
    campPick = null;
  },

  /**
   * 路线面板：这一章走哪条路（二选一）。
   *
   * 为什么要先选路再抽卡：**先选战场，再选装备** ——
   * 玩家知道这一章要面对什么，才知道该拿哪张装备。
   */
  showRoute({ kicker = '', theme = null, options = [], threats = [], onPick = null, quip = '' }) {
    routeOptions = options;
    routePick = onPick;
    el.routeKicker.textContent = kicker;
    el.routeDesc.textContent = theme
      ? `本章主题：${theme.name} —— ${theme.desc}${quip ? `\n${quip}` : ''}`
      : '';
    renderThreats(el.routeThreats, threats);
    el.routeCards.innerHTML = '';
    options.forEach((r, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card route';
      card.dataset.id = r.id;              // 机器人要按 id 选路线（见 scripts/bot.mjs）
      card.dataset.threat = String(r.threat);
      card.dataset.reward = String(r.reward);
      card.innerHTML = `
        <span class="card-key">${i + 1}</span>
        <span class="card-rarity">威胁 ×${r.threat}</span>
        <b class="card-name">${r.name}</b>
        <span class="card-desc">${r.riskText}</span>
        <span class="card-tag">换来：${r.rewardText}（收益 ×${r.reward}）</span>`;
      card.addEventListener('click', () => onPick?.(r.id));
      el.routeCards.append(card);
    });
    el.route.hidden = false;
  },

  hideRoute() {
    el.route.hidden = true;
    routeOptions = [];
    routePick = null;
  },

  /** 章内异象面板：二选一（外加"转身离开"） */
  showOmen({ kicker = '', desc = '', options = [], onPick = null, threats = [] }) {
    omenOptions = options;
    omenPick = onPick;
    el.omenKicker.textContent = kicker;
    el.omenDesc.textContent = desc;
    // 本章威胁：异象是"这一章要面对什么"的另一个决策点，
    // 所以这里也要看得见怪（第五轮）
    renderThreats(el.omenThreats, threats);
    el.omenCards.innerHTML = '';
    options.forEach((o, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card omen';
      card.innerHTML = `
        <span class="card-key">${i + 1}</span>
        <b class="card-name">${o.name}</b>
        <span class="card-desc">${o.desc}</span>`;
      card.addEventListener('click', () => onPick?.(o.id));
      el.omenCards.append(card);
    });
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.className = 'act leave';
    leave.innerHTML = '<b>转身离开</b><span>什么都不拿，也什么都不失去</span>';
    leave.addEventListener('click', () => onPick?.(null));
    el.omenCards.append(leave);
    el.omen.hidden = false;
  },

  hideOmen() {
    el.omen.hidden = true;
    omenOptions = [];
    omenPick = null;
  },

  /** 潮水计数（HUD 与抽卡面板共用一个数字） */
  setDew(n) {
    if (n === lastDew) return;
    lastDew = n;
    if (el.dew) el.dew.textContent = `潮水 ${n}`;
  },

  /** 深海藏品面板 */
  showMeta({ memory = 0, locked = [], onUnlock = null } = {}) {
    renderUnlocks(memory, locked, onUnlock);
  },

  /** 主菜单的「今日挑战」按钮文案 */
  setDaily(label) {
    if (el.btnDaily) el.btnDaily.textContent = label;
  },

  /** HUD 上的 DPS 读数 */
  setDps(dps) {
    if (!el.dps) return;
    const t = `DPS ${dps}`;
    if (el.dps.textContent !== t) el.dps.textContent = t;
  },

  /** 构筑一览（暂停面板里） */
  showBuild(info) {
    renderBuildStats(el.buildStats, info);
    renderArchetypes(el.buildArchetypes, info.archetypes || []);
    renderRelicChips(el.buildRelics, info.relics || [], info.deepened || {});
    renderThreats(el.buildThreats, info.threats || [], info.tags || []);
    // 这一章走的哪条路线（第六轮）—— 玩家要能回想起自己选过什么
    if (el.buildRoute) {
      const r = info.route;
      el.buildRoute.textContent = r
        ? `本章路线 · ${r.name}：${r.riskText}；${r.rewardText}`
        : '';
    }
  },

  showGameOver(result, handlers = {}) {
    const { score = 0, wave = 0, bestCombo = 0, kills = 0, survived = 0, relics = [], grade = 'C' } = result;
    el.finalScore.textContent = String(score);
    el.finalWave.textContent = String(wave);
    el.finalCombo.textContent = String(bestCombo);
    el.finalKills.textContent = String(kills);
    el.finalSurvived.textContent = String(survived);
    el.finalChapter.textContent = String(result.chapter || '—');
    el.finalGrade.textContent = grade || gradeOf(score);
    el.finalBest.textContent = String(result.best ?? score);
    if (el.overMemory) {
      el.overMemory.textContent = result.memoryGained ? `深海藏品 +${result.memoryGained}` : '';
    }
    if (el.overNext) el.overNext.textContent = result.nextUnlock || '';
    // 死于什么：这一轮的核心主张是"敌人会向构筑提问"，
    // 所以死因是最直接的证据 —— 玩家下一次就会想着躲它。
    if (el.overCause) {
      el.overCause.textContent = result.deathCause
        ? `死于 · ${result.deathCause}`
        : '';
    }
    // 种子：同一局可以被复现（?seed=123），是"分享一局"的最小单位
    renderPressure(el.overPressure, result.pressure || []);
    if (el.overSeed) {
      el.overSeed.textContent = result.daily
        ? `今日挑战 ${result.daily.key} · 种子 ${result.seed}`
        : `本局种子 ${result.seed ?? '—'}`;
    }
    renderRelicChips(el.overRelics, relics, result.deepened || {});
    renderArchetypes(el.overArchetypes, result.archetypes);
    el.over.hidden = false;
  },

  hideGameOver() { el.over.hidden = true; },

  showVictory(result, handlers = {}) {
    el.victoryScore.textContent = String(result.score ?? 0);
    el.victoryWave.textContent = String(result.wave ?? 0);
    el.victoryKills.textContent = String(result.kills ?? 0);
    el.victoryGrade.textContent = result.grade || 'C';
    if (el.victoryMemory) {
      el.victoryMemory.textContent = result.memoryGained ? `深海藏品 +${result.memoryGained}` : '';
    }
    if (el.victoryNext) el.victoryNext.textContent = result.nextUnlock || '';
    renderPressure(el.victoryPressure, result.pressure || []);
    if (el.victorySeed) {
      el.victorySeed.textContent = result.daily
        ? `今日挑战 ${result.daily.key} · 种子 ${result.seed}`
        : `本局种子 ${result.seed ?? '—'}`;
    }
    renderRelicChips(el.victoryRelics, result.relics || [], result.deepened || {});
    renderArchetypes(el.victoryArchetypes, result.archetypes);
    el.victory.hidden = false;
  },

  hideVictory() { el.victory.hidden = true; },
};
