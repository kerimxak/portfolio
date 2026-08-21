/* Loads the site in chromium and webkit, screenshots each viewport into shots/,
   and asserts the things that must not silently break. WebKit is not optional
   here — most of the traffic is Safari and iPhone.

   Run:  cd tests && npm install && npm test
*/
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const ROOT  = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, 'shots');

const VIEWPORTS = [
  { w: 375,  h: 812  },
  { w: 768,  h: 1024 },
  { w: 1440, h: 900  },
];

/* nothing may overflow horizontally anywhere in this range */
const WIDTHS = [320, 360, 375, 414, 560, 768, 820, 900, 1024, 1180, 1280, 1440, 1920];

const ENGINES = [
  { name: 'chromium', type: chromium },
  { name: 'webkit',   type: webkit   },
];

const GROUND = { light: 'rgb(232, 231, 227)', dark: 'rgb(20, 20, 19)' };

let failures = 0;
const ok   = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const fail = (m) => { failures++; console.log(`  \x1b[31m✗ ${m}\x1b[0m`); };
const check = (cond, m) => cond ? ok(m) : fail(m);

/* ------------------------------------------------------------------ helpers */

/* the ground cross-fades over .35s, so read it only once it has landed */
const bg = async (page) => {
  await page.waitForTimeout(450);
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
};
const theme = (page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'));

/* Fonts and pictures both, or the screenshots lie about what shipped — a shot
   taken before the plates decode shows empty slots and looks exactly like a bug.
   Bounded, because decode() on a loading="lazy" image that is still far below
   the fold is not obliged to settle at all. */
const ready = (page) => page.evaluate(() => Promise.race([
  Promise.all([
    document.fonts.ready,
    ...[...document.images].map((i) => i.decode().catch(() => {})),
  ]),
  new Promise((r) => setTimeout(r, 4000)),
]));

/* settle the rAF-throttled scroll spy */
const settle = (page) => page.evaluate(() => new Promise((r) =>
  requestAnimationFrame(() => requestAnimationFrame(r))));

async function scrollToSection(page, id) {
  await page.evaluate((sel) => {
    window.scrollTo({ top: document.querySelector(sel).offsetTop + 10, behavior: 'instant' });
  }, id);
  await settle(page);
}

/* ------------------------------------------------------------------- asserts */

/* 2. the EN/TR toggle swaps copy and updates the URL.
      The Turkish copy is deliberately unwritten, so we seed one probe string
      and watch that exact string appear. Nothing here translates anything. */
async function assertLanguageToggle(page, origin) {
  const h1 = page.locator('h1 [data-i18n="hero.h1"]');

  check(await page.getAttribute('html', 'lang') === 'en', 'starts in English');
  check(!page.url().includes('lang='),                    'no ?lang on the default');

  await page.evaluate(() => { window.__i18n.COPY.tr['hero.h1'] = 'TR_PROBE'; });
  await page.click('#lang-tr');

  check(await h1.textContent() === 'TR_PROBE',                           'toggle swaps copy in place');
  check(page.url().includes('lang=tr'),                                  'URL updates to ?lang=tr');
  check(await page.getAttribute('html', 'lang') === 'tr',                'html lang follows');
  check(await page.getAttribute('#lang-tr', 'aria-pressed') === 'true',  'TR reads as pressed');
  check(await page.getAttribute('#lang-en', 'aria-pressed') === 'false', 'EN reads as unpressed');
  check(
    await page.locator('[data-i18n="ct.h2"]').textContent() === "I'm looking for a junior iOS role.",
    'unwritten Turkish falls back to English'
  );
  check(
    (await page.getAttribute('a[data-cv]', 'href')).endsWith('tr.pdf'),
    'CV link follows the language'
  );

  await page.click('#lang-en');
  check(await h1.textContent() === 'iOS apps, and the parts nobody sees', 'toggling back restores English');
  check(!page.url().includes('lang='),                                    'URL drops ?lang on the default');

  /* the URL is the source of truth, so a shared link must land in Turkish */
  await page.goto(`${origin}/?lang=tr`);
  check(await page.getAttribute('html', 'lang') === 'tr', '?lang=tr is honoured on load');
  await page.goto(`${origin}/`);
}

/* browser detection: tr-* gets Turkish, everyone else English */
async function assertLanguageDetection(browser, origin) {
  for (const [locale, want] of [['tr-TR', 'tr'], ['tr', 'tr'], ['en-GB', 'en'], ['ru-RU', 'en']]) {
    const context = await browser.newContext({ locale, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${origin}/`);
    check(await page.getAttribute('html', 'lang') === want, `${locale} detects as ${want}`);
    check(!page.url().includes('lang='), `${locale} keeps the URL clean when detection is honoured`);
    await context.close();
  }
}

/* 3. dark mode. The default follows prefers-color-scheme with no script; an
      explicit choice lands in the URL and never in localStorage. */
async function assertTheme(browser, origin) {
  for (const os of ['light', 'dark']) {
    const other = os === 'light' ? 'dark' : 'light';

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: os,
    });
    const page = await context.newPage();
    await page.goto(`${origin}/`);
    await ready(page);

    /* shoot the untouched OS default, before any click navigates away from it */
    await page.screenshot({ path: path.join(SHOTS, `theme-os-${os}.png`) });
    await page.screenshot({ path: path.join(SHOTS, `theme-os-${os}-full.png`), fullPage: true });

    check(await bg(page) === GROUND[os],  `OS ${os} → ${os} ground with no ?theme`);
    check(await theme(page) === null,     `OS ${os} → no data-theme until asked`);
    check(
      await page.getAttribute(`#theme-${os}`, 'aria-pressed') === 'true',
      `OS ${os} → the ${os} button reads as pressed`
    );

    await page.click(`#theme-${other}`);
    check(await theme(page) === other,             `choosing ${other} sets data-theme`);
    check(await bg(page) === GROUND[other],        `choosing ${other} repaints the ground`);
    check(page.url().includes(`theme=${other}`),   `choosing ${other} lands in the URL`);
    check(
      await page.getAttribute(`#theme-${other}`, 'aria-pressed') === 'true',
      `the ${other} button reads as pressed`
    );

    await page.click(`#theme-${os}`);
    check(await theme(page) === null,      `choosing ${os} back drops the override`);
    check(!page.url().includes('theme='),  `a choice matching the OS leaves the URL clean`);

    /* a shared link decides, and before first paint — data-theme is set in head */
    await page.goto(`${origin}/?theme=${other}`);
    check(await theme(page) === other,      `?theme=${other} is honoured on load`);
    check(await bg(page) === GROUND[other], `?theme=${other} repaints the ground`);

    check(
      await page.evaluate(() => { try { return window.localStorage.length === 0; } catch (e) { return true; } }),
      'nothing is written to localStorage'
    );

    await context.close();
  }
}

/* 4. at 1440x900 the headline, the facts block and both CTA buttons are in the
      viewport before any scroll. This is what the page uses in place of a hero
      image, and there must not be one. */
async function assertFirstScreenful(page) {
  const vh = page.viewportSize().height;
  check(await page.evaluate(() => window.scrollY) === 0, 'page has not scrolled');

  const fits = async (sel, label) => {
    const box = await page.locator(sel).boundingBox();
    check(
      box !== null && box.y >= 0 && box.y + box.height <= vh,
      `${label} is above the fold (${box ? Math.round(box.y + box.height) : '?'}px of ${vh}px)`
    );
  };

  await fits('.hero h1',    'the headline');
  await fits('.hero .facts', 'the facts block');
  await fits('.hero .btns a:nth-child(1)', 'the CV button');
  await fits('.hero .btns a:nth-child(2)', 'the contact button');

  check(
    await page.locator('.hero .xgrid').count() === 1 &&
    await page.locator('.hero img, .hero picture, .hero video').count() === 0,
    'the hero is still image-free'
  );
}

/* 5. the facts grid goes 4 → 2 → 1, never 3+1, and the cells are one height */
async function assertFactsGrid(page) {
  const shape = () => page.evaluate(() => {
    const el = document.querySelector('.hero .facts');
    const cols = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length;
    const hs = [...el.children].map((c) => Math.round(c.getBoundingClientRect().height));
    return { cols, even: new Set(hs).size === 1, hs };
  });

  for (const [w, want] of [[1440, 4], [1280, 4], [1024, 2], [900, 2], [768, 2], [560, 1], [375, 1]]) {
    await page.setViewportSize({ width: w, height: 900 });
    const s = await shape();
    check(s.cols === want, `facts is ${want} column(s) at ${w}px (got ${s.cols})`);
    check(s.even, `facts cells are one height at ${w}px (${s.hs.join('/')})`);
  }
}

/* 6. nothing overflows horizontally, at any width from 320 up */
async function assertNoOverflow(page) {
  const wide = [];
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await settle(page);
    const over = await page.evaluate(() => {
      const d = document.documentElement;
      if (d.scrollWidth <= window.innerWidth + 1) return null;
      /* name the widest offender so the failure is actionable */
      let worst = null;
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > window.innerWidth + 1 && (!worst || r.right > worst.right))
          worst = { right: Math.round(r.right), tag: el.tagName.toLowerCase(), cls: el.className };
      }
      return { scrollWidth: d.scrollWidth, inner: window.innerWidth, worst };
    });
    if (over) wide.push(`${w}px → ${over.scrollWidth} (${over.worst ? over.worst.tag + '.' + over.worst.cls : '?'})`);
  }
  check(wide.length === 0, `no horizontal overflow from ${WIDTHS[0]} to ${WIDTHS.at(-1)}px${wide.length ? ` — ${wide.join('; ')}` : ''}`);
}

/* 7. the rail: six links, an active state that tracks scroll, and a bottom
      strip below 900px */
async function assertRail(page) {
  const links = page.locator('.rail li');
  check(await links.count() === 6, 'the rail carries six section links');

  let tracks = true;
  for (let i = 1; i <= 6; i++) {
    await scrollToSection(page, `#s${i}`);
    const on = await page.evaluate(() =>
      [...document.querySelectorAll('.rail li')].findIndex((li) => li.classList.contains('on')));
    if (on !== i - 1) { tracks = false; console.log(`      #s${i} marked item ${on + 1}`); }
  }
  check(tracks, 'the active mark tracks the scrolled-to section');

  check(
    await page.locator('.rail li.on a').getAttribute('aria-current') === 'true',
    'the active link is aria-current'
  );

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await settle(page);

  const w = page.viewportSize().width;
  const box = await page.locator('.rail').boundingBox();
  if (w <= 900) {
    check(
      Math.abs(box.width - w) <= 1 && Math.abs(box.y + box.height - page.viewportSize().height) <= 1,
      'below 900px the rail is a strip pinned to the bottom'
    );
  } else {
    check(box.x === 0 && Math.abs(box.width - 230) <= 1, 'above 900px the rail is the fixed left column');
  }
}

/* 8. prefers-reduced-motion: transitions are off and scrolling does not smooth */
async function assertReducedMotion(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${origin}/`);

  const railLink = await page.locator('.rail li a').first().evaluate(
    (el) => getComputedStyle(el).transitionDuration);
  check(/^0s(,\s*0s)*$/.test(railLink), `rail transitions are off (${railLink})`);

  const scroll = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  check(scroll === 'auto', `scrolling snaps rather than smooths (${scroll})`);

  await context.close();
}

/* ---------------------------------------------------------------------- run */

fs.mkdirSync(SHOTS, { recursive: true });
const { origin, close } = await serve();

for (const engine of ENGINES) {
  const browser = await engine.type.launch();

  for (const vp of VIEWPORTS) {
    const label = `${engine.name} ${vp.w}×${vp.h}`;
    console.log(`\n\x1b[1m${label}\x1b[0m`);

    const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await context.newPage();

    /* 1. no console errors */
    const problems = [];
    page.on('console',       (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
    page.on('pageerror',     (e) => problems.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()}`));
    page.on('response',      (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`));

    await page.goto(`${origin}/`, { waitUntil: 'load' });
    await ready(page);

    await page.screenshot({ path: path.join(SHOTS, `${engine.name}-${vp.w}.png`) });
    await page.screenshot({ path: path.join(SHOTS, `${engine.name}-${vp.w}-full.png`), fullPage: true });

    if (vp.w === 1440) await assertFirstScreenful(page);
    await assertLanguageToggle(page, origin);
    await assertRail(page);

    check(problems.length === 0, `no console errors${problems.length ? ` — ${problems.join('; ')}` : ''}`);

    await context.close();
  }

  console.log(`\n\x1b[1m${engine.name} theme\x1b[0m`);
  await assertTheme(browser, origin);

  console.log(`\n\x1b[1m${engine.name} language detection\x1b[0m`);
  await assertLanguageDetection(browser, origin);

  console.log(`\n\x1b[1m${engine.name} facts grid + overflow\x1b[0m`);
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${origin}/`);
    await ready(page);
    await assertFactsGrid(page);
    await assertNoOverflow(page);
    await context.close();
  }

  console.log(`\n\x1b[1m${engine.name} reduced motion\x1b[0m`);
  await assertReducedMotion(browser, origin);

  await browser.close();
}

close();

console.log(
  failures === 0
    ? `\n\x1b[32mAll assertions passed.\x1b[0m Screenshots in shots/\n`
    : `\n\x1b[31m${failures} assertion(s) failed.\x1b[0m\n`
);
process.exit(failures === 0 ? 0 : 1);
