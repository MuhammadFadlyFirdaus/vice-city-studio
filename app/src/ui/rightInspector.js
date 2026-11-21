// Right inspector UI bindings: Panel selector pills, per-panel Replace/Remove photo,
// Zoom, Pan X/Y, Flip Horizontal, Reset Crop, Panel Role label, and export summary.

import { getTemplateById } from '../templates.js';
import { replacePanelPhotoFromFile } from '../mediaManager.js';

export function initRightInspector(store, { onExport, onToast }) {
  const panelPills = document.getElementById('panel-pills');
  const selectedBadge = document.getElementById('selected-panel-badge');
  const photoNameEl = document.getElementById('inspector-photo-name');
  const btnReplace = document.getElementById('btn-panel-replace');
  const btnRemove = document.getElementById('btn-panel-remove');
  const replaceInput = document.getElementById('panel-replace-input');

  const rangeZoom = document.getElementById('range-panel-zoom');
  const valZoom = document.getElementById('val-panel-zoom');
  const rangePanX = document.getElementById('range-panel-pan-x');
  const valPanX = document.getElementById('val-panel-pan-x');
  const rangePanY = document.getElementById('range-panel-pan-y');
  const valPanY = document.getElementById('val-panel-pan-y');
  const btnFlip = document.getElementById('btn-panel-flip');
  const btnResetCrop = document.getElementById('btn-panel-reset-crop');
  const inputRole = document.getElementById('input-panel-role');

  const exportMeta = document.getElementById('export-card-meta');
  const btnExportSecondary = document.getElementById('btn-export-secondary');
  const stageDims = document.getElementById('stage-dims');

  btnReplace?.addEventListener('click', () => replaceInput?.click());
  replaceInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const idx = store.getState().selectedPanelIndex;
    try {
      const rec = await replacePanelPhotoFromFile(file, idx, store);
      onToast?.(`Replaced Panel ${idx + 1} with "${rec.name}"`);
    } catch (err) {
      onToast?.(err.message || 'Could not load image.', true);
    }
    replaceInput.value = '';
  });

  btnRemove?.addEventListener('click', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { photoId: null });
    onToast?.(`Cleared Panel ${idx + 1}`);
  });

  rangeZoom?.addEventListener('input', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { zoom: Number(rangeZoom.value) / 100 }, { recordHistory: false });
  });
  rangeZoom?.addEventListener('change', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { zoom: Number(rangeZoom.value) / 100 }, { recordHistory: true });
  });

  rangePanX?.addEventListener('input', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { panX: Number(rangePanX.value) / 100 }, { recordHistory: false });
  });
  rangePanX?.addEventListener('change', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { panX: Number(rangePanX.value) / 100 }, { recordHistory: true });
  });

  rangePanY?.addEventListener('input', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { panY: Number(rangePanY.value) / 100 }, { recordHistory: false });
  });
  rangePanY?.addEventListener('change', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { panY: Number(rangePanY.value) / 100 }, { recordHistory: true });
  });

  btnFlip?.addEventListener('click', () => {
    const st = store.getState();
    const idx = st.selectedPanelIndex;
    const cur = st.panels[idx];
    if (!cur) return;
    store.updatePanel(idx, { flipX: !cur.flipX }, { recordHistory: true });
  });

  btnResetCrop?.addEventListener('click', () => {
    const idx = store.getState().selectedPanelIndex;
    store.resetPanelCrop(idx);
    onToast?.(`Reset Panel ${idx + 1} crop`);
  });

  inputRole?.addEventListener('input', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { role: inputRole.value }, { recordHistory: false });
  });
  inputRole?.addEventListener('change', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { role: inputRole.value }, { recordHistory: true });
  });

  btnExportSecondary?.addEventListener('click', () => {
    onExport?.();
  });

  function sync(state) {
    const tpl = getTemplateById(state.templateId);
    const fmt = store.getFormat();
    const count = tpl.panelCount;
    const selIdx = Math.min(state.selectedPanelIndex, count - 1);
    const panel = state.panels[selIdx];

    if (panelPills) {
      panelPills.textContent = '';
      for (let i = 0; i < count; i++) {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `panel-pill${i === selIdx ? ' is-active' : ''}`;
        pill.textContent = `P${i + 1}`;
        pill.addEventListener('click', () => store.selectPanel(i));
        panelPills.appendChild(pill);
      }
    }

    if (selectedBadge) {
      selectedBadge.textContent = `Panel ${selIdx + 1}${selIdx === 0 ? ' • Hero' : ''}`;
    }

    const assignedPhoto = panel ? store.getPhoto(panel.photoId) : null;
    if (photoNameEl) {
      photoNameEl.textContent = assignedPhoto ? assignedPhoto.name : 'Empty';
    }

    if (panel) {
      const zoomPct = Math.round((panel.zoom ?? 1) * 100);
      const panXPct = Math.round((panel.panX ?? 0) * 100);
      const panYPct = Math.round((panel.panY ?? -0.18) * 100);
      if (rangeZoom) rangeZoom.value = String(zoomPct);
      if (valZoom) valZoom.textContent = `${(zoomPct / 100).toFixed(2)}×`;
      if (rangePanX) rangePanX.value = String(panXPct);
      if (valPanX) valPanX.textContent = `${panXPct}%`;
      if (rangePanY) rangePanY.value = String(panYPct);
      if (valPanY) valPanY.textContent = `${panYPct}%`;
      if (btnFlip) btnFlip.classList.toggle('is-active', Boolean(panel.flipX));
      if (inputRole && document.activeElement !== inputRole) {
        inputRole.value = panel.role || '';
      }
    }

    if (exportMeta) {
      exportMeta.textContent = `${fmt.width} × ${fmt.height} px (${fmt.ratioLabel})`;
    }
    if (stageDims) {
      stageDims.textContent = `${fmt.width} × ${fmt.height} px • ${tpl.name}`;
    }
  }

  return { sync };
}
