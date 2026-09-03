/**
 * Verglas: the move you cannot take back.
 *
 * The mountain has eight verbs and every one of them asks *how long can you
 * hold on* — a face, a chimney, a traverse, a swinging slab, a gale. What they
 * have in common is not the answer, it is that every move on this mountain can
 * be abandoned halfway. You grab, you think, you slide a little, you go.
 *
 * A glazed band is the same wall with nothing on it to hold. On a single face
 * that would just be a wall with a hole in it — you climb in, the grip goes,
 * you fall — so it goes across one wall of a chimney, where there is another
 * wall to take the height on. Crossing it is one move you cannot stop in the
 * middle of, because the middle of it is the part that does not hold.
 *
 * The thing that has to be true above all others is that the *proof* feels it.
 * `climb-run.mjs` drives the real `Player` but builds the intent itself, and it
 * built it at four separate call sites — each of which remembered to pass
 * `gravity` for a hush zone, and three of which knew nothing about a second
 * kind of zone. For one commit this solver's penguin could grip a wall the
 * player's penguin cannot, and it cheerfully declared two levels climbable by
 * a move nobody can make. A proof allowed to be stronger than the game proves
 * nothing at all.
 */

import { Player } from '../src/game/player.js';
import { Tower } from '../src/game/tower.js';
import { CLIMB_LEVELS } from '../src/game/climb.js';
import { glazeAt, climbBudget, scaleForLevel } from '../src/game/config.js';

const STEP = 1 / 120;

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

const GLAZED = CLIMB_LEVELS.filter((d) => (d.zones ?? []).some((z) => z.kind === 'glaze'));

console.log('Cam buz — geri dönüşü olmayan hamle\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Bölge sözleşmesi');
{
  const z = { kind: 'glaze', x: 100, w: 60, top: 200, bottom: 320 };
  check('içinde tutulmuyor', glazeAt([z], 130, 260));
  check('üstünde tutuluyor', !glazeAt([z], 130, 199));
  check('altında tutuluyor', !glazeAt([z], 130, 321));
  check('yanında tutuluyor', !glazeAt([z], 90, 260) && !glazeAt([z], 170, 260));
  check('başka türden bölge etkilemiyor',
    !glazeAt([{ ...z, kind: 'hush' }], 130, 260));
  check('bölge yoksa tutuluyor', !glazeAt(undefined, 130, 260) && !glazeAt([], 130, 260));
}

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Gerçek pengu cam buzda tutunamıyor');
/** One wall, one penguin pressed against it, and a grip flag. */
function hold(grip) {
  const wall = { x: 300, y: 0, w: 26, h: 600, type: 'wall', kind: 'wall', solid: true, climb: true, dx: 0, dy: 0 };
  const p = new Player();
  p.reset(wall.x - 4, 300);
  p.onGround = false;
  p.vy = 40;
  let clung = false;
  for (let i = 0; i < Math.ceil(0.5 / STEP); i++) {
    p.update(STEP, { axis: 1, jumpHeld: false, jumpPressed: false, push: 0, gravity: 1, grip }, [wall], undefined);
    if (p.clinging) clung = true;
  }
  return { clung, y: p.y };
}
const good = hold(1);
const glazed = hold(0);
check('normal duvara tutunuyor', good.clung);
check('cam buza tutunamıyor', !glazed.clung);
check('duvar hâlâ orada — içinden geçmiyor', glazed.y > good.y,
  `cam buzda ${Math.round(glazed.y)}, normalde ${Math.round(good.y)}`);

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Her bant geçilebilir bir yere konmuş');
for (const def of GLAZED) {
  const scale = def.scale ?? scaleForLevel(def.id);
  for (const z of (def.zones ?? []).filter((y) => y.kind === 'glaze')) {
    const mid = (z.top + z.bottom) / 2;
    const behind = def.terrain.filter(
      (t) => t.climb && t.x < z.x + z.w && t.x + t.w > z.x && t.y < z.bottom && t.y + t.h > z.top,
    );
    // The far wall: climbable, across the shaft, and not glazed itself.
    const far = def.terrain.filter(
      (t) => t.climb
        && !(t.x < z.x + z.w && t.x + t.w > z.x)
        && t.y < z.bottom && t.y + t.h > z.top
        && !glazeAt(def.zones, t.x + t.w / 2, mid),
    );
    check(`L${def.id} bant bir duvarın üstünde`, behind.length > 0,
      `${behind.length} duvar`);
    check(`L${def.id} karşısında tutulabilir duvar var`, far.length > 0,
      `${far.length} temiz duvar`);
    // Short enough that the far side can take the height in one creep.
    const budget = climbBudget(scale, 170);
    check(`L${def.id} bant tek tırmanıştan kısa`, z.bottom - z.top < budget.creep,
      `${z.bottom - z.top}px, tek tırmanış ${Math.round(budget.creep)}px`);
  }
}
check('en az bir bölümde cam buz var', GLAZED.length > 0, `${GLAZED.length} bölüm`);

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Besteci geçilemeyecek bandı reddediyor');
{
  const refuse = (fn) => {
    try { fn(); return false; } catch { return true; }
  };
  check('bacasız cam buz reddediliyor', refuse(() => {
    const t = new Tower({ scale: 1.5 });
    t.base();
    t.glaze();
  }));
  check('tek tırmanıştan uzun bant reddediliyor', refuse(() => {
    const t = new Tower({ scale: 1.5 });
    t.base();
    t.chimney({ height: 340 });
    t.glaze({ len: 900 });
  }));
  /* The fixture shafts are 340px rather than 380 because a shaft is now priced
     at the rates it is actually climbed at: the stretch at the bottom where
     only one wall has reached down can only be creeped, at more than twice the
     cost per pixel of the kicking above it. At this scale 380px asks for 67% of
     a bar against a 62% line, so the composer refuses it — which is the whole
     point of the new rule, and a fixture is not exempt from it. */
  // Too long for the shaft, though still short enough to be creepable. `from`
  // is only a wish — a band asked for near the floor is slid up until it has
  // somewhere to gather below it — but the *length* has to fit or there is
  // nowhere left to stand at either end of it.
  check('bacaya sığmayan bant reddediliyor', refuse(() => {
    const t = new Tower({ scale: 1.5 });
    t.base();
    t.chimney({ height: 340 });
    t.glaze({ len: 320 });
  }));
  check('taban yakını istenirse yukarı kaydırılıyor', !refuse(() => {
    const t = new Tower({ scale: 1.5 });
    t.base();
    t.chimney({ height: 340 });
    t.glaze({ from: 0.02 });
  }));
}

console.log(`\n${GLAZED.length} bölümde cam buz.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Dağ artık "ne kadar tutunursun" dışında bir şey de soruyor.');
