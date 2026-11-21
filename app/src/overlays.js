// Curated Vice City atmospheric overlays, Synthwave Skyline Horizon Stage,
// Hero Sun Halo, and Collector's Box-Art / Movie Poster Frame (V3 Rank #1):
// - Grade-matched Art-Deco Miami skyline with lit tower windows, striped retro sun,
//   water reflections, and sweeping foreground palms (`drawSkylineHorizonStage`).
// - Hero panel subtle striped sunset halo & bottom vignette (`drawHeroSunHalo`).
// - Top Theatrical Critic Strip (5 gold stars + "QUOTE" — SOURCE + VOL badge).
// - Bottom Cinema Billing Block (— COMING SOON — + authentic mixed-size Hollywood
//   billing credits + crisp off-white procedural UPC barcode).

import { resolveGradePreset } from './imageEffects.js';

let cachedGrainTile = null;

/**
 * Deterministic Mulberry32 PRNG for reproducible grain & skyline windows (zero Math.random()).
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

function getStagePalette(gradePreset) {
  const preset = resolveGradePreset(gradePreset);
  if (preset.family === 'cool') {
    return {
      sky: ['#070b28', '#221159', '#7b1c94', '#ff2f9e', '#58ecff'],
      sun: ['#f0ffff', '#7cf4ff', '#ff42b2', '#641ba6'],
      haloInner: 'rgba(104, 244, 255, 0.56)',
      haloMid: 'rgba(255, 44, 166, 0.28)',
      water: ['#06081e', '#1e124c', '#c8288a'],
      waterGlint: ['rgba(124, 244, 255, 0.78)', 'rgba(255, 72, 182, 0.62)'],
      farTower: 'rgba(22, 16, 68, 0.80)',
      nearTower: '#060718',
      winLit: ['#8cf6ff', '#ff74ce', '#fff5be'],
      palmFill: 'rgba(5, 6, 18, 0.92)',
      washStops: ['#40e8ff', '#ff2ea2', '#52189a', '#0c0828'],
      rimA: 'rgba(255, 44, 166, ',
      rimB: 'rgba(80, 242, 255, ',
      accentRule: ['#58ecff', '#ff3ea8', '#b86bff', '#58ecff'],
      stampColor: '#7af4ff',
      stampGlow: 'rgba(88, 236, 255, 0.85)',
    };
  }
  if (preset.family === 'tropic') {
    return {
      sky: ['#082038', '#0d4e66', '#1fb5ae', '#ff8068', '#ffdc80'],
      sun: ['#fff8c4', '#ffc652', '#ff6464', '#1684a4'],
      haloInner: 'rgba(255, 210, 120, 0.55)',
      haloMid: 'rgba(32, 218, 208, 0.28)',
      water: ['#061b30', '#0d4860', '#24d2c8'],
      waterGlint: ['rgba(255, 232, 146, 0.78)', 'rgba(66, 242, 232, 0.64)'],
      farTower: 'rgba(11, 44, 66, 0.78)',
      nearTower: '#061524',
      winLit: ['#fff2ac', '#68f8ee', '#ffa07a'],
      palmFill: 'rgba(5, 16, 26, 0.90)',
      washStops: ['#ffd27a', '#26d6ca', '#145a78', '#081d32'],
      rimA: 'rgba(255, 118, 92, ',
      rimB: 'rgba(36, 232, 222, ',
      accentRule: ['#28ded4', '#ffd166', '#ff6b6b', '#28ded4'],
      stampColor: '#56f2e8',
      stampGlow: 'rgba(40, 222, 212, 0.82)',
    };
  }
  // Warm family: sunset-gold, miami-heat, retro-print
  return {
    sky: ['#1b0834', '#6d1866', '#dc3878', '#ff8b42', '#ffd872'],
    sun: ['#fff8bc', '#ffbc3c', '#ff4678', '#981b7e'],
    haloInner: 'rgba(255, 168, 86, 0.58)',
    haloMid: 'rgba(255, 48, 128, 0.28)',
    water: ['#1d0932', '#6a1b5c', '#ee6e42'],
    waterGlint: ['rgba(255, 228, 134, 0.80)', 'rgba(255, 96, 136, 0.60)'],
    farTower: 'rgba(44, 12, 62, 0.78)',
    nearTower: '#0b0518',
    winLit: ['#ffec9e', '#ff9e52', '#ff62b4'],
    palmFill: 'rgba(9, 4, 18, 0.90)',
    washStops: ['#ff9c44', '#ff3d8c', '#6a1b9a', '#1a0b38'],
    rimA: 'rgba(255, 56, 142, ',
    rimB: 'rgba(255, 206, 108, ',
    accentRule: ['#ffd166', '#ff3d9a', '#35e8ff', '#ffd166'],
    stampColor: '#ff7ec6',
    stampGlow: 'rgba(255, 68, 166, 0.85)',
  };
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
  const sideMargin = Math.round(minDim * 0.016);

  const topBarH = hasTop ? Math.max(46, Math.round(minDim * (width > height ? 0.052 : 0.047))) : 0;
  const bottomBarH = hasBottom ? Math.max(66, Math.round(minDim * (width > height ? 0.078 : 0.070))) : 0;

  const topInset = hasTop ? topBarH + Math.round(minDim * 0.007) : sideMargin;
  const bottomInset = hasBottom ? bottomBarH + Math.round(minDim * 0.007) : sideMargin;

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

function drawStripedSunDisc(ctx, cx, cy, r, palette, alpha = 0.92, haloAlpha = 0.72) {
  ctx.save();
  // Atmospheric radiant halo
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = haloAlpha;
  const halo = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r * 2.25);
  halo.addColorStop(0, palette.haloInner);
  halo.addColorStop(0.48, palette.haloMid);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Offscreen striped sun disc so destination-out scanlines stay razor-clean without punching canvas bg
  const size = Math.max(16, Math.ceil(r * 2 + 4));
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d');
  const oc = size * 0.5;

  octx.save();
  octx.beginPath();
  octx.arc(oc, oc, r, 0, Math.PI * 2);
  octx.clip();

  const sunGrad = octx.createLinearGradient(oc, oc - r, oc, oc + r);
  sunGrad.addColorStop(0.0, palette.sun[0]);
  sunGrad.addColorStop(0.42, palette.sun[1]);
  sunGrad.addColorStop(0.78, palette.sun[2]);
  sunGrad.addColorStop(1.0, palette.sun[3]);
  octx.fillStyle = sunGrad;
  octx.fillRect(0, 0, size, size);

  octx.globalCompositeOperation = 'destination-out';
  const stripePositions = [0.08, 0.24, 0.40, 0.55, 0.69, 0.82];
  stripePositions.forEach((p, idx) => {
    const sy = oc + r * p;
    const sh = Math.max(1.5, r * (0.032 + idx * 0.017));
    octx.fillRect(0, sy, size, sh);
  });
  octx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(off, cx - oc, cy - oc);
  ctx.restore();
}

function drawSinglePalm(ctx, baseX, baseY, scale, mirror, fillStyle = 'rgba(9, 4, 18, 0.86)') {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.scale(mirror ? -scale : scale, scale);
  ctx.fillStyle = fillStyle;

  ctx.beginPath();
  ctx.moveTo(-16, 24);
  ctx.quadraticCurveTo(18, -90, 62, -198);
  ctx.lineTo(52, -202);
  ctx.quadraticCurveTo(4, -96, -30, 24);
  ctx.closePath();
  ctx.fill();

  const fronds = [
    { angle: -2.42, len: 112, droop: 36 },
    { angle: -1.82, len: 122, droop: 28 },
    { angle: -1.12, len: 118, droop: 26 },
    { angle: -0.46, len: 126, droop: 42 },
    { angle: 0.08, len: 112, droop: 52 },
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
      const leafLen = 25 * Math.sin(t * Math.PI);
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

/**
 * Draws layered Miami Art-Deco coastal skyline towers with stepped ziggurat crowns,
 * curved Streamline Moderne parapets, rooftop spires, and deterministic lit window grids.
 */
function drawArtDecoSkyline(ctx, x0, baseY, spanW, maxTowerH, palette, seed = 0x4d49414d, compact = false) {
  const rand = mulberry32(seed);

  // 1. Far hazy twilight skyline layer
  ctx.save();
  ctx.fillStyle = palette.farTower;
  let fx = x0 - 8;
  while (fx < x0 + spanW + 12) {
    const relC = Math.abs((fx - (x0 + spanW * 0.5)) / (spanW * 0.5));
    // Keep center valley gently lower so the glowing striped sun frames dramatically
    const valleyMul = 0.54 + 0.56 * Math.min(1, relC * 1.15);
    const bw = Math.max(18, Math.round(spanW * (0.026 + rand() * 0.032)));
    const bh = Math.max(16, Math.round(maxTowerH * (0.36 + rand() * 0.48) * valleyMul));
    const topY = baseY - bh;

    ctx.fillRect(fx, topY, bw + 1, bh + 2);
    // Art-Deco setback crown
    if (rand() > 0.42) {
      const cw = Math.round(bw * 0.62);
      const ch = Math.round(bh * 0.16);
      ctx.fillRect(fx + Math.round((bw - cw) * 0.5), topY - ch, cw, ch + 1);
    }
    fx += bw - 2;
  }
  ctx.restore();

  // 2. Crisp foreground Art-Deco towers + lit windows
  ctx.save();
  let nx = x0;
  let towerIdx = 0;
  while (nx < x0 + spanW) {
    const centerNorm = Math.abs(((nx + 20) - (x0 + spanW * 0.5)) / (spanW * 0.5));
    const valleyMul = compact
      ? (0.48 + 0.58 * Math.min(1, centerNorm * 1.25))
      : (0.38 + 0.72 * Math.min(1, centerNorm * 1.22));
    const bw = Math.max(22, Math.round(spanW * (0.030 + rand() * 0.038)));
    const bh = Math.max(18, Math.round(maxTowerH * (0.42 + rand() * 0.58) * valleyMul));
    const topY = baseY - bh;
    const styleRoll = rand();

    ctx.fillStyle = palette.nearTower;
    ctx.fillRect(nx, topY, bw, bh + 2);

    // Architectural Art-Deco crown variants (stepped ziggurat / rounded dome / spire)
    if (styleRoll > 0.64) {
      const cw1 = Math.round(bw * 0.68);
      const ch1 = Math.max(6, Math.round(bh * 0.13));
      const cx1 = nx + Math.round((bw - cw1) * 0.5);
      ctx.fillRect(cx1, topY - ch1, cw1, ch1 + 1);

      const cw2 = Math.round(bw * 0.36);
      const ch2 = Math.max(5, Math.round(bh * 0.11));
      const cx2 = nx + Math.round((bw - cw2) * 0.5);
      ctx.fillRect(cx2, topY - ch1 - ch2, cw2, ch2 + 1);

      // Spire antenna
      if (rand() > 0.45) {
        const spH = Math.max(8, Math.round(bh * 0.16));
        ctx.fillRect(nx + Math.round(bw * 0.5) - 1, topY - ch1 - ch2 - spH, 2, spH + 1);
      }
    } else if (styleRoll > 0.34) {
      // Streamline Moderne curved parapet
      ctx.beginPath();
      ctx.arc(nx + bw * 0.5, topY + 2, bw * 0.42, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Subtle rim light along top-edge of tower facing sun
    ctx.fillStyle = palette.winLit[0];
    ctx.globalAlpha = 0.24;
    ctx.fillRect(nx + 1, topY, bw - 2, 1.5);
    ctx.globalAlpha = 1;

    // Deterministic lit architectural window grid
    const padX = Math.max(4, Math.round(bw * 0.16));
    const cols = Math.max(2, Math.min(compact ? 4 : 5, Math.floor((bw - padX * 2) / (compact ? 6 : 8))));
    const winW = Math.max(2, Math.floor((bw - padX * 2 - (cols - 1) * 3) / cols));
    const winH = compact ? 2.5 : Math.max(3, Math.round(maxTowerH * 0.022));
    const rowStep = Math.max(winH + 3, Math.round(winH * 2.15));
    const colSpan = bw - padX * 2;
    const colStep = cols > 1 ? (colSpan - winW) / (cols - 1) : 0;

    for (let wy = topY + Math.max(6, Math.round(winH * 2)); wy < baseY - 6; wy += rowStep) {
      const floorLitBias = rand();
      for (let c = 0; c < cols; c++) {
        if (rand() < (floorLitBias > 0.65 ? 0.56 : 0.22)) {
          const wx = nx + padX + c * colStep;
          const colorIdx = (towerIdx + c) % palette.winLit.length;
          ctx.fillStyle = palette.winLit[colorIdx];
          ctx.globalAlpha = 0.48 + rand() * 0.44;
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    }
    ctx.globalAlpha = 1;

    nx += bw + Math.round(rand() * 4 - 1);
    towerIdx++;
  }
  ctx.restore();
}

/**
 * Draws the full-bleed Synthwave Skyline & Palm Horizon Stage for `skyline-split`
 * and the luminous Art-Deco horizon title band for `six-grid` (`center-band`).
 */
export function drawSkylineHorizonStage(
  ctx,
  width,
  height,
  template,
  formatId,
  effects,
  frameMetrics = null,
) {
  if (!template) return;
  const stageMode = template.stageMode;
  if (stageMode !== 'skyline-split' && stageMode !== 'center-band') return;

  const minDim = Math.min(width, height);
  const sideMargin = frameMetrics ? frameMetrics.sideMargin : Math.round(minDim * 0.016);
  const topInset = frameMetrics && frameMetrics.topInset > 0 ? frameMetrics.topInset : sideMargin;
  const bottomInset = frameMetrics && frameMetrics.bottomInset > 0 ? frameMetrics.bottomInset : sideMargin;
  const innerX = sideMargin;
  const innerW = Math.max(60, width - sideMargin * 2);
  const innerH = Math.max(60, height - topInset - bottomInset);
  const palette = getStagePalette(effects?.gradePreset);
  const gutterPx = Math.max(6, Math.round(minDim * (template.gutterRatio || 0.013)));

  if (stageMode === 'skyline-split') {
    const startRatio = template.skylineStartY?.[formatId] ?? 0.56;
    const splitY = Math.round(topInset + innerH * startRatio);
    const stageBot = height - bottomInset;
    const bandH = Math.max(80, stageBot - splitY);
    const waterY = Math.round(splitY + bandH * 0.62);

    ctx.save();
    ctx.beginPath();
    ctx.rect(innerX, splitY, innerW, bandH);
    ctx.clip();

    // 1. Multi-stop twilight coastal sky gradient
    const skyGrad = ctx.createLinearGradient(0, splitY, 0, waterY);
    skyGrad.addColorStop(0.00, palette.sky[0]);
    skyGrad.addColorStop(0.28, palette.sky[1]);
    skyGrad.addColorStop(0.58, palette.sky[2]);
    skyGrad.addColorStop(0.84, palette.sky[3]);
    skyGrad.addColorStop(1.00, palette.sky[4]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(innerX, splitY, innerW, waterY - splitY + 2);

    // 2. Glowing horizontal-striped retro sun rising above skyline horizon
    const sunR = Math.min(innerW * 0.24, bandH * 0.44);
    const sunCx = width * 0.5;
    const sunCy = waterY - sunR * 0.24;
    drawStripedSunDisc(ctx, sunCx, sunCy, sunR, palette, 0.94, 0.78);

    // 3. Layered Miami Art-Deco skyline with lit tower windows
    drawArtDecoSkyline(ctx, innerX, waterY + 2, innerW, bandH * 0.44, palette, 0x534b5931, false);

    // 4. Reflective ocean water horizon + shimmering horizontal reflection bars
    const waterH = Math.max(24, stageBot - waterY);
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, stageBot);
    waterGrad.addColorStop(0.00, palette.water[2]);
    waterGrad.addColorStop(0.32, palette.water[1]);
    waterGrad.addColorStop(1.00, palette.water[0]);
    ctx.fillStyle = waterGrad;
    ctx.fillRect(innerX, waterY, innerW, waterH + 2);

    // Crisp shoreline glow line
    const shoreGlow = ctx.createLinearGradient(innerX, waterY, innerX + innerW, waterY);
    shoreGlow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    shoreGlow.addColorStop(0.5, palette.waterGlint[0]);
    shoreGlow.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
    ctx.fillStyle = shoreGlow;
    ctx.fillRect(innerX, waterY, innerW, Math.max(2, Math.round(minDim * 0.0025)));

    // Tapering sun-reflection shimmer bars on water
    const wRand = mulberry32(0x57415452);
    const barCount = 16;
    for (let i = 0; i < barCount; i++) {
      const t = (i + 0.5) / barCount;
      const ry = waterY + t * waterH * 0.92;
      const maxSpan = sunR * (1.75 - t * 1.15);
      const barW = Math.max(24, maxSpan * (0.62 + wRand() * 0.52));
      const offset = (wRand() - 0.5) * sunR * 0.35;
      const barH = Math.max(2, Math.round((1 - t * 0.45) * (minDim * 0.005)));
      ctx.fillStyle = i % 2 === 0 ? palette.waterGlint[0] : palette.waterGlint[1];
      ctx.globalAlpha = (1 - t * 0.65) * 0.72;
      ctx.fillRect(sunCx - barW * 0.5 + offset, ry, barW, barH);
    }
    ctx.globalAlpha = 1;

    // 5. Sweeping foreground palm trees framing left & right edges
    if (effects?.showPalms !== false) {
      const palmScale = (minDim / 1180) * (width < height ? 1.02 : 0.88);
      drawSinglePalm(ctx, innerX + innerW * 0.015, stageBot + minDim * 0.016, palmScale * 1.05, false, palette.palmFill);
      drawSinglePalm(ctx, innerX + innerW * 0.085, stageBot + minDim * 0.025, palmScale * 0.76, false, palette.palmFill);
      drawSinglePalm(ctx, innerX + innerW * 0.985, stageBot + minDim * 0.016, palmScale * 1.02, true, palette.palmFill);
      drawSinglePalm(ctx, innerX + innerW * 0.915, stageBot + minDim * 0.025, palmScale * 0.74, true, palette.palmFill);
    }

    // Subtle dark gradient near bottom edge for crisp title/ribbon readability
    const botVig = ctx.createLinearGradient(0, splitY, 0, stageBot);
    botVig.addColorStop(0, 'rgba(6, 2, 16, 0.28)');
    botVig.addColorStop(0.55, 'rgba(6, 2, 16, 0.12)');
    botVig.addColorStop(1, 'rgba(5, 2, 14, 0.46)');
    ctx.fillStyle = botVig;
    ctx.fillRect(innerX, splitY, innerW, bandH);

    ctx.restore();

    // Crisp black comic-ink divider beam + cream hairline along split seam
    ctx.save();
    ctx.fillStyle = '#050209';
    ctx.fillRect(innerX, splitY - Math.round(gutterPx * 0.5), innerW, gutterPx);
    ctx.strokeStyle = 'rgba(255, 245, 224, 0.78)';
    ctx.lineWidth = Math.max(1.5, minDim * 0.0018);
    ctx.beginPath();
    ctx.moveTo(innerX, splitY + Math.round(gutterPx * 0.5));
    ctx.lineTo(innerX + innerW, splitY + Math.round(gutterPx * 0.5));
    ctx.stroke();
    ctx.restore();
    return;
  }

  // `center-band` mode (`six-grid`) — dedicated glowing horizon band between top & bottom rows
  const span = template.bandSpan?.[formatId] || [0.41, 0.59];
  const y1 = Math.round(topInset + innerH * span[0]);
  const y2 = Math.round(topInset + innerH * span[1]);
  const bandH = Math.max(64, y2 - y1);

  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, y1, innerW, bandH);
  ctx.clip();

  // Luminous twilight horizon sky
  const skyGrad = ctx.createLinearGradient(0, y1, 0, y2);
  skyGrad.addColorStop(0.00, palette.sky[0]);
  skyGrad.addColorStop(0.32, palette.sky[1]);
  skyGrad.addColorStop(0.68, palette.sky[2]);
  skyGrad.addColorStop(1.00, palette.sky[3]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(innerX, y1, innerW, bandH);

  // Subtle glowing striped retro sun centered inside the horizon band
  const sunR = Math.min(innerW * 0.16, bandH * 0.72);
  drawStripedSunDisc(ctx, width * 0.5, y1 + bandH * 0.54, sunR, palette, 0.88, 0.65);

  // Compact Art-Deco coastal skyline silhouette along bottom third of center band
  drawArtDecoSkyline(ctx, innerX, y2 + 2, innerW, bandH * 0.56, palette, 0x42414e44, true);

  // Subtle flanking palms at band edges
  if (effects?.showPalms !== false) {
    const pScale = bandH / 230;
    drawSinglePalm(ctx, innerX + innerW * 0.015, y2 + 12, pScale * 0.95, false, palette.palmFill);
    drawSinglePalm(ctx, innerX + innerW * 0.985, y2 + 12, pScale * 0.95, true, palette.palmFill);
  }
  ctx.restore();

  // Crisp comic-ink horizontal borders + cream hairlines framing the center band
  ctx.save();
  ctx.fillStyle = '#050209';
  ctx.fillRect(innerX, y1 - Math.round(gutterPx * 0.5), innerW, gutterPx);
  ctx.fillRect(innerX, y2 - Math.round(gutterPx * 0.5), innerW, gutterPx);
  ctx.strokeStyle = 'rgba(255, 245, 224, 0.76)';
  ctx.lineWidth = Math.max(1.5, minDim * 0.0018);
  ctx.beginPath();
  ctx.moveTo(innerX, y1 + Math.round(gutterPx * 0.5));
  ctx.lineTo(innerX + innerW, y1 + Math.round(gutterPx * 0.5));
  ctx.moveTo(innerX, y2 - Math.round(gutterPx * 0.5));
  ctx.lineTo(innerX + innerW, y2 - Math.round(gutterPx * 0.5));
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws the subtle glowing striped sunset halo + smooth lower-hero dark theatrical
 * vignette inside the Hero panel (used on `cast-mosaic` and full-bleed layouts so
 * the Outrun Striped Chrome title lockup leaps off the page).
 */
export function drawHeroSunHalo(ctx, width, height, heroGeom, effects, frameMetrics = null) {
  if (!heroGeom || !heroGeom.points || heroGeom.points.length === 0) return;

  const stageTop = frameMetrics ? frameMetrics.stageTop : 0;
  const stageBottom = frameMetrics ? frameMetrics.stageBottom : height;
  const stageH = stageBottom - stageTop;
  const palette = getStagePalette(effects?.gradePreset);
  const b = heroGeom.bounds;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(heroGeom.points[0][0], heroGeom.points[0][1]);
  for (let i = 1; i < heroGeom.points.length; i++) {
    ctx.lineTo(heroGeom.points[i][0], heroGeom.points[i][1]);
  }
  ctx.closePath();
  ctx.clip();

  // Smooth bottom hero dark vignette so lower chest/shirt forms a commanding stage for the title
  // while keeping THE BOSS's full face and silver beard bright & luminous above NEON EMPIRE
  const vigStart = b.y + b.h * 0.57;
  const vigGrad = ctx.createLinearGradient(0, vigStart, 0, b.y + b.h);
  vigGrad.addColorStop(0.0, 'rgba(6, 2, 16, 0)');
  vigGrad.addColorStop(0.45, 'rgba(8, 3, 20, 0.34)');
  vigGrad.addColorStop(0.80, 'rgba(8, 3, 20, 0.66)');
  vigGrad.addColorStop(1.0, 'rgba(5, 2, 14, 0.80)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(b.x, vigStart, b.w, b.y + b.h - vigStart);

  // Subtle glowing striped sunset disc behind the lower title/subtitle/ribbon zone
  if (effects?.showHorizonDisc) {
    const discCx = b.cx;
    const discCy = Math.min(b.y + b.h * 0.78, stageTop + stageH * 0.76);
    const discR = Math.min(b.w * 0.36, Math.min(width, height) * 0.165);
    drawStripedSunDisc(ctx, discCx, discCy, discR, palette, 0.42, 0.40);
  }

  ctx.restore();
}

function drawSunsetWash(ctx, width, height, intensity, palette) {
  if (intensity <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = intensity * 0.20;
  const grad = ctx.createLinearGradient(0, 0, width * 0.35, height);
  grad.addColorStop(0, palette.washStops[0]);
  grad.addColorStop(0.45, palette.washStops[1]);
  grad.addColorStop(0.85, palette.washStops[2]);
  grad.addColorStop(1, palette.washStops[3]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = intensity * 0.40;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawDualNeonRim(ctx, width, height, intensity, palette) {
  if (intensity <= 0.01) return;
  const radius = Math.max(width, height) * 0.60;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  const rim1 = ctx.createRadialGradient(
    width * 0.04,
    height * 0.92,
    radius * 0.02,
    width * 0.04,
    height * 0.92,
    radius,
  );
  rim1.addColorStop(0, `${palette.rimA}${0.40 * intensity})`);
  rim1.addColorStop(0.46, `${palette.rimA}${0.14 * intensity})`);
  rim1.addColorStop(1, `${palette.rimA}0)`);
  ctx.fillStyle = rim1;
  ctx.fillRect(0, 0, width, height);

  const rim2 = ctx.createRadialGradient(
    width * 0.96,
    height * 0.08,
    radius * 0.02,
    width * 0.96,
    height * 0.08,
    radius,
  );
  rim2.addColorStop(0, `${palette.rimB}${0.38 * intensity})`);
  rim2.addColorStop(0.44, `${palette.rimB}${0.12 * intensity})`);
  rim2.addColorStop(1, `${palette.rimB}0)`);
  ctx.fillStyle = rim2;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

function drawPalmSilhouettes(ctx, width, height, stageBottom, palette) {
  const minDim = Math.min(width, height);
  const scale = minDim / 1340;
  ctx.save();
  drawSinglePalm(ctx, width * 0.005, stageBottom + minDim * 0.012, scale * 0.68, false, palette.palmFill);
  drawSinglePalm(ctx, width * 0.995, stageBottom + minDim * 0.012, scale * 0.62, true, palette.palmFill);
  ctx.restore();
}

function drawFilmGrain(ctx, width, height, intensity) {
  if (intensity <= 0.01) return;
  const tile = getDeterministicGrainTile();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = intensity * 0.20;
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
  vig.addColorStop(0.7, `rgba(10, 4, 22, ${0.22 * intensity})`);
  vig.addColorStop(1, `rgba(6, 2, 14, ${0.68 * intensity})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawAtmosphericOverlays(
  ctx,
  width,
  height,
  effects,
  panelGeometries,
  frameMetrics = null,
  template = null,
) {
  const sunsetAmt = (effects?.sunsetOverlay ?? 0) / 100;
  const neonAmt = (effects?.neonRim ?? 0) / 100;
  const grainAmt = (effects?.grain ?? 0) / 100;
  const vignetteAmt = (effects?.vignette ?? 0) / 100;
  const palette = getStagePalette(effects?.gradePreset);

  const stageTop = frameMetrics ? frameMetrics.stageTop : 0;
  const stageBottom = frameMetrics ? frameMetrics.stageBottom : height;
  const stageMode = template?.stageMode || 'full-bleed';
  const hasHeroPanel = Boolean(panelGeometries?.some((g) => g.isHero));

  ctx.save();
  if (frameMetrics && (frameMetrics.hasTop || frameMetrics.hasBottom)) {
    ctx.beginPath();
    ctx.rect(0, stageTop, width, stageBottom - stageTop);
    ctx.clip();
  }

  drawSunsetWash(ctx, width, height, sunsetAmt, palette);
  drawDualNeonRim(ctx, width, height, neonAmt, palette);

  // Only draw global fallback retro disc if stageMode didn't already draw skyline/hero disc
  if (effects?.showHorizonDisc && stageMode === 'full-bleed' && !hasHeroPanel) {
    const minDim = Math.min(width, height);
    const r = minDim * 0.17;
    drawStripedSunDisc(ctx, width * 0.5, stageTop + (stageBottom - stageTop) * 0.72, r, palette, 0.72, 0.55);
  }

  // Draw corner palms when not already rendered inside skyline-split stage
  if (effects?.showPalms && stageMode !== 'skyline-split') {
    drawPalmSilhouettes(ctx, width, height, stageBottom, palette);
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
  ctx.fillStyle = '#f8f2e4';
  drawRoundedRect(ctx, x, y, w, h, 3);
  ctx.fill();

  const padX = Math.max(5, Math.round(w * 0.08));
  const padTop = Math.max(4, Math.round(h * 0.11));
  const codeH = Math.round(h * 0.58);
  const usableW = w - padX * 2;

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

  const serialFont = Math.max(8, Math.round(h * 0.21));
  ctx.fillStyle = '#140c22';
  ctx.font = `600 ${serialFont}px "Oswald", monospace, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('86  01986  20261', x + w * 0.5, y + h - Math.max(2, Math.round(h * 0.05)), usableW);
  ctx.restore();
}

/**
 * Tokenizes a billing-block credit string into authentic mixed-size Hollywood runs:
 * - Lowercase connector phrases (`a`, `production in association with`, `music by`,
 *   `edited by`, `directed by`, etc.) -> `{ kind: 'small', lines: [...] }`
 * - UPPERCASE names (`SOLARIS PICTURES`, `M. VALDEZ`, `NEON EMPIRE`) -> `{ kind: 'large', text }`
 */
function parseHollywoodBillingTokens(rawText) {
  const words = rawText.trim().split(/\s+/).filter(Boolean);
  const runs = [];

  const isLowerConnector = (w) => {
    const letters = w.replace(/[^a-zA-Z]/g, '');
    if (!letters) return false;
    return letters === letters.toLowerCase();
  };

  let curKind = null;
  let curWords = [];

  const flush = () => {
    if (curWords.length === 0) return;
    if (curKind === 'small') {
      const upperWords = curWords.map((w) => w.toUpperCase());
      if (upperWords.length <= 1) {
        runs.push({ kind: 'small', lines: [upperWords[0]] });
      } else if (upperWords.length === 2) {
        runs.push({ kind: 'small', lines: [upperWords[0], upperWords[1]] });
      } else {
        const mid = Math.ceil(upperWords.length / 2);
        runs.push({
          kind: 'small',
          lines: [upperWords.slice(0, mid).join(' '), upperWords.slice(mid).join(' ')],
        });
      }
    } else {
      runs.push({ kind: 'large', text: curWords.join(' ').toUpperCase() });
    }
    curWords = [];
  };

  for (const w of words) {
    if (w === '•' || w === '|') {
      flush();
      runs.push({ kind: 'sep', text: '•' });
      curKind = null;
      continue;
    }
    const k = isLowerConnector(w) ? 'small' : 'large';
    if (curKind && curKind !== k) {
      flush();
    }
    curKind = k;
    curWords.push(w);
  }
  flush();
  return runs;
}

function measureBillingLine(ctx, runs, largeFont, smallFont, gapPx) {
  let totalW = 0;
  const items = runs.map((run) => {
    if (run.kind === 'large') {
      ctx.font = largeFont;
      const w = ctx.measureText(run.text).width;
      totalW += w;
      return { ...run, w };
    }
    if (run.kind === 'sep') {
      ctx.font = smallFont;
      const w = ctx.measureText('•').width + gapPx * 0.6;
      totalW += w;
      return { ...run, w };
    }
    ctx.font = smallFont;
    let maxW = 0;
    for (const ln of run.lines) {
      maxW = Math.max(maxW, ctx.measureText(ln).width);
    }
    totalW += maxW;
    return { ...run, w: maxW };
  });
  if (items.length > 1) {
    totalW += (items.length - 1) * gapPx;
  }
  return { items, totalW };
}

function drawHollywoodBillingBlock(ctx, rawCredits, centerX, midY, availW, barH) {
  const trimmed = (rawCredits || '').trim();
  if (!trimmed) return;

  const hasLowercase = /[a-z]/.test(trimmed);
  if (!hasLowercase && /[•|]/.test(trimmed)) {
    // Classic uppercase bullet-separated fallback if user writes custom all-caps credits
    const parts = trimmed.toUpperCase().split(/\s*[•|]\s*/).filter(Boolean);
    const splitIdx = Math.ceil(parts.length / 2);
    const line1 = parts.slice(0, splitIdx).join('   •   ');
    const line2 = parts.slice(splitIdx).join('   •   ');
    const f1 = Math.max(13, Math.round(barH * 0.27));
    const f2 = Math.max(11, Math.round(barH * 0.22));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (line2) {
      ctx.font = `400 ${f1}px "Bebas Neue", "Oswald", sans-serif`;
      ctx.fillStyle = '#f6eedc';
      ctx.fillText(line1, centerX, midY - barH * 0.14, availW);
      ctx.font = `600 ${f2}px "Oswald", sans-serif`;
      ctx.fillStyle = '#b9aecf';
      ctx.fillText(line2, centerX, midY + barH * 0.17, availW);
    } else {
      ctx.font = `400 ${f1}px "Bebas Neue", "Oswald", sans-serif`;
      ctx.fillStyle = '#f6eedc';
      ctx.fillText(line1, centerX, midY + 1, availW);
    }
    return;
  }

  const allRuns = parseHollywoodBillingTokens(trimmed);
  if (allRuns.length === 0) return;

  // Split tokens cleanly into 2 balanced theatrical billing lines (never split a small connector from its following name)
  let line1Runs = allRuns;
  let line2Runs = [];
  if (allRuns.length >= 4) {
    let bestSplit = Math.ceil(allRuns.length / 2);
    // Prefer splitting right BEFORE a `small` connector near the midpoint
    const target = allRuns.length * 0.52;
    let bestDist = Infinity;
    for (let i = 2; i < allRuns.length - 1; i++) {
      if (allRuns[i].kind === 'small') {
        const d = Math.abs(i - target);
        if (d < bestDist) {
          bestDist = d;
          bestSplit = i;
        }
      }
    }
    line1Runs = allRuns.slice(0, bestSplit);
    line2Runs = allRuns.slice(bestSplit);
  }

  const lines = line2Runs.length > 0 ? [line1Runs, line2Runs] : [line1Runs];
  const baseLargePx = Math.max(14, Math.round(barH * (lines.length === 2 ? 0.34 : 0.44)));
  const baseSmallPx = Math.max(8, Math.round(baseLargePx * 0.42));
  const gapPx = Math.max(5, Math.round(baseLargePx * 0.28));

  const largeFont = `400 ${baseLargePx}px "Bebas Neue", "Oswald", sans-serif`;
  const smallFont = `600 ${baseSmallPx}px "Oswald", sans-serif`;

  const rowGap = lines.length === 2 ? barH * 0.34 : 0;
  const startY = lines.length === 2 ? midY - rowGap * 0.52 : midY + 1;

  lines.forEach((runs, rowIdx) => {
    const { items, totalW } = measureBillingLine(ctx, runs, largeFont, smallFont, gapPx);
    const scaleX = totalW > availW ? availW / totalW : 1;
    const rowY = startY + rowIdx * rowGap;

    ctx.save();
    ctx.translate(centerX, rowY);
    ctx.scale(scaleX, 1);

    let x = -totalW * 0.5;
    ctx.textBaseline = 'middle';

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'large') {
        ctx.font = largeFont;
        ctx.fillStyle = rowIdx === 0 ? '#f6eedc' : '#e6dcf4';
        ctx.textAlign = 'left';
        ctx.fillText(it.text, x, 1);
      } else if (it.kind === 'sep') {
        ctx.font = smallFont;
        ctx.fillStyle = '#9c8db8';
        ctx.textAlign = 'center';
        ctx.fillText('•', x + it.w * 0.5, 0);
      } else {
        ctx.font = smallFont;
        ctx.fillStyle = '#afa3c8';
        ctx.textAlign = 'center';
        const cx = x + it.w * 0.5;
        if (it.lines.length === 1) {
          ctx.fillText(it.lines[0], cx, 1);
        } else {
          const lineStep = baseSmallPx * 1.05;
          ctx.fillText(it.lines[0], cx, -lineStep * 0.46);
          ctx.fillText(it.lines[1], cx, lineStep * 0.54);
        }
      }
      x += it.w + gapPx;
    }

    ctx.restore();
  });
}

export function drawCollectorPosterFrame(ctx, width, height, frameState, metrics, effects = null) {
  if (!metrics || !metrics.enabled) return;
  const minDim = Math.min(width, height);
  const padX = Math.max(20, Math.round(width * 0.022));
  const palette = getStagePalette(effects?.gradePreset);

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

    // Grade-matched metallic hairline divider
    const ruleGrad = ctx.createLinearGradient(0, 0, width, 0);
    ruleGrad.addColorStop(0, palette.accentRule[0]);
    ruleGrad.addColorStop(0.45, palette.accentRule[1]);
    ruleGrad.addColorStop(0.85, palette.accentRule[2]);
    ruleGrad.addColorStop(1, palette.accentRule[3]);
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

    // Right: Gold-Framed Edition Badge (VOL. 1)
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

    // Center: “<CRITIC QUOTE>” — <CRITIC SOURCE>
    const rawQuote = (frameState.criticQuote || '').trim().toUpperCase();
    const rawSource = (frameState.criticSource || '').trim().toUpperCase();
    if (rawQuote) {
      const quotePart = `“${rawQuote}”`;
      const sourcePart = rawSource ? `  —  ${rawSource}` : '';
      const quoteFontPx = Math.max(13, Math.round(barH * 0.42));
      const srcFontPx = Math.max(11, Math.round(barH * 0.34));

      const leftReserve = starsStartX + 5 * starStep + 14;
      const rightReserve = padX + badgeW + 18;
      const availW = Math.max(120, width - leftReserve - rightReserve);
      const centerX = leftReserve + availW * 0.5;

      ctx.font = `600 ${quoteFontPx}px "Oswald", sans-serif`;
      const qW = ctx.measureText(quotePart).width;
      ctx.font = `600 ${srcFontPx}px "Oswald", sans-serif`;
      const sW = sourcePart ? ctx.measureText(sourcePart).width : 0;
      const totalW = qW + sW;
      const fitScale = totalW > availW ? availW / totalW : 1;

      ctx.save();
      ctx.translate(centerX, midY + 1);
      ctx.scale(fitScale, 1);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      const startX = -totalW * 0.5;
      ctx.font = `600 ${quoteFontPx}px "Oswald", sans-serif`;
      ctx.fillStyle = '#fff5e6';
      ctx.fillText(quotePart, startX, 0);

      if (sourcePart) {
        ctx.font = `600 ${srcFontPx}px "Oswald", sans-serif`;
        ctx.fillStyle = '#f8cf6e';
        ctx.fillText(sourcePart, startX + qW, 0.5);
      }
      ctx.restore();
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
    ruleGrad.addColorStop(0, palette.accentRule[2]);
    ruleGrad.addColorStop(0.5, palette.accentRule[1]);
    ruleGrad.addColorStop(1, palette.accentRule[0]);
    ctx.fillStyle = ruleGrad;
    ctx.fillRect(0, barY, width, 2);

    const midY = barY + barH * 0.5;

    // Left: `— COMING SOON —` flanked by sleek horizontal accent lines
    const comingText = (frameState.comingSoonText || '').trim().toUpperCase();
    let leftBlockW = 0;
    if (comingText) {
      const cFont = Math.max(15, Math.round(barH * 0.34));
      ctx.font = `400 ${cFont}px "Bebas Neue", "Oswald", sans-serif`;
      const tw = ctx.measureText(comingText).width;
      const dashLen = Math.max(12, Math.round(barH * 0.24));
      const dashGap = Math.max(6, Math.round(cFont * 0.28));
      const totalStampW = tw + (dashLen + dashGap) * 2;
      const startX = padX;
      leftBlockW = Math.round(totalStampW + 20);

      ctx.save();
      ctx.strokeStyle = palette.stampColor;
      ctx.lineWidth = Math.max(1.6, minDim * 0.0018);
      ctx.shadowColor = palette.stampGlow;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(startX, midY);
      ctx.lineTo(startX + dashLen, midY);
      ctx.moveTo(startX + dashLen + dashGap * 2 + tw, midY);
      ctx.lineTo(startX + totalStampW, midY);
      ctx.stroke();

      ctx.fillStyle = '#fff5fb';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(comingText, startX + dashLen + dashGap, midY + 1);
      ctx.restore();
    }

    // Right: Crisp Off-White Procedural Collector Barcode
    const bcH = Math.round(barH * 0.68);
    const bcW = Math.round(bcH * 2.15);
    const bcX = width - padX - bcW;
    const bcY = Math.round(barY + (barH - bcH) * 0.5);
    drawProceduralBarcode(ctx, bcX, bcY, bcW, bcH);
    const rightBlockW = bcW + 18;

    // Center: Authentic Mixed-Size Hollywood Billing Block
    const creditsRaw = (frameState.billingCredits || '').trim();
    if (creditsRaw) {
      const availX = padX + leftBlockW;
      const availW = Math.max(140, width - padX * 2 - leftBlockW - rightBlockW);
      const centerX = availX + availW * 0.5;
      drawHollywoodBillingBlock(ctx, creditsRaw, centerX, midY, availW, barH);
    }

    ctx.restore();
  }
}
