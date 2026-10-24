/**
 * The controller, which the manual described and nothing ever checked.
 *
 * This was the one input path in the game with no test of any kind, and the
 * readme said so out loud. It was also wrong in two places: only the bottom
 * two face buttons jumped, so X and Y did nothing on a pad where the manual
 * promised all four, and Start did nothing at all even though `pause` is an
 * action the input layer already emits for the Escape key. Neither gets
 * reported by players — somebody with an unusual pad just decides the game
 * has no controller support and goes away.
 *
 * A gamepad cannot be plugged into a headless browser, but it does not need
 * to be: `navigator.getGamepads()` is the whole interface the game uses, so
 * the test supplies one. That proves the mapping and the wiring, which is
 * everything except the hardware itself.
 *
 *   node tests/browser-gamepad.mjs      (with the game served on :8123)
 */

import { launch, openGame, checklist } from './browser-kit.mjs';

const b = await launch();
const { page: p, errors } = await openGame(b, { width: 1024, height: 640 });
const { ok, finish } = checklist();

/** Install a fake pad whose buttons the test can press. */
await p.evaluate(() => {
  window.__pad = {
    id: 'Test Pad',
    index: 0,
    connected: true,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
  navigator.getGamepads = () => [window.__pad];
});

const press = async (i, on = true) => {
  await p.evaluate(([idx, v]) => {
    window.__pad.buttons[idx] = { pressed: v, value: v ? 1 : 0 };
  }, [i, on]);
};
const stick = async (v) => {
  await p.evaluate((x) => { window.__pad.axes[0] = x; }, v);
};
const clear = async () => {
  await p.evaluate(() => {
    window.__pad.axes = [0, 0, 0, 0];
    window.__pad.buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
  });
};

const start = async (id = 3) => {
  await p.evaluate((l) => window.__pengu.startLevel(l), id);
  await p.waitForTimeout(240);
};
const read = () =>
  p.evaluate(() => ({
    x: window.__pengu.world.player.x,
    y: window.__pengu.world.player.y,
    onGround: window.__pengu.world.player.onGround,
    state: window.__pengu.state,
  }));

console.log('Kumanda kolu — gerçek tarayıcıda, sahte pad ile\n');

console.log('1) Sol çubuk yürütüyor');
{
  await start();
  const a = await read();
  await stick(0.9);
  await p.waitForTimeout(500);
  const c = await read();
  await clear();
  ok('çubuk sağa itince penguen sağa gidiyor', c.x - a.x > 40, `${Math.round(c.x - a.x)}px`);

  await stick(-0.9);
  await p.waitForTimeout(500);
  const d = await read();
  await clear();
  ok('sola itince sola gidiyor', d.x - c.x < -40, `${Math.round(d.x - c.x)}px`);

  // Below the deadzone nothing may move: a stick at rest is never exactly zero.
  // Measured after the coast from the previous walk has died out, or the test
  // reads leftover momentum and calls it a deadzone failure.
  await p.waitForTimeout(500);
  const e = await read();
  await stick(0.2);
  await p.waitForTimeout(400);
  const f = await read();
  await clear();
  ok('ölü bölge içinde kımıldamıyor', Math.abs(f.x - e.x) < 4, `${Math.round(f.x - e.x)}px`);
}

console.log('\n2) D-pad de yürütüyor');
{
  await start();
  const a = await read();
  await press(15);
  await p.waitForTimeout(500);
  const c = await read();
  await clear();
  ok('D-pad sağ yürütüyor', c.x - a.x > 40, `${Math.round(c.x - a.x)}px`);

  await press(14);
  await p.waitForTimeout(500);
  const d = await read();
  await clear();
  ok('D-pad sol yürütüyor', d.x - c.x < -40, `${Math.round(d.x - c.x)}px`);
}

console.log('\n3) Dört yüz tuşunun dördü de zıplatıyor');
for (const [i, name] of [[0, 'A'], [1, 'B'], [2, 'X'], [3, 'Y']]) {
  await start();
  const a = await read();
  await press(i);
  await p.waitForTimeout(220);
  const c = await read();
  await clear();
  await p.waitForTimeout(120);
  ok(`${name} zıplatıyor`, c.y < a.y - 12, `${Math.round(a.y - c.y)}px yükseldi`);
}

console.log('\n4) Start duraklatıyor');
{
  await start();
  await press(9);
  await p.waitForTimeout(200);
  const paused = await read();
  ok('Start duraklatıyor', paused.state === 'paused', paused.state);
  await press(9, false);
  await p.waitForTimeout(150);
  await press(9);
  await p.waitForTimeout(200);
  const back = await read();
  await clear();
  ok('tekrar basınca devam ediyor', back.state === 'playing', back.state);

  // Held down it must not flap between paused and playing every frame.
  await start();
  await press(9);
  await p.waitForTimeout(600);
  const held = await read();
  await clear();
  await p.waitForTimeout(150);
  ok('basılı tutmak titretmiyor', held.state === 'paused', held.state);
}

console.log('\n5) Kumanda kaybolursa oyun düşmüyor');
{
  await start();
  await p.evaluate(() => {
    navigator.getGamepads = () => {
      throw new Error('blocked');
    };
  });
  await p.waitForTimeout(400);
  const a = await read();
  await p.waitForTimeout(400);
  const c = await read();
  ok('kare akmaya devam ediyor', c.state === 'playing', c.state);
  ok('konsol temiz', errors.length === 0, errors.slice(0, 2).join(' | '));
  // And it comes back: one bad frame must not kill the pad for the session.
  await p.evaluate(() => {
    navigator.getGamepads = () => [window.__pad];
  });
  await stick(0.9);
  await p.waitForTimeout(500);
  const d = await read();
  await clear();
  ok('engel kalkınca kumanda geri geliyor', d.x - c.x > 40, `${Math.round(d.x - c.x)}px`);
}

const code = finish('kumanda kolu çalışıyor');
await b.close();
process.exit(code);
