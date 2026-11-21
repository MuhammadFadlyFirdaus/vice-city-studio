// Layered Vice City typography engine (V3 Rank #1):
// - Grade-adaptive "Outrun Striped Chrome" (70-76% canvas width) with warm, cool-neon,
//   and tropic-teal scan-stripe palettes, cream/white inner stroke, obsidian ink outline,
//   stepped 3D drop shadow, and dual 4-point lens-flare starburst glints.
// - Zero-overlap Neon Script Subtitle (`Pacifico`, -4° tilt) anchored strictly below title.
// - Notched Swallowtail Tagline Ribbon anchored strictly below subtitle.
// - Strict Zero-Collision Cast Callout Tags evaluated against exact exclusion rects for
//   the title stack AND metallic foil medallion (never covering letters, seal, or faces).
// - 28-point Embossed Metallic Foil Starburst Medallion (gold foil on warm/tropic grades,
//   cyan-silver foil on cool neon grades) with circular outer ring legend.

import { resolveGradePreset } from './imageEffects.js';

function buildTitleFill(ctx, styleId, yTop, yBottom) {
  if (styleId === 'pure-white') {
    const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.72, '#f6f3ff');
    g.addColorStop(1, '#d7d0e8');
    return g;
  }
  if (styleId === 'neon-pink') {
    const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
    g.addColorStop(0, '#fff2fb');
    g.addColorStop(0.32, '#ff59c7');
    g.addColorStop(0.75, '#ff2a85');
    g.addColorStop(1, '#7a2bff');
    return g;
  }
  if (styleId === 'sunset-grad') {
    const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
    g.addColorStop(0, '#fff29c');
    g.addColorStop(0.35, '#ff9c3b');
    g.addColorStop(0.72, '#ff358b');
    g.addColorStop(1, '#7a1ca8');
    return g;
  }
  // retro-chrome
  const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
  g.addColorStop(0.0, '#2e2270');
  g.addColorStop(0.24, '#6cf0ff');
  g.addColorStop(0.45, '#ffffff');
  g.addColorStop(0.50, '#290c42');
  g.addColorStop(0.56, '#ff3d9a');
  g.addColorStop(0.80, '#ffa943');
  g.addColorStop(1.0, '#fff7ad');
  return g;
}

function getOutrunPalette(gradePreset) {
  const preset = resolveGradePreset(gradePreset);
  if (preset.family === 'cool') {
    return {
      stops: [
        [0.00, '#ffffff'],
        [0.18, '#9af6ff'],
        [0.40, '#3ce0ff'],
        [0.49, '#ffffff'], // Horizon glint
        [0.54, '#ff42b2'],
        [0.76, '#a824d4'],
        [0.94, '#4a168c'],
        [1.00, '#88f0ff'],
      ],
      innerStroke: '#eaffff',
      glintMid: 'rgba(138, 246, 255, 0.72)',
      glintOuter: 'rgba(255, 66, 178, 0.28)',
      ribbonFill: ['#160c38', '#481572', '#160c38'],
      ribbonBorder: ['#68f2ff', '#ff42b2', '#68f2ff'],
      ribbonText: '#f4feff',
    };
  }
  if (preset.family === 'tropic') {
    return {
      stops: [
        [0.00, '#fff8d4'],
        [0.18, '#ffc854'],
        [0.40, '#ff6f5c'],
        [0.49, '#f0fffd'], // Horizon glint
        [0.54, '#24d8cf'],
        [0.76, '#0d96b8'],
        [0.94, '#0e3a5c'],
        [1.00, '#ffd884'],
      ],
      innerStroke: '#fff7e4',
      glintMid: 'rgba(255, 232, 162, 0.72)',
      glintOuter: 'rgba(36, 216, 207, 0.28)',
      ribbonFill: ['#09263a', '#0f566e', '#09263a'],
      ribbonBorder: ['#ffd46c', '#28ded4', '#ffd46c'],
      ribbonText: '#fff9ee',
    };
  }
  // Warm family: sunset-gold, miami-heat, retro-print
  return {
    stops: [
      [0.00, '#fff9d6'],
      [0.18, '#ffd447'],
      [0.40, '#ff8828'],
      [0.49, '#fff4d4'], // Horizon glint
      [0.54, '#ff3088'],
      [0.76, '#c91476'],
      [0.94, '#6e1898'],
      [1.00, '#ffbe5c'],
    ],
    innerStroke: '#fff5dc',
    glintMid: 'rgba(255, 232, 150, 0.72)',
    glintOuter: 'rgba(255, 64, 152, 0.28)',
    ribbonFill: ['#260a2e', '#6e1650', '#260a2e'],
    ribbonBorder: ['#ffd45c', '#ff4696', '#ffd45c'],
    ribbonText: '#fff8ec',
  };
}

function fitFontSize(ctx, text, fontFamily, fontWeight, startSize, maxWidth) {
  let size = Math.round(startSize);
  while (size > 22) {
    ctx.font = `${fontWeight} ${size}px "${fontFamily}", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 3;
  }
  return size;
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

function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Crisp 4-point chrome lens-flare starburst glint.
 */
function drawLensFlareGlint(ctx, cx, cy, radius, palette) {
  ctx.save();
  ctx.translate(cx, cy);

  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.98);
  halo.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
  halo.addColorStop(0.28, palette.glintMid);
  halo.addColorStop(0.62, palette.glintOuter);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.98, 0, Math.PI * 2);
  ctx.fill();

  const drawSpike = (lenX, lenY, alpha) => {
    ctx.fillStyle = `rgba(255, 253, 242, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -lenY);
    ctx.quadraticCurveTo(lenX * 0.08, -lenY * 0.08, lenX, 0);
    ctx.quadraticCurveTo(lenX * 0.08, lenY * 0.08, 0, lenY);
    ctx.quadraticCurveTo(-lenX * 0.08, lenY * 0.08, -lenX, 0);
    ctx.quadraticCurveTo(-lenX * 0.08, -lenY * 0.08, 0, -lenY);
    ctx.closePath();
    ctx.fill();
  };

  drawSpike(radius * 1.18, radius * 1.08, 0.98);
  ctx.rotate(Math.PI / 4);
  drawSpike(radius * 0.46, radius * 0.46, 0.76);
  ctx.restore();
}

/**
 * Draws grade-adaptive "Outrun Striped Chrome" lettering fill cleanly inside the exact
 * glyph alpha mask via offscreen buffer so 80s horizontal scan-stripes stay razor-sharp.
 */
function drawOutrunStripedChromeFill(
  ctx,
  text,
  fontStr,
  align,
  anchorX,
  titleY,
  fontSize,
  scaleX,
  palette,
) {
  const padX = Math.ceil(fontSize * 0.45);
  const padY = Math.ceil(fontSize * 0.42);
  ctx.save();
  ctx.font = fontStr;
  const rawW = ctx.measureText(text).width;
  ctx.restore();

  const scaledW = Math.ceil(rawW * scaleX);
  const bufW = Math.max(16, scaledW + padX * 2);
  const bufH = Math.max(16, Math.ceil(fontSize * 1.25) + padY * 2);

  const off = document.createElement('canvas');
  off.width = bufW;
  off.height = bufH;
  const octx = off.getContext('2d');

  let localAnchorX = bufW * 0.5;
  if (align === 'left') localAnchorX = padX;
  else if (align === 'right') localAnchorX = bufW - padX;
  const localAnchorY = bufH * 0.5;

  octx.save();
  octx.translate(localAnchorX, localAnchorY);
  octx.scale(scaleX, 1);
  octx.font = fontStr;
  octx.textAlign = align;
  octx.textBaseline = 'middle';
  octx.fillStyle = '#ffffff';
  octx.fillText(text, 0, 0);
  octx.restore();

  octx.globalCompositeOperation = 'source-atop';
  const yTop = localAnchorY - fontSize * 0.44;
  const yBot = localAnchorY + fontSize * 0.44;
  const glyphH = yBot - yTop;

  const grad = octx.createLinearGradient(0, yTop, 0, yBot);
  for (const [stop, col] of palette.stops) {
    grad.addColorStop(stop, col);
  }
  octx.fillStyle = grad;
  octx.fillRect(0, 0, bufW, bufH);

  // Crisp 80s horizontal scan-stripes
  const stripeSpecs = [
    { t: 0.23, h: 0.022, color: 'rgba(255, 255, 255, 0.36)' },
    { t: 0.47, h: 0.028, color: 'rgba(255, 255, 255, 0.78)' },
    { t: 0.55, h: 0.028, color: 'rgba(20, 6, 40, 0.54)' },
    { t: 0.64, h: 0.034, color: 'rgba(18, 5, 38, 0.60)' },
    { t: 0.74, h: 0.040, color: 'rgba(16, 4, 34, 0.66)' },
    { t: 0.85, h: 0.044, color: 'rgba(14, 4, 30, 0.70)' },
  ];
  for (const st of stripeSpecs) {
    octx.fillStyle = st.color;
    octx.fillRect(0, yTop + glyphH * st.t, bufW, Math.max(2, glyphH * st.h));
  }

  // Subtle top glossy highlight band
  const gloss = octx.createLinearGradient(0, yTop, 0, yTop + glyphH * 0.28);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.56)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  octx.fillStyle = gloss;
  octx.fillRect(0, yTop, bufW, glyphH * 0.28);

  ctx.drawImage(off, anchorX - localAnchorX, titleY - localAnchorY);
}

/**
 * Computes exact center `(cx, cy)` and `outerR` for the embossed foil medallion
 * so both `drawPanelRoleTags` (exclusion zone) and `drawOriginalEditionSeal` match 100%.
 */
export function getEditionSealMetrics(width, height, frameMetrics = null, template = null) {
  const minDim = Math.min(width, height);
  const stageTop = frameMetrics ? frameMetrics.stageTop : 0;
  const stageBottom = frameMetrics ? frameMetrics.stageBottom : height;
  const stageH = stageBottom - stageTop;

  const outerR = Math.max(46, Math.round(minDim * (width > height ? 0.062 : 0.058)));
  const pad = Math.round(minDim * 0.026);
  const cx = width - pad - outerR;

  const tplId = template?.id || '';
  const stageMode = template?.stageMode || 'full-bleed';
  let cy;
  if (tplId === 'cast-mosaic' || stageMode === 'center-band') {
    cy = Math.round(stageTop + stageH * 0.50);
  } else {
    cy = Math.round(stageBottom - outerR - pad);
  }

  return {
    cx,
    cy,
    outerR,
    rect: {
      x: cx - outerR,
      y: cy - outerR,
      w: outerR * 2,
      h: outerR * 2,
    },
  };
}

/**
 * Strict Zero-Collision Cast Callout Tags:
 * Evaluates safe corners inside each panel's slanted polygon against `titleExclusionRect`
 * AND `medallionRect`, preferring bottom corners outside the upper 45% face zone.
 */
export function drawPanelRoleTags(
  ctx,
  panelGeometries,
  panelStates,
  minDim,
  titleExclusionRect = null,
  medallionRect = null,
) {
  const fontSize = Math.max(13, Math.round(minDim * 0.0185));
  const padX = Math.round(fontSize * 0.60);
  const padY = Math.round(fontSize * 0.28);
  const boxH = fontSize + padY * 2;
  const insetY = Math.round(minDim * 0.015);
  const insetX = Math.round(minDim * 0.017);

  ctx.save();
  ctx.font = `600 ${fontSize}px "Oswald", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  for (let i = 0; i < panelGeometries.length; i++) {
    const role = (panelStates[i]?.role || '').trim().toUpperCase();
    if (!role) continue;
    const geom = panelGeometries[i];
    const b = geom.bounds;
    const textW = ctx.measureText(role).width;
    const accentW = Math.max(5, Math.round(minDim * 0.0052));
    const maxBoxW = Math.max(76, b.w - insetX * 2);
    const boxW = Math.min(maxBoxW, textW + padX * 2 + accentW + 4);

    // Helper to clamp candidate box inside exact slanted polygon span at yMid
    const makeCandidate = (by, align, prefBonus) => {
      const clampedY = Math.max(b.y + 6, Math.min(b.y + b.h - boxH - 6, by));
      const spanTop = polygonSpanAtY(geom.points, clampedY);
      const spanBot = polygonSpanAtY(geom.points, clampedY + boxH);
      const leftEdge = Math.max(
        spanTop ? spanTop.minX : b.x,
        spanBot ? spanBot.minX : b.x,
      );
      const rightEdge = Math.min(
        spanTop ? spanTop.maxX : b.x + b.w,
        spanBot ? spanBot.maxX : b.x + b.w,
      );
      const availSpan = rightEdge - leftEdge;
      if (availSpan < 30) return null;
      const effBoxW = Math.min(boxW, Math.max(56, availSpan - insetX * 1.1));
      let bx;
      if (align === 'right') {
        bx = rightEdge - effBoxW - insetX;
      } else {
        bx = leftEdge + insetX;
      }
      bx = Math.max(leftEdge + 6, Math.min(rightEdge - effBoxW - 6, bx));

      // Account for parallelogram shear (-0.18 * boxH) in collision test box
      const shearPad = Math.ceil(boxH * 0.22);
      const testRect = {
        x: bx - shearPad,
        y: clampedY - 2,
        w: effBoxW + shearPad + 6,
        h: boxH + 6,
      };
      const hitsTitle = rectsOverlap(testRect, titleExclusionRect);
      const hitsSeal = rectsOverlap(testRect, medallionRect);
      const belowFaceZone = clampedY >= b.y + b.h * 0.45;

      let score = prefBonus;
      if (!hitsTitle) score += 1000;
      if (!hitsSeal) score += 1000;
      if (belowFaceZone) score += 220;
      return { bx, by: clampedY, boxW: effBoxW, score, hitsTitle, hitsSeal };
    };

    const yBottom = b.y + b.h - boxH - insetY;
    const yTop = b.y + insetY;
    const candidates = [
      makeCandidate(yBottom, 'left', 48),
      makeCandidate(yBottom, 'right', 38),
      makeCandidate(b.y + b.h * 0.72 - boxH * 0.5, 'left', 26),
      makeCandidate(b.y + b.h * 0.72 - boxH * 0.5, 'right', 20),
      makeCandidate(yTop, 'left', 14),
      makeCandidate(yTop, 'right', 10),
    ];

    if (titleExclusionRect) {
      const yAboveTitle = titleExclusionRect.y - boxH - 8;
      if (yAboveTitle >= b.y + 6 && yAboveTitle <= b.y + b.h - boxH - 6) {
        candidates.push(makeCandidate(yAboveTitle, 'left', 34));
        candidates.push(makeCandidate(yAboveTitle, 'right', 28));
      }
      const yBelowTitle = titleExclusionRect.y + titleExclusionRect.h + 8;
      if (yBelowTitle >= b.y + 6 && yBelowTitle <= b.y + b.h - boxH - 6) {
        candidates.push(makeCandidate(yBelowTitle, 'left', 42));
        candidates.push(makeCandidate(yBelowTitle, 'right', 32));
      }
    }

    if (medallionRect) {
      const yAboveSeal = medallionRect.y - boxH - 8;
      if (yAboveSeal >= b.y + 6 && yAboveSeal <= b.y + b.h - boxH - 6) {
        candidates.push(makeCandidate(yAboveSeal, 'left', 30));
      }
      const yBelowSeal = medallionRect.y + medallionRect.h + 8;
      if (yBelowSeal >= b.y + 6 && yBelowSeal <= b.y + b.h - boxH - 6) {
        candidates.push(makeCandidate(yBelowSeal, 'left', 36));
      }
    }

    const valid = candidates.filter(Boolean);
    if (valid.length === 0) continue;
    valid.sort((a, c) => c.score - a.score);
    const chosen = valid[0];

    // Draw slanted parallelogram callout plate
    ctx.save();
    ctx.translate(chosen.bx, chosen.by);
    ctx.transform(1, 0, -0.18, 1, 0, 0);

    ctx.fillStyle = 'rgba(4, 2, 10, 0.84)';
    ctx.fillRect(4, 4, chosen.boxW, boxH);

    ctx.fillStyle = 'rgba(11, 6, 22, 0.94)';
    ctx.fillRect(0, 0, chosen.boxW, boxH);

    ctx.fillStyle = geom.accent || '#ff3d9a';
    ctx.fillRect(0, 0, accentW, boxH);

    ctx.strokeStyle = 'rgba(255, 243, 214, 0.68)';
    ctx.lineWidth = Math.max(1.3, minDim * 0.0016);
    ctx.strokeRect(0, 0, chosen.boxW, boxH);

    ctx.fillStyle = '#fff9ee';
    ctx.fillText(role, accentW + padX, boxH * 0.5 + 1, chosen.boxW - accentW - padX * 1.4);
    ctx.restore();
  }
  ctx.restore();
}

function drawMiniStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.44;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Draws circular outer ring legend text around the foil medallion perimeter.
 */
function drawCircularRingText(ctx, text, radius, fontPx, color) {
  const clean = (text || '').trim().toUpperCase();
  if (!clean) return;
  const chars = Array.from(clean);
  const count = chars.length;
  if (count === 0) return;

  ctx.save();
  ctx.font = `600 ${fontPx}px "Oswald", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const stepAngle = (Math.PI * 2) / Math.max(count, 1);
  const startAngle = -Math.PI / 2 - (stepAngle * (count - 1)) * 0.5;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + i * stepAngle;
    ctx.save();
    ctx.rotate(angle + Math.PI / 2);
    ctx.translate(0, -radius);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * 28-point Embossed Metallic Foil Starburst Medallion:
 * - Gold foil on warm & tropic grades; cyan-silver foil on cool neon grades.
 * - Circular outer ring legend (`sealRingText`), bold embossed center label (`sealText`),
 *   3 embossed stars, and diagonal specular foil sheen.
 */
export function drawOriginalEditionSeal(
  ctx,
  width,
  height,
  typography,
  frameMetrics = null,
  effects = null,
  template = null,
) {
  const rawLabel = (typography.sealText || '').trim().toUpperCase();
  if (!rawLabel) return;

  const seal = getEditionSealMetrics(width, height, frameMetrics, template);
  const { cx, cy, outerR } = seal;
  const innerR = outerR * 0.88;
  const points = 28;

  const preset = resolveGradePreset(effects?.gradePreset);
  const isCoolFoil = preset.family === 'cool';

  const foil = isCoolFoil
    ? {
        shadowFill: '#05131f',
        stops: ['#f4ffff', '#96f2ff', '#2882a8', '#d6fbff', '#3a9cc2', '#e8fdff'],
        outerStroke: '#0e364f',
        ringStroke: '#144966',
        discStops: ['#f6ffff', '#94ecfa', '#3c9bc0', '#164d6d'],
        embossHighlight: 'rgba(236, 254, 255, 0.72)',
        inkColor: '#072236',
        ruleColor: 'rgba(10, 44, 68, 0.62)',
      }
    : {
        shadowFill: '#1b0f04',
        stops: ['#fff7c2', '#f5c242', '#b67312', '#ffe588', '#cc8418', '#fff0ad'],
        outerStroke: '#4a2904',
        ringStroke: '#6c3e08',
        discStops: ['#fff7cc', '#f1bc3e', '#c98216', '#8c510a'],
        embossHighlight: 'rgba(255, 248, 210, 0.68)',
        inkColor: '#2d1504',
        ruleColor: 'rgba(65, 32, 6, 0.60)',
      };

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.075);

  const traceStarburst = (rOut, rIn) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const r = i % 2 === 0 ? rOut : rIn;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // 1. Deep embossed drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
  ctx.shadowBlur = Math.round(outerR * 0.28);
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = foil.shadowFill;
  traceStarburst(outerR + 2, innerR + 1);
  ctx.fill();
  ctx.restore();

  // 2. Brushed metallic foil starburst base
  const foilGrad = ctx.createLinearGradient(-outerR, -outerR, outerR, outerR);
  foilGrad.addColorStop(0.00, foil.stops[0]);
  foilGrad.addColorStop(0.22, foil.stops[1]);
  foilGrad.addColorStop(0.45, foil.stops[2]);
  foilGrad.addColorStop(0.66, foil.stops[3]);
  foilGrad.addColorStop(0.84, foil.stops[4]);
  foilGrad.addColorStop(1.00, foil.stops[5]);
  traceStarburst(outerR, innerR);
  ctx.fillStyle = foilGrad;
  ctx.fill();
  ctx.strokeStyle = foil.outerStroke;
  ctx.lineWidth = Math.max(1.5, outerR * 0.030);
  ctx.stroke();

  // 3. Concentric embossed rings (outer legend track + inner center disc)
  const ringR1 = outerR * 0.82;
  const ringR2 = outerR * 0.63;
  ctx.beginPath();
  ctx.arc(0, 0, ringR1, 0, Math.PI * 2);
  ctx.strokeStyle = foil.ringStroke;
  ctx.lineWidth = Math.max(1.4, outerR * 0.026);
  ctx.stroke();

  // Circular outer ring legend
  const ringText = (typography.sealRingText || 'SOLARIS COVER STUDIO ★ OFFICIAL EDITION ★').trim();
  const ringFontPx = Math.max(6, Math.round(outerR * 0.115));
  drawCircularRingText(ctx, ringText, (ringR1 + ringR2) * 0.5, ringFontPx, foil.inkColor);

  // Inner embossed medallion disc
  ctx.beginPath();
  ctx.arc(0, 0, ringR2, 0, Math.PI * 2);
  const innerDisc = ctx.createRadialGradient(-ringR2 * 0.25, -ringR2 * 0.25, ringR2 * 0.1, 0, 0, ringR2);
  innerDisc.addColorStop(0, foil.discStops[0]);
  innerDisc.addColorStop(0.42, foil.discStops[1]);
  innerDisc.addColorStop(0.82, foil.discStops[2]);
  innerDisc.addColorStop(1, foil.discStops[3]);
  ctx.fillStyle = innerDisc;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 252, 235, 0.78)';
  ctx.lineWidth = Math.max(1, outerR * 0.02);
  ctx.stroke();

  // 4. Center embossed label text
  const cleaned = rawLabel.replace(/★/g, '').replace(/[•|]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean);
  let topLine = 'ORIGINAL';
  let midLine = 'COVER ART';
  if (words.length === 1) {
    topLine = 'OFFICIAL';
    midLine = words[0];
  } else if (words.length === 2) {
    topLine = words[0];
    midLine = words[1];
  } else if (words.length >= 3) {
    topLine = words[0];
    midLine = words.slice(1).join(' ');
  }

  const maxLineW = ringR2 * 1.66;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const drawEmbossedLine = (str, yPos, fontFam) => {
    ctx.font = fontFam;
    ctx.fillStyle = foil.embossHighlight;
    ctx.fillText(str, 0.8, yPos + 1, maxLineW);
    ctx.fillStyle = foil.inkColor;
    ctx.fillText(str, 0, yPos, maxLineW);
  };

  const topFontPx = Math.max(9, Math.round(outerR * 0.195));
  const midFontPx = Math.max(11, Math.round(outerR * 0.265));
  drawEmbossedLine(topLine, -outerR * 0.23, `600 ${topFontPx}px "Oswald", sans-serif`);
  drawEmbossedLine(midLine, outerR * 0.01, `400 ${midFontPx}px "Bebas Neue", "Oswald", sans-serif`);

  // Horizontal micro-divider rule
  ctx.strokeStyle = foil.ruleColor;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-ringR2 * 0.52, outerR * 0.17);
  ctx.lineTo(ringR2 * 0.52, outerR * 0.17);
  ctx.stroke();

  // Bottom 3 embossed stars
  const starR = Math.max(3.8, outerR * 0.095);
  const starY = outerR * 0.32;
  for (const sx of [-starR * 2.5, 0, starR * 2.5]) {
    drawMiniStar(ctx, sx, starY, starR);
    ctx.fillStyle = foil.inkColor;
    ctx.fill();
  }

  // Diagonal foil specular sheen
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, ringR1, 0, Math.PI * 2);
  ctx.clip();
  const sheen = ctx.createLinearGradient(-outerR, -outerR, outerR * 0.6, outerR * 0.6);
  sheen.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(0.42, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(0.50, 'rgba(255, 255, 255, 0.40)');
  sheen.addColorStop(0.58, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-outerR, -outerR, outerR * 2, outerR * 2);
  ctx.restore();

  ctx.restore();
}

/**
 * Draws the notched swallowtail tagline ribbon banner cleanly below the script subtitle.
 */
function drawSwallowtailRibbon(ctx, text, centerX, centerY, maxWidth, fontPx, palette) {
  ctx.save();
  ctx.font = `600 ${fontPx}px "Oswald", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const spaced = text.split('').join('\u200A');
  const rawW = ctx.measureText(spaced).width;
  const ribbonH = Math.round(fontPx * 1.66);
  const notch = Math.round(ribbonH * 0.42);
  const padX = Math.round(fontPx * 1.05);
  const ribbonW = Math.min(maxWidth, rawW + padX * 2 + notch * 2);
  const halfW = ribbonW * 0.5;
  const halfH = ribbonH * 0.5;

  const traceRibbon = (ox = 0, oy = 0) => {
    const lx = centerX - halfW + ox;
    const rx = centerX + halfW + ox;
    const ty = centerY - halfH + oy;
    const by = centerY + halfH + oy;
    ctx.beginPath();
    ctx.moveTo(lx, ty);
    ctx.lineTo(rx, ty);
    ctx.lineTo(rx - notch, centerY + oy);
    ctx.lineTo(rx, by);
    ctx.lineTo(lx, by);
    ctx.lineTo(lx + notch, centerY + oy);
    ctx.closePath();
  };

  // Hard offset drop shadow
  ctx.fillStyle = 'rgba(4, 2, 12, 0.78)';
  traceRibbon(3, 4);
  ctx.fill();

  // Gradient ribbon body
  const fillGrad = ctx.createLinearGradient(centerX - halfW, centerY, centerX + halfW, centerY);
  fillGrad.addColorStop(0.0, palette.ribbonFill[0]);
  fillGrad.addColorStop(0.5, palette.ribbonFill[1]);
  fillGrad.addColorStop(1.0, palette.ribbonFill[2]);
  ctx.fillStyle = fillGrad;
  traceRibbon(0, 0);
  ctx.fill();

  // Grade-matched metallic border
  const borderGrad = ctx.createLinearGradient(centerX - halfW, centerY, centerX + halfW, centerY);
  borderGrad.addColorStop(0.0, palette.ribbonBorder[0]);
  borderGrad.addColorStop(0.5, palette.ribbonBorder[1]);
  borderGrad.addColorStop(1.0, palette.ribbonBorder[2]);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = Math.max(1.8, fontPx * 0.11);
  ctx.stroke();

  // Uppercase tagline text
  ctx.fillStyle = palette.ribbonText;
  ctx.fillText(spaced, centerX, centerY + 1, ribbonW - notch * 2 - padX * 0.8);
  ctx.restore();

  return {
    x: centerX - halfW,
    y: centerY - halfH,
    w: ribbonW,
    h: ribbonH,
  };
}

export function drawCoverTypography(
  ctx,
  width,
  height,
  typography,
  panelGeometries,
  panelStates,
  frameMetrics = null,
  effects = null,
  template = null,
) {
  const minDim = Math.min(width, height);
  const stageTop = frameMetrics ? frameMetrics.stageTop : 0;
  const stageBottom = frameMetrics ? frameMetrics.stageBottom : height;
  const stageH = stageBottom - stageTop;
  const tplId = template?.id || 'cast-mosaic';
  const stageMode = template?.stageMode || 'full-bleed';
  const isLandscape = width > height;

  const rawTitle = (typography.mainTitle || '').trim();
  const titleText = typography.titleFont === 'Pacifico' ? rawTitle : rawTitle.toUpperCase();
  const subtitleText = (typography.subtitle || '').trim();
  const taglineText = (typography.tagline || '').trim().toUpperCase();

  const isOutrun = typography.titleStyle === 'outrun-striped';
  const outrunPalette = getOutrunPalette(effects?.gradePreset);
  const marginX = Math.round(width * 0.052);
  const maxTitleWidth = width - marginX * 2;
  const titleScale = (typography.titleSize ?? 100) / 100;
  const subScale = (typography.subtitleSize ?? 100) / 100;

  // Target bold 70-76% canvas width presence (scaled cleanly for cast-mosaic landscape, center-band, skyline-split)
  let widthFactor;
  if (stageMode === 'center-band') {
    widthFactor = isOutrun ? (isLandscape ? 0.132 : 0.116) : (isLandscape ? 0.118 : 0.106);
  } else if (stageMode === 'skyline-split') {
    widthFactor = isOutrun ? (isLandscape ? 0.185 : 0.156) : (isLandscape ? 0.155 : 0.135);
  } else if (tplId === 'cast-mosaic' && isLandscape) {
    widthFactor = isOutrun ? 0.155 : 0.138;
  } else {
    widthFactor = isOutrun ? (isLandscape ? 0.185 : 0.160) : (isLandscape ? 0.158 : 0.138);
  }

  const baseTitleSize = Math.round(minDim * widthFactor * titleScale);
  const titleWeight = typography.titleFont === 'Oswald' ? '600' : '400';

  let anchorX = width * 0.5;
  if (typography.titleAlign === 'left') anchorX = marginX;
  if (typography.titleAlign === 'right') anchorX = width - marginX;

  // Measure Main Title
  let measuredTitleSize = baseTitleSize;
  let measuredTitleWidth = 0;
  let titleScaleX = 1;

  if (titleText) {
    ctx.save();
    measuredTitleSize = fitFontSize(ctx, titleText, typography.titleFont, titleWeight, baseTitleSize, maxTitleWidth);
    ctx.font = `${titleWeight} ${measuredTitleSize}px "${typography.titleFont}", sans-serif`;
    const naturalW = ctx.measureText(titleText).width;
    if (isOutrun && naturalW > 0) {
      let targetRatio;
      if (stageMode === 'center-band') {
        targetRatio = 0.68;
      } else if (tplId === 'cast-mosaic' && isLandscape) {
        targetRatio = 0.635;
      } else {
        targetRatio = isLandscape ? 0.72 : 0.72;
      }
      const targetMinW = width * targetRatio * Math.min(1.06, Math.max(0.75, titleScale));
      const desiredScale = Math.min(1.42, Math.max(1.0, targetMinW / naturalW));
      const maxFitScale = maxTitleWidth / naturalW;
      titleScaleX = Math.min(desiredScale, maxFitScale);
    }
    measuredTitleWidth = naturalW * titleScaleX;
    ctx.restore();
  }

  // Measure Neon Script Subtitle
  const subWeight = typography.subtitleFont === 'Oswald' ? '600' : '400';
  const subRatio = stageMode === 'center-band'
    ? 0.044
    : (tplId === 'cast-mosaic' && isLandscape ? 0.054 : (isLandscape ? 0.060 : 0.056));
  const baseSubSize = Math.round(minDim * subRatio * subScale);
  let subSize = baseSubSize;
  let measuredSubWidth = 0;
  if (subtitleText) {
    ctx.save();
    subSize = fitFontSize(ctx, subtitleText, typography.subtitleFont, subWeight, baseSubSize, maxTitleWidth * 0.84);
    ctx.font = `${subWeight} ${subSize}px "${typography.subtitleFont}", cursive, sans-serif`;
    measuredSubWidth = ctx.measureText(subtitleText).width;
    ctx.restore();
  }

  // Tagline Ribbon metrics
  const tagFontSize = Math.max(13, Math.round(minDim * (stageMode === 'center-band' ? 0.0162 : 0.0195)));
  const ribbonH = Math.round(tagFontSize * 1.66);

  // Exact Title Center Y per layout (spec section 5.3)
  let titleCenterY;
  if (typography.titlePos === 'top') {
    titleCenterY = stageTop + Math.round(stageH * 0.165);
  } else if (typography.titlePos === 'center') {
    titleCenterY = stageTop + Math.round(stageH * 0.50);
  } else if (stageMode === 'center-band') {
    titleCenterY = stageTop + Math.round(stageH * 0.460);
  } else if (stageMode === 'skyline-split') {
    titleCenterY = stageTop + Math.round(stageH * 0.59);
  } else if (tplId === 'cast-mosaic') {
    titleCenterY = stageTop + Math.round(stageH * (isLandscape ? 0.678 : 0.66));
  } else {
    titleCenterY = stageBottom - Math.round(stageH * (taglineText ? 0.22 : 0.16));
  }

  // Strict zero-overlap vertical stack:
  // Compact tight rhythm inside center-band so title+subtitle+ribbon sit 100% inside the horizon band
  const subTitleGap = stageMode === 'center-band' ? 0.49 : 0.52;
  const subSelfGap = stageMode === 'center-band' ? 0.40 : 0.44;
  const ribSubGap = stageMode === 'center-band' ? 0.50 : 0.56;
  const ribPad = stageMode === 'center-band' ? 4 : 8;

  let subY = titleText
    ? titleCenterY + measuredTitleSize * subTitleGap + subSize * subSelfGap
    : titleCenterY;

  // Ribbon anchored strictly below subtitle (or title if no subtitle)
  let ribbonY = subtitleText
    ? subY + subSize * ribSubGap + ribbonH * 0.5 + ribPad
    : titleCenterY + (titleText ? measuredTitleSize * subTitleGap : 0) + ribbonH * 0.5 + 10;

  // Clamp whole stack inside stage [stageTop + 12 .. stageBottom - 12] so nothing ever clips
  const stackBottom = taglineText
    ? ribbonY + ribbonH * 0.5
    : subtitleText
      ? subY + subSize * 0.55
      : titleCenterY + measuredTitleSize * 0.54;
  const maxAllowedBottom = stageBottom - Math.round(minDim * 0.016);
  if (stackBottom > maxAllowedBottom) {
    const shiftUp = stackBottom - maxAllowedBottom;
    titleCenterY -= shiftUp;
    subY -= shiftUp;
    ribbonY -= shiftUp;
  }

  // Build exact exclusion rects (with 14px padding) for zero-collision Cast Callout Tags
  const exclPad = 14;
  const stackLeft = Math.min(
    titleText ? (typography.titleAlign === 'left' ? anchorX : typography.titleAlign === 'right' ? anchorX - measuredTitleWidth : anchorX - measuredTitleWidth * 0.5) : width * 0.5,
    subtitleText ? anchorX - measuredSubWidth * 0.5 : width * 0.5,
    taglineText ? width * 0.22 : width * 0.5,
  );
  const stackRight = Math.max(
    titleText ? (typography.titleAlign === 'left' ? anchorX + measuredTitleWidth : typography.titleAlign === 'right' ? anchorX : anchorX + measuredTitleWidth * 0.5) : width * 0.5,
    subtitleText ? anchorX + measuredSubWidth * 0.5 : width * 0.5,
    taglineText ? width * 0.78 : width * 0.5,
  );
  const stackTopY = titleText ? titleCenterY - measuredTitleSize * 0.54 : subY - subSize * 0.54;
  const stackBotY = taglineText
    ? ribbonY + ribbonH * 0.5
    : subtitleText
      ? subY + subSize * 0.56
      : titleCenterY + measuredTitleSize * 0.54;

  const titleExclusionRect = (titleText || subtitleText || taglineText)
    ? {
        x: stackLeft - exclPad,
        y: stackTopY - exclPad,
        w: Math.max(0, stackRight - stackLeft) + exclPad * 2,
        h: Math.max(0, stackBotY - stackTopY) + exclPad * 2,
      }
    : null;

  const sealMetrics = typography.showEditionSeal
    ? getEditionSealMetrics(width, height, frameMetrics, template)
    : null;
  const medallionRect = sealMetrics
    ? {
        x: sealMetrics.rect.x - exclPad,
        y: sealMetrics.rect.y - exclPad,
        w: sealMetrics.rect.w + exclPad * 2,
        h: sealMetrics.rect.h + exclPad * 2,
      }
    : null;

  // 1. ZERO-COLLISION PANEL CAST CALLOUT TAGS (drawn before title so title always commands foreground)
  if (typography.showRoleTags && panelGeometries) {
    drawPanelRoleTags(ctx, panelGeometries, panelStates, minDim, titleExclusionRect, medallionRect);
  }

  // Seamless theatrical radial contrast backdrop behind title zone
  if (titleText || subtitleText) {
    ctx.save();
    const rad = Math.max(width * 0.44, minDim * 0.42);
    const bandGrad = ctx.createRadialGradient(
      anchorX,
      titleCenterY + measuredTitleSize * 0.15,
      minDim * 0.04,
      anchorX,
      titleCenterY + measuredTitleSize * 0.15,
      rad,
    );
    bandGrad.addColorStop(0, 'rgba(6, 2, 16, 0.52)');
    bandGrad.addColorStop(0.55, 'rgba(9, 4, 22, 0.22)');
    bandGrad.addColorStop(1, 'rgba(6, 2, 16, 0)');
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, stageTop, width, stageH);
    ctx.restore();
  }

  // 2. MAIN DISPLAY TITLE
  if (titleText) {
    ctx.save();
    const fontStr = `${titleWeight} ${measuredTitleSize}px "${typography.titleFont}", sans-serif`;
    const align = typography.titleAlign || 'center';
    const outlinePx = Math.round((typography.titleOutline ?? 14) * (minDim / 1080) * 1.6);
    const shadowDepth = Math.round((typography.titleShadow ?? 12) * (minDim / 1080) * 1.32);

    ctx.save();
    ctx.translate(anchorX, titleCenterY);
    ctx.scale(titleScaleX, 1);
    ctx.font = fontStr;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // 3D stepped hard comic shadow
    if (shadowDepth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.80)';
      ctx.shadowBlur = Math.round(minDim * 0.026);
      ctx.shadowOffsetX = shadowDepth * 0.65;
      ctx.shadowOffsetY = shadowDepth * 0.92;
      ctx.fillStyle = '#06020d';
      ctx.strokeStyle = '#06020d';
      ctx.lineWidth = Math.max(2, outlinePx);
      const steps = Math.min(7, Math.max(2, Math.round(shadowDepth / 2.5)));
      for (let step = steps; step >= 1; step--) {
        const dx = (shadowDepth * 0.45 * step) / steps / titleScaleX;
        const dy = (shadowDepth * 0.78 * step) / steps;
        ctx.strokeText(titleText, dx, dy);
        ctx.fillText(titleText, dx, dy);
      }
      ctx.restore();
    }

    // Thick deep-obsidian outer ink outline
    if (outlinePx > 0) {
      ctx.strokeStyle = '#070310';
      ctx.lineWidth = outlinePx;
      ctx.strokeText(titleText, 0, 0);
    }

    // Crisp cream/white inner border
    if (isOutrun) {
      ctx.strokeStyle = outrunPalette.innerStroke;
      ctx.lineWidth = Math.max(3, Math.round(outlinePx * 0.28));
      ctx.strokeText(titleText, 0, 0);
    } else if (typography.titleStyle === 'retro-chrome' && outlinePx >= 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.70)';
      ctx.lineWidth = Math.max(1.5, outlinePx * 0.16);
      ctx.strokeText(titleText, 0, 0);
    }

    ctx.restore();

    // Main fill pass
    if (isOutrun) {
      drawOutrunStripedChromeFill(
        ctx,
        titleText,
        fontStr,
        align,
        anchorX,
        titleCenterY,
        measuredTitleSize,
        titleScaleX,
        outrunPalette,
      );

      // Dual 4-point chrome lens-flare starburst glints
      let leftX = anchorX - measuredTitleWidth * 0.5;
      if (align === 'left') leftX = anchorX;
      if (align === 'right') leftX = anchorX - measuredTitleWidth;
      const glintR = Math.max(16, Math.round(measuredTitleSize * 0.195));
      drawLensFlareGlint(ctx, leftX + measuredTitleWidth * 0.115, titleCenterY - measuredTitleSize * 0.34, glintR, outrunPalette);
      drawLensFlareGlint(ctx, leftX + measuredTitleWidth * 0.885, titleCenterY + measuredTitleSize * 0.14, glintR * 0.82, outrunPalette);
    } else {
      ctx.save();
      ctx.translate(anchorX, titleCenterY);
      ctx.scale(titleScaleX, 1);
      ctx.font = fontStr;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      const yTop = -measuredTitleSize * 0.46;
      const yBottom = measuredTitleSize * 0.46;
      ctx.fillStyle = buildTitleFill(ctx, typography.titleStyle, yTop, yBottom);
      if (typography.titleStyle === 'neon-pink') {
        ctx.shadowColor = 'rgba(255, 42, 145, 0.75)';
        ctx.shadowBlur = Math.round(minDim * 0.025);
      }
      ctx.fillText(titleText, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  // 3. NEON SCRIPT SUBTITLE (zero overlap, -4° tilt for Pacifico)
  if (subtitleText) {
    ctx.save();
    ctx.font = `${subWeight} ${subSize}px "${typography.subtitleFont}", cursive, sans-serif`;
    ctx.textAlign = typography.titleAlign || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    const glowFactor = (typography.subtitleGlow ?? 78) / 100;
    const neonColor = typography.subtitleColor || '#ff4fd8';

    ctx.translate(anchorX, subY);
    if (typography.subtitleFont === 'Pacifico') {
      ctx.rotate(-0.0698); // Exact -4 degrees
    }

    ctx.strokeStyle = 'rgba(8, 3, 18, 0.94)';
    ctx.lineWidth = Math.max(5, Math.round(subSize * 0.16));
    ctx.strokeText(subtitleText, 0, 0);

    if (glowFactor > 0.01) {
      ctx.save();
      ctx.fillStyle = neonColor;
      ctx.shadowColor = neonColor;
      ctx.shadowBlur = Math.round(subSize * 0.65 * glowFactor);
      ctx.fillText(subtitleText, 0, 0);
      ctx.shadowBlur = Math.round(subSize * 0.28 * glowFactor);
      ctx.fillText(subtitleText, 0, 0);
      ctx.restore();
    }

    ctx.strokeStyle = neonColor;
    ctx.lineWidth = Math.max(2, Math.round(subSize * 0.055));
    ctx.strokeText(subtitleText, 0, 0);

    ctx.fillStyle = glowFactor > 0.25 ? '#fff3fc' : neonColor;
    ctx.fillText(subtitleText, 0, 0);
    ctx.restore();
  }

  // 4. NOTCHED SWALLOWTAIL TAGLINE RIBBON (strictly below subtitle)
  if (taglineText) {
    const maxRibbonW = Math.min(width - marginX * 2.4, width * 0.78);
    drawSwallowtailRibbon(ctx, taglineText, width * 0.5, ribbonY, maxRibbonW, tagFontSize, outrunPalette);
  }

  // 5. EMBOSSED METALLIC FOIL STARBURST MEDALLION
  if (typography.showEditionSeal) {
    drawOriginalEditionSeal(ctx, width, height, typography, frameMetrics, effects, template);
  }
}
