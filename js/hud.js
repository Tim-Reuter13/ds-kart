import { ITEMS, ROULETTE } from "./items.js";

const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
const FONT = '"Arial Black","Segoe UI",Arial,sans-serif';
const placeCol = (p) => p === 1 ? "#ffd23a" : p === 2 ? "#dfe6ee" : p === 3 ? "#e09a5a" : "#ffffff";

function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function txt(g, s, x, y, size, color = "#fff", align = "left", font = FONT) {
  g.font = `${size}px ${font}`; g.textAlign = align; g.textBaseline = "middle";
  g.lineWidth = Math.max(3, size / 7); g.strokeStyle = "rgba(0,0,0,0.75)"; g.lineJoin = "round";
  g.strokeText(s, x, y); g.fillStyle = color; g.fillText(s, x, y);
}
const fmtTime = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(2).padStart(5, "0")}`; };

// Rauchwolken fuer Vape-Blendung (fest pro Ansicht, damit es nicht flackert)
const blobs = Array.from({ length: 14 }, () => ({ x: Math.random(), y: 0.15 + Math.random() * 0.75, r: 0.12 + Math.random() * 0.18, ph: Math.random() * 6 }));

export class HUD {
  constructor(canvas) { this.c = canvas; this.g = canvas.getContext("2d"); this.msgs = new Map(); }

  message(racer, text, t = 1.6, color = "#fff") { this.msgs.set(racer, { text, t, max: t, color }); }

  draw(race, views, dt) {
    const g = this.g, dpr = devicePixelRatio || 1;
    const W = this.c.width / dpr, H = this.c.height / dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    for (const v of views) this.drawView(race, v, dt);
    // Trennlinien
    g.fillStyle = "#111";
    if (views.length >= 2) g.fillRect(0, H / 2 - 2, W, 4);
    if (views.length >= 3) g.fillRect(W / 2 - 2, 0, 4, H);
    this.minimap(race, views, W, H);
    for (const [r, m] of this.msgs) { m.t -= dt; if (m.t <= 0) this.msgs.delete(r); }
  }

  drawView(race, v, dt) {
    const g = this.g, r = v.racer;
    const { x, y, w, h } = v;
    const u = Math.min(w, h * 1.6) / 900; // Skalierung
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();

    // Vape-Rauch
    if (r.blindT > 0) {
      const a = Math.min(1, r.blindT / 1.2);
      for (const b of blobs) {
        const bx = x + (b.x + Math.sin(race.time * 0.6 + b.ph) * 0.05) * w, by = y + b.y * h;
        const rad = b.r * Math.max(w, h) * (1.1 + 0.1 * Math.sin(race.time + b.ph));
        const gr = g.createRadialGradient(bx, by, rad * 0.1, bx, by, rad);
        gr.addColorStop(0, `rgba(235,240,248,${0.95 * a})`); gr.addColorStop(0.6, `rgba(225,230,240,${0.7 * a})`); gr.addColorStop(1, "rgba(220,225,235,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(bx, by, rad, 0, 7); g.fill();
      }
      txt(g, "💨", x + w * 0.5, y + h * 0.18, 40 * u, "#fff", "center", EMOJI);
    }
    // Blitzer
    if (r.flashT > 3.0) { g.fillStyle = `rgba(255,255,255,${(r.flashT - 3.0) / 0.5})`; g.fillRect(x, y, w, h); }

    // Item-Feld
    const bs = 92 * u, bx = x + 18 * u, by = y + 18 * u;
    rrect(g, bx, by, bs, bs, 16 * u); g.fillStyle = "rgba(20,24,30,0.65)"; g.fill();
    g.lineWidth = 4 * u; g.strokeStyle = "rgba(255,255,255,0.85)"; g.stroke();
    let icon = null;
    if (r.roulette > 0) icon = ITEMS[ROULETTE[Math.floor(race.time * 14) % ROULETTE.length]].icon;
    else if (r.item) icon = ITEMS[r.item].icon;
    if (icon) {
      g.globalAlpha = r.lockItem > 0 ? 0.5 : 1;
      txt(g, icon, bx + bs / 2, by + bs / 2 + 3 * u, 58 * u, "#fff", "center", EMOJI);
      g.globalAlpha = 1;
      if (r.item === "kurze" && r.itemCount > 1 && r.roulette <= 0) txt(g, "×" + r.itemCount, bx + bs - 6 * u, by + bs - 10 * u, 24 * u, "#ffd23a", "right");
      if (r.roulette <= 0 && r.item) txt(g, ITEMS[r.item].name, bx, by + bs + 16 * u, 17 * u, "#fff", "left", "Arial, sans-serif");
    }
    if (r.smokeT > 0) txt(g, "🚬 rauchen…", bx + bs + 10 * u, by + 20 * u, 18 * u, "#ddd", "left", "Arial, sans-serif");

    // Runde + Zeit
    txt(g, `Runde ${Math.min(r.lap, race.laps)}/${race.laps}`, x + w - 18 * u, y + 34 * u, 30 * u, "#fff", "right");
    txt(g, fmtTime(r.finished ? r.finishTime : race.time), x + w - 18 * u, y + 66 * u, 20 * u, "#e8eef4", "right", "Arial, sans-serif");

    // Platz
    const pl = r.place;
    txt(g, String(pl), x + w - 70 * u, y + h - 58 * u, 92 * u, placeCol(pl), "right");
    txt(g, ".", x + w - 50 * u, y + h - 50 * u, 70 * u, placeCol(pl), "left");

    // Pfand
    const euro = (r.pfand * 0.25).toFixed(2).replace(".", ",");
    txt(g, "🍾", x + 22 * u, y + h - 34 * u, 28 * u, "#fff", "left", EMOJI);
    txt(g, `${r.pfand}  ·  ${euro} €`, x + 60 * u, y + h - 34 * u, 22 * u, r.pfand >= 10 ? "#ffd23a" : "#fff", "left", "Arial, sans-serif");

    // Name
    txt(g, r.driver.name, x + 22 * u, y + h - 70 * u, 18 * u, r.driver.hud, "left", "Arial, sans-serif");

    // Drift-Glut
    if (r.drift && r.driftLevel > 0) {
      const c = ["", "#ffe36a", "#ff9a2a", "#ff3a2a"][r.driftLevel];
      txt(g, "🔥".repeat(r.driftLevel), x + w / 2, y + h - 40 * u, 26 * u, c, "center", EMOJI);
    }

    // Mittige Meldungen
    const cx = x + w / 2, cy = y + h * 0.36;
    if (!race.started && race.countdown > 0) {
      const n = Math.ceil(race.countdown);
      if (n <= 3) txt(g, String(n), cx, cy, 130 * u, "#ffd23a", "center");
      else txt(g, race.extra.name, cx, cy, 44 * u, "#fff", "center");
    } else if (race.time < 1 && race.started) {
      txt(g, "LOS!", cx, cy, 120 * u, "#6aff7a", "center");
    }
    const m = this.msgs.get(r);
    if (m) { g.globalAlpha = Math.min(1, m.t * 2); txt(g, m.text, cx, cy + 70 * u, 44 * u, m.color, "center"); g.globalAlpha = 1; }
    if (r.wrongT > 1.2 && !r.finished) txt(g, "Falsche Richtung!", cx, cy + 10 * u, 46 * u, "#ff6a5a", "center");
    if (r.finished) {
      txt(g, `ZIEL!  ${r.place}. Platz`, cx, cy, 64 * u, placeCol(r.place), "center");
    }
    if (r.respawnT > 0) txt(g, "🛟  Rettungsschwimmer kommt…", cx, cy + 60 * u, 30 * u, "#fff", "center", EMOJI);
    g.restore();
  }

  minimap(race, views, W, H) {
    const g = this.g, tr = race.track;
    let size, mx, my;
    if (views.length === 1) { size = Math.min(W, H) * 0.24; mx = 16; my = H - size - 110; }
    else if (views.length === 2) { size = Math.min(W, H) * 0.2; mx = W - size - 16; my = H / 2 - size / 2; }
    else { size = Math.min(W, H) * 0.22; mx = W / 2 - size / 2; my = H / 2 - size / 2; }
    if (!this.mm || this.mm.tr !== tr) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (let i = 0; i < tr.n; i++) { x0 = Math.min(x0, tr.px[i]); x1 = Math.max(x1, tr.px[i]); z0 = Math.min(z0, tr.pz[i]); z1 = Math.max(z1, tr.pz[i]); }
      this.mm = { tr, x0, x1, z0, z1, s: Math.max(x1 - x0, z1 - z0) };
    }
    const M = this.mm;
    const P = (x, z) => [mx + ((x - M.x0) + (M.s - (M.x1 - M.x0)) / 2) / M.s * size, my + ((z - M.z0) + (M.s - (M.z1 - M.z0)) / 2) / M.s * size];
    g.save();
    g.fillStyle = "rgba(10,14,20,0.35)"; rrect(g, mx - 8, my - 8, size + 16, size + 16, 12); g.fill();
    g.lineJoin = "round";
    for (const [lw, col] of [[7, "rgba(0,0,0,0.6)"], [4, "#f2f2f2"]]) {
      g.beginPath();
      for (let i = 0; i <= tr.n; i += 2) { const [a, b] = P(tr.px[i % tr.n], tr.pz[i % tr.n]); if (i) g.lineTo(a, b); else g.moveTo(a, b); }
      g.closePath(); g.lineWidth = lw; g.strokeStyle = col; g.stroke();
    }
    const [sx, sz] = P(tr.px[0], tr.pz[0]); g.fillStyle = "#111"; g.fillRect(sx - 4, sz - 4, 8, 8);
    for (const r of race.racers.slice().sort((a, b) => (a.human ? 1 : 0) - (b.human ? 1 : 0))) {
      const [a, b] = P(r.x, r.z);
      g.beginPath(); g.arc(a, b, r.human ? 7 : 5, 0, 7);
      g.fillStyle = r.driver.hud; g.fill(); g.lineWidth = 2; g.strokeStyle = r.human ? "#fff" : "#000"; g.stroke();
    }
    for (const o of race.items.objs) {
      const [a, b] = P(o.x, o.z);
      if (o.kind === "amt") { g.fillStyle = Math.floor(race.time * 8) % 2 ? "#2060ff" : "#fff"; g.fillRect(a - 4, b - 4, 8, 8); }
    }
    g.restore();
  }
}
