/**
 * DOM UI controller.
 *
 * The whole interface is real HTML — not canvas-drawn — so it gets proper
 * typography, focus handling, screen-reader labels and responsive layout for
 * free. This class is the only place that touches the DOM.
 */

import { formatTime } from '../core/util.js';
import { CRAFTED_LEVELS, UPGRADES, scaleForLevel } from '../game/config.js';
import { getLevel } from '../game/game.js';
import { LEVELS } from '../game/levels.js';
import { Storage } from '../core/storage.js';
import { ensureMissions } from '../game/missions.js';

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
      chargeBar: $('chargeBar'),
      chargeFill: $('chargeFill'),
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
    this.el.dailyState.textContent = d.done
      ? `Bugün bitti · ${formatTime(d.bestTime)} — daha hızlı dene`
      : 'Herkes için aynı — süreni karşılaştır';
    this.el.dailyStreak.hidden = !d.streak;
    this.el.dailyStreak.textContent = d.streak ? `${d.streak} gün` : '';
    document.getElementById('dailyBtn').classList.toggle('daily--done', d.done);
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

  buildShop() {
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

    const pct = world.progress * 100;
    this.el.progressFill.style.width = `${pct}%`;
    this.el.progressPin.style.left = `${pct}%`;

    if (world.hint && world.hintTimer > 0) {
      this._showToast(world.hint);
    } else if (world.hintTimer <= 0 && this._toastShown) {
      this._hideToast();
    }
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
    this.showScreen('complete');
    this.refreshTitle();
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

/** Convenience used by the level grid to look up generated level names. */
export function levelName(id) {
  return getLevel(id)?.name ?? `Bölüm ${id}`;
}
