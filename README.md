# VICE CITY STUDIO

[![Make.fun GTA 6 Cover Art Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/MuhammadFadlyFirdaus/vice-city-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/MuhammadFadlyFirdaus/vice-city-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline, zero-build, strict-CSP browser studio built for the [Make.fun Make GTA 6 Cover Art (`gta6-cover-art-01`)](https://make.fun/bounty/gta6-cover-art-01) competition. Turn any local photo or set of photos into collector-grade GTA-style multi-panel Vice City cover art and export lossless PNGs in all three standard post sizes.

## Key Features

- **100% Offline & Private:** Plain HTML, CSS, and Vanilla ES Modules on HTML5 2D Canvas. Zero network requests, zero uploads, strict CSP compliant.
- **4 Multi-Panel Poster Layouts (Adaptive 16:9, 4:5, 1:1):**
  - **Crime Epic 6-Panel** (flagship 6-panel key-art layout with dominant center hero and 5 symmetrical slanted cast/action panels)
  - **Classic Vice City** (5-panel asymmetric poster)
  - **Sunset Boulevard** (4-panel dynamic diagonal slash)
  - **Neon Night** (4-panel high-contrast vertical split)
  - Switching layouts preserves your uploaded photos and custom text.
- **Collector's Box-Art / Movie Poster Frame (Toggleable & Editable):**
  - **Top Theatrical Critic Strip** with 5 metallic gold stars, editable critic quote, and editable edition badge (`VOL. 1`).
  - **Bottom Cinema Billing Block** with glowing neon `COMING SOON` stamp, editable theatrical billing credits, and a procedural collector barcode.
  - **Crisp Cream Hairline Inner Borders** inside thick jet-black comic ink gutters between every panel.
- **Any Photo, Fast Framing + 6 Original Bundled Samples:** Upload JPG, PNG (including transparency), or WebP via click or drag-and-drop (4K photos safely downscaled locally). Includes 6 distinct original retro-Miami sample photos so every panel on 5–6 panel layouts showcases a unique subject with zero repetition. **Smart Upper-Third Face-Safe Auto-Fill** turns even a single portrait into a complete multi-panel cover without clipping heads.
- **Per-Panel Crop & Direct Canvas Interaction:** Click any panel to select, drag directly on the canvas to pan, scroll to zoom, drop photos directly onto a panel, flip horizontally, replace/remove, or reset crop.
- **Calibrated Vice City Visual Engine:** 5 skin-safe split-tone Vice color grades (*Vice Sunset*, *Miami Heat*, *Neon Midnight*, *Golden Hour*, *Ocean Drive*) with key-art contrast S-curve, skin-preserving **Painterly / Poster Ink** illustration pass (0–100%) with LRU bitmap caching, Sunset Sky Wash, Dual Neon Rim Glow, procedural palm silhouettes, optional retro horizon disc, deterministic PRNG film grain, and vignette.
- **Outrun Striped Chrome Typography & Embossed Gold-Foil Medallion:** Flagship **Outrun Striped Chrome** main title spanning 65–75% canvas width with 80s horizontal scan-stripes, cream inner stroke, thick black ink outline, 3D shadow, and dual 4-point lens-flare glints (plus *Retro Chrome*, *Sunset Heat*, *Electric Pink*, *Bold White*), glowing neon script subtitle, slanted **Panel Cast Callout Tags** anchored at bottom corners, and an **Embossed Gold-Foil Starburst Medallion** (`ORIGINAL COVER ART • ★★★`, zero Rockstar IP). Powered by 4 locally bundled SIL OFL fonts (`Anton`, `Bebas Neue`, `Pacifico`, `Oswald`).
- **Lossless 3-Size PNG Export & 15-Step Undo/Redo:** Instant lossless PNG download at exact `1920×1080` (16:9), `1080×1350` (4:5), and `1080×1080` (1:1) resolutions, plus keyboard shortcuts (`Ctrl+Z` / `Ctrl+Y`).

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
