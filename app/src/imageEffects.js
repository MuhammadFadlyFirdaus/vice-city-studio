// Vice City Studio visual processing engine:
// 5 skin-safe split-tone Vice color grades, Brightness/Contrast/Saturation,
// Painterly / Poster Ink illustration pass (selective smooth + soft tonal banding + Sobel ink edges),
// and an LRU bitmap cache (preview <=900px, export full-res).

export const PREVIEW_PROCESS_MAX_DIM = 900;
const LRU_CACHE_LIMIT = 18;

export const GRADE_PRESETS = Object.freeze({
  'vice-sunset': Object.freeze({
    shadow: [28, 12, 62],
    mid: [255, 72, 146],
    high: [255, 224, 152],
    shadowAmt: 0.34,
    midAmt: 0.16,
    highAmt: 0.26,
  }),
  'miami-heat': Object.freeze({
    shadow: [42, 12, 34],
    mid: [255, 98, 56],
    high: [255, 238, 162],
    shadowAmt: 0.32,
    midAmt: 0.2,
    highAmt: 0.28,
  }),
  'neon-midnight': Object.freeze({
    shadow: [10, 18, 58],
    mid: [255, 42, 154],
    high: [64, 238, 255],
    shadowAmt: 0.42,
    midAmt: 0.2,
    highAmt: 0.32,
  }),
  'golden-hour': Object.freeze({
    shadow: [46, 20, 18],
    mid: [246, 154, 66],
    high: [255, 242, 198],
    shadowAmt: 0.28,
    midAmt: 0.18,
    highAmt: 0.28,
  }),
  'ocean-drive': Object.freeze({
    shadow: [10, 36, 60],
    mid: [34, 214, 238],
    high: [255, 144, 190],
    shadowAmt: 0.36,
    midAmt: 0.19,
    highAmt: 0.26,
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
  // Smooth skin-tone detector (warm peach/tan/deep skin hues) to keep portraits natural
  if (lum < 40 || lum > 235) return 0;
  if (r <= g || g <= b * 0.85) return 0;
  const rg = r - g;
  const gb = g - b;
  if (rg < 10 || rg > 95 || gb < 4) return 0;
  const warmth = Math.min(1, rg / 35) * Math.min(1, gb / 22);
  return Math.max(0, Math.min(1, warmth * 0.72));
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
    const skinProtect = 1 - computeSkinWeight(r, g, b, origLum) * 0.62;

    // Brightness & Contrast around mid-gray
    r = (r * brightMul - 128) * contrastMul + 128;
    g = (g * brightMul - 128) * contrastMul + 128;
    b = (b * brightMul - 128) * contrastMul + 128;

    // Saturation boost (slightly gentler on protected skin tones)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const effSat = 1 + (satMul - 1) * (0.65 + 0.35 * skinProtect);
    r = lum + (r - lum) * effSat;
    g = lum + (g - lum) * effSat;
    b = lum + (b - lum) * effSat;

    // 3-zone smooth split-tone Vice grade
    const t = Math.max(0, Math.min(1, lum / 255));
    const wShadow = (1 - t) * (1 - t) * preset.shadowAmt * skinProtect;
    const wMid = 4 * t * (1 - t) * preset.midAmt * skinProtect;
    const wHigh = t * t * preset.highAmt * (0.55 + 0.45 * skinProtect);

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
  for (let p = 0, i = 0; p < luma.length; p++, i += 4) {
    luma[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
  }

  // Soft edge-preserving 3x3 gouache smoothing + tonal posterize + Sobel dark ink contours
  const smoothBlend = s * 0.72;
  const posterBlend = s * 0.42;
  const inkBlend = s * 0.85;
  const bands = 9 - Math.round(s * 3); // 9 down to 6 lush tonal bands
  const diffThresh = 32;

  for (let y = 1; y < height - 1; y++) {
    const rowOff = y * width;
    for (let x = 1; x < width - 1; x++) {
      const p = rowOff + x;
      const idx = p * 4;
      if (src[idx + 3] === 0) continue;

      const cLum = luma[p];
      let sumR = src[idx] * 2;
      let sumG = src[idx + 1] * 2;
      let sumB = src[idx + 2] * 2;
      let weight = 2;

      // Edge-preserving 4-neighbor + diagonal selective average
      const neighbors = [
        p - 1, p + 1, p - width, p + width,
        p - width - 1, p - width + 1, p + width - 1, p + width + 1,
      ];
      for (let n = 0; n < 8; n++) {
        const np = neighbors[n];
        if (Math.abs(luma[np] - cLum) < diffThresh) {
          const ni = np * 4;
          const w = n < 4 ? 1.2 : 0.75;
          sumR += src[ni] * w;
          sumG += src[ni + 1] * w;
          sumB += src[ni + 2] * w;
          weight += w;
        }
      }

      let r = src[idx] * (1 - smoothBlend) + (sumR / weight) * smoothBlend;
      let g = src[idx + 1] * (1 - smoothBlend) + (sumG / weight) * smoothBlend;
      let b = src[idx + 2] * (1 - smoothBlend) + (sumB / weight) * smoothBlend;

      // Soft illustration tonal banding on luminance (preserves chromatic richness)
      const curLum = Math.max(1, 0.299 * r + 0.587 * g + 0.114 * b);
      const qStep = 255 / bands;
      const qLum = Math.round(curLum / qStep) * qStep;
      const targetLum = curLum * (1 - posterBlend) + qLum * posterBlend;
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

      if (grad > 68) {
        const edgeAlpha = Math.min(0.88, ((grad - 68) / 175) * inkBlend);
        r = r * (1 - edgeAlpha) + 14 * edgeAlpha;
        g = g * (1 - edgeAlpha) + 7 * edgeAlpha;
        b = b * (1 - edgeAlpha) + 24 * edgeAlpha;
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
