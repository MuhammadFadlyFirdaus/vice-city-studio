// Top navigation bar UI bindings: Format pills (1920x1080, 1080x1350, 1080x1080),
// Undo/Redo buttons, Reset Design, and primary Export PNG button.

export function initTopBar(store, { onExport, onToast }) {
  const formatWrap = document.getElementById('format-selector');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export-png');

  if (formatWrap) {
    formatWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-format]');
      if (!btn) return;
      const fmt = btn.dataset.format;
      store.setFormat(fmt);
    });
  }

  btnUndo?.addEventListener('click', () => {
    if (store.undo()) {
      onToast?.('Undid last change');
    }
  });

  btnRedo?.addEventListener('click', () => {
    if (store.redo()) {
      onToast?.('Redid change');
    }
  });

  btnReset?.addEventListener('click', () => {
    store.resetDesign(true);
    onToast?.('Design reset to Vice City defaults');
  });

  btnExport?.addEventListener('click', () => {
    onExport?.();
  });

  function sync(state) {
    if (formatWrap) {
      for (const btn of formatWrap.querySelectorAll('button[data-format]')) {
        btn.classList.toggle('is-active', btn.dataset.format === state.formatId);
      }
    }
    if (btnUndo) btnUndo.disabled = !store.canUndo();
    if (btnRedo) btnRedo.disabled = !store.canRedo();
  }

  return { sync };
}
