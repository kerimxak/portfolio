# kerim-portfolio

Kerim Ak's portfolio. One page, five projects, an accordion index.

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

| Token         | Value     | Used for                                  |
| ------------- | --------- | ----------------------------------------- |
| `--paper`     | `#EDECE7` | page ground                               |
| `--ink`       | `#101010` | text, frame, hard rules                   |
| `--rule`      | `#C6C4BD` | borders between items, slot borders       |
| `--rule-soft` | `#DBD9D3` | the lighter rules inside spec tables       |
| `--muted`     | `#78766F` | labels, captions, secondary copy          |
| `--accent`    | `#FF3B00` | the period in the wordmark, open-row marks, links |

Two greys that are not tokens, both intentional: `#E6E4DE` is the row and
contact-cell hover, `#E4E2DC` is the empty figure slot. The slot colour is also
baked into the composited PharmacyMap plates so a real photograph and an empty
slot sit on exactly the same ground.

Accent is a period and a marker, not a highlight colour. Do not spread it.

## Type

- **Archivo** (`--disp`) 600 for display, 700 for the wordmark. Headline, project
  names, footer heading.
- **JetBrains Mono** (`--mono`) 400 for everything else — body, labels, captions,
  spec tables.

Scale, all as written in the mockup:

| Element        | Size                        | Notes                    |
| -------------- | --------------------------- | ------------------------ |
| `h1`           | `clamp(38px, 7vw, 88px)`    | line-height `.92`, max-width `12ch` |
| `footer h2`    | `clamp(26px, 4.6vw, 54px)`  | line-height `1`          |
| `.row .nm`     | `clamp(17px, 2.6vw, 26px)`  | project name             |
| body           | `12px`                      | line-height `1.6`        |
| `dd`           | `11px`                      |                          |
| labels, `.lbl` | `10px`                      | uppercase, tracked `.14–.16em` |
| slot label     | `9px`                       |                          |

Both families are self-hosted as latin **and** latin-ext woff2. latin-ext is not
optional — it carries `ş ğ İ` for the Turkish copy.

## Layout rules

- Everything sits inside `.frame`, a 1px ink border with 10px of paper around it.
- `--pad: clamp(16px, 3.2vw, 40px)` is the single horizontal gutter. Use it;
  don't introduce a second one.
- One breakpoint, `max-width: 820px`. Above it the masthead and project bodies
  are two columns; below, one. The year column drops on small screens, the type
  moves under the name.
- The accordion animates `grid-template-rows: 0fr → 1fr`, not height.
- Responsive from 320px. At 320 the header fits with nothing to spare — anything
  added to `nav` will overflow it.

## The no-hero decision

**There is no hero image, and there must not be one.** No banner, no background
pattern, no scroll indicator, no loading screen.

The design earns its first impression by getting the first project's screenshots
into the opening screenful instead. At 1440×900 a visitor sees the header, the
headline, and the PharmacyMap row already open with its first plate beginning at
roughly 407px — about 490px of image above the fold.

The masthead's vertical rhythm is tuned for exactly this. `.mast` padding, the
`h1` line-height of `.92`, and the `12ch` measure are load-bearing. If you add
vertical space anywhere above the index, the first plate drops below 900px and
the page loses the only thing it uses in place of a hero. The Playwright script
asserts this; if that assertion fails, the fix is to remove whatever was added,
not to raise the threshold.

## Project images are never filtered

Project images render as photographs. No halftone, no duotone, no tint, no
blend mode, no CSS filter, no effect of any kind.

Halftone belongs to **benday**, which is one of the projects on this page. Screening
the images here would make the whole portfolio look like a benday output and
collapse the distinction the page exists to draw. The mockup's earlier draft had
a halftone placeholder treatment; it was removed on purpose.

`.ph img` may set `object-fit` and nothing else visual.

## How the image slots work

Each figure is a flat `.ph` slot — background, 1px rule, and a "photo pending"
label — with an `<img>` layered on top. Placeholder files are fully transparent
PNGs at the exact target pixel size, so the flat slot shows through until a real
photograph replaces the file.

Dropping a correctly named file into `img/` is the only step needed. See
`README.md` for the filename and aspect ratio of every slot.

`object-fit: cover`, so supply images at the listed ratio or they crop. The two
real PharmacyMap plates are 9:16 phone captures composited onto a slot-coloured
ground to fill a 4:3 and a 3:4 frame without cropping — do the same for any other
phone capture rather than changing a slot's ratio.

Every image needs alt text describing what it shows, in both `alt` and the
`COPY` object.

## Bilingual copy

All strings live in one `COPY` object in `index.html`, keyed `en` and `tr`.
Elements carry `data-i18n` (text) or `data-i18n-alt` (alt text).

Turkish values are empty with a `TODO(tr)` marker. **Do not machine-translate
them** — Kerim writes them by hand. An empty value falls back to English at
render time, so the page stays readable while the translation is unfinished.

Language is persisted in the URL as `?lang=tr`. English is the default and stays
clean, with no query string. `html lang` follows, and so does the CV link.

`window.__i18n` is exposed so the Playwright script can seed one probe string and
watch it swap, which is how the toggle is tested without anyone translating the
real copy.

## Before calling any layout change done

```
cd tests && npm install && npm test
```

**This is not optional for layout work.** The script loads the page in chromium
and webkit at 375, 768 and 1440, writes screenshots to `shots/`, and asserts:

1. no console errors, failed requests or 4xx
2. the EN/TR toggle swaps copy and updates the URL
3. every index row opens and closes, and only one is open at a time
4. at 1440×900 the first project's first image intersects the viewport before any
   scroll
5. the accordion snaps under `prefers-reduced-motion`

WebKit is not a formality — most of the traffic is Safari and iPhone. Look at the
screenshots too; the assertions catch structure, not whether it looks right.

## Do not add

Analytics, a cookie banner, a contact form, scroll animations, a blog, a loading
screen, dark mode, or a hero image. Ask first if you think one is needed.

## Also in this repo

- `portfolio-mockup.html` — the approved design spec. Where it and instinct
  disagree, the mockup wins.
- `privacy.html` — the PharmacyMap App Store privacy policy. Standalone, noindex,
  its own visual language. Not part of the redesign; do not delete it, an App
  Store listing points at it.
- `images/` — original app screenshots. Sources for the composited plates in
  `img/`; not referenced by the site.
