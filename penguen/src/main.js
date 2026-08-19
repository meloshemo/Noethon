/**
 * Bootstrap: wire storage → input → audio → UI → game, then hand control to
 * the run loop. Nothing here knows how the game works; it just plugs the
 * pieces together.
 */

import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { Storage } from './core/storage.js';
import { Game } from './game/game.js';
import { UI } from './ui/ui.js';

function boot() {
  try {
    start();
  } catch (err) {
    // Nothing is wired up yet at this point, so paint the error by hand.
    const box = document.createElement('div');
    box.className = 'fatal';
    box.innerHTML = '<h2>Oyun başlatılamadı</h2><pre></pre>';
    box.querySelector('pre').textContent =
      `${err?.name}: ${err?.message}\n\n${(err?.stack ?? '').split('\n').slice(1, 5).join('\n')}` +
      `\n\n${navigator.userAgent}\n${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}`;
    document.body.append(box);
    throw err;
  }
}

function start() {
  const canvas = document.getElementById('game');
  let save = Storage.load();

  const input = new Input();
  const audio = new Audio();

  const ui = new UI({
    save,
    audio,
    persist: () => Storage.save(save),
  });

  const game = new Game({ canvas, input, audio, storage: save, ui });
  ui.attach(game, input);
  // The title was first drawn inside the UI constructor, before the game
  // existed — so it could not know about an interrupted run. Draw it again now
  // that it can, or "Devam et" never appears after a reload.
  ui.refreshTitle();

  ui.onReset(() => {
    save = Storage.reset();
    // Rebind the fresh save object everywhere that holds a reference.
    game.save = save;
    ui.save = save;
    game.applySettings();
    ui.refreshTitle();
    ui.buildLevelGrid();
    ui._syncSettings();
    ui.showScreen('title');
  });

  game.showMenuScene();
  ui.showScreen('title');

  // Debug handle — used by the smoke test and handy in the browser console.
  window.__pengu = game;

  // Audio can only start after a user gesture — hook every first-touch path.
  const unlock = () => {
    audio.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  // Pause automatically when the tab or window loses focus.
  // `pagehide` is the one event iOS Safari reliably fires when an app is
  // swiped away; `visibilitychange` alone loses the last few seconds there.
  window.addEventListener('pagehide', () => game.saveSession());

  document.addEventListener('visibilitychange', () => {
    // The page may never get another frame after this — a backgrounded tab can
    // be discarded outright — so the attempt goes to disk before anything else.
    if (document.hidden) game.saveSession();
    if (document.hidden && game.state === 'playing') game.togglePause();
  });

  // Stop iOS Safari from double-tap zooming on the controls.
  document.addEventListener(
    'gesturestart',
    (e) => e.preventDefault(),
    { passive: false },
  );

  // Surface failures on screen. On a phone there is no console, so an
  // uncaught error is indistinguishable from the game simply not starting.
  window.addEventListener('error', (e) => {
    console.error('[pengu]', e.error ?? e.message);
    ui.showFatal?.(e.error ?? new Error(e.message));
  });
  window.addEventListener('unhandledrejection', (e) => {
    ui.showFatal?.(e.reason instanceof Error ? e.reason : new Error(String(e.reason)));
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

/**
 * Register the service worker, so the game works with no signal.
 *
 * Guarded three ways, and each guard is a real case rather than defensive
 * noise: `file://` has no service workers at all, the single-file build has no
 * `sw.js` next to it to register (asking for one would print an error on a page
 * that is otherwise perfect), and a browser without the API should simply carry
 * on playing. A failed registration is never worth telling the player about —
 * the game already works, it just will not work offline.
 */
if (
  !globalThis.__PENGU_SINGLE &&
  'serviceWorker' in navigator &&
  location.protocol.startsWith('http')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => undefined);
  });
}
