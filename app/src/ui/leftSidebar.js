// Left sidebar UI bindings: Templates, Local Photos & Tray, Text controls, and Effects controls.

import { POSTER_TEMPLATES, getTemplateById, buildSmartAutoFillPanels } from '../templates.js';
import { importPhotoFiles } from '../mediaManager.js';

export const COLOR_GRADE_OPTIONS = [
  { id: 'vice-sunset', label: 'Vice Sunset', swatch: 'linear-gradient(135deg,#ff3d9a,#ff9f43)' },
  { id: 'miami-heat', label: 'Miami Heat', swatch: 'linear-gradient(135deg,#ff5e3a,#ffd166)' },
  { id: 'neon-midnight', label: 'Neon Midnight', swatch: 'linear-gradient(135deg,#ff2a9d,#2be7ff)' },
  { id: 'golden-hour', label: 'Golden Hour', swatch: 'linear-gradient(135deg,#f6b93b,#e55039)' },
  { id: 'ocean-drive', label: 'Ocean Drive', swatch: 'linear-gradient(135deg,#18dcff,#ff6b9d)' },
];

function createTemplateMiniSvg(tpl) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 56 36');
  svg.setAttribute('width', '56');
  svg.setAttribute('height', '36');
  const colors = ['#ff3d9a', '#35e8ff', '#ff8c42', '#ffd166', '#b86bff'];
  const panels = tpl.layouts?.landscape || [];
  panels.forEach((p, idx) => {
    const poly = document.createElementNS(ns, 'polygon');
    const pts = p.poly
      .map(([nx, ny]) => `${(2 + nx * 52).toFixed(1)},${(2 + ny * 32).toFixed(1)}`)
      .join(' ');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', colors[idx % colors.length]);
    poly.setAttribute('fill-opacity', p.isHero ? '0.88' : '0.46');
    poly.setAttribute('stroke', '#0b0713');
    poly.setAttribute('stroke-width', '1.4');
    svg.appendChild(poly);
  });
  return svg;
}

export function initLeftSidebar(store, { onToast }) {
  const tabBar = document.getElementById('sidebar-tabs');
  const templateList = document.getElementById('template-list');
  const dropzone = document.getElementById('photo-dropzone');
  const fileInput = document.getElementById('photo-file-input');
  const btnUpload = document.getElementById('btn-upload-photos');
  const btnAutofill = document.getElementById('btn-autofill-panels');
  const photoTray = document.getElementById('photo-tray');
  const photoCount = document.getElementById('photo-count');
  const gradeGrid = document.getElementById('grade-preset-grid');

  // Text controls
  const inputMainTitle = document.getElementById('input-main-title');
  const selectTitleFont = document.getElementById('select-title-font');
  const selectTitleStyle = document.getElementById('select-title-style');
  const selectTitlePos = document.getElementById('select-title-pos');
  const selectTitleAlign = document.getElementById('select-title-align');
  const rangeTitleSize = document.getElementById('range-title-size');
  const valTitleSize = document.getElementById('val-title-size');
  const rangeTitleOutline = document.getElementById('range-title-outline');
  const valTitleOutline = document.getElementById('val-title-outline');
  const rangeTitleShadow = document.getElementById('range-title-shadow');
  const valTitleShadow = document.getElementById('val-title-shadow');

  const inputSubtitle = document.getElementById('input-subtitle');
  const selectSubtitleFont = document.getElementById('select-subtitle-font');
  const inputSubtitleColor = document.getElementById('input-subtitle-color');
  const rangeSubtitleSize = document.getElementById('range-subtitle-size');
  const valSubtitleSize = document.getElementById('val-subtitle-size');
  const rangeSubtitleGlow = document.getElementById('range-subtitle-glow');
  const valSubtitleGlow = document.getElementById('val-subtitle-glow');
  const inputTagline = document.getElementById('input-tagline');
  const toggleRoleTags = document.getElementById('toggle-role-tags');
  const toggleEditionSeal = document.getElementById('toggle-edition-seal');
  const inputSealText = document.getElementById('input-seal-text');

  // Effects controls
  const rangePainterly = document.getElementById('range-painterly');
  const valPainterly = document.getElementById('val-painterly');
  const rangeBrightness = document.getElementById('range-brightness');
  const valBrightness = document.getElementById('val-brightness');
  const rangeContrast = document.getElementById('range-contrast');
  const valContrast = document.getElementById('val-contrast');
  const rangeSaturation = document.getElementById('range-saturation');
  const valSaturation = document.getElementById('val-saturation');
  const rangeSunsetOverlay = document.getElementById('range-sunset-overlay');
  const valSunsetOverlay = document.getElementById('val-sunset-overlay');
  const rangeNeonRim = document.getElementById('range-neon-rim');
  const valNeonRim = document.getElementById('val-neon-rim');
  const rangeGrain = document.getElementById('range-grain');
  const valGrain = document.getElementById('val-grain');
  const rangeVignette = document.getElementById('range-vignette');
  const valVignette = document.getElementById('val-vignette');
  const togglePalms = document.getElementById('toggle-palms');
  const toggleHorizonDisc = document.getElementById('toggle-horizon-disc');

  // 1. Tabs
  tabBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    store.setActiveTab(btn.dataset.tab);
  });

  // 2. Render Template Cards
  function renderTemplateCards(activeId) {
    if (!templateList) return;
    templateList.textContent = '';
    for (const tpl of POSTER_TEMPLATES) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `template-card${tpl.id === activeId ? ' is-active' : ''}`;
      card.dataset.templateId = tpl.id;

      const mini = document.createElement('div');
      mini.className = 'template-mini';
      mini.appendChild(createTemplateMiniSvg(tpl));

      const meta = document.createElement('div');
      meta.className = 'template-meta';
      const nameEl = document.createElement('span');
      nameEl.className = 'template-name';
      nameEl.textContent = tpl.name;
      const descEl = document.createElement('span');
      descEl.className = 'template-desc';
      descEl.textContent = tpl.subtitle;
      meta.append(nameEl, descEl);

      card.append(mini, meta);
      card.addEventListener('click', () => {
        store.setTemplate(tpl.id, tpl.panelCount);
        onToast?.(`Switched layout to ${tpl.name}`);
      });
      templateList.appendChild(card);
    }
  }

  // 3. Render Grade Preset Buttons
  function renderGradePresets(activeGrade) {
    if (!gradeGrid) return;
    gradeGrid.textContent = '';
    for (const preset of COLOR_GRADE_OPTIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-btn${preset.id === activeGrade ? ' is-active' : ''}`;
      btn.dataset.gradeId = preset.id;

      const swatch = document.createElement('span');
      swatch.className = 'preset-swatch';
      swatch.style.background = preset.swatch;

      const label = document.createElement('span');
      label.textContent = preset.label;

      btn.append(swatch, label);
      btn.addEventListener('click', () => {
        store.updateEffects({ gradePreset: preset.id });
      });
      gradeGrid.appendChild(btn);
    }
  }

  // 4. Local Photo Upload & Auto-Fill
  async function handleIncomingFiles(files) {
    if (!files || files.length === 0) return;
    const { imported, errors } = await importPhotoFiles(files, store);
    if (errors.length > 0) {
      onToast?.(errors[0], true);
    }
    if (imported.length > 0) {
      const st = store.getState();
      const tpl = getTemplateById(st.templateId);
      const userPhotos = store.listPhotos().filter((p) => !p.isSample);
      const sourceIds = imported.length === 1 && userPhotos.length === 1
        ? [imported[0].id]
        : userPhotos.map((p) => p.id);
      const filled = buildSmartAutoFillPanels(sourceIds, tpl.panelCount, st.panels);
      store.mutate((draft) => {
        for (let i = 0; i < filled.length; i++) {
          draft.panels[i] = filled[i];
        }
      }, { recordHistory: true, reason: 'autofill' });
      onToast?.(
        imported.length === 1
          ? `Loaded "${imported[0].name}" across ${tpl.panelCount} panels`
          : `Loaded ${imported.length} photos into cover panels`,
      );
    }
  }

  btnUpload?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput?.click();
    }
  });
  fileInput?.addEventListener('change', async (e) => {
    await handleIncomingFiles(e.target.files);
    fileInput.value = '';
  });

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  });
  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('is-dragover');
  });
  dropzone?.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
    if (e.dataTransfer?.files?.length) {
      await handleIncomingFiles(e.dataTransfer.files);
    }
  });

  btnAutofill?.addEventListener('click', () => {
    const allPhotos = store.listPhotos();
    if (allPhotos.length === 0) {
      onToast?.('Upload at least one photo first.', true);
      return;
    }
    const userOnly = allPhotos.filter((p) => !p.isSample);
    const pool = userOnly.length > 0 ? userOnly : allPhotos;
    const st = store.getState();
    const tpl = getTemplateById(st.templateId);
    const filled = buildSmartAutoFillPanels(pool.map((p) => p.id), tpl.panelCount, st.panels);
    store.mutate((draft) => {
      for (let i = 0; i < filled.length; i++) {
        draft.panels[i] = filled[i];
      }
    }, { recordHistory: true, reason: 'autofill' });
    onToast?.('Smart Upper-Third Auto-Fill applied');
  });

  // 5. Text Controls Wiring
  function bindTextInput(el, key, recordOnChangeOnly = true) {
    el?.addEventListener('input', () => {
      store.updateTypography({ [key]: el.value }, { recordHistory: !recordOnChangeOnly });
    });
    if (recordOnChangeOnly) {
      el?.addEventListener('change', () => {
        store.updateTypography({ [key]: el.value }, { recordHistory: true });
      });
    }
  }

  function bindRange(el, updater) {
    el?.addEventListener('input', () => updater(Number(el.value), false));
    el?.addEventListener('change', () => updater(Number(el.value), true));
  }

  bindTextInput(inputMainTitle, 'mainTitle', true);
  selectTitleFont?.addEventListener('change', () => store.updateTypography({ titleFont: selectTitleFont.value }));
  selectTitleStyle?.addEventListener('change', () => store.updateTypography({ titleStyle: selectTitleStyle.value }));
  selectTitlePos?.addEventListener('change', () => store.updateTypography({ titlePos: selectTitlePos.value }));
  selectTitleAlign?.addEventListener('change', () => store.updateTypography({ titleAlign: selectTitleAlign.value }));
  bindRange(rangeTitleSize, (v, rec) => store.updateTypography({ titleSize: v }, { recordHistory: rec }));
  bindRange(rangeTitleOutline, (v, rec) => store.updateTypography({ titleOutline: v }, { recordHistory: rec }));
  bindRange(rangeTitleShadow, (v, rec) => store.updateTypography({ titleShadow: v }, { recordHistory: rec }));

  bindTextInput(inputSubtitle, 'subtitle', true);
  selectSubtitleFont?.addEventListener('change', () => store.updateTypography({ subtitleFont: selectSubtitleFont.value }));
  inputSubtitleColor?.addEventListener('input', () => store.updateTypography({ subtitleColor: inputSubtitleColor.value }, { recordHistory: false }));
  inputSubtitleColor?.addEventListener('change', () => store.updateTypography({ subtitleColor: inputSubtitleColor.value }, { recordHistory: true }));
  bindRange(rangeSubtitleSize, (v, rec) => store.updateTypography({ subtitleSize: v }, { recordHistory: rec }));
  bindRange(rangeSubtitleGlow, (v, rec) => store.updateTypography({ subtitleGlow: v }, { recordHistory: rec }));

  bindTextInput(inputTagline, 'tagline', true);
  toggleRoleTags?.addEventListener('change', () => store.updateTypography({ showRoleTags: toggleRoleTags.checked }));
  toggleEditionSeal?.addEventListener('change', () => store.updateTypography({ showEditionSeal: toggleEditionSeal.checked }));
  bindTextInput(inputSealText, 'sealText', true);

  // 6. Effects Controls Wiring
  bindRange(rangePainterly, (v, rec) => store.updateEffects({ painterly: v }, { recordHistory: rec }));
  bindRange(rangeBrightness, (v, rec) => store.updateEffects({ brightness: v }, { recordHistory: rec }));
  bindRange(rangeContrast, (v, rec) => store.updateEffects({ contrast: v }, { recordHistory: rec }));
  bindRange(rangeSaturation, (v, rec) => store.updateEffects({ saturation: v }, { recordHistory: rec }));
  bindRange(rangeSunsetOverlay, (v, rec) => store.updateEffects({ sunsetOverlay: v }, { recordHistory: rec }));
  bindRange(rangeNeonRim, (v, rec) => store.updateEffects({ neonRim: v }, { recordHistory: rec }));
  bindRange(rangeGrain, (v, rec) => store.updateEffects({ grain: v }, { recordHistory: rec }));
  bindRange(rangeVignette, (v, rec) => store.updateEffects({ vignette: v }, { recordHistory: rec }));
  togglePalms?.addEventListener('change', () => store.updateEffects({ showPalms: togglePalms.checked }));
  toggleHorizonDisc?.addEventListener('change', () => store.updateEffects({ showHorizonDisc: toggleHorizonDisc.checked }));

  function renderPhotoTray(state) {
    if (!photoTray) return;
    const list = store.listPhotos();
    if (photoCount) {
      photoCount.textContent = `${list.length} photo${list.length === 1 ? '' : 's'}`;
    }
    const activePanel = state.panels[state.selectedPanelIndex];
    photoTray.textContent = '';

    for (const photo of list) {
      const card = document.createElement('div');
      card.className = `photo-item${activePanel?.photoId === photo.id ? ' is-assigned' : ''}`;

      const thumbBtn = document.createElement('button');
      thumbBtn.type = 'button';
      thumbBtn.className = 'photo-thumb-btn';
      thumbBtn.title = `Assign "${photo.name}" to Panel ${state.selectedPanelIndex + 1}`;
      const img = document.createElement('img');
      img.src = photo.thumbUrl;
      img.alt = photo.name;
      thumbBtn.appendChild(img);
      thumbBtn.addEventListener('click', () => {
        const idx = store.getState().selectedPanelIndex;
        store.updatePanel(idx, { photoId: photo.id, zoom: 1.04, panX: 0, panY: -0.2, flipX: false });
        onToast?.(`Assigned "${photo.name}" to Panel ${idx + 1}`);
      });

      const bar = document.createElement('div');
      bar.className = 'photo-item-bar';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'photo-item-name';
      nameSpan.textContent = photo.name;
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'photo-del-btn';
      delBtn.title = `Remove ${photo.name}`;
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => {
        store.removePhoto(photo.id);
        onToast?.(`Removed "${photo.name}"`);
      });
      bar.append(nameSpan, delBtn);

      card.append(thumbBtn, bar);
      photoTray.appendChild(card);
    }
  }

  let lastTemplateCount = -1;
  let lastTemplateId = null;
  let lastGradeId = null;

  function sync(state, reason) {
    // Active tab sync
    if (tabBar) {
      for (const btn of tabBar.querySelectorAll('button[data-tab]')) {
        const isActive = btn.dataset.tab === state.activeTab;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      }
    }
    for (const panel of document.querySelectorAll('#studio-sidebar .tab-panel')) {
      panel.classList.toggle('is-active', panel.id === `tab-${state.activeTab}`);
    }

    if (lastTemplateId !== state.templateId || lastTemplateCount !== POSTER_TEMPLATES.length) {
      renderTemplateCards(state.templateId);
      lastTemplateId = state.templateId;
      lastTemplateCount = POSTER_TEMPLATES.length;
    }

    if (lastGradeId !== state.effects.gradePreset) {
      renderGradePresets(state.effects.gradePreset);
      lastGradeId = state.effects.gradePreset;
    }

    if (reason === 'init' || reason === 'photos' || reason === 'selection' || reason === 'panel' || reason === 'autofill' || reason === 'undo' || reason === 'redo' || reason === 'reset') {
      renderPhotoTray(state);
    }

    // Typography sync
    const t = state.typography;
    if (inputMainTitle && document.activeElement !== inputMainTitle) inputMainTitle.value = t.mainTitle;
    if (selectTitleFont) selectTitleFont.value = t.titleFont;
    if (selectTitleStyle) selectTitleStyle.value = t.titleStyle;
    if (selectTitlePos) selectTitlePos.value = t.titlePos;
    if (selectTitleAlign) selectTitleAlign.value = t.titleAlign;
    if (rangeTitleSize) rangeTitleSize.value = String(t.titleSize);
    if (valTitleSize) valTitleSize.textContent = `${t.titleSize}%`;
    if (rangeTitleOutline) rangeTitleOutline.value = String(t.titleOutline);
    if (valTitleOutline) valTitleOutline.textContent = String(t.titleOutline);
    if (rangeTitleShadow) rangeTitleShadow.value = String(t.titleShadow);
    if (valTitleShadow) valTitleShadow.textContent = String(t.titleShadow);

    if (inputSubtitle && document.activeElement !== inputSubtitle) inputSubtitle.value = t.subtitle;
    if (selectSubtitleFont) selectSubtitleFont.value = t.subtitleFont;
    if (inputSubtitleColor) inputSubtitleColor.value = t.subtitleColor;
    if (rangeSubtitleSize) rangeSubtitleSize.value = String(t.subtitleSize);
    if (valSubtitleSize) valSubtitleSize.textContent = `${t.subtitleSize}%`;
    if (rangeSubtitleGlow) rangeSubtitleGlow.value = String(t.subtitleGlow);
    if (valSubtitleGlow) valSubtitleGlow.textContent = `${t.subtitleGlow}%`;
    if (inputTagline && document.activeElement !== inputTagline) inputTagline.value = t.tagline;
    if (toggleRoleTags) toggleRoleTags.checked = Boolean(t.showRoleTags);
    if (toggleEditionSeal) toggleEditionSeal.checked = Boolean(t.showEditionSeal);
    if (inputSealText && document.activeElement !== inputSealText) inputSealText.value = t.sealText;

    // Effects sync
    const fx = state.effects;
    if (rangePainterly) rangePainterly.value = String(fx.painterly);
    if (valPainterly) valPainterly.textContent = `${fx.painterly}%`;
    if (rangeBrightness) rangeBrightness.value = String(fx.brightness);
    if (valBrightness) valBrightness.textContent = `${fx.brightness}%`;
    if (rangeContrast) rangeContrast.value = String(fx.contrast);
    if (valContrast) valContrast.textContent = `${fx.contrast}%`;
    if (rangeSaturation) rangeSaturation.value = String(fx.saturation);
    if (valSaturation) valSaturation.textContent = `${fx.saturation}%`;
    if (rangeSunsetOverlay) rangeSunsetOverlay.value = String(fx.sunsetOverlay);
    if (valSunsetOverlay) valSunsetOverlay.textContent = `${fx.sunsetOverlay}%`;
    if (rangeNeonRim) rangeNeonRim.value = String(fx.neonRim);
    if (valNeonRim) valNeonRim.textContent = `${fx.neonRim}%`;
    if (rangeGrain) rangeGrain.value = String(fx.grain);
    if (valGrain) valGrain.textContent = `${fx.grain}%`;
    if (rangeVignette) rangeVignette.value = String(fx.vignette);
    if (valVignette) valVignette.textContent = `${fx.vignette}%`;
    if (togglePalms) togglePalms.checked = Boolean(fx.showPalms);
    if (toggleHorizonDisc) toggleHorizonDisc.checked = Boolean(fx.showHorizonDisc);
  }

  return { sync, handleIncomingFiles };
}
