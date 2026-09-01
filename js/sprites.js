/**
 * sprites.js — semua art di-generate secara prosedural ke offscreen canvas,
 * jadi game ini tidak butuh file gambar sama sekali (nol aset biner).
 */

const PALETTE = {
  skyTop: '#4ec0ca',
  skyBottom: '#8fe0e6',
  cloud: '#ffffff',
  building: '#5ec3ae',
  buildingDark: '#4fae9b',
  bush: '#7bd07a',
  bushDark: '#5cb85c',
  groundTop: '#ded895',
  groundBody: '#d9d287',
  groundStripe: '#c9be6b',
  groundEdge: '#8a7c46',
  pipeBody: '#74bf2e',
  pipeLight: '#a8e05a',
  pipeShade: '#4e8b1c',
  pipeEdge: '#38660f',
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas: c, ctx };
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/* ---------------------------------------------------------------- burung */

/**
 * Menggambar satu frame burung. `wing` = -1 (atas), 0 (tengah), 1 (bawah).
 */
function drawBird(ctx, w, h, wing, bodyColor) {
  const cx = w / 2;
  const cy = h / 2;

  // badan
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.36, h * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // perut lebih terang
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.02, cy + h * 0.12, w * 0.24, h * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // sayap
  const wingY = cy + wing * h * 0.16;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.12, wingY, w * 0.19, h * (wing === 0 ? 0.13 : 0.16), wing * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // mata
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + w * 0.16, cy - h * 0.12, w * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(cx + w * 0.2, cy - h * 0.12, w * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // paruh
  ctx.fillStyle = '#ff9d21';
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.3, cy - h * 0.02);
  ctx.lineTo(cx + w * 0.48, cy + h * 0.04);
  ctx.lineTo(cx + w * 0.3, cy + h * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function createBirdFrames(w = 40, h = 30, bodyColor = '#f7d51d') {
  return [-1, 0, 1, 0].map((wing) => {
    const { canvas, ctx } = makeCanvas(w, h);
    drawBird(ctx, w, h, wing, bodyColor);
    return canvas;
  });
}

/* ----------------------------------------------------------------- pipa */

/** Batang pipa (dapat di-tile secara vertikal) + kepala pipa. */
export function createPipeSprites(width = 62, capHeight = 26) {
  const bodyH = 64;
  const body = makeCanvas(width, bodyH);
  paintPipeSurface(body.ctx, 0, 0, width, bodyH);

  const cap = makeCanvas(width + 8, capHeight);
  paintPipeSurface(cap.ctx, 0, 0, width + 8, capHeight);

  return { body: body.canvas, cap: cap.canvas, width, capWidth: width + 8, capHeight };
}

function paintPipeSurface(ctx, x, y, w, h) {
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, PALETTE.pipeShade);
  grad.addColorStop(0.18, PALETTE.pipeBody);
  grad.addColorStop(0.42, PALETTE.pipeLight);
  grad.addColorStop(0.68, PALETTE.pipeBody);
  grad.addColorStop(1, PALETTE.pipeShade);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = PALETTE.pipeEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y - 1, w - 2, h + 2);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + w * 0.3, y, 3, h);
}

/* ---------------------------------------------------------------- tanah */

export function createGroundSprite(width = 360, height = 112) {
  const { canvas, ctx } = makeCanvas(width, height);

  ctx.fillStyle = PALETTE.groundTop;
  ctx.fillRect(0, 0, width, height);

  // strip rumput di atas
  ctx.fillStyle = PALETTE.bush;
  ctx.fillRect(0, 0, width, 12);
  ctx.fillStyle = PALETTE.bushDark;
  for (let x = 0; x < width; x += 12) {
    ctx.fillRect(x, 8, 6, 4);
  }

  ctx.fillStyle = PALETTE.groundEdge;
  ctx.fillRect(0, 12, width, 2);

  ctx.fillStyle = PALETTE.groundBody;
  ctx.fillRect(0, 14, width, height - 14);

  // pola diagonal
  ctx.fillStyle = PALETTE.groundStripe;
  for (let x = -height; x < width; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 14);
    ctx.lineTo(x + 8, 14);
    ctx.lineTo(x + 8 + 14, 30);
    ctx.lineTo(x + 14, 30);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = PALETTE.groundEdge;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(0, 30, width, 2);
  ctx.globalAlpha = 1;

  return canvas;
}

/* ------------------------------------------------------------ latar kota */

export function createSkylineSprite(width = 360, height = 120) {
  const { canvas, ctx } = makeCanvas(width, height);
  let rng = 20260901;
  const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

  // gedung
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass === 0 ? PALETTE.buildingDark : PALETTE.building;
    let x = pass === 0 ? -10 : 6;
    while (x < width + 20) {
      const bw = 26 + Math.floor(rand() * 26);
      const bh = (pass === 0 ? 38 : 48) + Math.floor(rand() * 40);
      const y = height - bh - (pass === 0 ? 16 : 0);
      ctx.fillRect(x, y, bw, bh);
      // atap runcing sesekali
      if (rand() > 0.72) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + bw / 2, y - 12);
        ctx.lineTo(x + bw, y);
        ctx.closePath();
        ctx.fill();
      }
      // jendela
      if (pass === 1) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.20)';
        for (let wy = y + 8; wy < height - 8; wy += 12) {
          for (let wx = x + 5; wx < x + bw - 6; wx += 10) {
            if (rand() > 0.42) ctx.fillRect(wx, wy, 5, 6);
          }
        }
        ctx.restore();
      }
      x += bw + 4 + Math.floor(rand() * 10);
    }
  }

  // semak di dasar
  ctx.fillStyle = PALETTE.bushDark;
  ctx.fillRect(0, height - 16, width, 16);
  ctx.fillStyle = PALETTE.bush;
  for (let x = -8; x < width + 16; x += 22) {
    ctx.beginPath();
    ctx.arc(x, height - 14, 14, Math.PI, 0);
    ctx.fill();
  }

  return canvas;
}

/* ---------------------------------------------------------------- awan */

export function createCloudSprite(scale = 1) {
  const w = 96 * scale;
  const h = 44 * scale;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const puffs = [
    [0.26, 0.66, 0.24],
    [0.48, 0.5, 0.31],
    [0.72, 0.64, 0.22],
    [0.6, 0.72, 0.2],
    [0.38, 0.74, 0.2],
  ];
  for (const [px, py, pr] of puffs) {
    ctx.beginPath();
    ctx.arc(px * w, py * h, pr * w * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(w * 0.2, h * 0.66, w * 0.6, h * 0.28);
  return canvas;
}

/* --------------------------------------------------------------- medali */

export function createMedalSprite(kind) {
  const size = 44;
  const { canvas, ctx } = makeCanvas(size, size);
  const colors = {
    perunggu: ['#e2894f', '#a95f2c', '#f6bd8c'],
    perak: ['#d8dde3', '#9aa3ad', '#f4f7fa'],
    emas: ['#ffd743', '#c99b1b', '#fff0a8'],
    platinum: ['#bfe9ff', '#6fa9c9', '#ecfaff'],
  };
  const [main, dark, light] = colors[kind] || colors.perunggu;
  const cx = size / 2;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, light);
  grad.addColorStop(0.5, main);
  grad.addColorStop(1, dark);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cx, size * 0.44, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(cx, cx, size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = dark;
  ctx.font = `bold ${size * 0.34}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, cx + 1);

  return canvas;
}

export { PALETTE };
