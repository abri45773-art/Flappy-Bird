/**
 * audio.js — efek suara di-sintesis dengan Web Audio API.
 * Tidak ada file .wav/.mp3 yang perlu diunduh.
 */

const STORAGE_KEY = 'flappy.muted';

export class SoundBoard {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = localStorage.getItem(STORAGE_KEY) === '1';
  }

  /** Harus dipanggil dari gesture pengguna pertama (kebijakan autoplay browser). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.28;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(STORAGE_KEY, this.muted ? '1' : '0');
    return this.muted;
  }

  #tone({ type = 'square', from, to, dur = 0.12, gain = 0.5, delay = 0 }) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to && to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);

    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(env).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  #noise({ dur = 0.2, gain = 0.4, delay = 0, freq = 1200 }) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t0);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter).connect(env).connect(this.master);
    src.start(t0);
  }

  flap() {
    this.#tone({ type: 'triangle', from: 620, to: 300, dur: 0.1, gain: 0.35 });
    this.#noise({ dur: 0.06, gain: 0.12, freq: 900 });
  }

  score() {
    this.#tone({ type: 'square', from: 880, to: 880, dur: 0.07, gain: 0.3 });
    this.#tone({ type: 'square', from: 1318, to: 1318, dur: 0.09, gain: 0.28, delay: 0.07 });
  }

  hit() {
    this.#tone({ type: 'sawtooth', from: 320, to: 60, dur: 0.22, gain: 0.45 });
    this.#noise({ dur: 0.22, gain: 0.35, freq: 700 });
  }

  die() {
    this.#tone({ type: 'triangle', from: 400, to: 90, dur: 0.5, gain: 0.3, delay: 0.1 });
  }

  best() {
    [660, 880, 1046, 1318].forEach((f, i) =>
      this.#tone({ type: 'square', from: f, to: f, dur: 0.1, gain: 0.26, delay: i * 0.09 })
    );
  }

  swoosh() {
    this.#noise({ dur: 0.18, gain: 0.18, freq: 1800 });
  }
}
