/**
 * The campaign, in chapters.
 *
 * A chapter is not decoration. It is a promise that the next stretch of levels
 * asks a question the last stretch did not, and it exists because thirty levels
 * of the same verb is where a good platformer stops being one.
 *
 *   I   · Buz Sahanlığı  1–31  running and jumping, left to right
 *   II  · Zirve         32–46  climbing: hold on, and the holding runs out
 *   III · Buz Altı      47–61  swimming: fast at last, and out of air
 *   IV  · Kar Topu      62–76  a fight you win by standing somewhere
 *
 * Each chapter brings its own composer — `Course` walks a shelf sideways,
 * `Tower` walks a mountain upward, `Deep` swims a corridor under the ice,
 * `Arena` draws lines of fire — and its own validator. What they share is everything below the composer: the
 * same penguin, the same physics, the same three inputs, the same save file. A chapter changes the question, never the
 * controls.
 *
 * This file is the only place that knows which level belongs to which, so
 * adding a chapter is adding an entry here plus the file it points at.
 */

import { LEVELS } from './levels.js';
import { CLIMB_LEVELS } from './climb.js';
import { DIVE_LEVELS } from './dive.js';
import { BRAWL_LEVELS } from './brawl.js';

export const CHAPTERS = [
  {
    id: 1,
    name: 'Buz Sahanlığı',
    subtitle: 'Kıyı boyunca kuzeye',
    /** What the player is actually doing here, in one line, for the menu. */
    verb: 'Koş, zıpla, buzun ne olduğunu öğren',
    levels: LEVELS,
  },
  {
    id: 2,
    name: 'Zirve',
    subtitle: 'Buzul yükseliyor',
    verb: 'Tırman: duvara tutun, tekmele, kolların dayandığı kadar',
    levels: CLIMB_LEVELS,
  },
  {
    id: 3,
    name: 'Buz Altı',
    subtitle: 'Deniz buzun altında',
    verb: 'Dal: bas ve in, bırak ve yüksel, nefesin bitmeden deliği bul',
    levels: DIVE_LEVELS,
  },
  {
    id: 4,
    name: 'Kar Topu',
    subtitle: 'Koloni yolunu kesti',
    verb: 'Nişan alma — hizala: kapıdakini atıcıyla arana koy, sonra oradan çekil',
    levels: BRAWL_LEVELS,
  },
];

/** Every handcrafted level, in order, with ids already correct. */
export const ALL_LEVELS = CHAPTERS.flatMap((c) => c.levels);

/** Where each chapter starts and ends, derived rather than declared. */
let cursor = 1;
for (const c of CHAPTERS) {
  c.from = cursor;
  c.to = cursor + c.levels.length - 1;
  cursor = c.to + 1;
}

export const CRAFTED_TOTAL = ALL_LEVELS.length;

export function getCraftedLevel(id) {
  return ALL_LEVELS[id - 1] ?? null;
}

/** The chapter a level number belongs to, or null past the handcrafted set. */
export function chapterOf(id) {
  return CHAPTERS.find((c) => id >= c.from && id <= c.to) ?? null;
}

/** True when this level is the first of its chapter — the menu marks those. */
export function startsChapter(id) {
  return CHAPTERS.some((c) => c.from === id);
}
