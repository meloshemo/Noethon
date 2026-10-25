/**
 * Ghost codec checks.
 *
 * A share code is the one piece of this game that leaves the device and comes
 * back, so it gets tested directly: a run has to survive the round trip
 * exactly, a damaged paste has to fail quietly instead of throwing, and the
 * code has to stay short enough to send in a message.
 */

import { GhostRecorder, Ghost, encodeRun, decodeRun, withName, SAMPLE_RATE } from '../src/game/ghost.js';

let failures = 0;

function check(name, cond, detail = '') {
  if (cond) return;
  failures++;
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

/* ------------------------------------------------------------------ */
/* A recorded run                                                      */
/* ------------------------------------------------------------------ */

/** A fake player walking right and jumping, sampled the way the world does. */
function recordFakeRun(seconds) {
  const rec = new GhostRecorder();
  const player = { x: 40, y: 400, facing: 1, onGround: true, charge: 0, cursed: false };
  const dt = 1 / 120;
  for (let t = 0; t < seconds; t += dt) {
    player.x += 320 * dt;
    player.y = 400 - Math.abs(Math.sin(t * 2)) * 90;
    player.onGround = player.y > 399;
    player.charge = t > 5 && t < 9 ? 1 : 0;
    player.facing = Math.sin(t * 0.7) > -0.9 ? 1 : -1;
    rec.sample(dt, player);
  }
  return rec;
}

const rec = recordFakeRun(30);
const expected = Math.round(30 / SAMPLE_RATE);
check('sample rate', Math.abs(rec.length - expected) <= 2, `${rec.length} vs ~${expected}`);

/* ------------------------------------------------------------------ */
/* Round trip                                                          */
/* ------------------------------------------------------------------ */

const code = encodeRun({ samples: rec.samples, time: 30.42, level: 7, name: 'Ayşe' });
const back = decodeRun(code);

check('decodes', back !== null);
check('level survives', back?.level === '7', back?.level);
check('time survives', Math.abs(back.time - 30.42) < 0.005, String(back?.time));
check('name survives utf-8', back?.name === 'Ayşe', back?.name);
check('sample count survives', back.samples.length === rec.samples.length);

const mismatch = rec.samples.findIndex((s, i) => {
  const b = back.samples[i];
  return !b || b.x !== s.x || b.y !== s.y || b.f !== s.f || b.s !== s.s;
});
check('every sample is identical', mismatch === -1, `first differs at ${mismatch}`);

/* ------------------------------------------------------------------ */
/* Size                                                                */
/* ------------------------------------------------------------------ */

// A code that cannot be pasted into a chat message is not a share code.
check('30s run stays pasteable', code.length < 4000, `${code.length} chars`);
console.log(`  30 sn kod: ${code.length} karakter (${(code.length / rec.length).toFixed(1)}/örnek)`);

/* ------------------------------------------------------------------ */
/* Bad input must never throw                                          */
/* ------------------------------------------------------------------ */

const junk = [
  '',
  '   ',
  'merhaba',
  'PG1',
  'PG1.7.3042',
  'PG9.7.3042.-.AAAA',
  `${code.slice(0, code.length - 12)}!!!!`,
  code.replace('PG1', 'PG2'),
  null,
  undefined,
  {},
];
for (const bad of junk) {
  let threw = false;
  let out;
  try {
    out = decodeRun(bad);
  } catch (err) {
    threw = true;
  }
  check(`bad input is quiet: ${JSON.stringify(bad)?.slice(0, 24)}`, !threw && (out === null || out?.samples?.length > 1));
}

// Whitespace from a chat app must not break a good code.
check('survives wrapped whitespace', decodeRun(`  ${code.slice(0, 40)}\n${code.slice(40)}  `)?.samples.length === rec.samples.length);

/* ------------------------------------------------------------------ */
/* Renaming                                                            */
/* ------------------------------------------------------------------ */

const renamed = withName(code, 'Mehmet');
check('rename keeps the run', decodeRun(renamed)?.samples.length === rec.samples.length);
check('rename changes the name', decodeRun(renamed)?.name === 'Mehmet');
check('rename keeps the time', Math.abs(decodeRun(renamed).time - 30.42) < 0.005);
check('rename leaves junk alone', withName('nope', 'X') === 'nope');

/* ------------------------------------------------------------------ */
/* Playback                                                            */
/* ------------------------------------------------------------------ */

const ghost = new Ghost(back);
check('ghost is visible', ghost.visible);
check('ghost starts at the start', Math.abs(ghost.x - rec.samples[0].x) < 1, String(ghost.x));

// Halfway through the recording the ghost should be halfway along the path.
for (let i = 0; i < 300; i++) ghost.update(1 / 60);
const mid = rec.samples[Math.round(5 / SAMPLE_RATE)];
check('ghost is where the run was at 5s', Math.abs(ghost.x - mid.x) < 12, `${ghost.x.toFixed(1)} vs ${mid.x}`);

// Lead: standing exactly where the ghost is now means a lead of ~0.
const lead0 = ghost.leadAt(ghost.x);
check('lead at the ghost is ~0', Math.abs(lead0) < SAMPLE_RATE * 2, String(lead0));
// Being further along means being ahead (positive).
check('ahead reads positive', ghost.leadAt(ghost.x + 300) > 0);
check('behind reads negative', ghost.leadAt(ghost.x - 300) < 0);

// Past the end it clamps rather than running off the array.
for (let i = 0; i < 5000; i++) ghost.update(1 / 60);
check('ghost finishes', ghost.finished);
check('ghost stops at the last sample', ghost.x === rec.samples[rec.samples.length - 1].x);

/* ------------------------------------------------------------------ */

if (failures) {
  console.error(`\n✗ ${failures} kontrol başarısız.`);
  process.exit(1);
}
console.log('\n✓ Hayalet kodlaması sağlam.');
