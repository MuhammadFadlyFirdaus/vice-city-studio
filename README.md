# VICE CITY STUDIO

[![Make.fun GTA 6 Cover Art Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/MuhammadFadlyFirdaus/vice-city-studio/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/MuhammadFadlyFirdaus/vice-city-studio/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An offline, zero-build, strict-CSP browser studio built for the [Make.fun Make GTA 6 Cover Art (`gta6-cover-art-01`)](https://make.fun/c/gta6-cover-art-01) competition. Turn any local photo or set of photos into striking GTA-style multi-panel Vice City cover art and export lossless PNGs in all three standard post sizes.

## Key Features

- **100% Offline & Private:** Plain HTML, CSS, and Vanilla ES Modules on HTML5 2D Canvas. Zero network requests, zero uploads, strict CSP compliant.
- **3 Multi-Panel Poster Layouts:**
  - **Classic Vice City** (5-panel asymmetric poster)
  - **Sunset Boulevard** (4-panel dynamic diagonal slash)
  - **Neon Night** (4-panel high-contrast vertical split)
  - Switching layouts preserves your uploaded photos and custom text.
- **Any Photo, Fast Framing:** Upload JPG, PNG (including transparency), or WebP via click or drag-and-drop (4K photos safely downscaled locally). **Smart Upper-Third Face-Safe Auto-Fill** turns even a single portrait into a complete multi-panel cover without clipping heads.
- **Per-Panel Crop & Direct Canvas Interaction:** Click any panel to select, drag directly on the canvas to pan, scroll to zoom, drop photos directly onto a panel, flip horizontally, replace/remove, or reset crop.
- **Vice City Visual Engine:** 5 skin-safe split-tone Vice color grades (*Vice Sunset*, *Miami Heat*, *Neon Midnight*, *Golden Hour*, *Ocean Drive*), **Painterly / Poster Ink** illustration pass (0–100%) with LRU bitmap caching, Sunset Sky Wash, Dual Neon Rim Glow, procedural palm silhouettes, optional retro horizon disc, deterministic PRNG film grain, and vignette.
- **Layered Retro-Chrome & Neon Typography:** Main Title (*Retro Chrome*, *Sunset Heat*, *Electric Pink*, *Bold White*) with thick black ink outline and 3D drop shadow, glowing neon script subtitle, bottom tagline bar, optional panel role tags, and an original edition seal (zero Rockstar IP). Powered by 4 locally bundled SIL OFL fonts (`Anton`, `Bebas Neue`, `Pacifico`, `Oswald`).
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
