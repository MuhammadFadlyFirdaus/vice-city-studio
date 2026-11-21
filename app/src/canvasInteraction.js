// Direct canvas interactions for Vice City Studio:
// Click panel to select, drag to pan crop, wheel to zoom, and drag-and-drop photos onto a panel.

import { hitTestPanel } from './templates.js';
import { computePanelPhotoRect } from './posterRenderer.js';
import { replacePanelPhotoFromFile } from './mediaManager.js';

function clientToCanvasPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 0, y: 0 };
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  };
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function initCanvasInteraction(canvas, store, { getGeometries, onDropMultiple, onToast }) {
  let dragState = null;
  let wheelCommitTimer = null;
  let wheelHistoryPending = false;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const geoms = getGeometries();
    const pt = clientToCanvasPoint(canvas, e.clientX, e.clientY);
    const hitIdx = hitTestPanel(geoms, pt.x, pt.y);
    if (hitIdx < 0) return;

    store.selectPanel(hitIdx);
    const panel = store.getState().panels[hitIdx];
    const photo = store.getPhoto(panel?.photoId);

    dragState = {
      pointerId: e.pointerId,
      panelIndex: hitIdx,
      startX: pt.x,
      startY: pt.y,
      origPanX: panel?.panX ?? 0,
      origPanY: panel?.panY ?? -0.18,
      flipX: Boolean(panel?.flipX),
      geom: geoms[hitIdx],
      photo,
      moved: false,
      snapshotRecorded: false,
    };

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors on synthetic events
    }
    canvas.classList.add('is-dragging');
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    if (!dragState.photo) return;

    const pt = clientToCanvasPoint(canvas, e.clientX, e.clientY);
    const dx = pt.x - dragState.startX;
    const dy = pt.y - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) < 2) return;

    const panel = store.getState().panels[dragState.panelIndex];
    if (!panel) return;

    const src = dragState.photo.source;
    const srcW = src.naturalWidth || src.width || dragState.photo.width;
    const srcH = src.naturalHeight || src.height || dragState.photo.height;
    const rect = computePanelPhotoRect(dragState.geom.bounds, srcW, srcH, panel);

    const effDx = dragState.flipX ? -dx : dx;
    const halfSlackX = Math.max(40, rect.slackX * 0.5);
    const halfSlackY = Math.max(40, rect.slackY * 0.5);

    const nextPanX = clamp(dragState.origPanX - effDx / halfSlackX, -1, 1);
    const nextPanY = clamp(dragState.origPanY - dy / halfSlackY, -1, 1);

    // Record exactly one undo snapshot at the start of the drag gesture
    const recordNow = !dragState.snapshotRecorded;
    dragState.snapshotRecorded = true;
    dragState.moved = true;

    store.updatePanel(
      dragState.panelIndex,
      {
        panX: Math.round(nextPanX * 100) / 100,
        panY: Math.round(nextPanY * 100) / 100,
      },
      { recordHistory: recordNow },
    );
  });

  function endDrag(e) {
    if (!dragState) return;
    if (e && dragState.pointerId !== e.pointerId) return;
    try {
      canvas.releasePointerCapture(dragState.pointerId);
    } catch {
      // Ignore
    }
    dragState = null;
    canvas.classList.remove('is-dragging');
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Wheel zoom directly over any panel
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const geoms = getGeometries();
    const pt = clientToCanvasPoint(canvas, e.clientX, e.clientY);
    const hitIdx = hitTestPanel(geoms, pt.x, pt.y);
    const targetIdx = hitIdx >= 0 ? hitIdx : store.getState().selectedPanelIndex;
    if (hitIdx >= 0) store.selectPanel(hitIdx);

    const panel = store.getState().panels[targetIdx];
    if (!panel) return;

    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const nextZoom = clamp(Math.round(((panel.zoom ?? 1) + delta) * 100) / 100, 1, 2.6);
    if (nextZoom === panel.zoom) return;

    const recordNow = !wheelHistoryPending;
    wheelHistoryPending = true;
    clearTimeout(wheelCommitTimer);
    wheelCommitTimer = setTimeout(() => {
      wheelHistoryPending = false;
    }, 350);

    store.updatePanel(targetIdx, { zoom: nextZoom }, { recordHistory: recordNow });
  }, { passive: false });

  // Drag-and-drop image files directly onto a specific canvas panel
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    canvas.classList.add('is-drop-target');
  });

  canvas.addEventListener('dragleave', () => {
    canvas.classList.remove('is-drop-target');
  });

  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    canvas.classList.remove('is-drop-target');
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length === 0) return;

    if (files.length > 1 && typeof onDropMultiple === 'function') {
      await onDropMultiple(files);
      return;
    }

    const geoms = getGeometries();
    const pt = clientToCanvasPoint(canvas, e.clientX, e.clientY);
    const hitIdx = hitTestPanel(geoms, pt.x, pt.y);
    const targetIdx = hitIdx >= 0 ? hitIdx : store.getState().selectedPanelIndex;
    store.selectPanel(targetIdx);

    try {
      const rec = await replacePanelPhotoFromFile(files[0], targetIdx, store);
      onToast?.(`Dropped "${rec.name}" into Panel ${targetIdx + 1}`);
    } catch (err) {
      onToast?.(err.message || 'Could not load dropped image.', true);
    }
  });
}
