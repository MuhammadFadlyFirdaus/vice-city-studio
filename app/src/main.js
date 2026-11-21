// Main application orchestrator for Vice City Studio (V2).
// Loads bundled SIL OFL fonts & 6 offline demo photos, wires the 3-pane UI,
// connects canvas pan/zoom/drop interactions, lossless PNG export, keyboard
// shortcuts (Ctrl+Z / Ctrl+Y), and deterministic ?shot= screenshot scenes.

import { renderPoster } from './posterRenderer.js';
import { getTemplateById } from './templates.js';
import { exportCoverPng, renderExportPngBlob } from './exportEngine.js';
import { loadSamplePhotos } from './mediaManager.js';
import { initCanvasInteraction } from './canvasInteraction.js';
import { studioStore } from './state.js';
import { initTopBar } from './ui/topBar.js';
import { initLeftSidebar } from './ui/leftSidebar.js';
import { initRightInspector } from './ui/rightInspector.js';

const BUNDLED_FONT_SPECS = [
  '400 48px "Anton"',
  '400 48px "Bebas Neue"',
  '400 48px "Pacifico"',
  '600 24px "Oswald"',
];

let toastTimer = null;
let lastPanelGeometries = [];
let renderScheduled = false;

export async function bootstrapViceCityStudio() {
  const canvas = document.getElementById('poster-canvas');
  if (!canvas) return;

  const params = new URLSearchParams(window.location.search);
  const shotMode = params.get('shot');
  const isCoverShot = shotMode === 'cover';
  if (isCoverShot) {
    document.body.classList.add('shot-cover');
  }

  const handleExport = async () => {
    try {
      await exportCoverPng(studioStore, { onToast: showToast });
    } catch (err) {
      showToast(`Export failed: ${err.message}`, true);
    }
  };

  const topBar = initTopBar(studioStore, { onExport: handleExport, onToast: showToast });
  const leftSidebar = initLeftSidebar(studioStore, { onToast: showToast });
  const rightInspector = initRightInspector(studioStore, { onExport: handleExport, onToast: showToast });

  initCanvasInteraction(canvas, studioStore, {
    getGeometries: () => lastPanelGeometries,
    onDropMultiple: (files) => leftSidebar.handleIncomingFiles(files),
    onToast: showToast,
  });

  bindKeyboardShortcuts(studioStore);

  const renderNow = () => {
    renderScheduled = false;
    lastPanelGeometries = renderPoster(canvas, studioStore, {
      mode: isCoverShot ? 'export' : 'preview',
      hideGizmos: isCoverShot,
    });
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
  applyCuratedDemoPanels(studioStore);

  // Apply optional ?shot= scene overrides for deterministic screenshots
  if (shotMode) {
    const fmt = params.get('format');
    const tpl = params.get('template');
    const title = params.get('title');
    const subtitle = params.get('subtitle');
    const tagline = params.get('tagline');
    const grade = params.get('grade');
    const style = params.get('style');
    const tab = params.get('tab');
    const disc = params.get('disc');
    const roles = params.get('roles');
    const frame = params.get('frame');
    const critic = params.get('critic');
    const vol = params.get('vol');
    const coming = params.get('coming');
    const billing = params.get('billing');
    const seal = params.get('seal');

    studioStore.mutate((draft) => {
      if (fmt === 'landscape' || fmt === 'portrait' || fmt === 'square') draft.formatId = fmt;
      if (tpl) draft.templateId = getTemplateById(tpl).id;
      if (title !== null) draft.typography.mainTitle = title;
      if (subtitle !== null) draft.typography.subtitle = subtitle;
      if (tagline !== null) draft.typography.tagline = tagline;
      if (style) draft.typography.titleStyle = style;
      if (grade) draft.effects.gradePreset = grade;
      if (tab) draft.activeTab = tab;
      if (disc === '1') draft.effects.showHorizonDisc = true;
      if (roles === '0') draft.typography.showRoleTags = false;
      if (roles === '1') draft.typography.showRoleTags = true;
      if (frame === '0') draft.frame.showCollectorFrame = false;
      if (frame === '1') draft.frame.showCollectorFrame = true;
      if (critic !== null) draft.frame.criticQuote = critic;
      if (vol !== null) draft.frame.editionVol = vol;
      if (coming !== null) draft.frame.comingSoonText = coming;
      if (billing !== null) draft.frame.billingCredits = billing;
      if (seal !== null) draft.typography.sealText = seal;
    }, { recordHistory: false, reason: 'init' });
  }

  // Final synchronous initial paint + UI sync
  const st = studioStore.getState();
  topBar.sync(st, 'init');
  leftSidebar.sync(st, 'init');
  rightInspector.sync(st, 'init');
  renderNow();

  // Read-only QA inspection hook for automated verification
  window.__viceStudio = {
    getState: () => studioStore.getState(),
    getGeometries: () => lastPanelGeometries,
    renderExportPngBlob: (fmtId) => renderExportPngBlob(studioStore, fmtId),
  };

  if (shotMode) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.__shotReady = true;
      });
    });
  }
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

  const byId = (id) => (store.getPhoto(id) ? id : photos[0].id);
  const demoPanels = [
    // Panel 0: Dominant Center Hero — Woman leaning on vintage red convertible
    { photoId: byId('sample-boulevard'), zoom: 1.06, panX: -0.04, panY: -0.34, flipX: false, role: 'THE DRIVER' },
    // Panel 1: Top-Left Cast — Dusk rooftop skyline character
    { photoId: byId('sample-rooftop'), zoom: 1.10, panX: 0.0, panY: -0.22, flipX: false, role: 'THE FIXER' },
    // Panel 2: Bottom-Left / Bottom Wide Action — Neon rain-slicked 80s white coupe
    { photoId: byId('sample-coupe'), zoom: 1.04, panX: 0.0, panY: 0.16, flipX: false, role: 'THE GETAWAY' },
    // Panel 3: Top-Right Cast — Turquoise coastal pier captain (upper-third face-safe)
    { photoId: byId('sample-pier'), zoom: 1.06, panX: -0.18, panY: -0.62, flipX: false, role: 'THE CAPTAIN' },
    // Panel 4: Top-Left Inner / Mid-Left Cast — Twilight marina lookout
    { photoId: byId('sample-lookout'), zoom: 1.06, panX: 0.0, panY: -0.26, flipX: false, role: 'THE LOOKOUT' },
    // Panel 5: Top-Right Outer / Mid-Right Cast — Sunset bay syndicate boss
    { photoId: byId('sample-boss'), zoom: 1.04, panX: 0.0, panY: -0.24, flipX: false, role: 'THE BOSS' },
  ];

  store.mutate((draft) => {
    for (let i = 0; i < demoPanels.length; i++) {
      draft.panels[i] = { ...demoPanels[i] };
    }
  }, { recordHistory: false, reason: 'init' });
  store.clearHistory();
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
