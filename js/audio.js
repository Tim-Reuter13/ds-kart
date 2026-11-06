// Alles synthetisch per WebAudio - keine Audiodateien
export class Audio {
  constructor() {
    this.ctx = null;
    this.engines = new Map();
    this.musicOn = true;
    this.vol = 0.8;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return true; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.6; this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.22; this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { return false; }
  }
  t() { return this.ctx.currentTime; }

  tone(freq, dur, { type = "square", vol = 0.25, at = 0, slide = 0, bus } = {}) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, this.t() + at);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), this.t() + at + dur);
    g.gain.setValueAtTime(0.0001, this.t() + at);
    g.gain.exponentialRampToValueAtTime(vol, this.t() + at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, this.t() + at + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(this.t() + at); o.stop(this.t() + at + dur + 0.05);
  }
  noise(dur, { vol = 0.3, at = 0, f0 = 800, f1 = 800, q = 1, type = "bandpass" } = {}) {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, this.t() + at); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), this.t() + at + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.t() + at); g.gain.exponentialRampToValueAtTime(0.0001, this.t() + at + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus);
    s.start(this.t() + at); s.stop(this.t() + at + dur + 0.05);
  }

  sfx(name) {
    if (!this.ensure()) return;
    switch (name) {
      case "beep": this.tone(440, 0.25, { vol: 0.3 }); break;
      case "go": this.tone(880, 0.6, { vol: 0.3 }); this.tone(1320, 0.6, { vol: 0.15, type: "triangle" }); break;
      case "box": [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.08, { at: i * 0.05, vol: 0.15 })); break;
      case "got": this.tone(1046, 0.15, { type: "triangle", vol: 0.25 }); this.tone(1568, 0.2, { type: "triangle", vol: 0.2, at: 0.08 }); break;
      case "boost": this.noise(0.6, { f0: 300, f1: 3000, vol: 0.35, q: 2 }); this.tone(200, 0.5, { type: "sawtooth", slide: 3, vol: 0.12 }); break;
      case "spark": this.tone(1800, 0.05, { type: "square", vol: 0.08 }); break;
      case "hit": this.tone(160, 0.35, { type: "sawtooth", slide: 0.3, vol: 0.3 }); this.noise(0.3, { f0: 500, f1: 100, vol: 0.4 }); break;
      case "wall": this.noise(0.15, { f0: 300, f1: 80, vol: 0.4, type: "lowpass" }); break;
      case "throw": this.noise(0.25, { f0: 2000, f1: 600, vol: 0.2, q: 3 }); break;
      case "drop": this.tone(120, 0.15, { type: "triangle", vol: 0.3 }); break;
      case "pfand": this.tone(1568, 0.08, { type: "triangle", vol: 0.2 }); this.tone(2093, 0.15, { type: "triangle", vol: 0.2, at: 0.06 }); break;
      case "camera": case "flash": this.noise(0.05, { f0: 4000, f1: 4000, vol: 0.5, type: "highpass" }); this.noise(0.08, { at: 0.09, f0: 3000, f1: 3000, vol: 0.4, type: "highpass" }); this.tone(2400, 0.4, { at: 0.12, type: "sine", vol: 0.1, slide: 0.7 }); break;
      case "siren": for (let i = 0; i < 4; i++) { this.tone(660, 0.3, { at: i * 0.6, type: "triangle", vol: 0.14 }); this.tone(880, 0.3, { at: i * 0.6 + 0.3, type: "triangle", vol: 0.14 }); } break;
      case "kontrolle": this.noise(0.7, { f0: 900, f1: 60, vol: 0.6, type: "lowpass" }); this.tone(880, 0.25, { type: "triangle", vol: 0.2 }); this.tone(660, 0.25, { at: 0.25, type: "triangle", vol: 0.2 }); break;
      case "vape": this.noise(0.9, { f0: 1200, f1: 400, vol: 0.25, q: 0.7 }); break;
      case "blind": this.noise(0.5, { f0: 900, f1: 300, vol: 0.2 }); break;
      case "lighter": this.noise(0.04, { f0: 5000, f1: 5000, vol: 0.3, type: "highpass" }); this.noise(0.5, { at: 0.05, f0: 600, f1: 400, vol: 0.12 }); break;
      case "doener": [523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.1, { at: i * 0.08, type: "square", vol: 0.12 })); break;
      case "splash": this.noise(0.8, { f0: 1500, f1: 200, vol: 0.5 }); break;
      case "trick": this.tone(600, 0.2, { slide: 2, vol: 0.15 }); break;
      case "finish": [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.18, { at: i * 0.14, vol: 0.2 })); break;
      case "select": this.tone(660, 0.07, { vol: 0.15 }); break;
      case "confirm": this.tone(660, 0.07, { vol: 0.15 }); this.tone(990, 0.1, { at: 0.06, vol: 0.15 }); break;
    }
  }

  engine(id, speed, boost, on) {
    if (!this.ctx) return;
    let e = this.engines.get(id);
    if (!e) {
      const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator();
      const f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      o.type = "sawtooth"; o2.type = "square"; f.type = "lowpass"; f.frequency.value = 600; g.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
      o.start(); o2.start();
      e = { o, o2, f, g };
      this.engines.set(id, e);
    }
    const sp = Math.abs(speed);
    const gear = sp % 9;
    const fr = 45 + sp * 3.2 + gear * 4 + (boost ? 40 : 0);
    e.o.frequency.setTargetAtTime(fr, this.t(), 0.05);
    e.o2.frequency.setTargetAtTime(fr / 2, this.t(), 0.05);
    e.f.frequency.setTargetAtTime(400 + sp * 40, this.t(), 0.05);
    e.g.gain.setTargetAtTime(on ? 0.045 : 0, this.t(), 0.08);
  }
  stopEngines() {
    for (const e of this.engines.values()) { try { e.o.stop(); e.o2.stop(); } catch (x) {} e.g.disconnect(); }
    this.engines.clear();
  }

  // Kleine Chiptune-Schleifen pro Strecke
  music(song) {
    this.stopMusic();
    if (!this.musicOn || !this.ensure()) return;
    const S = SONGS[song] || SONGS.schemmerhofen;
    const spb = 60 / S.bpm / 2; // Achtel
    let step = 0;
    let next = this.t() + 0.1;
    this.musicTimer = setInterval(() => {
      while (next < this.t() + 0.3) {
        const i = step % S.lead.length;
        const n = S.lead[i], b = S.bass[step % S.bass.length];
        if (n) this.tone(midi(n), spb * 0.9, { type: S.leadType || "square", vol: 0.12, at: next - this.t(), bus: this.musicBus });
        if (b) this.tone(midi(b), spb * 0.95, { type: "triangle", vol: 0.22, at: next - this.t(), bus: this.musicBus });
        if (step % 2 === 0) this.drum(next, step % 8 === 4);
        next += spb; step++;
      }
    }, 100);
  }
  drum(at, snare) {
    const t = at - this.t();
    if (snare) this.noiseMusic(0.08, t, 2000, 0.12); else this.tone(70, 0.1, { type: "sine", vol: 0.3, at: t, slide: 0.5, bus: this.musicBus });
  }
  noiseMusic(dur, at, f, vol) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const fl = this.ctx.createBiquadFilter(); fl.type = "highpass"; fl.frequency.value = f;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, this.t() + at); g.gain.exponentialRampToValueAtTime(0.0001, this.t() + at + dur);
    s.connect(fl); fl.connect(g); g.connect(this.musicBus); s.start(this.t() + at); s.stop(this.t() + at + dur);
  }
  stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; }
}

function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

const SONGS = {
  // Dorf-Polka-artig
  schemmerhofen: { bpm: 150, leadType: "square",
    lead: [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 74, 0, 71, 0, 74, 0, 72, 0, 76, 0, 79, 81, 79, 76, 77, 76, 74, 71, 72, 0, 0, 0],
    bass: [48, 55, 48, 55, 50, 55, 43, 55, 48, 55, 48, 55, 43, 50, 48, 0] },
  // Drive-Thru-Funk
  mcd: { bpm: 112, leadType: "sawtooth",
    lead: [69, 0, 72, 69, 0, 74, 0, 72, 0, 69, 0, 67, 69, 0, 0, 0, 76, 0, 74, 72, 0, 74, 0, 72, 69, 0, 67, 0, 69, 0, 0, 0],
    bass: [45, 45, 0, 45, 48, 0, 50, 0, 45, 45, 0, 45, 43, 0, 40, 0] },
  // Sommer am See
  baggersee: { bpm: 128, leadType: "triangle",
    lead: [79, 0, 76, 0, 74, 76, 0, 79, 0, 81, 79, 0, 76, 0, 74, 0, 72, 0, 74, 76, 0, 74, 0, 72, 0, 69, 72, 0, 74, 0, 0, 0],
    bass: [48, 0, 55, 0, 53, 0, 52, 0, 50, 0, 55, 0, 48, 0, 43, 0] },
};
