# VICE CITY STUDIO

[![Make.fun GTA 6 Cover Art Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/MuhammadFadlyFirdaus/vice-city-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/MuhammadFadlyFirdaus/vice-city-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline, zero-build, strict-CSP browser studio built for the [Make.fun Make GTA 6 Cover Art (`gta6-cover-art-01`)](https://make.fun/bounty/gta6-cover-art-01) competition. Turn any local photo or set of photos into collector-grade GTA-style multi-panel cover art and export lossless PNGs in all three standard post sizes.

## Key Features

- **100% Offline & Private:** Plain HTML, CSS, and Vanilla ES Modules on HTML5 2D Canvas. Zero network requests, zero uploads, strict CSP compliant (`Photos stay on your device`).
- **Zero-Tab 3-Step Pro Studio (`1280×760` Ready):** All primary workflows are visible at a glance — **① ADD PHOTOS** (drop/paste anywhere, 8-Cast Demo, Face-Aware Auto-Fill, numbered 4×2 photo grid) + **LAYOUT** + **COLOUR GRADE** on the left, live interactive canvas + inline panel toolbar + **Live 3-Size Preview Strip** in the center, and **② CAPTION & FRAME** + pinned **③ EXPORT PNG** (`1:1`, `4:5`, `16:9`, and **EXPORT ALL 3 PNGS**) on the right.
- **6 Adaptive Multi-Panel Poster Layouts (16:9, 4:5, 1:1):**
  - **Cast Mosaic** (flagship 7-panel full-height center hero key-art layout)
  - **Skyline Split** (4-panel slanted cast strips + full-bleed synthwave Miami Art-Deco skyline & palm horizon stage)
  - **Six Grid** (6-panel top/bottom cast grid + dedicated luminous center horizon title band)
  - **Classic 5** (5-panel asymmetric poster)
  - **Diagonal 4** (4-panel diagonal slash poster)
  - **Crime Epic 6** (6-panel classic hero + wide action strip)
  - Switching layouts preserves your uploaded photos and custom text.
- **100% Offline Face-Aware Crop Engine & 8-Cast Original Demo:** Upload JPG, PNG (including transparency), or WebP via click, drag-and-drop, or clipboard paste (`4K` photos safely downscaled locally). Includes 8 original fictional character portraits. On-device `96×96` YCbCr skin-hue + Sobel edge saliency automatically centers faces in the upper-third safe zone across both 1-photo (7 distinct variations) and multi-photo auto-fill.
- **Direct Canvas Pan, Zoom, Drop & Drag-Badge Panel Swap:** Click any panel to select, drag to pan, wheel to zoom, drop photos onto any panel, or drag a panel's numbered badge (`1..N`) onto another panel to swap them cleanly.
- **6 Cinematic Color Grades + Skin-Safe Poster Ink:** *Sunset Gold*, *Neon Midnight*, *Tropic Teal*, *Miami Heat*, *Ultraviolet*, and *Retro Print* with live miniature graded canvas swatches, cool-highlight warmth unification, key-art contrast S-curve, skin-safe **Poster Ink** illustration pass (45% default), Sunset Wash, Dual Neon Rim, procedural palm silhouettes, striped sun disc, deterministic PRNG film grain, and vignette.
- **Zero-Collision Outrun Striped Chrome Typography & Embossed Foil Medallion:** Grade-adaptive **Outrun Striped Chrome** title (plus *Retro Chrome*, *Sunset Heat*, *Electric Pink*, *Bold White*) with 4-point lens-flare glints, `-4°` neon script subtitle, notched swallowtail tagline ribbon, zero-collision **Cast Name Tags**, 28-point embossed metallic foil starburst medallion, top theatrical critic strip, and authentic mixed-size Hollywood billing block with procedural barcode. Powered by 4 locally bundled SIL OFL fonts (`Anton`, `Bebas Neue`, `Pacifico`, `Oswald`).
- **Batch Lossless 3-Size PNG Export & 15-Step Undo/Redo:** Export exact `1080×1080` (`1:1`), `1080×1350` (`4:5`), and `1920×1080` (`16:9`) lossless PNGs individually or all three at once via **EXPORT ALL 3 PNGS**, plus `Ctrl+Z` / `Ctrl+Y` Undo/Redo.

## Run Locally

```bash
node serve.ts
# Open http://localhost:8080 in desktop Chrome/Brave
```

## Build Dossier Locally

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](./LICENSE). Bundled fonts under `app/assets/fonts/` are licensed under the SIL Open Font License 1.1 (`app/assets/fonts/LICENSES.txt`).
