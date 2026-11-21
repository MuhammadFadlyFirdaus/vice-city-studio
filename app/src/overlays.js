// Curated Vice City atmospheric overlays:
// Sunset sky wash, dual neon rim glow, procedural palm silhouettes,
// optional retro horizon sun disc, deterministic PRNG film grain, and vignette.

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

function drawSunsetWash(ctx, width, height, intensity) {
  if (intensity <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = intensity * 0.42;
  const grad = ctx.createLinearGradient(0, 0, width * 0.35, height);
  grad.addColorStop(0, '#ff8f3f');
  grad.addColorStop(0.45, '#ff358b');
  grad.addColorStop(0.85, '#6a1b9a');
  grad.addColorStop(1, '#1a0b38');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = intensity * 0.36;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawDualNeonRim(ctx, width, height, intensity) {
  if (intensity <= 0.01) return;
  const radius = Math.max(width, height) * 0.65;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Hot-pink Miami glow from bottom-left
  const pinkGrad = ctx.createRadialGradient(
    width * 0.05,
    height * 0.92,
    radius * 0.02,
    width * 0.05,
    height * 0.92,
    radius,
  );
  pinkGrad.addColorStop(0, `rgba(255, 48, 152, ${0.46 * intensity})`);
  pinkGrad.addColorStop(0.48, `rgba(255, 72, 136, ${0.18 * intensity})`);
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
  cyanGrad.addColorStop(0, `rgba(42, 232, 255, ${0.44 * intensity})`);
  cyanGrad.addColorStop(0.45, `rgba(42, 232, 255, ${0.14 * intensity})`);
  cyanGrad.addColorStop(1, 'rgba(42, 232, 255, 0)');
  ctx.fillStyle = cyanGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

function drawRetroHorizonDisc(ctx, width, height) {
  const minDim = Math.min(width, height);
  const r = minDim * 0.19;
  const cx = width * 0.5;
  const cy = height * 0.72;

  ctx.save();
  // Soft sunset halo behind sun disc
  ctx.globalCompositeOperation = 'screen';
  const halo = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.1);
  halo.addColorStop(0, 'rgba(255, 118, 84, 0.55)');
  halo.addColorStop(0.55, 'rgba(255, 42, 138, 0.22)');
  halo.addColorStop(1, 'rgba(255, 42, 138, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2);
  ctx.fill();

  // Striped retro disc
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

  // Clean horizontal retro horizon cuts in lower half
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

  ctx.fillStyle = 'rgba(9, 4, 18, 0.82)';

  // Graceful leaning trunk tucked into extreme lower corner
  ctx.beginPath();
  ctx.moveTo(-16, 24);
  ctx.quadraticCurveTo(18, -90, 62, -198);
  ctx.lineTo(52, -202);
  ctx.quadraticCurveTo(4, -96, -30, 24);
  ctx.closePath();
  ctx.fill();

  // Lush feathered palm fronds radiating cleanly from crown
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
    // Main central frond spine
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(f.len * 0.55, -16, f.len, f.droop);
    ctx.quadraticCurveTo(f.len * 0.52, -4, 0, 5);
    ctx.closePath();
    ctx.fill();
    // Hanging palm leaflets along the curve
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

function drawPalmSilhouettes(ctx, width, height) {
  const minDim = Math.min(width, height);
  const scale = minDim / 1280;
  ctx.save();
  // Frame extreme bottom corners subtly without obscuring focal subjects
  drawSinglePalm(ctx, width * 0.005, height * 1.02, scale * 0.78, false);
  drawSinglePalm(ctx, width * 0.995, height * 1.02, scale * 0.70, true);
  ctx.restore();
}

function drawFilmGrain(ctx, width, height, intensity) {
  if (intensity <= 0.01) return;
  const tile = getDeterministicGrainTile();
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = intensity * 0.24;
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
  const innerR = Math.min(width, height) * 0.34;
  const outerR = Math.hypot(width, height) * 0.54;
  const vig = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  vig.addColorStop(0, 'rgba(8, 3, 18, 0)');
  vig.addColorStop(0.7, `rgba(10, 4, 22, ${0.26 * intensity})`);
  vig.addColorStop(1, `rgba(6, 2, 14, ${0.72 * intensity})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function drawAtmosphericOverlays(ctx, width, height, effects) {
  const sunsetAmt = (effects.sunsetOverlay ?? 0) / 100;
  const neonAmt = (effects.neonRim ?? 0) / 100;
  const grainAmt = (effects.grain ?? 0) / 100;
  const vignetteAmt = (effects.vignette ?? 0) / 100;

  drawSunsetWash(ctx, width, height, sunsetAmt);
  drawDualNeonRim(ctx, width, height, neonAmt);
  if (effects.showHorizonDisc) {
    drawRetroHorizonDisc(ctx, width, height);
  }
  if (effects.showPalms) {
    drawPalmSilhouettes(ctx, width, height);
  }
  drawFilmGrain(ctx, width, height, grainAmt);
  drawVignette(ctx, width, height, vignetteAmt);
}
