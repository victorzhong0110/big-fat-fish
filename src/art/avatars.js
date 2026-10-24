// ── 敌人的「模型化身」：GPT（OpenAI Blossom）与 Claude（Anthropic 星芒）────
//
// ⚠️ **只借鉴几何构造思路，不复制任何官方图形资源。**
// 两个标志的形状规律（来自公开的品牌分析与几何拆解）：
//
//  ① **GPT / OpenAI "Blossom"**
//     · 六向旋转对称：绕中心每 60° 重复一次，六个单元完全相同；
//     · 本质是「生命之种」式的六个圆环按六边形排布、彼此交织；
//     · 2025 年重绘后：笔画**等宽**、中心留白更大、弧线更干净。
//     ⇒ 本作把它画成：6 个描边圆环按六边形排布 + 交替压在上层（模拟编织）。
//     官方色：黑白为主；ChatGPT 界面绿常被引用为 #10A37F。
//
//  ② **Claude**
//     · 约十二条**长短不一、略有弧度、收笔不匀**的手绘放射笔画，
//       刻意不对称（"看起来像手画的，不像是按网格算出来的"）；
//     · 陶土橙，Anthropic 公开品牌规范里的 primary accent = **#D97757**。
//     ⇒ 本作把它画成：变长度的锥形笔画 + 角度抖动 + 轻微弯曲。
//
// 🔴 **版权边界**：这里是**自绘的原创图形**，不是官方 SVG 的复刻，也不使用任何
// 官方图片资源。商标归属于各自公司；本项目只做「致敬式的虚构怪物」，
// 不暗示任何授权、赞助或关联关系。玩家应当一眼看出「这是致敬」，而不是
// 「这是官方图标」。
//
// 📐 **纯逻辑层**：不 import Phaser、不碰 DOM —— 只往传入的 Graphics 上画，
// 因此可以单测（见 tests/avatars.test.js）。

/** OpenAI 界面绿（ChatGPT 界面常被引用的值） */
export const GPT_COLOR = 0x10a37f;
/** GPT 的暗一档（画在"下层"，制造编织的层次） */
export const GPT_DARK = 0x086a52;
/** Anthropic 官方主色（其公开品牌规范里的 primary accent） */
export const CLAUDE_COLOR = 0xd97757;
/** Claude 的暗一档 */
export const CLAUDE_DARK = 0xa8552f;


/**
 * 每个敌种归到哪个模型阵营，以及它在家族里的"变体"参数。
 *
 * 归阵营的逻辑（也让玩法读起来更顺）：
 *   · **GPT（青绿 · 六瓣结）** = 基础型、堆数量、肉盾 —— 靠"多"取胜；
 *   · **Claude（陶土橙 · 星芒）** = 远程、爆发、机动 —— 靠"巧"取胜。
 * 玩家扫一眼战场就能读出"这边是绿结、那边是橙芒"，对"对症/弱点"的判断也更直观。
 *
 * `variant` 只影响**外观**（尺寸/笔画/角度/齿数），**不影响任何机制**。
 */
export const ENEMY_AVATAR = {
  // ── GPT 阵营 ──────────────────────────────────────────────
  crawler: { model: 'gpt', rays: 6, phase: 0.0, weight: 0.17, dot: 0 },
  swarm: { model: 'gpt', rays: 5, phase: 0.5, weight: 0.22, dot: 1 },
  bud: { model: 'gpt', rays: 6, phase: 0.25, weight: 0.15, dot: 0 },
  husk: { model: 'gpt', rays: 6, phase: 0.75, weight: 0.24, dot: 1 },
  huskling: { model: 'gpt', rays: 4, phase: 0.0, weight: 0.26, dot: 0 },
  // ── Claude 阵营 ───────────────────────────────────────────
  spore: { model: 'claude', rays: 11, phase: 0.3, weight: 1.0, curve: 0.22 },
  moth: { model: 'claude', rays: 13, phase: 1.1, weight: 1.0, curve: -0.18 },
  weaver: { model: 'claude', rays: 9, phase: 2.2, weight: 0.85, curve: 0.3 },
  charger: { model: 'claude', rays: 15, phase: 0.8, weight: 0.9, curve: -0.26 },
};

/** 4 个 Boss 各自的化身（终局 Boss 是两个模型的合体） */
export const BOSS_AVATAR = {
  boss: { model: 'both', rays: 14, phase: 0.0, weight: 0.2, curve: 0.2 },
  boss_stone: { model: 'gpt', rays: 6, phase: 0.5, weight: 0.26, dot: 1 },
  boss_pollen: { model: 'claude', rays: 17, phase: 1.6, weight: 1.0, curve: 0.24 },
  boss_thorn: { model: 'claude', rays: 20, phase: 2.8, weight: 1.15, curve: -0.14 },
};

/** 某敌种是哪个阵营（给 HUD / 图例用） */
export function modelOf(enemyId) {
  const a = ENEMY_AVATAR[enemyId] || BOSS_AVATAR[enemyId];
  return a ? a.model : 'gpt';
}

/** 某敌种的主色（给 HUD 图例 / 威胁面板的小圆点用） */
export function colorOf(enemyId) {
  const m = modelOf(enemyId);
  if (m === 'claude') return CLAUDE_COLOR;
  if (m === 'both') return GPT_COLOR;
  return GPT_COLOR;
}

/** 某敌种的名字（给 HUD 用） */
export function modelLabelOf(enemyId) {
  const m = modelOf(enemyId);
  if (m === 'claude') return 'Claude';
  if (m === 'both') return 'GPT × Claude';
  return 'GPT';
}

/* ──────────────────────────────────────────────────────────────
 *  绘制：GPT Blossom
 * ────────────────────────────────────────────────────────────── */

/**
 * 画 GPT 的六瓣结。
 *
 * 构造：N 个**描边圆环**按正 N 边形排布（每个圆心在半径 d 上），
 * 圆环之间互相叠压 ⇒ 视觉上就是一朵"六瓣结"。
 * 编织感：先把全部圆环画成暗色（下层），再把**间隔的一半**用亮色重画在上层。
 *
 * @param {Phaser.GameObjects.Graphics} g
 * @param {{cx:number, cy:number, r:number, color?:number, dark?:number,
 *          lobes?:number, weight?:number, phase?:number, dot?:number}} o
 */
export function drawGptBlossom(g, o) {
  const {
    cx, cy, r,
    color = GPT_COLOR, dark = GPT_DARK,
    lobes = 6, weight = 0.17, phase = 0, dot = 0,
  } = o;

  // ⚠️ **r 的定义 = 这个形象的外接半径**（不是内部几何半径）——
  // 这样调用方直接把「碰撞半径」传进来即可，视觉大小与判定大小一致，
  // 玩家不会遇到「看着没打中却被打死了」。
  // 外接半径 = 圆心距 d + 环半径 rr + 半个描边宽。
  // ⚠️ 描边宽度是**参数**（weight）⇒ 外接半径要**按实际参数算**，
  // 否则粗描边的那些怪会画得比它的判定圈还大（tests/avatars.test.js 会红）。
  const R = r / (1.18 + weight / 2);
  const d = R * 0.62;              // 圆心到中心的距离
  const rr = R * 0.56;             // 每个圆环的半径
  const lw = Math.max(1, R * weight);   // 描边宽度

  const centers = [];
  for (let i = 0; i < lobes; i++) {
    const a = phase + (Math.PI * 2 * i) / lobes;
    centers.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]);
  }

  // 下层：全部暗色
  g.lineStyle(lw, dark, 1);
  for (const [x, y] of centers) g.strokeCircle(x, y, rr);

  // 上层：间隔取一半用亮色重画 ⇒ 看起来是"编织"而不是"叠放"
  g.lineStyle(lw, color, 1);
  for (let i = 0; i < centers.length; i += 2) {
    const [x, y] = centers[i];
    g.strokeCircle(x, y, rr);
  }

  // 中心：留白是标志的灵魂（2025 重绘把中心留白放大了），
  // 但小怪给个"emotive point"圆点更利于在战场上辨认
  if (dot) {
    g.fillStyle(color, 1);
    g.fillCircle(cx, cy, R * 0.1);
  }
}

/* ──────────────────────────────────────────────────────────────
 *  绘制：Claude 星芒
 * ────────────────────────────────────────────────────────────── */

/**
 * 画 Claude 的星芒。
 *
 * 构造：N 条**锥形笔画**从中心附近放射出去，每条：
 *   · 长度不同（长度的抖动是这个标志的灵魂 —— 规整的放射会变成"雪花"）；
 *   · 角度有微小抖动；
 *   · 略带弧度（不是死直的）；
 *   · 收笔不匀（有的末端粗、有的根部粗）。
 * 用固定的伪随机（由 phase 决定）⇒ 同一个敌人每次长得一样。
 *
 * @param {Phaser.GameObjects.Graphics} g
 * @param {{cx:number, cy:number, r:number, color?:number, dark?:number,
 *          rays?:number, phase?:number, weight?:number, curve?:number}} o
 */
export function drawClaudeBurst(g, o) {
  const {
    cx, cy, r,
    color = CLAUDE_COLOR, dark = CLAUDE_DARK,
    rays = 12, phase = 0, weight = 1, curve = 0.18,
  } = o;

  // 固定种子的伪随机（同一个 phase ⇒ 同一张脸）
  const rnd = (i, salt) => {
    const x = Math.sin((i + 1) * 12.9898 + (phase + salt) * 78.233) * 43758.5453;
    return x - Math.floor(x);            // 0..1
  };

  // 同上：**r = 外接半径** ⇒ 笔画整体按比例缩放到刚好填满 r
  // 外接半径 = 最长射线(0.98R) + 末端半宽(0.03R × weight)
  const R = r / (0.98 + 0.03 * weight);
  const inner = R * 0.19;
  // 真实标志的笔画是**粗壮**的（不是发丝线）⇒ 半宽给足
  const base = R * 0.095 * weight;   // 根部半宽
  const tip = R * 0.030 * weight;    // 末端半宽

  for (let i = 0; i < rays; i++) {
    const a0 = (Math.PI * 2 * i) / rays + (rnd(i, 1) - 0.5) * 0.16;
    const len = R * (0.66 + 0.32 * rnd(i, 2));
    const bend = curve * (rnd(i, 3) - 0.35);
    // 收笔不匀：一半的笔画末端更粗，一半根部更粗
    const fatTip = rnd(i, 4) > 0.5;
    const w0 = fatTip ? base * 0.75 : base * 1.25;
    const w1 = fatTip ? tip * 2.1 : tip * 0.9;

    // 中线：沿半径采样，带一点弧度
    const N = 6;
    const left = [];
    const right = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      const rr = inner + (len - inner) * t;
      const aa = a0 + bend * t * t;
      const px = cx + Math.cos(aa) * rr;
      const py = cy + Math.sin(aa) * rr;
      // 垂直方向偏移
      const ox = -Math.sin(aa);
      const oy = Math.cos(aa);
      const w = (w0 + (w1 - w0) * t) * 0.5;
      left.push([px + ox * w, py + oy * w]);
      right.push([px - ox * w, py - oy * w]);
    }

    g.fillStyle(i % 3 === 0 ? dark : color, 1);
    g.beginPath();
    g.moveTo(left[0][0], left[0][1]);
    for (let k = 1; k <= N; k++) g.lineTo(left[k][0], left[k][1]);
    for (let k = N; k >= 0; k--) g.lineTo(right[k][0], right[k][1]);
    g.closePath();
    g.fillPath();
  }

  // 中心的一小块实心，Claude 标志的 app 图标版本就是"橙底白芒"
  g.fillStyle(color, 0.9);
  g.fillCircle(cx, cy, R * 0.07);
}

/* ──────────────────────────────────────────────────────────────
 *  统一入口
 * ────────────────────────────────────────────────────────────── */

/**
 * 按敌种 id 画它的化身。
 * @param {Phaser.GameObjects.Graphics} g
 * @param {string} enemyId  'crawler' | 'spore' | ... | 'boss' | 'boss_stone' | ...
 * @param {{cx:number, cy:number, r:number}} box 中心与半径
 */
export function drawAvatar(g, enemyId, box) {
  const a = ENEMY_AVATAR[enemyId] || BOSS_AVATAR[enemyId];
  if (!a) return false;
  const { cx, cy, r } = box;
  const rr = r;   // r 就是外接半径：视觉大小必须等于碰撞大小

  if (a.model === 'gpt') {
    drawGptBlossom(g, {
      cx, cy, r: rr,
      lobes: a.rays, phase: a.phase, weight: a.weight, dot: a.dot,
    });
  } else if (a.model === 'claude') {
    drawClaudeBurst(g, {
      cx, cy, r: rr,
      rays: a.rays, phase: a.phase, weight: a.weight, curve: a.curve,
    });
  } else {
    // 终局 Boss：两个模型叠在一起（结在里、芒在外）—— "双模型对决"
    drawGptBlossom(g, { cx, cy, r: rr * 0.82, lobes: 6, phase: a.phase, weight: a.weight, dot: 0 });
    drawClaudeBurst(g, {
      cx, cy, r: rr,
      rays: a.rays, phase: a.phase + 0.7, weight: a.weight * 0.8, curve: a.curve,
    });
  }
  return true;
}

/** 敌人 id → 化身配置（给测试与文档用） */
export function avatarOf(enemyId) {
  return ENEMY_AVATAR[enemyId] || BOSS_AVATAR[enemyId] || null;
}
