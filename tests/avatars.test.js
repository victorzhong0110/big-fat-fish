// 敌人化身（Codex 小工人 × Claude Buddy 物种）的纯逻辑测试。
//
// 这一组断言把「敌人的模型化身」钉死：
//   ① **每个敌种都有化身**（新加敌种忘了配 ⇒ 立刻红）
//   ② **没有多余的化身**（配了但没敌种用它 ⇒ 是洞，立刻红）
//   ③ **每个化身都是方块拼的**（像素风；不是像素风就说明画法跑偏了）
//   ④ **同一个敌种每次长得一样**（种子固定 ⇒ 画面可复现）
//   ⑤ **画出来的东西不超出给定的半径**（视觉大小 == 碰撞大小）
//   ⑥ **两族配色分开**（Claude 陶土橙 / GPT 淡紫），且每族的精灵里确有自己那族颜色
//   ⑦ **名字与阵营给得出人话**
import { describe, it, expect } from 'vitest';
import {
  ENEMY_AVATAR, BOSS_AVATAR, drawAvatar, drawPet,
  modelOf, modelLabelOf, petNameOf, avatarOf, colorOf,
  GPT_COLOR, CLAUDE_COLOR, BUDDY_SPECIES, CODEX_BUDDIES,
} from '../src/art/avatars.js';
import { svgGraphics } from '../src/art/graphics-probe.js';
import { ENEMY_TYPES } from '../src/systems/enemies.js';
import { BOSSES } from '../src/systems/boss.js';

const ALL = { ...ENEMY_AVATAR, ...BOSS_AVATAR };
const enemyIds = Object.keys(ENEMY_TYPES).filter((k) => ENEMY_TYPES[k] && ENEMY_TYPES[k].id);
// Boss 的化身是按**纹理键**配的（wither_lord → 'boss'），所以比对用 texture 集合
const bossIds = (BOSSES || []).map((b) => b.texture);

describe('敌人化身：Codex 小工人 × Claude Buddy 物种', () => {
  it('每个敌种都有化身（漏配立刻红）', () => {
    for (const id of enemyIds) {
      expect(ENEMY_AVATAR[id] || BOSS_AVATAR[id], `敌种 ${id} 没有化身`).toBeTruthy();
    }
  });

  it('没有多余的化身（配了但没敌种用它 ⇒ 是洞）', () => {
    for (const id of Object.keys(ENEMY_AVATAR)) {
      expect(enemyIds, `化身 ${id} 没有对应的敌种`).toContain(id);
    }
    for (const id of Object.keys(BOSS_AVATAR)) {
      expect(bossIds, `化身 ${id} 没有对应的 Boss`).toContain(id);
    }
  });

  it('每个化身都是**方块拼**的（像素风：所有格子落在同一套 u×u 网格上）', () => {
    const size = 48;          // r=24 ⇒ size=48 ⇒ 一格 u = size/16 = 3px
    const u = size / 16;
    for (const id of Object.keys(ALL)) {
      const g = svgGraphics();
      drawAvatar(g, id, { cx: 40, cy: 40, r: 24 });
      const rects = g.elements().filter((e) => e.kind === 'rect');
      expect(rects.length, `${id} 一个方块都没有`).toBeGreaterThanOrEqual(6);
      for (const e of rects) {
        // 每个格子的边长必须是 u 的**整数倍** ⇒ 它确实是「若干个像素」拼的
        for (const d of [e.w, e.h]) {
          const k = d / u;
          expect(Math.abs(k - Math.round(k)), `${id} 的格子边长 ${d} 不是网格 ${u} 的整数倍`).toBeLessThan(1e-6);
        }
      }
      // 像素画 ⇒ 不该出现圆/椭圆这种连续曲线
      expect(g.elements().filter((e) => e.kind === 'circle' || e.kind === 'ellipse').length,
        `${id} 里混进了非像素的曲线`).toBe(0);
    }
  });

  it('同一个敌种每次长得一样（可复现）', () => {
    for (const id of Object.keys(ALL)) {
      const a = svgGraphics();
      const b = svgGraphics();
      drawAvatar(a, id, { cx: 40, cy: 40, r: 24 });
      drawAvatar(b, id, { cx: 40, cy: 40, r: 24 });
      expect(a.toSVG(), `${id} 两次画出来不一样`).toBe(b.toSVG());
    }
  });

  it('画出来的东西**不超出**给定的半径（视觉大小 == 碰撞大小）', () => {
    for (const id of Object.keys(ALL)) {
      const cx = 60, cy = 60, r = 30;
      const g = svgGraphics();
      drawAvatar(g, id, { cx, cy, r });
      for (const e of g.elements()) {
        if (e.kind !== 'rect') continue;
        let far = 0;
        for (const px of [e.x, e.x + e.w]) {
          for (const py of [e.y, e.y + e.h]) {
            far = Math.max(far, Math.hypot(px - cx, py - cy));
          }
        }
        expect(far, `${id} 的像素格超出了 r`).toBeLessThanOrEqual(r + 0.01);
      }
    }
  });

  it('两族配色分开：Claude 陶土橙 / GPT 淡紫', () => {
    expect(GPT_COLOR).toBe(0xa98cf0);
    expect(CLAUDE_COLOR).toBe(0xd97757);
    for (const [id, a] of Object.entries(ALL)) {
      const g = svgGraphics();
      drawPet(g, { cx: 40, cy: 40, r: 24, pet: a.pet });
      const used = new Set(g.elements().map((e) => e.fill));
      // 录制器里颜色存的是 **#rrggbb 字符串**
      const own = (a.model === 'claude' ? CLAUDE_COLOR : GPT_COLOR);
      const ownHex = `#${own.toString(16).padStart(6, '0')}`;
      expect([...used].includes(ownHex), `${id} 的精灵里没有本族的主色 ${ownHex}`).toBe(true);
    }
  });

  it('阵营标签与宠物名给得出人话', () => {
    expect(modelLabelOf('crawler')).toBe('GPT');
    expect(modelLabelOf('spore')).toBe('Claude');
    expect(petNameOf('weaver')).toBe('章鱼');
    expect(petNameOf('husk')).toBe('重装工兵');
    expect(avatarOf('nope')).toBe(null);
    expect(colorOf('crawler')).toBe(GPT_COLOR);
    expect(colorOf('spore')).toBe(CLAUDE_COLOR);
  });

  it('Claude 用的是 Buddy 物种，GPT 用的是 Codex 小工人', () => {
    for (const [id, a] of Object.entries(ALL)) {
      const inClaude = Object.hasOwn(BUDDY_SPECIES, a.pet);
      const inCodex = Object.hasOwn(CODEX_BUDDIES, a.pet);
      if (a.model === 'claude') expect(inClaude, `${id} 的「${a.pet}」不在 Claude 物种表里`).toBe(true);
      else expect(inCodex, `${id} 的「${a.pet}」不在 Codex 小工人表里`).toBe(true);
    }
  });
});
