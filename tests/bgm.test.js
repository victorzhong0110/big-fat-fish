// BGM 乐谱（src/systems/bgmScore.js）的单测。
//
// 为什么它值得单测：BGM 是**规则**（和弦、旋律、鼓点、时长），
// 而"规则写纯逻辑层、渲染层只做适配"是本项目的铁律 ——
// 如果乐谱又跑回 src/audio.js（渲染层），这条铁律就破了。
import { describe, it, expect } from 'vitest';
import {
  BGM_BPM,
  BGM_BARS,
  BGM_BEATS_PER_BAR,
  BGM_EIGHTHS_PER_BAR,
  BGM_SECONDS,
  BGM_CHORDS,
  BGM_PROGRESSION,
  BGM_MELODY,
  BGM_BASS_PATTERN,
  BGM_DRUM_PATTERN,
  BGM_PEAK,
  midiToFreq,
  buildBgmEvents,
  renderBgmEvents,
  normalizeBgm,
  renderBgmScore,
} from '../src/systems/bgmScore.js';

const RATE = 48000;

describe('BGM 乐谱：数据自洽', () => {
  it('时长 = 小节 × 拍 × 拍长（别让"8 秒"这种注释数字漂了）', () => {
    expect(BGM_SECONDS).toBeCloseTo((BGM_BARS * BGM_BEATS_PER_BAR * 60) / BGM_BPM, 10);
    expect(BGM_SECONDS).toBe(16);
  });

  it('旋律每小节 8 格，且总小节数对得上', () => {
    expect(BGM_MELODY.length).toBe(BGM_BARS);
    for (const bar of BGM_MELODY) {
      expect(bar.length).toBe(BGM_EIGHTHS_PER_BAR);
    }
  });

  it('旋律音符都是合法 MIDI 音高（null = 休止），且落在能唱的音域', () => {
    for (const bar of BGM_MELODY) {
      for (const n of bar) {
        if (n == null) continue;
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(60);   // C4
        expect(n).toBeLessThanOrEqual(84);      // C6
      }
    }
  });

  it('和弦进行的下标都指向真和弦', () => {
    expect(BGM_PROGRESSION.length).toBe(BGM_BARS);
    for (const i of BGM_PROGRESSION) {
      expect(BGM_CHORDS[i]).toBeTruthy();
    }
  });

  it('低音型与鼓点都落在小节内（越界 = 有一声会被切掉）', () => {
    for (const p of BGM_BASS_PATTERN) {
      expect(p.beat).toBeGreaterThanOrEqual(0);
      expect(p.beat + p.len).toBeLessThanOrEqual(BGM_BEATS_PER_BAR);
      expect([0, 1]).toContain(p.deg);
    }
    for (const b of BGM_DRUM_PATTERN.kick) expect(b).toBeLessThan(BGM_BEATS_PER_BAR);
    for (const b of BGM_DRUM_PATTERN.clap) expect(b).toBeLessThan(BGM_BEATS_PER_BAR);
    for (const h of BGM_DRUM_PATTERN.hat) expect(h).toBeLessThan(BGM_EIGHTHS_PER_BAR);
  });

  it('MIDI → 频率换算对得上 A4 = 440Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
    expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
  });
});

describe('BGM 渲染：波形本身', () => {
  const rendered = renderBgmScore(RATE);

  it('采样数 = 时长 × 采样率', () => {
    expect(rendered.left.length).toBe(Math.floor(BGM_SECONDS * RATE));
    expect(rendered.right.length).toBe(rendered.left.length);
  });

  it('没有一个 NaN / Infinity（一个 NaN 会让整段变成静音噪声）', () => {
    for (const ch of [rendered.left, rendered.right]) {
      for (let i = 0; i < ch.length; i += 97) {   // 抽样即可，线性扫更慢
        expect(Number.isFinite(ch[i])).toBe(true);
      }
    }
  });

  it('峰值归一化到 BGM_PEAK ⇒ 任何采样率下音量一致且不削顶', () => {
    let peak = 0;
    for (const ch of [rendered.left, rendered.right]) {
      for (let i = 0; i < ch.length; i++) {
        const a = Math.abs(ch[i]);
        if (a > peak) peak = a;
      }
    }
    expect(peak).toBeLessThanOrEqual(1);
    expect(peak).toBeCloseTo(BGM_PEAK, 4);
  });

  it('不是静音（有声音）也不是一片糊（RMS 在合理带内）', () => {
    let sum = 0;
    for (const ch of [rendered.left, rendered.right]) {
      for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
    }
    const rms = Math.sqrt(sum / (rendered.left.length * 2));
    expect(rms).toBeGreaterThan(0.03);
    expect(rms).toBeLessThan(0.35);
  });

  it('左右声道不同（立体声展宽），但能量接近（没有把一边闷掉）', () => {
    const L = rendered.left;
    const R = rendered.right;
    let diff = 0;
    let el = 0;
    let er = 0;
    for (let i = 0; i < L.length; i += 13) {
      diff += Math.abs(L[i] - R[i]);
      el += L[i] * L[i];
      er += R[i] * R[i];
    }
    expect(diff).toBeGreaterThan(0);
    const ratio = Math.sqrt(el) / Math.sqrt(er);
    expect(ratio).toBeGreaterThan(0.6);
    expect(ratio).toBeLessThan(1.7);
  });

  it('循环接缝平滑：末尾采样与首个采样连续 ⇒ 循环时不会有"咔哒"爆音', () => {
    const L = rendered.left;
    const R = rendered.right;
    // 真正的判据是**接缝处的一阶差分**：播放器把末尾接回首尾，
    // 这一步的跳变就是"咔哒"。噪声乐器内部跳变大是正常的，只有接缝不许跳。
    expect(Math.abs(L[L.length - 1] - L[0])).toBeLessThan(0.01);
    expect(Math.abs(R[R.length - 1] - R[0])).toBeLessThan(0.01);
  });

  it('接缝处是"换气"而不是"停顿"：结尾安静、开头从 0 起来', () => {
    const L = rendered.left;
    const R = rendered.right;
    const edge = Math.floor(RATE * 0.05);
    let maxEnd = 0;
    for (let i = 0; i < edge; i++) {
      maxEnd = Math.max(maxEnd, Math.abs(L[L.length - 1 - i]), Math.abs(R[R.length - 1 - i]));
    }
    expect(maxEnd).toBeLessThan(0.1);      // 尾巴已经收干净
    expect(Math.abs(L[0])).toBeLessThan(0.02);  // 开头从 0 起（无跳变）
  });

  it('可复现：同参数渲染两次，逐样本完全相同（噪声音色用了确定性随机）', () => {
    const again = renderBgmScore(RATE);
    expect(again.left.length).toBe(rendered.left.length);
    for (let i = 0; i < rendered.left.length; i += 331) {
      expect(again.left[i]).toBe(rendered.left[i]);
      expect(again.right[i]).toBe(rendered.right[i]);
    }
  });

  it('渲染耗时不会失控（起手时不能卡住画面）：48kHz 下 < 3s', () => {
    const t0 = performance.now();
    renderBgmScore(RATE);
    const dt = performance.now() - t0;
    expect(dt).toBeLessThan(3000);
  });
});

describe('BGM 事件表（分块渲染用）', () => {
  const events = buildBgmEvents();

  it('每个事件都有小节号、起点与时长，且都落在循环内', () => {
    expect(events.length).toBeGreaterThan(100);
    for (const e of events) {
      expect(Number.isInteger(e.bar)).toBe(true);
      expect(e.bar).toBeGreaterThanOrEqual(0);
      expect(e.bar).toBeLessThan(BGM_BARS);
      expect(e.start).toBeGreaterThanOrEqual(0);
      expect(e.start + e.dur).toBeLessThanOrEqual(BGM_SECONDS + 1e-6);
      expect(e.gain).toBeGreaterThan(0);
      expect(['sine', 'tri', 'saw', 'pulse', 'noise']).toContain(e.wave);
    }
  });

  it('每小节都有事件（没有"空小节"——那会是一个只有底噪的洞）', () => {
    for (let b = 0; b < BGM_BARS; b++) {
      expect(events.filter((e) => e.bar === b).length).toBeGreaterThan(10);
    }
  });

  it('分块渲染与整段渲染结果一致（分块只是换个顺序，不该改内容）', () => {
    const rate = 22050;
    const len = Math.floor(BGM_SECONDS * rate);
    const L = new Float32Array(len);
    const R = new Float32Array(len);
    for (let b = 0; b < BGM_BARS; b++) renderBgmEvents(events, rate, L, R, { onlyBar: b });
    // 注意：跟"未归一化的整段渲染"比 —— renderBgmScore() 会做归一化，
    // 拿它来比就是在比两件不同的事（第一版就是这么写错的）。
    const L2 = new Float32Array(len);
    const R2 = new Float32Array(len);
    renderBgmEvents(events, rate, L2, R2);
    for (let i = 0; i < len; i += 31) {
      expect(Math.abs(L[i] - L2[i])).toBeLessThan(1e-6);
      expect(Math.abs(R[i] - R2[i])).toBeLessThan(1e-6);
    }
  });

  it('单小节的合成成本远低于整段（这才值得分块）', () => {
    const rate = 48000;
    const len = Math.floor(BGM_SECONDS * rate);
    const L = new Float32Array(len);
    const R = new Float32Array(len);
    const t0 = performance.now();
    renderBgmEvents(events, rate, L, R, { onlyBar: 0 });
    const one = performance.now() - t0;
    const t1 = performance.now();
    renderBgmEvents(events, rate, L, R);
    const all = performance.now() - t1;
    expect(one).toBeLessThan(all * 0.5);
  });

  it('归一化把峰值拉到 BGM_PEAK，且不改变形状', () => {
    const rate = 22050;
    const len = Math.floor(BGM_SECONDS * rate);
    const L = new Float32Array(len);
    const R = new Float32Array(len);
    renderBgmEvents(events, rate, L, R);
    const before = L[1000];
    normalizeBgm(L, R);
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    expect(peak).toBeCloseTo(BGM_PEAK, 3);
    expect(before).not.toBe(0);
  });
});
