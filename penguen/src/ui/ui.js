/**
 * DOM UI controller.
 *
 * The whole interface is real HTML — not canvas-drawn — so it gets proper
 * typography, focus handling, screen-reader labels and responsive layout for
 * free. This class is the only place that touches the DOM.
 */

import { formatTime, formatRecord } from '../core/util.js';
import { t, loc, LANGS, getLang, setLang } from '../core/i18n.js';
import { CRAFTED_LEVELS, UPGRADES, SHOP_GROUPS, MONUMENT, monumentCost, scaleForLevel } from '../game/config.js';
import { getLevel } from '../game/game.js';
import { ALL_LEVELS as LEVELS, CHAPTERS, chapterOf, startsChapter } from '../game/chapters.js';
import { Storage, todayKey } from '../core/storage.js';
import { cleanName, nameProblem, suggestName, titleFor, ensureProfile, profileLine } from '../game/profile.js';
import { ensureMissions } from '../game/missions.js';
import { canDouble, doubleUp, watchesLeft, isHouseProvider } from '../core/rewarded.mjs';
import { shareText, withName } from '../game/ghost.js';
import { SKINS, TRAILS, RARITY, getSkin, getTrail, skinStatus, newlyEarned, drawPortrait, perkText } from '../game/skins.js';
import { standing, weekKey } from '../game/league.js';
import { dailyObjectives } from '../game/daily.js';
import { generateDailyLevel } from '../game/generator.js';
import { dailyOffer, offerSecondsLeft, formatCountdown } from '../game/store.js';

const ICE_LEGEND = ['crack', 'trap', 'melt', 'slip', 'move', 'fall', 'burst', 'snap'];

/** Tiny inline glyphs for the shop cards. */
const SHOP_ICONS = {
  boot: '<path d="M6 3h4v9h4c3 0 5 2 5 5v3H6V3Z" fill="currentColor"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor"/>',
  spike: '<path d="M4 20h16l-3-6H7l-3 6ZM8 12l1-8 3 5 3-5 1 8H8Z" fill="currentColor"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" fill="currentColor"/>',
  magnet: '<path d="M6 3a6 6 0 0 1 12 0v5h-4V3a2 2 0 0 0-4 0v5H6V3Zm0 8h4v6a2 2 0 0 0 4 0v-6h4v6a6 6 0 0 1-12 0v-6Z" fill="currentColor"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3H9a5 5 0 1 1 5 5H3V8Zm0 5h14a3 3 0 1 1-3 3h2a1 1 0 1 0 1-1H3v-2Z" fill="currentColor"/>',
  wings: '<path d="M12 8c-3-4-8-5-11-4 1 4 4 7 8 8l3-4Zm0 0c3-4 8-5 11-4-1 4-4 7-8 8l-3-4Z" fill="currentColor"/>',
  rocket: '<path d="M12 2c3 2.5 5 6.5 5 11l-3 3h-4l-3-3c0-4.5 2-8.5 5-11Zm-2 17h4l-2 4-2-4Zm2-11a1.6 1.6 0 1 1 0 3.2A1.6 1.6 0 0 1 12 8Z" fill="currentColor"/>',
  radar: '<path d="M12 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3Zm0 4a5 5 0 1 0 5 5h-2a3 3 0 1 1-3-3V7Z" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
  // A gripping hand, for rosin.
  grip: '<path d="M8 3a1.4 1.4 0 0 1 1.4 1.4V10h1.2V3.6a1.4 1.4 0 0 1 2.8 0V10h1.2V5.2a1.4 1.4 0 0 1 2.8 0V13a7 7 0 0 1-7 7H10a5 5 0 0 1-5-5V9.4a1.4 1.4 0 0 1 2.8 0V10h-.2V4.4A1.4 1.4 0 0 1 8 3Z" fill="currentColor"/>',
  // Two lungs and a windpipe.
  lung: '<path d="M11 2h2v7h-2V2Zm-1 8c0 5-2 6-4 6s-3-1-3-4 2-7 4-7c2 0 3 2 3 5Zm4 0c0 5 2 6 4 6s3-1 3-4-2-7-4-7c-2 0-3 2-3 5Z" fill="currentColor"/>',
  // A shovel blade on a shaft.
  shovel: '<path d="M11 2h2v10h-2V2Zm-4 11h10v3a5 5 0 0 1-10 0v-3Z" fill="currentColor"/><path d="M9 2h6v2H9V2Z" fill="currentColor"/>',
  // A swim fin, seen from the side: foot pocket at the top, blade below.
  fin: '<path d="M9 2h5a2 2 0 0 1 2 2v4l3 9a4 4 0 0 1-4 5h-5a4 4 0 0 1-4-5l3-9V4a2 2 0 0 1 2-2Zm0 2v4.3L6.2 17a2 2 0 0 0 1.9 2.6h5a2 2 0 0 0 1.9-2.6L12.2 8.3V4H9Z" fill="currentColor"/>',
  // A weight, for the ballast stone.
  weight: '<path d="M9 2h6v3h-1.4l.6 2H9.8l.6-2H9V2Zm-2.4 7h10.8l2.4 12H4.2L6.6 9Zm2.1 2-1.6 8h9.8l-1.6-8H8.7Z" fill="currentColor"/>',
  // A flame, for the layer of fat that keeps the cold out.
  flame: '<path d="M12 2c4 4 6 7 6 10.5A6 6 0 0 1 6 12.5C6 9 8 6 12 2Zm0 8c1.8 1.9 2.6 3.1 2.6 4.3a2.6 2.6 0 0 1-5.2 0C9.4 13.1 10.2 11.9 12 10Z" fill="currentColor"/>',
};

const $ = (id) => document.getElementById(id);

export class UI {
  constructor({ save, audio, persist }) {
    this.save = save;
    this.audio = audio;
    this._persist = persist;
    this.game = null;
    this.screen = 'title';
    this.introTimer = null;
    this.toastTimer = null;
    this.lastResult = null;

    this.el = {
      overlay: $('overlay'),
      hud: $('hud'),
      touch: $('touch'),
      rotateHint: $('rotateHint'),
      hudLevel: $('hudLevel'),
      hudName: $('hudName'),
      hudFish: $('hudFish'),
      hudDeaths: $('hudDeaths'),
      hudTime: $('hudTime'),
      progressFill: $('progressFill'),
      progressPin: $('progressPin'),
      toast: $('toast'),
      playLabel: $('playLabel'),
      playSub: $('playSub'),
      titleStats: $('titleStats'),
      whoChip: $('whoChip'),
      whoArt: $('whoArt'),
      whoName: $('whoName'),
      whoTitle: $('whoTitle'),
      whoId: $('whoId'),
      idArt: $('idArt'),
      idName: $('idName'),
      idHint: $('idHint'),
      profArt: $('profArt'),
      profName: $('profName'),
      profTitle: $('profTitle'),
      profId: $('profId'),
      profNext: $('profNext'),
      profLevels: $('profLevels'),
      profStars: $('profStars'),
      profFish: $('profFish'),
      profDeaths: $('profDeaths'),
      profSkins: $('profSkins'),
      profSince: $('profSince'),
      profNameInput: $('profNameInput'),
      profHint: $('profHint'),
      levelGrid: $('levelGrid'),
      levelsMeta: $('levelsMeta'),
      chapterJump: $('chapterJump'),
      iceLegend: $('iceLegend'),
      pauseMeta: $('pauseMeta'),
      introCard: $('introCard'),
      introKicker: $('introKicker'),
      introTitle: $('introTitle'),
      introText: $('introText'),
      winKicker: $('winKicker'),
      winTitle: $('winTitle'),
      winStars: $('winStars'),
      winTime: $('winTime'),
      winFish: $('winFish'),
      winDeaths: $('winDeaths'),
      winBest: $('winBest'),
      winHint: $('winHint'),
      nextBtn: $('nextBtn'),
      walletTitleValue: $('walletTitleValue'),
      walletShop: $('walletShop'),
      shopGrid: $('shopGrid'),
      shopBadge: $('shopBadge'),
      missionsList: $('missionsList'),
      dailyState: $('dailyState'),
      dailyStreak: $('dailyStreak'),
      hudShield: $('hudShield'),
      hudGhost: $('hudGhost'),
      chargeBar: $('chargeBar'),
      chargeFill: $('chargeFill'),
      gearBar: $('gearBar'),
      gearWings: $('gearWings'),
      gearWingsFill: $('gearWingsFill'),
      gearRocket: $('gearRocket'),
      gearRocketPips: $('gearRocketPips'),
      winShare: $('winShare'),
      winRank: $('winRank'),
      shareBtn: $('shareBtn'),
      shareName: $('shareName'),
      shareNameInput: $('shareNameInput'),
      boardList: $('boardList'),
      boardWho: $('boardWho'),
      boardCode: $('boardCode'),
      boardMsg: $('boardMsg'),
      boardMeta: $('boardMeta'),
      skinGrid: $('skinGrid'),
      skinTabs: $('skinTabs'),
      skinsMeta: $('skinsMeta'),
      skinsBadge: $('skinsBadge'),
      dailyGoals: $('dailyGoals'),
      leagueName: $('leagueName'),
      leaguePoints: $('leaguePoints'),
      leagueFill: $('leagueFill'),
      leagueNext: $('leagueNext'),
      leagueBadge: $('leagueBadge'),
      offerCard: $('offerCard'),
      offerArt: $('offerArt'),
      offerName: $('offerName'),
      offerBlurb: $('offerBlurb'),
      offerWas: $('offerWas'),
      offerNow: $('offerNow'),
      offerOff: $('offerOff'),
      offerClock: $('offerClock'),
      monumentCard: $('monumentCard'),
      monumentRank: $('monumentRank'),
      monumentCost: $('monumentCost'),
      monumentBlocks: $('monumentBlocks'),
    };

    this._buildLegend();
    this._bindStatic();
    this.refreshTitle();
  }

  attach(game, input) {
    this.game = game;
    this.input = input;
    this._bindGame();
    this._bindTouch();
  }

  persist() {
    this._persist();
  }

  /* ------------------------------------------------------- screens */

  showScreen(name) {
    this.screen = name;
    const overlay = this.el.overlay;
    overlay.dataset.screen = name ?? 'none';
    overlay.querySelectorAll('.screen').forEach((s) => {
      s.hidden = s.dataset.name !== name;
    });

    const inGame = name === null || name === 'intro';
    const playing = this.game?.state === 'playing' || this.game?.state === 'paused';
    this.el.hud.hidden = !playing || !inGame;
    this.el.touch.hidden = !this._isTouch || !inGame || !playing;
    // The camera frames the penguin around these two strips, so it has to be
    // told the moment they appear or disappear — not at the next resize, which
    // on a phone that is never rotated is never.
    this.game?.renderer?.measureChrome();
    // The rotate hint belongs to the title screen only.
    this._checkOrientation?.();

    // Settings were synced by whatever opened them, which is fine right up
    // until something else opens them. The screen's job is to show the truth,
    // so it reads the save every time it appears.
    if (name === 'settings') this._syncSettings();

    if (name && name !== 'intro') {
      // Focus the *primary* action, not the first one in the markup.
      //
      // "First in the DOM" is an accident of layout: adding a quiet shortcut
      // near the top of a sheet silently stole the focus ring from the button
      // the screen exists for, so the win screen came up with "go to the shop"
      // lit and "next level" dark. Whatever is marked primary is what the
      // screen is for, and that is where a keyboard should land.
      const sel = `.screen[data-name="${name}"]`;
      const first =
        overlay.querySelector(`${sel} .btn--primary:not(:disabled)`) ??
        overlay.querySelector(`${sel} .btn:not(:disabled), ${sel} .switch`);
      first?.focus({ preventScroll: true });
    }
  }

  refreshTitle() {
    const next = this.save.unlocked;
    const isNew = next === 1 && !Object.keys(this.save.levels).length;

    // An interrupted attempt outranks everything: somebody who closed the tab
    // mid-level wants that level back, not the next one.
    const session = this.game?.pendingSession ?? null;
    this._session = session;
    if (session) {
      const where = session.daily ? t('title.daily') : levelLabel(session.level);
      this.el.playLabel.textContent = t('pause.resume');
      this.el.playSub.textContent = `${where} · ${formatRecord(session.elapsed ?? 0)}`;
    } else {
      this.el.playLabel.textContent = isNew ? t('id.start') : t('pause.resume');
      this.el.playSub.textContent = levelLabel(next);
    }

    const stars = Object.values(this.save.levels).reduce((s, l) => s + (l.stars ?? 0), 0);
    const done = Object.keys(this.save.levels).length;
    this.el.titleStats.textContent = done
      ? t('ui.titleStats', { done, stars, fish: this.save.stats.totalFish })
      : t('ui.titleHint');

    this.refreshWho();
    this.refreshWallet();
    this.refreshDaily();
    this.refreshMissions();
    this.refreshLeague();
    this.refreshSkinsBadge();
    this.refreshOffer();
  }

  /* -------------------------------------------------------- kimlik */

  /**
   * The chip on the title screen: who is playing, and how far they have got.
   *
   * Drawn with the penguin they are actually wearing, because the collection is
   * the game's other progress bar and a player who has just bought a gold
   * penguin should see it looking back at them from the front page.
   */
  refreshWho() {
    ensureProfile(this.save);
    this.el.whoName.textContent = this.save.name || t('ui.createId');
    this.el.whoTitle.textContent = this.save.name ? profileLine(this.save) : t('ui.pickName');
    this.el.whoId.textContent = this.save.name ? this.save.profile.id : '';
    this._portrait(this.el.whoArt);
  }

  /** The worn penguin, drawn into one of the small identity canvases. */
  _portrait(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawPortrait(ctx, getSkin(this.save.skin ?? 'normal'), {
      w: canvas.width,
      h: canvas.height,
      time: performance.now() / 1000,
    });
  }

  /**
   * The first-run introduction.
   *
   * Shown once, before anything else, and only when there is no name yet. It is
   * skippable by pressing Başla with the field left alone: the suggestion is
   * already in it, so "skip" and "accept" are the same button, which is one
   * decision fewer between a player and the game.
   *
   * There used to be a second button that rerolled the suggestion. It went,
   * because a screen whose whole job is "one press and you are playing" should
   * not offer a second press that does not get you there, and the field is
   * editable anyway.
   */
  openIdentity() {
    ensureProfile(this.save);
    this.el.idName.value = this.save.name || suggestName();
    this.el.idHint.textContent = t('ui.nameHint');
    this.el.idHint.classList.remove('field__hint--bad');
    this._portrait(this.el.idArt);
    this.showScreen('identity');
    // Focus, but do not open the keyboard on a phone before the player has
    // seen what they are being asked.
    if (!this._isTouch) setTimeout(() => this.el.idName.focus(), 60);
  }

  /** Save a typed name from either screen. Returns true when it took. */
  _commitName(input, hint) {
    const problem = nameProblem(input.value);
    if (problem) {
      hint.textContent = problem;
      hint.classList.add('field__hint--bad');
      input.focus();
      this.audio.ui('back');
      return false;
    }
    this.save.name = cleanName(input.value);
    this.save.profile.greeted = true;
    this._persist();
    hint.textContent = 'Kaydedildi';
    hint.classList.remove('field__hint--bad');
    this.refreshWho();
    this.audio.ui();
    return true;
  }

  buildProfile() {
    ensureProfile(this.save);
    const rank = titleFor(this.save);
    const levels = Object.values(this.save.levels ?? {});
    const stars = levels.reduce((n, l) => n + (l.stars ?? 0), 0);
    const skins = Object.keys(this.save.skins ?? {}).length + 1;

    this.el.profName.textContent = this.save.name || t('ui.noName');
    this.el.profTitle.textContent = `${loc(rank)} · ${loc(rank, 'note')}`;
    this.el.profId.textContent = this.save.profile.id;
    this.el.profNext.textContent = rank.next
      ? t('ui.nextTitle', { name: loc(rank.next), at: rank.next.at })
      : t('ui.noTitles');
    this.el.profLevels.textContent = `${rank.done} / ${CRAFTED_LEVELS}`;
    this.el.profStars.textContent = `${stars} / ${CRAFTED_LEVELS * 3}`;
    this.el.profFish.textContent = String(this.save.stats?.totalFish ?? 0);
    this.el.profDeaths.textContent = String(this.save.stats?.totalDeaths ?? 0);
    this.el.profSkins.textContent = `${skins} / ${SKINS.length}`;
    this.el.profSince.textContent = new Date(this.save.profile.created).toLocaleDateString(dateLocale());
    this.el.profNameInput.value = this.save.name ?? '';
    this.el.profHint.textContent = '2–14 karakter';
    this.el.profHint.classList.remove('field__hint--bad');
    this._portrait(this.el.profArt);
  }

  /**
   * Today's offer.
   *
   * One cosmetic, discounted, for twenty-four hours — including ones that are
   * normally *earned*, which makes the offer a genuine shortcut past a
   * condition you might never meet rather than a sale on something you were
   * going to get anyway. The clock is the whole point.
   */
  refreshOffer() {
    const key = todayKey();
    const offer = dailyOffer(key);
    const bag = offer.bag;
    const owned = Boolean(this.save[bag]?.[offer.item.id]);
    this._offer = offer;

    this.el.offerCard.classList.toggle('is-owned', owned);
    this.el.offerName.textContent = loc(offer.item);
    this.el.offerBlurb.textContent = owned ? t('ui.owned') : loc(offer.item, 'blurb');
    this.el.offerWas.textContent = `${offer.was}`;
    this.el.offerNow.textContent = owned ? '·' : t('ui.priceFish', { n: offer.price });
    this.el.offerOff.textContent = `%${Math.round(offer.off * 100)}`;
    this.el.offerClock.textContent = formatCountdown(offerSecondsLeft());
    this.el.offerCard.style.setProperty('--offer-color', offer.rarity.color);

    const ctx = this.el.offerArt?.getContext('2d');
    if (ctx) {
      if (bag === 'trails') UI.drawTrailPreview(ctx, offer.item, 112, 112);
      else drawPortrait(ctx, offer.item, { w: 112, h: 112, time: 0.4 });
    }
  }

  /**
   * The weekly ladder. Points reset on Monday; the tier you reached does not,
   * which is what makes a Sunday-night push worth making.
   */
  refreshLeague() {
    const league = Storage.touchLeague(this.save, weekKey());
    const st = standing(league);
    this.el.leagueName.textContent = t('ui.leagueName', { tier: loc(st.tier) });
    this.el.leaguePoints.textContent = t('ui.points', { n: st.points });
    this.el.leagueFill.style.width = `${Math.round(st.pct * 100)}%`;
    this.el.leagueFill.style.background = st.tier.color;
    this.el.leagueBadge.style.color = st.tier.color;
    this.el.leagueNext.textContent = st.next
      ? t('ui.leagueNext', { tier: loc(st.tier), next: loc(st.next), n: st.toNext })
      : t('ui.leagueTop');
  }

  /** Badge the collection when something is claimable or affordable. */
  /** Grant every skin and trail whose condition is already satisfied. */
  _claimEarned() {
    const earned = newlyEarned(this.save);
    if (!earned.length) return;
    for (const item of earned) {
      const bag = item.bag ?? 'skins';
      this.save[bag] = this.save[bag] ?? {};
      this.save[bag][item.id] = true;
    }
    this._persist();
  }

  refreshSkinsBadge() {
    const count = (list, bag) =>
      list.filter((item) => {
        const st = skinStatus(this.save, item, new Date(), bag);
        return !st.owned && (st.pct >= 1 || (st.kind === 'coins' && (this.save.coins ?? 0) >= st.cost));
      }).length;
    const n = count(SKINS, 'skins') + count(TRAILS, 'trails');
    this.el.skinsBadge.hidden = n === 0;
    this.el.skinsBadge.textContent = n || '';
  }

  refreshWallet() {
    const c = this.save.coins ?? 0;
    this.el.walletTitleValue.textContent = c;
    this.el.walletShop.textContent = c;

    // Badge the shop when something is actually affordable — a permanent dot
    // is noise, a dot that means "you can buy something now" is information.
    const affordable = UPGRADES.filter((u) => {
      const owned = this.save.upgrades[u.id] ?? 0;
      return owned < u.levels.length && c >= u.levels[owned].cost;
    }).length;
    this.el.shopBadge.hidden = affordable === 0;
    this.el.shopBadge.textContent = affordable || '';
  }

  refreshDaily() {
    const d = Storage.touchDaily(this.save);
    const done = d.objectives ?? [];

    // The day's target time comes from the day's own level, so the objective
    // reads as a real number rather than a generic "be fast".
    let list = [];
    try {
      list = dailyObjectives(d.date ?? '', generateDailyLevel(d.date ?? '').target);
    } catch {
      list = [];
    }
    const got = list.filter((o) => done.includes(o.id)).length;

    this.el.dailyState.textContent = d.done
      ? t('ui.dailyDone', { got, total: list.length, time: formatRecord(d.bestTime) })
      : t('ui.dailyOpen', { n: list.length });
    this.el.dailyStreak.hidden = !d.streak;
    this.el.dailyStreak.textContent = d.streak ? t('ui.streakDays', { n: d.streak }) : '';
    document.getElementById('dailyBtn').classList.toggle('daily--done', got === list.length && list.length > 0);

    this.el.dailyGoals.innerHTML = list
      .map(
        (o) => `
        <li class="goal${done.includes(o.id) ? ' goal--done' : ''}">
          <span class="goal__tick" aria-hidden="true">${done.includes(o.id) ? '✓' : ''}</span>
          <span>${loc(o, 'text')}</span>
        </li>`,
      )
      .join('');
  }

  /* ------------------------------------------------------ collection */

  /**
   * The collection.
   *
   * Each card draws its own penguin, so what you see on the card is the palette
   * and the accessories the game will actually put on the ice — not an
   * illustration of them.
   */
  buildSkins(tab = this._skinTab ?? 'skins') {
    this._skinTab = tab;
    // Hand over anything already earned before drawing.
    //
    // Unlocks are normally granted at the end of a run, which leaves one odd
    // gap: a condition met outside a run — by a purchase, or by a stat that
    // moved elsewhere — showed a full progress bar, the word "Kilitli", and no
    // way through. Nothing was broken; the next run would have granted it. But
    // the card was lying in the meantime, which is worse than being slow.
    this._claimEarned();
    const trails = tab === 'trails';
    const list = trails ? TRAILS : SKINS;
    const bag = trails ? 'trails' : 'skins';
    const worn = trails ? (this.save.trail ?? 'none') : (this.save.skin ?? 'normal');

    this.el.skinTabs?.querySelectorAll('.tab').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.tab === tab);
    });

    const grid = this.el.skinGrid;
    grid.innerHTML = '';
    let owned = 0;

    // Rarest last: the wall should build toward the things worth wanting.
    const sorted = [...list].sort(
      (a, b) => (RARITY[a.rarity]?.order ?? 0) - (RARITY[b.rarity]?.order ?? 0),
    );

    for (const item of sorted) {
      const st = skinStatus(this.save, item, new Date(), bag);
      if (st.owned) owned++;
      const rarity = RARITY[item.rarity] ?? RARITY.common;

      const card = document.createElement('div');
      card.className =
        `skin skin--${item.rarity ?? 'common'}` +
        `${st.owned ? '' : ' skin--locked'}${worn === item.id ? ' skin--worn' : ''}`;

      const canvas = document.createElement('canvas');
      canvas.className = 'skin__art';
      canvas.width = 132;
      canvas.height = 132;
      canvas.setAttribute('aria-hidden', 'true');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (trails) UI.drawTrailPreview(ctx, item, 132, 132);
        else drawPortrait(ctx, item, { w: 132, h: 132, time: 0.4 });
      }

      const body = document.createElement('div');
      body.className = 'skin__body';
      const perks = perkText(item);
      body.innerHTML = `
        <span class="skin__rarity" style="color:${rarity.color}">${loc(rarity)}</span>
        <strong class="skin__name">${loc(item)}</strong>
        <small class="skin__blurb">${loc(item, 'blurb')}</small>
        ${perks ? `<span class="skin__perk">${perks}</span>` : ''}
        ${
          st.owned
            ? `<span class="skin__state">${t('ui.unlockedState')}</span>`
            : `<span class="skin__bar"><i style="width:${Math.round(st.pct * 100)}%;background:${rarity.color}"></i></span>
               <span class="skin__state">${st.label}</span>`
        }`;

      const isWorn = st.owned && worn === item.id;
      if (isWorn) {
        // Not a disabled button. A greyed-out "Giyildi" reads as something
        // broken; a label reads as a state, which is what it is.
        const tag = document.createElement('span');
        tag.className = 'skin__worn';
        tag.textContent = trails ? t('ui.inUse') : t('ui.worn');
        card.append(canvas, body, tag);
        grid.append(card);
        continue;
      }

      const btn = document.createElement('button');
      btn.className = 'btn skin__btn';
      btn.type = 'button';
      if (st.owned) {
        btn.textContent = t('ui.wear');
        btn.disabled = false;
        btn.classList.add('btn--primary');
        btn.addEventListener('click', () => {
          Storage.wearSkin(this.save, item.id, bag);
          this.audio.ui();
          this.buildSkins(tab);
          // The menu backdrop is a live world, so the change shows at once.
          if (this.game?.world) {
            if (trails) this.game.world.trailId = item.id;
            else this.game.world.skinId = item.id;
          }
        });
      } else if (st.kind === 'coins') {
        const can = (this.save.coins ?? 0) >= st.cost;
        btn.disabled = !can;
        if (can) btn.classList.add('btn--primary');
        btn.innerHTML =
          st.cost === 0
            ? t('ui.buy')
            : `<span>${t('ui.buy')}</span><small class="btn__sub">${t('ui.priceFish', { n: st.cost })}</small>`;
        btn.addEventListener('click', () => {
          if (!Storage.buySkin(this.save, item.id, st.cost, bag)) return;
          this.audio.fish();
          this._flashCoins();
          this.buildSkins(tab);
          this.refreshWallet();
          this.refreshSkinsBadge();
        });
      } else {
        btn.textContent = 'Kilitli';
        btn.disabled = true;
      }

      card.append(canvas, body, btn);
      grid.append(card);
    }

    this.el.skinsMeta.textContent = `${owned} / ${list.length} ${trails ? 'iz' : 'penguen'}`;
  }

  /**
   * A trail has nothing to draw without a penguin moving, so the card fakes
   * one: an arc of positions across the card, oldest to newest, exactly the
   * shape the painter gets in play.
   */
  static drawTrailPreview(ctx, trail, w, h) {
    ctx.clearRect(0, 0, w, h);
    if (!trail.paint) {
      ctx.strokeStyle = 'rgba(143,196,226,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.6);
      ctx.lineTo(w * 0.8, h * 0.6);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    const n = 14;
    const hist = Array.from({ length: n }, (_, i) => {
      const k = i / (n - 1);
      return { x: w * (0.16 + k * 0.62), y: h * (0.66 - Math.sin(k * Math.PI) * 0.22), age: 1 - k };
    });
    // A card is smaller than the screen, so the shapes are drawn against a
    // larger notional penguin than the real one — otherwise the delicate
    // trails come out as a few stray pixels and sell nothing.
    ctx.save();
    trail.paint(ctx, hist, { w: 58, h: 64 }, 0.6);
    ctx.restore();
  }

  refreshMissions() {
    const list = ensureMissions(this.save, Storage);
    this.el.missionsList.innerHTML = list
      .map((m) => {
        const pct = Math.round((m.progress / m.goal) * 100);
        return `
          <li class="mission${m.done ? ' mission--done' : ''}">
            <span class="mission__check" aria-hidden="true">${m.done ? '✓' : ''}</span>
            <span class="mission__body">
              <span class="mission__text">${loc(m, 'text')}</span>
              <span class="mission__bar"><i style="width:${pct}%"></i></span>
            </span>
            <span class="mission__reward">+${m.reward}</span>
          </li>`;
      })
      .join('');
  }

  /**
   * The monument.
   *
   * The one thing in the economy that never runs out. Raising prices only ever
   * postpones the day a player owns everything; this makes sure that day is not
   * the day the currency dies.
   */
  refreshMonument() {
    const blocks = this.save.monument ?? 0;
    const cost = monumentCost(blocks);
    const names = MONUMENT[getLang()]?.ranks ?? MONUMENT.ranks;
    const rank =
      blocks < names.length
        ? names[blocks]
        : `${names[names.length - 1]} +${blocks - names.length + 1}`;
    this.el.monumentRank.textContent = rank;
    this.el.monumentCost.textContent = t('ui.priceFish', { n: cost.toLocaleString(dateLocale()) });
    this.el.monumentBlocks.textContent = t('ui.blocks', { n: blocks });
    this.el.monumentCard.classList.toggle('is-affordable', (this.save.coins ?? 0) >= cost);
    this._monumentCost = cost;
  }

  /**
   * The shop.
   *
   * Rebuilt around three things it was getting wrong. It was a flat grid of
   * eight identical cards, each with a full-width primary button — so every
   * item shouted equally, which is the same as none of them saying anything,
   * and on a phone one upgrade filled a screen and a half. It never said what
   * you could not afford until you pressed it. And the cards were different
   * heights, so the buttons in a row sat at three different levels, which is
   * the visual equivalent of a shrug.
   *
   * Now: three named groups, a price *chip* rather than a slab, the shortfall
   * written on the card when you cannot afford it, and every action locked to
   * the bottom edge of its card so a row reads as a row.
   */
  buildShop() {
    this.refreshMonument();
    // The cards read the purse and the chip in the corner is filled in
    // somewhere else entirely, which is one refresh away from the two of them
    // disagreeing on the same screen. They are the same number; read it once.
    this.refreshWallet();
    const coins = this.save.coins ?? 0;
    const grid = this.el.shopGrid;
    grid.innerHTML = '';

    for (const group of SHOP_GROUPS) {
      const items = UPGRADES.filter((u) => (u.group ?? 'hareket') === group.id);
      if (!items.length) continue;

      const have = items.reduce((n, sp) => n + (this.save.upgrades[sp.id] ?? 0), 0);
      const all = items.reduce((n, sp) => n + sp.levels.length, 0);
      const head = document.createElement('h3');
      head.className = `shop__group${have >= all ? ' is-done' : ''}`;
      // The count was already here as text. A bar next to it turns "3/8" into
      // something you can see from across the screen, which is the difference
      // between a list of things to buy and a collection you are filling.
      head.innerHTML =
        `<span class="shop__groupName">${loc(group)}</span>` +
        `<span class="shop__groupNote">${loc(group, 'note')}</span>` +
        `<span class="shop__groupCount">${t('ui.levelsOf', { have, all })}</span>` +
        `<span class="shop__groupBar" aria-hidden="true"><i style="width:${
          Math.round((have / Math.max(1, all)) * 100)
        }%"></i></span>`;
      grid.append(head);

      for (const spec of items) grid.append(this._shopCard(spec, coins));
    }
  }

  _shopCard(spec, coins) {
    const owned = this.save.upgrades[spec.id] ?? 0;
    const maxed = owned >= spec.levels.length;
    const next = maxed ? null : spec.levels[owned];
    const short = next ? next.cost - coins : 0;
    const affordable = Boolean(next) && short <= 0;

    const card = document.createElement('div');
    card.className = `item${maxed ? ' item--maxed' : ''}${!maxed && !affordable ? ' item--dear' : ''}`;
    card.innerHTML = `
      <span class="item__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${SHOP_ICONS[spec.icon] ?? ''}</svg></span>
      <span class="item__head">
        <strong class="item__name">${loc(spec)}</strong>
        <span class="item__level">${maxed ? t('ui.full') : `${owned}/${spec.levels.length}`}</span>
      </span>
      <span class="item__blurb">${loc(spec, 'blurb')}</span>
      <span class="item__meta">
        <span class="item__effect">${
          maxed ? loc(spec.levels[spec.levels.length - 1], 'label') : loc(next, 'label')
        }</span>
      </span>
      <span class="item__rail" aria-hidden="true">${spec.levels
        .map((_, i) => `<i class="${i < owned ? 'on' : i === owned ? 'next' : ''}"></i>`)
        .join('')}</span>`;

    const foot = document.createElement('div');
    foot.className = 'item__foot';

    if (maxed) {
      foot.innerHTML = `<span class="item__done">${t('ui.completed')}</span>`;
    } else {
      const btn = document.createElement('button');
      btn.className = `btn btn--buy${affordable ? ' btn--primary' : ''}`;
      btn.type = 'button';
      btn.disabled = !affordable;
      btn.innerHTML = `<span class="btn__price"><b>${next.cost}</b> ${t('ui.fish')}</span>`;
      btn.setAttribute(
        'aria-label',
        affordable
          ? t('ui.buyAria', { name: loc(spec), n: next.cost })
          : t('ui.needAria', { name: loc(spec), n: short }),
      );
      btn.addEventListener('click', () => {
        if (!Storage.buyUpgrade(this.save, spec)) return;
        this.audio.fish();
        this._flashCoins();
        this.buildShop();
        this.refreshWallet();
      });
      foot.append(btn);
      if (!affordable) {
        // Said on the card rather than discovered by pressing it. The number
        // is the useful half — "nearly" and "nowhere near" are different
        // feelings and the player should get to have the right one.
        const gap = document.createElement('span');
        gap.className = 'item__short';
        // How far, and how far *along*. "Two hundred and forty more" is a
        // number you have to hold in your head against a price you have to go
        // and look up; a bar that is nearly full is a feeling, and the feeling
        // is the thing that brings somebody back to this screen.
        gap.innerHTML =
          `<span class="item__shortBar"><i style="width:${
            Math.round(Math.min(1, coins / next.cost) * 100)
          }%"></i></span>` +
          `<span class="item__shortText">${t('ui.short', { n: short })}</span>`;
        foot.append(gap);
      }
    }

    card.append(foot);
    return card;
  }

  /** A pulse on every wallet on screen, so spending is felt where the money is. */
  _flashCoins() {
    for (const el of document.querySelectorAll('.wallet')) {
      el.classList.remove('wallet--hit');
      void el.offsetWidth;
      el.classList.add('wallet--hit');
    }
  }

  /* ------------------------------------------------------- board */

  /** Label for a board key: "Bölüm 7", "Sonsuz 3" or "Günün Bölümü". */
  static boardLabel(key) {
    if (key === 'daily') return t('title.daily');
    const id = Number(key);
    if (!Number.isFinite(id)) return String(key);
    if (id > CRAFTED_LEVELS) return t('ui.endlessN', { n: id - CRAFTED_LEVELS });
    const def = LEVELS[id - 1];
    return t('ui.levelN', { n: id }) + (def ? ` · ${loc(def)}` : '');
  }

  /**
   * The leaderboard.
   *
   * Every level you have a time on, with everyone whose code you hold, fastest
   * first. It is a real board — it just travels by share code instead of by
   * server, which is the only way to have one with no backend at all.
   */
  buildBoard() {
    this.el.boardWho.textContent = this.save.name || t('ui.noName');
    const keys = Storage.boardKeys(this.save);
    const list = this.el.boardList;
    list.innerHTML = '';

    if (!keys.length) {
      // An empty state with a way out of it. A sentence alone leaves the
      // player on a blank screen holding the one piece of information they
      // already had — that there is nothing here.
      list.innerHTML = `
        <div class="empty">
          <span class="empty__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 19h16v2H4v-2Zm2-4h3v3H6v-3Zm4.5-6h3v9h-3V9ZM15 3h3v15h-3V3Z"/></svg>
          </span>
          <p class="empty__text">${t('ui.boardEmpty')}</p>
          <button class="btn btn--primary" id="boardGo" type="button">${t('ui.boardGo')}</button>
        </div>`;
      list.querySelector('#boardGo')?.addEventListener('click', () => {
        this.audio.ui();
        this.buildLevelGrid();
        this.showScreen('levels');
      });
      this.el.boardMeta.textContent = '';
      return;
    }

    let rivals = 0;
    for (const key of keys) {
      const rows = Storage.board(this.save, key);
      rivals += rows.filter((r) => !r.you).length;

      const card = document.createElement('article');
      card.className = 'board__level';
      card.innerHTML = `
        <header class="board__head">
          <h3 class="board__title">${UI.boardLabel(key)}</h3>
          <button class="btn btn--tiny" type="button" data-share="${key}">${t('ui.shareShort')}</button>
        </header>
        <ol class="board__rows">
          ${rows
            .map(
              (r, i) => `
            <li class="board__row${r.you ? ' is-you' : ''}">
              <span class="board__rank">${i + 1}</span>
              <span class="board__who">${escapeHtml(r.name)}</span>
              <span class="board__time">${formatRecord(r.time)}</span>
              ${
                r.you
                  ? `<span class="board__tag">${t('ui.youTag')}</span>`
                  : `<button class="board__drop" type="button" data-drop="${key}" data-name="${escapeHtml(r.name)}" aria-label="${escapeHtml(t('ui.dropAria', { name: r.name }))}">×</button>`
              }
            </li>`,
            )
            .join('')}
        </ol>`;
      list.append(card);
    }

    this.el.boardMeta.textContent = rivals
      ? t('ui.boardMeta2', { n: keys.length, r: rivals })
      : t('ui.boardMeta1', { n: keys.length });
  }

  _boardMessage(text, ok) {
    const el = this.el.boardMsg;
    el.hidden = !text;
    el.textContent = text ?? '';
    el.classList.toggle('is-ok', Boolean(ok));
    el.classList.toggle('is-bad', text && !ok);
  }

  /**
   * The level list.
   *
   * Eighty-eight cards is a lot of scrolling, and the three things that make
   * it navigable are all here: a row of chapter chips that jumps straight to
   * the mountain or the sea, headings that stay stuck to the top while you
   * scroll through their chapter, and a marker on the one level you are
   * actually about to play. Without the last one the list answers "what have
   * I done" and never "where was I".
   */
  buildLevelGrid() {
    const grid = this.el.levelGrid;
    grid.innerHTML = '';
    const unlocked = this.save.unlocked;
    const endlessShown = Math.max(0, unlocked - CRAFTED_LEVELS);
    const count = CRAFTED_LEVELS + Math.min(endlessShown, 12);

    this._buildChapterJump(unlocked);

    for (let id = 1; id <= count; id++) {
      const rec = this.save.levels[id];
      const open = id <= unlocked;
      const def = id <= CRAFTED_LEVELS ? LEVELS[id - 1] : null;

      // A chapter changes what the game *is*, so the list says so rather than
      // letting the mountain start silently between two numbered buttons.
      if (startsChapter(id)) {
        const chapter = chapterOf(id);
        const done = Object.keys(this.save.levels).filter(
          (k) => Number(k) >= chapter.from && Number(k) <= chapter.to,
        ).length;
        const head = document.createElement('h3');
        head.className = 'levels__chapter';
        head.id = `chapter-${chapter.id}`;
        head.innerHTML =
          `<span class="levels__chapterName">${loc(chapter)}</span>` +
          `<span class="levels__chapterVerb">${loc(chapter, 'verb')}</span>` +
          `<span class="levels__chapterDone">${done}/${chapter.levels.length}</span>`;
        grid.appendChild(head);
      }
      if (id === CRAFTED_LEVELS + 1) {
        const head = document.createElement('h3');
        head.className = 'levels__chapter';
        head.id = 'chapter-endless';
        head.innerHTML =
          `<span class="levels__chapterName">${t('ui.endless')}</span>` +
          `<span class="levels__chapterVerb">${t('ui.endlessDesc')}</span>`;
        grid.appendChild(head);
      }

      const btn = document.createElement('button');
      btn.className = 'level';
      if (id === unlocked) btn.classList.add('level--current');
      if (id > CRAFTED_LEVELS) btn.classList.add('level--endless');
      if (rec?.stars === 3) btn.classList.add('level--perfect');
      btn.disabled = !open;
      btn.type = 'button';

      const num = document.createElement('span');
      num.className = 'level__num';
      num.textContent = levelLabel(id);

      const name = document.createElement('span');
      name.className = 'level__name';
      name.textContent = open ? (loc(def) || t('ui.levelN', { n: id })) : t('ui.locked');

      const stars = document.createElement('span');
      stars.className = 'level__stars';
      for (let i = 0; i < 3; i++) {
        stars.insertAdjacentHTML(
          'beforeend',
          `<svg viewBox="0 0 24 24" class="${(rec?.stars ?? 0) > i ? '' : 'off'}" aria-hidden="true"><path fill="currentColor" d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2Z"/></svg>`,
        );
      }

      const foot = document.createElement('span');
      foot.className = 'level__foot';
      if (rec?.bestTime && Number.isFinite(rec.bestTime)) {
        const best = document.createElement('span');
        best.className = 'level__time';
        best.textContent = formatRecord(rec.bestTime);
        foot.append(best);
      }
      // The one card that answers "where was I". A ring alone is not enough on
      // a list this long: it needs the word the player just read on the button
      // they came from.
      if (id === unlocked) {
        const tag = document.createElement('em');
        tag.className = 'level__next';
        tag.textContent = t('ui.next');
        foot.append(tag);
      }

      btn.append(num, name, stars, foot);

      btn.setAttribute(
        'aria-label',
        open
          ? t('ui.levelAria', { num: num.textContent, name: name.textContent, stars: rec?.stars ?? 0 }) +
            (id === unlocked ? t('ui.levelAriaNext') : '')
          : t('ui.lockedAria', { num: num.textContent }),
      );

      if (open) {
        btn.addEventListener('click', () => {
          this.audio.ui();
          this.game.startLevel(id);
        });
      }
      grid.append(btn);
    }

    const totalStars = Object.values(this.save.levels).reduce((s2, l) => s2 + (l.stars ?? 0), 0);
    this.el.levelsMeta.textContent = t('ui.starsMeta', { n: totalStars, total: CRAFTED_LEVELS * 3 });
  }

  /**
   * Chapter chips: a table of contents for a list eighty-eight items long.
   *
   * Scrolling to the sea from the top takes about six flicks on a phone, and
   * a player who wants to replay a dive does not want to travel through the
   * whole mountain to find one. The chip for a chapter you have not reached is
   * still there and still says how far away it is, because a locked door you
   * can see is an invitation and a locked door you cannot is just a wall.
   */
  _buildChapterJump(unlocked) {
    const bar = this.el.chapterJump;
    if (!bar) return;
    bar.innerHTML = '';
    for (const chapter of CHAPTERS) {
      const open = unlocked >= chapter.from;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `chip${open ? '' : ' chip--locked'}`;
      chip.disabled = !open;
      const done = Object.keys(this.save.levels).filter(
        (k) => Number(k) >= chapter.from && Number(k) <= chapter.to,
      ).length;
      chip.innerHTML =
        `<span class="chip__name">${loc(chapter)}</span>` +
        `<span class="chip__meta">${
          open ? `${done}/${chapter.levels.length}` : t('ui.chapterAt', { n: chapter.from })
        }</span>`;
      chip.addEventListener('click', () => {
        this.audio.ui();
        document
          .getElementById(`chapter-${chapter.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      bar.append(chip);
    }
    if (unlocked > CRAFTED_LEVELS) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.innerHTML =
        `<span class="chip__name">${t('ui.endless')}</span><span class="chip__meta">${t('ui.generated')}</span>`;
      chip.addEventListener('click', () => {
        this.audio.ui();
        document.getElementById('chapter-endless')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      bar.append(chip);
    }
  }

  /* ---------------------------------------------------------- HUD */

  updateHud(world, levelId, runDeaths) {
    if (this.el.hud.hidden) return;
    this.el.hudLevel.textContent = levelLabel(levelId);
    this.el.hudName.textContent = loc(world.def);
    this.el.hudFish.textContent = `${world.fishTaken}/${world.fish.length}`;
    this.el.hudDeaths.textContent = String(world.deaths + runDeaths);
    this.el.hudTime.textContent = formatTime(world.elapsed);

    // Speed charge — only on screen while it is actually running.
    const charge = world.player.charge ?? 0;
    this.el.chargeBar.hidden = charge <= 0;
    if (charge > 0) {
      this.el.chargeFill.style.width = `${Math.min(100, (charge / 4.5) * 100)}%`;
      this.el.chargeBar.classList.toggle('is-fading', charge < 1);
    }

    this.el.hudShield.hidden = world.maxShields <= 0;
    this.el.hudShield.classList.toggle('is-spent', world.shields <= 0);

    // The gap to the record holder. A bare timer says nothing; "+0.42" says
    // you are losing this by less than half a second.
    this._updateGhostChip(world);
    this._updateGear(world);

    const pct = world.progress * 100;
    this.el.progressFill.style.width = `${pct}%`;
    this.el.progressPin.style.left = `${pct}%`;

    if (world.hint && world.hintTimer > 0) {
      this._showToast(world.hint);
    } else if (world.hintTimer <= 0 && this._toastShown) {
      this._hideToast();
    }
  }

  /**
   * Wing stamina and motor charges.
   *
   * Both only refill on the ground, so the meter is the whole decision: spend
   * the glide now to make this gap, or save it for the one after.
   */
  _updateGear(world) {
    const p = world.player;
    const wings = p.glideMax > 0;
    const rocket = p.rocketMax > 0;
    this.el.gearBar.hidden = !(wings || rocket);
    if (this.el.gearBar.hidden) return;

    this.el.gearWings.hidden = !wings;
    if (wings) {
      const pct = Math.max(0, Math.min(1, p.glideLeft / p.glideMax));
      this.el.gearWingsFill.style.width = `${pct * 100}%`;
      this.el.gearWings.classList.toggle('is-empty', pct <= 0.01);
      this.el.gearWings.classList.toggle('is-active', p.gliding);
    }

    this.el.gearRocket.hidden = !rocket;
    if (rocket && this._rocketPips !== `${p.rocketLeft}/${p.rocketMax}`) {
      this._rocketPips = `${p.rocketLeft}/${p.rocketMax}`;
      this.el.gearRocketPips.innerHTML = Array.from(
        { length: p.rocketMax },
        (_, i) => `<i class="${i < p.rocketLeft ? 'on' : ''}"></i>`,
      ).join('');
    }
  }

  _updateGhostChip(world) {
    const chip = this.el.hudGhost;
    const lead = world.ghostLead;
    if (!world.ghost?.visible || lead == null) {
      chip.hidden = true;
      return;
    }
    chip.hidden = false;
    const ahead = lead > 0;
    // Rounded to hundredths, and the sign is the whole message.
    chip.textContent = `${ahead ? '−' : '+'}${Math.abs(lead).toFixed(2)}`;
    chip.classList.toggle('is-ahead', ahead);
    chip.classList.toggle('is-behind', !ahead);
    chip.setAttribute(
      'aria-label',
      t('ui.ghostAria', {
        name: world.ghost.name,
        n: Math.abs(lead).toFixed(2),
        dir: ahead ? t('ui.ahead') : t('ui.behind'),
      }),
    );
  }

  /** A one-off message on the title screen, reusing the in-game toast. */
  _toastOnce(text, seconds = 2.2) {
    this._showToast(text);
    clearTimeout(this._onceTimer);
    this._onceTimer = setTimeout(() => this._hideToast(), seconds * 1000);
  }

  _showToast(text) {
    if (this._toastShown === text) return;
    this._toastShown = text;
    this.el.toast.textContent = text;
    this.el.toast.hidden = false;
  }

  _hideToast() {
    this._toastShown = null;
    this.el.toast.hidden = true;
  }

  /* ------------------------------------------------------ lifecycle */

  onLevelStart(def, scale) {
    this._hideToast();

    const showIntro = Boolean(def.intro);
    if (!showIntro) {
      this.showScreen(null);
      return;
    }

    this.el.introKicker.textContent =
      def.id > CRAFTED_LEVELS
        ? t('ui.endlessN', { n: def.id - CRAFTED_LEVELS })
        : `${t('ui.levelN', { n: def.id })} · ${loc(def, 'subtitle')}`;
    this.el.introTitle.textContent = loc(def);
    this.el.introText.textContent = loc(def, 'intro');
    this.el.introCard.classList.remove('is-out');
    this.showScreen('intro');

    clearTimeout(this.introTimer);
    this.introTimer = setTimeout(() => {
      this.el.introCard.classList.add('is-out');
      setTimeout(() => {
        if (this.screen === 'intro') this.showScreen(null);
      }, 260);
    }, 2600);
  }

  onLevelComplete(result) {
    this.lastResult = result;
    const prevBest = result.prevBest;

    this.el.winKicker.textContent = result.daily
      ? result.firstToday
        ? t('ui.dailyStreakKicker', { n: result.streak })
        : t('ui.dailyFaster')
      : result.stars === 3
        ? t('ui.perfect')
        : result.deaths === 0
          ? t('ui.oneGo')
          : t('ui.levelDone');
    this.el.winTitle.textContent = result.name;
    this.el.winTime.textContent = formatRecord(result.time);
    this.el.winFish.textContent = `${result.fish}/${result.totalFish}`;
    this.el.winDeaths.textContent = String(result.deaths);

    const isRecord = !Number.isFinite(prevBest) || result.time < prevBest;
    this.el.winBest.textContent = formatRecord(isRecord ? result.time : prevBest);

    this.el.winStars.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('on', i < result.stars);
    });

    const missing = [];
    if (result.fish < result.totalFish) missing.push(t('ui.missAllFish'));
    if (result.time > result.target) missing.push(t('ui.missTime', { n: result.target }));
    this.el.winHint.textContent =
      result.stars === 3
        ? isRecord && Number.isFinite(prevBest)
          ? t('ui.newRecord')
          : ''
        : t('ui.forThree', { list: missing.join(' · ') });

    this.el.nextBtn.textContent =
      result.level === CRAFTED_LEVELS ? t('ui.toEndless') : t('win.next');
    // There is no "next" daily — tomorrow's is tomorrow's.
    this.el.nextBtn.hidden = Boolean(result.daily);

    this._renderPayout(result);
    this._renderRewards(result);
    this._renderShare(result);
    this.showScreen('complete');
    this.refreshTitle();
  }

  /**
   * Where this run landed, and the button that turns it into a rival for
   * somebody else. Only shown once there is actually a code to hand over.
   */
  _renderShare(result) {
    const has = Boolean(result.code);
    this.el.winShare.hidden = !has;
    if (!has) return;

    const lines = [];
    if (result.beatGhost === true) {
      const gap = (result.ghostTime - result.time).toFixed(2);
      lines.push(t('ui.beatGhost', { name: escapeHtml(result.ghostName), gap }));
    } else if (result.beatGhost === false) {
      const gap = (result.time - result.ghostTime).toFixed(2);
      lines.push(t('ui.ghostAhead', { name: escapeHtml(result.ghostName), gap }));
    } else if (result.isPB) {
      lines.push(t('ui.firstRecord'));
    }
    if (result.rivals > 1 && result.rank) {
      lines.push(t('ui.rankOf', { n: result.rivals, rank: result.rank }));
    }
    this.el.winRank.innerHTML = lines.join(' · ');
    this.el.winRank.hidden = lines.length === 0;
    // Only asked for once: a code with no name on it arrives as "Rakip".
    this.el.shareName.hidden = Boolean(this.save.name);
    this.el.shareNameInput.value = this.save.name ?? '';
    this._shareResult = result;
  }

  /**
   * Hand the run over. A phone gets the real share sheet — WhatsApp, Telegram,
   * wherever the friend actually is — and everything else gets the clipboard,
   * with a selectable field as the last resort so the code is never trapped.
   */
  async _share() {
    const r = this._shareResult;
    if (!r?.code) return;

    const typed = this.el.shareNameInput.value.trim();
    if (typed && typed !== this.save.name) {
      this._renameRuns(typed);
      this.el.shareName.hidden = true;
    }

    const text = shareText({
      level: r.level ?? r.boardKey,
      time: r.time,
      deaths: r.deaths,
      fish: r.fish,
      code: withName(r.code, Storage.displayName(this.save)),
      daily: r.daily,
      name: Storage.displayName(this.save),
    });

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Pengu', text });
        return;
      }
    } catch {
      /* dismissed or unsupported — fall through to the clipboard */
    }
    const copied = await this._copy(text);
    this._flashButton(this.el.shareBtn, copied ? t('ui.copied') : t('ui.copyFail'));
    if (!copied) this._showCodeFallback(text);
  }

  /**
   * Renaming yourself renames every code you have already saved — the name is
   * a header field, so no run has to be replayed to carry it.
   */
  _renameRuns(name) {
    const clean = Storage.setName(this.save, name);
    for (const g of Object.values(this.save.ghosts ?? {})) {
      if (g?.code) g.code = withName(g.code, clean);
    }
    this._persist();
    return clean;
  }

  async _copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // execCommand is deprecated and still the only thing that works when the
      // async clipboard is blocked by permissions or an insecure origin.
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.append(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  /** When nothing can copy for us, show the text so it can be selected by hand. */
  _showCodeFallback(text) {
    let box = document.getElementById('shareFallback');
    if (!box) {
      box = document.createElement('textarea');
      box.id = 'shareFallback';
      box.className = 'share__fallback';
      box.setAttribute('readonly', '');
      this.el.winShare.append(box);
    }
    box.value = text;
    box.hidden = false;
    box.select();
  }

  /**
   * The save as selectable text, for anywhere a download will not happen.
   *
   * Same idea as the share-code fallback and for the same reason: a button
   * whose whole purpose is "take your data with you" must never be a button
   * that silently does nothing.
   */
  _showDataFallback(text) {
    let box = document.getElementById('dataFallback');
    if (!box) {
      box = document.createElement('textarea');
      box.id = 'dataFallback';
      box.className = 'share__fallback';
      box.setAttribute('readonly', '');
      box.setAttribute('aria-label', t('ui.saveAll'));
      document.querySelector('.legal__data').after(box);
    }
    box.value = text;
    box.hidden = false;
    box.select();
  }

  _flashButton(btn, label) {
    const original = btn.dataset.label ?? btn.innerHTML;
    btn.dataset.label = original;
    btn.textContent = label;
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      btn.innerHTML = original;
    }, 1600);
  }

  /**
   * League points, the day's objectives and anything unlocked — the meta half
   * of the win sheet. Shown under the coins because that is the order they
   * matter in: coins are spendable now, the rest is why you play tomorrow.
   */
  _renderRewards(result) {
    const box = $('winRewards');
    if (!box) return;
    const parts = [];

    if (result.league?.points > 0) {
      const rows = result.league.rows.map((r) => `<li><span>${r.label}</span><span>+${r.value}</span></li>`).join('');
      parts.push(`
        <div class="reward reward--league${result.league.promoted ? ' is-promoted' : ''}">
          <div class="reward__head">
            <span>${t('ui.leaguePointsHead')}</span>
            <strong>+${result.league.points}</strong>
          </div>
          <ul class="reward__rows">${rows}</ul>
          ${result.league.promoted ? `<p class="reward__note">${t('ui.promoted')}</p>` : ''}
        </div>`);
    }

    if (result.objectives?.length) {
      const items = result.objectives
        .map(
          (o) => `<li class="goal${o.done ? ' goal--done' : ''}${o.fresh ? ' goal--fresh' : ''}">
            <span class="goal__tick" aria-hidden="true">${o.done ? '✓' : ''}</span><span>${loc(o, 'text')}</span></li>`,
        )
        .join('');
      parts.push(
        `<div class="reward"><div class="reward__head"><span>${t('ui.dailyGoalsHead')}</span></div><ul class="goals">${items}</ul></div>`,
      );
    }

    if (result.unlockedSkins?.length) {
      parts.push(`
        <div class="reward reward--unlock">
          <div class="reward__head"><span>${
            result.unlockedSkins.some((s) => s.bag === 'skins') ? t('ui.newSkin') : t('ui.newTrail')
          }</span></div>
          <p class="reward__note">${t('ui.unlockedNote', {
            list: result.unlockedSkins.map((sk) => loc(sk)).join(' · '),
          })}</p>
        </div>`);
    }

    box.innerHTML = parts.join('');
    box.hidden = parts.length === 0;
  }

  /** The coin breakdown, so the reward never feels like a black box. */
  _renderPayout(result) {
    const box = $('winPayout');
    if (!box) return;
    const rows = (result.breakdown ?? []).filter((b) => b.value > 0);
    box.innerHTML = `
      <div class="payout__total">
        <svg viewBox="0 0 24 16" aria-hidden="true"><path d="M14 8c0 3-3.6 5.5-7 5.5S1 11 1 8s2.6-5.5 6-5.5S14 5 14 8Z" fill="currentColor"/><path d="M14.5 8 22 3v10l-7.5-5Z" fill="currentColor"/></svg>
        <strong>+${result.coins ?? 0}</strong>
      </div>
      <ul class="payout__rows">
        ${rows.map((r) => `<li><span>${r.label}</span><span>+${r.value}</span></li>`).join('')}
      </ul>
      ${
        result.missionsDone?.length
          ? `<p class="payout__missions">${t('ui.missionsDone', { list: result.missionsDone.join(' · ') })}</p>`
          : ''
      }`;

    /**
     * The offer to double it, at the one moment the number is on screen.
     *
     * Placed above the shop button on purpose: this is the choice that changes
     * the number, and the shop is where the number gets spent. It only appears
     * when there is a haul worth doubling and a watch left today, so it is an
     * offer rather than a fixture — and it says out loud that the countdown is
     * a placeholder, because a button that promises an advertisement and shows
     * five seconds of nothing is a lie told to the person reading the code as
     * much as to the player.
     */
    if (canDouble(this.save, result.coins) && !result.doubled) {
      const offer = document.createElement('button');
      offer.className = 'btn btn--gold payout__double';
      offer.type = 'button';
      offer.innerHTML =
        `<span>${t('ui.doubleFish', { n: result.coins })}</span>` +
        `<small class="btn__sub">${
          isHouseProvider() ? t('ui.doubleHouse') : t('ui.doubleLeft', { n: watchesLeft(this.save) })
        }</small>`;
      offer.addEventListener('click', async () => {
        if (offer.disabled) return;
        offer.disabled = true;
        this.audio.ui();
        const label = offer.querySelector('span');
        const was = label.textContent;
        /**
         * A provider that throws must not eat the offer.
         *
         * The built-in placeholder cannot fail, which is exactly why this was
         * missing and exactly why it matters: the first thing a real ad SDK
         * does is reject — no fill, no network, consent withdrawn, tab
         * backgrounded. Without this the promise rejects, the handler dies
         * mid-flight, and the button is left disabled forever with a frozen
         * countdown on it. The player loses the offer and is told nothing.
         *
         * A failure puts the button back exactly as it was: nothing charged,
         * no watch spent, try again. Which is the only honest response to
         * "the advert did not play".
         */
        let bonus = 0;
        try {
          bonus = await doubleUp(this.save, result.coins, (left) => {
            label.textContent = t('ui.doubleWatching', { n: left });
          });
        } catch {
          label.textContent = was;
          offer.disabled = false;
          this._toastOnce?.(t('ui.doubleFailed'));
          return;
        }
        if (bonus > 0) {
          Storage.addCoins(this.save, bonus);
          result.coins += bonus;
          result.doubled = true;
          result.breakdown.push({ label: t('ui.doubleRow'), value: bonus });
          this.audio.charge?.();
          this._renderPayout(result);
          this.refreshWallet();
        } else {
          offer.remove();
        }
      });
      box.append(offer);
    }

    // A door to the shop, at the one moment the player has just been paid and
    // can see the number. It only appears when the money would actually buy
    // something — an invitation to a shop you cannot afford is a tease, and
    // this screen already has three buttons competing for the same thumb.
    const coins = this.save.coins ?? 0;
    const buyable = UPGRADES.filter((u) => {
      const owned = this.save.upgrades[u.id] ?? 0;
      return owned < u.levels.length && coins >= u.levels[owned].cost;
    });
    if (buyable.length) {
      const go = document.createElement('button');
      go.className = 'btn btn--ghost payout__shop';
      go.type = 'button';
      go.innerHTML =
        `<span>${t('ui.goShop')}</span><small class="btn__sub">${t('ui.canBuy', { n: buyable.length })}</small>`;
      go.addEventListener('click', () => {
        this.audio.ui();
        this.buildShop();
        this.showScreen('shop');
      });
      box.append(go);
    }
  }

  /**
   * Last-resort error card.
   *
   * There is no console on a phone, and a game that dies mid-frame otherwise
   * looks identical to a game that is simply slow: black canvas, frozen HUD.
   * This puts the actual message on screen so it can be read and reported.
   */
  showFatal(err) {
    if (document.getElementById('fatal')) return;
    const box = document.createElement('div');
    box.id = 'fatal';
    box.className = 'fatal';
    box.innerHTML = `
      <h2>${t('ui.fatalTitle')}</h2>
      <p>${t('ui.fatalBody')}</p>
      <pre></pre>
      <button class="btn btn--primary" type="button">${t('ui.retry')}</button>`;
    box.querySelector('pre').textContent =
      `${err?.name ?? 'Error'}: ${err?.message ?? err}\n\n` +
      `${(err?.stack ?? '').split('\n').slice(1, 5).join('\n')}\n\n` +
      `${navigator.userAgent}\n` +
      `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}`;
    box.querySelector('button').addEventListener('click', () => location.reload());
    document.body.append(box);
  }

  offerAssist() {
    this.game.state = 'paused';
    this.input.releaseAll();
    this.showScreen('assist');
  }

  /* ------------------------------------------------------- bindings */

  _buildLegend() {
    this.el.iceLegend.innerHTML = ICE_LEGEND.map(
      (type) => `
        <li>
          <span class="legend__swatch" data-type="${type}" aria-hidden="true"></span>
          <span class="legend__text"><strong>${t(`ice.${type}`)}</strong><small>${t(`ice.${type}D`)}</small></span>
        </li>`,
    ).join('');
  }

  _bindStatic() {
    this._isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    $('levelsBtn').addEventListener('click', () => {
      this.audio.ui();
      this.buildLevelGrid();
      this.showScreen('levels');
    });
    $('howtoBtn').addEventListener('click', () => {
      this.audio.ui();
      this.showScreen('howto');
    });
    $('monumentCard').addEventListener('click', () => {
      if (!Storage.fundMonument(this.save, this._monumentCost)) {
        this.audio.ui('back');
        return;
      }
      this.audio.fish();
      this.refreshMonument();
      this.refreshWallet();
    });

    $('shopBtn').addEventListener('click', () => {
      this.audio.ui();
      this.buildShop();
      this.refreshWallet();
      this.showScreen('shop');
    });
    $('settingsBtn').addEventListener('click', () => {
      this.audio.ui();
      this._syncSettings();
      this.showScreen('settings');
    });

    /* ---------------------------------------------------- kimlik */

    const openProfile = () => {
      this.audio.ui();
      this.buildProfile();
      this.showScreen('profile');
    };
    const openLegal = () => {
      this.audio.ui();
      this.showScreen('legal');
    };

    this.el.whoChip.addEventListener('click', () => {
      if (!this.save.name) this.openIdentity();
      else openProfile();
    });
    // Tapping your money goes where money goes. The shop was previously only
    // reachable from one button in a row of six; the purse is on every screen
    // that has one and is the gesture people try first.
    const openShop = () => {
      this.audio.ui();
      this.buildShop();
      this.showScreen('shop');
    };
    $('walletTitle').addEventListener('click', openShop);
    $('settingsProfile').addEventListener('click', openProfile);
    $('settingsLegal').addEventListener('click', openLegal);
    $('profLegal').addEventListener('click', openLegal);
    $('idLegal').addEventListener('click', openLegal);

    $('idSave').addEventListener('click', () => {
      if (this._commitName(this.el.idName, this.el.idHint)) {
        this.showScreen('title');
        this._toastOnce(t('ui.welcome', { name: this.save.name }));
      }
    });
    this.el.idName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('idSave').click();
    });

    $('profSave').addEventListener('click', () => {
      if (!this._commitName(this.el.profNameInput, this.el.profHint)) return;
      // Every stored run carries the name it was set under, so a rename has to
      // reach back through them — otherwise the board shows two people.
      this._renameRuns(this.save.name);
      this.buildProfile();
      if (this._returnTo === 'board') {
        this._returnTo = null;
        this.buildBoard();
        this.showScreen('board');
      }
    });
    this.el.profNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('profSave').click();
    });

    /**
     * Take your data with you.
     *
     * A download rather than a screenful of JSON: the point of the button is
     * that somebody can move their progress to another phone, and copying two
     * kilobytes of text out of a mobile browser is not a thing anybody does.
     */
    $('legalExport').addEventListener('click', () => {
      this.audio.ui();
      const json = JSON.stringify(this.save, null, 2);
      // Embedded viewers block downloads outright, and a blocked download does
      // not throw — the link is simply ignored and the player is left pressing
      // a button that does nothing. So when the game is running inside another
      // page, hand them the text instead: worse than a file, infinitely better
      // than silence.
      let embedded = false;
      try {
        embedded = window.self !== window.top;
      } catch {
        embedded = true;
      }
      if (!embedded) {
        try {
          const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `pengu-kayit-${todayKey()}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          this._toastOnce(t('ui.saved'));
          return;
        } catch {
          /* fall through to the copyable box */
        }
      }
      this._showDataFallback(json);
      this._toastOnce(t('ui.downloadOff'));
    });
    $('legalWipe').addEventListener('click', () => {
      this.audio.ui('back');
      $('resetBtn').click();
    });
    $('offerCard').addEventListener('click', () => {
      const offer = this._offer;
      if (!offer) return;
      const bag = offer.bag;
      if (this.save[bag]?.[offer.item.id]) {
        this.audio.ui('back');
        this.buildSkins(bag);
        this.showScreen('skins');
        return;
      }
      if (!Storage.buySkin(this.save, offer.item.id, offer.price, bag)) {
        this.audio.ui('back');
        this._toastOnce(t('ui.needMore', { n: offer.price - (this.save.coins ?? 0) }));
        return;
      }
      this.audio.fish();
      Storage.wearSkin(this.save, offer.item.id, bag);
      if (this.game?.world) {
        if (bag === 'trails') this.game.world.trailId = offer.item.id;
        else this.game.world.skinId = offer.item.id;
      }
      this.refreshTitle();
    });

    $('skinsBtn').addEventListener('click', () => {
      this.audio.ui();
      this.buildSkins('skins');
      this.showScreen('skins');
    });
    $('skinTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.tab')?.dataset.tab;
      if (!tab || tab === this._skinTab) return;
      this.audio.ui();
      this.buildSkins(tab);
    });
    $('leagueCard').addEventListener('click', () => {
      this.audio.ui();
      this.buildBoard();
      this._boardMessage(null);
      this.showScreen('board');
    });
    $('boardBtn').addEventListener('click', () => {
      this.audio.ui();
      this._boardMessage(null);
      this.buildBoard();
      this.showScreen('board');
    });

    this._bindBoard();

    this.el.overlay.querySelectorAll('[data-back]').forEach((b) =>
      b.addEventListener('click', () => {
        this.audio.ui('back');
        this.showScreen('title');
      }),
    );

    const bindSwitch = (id, key, after) => {
      const input = $(id);
      input.addEventListener('change', () => {
        this.save.settings[key] = input.checked;
        this._persist();
        after?.();
        this.audio.ui();
      });
    };

    bindSwitch('setSfx', 'sfx', () => this.game.applySettings());
    bindSwitch('setMusic', 'music', () => this.game.applySettings());
    bindSwitch('setMotion', 'reducedMotion', () => this.game.applySettings());
    bindSwitch('setAssist', 'assist', () => {
      if (this.game.world) this.game.world.assist = this.save.settings.assist;
    });

    this._buildLangPicker();

    $('resetBtn').addEventListener('click', () => {
      if (!confirm(t('ui.confirmReset'))) return;
      this._onReset?.();
    });

    // Rotate hint for narrow portrait phones.
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      this.el.rotateHint.hidden = !(this._isTouch && portrait && this.screen === 'title');
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation();
    this._checkOrientation = checkOrientation;
  }

  _bindBoard() {
    // The name is changed in one place — the identity screen — and the board
    // sends you there. Renaming restamps every stored code on the way back, so
    // the board and anything shared afterwards agree on who you are.
    $('boardRename').addEventListener('click', () => {
      this.audio.ui();
      this._returnTo = 'board';
      this.buildProfile();
      this.showScreen('profile');
    });

    const add = () => {
      const raw = this.el.boardCode.value;
      if (!raw.trim()) return;
      const res = this.game.importRival(raw);
      this._boardMessage(res.message, res.ok);
      if (res.ok) {
        this.el.boardCode.value = '';
        this.audio.fish();
        this.buildBoard();
      } else {
        this.audio.ui('back');
      }
    };
    $('boardAdd').addEventListener('click', add);
    this.el.boardCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        add();
      }
    });

    // Share and delete are delegated: the board is rebuilt on every change.
    this.el.boardList.addEventListener('click', async (e) => {
      const shareKey = e.target.closest('[data-share]')?.dataset.share;
      if (shareKey) {
        const row = Storage.board(this.save, shareKey).find((r) => r.you);
        if (!row) return this._boardMessage(t('ui.noTime'), false);
        const text = shareText({
          level: shareKey,
          time: row.time,
          code: withName(row.code, Storage.displayName(this.save)),
          daily: shareKey === 'daily',
          name: Storage.displayName(this.save),
        });
        try {
          if (navigator.share) {
            await navigator.share({ title: 'Pengu', text });
            return undefined;
          }
        } catch {
          /* dismissed — fall through */
        }
        const ok = await this._copy(text);
        this._boardMessage(ok ? t('ui.codeCopied') : t('ui.copyFail'), ok);
        return undefined;
      }

      const drop = e.target.closest('[data-drop]');
      if (drop) {
        Storage.removeRival(this.save, drop.dataset.drop, drop.dataset.name);
        this.audio.ui('back');
        this.buildBoard();
      }
      return undefined;
    });
  }

  /**
   * The language picker.
   *
   * Two buttons rather than a select, because a select on a phone opens a
   * sheet and this is a choice with two answers. Each button carries its own
   * language's name in its own language, so a player who cannot read the
   * interface can still find the way out of it.
   */
  _buildLangPicker() {
    const box = $('langPicker');
    if (!box) return;
    box.innerHTML = '';
    for (const lang of LANGS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang';
      btn.dataset.lang = lang.id;
      btn.innerHTML = `<b>${lang.short}</b><span>${lang.label}</span>`;
      btn.setAttribute('aria-pressed', String(getLang() === lang.id));
      btn.classList.toggle('is-on', getLang() === lang.id);
      btn.addEventListener('click', () => {
        if (getLang() === lang.id) return;
        this.save.settings.lang = lang.id;
        this._persist();
        this.audio.ui();
        this.applyLang(lang.id);
      });
      box.append(btn);
    }
  }

  /**
   * Switch language and repaint everything that was built in the old one.
   *
   * The static markup repaints itself from the data attributes; the screens
   * that build their own DOM have to be told, and forgetting one leaves a
   * player looking at half a translation.
   */
  applyLang(id) {
    setLang(id);
    this._buildLangPicker();
    this._buildLegend();
    this.refreshTitle();
    this.buildLevelGrid();
    this.buildShop();
    this.buildSkins(this._skinTab ?? 'skins');
    this.buildBoard();
    this.buildProfile();
    this.refreshMonument();
    if (this.lastResult) this._renderPayout(this.lastResult);
  }

  _syncSettings() {
    this._buildLangPicker();
    $('setSfx').checked = this.save.settings.sfx;
    $('setMusic').checked = this.save.settings.music;
    $('setMotion').checked = this.save.settings.reducedMotion;
    $('setAssist').checked = this.save.settings.assist;
  }

  _bindGame() {
    $('playBtn').addEventListener('click', () => {
      this.audio.ui();
      if (this._session && this.game.resumeSession()) return;
      this.game.startLevel(this.save.unlocked);
    });

    $('dailyBtn').addEventListener('click', () => {
      this.audio.ui();
      this.game.startDaily();
    });

    $('pauseBtn').addEventListener('click', () => this.game.togglePause());
    $('resumeBtn').addEventListener('click', () => this.game.resume());
    $('retryBtn').addEventListener('click', () => {
      this.audio.ui();
      this.game.replay();
    });
    $('menuBtn').addEventListener('click', () => {
      this.audio.ui('back');
      this.game.quitToMenu();
      this.refreshTitle();
      this._checkOrientation();
    });

    $('nextBtn').addEventListener('click', () => {
      this.audio.ui();
      this.game.nextLevel();
    });
    $('againBtn').addEventListener('click', () => {
      this.audio.ui();
      this.game.replay();
    });
    this.el.shareBtn.addEventListener('click', () => {
      this.audio.ui();
      this._share();
    });

    $('winMenuBtn').addEventListener('click', () => {
      this.audio.ui('back');
      this.game.quitToMenu();
      this.refreshTitle();
    });

    $('assistYes').addEventListener('click', () => {
      this.audio.ui();
      this.game.enableAssist();
      this.game.state = 'playing';
      this.showScreen(null);
    });
    $('assistNo').addEventListener('click', () => {
      this.audio.ui('back');
      this.game.state = 'playing';
      this.showScreen(null);
    });

    this._onReset = () => {
      this._resetHandler?.();
    };
  }

  _bindTouch() {
    this.input.bindButton($('padLeft'), 'left');
    this.input.bindButton($('padRight'), 'right');
    this.input.bindButton($('padJump'), 'jump');
  }

  onReset(fn) {
    this._resetHandler = fn;
  }

  /** Preview of the penguin's size for the given level (used by the intro). */
  static growthLabel(level) {
    const s = scaleForLevel(level);
    if (s < 1.1) return t('ui.chick');
    if (s < 1.3) return t('ui.growing');
    if (s < 1.5) return t('ui.young');
    return t('ui.adult');
  }
}

/** Names come from other people's share codes, so they never go in raw. */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Convenience used by the level grid to look up generated level names. */
export function levelName(id) {
  const def = getLevel(id);
  return (def && loc(def)) || t('ui.levelN', { n: id });
}

/**
 * "Bölüm 7" or "Sonsuz 3", the same way everywhere.
 *
 * The title screen used to say "Bölüm 84" once somebody got past the crafted
 * set, which is a level that does not exist. Three other screens already knew
 * the rule; this is the fourth, and now they share it.
 */
function levelLabel(id) {
  return id > CRAFTED_LEVELS
    ? t('ui.endlessN', { n: id - CRAFTED_LEVELS })
    : t('ui.levelN', { n: id });
}

/** Number and date formatting follows the chosen language, not the browser. */
function dateLocale() {
  return getLang() === 'en' ? 'en-GB' : 'tr-TR';
}
