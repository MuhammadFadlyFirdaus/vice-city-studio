// Local offline photo intake, validation, safe 4K downscaling (<=2560px),
// thumbnail generation, and sample photo loading for Vice City Studio.

export const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
export const MAX_INTERNAL_DIMENSION = 2560;
export const THUMB_MAX_DIMENSION = 240;

export const BUNDLED_SAMPLES = [
  { id: 'sample-hero-kingpin', name: 'The Boss', url: './samples/hero-kingpin.jpg' },
  { id: 'sample-boulevard', name: 'The Driver', url: './samples/boulevard.jpg' },
  { id: 'sample-night-rider', name: 'The Rider', url: './samples/night-rider.jpg' },
  { id: 'sample-crimson-mechanic', name: 'The Mechanic', url: './samples/crimson-mechanic.jpg' },
  { id: 'sample-pier', name: 'The Captain', url: './samples/pier.jpg' },
  { id: 'sample-rooftop', name: 'The Fixer', url: './samples/rooftop-dusk.jpg' },
  { id: 'sample-lookout', name: 'The Lookout', url: './samples/neon-lookout.jpg' },
  { id: 'sample-boss', name: 'The Insider', url: './samples/miami-boss.jpg' },
];

let nextPhotoSeq = 1;

export function validateImageFile(file) {
  if (!file) {
    return { valid: false, reason: 'No file selected.' };
  }
  const mime = (file.type || '').toLowerCase();
  const hasAllowedMime = mime ? ALLOWED_IMAGE_MIMES.has(mime) : false;
  const hasAllowedExt = ALLOWED_EXTENSIONS.test(file.name || '');
  if (!hasAllowedMime && !hasAllowedExt) {
    return {
      valid: false,
      reason: `Unsupported file "${file.name || 'image'}". Use JPG, PNG, or WebP.`,
    };
  }
  if (file.size === 0) {
    return { valid: false, reason: `File "${file.name}" is empty.` };
  }
  return { valid: true, reason: null };
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to decode image from ${url}`));
    img.src = url;
  });
}

function drawResizedCanvas(source, srcW, srcH, maxDim) {
  const longSide = Math.max(srcW, srcH);
  const scale = longSide > maxDim ? maxDim / longSide : 1;
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetW, targetH);
  return canvas;
}

function buildThumbnailDataUrl(source, srcW, srcH) {
  const thumbCanvas = drawResizedCanvas(source, srcW, srcH, THUMB_MAX_DIMENSION);
  try {
    return thumbCanvas.toDataURL('image/jpeg', 0.78);
  } catch {
    return thumbCanvas.toDataURL('image/png');
  }
}

export async function decodeAndNormalizeImage(file) {
  const check = validateImageFile(file);
  if (!check.valid) {
    throw new Error(check.reason);
  }

  let decoded = null;
  let naturalW = 0;
  let naturalH = 0;
  let objectUrl = null;

  try {
    if (typeof createImageBitmap === 'function') {
      try {
        decoded = await createImageBitmap(file, { imageOrientation: 'from-image' });
        naturalW = decoded.width;
        naturalH = decoded.height;
      } catch {
        decoded = null;
      }
    }

    if (!decoded) {
      objectUrl = URL.createObjectURL(file);
      decoded = await loadImageElement(objectUrl);
      naturalW = decoded.naturalWidth || decoded.width;
      naturalH = decoded.naturalHeight || decoded.height;
    }

    if (!naturalW || !naturalH) {
      throw new Error(`Could not read dimensions for "${file.name}".`);
    }

    // Normalize onto a capped offscreen canvas (<=2560px) so 4K+ uploads remain snappy
    const normalizedCanvas = drawResizedCanvas(decoded, naturalW, naturalH, MAX_INTERNAL_DIMENSION);
    const thumbUrl = buildThumbnailDataUrl(normalizedCanvas, normalizedCanvas.width, normalizedCanvas.height);

    if (typeof decoded.close === 'function') {
      decoded.close();
    }

    const cleanName = (file.name || `Photo ${nextPhotoSeq}`).replace(/\.[^.]+$/, '');
    return {
      id: `user-photo-${Date.now()}-${nextPhotoSeq++}`,
      name: cleanName,
      width: normalizedCanvas.width,
      height: normalizedCanvas.height,
      originalWidth: naturalW,
      originalHeight: naturalH,
      source: normalizedCanvas,
      thumbUrl,
      isSample: false,
    };
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export async function loadSamplePhotos(store) {
  const loaded = [];
  for (const sample of BUNDLED_SAMPLES) {
    try {
      const img = await loadImageElement(sample.url);
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const record = {
        id: sample.id,
        name: sample.name,
        width: w,
        height: h,
        originalWidth: w,
        originalHeight: h,
        source: img,
        thumbUrl: sample.url,
        isSample: true,
      };
      store.addPhoto(record);
      loaded.push(record);
    } catch {
      // Skip any missing optional sample without crashing bootstrap
    }
  }
  return loaded;
}

export async function importPhotoFiles(fileList, store) {
  const files = Array.from(fileList || []);
  const imported = [];
  const errors = [];

  for (const file of files) {
    try {
      const record = await decodeAndNormalizeImage(file);
      store.addPhoto(record);
      imported.push(record);
    } catch (err) {
      errors.push(err.message || `Failed to load ${file.name || 'file'}.`);
    }
  }
  return { imported, errors };
}

export async function replacePanelPhotoFromFile(file, panelIndex, store) {
  const record = await decodeAndNormalizeImage(file);
  store.addPhoto(record);
  store.updatePanel(panelIndex, {
    photoId: record.id,
    zoom: 1,
    panX: 0,
    panY: -0.18,
    flipX: false,
  });
  return record;
}
