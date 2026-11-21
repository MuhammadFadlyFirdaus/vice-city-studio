// Left Rail UI bindings (V3 Zero-Tab Pro Studio):
// ① ADD PHOTOS (+ CHOOSE PHOTOS, 8-Cast Demo, Auto-Fill, 4x2 numbered thumbnails 1..8),
// LAYOUT (3x2 mini SVG wireframe cards for 6 adaptive layouts),
// COLOUR GRADE (3x2 LIVE miniature graded canvas swatches + Poster Ink + Fine-Tune Effects).

import { POSTER_TEMPLATES, getTemplateById } from '../templates.js';
import { GRADE_PRESET_LIST, renderGradePreviewThumb, resolveGradePreset } from '../imageEffects.js';
import { computeFaceAwarePanelCrop } from '../faceCrop.js';
import { importPhotoFiles, loadSamplePhotos } from '../mediaManager.js';

function createTemplateMiniSvg(tpl) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 46 28');
  svg.setAttribute('width', '46');
  svg.setAttribute('height', '28');
  const colors = ['#ff3d9a', '#35e8ff', '#ff8c42', '#ffd166', '#b86bff', '#4ef2b8', '#ff5e7e'];
  const panels = tpl.layouts?.landscape || [];
  panels.forEach((p, idx) => {
    const poly = document.createElementNS(ns, 'polygon');
    const pts = p.poly
      .map(([nx, ny]) => `${(1.5 + nx * 43).toFixed(1)},${(1.5 + ny * 25).toFixed(1)}`)
      .join(' ');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', colors[idx % colors.length]);
    poly.setAttribute('fill-opacity', p.isHero ? '0.92' : '0.48');
    poly.setAttribute('stroke', '#090512');
    poly.setAttribute('stroke-width', '1.1');
    svg.appendChild(poly);
  });
  return svg;
}

export function initLeftSidebar(store, { onAutoFill, onResetDemoCast, getGeometries, onToast }) {
  const dropzone = document.getElementById('photo-dropzone');
  const fileInput = document.getElementById('photo-file-input');
  const btnDemoCast = document.getElementById('btn-demo-cast');
  const btnAutofill = document.getElementById('btn-autofill-panels');
  const photoTray = document.getElementById('photo-tray');
  const photoCount = document.getElementById('photo-count');
  const templateList = document.getElementById('template-list');
  const gradeGrid = document.getElementById('grade-preset-grid');

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

  // 1. Layout Cards (3x2 grid)
  function renderTemplateCards(activeId) {
    if (!templateList) return;
    templateList.textContent = '';
    const resolvedId = getTemplateById(activeId).id;
    for (const tpl of POSTER_TEMPLATES) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `layout-card${tpl.id === resolvedId ? ' is-active' : ''}`;
      card.dataset.templateId = tpl.id;
      card.title = `${tpl.name} — ${tpl.subtitle}`;

      const mini = document.createElement('div');
      mini.className = 'layout-mini';
      mini.appendChild(createTemplateMiniSvg(tpl));

      const nameEl = document.createElement('span');
      nameEl.className = 'layout-name';
      nameEl.textContent = tpl.name;

      card.append(mini, nameEl);
      card.addEventListener('click', () => {
        store.setTemplate(tpl.id, tpl.panelCount);
        onToast?.(`Layout: ${tpl.name} (${tpl.panelCount} panels)`);
      });
      templateList.appendChild(card);
    }
  }

  // 2. Colour Grade Swatches (3x2 LIVE miniature graded canvases from Hero photo)
  function renderGradePresets(activeGradeId, heroPhoto) {
    if (!gradeGrid) return;
    gradeGrid.textContent = '';
    const activeResolved = resolveGradePreset(activeGradeId).id;

    for (const preset of GRADE_PRESET_LIST) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `grade-card${preset.id === activeResolved ? ' is-active' : ''}`;
      btn.dataset.gradeId = preset.id;
      btn.title = preset.label;

      const thumbCanvas = renderGradePreviewThumb(heroPhoto, preset.id, 72, 42);
      const preview = document.createElement('canvas');
      preview.className = 'grade-thumb-canvas';
      preview.width = thumbCanvas.width;
      preview.height = thumbCanvas.height;
      const pctx = preview.getContext('2d');
      pctx.drawImage(thumbCanvas, 0, 0);

      const label = document.createElement('span');
      label.className = 'grade-label';
      label.textContent = preset.label;

      btn.append(preview, label);
      btn.addEventListener('click', () => {
        store.updateEffects({ gradePreset: preset.id });
        onToast?.(`Grade: ${preset.label}`);
      });
      gradeGrid.appendChild(btn);
    }
  }

  // 3. Local Photo Intake & Face-Aware Auto-Fill
  async function handleIncomingFiles(files) {
    if (!files || files.length === 0) return;
    const { imported, errors } = await importPhotoFiles(files, store);
    if (errors.length > 0) {
      onToast?.(errors[0], true);
    }
    if (imported.length > 0) {
      const userPhotos = store.listPhotos().filter((p) => !p.isSample);
      const pool = imported.length === 1 && userPhotos.length === 1
        ? [imported[0]]
        : userPhotos;
      if (typeof onAutoFill === 'function') {
        onAutoFill(pool, { silentToast: true });
      }
      const tpl = getTemplateById(store.getState().templateId);
      onToast?.(
        imported.length === 1
          ? `Loaded "${imported[0].name}" across ${tpl.panelCount} panels (Face-Aware)`
          : `Loaded ${imported.length} photos with Face-Aware Auto-Fill`,
      );
    }
  }

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

  btnDemoCast?.addEventListener('click', async () => {
    await loadSamplePhotos(store);
    if (typeof onResetDemoCast === 'function') {
      onResetDemoCast();
    } else if (typeof onAutoFill === 'function') {
      onAutoFill(store.listPhotos());
    }
    onToast?.('Loaded 8-Cast Demo portraits');
  });

  btnAutofill?.addEventListener('click', () => {
    if (typeof onAutoFill === 'function') {
      onAutoFill();
    }
  });

  // 4. Effects sliders wiring
  function bindRange(el, updater) {
    el?.addEventListener('input', () => updater(Number(el.value), false));
    el?.addEventListener('change', () => updater(Number(el.value), true));
  }

  bindRange(rangePainterly, (v, rec) => store.updateEffects({ painterly: v }, { recordHistory: rec }));
  bindRange(rangeBrightness, (v, rec) => store.updateEffects({ brightness: v }, { recordHistory: rec }));
  bindRange(rangeContrast, (v, rec) => store.updateEffects({ contrast: v }, { recordHistory: rec }));
  bindRange(rangeSaturation, (v, rec) => store.updateEffects({ saturation: v }, { recordHistory: rec }));
  bindRange(rangeSunsetOverlay, (v, rec) => store.updateEffects({ sunsetOverlay: v }, { recordHistory: rec }));
  bindRange(rangeNeonRim, (v, rec) => store.updateEffects({ neonRim: v }, { recordHistory: rec }));
  bindRange(rangeGrain, (v, rec) => store.updateEffects({ grain: v }, { recordHistory: rec }));
  bindRange(rangeVignette, (v, rec) => store.updateEffects({ vignette: v }, { recordHistory: rec }));

  // 5. 4x2 Compact Photo Thumbnail Grid (1..8 with HERO tag & delete button)
  function renderPhotoTray(state) {
    if (!photoTray) return;
    const list = store.listPhotos();
    if (photoCount) {
      photoCount.textContent = `${list.length} photo${list.length === 1 ? '' : 's'}`;
    }
    const activePanel = state.panels[state.selectedPanelIndex];
    photoTray.textContent = '';

    list.forEach((photo, idx) => {
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
        const panelIdx = store.getState().selectedPanelIndex;
        const geoms = typeof getGeometries === 'function' ? getGeometries() : [];
        const geom = geoms[panelIdx];
        const crop = geom
          ? computeFaceAwarePanelCrop(photo, geom.bounds, 0, Math.max(1, store.listPhotos().length))
          : { zoom: 1.04, panX: 0, panY: -0.22, flipX: false };
        store.updatePanel(panelIdx, {
          photoId: photo.id,
          zoom: crop.zoom,
          panX: crop.panX,
          panY: crop.panY,
          flipX: crop.flipX,
        });
        onToast?.(`Assigned "${photo.name}" to Panel ${panelIdx + 1}`);
      });

      const numBadge = document.createElement('span');
      numBadge.className = `photo-num-badge${idx === 0 ? ' is-hero' : ''}`;
      numBadge.textContent = idx === 0 ? '1 HERO' : String(idx + 1);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'photo-del-btn';
      delBtn.title = `Remove ${photo.name}`;
      delBtn.setAttribute('aria-label', `Remove ${photo.name}`);
      delBtn.textContent = '×';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        store.removePhoto(photo.id);
        onToast?.(`Removed "${photo.name}"`);
      });

      card.append(thumbBtn, numBadge, delBtn);
      photoTray.appendChild(card);
    });
  }

  let lastTemplateId = null;
  let lastGradeKey = null;

  function sync(state, reason) {
    const resolvedTplId = getTemplateById(state.templateId).id;
    if (lastTemplateId !== resolvedTplId) {
      renderTemplateCards(resolvedTplId);
      lastTemplateId = resolvedTplId;
    }

    const heroPhoto = store.getPhoto(state.panels[0]?.photoId) || store.listPhotos()[0] || null;
    const resolvedGrade = resolveGradePreset(state.effects.gradePreset).id;
    const gradeKey = `${resolvedGrade}|${heroPhoto?.id || 'none'}`;
    if (lastGradeKey !== gradeKey) {
      renderGradePresets(resolvedGrade, heroPhoto);
      lastGradeKey = gradeKey;
    }

    if (
      reason === 'init'
      || reason === 'photos'
      || reason === 'selection'
      || reason === 'panel'
      || reason === 'swap'
      || reason === 'autofill'
      || reason === 'undo'
      || reason === 'redo'
      || reason === 'reset'
    ) {
      renderPhotoTray(state);
    }

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
  }

  return { sync, handleIncomingFiles };
}
