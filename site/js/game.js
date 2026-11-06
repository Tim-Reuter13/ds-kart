import * as THREE from "three";
import { Track } from "./track.js";
import { buildWorld } from "./world.js";
import { makeCar, DRIVERS } from "./cars.js";
import { Racer, CLASSES } from "./kart.js";
import { Items, ITEMS } from "./items.js";
import { FX } from "./fx.js";
import { initAI, driveAI } from "./ai.js";
import { T } from "./tex.js";
import { buildRaceDeco } from "./racedeco.js";
import { SpriteCar } from "./sprites.js";
import { Recorder, Replay } from "./replay.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MSG = {
  hit: ["Autsch!", "Voll reingefahren!", "Kippenschachtel gefressen!", "Läuft bei dir…", "Bruder, nein!"],
  flash: ["📸 Geblitzt!", "📸 Bild kommt per Post!", "📸 Punkte in Flensburg!"],
  blind: ["💨 Vape-Wolke!", "💨 Mango-Ice im Gesicht!", "💨 Sicht weg!"],
  kontrolle: ["🚓 Allgemeine Verkehrskontrolle!", "🚓 Führerschein und Fahrzeugschein, bitte!"],
  doener: ["🥙 Döner-Power!", "🥙 Mit alles und scharf!"],
  pfandFull: ["🍾 2,50 € Pfand – Maximum!"],
};
const pick = (a) => a[(Math.random() * a.length) | 0];

function rampMesh(track, r, dirt) {
  const N = 8, half = track.half;
  const pos = [], idx = [], uv = [];
  for (let k = 0; k <= N; k++) {
    const p = track.at(r.s0 + r.len * k / N);
    const y = p.y + 0.13 + r.h * k / N;
    const rx = -p.tz, rz = p.tx;
    pos.push(p.x - rx * half, y, p.z - rz * half, p.x + rx * half, y, p.z + rz * half);
    uv.push(0, k / N * 3, 4, k / N * 3);
    if (k < N) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  // Abbruchkante
  const e = track.at(r.s1), rx = -e.tz, rz = e.tx, b = pos.length / 3;
  pos.push(e.x - rx * half, e.y + r.h + 0.13, e.z - rz * half, e.x + rx * half, e.y + r.h + 0.13, e.z + rz * half, e.x - rx * half, e.y - 0.5, e.z - rz * half, e.x + rx * half, e.y - 0.5, e.z + rz * half);
  uv.push(0, 0, 4, 0, 0, 1, 4, 1);
  idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const c = document.createElement("canvas"); c.width = 64; c.height = 64; const gg = c.getContext("2d");
  if (dirt) { gg.fillStyle = "#8a6a44"; gg.fillRect(0, 0, 64, 64); gg.fillStyle = "#6e5232"; for (let i = 0; i < 64; i += 16) gg.fillRect(0, i, 64, 3); }
  else { for (let i = 0; i < 4; i++) { gg.fillStyle = i % 2 ? "#111" : "#f2c418"; gg.beginPath(); gg.moveTo(i * 16, 0); gg.lineTo(i * 16 + 16, 0); gg.lineTo(i * 16 + 48, 64); gg.lineTo(i * 16 + 32, 64); gg.fill(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
}

function inPoly(x, z, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi) ins = !ins;
  }
  return ins;
}

export class Race {
  constructor({ sprites = {}, renderer, pipeline, hud, audio, net, inputs, def, data, players, cls = "golf", laps = 3, onEnd }) {
    this.renderer = renderer; this.pipeline = pipeline; this.quality = pipeline ? pipeline.q : { shadowSize: 2048, extras: 1 }; this.hud = hud; this.audio = audio; this.net = net; this.inputs = inputs;
    this.extra = def; this.data = data; this.cls = CLASSES[cls]; this.laps = laps; this.onEnd = onEnd;
    this.scene = new THREE.Scene();
    this.scene.environment = window.__env || null;
    this.scene.environmentIntensity = 0.55;
    this.scene.fog = new THREE.Fog(def.fog || "#a9d0ee", 260, 1400);
    this.scene.add(new THREE.HemisphereLight("#dcecff", "#7a8a5a", 1.15));
    const sun = new THREE.DirectionalLight("#fff1d6", 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(this.quality.shadowSize, this.quality.shadowSize);
    const sc = sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 400;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
    this.scene.add(sun); this.scene.add(sun.target);
    this.sun = sun;
    this.sunDir = new THREE.Vector3(-0.5, 0.75, 0.35).normalize();

    this.track = new Track(data, def);
    if (def.setup) def.setup(this.track, data);
    this.track.setRamps(def.ramps || []);
    this.world = buildWorld(this.scene, this.track, data, def, this.quality);
    for (const r of this.track.ramps) this.scene.add(rampMesh(this.track, r, def.style === "lake"));
    this.fx = new FX(this.scene);

    // Fahrer
    this.racers = [];
    const taken = new Set(players.map(p => p.driver));
    const cpus = DRIVERS.filter(d => !taken.has(d.id));
    const order = [...cpus.map(d => ({ driver: d.id, cpu: true })), ...players];
    const shadowTex = T.shadow();
    order.slice(0, 8).forEach((p, i) => {
      const d = DRIVERS.find(x => x.id === p.driver);
      const car = makeCar(d);
      car.shadow.material.map = shadowTex;
      car.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(car.root); this.scene.add(car.shadow);
      const r = new Racer(d, car, { human: !p.cpu, player: p.cpu ? -1 : players.indexOf(p), id: i });
      if (sprites[d.id]) { r.sprite = new SpriteCar(sprites[d.id]); this.scene.add(r.sprite.mesh); }
      r.dev = p.dev;
      const row = Math.floor(i / 2), side = i % 2 ? 1 : -1;
      r.place_on_grid(this.track, this.track.L - 8 - row * 7 - (side > 0 ? 3.5 : 0), side * this.track.W * 0.23);
      if (!r.human) initAI(r, this.track);
      this.racers.push(r);
    });
    this.humans = this.racers.filter(r => r.human).sort((a, b) => a.player - b.player);
    this.items = new Items(this);
    this.deco = buildRaceDeco(this);
    this.rec = new Recorder(this);
    this.replay = null;

    // Kameras
    this.cams = this.humans.map(() => { const c = new THREE.PerspectiveCamera(68, 1, 0.5, 2000); c.userData = { pos: null, look: new THREE.Vector3() }; return c; });
    this.tvCam = new THREE.PerspectiveCamera(55, 1, 0.5, 2000); this.tvCam.userData = { pos: null, look: new THREE.Vector3() };

    this.time = 0; this.countdown = 4.2; this.started = false; this.acc = 0; this.paused = false;
    this.endT = -1; this.ended = false;
    this.hudSend = 0;
    this.rocket = new Map();
    this.audio.music(def.music);
    this.beeped = 5;
  }

  // Fahrerspruch mit Mindestabstand je Spruch
  say(r, line, gap) { r.vT ||= {}; if ((r.vT[line] || -99) > this.time) return; r.vT[line] = this.time + gap; this.audio.voice(r.driver.id, line); }

  nearHuman(r, d) { return this.humans.some(h => (h.x - r.x) ** 2 + (h.z - r.z) ** 2 < d * d); }

  aiScale(r) {
    if (!this.humans.length) return 1;
    let best = -1e9; for (const h of this.humans) best = Math.max(best, h.total);
    const diff = best - r.total;
    const skill = r.ai ? 0.965 + (r.ai.skill - 0.85) * 0.25 : 1;
    return skill * (1 + clamp(diff / 280, -0.09, 0.11));
  }
  autoSteer(r) { if (!r.ai) initAI(r, this.track); driveAI(r, this, 1 / 60); return r.input.steer; }
  inWater(x, z) { return this.extra.style === "lake" && this.data.water.some(w => inPoly(x, z, w)); }
  sfx(n) { this.audio.sfx(n); }

  update(dt) {
    if (this.paused || this.ended) return;
    if (this.replay) {
      this.replay.update(dt);
      this.world.update(dt, this.time + 100); this.deco.update(dt, this.time + 100);
      if (this.replay.done) this.endNow();
      return;
    }
    this.acc = Math.min(this.acc + dt, 0.25);
    const STEP = 1 / 60;
    while (this.acc >= STEP) { this.tick(STEP); this.acc -= STEP; }
    this.world.update(dt, this.time + 100);
    this.deco.update(dt, this.time + 100);
    this.fx.update(dt);
    const alpha = Math.min(1, this.acc / STEP);
    for (const r of this.racers) r.syncModel(dt, alpha);
  }

  tick(dt) {
    // Countdown + Raketenstart
    if (!this.started) {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n < this.beeped && n <= 3 && n >= 1) { this.beeped = n; this.sfx("beep"); }
      for (const h of this.humans) {
        const inp = this.inputs.read(h.dev);
        if (inp.gas && !this.rocket.has(h)) this.rocket.set(h, this.countdown);
        if (!inp.gas) this.rocket.delete(h);
      }
      if (this.countdown <= 0) {
        this.started = true; this.time = 0; this.sfx("go"); this.sfx("letsgo");
        this.humans.forEach((h, i) => setTimeout(() => this.audio.voice(h.driver.id, "start"), 1100 + i * 420));
        for (const h of this.humans) {
          const t0 = this.rocket.get(h);
          if (t0 !== undefined && t0 < 1.6 && t0 > 0.6) { h.boost(1.0); this.hud.message(h, "Raketenstart!", 1.2, "#6aff7a"); }
          else if (t0 !== undefined && t0 >= 2.6 && !(h.dev || '').startsWith('ph')) { h.spinT = 0.8; this.hud.message(h, "Abgewürgt!", 1.2, "#ff8a5a"); }
        }
        for (const r of this.racers) if (!r.human && Math.random() < 0.4) r.boost(0.8);
      }
    } else this.time += dt;

    // Eingaben
    for (const r of this.racers) {
      if (r.human && (r.finished || this.autopilot)) { if (!r.ai) initAI(r, this.track); driveAI(r, this, dt); if (r.finished) r.input.item = false; }
      else if (r.human) {
        const s = this.inputs.read(r.dev);
        Object.assign(r.input, { steer: -s.steer, gas: s.gas, brake: s.brake, drift: s.drift, item: s.item, back: s.back });
      } else driveAI(r, this, dt);
    }
    for (const r of this.racers) r.step(dt, this);
    this.deco.tick(dt);
    this.rec.tick(dt);

    // Zusammenstoesse
    const R = 3.2;
    for (let i = 0; i < this.racers.length; i++) for (let j = i + 1; j < this.racers.length; j++) {
      const a = this.racers[i], b = this.racers[j];
      if (a.respawnT > 0 || b.respawnT > 0 || Math.abs(a.y - b.y) > 1.5) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
      if (d2 > R * R || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, over = R - d;
      const wa = a.driver.stats.weight, wb = b.driver.stats.weight;
      const ka = wb / (wa + wb), kb = wa / (wa + wb);
      a.x -= nx * over * ka; a.z -= nz * over * ka; b.x += nx * over * kb; b.z += nz * over * kb;
      if (a.invT > 0 && b.invT <= 0) b.hit("spin", 1.0, { by: a, item: "doener" });
      else if (b.invT > 0 && a.invT <= 0) a.hit("spin", 1.0, { by: b, item: "doener" });
      else { a.speed *= 0.985; b.speed *= 0.985; if (a.human) a.events.push({ t: "bump" }); if (b.human) b.events.push({ t: "bump" }); }
    }

    // Platzierungen (+ Ueberhol-Spruch fuer Spieler)
    const sorted = this.racers.slice().sort((a, b) => b.progress() - a.progress());
    sorted.forEach((r, i) => {
      const np = i + 1;
      if (r.human && this.started && !r.finished && r.place && np < r.place && this.time > 4 && (r.voiceT || 0) < this.time) { r.voiceT = this.time + 6; this.audio.voice(r.driver.id, "overtake"); }
      r.place = np;
    });
    this.items.update(dt, this.time);
    this.effects(dt);
    this.handleEvents();

    // Ende?
    if (this.started && this.endT < 0 && this.humans.length && this.humans.every(h => h.finished)) this.endT = 3.5;
    if (this.endT > 0) { this.endT -= dt; if (this.endT <= 0) this.finish(); }
    this.hudSend -= dt;
    if (this.hudSend <= 0) {
      this.hudSend = 0.25;
      for (const h of this.humans) if (h.dev && h.dev.startsWith("ph")) this.net.send(h.dev, { t: "hud", item: h.roulette > 0 ? "🎲" : h.item ? ITEMS[h.item].icon : "", place: h.place, lap: h.lap, laps: this.laps, pfand: h.pfand, n: this.racers.length });
    }
  }

  effects(dt) {
    for (const r of this.racers) {
      const fx = Math.sin(r.heading), fz = Math.cos(r.heading);
      const rx = -fz, rz = fx;
      const backX = r.x - fx * r.car.L * 0.5, backZ = r.z - fz * r.car.L * 0.5;
      if (r.drift && !r.air) {
        const col = ["#f0f0f0", "#ffe36a", "#ff9a2a", "#ff3a2a"][r.driftLevel];
        for (const sd of [-1, 1]) if (Math.random() < dt * 40) this.fx.spawn(r.driftLevel ? "spark" : "smoke", backX + rx * sd * 0.9, r.y + 0.3, backZ + rz * sd * 0.9,
          { color: col, size: r.driftLevel ? 0.7 + r.driftLevel * 0.15 : 0.9, life: r.driftLevel ? 0.35 : 0.6, vx: -fx * 3 + (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 2, vz: -fz * 3 + (Math.random() - 0.5) * 4, grav: 8, alpha: 0.9 });
      }
      if (r.boostT > 0) {
        for (const sd of [-0.45, 0.45]) if (Math.random() < dt * 45) {
          this.fx.spawn("spark", backX + rx * sd, r.y + 0.55, backZ + rz * sd, { color: r.boostKind === 2 ? "#b46bff" : "#4ad2ff", size: 1.5, grow: 0.3, life: 0.28, vx: -fx * 9 + (Math.random() - 0.5), vy: 0.8, vz: -fz * 9 + (Math.random() - 0.5), alpha: 1 });
          this.fx.spawn("spark", backX + rx * sd, r.y + 0.55, backZ + rz * sd, { color: "#ffffff", size: 0.7, grow: 0.2, life: 0.14, vx: -fx * 6, vy: 0.5, vz: -fz * 6, alpha: 1 });
        }
      }
      // Reifenrauch beim Driften und scharfen Lenken
      if (!r.air && Math.abs(r.speed) > 10 && (r.drift || Math.abs(r.steerVis || 0) > 0.9) && Math.random() < dt * (r.drift ? 26 : 8)) {
        for (const sd of [-1, 1]) this.fx.spawn("smoke", backX + rx * sd * 0.9, r.y + 0.35, backZ + rz * sd * 0.9, { color: "#f2f2f2", size: 1.0, grow: 3.2, life: 0.9, vx: -fx * 2, vy: 1.2, vz: -fz * 2, alpha: 0.45, drag: 0.4 });
      }
      if (r.squash > 0.23 && !r.landShook) { r.landShook = true; if (r.human) r.shakeReq = 0.5; } else if (r.squash <= 0) r.landShook = false;
      if (Math.abs(r.d) > this.track.half + 3.4 && Math.abs(r.speed) > 6 && !r.air && Math.random() < dt * 20) {
        this.fx.spawn("smoke", backX, 0.5, backZ, { color: this.extra.style === "lake" ? "#d8c49a" : "#9a8a5a", size: 1.2, grow: 2.5, life: 0.8, vy: 1, alpha: 0.5 });
      }
      if (r.blindT > 0 && Math.random() < dt * 6) this.fx.spawn("smoke", r.x, r.y + 3, r.z, { size: 2.5, grow: 1.6, life: 1.2, color: "#eef2ff", alpha: 0.7, vy: 0.5 });
      if (r.spinT > 0 && Math.random() < dt * 10) this.fx.spawn("spark", r.x, r.y + 2.6, r.z, { color: "#fff6a0", size: 0.6, life: 0.5, vx: (Math.random() - 0.5) * 3, vy: 1.5, vz: (Math.random() - 0.5) * 3 });
    }
  }

  handleEvents() {
    const RUMBLE = { hit: 350, wall: 70, box: 25, boost: 120, spark: 20, flash: 500, kontrolle: 650, pfand: 15, got: 30, bump: 40, trick: 60, splash: 300, blind: 150 };
    for (const r of this.racers) {
      for (const e of r.events) {
        const hum = r.human;
        if (r.sprite) { if (e.t === "hit") r.sprite.play("schaden", 1.2); else if (e.t === "vape") r.sprite.play("vape"); else if (["throw", "drop", "camera", "siren", "doener", "lighter"].includes(e.t)) r.sprite.play("werfen"); }
        if (hum && RUMBLE[e.t] && r.dev?.startsWith("ph")) this.net.send(r.dev, { t: "rumble", ms: RUMBLE[e.t] });
        switch (e.t) {
          case "hit": this.rec.event("hit", { victim: r.id, by: e.by ? e.by.id : null, item: e.item }, (hum || (e.by && e.by.human) ? 5 : 2) + (e.item === "amt" || e.item === "blitzer" ? 1 : 0));
            if (hum) { this.sfx("hit"); r.hitFlash = 0.7; r.shakeReq = 1.1;
            const it = e.item && ITEMS[e.item];
            const txt = e.by && e.by !== r ? `${it ? it.icon + " " : ""}${e.by.driver.name} hat dich erwischt!` : e.by === r ? "Eigentor! 🤦" : pick(MSG.hit);
            this.hud.message(r, txt, 2.2, "#ff8a7a", it && e.by !== r ? it.name : ""); this.audio.voice(r.driver.id, "hit"); } else if (this.nearHuman(r, 45) && Math.random() < 0.4) this.audio.voice(r.driver.id, "hit"); break;
          case "wall": if (hum) this.sfx("wall"); break;
          case "scored": if (hum) { this.hud.message(r, `🎯 Treffer! ${e.victim.driver.name} erwischt`, 1.6, "#6aff7a"); if (r.dev?.startsWith("ph")) this.net.send(r.dev, { t: "rumble", ms: 60 }); } break;
          case "box": if (hum) this.sfx("box"); break;
          case "got": if (hum) { this.sfx("got"); this.say(r, "gotitem", 6); } break;
          case "boost": if (hum) { this.sfx("boost"); r.shakeReq = 0.6; this.say(r, "boost", 5); } break;
          case "spark": if (hum) { this.sfx("spark"); if (e.lvl >= 3) this.say(r, "drift", 6); } break;
          case "pfand": if (hum) { this.sfx("pfand"); if (r.pfand === 10) this.hud.message(r, MSG.pfandFull[0], 1.5, "#ffd23a"); } break;
          case "flash": if (hum) { this.hud.message(r, pick(MSG.flash), 2, "#ffffff"); this.say(r, "flash", 2); } break;
          case "camera": this.sfx("camera"); if (hum) this.audio.voice(r.driver.id, "item"); if (hum) this.hud.message(r, "📸 Blitzer aufgestellt!", 1.5, "#ffd23a"); break;
          case "blind": if (hum) { this.sfx("blind"); this.hud.message(r, pick(MSG.blind), 1.6, "#eef2ff"); } break;
          case "vape": this.sfx("vape"); break;
          case "kontrolle": if (hum) this.hud.message(r, pick(MSG.kontrolle), 2.2, "#7fb0ff"); break;
          case "siren": this.sfx("siren"); break;
          case "doener": if (hum) { this.sfx("doener"); this.hud.message(r, pick(MSG.doener), 1.4, "#ffd23a"); } break;
          case "lighter": if (hum) this.sfx("lighter"); break;
          case "throw": if (hum) { this.sfx("throw"); this.audio.voice(r.driver.id, "item"); } break;
          case "drop": if (hum) { this.sfx("drop"); this.audio.voice(r.driver.id, "item"); } break;
          case "splash": if (hum) { this.sfx("splash"); this.say(r, "splash", 2); } break;
          case "trick": if (hum) this.sfx("trick"); this.rec.event("jump", { who: r.id }, r.human ? 3 : 1.5); break;
          case "finish": if (r.place === 1) this.rec.event("win", { who: r.id }, 10);
            if (hum) { this.sfx("finish"); const d = r.driver.id, w = r.place <= 3; setTimeout(() => this.audio.voice(d, w ? "win" : "lose"), 700); } break;
        }
      }
      r.events.length = 0;
    }
  }

  views(W, H) {
    const n = this.humans.length;
    const v = [];
    if (n <= 1) v.push({ x: 0, y: 0, w: W, h: H });
    else if (n === 2) { v.push({ x: 0, y: 0, w: W, h: H / 2 }, { x: 0, y: H / 2, w: W, h: H / 2 }); }
    else {
      const cols = n <= 4 ? 2 : n <= 6 ? 3 : 4;
      for (let row = 0; row < 2; row++) for (let c = 0; c < cols; c++) v.push({ x: c * W / cols, y: row * H / 2, w: W / cols, h: H / 2 });
    }
    return v;
  }

  updateCam(cam, r0, dt, tv = false) {
    const r = { x: r0.rx ?? r0.x, y: r0.ry ?? r0.y, z: r0.rz ?? r0.z, heading: r0.rh ?? r0.heading };
    const fx = Math.sin(r.heading), fz = Math.cos(r.heading);
    const back = !tv && r0.input.back && r0.human && !(r0.dev || "").startsWith("ph");
    const u = cam.userData;
    const sp = Math.abs(r0.speed), top = this.cls.top;
    // beim Boost zieht die Kamera leicht zurueck
    u.pull = (u.pull || 0) + (((r0.boostT > 0) ? 1.6 : 0) + Math.min(1, sp / top) * 0.6 - (u.pull || 0)) * Math.min(1, dt * 3);
    const dist = (tv ? 11 : 7.0) + u.pull, height = tv ? 5 : 3.0 + u.pull * 0.15;
    const sgn = back ? -1 : 1;
    const want = new THREE.Vector3(r.x - fx * dist * sgn, r.y + height, r.z - fz * dist * sgn);
    const look = new THREE.Vector3(r.x + fx * 6 * sgn, r.y + 1.25, r.z + fz * 6 * sgn);
    if (!u.pos || back !== u.back) { u.pos = want.clone(); u.look.copy(look); u.back = back; }
    u.pos.lerp(want, 1 - Math.exp(-dt * (back ? 30 : 7.5)));
    u.pos.y = Math.max(u.pos.y, r.y + 1.6, this.track.heightAt(u.pos.x, u.pos.z) + 1.4);
    u.look.lerp(look, 1 - Math.exp(-dt * 12));
    // Wackeln bei Boost-Start und Landung
    u.shake = Math.max(0, (u.shake || 0) - dt * 2.2);
    if (r0.shakeReq) { u.shake = Math.max(u.shake, r0.shakeReq); r0.shakeReq = 0; }
    const sh = u.shake * u.shake;
    cam.position.set(u.pos.x + (Math.random() - 0.5) * sh * 0.5, u.pos.y + (Math.random() - 0.5) * sh * 0.4, u.pos.z + (Math.random() - 0.5) * sh * 0.5);
    cam.up.set(0, 1, 0);
    cam.lookAt(u.look);
    // leichte Neigung in Kurven
    u.roll = (u.roll || 0) + ((tv ? 0 : (r0.steerVis || 0) * Math.min(1, sp / 22) * 0.045 + (r0.drift ? r0.drift.dir * 0.025 : 0)) - (u.roll || 0)) * Math.min(1, dt * 5);
    cam.rotateZ(u.roll);
    // Sichtfeld je nach Tempo
    const fov = 64 + Math.min(1, sp / top) * 9 + (r0.boostT > 0 ? 8 : 0);
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 4);
    if (!this.started && !tv) {
      const t = clamp((this.countdown - 1.0) / 3.2, 0, 1);
      if (t > 0) {
        const a = t * 2.4;
        cam.position.set(r.x + Math.sin(r.heading + Math.PI + a) * (dist + t * 5), r.y + height + t * 9, r.z + Math.cos(r.heading + Math.PI + a) * (dist + t * 5));
        cam.lookAt(r.x, r.y + 1, r.z);
      }
    }
  }

  render(dt) {
    const rd = this.renderer;
    const W = rd.domElement.clientWidth, H = rd.domElement.clientHeight;
    if (this.replay) {
      const rp = this.replay, cam = rp.cam;
      cam.aspect = W / H; cam.updateProjectionMatrix();
      const fr = this.racers[0];
      const draw = (target) => {
        const pr = rd.getPixelRatio();
        this.sun.target.position.set(cam.position.x, cam.position.y, cam.position.z); this.sun.position.set(cam.position.x + this.sunDir.x * 200, cam.position.y + this.sunDir.y * 200, cam.position.z + this.sunDir.z * 200); this.sun.target.updateMatrixWorld();
        if (target) { target.viewport.set(0, 0, W * pr, H * pr); target.scissor.copy(target.viewport); target.scissorTest = false; rd.setRenderTarget(target); }
        else { rd.setViewport(0, 0, W, H); rd.setScissorTest(false); }
        rd.render(this.scene, cam);
      };
      if (this.pipeline) this.pipeline.render(draw); else draw(null);
      const e = rp.clips[Math.min(rp.ci, rp.clips.length - 1)];
      this.hud.drawReplay(e ? rp.caption(e) : "", rp.ci, rp.clips.length, rp.t / 7);
      return;
    }
    const views = this.views(W, H);
    const hv = [];
    // Kameras einmal pro Bild aktualisieren
    const cams = views.map((v, i) => {
      let cam, r = this.humans[i];
      if (r) { cam = this.cams[i]; this.updateCam(cam, r, dt); }
      else { cam = this.tvCam; const lead = this.racers.slice().sort((a, b) => a.place - b.place)[0]; this.updateCam(cam, lead, dt, true); }
      cam.aspect = v.w / v.h; cam.updateProjectionMatrix();
      if (r) hv.push({ ...v, racer: r });
      return { v, cam, focus: r || this.racers[0] };
    });
    const draw = (target) => {
      const pr = rd.getPixelRatio();
      rd.setClearColor("#000");
      if (!target) rd.setScissorTest(true);
      const many = cams.length > 4;
      const sc = this.sun.shadow.camera, ext = many ? 150 : 75;
      if (sc.right !== ext) { sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.updateProjectionMatrix(); }
      rd.shadowMap.autoUpdate = !many;
      if (many) {
        let mx = 0, mz = 0; for (const h of this.humans) { mx += h.x; mz += h.z; } mx /= this.humans.length; mz /= this.humans.length;
        this.sun.target.position.set(mx, this.humans[0].y, mz); this.sun.position.set(mx + this.sunDir.x * 260, this.humans[0].y + this.sunDir.y * 260, mz + this.sunDir.z * 260); this.sun.target.updateMatrixWorld();
        rd.shadowMap.needsUpdate = true;
      }
      for (const { v, cam, focus } of cams) {
        const fx = (focus.rx ?? focus.x) + Math.sin(focus.heading) * 30, fz = (focus.rz ?? focus.z) + Math.cos(focus.heading) * 30;
        if (!many) {
        this.sun.target.position.set(fx, focus.y, fz);
        this.sun.position.set(fx + this.sunDir.x * 200, focus.y + this.sunDir.y * 200, fz + this.sunDir.z * 200);
        this.sun.target.updateMatrixWorld();
        }
        if (target) {
          target.viewport.set(v.x * pr, (H - v.y - v.h) * pr, v.w * pr, v.h * pr);
          target.scissor.copy(target.viewport); target.scissorTest = true;
          rd.setRenderTarget(target);
        } else {
          rd.setViewport(v.x, H - v.y - v.h, v.w, v.h);
          rd.setScissor(v.x, H - v.y - v.h, v.w, v.h);
        }
        rd.render(this.scene, cam);
      }
      if (target) { target.scissorTest = false; target.viewport.set(0, 0, target.width, target.height); target.scissor.set(0, 0, target.width, target.height); }
      else rd.setScissorTest(false);
    };
    if (this.pipeline) this.pipeline.render(draw); else draw(null);
    this.hud.draw(this, hv, dt);
    for (const h of this.humans) this.audio.engine(h.id, h.speed, h.boostT > 0, this.started || this.countdown < 3.5, h.driver.id);
  }

  results() {
    return this.racers.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1; if (b.finished) return 1;
      return b.total - a.total;
    }).map((r, i) => ({ place: i + 1, name: r.driver.name, car: r.driver.car, human: r.human, color: r.driver.hud, time: r.finished ? r.finishTime : null, driver: r.driver.id, pfand: r.pfand }));
  }

  finish() {
    if (this.ended || this.replay) return;
    this.audio.stopEngines();
    this.finalResults = this.results();
    const rp = new Replay(this, this.rec);
    if (rp.done) { this.endNow(); return; }
    this.replay = rp;
    this.fx.clear();
  }
  skipReplay() { if (this.replay) { this.replay.done = true; } }
  endNow() {
    if (this.ended) return;
    this.ended = true;
    this.audio.stopEngines();
    this.audio.stopMusic();
    this.onEnd && this.onEnd(this.finalResults || this.results());
  }

  dispose() {
    this.audio.stopEngines();
    this.audio.stopMusic();
    this.items.dispose();
    this.fx.clear();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
}
