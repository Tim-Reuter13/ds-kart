import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            raise SystemExit("NICHT GEFUNDEN in %s: %s" % (p, a[:90]))
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


edit("kart.js", [
    ('  hit(kind = "spin", t = 1.1) {', '  hit(kind = "spin", t = 1.1, info = {}) {'),
    ('    this.events.push({ t: "hit" });\n    return true;', '    this.events.push({ t: "hit", by: info.by || null, item: info.item || null });\n    if (info.by && info.by !== this) info.by.events.push({ t: "scored", victim: this, item: info.item });\n    return true;'),
])
edit("items.js", [
    ('o.flashT = 3.5; o.hit("spin", 0.7);', 'o.flashT = 3.5; o.hit("spin", 0.7, { by: r, item: "blitzer" });'),
    ('r !== o.owner) { r.hit("stop", 2.2); r.events.push({ t: "kontrolle" }); }', 'r !== o.owner) { r.hit("stop", 2.2, { by: o.owner, item: "amt" }); r.events.push({ t: "kontrolle" }); }'),
    ('if (r.hit("spin", o.kind === "kasten" ? 1.3 : 1.1) || r.invT > 0) {', 'if (r.hit("spin", o.kind === "kasten" ? 1.3 : 1.1, { by: o.owner, item: o.kind }) || r.invT > 0) {'),
])
edit("game.js", [
    ('      if (a.invT > 0 && b.invT <= 0) b.hit("spin", 1.0);\n      else if (b.invT > 0 && a.invT <= 0) a.hit("spin", 1.0);',
     '      if (a.invT > 0 && b.invT <= 0) b.hit("spin", 1.0, { by: a, item: "doener" });\n      else if (b.invT > 0 && a.invT <= 0) a.hit("spin", 1.0, { by: b, item: "doener" });'),
    ('          case "hit": if (hum) { this.sfx("hit"); this.hud.message(r, pick(MSG.hit), 1.4, "#ffb0a0");',
     '          case "hit": if (hum) { this.sfx("hit"); r.hitFlash = 0.7; r.shakeReq = 1.1;\n            const it = e.item && ITEMS[e.item];\n            const txt = e.by && e.by !== r ? `${it ? it.icon + " " : ""}${e.by.driver.name} hat dich erwischt!` : e.by === r ? "Eigentor! 🤦" : pick(MSG.hit);\n            this.hud.message(r, txt, 2.2, "#ff8a7a", it && e.by !== r ? it.name : "");'),
    ('          case "wall": if (hum) this.sfx("wall"); break;',
     '          case "wall": if (hum) this.sfx("wall"); break;\n          case "scored": if (hum) { this.hud.message(r, `🎯 Treffer! ${e.victim.driver.name} erwischt`, 1.6, "#6aff7a"); if (r.dev?.startsWith("ph")) this.net.send(r.dev, { t: "rumble", ms: 60 }); } break;'),
])
edit("hud.js", [
    ('  message(racer, text, t = 1.6, color = "#fff") { this.msgs.set(racer, { text, t, max: t, color }); }',
     '  message(racer, text, t = 1.6, color = "#fff", sub = "") { this.msgs.set(racer, { text, t, max: t, color, sub }); }'),
    ('    if (m) { g.globalAlpha = Math.min(1, m.t * 2); txt(g, m.text, cx, cy + 70 * u, 44 * u, m.color, "center"); g.globalAlpha = 1; }',
     '''    if (m) {
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
        if (d < 38 && d > 2 && (Math.sin(o.h) * dx + Math.cos(o.h) * dz) / d > 0.9) txt(g, "⚠ 🍾 von hinten!", cx, y + 128 * u, 32 * u, "#ffb02a", "center", EMOJI);
      }
    }'''),
    ('    // Blitzer\n', '''    // Getroffen: roter Bildrand
    if (r.hitFlash > 0) {
      r.hitFlash -= dt;
      const a = Math.min(1, r.hitFlash / 0.7);
      const gr = g.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
      gr.addColorStop(0, "rgba(255,0,0,0)"); gr.addColorStop(1, `rgba(255,30,20,${0.65 * a})`);
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    }
    // Blitzer\n'''),
])
print("ok")
