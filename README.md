# 🐤 Flappy Bird

Game Flappy Bird lengkap dengan HTML5 Canvas + JavaScript murni.
**Tanpa dependensi, tanpa build step, tanpa satu pun file gambar/suara** — semua grafis
digambar secara prosedural dan semua efek suara disintesis dengan Web Audio API.

## Cara menjalankan

Cukup buka `index.html` lewat sebuah web server (modul ES butuh `http://`, bukan `file://`):

```bash
npm start          # -> http://localhost:8080
# atau
python3 -m http.server 8080
```

## Kontrol

| Aksi | Tombol |
| --- | --- |
| Terbang / mulai / main lagi | `Space`, `↑`, `W`, `Enter`, klik, atau ketuk layar |
| Jeda | `P` atau `Esc` |
| Aktif/matikan suara | `M` atau tombol 🔊 |
| Ulang dari awal | `R` |

## Fitur

- **Fisika klasik** — gravitasi, kecepatan jatuh maksimum, dan rotasi burung mengikuti kecepatan.
- **Kesulitan progresif** — celah pipa menyempit (158 → 126 px) dan kecepatan naik (132 → 205 px/s) seiring skor mendekati 30.
- **Skor terbaik tersimpan** di `localStorage`, lengkap dengan penanda "BARU!".
- **Medali** perunggu / perak / emas / platinum pada skor 10 / 20 / 30 / 40.
- **Rasa main yang enak** — animasi kepakan sayap, partikel, layar berkedip dan bergetar saat menabrak, animasi jatuh sebelum layar game over.
- **Latar berlapis** — awan, siluet kota, dan tanah bergulir dengan kecepatan berbeda (parallax).
- **Responsif** — menyesuaikan ukuran layar dan tajam di layar HiDPI; jalan di desktop maupun ponsel.
- **Fixed timestep** (120 Hz) sehingga fisika konsisten di monitor 60 Hz maupun 144 Hz, dan otomatis jeda saat tab disembunyikan.

## Struktur

```
index.html        # markup + kanvas
css/style.css     # tata letak, kanvas responsif
js/main.js        # bootstrap: resize, input, loop
js/game.js        # inti permainan: fisika, pipa, skor, HUD
js/sprites.js     # semua art digambar ke offscreen canvas
js/audio.js       # efek suara Web Audio (tanpa file audio)
tests/            # 30 tes unit yang jalan di Node tanpa browser
```

## Tes

```bash
npm test
```

Menjalankan 30 tes dengan test runner bawaan Node (tanpa dependensi). DOM dan Canvas
dipalsukan di `tests/harness.js`, sehingga logika permainan — tabrakan, penilaian skor,
kurva kesulitan, penyimpanan rekor, dan keamanan kode render — bisa diuji tanpa browser.

## Lisensi

MIT
