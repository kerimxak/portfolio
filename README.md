# kerimxak.xyz

One-page portfolio. Vanilla HTML/CSS/JS, no framework, no bundler, no runtime
dependencies. `index.html` opens by double-clicking.

```
index.html            the site
fonts/                Archivo + JetBrains Mono, self-hosted woff2
img/                  project figures — see below
cv/                   kerim-cv-en.pdf, kerim-cv-tr.pdf
favicon.svg           the mark
apple-touch-icon.png  180×180
og.png                1200×630 social card
privacy.html          PharmacyMap App Store privacy policy (standalone)
portfolio-mockup.html the approved design spec
tests/                Playwright checks
shots/                screenshots the checks write (gitignored)
```

## Images to shoot

Fifteen slots, three per project. Thirteen are transparent placeholders — the
flat "photo pending" slot shows through until a real file replaces them.

**Drop a file into `img/` with the matching name and it appears. That is the
only step.** Nothing else to edit, except the alt text (below).

Images are cropped with `object-fit: cover`, so shoot at the listed ratio or the
edges get trimmed. Suggested pixel size is 2× the largest rendered size.

### 01 · PharmacyMap

| File                 | Ratio | Suggested   | What it shows                     | Status |
| -------------------- | ----- | ----------- | --------------------------------- | ------ |
| `pharmacymap-1.png`  | 4:3   | 1600 × 1200 | Duty map, bottom sheet at medium detent | **done** |
| `pharmacymap-2.png`  | 3:4   | 1200 × 1600 | Province fallback                 | needed |
| `pharmacymap-3.png`  | 3:4   | 1200 × 1600 | Detail sheet                      | **done** |

Slots 1 and 3 use real captures, composited onto the slot's own ground colour so
a 9:16 phone screenshot fills a 4:3 and a 3:4 plate without cropping. Match that
treatment for slot 2 rather than cropping the phone — see
`CLAUDE.md → How the image slots work`.

### 02 · benday

| File            | Ratio | Suggested   | What it shows                        |
| --------------- | ----- | ----------- | ------------------------------------ |
| `benday-1.png`  | 4:3   | 1600 × 1200 | Spiral screen, 150 × 150 mm plate    |
| `benday-2.png`  | 1:1   | 1400 × 1400 | Merged dot screen, close up          |
| `benday-3.png`  | 1:1   | 1400 × 1400 | Printed result, the physical panel   |

### 03 · Korin Labs

| File                | Ratio | Suggested   | What it shows                          |
| ------------------- | ----- | ----------- | -------------------------------------- |
| `korin-labs-1.png`  | 4:3   | 1600 × 1200 | Tatlı collection — Éclair, Marshmallow |
| `korin-labs-2.png`  | 1:1   | 1400 × 1400 | Twist-lock collar, close up            |
| `korin-labs-3.png`  | 1:1   | 1400 × 1400 | Cinnamon Swirl, lit                    |

### 04 · Elevator Robot

| File                     | Ratio | Suggested   | What it shows                   |
| ------------------------ | ----- | ----------- | ------------------------------- |
| `elevator-robot-1.png`   | 4:3   | 1600 × 1200 | Chassis and camera mast         |
| `elevator-robot-2.png`   | 1:1   | 1400 × 1400 | Button detection, camera view   |
| `elevator-robot-3.png`   | 1:1   | 1400 × 1400 | Drive electronics               |

### 05 · ESP32 Console

| File                    | Ratio | Suggested   | What it shows                  |
| ----------------------- | ----- | ----------- | ------------------------------ |
| `esp32-console-1.png`   | 4:3   | 1600 × 1200 | Assembled, printed shell       |
| `esp32-console-2.png`   | 1:1   | 1400 × 1400 | Internals                      |
| `esp32-console-3.png`   | 1:1   | 1400 × 1400 | Snake, Dodge, Breakout on screen |

**Alt text.** Each slot already has alt text describing the intended photograph.
If what you shoot differs, update both the `alt` attribute on the `<img>` and the
matching `pN.altN` key in the `COPY` object.

## Turkish copy

Every string lives in the `COPY` object in `index.html`, keyed `en` and `tr`. The
Turkish values are empty and marked `TODO(tr)` — they are yours to write, nothing
is machine-translated. An empty value falls back to English, so the page stays
readable while you work through them.

Fill in `COPY.tr` and the TR toggle starts serving it. `?lang=tr` is shareable.

## Still to wire up

Placeholder `href="#"` links, left as the mockup had them:

- 01 PharmacyMap — App Store
- 02 benday — Source
- 03 Korin Labs — Instagram
- 04 Elevator Robot — Write-up, Source
- 05 ESP32 Console — Source

`og:image` and `og:url` assume the site is served from `https://kerimxak.xyz/`.
Correct them in `index.html` if the domain differs — Open Graph needs absolute URLs.

## Tests

```
cd tests
npm install     # also fetches the chromium and webkit binaries
npm test
```

Loads the page in chromium and webkit at 375, 768 and 1440, writes screenshots to
`shots/`, and asserts no console errors, a working language toggle, an accordion
that opens one row at a time, the first project image above the 1440×900 fold, and
a reduced-motion snap.

Run it before calling any layout change done.

## Deploy

Cloudflare Workers, configured outside this repo. Nothing here to build —
`index.html` at the root is the site.
