# kerimxak.xyz

One-page portfolio. Six sections, six projects, a fixed left rail. Vanilla
HTML/CSS/JS, no framework, no bundler, no runtime dependencies. `index.html`
opens by double-clicking.

```
index.html               the site
fonts/                   Archivo + JetBrains Mono, self-hosted variable woff2
img/                     the PharmacyMap figures — see below
images/                  original app screenshots the figures were built from
cv/                      kerim-cv-en.pdf, kerim-cv-tr.pdf
favicon.svg              the mark
apple-touch-icon.png     180×180
og.png                   1200×630 social card
privacy.html             PharmacyMap App Store privacy policy (standalone)
portfolio-mockup-d2.html the approved design spec
tests/                   Playwright checks
shots/                   screenshots the checks write (gitignored)
```

## The page

| # | Section     | What is in it                                               |
| - | ----------- | ----------------------------------------------------------- |
| 1 | Intro       | headline, two-paragraph pitch, four-cell facts block, two CTAs |
| 2 | PharmacyMap | the flagship case study, four figures, a facts block         |
| 3 | Also built  | five more projects, each with a spec table                   |
| 4 | Stack       | what was used, listed against the thing it shipped in        |
| 5 | Background  | degree, club presidency, Korin Labs, localisation, languages |
| 6 | Contact     | the one inverted block on the page                           |

Six projects in total: PharmacyMap, benday, Korin Labs, Elevator Robot,
self-hosted VPN infrastructure, ESP32 Handheld Console.

## Images to shoot

Four slots, all in the PharmacyMap case study. Two are real captures; two are
transparent placeholders — the flat "photo pending" slot shows through until a
real file replaces them.

| File                | Ratio | Suggested   | What it shows                       | Status   |
| ------------------- | ----- | ----------- | ----------------------------------- | -------- |
| `pharmacymap-1.png` | 16:9  | 1920 × 1080 | Duty map with the bottom sheet up   | **done** |
| `pharmacymap-2.png` | 4:3   | 1600 × 1200 | Pharmacy detail sheet with a route  | **done** |
| `pharmacymap-3.png` | 4:3   | 1600 × 1200 | Province fallback list              | needed   |
| `pharmacymap-4.png` | 4:3   | 1600 × 1200 | Offline / cached-data state         | needed   |

**Dropping a correctly named file into `img/` is the first step.** The second is
deleting that slot's `<span data-i18n="slot.pending…">` from `index.html` — plates
are transparent outside the subject, so the label would otherwise show through.

Images are cropped with `object-fit: cover`, so supply them at the listed ratio or
the edges get trimmed. Suggested pixel size is 2× the largest rendered size.

Slots 1 and 2 are 9:16 phone captures from `images/`, centred on a **transparent**
ground so they fill a 16:9 and a 4:3 frame without cropping. The transparency is
deliberate: the slot's own `--slot` colour shows through, so one file is correct
in both the light and dark themes. Match that treatment for slots 3 and 4 rather
than cropping the phone — see `CLAUDE.md → How the image slots work`.

**Alt text.** Each slot already has alt text describing the intended photograph.
If what you shoot differs, update both the `alt` attribute on the `<img>` and the
matching `pm.altN` key in the `COPY` object.

## Language

A `tr` or `tr-*` browser gets Turkish on the first visit; everyone else gets
English. `?lang=tr` and `?lang=en` override that, so a link is shareable. English
keeps a clean URL — the parameter is only written when a choice contradicts what
detection would have picked.

Every string lives in the `COPY` object in `index.html`, keyed `en` and `tr`. The
Turkish values are empty and marked `TODO(tr)` — they are yours to write, nothing
is machine-translated. An empty value falls back to English, so the page stays
readable while you work through them. Fill in `COPY.tr` and the TR toggle starts
serving it.

## Theme

Light and dark. The first visit follows the operating system; the sun/moon switch
in the rail overrides it and the choice is remembered in the URL as
`?theme=dark` or `?theme=light`. Nothing is written to localStorage, and a choice
that agrees with the OS leaves the URL clean.

## Still to wire up

Placeholder `href="#"` links, left as the mockup had them:

- PharmacyMap — the 40-second demo recording
- benday — Source
- Korin Labs — Instagram
- Elevator Robot — Write-up, Source
- Self-hosted VPN — How it works
- ESP32 Console — Source

The CV button's size label (`PDF · 21 KB`) is hard-coded per language in the `CV`
object in `index.html`. Update it when you replace either PDF.

`og:image` and `og:url` assume the site is served from `https://kerimxak.xyz/`.
Correct them in `index.html` if the domain differs — Open Graph needs absolute
URLs.

## Tests

```
cd tests
npm install     # also fetches the chromium and webkit binaries
npm test
```

Loads the page in chromium and webkit at 375, 768 and 1440, writes screenshots to
`shots/`, and asserts: no console errors; a working language toggle plus browser
detection; a theme that follows `prefers-color-scheme` and round-trips through
`?theme=` without touching localStorage; the headline, facts block and both CTA
buttons visible at 1440×900 without scrolling; a facts grid that goes 4 → 2 → 1
with equal-height cells; no horizontal overflow from 320 to 1920px; a rail whose
active mark tracks scroll and that becomes a bottom strip below 900px; and a
reduced-motion snap.

Run it before calling any layout change done.

## Deploy

Cloudflare Workers, configured outside this repo. Nothing here to build —
`index.html` at the root is the site.
