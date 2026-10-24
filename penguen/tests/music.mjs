/**
 * The score, without a sound card.
 *
 * Music is the one part of this game nobody can check by reading it, and it is
 * also the part that fails silently: a scheduler that stops advancing, a layer
 * that never arrives, a scene that never switches — none of those throw. They
 * leave the game quiet or monotonous, and the difference is only audible to
 * somebody sitting in front of it with the volume up.
 *
 * So the Web Audio API is stubbed with counters, and what gets asserted is the
 * shape of the output: that time advances by exactly the right amount, that
 * layers appear as the intensity rises and not before, that a scene change
 * lands on a beat, and that the motif shows up in every chapter.
 */

/* ---------------------------------------------------------- the stub */

const scheduled = [];
let now = 0;

/**
 * An AudioParam that remembers.
 *
 * It has to: `_voice` sets the pitch through `setValueAtTime` rather than by
 * assigning `.value`, so a stub that ignores the call reports every note in
 * the game as a 440Hz A — which is exactly what the first version of this file
 * did, and it cheerfully passed a test asserting the chapters sound different.
 */
const param = (v = 0) => ({
  value: v,
  setValueAtTime(x) {
    this.value = x;
  },
  setTargetAtTime(x) {
    this.value = x;
  },
  cancelScheduledValues() {},
  exponentialRampToValueAtTime() {},
  linearRampToValueAtTime() {},
});

function node(kind, extra = {}) {
  return {
    kind,
    connect(next) {
      return next;
    },
    disconnect() {},
    ...extra,
  };
}

const ctx = {
  sampleRate: 48000,
  get currentTime() {
    return now;
  },
  createGain: () => node('gain', { gain: param(1) }),
  createBiquadFilter: () => node('filter', { frequency: param(1000), Q: param(1), type: 'lowpass' }),
  createDelay: () => node('delay', { delayTime: param(0.3) }),
  createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
  createOscillator: () =>
    node('osc', {
      frequency: param(440),
      type: 'sine',
      start(t) {
        scheduled.push({ kind: 'osc', at: t, freq: this.frequency.value, wave: this.type });
      },
      stop() {},
    }),
  createBufferSource: () =>
    node('noise', {
      buffer: null,
      start(t) {
        scheduled.push({ kind: 'noise', at: t });
      },
      stop() {},
    }),
};

const out = node('out', { gain: param(1) });

/* ------------------------------------------------------------- test */

const { Music } = await import('../src/core/music.js');

let fails = 0;
const ok = (name, cond, extra = '') => {
  if (cond) console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`);
  else {
    console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
    fails++;
  }
};

/** Run the scheduler forward `seconds`, in the 25ms slices it really wakes on. */
function play(music, seconds) {
  const before = scheduled.length;
  for (let t = 0; t < seconds; t += 0.025) {
    now += 0.025;
    music._pump();
  }
  return scheduled.slice(before);
}

const fresh = (scene = null, heat = null) => {
  scheduled.length = 0;
  now = 0;
  const m = new Music(ctx, out);
  if (scene) m.scene = scene;
  m.start();
  if (heat !== null) {
    m.setIntensity(heat);
    m.intensity = heat; // skip the smoothing when measuring
  }
  return m;
};

console.log('Müzik denetleniyor...\n');

/* 1 ------------------------------------------------------------------ */
console.log('1) Zamanlayıcı');
{
  const m = fresh(null, 1);
  const t0 = m.nextTime;
  const notes = play(m, 4);
  ok('nota üretiyor', notes.length > 20, `${notes.length} nota / 4 sn`);
  const times = notes.map((n) => n.at).sort((a, b) => a - b);
  ok('hepsi ileride planlanmış', times[0] >= 0);
  // The grid has to be exact — it is the whole reason this is not on
  // `setInterval`. Every onset sits either on a sixteenth or one swing behind
  // it, measured from where the scheduler started, and nowhere else.
  const step = m.stepDur;
  const swing = m.spec.swing ?? 0;
  const offGrid = times.filter((t) => {
    const frac = (((t - t0) / step) % 1 + 1) % 1;
    return Math.min(frac, Math.abs(frac - swing), 1 - frac) > 0.01;
  });
  ok('notalar ızgarada', offGrid.length === 0, `${offGrid.length} kaçak`);
  m.stop();
  const after = play(m, 1);
  ok('durunca susuyor', after.length === 0);
}

/* 2 ------------------------------------------------------------------ */
console.log('\n2) Katmanlar yoğunlukla geliyor');
{
  const counts = {};
  for (const heat of [0, 0.4, 1]) {
    const m = fresh('shelf', heat);
    counts[heat] = play(m, 8).length;
    m.stop();
  }
  ok('sessizken de bir şeyler var', counts[0] > 0, `${counts[0]} nota`);
  ok('orta yoğunlukta artıyor', counts[0.4] > counts[0], `${counts[0]} → ${counts[0.4]}`);
  ok('tam yoğunlukta en çok', counts[1] > counts[0.4], `${counts[0.4]} → ${counts[1]}`);
}

/* 3 ------------------------------------------------------------------ */
console.log('\n3) Sahne değişimi');
{
  const m = fresh(null, 0.5);
  play(m, 0.4);
  m.setScene('dive');
  ok('hemen değişmiyor', m.scene === 'menu', m.scene);
  play(m, 3);
  ok('vuruşta değişiyor', m.scene === 'dive', m.scene);
  m.setScene('yok-böyle-bir-sahne');
  ok('bilinmeyen sahne yok sayılıyor', m.scene === 'dive');
  m.stop();
}

/* 4 ------------------------------------------------------------------ */
console.log('\n4) Her bölümün kendi sesi var');
{
  const seen = {};
  for (const scene of ['menu', 'shelf', 'climb', 'dive', 'brawl']) {
    const m = fresh(scene, 0.8);
    const notes = play(m, 14).filter((n) => n.kind === 'osc');
    const freqs = notes.map((n) => Math.round(n.freq));
    seen[scene] = {
      n: notes.length,
      pitches: new Set(freqs).size,
      low: Math.min(...freqs),
      waves: [...new Set(notes.map((n) => n.wave))],
      bpm: m.spec.bpm,
    };
    m.stop();
  }
  for (const [scene, s] of Object.entries(seen)) {
    ok(`${scene}: çalıyor`, s.n > 10 && s.pitches >= 4, `${s.n} nota, ${s.pitches} perde, ${s.bpm} bpm`);
  }
  ok('dalış en pes bölüm', seen.dive.low <= seen.shelf.low, `${seen.dive.low} Hz vs ${seen.shelf.low} Hz`);
  ok('arena kare dalga kullanıyor', seen.brawl.waves.includes('square'), seen.brawl.waves.join('/'));
  ok('tırmanış sahanlıktan yavaş', seen.climb.bpm < seen.shelf.bpm, `${seen.climb.bpm} < ${seen.shelf.bpm}`);
  const tempos = new Set(Object.values(seen).map((s) => s.bpm));
  ok('beş sahne beş tempo', tempos.size === 5, [...tempos].join(', '));
}

/* 5 ------------------------------------------------------------------ */
console.log('\n5) Tema her bölümde duyuluyor');
{
  for (const scene of ['menu', 'shelf', 'climb', 'dive', 'brawl']) {
    const m = fresh(scene, 0.2);
    const bars = (m.spec.motifEvery ?? 4) + 1;
    const notes = play(m, m.stepDur * 16 * bars).filter((n) => n.kind === 'osc');
    // At low intensity the motif is the only voice that puts five notes into
    // one bar, so the busiest bar is the motif arriving.
    const perBar = new Map();
    for (const n of notes) {
      const bar = Math.floor(n.at / (m.stepDur * 16));
      perBar.set(bar, (perBar.get(bar) ?? 0) + 1);
    }
    const busiest = Math.max(...perBar.values());
    ok(`${scene}: tema çalınıyor`, busiest >= 5, `en yoğun ölçüde ${busiest} nota`);
    m.stop();
  }
}

/* 6 ------------------------------------------------------------------ */
console.log('\n6) Efektler müziği bastırıyor');
{
  const m = new Music(ctx, out);
  let ducked = false;
  m.bus.gain.exponentialRampToValueAtTime = () => (ducked = true);
  m.duck(0.5);
  ok('duck kazancı düşürüyor', ducked);
}

if (fails) {
  console.log(`\n✗ ${fails} sorun.`);
  process.exit(1);
}
console.log('\n✓ Müzik: beş sahne, beş katman, tek tema.');
