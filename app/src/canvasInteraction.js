// Direct canvas interactions for Vice City Studio:
// - Click panel to select
// - Drag inside panel to pan crop
// - Drag numbered panel badge (1..N) onto another panel to swap panels
// - Wheel over panel to zoom
// - Drag-and-drop local image files onto a panel (or batch drop)

import { hitTestPanel, hitTestPanelBadge } from './templates.js';
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
    const minDim = Math.min(canvas.width, canvas.height);

    // 1. Check numbered panel badge (1..N) first for drag-to-swap
    const badgeIdx = hitTestPanelBadge(geoms, pt.x, pt.y, minDim);
    if (badgeIdx >= 0) {
      store.selectPanel(badgeIdx);
      dragState = {
        mode: 'swap',
        pointerId: e.pointerId,
        sourceIndex: badgeIdx,
        targetIndex: badgeIdx,
        startX: pt.x,
        startY: pt.y,
        moved: false,
      };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Ignore synthetic event capture errors
      }
      canvas.classList.add('is-swapping');
      return;
    }

    // 2. Otherwise select panel & start pan-crop drag
    const hitIdx = hitTestPanel(geoms, pt.x, pt.y);
    if (hitIdx < 0) return;

    store.selectPanel(hitIdx);
    const panel = store.getState().panels[hitIdx];
    const photo = store.getPhoto(panel?.photoId);

    dragState = {
      mode: 'pan',
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
    const geoms = getGeometries();
    const pt = clientToCanvasPoint(canvas, e.clientX, e.clientY);

    if (!dragState) {
      const minDim = Math.min(canvas.width, canvas.height);
      const hoverBadge = hitTestPanelBadge(geoms, pt.x, pt.y, minDim);
      canvas.classList.toggle('is-badge-hover', hoverBadge >= 0);
      return;
    }

    if (e.pointerId !== dragState.pointerId) return;

    if (dragState.mode === 'swap') {
      const dx = pt.x - dragState.startX;
      const dy = pt.y - dragState.startY;
      if (Math.hypot(dx, dy) >= 6) {
        dragState.moved = true;
      }
      const hoverIdx = hitTestPanel(geoms, pt.x, pt.y);
      if (hoverIdx >= 0) {
        dragState.targetIndex = hoverIdx;
      }
      return;
    }

    if (!dragState.photo) return;

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

    if (dragState.mode === 'swap') {
      const geoms = getGeometries();
      let dropIdx = dragState.targetIndex;
      if (e && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
        const pt = clientToCanvasPoint(canvas, e.clientX, e.clientY);
        const hit = hitTestPanel(geoms, pt.x, pt.y);
        if (hit >= 0) dropIdx = hit;
      }
      if (dragState.moved && dropIdx >= 0 && dropIdx !== dragState.sourceIndex) {
        store.swapPanels(dragState.sourceIndex, dropIdx);
        onToast?.(`Swapped Panel ${dragState.sourceIndex + 1} ↔ Panel ${dropIdx + 1}`);
      }
    }

    try {
      canvas.releasePointerCapture(dragState.pointerId);
    } catch {
      // Ignore
    }
    dragState = null;
    canvas.classList.remove('is-dragging', 'is-swapping');
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
