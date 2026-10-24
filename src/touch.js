// 触屏摇杆：移动端左半屏拖拽 + 自动开火开关
const state = {
  enabled: false,
  move: { x: 0, y: 0 },
  autoFire: false,
  pointerId: null,
};

let pad;
let stick;
let knob;
let button;

function setKnob(dx, dy) {
  const max = 34;
  knob.style.transform = `translate(${dx * max}px, ${dy * max}px)`;
}

export const touch = {
  init() {
    pad = document.querySelector('#touch-pad');
    stick = document.querySelector('#stick');
    knob = document.querySelector('#stick-knob');
    button = document.querySelector('#auto-fire');

    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    state.enabled = Boolean(coarse || isTouch);
    if (!state.enabled) {
      pad.hidden = true;
      return;
    }
    pad.hidden = false;

    const onDown = (e) => {
      if (state.pointerId !== null) return;
      state.pointerId = e.pointerId;
      stick.setPointerCapture?.(e.pointerId);
      this.moveFrom(e);
      e.preventDefault();
    };
    const onMove = (e) => {
      if (state.pointerId !== e.pointerId) return;
      this.moveFrom(e);
      e.preventDefault();
    };
    const onUp = (e) => {
      if (state.pointerId !== e.pointerId) return;
      state.pointerId = null;
      state.move.x = 0;
      state.move.y = 0;
      setKnob(0, 0);
      e.preventDefault();
    };
    stick.addEventListener('pointerdown', onDown);
    stick.addEventListener('pointermove', onMove);
    stick.addEventListener('pointerup', onUp);
    stick.addEventListener('pointercancel', onUp);

    button.addEventListener('click', () => {
      state.autoFire = !state.autoFire;
      button.setAttribute('aria-pressed', String(state.autoFire));
    });
  },

  moveFrom(e) {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2);
    let dy = (e.clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    state.move.x = dx;
    state.move.y = dy;
    setKnob(dx, dy);
  },

  get enabled() { return state.enabled; },
  get move() { return state.move; },
  get autoFire() { return state.enabled && state.autoFire; },
};
