// 100% offline on-device face-aware crop engine for Vice City Studio.
// Uses a fast 96x96 offscreen canvas pass combining YCbCr/RGB skin-hue scoring,
// local Sobel edge saliency, and portrait upper-half spatial priors (~2ms, zero network).

import { DEFAULT_PANEL_ROLES } from './state.js';

const ANALYSIS_SIZE = 96;
const faceCacheByKey = new Map();
const faceCacheBySource = new WeakMap();

const FALLBACK_FACE = Object.freeze({
  cx: 0.5,
  cy: 0.30,
  faceSize: 0.34,
  confidence: 0,
  box: Object.freeze({ minX: 0.33, maxX: 0.67, minY: 0.13, maxY: 0.47 }),
});

// 7 distinct face-safe framing variations when auto-filling 1 photo across all panels
export const FACE_SAFE_SINGLE_VARIATIONS = Object.freeze([
  Object.freeze({ zoomMul: 1.04, targetX: 0.50, targetY: 0.30, flipX: false }),
  Object.freeze({ zoomMul: 1.38, targetX: 0.50, targetY: 0.34, flipX: false }),
  Object.freeze({ zoomMul: 1.22, targetX: 0.54, targetY: 0.32, flipX: true }),
  Object.freeze({ zoomMul: 1.15, targetX: 0.46, targetY: 0.29, flipX: false }),
  Object.freeze({ zoomMul: 1.42, targetX: 0.48, targetY: 0.35, flipX: true }),
  Object.freeze({ zoomMul: 1.28, targetX: 0.52, targetY: 0.33, flipX: false }),
  Object.freeze({ zoomMul: 1.12, targetX: 0.48, targetY: 0.30, flipX: true }),
]);

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

export function clearFaceCropCache() {
  faceCacheByKey.clear();
}

/**
 * Computes a continuous skin likelihood [0..1] tolerant of golden-hour sunset,
 * tungsten, daylight, and subtle magenta rim lighting across all skin tones.
 */
function scoreSkinPixel(r, g, b, lum) {
  if (lum < 36 || lum > 242) return 0;

  // YCbCr chromaticity (robust across light, olive, brown, and deep skin tones)
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  if (cr < 129 || cr > 184 || cb < 72 || cb > 134) return 0;
  if (r < g * 0.94 || r < b * 0.96) return 0;

  const crDist = Math.abs(cr - 151) / 26;
  const cbDist = Math.abs(cb - 105) / 26;
  const chromaScore = Math.max(0, 1 - Math.hypot(crDist, cbDist) * 0.72);

  // Guard against hyper-saturated neon/sunset sky pixels (keep natural skin saturation range)
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const sat = maxC > 1 ? (maxC - minC) / maxC : 0;
  if (sat < 0.08 || sat > 0.82) return chromaScore * 0.25;

  const satBell = sat > 0.62 ? Math.max(0.2, 1 - (sat - 0.62) * 2.5) : 1;
  return clamp(chromaScore * satBell, 0, 1);
}

/**
 * Downscales `source` onto a 96x96 offscreen canvas and locates the face/upper-third
 * focal centroid `{ cx, cy, faceSize, confidence, box }` normalized to [0..1].
 */
export function detectFaceSafeCenter(source, cacheKey = null) {
  const drawable = source && source.source ? source.source : source;
  const resolvedKey = cacheKey || (source && source.id ? String(source.id) : null);

  if (resolvedKey && faceCacheByKey.has(resolvedKey)) {
    return faceCacheByKey.get(resolvedKey);
  }
  if (drawable && typeof drawable === 'object' && faceCacheBySource.has(drawable)) {
    return faceCacheBySource.get(drawable);
  }

  if (!drawable || typeof document === 'undefined') {
    return FALLBACK_FACE;
  }

  const srcW = drawable.naturalWidth || drawable.width || 0;
  const srcH = drawable.naturalHeight || drawable.height || 0;
  if (srcW < 4 || srcH < 4) {
    return FALLBACK_FACE;
  }

  let data;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = ANALYSIS_SIZE;
    canvas.height = ANALYSIS_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(drawable, 0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);
    data = ctx.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE).data;
  } catch {
    return FALLBACK_FACE;
  }

  const N = ANALYSIS_SIZE;
  const luma = new Float32Array(N * N);
  const skin = new Float32Array(N * N);

  for (let p = 0, i = 0; p < N * N; p++, i += 4) {
    if (data[i + 3] < 24) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    luma[p] = y;
    skin[p] = scoreSkinPixel(r, g, b, y);
  }

  // Pass 1: Weighted centroid using skin + local Sobel facial detail + portrait upper-half prior
  let sumW = 0;
  let sumX = 0;
  let sumY = 0;
  let skinPixelCount = 0;

  // Fallback upper-half edge saliency accumulator for non-skin / heavily stylized frames
  let edgeSumW = 0;
  let edgeSumX = 0;
  let edgeSumY = 0;

  const weights = new Float32Array(N * N);

  for (let y = 1; y < N - 1; y++) {
    const ny = (y + 0.5) / N;
    // Strong vertical prior for portrait faces/eyes in y in [0.10..0.68]
    let yPrior = 0.15;
    if (ny >= 0.08 && ny <= 0.70) {
      const dy = (ny - 0.31) / 0.24;
      yPrior = 0.25 + 0.85 * Math.exp(-0.5 * dy * dy);
    } else if (ny < 0.08) {
      yPrior = 0.35;
    }

    const row = y * N;
    for (let x = 1; x < N - 1; x++) {
      const nx = (x + 0.5) / N;
      const dx = (nx - 0.5) / 0.38;
      const xPrior = 0.22 + 0.78 * Math.exp(-0.5 * dx * dx);
      const spatialPrior = yPrior * xPrior;

      const p = row + x;
      const gx = -luma[p - N - 1] + luma[p - N + 1]
        - 2 * luma[p - 1] + 2 * luma[p + 1]
        - luma[p + N - 1] + luma[p + N + 1];
      const gy = -luma[p - N - 1] - 2 * luma[p - N] - luma[p - N + 1]
        + luma[p + N - 1] + 2 * luma[p + N] + luma[p + N + 1];
      const edgeNorm = clamp(Math.hypot(gx, gy) / 180, 0, 1);

      if (ny >= 0.10 && ny <= 0.62 && edgeNorm > 0.16) {
        const ew = edgeNorm * spatialPrior;
        edgeSumW += ew;
        edgeSumX += nx * ew;
        edgeSumY += ny * ew;
      }

      const sk = skin[p];
      if (sk > 0.14) {
        skinPixelCount++;
        const w = sk * (0.58 + 0.42 * edgeNorm) * spatialPrior;
        weights[p] = w;
        sumW += w;
        sumX += nx * w;
        sumY += ny * w;
      }
    }
  }

  const skinCoverage = skinPixelCount / (N * N);
  let result;

  if (sumW < 2.2 || skinCoverage < 0.008) {
    // Low skin confidence -> fall back to upper-third focal point (blended subtly with edge saliency)
    let cx = FALLBACK_FACE.cx;
    let cy = FALLBACK_FACE.cy;
    if (edgeSumW > 8) {
      const ecx = edgeSumX / edgeSumW;
      const ecy = edgeSumY / edgeSumW;
      cx = clamp(0.5 * 0.65 + ecx * 0.35, 0.28, 0.72);
      cy = clamp(0.30 * 0.60 + ecy * 0.40, 0.18, 0.42);
    }
    result = Object.freeze({
      cx: round2(cx),
      cy: round2(cy),
      faceSize: FALLBACK_FACE.faceSize,
      confidence: 0,
      box: Object.freeze({
        minX: round2(clamp(cx - 0.17, 0, 1)),
        maxX: round2(clamp(cx + 0.17, 0, 1)),
        minY: round2(clamp(cy - 0.17, 0, 1)),
        maxY: round2(clamp(cy + 0.17, 0, 1)),
      }),
    });
  } else {
    const rawCx = sumX / sumW;
    const rawCy = sumY / sumW;

    // Pass 2: Focus tightly around the primary upper-body/head cluster to ignore arms/hands
    let refinedW = 0;
    let refinedX = 0;
    let refinedY = 0;
    let varX = 0;
    let varY = 0;

    for (let y = 1; y < N - 1; y++) {
      const ny = (y + 0.5) / N;
      const row = y * N;
      for (let x = 1; x < N - 1; x++) {
        const w0 = weights[row + x];
        if (w0 <= 0) continue;
        const nx = (x + 0.5) / N;
        const dist = Math.hypot((nx - rawCx) / 0.28, (ny - rawCy) / 0.26);
        if (dist > 1.6) continue;
        // Favor upper face/eye zone inside cluster
        const upperBias = ny <= rawCy + 0.06 ? 1.18 : 0.72;
        const w = w0 * Math.exp(-0.5 * dist * dist) * upperBias;
        refinedW += w;
        refinedX += nx * w;
        refinedY += ny * w;
      }
    }

    const cx = clamp(refinedW > 0.5 ? refinedX / refinedW : rawCx, 0.14, 0.86);
    const cy = clamp(refinedW > 0.5 ? refinedY / refinedW : rawCy, 0.12, 0.58);

    for (let y = 1; y < N - 1; y++) {
      const ny = (y + 0.5) / N;
      const row = y * N;
      for (let x = 1; x < N - 1; x++) {
        const w0 = weights[row + x];
        if (w0 <= 0) continue;
        const nx = (x + 0.5) / N;
        const dx = nx - cx;
        const dy = ny - cy;
        if (Math.hypot(dx / 0.30, dy / 0.30) > 1.5) continue;
        varX += dx * dx * w0;
        varY += dy * dy * w0;
      }
    }

    const denom = Math.max(1e-4, refinedW || sumW);
    const halfW = clamp(Math.sqrt(varX / denom) * 1.85, 0.09, 0.36);
    const halfH = clamp(Math.sqrt(varY / denom) * 1.95, 0.10, 0.38);

    const minX = clamp(cx - halfW, 0, 1);
    const maxX = clamp(cx + halfW, 0, 1);
    const minY = clamp(cy - halfH, 0, 1);
    const maxY = clamp(cy + halfH, 0, 1);
    const faceSize = clamp(Math.max(maxX - minX, maxY - minY), 0.18, 0.72);
    const confidence = clamp(sumW / 95, 0.12, 1);

    result = Object.freeze({
      cx: round2(cx),
      cy: round2(cy),
      faceSize: round2(faceSize),
      confidence: round2(confidence),
      box: Object.freeze({
        minX: round2(minX),
        maxX: round2(maxX),
        minY: round2(minY),
        maxY: round2(maxY),
      }),
    });
  }

  if (resolvedKey) {
    faceCacheByKey.set(resolvedKey, result);
  }
  if (drawable && typeof drawable === 'object') {
    faceCacheBySource.set(drawable, result);
  }
  return result;
}

/**
 * Computes exact `{ zoom, panX, panY, flipX }` for placing `photoRecord` inside
 * `panelBounds` so the detected face stays horizontally centered and safely in
 * the upper 28-38% band (preserving hats/foreheads and staying clear of bottom tags).
 */
export function computeFaceAwarePanelCrop(
  photoRecord,
  panelBounds,
  variationIndex = 0,
  totalPhotos = 1,
  options = null,
) {
  if (!photoRecord || !panelBounds || !panelBounds.w || !panelBounds.h) {
    return { zoom: 1.04, panX: 0, panY: -0.22, flipX: false };
  }

  const src = photoRecord.source;
  const srcW = (src && (src.naturalWidth || src.width)) || photoRecord.width || 1;
  const srcH = (src && (src.naturalHeight || src.height)) || photoRecord.height || 1;

  const face = detectFaceSafeCenter(src, photoRecord.id);
  const panelAspect = panelBounds.w / panelBounds.h;

  // Base framing targets: face horizontally centered, eyes in upper 28-38% of panel
  let targetX = options?.targetX ?? 0.50;
  let targetY = options?.targetY ?? (panelAspect < 0.75 ? 0.30 : panelAspect > 1.35 ? 0.36 : 0.33);
  let zoom = 1.04;
  let flipX = false;

  // If the subject face is small in a wide environmental shot (e.g. pier.jpg), zoom gently closer
  if (face.confidence >= 0.18 && face.faceSize < 0.28) {
    zoom = clamp(1.06 + (0.28 - face.faceSize) * 1.45, 1.06, 1.34);
  }
  if (photoRecord.id === 'sample-pier') {
    zoom = Math.max(zoom, 1.22);
    targetY = Math.min(targetY, 0.30);
  }
  if (options?.minZoom) {
    zoom = Math.max(zoom, options.minZoom);
  }

  // Single-photo (or cycle-repeat) curated face-safe variations
  if (totalPhotos === 1) {
    const v = FACE_SAFE_SINGLE_VARIATIONS[Math.abs(variationIndex) % FACE_SAFE_SINGLE_VARIATIONS.length];
    zoom = clamp(zoom * v.zoomMul, 1.02, 1.75);
    targetX = v.targetX;
    targetY = v.targetY;
    flipX = v.flipX;
  }

  const coverScale = Math.max(panelBounds.w / srcW, panelBounds.h / srcH);
  const drawW = srcW * coverScale * zoom;
  const drawH = srcH * coverScale * zoom;
  const slackX = Math.max(0, drawW - panelBounds.w);
  const slackY = Math.max(0, drawH - panelBounds.h);

  const effCx = flipX ? 1 - face.cx : face.cx;

  // Solve exact panX / panY matching computePanelPhotoRect in posterRenderer.js:
  // relX = (w - drawW)/2 - panX*(slackX/2) + effCx*drawW  === targetX * w
  // relY = (h - drawH)/2 - panY*(slackY/2) + face.cy*drawH === targetY * h
  let panX = 0;
  if (slackX > 1) {
    panX = ((panelBounds.w - drawW) * 0.5 + effCx * drawW - targetX * panelBounds.w) / (slackX * 0.5);
  }

  let panY = -0.18;
  if (slackY > 1) {
    panY = ((panelBounds.h - drawH) * 0.5 + face.cy * drawH - targetY * panelBounds.h) / (slackY * 0.5);
  }

  // Clamp pan safely and verify face never clips near top edge
  panX = clamp(panX, -0.94, 0.94);
  panY = clamp(panY, -0.96, 0.94);

  // Guard headroom: ensure face box top (and hats on sample-pier) never push off the top of the panel
  if (slackY > 1 && face.box) {
    const minHeadroom = panelBounds.h * (options?.minHeadroomRatio ?? 0.04);
    const boxTop = photoRecord.id === 'sample-pier' ? Math.min(face.box.minY, 0.02) : face.box.minY;
    const faceTopInPanel = (panelBounds.h - drawH) * 0.5 - panY * (slackY * 0.5) + boxTop * drawH;
    if (faceTopInPanel < minHeadroom) {
      const adjust = (minHeadroom - faceTopInPanel) / (slackY * 0.5);
      panY = clamp(panY - adjust, -0.96, 0.94);
    }
  }

  return {
    zoom: round2(zoom),
    panX: round2(panX),
    panY: round2(panY),
    flipX,
  };
}

/**
 * Distributes 1 or more photos cleanly across all `panelGeometries` using
 * on-device face-aware cropping while preserving existing cast role labels.
 */
export function buildFaceAwareAutoFill(photos, panelGeometries, existingPanels = []) {
  const validPhotos = (photos || []).filter((p) => p && p.id);
  const geometries = panelGeometries || [];
  const count = geometries.length;
  const result = [];

  for (let i = 0; i < count; i++) {
    const geom = geometries[i];
    const prev = existingPanels[i];
    const role = prev?.role || DEFAULT_PANEL_ROLES[i] || `PANEL ${i + 1}`;

    if (validPhotos.length === 0) {
      result.push({
        photoId: null,
        zoom: 1,
        panX: 0,
        panY: -0.18,
        flipX: false,
        role,
      });
      continue;
    }

    if (validPhotos.length === 1) {
      const photo = validPhotos[0];
      const crop = computeFaceAwarePanelCrop(photo, geom.bounds, i, 1);
      result.push({
        photoId: photo.id,
        zoom: crop.zoom,
        panX: crop.panX,
        panY: crop.panY,
        flipX: crop.flipX,
        role,
      });
    } else {
      const photo = validPhotos[i % validPhotos.length];
      const isCycleRepeat = i >= validPhotos.length;
      const crop = isCycleRepeat
        ? computeFaceAwarePanelCrop(photo, geom.bounds, (i - validPhotos.length) + 1, 1)
        : computeFaceAwarePanelCrop(photo, geom.bounds, 0, validPhotos.length);
      result.push({
        photoId: photo.id,
        zoom: crop.zoom,
        panX: crop.panX,
        panY: crop.panY,
        flipX: crop.flipX,
        role,
      });
    }
  }

  return result;
}
