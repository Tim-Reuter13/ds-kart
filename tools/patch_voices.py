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
    ('export const SFX = [\n', 'export const SFX = [\n  ["letsgo", "Ansage „Let\'s go!“ (Sonja)", "Kommt beim Start jedes Rennens zusammen mit dem Startsignal – Sonja spricht das ein!"],\n'),
    ('  ["engine", "Motor",', '''  ["boost", "Boost-Jubel", "Bei Energy, Kurzen oder Drift-Boost, z. B. „Wuhuu!“", 3],
  ["drift", "Drift-Ruf", "Wenn der Drift voll glüht (rote Flammen), z. B. „Driiift!“", 3],
  ["gotitem", "Item bekommen", "Wenn die Item-Lotterie stoppt, z. B. „Ohh nice!“", 3],
  ["flash", "Geblitzt", "Wenn der Blitzer dich erwischt, z. B. „Neeein, Punkte!“", 3],
  ["splash", "Ins Wasser", "Beim Reinfallen in den Baggersee, z. B. „Kalt!“", 3],
  ["engine", "Motor",'''),
])
edit("audio.js", [
    ('  lose: [["o", 0.55, 1.1, 0.72]],\n};', '''  lose: [["o", 0.55, 1.1, 0.72]],
  boost: [["u", 0.12, 1.0, 1.2], ["u", 0.3, 1.3, 1.7]],
  drift: [["i", 0.45, 1.1, 1.3]],
  gotitem: [["o", 0.16, 1.2, 1.0], ["i", 0.16, 1.15, 1.3]],
  flash: [["e", 0.2, 1.3, 1.25], ["a", 0.35, 1.2, 0.85]],
  splash: [["a", 0.12, 1.4, 1.4], ["a", 0.25, 1.3, 1.0]],
};'''),
    ('    const rec = this.buf.get("sfx." + name);\n    if (rec) { this.playBuf(rec, { gain: 1.3 }); return; }',
     '''    const rec = this.buf.get("sfx." + name);
    if (rec) { this.playBuf(rec, { gain: name === "letsgo" ? 1.8 : 1.3 }); return; }
    if (name === "letsgo") {
      // Platzhalter, bis Sonja es einspricht
      try { const u = new SpeechSynthesisUtterance("Let's go!"); u.lang = "en-US"; u.rate = 1.15; u.pitch = 1.35; u.volume = 1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
      return;
    }'''),
])
edit("game.js", [
    ('        this.started = true; this.time = 0; this.sfx("go");', '        this.started = true; this.time = 0; this.sfx("go"); this.sfx("letsgo");'),
    ('        this.humans.forEach((h, i) => setTimeout(() => this.audio.voice(h.driver.id, "start"), 300 + i * 420));',
     '        this.humans.forEach((h, i) => setTimeout(() => this.audio.voice(h.driver.id, "start"), 1100 + i * 420));'),
    ('          case "boost": if (hum) { this.sfx("boost"); r.shakeReq = 0.6; } break;',
     '          case "boost": if (hum) { this.sfx("boost"); r.shakeReq = 0.6; this.say(r, "boost", 5); } break;'),
    ('          case "spark": if (hum) this.sfx("spark"); break;', '          case "spark": if (hum) { this.sfx("spark"); if (e.lvl >= 3) this.say(r, "drift", 6); } break;'),
    ('          case "got": if (hum) this.sfx("got"); break;', '          case "got": if (hum) { this.sfx("got"); this.say(r, "gotitem", 6); } break;'),
    ('          case "flash": if (hum) this.hud.message(r, pick(MSG.flash), 2, "#ffffff"); break;', '          case "flash": if (hum) { this.hud.message(r, pick(MSG.flash), 2, "#ffffff"); this.say(r, "flash", 2); } break;'),
    ('          case "splash": if (hum) this.sfx("splash"); break;', '          case "splash": if (hum) { this.sfx("splash"); this.say(r, "splash", 2); } break;'),
    ('  nearHuman(r, d) {', '  // Fahrerspruch mit Mindestabstand je Spruch\n  say(r, line, gap) { r.vT ||= {}; if ((r.vT[line] || -99) > this.time) return; r.vT[line] = this.time + gap; this.audio.voice(r.driver.id, line); }\n\n  nearHuman(r, d) {'),
])
print("ok")
