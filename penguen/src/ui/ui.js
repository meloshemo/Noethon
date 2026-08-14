/**
 * DOM UI controller.
 *
 * The whole interface is real HTML — not canvas-drawn — so it gets proper
 * typography, focus handling, screen-reader labels and responsive layout for
 * free. This class is the only place that touches the DOM.
 */

import { formatTime } from '../core/util.js';
import { CRAFTED_LEVELS, UPGRADES, MONUMENT, monumentCost, scaleForLevel } from '../game/config.js';
import { getLevel } from '../game/game.js';
import { LEVELS } from '../game/levels.js';
import { Storage, todayKey } from '../core/storage.js';
import { ensureMissions } from '../game/missions.js';
import { shareText, withName } from '../game/ghost.js';
import { SKINS, TRAILS, RARITY, getSkin, getTrail, skinStatus, drawPortrait } from '../game/skins.js';
import { standing, weekKey } from '../game/league.js';
import { dailyObjectives } from '../game/daily.js';
import { generateDailyLevel } from '../game/generator.js';
import { dailyOffer, offerSecondsLeft, formatCountdown } from '../game/store.js';

const ICE_LEGEND = [
  ['crack', 'Çatlak buz', 'Basınca çatlar, kısa süre sonra kırılır'],
  ['trap', 'Sahte buz', 'Kızıl damarlı — neredeyse anında kırılır'],
  ['melt', 'Eriyen buz', 'Kendi kendine erir, sonra geri donar'],
  ['slip', 'Cilalı buz', 'Kaygan: fren mesafesi uzun'],
  ['move', 'Sürüklenen buz', 'Akıntıyla gider gelir, seni de taşır'],
  ['fall', 'Düşen buz', 'Bastığın an aşağı doğru kaçar'],
  ['burst', 'Gayzer buzu', 'Basınca tıslar, yarım saniye sonra seni fırlatır'],
  ['snap', 'Kaçan buz', 'Alçak ve cazip — tam inerken kayboluyor'],
];

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
      levelGrid: $('levelGrid'),
      levelsMeta: $('levelsMeta'),
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
      boardName: $('boardName'),
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
    // The rotate hint belongs to the title screen only.
    this._checkOrientation?.();

    if (name && name !== 'intro') {
      // Move focus to the first control so keyboard users land in the sheet.
      const first = overlay.querySelector(`.screen[data-name="${name}"] .btn, .screen[data-name="${name}"] .switch`);
      first?.focus({ preventScroll: true });
    }
  }

  refreshTitle() {
    const next = this.save.unlocked;
    const isNew = next === 1 && !Object.keys(this.save.levels).length;
    this.el.playLabel.textContent = isNew ? 'Başla' : 'Devam et';
    this.el.playSub.textContent = `Bölüm ${next}`;

    const stars = Object.values(this.save.levels).reduce((s, l) => s + (l.stars ?? 0), 0);
    const done = Object.keys(this.save.levels).length;
    this.el.titleStats.textContent = done
      ? `${done} bölüm tamamlandı · ${stars} yıldız · ${this.save.stats.totalFish} balık`
      : 'Kontroller: ← → yürü, Boşluk zıpla';

    this.refreshWallet();
    this.refreshDaily();
    this.refreshMissions();
    this.refreshLeague();
    this.refreshSkinsBadge();
    this.refreshOffer();
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
    this.el.offerName.textContent = offer.item.name;
    this.el.offerBlurb.textContent = owned ? 'Bu zaten sende.' : offer.item.blurb;
    this.el.offerWas.textContent = `${offer.was}`;
    this.el.offerNow.textContent = owned ? '—' : `${offer.price} balık`;
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
    this.el.leagueName.textContent = `${st.tier.name} Lig`;
    this.el.leaguePoints.textContent = `${st.points} puan`;
    this.el.leagueFill.style.width = `${Math.round(st.pct * 100)}%`;
    this.el.leagueFill.style.background = st.tier.color;
    this.el.leagueBadge.style.color = st.tier.color;
    this.el.leagueNext.textContent = st.next
      ? `${st.tier.name} → ${st.next.name} için ${st.toNext} puan`
      : 'En üst lig — bu hafta zirvedesin';
  }

  /** Badge the collection when something is claimable or affordable. */
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
      ? `${got}/${list.length} hedef · en iyi ${formatTime(d.bestTime)}`
      : `${list.length} hedef · herkes için aynı bölüm`;
    this.el.dailyStreak.hidden = !d.streak;
    this.el.dailyStreak.textContent = d.streak ? `${d.streak} gün` : '';
    document.getElementById('dailyBtn').classList.toggle('daily--done', got === list.length && list.length > 0);

    this.el.dailyGoals.innerHTML = list
      .map(
        (o) => `
        <li class="goal${done.includes(o.id) ? ' goal--done' : ''}">
          <span class="goal__tick" aria-hidden="true">${done.includes(o.id) ? '✓' : ''}</span>
          <span>${o.text}</span>
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
      body.innerHTML = `
        <span class="skin__rarity" style="color:${rarity.color}">${rarity.name}</span>
        <strong class="skin__name">${item.name}</strong>
        <small class="skin__blurb">${item.blurb}</small>
        ${
          st.owned
            ? '<span class="skin__state">Açıldı</span>'
            : `<span class="skin__bar"><i style="width:${Math.round(st.pct * 100)}%;background:${rarity.color}"></i></span>
               <span class="skin__state">${st.label}</span>`
        }`;

      const btn = document.createElement('button');
      btn.className = 'btn skin__btn';
      btn.type = 'button';
      if (st.owned) {
        const isWorn = worn === item.id;
        btn.textContent = isWorn ? 'Giyildi' : 'Giy';
        btn.disabled = isWorn;
        if (!isWorn) btn.classList.add('btn--primary');
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
        btn.innerHTML = st.cost === 0 ? 'Al' : `<span>Al</span><small class="btn__sub">${st.cost} balık</small>`;
        btn.addEventListener('click', () => {
          if (!Storage.buySkin(this.save, item.id, st.cost, bag)) return;
          this.audio.fish();
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
              <span class="mission__text">${m.text}</span>
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
    const rank =
      blocks < MONUMENT.ranks.length
        ? MONUMENT.ranks[blocks]
        : `${MONUMENT.ranks[MONUMENT.ranks.length - 1]} +${blocks - MONUMENT.ranks.length + 1}`;
    this.el.monumentRank.textContent = rank;
    this.el.monumentCost.textContent = `${cost.toLocaleString('tr-TR')} balık`;
    this.el.monumentBlocks.textContent = `${blocks} blok`;
    this.el.monumentCard.classList.toggle('is-affordable', (this.save.coins ?? 0) >= cost);
    this._monumentCost = cost;
  }

  buildShop() {
    this.refreshMonument();
    const coins = this.save.coins ?? 0;
    this.el.shopGrid.innerHTML = '';

    for (const spec of UPGRADES) {
      const owned = this.save.upgrades[spec.id] ?? 0;
      const maxed = owned >= spec.levels.length;
      const next = maxed ? null : spec.levels[owned];
      const affordable = next && coins >= next.cost;

      const card = document.createElement('div');
      card.className = `item${maxed ? ' item--maxed' : ''}`;
      card.innerHTML = `
        <span class="item__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${SHOP_ICONS[spec.icon] ?? ''}</svg></span>
        <span class="item__head">
          <strong class="item__name">${spec.name}</strong>
          <span class="item__pips">${spec.levels
            .map((_, i) => `<i class="${i < owned ? 'on' : ''}"></i>`)
            .join('')}</span>
        </span>
        <span class="item__blurb">${spec.blurb}</span>
        <span class="item__effect">${
          maxed ? spec.levels[spec.levels.length - 1].label : next.label
        }</span>`;

      const btn = document.createElement('button');
      btn.className = `btn item__buy${affordable ? ' btn--primary' : ''}`;
      btn.type = 'button';
      btn.disabled = maxed || !affordable;
      btn.innerHTML = maxed
        ? 'Tamamlandı'
        : `<span>Al</span><small class="btn__sub">${next.cost} balık</small>`;
      btn.addEventListener('click', () => {
        if (!Storage.buyUpgrade(this.save, spec)) return;
        this.audio.fish();
        this.buildShop();
        this.refreshWallet();
      });

      card.append(btn);
      this.el.shopGrid.append(card);
    }
  }

  /* ------------------------------------------------------- board */

  /** Label for a board key: "Bölüm 7", "Sonsuz 3" or "Günün Bölümü". */
  static boardLabel(key) {
    if (key === 'daily') return 'Günün Bölümü';
    const id = Number(key);
    if (!Number.isFinite(id)) return String(key);
    if (id > CRAFTED_LEVELS) return `Sonsuz ${id - CRAFTED_LEVELS}`;
    return `Bölüm ${id}${LEVELS[id - 1] ? ` · ${LEVELS[id - 1].name}` : ''}`;
  }

  /**
   * The leaderboard.
   *
   * Every level you have a time on, with everyone whose code you hold, fastest
   * first. It is a real board — it just travels by share code instead of by
   * server, which is the only way to have one with no backend at all.
   */
  buildBoard() {
    this.el.boardName.value = this.save.name ?? '';
    const keys = Storage.boardKeys(this.save);
    const list = this.el.boardList;
    list.innerHTML = '';

    if (!keys.length) {
      list.innerHTML =
        '<p class="board__empty">Henüz kayıtlı süre yok. Bir bölümü bitir — süren buraya düşsün.</p>';
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
          <button class="btn btn--tiny" type="button" data-share="${key}">Paylaş</button>
        </header>
        <ol class="board__rows">
          ${rows
            .map(
              (r, i) => `
            <li class="board__row${r.you ? ' is-you' : ''}">
              <span class="board__rank">${i + 1}</span>
              <span class="board__who">${escapeHtml(r.name)}</span>
              <span class="board__time">${formatTime(r.time)}</span>
              ${
                r.you
                  ? '<span class="board__tag">sen</span>'
                  : `<button class="board__drop" type="button" data-drop="${key}" data-name="${escapeHtml(r.name)}" aria-label="${escapeHtml(r.name)} kaydını sil">×</button>`
              }
            </li>`,
            )
            .join('')}
        </ol>`;
      list.append(card);
    }

    this.el.boardMeta.textContent = rivals
      ? `${keys.length} bölüm · ${rivals} rakip`
      : `${keys.length} bölüm`;
  }

  _boardMessage(text, ok) {
    const el = this.el.boardMsg;
    el.hidden = !text;
    el.textContent = text ?? '';
    el.classList.toggle('is-ok', Boolean(ok));
    el.classList.toggle('is-bad', text && !ok);
  }

  buildLevelGrid() {
    const grid = this.el.levelGrid;
    grid.innerHTML = '';
    const unlocked = this.save.unlocked;
    const endlessShown = Math.max(0, unlocked - CRAFTED_LEVELS);
    const count = CRAFTED_LEVELS + Math.min(endlessShown, 12);

    for (let id = 1; id <= count; id++) {
      const rec = this.save.levels[id];
      const open = id <= unlocked;
      const def = id <= CRAFTED_LEVELS ? LEVELS[id - 1] : null;

      const btn = document.createElement('button');
      btn.className = 'level';
      if (id === unlocked) btn.classList.add('level--current');
      if (id > CRAFTED_LEVELS) btn.classList.add('level--endless');
      btn.disabled = !open;
      btn.type = 'button';

      const num = document.createElement('span');
      num.className = 'level__num';
      num.textContent = id > CRAFTED_LEVELS ? `Sonsuz ${id - CRAFTED_LEVELS}` : `Bölüm ${id}`;

      const name = document.createElement('span');
      name.className = 'level__name';
      name.textContent = open ? (def?.name ?? `Bölüm ${id}`) : 'Kilitli';

      const stars = document.createElement('span');
      stars.className = 'level__stars';
      for (let s = 0; s < 3; s++) {
        stars.insertAdjacentHTML(
          'beforeend',
          `<svg viewBox="0 0 24 24" class="${(rec?.stars ?? 0) > s ? '' : 'off'}" aria-hidden="true"><path fill="currentColor" d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2Z"/></svg>`,
        );
      }

      btn.append(num, name, stars);

      if (rec?.bestTime && Number.isFinite(rec.bestTime)) {
        const t = document.createElement('span');
        t.className = 'level__time';
        t.textContent = formatTime(rec.bestTime);
        btn.append(t);
      }

      btn.setAttribute(
        'aria-label',
        open ? `${num.textContent}: ${name.textContent}, ${rec?.stars ?? 0} yıldız` : `${num.textContent} kilitli`,
      );

      if (open) {
        btn.addEventListener('click', () => {
          this.audio.ui();
          this.game.startLevel(id);
        });
      }
      grid.append(btn);
    }

    const totalStars = Object.values(this.save.levels).reduce((s, l) => s + (l.stars ?? 0), 0);
    this.el.levelsMeta.textContent = `${totalStars} / ${CRAFTED_LEVELS * 3} yıldız`;
  }

  /* ---------------------------------------------------------- HUD */

  updateHud(world, levelId, runDeaths) {
    if (this.el.hud.hidden) return;
    this.el.hudLevel.textContent = levelId > CRAFTED_LEVELS ? `Sonsuz ${levelId - CRAFTED_LEVELS}` : `Bölüm ${levelId}`;
    this.el.hudName.textContent = world.def.name;
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
      `${world.ghost.name} rekoruna göre ${Math.abs(lead).toFixed(2)} saniye ${ahead ? 'öndesin' : 'geridesin'}`,
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
      def.id > CRAFTED_LEVELS ? `Sonsuz ${def.id - CRAFTED_LEVELS}` : `Bölüm ${def.id} · ${def.subtitle ?? ''}`;
    this.el.introTitle.textContent = def.name;
    this.el.introText.textContent = def.intro;
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
        ? `Günün bölümü · ${result.streak} günlük seri`
        : 'Günün bölümü — daha hızlı'
      : result.stars === 3
        ? 'Kusursuz!'
        : result.deaths === 0
          ? 'Tek seferde!'
          : 'Bölüm tamam';
    this.el.winTitle.textContent = result.name;
    this.el.winTime.textContent = formatTime(result.time);
    this.el.winFish.textContent = `${result.fish}/${result.totalFish}`;
    this.el.winDeaths.textContent = String(result.deaths);

    const isRecord = !Number.isFinite(prevBest) || result.time < prevBest;
    this.el.winBest.textContent = formatTime(isRecord ? result.time : prevBest);

    this.el.winStars.querySelectorAll('.star').forEach((s, i) => {
      s.classList.toggle('on', i < result.stars);
    });

    const missing = [];
    if (result.fish < result.totalFish) missing.push('tüm balıkları topla');
    if (result.time > result.target) missing.push(`${result.target} sn altında bitir`);
    this.el.winHint.textContent =
      result.stars === 3
        ? isRecord && Number.isFinite(prevBest)
          ? 'Yeni rekor!'
          : ''
        : `3 yıldız için: ${missing.join(' · ')}`;

    this.el.nextBtn.textContent =
      result.level === CRAFTED_LEVELS ? 'Sonsuz moda geç' : 'Sıradaki bölüm';
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
      lines.push(`<strong>${result.ghostName} geçildi</strong> — ${gap} sn farkla`);
    } else if (result.beatGhost === false) {
      const gap = (result.time - result.ghostTime).toFixed(2);
      lines.push(`${result.ghostName} hâlâ önde — ${gap} sn`);
    } else if (result.isPB) {
      lines.push('<strong>İlk rekorun</strong> — artık kendinle yarışıyorsun');
    }
    if (result.rivals > 1 && result.rank) {
      lines.push(`${result.rivals} kişilik sıralamada <strong>${result.rank}.</strong>`);
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
    this._flashButton(this.el.shareBtn, copied ? 'Kopyalandı ✓' : 'Kopyalanamadı');
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
            <span>Lig puanı</span>
            <strong>+${result.league.points}</strong>
          </div>
          <ul class="reward__rows">${rows}</ul>
          ${result.league.promoted ? '<p class="reward__note">Lig atladın!</p>' : ''}
        </div>`);
    }

    if (result.objectives?.length) {
      const items = result.objectives
        .map(
          (o) => `<li class="goal${o.done ? ' goal--done' : ''}${o.fresh ? ' goal--fresh' : ''}">
            <span class="goal__tick" aria-hidden="true">${o.done ? '✓' : ''}</span><span>${o.text}</span></li>`,
        )
        .join('');
      parts.push(`<div class="reward"><div class="reward__head"><span>Günün hedefleri</span></div><ul class="goals">${items}</ul></div>`);
    }

    if (result.unlockedSkins?.length) {
      parts.push(`
        <div class="reward reward--unlock">
          <div class="reward__head"><span>${
            result.unlockedSkins.some((s) => s.bag === 'skins') ? 'Yeni penguen!' : 'Yeni iz!'
          }</span></div>
          <p class="reward__note">${result.unlockedSkins.map((s) => s.name).join(' · ')} açıldı — Koleksiyon'dan giyebilirsin.</p>
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
          ? `<p class="payout__missions">Görev tamam: ${result.missionsDone.join(' · ')}</p>`
          : ''
      }`;
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
      <h2>Oyun bir hataya takıldı</h2>
      <p>Bunu olduğu gibi gönderirsen sebebini bulabilirim.</p>
      <pre></pre>
      <button class="btn btn--primary" type="button">Yeniden dene</button>`;
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
      ([type, title, desc]) => `
        <li>
          <span class="legend__swatch" data-type="${type}" aria-hidden="true"></span>
          <span class="legend__text"><strong>${title}</strong><small>${desc}</small></span>
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
        this._toastOnce(`${offer.price - (this.save.coins ?? 0)} balık daha lazım`);
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

    $('resetBtn').addEventListener('click', () => {
      if (!confirm('Tüm ilerleme silinecek. Emin misin?')) return;
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
    // Renaming restamps every stored code, so the board and anything shared
    // afterwards agree on who you are.
    this.el.boardName.addEventListener('change', () => {
      this._renameRuns(this.el.boardName.value);
      this.buildBoard();
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
        if (!row) return this._boardMessage('Bu bölümde paylaşacak bir süren yok.', false);
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
        this._boardMessage(ok ? 'Kod kopyalandı — arkadaşına gönder.' : 'Kopyalanamadı.', ok);
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

  _syncSettings() {
    $('setSfx').checked = this.save.settings.sfx;
    $('setMusic').checked = this.save.settings.music;
    $('setMotion').checked = this.save.settings.reducedMotion;
    $('setAssist').checked = this.save.settings.assist;
  }

  _bindGame() {
    $('playBtn').addEventListener('click', () => {
      this.audio.ui();
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
    if (s < 1.1) return 'yavru';
    if (s < 1.3) return 'büyüyor';
    if (s < 1.5) return 'genç';
    return 'yetişkin';
  }
}

/** Names come from other people's share codes, so they never go in raw. */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Convenience used by the level grid to look up generated level names. */
export function levelName(id) {
  return getLevel(id)?.name ?? `Bölüm ${id}`;
}
