/**
 * The store.
 *
 * Two things live here.
 *
 * **The daily offer.** One cosmetic a day, picked from the date so everybody
 * sees the same one, at a discount, for twenty-four hours. It is the cheapest
 * way to make opening the game on a Tuesday different from opening it on a
 * Monday — and unlike a sale in a menu nobody visits, it has a clock on it.
 *
 * **The price tiers.** The real-money catalogue as data. Nothing here charges
 * anybody: a browser cannot take a payment safely, because the only thing
 * standing between a player and a free purchase would be a flag in their own
 * localStorage. What this gives us is the shape — the SKUs, the tiers, the
 * bundles — so that wiring a real checkout later is one adapter and not a
 * redesign. See `canPurchase()`, which is deliberately the only door and is
 * deliberately shut.
 */

import { SKINS, TRAILS, RARITY } from './skins.js';

/* ------------------------------------------------------------------ */
/* The daily offer                                                     */
/* ------------------------------------------------------------------ */

/** Discount off the normal fish price, by rarity. */
const DISCOUNT = { common: 0.4, rare: 0.35, epic: 0.3, mythic: 0.25 };

/**
 * Fish price for a cosmetic that is normally earned rather than bought.
 *
 * Earned items still get a price on their offer day — that is the point of the
 * offer, a shortcut past a condition you may never meet — but the price is set
 * from the rarity so the shortcut is never cheap.
 */
const OFFER_PRICE = { common: 260, rare: 620, epic: 1400, mythic: 2600 };

function dateSeed(str) {
  return [...str].reduce((n, c) => (n * 33 + c.charCodeAt(0)) >>> 0, 5381);
}

/**
 * Today's offer.
 *
 * Never the starting penguin and never "no trail" — an offer on something
 * everybody already owns is not an offer.
 *
 * @param {string} dateKey local YYYY-MM-DD
 * @returns {{item:object, bag:string, price:number, was:number, off:number}}
 */
export function dailyOffer(dateKey) {
  const pool = [
    ...SKINS.filter((s) => s.unlock.kind !== 'default').map((s) => ({ item: s, bag: 'skins' })),
    ...TRAILS.filter((t) => t.unlock.kind !== 'default').map((t) => ({ item: t, bag: 'trails' })),
  ];
  const seed = dateSeed(dateKey);
  const pick = pool[seed % pool.length];
  const rarity = pick.item.rarity ?? 'common';

  const was = pick.item.unlock.kind === 'coins' ? pick.item.unlock.cost : OFFER_PRICE[rarity];
  const off = DISCOUNT[rarity] ?? 0.3;
  return {
    ...pick,
    was,
    off,
    price: Math.round((was * (1 - off)) / 10) * 10,
    rarity: RARITY[rarity] ?? RARITY.common,
  };
}

/** Seconds left in the offer, so the card can show a clock. */
export function offerSecondsLeft(now = new Date()) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, Math.floor((midnight - now) / 1000));
}

export function formatCountdown(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
}

/* ------------------------------------------------------------------ */
/* Real money — the shape, not the transaction                         */
/* ------------------------------------------------------------------ */

/**
 * The catalogue as it would be priced.
 *
 * Kept in the codebase on purpose: it is the design, it belongs under version
 * control, and having the SKUs written down is what makes the eventual backend
 * a small job. Everything in the game — all 31 levels, endless, the daily, the
 * league, the ghost races, every earned cosmetic — stays free. Only the
 * shortcut is ever for sale.
 */
export const PRICE_TIERS = [
  { sku: 'trail.single', usd: 0.99, title: 'Tek iz', gives: '1 iz' },
  { sku: 'skin.rare', usd: 1.99, title: 'Özel penguen', gives: '1 nadir/efsanevi penguen' },
  { sku: 'skin.mythic', usd: 2.99, title: 'Mitik penguen', gives: '1 mitik penguen' },
  { sku: 'bundle.daily', usd: 2.99, title: 'Günün paketi', gives: 'Günün teklifi + 500 balık' },
  { sku: 'bundle.full', usd: 4.99, title: 'Büyük paket', gives: 'Penguen + iz + 1500 balık' },
];

/**
 * The only door, and it is shut.
 *
 * A static page cannot verify a payment: the receipt would have to be checked
 * somewhere the player cannot edit, and there is no such place here. Returning
 * a reason rather than throwing means the UI can say something honest instead
 * of showing a button that lies.
 *
 * When there is a backend, this becomes: POST the SKU, get a signed receipt,
 * verify it server-side, and let the server grant the item. Nothing else in the
 * game needs to change — cosmetics are already granted through one function.
 */
export function canPurchase() {
  return {
    ok: false,
    reason:
      'Gerçek parayla alım için sunucu tarafında doğrulanan bir ödeme gerekiyor. ' +
      'Şu an oyun tamamen ücretsiz ve her şey balıkla açılıyor.',
  };
}
