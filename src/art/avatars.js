// ── 敌人的「模型化身」：Claude Buddy 的物种 × Codex Buddies 的小工人 ──
//
// ⚠️ **不是商标，也不是 Dots 那种 agent 形象** —— 是两个产品里的**宠物（pet）**：
//
// ① **Claude Buddy**（Claude Code 终端里的电子宠物）
//    18 个物种的**像素小动物**：鸭 / 鹅 / 猫 / 兔 / 猫头鹰 / 企鹅 / 龟 / 蜗牛 /
//    龙 / 章鱼 / 六角恐龙 / 幽灵 / 机器人 / 水滴 / 仙人掌 / 蘑菇 / 胖球 / **水豚**
//    （社区共识：水豚是 Claude 4.6 的内部代号）。
//    ⇒ 画法：**像素小动物**，**陶土橙**（配 Claude 的橙发女仆）。
//
// ② **Codex Buddies**（OpenAI Codex 里的宠物）
//    一群**像素小工人**：会走、会坐在笔记本前、会做出反应、也会"失败"。
//    ⇒ 画法：**方块小工人**，**淡紫**（配 GPT 的白发角娘）。
//
// 🧭 **为什么用像素**：这两个 pet 本来就是像素画，而本项目是**零素材**游戏
// （所有图形运行时用 Phaser Graphics 生成）⇒ 敌人用**方块格**画，
// 与 Clawd / 小工人 的质感天然同构，而且改一个格子就能调造型。
//
// 🔴 **版权边界**：两个 pet 都是各自产品的**受版权保护的角色**。
//    本项目**不复制任何官方像素图 / 官方美术资源**，而是用代码**重新画一遍同类的形体**
//    （借鉴的是公开可见的造型规律：像素小动物的轮廓、方块工人的构造），
//    坐标与细节全部自定。商标与角色版权归 OpenAI / Anthropic 所有；
//    本作是**致敬式的虚构怪物**，不暗示任何授权、赞助或关联。
//
// 📐 **纯逻辑层**：不 import Phaser、不碰 DOM —— 只往传入的 Graphics 上画，
// 因此可以单测（见 tests/avatars.test.js）并离屏渲染（见 src/art/graphics-probe.js）。

/* ── 配色：两套品牌色 + 少量中性色 ──────────────────────────────
 * Claude 侧：陶土橙（Anthropic 官方 primary accent #D97757 的家族）
 * GPT 侧：淡紫（ChatGPT 界面紫 #AB68FF 的家族）
 */
export const CLAUDE_COLOR = 0xd97757;   // 陶土橙（主）
export const CLAUDE_LIGHT = 0xf2a888;  // 浅橙（高光）
export const CLAUDE_DARK = 0xa8553a;   // 深橙（描边/阴影）
export const GPT_COLOR = 0xa98cf0;     // 淡紫（主）
export const GPT_LIGHT = 0xcfc0f5;     // 浅紫（高光）
export const GPT_DARK = 0x6f4fc0;      // 深紫
export const WHITE = 0xf7f4ff;
export const OUTLINE = 0x241b33;       // 眼/描边
export const ACCENT = 0xffd34d;        // 一点黄（喙/灯）

/** GPT 家族的主色（图例/深色描边用） */
export const GPT_COLOR_MAIN = GPT_COLOR;

/* ──────────────────────────────────────────────────────────────
 *  像素网格系统
 * ────────────────────────────────────────────────────────────── */

const GRID = 16;   // 每个精灵画在 16×16 的格子上

/**
 * 把「格子坐标」画到 Graphics 上。
 * 格子坐标原点在精灵左上角，x/y 往右/往下。
 * @param {Phaser.GameObjects.Graphics} g
 * @param {{cx:number, cy:number, size:number}} box
 * @param {Array<[number,number,number,number,number]>} cells [x,y,w,h,color]
 */
function drawCells(g, box, cells) {
  const u = box.size / GRID;
  const x0 = box.cx - box.size / 2;
  const y0 = box.cy - box.size / 2;
  for (const [x, y, w, h, c] of cells) {
    if (x < 0 || y < 0 || x + w > GRID || y + h > GRID) {
      throw new Error(`精灵格子越界：x=${x} y=${y} w=${w} h=${h}（网格 ${GRID}×${GRID}）`);
    }
    g.fillStyle(c, 1);
    g.fillRect(x0 + x * u, y0 + y * u, w * u, h * u);
  }
}

/* ──────────────────────────────────────────────────────────────
 *  Claude Buddy 的物种（陶土橙）
 * ────────────────────────────────────────────────────────────── */

/** 每个物种 = 16×16 的方格表：[x, y, w, h, 颜色] */
export const BUDDY_SPECIES = {
  // 猫 —— 追击型
  cat: [
    [5, 3, 2, 2, CLAUDE_COLOR], [10, 3, 2, 2, CLAUDE_COLOR],
    [6, 4, 1, 1, CLAUDE_LIGHT], [11, 4, 1, 1, CLAUDE_LIGHT],
    [5, 5, 6, 5, CLAUDE_COLOR],
    [7, 7, 1, 1, OUTLINE], [10, 7, 1, 1, OUTLINE],
    [4, 9, 8, 5, CLAUDE_COLOR],
    [11, 12, 3, 1, CLAUDE_COLOR],
    [5, 14, 2, 1, CLAUDE_DARK], [9, 14, 2, 1, CLAUDE_DARK],
  ],
  // 猫头鹰 —— 远程
  owl: [
    [4, 2, 2, 2, CLAUDE_COLOR], [10, 2, 2, 2, CLAUDE_COLOR],
    [4, 4, 8, 9, CLAUDE_COLOR],
    [6, 5, 2, 3, WHITE], [9, 5, 2, 3, WHITE],
    [6, 6, 2, 1, OUTLINE], [9, 6, 2, 1, OUTLINE],
    [7, 8, 2, 1, ACCENT],
    [6, 13, 1, 1, CLAUDE_DARK], [9, 13, 1, 1, CLAUDE_DARK],
  ],
  // 鸭子 —— 成群
  duck: [
    [9, 4, 4, 4, CLAUDE_COLOR],
    [11, 5, 1, 1, OUTLINE],
    [13, 6, 2, 1, ACCENT],
    [3, 8, 10, 5, CLAUDE_COLOR],
    [5, 9, 4, 3, CLAUDE_LIGHT],
    [5, 13, 2, 1, ACCENT], [9, 13, 2, 1, ACCENT],
  ],
  // 蘑菇 —— 死亡后分裂
  mushroom: [
    [3, 4, 10, 5, CLAUDE_COLOR],
    [5, 5, 2, 2, WHITE], [9, 6, 2, 2, WHITE], [7, 4, 1, 1, WHITE],
    [6, 9, 4, 6, CLAUDE_LIGHT],
    [7, 11, 1, 1, OUTLINE], [9, 11, 1, 1, OUTLINE],
  ],
  // 水滴 —— 死亡留一滩（自爆）
  blob: [
    [5, 3, 6, 4, CLAUDE_COLOR],
    [4, 6, 8, 5, CLAUDE_COLOR],
    [6, 5, 2, 1, WHITE],
    [6, 8, 1, 2, OUTLINE], [9, 8, 1, 2, OUTLINE],
    [5, 11, 2, 3, CLAUDE_COLOR], [7, 12, 1, 3, CLAUDE_COLOR],
    [9, 11, 2, 3, CLAUDE_COLOR],
  ],
  // 企鹅 —— 直线冲刺
  penguin: [
    [4, 3, 8, 11, CLAUDE_COLOR],
    [6, 7, 4, 6, WHITE],
    [6, 5, 1, 1, OUTLINE], [9, 5, 1, 1, OUTLINE],
    [7, 7, 2, 1, ACCENT],
    [3, 6, 1, 5, CLAUDE_DARK], [12, 6, 1, 5, CLAUDE_DARK],
    [5, 14, 2, 1, ACCENT], [9, 14, 2, 1, ACCENT],
  ],
  // 章鱼 —— 喷墨黏住（减速）
  octopus: [
    [5, 3, 6, 6, CLAUDE_COLOR],
    [7, 6, 1, 1, OUTLINE], [9, 6, 1, 1, OUTLINE],
    [3, 9, 2, 5, CLAUDE_COLOR],
    [6, 10, 1, 5, CLAUDE_COLOR],
    [9, 10, 1, 5, CLAUDE_COLOR],
    [11, 9, 2, 5, CLAUDE_COLOR],
  ],
  // 幽灵 —— 飘散的碎片
  ghost: [
    [5, 3, 6, 8, WHITE],
    [5, 11, 2, 2, WHITE], [8, 11, 1, 3, WHITE], [10, 11, 2, 2, WHITE],
    [7, 6, 1, 2, OUTLINE], [9, 6, 1, 2, OUTLINE],
    [8, 9, 1, 1, OUTLINE],
  ],
  // 水豚 —— 传说稀有度（BOSS）
  capybara: [
    [3, 7, 9, 6, CLAUDE_COLOR],
    [10, 6, 5, 4, CLAUDE_COLOR],
    [10, 4, 1, 2, CLAUDE_COLOR], [13, 4, 1, 2, CLAUDE_COLOR],
    [12, 7, 1, 1, OUTLINE],
    [14, 8, 1, 2, CLAUDE_LIGHT],
    [5, 13, 2, 2, CLAUDE_DARK], [8, 13, 2, 2, CLAUDE_DARK],
  ],
  // 龙 —— 传说稀有度（终局 BOSS）
  dragon: [
    [2, 4, 3, 4, CLAUDE_COLOR],          // 立起来的翼
    [2, 12, 3, 1, CLAUDE_COLOR],         // 尾
    [4, 9, 7, 4, CLAUDE_COLOR],          // 身体
    [10, 6, 2, 2, CLAUDE_COLOR],         // 脖子
    [9, 3, 5, 4, CLAUDE_COLOR],          // 头
    [10, 2, 1, 2, CLAUDE_COLOR], [12, 2, 1, 2, CLAUDE_COLOR],  // 角
    [12, 4, 1, 1, OUTLINE],              // 眼
    [5, 13, 2, 1, CLAUDE_DARK], [9, 13, 2, 1, CLAUDE_DARK],
  ],
  // 六角恐龙 —— 稀有（BOSS）
  axolotl: [
    [4, 3, 2, 1, CLAUDE_LIGHT], [3, 4, 1, 2, CLAUDE_LIGHT],     // 左鳃
    [10, 3, 2, 1, CLAUDE_LIGHT], [12, 4, 1, 2, CLAUDE_LIGHT],    // 右鳃
    [5, 4, 6, 4, CLAUDE_COLOR],                                 // 头
    [6, 5, 1, 1, OUTLINE], [9, 5, 1, 1, OUTLINE],
    [4, 8, 7, 5, CLAUDE_COLOR],                                 // 身
    [11, 9, 4, 1, CLAUDE_COLOR],                                // 尾
    [4, 13, 2, 1, CLAUDE_DARK], [8, 13, 2, 1, CLAUDE_DARK],
  ],
  // 巨型蘑菇王 —— 稀有（BOSS）
  mushroomKing: [
    [2, 3, 12, 6, CLAUDE_COLOR],
    [4, 4, 2, 2, WHITE], [9, 5, 2, 2, WHITE], [7, 3, 1, 1, WHITE],
    [5, 9, 6, 6, CLAUDE_LIGHT],
    [6, 11, 1, 1, OUTLINE], [9, 11, 1, 1, OUTLINE],
  ],
};

/* ──────────────────────────────────────────────────────────────
 *  Codex Buddies 的小工人（淡紫）
 * ────────────────────────────────────────────────────────────── */

/** 小工人：方块头 +  visor 屏 + 身体 + 手臂 + 腿 */
export const CODEX_BUDDIES = {
  // 基础款
  worker: [
    [4, 2, 8, 2, GPT_COLOR],          // 帽檐
    [5, 4, 6, 5, GPT_COLOR],          // 头
    [6, 6, 4, 2, OUTLINE],            // visor
    [7, 7, 1, 1, GPT_LIGHT], [9, 7, 1, 1, GPT_LIGHT],
    [5, 10, 6, 4, GPT_COLOR],         // 身体
    [3, 10, 1, 3, GPT_COLOR], [12, 10, 1, 3, GPT_COLOR],   // 手臂
    [6, 14, 1, 1, GPT_DARK], [9, 14, 1, 1, GPT_DARK],     // 腿
  ],
  // 抱着快递箱跑（追击）
  courier: [
    [4, 2, 8, 2, GPT_COLOR],
    [5, 4, 6, 5, GPT_COLOR],
    [6, 6, 4, 2, OUTLINE],
    [7, 7, 1, 1, GPT_LIGHT], [9, 7, 1, 1, GPT_LIGHT],
    [5, 10, 6, 4, GPT_COLOR],
    [3, 10, 1, 3, GPT_COLOR],
    [11, 9, 3, 3, ACCENT],            // 快递箱
    [12, 8, 1, 1, GPT_DARK],
    [6, 14, 1, 1, GPT_DARK], [9, 14, 1, 1, GPT_DARK],
  ],
  // 成群（背后还有两个小脑袋）
  crowd: [
    [2, 3, 4, 3, GPT_DARK], [10, 3, 4, 3, GPT_DARK],
    [3, 4, 1, 1, GPT_LIGHT], [11, 4, 1, 1, GPT_LIGHT],
    [4, 2, 8, 2, GPT_COLOR],
    [5, 4, 6, 5, GPT_COLOR],
    [6, 6, 4, 2, OUTLINE],
    [7, 7, 1, 1, GPT_LIGHT], [9, 7, 1, 1, GPT_LIGHT],
    [5, 10, 6, 4, GPT_COLOR],
    [3, 10, 1, 3, GPT_COLOR], [12, 10, 1, 3, GPT_COLOR],
    [6, 14, 1, 1, GPT_DARK], [9, 14, 1, 1, GPT_DARK],
  ],
  // 重装机兵（坦克）
  heavy: [
    [7, 1, 1, 2, OUTLINE], [7, 1, 1, 1, ACCENT],
    [3, 2, 10, 6, GPT_COLOR],
    [5, 4, 6, 3, OUTLINE],
    [6, 5, 1, 1, GPT_LIGHT], [8, 5, 1, 1, GPT_LIGHT], [10, 5, 1, 1, GPT_LIGHT],
    [4, 9, 8, 5, GPT_COLOR],
    [3, 9, 1, 4, GPT_DARK], [12, 9, 1, 4, GPT_DARK],
    [5, 14, 2, 1, GPT_DARK], [9, 14, 2, 1, GPT_DARK],
  ],
  // 坐在笔记本前（会"工作"的小工人）
  coder: [
    [4, 2, 8, 2, GPT_COLOR],
    [5, 4, 6, 5, GPT_COLOR],
    [6, 6, 4, 2, OUTLINE],
    [7, 7, 1, 1, GPT_LIGHT], [9, 7, 1, 1, GPT_LIGHT],
    [5, 10, 6, 4, GPT_COLOR],
    [3, 10, 1, 3, GPT_COLOR], [12, 10, 1, 3, GPT_COLOR],
    [4, 12, 8, 2, OUTLINE],            // 笔记本
    [5, 12, 6, 1, GPT_LIGHT],
    [6, 14, 1, 1, GPT_DARK], [9, 14, 1, 1, GPT_DARK],
  ],
  // 大型工兵（BOSS）
  foreman: [
    [7, 1, 1, 2, OUTLINE], [7, 1, 1, 1, ACCENT],
    [3, 2, 10, 7, GPT_COLOR],
    [4, 4, 6, 4, OUTLINE],
    [5, 5, 1, 1, GPT_LIGHT], [7, 5, 1, 1, GPT_LIGHT],
    [8, 5, 1, 1, GPT_LIGHT], [10, 5, 1, 1, GPT_LIGHT],
    [4, 10, 8, 4, GPT_COLOR],
    [3, 10, 1, 4, GPT_DARK], [12, 10, 1, 4, GPT_DARK],
    [5, 14, 2, 1, GPT_DARK], [9, 14, 2, 1, GPT_DARK],
  ],
};

/* ──────────────────────────────────────────────────────────────
 *  敌种 → 化身
 * ────────────────────────────────────────────────────────────── */

/**
 * 每个敌种归到哪个阵营，以及它是哪个宠物。
 *
 * 阵营的视觉标识用**形状 + 配色**两件事：
 *   · **Claude 系** = Claude Buddy 的小动物（**陶土橙**、圆滚滚）；
 *   · **GPT 系** = Codex Buddies 的小工人（**淡紫**、方块头 visor）。
 * ⇒ 玩家扫一眼战场就能分出两族，**不依赖颜色**（色觉障碍也读得出形状）。
 */
export const ENEMY_AVATAR = {
  // ── Claude 系（陶土橙的小动物）──────────────────────────────
  spore: { model: 'claude', pet: 'owl', name: '猫头鹰' },
  moth: { model: 'claude', pet: 'blob', name: '水滴' },
  charger: { model: 'claude', pet: 'penguin', name: '企鹅' },
  bud: { model: 'claude', pet: 'mushroom', name: '蘑菇' },
  weaver: { model: 'claude', pet: 'octopus', name: '章鱼' },
  // ── GPT 系（淡紫的小工人）─────────────────────────────────
  crawler: { model: 'gpt', pet: 'courier', name: '快递小工' },
  swarm: { model: 'gpt', pet: 'crowd', name: '打工潮' },
  husk: { model: 'gpt', pet: 'heavy', name: '重装工兵' },
  huskling: { model: 'gpt', pet: 'worker', name: '小零工' },
};

/** 4 个 Boss 各自的化身 */
export const BOSS_AVATAR = {
  boss: { model: 'claude', pet: 'dragon', name: '小龙' },
  boss_stone: { model: 'gpt', pet: 'foreman', name: '工头' },
  boss_pollen: { model: 'claude', pet: 'mushroomKing', name: '蘑菇王' },
  boss_thorn: { model: 'claude', pet: 'axolotl', name: '六角龙' },
};

/**
 * 🔴 **加载时自检**：每个精灵的**所有格子角点**必须落在「半径 8 格」的圆内。
 *
 * 为什么是 8：精灵画在 16×16 的网格上、中心在 (8,8)，
 * 而 `r` 的定义是**外接半径** ⟹ 格子角点到中心的距离 ≤ 8 格 ⟹ 视觉大小 = 碰撞大小。
 * 早先「重装工兵的手臂伸到 1.06r」就是这么被抓住的（靠单测太晚，改成加载即报）。
 */
function assertFitsRadius(cells, name) {
  for (const [x, y, w, h] of cells) {
    for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      const d = Math.hypot(px - GRID / 2, py - GRID / 2);
      if (d > GRID / 2) {
        throw new Error(`精灵「${name}」的格子 (${x},${y},${w},${h}) 超出半径 ${GRID / 2} 格（角点距 ${d.toFixed(2)}）`);
      }
    }
  }
}
if (!process.env.AVATAR_SKIP_ASSERT) {
  for (const [name, cells] of Object.entries(BUDDY_SPECIES)) assertFitsRadius(cells, name);
  for (const [name, cells] of Object.entries(CODEX_BUDDIES)) assertFitsRadius(cells, name);
}

/** 某敌种是哪个阵营（给 HUD / 图例用） */
export function modelOf(enemyId) {
  const a = ENEMY_AVATAR[enemyId] || BOSS_AVATAR[enemyId];
  return a ? a.model : 'gpt';
}

/** 某敌种的主色（给 HUD 图例 / 威胁面板的小圆点用） */
export function colorOf(enemyId) {
  const m = modelOf(enemyId);
  if (m === 'claude') return CLAUDE_COLOR;
  if (m === 'both') return ACCENT;
  return GPT_COLOR;
}

/** 某敌种的名字（宠物名；给 HUD 用） */
export function petNameOf(enemyId) {
  const a = ENEMY_AVATAR[enemyId] || BOSS_AVATAR[enemyId];
  return a ? a.name : '';
}

/** 某敌种的阵营标签（给 HUD 用） */
export function modelLabelOf(enemyId) {
  const m = modelOf(enemyId);
  if (m === 'claude') return 'Claude';
  if (m === 'both') return 'GPT × Claude';
  return 'GPT';
}

/** 画一只宠物/小工人 */
export function drawPet(g, o) {
  const { cx, cy, r, pet } = o;
  const table = BUDDY_SPECIES[pet] || CODEX_BUDDIES[pet];
  if (!table) return false;
  drawCells(g, { cx, cy, size: r * 2 }, table);
  return true;
}

/**
 * 按敌种 id 画它的化身。
 * @param {Phaser.GameObjects.Graphics} g
 * @param {string} enemyId
 * @param {{cx:number, cy:number, r:number}} box 中心与**外接半径**
 */
export function drawAvatar(g, enemyId, box) {
  const a = ENEMY_AVATAR[enemyId] || BOSS_AVATAR[enemyId];
  if (!a) return false;
  return drawPet(g, { cx: box.cx, cy: box.cy, r: box.r, pet: a.pet });
}

/** 敌人 id → 化身配置（给测试与文档用） */
export function avatarOf(enemyId) {
  return ENEMY_AVATAR[enemyId] || BOSS_AVATAR[enemyId] || null;
}
