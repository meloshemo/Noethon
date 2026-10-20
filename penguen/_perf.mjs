import { chromium } from 'playwright';
const exe = process.env.PENGU_CHROMIUM || undefined;
const b = await chromium.launch(exe ? { executablePath: exe } : {});
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3, serviceWorkers: 'block', locale: 'tr-TR' });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
const rate = Number(process.env.THROTTLE || 4);
await cdp.send('Emulation.setCPUThrottlingRate', { rate });
await p.goto('http://localhost:8123');
await p.waitForFunction(() => window.__pengu);
await p.touchscreen.tap(195, 422);
await p.waitForTimeout(300);
for (const id of [30, 46, 61, 76, 200]) {
  await p.evaluate((l) => { window.__pengu.ui._isTouch = true; window.__pengu.startLevel(l); }, id);
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => new Promise((res) => {
    const times = [];
    let last = performance.now();
    let n = 0;
    const tick = () => {
      const now = performance.now();
      times.push(now - last);
      last = now;
      if (++n < 180) requestAnimationFrame(tick);
      else {
        const s = times.slice(20).sort((a, c) => a - c);
        res({
          median: +s[Math.floor(s.length / 2)].toFixed(1),
          p95: +s[Math.floor(s.length * 0.95)].toFixed(1),
          worst: +s[s.length - 1].toFixed(1),
        });
      }
    };
    requestAnimationFrame(tick);
  }));
  console.log(`CPU ×${rate}  bölüm ${id}  ortanca ${r.median}ms  p95 ${r.p95}ms  en kötü ${r.worst}ms`);
}
await b.close();
