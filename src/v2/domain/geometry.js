// @ts-check
/**
 * 纯几何计算，无世界状态。
 * Incremental V2 implementation; remaining TODO bodies are intentionally unavailable.
 * Calls describe allowed dependencies; per-export implementation status is in the manifest.
 */

/**
 * 归一化输入，零向量保持零，不产生NaN。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').Vec2} vector
 * @returns {import('../contracts.d.ts').Vec2}
 */
export function normalizeVector(vector) {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) throw new RangeError('Non-finite vector');
  const scale = Math.max(Math.abs(vector.x), Math.abs(vector.y));
  if (scale === 0) return { x: 0, y: 0 };
  const x = vector.x / scale, y = vector.y / scale;
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

/**
 * 计算高速移动圆的首个命中时间比例，避免穿透。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').Vec2} from
 * @param {import('../contracts.d.ts').Vec2} to
 * @param {number} radius
 * @param {import('../contracts.d.ts').Vec2} target
 * @param {number} targetRadius
 * @returns {number | null}
 */
export function intersectSweptCircles(from, to, radius, target, targetRadius) {
  if (![from.x, from.y, to.x, to.y, target.x, target.y, radius, targetRadius].every(Number.isFinite) || radius < 0 || targetRadius < 0) throw new RangeError('Invalid sweep');
  const x = from.x - target.x, y = from.y - target.y;
  const dx = to.x - from.x, dy = to.y - from.y;
  const r = radius + targetRadius;
  const c = x * x + y * y - r * r;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = x * dx + y * dy;
  if (b >= 0) return null;
  const discriminant = b * b - a * c;
  if (discriminant < -Number.EPSILON * Math.max(b * b, a * Math.abs(c)) * 8) return null;
  // c / (-b + sqrt(D)) avoids cancellation when the first contact is very close.
  const time = c / (-b + Math.sqrt(Math.max(0, discriminant)));
  return time >= 0 && time <= 1 ? time : null;
}

/**
 * 判定侧后弱点弧，包含08指定边界。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').Vec2} center
 * @param {number} facingRadians
 * @param {import('../contracts.d.ts').Vec2} contact
 * @param {number} arcDegrees
 * @returns {boolean}
 */
export function isContactWithinArc(center, facingRadians, contact, arcDegrees) {
  if (![center.x, center.y, facingRadians, contact.x, contact.y, arcDegrees].every(Number.isFinite) || arcDegrees < 0 || arcDegrees > 360) throw new RangeError('Invalid weak arc');
  const x = contact.x - center.x, y = contact.y - center.y;
  if (x === 0 && y === 0) return false;
  const angle = Math.atan2(y, x) - facingRadians;
  const forwardAngle = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
  return forwardAngle + 1e-12 >= Math.PI - arcDegrees * Math.PI / 360;
}

/**
 * 供稳定目标/距离排序；相同距离由上层按entityId裁决。
 * 调用阶段：query；下游模式：sequence。
 * 状态权限：只读输入，返回计划/值；不得修改调用者状态。
 * @calls 无内部公开函数。
 * @param {import('../contracts.d.ts').Vec2} a
 * @param {import('../contracts.d.ts').Vec2} b
 * @returns {number}
 */
export function distanceSquared(a, b) {
  if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) throw new RangeError('Non-finite position');
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

/** 核心生成校验与渲染共享相机边界；只传视野尺寸，不采样渲染帧中的玩家位置。
 * @calls 无内部公开函数。
 * @param {Readonly<import('../contracts.d.ts').Vec2>} position
 * @param {Readonly<{width:number;height:number}>} map
 * @param {Readonly<{width:number;height:number}>} viewport
 * @returns {{x:number;y:number;width:number;height:number}}
 */
export function computeCameraBounds(position,map,viewport){
 if(![position.x,position.y,map.width,map.height,viewport.width,viewport.height].every(Number.isFinite)||map.width<=0||map.height<=0||viewport.width<=0||viewport.height<=0)throw new Error('Invalid camera geometry');
 return {x:Math.max(0,Math.min(map.width-viewport.width,position.x-viewport.width/2)),y:Math.max(0,Math.min(map.height-viewport.height,position.y-viewport.height/2)),width:viewport.width,height:viewport.height};
}
