// Vice City Studio visual processing engine (V2 Key-Art Calibrated):
// 5 skin-safe split-tone Vice color grades with crisp S-curve poster micro-contrast,
// Brightness/Contrast/Saturation, Painterly / Poster Ink illustration pass
// (edge-preserving gouache + soft tonal banding + skin-gentle Sobel comic ink),
// and an LRU bitmap cache (preview <=900px, export full-res).

export const PREVIEW_PROCESS_MAX_DIM = 900;
const LRU_CACHE_LIMIT = 24;

export const GRADE_PRESETS = Object.freeze({
  'vice-sunset': Object.freeze({
    shadow: [20, 8, 50],
    mid: [255, 68, 142],
    high: [255, 224, 148],
    shadowAmt: 0.30,
    midAmt: 0.14,
    highAmt: 0.25,
  }),
  'miami-heat': Object.freeze({
    shadow: [34, 9, 28],
    mid: [255, 96, 52],
    high: [255, 236, 158],
    shadowAmt: 0.28,
    midAmt: 0.18,
    highAmt: 0.27,
  }),
  'neon-midnight': Object.freeze({
    shadow: [8, 14, 48],
    mid: [255, 42, 154],
    high: [64, 238, 255],
    shadowAmt: 0.38,
    midAmt: 0.18,
    highAmt: 0.30,
  }),
  'golden-hour': Object.freeze({
    shadow: [38, 16, 14],
    mid: [246, 152, 62],
    high: [255, 242, 196],
    shadowAmt: 0.26,
    midAmt: 0.16,
    highAmt: 0.26,
  }),
  'ocean-drive': Object.freeze({
    shadow: [8, 28, 52],
    mid: [30, 214, 240],
    high: [255, 142, 188],
    shadowAmt: 0.32,
    midAmt: 0.17,
    highAmt: 0.25,
  }),
});

const lruCache = new Map();

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
}

function makeCacheKey(photoId, effects, isExport) {
  return [
    photoId,
    effects.gradePreset || 'vice-sunset',
    Math.round(effects.painterly ?? 0),
    Math.round(effects.brightness ?? 100),
    Math.round(effects.contrast ?? 100),
    Math.round(effects.saturation ?? 100),
    isExport ? 'E' : 'P',
  ].join('|');
}

function computeSkinWeight(r, g, b, lum) {
  // Smooth skin-tone detector (warm peach/tan/deep skin hues) so portraits stay natural
  if (lum < 38 || lum > 238) return 0;
  if (r <= g || g <= b * 0.84) return 0;
  const rg = r - g;
  const gb = g - b;
  if (rg < 10 || rg > 100 || gb < 4) return 0;
  const warmth = Math.min(1, rg / 32) * Math.min(1, gb / 20);
  return Math.max(0, Math.min(1, warmth * 0.80));
}

function applyColorGradeAndTone(data, effects) {
  const preset = GRADE_PRESETS[effects.gradePreset] || GRADE_PRESETS['vice-sunset'];
  const brightMul = (effects.brightness ?? 100) / 100;
  const contrastMul = (effects.contrast ?? 100) / 100;
  const satMul = (effects.saturation ?? 100) / 100;

  const [sr, sg, sb] = preset.shadow;
  const [mr, mg, mb] = preset.mid;
  const [hr, hg, hb] = preset.high;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const origLum = 0.299 * r + 0.587 * g + 0.114 * b;
    const skinW = computeSkinWeight(r, g, b, origLum);
    const skinProtect = 1 - skinW * 0.72;

    // Brightness & Contrast around mid-gray
    r = (r * brightMul - 128) * contrastMul + 128;
    g = (g * brightMul - 128) * contrastMul + 128;
    b = (b * brightMul - 128) * contrastMul + 128;

    // Subtle key-art S-curve black anchor so contact-sheet contrast stays razor-sharp
    const curLum = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * b));
    const tn = curLum / 255;
    // Gentle S-curve push (stronger outside skin tones to preserve facial gradients)
    const sCurve = tn * tn * (3 - 2 * tn);
    const sBlend = 0.14 * (0.45 + 0.55 * skinProtect);
    const targetLum = (tn * (1 - sBlend) + sCurve * sBlend) * 255;
    if (curLum > 1) {
      const ratio = targetLum / curLum;
      r *= ratio;
      g *= ratio;
      b *= ratio;
    }

    // Saturation boost (gentler on skin tones so portraits remain natural & luminous)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const effSat = 1 + (satMul - 1) * (0.55 + 0.45 * skinProtect);
    r = lum + (r - lum) * effSat;
    g = lum + (g - lum) * effSat;
    b = lum + (b - lum) * effSat;

    // 3-zone smooth split-tone Vice grade
    const t = Math.max(0, Math.min(1, lum / 255));
    const wShadow = (1 - t) * (1 - t) * preset.shadowAmt * skinProtect;
    const wMid = 4 * t * (1 - t) * preset.midAmt * skinProtect;
    const wHigh = t * t * preset.highAmt * (0.50 + 0.50 * skinProtect);

    r = r * (1 - wShadow - wMid - wHigh) + sr * wShadow + mr * wMid + hr * wHigh;
    g = g * (1 - wShadow - wMid - wHigh) + sg * wShadow + mg * wMid + hg * wHigh;
    b = b * (1 - wShadow - wMid - wHigh) + sb * wShadow + mb * wMid + hb * wHigh;

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

  // Calibrated gouache brushwork + tonal posterization + crisp Sobel key-art ink contours
  const smoothBlend = s * 0.68;
  const posterBlend = s * 0.38;
  const inkBlend = s * 0.92;
  const bands = 10 - Math.round(s * 3.5); // 10 down to 6 lush illustrated tonal bands
  const diffThresh = 30;

  for (let y = 1; y < height - 1; y++) {
    const rowOff = y * width;
    for (let x = 1; x < width - 1; x++) {
      const p = rowOff + x;
      const idx = p * 4;
      if (src[idx + 3] === 0) continue;

      const cLum = luma[p];
      const skinW = skinMask[p];
      let sumR = src[idx] * 2;
      let sumG = src[idx + 1] * 2;
      let sumB = src[idx + 2] * 2;
      let weight = 2;

      const neighbors = [
        p - 1, p + 1, p - width, p + width,
        p - width - 1, p - width + 1, p + width - 1, p + width + 1,
      ];
      for (let n = 0; n < 8; n++) {
        const np = neighbors[n];
        if (Math.abs(luma[np] - cLum) < diffThresh) {
          const ni = np * 4;
          const w = n < 4 ? 1.25 : 0.72;
          sumR += src[ni] * w;
          sumG += src[ni + 1] * w;
          sumB += src[ni + 2] * w;
          weight += w;
        }
      }

      const avgR = sumR / weight;
      const avgG = sumG / weight;
      const avgB = sumB / weight;
      let r = src[idx] * (1 - smoothBlend) + avgR * smoothBlend;
      let g = src[idx + 1] * (1 - smoothBlend) + avgG * smoothBlend;
      let b = src[idx + 2] * (1 - smoothBlend) + avgB * smoothBlend;

      // Subtle poster-ink local clarity punch (unsharp contrast) on non-flat areas
      const clarityAmt = s * (0.28 - skinW * 0.14);
      r += (src[idx] - avgR) * clarityAmt;
      g += (src[idx + 1] - avgG) * clarityAmt;
      b += (src[idx + 2] - avgB) * clarityAmt;

      // Soft illustration tonal banding on luminance (gentler on skin so faces look painted, not blotchy)
      const curLum = Math.max(1, 0.299 * r + 0.587 * g + 0.114 * b);
      const qStep = 255 / bands;
      const qLum = Math.round(curLum / qStep) * qStep;
      const effPoster = posterBlend * (1 - skinW * 0.48);
      const targetLum = curLum * (1 - effPoster) + qLum * effPoster;
      const lumRatio = targetLum / curLum;
      r *= lumRatio;
      g *= lumRatio;
      b *= lumRatio;

      // Sobel edge magnitude for crisp dark GTA-style comic ink outlines
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

      const inkThresh = 62 + skinW * 26;
      if (grad > inkThresh) {
        const edgeAlpha = Math.min(0.92, ((grad - inkThresh) / 160) * inkBlend * (1 - skinW * 0.35));
        r = r * (1 - edgeAlpha) + 12 * edgeAlpha;
        g = g * (1 - edgeAlpha) + 5 * edgeAlpha;
        b = b * (1 - edgeAlpha) + 20 * edgeAlpha;
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
