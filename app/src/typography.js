// Layered Vice City typography engine: Retro-Chrome & Sunset display lettering,
// thick black comic ink outlines, 3D drop shadows, multi-pass neon script glow,
// bottom tagline bar, panel role tags, and Original Edition Seal (0% Rockstar IP).

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
  // Default: retro-chrome (80s horizon metallic chrome with sunset reflection)
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

export function drawPanelRoleTags(ctx, panelGeometries, panelStates, minDim) {
  const fontSize = Math.max(15, Math.round(minDim * 0.02));
  const padX = Math.round(fontSize * 0.55);
  const padY = Math.round(fontSize * 0.28);

  ctx.save();
  ctx.font = `600 ${fontSize}px "Oswald", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  for (let i = 0; i < panelGeometries.length; i++) {
    const role = (panelStates[i]?.role || '').trim().toUpperCase();
    if (!role) continue;
    const geom = panelGeometries[i];
    const textW = ctx.measureText(role).width;
    const boxW = textW + padX * 2 + 6;
    const boxH = fontSize + padY * 2;
    const bx = geom.bounds.x + Math.round(minDim * 0.015);
    const by = geom.bounds.y + Math.round(minDim * 0.015);

    ctx.fillStyle = 'rgba(11, 7, 19, 0.88)';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.fillStyle = geom.accent || '#ff3d9a';
    ctx.fillRect(bx, by, 5, boxH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = Math.max(1.5, minDim * 0.0018);
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(role, bx + padX + 5, by + padY - 1);
  }
  ctx.restore();
}

export function drawOriginalEditionSeal(ctx, width, height, typography) {
  const label = (typography.sealText || '').trim().toUpperCase();
  if (!label) return;
  const minDim = Math.min(width, height);
  const fontSize = Math.max(15, Math.round(minDim * 0.020));
  const padX = Math.round(fontSize * 0.68);
  const padY = Math.round(fontSize * 0.34);
  const margin = Math.round(minDim * 0.032);

  ctx.save();
  ctx.font = `600 ${fontSize}px "Oswald", sans-serif`;
  const textW = ctx.measureText(label).width;
  const iconD = Math.round(fontSize * 0.92);
  const gap = Math.round(fontSize * 0.42);
  const boxW = padX * 2 + iconD + gap + textW;
  const boxH = fontSize + padY * 2;

  // Place top-right normally, or bottom-right if Main Title is positioned at top
  const x = width - margin - boxW;
  const y = typography.titlePos === 'top' ? height - margin - boxH - Math.round(minDim * 0.045) : margin;

  ctx.translate(x + boxW * 0.5, y + boxH * 0.5);
  ctx.rotate(-0.032);
  const lx = -boxW * 0.5;
  const ly = -boxH * 0.5;

  // Hard offset ink shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
  drawRoundedRectPath(ctx, lx + 5, ly + 5, boxW, boxH, 6);
  ctx.fill();

  // Main dark art-deco plate
  ctx.fillStyle = '#12091f';
  drawRoundedRectPath(ctx, lx, ly, boxW, boxH, 6);
  ctx.fill();

  // Neon gradient border
  const borderGrad = ctx.createLinearGradient(lx, ly, lx + boxW, ly + boxH);
  borderGrad.addColorStop(0, '#ffd166');
  borderGrad.addColorStop(0.5, '#ff3d9a');
  borderGrad.addColorStop(1, '#35e8ff');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = Math.max(2.5, minDim * 0.0028);
  ctx.stroke();

  // Miniature retro sunset disc icon (original geometric mark)
  const cx = lx + padX + iconD * 0.5;
  const cy = 0;
  const sunGrad = ctx.createLinearGradient(cx, cy - iconD * 0.5, cx, cy + iconD * 0.5);
  sunGrad.addColorStop(0, '#ffe066');
  sunGrad.addColorStop(0.55, '#ff4d8d');
  sunGrad.addColorStop(1, '#6f2dbd');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, iconD * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#12091f';
  ctx.fillRect(cx - iconD * 0.52, cy + iconD * 0.08, iconD * 1.04, Math.max(1.5, iconD * 0.1));
  ctx.fillRect(cx - iconD * 0.52, cy + iconD * 0.28, iconD * 1.04, Math.max(1.5, iconD * 0.1));

  // Label
  ctx.fillStyle = '#fff9ff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, lx + padX + iconD + gap, 1);

  ctx.restore();
}

export function drawCoverTypography(ctx, width, height, typography, panelGeometries, panelStates) {
  const minDim = Math.min(width, height);

  if (typography.showRoleTags && panelGeometries) {
    drawPanelRoleTags(ctx, panelGeometries, panelStates, minDim);
  }
  if (typography.showEditionSeal) {
    drawOriginalEditionSeal(ctx, width, height, typography);
  }

  const rawTitle = (typography.mainTitle || '').trim();
  const titleText = typography.titleFont === 'Pacifico' ? rawTitle : rawTitle.toUpperCase();
  const subtitleText = (typography.subtitle || '').trim();
  const taglineText = (typography.tagline || '').trim().toUpperCase();

  const marginX = Math.round(width * 0.06);
  const maxTitleWidth = width - marginX * 2;
  const titleScale = (typography.titleSize ?? 100) / 100;
  const subScale = (typography.subtitleSize ?? 100) / 100;

  const baseTitleSize = Math.round(minDim * (width > height ? 0.155 : 0.135) * titleScale);
  const titleWeight = typography.titleFont === 'Oswald' ? '600' : '400';

  let anchorX = width * 0.5;
  if (typography.titleAlign === 'left') anchorX = marginX;
  if (typography.titleAlign === 'right') anchorX = width - marginX;

  // Vertical anchor block
  let titleY = height * 0.805;
  if (typography.titlePos === 'top') titleY = height * 0.175;
  if (typography.titlePos === 'center') titleY = height * 0.50;

  // Subtle seamless theatrical radial backdrop behind title zone (full-canvas fill avoids any hard clip seam)
  if (titleText || subtitleText) {
    ctx.save();
    const rad = Math.max(width * 0.46, minDim * 0.44);
    const bandGrad = ctx.createRadialGradient(
      anchorX,
      titleY,
      minDim * 0.04,
      anchorX,
      titleY,
      rad,
    );
    bandGrad.addColorStop(0, 'rgba(8, 3, 18, 0.54)');
    bandGrad.addColorStop(0.55, 'rgba(12, 4, 24, 0.22)');
    bandGrad.addColorStop(1, 'rgba(8, 3, 18, 0)');
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  let measuredTitleSize = baseTitleSize;
  let measuredTitleWidth = 0;

  // 1. MAIN DISPLAY TITLE
  if (titleText) {
    ctx.save();
    measuredTitleSize = fitFontSize(ctx, titleText, typography.titleFont, titleWeight, baseTitleSize, maxTitleWidth);
    ctx.font = `${titleWeight} ${measuredTitleSize}px "${typography.titleFont}", sans-serif`;
    ctx.textAlign = typography.titleAlign || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    measuredTitleWidth = ctx.measureText(titleText).width;

    const outlinePx = Math.round((typography.titleOutline ?? 12) * (minDim / 1080) * 1.55);
    const shadowDepth = Math.round((typography.titleShadow ?? 10) * (minDim / 1080) * 1.25);

    // 3D stacked hard comic shadow
    if (shadowDepth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
      ctx.shadowBlur = Math.round(minDim * 0.022);
      ctx.shadowOffsetX = shadowDepth * 0.65;
      ctx.shadowOffsetY = shadowDepth * 0.9;
      ctx.fillStyle = '#07030e';
      ctx.strokeStyle = '#07030e';
      ctx.lineWidth = Math.max(2, outlinePx);
      for (let step = Math.min(6, Math.max(2, Math.round(shadowDepth / 3))); step >= 1; step--) {
        const dx = (shadowDepth * 0.45 * step) / 6;
        const dy = (shadowDepth * 0.75 * step) / 6;
        ctx.strokeText(titleText, anchorX + dx, titleY + dy);
        ctx.fillText(titleText, anchorX + dx, titleY + dy);
      }
      ctx.restore();
    }

    // Thick jet-black ink outline
    if (outlinePx > 0) {
      ctx.strokeStyle = '#090411';
      ctx.lineWidth = outlinePx;
      ctx.strokeText(titleText, anchorX, titleY);
    }

    // Subtle crisp inner highlight stroke for retro-chrome pop
    if (typography.titleStyle === 'retro-chrome' && outlinePx >= 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = Math.max(1.5, outlinePx * 0.16);
      ctx.strokeText(titleText, anchorX, titleY);
    }

    // Main gradient fill
    const yTop = titleY - measuredTitleSize * 0.46;
    const yBottom = titleY + measuredTitleSize * 0.46;
    ctx.fillStyle = buildTitleFill(ctx, typography.titleStyle, yTop, yBottom);
    if (typography.titleStyle === 'neon-pink') {
      ctx.shadowColor = 'rgba(255, 42, 145, 0.75)';
      ctx.shadowBlur = Math.round(minDim * 0.025);
    }
    ctx.fillText(titleText, anchorX, titleY);

    ctx.restore();
  }

  // 2. NEON SCRIPT SUBTITLE (artfully layered over lower corner of Main Title)
  if (subtitleText) {
    ctx.save();
    const subWeight = typography.subtitleFont === 'Oswald' ? '600' : '400';
    const baseSubSize = Math.round(minDim * (width > height ? 0.068 : 0.062) * subScale);
    const subSize = fitFontSize(ctx, subtitleText, typography.subtitleFont, subWeight, baseSubSize, maxTitleWidth * 0.88);
    ctx.font = `${subWeight} ${subSize}px "${typography.subtitleFont}", cursive, sans-serif`;
    ctx.textAlign = typography.titleAlign || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    const subOffsetY = titleText ? measuredTitleSize * 0.48 : 0;
    let subX = anchorX;
    if (typography.titleAlign === 'center' && titleText && typography.subtitleFont === 'Pacifico') {
      subX = anchorX + Math.min(measuredTitleWidth * 0.14, width * 0.12);
    }
    const subY = titleY + subOffsetY;
    const glowFactor = (typography.subtitleGlow ?? 75) / 100;
    const neonColor = typography.subtitleColor || '#ff4fd8';

    ctx.translate(subX, subY);
    if (typography.subtitleFont === 'Pacifico') {
      ctx.rotate(-0.055);
    }

    // Dark ink backing for readability over bright highlights
    ctx.strokeStyle = 'rgba(8, 3, 18, 0.92)';
    ctx.lineWidth = Math.max(5, Math.round(subSize * 0.16));
    ctx.strokeText(subtitleText, 0, 0);

    // Multi-pass neon tube glow
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

    // Colored neon tube edge + hot white inner core
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = Math.max(2, Math.round(subSize * 0.055));
    ctx.strokeText(subtitleText, 0, 0);

    ctx.fillStyle = glowFactor > 0.25 ? '#fff3fc' : neonColor;
    ctx.fillText(subtitleText, 0, 0);
    ctx.restore();
  }

  // 3. BOTTOM TAGLINE BAR
  if (taglineText) {
    ctx.save();
    const tagFontSize = Math.max(15, Math.round(minDim * 0.022));
    ctx.font = `600 ${tagFontSize}px "Oswald", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Measure with generous letter spacing simulation via spaced characters or direct width
    const spaced = taglineText.split('').join('\u200A');
    const textW = Math.min(width * 0.86, ctx.measureText(spaced).width);
    const pillPadX = Math.round(tagFontSize * 0.95);
    const pillH = Math.round(tagFontSize * 1.72);
    const pillW = Math.min(width - marginX * 1.4, textW + pillPadX * 2);
    const pillX = (width - pillW) * 0.5;
    const pillY = height - Math.round(minDim * 0.035) - pillH;

    ctx.fillStyle = 'rgba(10, 6, 20, 0.84)';
    drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH * 0.5);
    ctx.fill();

    const lineGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
    lineGrad.addColorStop(0, 'rgba(53, 232, 255, 0.65)');
    lineGrad.addColorStop(0.5, 'rgba(255, 61, 154, 0.85)');
    lineGrad.addColorStop(1, 'rgba(255, 209, 102, 0.7)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = Math.max(1.5, minDim * 0.0018);
    ctx.stroke();

    ctx.fillStyle = '#fff5fb';
    ctx.fillText(spaced, width * 0.5, pillY + pillH * 0.5 + 1, pillW - pillPadX);
    ctx.restore();
  }
}
