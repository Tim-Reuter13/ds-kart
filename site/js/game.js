import * as THREE from "three";
import { Track } from "./track.js";
import { buildWorld } from "./world.js";
import { makeCar, DRIVERS } from "./cars.js";
import { Racer, CLASSES } from "./kart.js";
import { Items, ITEMS } from "./items.js";
import { FX } from "./fx.js";
import { initAI, driveAI } from "./ai.js";
import { T } from "./tex.js";

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
  constructor({ renderer, hud, audio, net, inputs, def, data, players, cls = "golf", laps = 3, onEnd }) {
    this.renderer = renderer; this.hud = hud; this.audio = audio; this.net = net; this.inputs = inputs;
    this.extra = def; this.data = data; this.cls = CLASSES[cls]; this.laps = laps; this.onEnd = onEnd;
    this.scene = new THREE.Scene();
    this.scene.environment = window.__env || null;
    this.scene.environmentIntensity = 0.55;
    this.scene.fog = new THREE.Fog(def.fog || "#d3e8f4", 220, 1300);
    this.scene.add(new THREE.HemisphereLight("#dcecff", "#7a8a5a", 1.15));
    const sun = new THREE.DirectionalLight("#fff1d6", 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 400;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
    this.scene.add(sun); this.scene.add(sun.target);
    this.sun = sun;
    this.sunDir = new THREE.Vector3(-0.5, 0.75, 0.35).normalize();

    this.track = new Track(data, def);
    if (def.setup) def.setup(this.track, data);
    this.track.setRamps(def.ramps || []);
    this.world = buildWorld(this.scene, this.track, data, def);
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
      r.dev = p.dev;
      const row = Math.floor(i / 2), side = i % 2 ? 1 : -1;
      r.place_on_grid(this.track, this.track.L - 8 - row * 7 - (side > 0 ? 3.5 : 0), side * this.track.W * 0.23);
      if (!r.human) initAI(r, this.track);
      this.racers.push(r);
    });
    this.humans = this.racers.filter(r => r.human).sort((a, b) => a.player - b.player);
    this.items = new Items(this);

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
    this.acc = Math.min(this.acc + dt, 0.25);
    const STEP = 1 / 60;
    while (this.acc >= STEP) { this.tick(STEP); this.acc -= STEP; }
    this.world.update(dt, this.time + 100);
    this.fx.update(dt);
    for (const r of this.racers) r.syncModel(dt);
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
        this.started = true; this.time = 0; this.sfx("go");
        for (const h of this.humans) {
          const t0 = this.rocket.get(h);
          if (t0 !== undefined && t0 < 1.6 && t0 > 0.6) { h.boost(1.0); this.hud.message(h, "Raketenstart!", 1.2, "#6aff7a"); }
          else if (t0 !== undefined && t0 >= 2.6) { h.spinT = 0.8; this.hud.message(h, "Abgewürgt!", 1.2, "#ff8a5a"); }
        }
        for (const r of this.racers) if (!r.human && Math.random() < 0.4) r.boost(0.8);
      }
    } else this.time += dt;

    // Eingaben
    for (const r of this.racers) {
      if (r.human && (r.finished || this.autopilot)) { if (!r.ai) initAI(r, this.track); driveAI(r, this, dt); if (r.finished) r.input.item = false; }
      else if (r.human) {
        const s = this.inputs.read(r.dev);
        Object.assign(r.input, { steer: s.steer, gas: s.gas, brake: s.brake, drift: s.drift, item: s.item, back: s.back });
      } else driveAI(r, this, dt);
    }
    for (const r of this.racers) r.step(dt, this);

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
      if (a.invT > 0 && b.invT <= 0) b.hit("spin", 1.0);
      else if (b.invT > 0 && a.invT <= 0) a.hit("spin", 1.0);
      else { a.speed *= 0.985; b.speed *= 0.985; if (a.human) a.events.push({ t: "bump" }); if (b.human) b.events.push({ t: "bump" }); }
    }

    // Platzierungen
    const sorted = this.racers.slice().sort((a, b) => b.progress() - a.progress());
    sorted.forEach((r, i) => r.place = i + 1);
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
      if (r.boostT > 0 && Math.random() < dt * 50) {
        this.fx.spawn("spark", backX, r.y + 0.6, backZ, { color: r.boostKind === 2 ? "#ff5a2a" : "#ffb03a", size: 1.3, life: 0.3, vx: -fx * 8, vy: 1, vz: -fz * 8, alpha: 0.95 });
      }
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
        if (hum && RUMBLE[e.t] && r.dev?.startsWith("ph")) this.net.send(r.dev, { t: "rumble", ms: RUMBLE[e.t] });
        switch (e.t) {
          case "hit": if (hum) { this.sfx("hit"); this.hud.message(r, pick(MSG.hit), 1.4, "#ffb0a0"); } break;
          case "wall": if (hum) this.sfx("wall"); break;
          case "box": if (hum) this.sfx("box"); break;
          case "got": if (hum) this.sfx("got"); break;
          case "boost": if (hum) this.sfx("boost"); break;
          case "spark": if (hum) this.sfx("spark"); break;
          case "pfand": if (hum) { this.sfx("pfand"); if (r.pfand === 10) this.hud.message(r, MSG.pfandFull[0], 1.5, "#ffd23a"); } break;
          case "flash": if (hum) this.hud.message(r, pick(MSG.flash), 2, "#ffffff"); break;
          case "camera": this.sfx("camera"); if (hum) this.hud.message(r, "📸 Blitzer aufgestellt!", 1.5, "#ffd23a"); break;
          case "blind": if (hum) { this.sfx("blind"); this.hud.message(r, pick(MSG.blind), 1.6, "#eef2ff"); } break;
          case "vape": this.sfx("vape"); break;
          case "kontrolle": if (hum) this.hud.message(r, pick(MSG.kontrolle), 2.2, "#7fb0ff"); break;
          case "siren": this.sfx("siren"); break;
          case "doener": if (hum) { this.sfx("doener"); this.hud.message(r, pick(MSG.doener), 1.4, "#ffd23a"); } break;
          case "lighter": if (hum) this.sfx("lighter"); break;
          case "throw": if (hum) this.sfx("throw"); break;
          case "drop": if (hum) this.sfx("drop"); break;
          case "splash": if (hum) this.sfx("splash"); break;
          case "trick": if (hum) this.sfx("trick"); break;
          case "finish": if (hum) { this.sfx("finish"); } break;
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
    else { v.push({ x: 0, y: 0, w: W / 2, h: H / 2 }, { x: W / 2, y: 0, w: W / 2, h: H / 2 }, { x: 0, y: H / 2, w: W / 2, h: H / 2 }, { x: W / 2, y: H / 2, w: W / 2, h: H / 2 }); }
    return v;
  }

  updateCam(cam, r, dt, tv = false) {
    const fx = Math.sin(r.heading), fz = Math.cos(r.heading);
    const back = !tv && r.input.back && r.human;
    const dist = tv ? 11 : 7.4, height = tv ? 5 : 3.2;
    const sgn = back ? -1 : 1;
    const want = new THREE.Vector3(r.x - fx * dist * sgn, r.y + height, r.z - fz * dist * sgn);
    const look = new THREE.Vector3(r.x + fx * 5 * sgn, r.y + 1.3, r.z + fz * 5 * sgn);
    const u = cam.userData;
    if (!u.pos || back !== u.back) { u.pos = want.clone(); u.look.copy(look); u.back = back; }
    const k = 1 - Math.exp(-dt * (back ? 30 : 7));
    u.pos.lerp(want, k);
    u.pos.y = Math.max(u.pos.y, r.y + 1.6, this.track.heightAt(u.pos.x, u.pos.z) + 1.4);
    u.look.lerp(look, 1 - Math.exp(-dt * 12));
    cam.position.copy(u.pos);
    cam.lookAt(u.look);
    const fov = 66 + (r.boostT > 0 ? 9 : 0) + Math.min(6, Math.abs(r.speed) / 6);
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 4);
    if (!this.started && !tv) {
      // Kamerafahrt vor dem Start
      const t = clamp((this.countdown - 1.0) / 3.2, 0, 1);
      if (t > 0) {
        const a = t * 2.4;
        cam.position.set(r.x + Math.sin(r.heading + Math.PI + a) * (dist + t * 10), r.y + height + t * 6, r.z + Math.cos(r.heading + Math.PI + a) * (dist + t * 10));
        cam.lookAt(r.x, r.y + 1, r.z);
      }
    }
  }

  render(dt) {
    const rd = this.renderer;
    const W = rd.domElement.clientWidth, H = rd.domElement.clientHeight;
    const views = this.views(W, H);
    rd.setScissorTest(true);
    rd.setClearColor("#000");
    const hv = [];
    views.forEach((v, i) => {
      let cam, r = this.humans[i];
      if (r) { cam = this.cams[i]; this.updateCam(cam, r, dt); }
      else {
        cam = this.tvCam;
        const lead = this.racers.slice().sort((a, b) => a.place - b.place)[0];
        this.updateCam(cam, lead, dt, true);
      }
      cam.aspect = v.w / v.h; cam.updateProjectionMatrix();
      const focus = r || this.racers[0];
      const fx = focus.x + Math.sin(focus.heading) * 30, fz = focus.z + Math.cos(focus.heading) * 30;
      this.sun.target.position.set(fx, focus.y, fz);
      this.sun.position.set(fx + this.sunDir.x * 200, focus.y + this.sunDir.y * 200, fz + this.sunDir.z * 200);
      this.sun.target.updateMatrixWorld();
      rd.setViewport(v.x, H - v.y - v.h, v.w, v.h);
      rd.setScissor(v.x, H - v.y - v.h, v.w, v.h);
      rd.render(this.scene, cam);
      if (r) hv.push({ ...v, racer: r });
    });
    rd.setScissorTest(false);
    this.hud.draw(this, hv, dt);
    for (const h of this.humans) this.audio.engine(h.id, h.speed, h.boostT > 0, this.started || this.countdown < 3.5);
  }

  results() {
    return this.racers.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1; if (b.finished) return 1;
      return b.total - a.total;
    }).map((r, i) => ({ place: i + 1, name: r.driver.name, car: r.driver.car, human: r.human, color: r.driver.hud, time: r.finished ? r.finishTime : null, driver: r.driver.id, pfand: r.pfand }));
  }

  finish() {
    if (this.ended) return;
    this.ended = true;
    this.audio.stopEngines();
    this.audio.stopMusic();
    this.onEnd && this.onEnd(this.results());
  }

  dispose() {
    this.audio.stopEngines();
    this.audio.stopMusic();
    this.items.dispose();
    this.fx.clear();
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
}
