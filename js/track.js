// Strecke: Mittellinie, Abfragen (Fortschritt, seitlicher Abstand), Rampen
export class Track {
  constructor(data, extra) {
    this.data = data;
    this.extra = extra;
    this.W = data.width;
    this.half = data.width / 2;
    this.edge = this.half + 5.5;   // harte Begrenzung
    const P = data.line;
    const n = P.length;
    this.n = n;
    this.px = new Float32Array(n); this.pz = new Float32Array(n);
    this.tx = new Float32Array(n); this.tz = new Float32Array(n);
    this.s = new Float32Array(n + 1);
    for (let i = 0; i < n; i++) { this.px[i] = P[i][0]; this.pz[i] = P[i][1]; }
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const dx = this.px[j] - this.px[i], dz = this.pz[j] - this.pz[i];
      const L = Math.hypot(dx, dz) || 1e-6;
      this.tx[i] = dx / L; this.tz[i] = dz / L;
      this.s[i] = acc; acc += L;
    }
    this.s[n] = acc;
    this.L = acc;
    // Kruemmung pro Punkt (fuer KI)
    this.curv = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(this.tx[i], this.tz[i]);
      const b = Math.atan2(this.tx[(i + 1) % n], this.tz[(i + 1) % n]);
      let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      this.curv[i] = d / Math.max(0.5, this.s[i + 1] - this.s[i]);
    }
    // Wo naehern sich zwei Streckenteile? Dort keine Bande bauen.
    this.openL = new Uint8Array(n); this.openR = new Uint8Array(n);
    this.grid = new Map();
    const C = 30;
    this.cell = C;
    for (let i = 0; i < n; i++) {
      const k = this.key(this.px[i], this.pz[i]);
      if (!this.grid.has(k)) this.grid.set(k, []);
      this.grid.get(k).push(i);
    }
    for (let i = 0; i < n; i++) {
      for (const side of [1, -1]) {
        const nx = -this.tz[i] * side, nz = this.tx[i] * side;
        const wx = this.px[i] + nx * this.edge, wz = this.pz[i] + nz * this.edge;
        const q = this.nearestGlobal(wx, wz, i, 40);
        if (q && q.dist < this.half + 4) (side === 1 ? this.openR : this.openL)[i] = 1;
      }
    }
    // Hoehen entlang der Strecke + Gelaende
    this.h = new Float32Array(n);
    for (let i = 0; i < n; i++) this.h[i] = data.lineH ? data.lineH[i] : 0;
    this.terrain = data.terrain || null;
    this.setRamps(extra.ramps || []);
  }

  // Strassenhoehe bei Laufweg s (ohne Rampen)
  baseAt(s) {
    s = ((s % this.L) + this.L) % this.L;
    let lo = 0, hi = this.n - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.s[m] <= s) lo = m; else hi = m - 1; }
    const j = (lo + 1) % this.n, t = (s - this.s[lo]) / Math.max(1e-6, this.s[lo + 1] - this.s[lo]);
    return this.h[lo] * (1 - t) + this.h[j] * t;
  }
  slopeAt(s) { return (this.baseAt(s + 2) - this.baseAt(s - 2)) / 4; }

  // Gelaendehoehe an beliebiger Stelle
  heightAt(x, z) {
    const T = this.terrain;
    if (!T) return 0;
    let fi = (x - T.x0) / T.step, fj = (z - T.z0) / T.step;
    fi = Math.max(0, Math.min(T.nx - 1.001, fi)); fj = Math.max(0, Math.min(T.nz - 1.001, fj));
    const i = fi | 0, j = fj | 0, a = fi - i, b = fj - j, H = T.h, nx = T.nx;
    return H[j * nx + i] * (1 - a) * (1 - b) + H[j * nx + i + 1] * a * (1 - b) + H[(j + 1) * nx + i] * (1 - a) * b + H[(j + 1) * nx + i + 1] * a * b;
  }

  setRamps(list) {
    this.ramps = list.map(r => ({ s0: r.at * this.L, len: r.len, h: r.h, s1: r.at * this.L + r.len }));
  }

  key(x, z) { return Math.floor(x / this.cell) + "," + Math.floor(z / this.cell); }

  // Naechster Punkt ausserhalb von +-skip um Index i (fuer Ueberlappungen)
  nearestGlobal(x, z, avoid = -1, skip = 0) {
    const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
    let best = null;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const arr = this.grid.get((cx + dx) + "," + (cz + dz));
      if (!arr) continue;
      for (const i of arr) {
        if (avoid >= 0) {
          let di = Math.abs(i - avoid); di = Math.min(di, this.n - di);
          if (di < skip) continue;
        }
        const r = this.project(x, z, i);
        if (!best || r.dist < best.dist) best = r;
        const r2 = this.project(x, z, (i - 1 + this.n) % this.n);
        if (r2.dist < best.dist) best = r2;
      }
    }
    return best;
  }

  project(x, z, i) {
    const dx = x - this.px[i], dz = z - this.pz[i];
    const segL = this.s[i + 1] - this.s[i];
    let t = dx * this.tx[i] + dz * this.tz[i];
    t = Math.max(0, Math.min(segL, t));
    const qx = this.px[i] + this.tx[i] * t, qz = this.pz[i] + this.tz[i] * t;
    const lat = -dx * this.tz[i] + dz * this.tx[i]; // rechts positiv
    return { i, t, s: this.s[i] + t, d: lat, dist: Math.hypot(x - qx, z - qz), lat };
  }

  // Lokale Suche um einen Hinweis-Index
  locate(x, z, hint) {
    if (hint == null || hint < 0) return this.nearestAll(x, z);
    let best = null;
    for (let k = -8; k <= 8; k++) {
      const i = (hint + k + this.n) % this.n;
      const r = this.project(x, z, i);
      if (!best || r.dist < best.dist) best = r;
    }
    if (best.dist > this.edge + 6) return this.nearestAll(x, z);
    return best;
  }

  nearestAll(x, z) {
    let best = null;
    for (let i = 0; i < this.n; i++) {
      const r = this.project(x, z, i);
      if (!best || r.dist < best.dist) best = r;
    }
    return best;
  }

  // Punkt auf der Strecke bei Laufweg s mit seitlichem Versatz off (rechts positiv)
  at(s, off = 0) {
    s = ((s % this.L) + this.L) % this.L;
    let lo = 0, hi = this.n - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.s[m] <= s) lo = m; else hi = m - 1; }
    const i = lo, t = s - this.s[i];
    const x = this.px[i] + this.tx[i] * t, z = this.pz[i] + this.tz[i] * t;
    // rechts = (-tz, tx) gedreht? rechte Normale zur Fahrtrichtung (tx,tz) ist (-tz, tx) fuer x-rechts/z-sued
    const j = (i + 1) % this.n, f = t / Math.max(1e-6, this.s[i + 1] - this.s[i]);
    return { x: x - this.tz[i] * off, z: z + this.tx[i] * off, y: this.h[i] * (1 - f) + this.h[j] * f, i, tx: this.tx[i], tz: this.tz[i], heading: Math.atan2(this.tx[i], this.tz[i]) };
  }

  groundAt(s) {
    const b = this.baseAt(s), sl = this.slopeAt(s);
    for (const r of this.ramps) {
      let ds = s - r.s0; if (ds < -this.L / 2) ds += this.L;
      if (ds >= 0 && ds <= r.len) return { h: b + r.h * ds / r.len, slope: sl + r.h / r.len, base: b, ramp: r };
    }
    return { h: b, slope: sl, base: b, ramp: null };
  }
}
