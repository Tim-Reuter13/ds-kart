import * as THREE from "three";
import { RoundedBoxGeometry } from "../vendor/RoundedBoxGeometry.js";

// Fahrerinnen und Fahrer. stats: speed/accel/handling/weight als Faktoren um 1
export const DRIVERS = [
  { id: "tim", name: "Tim", car: "Mercedes C220 T-Modell", type: "sedan", color: "#b9bec4", accent: "#c9ccd1", hud: "#e04040",
    shirt: "#2a2a2e", hair: "#2b1d14", hairStyle: "short", skin: "#f0c8a8", kitt: true, portrait: "sprites/tim/portrait.webp", stats: { speed: 1.04, accel: 0.98, handling: 0.98, weight: 1.05 } },
  { id: "sonja", name: "Sonja", car: "Kia Venga", type: "venga", color: "#4a4e55", accent: "#e8e8e8", hud: "#ff6a5a",
    shirt: "#f2a6c0", hair: "#5a3420", hairStyle: "long", skin: "#f3cfb2", portrait: "sprites/sonja/portrait.webp", stats: { speed: 0.98, accel: 1.06, handling: 1.05, weight: 0.94 } },
  { id: "jannik", name: "Jannik", car: "BMW 2er Gran Tourer", type: "x4", color: "#e9ebee", accent: "#2b2f36", hud: "#5aa0ff",
    shirt: "#f4f4f4", hair: "#c9a25a", hairStyle: "short", skin: "#efc6a4", portrait: "sprites/jannik/portrait.webp", stats: { speed: 1.05, accel: 0.97, handling: 0.95, weight: 1.12 } },
  { id: "franzi", name: "Franzi", car: "VW Touran", type: "touran", color: "#1f62b8", accent: "#30353b", hud: "#c8d2dc",
    shirt: "#3a9a5e", hair: "#8a5a2b", hairStyle: "pony", skin: "#f1cbae", portrait: "sprites/franzi/portrait.webp", stats: { speed: 1.0, accel: 1.02, handling: 1.01, weight: 1.06 } },
  { id: "toni", name: "Traktor-Toni", car: "Bulldog", type: "tractor", color: "#3d9a3a", accent: "#f0c42a", hud: "#7fd06a", cpu: true,
    shirt: "#3a5a8a", hair: "#6b6b6b", hairStyle: "cap", skin: "#e8b896", stats: { speed: 0.96, accel: 1.0, handling: 0.97, weight: 1.2 } },
  { id: "giovanni", name: "Giovanni", car: "Mausauto", type: "hatch", color: "#8d9096", accent: "#f2a6c0", hud: "#f7a8c8", cpu: true,
    shirt: "#5a5e66", hair: "#2a1d16", hairStyle: "short", skin: "#e9bf9c", portrait: "sprites/giovanni/portrait.webp", stats: { speed: 0.98, accel: 0.97, handling: 1.03, weight: 1.0 } },
  { id: "kevin", name: "Tuner-Kevin", car: "Polo GTI tiefer", type: "tuner", color: "#f5c514", accent: "#141414", hud: "#ffe04a", cpu: true,
    shirt: "#141414", hair: "#2a1a10", hairStyle: "cap", skin: "#e9bc98", stats: { speed: 1.03, accel: 1.04, handling: 0.99, weight: 0.92 } },
  { id: "paula", name: "Post-Paula", car: "Postauto", type: "van", color: "#f7c600", accent: "#1a1a1a", hud: "#ffd84a", cpu: true,
    shirt: "#f7c600", hair: "#b0602a", hairStyle: "long", skin: "#f1c9a8", stats: { speed: 0.99, accel: 1.0, handling: 1.0, weight: 1.1 } },
  { id: "papa", name: "Sonjas Papa", car: "Mazda CX-30", type: "x4", color: "#9e1b26", accent: "#2a2c30", hud: "#ff9a3a", cpu: true,
    shirt: "#6f86b8", hair: "#b9a894", hairStyle: "short", skin: "#f0c4a6", portrait: "sprites/papa/portrait.webp", stats: { speed: 1.01, accel: 0.98, handling: 1.01, weight: 1.12 } },
  { id: "kinga", name: "Kinga", car: "Renault Espace", type: "touran", color: "#3b3e44", accent: "#c9ccd1", hud: "#c79bff", cpu: true,
    shirt: "#c8a2d8", hair: "#c49a6c", hairStyle: "long", skin: "#f2cdb0", portrait: "sprites/kinga/portrait.webp", stats: { speed: 1.0, accel: 1.03, handling: 1.02, weight: 1.04 } },
  // Aileen laeuft zu Fuss: spritziger, wird aber leichter weggerempelt
  { id: "aileen", name: "Aileen", car: "zu Fuß 🏃‍♀️", type: "hatch", color: "#8a8d92", accent: "#1d1d1f", hud: "#3fd6c0", cpu: true, foot: true,
    shirt: "#8a8d92", hair: "#4a2c1c", hairStyle: "long", skin: "#f0c8aa", portrait: "sprites/aileen/portrait.webp", stats: { speed: 0.99, accel: 1.08, handling: 1.07, weight: 0.86 } },
];

const SHAPES = {
  //        L    W    wr    body h  cabin z0  z1    cab h  taperF taperB  seat z
  sedan:  { L: 3.9, W: 2.0, wr: 0.52, h1: 0.72, c0: -1.05, c1: 0.62, ch: 0.78, tf: 0.42, tb: 0.36, sz: -0.25 },
  venga:  { L: 3.3, W: 1.95, wr: 0.52, h1: 0.84, c0: -1.45, c1: 0.85, ch: 0.98, tf: 0.5, tb: 0.1, sz: 0.0 },
  x4:     { L: 3.9, W: 2.1, wr: 0.6, h1: 0.92, c0: -1.35, c1: 0.7, ch: 0.8, tf: 0.42, tb: 0.62, sz: -0.2 },
  touran: { L: 3.85, W: 2.0, wr: 0.52, h1: 0.84, c0: -1.75, c1: 1.0, ch: 1.02, tf: 0.48, tb: 0.06, sz: 0.1 },
  hatch:  { L: 3.4, W: 1.95, wr: 0.5, h1: 0.76, c0: -1.5, c1: 0.55, ch: 0.86, tf: 0.42, tb: 0.15, sz: -0.1 },
  tuner:  { L: 3.4, W: 2.05, wr: 0.47, h1: 0.6, c0: -1.3, c1: 0.5, ch: 0.72, tf: 0.45, tb: 0.3, sz: -0.15 },
  van:    { L: 3.9, W: 2.1, wr: 0.52, h1: 0.95, c0: -1.9, c1: 0.7, ch: 1.35, tf: 0.0, tb: 0.0, sz: 0.95 },
};

function paintMat(color) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
const GLASS = new THREE.MeshPhysicalMaterial({ color: "#1c2a3a", metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.42, clearcoat: 1, depthWrite: false });
const TIRE = std("#202022", { roughness: 0.85 });
const CHROME = new THREE.MeshStandardMaterial({ color: "#e8ecf0", metalness: 1, roughness: 0.18 });
const DARK = std("#1b1c1f", { roughness: 0.7 });

function rbox(w, h, d, r, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01)), mat);
  m.position.set(x, y, z); m.castShadow = true;
  return m;
}
// Glas-Kabine mit schraegen Front-/Heckscheiben (obere Ecken verjuengt)
function cabinGeom(w, h, d, tf, tb, r) {
  const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, h / 2 - 0.01));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), z = p.getZ(i), x = p.getX(i);
    const t = (y + h / 2) / h; // 0 unten .. 1 oben
    if (z > 0) p.setZ(i, z - t * tf * d * (z / (d / 2)));
    else p.setZ(i, z + t * tb * d * (-z / (d / 2)));
    p.setX(i, x * (1 - t * 0.1));
  }
  g.computeVertexNormals();
  return g;
}

function driverFigure(d) {
  const g = new THREE.Group();
  const skin = std(d.skin, { roughness: 0.7 }), shirt = std(d.shirt), hair = std(d.hair, { roughness: 0.8 });
  const torso = rbox(0.7, 0.62, 0.48, 0.2, shirt, 0, 0.3, 0); g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), skin); head.position.y = 0.98; head.castShadow = true; g.add(head);
  const eyeW = std("#ffffff"), eyeB = std("#1a1a1a");
  for (const sx of [-0.15, 0.15]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), eyeW); e.position.set(sx, 1.02, 0.36); e.scale.set(1, 1.2, 0.6); g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), eyeB); p.position.set(sx, 1.02, 0.41); g.add(p);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12, Math.PI), std("#7a2a2a")); mouth.position.set(0, 0.88, 0.39); mouth.rotation.z = Math.PI; g.add(mouth);
  const cap = (col, s = 0.44) => { const c = new THREE.Mesh(new THREE.SphereGeometry(s, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), col); c.position.y = 1.02; c.rotation.x = -0.28; return c; };
  if (d.hairStyle === "short") g.add(cap(hair));
  if (d.hairStyle === "long") { g.add(cap(hair, 0.45)); g.add(rbox(0.78, 0.7, 0.25, 0.12, hair, 0, 0.78, -0.26)); }
  if (d.hairStyle === "pony") { g.add(cap(hair, 0.45)); const p = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), hair); p.position.set(0, 1.1, -0.48); p.scale.set(1, 1.6, 1); g.add(p); }
  if (d.hairStyle === "cap") { const a = std(d.accent); g.add(cap(a, 0.45)); g.add(rbox(0.5, 0.06, 0.34, 0.03, a, 0, 1.13, 0.4)); }
  if (d.hairStyle === "hat") { g.add(cap(hair, 0.43)); const h = std("#5a4a3a"); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.05, 24), h); b.position.y = 1.3; g.add(b); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.3, 24), h); t.position.y = 1.45; g.add(t); }
  // Lenkrad
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 20), DARK); wheel.position.set(0, 0.62, 0.42); wheel.rotation.x = -0.6; g.add(wheel);
  return g;
}

function makeWheel(r, w, rimColor) {
  const g = new THREE.Group();
  const prof = [];
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI; prof.push(new THREE.Vector2(r - 0.12 + Math.cos(a) * 0.12, Math.sin(a) * w / 2)); }
  prof.unshift(new THREE.Vector2(r * 0.55, -w / 2)); prof.push(new THREE.Vector2(r * 0.55, w / 2));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), TIRE);
  tire.rotation.z = Math.PI / 2; tire.castShadow = true; g.add(tire);
  const rimM = new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.9, roughness: 0.25 });
  for (const sx of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.06, 24), rimM);
    rim.rotation.z = Math.PI / 2; rim.position.x = sx * (w / 2 - 0.04); g.add(rim);
    for (let k = 0; k < 5; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.07, r * 1.05, 0.1), rimM);
      sp.position.x = sx * (w / 2 - 0.01); sp.rotation.x = k / 5 * Math.PI; g.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.08, 12), CHROME);
    hub.rotation.z = Math.PI / 2; hub.position.x = sx * (w / 2); g.add(hub);
  }
  return g;
}

export function makeCar(d) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const paint = paintMat(d.color);
  const accent = paintMat(d.accent);
  const lightW = new THREE.MeshStandardMaterial({ color: "#fffbe8", emissive: "#fff3c0", emissiveIntensity: 1.2 });
  const lightR = new THREE.MeshStandardMaterial({ color: "#c81a14", emissive: "#ff2010", emissiveIntensity: 0.9 });
  let kitt = null;
  let L, W, wr, seatY, seatZ, wheelZ, rearR, wheelW = 0.46;

  if (d.type === "tractor") {
    L = 3.6; W = 1.9; wr = 0.5; rearR = 1.0; wheelZ = 1.15; seatY = 1.35; seatZ = -0.75;
    body.add(rbox(1.1, 1.0, 2.3, 0.25, paint, 0, 1.15, 0.65));
    body.add(rbox(0.9, 0.5, 0.2, 0.08, DARK, 0, 1.2, 1.82));
    body.add(rbox(1.7, 0.2, 1.4, 0.08, paint, 0, 1.05, -0.95));
    const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 10), CHROME); ex.position.set(0.32, 2.2, 1.25); body.add(ex);
    for (const sx of [-0.75, 0.75]) for (const sz of [-1.55, -0.35]) body.add(rbox(0.1, 1.7, 0.1, 0.04, accent, sx, 2.05, sz));
    body.add(rbox(1.8, 0.14, 1.5, 0.06, paint, 0, 2.95, -0.95));
    for (const sx of [-0.35, 0.35]) body.add(rbox(0.28, 0.2, 0.08, 0.05, lightW, sx, 1.4, 1.82));
    // Kotfluegel hinten
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.55, 20, 1, true, 0, Math.PI), paint); f.rotation.z = Math.PI / 2; f.rotation.y = Math.PI / 2; f.position.set(sx * 1.0, 1.0, -1.15); f.material.side = THREE.DoubleSide; body.add(f); }
  } else {
    const S = SHAPES[d.type];
    L = S.L; W = S.W; wr = S.wr; rearR = wr; wheelZ = L / 2 - wr - 0.18;
    const y0 = wr * 0.75;
    // Unterbau + Karosserie
    body.add(rbox(W, S.h1, L, 0.32, paint, 0, y0 + S.h1 / 2, 0));
    body.add(rbox(W + 0.04, 0.22, L + 0.06, 0.1, DARK, 0, y0 + 0.08, 0)); // Schweller/Stossfaenger
    // Radlaeufe
    for (const sz of [wheelZ, -wheelZ]) for (const sx of [-1, 1]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(wr + 0.08, 0.1, 8, 20, Math.PI), DARK);
      arch.position.set(sx * (W / 2 + 0.01), wr, sz); arch.rotation.y = Math.PI / 2; body.add(arch);
    }
    const top = y0 + S.h1;
    const cl = S.c1 - S.c0;
    if (d.type === "van") {
      body.add(rbox(W, S.ch, cl, 0.3, paint, 0, top + S.ch / 2 - 0.05, (S.c0 + S.c1) / 2));
      const front = new THREE.Mesh(cabinGeom(W * 0.92, 0.95, 1.2, 0.45, 0, 0.25), GLASS);
      front.position.set(0, top + 0.45, S.c1 + 0.45); body.add(front);
      body.add(rbox(W * 0.92, 0.12, 0.6, 0.05, paint, 0, top + 0.92, S.c1 + 0.2));
      const post = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.55), new THREE.MeshBasicMaterial({ color: "#111" }));
      const tx = document.createElement("canvas"); tx.width = 256; tx.height = 80; const tg = tx.getContext("2d");
      tg.fillStyle = "#f7c600"; tg.fillRect(0, 0, 256, 80); tg.fillStyle = "#111"; tg.font = "bold 54px Arial"; tg.textAlign = "center"; tg.textBaseline = "middle"; tg.fillText("POST", 128, 42);
      const ttx = new THREE.CanvasTexture(tx); ttx.colorSpace = THREE.SRGBColorSpace; post.material = new THREE.MeshBasicMaterial({ map: ttx });
      for (const sx of [-1, 1]) { const p = post.clone(); p.position.set(sx * (W / 2 + 0.01), top + 0.7, -0.6); p.rotation.y = sx * Math.PI / 2; body.add(p); }
    } else {
      const cab = new THREE.Mesh(cabinGeom(W * 0.9, S.ch, cl, S.tf, S.tb, 0.28), GLASS);
      cab.position.set(0, top + S.ch / 2 - 0.06, (S.c0 + S.c1) / 2);
      body.add(cab);
      // Dach in Wagenfarbe
      const roofLen = cl * (1 - S.tf - S.tb) + 0.25;
      const roofZ = (S.c0 + S.c1) / 2 + (S.tb - S.tf) * cl / 2;
      body.add(rbox(W * 0.86, 0.13, roofLen, 0.06, paint, 0, top + S.ch - 0.06, roofZ));
    }
    // Motorhaube etwas erhaben
    body.add(rbox(W * 0.92, 0.12, Math.max(0.5, L / 2 - S.c1 - 0.1), 0.06, paint, 0, top + 0.02, (S.c1 + L / 2) / 2 - 0.05));
    // Lichter
    for (const sx of [-1, 1]) {
      body.add(rbox(0.5, 0.2, 0.08, 0.06, lightW, sx * (W / 2 - 0.36), y0 + S.h1 * 0.68, L / 2 - 0.01));
      body.add(rbox(0.5, 0.18, 0.08, 0.06, lightR, sx * (W / 2 - 0.36), y0 + S.h1 * 0.7, -L / 2 + 0.01));
      const mirror = rbox(0.24, 0.16, 0.12, 0.05, paint, sx * (W / 2 + 0.08), top + 0.25, S.c1 - 0.2); body.add(mirror);
    }
    // Kuehlergrill / Nummernschilder
    if (d.type === "x4") for (const sx of [-0.24, 0.24]) body.add(rbox(0.36, 0.34, 0.08, 0.1, CHROME, sx, y0 + S.h1 * 0.55, L / 2));
    else body.add(rbox(0.95, 0.28, 0.06, 0.05, d.type === "sedan" ? CHROME : DARK, 0, y0 + S.h1 * 0.55, L / 2));
    body.add(rbox(0.8, 0.2, 0.04, 0.02, std("#f6f6f6"), 0, y0 + 0.28, -L / 2 - 0.02));
    body.add(rbox(0.8, 0.2, 0.04, 0.02, std("#f6f6f6"), 0, y0 + 0.28, L / 2 + 0.02));
    if (d.type === "touran") for (const sx of [-0.72, 0.72]) body.add(rbox(0.08, 0.08, 2.4, 0.03, CHROME, sx, top + S.ch - 0.0, -0.35));
    if (d.type === "tuner") {
      body.add(rbox(W + 0.2, 0.08, 0.55, 0.03, accent, 0, top + 0.62, -L / 2 + 0.25));
      for (const sx of [-0.8, 0.8]) body.add(rbox(0.08, 0.5, 0.1, 0.03, accent, sx, top + 0.35, -L / 2 + 0.3));
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 14), CHROME); pipe.rotation.x = Math.PI / 2; pipe.position.set(0.5, y0 + 0.15, -L / 2 - 0.1); body.add(pipe);
    }
    if (d.kitt) {
      body.add(rbox(1.3, 0.13, 0.06, 0.03, std("#120202"), 0, y0 + 0.3, L / 2 + 0.03));
      kitt = rbox(0.24, 0.1, 0.07, 0.03, new THREE.MeshStandardMaterial({ color: "#ff2010", emissive: "#ff1a08", emissiveIntensity: 2.5 }), 0, y0 + 0.3, L / 2 + 0.05);
      body.add(kitt);
    }
    seatY = y0 + S.h1 - 0.62; seatZ = S.sz;
  }

  const drv = driverFigure(d);
  drv.position.set(d.type === "tractor" ? 0 : -0.38, seatY, seatZ);
  if (d.type === "tractor") drv.position.z = -0.95;
  drv.scale.setScalar(0.9);
  body.add(drv);

  const wheels = [];
  const spots = [[-1, wheelZ, wr], [1, wheelZ, wr], [-1, -wheelZ, rearR], [1, -wheelZ, rearR]];
  for (const [sx, z, r] of spots) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * (W / 2 - 0.08), r, z);
    const wh = makeWheel(r, r > 0.8 ? 0.6 : wheelW, d.type === "tractor" ? "#f0c42a" : d.type === "tuner" ? "#222" : "#cfd4da");
    pivot.add(wh);
    root.add(pivot);
    wheels.push({ pivot, wh, front: z > 0, r });
  }

  const sh = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.35, L * 1.15), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0.8 }));
  sh.rotation.x = -Math.PI / 2;
  sh.renderOrder = 8;

  let kt = 0;
  return {
    root, body, wheels, L, W, shadow: sh,
    update(dt, speed, steer) {
      for (const w of wheels) { w.wh.rotation.x += speed * dt / w.r; if (w.front) w.pivot.rotation.y = steer * 0.45; }
      if (kitt) { kt += dt * 3.2; kitt.position.x = Math.sin(kt) * 0.5; }
    },
  };
}
