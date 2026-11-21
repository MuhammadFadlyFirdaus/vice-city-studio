// Poster layout geometry engine and Smart Upper-Third Face-Safe Auto-Fill.
// H5 builds and perfects Master Template #1 (classic-vice) across all 3 aspect ratios.

export const ONE_PHOTO_VARIATIONS = Object.freeze([
  Object.freeze({ zoom: 1.05, panX: 0, panY: -0.22, flipX: false }),
  Object.freeze({ zoom: 1.46, panX: -0.14, panY: -0.26, flipX: false }),
  Object.freeze({ zoom: 1.34, panX: 0.14, panY: -0.18, flipX: true }),
  Object.freeze({ zoom: 1.18, panX: -0.1, panY: -0.12, flipX: false }),
  Object.freeze({ zoom: 1.42, panX: 0.12, panY: -0.24, flipX: true }),
]);

/**
 * Insets a convex quad/polygon slightly inward toward its centroid so adjacent
 * panels share a clean, uniform black comic-ink gutter.
 */
function insetPolygon(points, insetPx) {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of points) {
    cx += x;
    cy += y;
  }
  cx /= points.length;
  cy /= points.length;

  // Offset each edge inward along its inward unit normal, then intersect adjacent edges
  const edges = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy) || 1;
    // Candidate normal pointing toward centroid
    let nx = -dy / len;
    let ny = dx / len;
    const midX = (p1[0] + p2[0]) * 0.5;
    const midY = (p1[1] + p2[1]) * 0.5;
    if ((cx - midX) * nx + (cy - midY) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    edges.push({
      x1: p1[0] + nx * insetPx,
      y1: p1[1] + ny * insetPx,
      x2: p2[0] + nx * insetPx,
      y2: p2[1] + ny * insetPx,
    });
  }

  const out = [];
  for (let i = 0; i < n; i++) {
    const e1 = edges[(i + n - 1) % n];
    const e2 = edges[i];
    const a1 = e1.y2 - e1.y1;
    const b1 = e1.x1 - e1.x2;
    const c1 = a1 * e1.x1 + b1 * e1.y1;
    const a2 = e2.y2 - e2.y1;
    const b2 = e2.x1 - e2.x2;
    const c2 = a2 * e2.x1 + b2 * e2.y1;
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-6) {
      out.push([e2.x1, e2.y1]);
    } else {
      out.push([(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det]);
    }
  }
  return out;
}

function buildPanelGeometry(rawNormPanels, width, height, frameRatio = 0.02, gutterRatio = 0.015) {
  const minDim = Math.min(width, height);
  const frame = Math.round(minDim * frameRatio);
  const halfGutter = Math.max(4, Math.round(minDim * gutterRatio * 0.5));
  const innerW = width - frame * 2;
  const innerH = height - frame * 2;

  return rawNormPanels.map((panelDef, index) => {
    const absPts = panelDef.poly.map(([nx, ny]) => [
      frame + nx * innerW,
      frame + ny * innerH,
    ]);
    const pts = insetPolygon(absPts, halfGutter);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return {
      index,
      id: panelDef.id,
      isHero: Boolean(panelDef.isHero),
      accent: panelDef.accent || '#ff3d9a',
      points: pts,
      bounds: {
        x: minX,
        y: minY,
        w: Math.max(1, maxX - minX),
        h: Math.max(1, maxY - minY),
        cx: (minX + maxX) * 0.5,
        cy: (minY + maxY) * 0.5,
      },
    };
  });
}

// Master Template #1: Classic Vice City (5-panel asymmetric GTA-style cover)
const CLASSIC_VICE_LAYOUTS = {
  landscape: [
    // Panel 0: Dominant Center Hero (iconic focal character panel with kinetic slant)
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.305, 0], [0.705, 0], [0.68, 1], [0.28, 1]] },
    // Panel 1: Top-Left Action / Skyline
    { id: 'top-left', accent: '#35e8ff', poly: [[0, 0], [0.305, 0], [0.293, 0.49], [0, 0.52]] },
    // Panel 2: Bottom-Left Character / Night Cruiser
    { id: 'bot-left', accent: '#ff8c42', poly: [[0, 0.52], [0.293, 0.49], [0.28, 1], [0, 1]] },
    // Panel 3: Top-Right Coast / Pier
    { id: 'top-right', accent: '#ffd166', poly: [[0.705, 0], [1, 0], [1, 0.47], [0.693, 0.50]] },
    // Panel 4: Bottom-Right Neon Ride
    { id: 'bot-right', accent: '#ff4fd8', poly: [[0.693, 0.50], [1, 0.47], [1, 1], [0.68, 1]] },
  ],
  portrait: [
    // Panel 0: Dominant Middle-Left Focal Hero
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0, 0.275], [0.615, 0.255], [0.59, 0.725], [0, 0.745]] },
    // Panel 1: Top-Left Establishing Shot
    { id: 'top-left', accent: '#35e8ff', poly: [[0, 0], [0.475, 0], [0.46, 0.26], [0, 0.275]] },
    // Panel 2: Mid-Right Tall Character Strip
    { id: 'mid-right', accent: '#ff8c42', poly: [[0.615, 0.255], [1, 0.242], [1, 0.708], [0.59, 0.725]] },
    // Panel 3: Top-Right Coastal Horizon
    { id: 'top-right', accent: '#ffd166', poly: [[0.475, 0], [1, 0], [1, 0.242], [0.46, 0.26]] },
    // Panel 4: Bottom Wide Neon Car / Title Anchor
    { id: 'bot-wide', accent: '#ff4fd8', poly: [[0, 0.745], [1, 0.708], [1, 1], [0, 1]] },
  ],
  square: [
    // Panel 0: Dominant Upper-Left Focal Hero
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0, 0], [0.59, 0], [0.57, 0.60], [0, 0.62]] },
    // Panel 1: Top-Right Dusk Portrait
    { id: 'top-right', accent: '#35e8ff', poly: [[0.59, 0], [1, 0], [1, 0.34], [0.581, 0.36]] },
    // Panel 2: Mid-Right Neon Accent
    { id: 'mid-right', accent: '#ff8c42', poly: [[0.581, 0.36], [1, 0.34], [1, 0.66], [0.568, 0.68]] },
    // Panel 3: Bottom-Left Wide Cruiser
    { id: 'bot-left', accent: '#ffd166', poly: [[0, 0.62], [0.57, 0.60], [0.555, 1], [0, 1]] },
    // Panel 4: Bottom-Right Coastal Shot
    { id: 'bot-right', accent: '#ff4fd8', poly: [[0.568, 0.68], [1, 0.66], [1, 1], [0.555, 1]] },
  ],
};

// Template #2: Sunset Boulevard (4-panel dynamic diagonal slash poster)
const SUNSET_BLVD_LAYOUTS = {
  landscape: [
    // Panel 0: Dominant Center-Left Diagonal Hero
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.23, 0], [0.64, 0], [0.54, 1], [0.13, 1]] },
    // Panel 1: Left Angled Edge Slice
    { id: 'left-slash', accent: '#35e8ff', poly: [[0, 0], [0.23, 0], [0.13, 1], [0, 1]] },
    // Panel 2: Top-Right Diagonal Action
    { id: 'top-right', accent: '#ff8c42', poly: [[0.64, 0], [1, 0], [1, 0.49], [0.59, 0.49]] },
    // Panel 3: Bottom-Right Diagonal Cruiser
    { id: 'bot-right', accent: '#ffd166', poly: [[0.59, 0.49], [1, 0.49], [1, 1], [0.54, 1]] },
  ],
  portrait: [
    // Panel 0: Dominant Left-Center Tall Diagonal Hero (portrait-friendly, never clips heads)
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0, 0], [0.64, 0], [0.52, 0.71], [0, 0.75]] },
    // Panel 1: Top-Right Diagonal Character
    { id: 'top-right', accent: '#35e8ff', poly: [[0.64, 0], [1, 0], [1, 0.37], [0.58, 0.41]] },
    // Panel 2: Bottom Sweeping Diagonal Wide Banner (ideal for wide cars/skylines & title anchor)
    { id: 'bot-slash', accent: '#ffd166', poly: [[0, 0.75], [1, 0.67], [1, 1], [0, 1]] },
    // Panel 3: Mid-Right Diagonal Character / Action
    { id: 'mid-right', accent: '#ff8c42', poly: [[0.58, 0.41], [1, 0.37], [1, 0.67], [0.52, 0.71]] },
  ],
  square: [
    // Panel 0: Dominant Upper-Left Diagonal Hero
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0, 0], [0.60, 0], [0.48, 0.68], [0, 0.74]] },
    // Panel 1: Top-Right Angled Cut
    { id: 'top-right', accent: '#35e8ff', poly: [[0.60, 0], [1, 0], [1, 0.45], [0.515, 0.50]] },
    // Panel 2: Lower-Right Diagonal Anchor
    { id: 'bot-right', accent: '#ff8c42', poly: [[0.515, 0.50], [1, 0.45], [1, 1], [0.43, 1]] },
    // Panel 3: Lower-Left Diagonal Strip
    { id: 'bot-left', accent: '#ffd166', poly: [[0, 0.74], [0.48, 0.68], [0.43, 1], [0, 1]] },
  ],
};

// Template #3: Neon Night (4-panel high-contrast vertical split poster)
const NEON_NIGHT_LAYOUTS = {
  landscape: [
    // Panel 0: Dominant Center-Left Vertical Hero Column
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.22, 0], [0.57, 0], [0.57, 1], [0.22, 1]] },
    // Panel 1: Far-Left Vertical Strip
    { id: 'col-left', accent: '#35e8ff', poly: [[0, 0], [0.22, 0], [0.22, 1], [0, 1]] },
    // Panel 2: Mid-Right Vertical Strip
    { id: 'col-mid', accent: '#ff8c42', poly: [[0.57, 0], [0.79, 0], [0.79, 1], [0.57, 1]] },
    // Panel 3: Far-Right Vertical Strip
    { id: 'col-right', accent: '#ffd166', poly: [[0.79, 0], [1, 0], [1, 1], [0.79, 1]] },
  ],
  portrait: [
    // Panel 0: Center Tall Hero Column
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.27, 0], [0.73, 0], [0.73, 0.68], [0.27, 0.68]] },
    // Panel 1: Left Tall Vertical Slice
    { id: 'col-left', accent: '#35e8ff', poly: [[0, 0], [0.27, 0], [0.27, 0.68], [0, 0.68]] },
    // Panel 2: Bottom Full-Width Neon Cruiser Bar
    { id: 'bot-bar', accent: '#ffd166', poly: [[0, 0.68], [1, 0.68], [1, 1], [0, 1]] },
    // Panel 3: Right Tall Vertical Slice
    { id: 'col-right', accent: '#ff8c42', poly: [[0.73, 0], [1, 0], [1, 0.68], [0.73, 0.68]] },
  ],
  square: [
    // Panel 0: Dominant Left Vertical Hero Column
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0, 0], [0.44, 0], [0.44, 0.67], [0, 0.67]] },
    // Panel 1: Center Vertical Column
    { id: 'col-mid', accent: '#35e8ff', poly: [[0.44, 0], [0.72, 0], [0.72, 0.67], [0.44, 0.67]] },
    // Panel 2: Bottom Full-Width Neon Strip
    { id: 'bot-bar', accent: '#ffd166', poly: [[0, 0.67], [1, 0.67], [1, 1], [0, 1]] },
    // Panel 3: Right Vertical Column
    { id: 'col-right', accent: '#ff8c42', poly: [[0.72, 0], [1, 0], [1, 0.67], [0.72, 0.67]] },
  ],
};

export const POSTER_TEMPLATES = [
  {
    id: 'classic-vice',
    name: 'Classic Vice City',
    subtitle: '5-Panel Asymmetric Poster',
    panelCount: 5,
    frameRatio: 0.02,
    gutterRatio: 0.014,
    layouts: CLASSIC_VICE_LAYOUTS,
  },
  {
    id: 'sunset-blvd',
    name: 'Sunset Boulevard',
    subtitle: '4-Panel Diagonal Slash',
    panelCount: 4,
    frameRatio: 0.02,
    gutterRatio: 0.015,
    layouts: SUNSET_BLVD_LAYOUTS,
  },
  {
    id: 'neon-night',
    name: 'Neon Night',
    subtitle: '4-Panel Vertical Split',
    panelCount: 4,
    frameRatio: 0.02,
    gutterRatio: 0.015,
    layouts: NEON_NIGHT_LAYOUTS,
  },
];

export function getTemplateById(templateId) {
  return POSTER_TEMPLATES.find((t) => t.id === templateId) || POSTER_TEMPLATES[0];
}

export function resolveTemplatePanels(templateId, formatId, width, height) {
  const tpl = getTemplateById(templateId);
  const raw = tpl.layouts[formatId] || tpl.layouts.landscape;
  return buildPanelGeometry(raw, width, height, tpl.frameRatio, tpl.gutterRatio);
}

/**
 * Point-in-polygon ray casting for accurate click/drag/drop panel hit-testing.
 */
export function hitTestPanel(panelGeometries, x, y) {
  for (let i = 0; i < panelGeometries.length; i++) {
    const pts = panelGeometries[i].points;
    let inside = false;
    for (let j = 0, k = pts.length - 1; j < pts.length; k = j++) {
      const xi = pts[j][0];
      const yi = pts[j][1];
      const xk = pts[k][0];
      const yk = pts[k][1];
      const intersects = ((yi > y) !== (yk > y))
        && (x < ((xk - xi) * (y - yi)) / ((yk - yi) || 1e-9) + xi);
      if (intersects) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

/**
 * Smart Upper-Third Face-Safe Auto-Fill:
 * - 1 photo: fills every panel with curated non-repetitive upper-third crops.
 * - Multiple photos: distributes all photos cleanly across panels with face-safe defaults.
 */
export function buildSmartAutoFillPanels(photoIds, panelCount, existingPanels = []) {
  const ids = (photoIds || []).filter(Boolean);
  const result = [];
  for (let i = 0; i < panelCount; i++) {
    const prev = existingPanels[i];
    const role = prev?.role || ['HERO', 'DUSK', 'CRUISE', 'COAST', 'VICE'][i] || `PANEL ${i + 1}`;
    if (ids.length === 0) {
      result.push({ photoId: null, zoom: 1, panX: 0, panY: -0.18, flipX: false, role });
      continue;
    }
    if (ids.length === 1) {
      const v = ONE_PHOTO_VARIATIONS[i % ONE_PHOTO_VARIATIONS.length];
      result.push({
        photoId: ids[0],
        zoom: v.zoom,
        panX: v.panX,
        panY: v.panY,
        flipX: v.flipX,
        role,
      });
    } else {
      const photoId = ids[i % ids.length];
      const isCycleRepeat = i >= ids.length;
      const v = isCycleRepeat
        ? ONE_PHOTO_VARIATIONS[(i % (ONE_PHOTO_VARIATIONS.length - 1)) + 1]
        : { zoom: 1.04, panX: 0, panY: -0.20, flipX: false };
      result.push({
        photoId,
        zoom: v.zoom,
        panX: v.panX,
        panY: v.panY,
        flipX: v.flipX,
        role,
      });
    }
  }
  return result;
}
