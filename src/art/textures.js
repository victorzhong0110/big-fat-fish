import { drawAvatar } from './avatars.js';

// 全部美术在运行时用 Graphics 生成，项目里没有一个图片文件。
//
// ── 第十四轮：世界观换皮（郁金香花园 → 大肥鱼的深海）────────────
//
// ⚠️ **只改画，不改机制**：所有纹理 key、尺寸、命中判定（半径在 systems/enemies.js）
// 全部保持原样，变的只有"画的是什么"。
//
// 主角是**大肥鱼**（DeepSeek 的社区二创形象「蓝色大肥鱼 / 鲸鱼娘」，
// 昵称来自网友把 DeepSeek 的蓝鲸 logo 发给模型识图、模型一本正经地说
// "这是一只蓝色大肥鱼"的那个乌龙）。
// 我们用的是**它最核心的三个视觉符号**：蓝色渐变的胖鱼身、头顶的呆毛、圆眼。
// ⚠️ 版权边界见 DECISIONS §28：这是**社区二创**形象，官方从未正式承认，
// 本作只做"精神上的致敬 + 自绘图形"，不复制任何画师的立绘。
export function createTextures(scene) {
  const mk = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ add: false });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // 玩家：大肥鱼（胖鱼身 + 呆毛 + 圆眼 + 小鳍）
  mk('player', 38, 48, (g) => {
    // 尾鳍
    g.fillStyle(0x1f6fd0, 1);
    g.beginPath();
    g.moveTo(7, 24); g.lineTo(0, 16); g.lineTo(0, 32);
    g.closePath(); g.fillPath();
    // 鱼身（胖，横向椭圆）
    g.fillStyle(0x3aa0ff, 1);
    g.fillEllipse(21, 26, 26, 20);
    // 肚皮（浅色）
    g.fillStyle(0xbfe4ff, 0.9);
    g.fillEllipse(22, 31, 18, 9);
    // 背鳍
    g.fillStyle(0x1f6fd0, 1);
    g.beginPath();
    g.moveTo(15, 17); g.lineTo(21, 8); g.lineTo(27, 17);
    g.closePath(); g.fillPath();
    // 呆毛（大肥鱼的招牌）
    g.fillStyle(0x8fd4ff, 1);
    g.fillRect(24, 2, 3, 9);
    g.fillCircle(25.5, 2.5, 2.4);
    // 眼睛
    g.fillStyle(0xffffff, 1);
    g.fillCircle(29, 22, 3.2);
    g.fillStyle(0x0b1a2a, 1);
    g.fillCircle(30, 22, 1.7);
    // 嘴（一点弧线感：两段小矩形）
    g.fillStyle(0x0b1a2a, 1);
    g.fillRect(33, 29, 4, 2);
  });

  // 贪嘴小鱼
  // 贪嘴小鱼 · GPT 化身（六瓣结）
  mk('crawler', 34, 34, (g) => {
    drawAvatar(g, 'crawler', { cx: 17, cy: 17, r: 14 });
  });

  // 水母
  // 水母 · Claude 化身（星芒）
  mk('spore', 38, 38, (g) => {
    drawAvatar(g, 'spore', { cx: 19, cy: 19, r: 16 });
  });

  // 海葵
  // 海葵 · GPT 化身（六瓣结）
  mk('bud', 52, 52, (g) => {
    drawAvatar(g, 'bud', { cx: 26, cy: 26, r: 23 });
  });

  // 深渊巨鲸（Boss）：一条肥蓝鲸
  // 深渊巨鲸 · GPT × Claude 合体（终局）
  mk('boss', 124, 136, (g) => {
    drawAvatar(g, 'boss', { cx: 62, cy: 68, r: 54 });
  });

  // 巨甲蟹（Boss）：厚壳 + 双钳
  // 巨甲蟹 · GPT 化身（六瓣结）
  mk('boss_stone', 132, 132, (g) => {
    drawAvatar(g, 'boss_stone', { cx: 66, cy: 66, r: 54 });
  });

  // 母巢（Boss）：一只巨大的水母，伞下挂着卵
  // 母巢 · Claude 化身（星芒）
  mk('boss_pollen', 128, 136, (g) => {
    drawAvatar(g, 'boss_pollen', { cx: 64, cy: 68, r: 54 });
  });

  // 棘刺之王（Boss）：一坨带刺的海胆
  // 棘刺之王 · Claude 化身（多芒）
  mk('boss_thorn', 128, 128, (g) => {
    drawAvatar(g, 'boss_thorn', { cx: 64, cy: 64, r: 54 });
  });

  // 玩家子弹：水泡
  mk('petal', 16, 10, (g) => {
    g.fillStyle(0x9fe4ff, 0.85);
    g.fillEllipse(8, 5, 13, 6);
    g.fillStyle(0xffffff, 0.9);
    g.fillEllipse(6, 3.6, 4.4, 2.2);
  });

  // 敌方子弹：墨滴
  mk('spike', 14, 14, (g) => {
    g.fillStyle(0x2f1a4a, 1);
    g.fillCircle(7, 7, 6);
    g.fillStyle(0x6b4fa8, 1);
    g.fillCircle(6, 6, 2.4);
  });

  // 掉落：贝壳（分数）
  mk('seed', 18, 18, (g) => {
    g.fillStyle(0xf0c8a0, 1);
    g.fillCircle(9, 9, 7);
    g.fillStyle(0xffd9b0, 1);
    g.fillCircle(8, 8, 3.4);
    g.fillStyle(0xd9a878, 1);
    g.fillRect(8, 2, 1.6, 14);
  });

  // 掉落：磨砺石（火力升级）
  mk('bloom', 24, 24, (g) => {
    g.fillStyle(0x4ad6c9, 1);
    g.fillCircle(12, 7, 5);
    g.fillCircle(17, 12, 5);
    g.fillCircle(12, 17, 5);
    g.fillCircle(7, 12, 5);
    g.fillStyle(0xd9fffb, 1);
    g.fillCircle(12, 12, 3.4);
  });

  // 掉落：白米饭（回血）—— 大肥鱼最爱的东西
  mk('nectar', 22, 22, (g) => {
    g.fillStyle(0xf7f4ec, 1);
    g.beginPath();
    g.moveTo(4, 11); g.lineTo(18, 11); g.lineTo(11, 20);
    g.closePath(); g.fillPath();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 4.4);
    g.fillCircle(14, 8, 4.4);
    g.fillStyle(0xe8e0cf, 1);
    g.fillCircle(11, 14, 3.2);
  });

  // 沙丁鱼群：更快更小的银鱼
  // 沙丁鱼群 · GPT 化身（五瓣）
  mk('swarm', 24, 24, (g) => {
    drawAvatar(g, 'swarm', { cx: 12, cy: 12, r: 11 });
  });

  // 深海炸弹预警圈
  mk('hazard', 160, 160, (g) => {
    g.fillStyle(0x6b4fa8, 1);
    g.fillCircle(80, 80, 78);
    g.fillStyle(0x0b0a10, 1);
    g.fillCircle(80, 80, 66);
  });

  // ── 第五轮的新敌种 ──────────────────────────────
  // 旗鱼：长吻 + 镰刀状背鳍，蓄力时绷直
  // 旗鱼 · Claude 化身（星芒）
  mk('charger', 40, 40, (g) => {
    drawAvatar(g, 'charger', { cx: 20, cy: 20, r: 15 });
  });

  // 毒水母：小伞盖 + 毒囊
  // 毒水母 · Claude 化身（星芒）
  mk('moth', 34, 30, (g) => {
    drawAvatar(g, 'moth', { cx: 17, cy: 15, r: 12 });
  });

  // 铁壳蟹：合不拢的厚壳
  // 铁壳蟹 · GPT 化身（粗环）
  mk('husk', 56, 56, (g) => {
    drawAvatar(g, 'husk', { cx: 28, cy: 28, r: 24 });
  });

  // 蟹壳碎屑
  // 蟹壳碎屑 · GPT 化身（四瓣）
  mk('huskling', 24, 24, (g) => {
    drawAvatar(g, 'huskling', { cx: 12, cy: 12, r: 10 });
  });

  // 墨鱼：圆头 + 八腕 + 喷墨
  // 墨鱼 · Claude 化身（星芒）
  mk('weaver', 42, 42, (g) => {
    drawAvatar(g, 'weaver', { cx: 21, cy: 21, r: 16 });
  });

  // 粒子
  mk('dot', 12, 12, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 5);
  });

  // 海床
  mk('soil', 64, 64, (g) => {
    g.fillStyle(0x0d1a2b, 1);
    g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x14263a, 1);
    for (let i = 0; i < 26; i++) {
      const x = (i * 37) % 60;
      const y = (i * 53) % 60;
      g.fillRect(x, y, 3, 3);
    }
    g.fillStyle(0x1d3550, 1);
    for (let i = 0; i < 10; i++) {
      const x = (i * 29 + 11) % 60;
      const y = (i * 41 + 7) % 60;
      g.fillCircle(x, y, 2.2);
    }
    // 气泡
    g.fillStyle(0x2f5f80, 0.8);
    for (let i = 0; i < 6; i++) {
      const x = (i * 47 + 7) % 62;
      const y = (i * 23 + 19) % 62;
      g.fillCircle(x, y, 1.4);
    }
  });
}
