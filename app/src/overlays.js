// Curated Vice City atmospheric overlays & Collector's Box-Art / Movie Poster Frame:
// Sunset sky wash, dual neon rim glow, procedural palm silhouettes, optional retro
// horizon sun disc, deterministic PRNG film grain, vignette, Top Theatrical Critic Strip,
// and Bottom Cinema Billing Block with procedural collector barcode.

let cachedGrainTile = null;

/**
 * Deterministic Mulberry32 PRNG for reproducible film grain (no Math.random()).
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getDeterministicGrainTile() {
  if (cachedGrainTile) return cachedGrainTile;
  const size = 256;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext('2d');
  const img = ctx.createImageData(size, size);
  const rand = mulberry32(0x56494345); // "VICE"

  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.round((rand() + rand() - 1) * 58 + 128);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  cachedGrainTile = tile;
  return tile;
}

/**
 * Computes layout metrics for the Collector's Box-Art / Movie Poster Frame so
 * panels, typography, and seals frame cleanly without overlap.
 */
export function getCollectorFrameMetrics(width, height, frameState) {
  const minDim = Math.min(width, height);
  const enabled = Boolean(frameState?.showCollectorFrame);
  const hasTop = enabled && Boolean(frameState?.showCriticStrip);
  const hasBottom = enabled && Boolean(frameState?.showBillingBlock);
  const sideMargin = Math.round(minDim * 0.017);

  const topBarH = hasTop ? Math.max(46, Math.round(minDim * (width > height ? 0.054 : 0.048))) : 0;
  const bottomBarH = hasBottom ? Math.max(66, Math.round(minDim * (width > height ? 0.078 : 0.070))) : 0;

  const topInset = hasTop ? topBarH + Math.round(minDim * 0.008) : sideMargin;
  const bottomInset = hasBottom ? bottomBarH + Math.round(minDim * 0.008) : sideMargin;

  return {
    enabled,
    hasTop,
    hasBottom,
    sideMargin,
    topBarH,
    bottomBarH,
    topInset,
    bottomInset,
    stageTop: topBarH,
    stageBottom: height - bottomBarH,
    stageHeight: height - topBarH - bottomBarH,
  };
}

function drawSunsetWash(ctx, width, height, intensity) {
  if (intensity <= 0.01) return;
  ctx.save();
  // Kept gentle on screen so ink-black shadows remain deep & punchy at 768x480
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = intensity * 0.22;
  const grad = ctx.createLinearGradient(0, 0, width * 0.35, height);
  grad.addColorStop(0, '#ff8f3f');
  grad.addColorStop(0.45, '#ff358b');
  grad.addColorStop(0.85, '#6a1b9a');
  grad.addColorStop(1, '#1a0b38');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = intensity * 0.44;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawDualNeonRim(ctx, width, height, intensity) {
  if (intensity <= 0.01) return;
  const radius = Math.max(width, height) * 0.62;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Hot-pink Miami glow from bottom-left
  const pinkGrad = ctx.createRadialGradient(
    width * 0.04,
    height * 0.92,
    radius * 0.02,
    width * 0.04,
    height * 0.92,
    radius,
  );
  pinkGrad.addColorStop(0, `rgba(255, 48, 152, ${0.44 * intensity})`);
  pinkGrad.addColorStop(0.46, `rgba(255, 72, 136, ${0.15 * intensity})`);
  pinkGrad.addColorStop(1, 'rgba(255, 48, 152, 0)');
  ctx.fillStyle = pinkGrad;
  ctx.fillRect(0, 0, width, height);

  // Electric-cyan neon rim from top-right
  const cyanGrad = ctx.createRadialGradient(
    width * 0.96,
    height * 0.08,
    radius * 0.02,
    width * 0.96,
    height * 0.08,
    radius,
  );
  cyanGrad.addColorStop(0, `rgba(42, 232, 255, ${0.42 * intensity})`);
  cyanGrad.addColorStop(0.44, `rgba(42, 232, 255, ${0.13 * intensity})`);
  cyanGrad.addColorStop(1, 'rgba(42, 232, 255, 0)');
  ctx.fillStyle = cyanGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

function drawRetroHorizonDisc(ctx, width, height, stageTop, stageBottom) {
  const minDim = Math.min(width, height);
  const r = minDim * 0.18;
  const cx = width * 0.5;
  const cy = stageTop + (stageBottom - stageTop) * 0.70;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const halo = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.1);
  halo.addColorStop(0, 'rgba(255, 118, 84, 0.55)');
  halo.addColorStop(0.55, 'rgba(255, 42, 138, 0.22)');
  halo.addColorStop(1, 'rgba(255, 42, 138, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.78;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const sunGrad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  sunGrad.addColorStop(0, '#fff38a');
  sunGrad.addColorStop(0.45, '#ff8e3c');
  sunGrad.addColorStop(0.82, '#ff2e88');
  sunGrad.addColorStop(1, '#781ca8');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  ctx.globalCompositeOperation = 'destination-out';
  const stripePositions = [0.16, 0.34, 0.52, 0.68, 0.82];
  stripePositions.forEach((p, idx) => {
    const sy = cy + r * p;
    const sh = r * (0.045 + idx * 0.018);
    ctx.fillRect(cx - r, sy, r * 2, sh);
  });
  ctx.restore();
}

function drawSinglePalm(ctx, baseX, baseY, scale, mirror) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.scale(mirror ? -scale : scale, scale);

  ctx.fillStyle = 'rgba(9, 4, 18, 0.84)';

  ctx.beginPath();
  ctx.moveTo(-16, 24);
  ctx.quadraticCurveTo(18, -90, 62, -198);
  ctx.lineTo(52, -202);
  ctx.quadraticCurveTo(4, -96, -30, 24);
  ctx.closePath();
  ctx.fill();

  const fronds = [
    { angle: -2.42, len: 108, droop: 36 },
    { angle: -1.82, len: 118, droop: 28 },
    { angle: -1.12, len: 114, droop: 26 },
    { angle: -0.46, len: 122, droop: 42 },
    { angle: 0.08, len: 108, droop: 52 },
  ];

  ctx.translate(57, -200);
  for (const f of fronds) {
    ctx.save();
    ctx.rotate(f.angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(f.len * 0.55, -16, f.len, f.droop);
    ctx.quadraticCurveTo(f.len * 0.52, -4, 0, 5);
    ctx.closePath();
    ctx.fill();
    for (let t = 0.22; t <= 0.88; t += 0.14) {
      const lx = f.len * t;
      const ly = -8 * Math.sin(t * Math.PI) + f.droop * t * t;
      const leafLen = 24 * Math.sin(t * Math.PI);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 7, ly + leafLen);
      ctx.lineTo(lx + 12, ly + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawPalmSilhouettes(ctx, width, height, stageBottom) {
  const minDim = Math.min(width, height);
  const scale = minDim / 1320;
  ctx.save();
  drawSinglePalm(ctx, width * 0.005, stageBottom + minDim * 0.012, scale * 0.72, false);
  drawSinglePalm(ctx, width * 0.995, stageBottom + minDim * 0.012, scale * 0.64, true);
  ctx.restore();
}

function drawFilmGrain(ctx, width, height, intensity) {
  if (intensity <= 0.01) return;
  const tile = getDeterministicGrainTile();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = intensity * 0.22;
  const pattern = ctx.createPattern(tile, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

function drawVignette(ctx, width, height, intensity) {
  if (intensity <= 0.01) return;
  ctx.save();
  const cx = width * 0.5;
  const cy = height * 0.5;
  const innerR = Math.min(width, height) * 0.36;
  const outerR = Math.hypot(width, height) * 0.55;
  const vig = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  vig.addColorStop(0, 'rgba(8, 3, 18, 0)');
  vig.addColorStop(0.7, `rgba(10, 4, 22, ${0.24 * intensity})`);
  vig.addColorStop(1, `rgba(6, 2, 14, ${0.70 * intensity})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawAtmosphericOverlays(ctx, width, height, effects, panelGeometries, frameMetrics = null) {
  const sunsetAmt = (effects.sunsetOverlay ?? 0) / 100;
  const neonAmt = (effects.neonRim ?? 0) / 100;
  const grainAmt = (effects.grain ?? 0) / 100;
  const vignetteAmt = (effects.vignette ?? 0) / 100;

  const stageTop = frameMetrics ? frameMetrics.stageTop : 0;
  const stageBottom = frameMetrics ? frameMetrics.stageBottom : height;

  ctx.save();
  if (frameMetrics && (frameMetrics.hasTop || frameMetrics.hasBottom)) {
    ctx.beginPath();
    ctx.rect(0, stageTop, width, stageBottom - stageTop);
    ctx.clip();
  }

  drawSunsetWash(ctx, width, height, sunsetAmt);
  drawDualNeonRim(ctx, width, height, neonAmt);
  if (effects.showHorizonDisc) {
    drawRetroHorizonDisc(ctx, width, height, stageTop, stageBottom);
  }
  if (effects.showPalms) {
    drawPalmSilhouettes(ctx, width, height, stageBottom);
  }
  drawFilmGrain(ctx, width, height, grainAmt);
  drawVignette(ctx, width, height, vignetteAmt);
  ctx.restore();
}

// ============================================================================
// COLLECTOR'S BOX-ART / MOVIE POSTER FRAME
// ============================================================================

function drawFivePointStar(ctx, cx, cy, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawRoundedRect(ctx, x, y, w, h, r) {
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

function drawProceduralBarcode(ctx, x, y, w, h) {
  ctx.save();
  // Crisp off-white collector barcode plate
  ctx.fillStyle = '#f8f2e4';
  drawRoundedRect(ctx, x, y, w, h, 3);
  ctx.fill();

  const padX = Math.max(5, Math.round(w * 0.08));
  const padTop = Math.max(4, Math.round(h * 0.11));
  const codeH = Math.round(h * 0.58);
  const usableW = w - padX * 2;

  // Deterministic bar weight pattern (EAN/UPC style: guard bars + encoded data)
  const weights = [
    1, 1, 1, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 3, 1, 1,
    2, 1, 1, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1, 1, 2, 3,
    1, 1, 2, 1, 1, 1,
  ];
  const totalUnits = weights.reduce((acc, v) => acc + v, 0);
  const unitW = usableW / totalUnits;

  ctx.fillStyle = '#090512';
  let cursor = x + padX;
  for (let i = 0; i < weights.length; i++) {
    const bw = weights[i] * unitW;
    if (i % 2 === 0) {
      const isGuard = i <= 2 || i >= weights.length - 3 || (i >= 18 && i <= 20);
      const bh = isGuard ? codeH + Math.round(h * 0.07) : codeH;
      ctx.fillRect(cursor, y + padTop, Math.max(1, bw), bh);
    }
    cursor += bw;
  }

  // Serial digits below bars
  const serialFont = Math.max(8, Math.round(h * 0.21));
  ctx.fillStyle = '#140c22';
  ctx.font = `600 ${serialFont}px "Oswald", monospace, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('86  01986  20261', x + w * 0.5, y + h - Math.max(2, Math.round(h * 0.05)), usableW);
  ctx.restore();
}

export function drawCollectorPosterFrame(ctx, width, height, frameState, metrics) {
  if (!metrics || !metrics.enabled) return;
  const minDim = Math.min(width, height);
  const padX = Math.max(20, Math.round(width * 0.022));

  // 1. TOP THEATRICAL CRITIC STRIP
  if (metrics.hasTop) {
    const barH = metrics.topBarH;
    ctx.save();
    const bg = ctx.createLinearGradient(0, 0, width, 0);
    bg.addColorStop(0, '#07040e');
    bg.addColorStop(0.5, '#11091f');
    bg.addColorStop(1, '#07040e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, barH);

    // Metallic gold-to-pink bottom hairline divider
    const ruleGrad = ctx.createLinearGradient(0, 0, width, 0);
    ruleGrad.addColorStop(0, '#ffd166');
    ruleGrad.addColorStop(0.45, '#ff3d9a');
    ruleGrad.addColorStop(0.85, '#35e8ff');
    ruleGrad.addColorStop(1, '#ffd166');
    ctx.fillStyle = ruleGrad;
    ctx.fillRect(0, barH - 2, width, 2);

    const midY = barH * 0.5;

    // Left: 5 Gold Stars
    const starOuter = Math.max(7, Math.round(barH * 0.23));
    const starInner = starOuter * 0.44;
    const starStep = Math.round(starOuter * 2.35);
    const starsStartX = padX + starOuter;
    const starGrad = ctx.createLinearGradient(0, midY - starOuter, 0, midY + starOuter);
    starGrad.addColorStop(0, '#fff7be');
    starGrad.addColorStop(0.5, '#ffca42');
    starGrad.addColorStop(1, '#d98412');

    ctx.fillStyle = starGrad;
    ctx.shadowColor = 'rgba(255, 204, 66, 0.55)';
    ctx.shadowBlur = 6;
    for (let s = 0; s < 5; s++) {
      drawFivePointStar(ctx, starsStartX + s * starStep, midY, starOuter, starInner);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Right: Edition Badge (VOL. 1)
    const volText = (frameState.editionVol || 'VOL. 1').trim().toUpperCase();
    let badgeW = 0;
    if (volText) {
      const volFont = Math.max(13, Math.round(barH * 0.42));
      ctx.font = `600 ${volFont}px "Oswald", sans-serif`;
      const tw = ctx.measureText(volText).width;
      const bPadX = Math.round(volFont * 0.65);
      badgeW = Math.round(tw + bPadX * 2);
      const badgeH = Math.round(barH * 0.62);
      const bx = width - padX - badgeW;
      const by = Math.round((barH - badgeH) * 0.5);

      ctx.fillStyle = 'rgba(255, 209, 102, 0.12)';
      drawRoundedRect(ctx, bx, by, badgeW, badgeH, 4);
      ctx.fill();
      ctx.strokeStyle = '#f8c954';
      ctx.lineWidth = Math.max(1.5, minDim * 0.0018);
      ctx.stroke();

      ctx.fillStyle = '#ffe89c';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(volText, bx + badgeW * 0.5, midY + 1);
    }

    // Center: Editable Theatrical Review Quote
    const rawQuote = (frameState.criticQuote || '').trim().toUpperCase();
    if (rawQuote) {
      const quoteStr = `“${rawQuote}”`;
      const quoteFont = Math.max(14, Math.round(barH * 0.44));
      ctx.font = `600 ${quoteFont}px "Oswald", sans-serif`;
      const leftReserve = starsStartX + 5 * starStep + 14;
      const rightReserve = padX + badgeW + 18;
      const availW = Math.max(120, width - leftReserve - rightReserve);
      const centerX = leftReserve + availW * 0.5;
      ctx.fillStyle = '#fff5e6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(quoteStr, centerX, midY + 1, availW);
    }

    ctx.restore();
  }

  // 2. BOTTOM CINEMA BILLING BLOCK
  if (metrics.hasBottom) {
    const barH = metrics.bottomBarH;
    const barY = height - barH;
    ctx.save();

    const bg = ctx.createLinearGradient(0, barY, width, barY);
    bg.addColorStop(0, '#07040e');
    bg.addColorStop(0.5, '#10081c');
    bg.addColorStop(1, '#07040e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, barY, width, barH);

    // Top divider hairline
    const ruleGrad = ctx.createLinearGradient(0, barY, width, barY);
    ruleGrad.addColorStop(0, '#35e8ff');
    ruleGrad.addColorStop(0.5, '#ff3d9a');
    ruleGrad.addColorStop(1, '#ffd166');
    ctx.fillStyle = ruleGrad;
    ctx.fillRect(0, barY, width, 2);

    const midY = barY + barH * 0.5;

    // Left: Neon "COMING SOON" Theatrical Stamp
    const comingText = (frameState.comingSoonText || '').trim().toUpperCase();
    let leftBlockW = 0;
    if (comingText) {
      const cFont = Math.max(16, Math.round(barH * 0.36));
      ctx.font = `400 ${cFont}px "Bebas Neue", "Oswald", sans-serif`;
      const tw = ctx.measureText(comingText).width;
      const cPadX = Math.round(cFont * 0.48);
      const cBoxW = Math.round(tw + cPadX * 2);
      const cBoxH = Math.round(barH * 0.58);
      const cx = padX;
      const cy = Math.round(barY + (barH - cBoxH) * 0.5);
      leftBlockW = cBoxW + 18;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 42, 138, 0.14)';
      drawRoundedRect(ctx, cx, cy, cBoxW, cBoxH, 5);
      ctx.fill();
      ctx.strokeStyle = '#ff46a6';
      ctx.lineWidth = Math.max(1.8, minDim * 0.002);
      ctx.shadowColor = 'rgba(255, 58, 158, 0.85)';
      ctx.shadowBlur = 10;
      ctx.stroke();

      ctx.fillStyle = '#fff1fa';
      ctx.shadowColor = 'rgba(255, 79, 216, 0.9)';
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(comingText, cx + cBoxW * 0.5, midY + 1);
      ctx.restore();
    }

    // Right: Procedural Collector Barcode
    const bcH = Math.round(barH * 0.68);
    const bcW = Math.round(bcH * 2.15);
    const bcX = width - padX - bcW;
    const bcY = Math.round(barY + (barH - bcH) * 0.5);
    drawProceduralBarcode(ctx, bcX, bcY, bcW, bcH);
    const rightBlockW = bcW + 18;

    // Center: Two-line Theatrical Cinema Billing Block
    const creditsRaw = (frameState.billingCredits || '').trim().toUpperCase();
    if (creditsRaw) {
      const availX = padX + leftBlockW;
      const availW = Math.max(140, width - padX * 2 - leftBlockW - rightBlockW);
      const centerX = availX + availW * 0.5;

      // Split nicely on bullet points into 2 crisp movie-poster lines
      const parts = creditsRaw.split(/\s*[•|]\s*/).filter(Boolean);
      let line1 = creditsRaw;
      let line2 = '';
      if (parts.length >= 2) {
        const splitIdx = Math.ceil(parts.length / 2);
        line1 = parts.slice(0, splitIdx).join('   •   ');
        line2 = parts.slice(splitIdx).join('   •   ');
      }

      const bFont1 = Math.max(13, Math.round(barH * 0.25));
      const bFont2 = Math.max(11, Math.round(barH * 0.21));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (line2) {
        ctx.font = `400 ${bFont1}px "Bebas Neue", "Oswald", sans-serif`;
        ctx.fillStyle = '#f4ebd9';
        ctx.fillText(line1, centerX, midY - barH * 0.14, availW);

        ctx.font = `600 ${bFont2}px "Oswald", sans-serif`;
        ctx.fillStyle = '#b9aecf';
        ctx.fillText(line2, centerX, midY + barH * 0.17, availW);
      } else {
        ctx.font = `400 ${bFont1}px "Bebas Neue", "Oswald", sans-serif`;
        ctx.fillStyle = '#f4ebd9';
        ctx.fillText(line1, centerX, midY + 1, availW);
      }
    }

    ctx.restore();
  }
}
