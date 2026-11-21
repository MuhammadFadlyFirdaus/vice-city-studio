// Core 2D Canvas compositor for Vice City Studio.
// Supports both interactive preview mode (with subtle panel selection outline)
// and clean lossless export mode (zero selection gizmos, full resolution).

import { resolveTemplatePanels } from './templates.js';
import { drawCoverTypography } from './typography.js';
import { processPhotoWithEffects } from './imageEffects.js';
import { drawAtmosphericOverlays } from './overlays.js';

function tracePolygon(ctx, points) {
  if (!points || points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
}

function drawEmptyPanelPlaceholder(ctx, bounds, index) {
  const grad = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h);
  grad.addColorStop(0, '#271342');
  grad.addColorStop(0.55, '#591a59');
  grad.addColorStop(1, '#1c0f2e');
  ctx.fillStyle = grad;
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.font = `600 ${Math.max(18, Math.round(Math.min(bounds.w, bounds.h) * 0.1))}px "Oswald", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PANEL ${index + 1}`, bounds.cx, bounds.cy - 10);
  ctx.font = `500 ${Math.max(12, Math.round(Math.min(bounds.w, bounds.h) * 0.055))}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 209, 102, 0.55)';
  ctx.fillText('DROP PHOTO HERE', bounds.cx, bounds.cy + 18);
  ctx.restore();
}

export function computePanelPhotoRect(bounds, srcW, srcH, panelState) {
  const zoom = Math.max(1, Math.min(3, panelState.zoom ?? 1));
  const panX = Math.max(-1, Math.min(1, panelState.panX ?? 0));
  const panY = Math.max(-1, Math.min(1, panelState.panY ?? -0.18));

  const coverScale = Math.max(bounds.w / srcW, bounds.h / srcH);
  const drawW = srcW * coverScale * zoom;
  const drawH = srcH * coverScale * zoom;
  const slackX = Math.max(0, drawW - bounds.w);
  const slackY = Math.max(0, drawH - bounds.h);

  // Negative panY shifts image downward so upper-third (heads/sky) stays cleanly framed
  const drawX = bounds.x + (bounds.w - drawW) * 0.5 - panX * (slackX * 0.5);
  const drawY = bounds.y + (bounds.h - drawH) * 0.5 - panY * (slackY * 0.5);

  return { drawX, drawY, drawW, drawH, slackX, slackY };
}

function drawPanelImage(ctx, geom, panelState, photoRecord, effects, options) {
  const { bounds } = geom;
  if (!photoRecord || !photoRecord.source) {
    drawEmptyPanelPlaceholder(ctx, bounds, geom.index);
    return;
  }

  let drawable = photoRecord.source;
  if (typeof options.processPhoto === 'function') {
    drawable = options.processPhoto(photoRecord, effects, options.mode === 'export') || drawable;
  }

  const srcW = drawable.naturalWidth || drawable.width;
  const srcH = drawable.naturalHeight || drawable.height;
  if (!srcW || !srcH) {
    drawEmptyPanelPlaceholder(ctx, bounds, geom.index);
    return;
  }

  const rect = computePanelPhotoRect(bounds, srcW, srcH, panelState);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (panelState.flipX) {
    ctx.translate(bounds.x + bounds.w * 0.5, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(bounds.x + bounds.w * 0.5), 0);
  }
  ctx.drawImage(drawable, rect.drawX, rect.drawY, rect.drawW, rect.drawH);
  ctx.restore();
}

/**
 * Renders the complete GTA-style multi-panel cover onto `canvas`.
 * Returns the resolved panel geometries for interactive hit-testing.
 */
export function renderPoster(canvas, store, options = {}) {
  const mode = options.mode || 'preview';
  const hideGizmos = Boolean(options.hideGizmos || mode === 'export');
  const state = store.getState();
  const format = options.format || store.getFormat();
  const width = options.width || format.width;
  const height = options.height || format.height;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  const minDim = Math.min(width, height);
  const panelGeometries = resolveTemplatePanels(state.templateId, format.id, width, height);

  // 1. Jet-black comic ink frame background
  ctx.save();
  ctx.fillStyle = '#07040c';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 2. Render each clipped photo panel + subtle per-panel comic ink stroke
  const inkStroke = Math.max(4, Math.round(minDim * 0.0065));
  for (let i = 0; i < panelGeometries.length; i++) {
    const geom = panelGeometries[i];
    const panelState = state.panels[i] || { photoId: null, zoom: 1, panX: 0, panY: -0.18, flipX: false };
    const photoRecord = store.getPhoto(panelState.photoId);

    ctx.save();
    tracePolygon(ctx, geom.points);
    ctx.clip();

    // Base fill beneath transparent PNGs so transparency looks intentional and vibrant
    const baseGrad = ctx.createLinearGradient(geom.bounds.x, geom.bounds.y, geom.bounds.x, geom.bounds.y + geom.bounds.h);
    baseGrad.addColorStop(0, '#2a1242');
    baseGrad.addColorStop(0.55, '#ff4d8d');
    baseGrad.addColorStop(1, '#1a0b2e');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(geom.bounds.x, geom.bounds.y, geom.bounds.w, geom.bounds.h);

    drawPanelImage(ctx, geom, panelState, photoRecord, state.effects, {
      mode,
      processPhoto: options.processPhoto || processPhotoWithEffects,
    });

    // Subtle inner ink rim for crisp separation
    tracePolygon(ctx, geom.points);
    ctx.strokeStyle = '#050308';
    ctx.lineWidth = inkStroke * 2;
    ctx.stroke();
    ctx.restore();
  }

  // 3. Atmospheric overlays (sunset wash, dual neon rim, palm silhouettes, horizon disc, grain, vignette)
  const overlaysFn = options.drawOverlays || drawAtmosphericOverlays;
  overlaysFn(ctx, width, height, state.effects, panelGeometries);

  // 4. Outer crisp comic frame border around entire poster
  ctx.save();
  const outerFrame = Math.max(8, Math.round(minDim * 0.014));
  ctx.strokeStyle = '#06030a';
  ctx.lineWidth = outerFrame * 2;
  ctx.strokeRect(0, 0, width, height);
  // Subtle hairline sunset accent inset inside outer frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = Math.max(1.5, minDim * 0.0018);
  ctx.strokeRect(outerFrame, outerFrame, width - outerFrame * 2, height - outerFrame * 2);
  ctx.restore();

  // 5. Layered Retro-Chrome & Neon Typography + Badges
  drawCoverTypography(ctx, width, height, state.typography, panelGeometries, state.panels);

  // 6. Interactive selection gizmo (PREVIEW ONLY — never drawn in export or cover screenshots)
  if (!hideGizmos) {
    const selIdx = state.selectedPanelIndex;
    const selGeom = panelGeometries[selIdx];
    if (selGeom) {
      ctx.save();
      tracePolygon(ctx, selGeom.points);
      ctx.strokeStyle = '#35e8ff';
      ctx.lineWidth = Math.max(4, Math.round(minDim * 0.0045));
      ctx.setLineDash([Math.round(minDim * 0.016), Math.round(minDim * 0.01)]);
      ctx.shadowColor = 'rgba(53, 232, 255, 0.85)';
      ctx.shadowBlur = Math.round(minDim * 0.014);
      ctx.stroke();
      ctx.restore();
    }
  }

  return panelGeometries;
}
