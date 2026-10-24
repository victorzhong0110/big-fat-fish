// 敌人化身（GPT Blossom / Claude 星芒）的**离屏渲染器**。
//
// 用途：让「纯几何、不 import Phaser」的化身代码能在 **Node 里画出来**——
// 于是（a）单测能断言画出来的形状；（b）预览脚本能出一张 PNG；
// （c）改一个参数就能立刻看到效果，不必启动整个游戏。
//
// 它只实现 Phaser Graphics 里 avatars.js 用到的那几个方法，
// 把调用录成 SVG 的图元。
//
// 📐 **不 import Phaser、不碰 DOM** ⇒ 纯逻辑层，可单测。
// ⚠️ 本文件**只被测试与预览脚本引用**，游戏代码不引用它 ⇒ 不会进打包产物。

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const op = (a) => (a >= 1 ? '' : ` opacity="${a}"`);

/**
 * @returns {{fillStyle:(c:number,a?:number)=>void, lineStyle:(w:number,c:number,a?:number)=>void,
 *            fillCircle:(x:number,y:number,r:number)=>void, strokeCircle:(x:number,y:number,r:number)=>void,
 *            beginPath:()=>void, moveTo:(x:number,y:number)=>void, lineTo:(x:number,y:number)=>void,
 *            closePath:()=>void, fillPath:()=>void, toSVG:()=>string, elements:()=>object[]}}
 */
export function svgGraphics() {
  const parts = [];
  const els = [];
  let fill = '#ffffff';
  let fillA = 1;
  let lineW = 1;
  let lineC = '#ffffff';
  let lineA = 1;
  let path = null;

  return {
    fillStyle(c, a = 1) { fill = hex(c); fillA = a; },
    lineStyle(w, c, a = 1) { lineW = w; lineC = hex(c); lineA = a; },
    fillCircle(x, y, r) {
      els.push({ kind: 'circle', x, y, r, fill });
      parts.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"${op(fillA)}/>`);
    },
    fillRect(x, y, w, h) {
      els.push({ kind: 'rect', x, y, w, h, fill });
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${op(fillA)}/>`);
    },
    fillEllipse(x, y, w, h) {
      els.push({ kind: 'ellipse', x, y, w, h, fill });
      parts.push(`<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="${h / 2}" fill="${fill}"${op(fillA)}/>`);
    },
    fillTriangle(x1, y1, x2, y2, x3, y3) {
      els.push({ kind: 'path', d: `M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}Z`, fill, points: [[x1, y1], [x2, y2], [x3, y3]] });
      parts.push(`<path d="M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}Z" fill="${fill}"${op(fillA)}/>`);
    },
    strokeCircle(x, y, r) {
      els.push({ kind: 'strokeCircle', x, y, r, stroke: lineC, width: lineW });
      parts.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${lineC}" stroke-width="${lineW}"${op(lineA)}/>`);
    },
    beginPath() { path = []; },
    moveTo(x, y) { path.push([x, y]); },
    lineTo(x, y) { path.push([x, y]); },
    closePath() { /* 闭合由 fillPath 处理 */ },
    fillPath() {
      if (!path || path.length < 2) { path = null; return; }
      const d = path.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z';
      els.push({ kind: 'path', d, fill, points: path.slice() });
      parts.push(`<path d="${d}" fill="${fill}"${op(fillA)}/>`);
      path = null;
    },
    toSVG() { return parts.join('\n'); },
    elements() { return els; },
  };
}
