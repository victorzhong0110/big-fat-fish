// 生成器：把波次时间线变成"到点该生成什么"的流
import { buildTimeline, waveBreather } from './waveDirector.js';

/**
 * @param {number} seed 随机种子
 * @param {{modsFor?: (wave:number)=>object}|((wave:number)=>object)} opts 敌人修正量来源（章节主题）
 */
export function createSpawner(seed = 1, opts = {}) {
  const modsFor = typeof opts === 'function' ? opts : (opts.modsFor || (() => null));
  // 「这一波能不能开始」的闸门（第六轮）。
  //
  // 为什么需要：章首要先让玩家选路线，而**这一波的怪是在波次推进的那一刻生成的**
  // —— 如果先推进再选路线，这一波就会按"没选路线"的 mods 生成（路线承诺的数量/血量全丢）。
  // 所以：**闸门关着的时候，波次不推进**，等玩家做完决定。
  //
  // 回调返回 false = 先别开始这一波（下一帧还会再问一次）。
  const beforeWave = typeof opts === 'function' ? null : (opts.beforeWave || null);
  let wave = 0;
  let pendingWave = 0;       // 「准备开、但还没过闸门」的波次
  let timeline = [];
  let cursor = 0;
  let waveStartAt = 0;
  let state = 'breather';
  let nextWaveAt = 0;
  let currentMods = null;

  return {
    get wave() { return wave; },
    /**
     * 「准备开、但还没过闸门」的波次（第九轮加的）。
     *
     * 为什么需要暴露它：章首抽卡面板打开的时候，这一波**还没开**（闸门关着），
     * 所以 `wave` 还是上一波 —— 谁想知道"这一章是第几章"都得靠它。
     * （测量脚本与机器人要按"这一章的怪"给装备打分。）
     */
    get pendingWave() { return pendingWave; },
    get state() { return state; },
    get remaining() { return Math.max(0, timeline.length - cursor); },
    /** 当前这一波的敌人修正量（主题） */
    get mods() { return currentMods; },

    /** 开始一局：从第 1 波准备起来 */
    start(now) {
      wave = 0;
      pendingWave = 0;
      timeline = [];
      cursor = 0;
      state = 'breather';
      nextWaveAt = now + 2; // 开局给 2 秒准备
      waveStartAt = now;
      currentMods = null;
    },

    /**
     * 直接跳到指定波次（跳过之前的波）。
     * 用途：无尽模式续接、自动化试玩要快速抵达某一章。
     * @param {number} target 目标波次
     * @param {number} now 当前时刻（决定时间线的相对起点）
     */
    skipTo(target, now = 0) {
      const w = Math.max(1, Math.floor(target));
      // **不直接开波**：交给闸门（beforeWave）来决定。
      // 否则"跳到某一章"会绕过章首的路线选择，
      // 这一波的怪就会按"还没选路线"的 mods 生成（路线承诺的数量/血量全丢）。
      wave = w - 1;
      pendingWave = w;
      currentMods = null;
      timeline = [];
      cursor = 0;
      state = 'breather';
      waveStartAt = now;
      nextWaveAt = now;
    },

    /**
     * 推进到当前时间，返回本帧需要生成的事件。
     * @returns {Array<{kind:string, type:string}>}
     */
    update(now) {
      const events = [];
      if (state === 'breather') {
        if (now >= nextWaveAt) {
          const nextWave = pendingWave || wave + 1;
          // 闸门：玩家还没做完这一波之前的决定，就先不开波
          if (beforeWave && beforeWave(nextWave) === false) return events;
          wave = nextWave;
          pendingWave = 0;
          currentMods = modsFor(wave) || null;
          timeline = buildTimeline(wave, seed, currentMods);
          cursor = 0;
          state = 'wave';
          waveStartAt = now;
        }
        return events;
      }
      while (cursor < timeline.length && timeline[cursor].at <= now - waveStartAt) {
        events.push(timeline[cursor]);
        cursor += 1;
      }
      if (cursor >= timeline.length) {
        state = 'breather';
        nextWaveAt = now + waveBreather(wave);
      }
      return events;
    },
  };
}
