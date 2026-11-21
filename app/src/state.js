// Central state store for Vice City Studio (V3 Rank #1):
// Pub/sub updates, 3 required export formats, 7-panel Cast Mosaic default schema,
// 6 cinematic color grades (default: sunset-gold), 100% original fictional default
// poster copy (NEON EMPIRE / Coastal Nights / SOLARIS PICTURES — zero Vice City /
// Rockstar text in poster artwork), and 15-step Undo/Redo.

export const EXPORT_FORMATS = Object.freeze({
  landscape: Object.freeze({
    id: 'landscape',
    label: '1920×1080',
    ratioLabel: 'Landscape 16:9',
    shortLabel: '16:9',
    width: 1920,
    height: 1080,
  }),
  portrait: Object.freeze({
    id: 'portrait',
    label: '1080×1350',
    ratioLabel: 'Portrait 4:5',
    shortLabel: '4:5',
    width: 1080,
    height: 1350,
  }),
  square: Object.freeze({
    id: 'square',
    label: '1080×1080',
    ratioLabel: 'Square 1:1',
    shortLabel: '1:1',
    width: 1080,
    height: 1080,
  }),
});

export const UNDO_LIMIT = 15;

export const DEFAULT_PANEL_ROLES = [
  'THE BOSS',
  'THE DRIVER',
  'THE RIDER',
  'THE MECHANIC',
  'THE CAPTAIN',
  'THE FIXER',
  'THE LOOKOUT',
];

export function createDefaultPanelState(index = 0, photoId = null) {
  return {
    photoId,
    zoom: 1,
    panX: 0,
    panY: -0.18, // Upper-third face-safe default prevents cropping subject heads
    flipX: false,
    role: DEFAULT_PANEL_ROLES[index] || `PANEL ${index + 1}`,
  };
}

export function createDefaultDesignState() {
  return {
    formatId: 'landscape',
    templateId: 'cast-mosaic',
    selectedPanelIndex: 0,
    activeTab: 'templates',
    panels: [
      createDefaultPanelState(0, null),
      createDefaultPanelState(1, null),
      createDefaultPanelState(2, null),
      createDefaultPanelState(3, null),
      createDefaultPanelState(4, null),
      createDefaultPanelState(5, null),
      createDefaultPanelState(6, null),
    ],
    typography: {
      mainTitle: 'NEON EMPIRE',
      titleFont: 'Anton',
      titleStyle: 'outrun-striped',
      titlePos: 'bottom',
      titleAlign: 'center',
      titleSize: 100,
      titleOutline: 14,
      titleShadow: 12,
      subtitle: 'Coastal Nights',
      subtitleFont: 'Pacifico',
      subtitleColor: '#ff4fd8',
      subtitleSize: 100,
      subtitleGlow: 78,
      tagline: 'SEVEN PLAYERS • ONE COAST • NO WAY OUT',
      showRoleTags: true,
      showEditionSeal: true,
      sealText: 'ORIGINAL ART',
      sealRingText: 'SOLARIS COVER STUDIO ★ OFFICIAL EDITION ★',
    },
    frame: {
      showCollectorFrame: true,
      showCriticStrip: true,
      criticQuote: 'THE SUN-DRENCHED CRIME EPIC OF THE YEAR',
      criticSource: 'COASTAL CHRONICLE',
      editionVol: 'VOL. 1',
      showBillingBlock: true,
      comingSoonText: 'COMING SOON',
      billingCredits: 'a SOLARIS PICTURES production in association with PALM & CHROME a M. VALDEZ film NEON EMPIRE music by THE NIGHTWAVE ORCHESTRA edited by K. SATO directed by M. VALDEZ',
      showInnerHairline: true,
    },
    effects: {
      gradePreset: 'sunset-gold',
      painterly: 45,
      brightness: 102,
      contrast: 118,
      saturation: 118,
      sunsetOverlay: 28,
      neonRim: 42,
      grain: 14,
      vignette: 32,
      showPalms: true,
      showHorizonDisc: true,
    },
  };
}

function cloneSnapshot(design) {
  return JSON.parse(JSON.stringify(design));
}

export function createStudioStore() {
  let state = createDefaultDesignState();
  const photos = new Map(); // photoId -> { id, name, width, height, source, thumbUrl, isSample }
  let photoOrder = [];
  const undoStack = [];
  const redoStack = [];
  const listeners = new Set();

  function notify(reason = 'update') {
    for (const fn of listeners) {
      fn(state, reason);
    }
  }

  function recordUndoSnapshot() {
    undoStack.push(cloneSnapshot(state));
    if (undoStack.length > UNDO_LIMIT) {
      undoStack.shift();
    }
    redoStack.length = 0;
  }

  function ensurePanelCount(count) {
    while (state.panels.length < count) {
      const idx = state.panels.length;
      const fallbackPhoto = photoOrder.length > 0 ? photoOrder[idx % photoOrder.length] : null;
      state.panels.push(createDefaultPanelState(idx, fallbackPhoto));
    }
    if (state.selectedPanelIndex >= count) {
      state.selectedPanelIndex = Math.max(0, count - 1);
    }
  }

  return {
    getState() {
      return state;
    },

    getFormat() {
      return EXPORT_FORMATS[state.formatId] || EXPORT_FORMATS.landscape;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    mutate(updater, { recordHistory = true, reason = 'update' } = {}) {
      if (recordHistory) {
        recordUndoSnapshot();
      }
      updater(state);
      notify(reason);
    },

    setFormat(formatId) {
      if (!EXPORT_FORMATS[formatId] || state.formatId === formatId) return;
      this.mutate((draft) => {
        draft.formatId = formatId;
      }, { recordHistory: true, reason: 'format' });
    },

    setTemplate(templateId, panelCount = 7) {
      if (state.templateId === templateId) return;
      this.mutate((draft) => {
        draft.templateId = templateId;
        ensurePanelCount(panelCount);
      }, { recordHistory: true, reason: 'template' });
    },

    selectPanel(index) {
      if (index < 0 || index >= state.panels.length) return;
      if (state.selectedPanelIndex === index) return;
      state.selectedPanelIndex = index;
      notify('selection');
    },

    setActiveTab(tabId) {
      if (state.activeTab === tabId) return;
      state.activeTab = tabId;
      notify('tab');
    },

    updatePanel(index, patch, { recordHistory = true } = {}) {
      if (index < 0 || index >= state.panels.length) return;
      this.mutate((draft) => {
        Object.assign(draft.panels[index], patch);
      }, { recordHistory, reason: 'panel' });
    },

    swapPanels(idxA, idxB, { recordHistory = true } = {}) {
      if (idxA === idxB) return;
      if (idxA < 0 || idxB < 0 || idxA >= state.panels.length || idxB >= state.panels.length) return;
      this.mutate((draft) => {
        const a = draft.panels[idxA];
        const b = draft.panels[idxB];
        const tmp = {
          photoId: a.photoId,
          zoom: a.zoom,
          panX: a.panX,
          panY: a.panY,
          flipX: a.flipX,
          role: a.role,
        };
        a.photoId = b.photoId;
        a.zoom = b.zoom;
        a.panX = b.panX;
        a.panY = b.panY;
        a.flipX = b.flipX;
        a.role = b.role;

        b.photoId = tmp.photoId;
        b.zoom = tmp.zoom;
        b.panX = tmp.panX;
        b.panY = tmp.panY;
        b.flipX = tmp.flipX;
        b.role = tmp.role;

        draft.selectedPanelIndex = idxB;
      }, { recordHistory, reason: 'swap' });
    },

    resetPanelCrop(index) {
      if (index < 0 || index >= state.panels.length) return;
      this.mutate((draft) => {
        const panel = draft.panels[index];
        panel.zoom = 1;
        panel.panX = 0;
        panel.panY = -0.18;
        panel.flipX = false;
      }, { recordHistory: true, reason: 'panel' });
    },

    updateTypography(patch, { recordHistory = true } = {}) {
      this.mutate((draft) => {
        Object.assign(draft.typography, patch);
      }, { recordHistory, reason: 'typography' });
    },

    updateFrame(patch, { recordHistory = true } = {}) {
      this.mutate((draft) => {
        Object.assign(draft.frame, patch);
      }, { recordHistory, reason: 'frame' });
    },

    updateEffects(patch, { recordHistory = true } = {}) {
      this.mutate((draft) => {
        Object.assign(draft.effects, patch);
      }, { recordHistory, reason: 'effects' });
    },

    // Photo library management (kept separate from JSON snapshots so bitmaps stay intact)
    addPhoto(photoRecord) {
      photos.set(photoRecord.id, photoRecord);
      if (!photoOrder.includes(photoRecord.id)) {
        photoOrder.push(photoRecord.id);
      }
      notify('photos');
    },

    removePhoto(photoId) {
      if (!photos.has(photoId)) return;
      recordUndoSnapshot();
      const rec = photos.get(photoId);
      if (rec && rec.thumbUrl && rec.thumbUrl.startsWith('blob:')) {
        URL.revokeObjectURL(rec.thumbUrl);
      }
      photos.delete(photoId);
      photoOrder = photoOrder.filter((id) => id !== photoId);
      for (const panel of state.panels) {
        if (panel.photoId === photoId) {
          panel.photoId = photoOrder[0] || null;
        }
      }
      notify('photos');
    },

    getPhoto(photoId) {
      return photoId ? photos.get(photoId) || null : null;
    },

    listPhotos() {
      return photoOrder.map((id) => photos.get(id)).filter(Boolean);
    },

    clearHistory() {
      undoStack.length = 0;
      redoStack.length = 0;
      notify('history');
    },

    canUndo() {
      return undoStack.length > 0;
    },

    canRedo() {
      return redoStack.length > 0;
    },

    undo() {
      if (undoStack.length === 0) return false;
      redoStack.push(cloneSnapshot(state));
      const prev = undoStack.pop();
      for (const panel of prev.panels) {
        if (panel.photoId && !photos.has(panel.photoId)) {
          panel.photoId = photoOrder[0] || null;
        }
      }
      state = prev;
      notify('undo');
      return true;
    },

    redo() {
      if (redoStack.length === 0) return false;
      undoStack.push(cloneSnapshot(state));
      if (undoStack.length > UNDO_LIMIT) undoStack.shift();
      const next = redoStack.pop();
      for (const panel of next.panels) {
        if (panel.photoId && !photos.has(panel.photoId)) {
          panel.photoId = photoOrder[0] || null;
        }
      }
      state = next;
      notify('redo');
      return true;
    },

    resetDesign(preservePhotoIds = true) {
      recordUndoSnapshot();
      const fresh = createDefaultDesignState();
      if (preservePhotoIds && photoOrder.length > 0) {
        fresh.panels.forEach((panel, idx) => {
          panel.photoId = photoOrder[idx % photoOrder.length];
        });
      }
      state = fresh;
      notify('reset');
    },
  };
}

export const studioStore = createStudioStore();
