import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))
p = "hud.js"
s = open(p, encoding="utf8").read()
a = s.index("    // Blitzer\n")
b = s.index("    // Mittige Meldungen\n")
new = '''    // Blitzer
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
    if (r.smokeT > 0) txt(g, "🚬 rauchen…", bx + bs + 12 * u, by + 22 * u, 18 * u, "#ddd", "left", "Arial, sans-serif");

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
    txt(g, "🍾", nx + 22 * u, ny + 41 * u, 20 * u, "#fff", "left", EMOJI);
    txt(g, `${r.pfand}  ·  ${euro} €`, nx + 50 * u, ny + 41 * u, 17 * u, r.pfand >= 10 ? "#ffd23a" : "#e8eef4", "left", "Arial, sans-serif");

    // Drift-Glut
    if (r.drift && r.driftLevel > 0) {
      const c = ["", "#ffe36a", "#ff9a2a", "#ff3a2a"][r.driftLevel];
      txt(g, "🔥".repeat(r.driftLevel), x + w / 2, y + h - 40 * u, 26 * u, c, "center", EMOJI);
    }

'''
s = s[:a] + new + s[b:]
# Minimap unten links nicht mit dem Namens-Panel ueberlappen
s = s.replace("if (views.length === 1) { size = Math.min(W, H) * 0.24; mx = 16; my = H - size - 110; }",
              "if (views.length === 1) { size = Math.min(W, H) * 0.24; mx = 18; my = H - size - Math.min(W, H * 1.6) / 900 * 96 - 24; }")
s = s.replace('g.fillStyle = "rgba(10,14,20,0.35)"; rrect(g, mx - 8, my - 8, size + 16, size + 16, 12); g.fill();',
              'rrect(g, mx - 8, my - 8, size + 16, size + 16, 16); g.fillStyle = "rgba(14,22,44,0.5)"; g.fill(); g.lineWidth = 2; g.strokeStyle = "rgba(255,255,255,0.25)"; g.stroke();')
open(p, "w", encoding="utf8").write(s)
print("ok")
