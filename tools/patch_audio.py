import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))
p = "audio.js"
s = open(p, encoding="utf8").read()


def rep(a, b):
    global s
    if a not in s:
        raise SystemExit("NICHT GEFUNDEN: " + a[:80])
    s = s.replace(a, b)


rep("""// Alles synthetisch per WebAudio - keine Audiodateien
export class Audio {
  constructor() {
    this.ctx = null;
    this.engines = new Map();""", """// Standard-Sounds synthetisch per WebAudio; eigene Aufnahmen (Audio-Profil) ersetzen sie
const VOICE_PITCH = { tim: 128, sonja: 235, jannik: 118, franzi: 225, toni: 98, rudi: 108, kevin: 150, paula: 210 };
const VOWEL = { a: [800, 1250], e: [480, 1900], i: [300, 2300], o: [500, 880], u: [340, 780], ue: [300, 1600] };
const LINES = {
  start: [["o", 0.13, 1.0, 1.1], ["e", 0.2, 1.2, 1.3]],
  hit: [["a", 0.1, 1.35, 1.2], ["u", 0.17, 1.15, 0.8]],
  overtake: [["ue", 0.11, 1.0, 1.05], ["u", 0.22, 1.2, 1.45]],
  item: [["i", 0.1, 1.0, 1.05], ["a", 0.18, 1.2, 1.1]],
  win: [["a", 0.18, 1.0, 1.2], ["a", 0.18, 1.25, 1.4], ["e", 0.3, 1.5, 1.6]],
  lose: [["o", 0.55, 1.1, 0.72]],
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.buf = new Map();     // eigene Aufnahmen: id -> AudioBuffer
    this.engines = new Map();""")

rep("""  sfx(name) {
    if (!this.ensure()) return;
    switch (name) {""", """  // ---------- eigene Aufnahmen
  async decode(blob) {
    this.ensure();
    const ab = await blob.arrayBuffer();
    const b = await this.ctx.decodeAudioData(ab.slice(0));
    return this.trim(b);
  }
  // Stille am Anfang/Ende abschneiden
  trim(b) {
    const ch = b.getChannelData(0), n = ch.length;
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(ch[i]));
    const th = Math.max(0.015, peak * 0.06);
    let a = 0, e = n - 1;
    while (a < n && Math.abs(ch[a]) < th) a++;
    while (e > a && Math.abs(ch[e]) < th) e--;
    const pad = Math.floor(b.sampleRate * 0.03);
    a = Math.max(0, a - pad); e = Math.min(n - 1, e + pad * 3);
    if (e - a < b.sampleRate * 0.05) return b;
    const out = this.ctx.createBuffer(b.numberOfChannels, e - a, b.sampleRate);
    for (let c = 0; c < b.numberOfChannels; c++) out.copyToChannel(b.getChannelData(c).subarray(a, e), c);
    // weich ein-/ausblenden
    const fade = Math.min(400, (e - a) >> 3);
    for (let c = 0; c < out.numberOfChannels; c++) { const d = out.getChannelData(c); for (let i = 0; i < fade; i++) { d[i] *= i / fade; d[d.length - 1 - i] *= i / fade; } }
    return out;
  }
  async loadProfile(clips) {
    const next = new Map();
    for (const [id, c] of clips) { try { next.set(id, await this.decode(c.blob)); } catch (e) { console.warn("Aufnahme kaputt", id, e); } }
    this.buf = next;
  }
  async setClip(id, blob) {
    if (!blob) { this.buf.delete(id); return; }
    this.buf.set(id, await this.decode(blob));
  }
  playBuf(b, { bus, rate = 1, gain = 1, loop = false } = {}) {
    if (!this.ensure()) return null;
    const s = this.ctx.createBufferSource(); s.buffer = b; s.loop = loop; s.playbackRate.value = rate;
    const g = this.ctx.createGain(); g.gain.value = gain;
    s.connect(g); g.connect(bus || this.sfxBus); s.start();
    return { src: s, gain: g, stop: () => { try { s.stop(); } catch (e) {} g.disconnect(); } };
  }

  // ---------- Fahrerstimmen
  voice(driver, line) {
    if (!this.ensure()) return;
    const now = this.t();
    if (this.voiceBusy && this.voiceBusy[driver] > now) return;
    (this.voiceBusy ||= {})[driver] = now + 0.6;
    const b = this.buf.get(`voice.${driver}.${line}`);
    if (b) { this.playBuf(b, { gain: 1.4 }); return; }
    this.synthVoice(driver, line);
  }
  synthVoice(driver, line) {
    const f = VOICE_PITCH[driver] || 150;
    let at = 0;
    for (const [v, dur, p0, p1] of LINES[line] || LINES.item) {
      const o = this.ctx.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(f * p0, this.t() + at); o.frequency.linearRampToValueAtTime(f * p1, this.t() + at + dur);
      const vib = this.ctx.createOscillator(), vg = this.ctx.createGain(); vib.frequency.value = 6; vg.gain.value = f * 0.02; vib.connect(vg); vg.connect(o.frequency);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, this.t() + at); g.gain.exponentialRampToValueAtTime(0.5, this.t() + at + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, this.t() + at + dur);
      for (const ff of VOWEL[v]) { const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = ff; bp.Q.value = 6; o.connect(bp); bp.connect(g); }
      g.connect(this.sfxBus);
      o.start(this.t() + at); o.stop(this.t() + at + dur + 0.05); vib.start(this.t() + at); vib.stop(this.t() + at + dur + 0.05);
      at += dur * 0.92;
    }
  }

  // Vorhoeren im Audio-Profil-Menue
  preview(item) {
    if (!this.ensure()) return () => {};
    this.stopPreview();
    const b = this.buf.get(item.id);
    let stop = () => {};
    if (item.cat === "music") {
      if (b) { const h = this.playBuf(b, { bus: this.musicBus, loop: true, gain: 2.5 }); stop = () => h && h.stop(); }
      else { this.music(item.id.slice(6)); stop = () => this.stopMusic(); }
      const t = setTimeout(stop, 12000); const s0 = stop; stop = () => { clearTimeout(t); s0(); };
    } else if (item.line === "engine") {
      // Hochdrehen ueber 2,5 Sekunden
      const id = "__preview";
      let sp = 0; const iv = setInterval(() => { sp = Math.min(30, sp + 1.2); this.engine(id, sp, false, true, item.driver); }, 100);
      const end = () => { clearInterval(iv); this.engine(id, 0, false, false, item.driver); const e = this.engines.get(id); if (e) { e.stop && e.stop(); this.engines.delete(id); } };
      const t = setTimeout(end, 2600); stop = () => { clearTimeout(t); end(); };
    } else if (item.cat === "voice") { this.voiceBusy = {}; this.voice(item.driver, item.line); }
    else this.sfx(item.id.slice(4));
    this.stopPreview = () => { stop(); this.stopPreview = () => {}; };
    return this.stopPreview;
  }
  stopPreview() {}

  sfx(name) {
    if (!this.ensure()) return;
    const rec = this.buf.get("sfx." + name);
    if (rec) { this.playBuf(rec, { gain: 1.3 }); return; }
    switch (name) {""")

rep("""  engine(id, speed, boost, on) {
    if (!this.ctx) return;
    let e = this.engines.get(id);
    if (!e) {""", """  engine(id, speed, boost, on, driver) {
    if (!this.ctx) return;
    const rec = driver && this.buf.get(`voice.${driver}.engine`);
    if (rec) {
      let e = this.engines.get(id);
      if (!e || !e.rec) {
        if (e) { try { e.o.stop(); e.o2.stop(); } catch (x) {} e.g.disconnect(); }
        const h = this.playBuf(rec, { loop: true, gain: 0 });
        e = { rec: true, h, g: h.gain, stop: () => h.stop() };
        this.engines.set(id, e);
      }
      const sp = Math.abs(speed);
      e.h.src.playbackRate.setTargetAtTime(0.6 + sp / 28 + (boost ? 0.15 : 0), this.t(), 0.08);
      e.g.gain.setTargetAtTime(on ? 0.55 : 0, this.t(), 0.1);
      return;
    }
    let e = this.engines.get(id);
    if (e && e.rec) { e.stop(); this.engines.delete(id); e = null; }
    if (!e) {""")

rep("""  stopEngines() {
    for (const e of this.engines.values()) { try { e.o.stop(); e.o2.stop(); } catch (x) {} e.g.disconnect(); }""",
    """  stopEngines() {
    for (const e of this.engines.values()) { if (e.rec) { e.stop(); continue; } try { e.o.stop(); e.o2.stop(); } catch (x) {} e.g.disconnect(); }""")

rep("""  music(song) {
    this.stopMusic();
    if (!this.musicOn || !this.ensure()) return;""", """  music(song) {
    this.stopMusic();
    if (!this.musicOn || !this.ensure()) return;
    const rec = this.buf.get("music." + song);
    if (rec) { this.musicRec = this.playBuf(rec, { bus: this.musicBus, loop: true, gain: 2.5 }); return; }""")

rep("""  stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; }""",
    """  stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; if (this.musicRec) { this.musicRec.stop(); this.musicRec = null; } }""")
open(p, "w", encoding="utf8").write(s)

# Tippfehler im Katalog
q = "sounds.js"
t = open(q, encoding="utf8").read()
t = t.replace("Läuft in Schweife, solange", "Läuft in Schleife, solange").replace(', desc: desc.replace("Schweife", "Schleife"), max: 60', ", desc, max: 60")
open(q, "w", encoding="utf8").write(t)
print("ok")
