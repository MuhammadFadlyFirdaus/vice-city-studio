// Top navigation bar UI bindings (V3 Pro Studio):
// 3-Step Visual Breadcrumb Pills (① ADD PHOTOS -> ② CAPTION & STYLE -> ③ EXPORT PNG),
// Undo/Redo buttons, Reset Design, and offline privacy badge.

export function initTopBar(store, { onStepFocus, onReset, onToast }) {
  const stepBar = document.getElementById('step-breadcrumbs');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnReset = document.getElementById('btn-reset');

  stepBar?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-step]');
    if (!btn) return;
    const step = btn.dataset.step;
    for (const pill of stepBar.querySelectorAll('button[data-step]')) {
      pill.classList.toggle('is-active', pill.dataset.step === step);
    }
    onStepFocus?.(step);
  });

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
    if (typeof onReset === 'function') {
      onReset();
    } else {
      store.resetDesign(true);
      onToast?.('Design reset to studio defaults');
    }
  });

  function sync() {
    if (btnUndo) btnUndo.disabled = !store.canUndo();
    if (btnRedo) btnRedo.disabled = !store.canRedo();
  }

  return { sync };
}
