/* Loads the built page in chromium and webkit at 375, 768 and 1440,
   screenshots each into shots/, and asserts the four things that must not
   silently break. WebKit is not optional here — most of the traffic is Safari
   and iPhone.

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

const ENGINES = [
  { name: 'chromium', type: chromium },
  { name: 'webkit',   type: webkit   },
];

let failures = 0;
const ok   = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const fail = (m) => { failures++; console.log(`  \x1b[31m✗ ${m}\x1b[0m`); };
const check = (cond, m) => cond ? ok(m) : fail(m);

/* ------------------------------------------------------------------ helpers */

const openCount = (page) => page.locator('#idx .item.open').count();

async function expandedFlags(page) {
  return page.locator('#idx .row').evaluateAll(
    (rows) => rows.map((r) => r.getAttribute('aria-expanded'))
  );
}

/* ------------------------------------------------------------------- asserts */

/* 2. the EN/TR toggle swaps copy and updates the URL.
      The Turkish copy is deliberately unwritten, so we seed one probe string
      and watch that exact string appear. Nothing here translates anything. */
async function assertLanguageToggle(page, origin) {
  const h1 = page.locator('h1 [data-i18n="mast.h1"]');

  check(await page.getAttribute('html', 'lang') === 'en', 'starts in English');
  check(!page.url().includes('lang='),                    'no ?lang on the default');

  await page.evaluate(() => { window.__i18n.COPY.tr['mast.h1'] = 'TR_PROBE'; });
  await page.click('#lang-tr');

  check(await h1.textContent() === 'TR_PROBE',                'toggle swaps copy in place');
  check(page.url().includes('lang=tr'),                       'URL updates to ?lang=tr');
  check(await page.getAttribute('html', 'lang') === 'tr',     'html lang follows');
  check(await page.getAttribute('#lang-tr', 'aria-pressed') === 'true',  'TR reads as pressed');
  check(await page.getAttribute('#lang-en', 'aria-pressed') === 'false', 'EN reads as unpressed');
  check(
    await page.locator('[data-i18n="foot.h2"]').textContent() === 'Open to iOS roles.',
    'unwritten Turkish falls back to English'
  );
  check(
    (await page.getAttribute('#cv-link', 'href')).endsWith('tr.pdf'),
    'CV link follows the language'
  );

  await page.click('#lang-en');
  check(await h1.textContent() === 'Software and objects', 'toggling back restores English');
  check(!page.url().includes('lang='),                     'URL drops ?lang on the default');

  /* the URL is the source of truth, so a shared link must land in Turkish */
  await page.goto(`${origin}/?lang=tr`);
  check(await page.getAttribute('html', 'lang') === 'tr', '?lang=tr is honoured on load');
  await page.goto(`${origin}/`);
}

/* 3. each index row opens and closes, and only one is open at a time */
async function assertAccordion(page) {
  const rows = page.locator('#idx .row');
  const n = await rows.count();

  await rows.nth(0).click();                       // row 01 ships open
  check(await openCount(page) === 0, 'the open row closes');

  let allGood = true, soloGood = true, ariaGood = true;

  for (let i = 0; i < n; i++) {
    await rows.nth(i).click();
    if (await openCount(page) !== 1) soloGood = false;
    const flags = await expandedFlags(page);
    if (flags[i] !== 'true' || flags.filter((f) => f === 'true').length !== 1) ariaGood = false;

    await rows.nth(i).click();
    if (await openCount(page) !== 0) allGood = false;
  }

  check(allGood,  `all ${n} rows open and close`);
  check(soloGood, 'only one row is open at a time');
  check(ariaGood, 'aria-expanded tracks the open row');

  /* opening a second row must close the first, not stack */
  await rows.nth(1).click();
  await rows.nth(3).click();
  const flags = await expandedFlags(page);
  check(
    await openCount(page) === 1 && flags[3] === 'true' && flags[1] === 'false',
    'opening another row closes the previous one'
  );

  /* a closed panel's links must stay out of the tab order */
  check(
    await page.locator('#panel-1').evaluate((el) => el.hasAttribute('inert')),
    'closed panels are inert'
  );

  await rows.nth(3).click();
  await rows.nth(0).click();                       // back to the shipped state
}

/* 4. at 1440x900 the first project's first image is in the viewport before
      any scroll. This is the whole reason there is no hero image. */
async function assertFirstImageAboveFold(page) {
  check(await page.evaluate(() => window.scrollY) === 0, 'page has not scrolled');

  const box = await page.locator('#panel-1 .ph.r43 img').boundingBox();
  const vh  = page.viewportSize().height;

  check(
    box !== null && box.y < vh && box.y + box.height > 0,
    `first project image intersects the fold (top ${Math.round(box?.y)}px, viewport ${vh}px)`
  );
  check(
    await page.locator('header').isVisible() &&
    await page.locator('h1').isVisible(),
    'header and headline are above the fold too'
  );
}

/* prefers-reduced-motion: the accordion snaps rather than animates */
async function assertReducedMotion(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${origin}/`);

  const duration = await page.locator('#panel-1').evaluate(
    (el) => getComputedStyle(el).transitionDuration
  );
  check(/^0s(,\s*0s)*$/.test(duration), `accordion snaps under reduced motion (${duration})`);

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
    await page.evaluate(() => document.fonts.ready);

    await page.screenshot({ path: path.join(SHOTS, `${engine.name}-${vp.w}.png`) });
    await page.screenshot({ path: path.join(SHOTS, `${engine.name}-${vp.w}-full.png`), fullPage: true });

    if (vp.w === 1440) await assertFirstImageAboveFold(page);
    await assertLanguageToggle(page, origin);
    await assertAccordion(page);

    check(problems.length === 0, `no console errors${problems.length ? ` — ${problems.join('; ')}` : ''}`);

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
