/**
 * game.js — inti permainan Flappy Bird.
 * Resolusi logis tetap 360x640; kanvas di-scale mengikuti ukuran layar.
 */

import {
  createBirdFrames,
  createPipeSprites,
  createGroundSprite,
  createSkylineSprite,
  createCloudSprite,
  createMedalSprite,
} from './sprites.js';
import { SoundBoard } from './audio.js';

export const W = 360;
export const H = 640;

const CFG = {
  gravity: 1750,          // px/detik^2
  flapVelocity: -455,     // px/detik
  maxFallSpeed: 620,
  groundHeight: 96,
  pipeWidth: 62,
  pipeCapHeight: 26,
  pipeGap: 158,           // celah awal
  pipeGapMin: 126,        // celah tersempit setelah sulit
  pipeSpacing: 205,       // jarak horizontal antar pipa
  speed: 132,             // kecepatan gulir awal
  speedMax: 205,
  birdX: 96,
  birdW: 40,
  birdH: 30,
  hitboxScale: 0.72,
  marginTop: 60,          // pipa tidak muncul terlalu mepet atas
  marginBottom: 40,
};

const MEDALS = [
  { min: 40, kind: 'platinum', label: 'Platinum' },
  { min: 30, kind: 'emas', label: 'Emas' },
  { min: 20, kind: 'perak', label: 'Perak' },
  { min: 10, kind: 'perunggu', label: 'Perunggu' },
];

const BEST_KEY = 'flappy.best';
const STATE = { READY: 'ready', PLAY: 'play', DYING: 'dying', OVER: 'over' };

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export class FlappyGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundBoard();

    this.birdFrames = createBirdFrames(CFG.birdW, CFG.birdH);
    this.pipe = createPipeSprites(CFG.pipeWidth, CFG.pipeCapHeight);
    this.ground = createGroundSprite(W, CFG.groundHeight + 16);
    this.skyline = createSkylineSprite(W, 120);
    this.clouds = [createCloudSprite(1), createCloudSprite(0.72), createCloudSprite(1.25)];
    this.medals = {
      perunggu: createMedalSprite('perunggu'),
      perak: createMedalSprite('perak'),
      emas: createMedalSprite('emas'),
      platinum: createMedalSprite('platinum'),
    };

    this.best = Number(localStorage.getItem(BEST_KEY) || 0);
    this.paused = false;
    this.groundY = H - CFG.groundHeight;

    this.accumulator = 0;
    this.lastTime = 0;
    this.step = 1 / 120;

    this.reset(true);
  }

  /* ------------------------------------------------------------- lifecycle */

  reset(hard = false) {
    this.state = STATE.READY;
    this.score = 0;
    this.newBest = false;
    this.pipes = [];
    this.particles = [];
    this.speed = CFG.speed;
    this.gap = CFG.pipeGap;
    this.distance = 0;
    this.flash = 0;
    this.shake = 0;
    this.overTimer = 0;
    this.readyTime = 0;

    this.bird = {
      x: CFG.birdX,
      y: H * 0.44,
      vy: 0,
      angle: 0,
      frame: 0,
      frameTime: 0,
    };

    if (hard) {
      this.groundOffset = 0;
      this.skyOffset = 0;
      this.cloudItems = this.clouds.map((sprite, i) => ({
        sprite,
        x: (i * W) / this.clouds.length + Math.random() * 60,
        y: 60 + Math.random() * 130,
        speed: 10 + i * 6,
      }));
    }
  }

  start() {
    this.lastTime = performance.now();
    const loop = (now) => {
      this.frameId = requestAnimationFrame(loop);
      let dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      dt = Math.min(dt, 0.1); // hindari lompatan besar saat tab kembali aktif

      if (!this.paused) {
        this.accumulator += dt;
        let guard = 0;
        while (this.accumulator >= this.step && guard++ < 20) {
          this.update(this.step);
          this.accumulator -= this.step;
        }
      }
      this.render();
    };
    this.frameId = requestAnimationFrame(loop);
  }

  togglePause() {
    if (this.state !== STATE.PLAY) return this.paused;
    this.paused = !this.paused;
    if (!this.paused) this.lastTime = performance.now();
    return this.paused;
  }

  /* ----------------------------------------------------------------- input */

  flap() {
    this.sound.unlock();

    if (this.paused) {
      this.togglePause();
      return;
    }

    switch (this.state) {
      case STATE.READY:
        this.state = STATE.PLAY;
        this.spawnInitialPipes();
        this.applyFlap();
        break;
      case STATE.PLAY:
        this.applyFlap();
        break;
      case STATE.OVER:
        if (this.overTimer > 0.6) {
          this.sound.swoosh();
          this.reset();
        }
        break;
      default:
        break;
    }
  }

  applyFlap() {
    // Hanya burung yang masih hidup yang bisa mengepak.
    if (this.state !== STATE.PLAY) return;
    this.bird.vy = CFG.flapVelocity;
    this.bird.frameTime = 0;
    this.sound.flap();
    this.emitParticles(this.bird.x - 12, this.bird.y + 8, 4, '#ffffff', 40);
  }

  /* ---------------------------------------------------------------- update */

  update(dt) {
    this.flash = Math.max(0, this.flash - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 22);
    this.updateParticles(dt);

    if (this.state === STATE.READY) {
      this.readyTime += dt;
      this.bird.y = H * 0.44 + Math.sin(this.readyTime * 4.2) * 7;
      this.bird.angle = Math.sin(this.readyTime * 4.2) * 0.08;
      this.animateBird(dt, 14);
      this.scrollBackground(dt, CFG.speed);
      return;
    }

    if (this.state === STATE.OVER) {
      this.overTimer += dt;
      return;
    }

    // ----- fisika burung
    this.bird.vy = Math.min(this.bird.vy + CFG.gravity * dt, CFG.maxFallSpeed);
    this.bird.y += this.bird.vy * dt;

    // rotasi mengikuti kecepatan vertikal
    const target = this.bird.vy < 0 ? -0.48 : clamp(this.bird.vy / CFG.maxFallSpeed, 0, 1) * 1.5;
    this.bird.angle += (target - this.bird.angle) * Math.min(1, dt * 9);

    // Langit-langit berlaku di semua status bergerak (termasuk DYING),
    // supaya burung tidak pernah keluar dari layar bagian atas.
    if (this.bird.y - CFG.birdH / 2 <= 0) {
      this.bird.y = CFG.birdH / 2;
      if (this.bird.vy < 0) this.bird.vy = 0;
    }

    if (this.state === STATE.DYING) {
      this.bird.angle = Math.min(this.bird.angle + dt * 6, Math.PI / 2);
      if (this.bird.y + CFG.birdH / 2 >= this.groundY) {
        this.bird.y = this.groundY - CFG.birdH / 2;
        this.finishGameOver();
      }
      return;
    }

    this.animateBird(dt, this.bird.vy < 0 ? 20 : 9);

    // ----- kesulitan bertambah perlahan
    this.distance += this.speed * dt;
    const ramp = clamp(this.score / 30, 0, 1);
    this.speed = CFG.speed + (CFG.speedMax - CFG.speed) * ramp;
    this.gap = CFG.pipeGap - (CFG.pipeGap - CFG.pipeGapMin) * ramp;

    this.scrollBackground(dt, this.speed);
    this.updatePipes(dt);

    // ----- tabrakan
    if (this.bird.y + CFG.birdH / 2 >= this.groundY) {
      this.bird.y = this.groundY - CFG.birdH / 2;
      this.die(true);
      return;
    }
    if (this.hitsPipe()) this.die(false);
  }

  animateBird(dt, fps) {
    this.bird.frameTime += dt;
    const spf = 1 / fps;
    while (this.bird.frameTime >= spf) {
      this.bird.frameTime -= spf;
      this.bird.frame = (this.bird.frame + 1) % this.birdFrames.length;
    }
  }

  scrollBackground(dt, speed) {
    this.groundOffset = (this.groundOffset + speed * dt) % W;
    this.skyOffset = (this.skyOffset + speed * 0.32 * dt) % W;
    for (const c of this.cloudItems) {
      c.x -= (c.speed + speed * 0.08) * dt;
      if (c.x < -c.sprite.width) {
        c.x = W + Math.random() * 80;
        c.y = 50 + Math.random() * 150;
      }
    }
  }

  spawnInitialPipes() {
    this.pipes = [];
    for (let i = 0; i < 3; i++) {
      this.addPipe(W + 40 + i * CFG.pipeSpacing);
    }
  }

  addPipe(x) {
    const minTop = CFG.marginTop;
    const maxTop = this.groundY - CFG.marginBottom - this.gap;
    const topHeight = minTop + Math.random() * Math.max(20, maxTop - minTop);
    this.pipes.push({ x, top: topHeight, gap: this.gap, scored: false });
  }

  updatePipes(dt) {
    for (const p of this.pipes) p.x -= this.speed * dt;

    // hapus yang sudah lewat & tambah yang baru
    while (this.pipes.length && this.pipes[0].x + CFG.pipeWidth < -20) this.pipes.shift();

    const last = this.pipes[this.pipes.length - 1];
    if (!last || last.x <= W - CFG.pipeSpacing) {
      this.addPipe((last ? last.x : W) + CFG.pipeSpacing);
    }

    // skor
    for (const p of this.pipes) {
      if (!p.scored && p.x + CFG.pipeWidth < this.bird.x - CFG.birdW * 0.2) {
        p.scored = true;
        this.score++;
        this.sound.score();
        this.emitParticles(this.bird.x + 10, this.bird.y, 6, '#fff3a0', 70);
      }
    }
  }

  birdHitbox() {
    const w = CFG.birdW * CFG.hitboxScale;
    const h = CFG.birdH * CFG.hitboxScale;
    return { x: this.bird.x - w / 2, y: this.bird.y - h / 2, w, h };
  }

  hitsPipe() {
    const b = this.birdHitbox();
    for (const p of this.pipes) {
      if (p.x > b.x + b.w || p.x + CFG.pipeWidth < b.x) continue;
      const gapTop = p.top;
      const gapBottom = p.top + p.gap;
      if (b.y < gapTop || b.y + b.h > gapBottom) return true;
    }
    return false;
  }

  die(instantGround) {
    if (this.state !== STATE.PLAY) return;
    this.sound.hit();
    this.flash = 1;
    this.shake = 10;
    this.emitParticles(this.bird.x, this.bird.y, 14, '#ffd166', 150);

    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      localStorage.setItem(BEST_KEY, String(this.best));
    }

    if (instantGround) {
      this.finishGameOver();
    } else {
      this.state = STATE.DYING;
      this.bird.vy = -180;
      this.sound.die();
    }
  }

  finishGameOver() {
    this.state = STATE.OVER;
    this.overTimer = 0;
    if (this.newBest) this.sound.best();
  }

  /* -------------------------------------------------------------- partikel */

  emitParticles(x, y, count, color, spread) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: -40 - Math.random() * spread,
        vy: (Math.random() - 0.5) * spread,
        life: 0.4 + Math.random() * 0.4,
        age: 0,
        size: 1.5 + Math.random() * 2.5,
        color,
      });
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  /* ---------------------------------------------------------------- render */

  render() {
    const ctx = this.ctx;
    ctx.save();

    if (this.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    this.drawSky(ctx);
    this.drawPipes(ctx);
    this.drawGround(ctx);
    this.drawParticles(ctx);
    this.drawBird(ctx);

    ctx.restore();

    this.drawHud(ctx);

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.65})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawSky(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    grad.addColorStop(0, '#4ec0ca');
    grad.addColorStop(0.7, '#7fd8dd');
    grad.addColorStop(1, '#cdeff0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (const c of this.cloudItems) {
      ctx.drawImage(c.sprite, Math.round(c.x), Math.round(c.y));
    }

    const y = this.groundY - this.skyline.height + 10;
    const off = Math.round(this.skyOffset);
    ctx.drawImage(this.skyline, -off, y);
    ctx.drawImage(this.skyline, W - off, y);
  }

  drawPipes(ctx) {
    const { body, cap, capWidth, capHeight } = this.pipe;
    for (const p of this.pipes) {
      const x = Math.round(p.x);
      const gapTop = Math.round(p.top);
      const gapBottom = Math.round(p.top + p.gap);

      // pipa atas
      this.tilePipe(ctx, body, x, 0, gapTop - capHeight);
      ctx.drawImage(cap, x - (capWidth - CFG.pipeWidth) / 2, gapTop - capHeight);

      // pipa bawah
      ctx.drawImage(cap, x - (capWidth - CFG.pipeWidth) / 2, gapBottom);
      this.tilePipe(ctx, body, x, gapBottom + capHeight, this.groundY - gapBottom - capHeight);
    }
  }

  tilePipe(ctx, body, x, y, height) {
    if (height <= 0) return;
    let drawn = 0;
    while (drawn < height) {
      const h = Math.min(body.height, height - drawn);
      ctx.drawImage(body, 0, 0, body.width, h, x, y + drawn, CFG.pipeWidth, h);
      drawn += h;
    }
  }

  drawGround(ctx) {
    const off = Math.round(this.groundOffset);
    ctx.drawImage(this.ground, -off, this.groundY);
    ctx.drawImage(this.ground, W - off, this.groundY);
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawBird(ctx) {
    const sprite = this.birdFrames[this.bird.frame];
    ctx.save();
    ctx.translate(this.bird.x, this.bird.y);
    ctx.rotate(this.bird.angle);
    ctx.drawImage(sprite, -CFG.birdW / 2, -CFG.birdH / 2);
    ctx.restore();
  }

  /* ------------------------------------------------------------------- HUD */

  drawHud(ctx) {
    if (this.state === STATE.PLAY || this.state === STATE.DYING) {
      this.drawBigScore(ctx, this.score, W / 2, 92);
    }

    if (this.state === STATE.READY) this.drawReady(ctx);
    if (this.state === STATE.OVER) this.drawGameOver(ctx);
    if (this.paused) this.drawPaused(ctx);
  }

  drawBigScore(ctx, value, cx, cy) {
    ctx.save();
    ctx.font = 'bold 52px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineJoin = 'round';
    ctx.strokeText(String(value), cx, cy);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(value), cx, cy);
    ctx.restore();
  }

  panel(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 34, 44, 0.86)';
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    const r = 16;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawReady(ctx) {
    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 40px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2b2b2b';
    ctx.strokeText('FLAPPY BIRD', W / 2, 150);
    ctx.fillStyle = '#ffde59';
    ctx.fillText('FLAPPY BIRD', W / 2, 150);

    const pulse = 0.72 + Math.sin(this.readyTime * 5) * 0.28;
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#2b2b2b';
    ctx.strokeText('KETUK ATAU TEKAN SPASI', W / 2, 300);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('KETUK ATAU TEKAN SPASI', W / 2, 300);
    ctx.globalAlpha = 1;

    // panah petunjuk
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const ay = 340 + Math.sin(this.readyTime * 5) * 6;
    ctx.beginPath();
    ctx.moveTo(W / 2, ay + 26);
    ctx.lineTo(W / 2, ay);
    ctx.moveTo(W / 2 - 10, ay + 10);
    ctx.lineTo(W / 2, ay);
    ctx.lineTo(W / 2 + 10, ay + 10);
    ctx.stroke();

    if (this.best > 0) {
      ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#2b2b2b';
      ctx.strokeText(`SKOR TERBAIK: ${this.best}`, W / 2, 196);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`SKOR TERBAIK: ${this.best}`, W / 2, 196);
    }

    ctx.restore();
  }

  drawGameOver(ctx) {
    const t = clamp(this.overTimer / 0.35, 0, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const panelW = 260;
    const panelH = 214;
    const px = (W - panelW) / 2;
    const py = 150 + (1 - ease) * 40;

    ctx.save();
    ctx.globalAlpha = ease;

    ctx.textAlign = 'center';
    ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2b2b2b';
    ctx.strokeText('GAME OVER', W / 2, py - 26);
    ctx.fillStyle = '#ff6b5e';
    ctx.fillText('GAME OVER', W / 2, py - 26);

    this.panel(ctx, px, py, panelW, panelH);

    const medal = MEDALS.find((m) => this.score >= m.min);
    if (medal) {
      const img = this.medals[medal.kind];
      ctx.drawImage(img, px + 26, py + 42);
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(medal.label.toUpperCase(), px + 26 + img.width / 2, py + 104);
    }

    const textX = medal ? px + 168 : W / 2;
    ctx.textAlign = medal ? 'center' : 'center';

    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('SKOR', textX, py + 40);
    ctx.font = 'bold 34px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(this.score), textX, py + 70);

    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('TERBAIK', textX, py + 100);
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.fillStyle = this.newBest ? '#ffde59' : '#ffffff';
    ctx.fillText(String(this.best), textX, py + 126);

    if (this.newBest) {
      ctx.save();
      ctx.translate(px + 196, py + 92);
      ctx.rotate(-0.22);
      ctx.fillStyle = '#ff4d4d';
      ctx.fillRect(-30, -10, 60, 19);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('BARU!', 0, 0);
      ctx.restore();
      ctx.textBaseline = 'alphabetic';
    }

    // tombol main lagi
    const bw = 200;
    const bx = (W - bw) / 2;
    const by = py + 156;
    const hover = this.overTimer > 0.6;
    ctx.fillStyle = hover ? '#f2a33c' : '#b8823a';
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, bw, 40, 10) : ctx.rect(bx, by, bw, 40);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MAIN LAGI', W / 2, by + 26);

    ctx.restore();
  }

  drawPaused(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2b2b2b';
    ctx.strokeText('JEDA', W / 2, H / 2 - 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('JEDA', W / 2, H / 2 - 10);
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeText('Tekan P atau ketuk untuk lanjut', W / 2, H / 2 + 24);
    ctx.fillText('Tekan P atau ketuk untuk lanjut', W / 2, H / 2 + 24);
    ctx.restore();
  }
}

export { STATE, CFG };
