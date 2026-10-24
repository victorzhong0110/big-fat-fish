// 装备：局内构筑的最小单位。
//
// 架构约定：装备只修改一张「属性表」（stats），不直接改玩法代码；
// 渲染层与规则层都只读这张表。这样「拿到什么卡」和「卡怎么生效」是两件事，
// 前者可以纯函数抽签，后者可以单测断言。
import { fireStats } from './upgrades.js';

/** 稀有度与抽卡权重 */
export const RARITIES = {
  common: { id: 'common', label: '普通', weight: 60 },
  rare: { id: 'rare', label: '稀有', weight: 30 },
  legendary: { id: 'legendary', label: '传说', weight: 10 },
};

/**
 * 属性表：全部是「最终值」，装备在其上做加法/乘法。
 * 命名后缀约定：Add = 直接加数值；Mul = 直接乘系数（1 为不变）。
 */
export const BASE_STATS = {
  // ── 攻击 ──
  damageAdd: 0,        // 每发额外伤害
  damageMul: 1,        // 伤害系数
  cooldownAddMs: 0,    // 射击间隔额外毫秒（负 = 更快）
  cooldownMul: 1,      // 射击间隔系数
  bulletsAdd: 0,       // 额外弹数
  spreadAddDeg: 0,     // 额外散布角
  bulletSpeedAdd: 0,   // 额外弹速
  rangeAdd: 0,         // 额外射程
  pierce: 0,           // 额外穿透次数
  critChance: 0,       // 暴击率 0..1
  critMultAdd: 0,      // 暴击倍率额外值（基础 2）

  // ── 生存 ──
  maxHpAdd: 0,         // 最大生命增减
  invulnAddMs: 0,      // 受击无敌时间额外毫秒
  thorns: 0,           // 碰撞反弹伤害
  shieldMax: 0,        // 护盾上限
  shieldPerChapter: 0, // 每章开始补充的护盾
  chapterHeal: 0,      // 每章开始回复的生命
  killHealEvery: 0,    // 每击杀 N 个敌人回 1 生命（0 = 关）
  killHealChance: 0,   // 每次击杀回复生命的概率

  // ── 机动 ──
  moveSpeedMul: 1,     // 移动速度系数
  dashCooldownMul: 1,  // 冲刺冷却系数
  // 「机动手段」的来源标记（第九轮加）。
  //
  // 为什么不能只看 moveSpeedMul：移速是**乘算**的 ——
  // 「迁徙根 +7%」遇上「凋零之种 -18%」就变成 -12%，
  // 于是"这张牌给了移速加成"这个事实被**抹掉**了，
  // 连带把「机动」这个**手段**也抹掉（实测：种子 1037 抽到迁徙根，
  // 面板上的手段却一个都没有 ⇒ 整局有效倍率恒为 1.0 ⇒ 第 18 波阵亡）。
  //
  // ⇒ 手段的判定改用**加法标记**：这张牌给了移速加成 ⇒ 它提供「机动」，
  // 哪怕最终移速被诅咒牌抵消掉了（那是诅咒牌的代价，不是这张牌的功劳被撤销）。
  moveSpeedBonus: 0,   // 移速加成点数（每 +5% 记 1 点）
  pickupRadiusAdd: 0,  // 拾取吸附半径额外像素

  // ── 规则 ──
  scoreMul: 1,         // 得分系数
  comboWindowAddMs: 0, // 连击窗口额外毫秒
  rageMs: 0,           // 受击后增伤持续毫秒
  rageMul: 1,          // 受击后增伤系数
  explodeDamage: 0,    // 击杀爆裂伤害
  explodeRadius: 0,    // 击杀爆裂半径
  enemyHpMul: 1,       // 敌人血量系数
  enemyCountMul: 1,    // 敌人数量系数（章内异象用）
  extraDraft: 0,       // 每次抽卡多几个选项

  // ── 转化（改变"怎么打"，不只是"打多疼"）──
  // 见 systems/transforms.js：这一组字段让构筑变成不同的打法，
  // 而不只是更大的数字（理由见 DECISIONS §11.2b 的量化结论）。
  comboDamagePerStack: 0, // 每层连击，每发伤害 +N
  comboDamageCap: 0,      // 连击增伤层数上限（0 = 不限）
  lowHpDamageMul: 1,      // 低血量时的伤害系数
  lowHpThreshold: 0,      // 触发低血增伤的血量比例（0 = 不触发）
  slowOnHit: 0,           // 命中减速强度（0~1）
  slowDurationMs: 0,      // 减速持续毫秒
  killDamagePerKill: 0,   // 每击杀 1 个敌人，每发伤害 +N
  killDamageCap: 0,       // 击杀增伤层数上限（0 = 不限）
};

/** 新建一张干净的属性表 */
export function createStats() {
  return { ...BASE_STATS };
}

const LIST = [];

/**
 * 登记一张装备。
 * @param {{id:string,name:string,rarity:string,tag:string,desc:string,cursed?:boolean,unlockCost?:number,apply:(s:object)=>void}} def
 */
function relic(def) {
  LIST.push({ unlockCost: 0, ...def });
  return def;
}

// ── 普通 ────────────────────────────────────────────────
relic({ id: 'dew_charm', name: '珍珠护符', rarity: 'common', tag: '生存', desc: '最大生命 +1', apply: (s) => { s.maxHpAdd += 1; } });
relic({ id: 'sturdy_calyx', name: '硬壳海螺', rarity: 'common', tag: '生存', desc: '最大生命 +2，移动速度 -8%', apply: (s) => { s.maxHpAdd += 2; s.moveSpeedMul *= 0.92; } });
relic({ id: 'polished_stamen', name: '磨亮鱼叉', rarity: 'common', tag: '攻击', desc: '每发伤害 +1', apply: (s) => { s.damageAdd += 1; } });
relic({ id: 'twin_petal', name: '双叉齐射', rarity: 'common', tag: '攻击', desc: '弹数 +1，射速 -6%', apply: (s) => { s.bulletsAdd += 1; s.cooldownMul *= 1.06; } });
relic({ id: 'light_pollen', name: '轻气鳔', rarity: 'common', tag: '攻击', desc: '射击间隔 -10%', apply: (s) => { s.cooldownMul *= 0.9; } });
relic({ id: 'swift_pollen', name: '疾流鱼苗', rarity: 'common', tag: '攻击', desc: '弹速 +90', apply: (s) => { s.bulletSpeedAdd += 90; } });
relic({ id: 'sharp_blade', name: '锐利鱼鳍', rarity: 'common', tag: '攻击', desc: '暴击率 +8%', apply: (s) => { s.critChance += 0.08; } });
relic({ id: 'fatal_scent', name: '致命鱼腥', rarity: 'common', tag: '攻击', desc: '暴击伤害 +70%', apply: (s) => { s.critMultAdd += 0.7; } });
relic({ id: 'nectary', name: '蜜囊', rarity: 'common', tag: '生存', desc: '每击杀 10 个敌人回复 1 生命', apply: (s) => { s.killHealEvery = 10; } });
relic({ id: 'thick_leaf', name: '厚鳞', rarity: 'common', tag: '生存', desc: '受击无敌时间 +0.45 秒', apply: (s) => { s.invulnAddMs += 450; } });
relic({ id: 'bouncing_pollen', name: '弹跳水珠', rarity: 'common', tag: '攻击', desc: '子弹可多穿透 1 个敌人；射击间隔 -3%', apply: (s) => { s.pierce += 1; s.cooldownMul *= 0.97; } });
relic({ id: 'migrating_root', name: '迁徙鳍', rarity: 'common', tag: '机动', desc: '移动速度 +7%', apply: (s) => { s.moveSpeedMul *= 1.07; s.moveSpeedBonus += 7; } });

// ── 稀有 ────────────────────────────────────────────────
relic({ id: 'thorn_spike', name: '海胆棘刺', rarity: 'rare', tag: '生存', desc: '撞到敌人时反弹 3 点伤害', apply: (s) => { s.thorns += 3; } });
relic({ id: 'spore_burst', unlockCost: 20, name: '墨泡爆散', rarity: 'rare', tag: '攻击', desc: '击杀时爆开，周围敌人受 2 点伤害；每发伤害 +1', apply: (s) => { s.explodeDamage += 2; s.explodeRadius += 62; s.damageAdd += 1; } });
relic({ id: 'frost_dew', unlockCost: 20, name: '霜露结晶', rarity: 'rare', tag: '生存', desc: '护盾上限 2，每章开始获得 1 点护盾', apply: (s) => { s.shieldMax += 2; s.shieldPerChapter += 1; } });
relic({ id: 'long_root', name: '长触须', rarity: 'rare', tag: '机动', desc: '冲刺冷却 -40%', apply: (s) => { s.dashCooldownMul *= 0.6; } });
relic({ id: 'twin_mirror', name: '双生眼镜', rarity: 'rare', tag: '攻击', desc: '弹数 +1，射速 -12%', apply: (s) => { s.bulletsAdd += 1; s.cooldownMul *= 1.12; } });
relic({ id: 'boiling_nectar', name: '沸腾热泉', rarity: 'rare', tag: '生存', desc: '最大生命 +1，射击间隔 -8%', apply: (s) => { s.maxHpAdd += 1; s.cooldownMul *= 0.92; } });
relic({ id: 'gold_core', name: '珍珠核心', rarity: 'rare', tag: '规则', desc: '得分 x1.25', apply: (s) => { s.scoreMul *= 1.25; } });
relic({ id: 'combo_wreath', name: '连击浪环', rarity: 'rare', tag: '规则', desc: '连击持续时间 +1.2 秒', apply: (s) => { s.comboWindowAddMs += 1200; } });
relic({ id: 'star_pollen', unlockCost: 20, name: '群星浮游', rarity: 'rare', tag: '攻击', desc: '弹道更分散，每发伤害 +1', apply: (s) => { s.spreadAddDeg += 7; s.damageAdd += 1; } });
relic({ id: 'life_leech', unlockCost: 20, name: '生命虹吸', rarity: 'rare', tag: '生存', desc: '击杀有 12% 概率回复 1 生命', apply: (s) => { s.killHealChance += 0.12; } });
relic({ id: 'bulwark_bud', name: '壁垒贝壳', rarity: 'rare', tag: '生存', desc: '每章开始回复 2 点生命', apply: (s) => { s.chapterHeal += 2; } });
relic({ id: 'vengeful_core', name: '复仇鱼心', rarity: 'rare', tag: '规则', desc: '受击后 3 秒内伤害 +50%', apply: (s) => { s.rageMs += 3000; s.rageMul *= 1.5; } });

// ── 传说（含诅咒）────────────────────────────────────────
relic({ id: 'wither_seed', name: '深渊之种', rarity: 'legendary', tag: '诅咒', cursed: true, desc: '每发伤害 +3，移动速度 -18%', apply: (s) => { s.damageAdd += 3; s.moveSpeedMul *= 0.82; } });
relic({ id: 'hollow_core', name: '空洞鱼心', rarity: 'legendary', tag: '诅咒', cursed: true, desc: '最大生命 -2，伤害 +2，射击间隔 -15%', apply: (s) => { s.maxHpAdd -= 2; s.damageAdd += 2; s.cooldownMul *= 0.85; } });
relic({ id: 'glass_petal', unlockCost: 35, name: '玻璃鳞片', rarity: 'legendary', tag: '诅咒', cursed: true, desc: '弹速 +170，最大生命 -1', apply: (s) => { s.bulletSpeedAdd += 170; s.maxHpAdd -= 1; } });
relic({ id: 'crown_of_petals', name: '千瓣浪冠', rarity: 'legendary', tag: '攻击', desc: '弹数 +2，伤害 -10%', apply: (s) => { s.bulletsAdd += 2; s.damageMul *= 0.9; } });
relic({ id: 'gardeners_oath', unlockCost: 35, name: '厨师的誓', rarity: 'legendary', tag: '生存', desc: '每章开始回 3 生命，敌人生命 +12%', apply: (s) => { s.chapterHeal += 3; s.enemyHpMul *= 1.12; } });
relic({ id: 'sacred_wreath', unlockCost: 35, name: '献祭光环', rarity: 'legendary', tag: '诅咒', cursed: true, desc: '每击杀 5 个敌人回 1 生命，最大生命 -1', apply: (s) => { s.killHealEvery = 5; s.maxHpAdd -= 1; } });
relic({ id: 'watchers_eye', unlockCost: 35, name: '灯塔之眼', rarity: 'legendary', tag: '规则', desc: '每次抽卡多一个选项，受击无敌 +0.2 秒', apply: (s) => { s.extraDraft += 1; s.invulnAddMs += 200; } });
relic({ id: 'rewind_bloom', unlockCost: 35, name: '洋流回溯', rarity: 'legendary', tag: '机动', desc: '冲刺冷却 -50%，移动速度 +5%', apply: (s) => { s.dashCooldownMul *= 0.5; s.moveSpeedMul *= 1.05; s.moveSpeedBonus += 10; } });
relic({ id: 'storm_pollen', name: '风暴暗流', rarity: 'legendary', tag: '攻击', desc: '弹数 +1，射击间隔 -7%', apply: (s) => { s.bulletsAdd += 1; s.cooldownMul *= 0.93; } });
relic({ id: 'golden_pollen', unlockCost: 35, name: '金粉浮游', rarity: 'legendary', tag: '规则', desc: '得分 x1.15，击杀 6% 概率回血', apply: (s) => { s.scoreMul *= 1.15; s.killHealChance += 0.06; } });

// ── 转化型（改变打法，不只是数字变大）────────────
// 这四张对应四种打法：靠连击 / 靠低血 / 靠控制 / 靠人头。
// 规则实现见 systems/transforms.js。
relic({ id: 'combo_forge', name: '连击漩涡', rarity: 'rare', tag: '攻击', desc: '每层连击，每发伤害 +1（最多 +6）', apply: (s) => { s.comboDamagePerStack += 1; s.comboDamageCap = Math.max(s.comboDamageCap, 6); } });
relic({ id: 'frost_edge', name: '霜之鳍', rarity: 'rare', tag: '攻击', desc: '命中让敌人减速 35%，持续 0.8 秒；每发伤害 +1', apply: (s) => { s.slowOnHit = Math.max(s.slowOnHit, 0.35); s.slowDurationMs = Math.max(s.slowDurationMs, 800); s.damageAdd += 1; } });
relic({ id: 'last_stand', unlockCost: 35, name: '背水', rarity: 'legendary', tag: '诅咒', cursed: true, desc: '生命低于 40% 时伤害 x1.8，最大生命 -1', apply: (s) => { s.lowHpDamageMul *= 1.8; s.lowHpThreshold = 0.4; s.maxHpAdd -= 1; } });
relic({ id: 'soul_drain', unlockCost: 35, name: '汲能触手', rarity: 'legendary', tag: '规则', desc: '每击杀 1 个敌人，每发伤害 +1（最多 +12）', apply: (s) => { s.killDamagePerKill += 1; s.killDamageCap = Math.max(s.killDamageCap, 12); } });

// ── 机动（第四轮补的：原来只有 3 件，「疾行」流派几乎凑不起来）────
relic({ id: 'light_step', name: '滑鳍', rarity: 'common', tag: '机动', desc: '移动速度 +5%', apply: (s) => { s.moveSpeedMul *= 1.05; s.moveSpeedBonus += 5; } });
relic({ id: 'swift_shadow', name: '疾影', rarity: 'rare', tag: '机动', desc: '冲刺冷却 -25%', apply: (s) => { s.dashCooldownMul *= 0.75; } });
relic({ id: 'guide_flower', name: '引路灯', rarity: 'common', tag: '机动', desc: '拾取吸附半径 +35', apply: (s) => { s.pickupRadiusAdd += 35; } });

// ── 手段（第九轮补的：让"对症"这件事有牌可打）────────────
//
// 为什么补这三张：第九轮把克制变成了真机制（伤害 ×1.6），
// 而**每个手段必须至少有三张牌能提供** —— 否则"抽到对症的牌"就是运气，
// 不是决策。补之前：slow 只有「霜之锋」1 张、area 只有「墨泡爆散」1 张。
// 补之后：slow 3 张、area 4 张、burst 4 张、mobility 4 张。
relic({ id: 'chill_petal', name: '霜纹鳞片', rarity: 'common', tag: '攻击', desc: '命中让敌人减速 25%，持续 0.7 秒；射击间隔 -4%', apply: (s) => { s.slowOnHit = Math.max(s.slowOnHit, 0.25); s.slowDurationMs = Math.max(s.slowDurationMs, 700); s.cooldownMul *= 0.96; } });
relic({ id: 'frost_core', unlockCost: 35, name: '霜之心', rarity: 'legendary', tag: '攻击', desc: '命中让敌人减速 45%，持续 1.2 秒；每发伤害 +1', apply: (s) => { s.slowOnHit = Math.max(s.slowOnHit, 0.45); s.slowDurationMs = Math.max(s.slowDurationMs, 1200); s.damageAdd += 1; } });
relic({ id: 'pollen_burst', unlockCost: 20, name: '墨潮爆散', rarity: 'rare', tag: '攻击', desc: '击杀时爆开，波及范围很大；每发伤害 +1', apply: (s) => { s.explodeDamage += 3; s.explodeRadius += 110; s.damageAdd += 1; } });

/**
 * 「深化」：把一张已经拿到的装备再叠一层。
 *
 * 为什么需要：肉鸽里构筑的**纵向深度**（把同一张牌变强）和横向广度（拿不同的牌）一样重要。
 * 本作一局只有 4 次抽卡，横向的牌池已经有 41 张，**纵向反而是空的** ——
 * 玩家拿到了「连击熔炉」却没法让它更强。
 *
 * 默认规则是「效果再套一次」（所以 `apply` 必须写成可叠加的形式：
 * `+=` 而不是 `=`）。少数装备的效果不是可叠加的（"每 10 杀回 1 血"、
 * "减速 35%"），它们在这里单独定义深化规则。
 */
const DEEPEN_OVERRIDES = {
  // 「每 10 个敌人回 1 血」→ 间隔变短
  nectary: (s) => { s.killHealEvery = Math.max(3, s.killHealEvery - 5); },
  // 减速 35% / 0.8 秒 → 更狠一点
  frost_edge: (s) => { s.slowOnHit = Math.min(0.85, s.slowOnHit + 0.15); s.slowDurationMs += 300; },
  // 第九轮新增的两张减速牌：同样用 Math.max 写了强度 ⇒ 必须给深化规则，
  // 否则"深化了但没变化"（单测当场抓到）。
  chill_petal: (s) => { s.slowOnHit = Math.min(0.85, s.slowOnHit + 0.1); s.slowDurationMs += 200; },
  frost_core: (s) => { s.slowOnHit = Math.min(0.9, s.slowOnHit + 0.15); s.slowDurationMs += 400; },

  // ── 第九轮：让「深化」也能**给手段** ──────────────────────────
  //
  // 为什么需要（实测逼出来的）：
  // 「对症」是这一轮的核心机制，但**抽牌是随机的** ——
  // 种子 1037 整整十二波一张对症牌都没抽到（有效倍率恒为 1.0）⇒ 第 18 波阵亡。
  // ⇒ 如果"抽不到对症牌"没有任何补救，这条机制就是**纯运气**：抽到就赢，抽不到就死。
  //
  // ⇒ 深化成为**唯一的补救路径**：把一张抽到的普通牌，深化成对症牌。
  //
  // 为什么只给这 5 张（而不是按标签统一给）：
  // 手段必须**语义上说得通** —— "锋利的磨砺石"给暴击说得通，
  // "加血的护符"给减速就说不通了。
  // 深化第一层是原效果（apply），第二层起才走这些覆盖。
  polished_stamen: (s) => { s.critChance = Math.min(0.8, s.critChance + 0.08); },   // ⇒ 爆发
  sharp_blade: (s) => { s.critChance = Math.min(0.8, s.critChance + 0.08); },        // ⇒ 爆发
  twin_petal: (s) => { s.pierce += 1; },                                              // ⇒ 范围
  twin_mirror: (s) => { s.pierce += 1; },                                             // ⇒ 范围
  storm_pollen: (s) => { s.pierce += 1; },                                            // ⇒ 范围
};

/**
 * 「第二层起」的标签专属加成。
 *
 * 为什么是"按标签"而不是"逐张手写"：逐张写要 41 条规则 + 41 份数值，
 * 而那些数值**没法验证**（没有真人试玩，见 DECISIONS §14.19）。
 * 按标签写只有 5 条，而且**每一张装备的第二层都有意义**——
 * 玩家深化任何一张牌，都能感觉到"这张的流派被推深了一层"。
 */
export const DEEPEN_TAG_BONUS = {
  攻击: { add: { damageAdd: 1 } },
  生存: { add: { maxHpAdd: 1 } },
  机动: { mul: { moveSpeedMul: 1.05 } },
  规则: { mul: { scoreMul: 1.08 } },
  诅咒: { add: { damageAdd: 1, maxHpAdd: -1 } },
};

/**
 * 给某一层深化套上标签专属加成。
 * @param {object} stats 属性表（原地修改）
 * @param {string} tag 装备标签
 */
export function applyDeepenTagBonus(stats, tag) {
  const b = DEEPEN_TAG_BONUS[tag];
  if (!b) return stats;
  for (const [k, v] of Object.entries(b.add || {})) stats[k] = (stats[k] ?? 0) + v;
  for (const [k, v] of Object.entries(b.mul || {})) stats[k] = (stats[k] ?? 1) * v;
  return stats;
}

/**
 * 深化后的装备（描述 + 效果）。
 * @param {string} id 装备 id
 */
export function deepenRelic(id) {
  const r = relicById(id);
  if (!r) return null;
  const extra = DEEPEN_OVERRIDES[id] || null;
  return {
    ...r,
    id: `${id}#deep`,
    name: `${r.name}·深`,
    deep: true,
    apply: (s) => {
      r.apply(s);
      if (extra) extra(s);
    },
  };
}

export const RELICS = LIST;
export const RELIC_BY_ID = Object.fromEntries(LIST.map((r) => [r.id, r]));

export function relicById(id) {
  return RELIC_BY_ID[id] || null;
}

/** 按 id 列表算出最终属性表（纯函数，不改传入对象） */
export function applyRelics(ids = []) {
  const stats = createStats();
  for (const id of ids) {
    const r = relicById(id);
    if (r) r.apply(stats);
  }
  return stats;
}

/** 属性表 → 实际射击参数（叠加在火力等级之上） */
export function deriveFireStats(fireLevel, stats = createStats()) {
  const base = fireStats(fireLevel);
  return {
    level: base.level,
    damage: Math.max(1, Math.round(base.damage * stats.damageMul + stats.damageAdd)),
    bullets: Math.max(1, base.bullets + stats.bulletsAdd),
    spreadDeg: Math.max(0, base.spreadDeg + stats.spreadAddDeg),
    cooldownMs: Math.max(45, Math.round(base.cooldownMs * stats.cooldownMul + stats.cooldownAddMs)),
    bulletSpeed: Math.max(140, base.bulletSpeed + stats.bulletSpeedAdd),
    range: Math.max(160, base.range + stats.rangeAdd),
    pierce: Math.max(0, stats.pierce),
    critChance: Math.min(0.8, stats.critChance),
    critMult: 2 + stats.critMultAdd,
  };
}
