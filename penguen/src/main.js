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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing') game.togglePause();
  });

  // Stop iOS Safari from double-tap zooming on the controls.
  document.addEventListener(
    'gesturestart',
    (e) => e.preventDefault(),
    { passive: false },
  );

  // Surface load failures instead of leaving a black screen.
  window.addEventListener('error', (e) => {
    console.error('[pengu]', e.error ?? e.message);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
