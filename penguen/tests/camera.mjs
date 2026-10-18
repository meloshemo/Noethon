/**
 * The camera — what the player can actually see, and when.
 *
 * `tests/viewport.mjs` proves a screen is given the right *amount* of world.
 * This proves the world it is given is pointed at the right place, which is a
 * different question and was the one nobody was asking.
 *
 * The bug it exists to stop: the heads-up strip and the touch pads are drawn
 * **over** the canvas, and the camera framed the penguin as a fraction of the
 * whole view rather than of the band left between them. On a phone held
 * sideways that band is 389 units of a 658-unit view, and a climbing penguin
 * framed at "0.64" landed at eighty-three percent of it — one body height of
 * world underneath him. The number said 64 and the screen said 83, and nothing
 * in the project could tell the difference, because nothing measured the gap
 * between where the penguin is drawn and where the player can see.
 *
 * Everything here is in logical view units. `VIEW` is set by hand rather than
 * measured, which is the only way to ask "what would a phone do" without a
 * phone — and the numbers are the ones a real device reported.
 */

import { World } from '../src/game/world.js';
import { ALL_LEVELS } from '../src/game/chapters.js';
import { VIEW, CAM, PHYS } from '../src/game/config.js';

const STEP = 1 / 120;
const deps = () => ({
  particles: { puff() {}, splash() {}, sparkle() {}, burstIce() {} },
  audio: new Proxy({}, { get: () => () => {} }),
  assist: false,
  upgrades: {},
  skin: 'normal',
});

let fails = 0;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) fails++;
};

/**
 * Four real screens, with the strips a real device reported on each.
 *
 * The pads are the half that matters. A desktop is owed no room for controls
 * it does not draw, and gets none; a phone held sideways loses two fifths of
 * its height to them, which is why it is the shape every rule here is checked
 * hardest against.
 */
const SCREENS = [
  { name: 'masaüstü 16:9', w: 960, h: 540, padTop: 53, padBottom: 0, stage: [1280, 720] },
  { name: 'telefon yatay', w: 1423, h: 658, padTop: 97, padBottom: 172, stage: [844, 390] },
  { name: 'telefon dikey', w: 600, h: 1298, padTop: 176, padBottom: 168, stage: [390, 844] },
  { name: 'tablet dikey', w: 600, h: 800, padTop: 48, padBottom: 120, stage: [768, 1024] },
];

/**
 * The same zoom `render.js` works out, so a measurement here is a measurement
 * of the game rather than of a screen the game never draws.
 *
 * An arena asks the camera to pull back until the room fits, and stops when
 * the penguin would get smaller than `CAM.roomPenguin` real pixels. Pulling
 * back makes every logical unit smaller on the glass, so the strips the
 * interface stands on grow in logical units by the same factor.
 */
const roomZoom = (s, world) => {
  if (!world.brawl) return 1;
  const base = Math.min(s.stage[0] / s.w, s.stage[1] / s.h);
  const room = world.worldW / s.w;
  return Math.max(1, Math.min(room, (world.player.h * base) / CAM.roomPenguin, CAM.roomZoom));
};

const saved = { ...VIEW };
const useScreen = (s) => {
  VIEW.w = s.w;
  VIEW.h = s.h;
  VIEW.padTop = s.padTop;
  VIEW.padBottom = s.padBottom;
};
const restore = () => Object.assign(VIEW, saved);

console.log('Kamera — oyuncunun gerçekten gördüğü yer\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Çerçeve, görüntünün tamamına göre değil, görünen banda göre');
for (const s of SCREENS) {
  useScreen(s);
  const band = s.h - s.padTop - s.padBottom;
  for (const [axis, wish] of [
    ['up', CAM.frameUp],
    ['dive', CAM.frameDive],
    ['across', CAM.frameAcross],
  ]) {
    const def = ALL_LEVELS.find((d) => (d.axis ?? 'across') === axis);
    const w = new World(def, deps());
    const inBand = (w._frameY - s.padTop) / band;
    // The wish, unless the floor under his feet takes precedence — and when it
    // does, the message says so, because a number that quietly stops meaning
    // what it says is the bug this whole file is about.
    const most = (band - w.player.h * (1 + CAM.below)) / band;
    const want = Math.min(wish, most);
    const held = want < wish - 0.001;
    check(
      Math.abs(inBand - want) < 0.002,
      `${s.name} · ${axis}: bandın %${Math.round(inBand * 100)}'inde` +
        (held ? ` (istenen %${Math.round(wish * 100)}, taban %${Math.round(most * 100)}'e çekti)` : ''),
    );
  }
}
restore();

console.log('\n1b) Geniş bir bantta istenen oran birebir uygulanıyor');
{
  useScreen(SCREENS[2]);
  const band = SCREENS[2].h - SCREENS[2].padTop - SCREENS[2].padBottom;
  for (const [axis, wish] of [['up', CAM.frameUp], ['across', CAM.frameAcross]]) {
    const def = ALL_LEVELS.find((d) => (d.axis ?? 'across') === axis);
    const w = new World(def, deps());
    const inBand = (w._frameY - SCREENS[2].padTop) / band;
    check(Math.abs(inBand - wish) < 0.002, `dikey telefon · ${axis}: tam %${Math.round(wish * 100)}`);
  }
  restore();
}

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Hiçbir bölüm pengu\'yu arayüzün altında başlatmıyor');
for (const s of SCREENS) {
  useScreen(s);
  const bad = [];
  for (const def of ALL_LEVELS) {
    const w = new World(def, deps());
    const y = w.player.y - w.camera.y;
    const feet = y + w.player.h;
    if (y < s.padTop || feet > s.h - s.padBottom) bad.push(`L${def.id}@${Math.round(y)}`);
  }
  check(bad.length === 0, `${s.name}: ${bad.slice(0, 4).join(' ') || `${ALL_LEVELS.length} bölüm`}`);
}
restore();

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Altında görülecek bir şey var');
/*
 * The property the complaint was about, stated so it cannot be satisfied by
 * accident: either there are two body heights of world under the penguin's
 * feet inside the visible band, or the bottom of the level is already on
 * screen — in which case there is nothing below to show and the camera is
 * right to have stopped.
 */
for (const s of SCREENS) {
  useScreen(s);
  const thin = [];
  for (const def of ALL_LEVELS) {
    const w = new World(def, deps());
    const feet = w.player.y + w.player.h - w.camera.y;
    const room = s.h - s.padBottom - feet;
    const floorOnScreen = w.contentBottom - w.camera.y <= s.h - s.padBottom + 1;
    // `CAM.below` bodies, less a two-pixel hair: where the floor in `_frameY`
    // is the thing that bound, the answer lands exactly on it and rounding in
    // the camera clamp can take a fraction off.
    if (room < w.player.h * CAM.below - 2 && !floorOnScreen) {
      thin.push(`L${def.id}:${Math.round(room)}px`);
    }
  }
  check(thin.length === 0, `${s.name}: ${thin.slice(0, 4).join(' ') || 'hepsinde iki boy yer var'}`);
}
restore();

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Düşerken kamera aşağı bakıyor');
{
  useScreen(SCREENS[1]);
  /*
   * On a tall level with room under the penguin, because the question is what
   * the camera *wants* and a short level answers with its own bottom edge. The
   * first version of this asked a sea-level shelf and measured nine pixels —
   * which was the clamp talking, not the lead.
   */
  const def = ALL_LEVELS.filter((d) => (d.axis ?? 'across') === 'across')
    .reduce((a, b) => (b.worldH > a.worldH ? b : a));
  const w = new World(def, deps());
  w.player.y = w.contentTop + 200;
  const still = w._cameraTarget().y;
  const falling = w._cameraTarget({ drop: Math.min(CAM.dropMax, PHYS.maxFall * CAM.drop) }).y;
  check(falling > still + 100, `uç hızda ${Math.round(falling - still)}px aşağı bakıyor`);
  check(falling - still <= CAM.dropMax + 1, `ve bakışın bir sınırı var — ${CAM.dropMax}px`);
  // Rising is deliberately much weaker: a jump ends where it started. Read
  // from the middle of the level, where the clamp has nothing to say.
  w.player.y = w.contentTop + 600;
  const mid = w._cameraTarget().y;
  const rising = w._cameraTarget({ drop: Math.max(-CAM.riseMax, PHYS.jumpVelocity * CAM.drop) }).y;
  check(
    mid - rising > 0 && mid - rising <= CAM.riseMax + 1 && CAM.riseMax < CAM.dropMax / 2,
    `zıplarken yalnızca ${Math.round(mid - rising)}px yukarı — düşüşün %${Math.round((CAM.riseMax / CAM.dropMax) * 100)}'i`,
  );
  restore();
}

/* 5 --------------------------------------------------------------------- */
console.log('\n5) Ve o bakış düşüşün içinde işe yarıyor');
{
  useScreen(SCREENS[1]);
  /*
   * A real fall, run twice through the real camera: once as the game now
   * plays it, and once with the lead taken away and the old follow rate put
   * back. A lead the follow never catches up with is a lead on paper, so the
   * thing worth measuring is not the gap to the target — it is how much more
   * world is actually under the penguin when he lands.
   */
  const def = ALL_LEVELS.filter((d) => (d.axis ?? 'across') === 'across')
    .reduce((a, b) => (b.worldH > a.worldH ? b : a));
  const fall = (led) => {
    const w = new World(def, deps());
    w.player.y = w.contentTop + 200;
    w.player.vy = 0;
    w._centerCamera();
    for (let i = 0; i < 60; i++) {
      w.player.vy = Math.min(PHYS.maxFall, w.player.vy + PHYS.gravityDown * STEP);
      w.player.y += w.player.vy * STEP;
      if (led) {
        w._followCamera(STEP);
      } else {
        // The camera as it was: no vertical lead, one fixed follow rate.
        const at = w._cameraTarget();
        w.camera.y += (at.y - w.camera.y) * (1 - Math.exp(-CAM.followY * STEP));
      }
    }
    return SCREENS[1].h - SCREENS[1].padBottom - (w.player.y + w.player.h - w.camera.y);
  };
  const now = fall(true);
  const before = fall(false);
  check(now > before + 40, `yarım saniyelik düşüşte ayağının altı ${Math.round(before)}px → ${Math.round(now)}px`);
  restore();
}

/* 6 --------------------------------------------------------------------- */
console.log('\n6) Duran bir penguende iki kamera aynı şeyi söylüyor');
/*
 * `_centerCamera` runs when a level starts or a death is undone, `_followCamera`
 * on every frame after. They were two copies of the same three fractions, and
 * the only reason they never disagreed is that nobody changed one of them.
 */
for (const s of SCREENS) {
  useScreen(s);
  const off = [];
  for (const def of ALL_LEVELS) {
    const w = new World(def, deps());
    const start = { x: w.camera.x, y: w.camera.y };
    w.player.vx = 0;
    w.player.vy = 0;
    for (let i = 0; i < 240; i++) w._followCamera(STEP);
    if (Math.abs(w.camera.x - start.x) > 1 || Math.abs(w.camera.y - start.y) > 1) {
      off.push(`L${def.id}`);
    }
  }
  check(off.length === 0, `${s.name}: ${off.slice(0, 4).join(' ') || 'kayma yok'}`);
}
restore();

/* 7 --------------------------------------------------------------------- */
console.log('\n7) Tırmanırken kamera tutuşla birlikte sallanmıyor');
{
  useScreen(SCREENS[1]);
  const def = ALL_LEVELS.find((d) => d.axis === 'up');
  const w = new World(def, deps());
  w.player.clinging = true;
  const held = w._cameraTarget({ drop: 0 }).y;
  w.player.vy = 400;
  // What `_followCamera` would feed in while clinging: nothing.
  const moving = w._cameraTarget({ drop: 0 }).y;
  check(held === moving, 'duvardaki penguenin hızına kamera bakmıyor');
  restore();
}

/* 7b -------------------------------------------------------------------- */
console.log('\n7b) Arenada kamera adım başına sallanmıyor');
{
  useScreen(SCREENS[0]);
  /*
   * A brawl is a room, not a route: you walk back and forth across one stage
   * on purpose. The sideways lead exists to show you where you are *going*,
   * and in here there is nowhere to go — so it only swings the picture every
   * time you change your mind, in the chapter whose whole subject is reading
   * precise positions.
   */
  const def = ALL_LEVELS.find((d) => d.brawl);
  const w = new World(def, deps());
  const x0 = def.worldW / 2;
  w.player.x = x0;
  w.player.vx = PHYS.moveSpeed;
  w._centerCamera();
  const still = w.camera.x;
  w._followCamera(1 / 120);
  check(
    Math.abs(w.camera.x - still) < 0.6,
    `tam hızda yürürken kamera ${Math.abs(w.camera.x - still).toFixed(2)}px öne kaçıyor`,
  );
  // And the shelf still leads, because there it is the whole point.
  const shelf = ALL_LEVELS.find((d) => (d.axis ?? 'across') === 'across' && !d.brawl);
  const s2 = new World(shelf, deps());
  s2.player.x = s2.def.worldW / 2;
  s2.player.vx = PHYS.moveSpeed;
  s2._centerCamera();
  const before = s2.camera.x;
  for (let i = 0; i < 60; i++) s2._followCamera(1 / 120);
  check(s2.camera.x > before + 30, `sahanlıkta hâlâ ${Math.round(s2.camera.x - before)}px öne bakıyor`);
  restore();
}

/* 8 --------------------------------------------------------------------- */
console.log('\n8) Arenada atışın geldiği yer okunabiliyor');
/*
 * An arena is 1500 units wide and a desktop sees 960 of them, so standing on
 * the spot a duel is built around puts the thrower off the screen on more
 * than a third of the duels in the chapter — and fifty-four of seventy-eight
 * on a phone held upright. That was invisible until it was counted.
 *
 * The chapter's fairness is the wind-up, and the wind-up is drawn as a line
 * on the ice. So the property is not "the thrower is visible" — it cannot be,
 * the room is wider than the screen — it is that **the line is**: enough of
 * it crosses the band for the player to read where the shot is coming from
 * before it arrives. `render.js` draws it whether or not the arm that drew it
 * is on screen, and marks the edge it came from.
 */
for (const s of SCREENS) {
  let off = 0;
  let duels = 0;
  const blind = [];
  let zoom = 1;
  for (const def of ALL_LEVELS.filter((d) => d.brawl)) {
    useScreen(s);
    const w = new World(def, deps());
    zoom = roomZoom(s, w);
    // The arena's own box: wider, and with wider strips to match.
    useScreen({
      w: Math.round(s.w * zoom),
      h: Math.round(s.h * zoom),
      padTop: Math.round(s.padTop * zoom),
      padBottom: Math.round(s.padBottom * zoom),
    });
    for (const plan of def.plan ?? []) {
      duels++;
      w.player.x = plan.stand.x - w.player.w / 2;
      w.player.vx = 0;
      w.player.vy = 0;
      w._centerCamera();
      const left = w.camera.x;
      const right = left + VIEW.w;
      const r = def.rivals[plan.shooter];
      const hand = { x: r.x + r.w / 2, y: r.y + r.h * 0.34 };
      if (hand.x < left || hand.x > right) off++;
      // How much of the shot's path is on screen before it reaches the spot.
      const seen = Math.min(Math.max(hand.x, left), right);
      const run = Math.abs(plan.stand.x - seen);
      if (run < 200) blind.push(`L${def.id}:${Math.round(run)}px`);
    }
  }
  check(
    blind.length === 0,
    `${s.name}: ×${zoom.toFixed(2)} geri çekiliyor, atıcıların %${Math.round((off / duels) * 100)}'i ` +
      `hâlâ ekran dışında, hattın görünen kısmı ${blind.slice(0, 3).join(' ') || 'her düelloda 200px+'}`,
  );
}
restore();

/* 9 --------------------------------------------------------------------- */
console.log('\n9) Ölü bölge, uzanacağın şeyi saklamıyor');
/*
 * The dead box is the one change here that can take something away. It lets
 * the camera sit up to `CAM.dead.y` from where it would otherwise be, and the
 * worst direction is *down*: the view slides down, the penguin rides higher in
 * the frame, and the sky above him shrinks. On a mountain and under the ice
 * that sky is where the next hold and the next hole in the ice are.
 *
 * So it is checked rather than argued: stand on every slab in the game, settle
 * the camera, then shove it the full width of the box in the direction that
 * hurts, and the thing you would reach for next must still be on the screen.
 */
for (const s of SCREENS) {
  useScreen(s);
  const lost = [];
  for (const def of ALL_LEVELS) {
    const axis = def.axis ?? 'across';
    const w = new World(def, deps());
    const box = w._deadZone(0).y;
    const slabs = [...(def.floes ?? []), ...(def.terrain ?? [])].filter((f) => f.w > 20);
    /*
     * What counts as "the thing you would reach for next", per chapter.
     *
     * Not simply the nearest slab above: under the ice the nearest slab above
     * is the ice *cap*, which is the ceiling of the world and nobody has ever
     * reached for it — on a phone held upright, where the view is taller than
     * the whole water column and the camera centres it, that cap sits under
     * the strip and always has. The sea's targets are the holes cut through
     * it. On a shelf it is whatever a jump can rise to, about a hundred and
     * forty pixels; on a mountain, the next hold.
     */
    const reach = axis === 'up' ? 240 : 150;
    const targets = axis === 'dive' ? (def.air ?? []) : slabs;
    for (const from of slabs) {
      let next = null;
      for (const f of targets) {
        if (f === from || f.y >= from.y - 8) continue;
        if (from.y - f.y > (axis === 'dive' ? 300 : reach)) continue;
        if (f.x > from.x + from.w + 260 || f.x + f.w < from.x - 260) continue;
        if (!next || f.y > next.y) next = f;
      }
      if (!next) continue;
      w.player.x = from.x + from.w / 2 - w.player.w / 2;
      w.player.y = from.y - w.player.h;
      w.player.vx = 0;
      w.player.vy = 0;
      w._centerCamera();
      /*
       * The box at its worst: the view pushed down, the sky above squeezed.
       *
       * Stated as "the box does not hide what was visible" rather than "every
       * target is visible", because the second is a different claim and two
       * targets fail it already — and both turned out to be this test's own
       * fault rather than the game's. An air hole is read here by its `y`,
       * which is its top edge up in the ice; on levels 53 and 61, on a phone
       * held sideways, that edge is thirty-two pixels under the strip while
       * the other seventy-eight of the hole, including the mouth the swimmer
       * actually swims into, is in plain view. Measured rather than assumed,
       * and written down in `docs/YAPILACAKLAR.md` §2.9 so it is not
       * rediscovered as a bug a third time.
       */
      const was = next.y - w.camera.y >= VIEW.padTop;
      const now = next.y - (w.camera.y + box) >= VIEW.padTop;
      if (was && !now) lost.push(`L${def.id}@${Math.round(next.y - w.camera.y - box)}`);
    }
  }
  check(lost.length === 0, `${s.name}: ${lost.slice(0, 4).join(' ') || 'bir sonraki tutamak hep ekranda'}`);
}
restore();

/* 10 -------------------------------------------------------------------- */
console.log('\n10) Ve küçük adımlarda resim duruyor');
{
  useScreen(SCREENS[0]);
  /*
   * The number the box was written for. Pacing ninety pixels either side of
   * one spot for five seconds, in a room: how far does the picture travel?
   */
  const def = ALL_LEVELS.find((d) => d.brawl);
  const pace = (on) => {
    const w = new World(def, deps());
    const x0 = def.worldW / 2;
    w.player.x = x0;
    w._centerCamera();
    let travel = 0;
    let prev = w.camera.x;
    for (let i = 0; i < 600; i++) {
      const t = i * STEP;
      w.player.x = x0 + Math.sin((t * Math.PI) / 0.6) * 90;
      w.player.vx = Math.cos((t * Math.PI) / 0.6) * PHYS.moveSpeed;
      if (on) {
        w._followCamera(STEP);
      } else {
        const at = w._cameraTarget();
        w.camera.x += (at.x - w.camera.x) * (1 - Math.exp(-CAM.followX * STEP));
      }
      travel += Math.abs(w.camera.x - prev);
      prev = w.camera.x;
    }
    return Math.round(travel);
  };
  const withBox = pace(true);
  const without = pace(false);
  check(withBox < without * 0.25, `beş saniyelik gidiş gelişte resim ${without}px → ${withBox}px`);
  restore();
}

console.log('');
if (fails) {
  console.log(`✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('✓ Kamera, oyuncunun görebildiği yere bakıyor.');
