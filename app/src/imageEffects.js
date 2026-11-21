// Vice City Studio visual processing engine (V3 Rank #1):
// 6 cinematic color grades with cool-highlight warmth unification (so daylight shots
// like pier.jpg harmonize effortlessly with golden-hour sunset portraits), crisp S-curve
// micro-contrast, calibrated skin-safe Painterly / Poster Ink (45% default),
// LRU bitmap cache, and live miniature grade preview thumbnail generator.

export const PREVIEW_PROCESS_MAX_DIM = 900;
const LRU_CACHE_LIMIT = 28;

export const GRADE_PRESETS = Object.freeze({
  'sunset-gold': Object.freeze({
    id: 'sunset-gold',
    label: 'Sunset Gold',
    family: 'warm',
    shadow: [24, 10, 44],
    mid: [255, 92, 128],
    high: [255, 224, 146],
    shadowAmt: 0.30,
    midAmt: 0.16,
    highAmt: 0.27,
    warmUnify: 0.62, // Harmonizes cool daylight skies/water (e.g. pier.jpg) into warm sunset cohesion
  }),
  'neon-midnight': Object.freeze({
    id: 'neon-midnight',
    label: 'Neon Midnight',
    family: 'cool',
    shadow: [10, 12, 48],
    mid: [255, 44, 166],
    high: [96, 246, 255],
    shadowAmt: 0.38,
    midAmt: 0.20,
    highAmt: 0.30,
    warmUnify: 0,
  }),
  'tropic-teal': Object.freeze({
    id: 'tropic-teal',
    label: 'Tropic Teal',
    family: 'tropic',
    shadow: [8, 30, 48],
    mid: [28, 222, 212],
    high: [255, 226, 152],
    shadowAmt: 0.33,
    midAmt: 0.20,
    highAmt: 0.26,
    warmUnify: 0.14,
  }),
  'miami-heat': Object.freeze({
    id: 'miami-heat',
    label: 'Miami Heat',
    family: 'warm',
    shadow: [38, 10, 26],
    mid: [255, 98, 46],
    high: [255, 236, 152],
    shadowAmt: 0.29,
    midAmt: 0.22,
    highAmt: 0.28,
    warmUnify: 0.46,
  }),
  ultraviolet: Object.freeze({
    id: 'ultraviolet',
    label: 'Ultraviolet',
    family: 'cool',
    shadow: [18, 6, 48],
    mid: [184, 54, 255],
    high: [255, 138, 222],
    shadowAmt: 0.36,
    midAmt: 0.22,
    highAmt: 0.26,
    warmUnify: 0.08,
  }),
  'retro-print': Object.freeze({
    id: 'retro-print',
    label: 'Retro Print',
    family: 'warm',
    shadow: [26, 16, 22],
    mid: [232, 136, 84],
    high: [255, 244, 210],
    shadowAmt: 0.28,
    midAmt: 0.15,
    highAmt: 0.28,
    warmUnify: 0.30,
  }),
});

export const GRADE_PRESET_LIST = Object.freeze([
  GRADE_PRESETS['sunset-gold'],
  GRADE_PRESETS['neon-midnight'],
  GRADE_PRESETS['tropic-teal'],
  GRADE_PRESETS['miami-heat'],
  GRADE_PRESETS.ultraviolet,
  GRADE_PRESETS['retro-print'],
]);

const LEGACY_GRADE_ALIASES = Object.freeze({
  'vice-sunset': 'sunset-gold',
  'golden-hour': 'miami-heat',
  'ocean-drive': 'tropic-teal',
});

export function resolveGradePreset(gradeId) {
  const mapped = LEGACY_GRADE_ALIASES[gradeId] || gradeId;
  return GRADE_PRESETS[mapped] || GRADE_PRESETS['sunset-gold'];
}

const lruCache = new Map();
const thumbCache = new Map();

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function lruGet(key) {
  if (!lruCache.has(key)) return null;
  const val = lruCache.get(key);
  lruCache.delete(key);
  lruCache.set(key, val);
  return val;
}

function lruSet(key, val) {
  if (lruCache.has(key)) lruCache.delete(key);
  lruCache.set(key, val);
  while (lruCache.size > LRU_CACHE_LIMIT) {
    const oldest = lruCache.keys().next().value;
    lruCache.delete(oldest);
  }
}

export function clearEffectsCache() {
  lruCache.clear();
  thumbCache.clear();
}

function makeCacheKey(photoId, effects, isExport) {
  const preset = resolveGradePreset(effects.gradePreset);
  return [
    photoId,
    preset.id,
    Math.round(effects.painterly ?? 0),
    Math.round(effects.brightness ?? 100),
    Math.round(effects.contrast ?? 100),
    Math.round(effects.saturation ?? 100),
    isExport ? 'E' : 'P',
  ].join('|');
}

function computeSkinWeight(r, g, b, lum) {
  // Smooth skin-tone detector (warm peach/tan/deep skin hues) so faces stay natural & crisp
  if (lum < 36 || lum > 240) return 0;
  if (r <= g * 0.98 || g <= b * 0.84) return 0;
  const rg = r - g;
  const gb = g - b;
  if (rg < 9 || rg > 106 || gb < 3) return 0;
  const warmth = Math.min(1, rg / 30) * Math.min(1, gb / 19);
  return Math.max(0, Math.min(1, warmth * 0.85));
}

function applyColorGradeAndTone(data, effects) {
  const preset = resolveGradePreset(effects.gradePreset);
  const brightMul = (effects.brightness ?? 102) / 100;
  const contrastMul = (effects.contrast ?? 118) / 100;
  const satMul = (effects.saturation ?? 118) / 100;

  const [sr, sg, sb] = preset.shadow;
  const [mr, mg, mb] = preset.mid;
  const [hr, hg, hb] = preset.high;
  const warmUnify = preset.warmUnify || 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const origLum = 0.299 * r + 0.587 * g + 0.114 * b;
    const skinW = computeSkinWeight(r, g, b, origLum);
    const skinProtect = 1 - skinW * 0.76;

    // Cool-highlight warmth unification (harmonizes daylight blue skies/water like pier.jpg
    // into golden-hour coastal sunset warmth with a golden-peach wash outside skin areas)
    if (warmUnify > 0.01 && origLum > 52 && skinW < 0.35) {
      const coolExcess = Math.max(0, b - r * 0.92);
      const cyanExcess = Math.max(0, (g * 0.52 + b * 0.48) - r * 0.96);
      const coolAmt = Math.min(1, (coolExcess * 0.65 + cyanExcess * 0.62) / 68);
      if (coolAmt > 0.02) {
        const lumGate = Math.min(1, (origLum - 52) / 96);
        const shift = coolAmt * lumGate * warmUnify * skinProtect;
        r += shift * 76;
        g += shift * 12;
        b -= shift * 68;

        // Golden-peach sunset wash over blue/cyan sky & water so daylight panels unify with sunset cast
        const washAmt = Math.min(0.68, shift * 0.72);
        r = r * (1 - washAmt) + 255 * washAmt;
        g = g * (1 - washAmt) + 176 * washAmt;
        b = b * (1 - washAmt) + 118 * washAmt;
      }
    }

    // Brightness & Contrast around mid-gray
    r = (r * brightMul - 128) * contrastMul + 128;
    g = (g * brightMul - 128) * contrastMul + 128;
    b = (b * brightMul - 128) * contrastMul + 128;

    // Key-art S-curve black anchor so contact-sheet contrast stays razor-sharp
    const curLum = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * b));
    const tn = curLum / 255;
    const sCurve = tn * tn * (3 - 2 * tn);
    const sBlend = 0.13 * (0.42 + 0.58 * skinProtect);
    const targetLum = (tn * (1 - sBlend) + sCurve * sBlend) * 255;
    if (curLum > 1) {
      const ratio = targetLum / curLum;
      r *= ratio;
      g *= ratio;
      b *= ratio;
    }

    // Saturation boost (gentler on skin tones so portraits remain luminous & lifelike)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const effSat = 1 + (satMul - 1) * (0.52 + 0.48 * skinProtect);
    r = lum + (r - lum) * effSat;
    g = lum + (g - lum) * effSat;
    b = lum + (b - lum) * effSat;

    // 3-zone smooth split-tone cinematic grade
    const t = Math.max(0, Math.min(1, lum / 255));
    const wShadow = (1 - t) * (1 - t) * preset.shadowAmt * skinProtect;
    const wMid = 4 * t * (1 - t) * preset.midAmt * skinProtect;
    const wHigh = t * t * preset.highAmt * (0.48 + 0.52 * skinProtect);

    const keep = 1 - wShadow - wMid - wHigh;
    r = r * keep + sr * wShadow + mr * wMid + hr * wHigh;
    g = g * keep + sg * wShadow + mg * wMid + hg * wHigh;
    b = b * keep + sb * wShadow + mb * wMid + hb * wHigh;

    data[i] = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(b);
  }
}

function applyPainterlyPosterInk(data, width, height, strength) {
  const s = Math.max(0, Math.min(1, strength));
  if (s <= 0.01 || width < 4 || height < 4) return;

  const src = new Uint8ClampedArray(data);
  const luma = new Float32Array(width * height);
  const skinMask = new Float32Array(width * height);
  for (let p = 0, i = 0; p < luma.length; p++, i += 4) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    luma[p] = y;
    skinMask[p] = computeSkinWeight(r, g, b, y);
  }

  // V3 Calibrated for 45% default: sharp skin-safe GTA illustrated key-art polish
  const smoothBlend = s * 0.58;
  const posterBlend = s * 0.34;
  const inkBlend = s * 0.94;
  const bands = 11 - Math.round(s * 3.5); // Smooth rich tonal bands without facial blotching
  const diffThresh = 28;

  for (let y = 1; y < height - 1; y++) {
    const rowOff = y * width;
    for (let x = 1; x < width - 1; x++) {
      const p = rowOff + x;
      const idx = p * 4;
      if (src[idx + 3] === 0) continue;

      const cLum = luma[p];
      const skinW = skinMask[p];
      let sumR = src[idx] * 2.2;
      let sumG = src[idx + 1] * 2.2;
      let sumB = src[idx + 2] * 2.2;
      let weight = 2.2;

      const neighbors = [
        p - 1, p + 1, p - width, p + width,
        p - width - 1, p - width + 1, p + width - 1, p + width + 1,
      ];
      for (let n = 0; n < 8; n++) {
        const np = neighbors[n];
        if (Math.abs(luma[np] - cLum) < diffThresh) {
          const ni = np * 4;
          const w = n < 4 ? 1.2 : 0.7;
          sumR += src[ni] * w;
          sumG += src[ni + 1] * w;
          sumB += src[ni + 2] * w;
          weight += w;
        }
      }

      const avgR = sumR / weight;
      const avgG = sumG / weight;
      const avgB = sumB / weight;
      const localSmooth = smoothBlend * (1 - skinW * 0.18);
      let r = src[idx] * (1 - localSmooth) + avgR * localSmooth;
      let g = src[idx + 1] * (1 - localSmooth) + avgG * localSmooth;
      let b = src[idx + 2] * (1 - localSmooth) + avgB * localSmooth;

      // Razor-sharp key-art micro-clarity punch (stronger on hair, jackets, palms, skylines)
      const clarityAmt = s * (0.34 - skinW * 0.20);
      r += (src[idx] - avgR) * clarityAmt;
      g += (src[idx + 1] - avgG) * clarityAmt;
      b += (src[idx + 2] - avgB) * clarityAmt;

      // Skin-protected illustration tonal banding
      const curLum = Math.max(1, 0.299 * r + 0.587 * g + 0.114 * b);
      const qStep = 255 / bands;
      const qLum = Math.round(curLum / qStep) * qStep;
      const effPoster = posterBlend * (1 - skinW * 0.62);
      const targetLum = curLum * (1 - effPoster) + qLum * effPoster;
      const lumRatio = targetLum / curLum;
      r *= lumRatio;
      g *= lumRatio;
      b *= lumRatio;

      // Skin-gentle Sobel key-art ink contours
      const tl = luma[p - width - 1];
      const tc = luma[p - width];
      const tr = luma[p - width + 1];
      const ml = luma[p - 1];
      const mr = luma[p + 1];
      const bl = luma[p + width - 1];
      const bc = luma[p + width];
      const br = luma[p + width + 1];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const grad = Math.hypot(gx, gy);

      const inkThresh = 64 + skinW * 36;
      if (grad > inkThresh) {
        const edgeAlpha = Math.min(0.90, ((grad - inkThresh) / 155) * inkBlend * (1 - skinW * 0.48));
        r = r * (1 - edgeAlpha) + 10 * edgeAlpha;
        g = g * (1 - edgeAlpha) + 5 * edgeAlpha;
        b = b * (1 - edgeAlpha) + 18 * edgeAlpha;
      }

      data[idx] = clamp255(r);
      data[idx + 1] = clamp255(g);
      data[idx + 2] = clamp255(b);
    }
  }
}

/**
 * Returns a cached processed offscreen canvas for `photoRecord` under `effects`.
 */
export function processPhotoWithEffects(photoRecord, effects, isExport = false) {
  if (!photoRecord || !photoRecord.source) return null;
  const key = makeCacheKey(photoRecord.id, effects, isExport);
  const cached = lruGet(key);
  if (cached) return cached;

  const src = photoRecord.source;
  const srcW = src.naturalWidth || src.width;
  const srcH = src.naturalHeight || src.height;
  if (!srcW || !srcH) return src;

  const maxDim = isExport ? Math.max(srcW, srcH) : PREVIEW_PROCESS_MAX_DIM;
  const scale = Math.max(srcW, srcH) > maxDim ? maxDim / Math.max(srcW, srcH) : 1;
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, outW, outH);

  const imgData = ctx.getImageData(0, 0, outW, outH);
  applyColorGradeAndTone(imgData.data, effects);

  const painterlyAmt = (effects.painterly ?? 0) / 100;
  if (painterlyAmt > 0.01) {
    applyPainterlyPosterInk(imgData.data, outW, outH, painterlyAmt);
  }

  ctx.putImageData(imgData, 0, 0);
  lruSet(key, canvas);
  return canvas;
}

/**
 * Generates a live miniature color-graded preview `<canvas>` for sidebar colour-grade
 * swatch cards (cached by photoId + gradeId + dimensions).
 */
export function renderGradePreviewThumb(photoRecord, gradeId, width = 76, height = 52) {
  const preset = resolveGradePreset(gradeId);
  const cacheKey = `${photoRecord?.id || 'fallback'}|${preset.id}|${width}x${height}`;
  if (thumbCache.has(cacheKey)) {
    return thumbCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const src = photoRecord && photoRecord.source;
  const srcW = src ? (src.naturalWidth || src.width || 0) : 0;
  const srcH = src ? (src.naturalHeight || src.height || 0) : 0;

  if (src && srcW > 0 && srcH > 0) {
    // Upper-third cover crop so the portrait's face is framed cleanly in the swatch
    const scale = Math.max(width / srcW, height / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const drawX = (width - drawW) * 0.5;
    const drawY = Math.min(0, (height - drawH) * 0.24);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, drawX, drawY, drawW, drawH);

    const imgData = ctx.getImageData(0, 0, width, height);
    applyColorGradeAndTone(imgData.data, {
      gradePreset: preset.id,
      brightness: 102,
      contrast: 118,
      saturation: 120,
    });
    ctx.putImageData(imgData, 0, 0);
  } else {
    const [sr, sg, sb] = preset.shadow;
    const [mr, mg, mb] = preset.mid;
    const [hr, hg, hb] = preset.high;
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, `rgb(${hr}, ${hg}, ${hb})`);
    g.addColorStop(0.5, `rgb(${mr}, ${mg}, ${mb})`);
    g.addColorStop(1, `rgb(${sr}, ${sg}, ${sb})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  if (thumbCache.size > 48) {
    thumbCache.clear();
  }
  thumbCache.set(cacheKey, canvas);
  return canvas;
}
