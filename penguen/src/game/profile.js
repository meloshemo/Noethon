/**
 * Who is playing.
 *
 * The game creates a player the moment somebody opens it — a name on a
 * leaderboard, a penguin they picked, a record with their name on it — and
 * until now it did that silently, asking for a name only at the moment it
 * wanted to put one on a share code. That is backwards: a name asked for at
 * checkout feels like a form, and a name asked for at the start feels like
 * being introduced.
 *
 * Everything here stays on the device. There is no account, no server and no
 * way for this file to send anything anywhere — which is not a limitation to
 * apologise for, it is the reason the privacy document is one page long.
 */

import { CRAFTED_LEVELS } from './config.js';
import { t, loc, getLang } from '../core/i18n.js';

const NAME_MAX = 14;
const NAME_MIN = 2;

/**
 * Clean a typed name.
 *
 * Permissive about language and strict about everything else: Turkish letters,
 * any other script, digits, spaces and a few marks are fine; control
 * characters, angle brackets and runs of whitespace are not. The name is
 * written into the DOM and into share codes, and both of those are places
 * where "whatever they typed" is the wrong amount of trust.
 */
export function cleanName(raw) {
  return String(raw ?? '')
    // Control characters, including the invisible direction-overrides that can
    // make a name render as something else entirely.
    .replace(/[\p{C}\p{Zl}\p{Zp}]/gu, '')
    .replace(/[<>&"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

/** Is this good enough to save? Returns null when it is, a reason when not. */
export function nameProblem(raw) {
  const name = cleanName(raw);
  if (name.length < NAME_MIN) return t('name.tooShort', { n: NAME_MIN });
  if (!/[\p{L}\p{N}]/u.test(name)) return t('name.noLetter');
  return null;
}

const PARTS = {
  tr: {
    first: [
      'Buz', 'Kar', 'Fırtına', 'Kuzey', 'Gece', 'Tuz', 'Rüzgâr', 'Ay',
      'Çelik', 'Sisli', 'Hızlı', 'Sessiz', 'Cesur', 'Yıldız', 'Derin', 'Zirve',
    ],
    second: [
      'kanat', 'ayak', 'gaga', 'tüy', 'kalp', 'pati', 'yürek', 'göz',
      'adım', 'kuyruk', 'nefes', 'iz', 'burun', 'tepe', 'dalga', 'çığ',
    ],
  },
  // Built the same way rather than translated word for word: a suggested name
  // has to sound like a name in the language it is offered in, and "Icewing"
  // does that where a literal rendering of the Turkish would not.
  en: {
    first: [
      'Ice', 'Snow', 'Storm', 'North', 'Night', 'Salt', 'Wind', 'Moon',
      'Steel', 'Misty', 'Swift', 'Silent', 'Brave', 'Star', 'Deep', 'Summit',
    ],
    second: [
      'wing', 'foot', 'beak', 'feather', 'heart', 'paw', 'soul', 'eye',
      'step', 'tail', 'breath', 'trail', 'nose', 'peak', 'wave', 'drift',
    ],
  },
};

/** A name for somebody who does not want to think of one. */
export function suggestName(rng = Math.random) {
  const pool = PARTS[getLang()] ?? PARTS.tr;
  const a = pool.first[Math.floor(rng() * pool.first.length)];
  const b = pool.second[Math.floor(rng() * pool.second.length)];
  return `${a}${b}`;
}

/**
 * A short readable id.
 *
 * Not an account and not a secret — it is a label, so that two players called
 * "Buzkanat" on the same leaderboard can tell which record is theirs. No I, O,
 * 0 or 1: this is a thing people read off a screen and type into a chat.
 */
export function makeId(rng = Math.random) {
  const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 5; i++) out += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  return `PNG-${out}`;
}

/**
 * Titles, earned rather than bought.
 *
 * One per chapter plus the two ends, and each one is granted by *finishing*
 * something rather than by grinding it — the point of a title is that it says
 * where you have been.
 */
const TITLES = [
  {
    at: 0,
    name: 'Yeni Yumurta',
    note: 'Buz daha çok yeni',
    en: { name: 'Fresh Egg', note: 'The ice is all new' },
  },
  {
    at: 5,
    name: 'Buz Çırağı',
    note: 'Kırılan buzu tanıdın',
    en: { name: 'Ice Apprentice', note: 'You know which ice breaks' },
  },
  {
    at: 16,
    name: 'Sahanlık Kaşifi',
    note: 'Kıyıyı boydan boya yürüdün',
    en: { name: 'Shelf Explorer', note: 'You walked the whole coast' },
  },
  {
    at: 31,
    name: 'Duvar Tırmanıcısı',
    note: 'Dağ başladı',
    en: { name: 'Wall Climber', note: 'The mountain has begun' },
  },
  {
    at: 46,
    name: 'Zirve Sahibi',
    note: 'Buzulun tepesini gördün',
    en: { name: 'Summit Holder', note: 'You saw the top of the glacier' },
  },
  {
    at: 61,
    name: 'Derin Dalgıç',
    note: 'Buzun altını da bilirsin',
    en: { name: 'Deep Diver', note: 'You know what is under the ice too' },
  },
  {
    at: 76,
    name: 'Koloni Efsanesi',
    note: 'Yolunu kesen kalmadı',
    en: { name: 'Colony Legend', note: 'Nobody stands in your way now' },
  },
];

/** How many levels the last title asks for — the lint keeps this honest. */
export const LAST_TITLE_AT = TITLES[TITLES.length - 1].at;

/** The title a save has earned, from how far it has actually got. */
export function titleFor(save) {
  const done = Object.values(save?.levels ?? {}).filter((l) => (l.stars ?? 0) > 0).length;
  let best = TITLES[0];
  for (const title of TITLES) if (done >= title.at) best = title;
  const next = TITLES.find((title) => title.at > done) ?? null;
  return { ...best, done, next };
}

/**
 * Make sure the save has an identity, without overwriting one it already has.
 *
 * Called on every boot. The id is generated once and then never changes —
 * it is the only thing in the save a player cannot edit, because a label you
 * can rewrite is not a label.
 */
export function ensureProfile(save) {
  if (!save.profile || typeof save.profile !== 'object') save.profile = {};
  const p = save.profile;
  if (typeof p.id !== 'string' || !/^PNG-[0-9A-Z]{5}$/.test(p.id)) p.id = makeId();
  // Zero is the stored default, not a date: a save that has never been
  // stamped reports the first of January 1970, which is a charming thing for
  // a profile card to claim and a wrong thing.
  if (!Number.isFinite(p.created) || p.created <= 0) p.created = Date.now();
  // `greeted` is what stops the introduction appearing twice. Kept separate
  // from the name so that clearing a name does not re-trigger the whole
  // first-run flow at the worst possible moment.
  p.greeted = Boolean(p.greeted);
  save.name = cleanName(save.name);
  return p;
}

/** A one-line summary for the title screen chip. */
export function profileLine(save) {
  const rank = titleFor(save);
  return save.name
    ? `${loc(rank)} · ${t('ui.progress', { done: rank.done, total: CRAFTED_LEVELS })}`
    : t('ui.createId');
}
