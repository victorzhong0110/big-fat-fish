// 连击与计分：纯状态机，便于单测与回放
export const COMBO_WINDOW = 2.5; // 秒
export const MAX_MULTIPLIER = 5;

export function createCombat() {
  return {
    score: 0,
    combo: 0,
    multiplier: 1,
    bestCombo: 0,
    lastKillAt: -Infinity,
    kills: 0,
    // 连击窗口可被装备改写（见 systems/relics.js 的 comboWindowAddMs）
    windowSec: COMBO_WINDOW,
  };
}

/** 当前生效的连击窗口 */
export function comboWindowOf(state) {
  return state.windowSec ?? COMBO_WINDOW;
}

/** 击倒一个敌人，更新连击与得分；返回本次收益 */
export function registerKill(state, baseScore, now) {
  const chained = state.combo > 0 && now - state.lastKillAt <= comboWindowOf(state);
  state.combo = chained ? state.combo + 1 : 1;
  state.lastKillAt = now;
  state.multiplier = Math.min(MAX_MULTIPLIER, 1 + Math.floor((state.combo - 1) / 3));
  state.kills += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const gained = Math.round(baseScore * state.multiplier);
  state.score += gained;
  return { gained, combo: state.combo, multiplier: state.multiplier, chained };
}

/** 连击是否仍在有效窗口内 */
export function comboActive(state, now) {
  return state.combo > 0 && now - state.lastKillAt <= comboWindowOf(state);
}

/** 超时后清空连击（每帧调用，安全幂等） */
export function decayCombo(state, now) {
  if (state.combo > 0 && now - state.lastKillAt > comboWindowOf(state)) {
    state.combo = 0;
    state.multiplier = 1;
    return true;
  }
  return false;
}

/** 距离连击断掉还剩多少秒 */
export function comboRemaining(state, now) {
  if (state.combo === 0) return 0;
  return Math.max(0, comboWindowOf(state) - (now - state.lastKillAt));
}
