import { ITEMS, ROULETTE } from "./items.js";
import { FAMILY } from "./family.js";

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

  message(racer, text, t = 1.6, color = "#fff", sub = "") { this.msgs.set(racer, { text, t, max: t, color, sub }); }

  draw(race, views, dt) {
    const g = this.g, dpr = devicePixelRatio || 1;
    const W = this.c.width / dpr, H = this.c.height / dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    for (const v of views) this.drawView(race, v, dt);
    // Trennlinien
    g.fillStyle = "#111";
    if (views.length >= 2) g.fillRect(0, H / 2 - 2, W, 4);
    if (views.length >= 3) { const cols = race.humans.length <= 4 ? 2 : race.humans.length <= 6 ? 3 : 4; for (let c = 1; c < cols; c++) g.fillRect(W * c / cols - 2, 0, 4, H); }
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
      txt(g, FAMILY ? "🫧" : "💨", x + w * 0.5, y + h * 0.18, 40 * u, "#fff", "center", EMOJI);
    }
    // Getroffen: roter Bildrand
    if (r.hitFlash > 0) {
      r.hitFlash -= dt;
      const a = Math.min(1, r.hitFlash / 0.7);
      const gr = g.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
      gr.addColorStop(0, "rgba(255,0,0,0)"); gr.addColorStop(1, `rgba(255,30,20,${0.65 * a})`);
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    }
    // Blitzer
    if (r.flashT > 3.0) { g.fillStyle = `rgba(255,255,255,${(r.flashT - 3.0) / 0.5})`; g.fillRect(x, y, w, h); }

    // Fahrtwind-Streifen an den Raendern
    const top = race.cls.top, spd = Math.abs(r.speed) / top;
    const wind = Math.max(0, (spd - 0.78) / 0.3) * 0.6 + (r.boostT > 0 ? 0.7 : 0);
    if (wind > 0.02 && race.started) {
      const cx0 = x + w / 2, cy0 = y + h * 0.45, R = Math.hypot(w, h) / 2;
      g.lineCap = "round";
      for (let k = 0; k < 34; k++) {
        const a = Math.random() * Math.PI * 2, r0 = R * (0.62 + Math.random() * 0.25), len = R * (0.08 + Math.random() * 0.16) * (0.6 + wind);
        g.strokeStyle = r.boostT > 0 && k % 3 === 0 ? `rgba(120,220,255,${0.35 * wind})` : `rgba(255,255,255,${0.22 * wind})`;
        g.lineWidth = (1 + Math.random() * 2.5) * u * 1.4;
        g.beginPath(); g.moveTo(cx0 + Math.cos(a) * r0, cy0 + Math.sin(a) * r0); g.lineTo(cx0 + Math.cos(a) * (r0 + len), cy0 + Math.sin(a) * (r0 + len)); g.stroke();
      }
    }

    const glass = (px, py, pw, ph, rad, tint = "rgba(14,22,44,0.58)") => {
      rrect(g, px, py, pw, ph, rad); g.fillStyle = tint; g.fill();
      const gr = g.createLinearGradient(0, py, 0, py + ph); gr.addColorStop(0, "rgba(255,255,255,0.16)"); gr.addColorStop(0.45, "rgba(255,255,255,0.02)"); gr.addColorStop(1, "rgba(0,0,0,0.12)");
      g.fillStyle = gr; g.fill(); g.lineWidth = 2 * u; g.strokeStyle = "rgba(255,255,255,0.28)"; g.stroke();
    };
    const pop = (key, val) => { if (r[key] !== val) { r[key] = val; r[key + "T"] = race.time; } const t = race.time - (r[key + "T"] ?? -9); return t < 0.45 ? 1 + Math.sin(t / 0.45 * Math.PI) * 0.35 : 1; };

    // Item-Feld mit Leuchtring
    const bs = 96 * u, bx = x + 18 * u, by = y + 18 * u;
    const itemKey = r.roulette > 0 ? "roulette" : r.item || "";
    const ps = pop("_hudItem", itemKey);
    g.save(); g.translate(bx + bs / 2, by + bs / 2); g.scale(ps, ps); g.translate(-bx - bs / 2, -by - bs / 2);
    if (r.item || r.roulette > 0) { g.shadowColor = r.roulette > 0 ? "#39d4ff" : "#ffd23a"; g.shadowBlur = 22 * u; }
    glass(bx, by, bs, bs, 22 * u);
    g.shadowBlur = 0;
    rrect(g, bx + 5 * u, by + 5 * u, bs - 10 * u, bs - 10 * u, 18 * u);
    g.lineWidth = 3 * u; g.strokeStyle = r.item ? "rgba(255,210,58,0.9)" : "rgba(255,255,255,0.18)"; g.stroke();
    let icon = null;
    if (r.roulette > 0) icon = ITEMS[ROULETTE[Math.floor(race.time * 14) % ROULETTE.length]].icon;
    else if (r.item) icon = ITEMS[r.item].icon;
    if (icon) {
      g.globalAlpha = r.lockItem > 0 ? 0.5 : 1;
      txt(g, icon, bx + bs / 2, by + bs / 2 + 3 * u, 58 * u, "#fff", "center", EMOJI);
      g.globalAlpha = 1;
      if (r.item === "kurze" && r.itemCount > 1 && r.roulette <= 0) txt(g, "×" + r.itemCount, bx + bs - 8 * u, by + bs - 12 * u, 24 * u, "#ffd23a", "right");
    }
    g.restore();
    if (icon && r.roulette <= 0 && r.item) { const nm = ITEMS[r.item].name; g.font = `700 ${16 * u}px Arial`; const tw = g.measureText(nm).width; glass(bx, by + bs + 8 * u, tw + 20 * u, 26 * u, 10 * u); txt(g, nm, bx + 10 * u, by + bs + 21 * u, 16 * u, "#fff", "left", "Arial, sans-serif"); }
    if (r.smokeT > 0) txt(g, FAMILY ? "🍭 schlecken…" : "🚬 rauchen…", bx + bs + 12 * u, by + 22 * u, 18 * u, "#ddd", "left", "Arial, sans-serif");

    // Runde + Zeit
    const lw = 170 * u, lh = 78 * u, lx = x + w - lw - 18 * u, ly = y + 18 * u;
    glass(lx, ly, lw, lh, 18 * u);
    txt(g, "RUNDE", lx + 16 * u, ly + 22 * u, 14 * u, "#9fd8ff", "left", "Arial, sans-serif");
    const lp = pop("_hudLap", r.lap);
    g.save(); g.translate(lx + lw - 16 * u, ly + 30 * u); g.scale(lp, lp);
    txt(g, `${Math.min(r.lap, race.laps)}/${race.laps}`, 0, 0, 34 * u, "#fff", "right"); g.restore();
    txt(g, fmtTime(r.finished ? r.finishTime : race.time), lx + lw - 16 * u, ly + 60 * u, 19 * u, "#e8eef4", "right", "Consolas, monospace");

    // Platz mit Gold/Silber/Bronze und Animation beim Wechsel
    const pl = r.place;
    const pp = pop("_hudPlace", pl);
    const px0 = x + w - 26 * u, py0 = y + h - 52 * u;
    g.save(); g.translate(px0, py0); g.scale(pp, pp); g.rotate((pp - 1) * -0.3);
    g.font = `${104 * u}px ${FONT}`; g.textAlign = "right"; g.textBaseline = "alphabetic";
    const grad = g.createLinearGradient(0, -90 * u, 0, 0);
    const cols = pl === 1 ? ["#fff7b0", "#ffd23a", "#c88a10"] : pl === 2 ? ["#ffffff", "#d9e2ec", "#8a99aa"] : pl === 3 ? ["#ffd9b0", "#e09a5a", "#9a5a28"] : ["#ffffff", "#eef2f6", "#b8c4d0"];
    grad.addColorStop(0, cols[0]); grad.addColorStop(0.55, cols[1]); grad.addColorStop(1, cols[2]);
    g.lineWidth = 10 * u; g.strokeStyle = "rgba(10,14,28,0.85)"; g.lineJoin = "round";
    g.strokeText(pl + ".", 0, 0); g.fillStyle = grad; g.fillText(pl + ".", 0, 0);
    g.restore();
    txt(g, `von ${race.racers.length}`, px0, py0 + 22 * u, 15 * u, "#d6e2f0", "right", "Arial, sans-serif");

    // Name + Pfand
    const euro = (r.pfand * 0.25).toFixed(2).replace(".", ",");
    const nw = 210 * u, nh = 58 * u, nx = x + 18 * u, ny = y + h - nh - 18 * u;
    glass(nx, ny, nw, nh, 16 * u);
    g.fillStyle = r.driver.hud; rrect(g, nx + 8 * u, ny + 10 * u, 6 * u, nh - 20 * u, 3 * u); g.fill();
    txt(g, r.driver.name, nx + 22 * u, ny + 18 * u, 17 * u, "#fff", "left", "Arial, sans-serif");
    txt(g, FAMILY ? "♻️" : "🍾", nx + 22 * u, ny + 41 * u, 20 * u, "#fff", "left", EMOJI);
    txt(g, `${r.pfand}  ·  ${euro} €`, nx + 50 * u, ny + 41 * u, 17 * u, r.pfand >= 10 ? "#ffd23a" : "#e8eef4", "left", "Arial, sans-serif");

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
    if (m) {
      const age = m.max - m.t, sc = age < 0.25 ? 0.6 + age / 0.25 * 0.5 : age < 0.4 ? 1.1 - (age - 0.25) / 0.15 * 0.1 : 1;
      g.save(); g.globalAlpha = Math.min(1, m.t * 2); g.translate(cx, cy + 70 * u); g.scale(sc, sc);
      g.font = `${44 * u}px ${FONT}`; const tw = g.measureText(m.text).width;
      rrect(g, -tw / 2 - 22 * u, -34 * u, tw + 44 * u, (m.sub ? 96 : 68) * u, 20 * u); g.fillStyle = "rgba(10,14,28,0.55)"; g.fill();
      txt(g, m.text, 0, 0, 44 * u, m.color, "center");
      if (m.sub) txt(g, m.sub, 0, 40 * u, 24 * u, "#ffffff", "center", "Arial, sans-serif");
      g.restore(); g.globalAlpha = 1;
    }
    // Warnungen vor anfliegenden Items
    for (const o of race.items.objs) {
      if (o.kind === "amt" && o.target === r && !r.finished) {
        if (Math.floor(race.time * 6) % 2) txt(g, "🚓 ORDNUNGSAMT KOMMT!", cx, y + 128 * u, 34 * u, "#7fb0ff", "center");
      } else if (o.kind === "jaegi" && o.owner !== r) {
        const dx = r.x - o.x, dz = r.z - o.z, d = Math.hypot(dx, dz);
        if (d < 38 && d > 2 && (Math.sin(o.h) * dx + Math.cos(o.h) * dz) / d > 0.9) txt(g, (FAMILY ? "⚠ 💦 von hinten!" : "⚠ 🍾 von hinten!"), cx, y + 128 * u, 32 * u, "#ffb02a", "center", EMOJI);
      }
    }
    // Falsche Richtung: grosser Pfeil, der zeigt, wohin man drehen muss (bleibt, bis man wieder grob richtig faehrt)
    {
      const tr = race.track, i = r.hint < 0 ? 0 : r.hint;
      let diff = Math.atan2(tr.tx[i], tr.tz[i]) - r.heading;
      while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
      if (r.wrongT > 0.7 && !r.finished && race.started) r._wrong = true;
      if (r._wrong && (Math.abs(diff) < 0.7 || r.finished)) r._wrong = false;
      if (r._wrong) this.wrongArrow(g, cx, y + h * 0.2, u, diff, race.time);
    }
    if (r.offline && !r.finished) txt(g, "📵 Handy getrennt – Autopilot fährt", cx, y + h - 92 * u, 24 * u, "#ffd23a", "center", EMOJI);
    if (r.finished) {
      txt(g, `ZIEL!  ${r.place}. Platz`, cx, cy, 64 * u, placeCol(r.place), "center");
    }
    if (r.respawnT > 0) txt(g, "🛟  Rettungsschwimmer kommt…", cx, cy + 60 * u, 30 * u, "#fff", "center", EMOJI);
    g.restore();
  }

  // diff > 0 = Strecke liegt links (Kamera schaut nach vorne, also Bildschirm-oben = Fahrtrichtung)
  wrongArrow(g, x, y, u, diff, time) {
    const s = 70 * u * (1 + 0.08 * Math.sin(time * 9));
    const blink = Math.floor(time * 4) % 2;
    g.save();
    g.translate(x, y);
    // Dreh-Bogen: startet oben (= aktuelle Fahrtrichtung) und laeuft in der kuerzeren Drehrichtung bis zur Strecke
    const left = diff > 0, R = s * 1.05;
    const a0 = -Math.PI / 2, a1 = -Math.PI / 2 - diff;
    const aEnd = a1 + (left ? 0.18 : -0.18); // Bogen endet unter der Spitze
    g.lineCap = "round";
    if (Math.abs(diff) > 0.35) {
      g.lineWidth = s * 0.34; g.strokeStyle = "rgba(10,14,28,0.8)";
      g.beginPath(); g.arc(0, 0, R, a0, aEnd, left); g.stroke();
      g.lineWidth = s * 0.22; g.strokeStyle = blink ? "#ffd23a" : "#ff6a3a";
      g.beginPath(); g.arc(0, 0, R, a0, aEnd, left); g.stroke();
    }
    // Pfeilspitze am Bogenende, tangential
    const ex = Math.cos(a1) * R, ey = Math.sin(a1) * R, tang = a1 + (left ? -Math.PI / 2 : Math.PI / 2);
    g.translate(ex, ey); g.rotate(tang);
    g.beginPath(); g.moveTo(s * 0.62, 0); g.lineTo(-s * 0.28, -s * 0.5); g.lineTo(-s * 0.28, s * 0.5); g.closePath();
    g.lineWidth = s * 0.12; g.lineJoin = "round"; g.strokeStyle = "rgba(10,14,28,0.85)"; g.stroke();
    g.fillStyle = blink ? "#ffd23a" : "#ff6a3a"; g.fill();
    g.restore();
    txt(g, "Falsche Richtung!", x, y + s * 1.75, 40 * u, "#ff6a5a", "center");
    txt(g, diff > 0 ? "⟲ nach links wenden" : "nach rechts wenden ⟳", x, y + s * 1.75 + 40 * u, 22 * u, "#ffffff", "center", "Arial, sans-serif");
  }

  drawReplay(caption, i, n, prog) {
    const g = this.g, dpr = devicePixelRatio || 1, W = this.c.width / dpr, H = this.c.height / dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const bar = H * 0.1, u = Math.min(W, H * 1.6) / 900;
    g.fillStyle = "#000"; g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar);
    txt(g, "⭐ BEST OF", 24 * u, bar / 2, 30 * u, "#ffd23a", "left");
    txt(g, `${i + 1} / ${n}`, W - 24 * u, bar / 2, 22 * u, "#fff", "right", "Arial, sans-serif");
    const a = Math.min(1, prog * 7, (1 - prog) * 8);
    g.globalAlpha = Math.max(0, a);
    g.font = `${40 * u}px ${FONT}`; const cw = g.measureText(caption).width, fs = 40 * u * Math.min(1, W * 0.92 / Math.max(1, cw));
    txt(g, caption, W / 2, H - bar - 46 * u, fs, "#ffffff", "center");
    g.globalAlpha = 1;
    txt(g, "Überspringen: OK / Leertaste / Klick", W / 2, H - bar / 2, 16 * u, "#9fb3d1", "center", "Arial, sans-serif");
    g.fillStyle = "#ffd23a"; g.fillRect(0, bar - 4, W * ((i + prog) / n), 4);
  }

  minimap(race, views, W, H) {
    const g = this.g, tr = race.track;
    let size, mx, my;
    if (views.length === 1) { size = Math.min(W, H) * 0.24; mx = 18; my = H - size - Math.min(W, H * 1.6) / 900 * 96 - 24; }
    else if (views.length === 2) { size = Math.min(W, H) * 0.2; mx = W - size - 16; my = H / 2 - size / 2; }
    else if (views.length <= 4) { size = Math.min(W, H) * 0.22; mx = W / 2 - size / 2; my = H / 2 - size / 2; }
    else { size = Math.min(W, H) * 0.17; mx = W / 2 - size / 2; my = H / 2 - size / 2; }
    if (!this.mm || this.mm.tr !== tr) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (let i = 0; i < tr.n; i++) { x0 = Math.min(x0, tr.px[i]); x1 = Math.max(x1, tr.px[i]); z0 = Math.min(z0, tr.pz[i]); z1 = Math.max(z1, tr.pz[i]); }
      this.mm = { tr, x0, x1, z0, z1, s: Math.max(x1 - x0, z1 - z0) };
    }
    const M = this.mm;
    const P = (x, z) => [mx + ((x - M.x0) + (M.s - (M.x1 - M.x0)) / 2) / M.s * size, my + ((z - M.z0) + (M.s - (M.z1 - M.z0)) / 2) / M.s * size];
    g.save();
    rrect(g, mx - 8, my - 8, size + 16, size + 16, 16); g.fillStyle = "rgba(14,22,44,0.5)"; g.fill(); g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,0.25)"; g.stroke();
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
