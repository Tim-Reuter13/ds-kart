import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            raise SystemExit("NICHT GEFUNDEN in %s: %s" % (p, a[:90]))
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


edit("sounds.js", [
    ('  ["wall", "Wand / Leitplanke", "Beim Reinfahren in die Begrenzung."],',
     '  ["wall", "Wand streifen", "Leichtes Streifen an der Begrenzung."],\n  ["crash", "Crash", "Harter Aufprall gegen Hecke, Zaun oder Mauer bei hohem Tempo."],\n  ["bump", "Zusammenprall", "Wenn zwei Autos aneinanderstoßen."],\n  ["land", "Aufsetzen", "Wenn das Auto nach einem Sprung auf den Boden knallt."],'),
])
edit("audio.js", [
    ('      case "wall": this.noise(0.15, { f0: 300, f1: 80, vol: 0.4, type: "lowpass" }); break;',
     '''      case "wall": this.noise(0.15, { f0: 300, f1: 80, vol: 0.4, type: "lowpass" }); break;
      case "crash": this.noise(0.45, { f0: 1800, f1: 90, vol: 0.7, type: "lowpass" }); this.tone(95, 0.3, { type: "sine", vol: 0.5, slide: 0.5 }); [1400, 1900, 2600].forEach((f, i) => this.tone(f, 0.12, { type: "square", vol: 0.06, at: 0.02 + i * 0.03, slide: 0.7 })); this.noise(0.25, { at: 0.05, f0: 5000, f1: 2500, vol: 0.18, type: "highpass" }); break;
      case "bump": this.tone(140, 0.12, { type: "sine", vol: 0.45, slide: 0.6 }); this.noise(0.1, { f0: 900, f1: 300, vol: 0.3, q: 1.5 }); this.tone(520, 0.05, { type: "triangle", vol: 0.12 }); break;
      case "land": this.tone(75, 0.22, { type: "sine", vol: 0.55, slide: 0.55 }); this.noise(0.2, { f0: 600, f1: 120, vol: 0.35, type: "lowpass" }); this.tone(260, 0.06, { type: "triangle", vol: 0.1, at: 0.03 }); break;'''),
])
edit("kart.js", [
    # Aufprall mit Staerke melden
    ('''        if (Math.abs(rel) > 0.25 && Math.abs(rel) < Math.PI - 0.25) {
          this.speed *= 0.6;''', '''        if (Math.abs(rel) > 0.25 && Math.abs(rel) < Math.PI - 0.25) {
          const impact = Math.abs(this.speed) * Math.abs(Math.sin(rel));
          this.speed *= 0.6;'''),
    ('''          if (this.bump <= 0) { this.events.push({ t: "wall" }); this.bump = 0.4; }''',
     '''          if (this.bump <= 0) { this.events.push({ t: impact > 9 ? "crash" : "wall", impact }); this.bump = 0.4; }'''),
    # Landung melden
    ('''        this.y = g.h; this.air = false; this.squash = 0.25;''',
     '''        this.y = g.h; this.air = false; this.squash = 0.25;
        if (this.airT > 0.32) this.events.push({ t: "land", air: this.airT });'''),
])
edit("game.js", [
    ('''      else { a.speed *= 0.985; b.speed *= 0.985; if (a.human) a.events.push({ t: "bump" }); if (b.human) b.events.push({ t: "bump" }); }''',
     '''      else {
        const rel = Math.abs(a.speed - b.speed) + Math.abs(Math.sin(a.heading - b.heading)) * 10;
        a.speed *= 0.985; b.speed *= 0.985;
        if ((a.bumpSnd || 0) < this.time && (b.bumpSnd || 0) < this.time && rel > 2.5) {
          a.bumpSnd = b.bumpSnd = this.time + 0.6;
          if (a.human) a.events.push({ t: "bump" }); else if (b.human) b.events.push({ t: "bump" });
        }
      }'''),
    ('''          case "wall": if (hum) this.sfx("wall"); break;''',
     '''          case "wall": if (hum) this.sfx("wall"); break;
          case "crash": if (hum) { this.sfx("crash"); r.shakeReq = Math.min(1, e.impact / 18); } else if (this.nearHuman(r, 30)) this.sfx("crash"); break;
          case "bump": this.sfx("bump"); break;
          case "land": if (hum) { this.sfx("land"); r.shakeReq = Math.min(0.9, e.air); } break;'''),
    ('''    const RUMBLE = { hit: 350,''', '''    const RUMBLE = { crash: 220, land: 90, hit: 350,'''),
])
print("ok")
