/**
 * How much of the world a screen gets to see.
 *
 * The bug this file exists to stop: the view was framed as "540 units tall,
 * width follows the aspect ratio", which is exactly right up to 16:9 and
 * quietly wrong past it. A phone held sideways is 2.16:1, so every extra pixel
 * of screen went into width — and a climbing level is narrower than the screen
 * already, so that width bought nothing but empty sky down both margins while
 * the ledge you were jumping to sat above the top edge.
 *
 * It was invisible in every number I had. Landscape reported a *wider* logical
 * view than a desktop (1169 against 960), which reads like a screen that sees
 * more, not less. It only showed up in a screenshot: six platforms upright,
 * two sideways, on the same phone and the same level.
 *
 * So the property worth pinning is not a width or a height. It is that
 * rotating the phone does not change how big the penguin is, because that is
 * the thing a player actually feels, and it is what the old rule broke.
 */

import { VIEW, VIEW_LIMITS, viewFor } from '../src/game/config.js';

let fails = 0;
function check(name, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails++;
}

/** What the renderer will do with this stage: the view, and the scale it draws at. */
function frame(cw, ch) {
  const v = viewFor(cw, ch);
  return { ...v, scale: Math.min(cw / v.w, ch / v.h) };
}

/** Every shape worth checking, and whether it is a phone held sideways. */
const SCREENS = [
  ['masaüstü 16:9', 1280, 720],
  ['dizüstü 16:10', 1440, 900],
  ['iPhone SE yatay', 667, 375],
  ['iPhone 14 yatay', 844, 390],
  ['iPhone 14 Max yatay', 932, 430],
  ['Pixel 7 yatay', 892, 412],
  ['iPhone 14 dikey', 390, 844],
  ['iPad mini yatay', 1133, 744],
  ['katlanır açık', 882, 674],
  ['ultra geniş', 1200, 400],
];

console.log('Görüş alanı — her ekranda\n');

/* 1 --------------------------------------------------------------------- */
console.log('1) Görüntü asla esnemez ve sınırların dışına çıkmaz');
const L = VIEW_LIMITS;
for (const [name, cw, ch] of SCREENS) {
  const v = frame(cw, ch);
  const want = cw / ch;
  const got = v.w / v.h;
  // Rounding to whole logical pixels is the only allowed error.
  check(`${name} oranı korunuyor`, Math.abs(got - want) / want < 0.004,
    `${v.w}×${v.h} = ${got.toFixed(3)}, ekran ${want.toFixed(3)}`);
  // The floors are promises — no screen ever sees less than this. The width
  // ceiling is a promise too. The height ceiling is only a target: a phone
  // held upright hits the width floor first, and then the sky it is really
  // showing is taller than the target, which is the honest number to report.
  check(`${name} sınırlar içinde`,
    v.w >= L.minW && v.w <= L.maxW && v.h >= L.minH,
    `${v.w}×${v.h}`);
}

/* 2 --------------------------------------------------------------------- */
console.log('\n2) Tasarlanan şekil olduğu gibi kalıyor');
const desk = frame(1280, 720);
check('16:9 masaüstü 960×540', desk.w === 960 && desk.h === 540, `${desk.w}×${desk.h}`);
const port = frame(390, 844);
check('dikey telefon 600 birim genişlik', port.w === L.minW, `${port.w}`);
// The camera clamps against VIEW, so VIEW has to be the whole screen and not
// the box that was asked for before the clamps bound. It used to report 900
// where 1298 was drawn, and the camera scrolled the extra four hundred units
// of empty water at the bottom of every upright level.
check('dikey telefon çizdiği kadarını bildiriyor',
  Math.abs(port.h - 844 / port.scale) < 2, `${port.h} birim, ekran ${Math.round(844 / port.scale)}`);

/* 3 --------------------------------------------------------------------- */
console.log('\n3) Telefonu çevirince pengu aynı boyutta kalıyor');
// The property the whole change exists for. A phone is one device: portrait
// and landscape are the same screen, so they should draw at the same scale.
for (const [name, w, h] of [['iPhone 14', 844, 390], ['iPhone 14 Max', 932, 430], ['Pixel 7', 892, 412]]) {
  const land = frame(w, h);
  const up = frame(h, w);
  const drift = Math.abs(land.scale - up.scale) / up.scale;
  check(`${name} çevirince ölçek sapması %${Math.round(drift * 100)}`, drift < 0.15,
    `yatay ${land.scale.toFixed(3)}, dikey ${up.scale.toFixed(3)}`);
}

/* 4 --------------------------------------------------------------------- */
console.log('\n4) Geniş ekran yüksekliği de satın alıyor');
for (const [name, w, h] of [['iPhone 14', 844, 390], ['iPhone 14 Max', 932, 430], ['Pixel 7', 892, 412]]) {
  const v = frame(w, h);
  const gain = v.h / L.baseH;
  check(`${name} en az %20 daha fazla dünya görüyor`, gain >= 1.2,
    `${v.h} birim, tasarım ${L.baseH}`);
}
// And the trade has to stop somewhere, or a cinema-shaped window would draw
// the penguin as a speck.
const ultra = frame(2400, 600);
check('takas bir yerde duruyor', ultra.h <= L.baseH * L.wideCap + 1, `${ultra.h} birim`);

/* 5 --------------------------------------------------------------------- */
console.log('\n5) Daha geniş bir ekran asla daha azını göstermiyor');
// Bounded to the shapes a device can actually be. Past 2.4:1 the width ceiling
// binds — a browser window dragged into a letterbox strip is not a screen the
// game owes a field of view to, and the ceiling is what stops the penguin
// becoming a speck on one.
let last = 0;
let monotone = true;
for (let aspect = 1.2; aspect <= 2.4; aspect += 0.05) {
  const v = frame(600 * aspect, 600);
  if (v.h < last - 1) {
    monotone = false;
    check('yükseklik geri düşüyor', false, `oran ${aspect.toFixed(2)} → ${v.h}`);
    break;
  }
  last = v.h;
}
check('yükseklik oranla birlikte yalnızca artıyor', monotone);

/* 6 --------------------------------------------------------------------- */
console.log('\n6) Ölçülemeyen bir sahne görüntüyü bozmuyor');
// Mid-layout a parent can measure zero, and a NaN here would poison VIEW and
// then every gradient built from it for the rest of the session.
for (const [cw, ch] of [[0, 0], [800, 0], [NaN, 400], [-100, 200]]) {
  const v = viewFor(cw, ch);
  check(`${cw}×${ch} eldeki görüntüyü koruyor`,
    v.w === VIEW.w && v.h === VIEW.h, `${v.w}×${v.h}`);
}

console.log(`\n${SCREENS.length} ekran şekli denendi.`);
if (fails) {
  console.log(`\n✗ ${fails} kontrol düştü.`);
  process.exit(1);
}
console.log('\n✓ Her ekran, o ekranın hak ettiği kadarını görüyor.');
