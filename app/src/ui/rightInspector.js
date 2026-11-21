// Right Rail (② CAPTION & FRAME + ③ EXPORT PNG) and Center Stage Toolbar /
// Format Selector / Live 3-Size Preview Strip bindings for V3 Pro Studio.

import { getTemplateById } from '../templates.js';
import { computeFaceAwarePanelCrop } from '../faceCrop.js';

export function initRightInspector(
  store,
  { onExport, onExportAll, onAutoFill, getGeometries, onToast },
) {
  // Center stage format pills & live 3-size strip
  const formatWrap = document.getElementById('format-selector');
  const sizeStrip = document.getElementById('live-size-strip');
  const stageDims = document.getElementById('stage-dims');

  // Inline panel toolbar (center stage)
  const selectedBadge = document.getElementById('selected-panel-badge');
  const btnPrevPhoto = document.getElementById('btn-prev-photo');
  const btnNextPhoto = document.getElementById('btn-next-photo');
  const btnFlip = document.getElementById('btn-panel-flip');
  const rangeZoom = document.getElementById('range-panel-zoom');
  const valZoom = document.getElementById('val-panel-zoom');
  const btnFaceFit = document.getElementById('btn-panel-face-fit');
  const btnResetCrop = document.getElementById('btn-panel-reset-crop');
  const btnStageAutofill = document.getElementById('btn-stage-autofill');

  // Right rail: Caption & Style
  const inputMainTitle = document.getElementById('input-main-title');
  const selectTitleFont = document.getElementById('select-title-font');
  const selectTitleStyle = document.getElementById('select-title-style');
  const inputSubtitle = document.getElementById('input-subtitle');
  const selectSubtitleFont = document.getElementById('select-subtitle-font');
  const inputSubtitleColor = document.getElementById('input-subtitle-color');
  const inputTagline = document.getElementById('input-tagline');

  // Right rail: Critic Strip, Billing, Seal
  const inputCriticQuote = document.getElementById('input-critic-quote');
  const inputCriticSource = document.getElementById('input-critic-source');
  const inputEditionVol = document.getElementById('input-edition-vol');
  const inputBillingCredits = document.getElementById('input-billing-credits');
  const inputSealText = document.getElementById('input-seal-text');
  const inputComingSoon = document.getElementById('input-coming-soon');

  // Right rail: Compact Toggle Chips
  const toggleCollectorFrame = document.getElementById('toggle-collector-frame');
  const toggleRoleTags = document.getElementById('toggle-role-tags');
  const toggleEditionSeal = document.getElementById('toggle-edition-seal');
  const toggleHorizonDisc = document.getElementById('toggle-horizon-disc');
  const toggleInnerHairline = document.getElementById('toggle-inner-hairline');
  const togglePalms = document.getElementById('toggle-palms');

  // Right rail: Collapsible typography fine-tune
  const selectTitlePos = document.getElementById('select-title-pos');
  const selectTitleAlign = document.getElementById('select-title-align');
  const rangeTitleSize = document.getElementById('range-title-size');
  const valTitleSize = document.getElementById('val-title-size');
  const rangeTitleOutline = document.getElementById('range-title-outline');
  const valTitleOutline = document.getElementById('val-title-outline');
  const rangeTitleShadow = document.getElementById('range-title-shadow');
  const valTitleShadow = document.getElementById('val-title-shadow');
  const rangeSubtitleSize = document.getElementById('range-subtitle-size');
  const valSubtitleSize = document.getElementById('val-subtitle-size');
  const rangeSubtitleGlow = document.getElementById('range-subtitle-glow');
  const valSubtitleGlow = document.getElementById('val-subtitle-glow');
  const inputSealRing = document.getElementById('input-seal-ring');

  // Right rail: 2-col Cast Name Tags
  const castRoleGrid = document.getElementById('cast-role-grid');

  // Right rail: Pinned ③ EXPORT PNG
  const exportMeta = document.getElementById('export-card-meta');
  const exportButtons = document.querySelectorAll('button[data-export-format]');
  const btnExportAll = document.getElementById('btn-export-all');

  // 1. Format selector pills & live 3-size strip clicks
  formatWrap?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-format]');
    if (!btn) return;
    store.setFormat(btn.dataset.format);
  });

  sizeStrip?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-format]');
    if (!btn) return;
    store.setFormat(btn.dataset.format);
  });

  // 2. Inline Panel Quick Toolbar
  function cyclePanelPhoto(direction) {
    const photos = store.listPhotos();
    if (photos.length === 0) {
      onToast?.('Add at least one photo first.', true);
      return;
    }
    const st = store.getState();
    const idx = st.selectedPanelIndex;
    const panel = st.panels[idx];
    const curPos = photos.findIndex((p) => p.id === panel?.photoId);
    const nextPos = curPos < 0
      ? 0
      : (curPos + direction + photos.length) % photos.length;
    const nextPhoto = photos[nextPos];
    const geoms = typeof getGeometries === 'function' ? getGeometries() : [];
    const geom = geoms[idx];
    const crop = geom
      ? computeFaceAwarePanelCrop(nextPhoto, geom.bounds, 0, photos.length)
      : { zoom: 1.04, panX: 0, panY: -0.20, flipX: false };

    store.updatePanel(idx, {
      photoId: nextPhoto.id,
      zoom: crop.zoom,
      panX: crop.panX,
      panY: crop.panY,
      flipX: crop.flipX,
    });
    onToast?.(`Panel ${idx + 1}: "${nextPhoto.name}"`);
  }

  btnPrevPhoto?.addEventListener('click', () => cyclePanelPhoto(-1));
  btnNextPhoto?.addEventListener('click', () => cyclePanelPhoto(1));

  btnFlip?.addEventListener('click', () => {
    const st = store.getState();
    const idx = st.selectedPanelIndex;
    const cur = st.panels[idx];
    if (!cur) return;
    store.updatePanel(idx, { flipX: !cur.flipX }, { recordHistory: true });
  });

  rangeZoom?.addEventListener('input', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { zoom: Number(rangeZoom.value) / 100 }, { recordHistory: false });
  });
  rangeZoom?.addEventListener('change', () => {
    const idx = store.getState().selectedPanelIndex;
    store.updatePanel(idx, { zoom: Number(rangeZoom.value) / 100 }, { recordHistory: true });
  });

  btnFaceFit?.addEventListener('click', () => {
    const st = store.getState();
    const idx = st.selectedPanelIndex;
    const panel = st.panels[idx];
    const photo = store.getPhoto(panel?.photoId);
    if (!photo) {
      onToast?.(`Panel ${idx + 1} has no photo assigned.`, true);
      return;
    }
    const geoms = typeof getGeometries === 'function' ? getGeometries() : [];
    const geom = geoms[idx];
    if (!geom) return;
    const crop = computeFaceAwarePanelCrop(photo, geom.bounds, 0, Math.max(1, store.listPhotos().length));
    store.updatePanel(idx, {
      zoom: crop.zoom,
      panX: crop.panX,
      panY: crop.panY,
      flipX: crop.flipX,
    }, { recordHistory: true });
    onToast?.(`Face-Fit centered Panel ${idx + 1}`);
  });

  btnResetCrop?.addEventListener('click', () => {
    const idx = store.getState().selectedPanelIndex;
    store.resetPanelCrop(idx);
    onToast?.(`Reset Panel ${idx + 1} crop`);
  });

  btnStageAutofill?.addEventListener('click', () => {
    onAutoFill?.();
  });

  // 3. Caption, Frame, Seal & Toggle Chips Wiring
  function bindTypoText(el, key) {
    el?.addEventListener('input', () => {
      store.updateTypography({ [key]: el.value }, { recordHistory: false });
    });
    el?.addEventListener('change', () => {
      store.updateTypography({ [key]: el.value }, { recordHistory: true });
    });
  }

  function bindFrameText(el, key) {
    el?.addEventListener('input', () => {
      store.updateFrame({ [key]: el.value }, { recordHistory: false });
    });
    el?.addEventListener('change', () => {
      store.updateFrame({ [key]: el.value }, { recordHistory: true });
    });
  }

  function bindRange(el, updater) {
    el?.addEventListener('input', () => updater(Number(el.value), false));
    el?.addEventListener('change', () => updater(Number(el.value), true));
  }

  bindTypoText(inputMainTitle, 'mainTitle');
  selectTitleFont?.addEventListener('change', () => store.updateTypography({ titleFont: selectTitleFont.value }));
  selectTitleStyle?.addEventListener('change', () => store.updateTypography({ titleStyle: selectTitleStyle.value }));
  bindTypoText(inputSubtitle, 'subtitle');
  selectSubtitleFont?.addEventListener('change', () => store.updateTypography({ subtitleFont: selectSubtitleFont.value }));
  inputSubtitleColor?.addEventListener('input', () => store.updateTypography({ subtitleColor: inputSubtitleColor.value }, { recordHistory: false }));
  inputSubtitleColor?.addEventListener('change', () => store.updateTypography({ subtitleColor: inputSubtitleColor.value }, { recordHistory: true }));
  bindTypoText(inputTagline, 'tagline');
  bindTypoText(inputSealText, 'sealText');
  bindTypoText(inputSealRing, 'sealRingText');

  bindFrameText(inputCriticQuote, 'criticQuote');
  bindFrameText(inputCriticSource, 'criticSource');
  bindFrameText(inputEditionVol, 'editionVol');
  bindFrameText(inputBillingCredits, 'billingCredits');
  bindFrameText(inputComingSoon, 'comingSoonText');

  toggleCollectorFrame?.addEventListener('change', () => {
    store.updateFrame({ showCollectorFrame: toggleCollectorFrame.checked });
  });
  toggleRoleTags?.addEventListener('change', () => {
    store.updateTypography({ showRoleTags: toggleRoleTags.checked });
  });
  toggleEditionSeal?.addEventListener('change', () => {
    store.updateTypography({ showEditionSeal: toggleEditionSeal.checked });
  });
  toggleHorizonDisc?.addEventListener('change', () => {
    store.updateEffects({ showHorizonDisc: toggleHorizonDisc.checked });
  });
  toggleInnerHairline?.addEventListener('change', () => {
    store.updateFrame({ showInnerHairline: toggleInnerHairline.checked });
  });
  togglePalms?.addEventListener('change', () => {
    store.updateEffects({ showPalms: togglePalms.checked });
  });

  selectTitlePos?.addEventListener('change', () => store.updateTypography({ titlePos: selectTitlePos.value }));
  selectTitleAlign?.addEventListener('change', () => store.updateTypography({ titleAlign: selectTitleAlign.value }));
  bindRange(rangeTitleSize, (v, rec) => store.updateTypography({ titleSize: v }, { recordHistory: rec }));
  bindRange(rangeTitleOutline, (v, rec) => store.updateTypography({ titleOutline: v }, { recordHistory: rec }));
  bindRange(rangeTitleShadow, (v, rec) => store.updateTypography({ titleShadow: v }, { recordHistory: rec }));
  bindRange(rangeSubtitleSize, (v, rec) => store.updateTypography({ subtitleSize: v }, { recordHistory: rec }));
  bindRange(rangeSubtitleGlow, (v, rec) => store.updateTypography({ subtitleGlow: v }, { recordHistory: rec }));

  // 4. Pinned ③ EXPORT PNG Buttons
  exportButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const fmtId = btn.dataset.exportFormat;
      onExport?.(fmtId);
    });
  });

  btnExportAll?.addEventListener('click', () => {
    onExportAll?.();
  });

  // 5. Dynamic 2-column Cast Name Tags inputs
  let renderedRoleCount = -1;
  function ensureCastRoleInputs(panelCount) {
    if (!castRoleGrid || renderedRoleCount === panelCount) return;
    castRoleGrid.textContent = '';
    for (let i = 0; i < panelCount; i++) {
      const wrap = document.createElement('label');
      wrap.className = 'cast-tag-field';

      const tagIdx = document.createElement('span');
      tagIdx.className = 'cast-tag-idx';
      tagIdx.textContent = `P${i + 1}`;

      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 18;
      input.dataset.panelRoleIndex = String(i);
      input.setAttribute('aria-label', `Panel ${i + 1} cast tag`);

      input.addEventListener('focus', () => {
        store.selectPanel(i);
      });
      input.addEventListener('input', () => {
        store.updatePanel(i, { role: input.value }, { recordHistory: false });
      });
      input.addEventListener('change', () => {
        store.updatePanel(i, { role: input.value }, { recordHistory: true });
      });

      wrap.append(tagIdx, input);
      castRoleGrid.appendChild(wrap);
    }
    renderedRoleCount = panelCount;
  }

  function sync(state) {
    const tpl = getTemplateById(state.templateId);
    const fmt = store.getFormat();
    const count = tpl.panelCount;
    const selIdx = Math.min(state.selectedPanelIndex, count - 1);
    const panel = state.panels[selIdx];

    // Format pills & live 3-size strip active state
    if (formatWrap) {
      for (const btn of formatWrap.querySelectorAll('button[data-format]')) {
        btn.classList.toggle('is-active', btn.dataset.format === state.formatId);
      }
    }
    if (sizeStrip) {
      for (const btn of sizeStrip.querySelectorAll('button[data-format]')) {
        btn.classList.toggle('is-active', btn.dataset.format === state.formatId);
      }
    }

    if (stageDims) {
      stageDims.textContent = `${fmt.width}×${fmt.height} • ${tpl.name} • Face-Aware`;
    }
    if (exportMeta) {
      exportMeta.textContent = `${fmt.width}×${fmt.height} (${fmt.shortLabel})`;
    }

    // Inline panel toolbar sync
    if (selectedBadge) {
      selectedBadge.textContent = `PANEL ${selIdx + 1}`;
    }
    if (panel) {
      const zoomPct = Math.round((panel.zoom ?? 1) * 100);
      if (rangeZoom) rangeZoom.value = String(zoomPct);
      if (valZoom) valZoom.textContent = `${(zoomPct / 100).toFixed(2)}×`;
      if (btnFlip) btnFlip.classList.toggle('is-active', Boolean(panel.flipX));
    }

    // Typography & Frame sync
    const t = state.typography;
    if (inputMainTitle && document.activeElement !== inputMainTitle) inputMainTitle.value = t.mainTitle;
    if (selectTitleFont) selectTitleFont.value = t.titleFont;
    if (selectTitleStyle) selectTitleStyle.value = t.titleStyle;
    if (inputSubtitle && document.activeElement !== inputSubtitle) inputSubtitle.value = t.subtitle;
    if (selectSubtitleFont) selectSubtitleFont.value = t.subtitleFont;
    if (inputSubtitleColor) inputSubtitleColor.value = t.subtitleColor;
    if (inputTagline && document.activeElement !== inputTagline) inputTagline.value = t.tagline;
    if (inputSealText && document.activeElement !== inputSealText) inputSealText.value = t.sealText;
    if (inputSealRing && document.activeElement !== inputSealRing) inputSealRing.value = t.sealRingText || '';

    if (selectTitlePos) selectTitlePos.value = t.titlePos;
    if (selectTitleAlign) selectTitleAlign.value = t.titleAlign;
    if (rangeTitleSize) rangeTitleSize.value = String(t.titleSize);
    if (valTitleSize) valTitleSize.textContent = `${t.titleSize}%`;
    if (rangeTitleOutline) rangeTitleOutline.value = String(t.titleOutline);
    if (valTitleOutline) valTitleOutline.textContent = String(t.titleOutline);
    if (rangeTitleShadow) rangeTitleShadow.value = String(t.titleShadow);
    if (valTitleShadow) valTitleShadow.textContent = String(t.titleShadow);
    if (rangeSubtitleSize) rangeSubtitleSize.value = String(t.subtitleSize);
    if (valSubtitleSize) valSubtitleSize.textContent = `${t.subtitleSize}%`;
    if (rangeSubtitleGlow) rangeSubtitleGlow.value = String(t.subtitleGlow);
    if (valSubtitleGlow) valSubtitleGlow.textContent = `${t.subtitleGlow}%`;

    const f = state.frame || {};
    const frameOn = Boolean(f.showCollectorFrame);
    if (inputCriticQuote && document.activeElement !== inputCriticQuote) inputCriticQuote.value = f.criticQuote || '';
    if (inputCriticSource && document.activeElement !== inputCriticSource) inputCriticSource.value = f.criticSource || '';
    if (inputEditionVol && document.activeElement !== inputEditionVol) inputEditionVol.value = f.editionVol || '';
    if (inputBillingCredits && document.activeElement !== inputBillingCredits) inputBillingCredits.value = f.billingCredits || '';
    if (inputComingSoon && document.activeElement !== inputComingSoon) inputComingSoon.value = f.comingSoonText || '';

    if (toggleCollectorFrame) toggleCollectorFrame.checked = frameOn;
    if (toggleRoleTags) toggleRoleTags.checked = Boolean(t.showRoleTags);
    if (toggleEditionSeal) toggleEditionSeal.checked = Boolean(t.showEditionSeal);
    if (toggleHorizonDisc) toggleHorizonDisc.checked = Boolean(state.effects.showHorizonDisc);
    if (toggleInnerHairline) {
      toggleInnerHairline.checked = Boolean(f.showInnerHairline);
      toggleInnerHairline.disabled = !frameOn;
    }
    if (togglePalms) togglePalms.checked = Boolean(state.effects.showPalms);

    // 2-col Cast Name Tags inputs
    ensureCastRoleInputs(count);
    if (castRoleGrid) {
      for (const field of castRoleGrid.querySelectorAll('.cast-tag-field')) {
        const inp = field.querySelector('input');
        if (!inp) continue;
        const idx = Number(inp.dataset.panelRoleIndex);
        field.classList.toggle('is-selected', idx === selIdx);
        if (document.activeElement !== inp) {
          inp.value = state.panels[idx]?.role || '';
        }
      }
    }
  }

  return { sync };
}
