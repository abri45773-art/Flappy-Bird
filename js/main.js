/**
 * main.js — bootstrap: pasang kanvas responsif, input, dan mulai loop.
 */

import { FlappyGame, W, H } from './game.js';

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const soundBtn = document.getElementById('btn-sound');
const soundGlyph = document.getElementById('sound-glyph');

const game = new FlappyGame(canvas);

/* ------------------------------------------------------- kanvas responsif */

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const padX = 24;
  const padY = window.innerHeight < 720 ? 8 : 56;
  const availW = window.innerWidth - padX;
  const availH = window.innerHeight - padY;
  const scale = Math.max(0.3, Math.min(availW / W, availH / H));

  canvas.style.width = `${Math.round(W * scale)}px`;
  canvas.style.height = `${Math.round(H * scale)}px`;

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

/* ------------------------------------------------------------------ input */

function flap(e) {
  if (e) e.preventDefault();
  game.flap();
}

// Keyboard
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  switch (e.code) {
    case 'Space':
    case 'ArrowUp':
    case 'KeyW':
    case 'Enter':
      flap(e);
      break;
    case 'KeyP':
    case 'Escape':
      e.preventDefault();
      game.togglePause();
      break;
    case 'KeyM':
      e.preventDefault();
      updateSoundUI(game.sound.toggleMute());
      break;
    case 'KeyR':
      e.preventDefault();
      game.reset();
      break;
    default:
      break;
  }
});

// Mouse & sentuh (pointer events menangani keduanya)
stage.addEventListener('pointerdown', (e) => {
  if (e.target === soundBtn || soundBtn.contains(e.target)) return;
  flap(e);
});
window.addEventListener('contextmenu', (e) => {
  if (e.target === canvas) e.preventDefault();
});

// Tombol suara
soundBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  game.sound.unlock();
  updateSoundUI(game.sound.toggleMute());
});

function updateSoundUI(muted) {
  soundGlyph.textContent = muted ? '🔇' : '🔊';
  soundBtn.classList.toggle('muted', muted);
}
updateSoundUI(game.sound.muted);

// Jeda otomatis saat tab disembunyikan
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !game.paused) game.togglePause();
});

game.start();

// Bantu debugging dari konsol
window.flappy = game;
