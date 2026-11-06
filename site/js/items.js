import * as THREE from "three";
import { T } from "./tex.js";

export const ITEMS = {
  vape:    { icon: "💨", name: "Vape" },
  kippe:   { icon: "🚬", name: "Kippe" },
  pack:    { icon: "📦", name: "Leere Schachtel" },
  energy:  { icon: "🥫", name: "Energy" },
  kurze:   { icon: "🥃", name: "3 Kurze" },
  jaegi:   { icon: "🍾", name: "Kräuterschnaps" },
  kasten:  { icon: "🍺", name: "Kasten Bier" },
  blitzer: { icon: "📸", name: "Blitzer" },
  amt:     { icon: "🚓", name: "Ordnungsamt" },
  doener:  { icon: "🥙", name: "Döner mit alles" },
};
export const ROULETTE = Object.keys(ITEMS).filter(k => k !== "pack");

// Gewichte: vorne (t=0) .. hinten (t=1)
const W_FRONT = { kippe: 30, jaegi: 24, kasten: 24, vape: 12, energy: 8, kurze: 2, doener: 0, blitzer: 0, amt: 0 };
const W_BACK = { kippe: 4, jaegi: 6, kasten: 2, vape: 10, energy: 16, kurze: 22, doener: 18, blitzer: 10, amt: 12 };

export function rollItem(t) {
  const w = {};
  let sum = 0;
  for (const k of Object.keys(W_FRONT)) { w[k] = W_FRONT[k] * (1 - t) + W_BACK[k] * t; sum += w[k]; }
  let r = Math.random() * sum;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return "energy";
}

const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });

function makeBox() {
  const g = new THREE.Group();
  const cardboard = lam("#c79a5b");
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), [lam("#c79a5b", { map: T.sign("!", "#c79a5b", "#7a3f12", { font: "bold 80px Arial", h: 128 }) }),
    lam("#c79a5b", { map: T.sign("!", "#c79a5b", "#7a3f12", { font: "bold 80px Arial", h: 128 }) }), cardboard, cardboard,
    lam("#c79a5b", { map: T.sign("!", "#c79a5b", "#7a3f12", { font: "bold 80px Arial", h: 128 }) }),
    lam("#c79a5b", { map: T.sign("!", "#c79a5b", "#7a3f12", { font: "bold 80px Arial", h: 128 }) })]);
  g.add(top);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.18, 1.62), lam("#e8d9a8"));
  tape.position.y = 0.0; g.add(tape);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.35, 16, 12), new THREE.MeshBasicMaterial({ color: "#fff3b0", transparent: true, opacity: 0.18, depthWrite: false }));
  g.add(glow);
  return g;
}
function makeBottle(color = "#5a3a12", label = "#e8e0c8") {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 10), new THREE.MeshPhongMaterial({ color, shininess: 100, specular: "#fff", transparent: true, opacity: 0.92 }));
  body.position.y = 0.4; g.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 0.4, 10), body.material); neck.position.y = 1.0; g.add(neck);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 8), lam("#d8d8d8")); cap.position.y = 1.22; g.add(cap);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.32, 10), lam(label)); lab.position.y = 0.42; g.add(lab);
  return g;
}
function makePack() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 0.6), [lam("#f2f2f2"), lam("#f2f2f2"), lam("#c8102e"), lam("#f2f2f2"),
    lam("#fff", { map: T.sign("KIPPEN", "#ffffff", "#c8102e", { font: "bold 54px Arial" }) }), lam("#fff", { map: T.sign("RAUCHEN KANN TÖDLICH SEIN", "#ffffff", "#111", { font: "bold 40px Arial" }) })]);
  b.position.y = 0.85; g.add(b);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.5, 0.62), lam("#c8102e")); lid.position.y = 1.5; g.add(lid);
  g.rotation.z = 0.0;
  return g;
}
function makeKasten() {
  const g = new THREE.Group();
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 1.4), lam("#d4a017"));
  crate.position.y = 0.6; g.add(crate);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshBasicMaterial({ map: T.sign("BIER", "#d4a017", "#5a2a0a", { font: "bold 70px Arial" }) }));
  side.position.set(0, 0.6, 0.71); g.add(side);
  const s2 = side.clone(); s2.position.z = -0.71; s2.rotation.y = Math.PI; g.add(s2);
  const bm = new THREE.MeshPhongMaterial({ color: "#5a3a12", shininess: 90 });
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.5, 8), bm);
    n.position.set(-0.66 + i * 0.44, 1.35, -0.42 + k * 0.42); g.add(n);
  }
  return g;
}
function makeAmt() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 3.2), lam("#e8eef4")); b.position.y = 0.7; g.add(b);
  const s = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.25, 3.22), lam("#1a4fa0")); s.position.y = 0.65; g.add(s);
  const c = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.6), lam("#2a3a4a")); c.position.set(0, 1.3, -0.2); g.add(c);
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: "#2060ff" })); l1.position.set(-0.35, 1.7, -0.2); g.add(l1);
  const l2 = l1.clone(); l2.material = new THREE.MeshBasicMaterial({ color: "#ffffff" }); l2.position.x = 0.35; g.add(l2);
  g.userData.lights = [l1, l2];
  return g;
}
function makeDoenerGlow() {
  return new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffcf4a", transparent: true, opacity: 0.25, depthWrite: false }));
}

export class Items {
  constructor(race) {
    this.race = race;
    this.scene = race.scene;
    this.track = race.track;
    this.boxes = [];
    this.bottles = [];
    this.objs = [];   // Gefahren und Geschosse
    this.flash = [];  // Blitzer-Ereignisse fuer HUD
    const tr = this.track;
    const ex = race.extra;
    for (const f of ex.boxes || [0.12, 0.42, 0.72]) {
      const n = 5;
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * (tr.W - 3) / (n - 1);
        const p = tr.at(f * tr.L, off);
        const m = makeBox();
        m.position.set(p.x, p.y + 1.3, p.z);
        m.traverse(o => { if (o.isMesh) o.castShadow = true; });
        this.scene.add(m);
        this.boxes.push({ m, x: p.x, y: p.y, z: p.z, t: 0, ph: Math.random() * 6 });
      }
    }
    for (const [f, off, cnt] of ex.bottles || [[0.25, 0, 5], [0.55, -3, 5], [0.85, 3, 5]]) {
      for (let k = 0; k < cnt; k++) {
        const p = tr.at(f * tr.L + k * 4, off);
        const m = makeBottle();
        m.scale.setScalar(0.9);
        m.position.set(p.x, p.y + 0.4, p.z);
        this.scene.add(m);
        this.bottles.push({ m, x: p.x, y: p.y, z: p.z, t: 0 });
      }
    }
  }

  give(r) {
    if (r.item || r.roulette > 0) return;
    const n = this.race.racers.length;
    const t = n > 1 ? (r.place - 1) / (n - 1) : 0;
    r.pending = rollItem(t);
    r.roulette = r.human ? 1.6 : 0.8;
    r.events.push({ t: "box" });
  }

  use(r) {
    const k = r.item;
    if (!k) return;
    const race = this.race, tr = this.track;
    const fwd = [Math.sin(r.heading), Math.cos(r.heading)];
    const consume = () => { r.itemCount--; if (r.itemCount <= 0) { r.item = null; r.itemCount = 0; } };
    switch (k) {
      case "vape": {
        for (const o of race.racers) if (o !== r && o.place < r.place && o.invT <= 0) { o.blindT = 4.5; o.events.push({ t: "blind" }); }
        for (let i = 0; i < 18; i++) race.fx.spawn("smoke", r.x + (Math.random() - 0.5) * 3, r.y + 1.5 + Math.random(), r.z + (Math.random() - 0.5) * 3,
          { size: 3, grow: 3, life: 2.2, alpha: 0.7, vy: 1.5, vx: (Math.random() - 0.5) * 4, vz: (Math.random() - 0.5) * 4, color: "#e8f0ff", drag: 0.5 });
        r.events.push({ t: "vape" });
        consume(); break;
      }
      case "kippe": {
        r.smokeT = 3.2; r.item = "pack"; r.itemCount = 1; r.lockItem = 3.2;
        r.events.push({ t: "lighter" });
        break;
      }
      case "pack": case "kasten": {
        const back = r.input.gas && r.input.steer === 0 && r.input.back === false && r.input.forwardThrow;
        const dist = (k === "kasten" ? 3.4 : 2.8);
        const x = r.x - fwd[0] * dist, z = r.z - fwd[1] * dist;
        const m = k === "pack" ? makePack() : makeKasten();
        const gy = race.track.heightAt(x, z);
        m.position.set(x, gy, z); m.rotation.y = r.heading + (Math.random() - 0.5);
        m.traverse(o => { if (o.isMesh) o.castShadow = true; });
        this.scene.add(m);
        this.objs.push({ kind: k, m, x, y: gy, z, r: k === "kasten" ? 1.7 : 1.3, owner: r, safe: 0.5, life: 60 });
        r.events.push({ t: "drop" });
        consume(); break;
      }
      case "energy": r.boost(1.4); consume(); break;
      case "kurze": r.boost(1.1); consume(); break;
      case "doener": r.invT = 7; r.events.push({ t: "doener" }); consume(); break;
      case "jaegi": {
        const dir = r.input.back ? -1 : 1;
        const m = makeBottle("#1f4d2a", "#e88a1a");
        m.scale.setScalar(1.3);
        const x = r.x + fwd[0] * 3 * dir, z = r.z + fwd[1] * 3 * dir;
        m.position.set(x, r.y + 0.8, z);
        this.scene.add(m);
        this.objs.push({ kind: "jaegi", m, x, y: r.y, z, h: r.heading + (dir < 0 ? Math.PI : 0), v: Math.max(48, Math.abs(r.speed) + 22), r: 1.4, owner: r, safe: 0.35, life: 7, bounces: 5, hint: r.hint });
        r.events.push({ t: "throw" });
        consume(); break;
      }
      case "blitzer": {
        for (const o of race.racers) {
          if (o === r || o.invT > 0) continue;
          o.flashT = 3.5; o.hit("spin", 0.7, { by: r, item: "blitzer" }); o.item = null; o.itemCount = 0; o.roulette = 0;
          o.events.push({ t: "flash" });
        }
        r.events.push({ t: "camera" });
        consume(); break;
      }
      case "amt": {
        const target = race.racers.filter(o => o !== r && !o.finished).sort((a, b) => a.place - b.place)[0];
        if (target) {
          const m = makeAmt();
          m.position.set(r.x, 2, r.z);
          this.scene.add(m);
          this.objs.push({ kind: "amt", m, x: r.x, z: r.z, y: 2, s: r.s, total: r.total, target, owner: r, life: 30, r: 0 });
          r.events.push({ t: "siren" });
        }
        consume(); break;
      }
    }
  }

  update(dt, time) {
    const race = this.race, tr = this.track;
    // Item-Kisten
    for (const b of this.boxes) {
      if (b.t > 0) { b.t -= dt; b.m.visible = b.t <= 0; if (b.t > 0) continue; }
      b.m.rotation.y += dt * 1.4; b.m.rotation.x = Math.sin(time * 1.3 + b.ph) * 0.2;
      b.m.position.y = b.y + 1.3 + Math.sin(time * 2 + b.ph) * 0.25;
      for (const r of race.racers) {
        if (r.respawnT > 0) continue;
        if ((r.x - b.x) ** 2 + (r.z - b.z) ** 2 < 3.6 && r.y < b.y + 3) {
          b.t = 2.5; b.m.visible = false; this.give(r);
          for (let i = 0; i < 10; i++) race.fx.spawn("spark", b.x, b.y + 1.3, b.z, { size: 0.8, life: 0.6, vx: (Math.random() - 0.5) * 10, vy: Math.random() * 6, vz: (Math.random() - 0.5) * 10, color: "#ffd86a", grav: 9 });
          break;
        }
      }
    }
    // Pfandflaschen
    for (const b of this.bottles) {
      if (b.t > 0) { b.t -= dt; b.m.visible = b.t <= 0; if (b.t > 0) continue; }
      b.m.rotation.y += dt * 3;
      for (const r of race.racers) {
        if ((r.x - b.x) ** 2 + (r.z - b.z) ** 2 < 3.2 && r.y < b.y + 2.5 && r.respawnT <= 0) {
          b.t = 9; b.m.visible = false;
          if (r.pfand < 10) { r.pfand++; r.events.push({ t: "pfand" }); }
          break;
        }
      }
    }
    // Roulette
    for (const r of race.racers) {
      if (r.roulette > 0) {
        r.roulette -= dt;
        if (r.roulette <= 0) { r.item = r.pending; r.itemCount = r.item === "kurze" ? 3 : 1; r.events.push({ t: "got" }); }
      }
      if (r.lockItem > 0) r.lockItem -= dt;
      const edge = r.input.item && !r.prevItem;
      r.prevItem = r.input.item;
      if (edge && r.item && r.roulette <= 0 && !(r.lockItem > 0) && race.started && r.spinT <= 0) this.use(r);
      // Rauch beim Kippe-Rauchen
      if (r.smokeT > 0 && Math.random() < dt * 14) {
        race.fx.spawn("smoke", r.x - Math.sin(r.heading) * 1.2, r.y + 2.2, r.z - Math.cos(r.heading) * 1.2, { size: 0.9, grow: 3, life: 1.4, alpha: 0.6, vy: 1.2, color: "#dddddd" });
      }
    }
    // Objekte
    for (let i = this.objs.length - 1; i >= 0; i--) {
      const o = this.objs[i];
      o.life -= dt; if (o.safe > 0) o.safe -= dt;
      let dead = o.life <= 0;
      if (o.kind === "jaegi") {
        o.x += Math.sin(o.h) * o.v * dt; o.z += Math.cos(o.h) * o.v * dt;
        const q = tr.locate(o.x, o.z, o.hint); o.hint = q.i;
        if (Math.abs(q.d) > tr.edge - 0.6 && !(q.d > 0 ? tr.openR[q.i] : tr.openL[q.i])) {
          // abprallen
          const th = Math.atan2(tr.tx[q.i], tr.tz[q.i]);
          o.h = 2 * th - o.h;
          const sg = Math.sign(q.d), over = Math.abs(q.d) - (tr.edge - 0.6);
          o.x += tr.tz[q.i] * over * sg; o.z -= tr.tx[q.i] * over * sg;
          if (--o.bounces < 0) dead = true;
        }
        o.y = tr.baseAt(q.s);
        o.m.position.set(o.x, o.y + 0.8, o.z);
        o.m.rotation.x += dt * 12;
        o.m.rotation.y = o.h;
      } else if (o.kind === "amt") {
        const tgt = o.target;
        // dem Ziel entlang der Strecke folgen
        const gap = tgt.total - o.total;
        const v = 62;
        o.total += v * dt;
        const p = tr.at(o.total + tr.L * 10, tgt.d * Math.min(1, Math.max(0, 1 - (gap - 20) / 60)));
        o.x = p.x; o.z = p.z;
        o.y = p.y + 2.5 + Math.sin(time * 6) * 0.3;
        o.m.position.set(o.x, o.y, o.z); o.m.rotation.y = p.heading;
        const L = o.m.userData.lights; const on = Math.floor(time * 8) % 2;
        L[0].material.color.set(on ? "#2060ff" : "#0a1a40"); L[1].material.color.set(on ? "#ffffff" : "#888888");
        if (o.total >= tgt.total - 1 || tgt.finished) {
          // Kontrolle!
          for (const r of race.racers) if ((r.x - o.x) ** 2 + (r.z - o.z) ** 2 < 100 && r !== o.owner) { r.hit("stop", 2.2, { by: o.owner, item: "amt" }); r.events.push({ t: "kontrolle" }); }
          for (let k = 0; k < 40; k++) race.fx.spawn("spark", o.x, o.y, o.z, { size: 2, life: 0.9, vx: (Math.random() - 0.5) * 22, vy: Math.random() * 10, vz: (Math.random() - 0.5) * 22, color: k % 2 ? "#3070ff" : "#ffffff", grav: 10 });
          race.sfx("kontrolle");
          dead = true;
        }
      }
      if (!dead && o.r > 0) {
        for (const r of race.racers) {
          if (o.safe > 0 && r === o.owner) continue;
          if (r.respawnT > 0 || Math.abs(r.y - (o.y || 0)) > 2.5) continue;
          if ((r.x - o.x) ** 2 + (r.z - o.z) ** 2 < (o.r + 1.1) ** 2) {
            if (r.hit("spin", o.kind === "kasten" ? 1.3 : 1.1, { by: o.owner, item: o.kind }) || r.invT > 0) {
              dead = true;
              for (let k = 0; k < 12; k++) race.fx.spawn("spark", o.x, (o.y || 0) + 1, o.z, { size: 0.9, life: 0.5, vx: (Math.random() - 0.5) * 12, vy: Math.random() * 7, vz: (Math.random() - 0.5) * 12, color: "#ffe0a0", grav: 12 });
            }
            break;
          }
        }
        if (!dead) for (let k = 0; k < this.objs.length; k++) {
          const p = this.objs[k];
          if (p === o || p.r <= 0) continue;
          if ((p.x - o.x) ** 2 + (p.z - o.z) ** 2 < (p.r + o.r) ** 2 && (o.kind === "jaegi" || p.kind === "jaegi")) { dead = true; p.life = 0; break; }
        }
      }
      if (dead) { this.scene.remove(o.m); this.objs.splice(i, 1); }
    }
    // Doener-Leuchten
    for (const r of race.racers) {
      if (r.invT > 0) {
        if (!r.glow) { r.glow = makeDoenerGlow(); r.car.root.add(r.glow); r.glow.position.y = 1.2; }
        r.glow.visible = true;
        r.glow.material.color.setHSL((time * 0.8) % 1 * 0.15 + 0.08, 1, 0.6);
        if (Math.random() < dt * 20) race.fx.spawn("spark", r.x + (Math.random() - 0.5) * 3, r.y + Math.random() * 2, r.z + (Math.random() - 0.5) * 3, { size: 0.7, life: 0.5, color: "#ffe27a", vy: 2 });
      } else if (r.glow) r.glow.visible = false;
    }
  }

  dispose() {
    for (const b of this.boxes) this.scene.remove(b.m);
    for (const b of this.bottles) this.scene.remove(b.m);
    for (const o of this.objs) this.scene.remove(o.m);
  }
}
