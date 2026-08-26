/**
 * Unified input layer.
 *
 * Keyboard, on-screen touch pads and gamepads all feed the same small state
 * object, so gameplay code never has to know where a press came from.
 */

const KEY_MAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  KeyR: 'restart',
  Escape: 'pause',
  KeyP: 'pause',
  Enter: 'confirm',
};

export class Input {
  constructor() {
    this.state = { left: false, right: false, jump: false };
    /** Actions consumed once per press (restart / pause / confirm). */
    this.pressed = new Set();
    this._sources = { key: new Set(), touch: new Set(), pad: new Set() };
    this._listeners = new Map();
    this._enabled = true;
    this._bindKeyboard();
  }

  on(action, fn) {
    if (!this._listeners.has(action)) this._listeners.set(action, new Set());
    this._listeners.get(action).add(fn);
    return () => this._listeners.get(action).delete(fn);
  }

  _emit(action) {
    const set = this._listeners.get(action);
    if (set) for (const fn of set) fn();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      // Space/arrows would otherwise scroll the page.
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      this._sources.key.add(action);
      this._sync();
      this._emit(action);
    });

    window.addEventListener('keyup', (e) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      this._sources.key.delete(action);
      this._sync();
    });

    // Releasing everything on blur avoids a stuck "held" key after alt-tab.
    window.addEventListener('blur', () => this.releaseAll());
    // And on a phone, where the window is often never told it lost focus. A
    // call arrives while the thumb is on the jump pad, the pad never sees a
    // pointerup, and the penguin comes back from the call still holding it.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
  }

  /**
   * Wire an element as a virtual button. Pointer events cover mouse, pen and
   * touch with one code path; `touch-action: none` in CSS stops scrolling.
   */
  bindButton(el, action) {
    if (!el) return;
    const press = (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('is-pressed');
      this._sources.touch.add(action);
      this._sync();
      this._emit(action);
    };
    const release = (e) => {
      e.preventDefault();
      el.classList.remove('is-pressed');
      this._sources.touch.delete(action);
      this._sync();
    };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  pollGamepad() {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = [...pads].find(Boolean);
    const next = new Set();
    if (pad) {
      const ax = pad.axes[0] ?? 0;
      if (ax < -0.35 || pad.buttons[14]?.pressed) next.add('left');
      if (ax > 0.35 || pad.buttons[15]?.pressed) next.add('right');
      if (pad.buttons[0]?.pressed || pad.buttons[1]?.pressed) next.add('jump');
    }
    const had = this._sources.pad;
    for (const a of next) if (!had.has(a)) this._emit(a);
    this._sources.pad = next;
    this._sync();
  }

  _sync() {
    const held = (a) =>
      this._enabled &&
      (this._sources.key.has(a) || this._sources.touch.has(a) || this._sources.pad.has(a));
    this.state.left = held('left');
    this.state.right = held('right');
    this.state.jump = held('jump');
  }

  releaseAll() {
    this._sources.key.clear();
    this._sources.touch.clear();
    this._sources.pad.clear();
    document.querySelectorAll('.is-pressed').forEach((el) => el.classList.remove('is-pressed'));
    this._sync();
  }

  /** Movement axis in [-1, 1]. */
  get axis() {
    return (this.state.right ? 1 : 0) - (this.state.left ? 1 : 0);
  }
}
