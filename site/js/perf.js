// Performance-Helfer:
//  - chunkWorld: grosse, ueber die ganze Karte verteilte Meshes (Gelaende, Hecken, Baeume, Gebaeude-Sammelmeshes)
//    in Kacheln teilen. Vorher wurde alles immer komplett gezeichnet (auch hinter der Kamera und im Schattenbild).
//  - AutoRes: senkt die Aufloesung automatisch, wenn die Grafikkarte nicht hinterherkommt (und hebt sie wieder an).
import * as THREE from "three";
import { mergeGeometries } from "../vendor/BufferGeometryUtils.js";

const V = new THREE.Vector3(), M = new THREE.Matrix4();

export function chunkWorld(root, { cell = 220, minTris = 6000, minRadius = 240 } = {}) {
  const todo = [];
  root.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.frustumCulled && o.parent) todo.push(o); });
  let made = 0;
  for (const m of todo) {
    const g = m.geometry, pos = g.attributes.position;
    if (!pos) continue;
    const per = (g.index ? g.index.count : pos.count) / 3;
    if (m.isInstancedMesh) {
      if (per * m.count < minTris || m.count < 8) continue;
      m.computeBoundingSphere();
      if (m.boundingSphere.radius < minRadius) continue;
      made += splitInstanced(m, Math.max(cell, m.boundingSphere.radius * 2 / 6));
    } else {
      if (per < minTris || Array.isArray(m.material)) continue;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (g.boundingSphere.radius < minRadius) continue;
      made += splitMesh(m, Math.max(cell, g.boundingSphere.radius * 2 / 6));
    }
  }
  return made;
}

function copyFlags(src, dst) {
  dst.castShadow = src.castShadow; dst.receiveShadow = src.receiveShadow; dst.renderOrder = src.renderOrder;
  dst.name = src.name; dst.layers.mask = src.layers.mask;
  dst.onBeforeRender = src.onBeforeRender;
  dst.position.copy(src.position); dst.quaternion.copy(src.quaternion); dst.scale.copy(src.scale);
}

function splitInstanced(m, cell) {
  const cells = new Map();
  for (let i = 0; i < m.count; i++) {
    m.getMatrixAt(i, M); V.setFromMatrixPosition(M).applyMatrix4(m.matrixWorld);
    const k = Math.floor(V.x / cell) + "," + Math.floor(V.z / cell);
    let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(i);
  }
  if (cells.size < 2) return 0;
  const C = new THREE.Color();
  for (const list of cells.values()) {
    const im = new THREE.InstancedMesh(m.geometry, m.material, list.length);
    copyFlags(m, im);
    list.forEach((i, j) => { m.getMatrixAt(i, M); im.setMatrixAt(j, M); if (m.instanceColor) { m.getColorAt(i, C); im.setColorAt(j, C); } });
    im.computeBoundingSphere();
    m.parent.add(im);
  }
  m.parent.remove(m);
  return cells.size;
}

// Teilt die Dreiecke nach Kachel auf; alle Teile teilen sich die Vertex-Puffer (kein Extra-Speicher), nur der Index ist eigen.
function splitMesh(m, cell) {
  const g = m.geometry, pos = g.attributes.position, idx = g.index;
  const n = (idx ? idx.count : pos.count) / 3;
  const vi = (t, c) => idx ? idx.getX(t * 3 + c) : t * 3 + c;
  const cells = new Map();
  const e = m.matrixWorld.elements;
  for (let t = 0; t < n; t++) {
    let x = 0, z = 0;
    for (let c = 0; c < 3; c++) { const v = vi(t, c), px = pos.getX(v), py = pos.getY(v), pz = pos.getZ(v); x += e[0] * px + e[4] * py + e[8] * pz + e[12]; z += e[2] * px + e[6] * py + e[10] * pz + e[14]; }
    const k = Math.floor(x / 3 / cell) + "," + Math.floor(z / 3 / cell);
    let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(t);
  }
  if (cells.size < 2) return 0;
  const big = pos.count > 65535;
  for (const tris of cells.values()) {
    const ng = new THREE.BufferGeometry();
    for (const name in g.attributes) ng.setAttribute(name, g.attributes[name]);
    const ia = big ? new Uint32Array(tris.length * 3) : new Uint16Array(tris.length * 3);
    let o = 0;
    const box = new THREE.Box3();
    for (const t of tris) for (let c = 0; c < 3; c++) { const v = vi(t, c); ia[o++] = v; V.fromBufferAttribute(pos, v); box.expandByPoint(V); }
    ng.setIndex(new THREE.BufferAttribute(ia, 1));
    // Bounding-Volumen nur aus den eigenen Dreiecken (sonst wuerde three.js alle Vertices nehmen -> Culling wirkungslos)
    ng.boundingBox = box;
    ng.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const part = new THREE.Mesh(ng, m.material);
    copyFlags(m, part);
    m.parent.add(part);
  }
  m.parent.remove(m);
  return cells.size;
}

// ---------- automatische Aufloesung
// Misst die GPU-Zeit (wenn der Browser es kann) bzw. die Bildzeit und passt den Aufloesungsfaktor in 10-%-Schritten an.
export class AutoRes {
  constructor(renderer, pipeline) {
    this.r = renderer; this.p = pipeline;
    const gl = renderer.getContext();
    this.gl = gl;
    this.ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    this.q = null; this.gpu = []; this.frames = []; this.cool = 2.5; this.on = true;
    this.key = "";
  }
  // vor dem Zeichnen
  begin() {
    if (!this.ext || this.q) return;
    this.q = this.gl.createQuery(); this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.q); this.qOpen = true;
  }
  end() {
    if (this.qOpen) { this.gl.endQuery(this.ext.TIME_ELAPSED_EXT); this.qOpen = false; }
  }
  poll() {
    if (!this.q || this.qOpen) return;
    const gl = this.gl;
    if (!gl.getQueryParameter(this.q, gl.QUERY_RESULT_AVAILABLE)) return;
    const bad = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    if (!bad) this.gpu.push(gl.getQueryParameter(this.q, gl.QUERY_RESULT) / 1e6);
    gl.deleteQuery(this.q); this.q = null;
  }
  // neues Rennen / andere Anzahl Ansichten: gemerkten Faktor fuer diese Situation laden
  reset(views) {
    this.key = "dskart_res_" + this.p.level + "_" + views;
    let s = 1;
    try { s = parseFloat(localStorage.getItem(this.key)) || 1; } catch (e) {}
    this.frames = []; this.gpu = []; this.cool = 2.5;
    this.p.setScale(Math.min(1, s + 0.1)); // mit etwas Luft nach oben starten, falls es beim letzten Mal nur ein Ausreisser war
  }
  // jedes Bild waehrend des Rennens
  tick(dt) {
    this.poll();
    if (!this.on || document.hidden || dt >= 0.049) return; // Hintergrund-Tab / einzelne Haenger nicht mitzaehlen
    this.frames.push(dt * 1000);
    this.cool -= dt;
    if (this.cool > 0 || this.frames.length < 50) return;
    const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
    const f = med(this.frames), g = this.gpu.length >= 15 ? med(this.gpu) : null;
    this.frames = []; this.gpu = [];
    const s = this.p.scale;
    let ns = s;
    // zu langsam (unter ~55 Bilder/s): nur runter, wenn es an der Grafikkarte liegt (bzw. wenn wir es nicht messen koennen)
    if (f > 18.5 && (g === null || g > 13)) ns = s - (f > 26 ? 0.15 : 0.1);
    // Luft nach oben: GPU hat deutlich Reserve
    else if (g !== null && g < 8.5 && f < 18 && s < 1) ns = s + 0.1;
    ns = Math.max(0.5, Math.min(1, Math.round(ns * 20) / 20));
    if (ns !== s) {
      this.p.setScale(ns);
      try { localStorage.setItem(this.key, String(ns)); } catch (e) {}
      this.cool = ns < s ? 1.5 : 4;
    } else this.cool = 1.5;
  }
}

// ---------- statische Kleinteile zusammenfassen
// Alle normalen (nicht instanzierten) Meshes unter root nach Material zu je EINEM Mesh verschmelzen.
// Mehrfach-Materialien (z.B. Box mit 6 Materialien) werden nach Gruppen zerlegt. Nur fuer Dinge, die sich nie bewegen!
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(); // material -> {geos, cast, recv, ro}
  const drop = [];
  const add = (mat, g, o) => {
    const key = mat.uuid + "|" + Object.keys(g.attributes).sort().join(",");
    let b = buckets.get(key); if (!b) buckets.set(key, b = { mat, geos: [], cast: false, recv: false, ro: o.renderOrder });
    b.geos.push(g); b.cast ||= o.castShadow; b.recv ||= o.receiveShadow;
  };
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o === root) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    if (Array.isArray(o.material)) {
      const src = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
      for (const gr of src) {
        const mat = o.material[gr.materialIndex]; if (!mat) continue;
        const part = new THREE.BufferGeometry();
        const n = Math.min(gr.count, g.attributes.position.count - gr.start);
        for (const k of Object.keys(g.attributes)) { const a = g.attributes[k]; part.setAttribute(k, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + n) * a.itemSize), a.itemSize)); }
        add(mat, part, o);
      }
    } else { g.clearGroups(); add(o.material, g, o); }
    drop.push(o);
  });
  for (const o of drop) o.parent.remove(o);
  // leere Gruppen bleiben einfach stehen (kosten nichts)
  for (const b of buckets.values()) {
    const mg = mergeGeometries(b.geos, false);
    if (!mg) continue;
    const mesh = new THREE.Mesh(mg, b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.renderOrder = b.ro;
    root.add(mesh);
  }
  return buckets.size;
}
