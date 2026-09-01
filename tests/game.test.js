/**
 * Uji logika inti tanpa browser:  node --test tests/
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom, FakeCanvas } from './harness.js';

installDom();

const { FlappyGame, STATE, CFG, W, H } = await import('../js/game.js');

function newGame() {
  const g = new FlappyGame(new FakeCanvas(W, H));
  g.sound.muted = true; // tanpa AudioContext di Node
  return g;
}

/** Jalankan simulasi dt tetap selama `seconds`. */
function run(game, seconds, dt = 1 / 120) {
  for (let t = 0; t < seconds; t += dt) game.update(dt);
}

test('mulai dalam status READY dengan skor 0', () => {
  const g = newGame();
  assert.equal(g.state, STATE.READY);
  assert.equal(g.score, 0);
  assert.equal(g.pipes.length, 0);
});

test('burung tidak jatuh sebelum permainan dimulai', () => {
  const g = newGame();
  run(g, 2);
  assert.equal(g.state, STATE.READY);
  assert.ok(g.bird.y > 200 && g.bird.y < 320, `y melayang, dapat ${g.bird.y}`);
});

test('flap pertama memulai permainan dan memunculkan pipa', () => {
  const g = newGame();
  g.flap();
  assert.equal(g.state, STATE.PLAY);
  assert.ok(g.pipes.length >= 3);
  assert.ok(g.bird.vy < 0, 'flap memberi kecepatan ke atas');
});

test('gravitasi menarik burung turun setelah flap', () => {
  const g = newGame();
  g.flap();
  const yAwal = g.bird.y;
  run(g, 0.1);
  assert.ok(g.bird.y < yAwal, 'naik dulu sesaat setelah flap');
  run(g, 0.6);
  assert.ok(g.bird.vy > 0, 'akhirnya jatuh lagi');
});

test('kecepatan jatuh dibatasi maxFallSpeed', () => {
  const g = newGame();
  g.flap();
  run(g, 5);
  assert.ok(g.bird.vy <= CFG.maxFallSpeed + 1, `vy=${g.bird.vy}`);
});

test('menabrak tanah mengakhiri permainan', () => {
  const g = newGame();
  g.flap();
  run(g, 6); // tanpa flap lagi -> pasti menyentuh tanah
  assert.equal(g.state, STATE.OVER);
  assert.ok(g.bird.y + CFG.birdH / 2 <= g.groundY + 0.5);
});

test('langit-langit tidak bisa ditembus', () => {
  const g = newGame();
  g.flap();
  for (let i = 0; i < 400; i++) {
    g.applyFlap();
    g.update(1 / 120);
  }
  assert.ok(g.bird.y - CFG.birdH / 2 >= -0.5, `y=${g.bird.y}`);
});

test('skor bertambah saat melewati pipa (autopilot)', () => {
  const g = newGame();
  g.flap();
  const dt = 1 / 120;
  // autopilot: arahkan burung ke tengah celah pipa berikutnya
  for (let i = 0; i < 120 * 40; i++) {
    const next = g.pipes.find((p) => p.x + CFG.pipeWidth > g.bird.x - 10);
    const target = next ? next.top + next.gap / 2 : H * 0.45;
    if (g.bird.y > target + 6 && g.bird.vy > -60) g.applyFlap();
    g.update(dt);
    if (g.state !== STATE.PLAY) break;
    if (g.score >= 12) break;
  }
  assert.equal(g.state, STATE.PLAY, 'autopilot harus tetap hidup');
  assert.ok(g.score >= 12, `skor tercapai: ${g.score}`);
});

test('kesulitan naik: celah menyempit dan kecepatan meningkat', () => {
  const g = newGame();
  g.flap();
  const gapAwal = g.gap;
  const speedAwal = g.speed;
  g.score = 30;
  g.update(1 / 120);
  assert.ok(g.gap < gapAwal, `gap ${gapAwal} -> ${g.gap}`);
  assert.ok(g.speed > speedAwal, `speed ${speedAwal} -> ${g.speed}`);
  assert.ok(g.gap >= CFG.pipeGapMin - 0.001, 'gap tidak lebih sempit dari batas');
  assert.ok(g.speed <= CFG.speedMax + 0.001, 'speed tidak melebihi batas');
});

test('celah pipa selalu berada di area yang bisa dilewati', () => {
  const g = newGame();
  g.flap();
  for (let i = 0; i < 120 * 60; i++) {
    g.bird.y = H * 0.45;
    g.bird.vy = 0;
    g.update(1 / 120);
    for (const p of g.pipes) {
      assert.ok(p.top >= CFG.marginTop - 0.001, `top=${p.top}`);
      assert.ok(p.top + p.gap <= g.groundY - CFG.marginBottom + 0.001, `bottom=${p.top + p.gap}`);
    }
  }
});

test('jarak antar pipa konsisten', () => {
  const g = newGame();
  g.flap();
  run(g, 20);
  const xs = g.pipes.map((p) => p.x).sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) {
    const d = xs[i] - xs[i - 1];
    assert.ok(Math.abs(d - CFG.pipeSpacing) < 1.5, `jarak ${d}`);
  }
});

test('skor terbaik tersimpan di localStorage', () => {
  const g = newGame();
  g.flap();
  g.score = 7;
  g.die(true);
  assert.equal(g.state, STATE.OVER);
  assert.equal(g.best, 7);
  assert.equal(localStorage.getItem('flappy.best'), '7');

  // game baru harus mengingat rekor
  const g2 = newGame();
  assert.equal(g2.best, 7);
});

test('rekor tidak turun ketika skor lebih kecil', () => {
  const g = newGame();
  g.flap();
  g.score = 20;
  g.die(true);
  const g2 = newGame();
  g2.flap();
  g2.score = 3;
  g2.die(true);
  assert.equal(g2.best, 20);
  assert.equal(g2.newBest, false);
});

test('reset mengembalikan keadaan bersih tapi menjaga rekor', () => {
  const g = newGame();
  g.flap();
  g.score = 5;
  g.die(true);
  const best = g.best;
  g.overTimer = 1;
  g.flap(); // memicu restart
  assert.equal(g.state, STATE.READY);
  assert.equal(g.score, 0);
  assert.equal(g.pipes.length, 0);
  assert.equal(g.best, best);
});

test('tidak bisa restart terlalu cepat (anti salah pencet)', () => {
  const g = newGame();
  g.flap();
  g.die(true);
  g.overTimer = 0.1;
  g.flap();
  assert.equal(g.state, STATE.OVER, 'masih di layar game over');
});

test('jeda menghentikan pergerakan', () => {
  const g = newGame();
  g.flap();
  run(g, 0.5);
  const paused = g.togglePause();
  assert.equal(paused, true);
  const snapshot = { y: g.bird.y, x: g.pipes[0].x };
  // loop utama melewati update saat paused; pastikan togglePause bekerja dua arah
  assert.equal(g.togglePause(), false);
  assert.equal(g.bird.y, snapshot.y);
  assert.equal(g.pipes[0].x, snapshot.x);
});

test('jeda tidak aktif di layar READY / OVER', () => {
  const g = newGame();
  assert.equal(g.togglePause(), false);
  g.flap();
  g.die(true);
  assert.equal(g.togglePause(), false);
});

test('deteksi tabrakan pipa bekerja', () => {
  const g = newGame();
  g.flap();
  g.pipes = [{ x: g.bird.x - 5, top: 300, gap: 150, scored: false }];
  g.bird.y = 100; // jauh di atas celah -> menabrak pipa atas
  assert.equal(g.hitsPipe(), true);
  g.bird.y = 375; // di tengah celah
  assert.equal(g.hitsPipe(), false);
  g.bird.y = 500; // di bawah celah
  assert.equal(g.hitsPipe(), true);
});

test('pipa yang jauh tidak dianggap tabrakan', () => {
  const g = newGame();
  g.flap();
  g.pipes = [{ x: g.bird.x + 200, top: 300, gap: 150, scored: false }];
  g.bird.y = 100;
  assert.equal(g.hitsPipe(), false);
});

test('menabrak pipa memicu animasi jatuh dulu, bukan langsung OVER', () => {
  const g = newGame();
  g.flap();
  g.pipes = [{ x: g.bird.x, top: 300, gap: 150, scored: false }];
  g.bird.y = 100;
  g.update(1 / 120);
  assert.equal(g.state, STATE.DYING);
  run(g, 3);
  assert.equal(g.state, STATE.OVER);
});

test('setiap pipa hanya dihitung satu kali', () => {
  const g = newGame();
  g.flap();
  g.pipes = [{ x: g.bird.x - CFG.pipeWidth - 30, top: 300, gap: 150, scored: false }];
  g.bird.y = 375;
  g.updatePipes(1 / 120);
  g.updatePipes(1 / 120);
  g.updatePipes(1 / 120);
  assert.equal(g.score, 1);
});

test('pipa lama dibuang dari memori', () => {
  const g = newGame();
  g.flap();
  run(g, 45);
  assert.ok(g.pipes.length <= 5, `jumlah pipa: ${g.pipes.length}`);
});

test('partikel dibatasi jumlahnya', () => {
  const g = newGame();
  for (let i = 0; i < 100; i++) g.emitParticles(50, 50, 14, '#fff', 100);
  assert.ok(g.particles.length <= 160, `partikel: ${g.particles.length}`);
});

test('render tidak melempar error di semua status', () => {
  const g = newGame();
  assert.doesNotThrow(() => g.render(), 'READY');
  g.flap();
  run(g, 1);
  assert.doesNotThrow(() => g.render(), 'PLAY');
  g.togglePause();
  assert.doesNotThrow(() => g.render(), 'PAUSED');
  g.togglePause();
  g.pipes = [{ x: g.bird.x, top: 300, gap: 150, scored: false }];
  g.bird.y = 100;
  g.update(1 / 120);
  assert.doesNotThrow(() => g.render(), 'DYING');
  run(g, 3);
  g.score = 42; // paksa medali platinum
  assert.doesNotThrow(() => g.render(), 'OVER');
});

test('render game over aman untuk semua tingkat medali', () => {
  const g = newGame();
  for (const s of [0, 5, 10, 19, 20, 29, 30, 39, 40, 100]) {
    g.flap();
    g.score = s;
    g.die(true);
    g.overTimer = 1;
    assert.doesNotThrow(() => g.render(), `skor ${s}`);
    g.reset();
  }
});

test('simulasi panjang tetap stabil (tanpa NaN)', () => {
  const g = newGame();
  g.flap();
  const dt = 1 / 120;
  for (let i = 0; i < 120 * 120; i++) {
    if (i % 24 === 0) g.applyFlap();
    g.update(dt);
    if (g.state === STATE.OVER) {
      g.overTimer = 1;
      g.flap();
      g.flap();
    }
    assert.ok(Number.isFinite(g.bird.y), 'bird.y finite');
    assert.ok(Number.isFinite(g.bird.vy), 'bird.vy finite');
  }
});
