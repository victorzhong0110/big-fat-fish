import './styles.css';
import Phaser from 'phaser';
import { GameScene, ARENA } from './scenes/GameScene.js';
import { activeArchetypes } from './systems/archetypes.js';
import { ENEMY_TYPES, ENEMY_TYPE_IDS } from './systems/enemies.js';
import { audioState } from './audio.js';
import { touch } from './touch.js';

touch.init();

// 渲染器可切换：?renderer=canvas 在无 GPU 的环境（软件光栅）下更快
const params = new URLSearchParams(location.search);
const rendererParam = (params.get('renderer') || 'auto').toLowerCase();
const type = rendererParam === 'canvas' ? Phaser.CANVAS
  : rendererParam === 'webgl' ? Phaser.WEBGL
    : Phaser.AUTO;

const game = new Phaser.Game({
  type,
  width: ARENA.width,
  height: ARENA.height,
  parent: 'game-root',
  backgroundColor: '#0b0a10',
  antialias: true,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { x: 0, y: 0 } },
  },
  scene: [GameScene],
});

// ?seed=123 —— 固定一局的随机性（章节主题、抽卡候选、掉落位）。
// 同一个种子必得同一局，方便复盘、分享与平衡测试。
const seedParam = params.get('seed');
if (seedParam !== null && seedParam !== '' && Number.isFinite(Number(seedParam))) {
  game.registry.set('seed', Number(seedParam) >>> 0);
}

// 供自动化试玩脚本读取状态
window.__tulip = {
  game,
  scene: () => game.scene.getScene('game'),
  /** 音频现状（BGM 是否真的在放） */
  audioState: () => audioState(),
  /** 敌种名字（数据侧真相；浏览器断言拿它跟 DOM 对账，不写死皮肤名） */
  enemyNames: () => ENEMY_TYPE_IDS.map((id) => ENEMY_TYPES[id].name),
  state: () => {
    const s = game.scene.getScene('game');
    if (!s) return null;
    return {
      runState: s.runState,
      runTime: s.runTime ?? 0,
      hp: s.hp,
      maxHp: s.maxHp,
      shield: s.shield,
      score: s.combat?.score ?? 0,
      combo: s.combat?.combo ?? 0,
      kills: s.combat?.kills ?? 0,
      spawned: s.run?.spawned ?? 0,
      wave: s.spawner?.wave ?? 0,
      fire: s.fireLevel,
      enemies: s.enemies?.getChildren().length ?? 0,
      relics: [...(s.run?.relics ?? [])],
      dew: s.run?.dew ?? 0,
      dewWaves: s.run?.dewWaves ?? 0,
      banished: [...(s.run?.banished ?? [])],
      archetypes: activeArchetypes(s.run?.relics ?? []).map((a) => ({ id: a.id, name: a.name, tiers: a.tiers })),
      omens: [...(s.run?.omenIds ?? [])],
      memory: s.meta?.memory ?? 0,
      unlocked: [...(s.meta?.unlocked ?? [])],
      seed: s.seed ?? 0,
      character: s.characterId ?? '',
      theme: s.run?.plan?.chapters?.[Math.floor(Math.max(1, s.spawner?.wave ?? 1) - 1) / 5]?.theme?.name ?? '',
    };
  },
};
