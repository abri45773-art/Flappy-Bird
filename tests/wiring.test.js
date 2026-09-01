/**
 * Menjaga agar index.html dan main.js tetap sinkron.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const main = readFileSync(join(root, 'js/main.js'), 'utf8');

test('semua getElementById di main.js ada di index.html', () => {
  const ids = [...main.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
  assert.ok(ids.length >= 4, 'ada elemen yang diambil');
  for (const id of ids) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `elemen #${id} hilang di index.html`);
  }
});

test('index.html memuat modul dan stylesheet yang benar', () => {
  assert.match(html, /<script type="module" src="js\/main\.js">/);
  assert.match(html, /href="css\/style\.css"/);
  assert.match(html, /<canvas id="game"/);
});

test('file yang dirujuk memang ada', () => {
  for (const f of ['js/main.js', 'js/game.js', 'js/sprites.js', 'js/audio.js', 'css/style.css']) {
    assert.doesNotThrow(() => readFileSync(join(root, f)), `${f} tidak ditemukan`);
  }
});

test('tidak ada referensi aset gambar/suara eksternal', () => {
  const src = ['js/game.js', 'js/sprites.js', 'js/audio.js', 'index.html']
    .map((f) => readFileSync(join(root, f), 'utf8'))
    .join('\n');
  assert.doesNotMatch(src, /\.(png|jpe?g|gif|mp3|wav|ogg)['")]/i, 'game harus bebas aset biner');
});
