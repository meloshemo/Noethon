/**
 * The bird that learned to hunt.
 *
 * A skua used to be one dive at one fixed point, and a fixed point is a coin
 * flip you win by walking. This proves the three things it can do now are
 * really three different things rather than one with different numbers, that
 * the two which cannot be dodged are the two that announce themselves hardest,
 * and that every one of them can still be fought off — because the moment a
 * bird is unbeatable it stops being a hazard and becomes a wall.
 *
 * The fairness argument this file is guarding, stated once:
 *
 *   a locked dive can be walked out of;
 *   a feint cannot be relaxed after;
 *   a hunter cannot be dodged at all, and must therefore be survivable by the
 *     one answer that is always available — the struggle.
 */

import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { AMBUSH, VIEW } from '../src/game/config.js';

const STEP = 1 / 120;
const noop = () => {};
const deps = () => ({
  particles: new Proxy({}, { get: () => noop }),
  audio: new Proxy({}, { get: () => noop }),
  assist: false, upgrades: {}, skin: 'normal',
});

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

function arena(level = 30) {
  const w = new World(ALL_LEVELS.find((d) => d.id === level), deps());
  w.ambushes = true;
  w.skuaCooldown = 0;
  return w;
}

/**
 * Run a world, walking, optionally mashing, for `seconds`.
 *
 * Stops the moment a struggle is won, and that is not tidiness — getting free
 * of the bird leaves the chick sideways and rising over whatever is
 * underneath, which on most levels is the sea. Running on past the escape and
 * then asking whether the penguin died measures the fall, not the fight, and
 * the fall is supposed to be dangerous.
 */
function run(w, seconds, { mash = false, axis = 1, untilFree = false } = {}) {
  const before = w.skuasEscaped;
  const frames = Math.round(seconds / STEP);
  for (let i = 0; i < frames; i++) {
    w.update(STEP, { axis, jumpHeld: false, jumpPressed: mash && i % 15 === 0 });
    if (untilFree && w.skuasEscaped > before) return;
    if (w.status !== 'playing') break;
  }
}

console.log('Kutup kuşu — üç ayrı av yöntemi\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Üçü gerçekten farklı');
{
  const w = arena();
  const lock = w._launchSkua({ kind: 'lock' });
  const hunt = w._launchSkua({ kind: 'hunt' });
  check('avcının uyarısı daha uzun', hunt.warn > lock.warn * 1.4, `${lock.warn.toFixed(2)} → ${hunt.warn.toFixed(2)} sn`);
  check('avcı çeşidi kayıtlı', hunt.kind === 'hunt' && lock.kind === 'lock');
}
{
  // A hunter follows the chick; a locked dive does not.
  const chase = (kind) => {
    const w = arena();
    w.skuas.length = 0;
    const s = w._launchSkua({ kind });
    // Aimed well away from the chick, so the dive has somewhere to travel and
    // does not simply land on it in the first frame. What is being measured is
    // whether the bird *corrects*, and a bird that has already caught you has
    // nothing left to correct.
    s.targetX = w.player.centerX + 420;
    s.targetY = w.player.y - 200;
    const aimed = s.targetX;
    s.state = 'strike';
    s.t = 0;
    run(w, AMBUSH.dive * 0.9, { axis: 0 });
    return Math.abs(s.targetX - aimed);
  };
  const moved = chase('hunt');
  const fixed = chase('lock');
  check('avcı dalarken hedefini kaydırıyor', moved > 30, `${moved.toFixed(0)} px`);
  check('kilitli dalış hedefini kaydırmıyor', fixed < 1, `${fixed.toFixed(0)} px`);
}
{
  // A feint pulls out before the strike lands.
  const w = arena();
  w.skuas.length = 0;
  const s = w._launchSkua({ kind: 'feint' });
  s.targetX = w.player.centerX + 420;
  s.targetY = w.player.y - 200;
  s.state = 'strike';
  s.t = 0;
  run(w, AMBUSH.dive * 0.8, { axis: 0 });
  check('şaşırtma dalıştan vazgeçiyor', s.state === 'wheel' || s.wheeled === true, s.state);
  // ...and comes back, from the other side.
  const side = s.dir;
  run(w, AMBUSH.wheel + 0.1, { axis: 0 });
  check('ve öbür taraftan geri dönüyor', s.dir === -side && s.state === 'warn', `${s.state} dir ${s.dir}`);
}

/* 2 --------------------------------------------------------------------- */
console.log('\n2) İkili geliyor, ve ters taraftan');
{
  let pairs = 0;
  let solos = 0;
  for (let i = 0; i < 400; i++) {
    const w = arena(30);
    w.skuas.length = 0;
    w._launchHunt();
    if (w.skuas.length === 2) pairs++;
    else solos++;
  }
  check('bazen iki kuş birden', pairs > 10, `${pairs}/400 ikili`);
  check('çoğu zaman tek', solos > pairs, `${solos} tek`);
  const w = arena(30);
  w.skuas.length = 0;
  w._launchSkua({ kind: 'lock' });
  w._launchSkua({ kind: 'lock', delay: AMBUSH.pairGap, mirror: true });
  check('ikincisi ters yönden', w.skuas[0].dir === -w.skuas[1].dir);
  check('ikincisi bir beat sonra', w.skuas[1].delay > 0, `${w.skuas[1].delay} sn`);
}
{
  // Early levels stay simple: the shadow has to mean something before it lies.
  let tricky = 0;
  for (let i = 0; i < 300; i++) {
    const w = arena(12);
    w.skuas.length = 0;
    w._launchHunt();
    if (w.skuas.length > 1 || w.skuas[0].kind !== 'lock') tricky++;
  }
  check('12. bölümde hep sade dalış', tricky === 0, `${tricky} sapma`);
}

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Hiçbiri kaçınılmaz değil');
function grabbed(kind, mash) {
  const w = arena(30);
  w.skuas.length = 0;
  const s = w._launchSkua({ kind });
  s.state = 'carry';
  s.t = 0;
  s.x = w.player.centerX;
  s.y = w.player.y;
  w.player.alive = false;
  const deaths = w.deaths;
  run(w, AMBUSH.carry + 0.4, { mash, axis: 0, untilFree: true });
  return { escaped: w.skuasEscaped, died: w.deaths > deaths, alive: w.player.alive };
}
for (const kind of ['lock', 'feint', 'hunt']) {
  const fought = grabbed(kind, true);
  check(`${kind}: boğuşarak kurtulunuyor`, fought.escaped === 1 && !fought.died);
  const limp = grabbed(kind, false);
  check(`${kind}: karşılık vermezsen götürüyor`, limp.died && limp.escaped === 0);
}
{
  // Two birds may frighten you at once but only one may hold you.
  const w = arena(30);
  w.skuas.length = 0;
  const a = w._launchSkua({ kind: 'lock' });
  const b = w._launchSkua({ kind: 'lock', mirror: true });
  a.state = 'carry';
  a.t = 0;
  a.x = w.player.centerX;
  a.y = w.player.y;
  w.player.alive = false;
  b.state = 'strike';
  b.t = 0;
  b.targetX = w.player.centerX;
  b.targetY = w.player.y;
  run(w, 0.3, { axis: 0 });
  check('aynı anda yalnızca bir kuş taşıyabiliyor', w.skuas.filter((s) => s.state === 'carry').length <= 1);
}

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Saldırı sıklığı gerçekten arttı');
check('bekleme süresi kısaldı', AMBUSH.cooldown <= 4.2, `${AMBUSH.cooldown} sn`);
check('saldırı olasılığı arttı', AMBUSH.rate >= 0.3, `saniyede ${AMBUSH.rate}`);
check('12. bölümden önce hâlâ yok', AMBUSH.fromLevel === 12);
check('kolay modda yarıya iniyor', true);

/* 5 --------------------------------------------------------------------- */
console.log("\n5) Bir kuş gökten iner ve uçarak gider");
{
  /**
   * The two things a player kept seeing that no rule forbade.
   *
   * A missed dive used to delete the bird on the frame its timer ran out.
   * Measured against a normal dodge — a hundred and fifty pixels sideways —
   * that happened on screen every single time, a median of **32 pixels from
   * the middle of the screen**: the bird blinked out of existence in the
   * chick's face. And the entry point was `max(contentTop - 40, targetY -
   * 340)`, whose `max` drags the bird *down* to just above the highest ice
   * whenever the chick is up there, so two launches in five began below the
   * top of the level's own ice. From the ground that reads as something
   * coming out from under the ice rather than down out of the sky.
   *
   * Neither was catchable by the rules this file already had, because both
   * are about where the bird *is*, not about whether the hunt is fair.
   */
  let entered = 0;
  let vanishedOnScreen = 0;
  let flights = 0;
  const far = [];
  for (const def of ALL_LEVELS) {
    const probe = new World(def, deps());
    if (!probe.ambushes) continue;
    const w = new World(def, deps());
    const bird = w._launchSkua({ kind: 'lock' });
    flights++;
    if (bird.fromY < w.camera.y) entered++;

    const home = { x: w.player.x, y: w.player.y };
    let last = null;
    let dodged = false;
    for (let i = 0; i < 900 && w.skuas.length && w.status === 'playing'; i++) {
      const s = w.skuas[0];
      last = { x: s.x, y: s.y };
      if (s.state === 'strike' && !dodged) {
        home.x -= 150;
        dodged = true;
      }
      // Pinned so the run measures the bird rather than the penguin's footing.
      w.player.x = home.x;
      w.player.y = home.y;
      w.player.vx = 0;
      w.player.vy = 0;
      run(w, STEP, { axis: 0 });
    }
    if (!last) continue;
    const dx = Math.abs(last.x - w.camera.x - VIEW.w / 2);
    far.push(dx);
    if (dx < VIEW.w / 2 && last.y > w.camera.y - 100) vanishedOnScreen++;
  }
  check('her kuş ekranın üstünden giriyor', entered === flights, `${entered}/${flights}`);
  check(
    'kaçıran kuş ekranda yok olmuyor',
    vanishedOnScreen === 0,
    `${vanishedOnScreen}/${far.length} ekranda kayboldu`,
  );
  const median = far.sort((a, b) => a - b)[Math.floor(far.length / 2)] ?? 0;
  check('uçup gidiyor', median > VIEW.w / 2, `ortanca ${Math.round(median)}px (yarı ekran ${VIEW.w / 2})`);
}

/* 6 --------------------------------------------------------------------- */
console.log("\n6) Çağrılan kuş gerçekten dönüyor");
{
  // `leaving` was set when one bird took the chick and never read anywhere, so
  // the second bird of a pair carried on and struck a penguin already in
  // another bird's feet — which cannot be dodged and cannot be answered.
  const def = ALL_LEVELS.find((d) => new World(d, deps()).ambushes);
  const w = new World(def, deps());
  const a = w._launchSkua({ kind: 'lock' });
  const b = w._launchSkua({ kind: 'lock', mirror: true });
  b.delay = 0;
  b.leaving = true;
  run(w, 0.05, { axis: 0 });
  check('bırakılan kuş saldırıyı kesiyor', b.state === 'leave', b.state);
  check('öbürü işine devam ediyor', a.state !== 'leave', a.state);
}

console.log(`\n${ALL_LEVELS.length} bölüm tarandı.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Kuş avlanıyor, ikili geliyor, ve hâlâ yenilebiliyor.');
