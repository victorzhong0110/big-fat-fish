// 程序化音效：全部用 WebAudio 合成，没有任何音频文件
import {
  buildBgmEvents, renderBgmEvents, normalizeBgm, BGM_SECONDS, BGM_BARS,
} from './systems/bgmScore.js';

let ctx = null;
let master = null;
let enabled = true;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ type = 'sine', from, to, dur = 0.12, gain = 0.5, delay = 0 }) {
  const ac = audio();
  if (!ac || !enabled) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to && to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.16, gain = 0.4, freq = 1200 }) {
  const ac = audio();
  if (!ac || !enabled) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  src.connect(filter).connect(g).connect(master);
  src.start();
}

/* ── BGM ──────────────────────────────────────────────────────
 *
 * 「Let Me Go」= 社区用 DeepSeek 大肥鱼音色唱的**摸鱼歌**二创
 * （UP:@罐装毕加索，原作:@星落落_oi；词 deepseek，曲 Suno/豆包，背景 @ZipZipPipe）。
 * 它的内核不是旋律，是**大肥鱼的人设**：干饭、摸鱼、"我要走了"。
 *
 * ⚠️ 版权边界（写在这里是因为它决定了下面这段代码怎么写）：
 *  ① 原曲旋律属迪士尼《冰雪奇缘》⇒ **本项目不复制任何一个原曲音符**，
 *     只取"放飞 / 让我走"的情绪，旋律是**原创**的。
 *  ② 大肥鱼形象本身是**社区二创**（官方从未正式承认）⇒ 本作只做自绘图形与精神致敬，
 *     不复制任何画师的立绘（见 DECISIONS §28）。
 *  ③ 项目铁律「零素材」⇒ **没有音频文件**：整段 BGM 是 WebAudio **合成**出来的。
 *
 * 🎵 **乐谱在 `src/systems/bgmScore.js`**（纯逻辑层，可单测）：
 *    和弦进行、主旋律、低音型、鼓点、气泡 —— 全是数据 + 纯数学。
 *    这里只做适配：把算好的采样塞进 AudioBuffer 循环播放。
 */

/** 采样率上限：32kHz 对背景垫底足够，也把合成成本压到 48k 的 2/3 */
const BGM_RATE_CAP = 32000;
/** 一次任务最多合成多少毫秒（剩下的下一帧继续 ⇒ 起手不卡） */
const BGM_CHUNK_MS = 12;

/**
 * 分块渲染：一次只算一小节，算完让出主线程，下一帧接着算。
 *
 * 🔴 为什么不能一次算完：整段 16 秒的 BGM 要几百万次采样运算，
 * 在慢机器上是一次几百毫秒的**卡顿** —— 表现为"点开始之后画面顿一下"。
 * ⇒ 合成被切成 8 块，每块 ≤12ms ⇒ 任何一帧都不会被拖死。
 */
function renderBgmBufferAsync(ac, onDone) {
  const rate = Math.min(ac.sampleRate, BGM_RATE_CAP);
  const len = Math.floor(BGM_SECONDS * rate);
  const buf = ac.createBuffer(2, len, rate);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  const events = buildBgmEvents();
  let bar = 0;
  const step = () => {
    const t0 = performance.now();
    while (bar < BGM_BARS && performance.now() - t0 < BGM_CHUNK_MS) {
      renderBgmEvents(events, rate, L, R, { onlyBar: bar });
      bar++;
    }
    if (bar < BGM_BARS) { setTimeout(step, 0); return; }
    normalizeBgm(L, R);
    onDone(buf);
  };
  setTimeout(step, 0);
}

let bgmSource = null;
let bgmGain = null;
let bgmOn = true;
let bgmLoading = false;
let bgmToken = 0;      // 取消令牌：渲染期间被关掉/重开时，不播旧的那份

export const bgm = {
  /** 读取玩家偏好（默认开） */
  loadPreference() {
    try {
      bgmOn = localStorage.getItem('tulip.bgm') !== 'off';
    } catch { bgmOn = true; }
    return bgmOn;
  },
  get enabled() { return bgmOn; },
  /** 切换并落盘 */
  toggle() {
    bgmOn = !bgmOn;
    try { localStorage.setItem('tulip.bgm', bgmOn ? 'on' : 'off'); } catch { /* 无痕模式等 */ }
    if (bgmOn) bgm.start(); else bgm.stop();
    return bgmOn;
  },
  /** 必须在用户手势之后调用（浏览器的自动播放策略） */
  start() {
    if (!bgmOn || bgmSource || bgmLoading) return;
    const ac = audio();
    if (!ac) return;
    bgmLoading = true;
    const token = ++bgmToken;
    renderBgmBufferAsync(ac, (buf) => {
      if (token !== bgmToken) return;      // 期间被取消了
      bgmLoading = false;
      if (!bgmOn) return;                  // 期间被关掉了
      bgmGain = ac.createGain();
      bgmGain.gain.value = 0.16;           // BGM 压低，不盖住音效
      bgmGain.connect(master);
      bgmSource = ac.createBufferSource();
      bgmSource.buffer = buf;
      bgmSource.loop = true;
      bgmSource.connect(bgmGain);
      bgmSource.start();
    });
  },
  stop() {
    bgmToken++;                 // 作废正在渲染的那一份
    bgmLoading = false;
    if (!bgmSource) return;
    try { bgmSource.stop(); } catch { /* 已停 */ }
    bgmSource.disconnect();
    bgmSource = null;
  },
};

/**
 * 音频现状（供自动化试玩脚本断言"BGM 真的在放"）。
 *
 * 🔴 报的是**当前事实**（音频上下文是否 running、采样源是否在播、时钟有没有走），
 * 不是"我们打算放" —— 浏览器策略、用户偏好、异常都会让这三件事不一样。
 */
export function audioState() {
  return {
    on: bgmOn,
    playing: !!bgmSource,
    loading: bgmLoading,
    ctxState: ctx ? ctx.state : 'none',
    currentTime: ctx ? ctx.currentTime : 0,
    seconds: BGM_SECONDS,
  };
}

export const sfx = {
  /** 必须在用户手势里调用一次，解锁音频上下文 */
  unlock() { audio(); },
  setEnabled(v) { enabled = v; },
  shoot(level = 1) {
    tone({ type: 'square', from: 520 + level * 45, to: 240, dur: 0.07, gain: 0.16 });
  },
  hit() {
    noise({ dur: 0.09, gain: 0.18, freq: 2600 });
  },
  kill() {
    tone({ type: 'triangle', from: 420, to: 120, dur: 0.16, gain: 0.26 });
    noise({ dur: 0.14, gain: 0.16, freq: 900 });
  },
  bossKill() {
    tone({ type: 'sawtooth', from: 180, to: 48, dur: 0.7, gain: 0.34 });
    noise({ dur: 0.6, gain: 0.3, freq: 420 });
  },
  hurt() {
    tone({ type: 'sawtooth', from: 220, to: 70, dur: 0.28, gain: 0.3 });
  },
  pickup() {
    tone({ type: 'sine', from: 660, to: 1180, dur: 0.12, gain: 0.22 });
  },
  upgrade() {
    tone({ type: 'sine', from: 520, to: 900, dur: 0.1, gain: 0.24 });
    tone({ type: 'sine', from: 780, to: 1400, dur: 0.14, gain: 0.2, delay: 0.07 });
  },
  wave() {
    [523, 659, 784].forEach((f, i) => tone({ type: 'triangle', from: f, to: f, dur: 0.22, gain: 0.18, delay: i * 0.07 }));
  },
  boss() {
    tone({ type: 'sawtooth', from: 90, to: 60, dur: 1.1, gain: 0.3 });
    tone({ type: 'square', from: 140, to: 96, dur: 0.9, gain: 0.12, delay: 0.1 });
  },
  gameover() {
    [523, 415, 330, 247].forEach((f, i) => tone({ type: 'triangle', from: f, to: f * 0.98, dur: 0.3, gain: 0.24, delay: i * 0.14 }));
  },
  dash() {
    noise({ dur: 0.14, gain: 0.16, freq: 1800 });
  },
  /**
   * 第九轮：**对症击杀**的反馈音。
   *
   * 为什么要有：第九轮把"对症"从提示变成了真机制（伤害 ×2），
   * 但如果玩家**听不出/看不出**自己这一下是不是打对了，
   * 这个机制就只是后台里的一个乘数 —— 他学不到"我该拿哪张牌"。
   * ⇒ 每次用对症的手段**杀死**一只怪时给一声清亮的音（只在击杀时播，不会刷屏）。
   */
  counter() {
    tone({ type: 'triangle', from: 980, to: 1560, dur: 0.11, gain: 0.16 });
  },
};
