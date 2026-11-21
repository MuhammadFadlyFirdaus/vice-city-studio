// Layered Vice City typography engine (V2 Flagship):
// - "Outrun Striped Chrome" (default): 65-75% canvas width, 80s horizontal-striped
//   gold-orange-magenta gradient, crisp cream inner stroke, thick black ink outline,
//   3D stacked shadow, and 2 crisp 4-point lens-flare glints.
// - Slanted Panel Cast Callout Tags anchored at bottom corners (never covering faces).
// - Embossed Gold-Foil Starburst Medallion ("ORIGINAL COVER ART • ★★★") in bottom-right gutter.
// - Zero Rockstar IP.

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
  // retro-chrome (80s horizon metallic chrome with sunset reflection)
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

function fitFontSize(ctx, text, fontFamily, fontWeight, startSize, maxWidth) {
  let size = Math.round(startSize);
  while (size > 24) {
    ctx.font = `${fontWeight} ${size}px "${fontFamily}", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 3;
  }
  return size;
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/**
 * Computes the horizontal [minX, maxX] intersection span of a convex polygon at `y`.
 */
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

/**
 * Crisp 4-point chrome lens-flare star glint.
 */
function drawLensFlareGlint(ctx, cx, cy, radius) {
  ctx.save();
  ctx.translate(cx, cy);

  // Soft warm-white outer halo
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.95);
  halo.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
  halo.addColorStop(0.28, 'rgba(255, 232, 150, 0.65)');
  halo.addColorStop(0.62, 'rgba(255, 78, 178, 0.22)');
  halo.addColorStop(1, 'rgba(255, 78, 178, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
  ctx.fill();

  // Sharp 4-point primary diamond spikes
  const drawSpike = (lenX, lenY, alpha) => {
    ctx.fillStyle = `rgba(255, 252, 236, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, -lenY);
    ctx.quadraticCurveTo(lenX * 0.08, -lenY * 0.08, lenX, 0);
    ctx.quadraticCurveTo(lenX * 0.08, lenY * 0.08, 0, lenY);
    ctx.quadraticCurveTo(-lenX * 0.08, lenY * 0.08, -lenX, 0);
    ctx.quadraticCurveTo(-lenX * 0.08, -lenY * 0.08, 0, -lenY);
    ctx.closePath();
    ctx.fill();
  };

  drawSpike(radius * 1.15, radius * 1.05, 0.96);

  // Subtle 45-degree micro-spikes
  ctx.rotate(Math.PI / 4);
  drawSpike(radius * 0.44, radius * 0.44, 0.72);

  ctx.restore();
}

/**
 * Draws the "Outrun Striped Chrome" lettering fill cleanly inside the exact glyph mask
 * using an offscreen buffer so 80s horizontal scan-stripes stay razor-sharp.
 */
function drawOutrunStripedChromeFill(ctx, text, fontStr, align, anchorX, titleY, fontSize, scaleX) {
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

  // Compute draw origin inside offscreen buffer
  let localAnchorX = bufW * 0.5;
  if (align === 'left') localAnchorX = padX;
  else if (align === 'right') localAnchorX = bufW - padX;
  const localAnchorY = bufH * 0.5;

  // 1. Paint solid glyph alpha mask
  octx.save();
  octx.translate(localAnchorX, localAnchorY);
  octx.scale(scaleX, 1);
  octx.font = fontStr;
  octx.textAlign = align;
  octx.textBaseline = 'middle';
  octx.fillStyle = '#ffffff';
  octx.fillText(text, 0, 0);
  octx.restore();

  // 2. Apply rich 80s gold-orange-magenta vertical gradient inside glyphs
  octx.globalCompositeOperation = 'source-atop';
  const yTop = localAnchorY - fontSize * 0.44;
  const yBot = localAnchorY + fontSize * 0.44;
  const glyphH = yBot - yTop;

  const grad = octx.createLinearGradient(0, yTop, 0, yBot);
  grad.addColorStop(0.00, '#fff8c4');
  grad.addColorStop(0.18, '#ffd447');
  grad.addColorStop(0.40, '#ff8d29');
  grad.addColorStop(0.49, '#fff5d6'); // Bright chrome horizon sheen
  grad.addColorStop(0.54, '#ff358b');
  grad.addColorStop(0.76, '#e0167b');
  grad.addColorStop(0.92, '#7b1fa2');
  grad.addColorStop(1.00, '#ffbf5e');
  octx.fillStyle = grad;
  octx.fillRect(0, 0, bufW, bufH);

  // 3. Crisp 80s horizontal scan-stripes across lower-middle chrome zone
  const stripeSpecs = [
    { t: 0.24, h: 0.022, color: 'rgba(255, 255, 255, 0.34)' },
    { t: 0.47, h: 0.026, color: 'rgba(255, 255, 255, 0.72)' },
    { t: 0.55, h: 0.030, color: 'rgba(28, 6, 48, 0.56)' },
    { t: 0.64, h: 0.036, color: 'rgba(28, 6, 48, 0.62)' },
    { t: 0.74, h: 0.042, color: 'rgba(24, 5, 42, 0.68)' },
    { t: 0.85, h: 0.046, color: 'rgba(20, 4, 36, 0.72)' },
  ];
  for (const st of stripeSpecs) {
    octx.fillStyle = st.color;
    octx.fillRect(0, yTop + glyphH * st.t, bufW, Math.max(2, glyphH * st.h));
  }

  // Subtle top glossy highlight band
  const gloss = octx.createLinearGradient(0, yTop, 0, yTop + glyphH * 0.28);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  octx.fillStyle = gloss;
  octx.fillRect(0, yTop, bufW, glyphH * 0.28);

  // Composite back onto main canvas aligned to (anchorX, titleY)
  ctx.drawImage(off, anchorX - localAnchorX, titleY - localAnchorY);
}

/**
 * Draws slanted Panel Cast Callout Tags ("THE DRIVER", "THE FIXER", etc.)
 * anchored at the bottom corner of each panel so faces are never obscured.
 */
export function drawPanelRoleTags(ctx, panelGeometries, panelStates, minDim, titleBand = null) {
  const fontSize = Math.max(14, Math.round(minDim * 0.019));
  const padX = Math.round(fontSize * 0.62);
  const padY = Math.round(fontSize * 0.28);
  const boxH = fontSize + padY * 2;
  const insetY = Math.round(minDim * 0.015);
  const insetX = Math.round(minDim * 0.018);

  ctx.save();
  ctx.font = `600 ${fontSize}px "Oswald", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  for (let i = 0; i < panelGeometries.length; i++) {
    const role = (panelStates[i]?.role || '').trim().toUpperCase();
    if (!role) continue;
    const geom = panelGeometries[i];
    const textW = ctx.measureText(role).width;
    const accentW = Math.max(5, Math.round(minDim * 0.0055));
    const maxBoxW = Math.max(80, geom.bounds.w - insetX * 2);
    const boxW = Math.min(maxBoxW, textW + padX * 2 + accentW + 4);

    // Anchor near bottom of panel (safe from faces in upper half)
    let by = geom.bounds.y + geom.bounds.h - boxH - insetY;

    // For center Hero panel when Main Title occupies the lower band, place tag neatly just above title
    if (geom.isHero && titleBand && titleBand.pos === 'bottom') {
      const safeAboveTitle = titleBand.topY - boxH - Math.round(minDim * 0.016);
      if (safeAboveTitle > geom.bounds.y + geom.bounds.h * 0.48) {
        by = Math.min(by, safeAboveTitle);
      }
    }

    // Clamp horizontally inside exact slanted polygon edge at `by + boxH * 0.5`
    const span = polygonSpanAtY(geom.points, by + boxH * 0.5);
    const leftEdge = span ? span.minX : geom.bounds.x;
    const rightEdge = span ? span.maxX : geom.bounds.x + geom.bounds.w;
    let bx = leftEdge + insetX;
    // For bottom-right panel when Main Title + Subtitle sit bottom-center, shift tag cleanly right of subtitle
    if (geom.id === 'bot-right' && titleBand && titleBand.pos === 'bottom') {
      bx = Math.max(bx, geom.bounds.x + geom.bounds.w * 0.28);
    }
    if (bx + boxW > rightEdge - insetX * 0.6) {
      bx = Math.max(leftEdge + 6, rightEdge - boxW - insetX * 0.6);
    }

    // Draw slanted parallelogram callout plate
    ctx.save();
    ctx.translate(bx, by);
    ctx.transform(1, 0, -0.18, 1, 0, 0);

    // Hard comic offset shadow
    ctx.fillStyle = 'rgba(4, 2, 10, 0.82)';
    ctx.fillRect(4, 4, boxW, boxH);

    // Dark obsidian plate
    ctx.fillStyle = 'rgba(11, 6, 22, 0.93)';
    ctx.fillRect(0, 0, boxW, boxH);

    // Vibrant per-panel accent slash on left
    ctx.fillStyle = geom.accent || '#ff3d9a';
    ctx.fillRect(0, 0, accentW, boxH);

    // Crisp cream/gold hairline border
    ctx.strokeStyle = 'rgba(255, 243, 214, 0.65)';
    ctx.lineWidth = Math.max(1.3, minDim * 0.0016);
    ctx.strokeRect(0, 0, boxW, boxH);

    // Crisp uppercase cast role text
    ctx.fillStyle = '#fff9ee';
    ctx.fillText(role, accentW + padX, boxH * 0.5 + 1, boxW - accentW - padX * 1.5);
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
 * Embossed Gold-Foil Starburst Medallion ("ORIGINAL COVER ART • ★★★")
 * positioned cleanly in the bottom-right gutter area.
 */
export function drawOriginalEditionSeal(ctx, width, height, typography, frameMetrics = null) {
  const rawLabel = (typography.sealText || '').trim().toUpperCase();
  if (!rawLabel) return;

  const minDim = Math.min(width, height);
  const outerR = Math.max(48, Math.round(minDim * (width > height ? 0.062 : 0.056)));
  const innerR = outerR * 0.87;
  const points = 24;

  const stageBottom = frameMetrics ? frameMetrics.stageBottom : height;
  const marginX = Math.round(minDim * 0.026);
  const marginY = Math.round(minDim * 0.024);

  const cx = width - marginX - outerR;
  const cy = stageBottom - marginY - outerR;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.085);

  // Starburst serrated foil path helper
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
  ctx.fillStyle = '#1b0f04';
  traceStarburst(outerR + 2, innerR + 1);
  ctx.fill();
  ctx.restore();

  // 2. Brushed gold-foil metallic base
  const foilGrad = ctx.createLinearGradient(-outerR, -outerR, outerR, outerR);
  foilGrad.addColorStop(0.00, '#fff7c2');
  foilGrad.addColorStop(0.22, '#f5c242');
  foilGrad.addColorStop(0.45, '#b67312');
  foilGrad.addColorStop(0.66, '#ffe588');
  foilGrad.addColorStop(0.84, '#cc8418');
  foilGrad.addColorStop(1.00, '#fff0ad');
  traceStarburst(outerR, innerR);
  ctx.fillStyle = foilGrad;
  ctx.fill();
  ctx.strokeStyle = '#4a2904';
  ctx.lineWidth = Math.max(1.5, outerR * 0.032);
  ctx.stroke();

  // 3. Concentric embossed rings
  const ringR1 = outerR * 0.78;
  const ringR2 = outerR * 0.70;
  ctx.beginPath();
  ctx.arc(0, 0, ringR1, 0, Math.PI * 2);
  ctx.strokeStyle = '#6c3e08';
  ctx.lineWidth = Math.max(1.6, outerR * 0.032);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, ringR2, 0, Math.PI * 2);
  const innerDisc = ctx.createRadialGradient(-ringR2 * 0.25, -ringR2 * 0.25, ringR2 * 0.1, 0, 0, ringR2);
  innerDisc.addColorStop(0, '#fff7cc');
  innerDisc.addColorStop(0.42, '#f1bc3e');
  innerDisc.addColorStop(0.82, '#c98216');
  innerDisc.addColorStop(1, '#8c510a');
  ctx.fillStyle = innerDisc;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 250, 224, 0.75)';
  ctx.lineWidth = Math.max(1, outerR * 0.02);
  ctx.stroke();

  // 4. Parse label text cleanly so user edits to sealText update immediately
  const cleaned = rawLabel.replace(/★/g, '').replace(/[•|]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean);
  let topLine = 'ORIGINAL';
  let midLine = 'COVER ART';
  if (words.length === 1) {
    topLine = 'EDITION';
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

  // Subtle champagne emboss highlight behind dark text
  const drawEmbossedLine = (str, yPos, fontPx, fontFam) => {
    ctx.font = fontFam;
    ctx.fillStyle = 'rgba(255, 248, 210, 0.65)';
    ctx.fillText(str, 0.8, yPos + 1, maxLineW);
    ctx.fillStyle = '#2d1504';
    ctx.fillText(str, 0, yPos, maxLineW);
  };

  const topFontPx = Math.max(10, Math.round(outerR * 0.22));
  const midFontPx = Math.max(12, Math.round(outerR * 0.29));
  drawEmbossedLine(topLine, -outerR * 0.29, topFontPx, `600 ${topFontPx}px "Oswald", sans-serif`);
  drawEmbossedLine(midLine, -outerR * 0.01, midFontPx, `400 ${midFontPx}px "Bebas Neue", "Oswald", sans-serif`);

  // Horizontal micro-divider rule
  ctx.strokeStyle = 'rgba(65, 32, 6, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-ringR2 * 0.56, outerR * 0.17);
  ctx.lineTo(ringR2 * 0.56, outerR * 0.17);
  ctx.stroke();

  // Bottom 3 embossed stars
  const starR = Math.max(4.5, outerR * 0.115);
  const starY = outerR * 0.36;
  const starOffsets = [-starR * 2.5, 0, starR * 2.5];
  for (const sx of starOffsets) {
    drawMiniStar(ctx, sx, starY, starR);
    ctx.fillStyle = '#381a04';
    ctx.fill();
  }

  // Diagonal foil specular glint across medallion
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, ringR1, 0, Math.PI * 2);
  ctx.clip();
  const sheen = ctx.createLinearGradient(-outerR, -outerR, outerR * 0.6, outerR * 0.6);
  sheen.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(0.42, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(0.50, 'rgba(255, 255, 255, 0.36)');
  sheen.addColorStop(0.58, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-outerR, -outerR, outerR * 2, outerR * 2);
  ctx.restore();

  ctx.restore();
}

export function drawCoverTypography(
  ctx,
  width,
  height,
  typography,
  panelGeometries,
  panelStates,
  frameMetrics = null,
) {
  const minDim = Math.min(width, height);
  const stageTop = frameMetrics ? frameMetrics.stageTop : 0;
  const stageBottom = frameMetrics ? frameMetrics.stageBottom : height;
  const stageH = stageBottom - stageTop;

  const rawTitle = (typography.mainTitle || '').trim();
  const titleText = typography.titleFont === 'Pacifico' ? rawTitle : rawTitle.toUpperCase();
  const subtitleText = (typography.subtitle || '').trim();
  const taglineText = (typography.tagline || '').trim().toUpperCase();

  const isOutrun = typography.titleStyle === 'outrun-striped';
  const marginX = Math.round(width * 0.055);
  const maxTitleWidth = width - marginX * 2;
  const titleScale = (typography.titleSize ?? 100) / 100;
  const subScale = (typography.subtitleSize ?? 100) / 100;

  // Target bold 65-75% canvas width presence for Outrun Striped Chrome
  const widthFactor = isOutrun
    ? (width > height ? 0.198 : 0.162)
    : (width > height ? 0.165 : 0.14);
  const baseTitleSize = Math.round(minDim * widthFactor * titleScale);
  const titleWeight = typography.titleFont === 'Oswald' ? '600' : '400';

  let anchorX = width * 0.5;
  if (typography.titleAlign === 'left') anchorX = marginX;
  if (typography.titleAlign === 'right') anchorX = width - marginX;

  // Vertical anchor inside the stage window (safely clear of Critic Strip & Billing Block)
  let titleY = stageBottom - Math.round(stageH * (taglineText ? 0.168 : 0.135));
  if (typography.titlePos === 'top') titleY = stageTop + Math.round(stageH * 0.165);
  if (typography.titlePos === 'center') titleY = stageTop + Math.round(stageH * 0.50);

  // Measure Main Title ahead of time so role tags & lens flares align accurately
  let measuredTitleSize = baseTitleSize;
  let measuredTitleWidth = 0;
  let titleScaleX = 1;

  if (titleText) {
    ctx.save();
    measuredTitleSize = fitFontSize(ctx, titleText, typography.titleFont, titleWeight, baseTitleSize, maxTitleWidth);
    ctx.font = `${titleWeight} ${measuredTitleSize}px "${typography.titleFont}", sans-serif`;
    const naturalW = ctx.measureText(titleText).width;
    if (isOutrun && naturalW > 0) {
      // Gently widen lettering so short-to-medium titles command 65-74% of canvas width
      const targetMinW = width * 0.68 * Math.min(1.08, Math.max(0.75, titleScale));
      const desiredScale = Math.min(1.36, Math.max(1.0, targetMinW / naturalW));
      const maxFitScale = maxTitleWidth / naturalW;
      titleScaleX = Math.min(desiredScale, maxFitScale);
    }
    measuredTitleWidth = naturalW * titleScaleX;
    ctx.restore();
  }

  const titleBand = {
    pos: typography.titlePos || 'bottom',
    topY: titleY - measuredTitleSize * 0.54,
    bottomY: titleY + measuredTitleSize * 0.54,
  };

  // Draw Panel Cast Callout Tags BEFORE Main Title so title always stays hero-foreground
  if (typography.showRoleTags && panelGeometries) {
    drawPanelRoleTags(ctx, panelGeometries, panelStates, minDim, titleBand);
  }

  // Seamless theatrical radial backdrop behind title zone
  if (titleText || subtitleText) {
    ctx.save();
    const rad = Math.max(width * 0.48, minDim * 0.44);
    const bandGrad = ctx.createRadialGradient(
      anchorX,
      titleY,
      minDim * 0.04,
      anchorX,
      titleY,
      rad,
    );
    bandGrad.addColorStop(0, 'rgba(7, 3, 16, 0.58)');
    bandGrad.addColorStop(0.55, 'rgba(10, 4, 22, 0.24)');
    bandGrad.addColorStop(1, 'rgba(7, 3, 16, 0)');
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, stageTop, width, stageH);
    ctx.restore();
  }

  // 1. MAIN DISPLAY TITLE
  if (titleText) {
    ctx.save();
    const fontStr = `${titleWeight} ${measuredTitleSize}px "${typography.titleFont}", sans-serif`;
    const align = typography.titleAlign || 'center';
    const outlinePx = Math.round((typography.titleOutline ?? 14) * (minDim / 1080) * 1.6);
    const shadowDepth = Math.round((typography.titleShadow ?? 12) * (minDim / 1080) * 1.32);

    ctx.save();
    ctx.translate(anchorX, titleY);
    ctx.scale(titleScaleX, 1);
    ctx.font = fontStr;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // 3D stacked hard comic shadow
    if (shadowDepth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
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

    // Thick jet-black ink outline
    if (outlinePx > 0) {
      ctx.strokeStyle = '#080310';
      ctx.lineWidth = outlinePx;
      ctx.strokeText(titleText, 0, 0);
    }

    // Crisp cream inner stroke for Outrun Striped Chrome (or subtle white highlight for Retro Chrome)
    if (isOutrun) {
      ctx.strokeStyle = '#fff3d6';
      ctx.lineWidth = Math.max(3, Math.round(outlinePx * 0.28));
      ctx.strokeText(titleText, 0, 0);
    } else if (typography.titleStyle === 'retro-chrome' && outlinePx >= 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)';
      ctx.lineWidth = Math.max(1.5, outlinePx * 0.16);
      ctx.strokeText(titleText, 0, 0);
    }

    ctx.restore();

    // Main fill pass
    if (isOutrun) {
      drawOutrunStripedChromeFill(ctx, titleText, fontStr, align, anchorX, titleY, measuredTitleSize, titleScaleX);

      // 2 crisp 4-point lens-flare glints anchored cleanly on title highlights
      let leftX = anchorX - measuredTitleWidth * 0.5;
      if (align === 'left') leftX = anchorX;
      if (align === 'right') leftX = anchorX - measuredTitleWidth;
      const glintR = Math.max(16, Math.round(measuredTitleSize * 0.195));
      drawLensFlareGlint(ctx, leftX + measuredTitleWidth * 0.115, titleY - measuredTitleSize * 0.35, glintR);
      drawLensFlareGlint(ctx, leftX + measuredTitleWidth * 0.875, titleY + measuredTitleSize * 0.14, glintR * 0.80);
    } else {
      ctx.save();
      ctx.translate(anchorX, titleY);
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

  // 2. NEON SCRIPT SUBTITLE
  if (subtitleText) {
    ctx.save();
    const subWeight = typography.subtitleFont === 'Oswald' ? '600' : '400';
    const baseSubSize = Math.round(minDim * (width > height ? 0.064 : 0.058) * subScale);
    const subSize = fitFontSize(ctx, subtitleText, typography.subtitleFont, subWeight, baseSubSize, maxTitleWidth * 0.85);
    ctx.font = `${subWeight} ${subSize}px "${typography.subtitleFont}", cursive, sans-serif`;
    ctx.textAlign = typography.titleAlign || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    const subOffsetY = titleText ? measuredTitleSize * 0.42 : 0;
    let subX = anchorX;
    if (typography.titleAlign === 'center' && titleText && typography.subtitleFont === 'Pacifico') {
      subX = anchorX + Math.min(measuredTitleWidth * 0.08, width * 0.065);
    }
    const subY = titleY + subOffsetY;
    const glowFactor = (typography.subtitleGlow ?? 78) / 100;
    const neonColor = typography.subtitleColor || '#ff4fd8';

    ctx.translate(subX, subY);
    if (typography.subtitleFont === 'Pacifico') {
      ctx.rotate(-0.048);
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

  // 3. BOTTOM TAGLINE BAR (positioned neatly above Billing Block or bottom edge)
  if (taglineText) {
    ctx.save();
    const tagFontSize = Math.max(14, Math.round(minDim * 0.020));
    ctx.font = `600 ${tagFontSize}px "Oswald", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const spaced = taglineText.split('').join('\u200A');
    const textW = Math.min(width * 0.72, ctx.measureText(spaced).width);
    const pillPadX = Math.round(tagFontSize * 0.95);
    const pillH = Math.round(tagFontSize * 1.64);
    const pillW = Math.min(width - marginX * 3.0, textW + pillPadX * 2);
    const pillX = (width - pillW) * 0.5;
    const pillBottomGap = frameMetrics?.hasBottom ? Math.round(minDim * 0.014) : Math.round(minDim * 0.032);
    const pillY = stageBottom - pillBottomGap - pillH;

    ctx.fillStyle = 'rgba(10, 5, 20, 0.88)';
    drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH * 0.5);
    ctx.fill();

    const lineGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
    lineGrad.addColorStop(0, 'rgba(53, 232, 255, 0.75)');
    lineGrad.addColorStop(0.5, 'rgba(255, 61, 154, 0.92)');
    lineGrad.addColorStop(1, 'rgba(255, 209, 102, 0.82)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = Math.max(1.5, minDim * 0.0018);
    ctx.stroke();

    ctx.fillStyle = '#fff5fb';
    ctx.fillText(spaced, width * 0.5, pillY + pillH * 0.5 + 1, pillW - pillPadX);
    ctx.restore();
  }

  // 4. EMBOSSED GOLD-FOIL STARBURST MEDALLION (bottom-right gutter)
  if (typography.showEditionSeal) {
    drawOriginalEditionSeal(ctx, width, height, typography, frameMetrics);
  }
}
