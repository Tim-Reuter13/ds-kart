import * as THREE from "three";
import { T } from "./tex.js";

const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
function box(w, h, d, m, x = 0, y = 0, z = 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; }
function cyl(r0, r1, h, m, seg = 12) { return new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); }
function poi(ctx, name) { return ctx.data.pois.find(p => p.n === name); }
function signBoard(text, bg, fg, w, h) {
  const t = T.sign(text, bg, fg, { font: "bold 64px Arial, sans-serif" });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h ?? w / t.userData.aspect), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
  return m;
}
// Gruppe so drehen, dass +Z zur Strecke zeigt
function faceTrack(ctx, g, x, z) {
  const q = ctx.track.nearestAll(x, z);
  const p = ctx.track.at(q.s);
  g.rotation.y = Math.atan2(p.x - x, p.z - z);
  return q;
}
function sideOf(ctx, s, off) { return ctx.track.at(s, off); }

// Wo kreuzt die Strecke einen Bach? -> Laufweg s
function waterCrossings(ctx) {
  const out = [];
  const tr = ctx.track;
  for (const w of ctx.data.waterways) {
    for (let k = 0; k < w.p.length - 1; k++) {
      const [ax, az] = w.p[k], [bx, bz] = w.p[k + 1];
      for (let i = 0; i < tr.n; i++) {
        const j = (i + 1) % tr.n;
        const cx = tr.px[i], cz = tr.pz[i], dx = tr.px[j], dz = tr.pz[j];
        const den = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx);
        if (Math.abs(den) < 1e-9) continue;
        const u = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / den;
        const v = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / den;
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) out.push(tr.s[i] + v * (tr.s[j] - tr.s[i] || 0));
      }
    }
  }
  return out;
}

function bridge(ctx, s) {
  const tr = ctx.track, g = new THREE.Group();
  const p = tr.at(s);
  const rail = lam("#8a8f96");
  for (const sd of [-1, 1]) {
    g.add(box(0.2, 1.1, 9, rail, sd * (tr.half + 0.4), 0.55, 0));
    for (let k = -4; k <= 4; k += 2) g.add(box(0.15, 1.1, 0.15, rail, sd * (tr.half + 0.4), 0.55, k));
  }
  g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading;
  ctx.group.add(g);
}

function church(ctx, x, z) {
  const g = new THREE.Group();
  const white = lam("#f3efe6"), roof = lam("#8e3b28"), copper = lam("#5f8a76"), gold = lam("#d9b44a");
  g.add(box(13, 11, 26, white, 0, 5.5, -14));
  const r = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 9.6, 7, 4, 1), roof);
  r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 2.1); r.position.set(0, 14.5, -14); g.add(r);
  // Turm
  g.add(box(7, 32, 7, white, 0, 16, 0));
  g.add(box(7.4, 0.5, 7.4, lam("#d8d2c4"), 0, 24, 0));
  for (const [rx, rz, ry] of [[0, 3.52, 0], [3.52, 0, Math.PI / 2], [0, -3.52, Math.PI], [-3.52, 0, -Math.PI / 2]]) {
    const clock = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), lam("#1f2a44"));
    clock.position.set(rx, 27, rz); clock.rotation.y = ry; g.add(clock);
    const hand = box(0.15, 1.1, 0.05, gold); hand.position.set(rx * 1.003, 27.4, rz * 1.003); hand.rotation.y = ry; g.add(hand);
    const win = box(1.2, 2.6, 0.1, lam("#3a3226")); win.position.set(rx * 1.002, 20, rz * 1.002); win.rotation.y = ry; g.add(win);
  }
  // Zwiebelhaube + Spitze
  const onion = new THREE.Mesh(new THREE.SphereGeometry(3.6, 16, 12), copper); onion.scale.set(1, 1.15, 1); onion.position.y = 34.5; g.add(onion);
  const lantern = cyl(1.1, 1.3, 3, copper); lantern.position.y = 38.8; g.add(lantern);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.5, 12), copper); top.position.y = 42.5; g.add(top);
  const cross = box(0.25, 2.4, 0.25, gold, 0, 45.6, 0); g.add(cross); g.add(box(1.3, 0.25, 0.25, gold, 0, 46.1, 0));
  g.position.set(x, ctx.heightAt(x, z), z);
  faceTrack(ctx, g, x, z);
  ctx.group.add(g);
}

function maibaum(ctx, x, z) {
  const g = new THREE.Group();
  const pole = cyl(0.3, 0.45, 26, lam("#f2f2f2"), 10); pole.position.y = 13; g.add(pole);
  for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 12), lam(i % 2 ? "#2a5aa8" : "#f2f2f2")); r.rotation.x = Math.PI / 2; r.position.y = 3 + i * 1.8; g.add(r); }
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.3, 8, 16), lam("#3c7a34")); wreath.rotation.x = Math.PI / 2; wreath.position.y = 20; g.add(wreath);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4, 8), lam("#3c7a34")); crown.position.y = 27.5; g.add(crown);
  for (let i = 0; i < 4; i++) { const sg = signBoard(["Bäcker", "Metzger", "Musikverein", "Feuerwehr"][i], "#f4e7c4", "#4a2a10", 2.6, 0.9); sg.position.set(Math.sin(i * Math.PI / 2) * 0.6, 9 + i * 2.3, Math.cos(i * Math.PI / 2) * 0.6); sg.rotation.y = i * Math.PI / 2; g.add(sg); }
  g.position.set(x, ctx.heightAt(x, z), z);
  ctx.group.add(g);
}

function flags(ctx, x, z) {
  const g = new THREE.Group();
  const cols = [["#000", "#dd0000", "#ffce00"], ["#000", "#ffd400", "#000"], ["#c8102e", "#fff", "#c8102e"]];
  cols.forEach((c, i) => {
    const pole = cyl(0.08, 0.1, 9, lam("#ccc"), 8); pole.position.set(i * 2.2, 4.5, 0); g.add(pole);
    const cv = document.createElement("canvas"); cv.width = 60; cv.height = 36; const gg = cv.getContext("2d");
    c.forEach((col, k) => { gg.fillStyle = col; gg.fillRect(0, k * 12, 60, 12); });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2, 8, 1), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
    fl.position.set(i * 2.2 + 1, 7.9, 0); g.add(fl);
    const pos = fl.geometry.attributes.position, base = pos.array.slice();
    ctx.anim.push((dt, tm) => { for (let k = 0; k < pos.count; k++) pos.setZ(k, Math.sin(tm * 6 + base[k * 3] * 3 + i) * 0.12 * (base[k * 3] + 1)); pos.needsUpdate = true; });
  });
  g.position.set(x, ctx.heightAt(x, z), z);
  faceTrack(ctx, g, x, z);
  ctx.group.add(g);
}

function pretzel(ctx, x, z) {
  const g = new THREE.Group();
  const m = lam("#9a5a22");
  const pole = cyl(0.12, 0.12, 6, lam("#555"), 8); pole.position.y = 3; g.add(pole);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.32, 10, 24), m); ring.position.y = 7.2; g.add(ring);
  for (const sx of [-0.55, 0.55]) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.3, 10, 18), m); l.position.set(sx, 7.6, 0.05); g.add(l); }
  const cross = box(2.2, 0.3, 0.3, m, 0, 6.6, 0.1); cross.rotation.z = 0.5; g.add(cross);
  const cross2 = cross.clone(); cross2.rotation.z = -0.5; g.add(cross2);
  for (let i = 0; i < 20; i++) { const s = box(0.1, 0.06, 0.06, lam("#fff")); s.position.set((Math.random() - 0.5) * 2.4, 6.6 + Math.random() * 1.8, 0.3); g.add(s); }
  g.position.set(x, ctx.heightAt(x, z), z);
  faceTrack(ctx, g, x, z);
  ctx.group.add(g);
  ctx.anim.push((dt) => { ring.parent.rotation.y += 0; });
}

function texLoad(file, rx, ry, ox, oy) {
  const t = new THREE.TextureLoader().load(file); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.repeat.set(rx, ry); t.offset.set(ox, oy);
  return t;
}
// crop = [x0, x1, yTop0, yTop1] als Anteil am Bild
function imgSign(ctx, x, z, file, crop, w, h, body, turn = 0) {
  const g = new THREE.Group();
  const t = texLoad(file, crop[1] - crop[0], crop[3] - crop[2], crop[0], 1 - crop[3]);
  const mat = new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5 });
  const geo = new THREE.PlaneGeometry(w, h);
  for (const sd of [1, -1]) { const m = new THREE.Mesh(geo, mat); m.position.set(0, h / 2, sd * 0.27); if (sd < 0) m.rotation.y = Math.PI; m.castShadow = true; g.add(m); }
  if (body) body(g);
  g.position.set(x, ctx.heightAt(x, z), z);
  faceTrack(ctx, g, x, z);
  g.rotation.y += turn;
  ctx.group.add(g);
  return g;
}

function pylon(ctx, x, z, lines, bg, fg, h = 12) {
  const g = new THREE.Group();
  const pole = box(0.8, h, 0.8, lam("#6a6a6a"), 0, h / 2, 0); g.add(pole);
  let y = h + 1.4;
  for (const [txt, w] of lines) {
    const b = box(w + 0.6, 2.6, 0.6, lam(bg), 0, y, 0); g.add(b);
    const s1 = signBoard(txt, bg, fg, w, 2.2); s1.position.set(0, y, 0.31); g.add(s1);
    const s2 = s1.clone(); s2.position.z = -0.31; s2.rotation.y = Math.PI; g.add(s2);
    y += 2.9;
  }
  g.position.set(x, ctx.heightAt(x, z), z);
  faceTrack(ctx, g, x, z);
  g.rotation.y += Math.PI / 2 * 0.6;
  ctx.group.add(g);
}

function gasStation(ctx, x, z) {
  const g = new THREE.Group();
  for (const [px, pz] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) g.add(box(0.5, 5, 0.5, lam("#ddd"), px, 2.5, pz));
  {
    const side = (rep) => new THREE.MeshLambertMaterial({ map: texLoad("img/facades/tanke_dach.webp", rep, 1, 0, 0) });
    const sx = side(1), sz = side(2), top = lam("#f2f2f2"), bot = lam("#e4e4e2");
    sx.map.wrapS = sz.map.wrapS = THREE.RepeatWrapping;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14.15, 1.3, 10.15), [sx, sx, top, bot, sz, sz]);
    roof.position.y = 5.1; roof.castShadow = true; g.add(roof);
    for (const [lx, lz] of [[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5]]) g.add(box(1.6, 0.06, 0.5, new THREE.MeshBasicMaterial({ color: "#fffbe8" }), lx, 4.42, lz));
  }
  for (const px of [-3, 3]) { g.add(box(1, 1.8, 0.7, lam("#d0281e"), px, 0.9, 0)); g.add(box(0.8, 0.5, 0.72, lam("#f7d117"), px, 1.6, 0)); }
  const sg = signBoard("Tanke", "#f7d117", "#d0281e", 4, 1.0); sg.position.set(0, 6.3, 5.0); g.add(sg);
  g.add(box(4.2, 1.2, 0.1, lam("#f7d117"), 0, 6.3, 4.94));
  g.position.set(x, ctx.heightAt(x, z), z);
  faceTrack(ctx, g, x, z);
  ctx.group.add(g);
}

function pumps(ctx, x, z, ang) {
  const g = new THREE.Group();
  for (const px of [-3, 3]) {
    g.add(box(1.2, 0.25, 3.2, lam("#b9bcc0"), px, 0.12, 0));
    g.add(box(1, 1.8, 0.7, lam("#d0281e"), px, 1.05, 0)); g.add(box(0.8, 0.5, 0.72, lam("#f7d117"), px, 1.75, 0));
    g.add(box(0.5, 0.35, 0.74, lam("#1d2228"), px, 1.35, 0));
  }
  g.position.set(x, ctx.heightAt(x, z), z); g.rotation.y = ang;
  ctx.group.add(g);
}

function carts(ctx, x, z, n = 6) {
  const m = lam("#b8bec6");
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    g.add(box(0.9, 0.7, 1.3, new THREE.MeshLambertMaterial({ color: "#b8bec6", wireframe: true }), 0, 0.9, 0));
    g.add(box(0.9, 0.05, 1.3, m, 0, 0.55, 0));
    for (const [a, b] of [[-0.35, -0.5], [0.35, -0.5], [-0.35, 0.5], [0.35, 0.5]]) g.add(box(0.06, 0.55, 0.06, m, a, 0.28, b));
    { const gx = x + (Math.random() - 0.5) * 10, gz = z + (Math.random() - 0.5) * 10; g.position.set(gx, ctx.heightAt(gx, gz), gz); }
    g.rotation.y = Math.random() * 6;
    ctx.group.add(g);
  }
}

function roundaboutIsland(ctx) {
  const tr = ctx.track;
  for (const r of ctx.data.roads) {
    const p = r.p;
    if (p.length < 8) continue;
    const a = p[0], b = p[p.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1) continue;
    let cx = 0, cz = 0; for (const q of p) { cx += q[0]; cz += q[1]; } cx /= p.length; cz /= p.length;
    let rad = 0; for (const q of p) rad += Math.hypot(q[0] - cx, q[1] - cz); rad /= p.length;
    if (rad > 30) continue;
    const near = tr.nearestAll(cx, cz).dist;
    const R = Math.min(rad - 3.5, near - tr.half - 0.8);
    if (R < 2) continue;
    const isl = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.3, 0.4, 32), lam("#6cb34a"));
    const gy = ctx.heightAt(cx, cz); isl.position.set(cx, gy + 0.2, cz); ctx.group.add(isl);
    const curb = new THREE.Mesh(new THREE.TorusGeometry(R + 0.2, 0.25, 6, 40), lam("#ddd")); curb.rotation.x = Math.PI / 2; curb.position.set(cx, gy + 0.3, cz); ctx.group.add(curb);
    // Kunstwerk: grosse Biber-Skulptur (Biberach!)
    const g = new THREE.Group();
    const fur = lam("#7a4a26");
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), fur); body.scale.set(1, 0.9, 1.4); body.position.y = 1.8; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), fur); head.position.set(0, 2.9, 1.6); g.add(head);
    const tail = box(1.4, 0.25, 2, lam("#3a2a1e"), 0, 0.9, -2.2); tail.rotation.x = 0.4; g.add(tail);
    const teeth = box(0.4, 0.4, 0.1, lam("#fff"), 0, 2.55, 2.45); g.add(teeth);
    for (const sx of [-0.35, 0.35]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), lam("#111")); e.position.set(sx, 3.15, 2.3); g.add(e); }
    g.position.set(cx, gy + 0.4, cz);
    ctx.group.add(g);
    ctx.anim.push((dt) => { g.rotation.y += dt * 0.3; });
    return;
  }
}

function sedanProp(ctx, x, z, rot, color) {
  const g = new THREE.Group();
  const p = new THREE.MeshPhongMaterial({ color, shininess: 100, specular: "#888" });
  g.add(box(2, 0.7, 4.4, p, 0, 0.65, 0));
  g.add(box(1.7, 0.6, 2.2, new THREE.MeshPhongMaterial({ color: "#223", shininess: 120 }), 0, 1.3, -0.2));
  for (const [a, b] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) { const w = cyl(0.38, 0.38, 0.3, lam("#111"), 12); w.rotation.z = Math.PI / 2; w.position.set(a, 0.38, b); g.add(w); }
  g.position.set(x, ctx.heightAt(x, z), z); g.rotation.y = rot;
  ctx.group.add(g);
}

function kieswerk(ctx, x, z) {
  const g = new THREE.Group();
  const grav = lam("#b9ab92");
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(6 + Math.random() * 4, 6 + Math.random() * 4, 9), lam(["#b9ab92", "#a89a80", "#c8bca4"][i % 3], { flatShading: true }));
    c.position.set(-18 + i * 9, 3.5, -10 + (i % 2) * 8); g.add(c);
  }
  // Foerderband
  const belt = box(2, 0.6, 26, lam("#3d3d3d"), 0, 7, 0); belt.rotation.x = -0.35; belt.position.set(14, 6, -6); g.add(belt);
  for (let k = 0; k < 4; k++) g.add(box(0.4, 2 + k * 2.2, 0.4, lam("#d9a21a"), 14, 1 + k * 1.1, -16 + k * 6.5));
  // Bagger
  const ex = new THREE.Group();
  ex.add(box(3.4, 1.2, 4, lam("#333"), 0, 0.6, 0));
  ex.add(box(3, 2.2, 3.4, lam("#e8b81a"), 0, 2.3, 0));
  ex.add(box(1.6, 1.6, 1.6, lam("#2a3a4a"), -0.6, 3.9, 0.6));
  const arm = box(0.6, 0.6, 6, lam("#e8b81a"), 0.6, 4, 3.5); arm.rotation.x = -0.5; ex.add(arm);
  const arm2 = box(0.5, 4, 0.5, lam("#e8b81a"), 0.6, 4, 6.6); arm2.rotation.x = 0.3; ex.add(arm2);
  const bucket = box(1.6, 1, 1.2, lam("#555"), 0.6, 1.8, 7.2); ex.add(bucket);
  ex.position.set(-6, 0, 10); ex.rotation.y = 0.7; g.add(ex);
  ctx.anim.push((dt, t) => { ex.rotation.y = 0.7 + Math.sin(t * 0.5) * 0.6; });
  const sg = signBoard("KIESWERK", "#2a4a2a", "#f2e6c0", 8, 1.8); sg.position.set(0, 3, 14); g.add(sg);
  const sp = box(0.3, 3, 0.3, lam("#555"), -3.5, 1.5, 14); g.add(sp); const sp2 = sp.clone(); sp2.position.x = 3.5; g.add(sp2);
  g.position.set(x, ctx.heightAt(x, z), z);
  faceTrack(ctx, g, x, z);
  ctx.group.add(g);
}

function beach(ctx, x, z, toward) {
  const g = new THREE.Group();
  const sand = new THREE.Mesh(new THREE.CircleGeometry(14, 24), lam("#e6d29c", { polygonOffset: true, polygonOffsetFactor: -2 }));
  sand.rotation.x = -Math.PI / 2; sand.scale.set(1.5, 0.8, 1); sand.position.y = 0.09; g.add(sand);
  const towels = ["#d04040", "#3a7ad0", "#f0c030", "#40a060"];
  for (let i = 0; i < 6; i++) {
    const tw = box(1.4, 0.04, 2.4, lam(towels[i % 4]), -9 + i * 3.4, 0.12, (Math.random() - 0.5) * 4); tw.rotation.y = (Math.random() - 0.5) * 0.5; g.add(tw);
    if (i % 2 === 0) {
      const pole = cyl(0.05, 0.05, 2.6, lam("#eee"), 6); pole.position.set(-9 + i * 3.4, 1.3, 1.5); g.add(pole);
      const um = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.7, 8), lam(i % 4 === 0 ? "#e04a3a" : "#3a8ae0")); um.position.set(-9 + i * 3.4, 2.7, 1.5); g.add(um);
    }
  }
  // Bierkasten-Sitzecke + Musikbox
  for (let i = 0; i < 3; i++) g.add(box(0.8, 0.6, 0.6, lam("#d4a017"), 8 + i * 1.1, 0.3, -3));
  g.add(box(0.6, 1, 0.5, lam("#222"), 8, 0.9, -1.8));
  // Schild
  const s = signBoard("BADEN VERBOTEN – DARMBAKTERIEN", "#ffffff", "#c8102e", 8, 1.0);
  s.position.set(0, 2.2, 6); g.add(s);
  g.add(box(0.15, 2.2, 0.15, lam("#666"), -3.8, 1.1, 6)); g.add(box(0.15, 2.2, 0.15, lam("#666"), 3.8, 1.1, 6));
  g.position.set(x, ctx.heightAt(x, z), z);
  g.rotation.y = Math.atan2(toward[0] - x, toward[1] - z);
  ctx.group.add(g);
}

function flamingo(ctx, x, z) {
  const g = new THREE.Group();
  const pink = lam("#ff7aa8");
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.55, 10, 20), pink); ring.rotation.x = Math.PI / 2; g.add(ring);
  const neck = cyl(0.25, 0.3, 2.4, pink, 8); neck.position.set(0, 1.4, 1.2); neck.rotation.x = -0.2; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), pink); head.position.set(0, 2.6, 1.4); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.6, 8), lam("#222")); beak.rotation.x = Math.PI / 2; beak.position.set(0, 2.5, 1.9); g.add(beak);
  const wl = ctx.heightAt(x, z) + 0.3; g.position.set(x, wl, z);
  ctx.group.add(g);
  ctx.anim.push((dt, t) => { g.position.y = wl + Math.sin(t * 1.4) * 0.12; g.rotation.y += dt * 0.15; });
}

function jetty(ctx, x, z, toward) {
  const g = new THREE.Group();
  const wood = lam("#8a6a44");
  g.add(box(2.4, 0.25, 12, wood, 0, 0.45, 6));
  for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) g.add(box(0.25, 1.2, 0.25, wood, sx * 1.1, 0.1, 1 + k * 3.6));
  g.position.set(x, ctx.heightAt(x, z), z);
  g.rotation.y = Math.atan2(toward[0] - x, toward[1] - z);
  ctx.group.add(g);
}

// Namen von Orten (Punkte) auf das naechste Gebaeude uebertragen
function tagBuildings(data, names, maxD = 30) {
  for (const n of names) {
    if (data.buildings.some(b => b.n === n)) continue;
    const p = data.pois.find(q => q.n === n);
    if (!p) continue;
    let best = null;
    for (const b of data.buildings) {
      let cx = 0, cz = 0; for (const q of b.p) { cx += q[0]; cz += q[1]; } cx /= b.p.length; cz /= b.p.length;
      const d = Math.hypot(cx - p.x, cz - p.z);
      if (d < maxD && (!best || d < best.d)) best = { d, b };
    }
    if (best) best.b.n = n;
  }
}

// Kleines Glockentuermchen auf den First eines Gebaeudes
function turret(ctx, name) {
  const bl = ctx.blds.find(x => x.b.n === name);
  if (!bl) return;
  const P = bl.poly;
  let cx = 0, cz = 0; for (const q of P) { cx += q[0]; cz += q[1]; } cx /= P.length; cz /= P.length;
  let sxx = 0, szz = 0, sxz = 0; for (const [x, z] of P) { sxx += (x - cx) ** 2; szz += (z - cz) ** 2; sxz += (x - cx) * (z - cz); }
  const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz), ux = Math.cos(ang), uz = Math.sin(ang);
  let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [x, z] of P) { const u = (x - cx) * ux + (z - cz) * uz, v = -(x - cx) * uz + (z - cz) * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  // Tuermchen nahe dem Giebel, der der Strecke naeher ist
  const endA = [cx + ux * u1 * 0.72, cz + uz * u1 * 0.72], endB = [cx + ux * u0 * 0.72, cz + uz * u0 * 0.72];
  const pos = ctx.track.nearestAll(...endA).dist < ctx.track.nearestAll(...endB).dist ? endA : endB;
  const ridge = bl.top + Math.min(6.5, (v1 - v0) / 2 * 1.15) - 0.6;
  const g = new THREE.Group();
  const green = lam("#6f9a80"), dark = lam("#4d7562"), white = lam("#f4f2ec"), gold = lam("#e2b84a");
  g.add(box(2.6, 1.2, 2.6, white, 0, 0.6, 0));
  const face = new THREE.MeshLambertMaterial({ map: texLoad("img/facades/st_mauritius_tuermchen.webp", 0.212, 0.55, 0.394, 0.01) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.0, 2.2), [face, face, green, green, face, face]);
  body.position.y = 3.6; body.castShadow = true; g.add(body);
  g.add(box(2.7, 0.35, 2.7, dark, 0, 6.25, 0));
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.75, 4.2, 4), green); spire.rotation.y = Math.PI / 4; spire.position.y = 8.5; spire.castShadow = true; g.add(spire);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), gold); ball.position.y = 10.75; g.add(ball);
  g.add(box(0.08, 1.1, 0.08, gold, 0, 11.4, 0)); g.add(box(0.5, 0.08, 0.08, gold, 0, 11.6, 0));
  g.position.set(pos[0], ridge, pos[1]); g.rotation.y = -ang;
  ctx.group.add(g);
}

// Gelbe Schleifen-Skulptur (vor dem Rathaus)
function ribbonSculpture(ctx, x, z) {
  const curve = new THREE.CatmullRomCurve3([[-2.5, 0.2, 0], [-1.5, 1.6, 0.6], [-0.4, 0.3, -0.4], [0.6, 1.8, 0.3], [1.6, 0.4, -0.3], [2.6, 1.4, 0.2]].map(p => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.32, 10, false), new THREE.MeshStandardMaterial({ color: "#f5c518", roughness: 0.35, metalness: 0.1 }));
  m.scale.set(1, 1, 2.2);
  m.position.set(x, ctx.heightAt(x, z), z);
  ctx.group.add(m);
}

function polyCentroid(p) { let x = 0, z = 0; for (const q of p) { x += q[0]; z += q[1]; } return [x / p.length, z / p.length]; }
function polyAreaAbs(p) { let a = 0; for (let i = 0; i < p.length; i++) { const j = (i + 1) % p.length; a += p[i][0] * p[j][1] - p[j][0] * p[i][1]; } return Math.abs(a / 2); }

export const TRACKS = [
  {
    id: "schemmerhofen", name: "Schemmerhofen", sub: "Hauptstraße · Rathaus · Mühlbach", music: "schemmerhofen", style: "town",
    color: "#d9b44a",
    boxes: [0.1, 0.4, 0.7], bottles: [[0.2, -3, 5], [0.52, 3, 5], [0.84, 0, 5]],
    setup(track, data) {
      // Rampe vor der Bachbruecke (Alte Strasse ueber den Muehlbach)
      const fake = { track, data };
      const xs = waterCrossings(fake);
      this.crossings = xs;
      this.ramps = xs.slice(0, 1).map(s => ({ at: ((s - 13) / track.L + 1) % 1, len: 11, h: 1.7 }));
    },
    prepare(data) {
      tagBuildings(data, ["St. Mauritius", "Rathaus Schemmerhofen", "Bäckerei Keck", "Lidl", "Activ Kebap", "Mühlbachhalle"]);
      const ch = data.buildings.find(b => b.n === "St. Mauritius"); if (ch) { ch.gable = true; ch.pitch = 1.25; ch.h = Math.max(ch.h, 9); }
      const rh = data.buildings.find(b => b.n === "Rathaus Schemmerhofen"); if (rh) { rh.h = 7.5; rh.flat = true; }
    },
    facades: {
      "St. Mauritius": { file: "img/facades/st_mauritius_wand.webp", sides: "long" },
      "Rathaus Schemmerhofen": { file: "img/facades/rathaus.webp", walls: 2, ledge: 0.43, ledgeCol: "#c9ccce", ledgeD: 1.5, ledgeW: 0.22 },
      "Bäckerei Keck": { file: "img/facades/baeckerei_keck.webp", height: 4.2, single: true },
      "Lidl": { file: "img/facades/lidl_markt.webp", walls: 2, ledge: 0.56, ledgeCol: "#d9dadc", ledgeD: 1.8, ledgeW: 0.6 },
      "Activ Kebap": { file: "img/facades/activ_kebap.webp", height: 4, single: true },
      "Mühlbachhalle": { file: "img/facades/muehlbachhalle.webp", walls: 2 },
    },
    buildingStyle(b) {
      if (b.n === "Rathaus Schemmerhofen") return { wall: "#dccba5", roof: "#7c7a74", bare: true };
      if (b.n === "St. Mauritius") return { wall: "#f6f4ee", roof: "#b9532f", bare: true };
      if (b.n === "Mühlbachhalle") return { wall: "#f2f2ee", roof: "#4a3a2e" };
      return null;
    },
    decorate(ctx) {
      if (ctx.blds.some(b => b.b.n === "St. Mauritius")) turret(ctx, "St. Mauritius");
      const li = poi(ctx, "Lidl");
      if (li) {
        const q = ctx.track.nearestAll(li.x, li.z);
        const p = ctx.track.at(q.s + 12, (q.d > 0 ? 1 : -1) * (ctx.track.edge + 4));
        imgSign(ctx, p.x, p.z, "img/facades/activcenter_pylon.webp", [0.316, 0.684, 0.016, 0.983], 1.9, 14, (g) => g.add(box(1.86, 14, 0.5, lam("#c8231e"), 0, 7, 0)), 1.3);
      }
      else { const m = poi(ctx, "St. Mauritius"); if (m) church(ctx, m.x, m.z); }
      const rh = poi(ctx, "Rathaus Schemmerhofen");
      if (rh) {
        const q = ctx.track.nearestAll(rh.x, rh.z);
        const sd = q.d > 0 ? 1 : -1;
        const p = ctx.track.at(q.s + 6, sd * (ctx.track.edge + 7));
        ribbonSculpture(ctx, p.x, p.z);
        const p2 = ctx.track.at(q.s - 6, sd * (ctx.track.edge + 3));
        flags(ctx, p2.x, p2.z);
      }
      const bk = poi(ctx, "Bäckerei Keck");
      if (bk) { const q = ctx.track.nearestAll(bk.x, bk.z); const p = ctx.track.at(q.s, (q.d > 0 ? 1 : -1) * (ctx.track.edge + 1.5)); pretzel(ctx, p.x, p.z); }
      for (const s of waterCrossings(ctx)) bridge(ctx, s);
    },
  },
  {
    id: "mcd", name: "Mäcces Biberach", sub: "Waldseer Straße · Drive-in · Kreisel", music: "mcd", style: "town",
    color: "#c8102e",
    boxes: [0.08, 0.36, 0.66], bottles: [[0.18, 0, 5], [0.46, -3, 5], [0.8, 3, 5]],
    setup(track, data) {
      const a = data.pois.find(p => p.n === "Aldi Süd");
      this.ramps = [];
      if (a) { const q = track.nearestAll(a.x, a.z); this.ramps.push({ at: ((q.s + 20) / track.L) % 1, len: 10, h: 1.6 }); }
    },
    prepare(data) {
      tagBuildings(data, ["McDonald's", "Shell", "Mercedes-Benz Autohaus Biberach", "Sonderpreis Baubox", "Agip Eni"]);
      for (const b of data.buildings) if (b.n === "Shell" || b.n === "Agip Eni") { b.h = Math.min(b.h, 4.6); b.low = true; }
      // Tankstellendaecher (OSM building=roof) den Tankstellen zuordnen
      for (const nm of ["Shell", "Agip Eni"]) {
        const p = data.pois.find(q => q.n === nm); if (!p) continue;
        let best = null;
        for (const b of data.buildings) {
          if (b.k !== "roof") continue;
          let cx = 0, cz = 0; for (const q of b.p) { cx += q[0]; cz += q[1]; } cx /= b.p.length; cz /= b.p.length;
          const d = Math.hypot(cx - p.x, cz - p.z); if (d < 45 && (!best || d < best.d)) best = { d, b };
        }
        if (best) best.b.fuel = nm;
      }
    },
    facades: {
      "McDonald's": { file: "img/facades/maecces.webp", walls: 2, height: 5, ledge: 0.66, ledgeCol: "#4a3326", ledgeD: 0.8, trim: "#4a3326" },
      "Shell": { file: "img/facades/tanke.webp", walls: 2, height: 4.2 },
      "Agip Eni": { file: "img/facades/tanke.webp", walls: 2, height: 4.2 },
      "Mercedes-Benz Autohaus Biberach": { file: "img/facades/autohaus.webp", walls: 2, ledge: 0.49, ledgeCol: "#2a2c30", ledgeD: 1.4 },
      "Sonderpreis Baubox": { file: "img/facades/baubox.webp", walls: 1, height: 8, single: true },
    },
    buildingStyle(b) {
      if (b.n === "McDonald's") return { wall: "#8a2a1e", roof: "#3a3a3a" };
      if (b.n === "Mercedes-Benz Autohaus Biberach") return { wall: "#cfd6dc", roof: "#555" };
      return null;
    },
    decorate(ctx) {
      const md = poi(ctx, "McDonald's");
      if (md) {
        const q = ctx.track.nearestAll(md.x, md.z);
        const p = ctx.track.at(q.s - 10, (q.d > 0 ? 1 : -1) * (ctx.track.edge + 3));
        imgSign(ctx, p.x, p.z, "img/facades/mcdrive_schild.webp", [0.049, 0.949, 0.058, 0.992], 6.26, 13, (g) => {
          g.add(box(5.95, 2.6, 0.5, lam("#c8102e"), 0, 11.54, 0));
          g.add(box(4.4, 1.0, 0.5, lam("#2b2d31"), 0, 8.15, 0));
          const pole = cyl(0.22, 0.24, 10.3, lam("#9aa0a4")); pole.position.y = 5.15; g.add(pole);
        }, 1.3);
      }
      for (const nm of ["Shell", "Agip Eni"]) {
        const sh = poi(ctx, nm);
        if (!sh) continue;
        const cr = ctx.blds.filter(b => b.b.fuel === nm)[0];
        if (cr) { const q = ctx.track.nearestAll(cr.cx, cr.cz), p = ctx.track.at(q.s); pumps(ctx, cr.cx, cr.cz, Math.atan2(p.x - cr.cx, p.z - cr.cz)); continue; }
        const q = ctx.track.nearestAll(sh.x, sh.z), tp = ctx.track.at(q.s);
        const dx = tp.x - sh.x, dz = tp.z - sh.z, L = Math.hypot(dx, dz) || 1;
        const room = L - ctx.track.edge - 7;
        if (room >= 12) { const d = Math.min(room, Math.max(12, (L - ctx.track.edge) / 2 + 3)); gasStation(ctx, sh.x + dx / L * d, sh.z + dz / L * d); }
        else { const p = ctx.track.at(q.s + 20, (q.d > 0 ? 1 : -1) * (ctx.track.edge + 9)); gasStation(ctx, p.x, p.z); }
      }
      const al = poi(ctx, "Aldi Süd");
      if (al) carts(ctx, al.x + 8, al.z + 8, 8);
      const mb = poi(ctx, "Mercedes-Benz Autohaus Biberach");
      if (mb) { for (let i = 0; i < 4; i++) sedanProp(ctx, mb.x - 10 + i * 5, mb.z - 14, 0.4, ["#111", "#cfd3d8", "#16171a", "#7a8088"][i]); }
      roundaboutIsland(ctx);
    },
  },
  {
    id: "baggersee", name: "Alberweiler Baggersee", sub: "Kieswerk · Badestelle · Schotter", music: "baggersee", style: "lake",
    color: "#3f86b8", groundColor: "#9cc46a",
    boxes: [0.14, 0.44, 0.74], bottles: [[0.24, 0, 5], [0.58, -3, 5], [0.9, 3, 5]],
    setup(track, data) {
      this.ramps = [{ at: 0.3, len: 13, h: 2.6 }, { at: 0.63, len: 9, h: 1.5 }];
    },
    decorate(ctx) {
      const lakes = ctx.data.water.slice().sort((a, b) => polyAreaAbs(b) - polyAreaAbs(a));
      const lake = lakes[0];
      const [lx, lz] = lake ? polyCentroid(lake) : [0, 0];
      // Kieswerk an der Strecke gegenueber vom See
      const tr = ctx.track;
      let far = null;
      for (let i = 0; i < tr.n; i += 6) { const d = Math.hypot(tr.px[i] - lx, tr.pz[i] - lz); if (!far || d > far.d) far = { d, i }; }
      if (far) {
        const p = tr.at(tr.s[far.i]);
        const dx = p.x - lx, dz = p.z - lz, L = Math.hypot(dx, dz) || 1;
        kieswerk(ctx, p.x + dx / L * (tr.edge + 26), p.z + dz / L * (tr.edge + 26));
      }
      // Badestelle zwischen Strecke und See
      if (lake) {
        let best = null;
        for (const q of lake) { const r = tr.nearestAll(q[0], q[1]); if (!best || r.dist < best.dist) best = { ...r, x: q[0], z: q[1] }; }
        if (best) {
          const bx = (best.x * 0.6 + tr.at(best.s).x * 0.4), bz = (best.z * 0.6 + tr.at(best.s).z * 0.4);
          beach(ctx, bx, bz, [lx, lz]);
          jetty(ctx, best.x, best.z, [lx, lz]);
        }
        flamingo(ctx, lx + 6, lz - 4);
      }
      // Lagerfeuer
      const p = tr.at(tr.L * 0.5, tr.edge + 10);
      const fire = new THREE.Group();
      for (let k = 0; k < 6; k++) { const l = box(0.25, 0.25, 1.6, lam("#5a3a1e"), 0, 0.15, 0); l.rotation.y = k; fire.add(l); }
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 8), new THREE.MeshBasicMaterial({ color: "#ff9a2a" })); fl.position.y = 0.8; fire.add(fl);
      fire.position.set(p.x, ctx.heightAt(p.x, p.z), p.z); ctx.group.add(fire);
      ctx.anim.push((dt, t) => { fl.scale.y = 1 + Math.sin(t * 13) * 0.2; fl.material.color.setHSL(0.07 + Math.sin(t * 7) * 0.02, 1, 0.55); });
    },
  },
];
