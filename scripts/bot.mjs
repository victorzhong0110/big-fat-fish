// 自动试玩用的"机器人玩家"：把一段代码注入页面，替人操作。
//
// 它是**平衡测量仪**：难度调整之前，得先有一个打得像样的对手，
// 否则测出来的"这局能不能通"没有意义。
//
// 走位用势场法（斥力 + 切向绕圈 + 躲弹幕 + 靠边回避），
// 走的是真实输入通道（keys.*.isDown），因此继承移速/冲刺/遗物加成。
import { relicById, applyRelics, deriveFireStats, RELICS } from '../src/systems/relics.js';
import { ARCHETYPES } from '../src/systems/archetypes.js';
import { deepenCost } from '../src/systems/dew.js';
import { waveDpsNeed, chapterCounterMult } from '../src/systems/pressure.js';
import { relicTagsOf, tagsFromStats } from '../src/systems/counters.js';
import { applyBuild } from '../src/systems/characters.js';
import { chapterIndexOf } from '../src/systems/run.js';

export const BOT_SCRIPT = `(() => {
  const W = 960, H = 600;
  // 「打得糙」的档位：用来逼近**普通玩家**，而不是上限玩家。
  //   reactMs —— 决策间隔（人不会每帧改方向）
  //   jitter  —— 方向抖动（手会抖）
  // 注意：自动瞄准仍然是完美的（游戏给的是辅助瞄准），
  // 所以即便开了 sloppy，它仍然**比真人强**（真人瞄不准）→ 只能当下限参考。
  const opts = window.__botOpts || {};
  const REACT = opts.reactMs ?? 0;
  const JITTER = opts.jitter ?? 0;
  let lastDecide = 0;
  let dirX = 0, dirY = 0;
  window.__bot = { ticks: 0, dashes: 0, reactMs: REACT };
  const loop = () => {
    requestAnimationFrame(loop);
    const sc = window.__tulip.scene();
    if (!sc || sc.runState !== 'playing') return;
    const p = sc.player;
    let fx = 0, fy = 0;

    // 1) 敌人斥力：越近推得越狠（平方衰减）
    let nearest = 1e9, nx = 0, ny = 0;
    for (const e of sc.enemies.getChildren()) {
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < nearest) { nearest = d; nx = dx / d; ny = dy / d; }
      if (d < 300) {
        const w = (300 - d) / 300;
        fx += (dx / d) * w * w * 3.2;
        fy += (dy / d) * w * w * 3.2;
      }
    }

    // 2) 切向绕圈：直线逃跑会被追死，绕着走才能一直输出
    if (nearest < 340) {
      fx += -ny * 1.3;
      fy += nx * 1.3;
    }

    // 2b) 跃动藤：蓄力与冲刺时要往**侧面**躲（第五轮新增）
    // 直线后退会被它的锁定方向正面撞上 —— 必须垂直于冲刺方向绕开。
    for (const e of sc.enemies.getChildren()) {
      const chg = e.getData && e.getData('chg');
      if (!chg || (chg.phase !== 'wind' && chg.phase !== 'dash')) continue;
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const lx = (chg.lock && chg.lock.x) || 0;
      const ly = (chg.lock && chg.lock.y) || 0;
      const perpX = -ly, perpY = lx;
      const side = (dx * perpX + dy * perpY) >= 0 ? 1 : -1;
      const w = Math.max(0, 1 - d / 420);
      fx += perpX * side * 5.0 * w;
      fy += perpY * side * 5.0 * w;
    }

    // 2c) 花粉云：站着不动就会被持续扣血（第五轮新增）
    for (const c of (sc.clouds || [])) {
      const dx = p.x - c.x, dy = p.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > c.radius + 90) continue;
      const w = Math.max(0, 1 - d / (c.radius + 90));
      fx += (dx / d) * 4.5 * w;
      fy += (dy / d) * 4.5 * w;
    }

    // 3) 躲敌方弹幕：侧向闪避，正对来袭就后撤
    for (const b of sc.eBullets.getChildren()) {
      const dx = p.x - b.x, dy = p.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 190) continue;
      const vx = b.body?.velocity?.x ?? 0, vy = b.body?.velocity?.y ?? 0;
      const vl = Math.hypot(vx, vy) || 1;
      fx += (-vy / vl) * 1.6;
      fy += (vx / vl) * 1.6;
      const dot = (dx / d) * (vx / vl) + (dy / d) * (vy / vl);
      if (dot < -0.25) { fx += (dx / d) * 1.8; fy += (dy / d) * 1.8; }
    }

    // 4) 别贴墙：靠边跑会被堵死
    const m = 120;
    if (p.x < m) fx += ((m - p.x) / m) * 3;
    if (p.x > W - m) fx -= ((p.x - (W - m)) / m) * 3;
    if (p.y < m) fy += ((m - p.y) / m) * 3;
    if (p.y > H - m) fy -= ((p.y - (H - m)) / m) * 3;

    // 5) 轻微漫游，避免贴着某个方向卡住
    fx += Math.cos(sc.runTime * 1.3) * 0.3;
    fy += Math.sin(sc.runTime * 1.3) * 0.3;

    const len = Math.hypot(fx, fy) || 1;
    let ux = fx / len, uy = fy / len;
    // 「打得糙」：每隔 REACT 毫秒才重算一次方向（人不会每帧改方向），并加一点抖动
    const now = performance.now();
    if (REACT > 0) {
      if (now - lastDecide >= REACT) {
        lastDecide = now;
        dirX = ux + (Math.random() - 0.5) * JITTER;
        dirY = uy + (Math.random() - 0.5) * JITTER;
        const l2 = Math.hypot(dirX, dirY) || 1;
        dirX /= l2; dirY /= l2;
      }
      ux = dirX; uy = dirY;
    }
    sc.keys.A.isDown = ux < -0.3;
    sc.keys.D.isDown = ux > 0.3;
    sc.keys.W.isDown = uy < -0.3;
    sc.keys.S.isDown = uy > 0.3;
    sc.keys.SPACE.isDown = true;

    // 6) 贴脸就冲刺
    if (nearest < 78 && sc.dashCooldown <= 0 && sc.dashTimer <= 0) {
      sc.tryDash();
      window.__bot.dashes += 1;
    }
    window.__bot.ticks += 1;
  };
  requestAnimationFrame(loop);
})()`;

/**
 * 装上机器人。
 * @param {import('playwright-core').Page} page
 * @param {{reactMs?:number, jitter?:number}} [opts] 「打得糙」的档位
 *   reactMs > 0 = 隔这么久才重算一次方向；jitter = 方向抖动幅度。
 */
export async function installBot(page, opts = {}) {
  await page.evaluate((o) => { window.__botOpts = o; }, opts);
  await page.evaluate(BOT_SCRIPT);
}

// 第十轮：**评估口径下沉到纯逻辑层**（systems/relicValue.js），
// 机器人与面板**读同一份实现** —— 以前这里是脚本自己抄了一份，
// 于是"面板说 +8%、机器人算 +0%"这种事迟早发生。
import { dpsGainOf, transformDpsGain, relicDelta } from '../src/systems/relicValue.js';

/** 以 Lv.5 火力算一张遗物带来的 DPS 增益（这是这个游戏最硬的通货） */
export function dpsGain(id, owned) {
  return dpsGainOf(id, owned).dps;
}

/**
 * 「深化」某张已有遗物能带来多少 DPS（再叠一层）。
 * 深化是纯 DPS 收益；拿新牌还额外带来流派/协同的价值，所以比较时给新牌一点权重。
 */
export function deepenDpsGain(id, owned = [], ctx = null, layers = {}) {
  const dps = (list) => {
    const f = deriveFireStats(5, applyRelics(list));
    return (f.damage * f.bullets) / (f.cooldownMs / 1000);
  };
  // 转化型遗物的收益是**运行时**的（不进 fire stats），必须单独估，
  // 否则机器人会以为"深化连击熔炉"毫无价值（实测它算出来是 0 DPS 收益）。
  let gain = dps([...owned, id]) - dps(owned) + transformDpsGain(id, owned);
  // 第九轮：**深化也能给手段**（把普通牌深化成对症牌）——
  // 这条路径的收益不在 DPS 上，而在"对症倍率"上 ⇒ 必须单独估，
  // 否则机器人永远看不到"把双瓣齐射深化成范围牌"的价值。
  if (ctx?.chapter) {
    const l = layers[id] || 0;
    const before = chapterCounterMult(ctx.chapter, ctx.seed ?? 1, ctx.mods ?? null,
      tagsFromStats(applyBuild(owned, null, layers)));
    const after = chapterCounterMult(ctx.chapter, ctx.seed ?? 1, ctx.mods ?? null,
      tagsFromStats(applyBuild(owned, null, { ...layers, [id]: l + 1 })));
    gain += 60 * (after - before);
  }
  return gain;
}

/**
 * 给一张候选卡打分（"构筑型"机器人用）。
 * 权重：DPS 增益 > 转化型后劲 > 正好凑成一档流派 > **对症**。
 *
 * ⚠️ 第九轮加了"对症"这一项，**它是这一轮的关键**：
 * 第八轮实测"会构筑"与"按稀有度挑"的 DPS 只差 10~30% ⇒ 差别看不出来；
 * 而引入「对症 ×1.6」之后，**"选对手段"带来的有效 DPS 能差 30~60%**
 * ⇒ 这才是"构筑决定生死"真正的杠杆。
 * 判据用的是**边际值**：拿了这张牌之后，这一章的平均倍率提高了多少 ——
 * 所以已经有的手段不会被重复计算（拿第二张 area 牌没有收益）。
 */
export function scoreCard(id, owned = [], ctx = null) {
  const relic = relicById(id);
  if (!relic) return 0;
  const delta = relicDelta(id);
  // 打分 = DPS 收益（普通部分 + 转化型的潜在收益）
  // ⚠️ 第十轮修：**转化型不能算两次** ——
  // `dpsGain` 现在走 relicValue.dpsGainOf（**已经含**转化型的潜在收益），
  // 这里再 +transformDpsGain 就是双算 ⇒ 机器人把连击熔炉/汲能之根看得比实际高一倍。
  let score = dpsGain(id, owned) * 10;
  if (delta.slowOnHit) score += 8; // 控制类：不是 DPS，但能拖住敌人（粗估）
  const arch = ARCHETYPES.find((a) => a.tag === relic.tag);
  if (arch) {
    const have = owned.filter((x) => relicById(x)?.tag === arch.tag).length;
    if ((have + 1) % arch.every === 0) score += 3; // 正好凑成一档
  }
  // 第九轮：对症（边际倍率）
  if (ctx?.chapter) {
    const before = chapterCounterMult(ctx.chapter, ctx.seed ?? 1, ctx.mods ?? null, relicTagsOf(owned));
    const after = chapterCounterMult(ctx.chapter, ctx.seed ?? 1, ctx.mods ?? null, relicTagsOf([...owned, id]));
    score += 40 * (after - before);
  }
  return score;
}

/**
 * 抽卡面板里选一张。
 * skill='good'：按稀有度挑（传奇 > 稀有 > 普通，诅咒 -0.3），模拟会算账的玩家；
 *              候选里没有稀有以上时，会花露水重随一次（每个抽卡点最多一次）。
 * skill='smart'：**会构筑**——按 DPS 增益 + 转化型 + 流派补齐打分（第四轮末加的）。
 * skill='naive'：永远选第一张，代表随手点的玩家。
 */
export async function pickDraftCard(page, skill = 'good', rerollsLeft = 1) {
  const cards = page.locator('#draft-cards .card');
  const n = await cards.count();
  if (!n) return 0;
  let idx = 0;
  let best = -Infinity;
  let poolBestScore = 0;
  if ((skill === 'good' || skill === 'smart') && n > 1) {
    let scores;
    if (skill === 'smart') {
      const ids = await page.evaluate(() => [...document.querySelectorAll('#draft-cards .card')].map((el) => el.dataset.id));
      const owned = await page.evaluate(() => [...(window.__tulip.scene()?.run?.relics ?? [])]);
      // 第九轮：智能机器人要**读对症** —— 它知道这一章会出什么怪，
      // 于是会挑"手段对得上"的牌。good 机器人**不读**（按稀有度挑），
      // 两者之间的差距就是"会不会构筑"这一轮要测的东西。
      const ctx = await page.evaluate(() => {
        const sc = window.__tulip.scene();
        // 章首抽卡时这一波**还没开**（闸门关着）⇒ wave 还是上一波，
        // 必须用 pendingWave 才拿得到"这一章"。
        const w = sc?.spawner?.pendingWave || sc?.spawner?.wave || sc?.wave || 1;
        return {
          wave: w,
          seed: sc?.seed ?? 1,
          // 用场景自己的 modsFor（含主题 × 路线偏置 × 构筑上限），
          // 而不是 spawner.mods —— 后者在章首还是**上一波**的修正量。
          mods: sc?.modsFor ? sc.modsFor(w) : (sc?.spawner?.mods ?? null),
        };
      });
      ctx.chapter = chapterIndexOf(ctx.wave);
      scores = ids.map((id) => scoreCard(id, owned, ctx));
      // **牌池对照**（第八轮修的测量工具缺口）：
      // 旧判据是「候选值 ≤ 0.5 就重随」——而分数是 DPS×10，
      // 于是只要候选有一点点收益就**从不重随** ⇒ 路线给的露水对它一文不值
      // （实测：good 平均拿 88 露水去换更好的牌，smart 只有 50）。
      // 新判据：**候选明显比牌池里最好的差，就值得花露水重随一次**。
      const banished = await page.evaluate(() => [...(window.__tulip.scene()?.run?.banished ?? [])]);
      const poolIds = RELICS.map((r) => r.id).filter((id) => !owned.includes(id) && !banished.includes(id));
      const poolBest = poolIds.length ? Math.max(...poolIds.map((id) => scoreCard(id, owned, ctx))) : 0;
      poolBestScore = poolBest;

      // 「深化」也是一个选项：拿新牌 vs 把旧牌变强，只能选一个。
      // 判据：深化的 DPS 收益比最好的候选牌更高，而且露水够。
      //
      // **价格必须按每一张自己的层数算**（deepenCost = 24 + 10×层数）：
      // 以前这里只检查「露水 ≥ 24」，结果点到一张已经深化过的遗物时
      // 真实价格是 34/44 —— 点下去露水不够，面板卡在深化模式里**出不来**，
      // 那一局的时间就此停住（实测：seed 1037 的游戏时钟只走了 114 秒就超时了）。
      const dew = await page.evaluate(() => window.__tulip.scene()?.run?.dew ?? 0);
      const layers = await page.evaluate(() => ({ ...(window.__tulip.scene()?.run?.deepened ?? {}) }));
      const deepBtn = page.locator('#draft-actions .act[data-id="deepen"]:not([disabled])');
      if (owned.length && (await deepBtn.count()) > 0) {
        const affordable = owned.filter((id) => dew >= deepenCost(layers[id] || 0));
        const gains = affordable.map((id) => deepenDpsGain(id, owned, ctx, layers));
        const bestCardDps = Math.max(...ids.map((id) => dpsGain(id, owned)));
        if (affordable.length && Math.max(...gains) > bestCardDps) {
          const target = affordable[gains.indexOf(Math.max(...gains))];
          await deepBtn.click();
          await page.waitForTimeout(200);
          const c = page.locator('#draft-cards .card').filter({ has: page.locator(`[data-id="${target}"]`) });
          await c.first().click().catch(() => {});
          await page.waitForTimeout(250);
          // 兜底：万一还是卡在深化面板（价格/规则变了），点「跳过」把这一轮结束掉，
          // 绝不让机器人卡在一个面板里把整局的时间耗光。
          const stillOpen = await page.evaluate(() => document.querySelector('#draft')?.hidden === false);
          if (stillOpen) {
            await page.locator('#draft-actions .act[data-id="skip"]:not([disabled])').click().catch(() => {});
            await page.waitForTimeout(250);
          }
          return n;
        }
      }
    } else {
      scores = await page.evaluate(() => {
        const w = { common: 0, rare: 1, legendary: 2 };
        return [...document.querySelectorAll('#draft-cards .card')].map((el) => {
          const cls = el.className;
          const rarity = Object.keys(w).find((r) => cls.includes(r)) || 'common';
          return w[rarity] - (cls.includes('cursed') ? 0.3 : 0);
        });
      });
    }
    scores.forEach((s, i) => { if (s > best) { best = s; idx = i; } });
    // 全是普通牌 → 值得花露水重随一次（smart 模式下"没有增益"也重随）
    // 重随的判据：候选明显比牌池里最好的差（差得多就换），
    // 或者候选几乎没用（旧的兜底判据）。
    const worthReroll = skill === 'smart'
      ? (best <= 0.5 || (poolBestScore > 0 && best < poolBestScore * 0.55))
      : best <= 0;
    if (worthReroll && rerollsLeft > 0) {
      const canReroll = await page.locator('#draft-actions .act[data-id="reroll"]:not([disabled])').count();
      if (canReroll > 0) {
        await page.locator('#draft-actions .act[data-id="reroll"]').click();
        await page.waitForTimeout(250);
        return pickDraftCard(page, skill, rerollsLeft - 1);
      }
    }
  }
  await cards.nth(Math.min(idx, n - 1)).click();
  await page.waitForFunction(() => document.querySelector('#draft')?.hidden === true, null, { timeout: 15000 });
  return n;
}

/**
 * 篝火面板：章末的休整（第八轮）。
 *
 * 策略像真人：**血少了就回血，血够就磨刃**。
 * @param {import('playwright-core').Page} page
 */
export async function pickCamp(page) {
  const cards = page.locator('#camp-cards .card');
  const n = await cards.count();
  if (!n) return 0;
  const st = await page.evaluate(() => {
    const s = window.__tulip.scene();
    return { hp: s.hp, maxHp: s.maxHp, fireLevel: s.fireLevel };
  });
  const hurt = st.maxHp > 0 && st.hp / st.maxHp < 0.6;
  // 找第一个可选的：血少 → 休整；否则 → 磨刃
  let idx = 0;
  if (!hurt) {
    const sharpenIdx = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#camp-cards .card')];
      return cards.findIndex((c) => c.dataset.id === 'sharpen');
    });
    if (sharpenIdx >= 0) idx = sharpenIdx;
  }
  await cards.nth(Math.min(idx, n - 1)).click().catch(() => {});
  await page.waitForFunction(() => document.querySelector('#camp')?.hidden === true, null, { timeout: 15000 }).catch(() => {});
  return n;
}

/**
 * 路线面板里选一条路（第六轮）。
 *
 * skill='smart'：**看自己的覆盖度再决定** ——
 *   覆盖度高（打得动）就挑收益高的路（贪），覆盖度低就挑威胁小的路（稳）。
 *   这是一个真人会做的判断：强的时候贪一把，弱的时候求稳。
 * skill='good'：总是按"收益 ÷ 威胁"挑最好的那一条。
 * skill='naive'：永远选第一条。
 */
export async function pickRoute(page, skill = 'good') {
  const cards = page.locator('#route-cards .card');
  const n = await cards.count();
  if (!n) return 0;
  let idx = 0;
  if ((skill === 'smart' || skill === 'good') && n > 1) {
    const st = await page.evaluate(() => {
      const s = window.__tulip.scene();
      const list = [...document.querySelectorAll('#route-cards .card')];
      return {
        wave: s.spawner?.wave ?? 1,
        seed: s.seed ?? 0,
        mods: { ...(s.spawner?.mods || {}) },
        dps: s.fire ? (s.fire.damage * s.fire.bullets) / (s.fire.cooldownMs / 1000) : 0,
        routes: list.map((c) => ({
          id: c.dataset.id,
          threat: Number(c.dataset.threat) || 1,
          reward: Number(c.dataset.reward) || 1,
        })),
      };
    });
    const need = waveDpsNeed(st.wave, st.seed, st.mods);
    const coverage = need ? st.dps / need : 2;
    if (skill === 'smart') {
      if (coverage < 1.35) {
        // 打不过 → 挑威胁最小的（求稳）
        idx = st.routes.reduce((best, r, i) => (r.threat < st.routes[best].threat ? i : best), 0);
      } else if (coverage >= 2.0) {
        // 强得离谱 → 挑威胁最大的（贪分数，也顺便让测量覆盖到高风险路线）
        idx = st.routes.reduce((best, r, i) => (r.threat > st.routes[best].threat ? i : best), 0);
      } else {
        // 中等 → 挑"收益 ÷ 威胁"最高的
        idx = st.routes.reduce(
          (best, r, i) => (r.reward / r.threat > st.routes[best].reward / st.routes[best].threat ? i : best),
          0,
        );
      }
    } else {
      // 打得动 → 挑"收益 ÷ 威胁"最高的
      idx = st.routes.reduce(
        (best, r, i) => (r.reward / r.threat > st.routes[best].reward / st.routes[best].threat ? i : best),
        0,
      );
    }
  }
  await cards.nth(Math.min(idx, n - 1)).click();
  await page.waitForFunction(() => document.querySelector('#route')?.hidden === true, null, { timeout: 15000 });
  return n;
}

/**
 * 异象面板里选一个结果。
 * skill='good'：挑"看起来更划算"的一边（按选项文字里有没有负号粗判）。
 * skill='naive'：永远选第一个。
 */
export async function pickOmenCard(page, skill = 'good') {
  const cards = page.locator('#omen-cards .card.omen');
  const n = await cards.count();
  if (!n) return 0;
  let idx = 0;
  if (skill === 'good' && n > 1) {
    const scores = await page.evaluate(() => [...document.querySelectorAll('#omen-cards .card.omen')]
      .map((el) => {
        const t = el.textContent || '';
        // 代价越多分越低
        let s = 0;
        if (/\-/.test(t)) s -= 1;
        if (/\+/.test(t)) s += 1;
        return s;
      }));
    let best = -Infinity;
    scores.forEach((s, i) => { if (s >= best) { best = s; idx = i; } });
  }
  await cards.nth(Math.min(idx, n - 1)).click();
  await page.waitForFunction(() => document.querySelector('#omen')?.hidden === true, null, { timeout: 15000 });
  return n;
}
