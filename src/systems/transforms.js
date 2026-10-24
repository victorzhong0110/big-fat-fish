// 转化型装备的规则：改变「怎么打」，而不只是「打多疼」。
//
// 这一层存在的理由（DECISIONS §11.2b 的量化结论）：
// 34 张装备如果**全是"数字变大"**，构筑就只是加法 ——
// 实测里"会算账的机器人"和"随便拿的机器人"打到同一波、得分只差 19%，
// 拿哪张几乎不影响生死。**肉鸽的构筑必须是"不同的打法"，不是"更大的数字"。**
//
// 四张转化型装备对应四种打法：
//   连击熔炉 → 靠连击吃饭（打得越密越强，断了就掉）
//   背水     → 靠低血吃饭（越危险越强）
//   霜击     → 靠控制吃饭（把敌人拖慢，保持距离）
//   汲能     → 靠人头吃饭（杀得越多越强，滚雪球）
//
// 纯逻辑：不知道 Phaser、不知道 DOM，可单测。规则层只读这些函数的结果。

/** 连击增伤：每层连击 +perStack 伤害，最多 cap 层 */
export function comboDamageBonus(combo = 0, perStack = 0, cap = 0) {
  if (perStack <= 0) return 0;
  const stacks = cap > 0 ? Math.min(Math.max(0, combo), cap) : Math.max(0, combo);
  return Math.floor(stacks) * perStack;
}

/** 低血增伤：血量比例低于阈值时，伤害乘以 mul */
export function lowHpDamageMul(hp = 1, maxHp = 1, threshold = 0, mul = 1) {
  if (threshold <= 0 || mul <= 1) return 1;
  if (maxHp <= 0) return 1;
  return (hp / maxHp) < threshold ? mul : 1;
}

/** 击杀增伤：每击杀 1 个敌人 +perKill 伤害，最多 cap 层 */
export function killDamageBonus(kills = 0, perKill = 0, cap = 0) {
  if (perKill <= 0) return 0;
  const stacks = cap > 0 ? Math.min(Math.max(0, kills), cap) : Math.max(0, kills);
  return Math.floor(stacks) * perKill;
}

/**
 * 命中减速：返回速度系数（1 = 不减速）。
 * @param {number} slowOnHit 减速强度 0~1
 * @param {number} slowUntilMs 减速结束的绝对时刻（毫秒）
 * @param {number} nowMs 当前时刻（毫秒）
 */
export function slowFactor(slowOnHit = 0, slowUntilMs = 0, nowMs = 0) {
  if (!slowOnHit || slowUntilMs <= nowMs) return 1;
  return 1 - Math.min(0.9, Math.max(0, slowOnHit));
}
