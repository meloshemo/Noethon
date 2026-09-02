/**
 * Kayalık kuşu — the mountain's bird, and the rest it takes away.
 *
 * Chapter II's own note said it would never have one, and gave a good reason:
 * inside a shaft there is nowhere for a bird to dive from and nowhere for the
 * climber to dodge to. That reason is sound and it is only about shafts.
 *
 * A climb is not all shaft. It is ledges and traverses with shafts between
 * them, and the arm bar drains only while a wall is held and refills only on
 * the ground — so the ledges were not merely safe, they were where the chapter
 * handed the resource back, for free, for as long as anybody liked. Fifteen
 * hard shafts joined by unlimited rest, which is why the climb reads as easy
 * however tight the shafts measure.
 *
 * So the bird hunts that ground and nothing else. What this pack proves is the
 * shape of that promise, because every part of it is a rule the game has to
 * keep and not a number in a file: it never launches at somebody on a wall or
 * in the air, it never takes anybody off rock, it is the plain dive and never
 * a hunter or a pair, its warning is longer than the shelf's — and, the one
 * that matters most, standing still on a ledge is genuinely dangerous now.
 */

import { World } from '../src/game/world.js';
import { CLIMB_LEVELS } from '../src/game/climb.js';
import { AMBUSH } from '../src/game/config.js';

const STEP = 1 / 120;
const noop = () => {};
const deps = () => ({
  particles: { puff: noop, splash: noop, sparkle: noop, burstIce: noop },
  audio: new Proxy({}, { get: () => noop }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});

let fails = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  console.log(`  ✗ ${m}`);
  fails++;
};
const check = (c, m) => (c ? ok(m) : bad(m));

const at = (id) => CLIMB_LEVELS.find((d) => d.id === id);

console.log('Dağın kuşu\n');

console.log('1) Kavrama öğrenilmeden gelmiyor');
{
  for (const id of [32, 33, 34]) {
    const w = new World(at(id), deps());
    check(!w.roost, `L${id}: kavramanın öğretildiği bölümde kuş yok`);
  }
  for (const id of [35, 40, 46]) {
    const w = new World(at(id), deps());
    check(w.roost, `L${id}: kuş var`);
  }
  check(AMBUSH.roostFrom === 35, `eşik ${AMBUSH.roostFrom}. bölüm`);
}

console.log('\n2) Durup dinlenmek artık bedava değil');
{
  /* The whole point, measured: a penguin standing on a ledge doing nothing —
     which is exactly what refilling the arm bar looks like — gets taken. */
  let taken = 0;
  const tries = 12;
  for (let i = 0; i < tries; i++) {
    const w = new World(at(40), deps());
    for (let f = 0; f < 45 * 120 && w.status === 'playing'; f++) {
      w.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: false });
    }
    if (w.skuaGrabs > 0) taken++;
  }
  check(taken >= tries * 0.8, `${taken}/${tries} kez kıpırdamayan penguen yakalandı`);
}

console.log('\n3) Şaftın içindekine hiç saldırmıyor');
{
  /* The objection the chapter was built around, kept. A bird may not even be
     launched at a climber who is holding a wall or in the air, so the shafts
     stay exactly the problem they always were. */
  let badLaunch = 0;
  let launches = 0;
  for (const id of [35, 40, 46]) {
    for (let trial = 0; trial < 6; trial++) {
      const w = new World(at(id), deps());
      const p = w.player;
      let seen = 0;
      for (let f = 0; f < 30 * 120 && w.status === 'playing'; f++) {
        /* Sampled *before* the step, because the world decides whether to
           launch from the state the penguin is in when the frame begins —
           reading it afterwards is a frame late and reports launches that
           never happened that way. */
        const wasOnLedge = p.onGround && !p.clinging;
        // Climb: press into whatever is there and hold the button.
        w.update(STEP, { axis: f % 240 < 120 ? 1 : -1, jumpHeld: true, jumpPressed: f % 90 === 0 });
        if (w.skuas.length > seen) {
          seen = w.skuas.length;
          launches++;
          if (!wasOnLedge) badLaunch++;
        }
        if (!w.skuas.length) seen = 0;
      }
    }
  }
  check(launches > 0, `${launches} saldırı denendi`);
  check(badLaunch === 0, `${badLaunch} tanesi duvardaki ya da havadaki pengueni hedef aldı`);
}

console.log('\n4) Kayadaki pengueni asla almıyor');
{
  /* Absolute, because a reply that only sometimes works teaches the player not
     to trust it — which is worse than having no reply. */
  let grabbedOnWall = 0;
  let held = 0;
  for (const id of [35, 40, 46]) {
    for (let trial = 0; trial < 8; trial++) {
      const w = new World(at(id), deps());
      const p = w.player;
      let grabs = 0;
      for (let f = 0; f < 40 * 120 && w.status === 'playing'; f++) {
        /* What is being asked is whether a grab ever *begins* on a penguin who
           is holding ice — not whether the flag is still set once one is
           already in the air in a bird's feet. */
        const onWall = p.clinging;
        if (onWall) held++;
        w.update(STEP, { axis: f % 300 < 150 ? 1 : -1, jumpHeld: true, jumpPressed: f % 70 === 0 });
        if (w.skuaGrabs > grabs) {
          grabs = w.skuaGrabs;
          if (onWall) grabbedOnWall++;
        }
      }
    }
  }
  check(held > 0, `${held} kare duvarda geçirildi`);
  check(grabbedOnWall === 0, 'duvardayken bir kez bile yakalanmadı');
}

console.log('\n5) Sade dalış, ve daha uzun uyarı');
{
  /* A hunter steers all the way down and is answered by the struggle rather
     than the sidestep; a pair takes both directions away. Either of those on a
     ledge is a threat with no reply. */
  const kinds = new Set();
  let most = 0;
  let warnMin = Infinity;
  for (const id of [35, 41, 46]) {
    for (let trial = 0; trial < 10; trial++) {
      const w = new World(at(id), deps());
      for (let f = 0; f < 30 * 120 && w.status === 'playing'; f++) {
        w.update(STEP, { axis: 0, jumpHeld: false, jumpPressed: false });
        for (const s of w.skuas) {
          kinds.add(s.kind);
          warnMin = Math.min(warnMin, s.warn);
        }
        most = Math.max(most, w.skuas.length);
      }
    }
  }
  check([...kinds].every((k) => k === 'lock'), `yalnızca sade dalış geliyor (${[...kinds].join(',') || '—'})`);
  check(most <= 1, `aynı anda en fazla ${most} kuş`);
  check(
    warnMin >= AMBUSH.warn * 1.2,
    `uyarı ${warnMin.toFixed(2)} sn — sahanlığın ${AMBUSH.warn} sn'sinden uzun`,
  );
}

console.log('\n6) Kaçtıktan sonra ısrar ediyor, sonra vazgeçiyor');
{
  /* The first version deleted the bird the instant a hand touched ice, which
     made the wall a free exit. A real one with a spoiled dive wheels and comes
     back once — so holding on is a decision with a price, and giving up is
     the bird's, not the player's. */
  /*
   * Set up rather than waited for.
   *
   * A climber driven by a loop of "press left, press right, hold the button"
   * almost never happens to be on a wall at the exact instant a bird arrives,
   * so waiting for the situation measures the driver rather than the rule.
   * The situation is therefore built: a bird mid-dive, a penguin on ice.
   */
  const w = new World(at(40), deps());
  const p = w.player;
  const wall = [...w.floes, ...(w.solids ?? [])].find((f) => f.climb);
  check(Boolean(wall), 'tutunulacak bir duvar var');
  p.x = wall.x + wall.w + 1;
  p.y = wall.y + 40;
  p.clinging = true;
  p.wallSide = -1;
  p.wallBlock = wall;
  w._launchSkua({ kind: 'lock' });
  const bird = w.skuas[0];
  bird.state = 'strike';
  bird.t = 0;
  let sawWheel = false;
  let sawLeave = false;
  for (let f = 0; f < 12 * 120; f++) {
    // Held on the wall for the whole pass, which is what the rule asks.
    p.clinging = true;
    p.wallSide = -1;
    p.wallBlock = wall;
    w._flySkua(bird, STEP, {}, false);
    bird.t += STEP;
    if (bird.wheeled) sawWheel = true;
    if (bird.leaving || bird.state === 'leave') {
      sawLeave = true;
      break;
    }
  }
  check(sawWheel, 'duvardaki penguene dalış bozulunca kuş dönüp tekrar geliyor');
  check(sawLeave, 'ikinci geçişte de tutunuyorsa vazgeçip gidiyor');
  check(!bird.hit, 've hiçbir noktada yakalamıyor');
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Dağda artık bedava mola yok — ve kaya hâlâ kaya.');
