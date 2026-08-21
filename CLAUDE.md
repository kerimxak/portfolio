# kerim-portfolio

Kerim Ak's portfolio. One page, six sections, six projects, a fixed left rail.

## Stack

Vanilla HTML, CSS and JS in a single `index.html`. No framework, no bundler, no
runtime dependencies. Fonts are self-hosted in `fonts/`. `index.html` opens by
double-clicking — every path in it is relative, and nothing fetches at runtime.
Keep it that way.

Playwright lives in `tests/` with its own `package.json`, deliberately **not** at
the repo root, so no deploy pipeline mistakes this for a project with a build
step. There is no build step.

Deployment is Cloudflare Workers, configured outside this repo. There is no
`wrangler.toml` here and adding one may break the existing wiring. `index.html`
must stay at the repo root.

## Palette

Every colour is a `light-dark()` token on `:root`, so the two themes are one
list and there is no duplicated block to keep in sync.

| Token         | Light     | Dark      | Used for                                  |
| ------------- | --------- | --------- | ----------------------------------------- |
| `--ground`    | `#E8E7E3` | `#141413` | page ground, rail, facts cells            |
| `--panel`     | `#F3F2EF` | `#1C1C1A` | the "Also built" band                     |
| `--dark`      | `#121211` | `#0B0B0A` | the inverted contact block                |
| `--ink`       | `#101010` | `#F2F1EC` | headings, buttons, the hero cross pattern |
| `--body`      | `#43423C` | `#A8A79E` | body copy                                 |
| `--muted`     | `#86857D` | `#75746C` | labels, captions, secondary copy          |
| `--rule`      | `#CFCEC7` | `#2E2E2A` | borders, grid lines, slot borders         |
| `--rule-soft` | `#DEDDD6` | `#242421` | the lighter rules inside spec tables      |
| `--slot`      | `#DDDCD4` | `#232320` | the empty ground inside a figure slot     |
| `--accent`    | `#FF4A17` | same      | the period in the wordmark, the rail's active mark, the availability square, link underlines, the CV button |

The contact block keeps hard-coded whites and near-blacks on purpose: it is the
one section that is dark in both themes, so its text does not follow the tokens.

Accent is a period and a marker, not a highlight colour. Do not spread it.

## Dark mode

Dark mode is required and it is already built. Three rules:

1. **The default follows `prefers-color-scheme`**, with no JavaScript. `:root`
   sets `color-scheme: light dark` and every colour is `light-dark(light, dark)`,
   so the OS preference applies at first paint. There is no flash to fix.
2. **`data-theme` is only ever an explicit override.** `[data-theme="light"]` and
   `[data-theme="dark"]` set nothing but `color-scheme`; `light-dark()` does the
   rest. A choice that matches the OS removes the attribute rather than pinning
   it.
3. **The choice is persisted in the URL as `?theme=dark` / `?theme=light`, never
   in localStorage.** localStorage stays banned. A tiny inline script in `<head>`
   applies the parameter before first paint — it is the only script above the
   fold, and it must stay that small.

The theme buttons draw their sun and moon as inline SVG. Do not replace them with
`☀`/`☾` characters: neither glyph is in the latin or latin-ext subsets, so they
fall back to whatever the system has and render as something else entirely.

## Type

Archivo leads and JetBrains Mono is for numbers and labels only — the inverse of
the old design.

- **Archivo** (`--sans`) — body copy at 400, headings and section titles at 600,
  the rail wordmark at 700.
- **JetBrains Mono** (`--mono`) — labels, the rail's section links, spec-table
  keys, figure captions, buttons, and every number.

Scale, as written in the mockup:

| Element        | Size                        | Notes                          |
| -------------- | --------------------------- | ------------------------------ |
| `.hero h1`     | `clamp(40px, 6.6vw, 84px)`  | line-height `.94`, max-width `14ch` |
| `.shead h2`    | `clamp(28px, 4.4vw, 52px)`  | line-height `1.02`             |
| `.cta h2`      | `clamp(34px, 5.6vw, 72px)`  | line-height `.98`, max-width `16ch` |
| `.facts .v`    | `clamp(20px, 2.6vw, 32px)`  | mono, tabular figures          |
| body           | `15px`                      | line-height `1.62`             |
| `.hero .sub`   | `16px`                      | max-width `58ch`               |
| `.arow h3`     | `22px`                      |                                |
| labels, `.lbl` | `10px`                      | uppercase, tracked `.14–.18em` |

Both families are self-hosted as latin **and** latin-ext woff2. latin-ext is not
optional — it carries `ş ğ İ` for the Turkish copy.

Each family is one **variable** file per subset, declared `font-weight: 100 900`
(Archivo) and `400 800` (JetBrains Mono). Do not go back to a file per weight:
Google serves the same variable bytes for every weight in the range, so a file
per weight makes the browser download identical bytes two or three times.

The two critical faces are preloaded with `crossorigin`, which fonts require even
same-origin. One consequence: opening `index.html` straight off disk logs two
blocked-preload errors, because `file://` has a null origin and fails the CORS
check. The page still renders correctly from disk, fonts included — the
`@font-face` fetches succeed and only the redundant preload is refused. Dropping
`crossorigin` would silence it but would make the deployed site download each
font twice, so it stays. Served over http there are no console errors, which is
what the test asserts.

## Layout rules

- **The rail is the navigation.** A fixed left column, `--rail: 230px`, carrying
  the wordmark, the role, six section links with an active state that tracks
  scroll, the language and theme switches, the availability marker and the orange
  CV button. There is no top bar.
- `--pad: clamp(20px, 4vw, 64px)` is the single horizontal gutter. Use it; don't
  introduce a second one.
- One breakpoint, `max-width: 900px`. Below it the rail becomes a horizontal
  strip pinned to the bottom of the viewport, `main` loses its left margin and
  gains `padding-bottom` to clear the strip.
- **The switches stay reachable on that strip.** Only the section links scroll
  horizontally; the language and theme controls are pinned to the right of it,
  because they exist nowhere else on the page. The wordmark, availability marker
  and rail CV button are the only things the strip drops — the CV is still one
  tap away in the hero and in the contact block.
- Six sections, `min-height: 100vh` above 900px and auto below it.
- **Nothing may overflow horizontally at any width from 320px up.** The test
  sweeps thirteen widths from 320 to 1920 and names the widest offending element
  when it fails. Fix the element, never `overflow-x: hidden` on the body.
- Responsive from 320px.

## The facts grid

The four-cell block under the headline, and the one in the PharmacyMap section.

- **4 → 2 → 1 columns, never 3+1.** The counts are explicit at `1024px` and
  `560px`, not `auto-fit`. `auto-fit` with `minmax()` will happily leave one cell
  stranded on its own row at some width, which reads as a bug.
- **Cells are all one height**, including across rows in the 2-column state —
  that is what `grid-auto-rows: 1fr` is doing there.
- The 1px grid lines are the container's background showing through a 1px gap, so
  every cell needs an opaque background. Inside `.built` that background is
  `--panel`, not `--ground`.

## The no-hero decision

**There is no hero image, and there must not be one.** No banner, no photograph,
no scroll indicator, no loading screen. The registration-cross pattern behind the
hero is a masked CSS background, not an image, and it is the only decoration the
page gets.

What the page uses instead is the first screenful itself: at 1440×900 a visitor
sees the headline, the four-cell facts block and both call-to-action buttons
without scrolling. The Playwright script asserts exactly that. The hero's
vertical rhythm is tuned for it — `.hero` padding, the `h1` line-height of `.94`,
the `14ch` measure and the `58ch` sub measure are all load-bearing. If you add
vertical space above the buttons, they drop below the fold. **If that assertion
fails, the fix is to remove whatever was added, not to raise the threshold.**

## The cross pattern

`.hero > .xgrid` is a wrapper carrying the downward fade as a `mask-image`; its
`::before` fills with `var(--ink)` and is masked by a repeating 34px cross SVG.
The colour therefore comes from a token and needs no second copy for the dark
theme, and no `filter: invert()`.

It must stay `position: absolute`, which is why the selector is `.hero > .xgrid`
and not `.xgrid` — `.hero > *` sets `position: relative` on everything else in
the hero and would otherwise win on source order.

## Project images are never filtered

Project images render as photographs. No halftone, no duotone, no tint, no
blend mode, no CSS filter, no effect of any kind.

Halftone belongs to **benday**, which is one of the projects on this page. Screening
the images here would make the whole portfolio look like a benday output and
collapse the distinction the page exists to draw.

`.ph img` may set `object-fit` and nothing else visual.

## How the image slots work

Every figure is a flat `.ph` slot — `--slot` ground, a 1px rule — with an `<img>`
layered on top. There are four, all in the PharmacyMap case study; the "Also
built" rows carry no figures.

Plates are **transparent** outside the subject, at the slot's exact aspect ratio,
so the slot's own ground shows through and follows the theme. Pending slots hold
a fully transparent PNG at the target pixel size plus a "photo pending" label, so
the flat slot is all you see until a real photograph replaces the file.

Dropping a correctly named file into `img/` is the first step; the second is
deleting that slot's `<span data-i18n="slot.pending…">` from the markup, or the
label will show through the transparent ground. See `README.md` for the filename
and aspect ratio of every slot.

`object-fit: cover`, so supply images at the listed ratio or they crop. The two
real PharmacyMap plates are 9:16 phone captures centred on a transparent ground
to fill a 16:9 and a 4:3 frame without cropping — do the same for any other phone
capture rather than changing a slot's ratio. `images/` holds the original
captures those plates were built from.

Every image needs alt text describing what it shows, in both `alt` and the
`COPY` object.

## Language

- **Browser detection decides the first visit**: a `tr` or `tr-*` browser gets
  Turkish, everyone else gets English.
- **`?lang=tr` / `?lang=en` overrides it**, and a shared link therefore lands in
  the language it was shared in.
- **English is the default and its URL stays clean.** Clicking a language that
  matches what detection would have picked removes the parameter rather than
  writing it; only a choice that contradicts detection is recorded. For almost
  every visitor that means English with no query string at all.
- `html lang` follows, and so do the CV link and its file-size label.

## Bilingual copy

All strings live in one `COPY` object in `index.html`, keyed `en` and `tr`.
Elements carry `data-i18n` (text), `data-i18n-alt` (alt text) or
`data-i18n-label` (aria-label).

Turkish values are empty with a `TODO(tr)` marker. **Do not machine-translate
them** — Kerim writes them by hand. An empty value falls back to English at
render time, so the page stays readable while the translation is unfinished.

Rendering is `textContent`, never `innerHTML`. Where a paragraph needs a bold
lead-in, it is split into two keys (`pm.p3lead` / `pm.p3rest`) rather than
carrying markup in the copy.

`window.__i18n` is exposed so the Playwright script can seed one probe string and
watch it swap, which is how the toggle is tested without anyone translating the
real copy. `window.__theme` does the same job for the theme.

## Before calling any layout change done

```
cd tests && npm install && npm test
```

**This is not optional for layout work.** The script loads the page in chromium
and webkit at 375, 768 and 1440, writes screenshots to `shots/`, and asserts:

1. no console errors, failed requests or 4xx
2. the EN/TR toggle swaps copy and updates the URL, and `tr-*` browsers are
   detected while everyone else is not
3. the theme follows `prefers-color-scheme` by default, both toggle directions
   repaint the ground, `?theme=` round-trips, and nothing touches localStorage
4. at 1440×900 the headline, the facts block and both CTA buttons are visible
   without scrolling
5. the facts grid is 4 → 2 → 1 with equal-height cells
6. nothing overflows horizontally between 320 and 1920px
7. the rail carries six links, its active mark tracks the scrolled-to section,
   and it is a bottom strip below 900px
8. transitions and smooth scrolling are off under `prefers-reduced-motion`

WebKit is not a formality — most of the traffic is Safari and iPhone. Look at the
screenshots too; the assertions catch structure, not whether it looks right. The
screenshot helper waits on `document.fonts.ready` **and** every image's
`decode()`, because a shot taken before the plates decode shows empty slots and
looks exactly like a bug.

## Do not add

Analytics, a cookie banner, a contact form, scroll animations, a blog, a loading
screen, localStorage, or a hero image. Ask first if you think one is needed.

## Also in this repo

- `portfolio-mockup-d2.html` — the approved design spec. Where it and instinct
  disagree, the mockup wins. It links Google Fonts and holds no real images; the
  built page self-hosts both, which is the one place it deliberately differs.
- `privacy.html` — the PharmacyMap App Store privacy policy. Standalone, noindex,
  its own visual language. Not part of the redesign; do not delete it, an App
  Store listing points at it.
- `images/` — original app screenshots. Sources for the composited plates in
  `img/`; not referenced by the site.
- `og.png` — the 1200×630 social card, rendered from the live palette and
  headline. Re-render it if either changes.
