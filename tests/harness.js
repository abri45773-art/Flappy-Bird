/**
 * harness.js — DOM/Canvas tiruan minimal supaya game.js bisa dijalankan
 * di Node tanpa browser. Cukup untuk menguji logika + memastikan kode
 * render tidak melempar error.
 */

const noop = () => {};

function makeGradient() {
  return { addColorStop: noop };
}

function makeContext(canvas) {
  const known = {
    canvas,
    createLinearGradient: makeGradient,
    createRadialGradient: makeGradient,
    createPattern: () => ({}),
    measureText: (t) => ({ width: String(t).length * 6 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    setTransform: noop,
  };
  return new Proxy(known, {
    get(target, prop) {
      if (prop in target) return target[prop];
      // properti state (fillStyle, font, dst.) -> nilai biasa
      if (typeof prop === 'string' && /^[a-z]/.test(prop) && !/^[a-z]+[A-Z]?/.test('')) {
        // fallthrough ke default di bawah
      }
      return noop;
    },
    set() {
      return true;
    },
  });
}

class FakeCanvas {
  constructor(w = 300, h = 150) {
    this.width = w;
    this.height = h;
    this.style = {};
    this._ctx = null;
  }
  getContext() {
    if (!this._ctx) this._ctx = makeContext(this);
    return this._ctx;
  }
  addEventListener() {}
}

export function installDom() {
  const storage = new Map();

  global.document = {
    createElement: (tag) => (tag === 'canvas' ? new FakeCanvas() : { style: {} }),
    getElementById: () => null,
    addEventListener: noop,
  };

  global.window = {
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 900,
    addEventListener: noop,
  };

  global.localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear(),
  };

  global.performance = global.performance || { now: () => Date.now() };
  global.requestAnimationFrame = () => 0;
  global.cancelAnimationFrame = noop;

  return { storage, FakeCanvas };
}

export { FakeCanvas };
