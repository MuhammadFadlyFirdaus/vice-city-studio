// Lossless offscreen PNG export engine for Vice City Studio.
// Guarantees exact pixel dimensions (1920x1080, 1080x1350, 1080x1080),
// waits for bundled SIL OFL fonts, uses full-res effects, strips all preview gizmos,
// and supports single-size export as well as batch export of all 3 sizes.

import { EXPORT_FORMATS } from './state.js';
import { renderPoster } from './posterRenderer.js';

const FONT_CHECKS = [
  '400 48px "Anton"',
  '400 48px "Bebas Neue"',
  '400 48px "Pacifico"',
  '600 24px "Oswald"',
];

function slugifyTitle(title) {
  const clean = (title || 'cover')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return clean || 'cover';
}

export async function ensureExportFontsReady() {
  if (!document.fonts) return;
  await Promise.allSettled(FONT_CHECKS.map((spec) => document.fonts.load(spec)));
  await document.fonts.ready;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

/**
 * Renders the cover offscreen at full export resolution and returns `{ blob, width, height, filename }`.
 */
export async function renderExportPngBlob(store, formatIdOverride = null) {
  await ensureExportFontsReady();

  const state = store.getState();
  const format = (formatIdOverride && EXPORT_FORMATS[formatIdOverride]) || store.getFormat();

  const offscreen = document.createElement('canvas');
  offscreen.width = format.width;
  offscreen.height = format.height;

  renderPoster(offscreen, store, {
    mode: 'export',
    hideGizmos: true,
    format,
    width: format.width,
    height: format.height,
  });

  const blob = await new Promise((resolve, reject) => {
    offscreen.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Canvas failed to encode PNG blob.'));
    }, 'image/png');
  });

  const slug = slugifyTitle(state.typography.mainTitle);
  const filename = `vice-city-${slug}-${format.width}x${format.height}.png`;
  return { blob, width: format.width, height: format.height, filename };
}

/**
 * Renders and triggers a local lossless PNG browser download for one format.
 */
export async function exportCoverPng(store, { formatId = null, onToast } = {}) {
  const { blob, width, height, filename } = await renderExportPngBlob(store, formatId);
  triggerBlobDownload(blob, filename);
  onToast?.(`Exported ${filename} (${width}×${height} PNG)`);
  return { width, height, filename, size: blob.size };
}

/**
 * Renders and downloads all 3 required export sizes (1:1, 4:5, 16:9) as lossless PNGs.
 */
export async function exportAllThreeSizes(store, { onToast } = {}) {
  const order = ['square', 'portrait', 'landscape'];
  const results = [];

  for (let i = 0; i < order.length; i++) {
    const fmtId = order[i];
    const { blob, width, height, filename } = await renderExportPngBlob(store, fmtId);
    triggerBlobDownload(blob, filename);
    results.push({ formatId: fmtId, width, height, filename, size: blob.size });
    if (i < order.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  onToast?.('Exported all 3 PNGs (1:1, 4:5, 16:9)');
  return results;
}
