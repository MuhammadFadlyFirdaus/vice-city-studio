// Poster layout geometry engine (V3 Rank #1 — 6 Adaptive Multi-Panel Layouts):
// Supports Cast Mosaic (7-panel full-height center hero), Skyline Split (4-panel +
// synthwave skyline horizon stage), Six Grid (6-panel + dedicated center horizon band),
// Classic 5, Diagonal 4, and Crime Epic 6 across 16:9, 4:5, and 1:1 formats.
// Also exports panel swap utilities and preview badge positioning / hit-testing.

import { DEFAULT_PANEL_ROLES } from './state.js';

export const ONE_PHOTO_VARIATIONS = Object.freeze([
  Object.freeze({ zoom: 1.04, panX: 0, panY: -0.22, flipX: false }),
  Object.freeze({ zoom: 1.38, panX: -0.14, panY: -0.26, flipX: false }),
  Object.freeze({ zoom: 1.24, panX: 0.14, panY: -0.20, flipX: true }),
  Object.freeze({ zoom: 1.15, panX: -0.08, panY: -0.16, flipX: false }),
  Object.freeze({ zoom: 1.42, panX: 0.12, panY: -0.24, flipX: true }),
  Object.freeze({ zoom: 1.28, panX: -0.06, panY: -0.26, flipX: false }),
  Object.freeze({ zoom: 1.12, panX: 0.08, panY: -0.18, flipX: true }),
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

  const edges = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy) || 1;
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

function polygonSpanAtY(points, y) {
  let minX = Infinity;
  let maxX = -Infinity;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    if ((y1 <= y && y2 >= y) || (y2 <= y && y1 >= y)) {
      if (Math.abs(y2 - y1) < 1e-5) {
        minX = Math.min(minX, x1, x2);
        maxX = Math.max(maxX, x1, x2);
      } else {
        const t = (y - y1) / (y2 - y1);
        const ix = x1 + t * (x2 - x1);
        minX = Math.min(minX, ix);
        maxX = Math.max(maxX, ix);
      }
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;
  return { minX, maxX };
}

function buildPanelGeometry(
  rawNormPanels,
  width,
  height,
  frameRatio = 0.017,
  gutterRatio = 0.013,
  insets = {},
) {
  const minDim = Math.min(width, height);
  const frameX = Math.round(minDim * frameRatio);
  const frameTop = insets.topInset > 0 ? insets.topInset : Math.round(minDim * frameRatio);
  const frameBottom = insets.bottomInset > 0 ? insets.bottomInset : Math.round(minDim * frameRatio);
  const halfGutter = Math.max(4, Math.round(minDim * gutterRatio * 0.5));
  const innerW = Math.max(60, width - frameX * 2);
  const innerH = Math.max(60, height - frameTop - frameBottom);

  return rawNormPanels.map((panelDef, index) => {
    const absPts = panelDef.poly.map(([nx, ny]) => [
      frameX + nx * innerW,
      frameTop + ny * innerH,
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

// ============================================================================
// 1. CAST MOSAIC — 7 Panels (FLAGSHIP DEFAULT for 16:9 Landscape)
// Full-height commanding center hero flanked by 2 stacked left & 4 right cast panels.
// ============================================================================
const CAST_MOSAIC_LAYOUTS = {
  landscape: [
    // Panel 0: Full-height Center Hero (THE BOSS)
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.235, 0], [0.605, 0], [0.580, 1], [0.210, 1]] },
    // Panel 1: Top-Left (THE DRIVER)
    { id: 'top-left', accent: '#35e8ff', poly: [[0, 0], [0.235, 0], [0.223, 0.525], [0, 0.525]] },
    // Panel 2: Bottom-Left (THE RIDER)
    { id: 'bot-left', accent: '#ff8c42', poly: [[0, 0.525], [0.223, 0.525], [0.210, 1], [0, 1]] },
    // Panel 3: Top-Mid-Right (THE MECHANIC)
    { id: 'top-mid-r', accent: '#ffd166', poly: [[0.605, 0], [0.805, 0], [0.793, 0.50], [0.593, 0.50]] },
    // Panel 4: Top-Far-Right (THE CAPTAIN)
    { id: 'top-far-r', accent: '#ff5e7e', poly: [[0.805, 0], [1, 0], [1, 0.50], [0.793, 0.50]] },
    // Panel 5: Bottom-Mid-Right (THE FIXER)
    { id: 'bot-mid-r', accent: '#b86bff', poly: [[0.593, 0.50], [0.793, 0.50], [0.780, 1], [0.580, 1]] },
    // Panel 6: Bottom-Far-Right (THE LOOKOUT)
    { id: 'bot-far-r', accent: '#ff4fd8', poly: [[0.793, 0.50], [1, 0.50], [1, 1], [0.780, 1]] },
  ],
  portrait: [
    // Center tall hero + 2 top flank + 2 mid flank + 2 bottom panels
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.265, 0.247], [0.745, 0.233], [0.725, 0.723], [0.245, 0.738]] },
    { id: 'top-left', accent: '#35e8ff', poly: [[0, 0], [0.510, 0], [0.495, 0.240], [0, 0.255]] },
    { id: 'mid-left', accent: '#ff8c42', poly: [[0, 0.255], [0.265, 0.247], [0.245, 0.738], [0, 0.745]] },
    { id: 'top-right', accent: '#ffd166', poly: [[0.510, 0], [1, 0], [1, 0.225], [0.495, 0.240]] },
    { id: 'mid-right', accent: '#ff5e7e', poly: [[0.745, 0.233], [1, 0.225], [1, 0.715], [0.725, 0.723]] },
    { id: 'bot-left', accent: '#b86bff', poly: [[0, 0.745], [0.505, 0.730], [0.490, 1], [0, 1]] },
    { id: 'bot-right', accent: '#ff4fd8', poly: [[0.505, 0.730], [1, 0.715], [1, 1], [0.490, 1]] },
  ],
  square: [
    // Tall top-center hero + 2 left + 2 right + 2 bottom panels
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.280, 0], [0.730, 0], [0.710, 0.686], [0.260, 0.695]] },
    { id: 'top-left', accent: '#35e8ff', poly: [[0, 0], [0.280, 0], [0.270, 0.350], [0, 0.360]] },
    { id: 'mid-left', accent: '#ff8c42', poly: [[0, 0.360], [0.270, 0.350], [0.260, 0.695], [0, 0.700]] },
    { id: 'top-right', accent: '#ffd166', poly: [[0.730, 0], [1, 0], [1, 0.330], [0.720, 0.340]] },
    { id: 'mid-right', accent: '#ff5e7e', poly: [[0.720, 0.340], [1, 0.330], [1, 0.680], [0.710, 0.686]] },
    { id: 'bot-left', accent: '#b86bff', poly: [[0, 0.700], [0.505, 0.690], [0.490, 1], [0, 1]] },
    { id: 'bot-right', accent: '#ff4fd8', poly: [[0.505, 0.690], [1, 0.680], [1, 1], [0.490, 1]] },
  ],
};

// ============================================================================
// 2. SKYLINE SPLIT — 4 Panels + Full-Bleed Synthwave Skyline & Palm Horizon Stage
// (FLAGSHIP for 4:5 Portrait / 03-cover-portrait.jpg)
// ============================================================================
const SKYLINE_SPLIT_STRIPS = [
  // Panel 0: Center-Left Dominant Portrait Hero
  { id: 'hero', isHero: true, accent: '#35e8ff', poly: [[0.265, 0], [0.530, 0], [0.500, 0.56], [0.235, 0.56]] },
  // Panel 1: Far-Left Slanted Strip
  { id: 'strip-left', accent: '#ff3d9a', poly: [[0, 0], [0.265, 0], [0.235, 0.56], [0, 0.56]] },
  // Panel 2: Mid-Right Slanted Strip
  { id: 'strip-mid-r', accent: '#ffd166', poly: [[0.530, 0], [0.775, 0], [0.745, 0.56], [0.500, 0.56]] },
  // Panel 3: Far-Right Slanted Strip
  { id: 'strip-far-r', accent: '#b86bff', poly: [[0.775, 0], [1, 0], [1, 0.56], [0.745, 0.56]] },
];

const SKYLINE_SPLIT_LAYOUTS = {
  landscape: SKYLINE_SPLIT_STRIPS,
  portrait: SKYLINE_SPLIT_STRIPS,
  square: SKYLINE_SPLIT_STRIPS,
};

// ============================================================================
// 3. SIX GRID — 6 Panels + Dedicated Center Horizon Title Band
// (FLAGSHIP for 1:1 Square / 04-cover-square.jpg)
// ============================================================================
function buildSixGridRows(topEnd, botStart) {
  return [
    // Panel 0: Top-Center Hero Portrait
    { id: 'hero', isHero: true, accent: '#28ded4', poly: [[0.335, 0], [0.675, 0], [0.660, topEnd], [0.320, topEnd]] },
    // Panel 1: Top-Left Cast
    { id: 'top-left', accent: '#ffd166', poly: [[0, 0], [0.335, 0], [0.320, topEnd], [0, topEnd]] },
    // Panel 2: Top-Right Cast
    { id: 'top-right', accent: '#ff5e7e', poly: [[0.675, 0], [1, 0], [1, topEnd], [0.660, topEnd]] },
    // Panel 3: Bottom-Left Cast
    { id: 'bot-left', accent: '#ff8c42', poly: [[0, botStart], [0.330, botStart], [0.315, 1], [0, 1]] },
    // Panel 4: Bottom-Center Cast
    { id: 'bot-center', accent: '#b86bff', poly: [[0.330, botStart], [0.668, botStart], [0.653, 1], [0.315, 1]] },
    // Panel 5: Bottom-Right Cast
    { id: 'bot-right', accent: '#35e8ff', poly: [[0.668, botStart], [1, botStart], [1, 1], [0.653, 1]] },
  ];
}

const SIX_GRID_LAYOUTS = {
  landscape: buildSixGridRows(0.38, 0.625),
  portrait: buildSixGridRows(0.38, 0.625),
  square: buildSixGridRows(0.38, 0.625),
};

// ============================================================================
// 4. CLASSIC 5 — 5-Panel Asymmetric Poster
// ============================================================================
const CLASSIC_VICE_LAYOUTS = {
  landscape: [
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.305, 0], [0.705, 0], [0.68, 1], [0.28, 1]] },
    { id: 'top-left', accent: '#35e8ff', poly: [[0, 0], [0.305, 0], [0.293, 0.49], [0, 0.52]] },
    { id: 'bot-left', accent: '#ff8c42', poly: [[0, 0.52], [0.293, 0.49], [0.28, 1], [0, 1]] },
    { id: 'top-right', accent: '#ffd166', poly: [[0.705, 0], [1, 0], [1, 0.47], [0.693, 0.50]] },
    { id: 'bot-right', accent: '#ff4fd8', poly: [[0.693, 0.50], [1, 0.47], [1, 1], [0.68, 1]] },
  ],
  portrait: [
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0, 0.275], [0.615, 0.255], [0.59, 0.725], [0, 0.745]] },
    { id: 'top-left', accent: '#35e8ff', poly: [[0, 0], [0.475, 0], [0.46, 0.26], [0, 0.275]] },
    { id: 'bot-wide', accent: '#ff8c42', poly: [[0, 0.745], [1, 0.708], [1, 1], [0, 1]] },
    { id: 'top-right', accent: '#ffd166', poly: [[0.475, 0], [1, 0], [1, 0.242], [0.46, 0.26]] },
    { id: 'mid-right', accent: '#ff4fd8', poly: [[0.615, 0.255], [1, 0.242], [1, 0.708], [0.59, 0.725]] },
  ],
  square: [
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0, 0], [0.59, 0], [0.57, 0.60], [0, 0.62]] },
    { id: 'top-right', accent: '#35e8ff', poly: [[0.59, 0], [1, 0], [1, 0.34], [0.581, 0.36]] },
    { id: 'bot-left', accent: '#ff8c42', poly: [[0, 0.62], [0.57, 0.60], [0.555, 1], [0, 1]] },
    { id: 'mid-right', accent: '#ffd166', poly: [[0.581, 0.36], [1, 0.34], [1, 0.66], [0.568, 0.68]] },
    { id: 'bot-right', accent: '#ff4fd8', poly: [[0.568, 0.68], [1, 0.66], [1, 1], [0.555, 1]] },
  ],
};

// ============================================================================
// 5. DIAGONAL 4 — 4-Panel Diagonal Slash Poster
// ============================================================================
const SUNSET_BLVD_LAYOUTS = {
  landscape: [
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.23, 0], [0.64, 0], [0.54, 1], [0.13, 1]] },
    { id: 'left-slash', accent: '#35e8ff', poly: [[0, 0], [0.23, 0], [0.13, 1], [0, 1]] },
    { id: 'bot-right', accent: '#ff8c42', poly: [[0.59, 0.49], [1, 0.49], [1, 1], [0.54, 1]] },
    { id: 'top-right', accent: '#ffd166', poly: [[0.64, 0], [1, 0], [1, 0.49], [0.59, 0.49]] },
  ],
  portrait: [
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0, 0], [0.64, 0], [0.52, 0.71], [0, 0.75]] },
    { id: 'top-right', accent: '#35e8ff', poly: [[0.64, 0], [1, 0], [1, 0.37], [0.58, 0.41]] },
    { id: 'bot-slash', accent: '#ff8c42', poly: [[0, 0.75], [1, 0.67], [1, 1], [0, 1]] },
    { id: 'mid-right', accent: '#ffd166', poly: [[0.58, 0.41], [1, 0.37], [1, 0.67], [0.52, 0.71]] },
  ],
  square: [
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0, 0], [0.60, 0], [0.48, 0.68], [0, 0.74]] },
    { id: 'top-right', accent: '#35e8ff', poly: [[0.60, 0], [1, 0], [1, 0.45], [0.515, 0.50]] },
    { id: 'bot-left', accent: '#ff8c42', poly: [[0, 0.74], [0.48, 0.68], [0.43, 1], [0, 1]] },
    { id: 'bot-right', accent: '#ffd166', poly: [[0.515, 0.50], [1, 0.45], [1, 1], [0.43, 1]] },
  ],
};

// ============================================================================
// 6. CRIME EPIC 6 — 6-Panel Classic Hero + Wide Action Strip
// ============================================================================
const CRIME_EPIC_LAYOUTS = {
  landscape: [
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.33, 0], [0.67, 0], [0.65, 0.67], [0.35, 0.67]] },
    { id: 'top-left-a', accent: '#35e8ff', poly: [[0, 0], [0.17, 0], [0.185, 0.67], [0, 0.67]] },
    { id: 'bot-wide', accent: '#ff8c42', poly: [[0, 0.67], [1, 0.67], [1, 1], [0, 1]] },
    { id: 'top-right-a', accent: '#ffd166', poly: [[0.67, 0], [0.83, 0], [0.815, 0.67], [0.65, 0.67]] },
    { id: 'top-left-b', accent: '#b86bff', poly: [[0.17, 0], [0.33, 0], [0.35, 0.67], [0.185, 0.67]] },
    { id: 'top-right-b', accent: '#ff4fd8', poly: [[0.83, 0], [1, 0], [1, 0.67], [0.815, 0.67]] },
  ],
  portrait: [
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.255, 0.285], [0.745, 0.265], [0.725, 0.725], [0.235, 0.745]] },
    { id: 'top-left', accent: '#35e8ff', poly: [[0, 0], [0.515, 0], [0.495, 0.275], [0, 0.295]] },
    { id: 'bot-wide', accent: '#ff8c42', poly: [[0, 0.755], [1, 0.715], [1, 1], [0, 1]] },
    { id: 'top-right', accent: '#ffd166', poly: [[0.515, 0], [1, 0], [1, 0.255], [0.495, 0.275]] },
    { id: 'mid-left', accent: '#b86bff', poly: [[0, 0.295], [0.255, 0.285], [0.235, 0.745], [0, 0.755]] },
    { id: 'mid-right', accent: '#ff4fd8', poly: [[0.745, 0.265], [1, 0.255], [1, 0.715], [0.725, 0.725]] },
  ],
  square: [
    { id: 'hero', isHero: true, accent: '#ff3d9a', poly: [[0.30, 0], [0.70, 0], [0.68, 0.685], [0.28, 0.705]] },
    { id: 'top-left', accent: '#35e8ff', poly: [[0, 0], [0.30, 0], [0.29, 0.36], [0, 0.38]] },
    { id: 'bot-wide', accent: '#ff8c42', poly: [[0, 0.72], [1, 0.67], [1, 1], [0, 1]] },
    { id: 'top-right', accent: '#ffd166', poly: [[0.70, 0], [1, 0], [1, 0.345], [0.69, 0.365]] },
    { id: 'mid-left', accent: '#b86bff', poly: [[0, 0.38], [0.29, 0.36], [0.28, 0.705], [0, 0.72]] },
    { id: 'mid-right', accent: '#ff4fd8', poly: [[0.69, 0.365], [1, 0.345], [1, 0.67], [0.68, 0.685]] },
  ],
};

export const POSTER_TEMPLATES = [
  {
    id: 'cast-mosaic',
    name: 'Cast Mosaic',
    subtitle: '7-Panel Center Hero Key Art',
    panelCount: 7,
    stageMode: 'full-bleed',
    frameRatio: 0.016,
    gutterRatio: 0.013,
    layouts: CAST_MOSAIC_LAYOUTS,
  },
  {
    id: 'skyline-split',
    name: 'Skyline Split',
    subtitle: '4-Panel + Miami Horizon Stage',
    panelCount: 4,
    stageMode: 'skyline-split',
    skylineStartY: { landscape: 0.56, portrait: 0.56, square: 0.56 },
    frameRatio: 0.016,
    gutterRatio: 0.013,
    layouts: SKYLINE_SPLIT_LAYOUTS,
  },
  {
    id: 'six-grid',
    name: 'Six Grid',
    subtitle: '6-Panel + Center Horizon Band',
    panelCount: 6,
    stageMode: 'center-band',
    bandSpan: { landscape: [0.38, 0.625], portrait: [0.38, 0.625], square: [0.38, 0.625] },
    frameRatio: 0.016,
    gutterRatio: 0.013,
    layouts: SIX_GRID_LAYOUTS,
  },
  {
    id: 'classic-vice',
    name: 'Classic 5',
    subtitle: '5-Panel Asymmetric Poster',
    panelCount: 5,
    stageMode: 'full-bleed',
    frameRatio: 0.017,
    gutterRatio: 0.014,
    layouts: CLASSIC_VICE_LAYOUTS,
  },
  {
    id: 'sunset-blvd',
    name: 'Diagonal 4',
    subtitle: '4-Panel Diagonal Slash',
    panelCount: 4,
    stageMode: 'full-bleed',
    frameRatio: 0.017,
    gutterRatio: 0.014,
    layouts: SUNSET_BLVD_LAYOUTS,
  },
  {
    id: 'crime-epic',
    name: 'Crime Epic 6',
    subtitle: '6-Panel Hero + Wide Strip',
    panelCount: 6,
    stageMode: 'full-bleed',
    frameRatio: 0.017,
    gutterRatio: 0.014,
    layouts: CRIME_EPIC_LAYOUTS,
  },
];

const TEMPLATE_ALIASES = Object.freeze({
  'neon-night': 'skyline-split',
});

export function getTemplateById(templateId) {
  const mappedId = TEMPLATE_ALIASES[templateId] || templateId;
  return POSTER_TEMPLATES.find((t) => t.id === mappedId) || POSTER_TEMPLATES[0];
}

export function resolveTemplatePanels(templateId, formatId, width, height, insets = {}) {
  const tpl = getTemplateById(templateId);
  const raw = tpl.layouts[formatId] || tpl.layouts.landscape;
  return buildPanelGeometry(raw, width, height, tpl.frameRatio, tpl.gutterRatio, insets);
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
 * Returns a new panels array with photoId, zoom, panX, panY, flipX, and role
 * cleanly swapped between `idxA` and `idxB`.
 */
export function swapPanelContents(panels, idxA, idxB) {
  if (!Array.isArray(panels)) return [];
  const next = panels.map((p) => ({ ...p }));
  if (idxA === idxB || idxA < 0 || idxB < 0 || idxA >= next.length || idxB >= next.length) {
    return next;
  }
  const a = next[idxA];
  const b = next[idxB];
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

  return next;
}

/**
 * Returns `{ x, y, r }` for the preview-only numbered panel badge (1..N)
 * tucked cleanly inside the top-left inner corner of each slanted panel.
 */
export function getPanelBadgePosition(geom, minDim) {
  const r = Math.max(13, Math.round(minDim * 0.0175));
  const pad = Math.max(8, Math.round(r * 0.65));
  const y = Math.min(
    geom.bounds.y + geom.bounds.h - r - 4,
    geom.bounds.y + pad + r,
  );
  const span = polygonSpanAtY(geom.points, y);
  const leftEdge = span ? span.minX : geom.bounds.x;
  const rightEdge = span ? span.maxX : geom.bounds.x + geom.bounds.w;
  const x = Math.max(
    leftEdge + r + 4,
    Math.min(rightEdge - r - 4, leftEdge + pad + r),
  );
  return { x: Math.round(x), y: Math.round(y), r };
}

/**
 * Hit-tests the preview-only numbered panel badges (1..N) for drag-to-swap.
 */
export function hitTestPanelBadge(geometries, x, y, minDim) {
  if (!geometries || geometries.length === 0) return -1;
  for (let i = 0; i < geometries.length; i++) {
    const pos = getPanelBadgePosition(geometries[i], minDim);
    const hitRadius = pos.r * 1.4;
    if (Math.hypot(x - pos.x, y - pos.y) <= hitRadius) {
      return i;
    }
  }
  return -1;
}

/**
 * Fallback upper-third auto-fill (retained for backward compatibility alongside
 * buildFaceAwareAutoFill in faceCrop.js).
 */
export function buildSmartAutoFillPanels(photoIds, panelCount, existingPanels = []) {
  const ids = (photoIds || []).filter(Boolean);
  const result = [];
  for (let i = 0; i < panelCount; i++) {
    const prev = existingPanels[i];
    const role = prev?.role || DEFAULT_PANEL_ROLES[i] || `PANEL ${i + 1}`;
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
