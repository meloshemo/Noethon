/**
 * The offer to double a haul, and the hole where an ad provider goes.
 *
 * This is the honest shape of a rewarded video and none of the dishonest part.
 * Everything a rewarded ad needs from a *game* is here: an offer that appears
 * only when it is worth taking, a limit so it never becomes the main way to
 * earn, a watch that can be cancelled, and a payout that happens once and only
 * on a completed watch. What is deliberately not here is a network call.
 *
 * There is no ad network in this project. There is no SDK, no account, no
 * consent flow and no money, and writing something that pretended otherwise
 * would be worse than useless — it would look finished. `provider` is the seam:
 * the built-in one runs a short countdown and resolves, which is enough to
 * build, play and test the whole flow against. Dropping in a real one means
 * implementing one method.
 *
 *   setProvider({ available: () => boolean, show: () => Promise<boolean> })
 *
 * `show` resolves true when the viewer watched to the end and false when they
 * dismissed it. Nothing else about the provider is this module's business.
 */

import { REWARDS } from '../game/config.js';

/** The stand-in. Counts down, resolves true, touches no network. */
const HOUSE = {
  available: () => true,
  show: (onTick) =>
    new Promise((resolve) => {
      const total = 5;
      let left = total;
      onTick?.(left, total);
      const id = setInterval(() => {
        left -= 1;
        onTick?.(left, total);
        if (left <= 0) {
          clearInterval(id);
          resolve(true);
        }
      }, 1000);
    }),
  /** So a caller can tell the placeholder from the real thing, and say so. */
  house: true,
};

let provider = HOUSE;

export function setProvider(next) {
  provider = next ?? HOUSE;
}

export function isHouseProvider() {
  return provider.house === true;
}

/**
 * How many doublings are left today.
 *
 * A cap, because a reward you can take as often as you like is not a bonus,
 * it is the economy. Three is enough to matter on a session and far too few to
 * replace playing: at the current rates a full day of doublings is worth about
 * one good level, which is the right size for a thing you get for waiting.
 */
export const DAILY_LIMIT = 3;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function watchesLeft(save) {
  const seen = save.rewarded ?? {};
  if (seen.day !== today()) return DAILY_LIMIT;
  return Math.max(0, DAILY_LIMIT - (seen.used ?? 0));
}

/** Is the offer worth showing at all? */
export function canDouble(save, coins) {
  if (!coins || coins <= 0) return false;
  // Not for trivial hauls. An offer to double four fish is an interruption
  // rather than a reward, and the screen it appears on already has three
  // buttons competing for the same thumb.
  if (coins < REWARDS.firstClear) return false;
  if (watchesLeft(save) <= 0) return false;
  return provider.available();
}

/**
 * Run the watch. Resolves with the bonus actually earned, which is zero if the
 * viewer stopped early — the reward is for finishing, and a half-watch that
 * paid would teach people to cancel.
 */
export async function doubleUp(save, coins, onTick) {
  if (!canDouble(save, coins)) return 0;
  const watched = await provider.show(onTick);
  if (!watched) return 0;
  const seen = save.rewarded ?? {};
  const day = today();
  save.rewarded = { day, used: seen.day === day ? (seen.used ?? 0) + 1 : 1 };
  return coins;
}
