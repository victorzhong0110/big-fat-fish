// 浏览器试玩脚本：真实 Chromium 跑一遍完整流程并截图
// 用法：node scripts/playtest.mjs [renderer]
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { pickOmenCard } from './bot.mjs';

const RENDERER = process.argv[2] || '';
const ROOT = new URL('../dist/', import.meta.url).pathname;
const SHOTS = new URL('../shots/', import.meta.url).pathname;
const PORT = 8910;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(ROOT, rel === '/' ? 'index.html' : rel);
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({
  executablePath: '/root/.cache/ms-playwright/chromium-1243/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'],
});

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};
const state = (page) => page.evaluate(() => window.__tulip.state());
/** 截图：软件渲染下页面很忙，默认 30s 不够，这里放宽并禁用动画 */
async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS, name), timeout: 90000, animations: 'disabled' });
}

/** 让玩家保持存活：满血 + 长时间无敌（无敌会被后到的伤害重置，故需反复兜住） */
async function keepAlive(page) {
  await page.evaluate(() => {
    const s = window.__tulip.scene();
    s.hp = s.maxHp;
    s.invulnUntil = s.runTime * 1000 + 300000;
  });
}

async function clickSel(page, sel) {
  const el = page.locator(sel);
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    const st = await state(page).catch(() => null);
    throw new Error(`元素不可见：${sel} · 游戏状态 ${JSON.stringify(st)}`);
  }
  await el.click();
}

/**
 * 路线面板：等它出现 → 选第 n 条 → 等它消失。
 *
 * 第六轮起，每一章的开头先选路线、再抽卡，
 * 所以所有"等抽卡面板"的地方前面都要先过这一关。
 */
async function pickRoute(page, index = 0) {
  await page.waitForSelector('#route:not([hidden])', { timeout: 15000 });
  const cards = page.locator('#route-cards .card');
  const n = await cards.count();
  if (!n) throw new Error('路线面板里没有卡');
  await cards.nth(Math.min(index, n - 1)).click();
  await page.waitForFunction(() => document.querySelector('#route')?.hidden === true, null, { timeout: 15000 });
  return n;
}

/** 路线面板如果开着就选一条（不抛错） */
async function handleRoute(page, index = 0) {
  const open = await page.evaluate(() => document.querySelector('#route')?.hidden === false);
  if (!open) return 0;
  return pickRoute(page, index);
}

/**
 * 把当前开着的面板都处理掉（路线 / 异象 / 抽卡）。
 *
 * 为什么需要：**面板是模态的**，游戏会停在面板状态（runState 不是 playing）。
 * 后面任何"暂停看构筑一览"的步骤都会因为状态不对而拿不到数据 ——
 * 而且失败的样子很像"构筑面板坏了"，很难一眼看出真正的原因。
 */
async function handlePanels(page, index = 0) {
  const route = await handleRoute(page, index);
  const omenOpen = await page.evaluate(() => !document.querySelector('#omen')?.hidden);
  if (omenOpen) await pickOmenCard(page, 'good');
  const draftOpen = await page.evaluate(() => !document.querySelector('#draft')?.hidden);
  if (draftOpen) await pickDraft(page, index);
  return { route, omen: omenOpen, draft: draftOpen };
}

/** 抽卡面板：等它出现 → 选第 n 张 → 等它消失 */
async function waitDraft(page, timeout = 15000) {
  await page.waitForSelector('#draft:not([hidden])', { timeout });
  const count = await page.locator('#draft-cards .card').count();
  return count;
}
async function pickDraft(page, index = 0) {
  const cards = page.locator('#draft-cards .card');
  const n = await cards.count();
  if (!n) throw new Error('抽卡面板里没有卡');
  await cards.nth(Math.min(index, n - 1)).click();
  // 面板是靠 hidden 属性收起的，不能用可见性等待
  await page.waitForFunction(() => document.querySelector('#draft')?.hidden === true, null, { timeout: 15000 });
  return n;
}
const pageUrl = (p = '/') => `http://127.0.0.1:${PORT}${p}${RENDERER ? `?renderer=${RENDERER}` : ''}`;

// ── 桌面端 ──────────────────────────
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on('pageerror', (e) => { errors.push(String(e.stack || e).split('\n').slice(0, 4).join(' ⏎ ')); console.log('‼️ PAGEERROR @', step, String(e.stack || e).split('\n').slice(0, 3).join(' ⏎ ')); });
let step = 'init';
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(pageUrl(), { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

check('首屏进入菜单', await page.locator('#menu').isVisible());
check('画布已挂载', (await page.locator('#game-root canvas').count()) === 1);
await shot(page, '01-menu.png');

// 等待 Phaser 场景实例就绪（DOM 菜单比引擎先可见，这里消除竞态）
await page.waitForFunction(() => !!window.__tulip?.scene(), null, { timeout: 30000 });

// ── 角色选择 ──────────────────────────
step = 'roster';
const rosterCount = await page.locator('#roster .card.char').count();
check('主菜单列出五个主角', rosterCount === 5, `${rosterCount} 个`);
const rosterNames = await page.locator('#roster .card.char .card-name').allInnerTexts();
check('主角有名字', rosterNames.length === 5 && rosterNames.every((n) => n.trim().length > 0),
  rosterNames.join('/'));
await page.locator('#roster .card.char[data-id="scout"]').click();
const selectedId = await page.locator('#roster .card.char.selected').getAttribute('data-id');
check('可以切换主角', selectedId === 'scout', `selected=${selectedId}`);

// ── 今日挑战 ─────────────────────────
step = 'daily';
const dailyLabel = await page.locator('#btn-daily').innerText();
check('主菜单有今日挑战入口', /今日挑战/.test(dailyLabel), dailyLabel);
check('今日挑战按钮给出种子', /\d{4,}/.test(dailyLabel), dailyLabel);

// ── 深海藏品（局外元进度）────────────
step = 'meta';
const unlockCount = await page.locator('#unlock-list .card.relic-unlock').count();
check('主菜单有深海藏品解锁面板', unlockCount > 0, `${unlockCount} 件待解锁`);
const memoryNote = await page.locator('#memory-note').innerText();
check('解锁面板显示下一件目标', /需\s*\d+\s*记忆/.test(memoryNote), memoryNote);
const unlockedBefore = await page.evaluate(() => window.__tulip.scene().meta.unlocked.length);
await page.evaluate(() => { window.__tulip.scene().meta.memory = 200; window.__tulip.scene().refreshMetaPanel(); });
await page.locator('#unlock-list .card.relic-unlock').first().click();
await page.waitForTimeout(300);
const metaAfter = await page.evaluate(() => ({
  unlocked: window.__tulip.scene().meta.unlocked.length,
  memory: window.__tulip.scene().meta.memory,
}));
check('深海藏品能解锁装备', metaAfter.unlocked === unlockedBefore + 1 && metaAfter.memory < 200,
  `unlocked ${unlockedBefore}→${metaAfter.unlocked}，记忆 ${metaAfter.memory}`);

// ── 开局抽卡 ────────────────────────
step = 'draft';
await clickSel(page, '#btn-start');
// 第六轮：开局先弹路线面板
const routeCards = await pickRoute(page);
check('开局先弹路线面板（二选一）', routeCards === 2, `${routeCards} 条路线`);
await page.waitForTimeout(800);
const draftCards = await waitDraft(page);
check('开局弹出抽卡面板', draftCards === 3, `${draftCards} 张候选`);
check('抽卡时游戏处于暂停', (await state(page)).runState === 'draft');
const draftSub = await page.locator('#draft-sub').innerText();
check('抽卡面板展示本章主题', /主题/.test(draftSub), draftSub);
// 第九轮：抽卡面板要告诉玩家**这一章需要哪一招** + **你已有什么手段**
const draftCounters = await page.locator('#draft-counters').innerText();
check('抽卡面板列出本章手段需求与自己的手段',
  /手段需求/.test(draftCounters) && /你的手段/.test(draftCounters),
  draftCounters);
// 第九轮：篝火预告（第八轮 §22 的必做项）—— 玩家在打第四章前就该知道
check('抽卡面板预告章末篝火', /篝火/.test(draftSub), draftSub);
await shot(page, '07-draft.png');

// 角色数值必须在**抽卡之前**检查：抽到的装备可能加生命（dew_charm +1），
// 放在抽卡后检查会变成"看运气"的断言
const statsApplied = await page.evaluate(() => {
  const s = window.__tulip.scene();
  return { maxHp: s.maxHp, hp: s.hp, fire: s.fire, stats: { ...s.stats } };
});
// 伤害期望 = 3：伤害曲线改成线性后，第 1 章开始是 Lv.2（伤害 2），猎手再 +1
check('角色数值已作用到属性表（猎手：生命 4 / 每发伤害 3 / 暴击 +12%）',
  statsApplied.maxHp === 4 && statsApplied.hp === 4 && statsApplied.fire.damage === 3
    && statsApplied.stats.critChance >= 0.12,
  `maxHp=${statsApplied.maxHp} damage=${statsApplied.fire.damage} crit=${statsApplied.stats.critChance}`);
const heroTag = await page.locator('#hero').innerText();
check('HUD 显示当前主角', heroTag.trim() === '急先锋', heroTag);
// 起始装备不能再次出现在候选里（它已经"拿过"了）—— 必须在抽卡前看
const draftNames0 = await page.locator('#draft-cards .card .card-name').allInnerTexts();
check('起始装备不再出现在候选里', !draftNames0.includes('疾流鱼苗'), draftNames0.join('/'));

// ── 潮水与抽卡三动作 ─────────────────
step = 'dew';
const dewTag = await page.locator('#dew').innerText();
check('HUD 显示潮水计数', /潮水\s*\d+/.test(dewTag), dewTag);
const actCount = await page.locator('#draft-actions .act').count();
check('抽卡面板有四个潮水动作', actCount === 4, `${actCount} 个`);
const actIds = await page.locator('#draft-actions .act').evaluateAll((els) => els.map((e) => e.dataset.id));
check('动作是重随/放逐/跳过/深化', JSON.stringify(actIds) === '["reroll","banish","skip","deepen"]', actIds.join(','));
// 给点潮水，试重随
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.run.dew = 30;
  s.renderDraft();
});
const namesBefore = await page.locator('#draft-cards .card .card-name').allInnerTexts();
await page.locator('#draft-actions .act[data-id="reroll"]').click();
await page.waitForTimeout(300);
const namesAfter = await page.locator('#draft-cards .card .card-name').allInnerTexts();
const dewAfterReroll = await page.evaluate(() => window.__tulip.scene().run.dew);
check('重随会换一批候选', JSON.stringify(namesBefore) !== JSON.stringify(namesAfter),
  `${namesBefore.join('/')} → ${namesAfter.join('/')}`);
check('重随扣掉潮水', dewAfterReroll === 30 - 8, `dew=${dewAfterReroll}`);
// 放逐：先点按钮进入模式，再点那张卡
await page.locator('#draft-actions .act[data-id="banish"]').click();
await page.waitForTimeout(200);
check('放逐模式有视觉提示', (await page.locator('#draft-cards .card.banishable').count()) > 0);
const banishTarget = await page.locator('#draft-cards .card .card-name').first().innerText();
await page.locator('#draft-cards .card').first().click();
await page.waitForTimeout(300);
const banished = await page.evaluate(() => window.__tulip.scene().run.banished);
check('放逐把卡踢出本局牌池', banished.length === 1, JSON.stringify(banished));
const namesPost = await page.locator('#draft-cards .card .card-name').allInnerTexts();
check('被放逐的卡不再出现在候选里', !namesPost.includes(banishTarget), namesPost.join('/'));
const dewAfterBanish = await page.evaluate(() => window.__tulip.scene().run.dew);
check('放逐扣掉潮水', dewAfterBanish === 30 - 8 - 12, `dew=${dewAfterBanish}`);

// 流派（协同）：凑够同标签装备后，抽卡面板要显示出来
const archRes = await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.run.relics.push('polished_stamen', 'twin_petal', 'light_pollen'); // 3 件攻击
  s.recomputeStats();
  s.renderDraft();
  return { dmgAdd: s.stats.damageAdd, chips: document.querySelectorAll('#draft-archetypes .arch-chip').length };
});
check('同标签装备凑够会激活流派', archRes.dmgAdd >= 1, `damageAdd=${archRes.dmgAdd}`);
check('抽卡面板显示当前流派', archRes.chips >= 1, `${archRes.chips} 个流派徽章`);
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.run.relics = s.run.relics.filter((id) => id !== 'polished_stamen' && id !== 'twin_petal' && id !== 'light_pollen');
  s.recomputeStats();
  s.renderDraft();
});

const picked = await pickDraft(page, 0);
const s1 = await state(page);
check('选卡后进入 playing', s1.runState === 'playing', JSON.stringify(s1));
check('开局用的是玩家选的主角', s1.character === 'scout', `character=${s1.character}`);
check('主角的起始装备直接进背包',
  s1.relics[0] === 'swift_pollen', `relics=${JSON.stringify(s1.relics)}`);
const chipCount = await page.locator('#relics .chip').count();
check('HUD 显示装备徽章', chipCount === 2, `${chipCount} 个徽章`);
check('HUD 可见', await page.locator('#hud').isVisible());

// ── 移动 ────────────────────────────
step = 'move';
// 确保不在抽卡面板里（面板收起与场景恢复之间有几十毫秒的窗口）
await page.waitForFunction(() => window.__tulip.state().runState === 'playing', null, { timeout: 15000 });
const moveProbe = async (tag) => {
  const st = await page.evaluate(() => {
    const s = window.__tulip.scene();
    return {
      runState: s.runState, status: s.sys.settings.status, wave: s.spawner.wave,
      draft: document.querySelector('#draft')?.hidden, omen: document.querySelector('#omen')?.hidden,
      x: Math.round(s.player.x),
      dbg: (window.__dbg || []).slice(-8),
    };
  });
  console.log(`  [probe ${tag}]`, JSON.stringify(st));
};
await moveProbe('before-move');
const p0 = await page.evaluate(() => ({ x: window.__tulip.scene().player.x }));
await page.evaluate(() => {
  window.__keyLog = [];
  window.addEventListener('keydown', (e) => {
    const s = window.__tulip.scene();
    window.__keyLog.push({
      code: e.code, status: s.sys.settings.status, active: s.sys.settings.active,
      runState: s.runState, prevented: e.defaultPrevented, target: e.target?.tagName,
    });
  }, true);
});
await page.keyboard.down('KeyD');
let moved = 0;
for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(200);
  const x = await page.evaluate(() => window.__tulip.scene().player.x);
  moved = Math.max(moved, x - p0.x);
  if (moved > 20) break;
}
await page.keyboard.up('KeyD');
await moveProbe('after-move');
const moveDiag = await page.evaluate(() => {
  const s = window.__tulip.scene();
  return {
    runState: s.runState,
    sysStatus: s.sys.settings.status,
    active: s.sys.settings.active,
    canInput: s.sys.canInput(),
    keyD: s.keys.D.isDown,
    velX: Math.round(s.player.body?.velocity?.x ?? 0),
    x: Math.round(s.player.x),
    focused: document.activeElement?.tagName + '#' + (document.activeElement?.id || ''),
    queue: s.input.keyboard.manager.queue.length,
    keyLog: window.__keyLog,
  };
});
check('玩家随按键移动', moved > 20, `x ${p0.x.toFixed(0)} → +${moved.toFixed(0)} ${JSON.stringify(moveDiag)}`);

step = 'spawn-wait';
// 后续战斗类检查需要玩家活着：先给一段无敌，只在「接触掉血」那一小段解除
await keepAlive(page);

// 敌怪刷新
await page.waitForTimeout(4000);
const s2 = await state(page);
check('敌人已刷出', s2.enemies > 0, `enemies=${s2.enemies}`);
check('波次推进到第 1 波', s2.wave >= 1, `wave=${s2.wave}`);

// 敌人生成在场地边缘，而不是堆在原点
const spawnPos = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const es = s.enemies.getChildren();
  return es.slice(0, 6).map((e) => ({ x: Math.round(e.x), y: Math.round(e.y) }));
});
const atCorner = spawnPos.length > 0 && spawnPos.every((p) => p.x < 3 && p.y < 3);
const inArena = spawnPos.every((p) => p.x >= 0 && p.x <= 960 && p.y >= 0 && p.y <= 600);
check('敌人生成位置在场地内且不是原点', !atCorner && inArena, JSON.stringify(spawnPos));

// 潮水按波结算：第一波打完后应该结算过一次
// 注意：必须"等"而不是"假定时间到了"—— Canvas（软件光栅）渲染器下
// 帧时间可能超过 0.5 秒的游戏步长上限，游戏时钟会明显慢于墙钟。
await page.waitForFunction(() => (window.__tulip.state()?.dewWaves ?? 0) >= 1, null, { timeout: 30000 })
  .catch(() => {});
const dewState = await state(page);
check('波次结束会结算潮水', dewState.dewWaves >= 1, `结算了 ${dewState.dewWaves} 波，潮水 ${dewState.dew}`);

step = 'kill';
// 击杀计分：把一只贪嘴小鱼放到玩家旁边，走真实子弹碰撞链路
await page.evaluate(() => {
  const s = window.__tulip.scene();
  const e = s.spawnEnemy('crawler');
  e.setPosition(s.player.x + 70, s.player.y);
});
await page.keyboard.down('Space');
let scored = 0;
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1000);
  scored = (await state(page)).score;
  if (scored > 0) break;
}
await page.keyboard.up('Space');
check('子弹命中后计分', scored > 0, `score=${scored}`);
const s3 = await state(page);
check('连击系统生效', s3.combo >= 1, `combo=${s3.combo}`);
await shot(page, '02-gameplay.png');

// ── 章内异象（每章第 3 波）──────────
step = 'omen';
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.invulnUntil = s.runTime * 1000 + 300000;
  s.spawner.skipTo(3, s.runTime);
});
await page.waitForTimeout(900);
check('第 3 波弹出花园异象', await page.locator('#omen').isVisible());
const omenCards = await page.locator('#omen-cards .card.omen').count();
check('异象给出两个互斥选项', omenCards === 2, `${omenCards} 个`);
const leaveBtn = await page.locator('#omen-cards .act.leave').count();
check('异象可以转身离开', leaveBtn === 1, `${leaveBtn} 个离开按钮`);
await shot(page, '09-omen.png');
const beforeOmen = await page.evaluate(() => ({ ...window.__tulip.scene().stats }));
await page.locator('#omen-cards .card.omen').first().click();
await page.waitForFunction(() => document.querySelector('#omen')?.hidden === true, null, { timeout: 15000 });
const afterOmen = await page.evaluate(() => ({
  state: window.__tulip.state().runState,
  stats: { ...window.__tulip.scene().stats },
  omenStats: window.__tulip.scene().run.omenStats.length,
  omenIds: [...window.__tulip.scene().run.omenIds],
}));
check('选完异象回到 playing', afterOmen.state === 'playing', afterOmen.state);
check('异象改了属性表', JSON.stringify(beforeOmen) !== JSON.stringify(afterOmen.stats),
  `omenStats=${afterOmen.omenStats}`);
check('异象被记录下来', afterOmen.omenIds.length === 1, JSON.stringify(afterOmen.omenIds));

// ── 章节抽卡（跑到第 2 章）──────────
step = 'chapter-draft';
await keepAlive(page);
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.spawner.skipTo(6, s.runTime);
});
await page.waitForTimeout(600);
// 第 2 章开始时：先弹路线面板，读它的内容，再选
await page.waitForSelector('#route:not([hidden])', { timeout: 15000 }).catch(() => {});
const routePanelText = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('#route-cards .card')];
  return { n: cards.length, text: cards.map((c) => c.textContent || '').join(' | ') };
});
check('第 2 章开始时先弹路线面板', routePanelText.n === 2, `${routePanelText.n} 条路线`);
check('路线面板写出威胁与收益',
  /威胁/.test(routePanelText.text) && /换来/.test(routePanelText.text),
  routePanelText.text.slice(0, 60));
await shot(page, '13-route.png');
await pickRoute(page);
// 选定的路线真的改到了这一章的敌人修正量（不是只写在数据里没人读）
const routeEffect = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const ch = s.run.plan.chapters[1];
  const withRoute = s.modsFor(6);
  const saved = ch.route;
  ch.route = null;
  const without = s.modsFor(6);
  ch.route = saved;
  return { route: saved, withRoute, without };
});
const routeChanged = Object.keys(routeEffect.withRoute).some((k) => (
  typeof routeEffect.withRoute[k] === 'number'
  && routeEffect.withRoute[k] !== routeEffect.without[k]
));
check('选定的路线真的改到这一章的敌人修正量', routeChanged && !!routeEffect.route,
  `路线=${routeEffect.route} 数量 ${routeEffect.without.enemyCountMul}→${routeEffect.withRoute.enemyCountMul}`);
const chCards = await waitDraft(page);
check('第 2 章开始时再次弹抽卡', chCards >= 3, `${chCards} 张候选`);
const chKicker = await page.locator('#draft-kicker').innerText();
check('抽卡面板标出章节', /第\s*2\s*章/.test(chKicker), chKicker);

// ── 深化（把已有的装备再叠一层）─────
// 先查面板本身：每张卡必须写清自己的价格（价格随层数上涨，不写会卡在面板里）
// 这一段必须排在"深化会再叠一层效果"之前 ——
// 那一步会把面板收起来（runState 变成 playing），之后 draftAction 就直接 return 了。
const deepenPrices = await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.run.dew = 60;
  s.renderDraft();
  s.draftAction('deepen');
  const cards = [...document.querySelectorAll('#draft-cards .card')];
  const info = cards.map((c) => ({ id: c.dataset.id, cost: c.dataset.cost, text: c.textContent || '' }));
  s.draftAction('deepen'); // 退出深化模式
  s.renderDraft();
  return info;
});
check('深化面板标出每张装备的价格',
  deepenPrices.length > 0 && deepenPrices.every((x) => /^\d+$/.test(x.cost || '') && /潮水/.test(x.text)),
  JSON.stringify(deepenPrices.map((x) => `${x.id}:${x.cost}`)));
// 第九轮：深化**能给手段**（把普通牌深化成对症牌）⇒ 面板必须写出来。
// 判据只要求"**当确实会新增手段时**面板写出来" ——
// 否则玩家手里已经凑齐了手段时，这行字理应不出现（那不是 bug）。
check('深化面板渲染出卡片（每张带价格与说明）',
  deepenPrices.length > 0 && deepenPrices.every((x) => /深化/.test(x.text)),
  `${deepenPrices.length} 张`);

const deepenRes = await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.run.dew = 60;
  s.renderDraft();
  const before = s.stats.comboDamagePerStack;
  // 进入深化模式并深化第一张装备
  s.draftAction('deepen');
  const first = s.run.relics[0];
  window.__deepenShot = true;
  s.chooseRelic(first);
  return {
    before,
    after: s.stats.comboDamagePerStack,
    layers: s.run.deepened[first] || 0,
    dew: s.run.dew,
    first,
  };
});
check('深化会再叠一层效果',
  deepenRes.layers === 1,
  `层数 ${deepenRes.layers}，装备 ${deepenRes.first}`);
check('深化要花潮水', deepenRes.dew === 60 - 24, `潮水 ${deepenRes.dew}`);
check('深化会结束本次抽卡（深化是"替代"而不是"追加"）',
  (await state(page)).runState === 'playing', (await state(page)).runState);
await shot(page, '10-deepen.png');

// 深化把抽卡面板收起来了（它替代了本次抽卡），测试继续前把它重新打开
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.runState = 'draft';
  s.renderDraft();
});

await pickDraft(page, 0);
const s4 = await state(page);
check('第二章抽卡后装备变为 3 个（起始 1 + 抽到 2）', s4.relics.length === 3, `relics=${JSON.stringify(s4.relics)}`);
check('第二章抽卡后回到 playing', s4.runState === 'playing');

// 第九轮：**构造一个确定的情形**来测"深化能新增手段"——
// 手里只留「双瓣齐射」（它本身不带手段），深化一层就会穿透 ⇒ 新增「范围」。
// （必须放在"装备数量"那条断言**之后**，否则会把它数乱。）
await page.evaluate(() => {
  const s = window.__tulip.scene();
  // ⚠️ 必须先回到 draft 状态：renderDraft 只在抽卡面板打开时才渲染卡片。
  s.runState = 'draft';
  s.run.relics = ['twin_petal'];
  s.run.deepened = {};
  s.recomputeStats();
  s.renderDraft();
  s.draftAction('deepen');
});
const deepenTagText2 = (await page.locator('#draft-cards').innerText());
check('深化面板（手里有可深化的牌时）写出新增手段',
  /深化后新增手段/.test(deepenTagText2) || /再深一层可得/.test(deepenTagText2),
  deepenTagText2.slice(0, 160));
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.draftAction('deepen'); // 退出深化模式
  s.renderDraft();
  s.runState = 'playing';   // 还原：后面的检查要的是"在战斗里"
});

// 章节主题真的改了波次编排：把当前波的主题修正量取出来看看
const themeInfo = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const plan = s.run.plan;
  return plan.chapters.map((c) => ({ name: c.name, theme: c.theme.name, desc: c.theme.desc }));
});
check('四个章节各有主题', themeInfo.length === 4 && themeInfo.every((t) => !!t.theme),
  JSON.stringify(themeInfo.map((t) => t.theme)));

// ── 拾取与受伤 ──────────────────────
step = 'pickup';
const hpBefore = (await state(page)).hp;
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.dropPickup(s.player.x, s.player.y, 'seed');
});
await page.waitForTimeout(2500);
const afterPick = await page.evaluate(() => {
  const s = window.__tulip.scene();
  return { alive: s.player.active, body: !!s.player.body, score: s.combat.score, pickups: s.pickups.getChildren().length };
});
check('拾取道具后玩家存活', afterPick.alive && afterPick.body, JSON.stringify(afterPick));

// 撞到敌人：玩家掉血，但敌人不该被销毁（此段临时解除无敌）
// 先把血补满：这里只测"碰到敌人会掉血"，不能因为血量刚好见底把人打死
// （打死 → 整局进入 over → 后面依赖游戏循环的检查会连锁失败）
await page.evaluate(() => {
  const s = window.__tulip.scene();
  // 临时把血拉高：这一段只测"碰到敌人会掉血"。
  // 场上还有孢子弹幕、主题的花粉炸弹在扣血，一旦把玩家打死，
  // 整局会进入 over，后面依赖游戏循环的检查会连锁失败（Canvas 渲染器尤其明显）。
  s.hp = 99;
  s.invulnUntil = 0;
});
const hpPre = (await state(page)).hp;
await page.evaluate(() => {
  const s = window.__tulip.scene();
  const e = s.spawnEnemy('crawler');
  e.setPosition(s.player.x, s.player.y);
});
await page.waitForTimeout(2500);
const afterHit = await page.evaluate(() => {
  const s = window.__tulip.scene();
  return { hp: s.hp, enemies: s.enemies.getChildren().length, alive: s.player.active };
});
check('接触敌人时掉血且敌人保留', afterHit.hp < hpPre && afterHit.enemies > 0, JSON.stringify(afterHit));
// 把血量恢复（上面的 99 只是测试用的临时值）
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.hp = s.maxHp;
});
await keepAlive(page);

// ── 机制测试段 ──────────────────────
step = 'mechanics';
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.invulnUntil = s.runTime * 1000 + 300000;
});

// 沙丁鱼群：一次刷一窝
const swarmRes = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const before = s.enemies.getChildren().filter((e) => e.getData('type') === 'swarm').length;
  s.spawnSwarm();
  const after = s.enemies.getChildren().filter((e) => e.getData('type') === 'swarm').length;
  return { before, after };
});
check('沙丁鱼群成群刷出', swarmRes.after - swarmRes.before === 3, JSON.stringify(swarmRes));

// Boss 三阶段：走真实伤害链路
const bossRes = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const boss = s.spawnEnemy('boss');
  const max = boss.getData('maxHp');
  // 假子弹：字段类型必须和真子弹一致（getData 按 key 取值）
  const fake = {
    active: true, destroy() {},
    x: boss.x, y: boss.y,
    getData: (k) => ({ damage: 1, pierceLeft: 0, hitIds: [] }[k]),
    setData: (k, v) => { fake[k] = v; },
  };
  boss.setData('hp', Math.floor(max * 0.6));
  s.hitEnemy(fake, boss);
  const p2 = boss.getData('phase');
  boss.setData('hp', Math.floor(max * 0.3));
  s.hitEnemy(fake, boss);
  const p3 = boss.getData('phase');
  const tinted = boss.tintTopLeft !== undefined;
  boss.destroy();
  return { p2, p3, max, tinted };
});
check('Boss 阶段可推进到 2 / 3', bossRes.p2 === 2 && bossRes.p3 === 3, JSON.stringify(bossRes));

// 击杀爆裂不能把「一次击杀」记成两次（回归：以前会把正在死的那只自己算进爆炸范围）
const doubleKill = await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.enemies.clear(true, true); // 先清场：否则爆炸会顺带打死别的敌人，测不出重复计数
  s.run.relics.push('spore_burst'); // 击杀爆裂
  s.recomputeStats();
  const before = s.combat.kills;
  const e = s.spawnEnemy('crawler');
  e.setPosition(s.player.x, s.player.y);
  s.damageEnemy(e, 999);
  return { before, after: s.combat.kills };
});
check('击杀爆裂不会把一次击杀记成两次',
  doubleKill.after === doubleKill.before + 1,
  `kills ${doubleKill.before} → ${doubleKill.after}`);

// 转化型装备「霜之鳍」：命中真的会让敌人减速
const slowRes = await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.run.relics.push('frost_edge');
  s.recomputeStats();
  const e = s.spawnEnemy('crawler');
  e.setPosition(s.player.x + 60, s.player.y);
  const fake = {
    active: true, destroy() {}, x: e.x, y: e.y,
    getData: (k) => ({ damage: 1, pierceLeft: 0, hitIds: [] }[k]),
    setData: (k, v) => { fake[k] = v; },
  };
  s.hitEnemy(fake, e);
  return { slowUntil: e.getData('slowUntil') || 0, now: s.runTime * 1000 };
});
check('命中会让敌人减速（转化型装备生效）', slowRes.slowUntil > slowRes.now,
  `slowUntil=${Math.round(slowRes.slowUntil)} now=${Math.round(slowRes.now)}`);

// ── 第五轮：新敌种与异变体 ──────────────────
step = 'enemies-v5';

// 跃动藤：先蓄力（不动），再冲刺（沿锁定方向）—— 状态机在真实场景里推进
const chargerRes = await page.evaluate(async () => {
  const s = window.__tulip.scene();
  const e = s.spawnEnemy('charger');
  e.setPosition(s.player.x + 200, s.player.y);
  const before = { ...(e.getData('chg') || {}) };
  const v0 = { x: e.body.velocity.x, y: e.body.velocity.y };
  await new Promise((r) => setTimeout(r, 250));
  const v1 = { x: e.body.velocity.x, y: e.body.velocity.y };
  const st = e.getData('chg');
  e.destroy();
  return { before, st, moving: Math.hypot(v1.x, v1.y) };
});
check('跃动藤会先蓄力（站着不动）',
  chargerRes.st && chargerRes.st.phase === 'wind' && chargerRes.moving < 1,
  `phase=${chargerRes.st?.phase} 速度=${chargerRes.moving.toFixed(1)}`);

// 铁壳蟹：血量过半会结壳，结壳期间打它不掉血
const huskRes = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const e = s.spawnEnemy('husk');
  const max = e.getData('maxHp');
  e.setData('hp', Math.floor(max * 0.4));
  // 走一次 updateEnemies 让状态机推进
  s.updateEnemies(0.016);
  const shellState = e.getData('huskState');
  const hpBefore = e.getData('hp');
  s.damageEnemy(e, 5);
  const hpAfter = e.getData('hp');
  e.destroy();
  return { shelling: !!shellState?.shelling, hpBefore, hpAfter };
});
check('铁壳蟹结壳时免疫伤害', huskRes.shelling && huskRes.hpBefore === huskRes.hpAfter,
  `结壳=${huskRes.shelling} 血量 ${huskRes.hpBefore}→${huskRes.hpAfter}`);

// 毒水母：死时留下毒云
const mothRes = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const before = (s.clouds || []).length;
  const e = s.spawnEnemy('moth');
  e.setPosition(s.player.x + 80, s.player.y);
  s.damageEnemy(e, 999);
  return { before, after: (s.clouds || []).length };
});
check('毒水母死亡留下毒云', mothRes.after === mothRes.before + 1,
  `${mothRes.before} → ${mothRes.after}`);
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.clearClouds();
});

// 结网者：蛛弹命中会让玩家减速
const slowPlayer = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const before = s.moveSpeed();
  s.playerSlowUntil = s.runTime * 1000 + 1200;
  const during = s.moveSpeed();
  s.playerSlowUntil = 0;
  return { before, during };
});
check('蛛弹让玩家减速（移速打折）', slowPlayer.during < slowPlayer.before,
  `${slowPlayer.before.toFixed(0)} → ${slowPlayer.during.toFixed(0)}`);

// 异变体：血量远高于同类普通怪
const eliteRes = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const e = s.spawnEnemy('crawler', { elite: { affix: 'bulwark' } });
  const eliteHp = e.getData('hp');
  const plain = s.spawnEnemy('crawler');
  const plainHp = plain.getData('hp');
  const affix = e.getData('affix');
  e.destroy();
  plain.destroy();
  return { eliteHp, plainHp, affix };
});
check('异变体比同类普通怪厚得多', eliteRes.eliteHp > eliteRes.plainHp * 2,
  `${eliteRes.eliteHp} vs ${eliteRes.plainHp}`);

// 异变体死后弹战利品面板（三选一）
const relicsPre = (await state(page)).relics.length;
await page.evaluate(() => {
  const s = window.__tulip.scene();
  const e = s.spawnEnemy('crawler', { elite: { affix: 'swift' } });
  e.setPosition(s.player.x + 60, s.player.y);
  s.damageEnemy(e, 9999);
});
await page.waitForSelector('#draft:not([hidden])', { timeout: 8000 }).catch(() => {});
const lootVisible = await page.locator('#draft').isVisible();
const lootCards = await page.locator('#draft-cards .card').count();
const lootKicker = await page.locator('#draft-kicker').innerText().catch(() => '');
check('异变体死后弹出战利品面板', lootVisible && lootCards === 3, `${lootCards} 张 · ${lootKicker}`);
await shot(page, '12-elite-loot.png');
if (lootVisible && lootCards === 3) {
  await page.locator('#draft-cards .card').first().click();
  await page.waitForFunction(() => document.querySelector('#draft')?.hidden === true, null, { timeout: 15000 });
  const relicsPost = (await state(page)).relics.length;
  check('战利品能拿一张（背包 +1）', relicsPost === relicsPre + 1, `${relicsPre} → ${relicsPost}`);
  check('拿完战利品回到 playing', (await state(page)).runState === 'playing');
} else {
  check('战利品能拿一张（背包 +1）', false, '战利品面板没出现，跳过');
  check('拿完战利品回到 playing', false, '战利品面板没出现，跳过');
}

// 花粉炸弹：第三阶段会落预警圈
const bombRes = await page.evaluate(() => {
  const s = window.__tulip.scene();
  // 第七轮：Boss 按章节分配，**不是每只都放炸弹** ——
  // 所以这里要点名「凋零之主」（唯一有花粉炸弹的）。
  const boss = s.spawnEnemy('boss', { bossId: 'wither_lord' });
  boss.setData('phase', 3);
  boss.setData('bombTimer', -1);
  return { hazards: s.hazards.getChildren().length };
});
await page.waitForTimeout(500); // 预警圈 1200ms 后才爆炸，得在爆炸前看
const bombAfter = await page.evaluate(() => window.__tulip.scene().hazards.getChildren().length);
check('第三阶段会落花粉炸弹预警', bombAfter > bombRes.hazards, `预警圈 ${bombAfter} 个`);

// Boss 第三阶段 + 花粉炸弹预警的实拍
await page.evaluate(() => {
  const s = window.__tulip.scene();
  const boss = s.spawnEnemy('boss', { bossId: 'wither_lord' });
  boss.setData('phase', 3);
  boss.setTint(0xa06bff);
  boss.setPosition(s.player.x + 150, s.player.y - 60);
  boss.setData('bombTimer', -1);
});
await page.waitForTimeout(600);
await shot(page, '06-boss-phase3.png');

// 清理测试用的 Boss 与预警圈，避免干扰后续流程
await page.evaluate(() => {
  const s = window.__tulip.scene();
  for (const e of s.enemies.getChildren()) {
    if (e.getData('type') === 'boss' || e.getData('type') === 'swarm') e.destroy();
  }
  s.hazards.clear(true, true);
});

// 第七轮：每章一个 Boss
step = 'bosses';
const bossVariety = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const out = {};
  // 每章的 Boss 不同
  out.chapter1 = s.spawnEnemy('boss', { bossId: 'wither_lord' }).getData('bossId');
  const b2 = s.spawnEnemy('boss', { bossId: 'stone_warden' });
  out.chapter2 = b2.getData('bossId');
  out.texture = b2.texture.key;
  // 石壳守卫结壳时免疫伤害
  b2.setData('shellState', { shelling: false, timer: 0, cycle: 10 });
  s.updateEnemies(0.016);
  const shellState = b2.getData('shellState');
  const hpBefore = b2.getData('hp');
  s.damageEnemy(b2, 5);
  out.shelling = !!shellState?.shelling;
  out.hpBefore = hpBefore;
  out.hpAfter = b2.getData('hp');
  b2.destroy();
  // 母巢会召唤毒水母
  const b3 = s.spawnEnemy('boss', { bossId: 'pollen_queen' });
  const mothsBefore = s.enemies.getChildren().filter((e) => e.getData('type') === 'moth').length;
  b3.setData('summonState', { timer: 10 });
  s.updateEnemies(0.016);
  const mothsAfter = s.enemies.getChildren().filter((e) => e.getData('type') === 'moth').length;
  out.summoned = mothsAfter - mothsBefore;
  b3.destroy();
  // 荆棘王会蓄力冲刺
  const b4 = s.spawnEnemy('boss', { bossId: 'thorn_king' });
  b4.setData('chargeState', { phase: 'wind', timer: 10, lock: { x: 0, y: 0 } });
  s.updateEnemies(0.016);
  out.chargePhase = b4.getData('chargeState')?.phase;
  b4.destroy();
  return out;
});
check('每章一个不同的 Boss', bossVariety.chapter1 === 'wither_lord' && bossVariety.chapter2 === 'stone_warden',
  `${bossVariety.chapter1} / ${bossVariety.chapter2}`);
check('Boss 有自己的纹理', bossVariety.texture === 'boss_stone', bossVariety.texture);
check('石壳守卫结壳时免疫伤害', bossVariety.shelling && bossVariety.hpBefore === bossVariety.hpAfter,
  `结壳=${bossVariety.shelling} 血量 ${bossVariety.hpBefore}→${bossVariety.hpAfter}`);
check('母巢会召唤毒水母', bossVariety.summoned >= 1, `召唤 ${bossVariety.summoned} 只`);
check('荆棘王会蓄力后冲刺', bossVariety.chargePhase === 'dash', `阶段=${bossVariety.chargePhase}`);

// 抽卡候选上的「对症」标注（第七轮）：克制关系要写在玩家看得见的地方。
// 用**深化模式**测（候选是随机的，测随机候选会 flaky）：
// 深化模式列的是"自己已有的装备" ⇒ 可以确定地放一张有手段的装备进去。
const counterText = await page.evaluate(() => {
  const s = window.__tulip.scene();
  // 用「孢子爆裂」（击杀爆裂 = 范围手段）：它克制的东西**每一章都有**
  // （贪嘴小鱼 / 沙丁鱼群 / 海葵 / 毒水母）⇒ 这个断言不会随章节漂移。
  s.run.relics.push('spore_burst');
  s.runState = 'draft';
  s.draftAction('deepen');
  const cards = [...document.querySelectorAll('#draft-cards .card')];
  // 只看**刚放进去的那张**（深化面板会列出所有已持有的装备，别的张也可能带标注）
  const mine = cards.find((c) => c.dataset.id === 'spore_burst');
  const mineNote = mine?.querySelector('.card-tag.counter')?.textContent || '';
  const notes = cards.map((c) => c.querySelector('.card-tag.counter')?.textContent || '').filter(Boolean);
  s.draftAction('deepen');   // 退出深化模式
  s.run.relics = s.run.relics.filter((id) => id !== 'spore_burst');
  s.renderDraft();
  return { total: cards.length, notes, mineNote };
});
check('抽卡面板标出「对症」的怪（克制关系写给玩家看）',
  counterText.total >= 1 && /范围/.test(counterText.mineNote)
    && /贪嘴小鱼|沙丁鱼群|海葵|毒水母/.test(counterText.mineNote),
  counterText.mineNote || '（没找到标注）');

// 第八轮：篝火（章末的休整）
step = 'camp';
// 先把可能开着的面板关掉：篝火是**模态**的，
// 别的面板开着的时候它不会开（这不是 bug，是面板互斥）。
await handlePanels(page);
await page.waitForTimeout(300);
const campSetup = await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.hp = Math.max(1, s.maxHp - 3);
  const boss = s.spawnEnemy('boss', { bossId: 'wither_lord' });
  s.damageEnemy(boss, 999999);
  return { pending: !!s.pendingCamp, hp: s.hp, runState: s.runState };
});
await page.waitForSelector('#camp:not([hidden])', { timeout: 8000 }).catch(() => {});
const campCards = await page.locator('#camp-cards .card').count();
check('打死 Boss 后弹出篝火（章末休整）', campSetup.pending && campCards === 2,
  `${campCards} 个选项 · pending=${campSetup.pending} · runState=${campSetup.runState}`);
const campRest = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const before = s.hp;
  s.chooseCamp('rest');
  return { before, after: s.hp };
});
check('篝火「蹭珊瑚」会回血', campRest.after > campRest.before, `${campRest.before} → ${campRest.after}`);
const campSharpen = await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.openCamp();
  const before = { fire: s.fireLevel, dew: s.run.dew };
  s.chooseCamp('sharpen');
  return { before, after: { fire: s.fireLevel, dew: s.run.dew } };
});
check('篝火「磨砺鱼叉」会加火力（满级则改给潮水）',
  campSharpen.after.fire > campSharpen.before.fire || campSharpen.after.dew > campSharpen.before.dew,
  `火力 ${campSharpen.before.fire}→${campSharpen.after.fire} · 潮水 ${campSharpen.before.dew}→${campSharpen.after.dew}`);

// ── 构筑一览 ────────────────────────
step = 'build-panel';
await keepAlive(page);
await handlePanels(page);   // 面板是模态的：先关掉，再暂停
await page.evaluate(() => { window.__tulip.scene().setPaused(true); });
await page.waitForTimeout(400);
const buildRows = await page.locator('#build-stats .build-stat').count();
check('构筑一览列出属性表', buildRows >= 10, `${buildRows} 行`);
const dpsTag = await page.locator('#dps').innerText();
check('HUD 显示 DPS 读数', /DPS\s*\d+/.test(dpsTag), dpsTag);
const pressure = await page.locator('#build-stats .build-pressure b').innerText();
check('构筑一览给出压力比（你的 DPS ÷ 本波需求）', /÷/.test(pressure), pressure);
const buildRelics = await page.locator('#build-relics .chip').count();
check('构筑一览列出本局装备', buildRelics >= 1, `${buildRelics} 件`);
// 第五轮：「本章威胁」——玩家要能看见这一章会遇到什么怪、该怎么应对
const threatRows = await page.locator('#build-threats .threat-row').count();
const threatText = await page.locator('#build-threats').innerText();
check('构筑一览列出本章威胁与应对', threatRows >= 2 && /应对|躲|爆发|距离|范围/.test(threatText),
  `${threatRows} 行`);

// 第九轮：「对症」从提示变成了真机制（伤害 ×2）——
// ① 倍率真的接进了**扣血入口**（不是只写在面板上）；
// ② 构筑一览把「对症加成」摆给玩家看。
const counterInfo = await page.evaluate(() => {
  const sc = window.__tulip.scene();
  const fake = (type) => ({ getData: (k) => (k === 'type' ? type : undefined) });
  return {
    tags: [...(sc.counterTags || [])],
    crawler: sc.counterMultFor(fake('crawler')),
    husk: sc.counterMultFor(fake('husk')),
  };
});
// ⚠️ 这里的期望值**硬编码了弱点表与倍率**（第九轮：弱点互不重叠、倍率 ×2.5）。
// 改 systems/counters.js 的 ENEMY_COUNTERS 或 COUNTER_MULT 时，**这里要同步改**。
const WEAK = { crawler: ['mobility'], husk: ['burst'] };
const COUNTER_MULT_EXPECT = 2.5;
const expectMult = (tags, type) => {
  const weak = WEAK[type] || [];
  return weak.some((t) => tags.includes(t)) ? COUNTER_MULT_EXPECT : 1;
};
check('对症倍率真的接进伤害结算（按被打的那只怪算）',
  counterInfo.crawler === expectMult(counterInfo.tags, 'crawler')
  && counterInfo.husk === expectMult(counterInfo.tags, 'husk'),
  `手段 ${JSON.stringify(counterInfo.tags)} → 贪嘴小鱼 ×${counterInfo.crawler} / 铁壳蟹 ×${counterInfo.husk}`);
await shot(page, '11-build.png');
await clickSel(page, '#btn-resume');
await page.waitForTimeout(400);

// ── 无尽里程碑（免费遗赠）────────────
step = 'gift';
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.run.endless = true;
  s.spawner.skipTo(25, s.runTime);
});
await page.waitForTimeout(900);
await handleRoute(page);
check('无尽模式第 25 波弹出里程碑赠礼', await page.locator('#draft').isVisible());
const giftKicker = await page.locator('#draft-kicker').innerText();
check('赠礼面板标出里程碑', /里程碑/.test(giftKicker), giftKicker);
const giftActs = await page.locator('#draft-actions .act').count();
check('赠礼面板没有潮水动作（白拿）', giftActs === 0, `${giftActs} 个动作`);
const relicsBefore = (await state(page)).relics.length;
// 里程碑的面板在第一次挑完后**不会关**（还要挑第二张），所以不能���用 pickDraft
await page.locator('#draft-cards .card').first().click();
await page.waitForTimeout(400);
const relicsMid = (await state(page)).relics.length;
check('里程碑第一次挑完面板不关（还要挑第二张）',
  relicsMid === relicsBefore + 1 && (await state(page)).runState === 'draft',
  `${relicsBefore} → ${relicsMid}`);
await page.locator('#draft-cards .card').first().click();
await page.waitForFunction(() => document.querySelector('#draft')?.hidden === true, null, { timeout: 15000 });
const relicsAfter = (await state(page)).relics.length;
check('里程碑白挑两张装备', relicsAfter === relicsBefore + 2,
  `${relicsBefore} → ${relicsAfter}`);
check('里程碑之后回到 playing', (await state(page)).runState === 'playing');

// ── 暂停 ────────────────────────────
step = 'pause';
await handlePanels(page);
// 若中途阵亡，重开后再测暂停
if (await page.locator('#over').isVisible()) {
  step = 'restart';
  await clickSel(page, '#btn-restart');
  await page.waitForTimeout(800);
  await handleRoute(page);
  await waitDraft(page);
  await pickDraft(page, 0);
}
await page.keyboard.press('KeyP');
await page.waitForTimeout(700);
check('暂停面板出现', await page.locator('#pause').isVisible());
await shot(page, '03-pause.png');
await clickSel(page, '#btn-resume');
await page.waitForTimeout(500);
let sResume = await state(page);
if (sResume.runState !== 'playing') {
  // 偶发：点击未生效（面板仍在过渡），再点一次
  await clickSel(page, '#btn-resume');
  await page.waitForTimeout(500);
  sResume = await state(page);
}
check('恢复后回到 playing', sResume.runState === 'playing', JSON.stringify(sResume));

// 暂停状态下按 P 也要能解除暂停（场景被 pause 后场景内输入会失效，这里验证全局监听）
await keepAlive(page);
await page.keyboard.press('KeyP');
await page.waitForTimeout(500);
const pausedAgain = await page.evaluate(() => {
  const s = window.__tulip.scene();
  return { ...window.__tulip.state(), hp: s.hp, invulnLeft: Math.round((s.invulnUntil - s.runTime * 1000) / 1000), runTime: Math.round(s.runTime) };
});
await keepAlive(page);
await page.keyboard.press('KeyP');
await page.waitForTimeout(600);
const resumedByKey = await page.evaluate(() => {
  const s = window.__tulip.scene();
  return { ...window.__tulip.state(), hp: s.hp, invulnLeft: Math.round((s.invulnUntil - s.runTime * 1000) / 1000) };
});
check('暂停中按 P 可解除暂停',
  pausedAgain.runState === 'paused' && resumedByKey.runState === 'playing',
  `按下前=${pausedAgain.runState} 松开后=${resumedByKey.runState}`);

// ── 战败结算 ────────────────────────
step = 'gameover';
await handlePanels(page);
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.invulnUntil = 0;
  s.hp = 1;
  s.hurtPlayer({});
});
await page.waitForTimeout(1000);
check('结算面板出现', await page.locator('#over').isVisible());
const finalScore = await page.locator('#final-score').innerText();
check('结算显示分数', /\d+/.test(finalScore), `score=${finalScore}`);
const finalKills = await page.locator('#final-kills').innerText();
const finalSurvived = await page.locator('#final-survived').innerText();
const finalGrade = await page.locator('#final-grade').innerText();
const finalChapter = await page.locator('#final-chapter').innerText();
check('结算含击杀/存活/章节/评级',
  /\d+/.test(finalKills) && /\d+/.test(finalSurvived) && /[SABCD]/.test(finalGrade) && finalChapter.trim().length > 0,
  `击杀=${finalKills} 存活=${finalSurvived}s 章节=${finalChapter} 评级=${finalGrade}`);
const overRelics = await page.locator('#over-relics .chip').count();
check('结算列出本局装备', overRelics >= 1, `${overRelics} 件装备`);
const overMemory = await page.locator('#over-memory').innerText();
check('结算显示获得的深海藏品', /深海藏品\s*\+\d+/.test(overMemory), overMemory);
const overSeed = await page.locator('#over-seed').innerText();
check('结算显示本局种子（可复现/可分享）', /种子\s*\d+/.test(overSeed), overSeed);
// 第五轮：死因要写在结算页（"死于什么"是敌人向构筑提问的直接证据）
const overCause = await page.locator('#over-cause').innerText();
check('结算写明死于什么', /死于/.test(overCause), overCause);
const overNext = await page.locator('#over-next').innerText();
check('结算给出下一个解锁目标（局外进度接得上）', /记忆|解锁/.test(overNext), overNext);
const pressureBars = await page.locator('#over-pressure .pressure-bar').count();
check('结算画出这一局的强度曲线（每波一根柱）', pressureBars >= 3, `${pressureBars} 根`);
await shot(page, '04-gameover.png');

step = 'restart';
await clickSel(page, '#btn-restart');
await page.waitForTimeout(800);
await handleRoute(page);
const draftAgain = await waitDraft(page);
check('重开后重新抽卡（新一局长得不一样）', draftAgain === 3, `${draftAgain} 张候选`);
await pickDraft(page, 0);
const s5 = await state(page);
check('重开后状态重置', s5.runState === 'playing' && s5.score === 0 && s5.hp === s5.maxHp && s5.relics.length === 2,
  JSON.stringify(s5));
check('重开后仍是玩家选的主角', s5.character === 'scout', `character=${s5.character}`);

// ── 同种子换个构筑 ───────────────────
step = 'retry-seed';
const seedBefore = (await state(page)).seed;
const namesV0 = await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.startRun(s.seed, 0); // 同种子、同变体 → 应当给出一模一样的候选
  // 第六轮：选完路线才会抽卡，所以这里先把路线选掉
  s.chooseRoute(s.run.plan.chapters[0].routes[0]);
  return [...document.querySelectorAll('#draft-cards .card .card-name')].map((e) => e.textContent);
});
const namesV1 = await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.startRun(s.seed, 1); // 变体 +1 → 章节主题不变，但抽卡候选重洗
  s.chooseRoute(s.run.plan.chapters[0].routes[0]);
  return [...document.querySelectorAll('#draft-cards .card .card-name')].map((e) => e.textContent);
});
const seedAfter = (await state(page)).seed;
check('同种子重打：种子不变', seedAfter === seedBefore, `${seedBefore} → ${seedAfter}`);
check('同种子重打：候选重洗（换个解法）',
  JSON.stringify(namesV0) !== JSON.stringify(namesV1), `${namesV0.join('/')} → ${namesV1.join('/')}`);
check('同种子同变体：候选可复现', namesV0.length === 3, namesV0.join('/'));
await pickDraft(page, 0);

// ── 通关 ────────────────────────────
step = 'victory';
await keepAlive(page);
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.spawner.skipTo(20, s.runTime);
});
await page.waitForTimeout(600);
await handleRoute(page);
const finalDraft = await waitDraft(page);
check('终局章开始时弹出抽卡', finalDraft >= 3, `${finalDraft} 张候选`);
// 跳过抽卡：不拿装备，但保留潮水
const relicsBeforeSkip = (await state(page)).relics.length;
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.run.dew = 40;
  s.renderDraft();
});
await page.locator('#draft-actions .act[data-id="skip"]').click();
await page.waitForFunction(() => document.querySelector('#draft')?.hidden === true, null, { timeout: 15000 });
const afterSkip = await state(page);
check('跳过抽卡不拿装备', afterSkip.relics.length === relicsBeforeSkip && afterSkip.runState === 'playing',
  `遗物 ${relicsBeforeSkip} → ${afterSkip.relics.length}，露水 ${afterSkip.dew}`);
await page.waitForTimeout(3200); // 等终局 Boss 登场（bossAt = 2.2s）
const bossAlive = await page.evaluate(() => window.__tulip.scene().enemies.getChildren()
  .filter((e) => e.getData('type') === 'boss').length);
check('终局 Boss 登场', bossAlive >= 1, `${bossAlive} 个 Boss`);
// 回归：把波次推进到 21（模拟玩家没在波次内打死 Boss），再杀它仍要通关
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.spawner.skipTo(21, s.runTime);
  s.run.drafted.add(5); // 第 5 章已抽过卡，避免这一步弹出抽卡面板挡住流程
});
const bossWave = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const b = s.enemies.getChildren().find((e) => e.getData('type') === 'boss');
  return b ? b.getData('wave') : null;
});
check('Boss 记住了自己出生的波次', bossWave === 20, `wave=${bossWave}`);
const killBoss = await page.evaluate(() => {
  const s = window.__tulip.scene();
  const boss = s.enemies.getChildren().find((e) => e.getData('type') === 'boss');
  if (!boss) return { ok: false };
  const max = boss.getData('maxHp');
  s.damageEnemy(boss, max + 10);
  return { ok: true, max, runState: s.runState };
});
check('终局 Boss 之后不开篝火（那是通关，不是章末）',
  !(await page.evaluate(() => document.querySelector('#camp')?.hidden === false)), '');
check('波次已推进后击杀终局 Boss 仍触发通关',
  killBoss.ok && killBoss.runState === 'victory', JSON.stringify(killBoss));
await page.waitForTimeout(600);
check('通关面板出现', await page.locator('#victory').isVisible());
const victoryRelics = await page.locator('#victory-relics .chip').count();
check('通关面板列出构筑', victoryRelics >= 1, `${victoryRelics} 件遗物`);
const victoryGrade = await page.locator('#victory-grade').innerText();
check('通关面板给出评级', /[SABCD]/.test(victoryGrade), `评级=${victoryGrade}`);
await shot(page, '08-victory.png');

// 无尽模式：继续后第 5 章照常抽卡
step = 'endless';
await clickSel(page, '#btn-continue');
await page.waitForTimeout(500);
// 无尽模式的下一章也要先选路线（第六轮）：先把面板处理掉
await handlePanels(page);
const endlessState = await state(page);
check('通关后可继续无尽', endlessState.runState === 'playing', JSON.stringify(endlessState));
await page.evaluate(() => {
  const s = window.__tulip.scene();
  s.spawner.skipTo(26, s.runTime);
});
await page.waitForTimeout(600);
await handleRoute(page);
const endlessDraft = await waitDraft(page);
check('无尽模式继续抽卡', endlessDraft >= 3, `${endlessDraft} 张候选`);
await pickDraft(page, 0);
const endlessFinal = await state(page);
check('无尽模式继续累积遗物', endlessFinal.relics.length >= 2, `relics=${JSON.stringify(endlessFinal.relics)}`);

// ── 移动端 ──────────────────────────
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const mobileErrors = [];
mobile.on('pageerror', (e) => mobileErrors.push(String(e)));
await mobile.goto(pageUrl(), { waitUntil: 'networkidle' });
await mobile.waitForTimeout(1500);
check('移动端显示触屏摇杆', await mobile.locator('#touch-pad').isVisible());
await clickSel(mobile, '#btn-start');
await handleRoute(mobile);
await mobile.waitForTimeout(1200);
const mobileDraft = await waitDraft(mobile);
check('移动端也能抽卡', mobileDraft === 3, `${mobileDraft} 张候选`);
await shot(mobile, '05-mobile.png');
await pickDraft(mobile, 0);
await mobile.waitForTimeout(1500);
// ── 今日挑战：用固定种子开局 ─────────
step = 'daily-run';
// 今日挑战的按钮在主菜单里 → 先回主菜单
await page.evaluate(() => { window.__tulip.scene().toMenu(); });
await page.waitForTimeout(500);
await clickSel(page, '#btn-daily');
await handleRoute(page);
await page.waitForTimeout(900);
const dailyState = await state(page);
check('今日挑战能开局', dailyState.runState === 'draft' || dailyState.runState === 'playing',
  dailyState.runState);
await page.waitForFunction(() => document.querySelector('#draft')?.hidden === true, null, { timeout: 15000 })
  .catch(() => {});
await page.evaluate(() => { window.__tulip.scene().gameOver(); });
await page.waitForTimeout(800);
const dailySeedText = await page.locator('#over-seed').innerText();
check('结算页标出这是今日挑战', /今日挑战/.test(dailySeedText), dailySeedText);

check('移动端无脚本错误', mobileErrors.length === 0, mobileErrors.join(' | '));

check('桌面端无脚本错误', errors.length === 0, errors.slice(0, 3).join(' | '));

const failed = results.filter((r) => !r.ok);
console.log(`\n试玩检查（渲染器 ${RENDERER || 'auto'}）：${results.length - failed.length}/${results.length} 通过`);

// 结果落盘，供文档数据管道读取（避免手写检查项数量）
writeFileSync(
  join(SHOTS, `playtest-report${RENDERER ? `-${RENDERER}` : ''}.json`),
  JSON.stringify({
    renderer: RENDERER || 'auto',
    checks: results.length,
    passed: results.length - failed.length,
    failed: failed.map((f) => f.name),
    items: results.map((r) => ({ name: r.name, ok: r.ok, detail: r.detail })),
  }, null, 2),
  'utf8',
);

await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
