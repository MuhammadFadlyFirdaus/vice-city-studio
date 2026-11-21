// Main application orchestrator for Vice City Studio (V3 Rank #1).
// Loads 4 bundled SIL OFL fonts & 8 original demo cast portraits, wires the Zero-Tab
// 3-Step Pro Studio UI, live 3-size preview strip, canvas pan/zoom/badge-swap/drop,
// global clipboard paste, face-aware auto-fill, batch 3-size PNG export, keyboard
// shortcuts (Ctrl+Z / Ctrl+Y), and deterministic ?shot= screenshot scenes.

import { renderLiveSizePreviews, renderPoster } from './posterRenderer.js';
import { getTemplateById, resolveTemplatePanels } from './templates.js';
import { buildFaceAwareAutoFill, computeFaceAwarePanelCrop } from './faceCrop.js';
import { getCollectorFrameMetrics } from './overlays.js';
import { exportAllThreeSizes, exportCoverPng, renderExportPngBlob } from './exportEngine.js';
import { loadSamplePhotos } from './mediaManager.js';
import { initCanvasInteraction } from './canvasInteraction.js';
import { DEFAULT_PANEL_ROLES, EXPORT_FORMATS, studioStore } from './state.js';
import { initTopBar } from './ui/topBar.js';
import { initLeftSidebar } from './ui/leftSidebar.js';
import { initRightInspector } from './ui/rightInspector.js';

const BUNDLED_FONT_SPECS = [
  '400 48px "Anton"',
  '400 48px "Bebas Neue"',
  '400 48px "Pacifico"',
  '600 24px "Oswald"',
];

const DEMO_CAST_IDS = [
  'sample-hero-kingpin',
  'sample-boulevard',
  'sample-night-rider',
  'sample-crimson-mechanic',
  'sample-pier',
  'sample-rooftop',
  'sample-lookout',
  'sample-boss',
];

let toastTimer = null;
let lastPanelGeometries = [];
let renderScheduled = false;

function computeGeometriesForState(state) {
  const fmt = EXPORT_FORMATS[state.formatId] || EXPORT_FORMATS.landscape;
  const tpl = getTemplateById(state.templateId);
  const frameMetrics = getCollectorFrameMetrics(fmt.width, fmt.height, state.frame || {});
  return resolveTemplatePanels(tpl.id, fmt.id, fmt.width, fmt.height, {
    topInset: frameMetrics.topInset,
    bottomInset: frameMetrics.bottomInset,
  });
}

export async function bootstrapViceCityStudio() {
  const canvas = document.getElementById('poster-canvas');
  if (!canvas) return;

  const params = new URLSearchParams(window.location.search);
  const shotMode = params.get('shot');
  const isCoverShot = shotMode === 'cover';
  if (isCoverShot) {
    document.body.classList.add('shot-cover');
  }

  const previewCanvasMap = {
    square: document.getElementById('preview-canvas-square'),
    portrait: document.getElementById('preview-canvas-portrait'),
    landscape: document.getElementById('preview-canvas-landscape'),
  };

  const applyFaceAwareAutoFill = (poolOverride = null, { silentToast = false } = {}) => {
    const allPhotos = studioStore.listPhotos();
    if (allPhotos.length === 0) {
      if (!silentToast) showToast('Add at least one photo first.', true);
      return [];
    }
    const userOnly = allPhotos.filter((p) => !p.isSample);
    const pool = poolOverride && poolOverride.length > 0
      ? poolOverride
      : (userOnly.length > 0 ? userOnly : allPhotos);

    const st = studioStore.getState();
    const geoms = computeGeometriesForState(st);
    const filled = buildFaceAwareAutoFill(pool, geoms, st.panels);

    studioStore.mutate((draft) => {
      for (let i = 0; i < filled.length; i++) {
        draft.panels[i] = filled[i];
      }
    }, { recordHistory: true, reason: 'autofill' });

    if (!silentToast) {
      showToast('Face-Aware Auto-Fill applied');
    }
    return filled;
  };

  const handleExport = async (formatId = null) => {
    try {
      await exportCoverPng(studioStore, { formatId, onToast: showToast });
    } catch (err) {
      showToast(`Export failed: ${err.message}`, true);
    }
  };

  const handleExportAll = async () => {
    try {
      await exportAllThreeSizes(studioStore, { onToast: showToast });
    } catch (err) {
      showToast(`Batch export failed: ${err.message}`, true);
    }
  };

  const handleStepFocus = (step) => {
    if (step === 'photos') {
      document.getElementById('photo-dropzone')?.focus();
    } else if (step === 'caption') {
      const titleEl = document.getElementById('input-main-title');
      titleEl?.focus();
      titleEl?.select?.();
    } else if (step === 'export') {
      document.getElementById('btn-export-all')?.focus();
    }
  };

  const handleResetAll = () => {
    studioStore.resetDesign(true);
    applyCuratedDemoPanels(studioStore);
    showToast('Design reset to studio defaults');
  };

  const topBar = initTopBar(studioStore, {
    onStepFocus: handleStepFocus,
    onReset: handleResetAll,
    onToast: showToast,
  });

  const leftSidebar = initLeftSidebar(studioStore, {
    onAutoFill: applyFaceAwareAutoFill,
    onResetDemoCast: () => applyCuratedDemoPanels(studioStore),
    getGeometries: () => lastPanelGeometries,
    onToast: showToast,
  });

  const rightInspector = initRightInspector(studioStore, {
    onExport: handleExport,
    onExportAll: handleExportAll,
    onAutoFill: applyFaceAwareAutoFill,
    getGeometries: () => lastPanelGeometries,
    onToast: showToast,
  });

  initCanvasInteraction(canvas, studioStore, {
    getGeometries: () => lastPanelGeometries,
    onDropMultiple: (files) => leftSidebar.handleIncomingFiles(files),
    onToast: showToast,
  });

  bindKeyboardShortcuts(studioStore);
  bindGlobalPasteHandler(leftSidebar);

  const renderNow = () => {
    renderScheduled = false;
    lastPanelGeometries = renderPoster(canvas, studioStore, {
      mode: isCoverShot ? 'export' : 'preview',
      hideGizmos: isCoverShot,
    });
    if (!isCoverShot) {
      renderLiveSizePreviews(previewCanvasMap, studioStore, { targetHeight: 112 });
    }
  };

  const scheduleRender = () => {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(renderNow);
  };

  studioStore.subscribe((state, reason) => {
    topBar.sync(state, reason);
    leftSidebar.sync(state, reason);
    rightInspector.sync(state, reason);
    scheduleRender();
  });

  await preloadBundledFonts();
  await loadSamplePhotos(studioStore);

  // Apply ?shot= overrides first so curated demo panel face crops compute against the exact shot format/template
  if (shotMode) {
    applyShotQueryOverrides(studioStore, params);
  }

  applyCuratedDemoPanels(studioStore);

  // Re-apply selected panel override if specified in ?shot= (after demo panel init)
  if (shotMode) {
    const selParam = params.get('selected');
    if (selParam !== null) {
      const st = studioStore.getState();
      const tpl = getTemplateById(st.templateId);
      const parsed = Number.parseInt(selParam, 10);
      if (Number.isFinite(parsed)) {
        const clamped = Math.max(0, Math.min(tpl.panelCount - 1, parsed));
        studioStore.mutate((draft) => {
          draft.selectedPanelIndex = clamped;
        }, { recordHistory: false, reason: 'init' });
      }
    }
  }

  // Final synchronous initial paint + UI sync
  const st = studioStore.getState();
  topBar.sync(st, 'init');
  leftSidebar.sync(st, 'init');
  rightInspector.sync(st, 'init');
  renderNow();

  // QA & automation API
  window.__viceStudio = {
    getState: () => studioStore.getState(),
    getGeometries: () => lastPanelGeometries,
    renderExportPngBlob: (fmtId) => renderExportPngBlob(studioStore, fmtId),
    exportAllThreeSizes: () => exportAllThreeSizes(studioStore, { onToast: showToast }),
    swapPanels: (a, b) => studioStore.swapPanels(a, b),
    applyFaceAwareAutoFill: () => applyFaceAwareAutoFill(),
  };

  if (shotMode) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.__shotReady = true;
      });
    });
  }
}

function applyShotQueryOverrides(store, params) {
  const fmt = params.get('format');
  const tpl = params.get('template');
  const grade = params.get('grade');
  const style = params.get('style');
  const title = params.get('title');
  const font = params.get('font') ?? params.get('titleFont');
  const subtitle = params.get('subtitle') ?? params.get('sub');
  const subFont = params.get('subFont') ?? params.get('subtitleFont');
  const tagline = params.get('tagline');
  const critic = params.get('critic');
  const source = params.get('source') ?? params.get('quoteSource');
  const vol = params.get('vol');
  const coming = params.get('coming');
  const billing = params.get('billing');
  const seal = params.get('seal');
  const sealRing = params.get('sealRing');
  const disc = params.get('disc');
  const frame = params.get('frame');
  const roles = params.get('roles');
  const palms = params.get('palms');
  const hairline = params.get('hairline');
  const sealShow = params.get('sealShow');

  store.mutate((draft) => {
    if (fmt === 'landscape' || fmt === 'portrait' || fmt === 'square') draft.formatId = fmt;
    if (tpl) draft.templateId = getTemplateById(tpl).id;
    if (grade) draft.effects.gradePreset = grade;
    if (style) draft.typography.titleStyle = style;
    if (title !== null) draft.typography.mainTitle = title;
    if (font) draft.typography.titleFont = font;
    if (subtitle !== null) draft.typography.subtitle = subtitle;
    if (subFont) draft.typography.subtitleFont = subFont;
    if (tagline !== null) draft.typography.tagline = tagline;
    if (critic !== null) draft.frame.criticQuote = critic;
    if (source !== null) draft.frame.criticSource = source;
    if (vol !== null) draft.frame.editionVol = vol;
    if (coming !== null) draft.frame.comingSoonText = coming;
    if (billing !== null) draft.frame.billingCredits = billing;
    if (seal !== null) draft.typography.sealText = seal;
    if (sealRing !== null) draft.typography.sealRingText = sealRing;
    if (disc === '0') draft.effects.showHorizonDisc = false;
    if (disc === '1') draft.effects.showHorizonDisc = true;
    if (frame === '0') draft.frame.showCollectorFrame = false;
    if (frame === '1') draft.frame.showCollectorFrame = true;
    if (roles === '0') draft.typography.showRoleTags = false;
    if (roles === '1') draft.typography.showRoleTags = true;
    if (palms === '0') draft.effects.showPalms = false;
    if (palms === '1') draft.effects.showPalms = true;
    if (hairline === '0') draft.frame.showInnerHairline = false;
    if (hairline === '1') draft.frame.showInnerHairline = true;
    if (sealShow === '0') draft.typography.showEditionSeal = false;
    if (sealShow === '1') draft.typography.showEditionSeal = true;
  }, { recordHistory: false, reason: 'init' });
}

function showToast(message, isError = false) {
  const el = document.getElementById('studio-toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('is-error', Boolean(isError));
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('is-visible');
  }, 2600);
}

async function preloadBundledFonts() {
  if (!document.fonts) return;
  await Promise.allSettled(BUNDLED_FONT_SPECS.map((spec) => document.fonts.load(spec)));
  await document.fonts.ready;
}

function applyCuratedDemoPanels(store) {
  const photos = store.listPhotos();
  if (photos.length === 0) return;

  const st = store.getState();
  const tpl = getTemplateById(st.templateId);
  const geoms = computeGeometriesForState(st);
  const panelCount = Math.max(7, tpl.panelCount, geoms.length);

  const isCastMosaicLandscape = tpl.id === 'cast-mosaic' && st.formatId === 'landscape';

  store.mutate((draft) => {
    for (let i = 0; i < panelCount; i++) {
      const preferredId = DEMO_CAST_IDS[i % DEMO_CAST_IDS.length];
      const photo = store.getPhoto(preferredId) || photos[i % photos.length];
      const geom = geoms[i];
      let crop = geom
        ? computeFaceAwarePanelCrop(photo, geom.bounds, 0, DEMO_CAST_IDS.length)
        : { zoom: 1.04, panX: 0, panY: -0.22, flipX: false };

      // Precision curated framing for flagship Cast Mosaic 16:9 hero & flanking cast panels
      if (isCastMosaicLandscape && geom) {
        if (i === 0 && photo.id === 'sample-hero-kingpin') {
          // Full hair, eyes, nose, mouth, and complete silver beard cleanly above NEON EMPIRE
          crop = { zoom: 1.07, panX: 0, panY: 0.94, flipX: false };
        } else if (i === 2 && photo.id === 'sample-night-rider') {
          // Centered cleanly in Panel 2 with cheek clear of left edge of NEON EMPIRE
          crop = { zoom: 1.08, panX: 0.42, panY: -0.18, flipX: false };
        } else if (i === 4 && photo.id === 'sample-pier') {
          // Closer portrait crop on THE CAPTAIN while preserving full hat headroom
          crop = { zoom: 1.24, panX: -0.42, panY: -0.96, flipX: false };
        } else if (i === 5 && photo.id === 'sample-rooftop') {
          // Keeps sunset skyline behind EMPIRE and frames THE FIXER's sunglasses & smile cleanly below title
          crop = { zoom: 1.28, panX: 0.12, panY: -1.0, flipX: false };
        }
      } else if (photo.id === 'sample-pier' && geom) {
        // Ensure THE CAPTAIN always gets closer face framing with full hat headroom
        crop = {
          ...crop,
          zoom: Math.max(1.22, crop.zoom),
          panX: -0.34,
          panY: Math.min(-0.92, crop.panY),
        };
      }

      draft.panels[i] = {
        photoId: photo.id,
        zoom: crop.zoom,
        panX: crop.panX,
        panY: crop.panY,
        flipX: crop.flipX,
        role: DEFAULT_PANEL_ROLES[i] || `PANEL ${i + 1}`,
      };
    }
  }, { recordHistory: false, reason: 'init' });
  store.clearHistory();
}

function bindGlobalPasteHandler(leftSidebar) {
  window.addEventListener('paste', async (e) => {
    const dt = e.clipboardData;
    if (!dt) return;

    const imageFiles = [];
    if (dt.files && dt.files.length > 0) {
      for (const f of dt.files) {
        if (f && (!f.type || f.type.startsWith('image/'))) {
          imageFiles.push(f);
        }
      }
    }
    if (imageFiles.length === 0 && dt.items) {
      for (const item of dt.items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
    }
    if (imageFiles.length === 0) return;

    e.preventDefault();
    await leftSidebar.handleIncomingFiles(imageFiles);
  });
}

function bindKeyboardShortcuts(store) {
  window.addEventListener('keydown', (e) => {
    const target = e.target;
    const isTyping = target && (
      target.tagName === 'INPUT'
      || target.tagName === 'TEXTAREA'
      || target.tagName === 'SELECT'
      || target.isContentEditable
    );
    if (isTyping) return;

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const key = e.key.toLowerCase();

    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (store.undo()) showToast('Undid last change');
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      if (store.redo()) showToast('Redid change');
    }
  });
}

if (typeof document !== 'undefined') {
  bootstrapViceCityStudio().catch((err) => {
    showToast(`Init error: ${err.message}`, true);
  });
}
