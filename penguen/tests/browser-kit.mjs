/**
 * Shared plumbing for the browser tests.
 *
 * The three of them each need the same four things — a Chromium, a page, a
 * running game and a way to press buttons — and they had it copied three
 * times, including a hard-coded path to one particular Chromium build on one
 * particular machine. That is fine until somebody else runs the tests, which
 * is the entire point of having them.
 *
 * Two environment variables, both optional:
 *
 *   PENGU_URL       where the game is served   (default http://localhost:8123)
 *   PENGU_CHROMIUM  which Chromium to drive    (default: Playwright's own)
 */

import { chromium } from 'playwright';

export const URL = process.env.PENGU_URL ?? 'http://localhost:8123';

/** Launch a browser on whatever Chromium this machine has. */
export function launch() {
  const executablePath = process.env.PENGU_CHROMIUM || undefined;
  return chromium.launch(executablePath ? { executablePath } : {});
}

/**
 * A page with the game loaded, every level unlocked, and a synthetic
 * controller wired to the real input layer.
 *
 * The controller matters: pressing keys through `page.keyboard` tests the
 * browser's key handling, which nobody has ever broken. Driving `Input`'s own
 * touch source tests the thing the game actually reads, on the same code path
 * a phone uses.
 */
export async function openGame(browser, { width = 1280, height = 720 } = {}) {
  // Service workers off. The game registers one so it can be played with no
  // signal, and a test that is quietly served yesterday's modules out of a
  // cache is worse than no test: it passes.
  const context = await browser.newContext({
    viewport: { width, height },
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('CONNECTION_RESET')) {
      errors.push('console: ' + m.text());
    }
  });

  await page.goto(`${URL}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__pengu), null, { timeout: 15000 });
  await page.evaluate(() => {
    window.__pengu.save.unlocked = 999;
    const inp = window.__pengu.input;
    window.__ctl = {
      hold(a, on) {
        if (on) inp._sources.touch.add(a);
        else inp._sources.touch.delete(a);
        inp._sync();
      },
      tap(a) {
        inp._sources.touch.add(a);
        inp._sync();
        inp._emit(a);
        setTimeout(() => {
          inp._sources.touch.delete(a);
          inp._sync();
        }, 40);
      },
      // A jump is an edge, not a level: `jumpPressed` only ever comes from the
      // emit, so holding the button without emitting never jumps at all.
      press(a) {
        inp._sources.touch.add(a);
        inp._sync();
        inp._emit(a);
      },
      release() {
        for (const a of ['left', 'right', 'jump']) inp._sources.touch.delete(a);
        inp._sync();
      },
    };
  });
  return { page, errors };
}

/** The tiny assertion helper all three suites share. */
export function checklist() {
  const fails = [];
  return {
    fails,
    ok(name, cond, extra = '') {
      if (cond) console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`);
      else {
        console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`);
        fails.push(name);
      }
    },
    finish(what) {
      console.log(fails.length ? `\n✗ ${fails.length} başarısız: ${fails.join(', ')}` : `\n✓ ${what}`);
      return fails.length ? 1 : 0;
    },
  };
}
