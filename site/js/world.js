import * as THREE from "three";
import { mergeGeometries } from "../vendor/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "../vendor/RoundedBoxGeometry.js";
import { T } from "./tex.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const WALLS = ["#f4efe4", "#f1e6cf", "#f6eedb", "#efe0bd", "#f3dcc4", "#e9e4da", "#f2e9d6", "#ece2c8", "#f7f3ea", "#e8d7b4"];
const ROOFS = ["#a8452b", "#9a3d26", "#b4532f", "#8f3a26", "#a24a30", "#7d3624", "#b65f3a", "#4c4e53", "#5a3a2e"];
const BIZWALL = ["#e3e0d8", "#d2d0c9", "#c9cdd2", "#e6e2d6", "#bfc6cc"];
const RENAME = { "McDonald's": "Mäcces", "Aldi Süd": "ALDI", "Rewe": "REWE", "Rathaus Schemmerhofen": "Rathaus" };
const SIGNCOL = {
  bakery: ["#c8862a", "#fff"], butcher: ["#9e2b25", "#fff"], pharmacy: ["#c8102e", "#fff"], townhall: ["#3b2a1e", "#e8c46a"],
  bank: ["#1f4e8c", "#fff"], fast_food: ["#c8102e", "#ffc72c"], fuel: ["#f7d117", "#d0281e"], supermarket: ["#173f8a", "#ffd200"],
  beverages: ["#c8102e", "#fff"], car: ["#222", "#ddd"], restaurant: ["#3c5a2a", "#fff"], hairdresser: ["#7a3b6b", "#fff"],
  school: ["#2f5d50", "#fff"], library: ["#4a3b7a", "#fff"], sports_hall: ["#1f6e8c", "#fff"], doctors: ["#ffffff", "#1b6e3a"],
  car_wash: ["#1b78c2", "#fff"], garden_centre: ["#2e7d32", "#fff"], tyres: ["#222", "#ffcc00"], clothes: ["#5a2a6a", "#fff"],
  variety_store: ["#e30613", "#fff"], kiosk: ["#1a5a9a", "#fff"],
};

const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
const po = (n) => ({ polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n * 4 });

// Band entlang einer Polylinie; y = Zahl oder Hoehen pro Punkt
export function ribbon(pts, w, y, { closed = false, vScale = 0.1, from = -0.5, to = 0.5, dy = 0 } = {}) {
  const n = pts.length, m = closed ? n + 1 : n;
  const pos = new Float32Array(m * 6), uv = new Float32Array(m * 4);
  const perPoint = typeof y !== "number";
  let s = 0;
  for (let k = 0; k < m; k++) {
    const i = k % n;
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    let tx, tz;
    if (!closed && k === 0) { tx = c[0] - b[0]; tz = c[1] - b[1]; }
    else if (!closed && k === n - 1) { tx = b[0] - a[0]; tz = b[1] - a[1]; }
    else { tx = c[0] - a[0]; tz = c[1] - a[1]; }
    const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    const rx = -tz, rz = tx;
    if (k > 0) { const p = pts[(k - 1) % n]; s += Math.hypot(b[0] - p[0], b[1] - p[1]); }
    const yy = (perPoint ? y[i] : y) + dy;
    pos.set([b[0] + rx * w * from, yy, b[1] + rz * w * from, b[0] + rx * w * to, yy, b[1] + rz * w * to], k * 6);
    uv.set([0, s * vScale, 1, s * vScale], k * 4);
  }
  const idx = [];
  for (let k = 0; k < m - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const j = (i + 1) % p.length; a += p[i][0] * p[j][1] - p[j][0] * p[i][1]; } return a / 2; }
function centroid(p) { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; }
function inPoly(x, z, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi) ins = !ins;
  }
  return ins;
}
function colorize(g, color) {
  const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}
function flatPoly(poly, y) {
  const shape = new THREE.Shape(poly.map(p => new THREE.Vector2(p[0], -p[1])));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  return g;
}

// Kleinstes umschliessendes Rechteck (fuer Satteldaecher)
function orientedRect(poly) {
  let best = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    let ux = b[0] - a[0], uz = b[1] - a[1]; const L = Math.hypot(ux, uz); if (L < 0.5) continue; ux /= L; uz /= L;
    const vx = -uz, vz = ux;
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const p of poly) { const u = p[0] * ux + p[1] * uz, v = p[0] * vx + p[1] * vz; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) best = { area, ux, uz, vx, vz, u0, u1, v0, v1 };
  }
  return best;
}

// ---------- Fassaden-Texturen
function facadeTex(shutters) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  g.fillStyle = "#e4ded2"; g.fillRect(0, 124, 128, 4);
  // Fenster mit Rahmen
  g.fillStyle = "#fbfbf8"; g.fillRect(40, 30, 48, 62);
  const sky = g.createLinearGradient(0, 34, 0, 88); sky.addColorStop(0, "#9fc3dc"); sky.addColorStop(1, "#3c5a72");
  g.fillStyle = sky; g.fillRect(45, 35, 18, 52); g.fillRect(65, 35, 18, 52);
  g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(47, 37, 4, 20); g.fillRect(67, 37, 4, 20);
  g.fillStyle = "#d8d2c4"; g.fillRect(37, 92, 54, 5);
  if (shutters) { g.fillStyle = shutters; g.fillRect(24, 30, 15, 62); g.fillRect(89, 30, 15, 62); g.fillStyle = "rgba(0,0,0,0.18)"; for (let y = 34; y < 90; y += 6) { g.fillRect(25, y, 13, 2); g.fillRect(90, y, 13, 2); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function roughTex(kind) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#f0f0f0"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#1a1a1a";
  if (kind === "office") g.fillRect(6, 34, 116, 56); else { g.fillRect(45, 35, 18, 52); g.fillRect(65, 35, 18, 52); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function officeTex() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 128);
  const gl = g.createLinearGradient(0, 30, 0, 100); gl.addColorStop(0, "#a9cbe0"); gl.addColorStop(1, "#4a6a82");
  g.fillStyle = gl; g.fillRect(6, 34, 116, 56);
  g.fillStyle = "#e9e9e9"; for (let x = 6; x < 122; x += 29) g.fillRect(x, 34, 3, 56);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function tileTex() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) {
    g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(0, y + 12, 128, 4);
    for (let x = (y / 16) % 2 * 8; x < 128; x += 16) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x, y, 2, 16); g.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; g.fillRect(x + 2, y, 14, 12); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// ---------- Gebaeude
function buildingGeoms(b, groundAt) {
  let poly = b.p.slice();
  if (poly.length < 3) return null;
  if (polyArea(poly) < 0) poly.reverse();
  const area = Math.abs(polyArea(poly));
  if (area < 6) return null;
  let base = 1e9, top = -1e9;
  for (const [x, z] of poly) { const h = groundAt(x, z); base = Math.min(base, h); top = Math.max(top, h); }
  const hgt = Math.max(3, b.h);
  const big = area > 420 || ["industrial", "retail", "commercial", "supermarket", "school", "garage", "garages", "warehouse", "car", "sports_hall", "doityourself", "fast_food", "fuel"].includes(b.k);
  const y0 = base - 1.5, y1 = top + hgt;
  const pos = [], uv = [], idx = [];
  let per = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], c = poly[(i + 1) % poly.length];
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const k = pos.length / 3;
    pos.push(a[0], y0, a[1], c[0], y0, c[1], c[0], y1, c[1], a[0], y1, a[1]);
    uv.push(per / 3, (y0 - top) / 3, (per + L) / 3, (y0 - top) / 3, (per + L) / 3, (y1 - top) / 3, per / 3, (y1 - top) / 3);
    idx.push(k, k + 2, k + 1, k, k + 3, k + 2);
    per += L;
  }
  const walls = new THREE.BufferGeometry();
  walls.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  walls.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  walls.setIndex(idx); walls.computeVertexNormals();

  const [cx, cz] = centroid(poly);
  let roof = null, gables = null, chimney = null;
  const R = orientedRect(poly);
  if (big || !R) {
    roof = flatPoly(poly, y1);
    const pu = roof.attributes.position, ru = new Float32Array(pu.count * 2);
    for (let i = 0; i < pu.count; i++) { ru[i * 2] = pu.getX(i) * 0.3; ru[i * 2 + 1] = pu.getZ(i) * 0.3; }
    roof.setAttribute("uv", new THREE.BufferAttribute(ru, 2));
  } else {
    // Satteldach ueber dem Rechteck, First entlang der langen Seite
    let { ux, uz, vx, vz, u0, u1, v0, v1 } = R;
    if (u1 - u0 < v1 - v0) { [ux, uz, vx, vz] = [vx, vz, -ux, -uz]; [u0, u1, v0, v1] = [v0, v1, -u1, -u0]; }
    const ov = 0.45;
    u0 -= ov; u1 += ov; v0 -= ov; v1 += ov;
    const half = (v1 - v0) / 2, vm = (v0 + v1) / 2;
    const pitch = rnd(0.75, 1.0);
    const rh = Math.min(half * pitch, 6.5);
    const P = (u, v, y) => [u * ux + v * vx, y, u * uz + v * vz];
    const ye = y1 - 0.25;
    const A = P(u0, v0, ye), B = P(u1, v0, ye), C = P(u1, v1, ye), D = P(u0, v1, ye);
    const E = P(u0, vm, y1 + rh), F = P(u1, vm, y1 + rh);
    const rp = [...A, ...B, ...F, ...E, ...C, ...D, ...E, ...F];
    const slopeL = Math.hypot(half, rh);
    const lu = (u1 - u0) / 2;
    const ruv = [0, 0, lu, 0, lu, slopeL / 2, 0, slopeL / 2, 0, 0, lu, 0, lu, slopeL / 2, 0, slopeL / 2];
    roof = new THREE.BufferGeometry();
    roof.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3));
    roof.setAttribute("uv", new THREE.Float32BufferAttribute(ruv, 2));
    roof.setIndex([0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6]);
    roof.computeVertexNormals();
    // Giebeldreiecke (in Wandfarbe) - leicht nach innen, damit kein Ueberstand sichtbar wird
    const gi = ov + 0.02;
    const G0a = P(u0 + gi, v0 + gi, y1), G0b = P(u0 + gi, v1 - gi, y1), G0c = P(u0 + gi, vm, y1 + rh * ((half - gi) / half));
    const G1a = P(u1 - gi, v1 - gi, y1), G1b = P(u1 - gi, v0 + gi, y1), G1c = P(u1 - gi, vm, y1 + rh * ((half - gi) / half));
    gables = new THREE.BufferGeometry();
    gables.setAttribute("position", new THREE.Float32BufferAttribute([...G0a, ...G0b, ...G0c, ...G1a, ...G1b, ...G1c], 3));
    gables.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 0.5, 0, 0, 1, 0, 0.5, 0.5], 2));
    gables.setIndex([0, 2, 1, 3, 5, 4]);
    gables.computeVertexNormals();
    // ehrlich gesagt: Giebel auch von innen zeichnen ist nicht noetig
    if (Math.random() < 0.45) {
      const cu = u0 + (u1 - u0) * rnd(0.25, 0.75), cv = vm + half * 0.45 * (Math.random() < 0.5 ? -1 : 1);
      const [x, , z] = P(cu, cv, 0);
      chimney = new THREE.BoxGeometry(0.6, 1.6, 0.6);
      chimney.translate(x, y1 + rh * 0.55 + 0.4, z);
    }
  }
  return { walls, roof, gables, chimney, big, h: hgt, base, top: y1, poly, cx, cz };
}

// Senkrechte Wand entlang einer Linie mit seitlichem Versatz (Hoehen pro Punkt)
export function wall(pts, off, hs, y0, y1) {
  const n = pts.length, pos = [], idx = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(n - 1, i + 1)], b = pts[i];
    let tx = c[0] - a[0], tz = c[1] - a[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    const x = b[0] - tz * off, z = b[1] + tx * off, h = hs ? hs[i] : 0;
    pos.push(x, h + y0, z, x, h + y1, z);
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------- Boden als Karte malen
function paintMap(data, ext, size, style) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d");
  const sx = size / ext.w, sz = size / ext.h;
  const X = (x) => (x - ext.x0) * sx, Z = (z) => (z - ext.z0) * sz;
  const path = (p, close = true) => { g.beginPath(); p.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); if (close) g.closePath(); };
  // Grundwiese mit Flecken
  g.fillStyle = style === "lake" ? "#8dbd57" : "#80bb4f"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "40,90,20" : "200,230,120"},${Math.random() * 0.08})`; const r = rnd(4, 26); g.beginPath(); g.arc(Math.random() * size, Math.random() * size, r, 0, 7); g.fill(); }
  const pattern = (col, stripe, w = 8, ang = 0) => {
    const p = document.createElement("canvas"); p.width = p.height = 32; const pg = p.getContext("2d");
    pg.fillStyle = col; pg.fillRect(0, 0, 32, 32); pg.fillStyle = stripe; for (let i = 0; i < 32; i += w) pg.fillRect(i, 0, w / 2, 32);
    const pt = g.createPattern(p, "repeat"); pt.setTransform(new DOMMatrix().rotate(ang).scale(sx * 0.45)); return pt;
  };
  const AREA = {
    farmland: () => pick([pattern("#e2c862", "#d6b950"), pattern("#a6c95a", "#98bb4e"), pattern("#b68b58", "#a67c4b"), pattern("#ecd94a", "#e0cc3c"), pattern("#9cc055", "#8fb24a")]),
    meadow: () => "#8bc35a", grass: () => "#8cc65c", grassland: () => "#8bc35a", village_green: () => "#8cc65c", park: () => "#84c258",
    recreation_ground: () => "#86c35a", forest: () => "#3d7633", wood: () => "#3f7a35", scrub: () => "#6e9845", heath: () => "#8a9a5a",
    orchard: () => "#8fc25c", residential: () => "#93c868", commercial: () => "#bcb7ad", retail: () => "#c2bcb2", industrial: () => "#b0aba2",
    school: () => "#b9b4aa", parking: () => "#8c8e92", pitch: () => pattern("#4caf4a", "#44a242", 10), cemetery: () => "#7fae66", garden: () => "#8cc65c",
    playground: () => "#dcc894", allotments: () => "#8fb85c", quarry: () => "#cdbb92", farmyard: () => "#b9a47e", beach: () => "#e8d49e", sand: () => "#e8d49e",
  };
  const LAYER = { farmland: 0, meadow: 1, grassland: 1, forest: 2, wood: 2, scrub: 2, heath: 2, orchard: 2, residential: 3, commercial: 4, retail: 4, industrial: 4, school: 4,
    farmyard: 4, quarry: 4, park: 5, grass: 5, village_green: 5, recreation_ground: 5, cemetery: 5, allotments: 5, garden: 5, pitch: 6, playground: 6, parking: 7, beach: 7, sand: 7 };
  const areas = data.areas.filter(a => AREA[a.k]).sort((a, b) => (LAYER[a.k] ?? 3) - (LAYER[b.k] ?? 3));
  for (const a of areas) {
    path(a.p); g.fillStyle = AREA[a.k](); g.fill();
    if (a.k === "parking") {
      g.save(); path(a.p); g.clip();
      g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = Math.max(1, 0.15 * sx);
      const [cx, cz] = centroid(a.p);
      for (let k = -40; k <= 40; k++) { g.beginPath(); g.moveTo(X(cx + k * 2.6), Z(cz - 60)); g.lineTo(X(cx + k * 2.6), Z(cz + 60)); g.stroke(); }
      g.restore();
    }
    if (a.k === "farmland" || a.k === "meadow") { path(a.p); g.strokeStyle = "rgba(60,90,30,0.35)"; g.lineWidth = 2 * sx; g.stroke(); }
  }
  // Wasser
  g.fillStyle = "#3f8fc6";
  for (const w of data.water) { path(w); g.fill(); }
  g.lineCap = "round"; g.lineJoin = "round";
  for (const w of data.waterways) {
    path(w.p, false); g.strokeStyle = "#5a8a3a"; g.lineWidth = (w.k === "river" ? 12 : 5.5) * sx; g.stroke();
    path(w.p, false); g.strokeStyle = "#3f8fc6"; g.lineWidth = (w.k === "river" ? 9 : 3.4) * sx; g.stroke();
  }
  // Bahn
  for (const r of data.rails) { path(r, false); g.strokeStyle = "#8a7c6c"; g.lineWidth = 3.5 * sx; g.stroke(); path(r, false); g.strokeStyle = "#4a4440"; g.lineWidth = 0.6 * sx; g.setLineDash([0.3 * sx, 0.9 * sx]); g.stroke(); g.setLineDash([]); }
  // Wege
  for (const r of data.roads) if (r.k === "path") { path(r.p, false); g.strokeStyle = style === "lake" ? "#d8c79c" : "#d7cdb7"; g.lineWidth = 2.2 * sx; g.stroke(); }
  // Strassen: Gehweg, Asphalt, Mittellinie
  if (style !== "lake") for (const r of data.roads) if (r.k === "road") { path(r.p, false); g.strokeStyle = "#cfc8ba"; g.lineWidth = 9.5 * sx; g.stroke(); }
  for (const r of data.roads) if (r.k === "road") { path(r.p, false); g.strokeStyle = style === "lake" ? "#bfae86" : "#65686d"; g.lineWidth = 6.2 * sx; g.stroke(); }
  if (style !== "lake") for (const r of data.roads) if (r.k === "road") { path(r.p, false); g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 0.15 * sx; g.setLineDash([3 * sx, 4 * sx]); g.stroke(); g.setLineDash([]); }
  // Gebaeude-Kontaktschatten
  g.fillStyle = "rgba(0,0,0,0.25)";
  for (const b of data.buildings) { path(b.p); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// Detail-Rauschen fuer den Boden aus der Naehe
function detailMaterial(map) {
  const m = new THREE.MeshLambertMaterial({ map });
  const det = T.grass().clone(); det.needsUpdate = true;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.detailMap = { value: det };
    sh.fragmentShader = "uniform sampler2D detailMap;\n" + sh.fragmentShader.replace("#include <map_fragment>",
      `#include <map_fragment>
       vec3 dt = texture2D(detailMap, vMapUv * 260.0).rgb;
       diffuseColor.rgb *= 0.72 + 0.56 * dot(dt, vec3(0.333));`);
  };
  return m;
}

export function buildWorld(scene, track, data, extra, quality) {
  const anim = [];
  const group = new THREE.Group();
  scene.add(group);
  const half = track.half;
  const style = extra.style || "town";
  const H = (x, z) => track.heightAt(x, z);
  const addMerged = (arr, material, { ro = 0, cast = false, recv = true } = {}) => {
    arr = arr.filter(Boolean);
    if (!arr.length) return null;
    const m = new THREE.Mesh(mergeGeometries(arr, false), material);
    m.renderOrder = ro; m.castShadow = cast; m.receiveShadow = recv;
    group.add(m);
    return m;
  };

  // ---------- Gelaende
  const TR = track.terrain;
  const ext = { x0: TR.x0, z0: TR.z0, w: (TR.nx - 1) * TR.step, h: (TR.nz - 1) * TR.step };
  {
    const geo = new THREE.BufferGeometry();
    const nx = TR.nx, nz = TR.nz;
    const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      pos.set([TR.x0 + i * TR.step, TR.h[k], TR.z0 + j * TR.step], k * 3);
      uv.set([i / (nx - 1), 1 - j / (nz - 1)], k * 2);
    }
    const idx = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1); }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const tex = paintMap(data, ext, 4096, style);
    tex.flipY = true;
    const terrain = new THREE.Mesh(geo, detailMaterial(tex));
    terrain.receiveShadow = true;
    group.add(terrain);
    // Aussenring bis zum Horizont
    const ring = new THREE.Mesh(new THREE.RingGeometry(Math.max(ext.w, ext.h) * 0.45, 3000, 48, 1), lam(style === "lake" ? "#8dbd57" : "#80bb4f"));
    ring.rotation.x = -Math.PI / 2; ring.position.set(ext.x0 + ext.w / 2, Math.min(...TR.h.slice(0, 50)) - 0.6, ext.z0 + ext.h / 2);
    group.add(ring);
  }
  // Seen als glaenzende Flaechen
  for (const w of data.water) {
    if (Math.abs(polyArea(w)) < 400) continue;
    let lvl = 1e9; for (const [x, z] of w) lvl = Math.min(lvl, H(x, z));
    try {
      const m = new THREE.Mesh(flatPoly(w, lvl + 0.25), new THREE.MeshStandardMaterial({ color: "#2f86c0", roughness: 0.08, metalness: 0.1, ...po(2) }));
      m.receiveShadow = true; group.add(m);
    } catch (e) {}
  }

  // ---------- Strecke
  const line = data.line, hs = track.h;
  const isDirt = style === "lake";
  const road = new THREE.Mesh(ribbon(line, track.W, hs, { closed: true, vScale: 0.08, dy: 0.12 }), isDirt ? lam("#d6c39a", { map: T.dirt(), ...po(8) })
    : new THREE.MeshStandardMaterial({ color: "#ffffff", map: T.asphalt(), roughnessMap: T.asphaltRough(), roughness: 1, metalness: 0, envMapIntensity: 0.6, ...po(8) }));
  road.renderOrder = 4; road.receiveShadow = true; group.add(road);
  const bandW = 3.4;
  const bandMat = lam("#ffffff", { map: isDirt ? T.sand() : T.pavement(), ...po(6) });
  for (const side of [-1, 1]) {
    const g = ribbon(line, 1, hs, { closed: true, vScale: 0.3, dy: side ? 0.16 : 0.16, from: side > 0 ? half : -half - bandW, to: side > 0 ? half + bandW : -half });
    const m = new THREE.Mesh(g, bandMat); m.renderOrder = 3; m.receiveShadow = true; group.add(m);
    if (!isDirt) { // Bordstein
      const curb = new THREE.Mesh(wall(line, side * (half + 0.02), hs, 0.08, 0.18), lam("#dad6cc", { side: THREE.DoubleSide }));
      group.add(curb);
    }
  }
  if (!isDirt) {
    const lineMat = lam("#f6f6f0", { ...po(10) });
    const marks = [ribbon(line, 1, hs, { closed: true, from: -half + 0.45, to: -half + 0.75, dy: 0.13 }), ribbon(line, 1, hs, { closed: true, from: half - 0.75, to: half - 0.45, dy: 0.13 })];
    let run = [], rh = [];
    for (let i = 0; i < track.n; i++) {
      if (Math.floor(track.s[i] / 5) % 2 === 0) { run.push(line[i]); rh.push(hs[i]); }
      else if (run.length) { if (run.length > 1) marks.push(ribbon(run, 0.3, rh, { dy: 0.13 })); run = []; rh = []; }
    }
    addMerged(marks, lineMat, { ro: 5 });
  }
  { // Curbs in engen Kurven
    const c = document.createElement("canvas"); c.width = 16; c.height = 64; const g = c.getContext("2d");
    g.fillStyle = "#d8261e"; g.fillRect(0, 0, 16, 32); g.fillStyle = "#fafafa"; g.fillRect(0, 32, 16, 32);
    const ct = new THREE.CanvasTexture(c); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.colorSpace = THREE.SRGBColorSpace;
    const curbs = []; let run = [], rh = [];
    const flush = () => { if (run.length > 4) for (const sd of [-1, 1]) curbs.push(ribbon(run, 1, rh, { vScale: 0.45, dy: 0.14, from: sd > 0 ? half - 0.7 : -half - 0.1, to: sd > 0 ? half + 0.1 : -half + 0.7 })); run = []; rh = []; };
    for (let i = 0; i < track.n; i++) {
      let cs = 0; for (let k = -3; k <= 3; k++) cs += Math.abs(track.curv[(i + k + track.n) % track.n]);
      if (cs / 7 > 0.03) { run.push(line[i]); rh.push(hs[i]); } else flush();
    }
    flush();
    addMerged(curbs, lam("#fff", { map: ct, ...po(12) }), { ro: 6 });
  }
  { // Start/Ziel + Bogen
    const p = track.at(0);
    const g = new THREE.PlaneGeometry(track.W, 2.4); g.rotateX(-Math.PI / 2);
    const t = T.checker().clone(); t.needsUpdate = true; t.repeat.set(track.W / 1.2, 2);
    const m = new THREE.Mesh(g, lam("#fff", { map: t, ...po(14) }));
    m.position.set(p.x, p.y + 0.15, p.z); m.rotation.y = p.heading; m.renderOrder = 7; group.add(m);
    const arch = new THREE.Group();
    const postM = std("#2a2d33", { metalness: 0.4, roughness: 0.4 });
    for (const sd of [-1, 1]) { const post = new THREE.Mesh(new RoundedBoxGeometry(0.7, 7.5, 0.7, 2, 0.2), postM); post.position.set(sd * (half + 1.6), 3.75, 0); post.castShadow = true; arch.add(post); }
    const banner = new THREE.Mesh(new RoundedBoxGeometry(track.W + 4, 1.8, 0.5, 2, 0.15), [postM, postM, postM, postM, lam("#fff", { map: T.sign("DS-KART  ·  Danke Sonja Kart", "#16181d", "#ffd23a") }), lam("#fff", { map: T.sign("DS-KART  ·  Danke Sonja Kart", "#16181d", "#ffd23a") })]);
    banner.position.y = 7.4; banner.castShadow = true; arch.add(banner);
    arch.position.set(p.x, p.y, p.z); arch.rotation.y = p.heading;
    group.add(arch);
  }

  // ---------- Begrenzung: Hecken, Zaeune, Mauern (Dorf) oder Heuballen (See)
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3(), V3 = new THREE.Vector3(), E = new THREE.Euler(), C = new THREE.Color();
  {
    const items = { hedge: [], fence: [], wallS: [], bale: [] };
    const step = 2.6;
    let next = 0;
    for (let i = 0; i < track.n; i++) {
      if (track.s[i] < next) continue;
      next = track.s[i] + step;
      const head = Math.atan2(track.tx[i], track.tz[i]);
      for (const side of [-1, 1]) {
        if (side > 0 ? track.openR[i] : track.openL[i]) continue;
        const off = side * (track.edge + 0.35);
        const x = track.px[i] - track.tz[i] * off, z = track.pz[i] + track.tx[i] * off;
        const y = hs[i];
        if (isDirt) { items.bale.push([x, y, z, head]); continue; }
        const sec = Math.floor(track.s[i] / 45 + (side > 0 ? 0.5 : 0)) % 4;
        (sec === 0 || sec === 2 ? items.hedge : sec === 1 ? items.fence : items.wallS).push([x, y, z, head]);
      }
    }
    const inst = (geo, mat, list, color) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach(([x, y, z, h], k) => { E.set(0, h, 0); Q.setFromEuler(E); V3.set(x, y, z); S3.set(1, rnd(0.92, 1.1), 1); M4.compose(V3, Q, S3); im.setMatrixAt(k, M4); if (color) im.setColorAt(k, C.set(color())); });
      im.castShadow = true; im.receiveShadow = true;
      group.add(im);
    };
    const hedgeG = new RoundedBoxGeometry(0.95, 1.25, 2.75, 2, 0.35); hedgeG.translate(0, 0.62, 0);
    inst(hedgeG, std("#ffffff", { roughness: 1 }), items.hedge, () => pick(["#3f7a30", "#477f34", "#3a7029", "#4d8a38"]));
    const fenceParts = [];
    const post = new THREE.BoxGeometry(0.12, 1.05, 0.12);
    for (const z of [-1.3, 0]) { const p = post.clone(); p.translate(0, 0.52, z); fenceParts.push(p); }
    for (let k = -1.15; k < 1.3; k += 0.32) { const p = new THREE.BoxGeometry(0.05, 0.9, 0.12); p.translate(0, 0.5, k); fenceParts.push(p); }
    for (const y of [0.3, 0.8]) { const r = new THREE.BoxGeometry(0.06, 0.09, 2.6); r.translate(0, y, 0); fenceParts.push(r); }
    inst(mergeGeometries(fenceParts), std("#f2efe8", { roughness: 0.8 }), items.fence);
    const wallG = new RoundedBoxGeometry(0.6, 0.85, 2.62, 1, 0.08); wallG.translate(0, 0.42, 0);
    inst(wallG, std("#ffffff", { roughness: 0.95 }), items.wallS, () => pick(["#c9bfae", "#bdb3a2", "#d2c8b6"]));
    const baleG = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 16); baleG.rotateZ(Math.PI / 2); baleG.translate(0, 0.8, 0);
    inst(baleG, std("#e2c45e", { roughness: 1 }), items.bale);
  }
  // Strassenlaternen
  if (!isDirt) {
    const spots = [];
    let side = 1;
    for (let i = 0, next = 10; i < track.n; i++) {
      if (track.s[i] < next) continue;
      next = track.s[i] + 34; side = -side;
      if (side > 0 ? track.openR[i] : track.openL[i]) continue;
      const off = side * (half + bandW - 0.5);
      spots.push([track.px[i] - track.tz[i] * off, hs[i], track.pz[i] + track.tx[i] * off, Math.atan2(track.tx[i], track.tz[i]) + (side > 0 ? -Math.PI / 2 : Math.PI / 2)]);
    }
    const pole = new THREE.CylinderGeometry(0.09, 0.13, 6, 8); pole.translate(0, 3, 0);
    const arm = new THREE.BoxGeometry(0.08, 0.08, 1.4); arm.translate(0, 5.95, 0.65);
    const head = new RoundedBoxGeometry(0.42, 0.18, 0.75, 1, 0.06); head.translate(0, 5.85, 1.3);
    const poleM = std("#5d636b", { metalness: 0.5, roughness: 0.45 });
    for (const [geo, mat] of [[mergeGeometries([pole, arm]), poleM], [head, std("#dfe3e6", { emissive: "#fff2c0", emissiveIntensity: 0.25 })]]) {
      const im = new THREE.InstancedMesh(geo, mat, spots.length);
      spots.forEach(([x, y, z, h], k) => { E.set(0, h, 0); Q.setFromEuler(E); V3.set(x, y, z); S3.set(1, 1, 1); M4.compose(V3, Q, S3); im.setMatrixAt(k, M4); });
      im.castShadow = true; group.add(im);
    }
  }

  // ---------- Blumenbeete auf dem Gruenstreifen
  {
    const dens = (quality && quality.extras) || 1;
    const spots = [];
    for (let i = 0, next = 6; i < track.n; i++) {
      if (track.s[i] < next) continue;
      next = track.s[i] + 6 / dens;
      if (Math.random() < 0.45) continue;
      const side = Math.random() < 0.5 ? -1 : 1;
      if (side > 0 ? track.openR[i] : track.openL[i]) continue;
      const off = side * (half + bandW + rnd(0.6, 1.6));
      spots.push([track.px[i] - track.tz[i] * off, hs[i], track.pz[i] + track.tx[i] * off]);
    }
    if (spots.length) {
      const leafG = new THREE.IcosahedronGeometry(0.55, 1); leafG.scale(1.3, 0.55, 1.3); leafG.translate(0, 0.25, 0);
      const bloomG = new THREE.IcosahedronGeometry(0.16, 0); bloomG.translate(0, 0.55, 0);
      const leaves = new THREE.InstancedMesh(leafG, std("#ffffff", { flatShading: true }), spots.length);
      const blooms = new THREE.InstancedMesh(bloomG, std("#ffffff", { flatShading: true, roughness: 0.6 }), spots.length * 6);
      const COLS = ["#ff4d6d", "#ffd23a", "#ffffff", "#c86bff", "#ff8a3d", "#ff7ad9"];
      let bi = 0;
      spots.forEach(([x, y, z], k) => {
        E.set(0, Math.random() * 6, 0); Q.setFromEuler(E); S3.set(1, 1, 1); V3.set(x, y, z); M4.compose(V3, Q, S3);
        leaves.setMatrixAt(k, M4); leaves.setColorAt(k, C.setHSL(rnd(0.25, 0.33), 0.6, rnd(0.28, 0.36)));
        const col = pick(COLS);
        for (let j = 0; j < 6; j++) {
          V3.set(x + rnd(-0.55, 0.55), y + rnd(-0.05, 0.12), z + rnd(-0.55, 0.55)); M4.compose(V3, Q, S3);
          blooms.setMatrixAt(bi, M4); blooms.setColorAt(bi++, C.set(Math.random() < 0.8 ? col : pick(COLS)));
        }
      });
      leaves.receiveShadow = true; blooms.castShadow = true;
      group.add(leaves, blooms);
    }
  }

  // ---------- Gebaeude
  const blds = [];
  const geo = { plain: [], shut: [], office: [], roof: [], flat: [], gable: [], chim: [] };
  const bGrid = new Map();
  const shutterCol = pick(["#3f6e3a", "#7a4a2a", "#3a5a7a"]);
  for (const b of data.buildings) {
    const r = buildingGeoms(b, H);
    if (!r) continue;
    const special = extra.buildingStyle && extra.buildingStyle(b);
    const wc = special?.wall || (r.big ? pick(BIZWALL) : pick(WALLS));
    const rc = special?.roof || (r.big ? pick(["#7e7f7c", "#8c8c88", "#6f716f", "#9a9a95"]) : pick(ROOFS));
    colorize(r.walls, wc); colorize(r.roof, rc);
    { const pa = r.walls.attributes.position, ca = r.walls.attributes.color;
      for (let i = 0; i < pa.count; i++) if (pa.getY(i) < r.base) ca.setXYZ(i, ca.getX(i) * 0.58, ca.getY(i) * 0.58, ca.getZ(i) * 0.6); }
    if (r.gables) colorize(r.gables, wc);
    if (r.chimney) colorize(r.chimney, "#8a5a44");
    (r.big ? geo.office : Math.random() < 0.35 ? geo.shut : geo.plain).push(r.walls);
    (r.gables ? geo.roof : geo.flat).push(r.roof);
    if (r.gables) geo.gable.push(r.gables);
    if (r.chimney) geo.chim.push(r.chimney);
    blds.push({ ...r, b });
    const k = Math.floor(r.cx / 20) + "," + Math.floor(r.cz / 20);
    if (!bGrid.has(k)) bGrid.set(k, []);
    bGrid.get(k).push(r.poly);
  }
  const wallMat = (map, kind) => new THREE.MeshStandardMaterial({ vertexColors: true, map, roughnessMap: roughTex(kind), roughness: 1, metalness: 0, envMapIntensity: 1.1 });
  addMerged(geo.plain, wallMat(facadeTex(null), "house"), { cast: true });
  addMerged(geo.shut, wallMat(facadeTex(shutterCol), "house"), { cast: true });
  addMerged(geo.office, wallMat(officeTex(), "office"), { cast: true });
  addMerged(geo.gable, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { cast: true });
  addMerged(geo.roof, new THREE.MeshStandardMaterial({ vertexColors: true, map: tileTex(), side: THREE.DoubleSide, roughness: 0.72, metalness: 0 }), { cast: true });
  addMerged(geo.flat, new THREE.MeshLambertMaterial({ vertexColors: true }), { cast: true });
  addMerged(geo.chim, new THREE.MeshLambertMaterial({ vertexColors: true }), { cast: true });
  const inBuilding = (x, z) => { const arr = bGrid.get(Math.floor(x / 20) + "," + Math.floor(z / 20)); return arr ? arr.some(p => inPoly(x, z, p)) : false; };

  // Schilder an benannten Gebaeuden
  for (const bl of blds) {
    const b = bl.b;
    if (!b.n || b.n === "shelter") continue;
    const text = RENAME[b.n] || b.n;
    const [bg, fg] = SIGNCOL[b.k] || ["#2b4a7a", "#ffffff"];
    let best = null;
    for (let i = 0; i < bl.poly.length; i++) {
      const a = bl.poly[i], c = bl.poly[(i + 1) % bl.poly.length];
      const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
      const q = track.nearestAll(mx, mz);
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const score = q.dist - L * 0.5;
      if (!best || score < best.score) best = { score, a, c, mx, mz, L };
    }
    if (!best || best.score > 140) continue;
    const t = T.sign(text, bg, fg, { font: "bold 60px Arial, sans-serif" });
    const asp = t.userData.aspect;
    let w = Math.min(best.L * 0.9, Math.max(3, text.length * 0.55)), hgt = w / asp;
    if (hgt > 1.5) { hgt = 1.5; w = hgt * asp; }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), new THREE.MeshBasicMaterial({ map: t }));
    const dx = best.c[0] - best.a[0], dz = best.c[1] - best.a[1];
    let nx = dz, nz = -dx; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    if ((best.mx + nx - bl.cx) * nx + (best.mz + nz - bl.cz) * nz < 0) { nx = -nx; nz = -nz; }
    const gy = H(best.mx, best.mz);
    sign.position.set(best.mx + nx * 0.06, Math.min(bl.top - hgt / 2 - 0.4, gy + 3.4), best.mz + nz * 0.06);
    sign.rotation.y = Math.atan2(nx, nz);
    group.add(sign);
  }

  // ---------- Baeume und Bueschee
  const trees = [], bushes = [];
  const okTree = (x, z) => track.nearestAll(x, z).dist > track.edge + 2.5 && !inBuilding(x, z);
  const cx0 = ext.x0 + ext.w / 2, cz0 = ext.z0 + ext.h / 2;
  const scatter = (poly, density, conifer, list = trees) => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    let n = Math.min(450, Math.round(Math.abs(polyArea(poly)) * density));
    for (let k = 0; k < n * 3 && n > 0 && list.length < 4000; k++) {
      const x = rnd(x0, x1), z = rnd(z0, z1);
      if (!inPoly(x, z, poly) || Math.abs(x - cx0) > ext.w / 2 - 5 || Math.abs(z - cz0) > ext.h / 2 - 5 || !okTree(x, z)) continue;
      list.push([x, z, Math.random() < conifer]); n--;
    }
  };
  for (const a of data.areas) {
    if (a.k === "forest" || a.k === "wood") scatter(a.p, 0.012, 0.5);
    else if (a.k === "scrub" || a.k === "orchard") scatter(a.p, 0.006, 0);
    else if (a.k === "residential" || a.k === "garden" || a.k === "cemetery" || a.k === "park") { scatter(a.p, 0.0018, 0.2); scatter(a.p, 0.004, 0, bushes); }
  }
  for (let i = 0; i < track.n; i += 7) {
    if (Math.random() < 0.55) continue;
    const side = Math.random() < 0.5 ? -1 : 1;
    if (side > 0 ? track.openR[i] : track.openL[i]) continue;
    const off = side * (track.edge + rnd(3, 8));
    const x = track.px[i] - track.tz[i] * off, z = track.pz[i] + track.tx[i] * off;
    if (okTree(x, z)) trees.push([x, z, false]);
  }
  (extra.trees || []).forEach(t => trees.push(t));
  if (trees.length) {
    const trunkG = new THREE.CylinderGeometry(0.22, 0.34, 3, 7); trunkG.translate(0, 1.5, 0);
    const blob = new THREE.IcosahedronGeometry(1, 1);
    const crownG = mergeGeometries([blob.clone().scale(2.3, 2.0, 2.3).translate(0, 4.6, 0), blob.clone().scale(1.6, 1.5, 1.6).translate(1.3, 3.9, 0.4), blob.clone().scale(1.5, 1.4, 1.5).translate(-1.1, 4.0, -0.6), blob.clone().scale(1.4, 1.3, 1.4).translate(0.2, 5.9, -0.2)]);
    const conG = mergeGeometries([new THREE.ConeGeometry(2.4, 4.5, 8).translate(0, 4.2, 0), new THREE.ConeGeometry(1.9, 3.8, 8).translate(0, 6.3, 0), new THREE.ConeGeometry(1.3, 3, 8).translate(0, 8.2, 0)]);
    const dec = trees.filter(t => !t[2]), con = trees.filter(t => t[2]);
    const trunks = new THREE.InstancedMesh(trunkG, std("#6b4a2f"), trees.length);
    const crowns = new THREE.InstancedMesh(crownG, std("#ffffff", { flatShading: true, roughness: 0.9 }), Math.max(1, dec.length));
    const cones = new THREE.InstancedMesh(conG, std("#ffffff", { flatShading: true, roughness: 0.9 }), Math.max(1, con.length));
    let di = 0, ci = 0;
    trees.forEach(([x, z, isCon], i) => {
      const s = rnd(0.8, 1.35);
      E.set(0, Math.random() * 6, 0); Q.setFromEuler(E); S3.set(s, s * rnd(0.9, 1.15), s); V3.set(x, H(x, z) - 0.2, z); M4.compose(V3, Q, S3);
      trunks.setMatrixAt(i, M4);
      if (isCon) { cones.setMatrixAt(ci, M4); cones.setColorAt(ci++, C.setHSL(rnd(0.31, 0.37), rnd(0.4, 0.55), rnd(0.2, 0.28))); }
      else { crowns.setMatrixAt(di, M4); crowns.setColorAt(di++, C.setHSL(rnd(0.2, 0.3), rnd(0.5, 0.65), rnd(0.3, 0.42))); }
    });
    crowns.count = di; cones.count = ci;
    for (const m of [trunks, crowns, cones]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
  }
  if (bushes.length) {
    const bg = new THREE.IcosahedronGeometry(1, 1); bg.scale(1.2, 0.9, 1.2); bg.translate(0, 0.6, 0);
    const bm = new THREE.InstancedMesh(bg, std("#ffffff", { flatShading: true }), bushes.length);
    bushes.forEach(([x, z], i) => { const s = rnd(0.6, 1.3); E.set(0, Math.random() * 6, 0); Q.setFromEuler(E); S3.set(s, s, s); V3.set(x, H(x, z), z); M4.compose(V3, Q, S3); bm.setMatrixAt(i, M4); bm.setColorAt(i, C.setHSL(rnd(0.22, 0.32), rnd(0.45, 0.6), rnd(0.28, 0.38))); });
    bm.castShadow = true; group.add(bm);
  }

  // ---------- Himmel und Horizont
  {
    const skyM = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(extra.skyTop || "#1557c4") }, bot: { value: new THREE.Color(extra.skyBottom || "#93c6ee") }, sun: { value: new THREE.Vector3(-0.5, 0.75, 0.35).normalize() } },
      vertexShader: "varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ",
      fragmentShader: `uniform vec3 top; uniform vec3 bot; uniform vec3 sun; varying vec3 vd;
        void main(){ float h = clamp(vd.y*1.6,0.0,1.0); vec3 c = mix(bot, top, pow(h,0.7));
          float s = max(dot(normalize(vd), sun), 0.0); c += vec3(1.0,0.9,0.7)*pow(s,300.0)*2.0 + vec3(1.0,0.85,0.6)*pow(s,8.0)*0.25;
          gl_FragColor = vec4(c,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        } `,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1450, 32, 16), skyM);
    sky.renderOrder = -10; sky.frustumCulled = false;
    sky.onBeforeRender = (r, s, cam) => sky.position.copy(cam.position);
    group.add(sky);
    const hills = [];
    const minH = Math.min(...TR.h);
    for (let i = 0; i < 46; i++) {
      const a = i / 46 * Math.PI * 2 + rnd(-0.04, 0.04), R = rnd(1250, 1500);
      const g = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(rnd(220, 380), rnd(45, 120), rnd(160, 260)); g.rotateY(-a);
      g.translate(cx0 + Math.cos(a) * R, minH - 8, cz0 + Math.sin(a) * R);
      colorize(g, pick(["#6f9e58", "#5f9050", "#77a862", "#6a9a55", "#5c8a4c"]));
      hills.push(g);
    }
    addMerged(hills, new THREE.MeshLambertMaterial({ vertexColors: true }), { recv: false });
    const cloudMat = new THREE.SpriteMaterial({ map: T.smoke(), color: "#ffffff", transparent: true, opacity: 0.95, depthWrite: false, fog: false });
    for (let i = 0; i < 28; i++) {
      const c = new THREE.Group();
      const a = Math.random() * Math.PI * 2, R = rnd(400, 1100);
      for (let k = 0; k < 6; k++) { const sp = new THREE.Sprite(cloudMat); const s = rnd(60, 130); sp.scale.set(s * 1.7, s, 1); sp.position.set(rnd(-80, 80), rnd(-12, 18), rnd(-40, 40)); c.add(sp); }
      c.position.set(cx0 + Math.cos(a) * R, rnd(220, 340), cz0 + Math.sin(a) * R);
      group.add(c);
      anim.push(dt => { c.position.x += dt * 2.5; });
    }
  }

  const ctx = { group, track, data, blds, anim, inBuilding, ribbon, T, half, colorize, addMerged, flatPoly, centroid, po, heightAt: H };
  const before = group.children.length;
  if (extra.decorate) extra.decorate(ctx);
  for (const c of group.children.slice(before)) c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group, update(dt, t) { for (const f of anim) f(dt, t); }, inBuilding, heightAt: H };
}
