// 敌人化身（GPT Blossom / Claude 星芒）的纯逻辑测试。
//
// 这一组断言把「敌人的模型化身」这件事钉死：
//   ① **每个敌种都有化身**（新加敌种忘了配 ⇒ 立刻红）
//   ② **没有多余的化身**（配了但没敌种用它 ⇒ 立刻红）
//   ③ **两个家族的画法不同**（GPT 走描边圆环 / Claude 走填充路径）
//   ④ **同一个敌种每次长得一样**（种子固定 ⇒ 不能每次随机）
//   ⑤ **画出来的东西不超出给定的半径**（视觉大小 == 碰撞大小）
//   ⑥ **颜色用的是官方品牌值**（别手抖改错）
import { describe, it, expect } from 'vitest';
import {
  ENEMY_AVATAR, BOSS_AVATAR, drawAvatar, drawGptBlossom, drawClaudeBurst,
  modelOf, modelLabelOf, avatarOf,
  GPT_COLOR, CLAUDE_COLOR,
} from '../src/art/avatars.js';
import { svgGraphics } from '../src/art/graphics-probe.js';
import { ENEMY_TYPES } from '../src/systems/enemies.js';
import { BOSSES } from '../src/systems/boss.js';

const ALL = { ...ENEMY_AVATAR, ...BOSS_AVATAR };

describe('敌人化身：GPT Blossom vs Claude 星芒', () => {
  it('每个敌种都有化身（漏配立刻红）', () => {
    const ids = Object.keys(ENEMY_TYPES).filter((k) => ENEMY_TYPES[k] && ENEMY_TYPES[k].id);
    for (const id of ids) {
      expect(ENEMY_AVATAR[id] || BOSS_AVATAR[id], `敌种 ${id} 没有化身`).toBeTruthy();
    }
  });

  it('没有多余的化身（配了但没敌种用它 ⇒ 是洞）', () => {
    const enemyIds = new Set(Object.keys(ENEMY_TYPES).filter((k) => ENEMY_TYPES[k] && ENEMY_TYPES[k].id));
    // Boss 的化身是按**纹理**配的（wither_lord → 'boss'），所以比对的是 texture 键
    const bossIds = new Set((BOSSES || []).map((b) => b.texture).filter(Boolean));
    for (const id of Object.keys(ENEMY_AVATAR)) {
      expect(enemyIds.has(id), `化身 ${id} 没有对应的敌种`).toBe(true);
    }
    for (const id of Object.keys(BOSS_AVATAR)) {
      expect(bossIds.has(id), `化身 ${id} 没有对应的 Boss`).toBe(true);
    }
  });

  it('两个家族的画法不同：GPT 走描边圆环，Claude 走填充路径', () => {
    const g1 = svgGraphics();
    drawGptBlossom(g1, { cx: 50, cy: 50, r: 40 });
    expect(g1.elements().filter((e) => e.kind === 'strokeCircle').length).toBeGreaterThanOrEqual(6);

    const g2 = svgGraphics();
    drawClaudeBurst(g2, { cx: 50, cy: 50, r: 40 });
    expect(g2.elements().filter((e) => e.kind === 'path').length).toBeGreaterThanOrEqual(9);
    expect(g2.elements().filter((e) => e.kind === 'strokeCircle').length).toBe(0);
  });

  it('同一个敌种每次长得一样（种子固定）', () => {
    for (const id of Object.keys(ALL)) {
      const a = svgGraphics();
      const b = svgGraphics();
      drawAvatar(a, id, { cx: 40, cy: 40, r: 30 });
      drawAvatar(b, id, { cx: 40, cy: 40, r: 30 });
      expect(a.toSVG(), `${id} 两次画出来不一样`).toBe(b.toSVG());
    }
  });

  it('画出来的东西**不超出**给定的半径（视觉大小 == 碰撞大小）', () => {
    for (const id of Object.keys(ALL)) {
      const cx = 60, cy = 60, r = 30;
      const g = svgGraphics();
      drawAvatar(g, id, { cx, cy, r });
      for (const e of g.elements()) {
        if (e.kind === 'circle') {
          expect(Math.hypot(e.x - cx, e.y - cy) + e.r, `${id} 的圆超出了 r`).toBeLessThanOrEqual(r + 0.01);
        } else if (e.kind === 'strokeCircle') {
          // 描边圆环：外缘 = 圆心距 + 环半径 + 半个线宽
          const dist = Math.hypot(e.x - cx, e.y - cy);
          expect(dist + e.r + e.width / 2, `${id} 的环超出了 r`).toBeLessThanOrEqual(r + 0.01);
        } else if (e.kind === 'path') {
          for (const [px, py] of e.points) {
            expect(Math.hypot(px - cx, py - cy), `${id} 的笔画超出了 r`).toBeLessThanOrEqual(r + 0.01);
          }
        }
      }
    }
  });

  it('颜色用的是官方品牌值（别手抖改错）', () => {
    expect(GPT_COLOR).toBe(0x10a37f);      // OpenAI 界面绿
    expect(CLAUDE_COLOR).toBe(0xd97757);   // Anthropic 官方 primary accent
  });

  it('阵营标签给得出人话', () => {
    expect(modelLabelOf('crawler')).toBe('GPT');
    expect(modelLabelOf('spore')).toBe('Claude');
    expect(modelLabelOf('boss')).toBe('GPT × Claude');
    expect(modelOf('weaver')).toBe('claude');
    expect(avatarOf('nope')).toBe(null);
  });
});
