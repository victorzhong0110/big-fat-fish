/* ── BGM 乐谱（纯逻辑层）───────────────────────────────────────────
 *
 * 这个模块是「规则」：**和弦进行、旋律、鼓点、编曲结构、时长**。
 * 它只做纯数学（正弦/噪声/包络），不碰 WebAudio、不碰 DOM，
 * ⇒ 可以被 vitest 直接单测（见 tests/bgm.test.js）。
 * src/audio.js 只负责把这里算出来的采样塞进 AudioBuffer。
 *
 * 分两层的原因（实测踩出来的）：
 *  ① `buildBgmEvents()` —— 乐谱 → **事件表**（纯数据，谁在什么时候唱哪个音）。
 *  ② `renderBgmEvents()` —— 事件表 → 采样（纯数学）。
 *  分开之后，播放端可以**按小节分块渲染**（每次只算一小节），
 *  于是"开始游戏"这一刻不会因为合成一整段 BGM 而卡住几百毫秒。
 *
 * ── 它是什么 ──────────────────────────────────────────────────
 * 社区里的《Deepseek 大肥鱼摸鱼歌《Let Me Go》》（UP @罐装毕加索，
 * 原作 @星落落_oi，词 deepseek，曲 Suno/豆包）——
 * 它的内核不是旋律，是**大肥鱼的人设**：蠢萌、吃货、摸鱼、"我要走了"。
 *
 * ⚠️ 版权边界（它决定了下面这些音符长什么样）：
 *  ① 原曲旋律属迪士尼《冰雪奇缘》⇒ **本作不复制任何一个原曲音符**。
 *     下面的动机是**原创**的：写成 C–Am–F–G 的通用抒情进行，
 *     主旋律用大调五声音阶自己走，不去还原任何已有旋律的音程轮廓。
 *  ② 大肥鱼形象本身是**社区二创**（官方从未正式发布拟人形象）⇒
 *     本作只做自绘图形与精神致敬，不复制任何画师的立绘（DECISIONS §28）。
 *  ③ 项目铁律「零素材」⇒ **没有音频文件**：整段 BGM 是 WebAudio 合成出来的。
 */

/** 速度：120 BPM（"摸鱼"的松弛感，不快不慢） */
export const BGM_BPM = 120;
/** 小节数：8 小节 = 16 秒 */
export const BGM_BARS = 8;
/** 每小节拍数 */
export const BGM_BEATS_PER_BAR = 4;
/** 每小节八分音符格数 */
export const BGM_EIGHTHS_PER_BAR = 8;
/** 循环总长（秒） */
export const BGM_SECONDS = (BGM_BARS * BGM_BEATS_PER_BAR * 60) / BGM_BPM;
/** 一拍（秒） */
export const BGM_BEAT = 60 / BGM_BPM;
/** 一格八分音符（秒） */
export const BGM_EIGHTH = BGM_BEAT / 2;
/** 一小节（秒） */
export const BGM_BAR = BGM_BEAT * BGM_BEATS_PER_BAR;

/** MIDI 音高 → 频率（Hz） */
export function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** 和弦表（pad = 三个声部，root = 低音根音；单位 MIDI 音高） */
export const BGM_CHORDS = [
  { name: 'C',  root: 36, pad: [60, 64, 67] },   // C  E  G
  { name: 'Am', root: 33, pad: [57, 60, 64] },   // A  C  E
  { name: 'F',  root: 29, pad: [53, 57, 60] },   // F  A  C
  { name: 'G',  root: 31, pad: [55, 59, 62] },   // G  B  D
];

/** 8 小节的和弦进行（0..3 对应 BGM_CHORDS 的下标） */
export const BGM_PROGRESSION = [0, 1, 2, 3, 0, 1, 2, 3];

/**
 * 主旋律：每小节 8 格八分音符，null = 休止。
 * **原创动机**，走大调五声音阶（C D E G A），带一点"鲸鱼叫唤"的上扬与颤音。
 */
export const BGM_MELODY = [
  // 小节 1–4：陈述（低一点，先把调子立住）
  [76, 74, 72, 71, 72, 74, 76, 79],
  [76, 74, 72, 69, 71, 72, 74, 72],
  [74, 72, 71, 69, 69, 71, 72, 74],
  [76, 72, 71, 67, 69, 71, 72, 74],
  // 小节 5–8：变奏（高八度起，尾巴落回 C 好接下一轮）
  [79, 76, 74, 72, 74, 76, 79, 81],
  [79, 76, 74, 71, 72, 74, 76, 74],
  [76, 74, 72, 69, 71, 72, 74, 76],
  [74, 72, 71, 69, 69, 71, 72, 71],
];

/** 低音"摇摆"型：根音与五度交替，一拍一顿（鲸鱼摆尾的节奏感） */
export const BGM_BASS_PATTERN = [
  { beat: 0.0, len: 0.5, deg: 0 },
  { beat: 1.0, len: 0.25, deg: 0 },
  { beat: 1.5, len: 0.25, deg: 1 },
  { beat: 2.0, len: 0.5, deg: 0 },
  { beat: 3.0, len: 0.25, deg: 1 },
  { beat: 3.5, len: 0.25, deg: 0 },
];

/** 鼓：底鼓落 1、3 拍；拍手落 2、4 拍；踩镊每八分音符轻轻点一下 */
export const BGM_DRUM_PATTERN = {
  kick: [0, 2],
  clap: [1, 3],
  hat: [0, 1, 2, 3, 4, 5, 6, 7],   // 八分音符格
};

/** 混音后归一化到的峰值（留一点余量，避免削顶） */
export const BGM_PEAK = 0.88;

/** 确定性伪随机（噪声音色必须可复现 ⇒ 不用 Math.random） */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 声像：0 = 全左，1 = 全右（等功率） */
function panGains(pan) {
  const a = (pan * Math.PI) / 2;
  return [Math.cos(a), Math.sin(a)];
}

/**
 * 乐谱 → 事件表。
 *
 * 每个事件 = "一个声音在什么时候开始、唱多久、唱什么、长什么样"。
 * 渲染端按事件逐条合成；分块渲染时按 `bar` 过滤即可。
 * @returns {Array<object>}
 */
export function buildBgmEvents() {
  const ev = [];
  const push = (e) => { ev.push(e); return e; };

  for (let b = 0; b < BGM_BARS; b++) {
    const chord = BGM_CHORDS[BGM_PROGRESSION[b]];
    const barStart = b * BGM_BAR;

    // ① 铺底：三和弦，慢起慢落（"海面上的光"）
    for (const m of chord.pad) {
      push({
        bar: b, start: barStart, dur: BGM_BAR * 0.98,
        freq: midiToFreq(m), gain: 0.035, pan: 0.5,
        wave: 'sine', attack: 0.22, release: 0.45, detune: 2.2,   // 轻微失谐 → 合唱感
      });
    }

    // ② 低音：摇摆型，鲸鱼摆尾
    for (const p of BGM_BASS_PATTERN) {
      const rootMidi = chord.root + (p.deg === 1 ? 7 : 0);
      push({
        bar: b, start: barStart + p.beat * BGM_BEAT, dur: p.len * BGM_BEAT,
        freq: midiToFreq(rootMidi), gain: 0.075, pan: 0.42,
        wave: 'tri', attack: 0.006, release: 0.05,
      });
    }

    // ③ 主旋律：脉冲波 + 颤音 + 颤幅 ⇒ "大肥鱼在哼歌"
    const mel = BGM_MELODY[b] || [];
    for (let e = 0; e < mel.length; e++) {
      const note = mel[e];
      if (note == null) continue;
      push({
        bar: b, start: barStart + e * BGM_EIGHTH, dur: BGM_EIGHTH * 0.92,
        freq: midiToFreq(note), gain: 0.075, pan: 0.58,
        wave: 'pulse', duty: 0.34, attack: 0.02, release: 0.07,
        vibrato: 0.018, vibratoHz: 5.2, tremolo: 0.16, tremoloHz: 5.6,
      });
    }

    // ④ 鼓组：底鼓（滑音）/ 拍手（噪声）/ 踩镊（噪声）
    for (const beat of BGM_DRUM_PATTERN.kick) {
      push({
        bar: b, start: barStart + beat * BGM_BEAT, dur: 0.16,
        freq: 120, gain: 0.16, pan: 0.5,
        wave: 'sine', attack: 0.002, release: 0.12, detune: -70,   // 120Hz 滑到 50Hz
      });
    }
    for (const beat of BGM_DRUM_PATTERN.clap) {
      push({
        bar: b, start: barStart + beat * BGM_BEAT, dur: 0.09,
        gain: 0.05, pan: 0.5, wave: 'noise', attack: 0.002, release: 0.08,
        seed: 1000 + b * 10 + beat,
      });
    }
    for (const e of BGM_DRUM_PATTERN.hat) {
      const accent = e % 2 === 0 ? 1 : 0.45;
      push({
        bar: b, start: barStart + e * BGM_EIGHTH, dur: 0.035,
        gain: 0.022 * accent, pan: 0.62,
        wave: 'noise', attack: 0.001, release: 0.03,
        seed: 2000 + b * 10 + e,
      });
    }
  }

  // ⑤ 水下气泡：音高**向上滑**（真气泡就是这样），确定性随机
  {
    const rnd = makeRng(1337);
    for (let i = 0; i < 30; i++) {
      const at = rnd() * (BGM_SECONDS - 0.2);
      const dur = 0.04 + rnd() * 0.05;
      const f0 = 700 + rnd() * 1800;
      push({
        bar: Math.min(BGM_BARS - 1, Math.floor(at / BGM_BAR)),
        start: at, dur,
        freq: f0, gain: 0.02, pan: 0.3 + rnd() * 0.4,
        wave: 'sine', attack: 0.003, release: 0.02,
        detune: f0 * 0.8,     // 上滑
      });
    }
  }

  return ev;
}

/**
 * 往左右声道里加一个声音。
 * wave: 'sine' | 'tri' | 'saw' | 'pulse' | 'noise'
 */
function addVoice(L, R, rate, o) {
  const {
    start, dur, freq = 440, gain = 0.1, pan = 0.5,
    wave = 'sine', attack = 0.008, release = 0.06,
    vibrato = 0, vibratoHz = 5, tremolo = 0, tremoloHz = 6,
    duty = 0.32, detune = 0, seed = 1,
  } = o;

  const s0 = Math.max(0, Math.floor(start * rate));
  const s1 = Math.min(L.length, Math.floor((start + dur) * rate));
  const n = s1 - s0;
  if (n <= 0) return;

  const [gl, gr] = panGains(pan);
  const att = Math.max(1, Math.floor(attack * rate));
  const rel = Math.max(1, Math.floor(release * rate));
  const rnd = makeRng(seed);
  const f0 = freq;
  const f1 = freq + detune;   // 终点频率（滑音）
  let phase = 0;
  let noisePrev = 0;
  const isNoise = wave === 'noise';

  for (let i = 0; i < n; i++) {
    // 包络：起音斜坡 + 结尾释放
    let env;
    if (i < att) env = i / att;
    else if (i > n - rel) env = Math.max(0, (n - i) / rel);
    else env = 1;
    if (env <= 0) continue;

    const t = i / rate;
    let f = f0 + (f1 - f0) * (i / n);
    if (vibrato > 0) f *= 1 + vibrato * Math.sin(2 * Math.PI * vibratoHz * t);
    if (tremolo > 0) env *= 1 - tremolo * 0.5 * (1 + Math.sin(2 * Math.PI * tremoloHz * t));

    let s = 0;
    if (isNoise) {
      const w = rnd() * 2 - 1;
      s = w - noisePrev * 0.5;      // 简单高通：让踩镊/拍手有"脆"感
      noisePrev = w;
    } else {
      phase += f / rate;
      if (phase > 1) phase -= Math.floor(phase);
      if (wave === 'sine') s = Math.sin(2 * Math.PI * phase);
      else if (wave === 'tri') s = 4 * Math.abs(phase - 0.5) - 1;
      else if (wave === 'saw') s = 2 * phase - 1;
      else if (wave === 'pulse') s = phase < duty ? 1 : -1;
    }
    const v = s * env * gain;
    L[s0 + i] += v * gl;
    R[s0 + i] += v * gr;
  }
}

/**
 * 事件表 → 采样（写进给定的左右声道）。
 * @param {Array<object>} events
 * @param {number} rate
 * @param {Float32Array} L
 * @param {Float32Array} R
 * @param {{onlyBar?: number}} [opts] 只渲染某一小节（分块渲染用）
 */
export function renderBgmEvents(events, rate, L, R, opts = {}) {
  for (const e of events) {
    if (opts.onlyBar != null && e.bar !== opts.onlyBar) continue;
    addVoice(L, R, rate, e);
  }
}

/** 归一化到固定峰值 ⇒ 任何采样率下音量一致，且永不削顶 */
export function normalizeBgm(L, R, peak = BGM_PEAK) {
  let max = 0;
  for (let i = 0; i < L.length; i++) {
    const a = Math.abs(L[i]);
    const b = Math.abs(R[i]);
    if (a > max) max = a;
    if (b > max) max = b;
  }
  if (max > 0) {
    const k = peak / max;
    for (let i = 0; i < L.length; i++) { L[i] *= k; R[i] *= k; }
  }
  return max;
}

/**
 * 一次性渲染整段 BGM（离线渲染，播放时零 CPU）。
 * 播放端为了不卡顿用的是分块版本，这里给测试与离线用途。
 * @returns {{left: Float32Array, right: Float32Array, sampleRate: number, seconds: number}}
 */
export function renderBgmScore(sampleRate) {
  const len = Math.floor(BGM_SECONDS * sampleRate);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  renderBgmEvents(buildBgmEvents(), sampleRate, L, R);
  normalizeBgm(L, R);
  return { left: L, right: R, sampleRate, seconds: BGM_SECONDS };
}
