import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            raise SystemExit("NICHT GEFUNDEN in %s: %s" % (p, a[:90]))
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


edit("world.js", [
    # ---- Walmdach-Variante + Dachinfo zurueckgeben
    ('''    const P = (u, v, y) => [u * ux + v * vx, y, u * uz + v * vz];
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
    roof.computeVertexNormals();''', '''    const P = (u, v, y) => [u * ux + v * vx, y, u * uz + v * vz];
    const ye = y1 - 0.25;
    const hip = !b.gable && (u1 - u0) > (v1 - v0) * 1.2 && Math.random() < 0.3;
    const hi = hip ? Math.min(half * 0.85, (u1 - u0) * 0.35) : 0;
    const A = P(u0, v0, ye), B = P(u1, v0, ye), C = P(u1, v1, ye), D = P(u0, v1, ye);
    const E = P(u0 + hi, vm, y1 + rh), F = P(u1 - hi, vm, y1 + rh);
    const rp = [...A, ...B, ...F, ...E, ...C, ...D, ...E, ...F];
    const slopeL = Math.hypot(half, rh);
    const lu = (u1 - u0) / 2;
    const ruv = [0, 0, lu, 0, lu, slopeL / 2, 0, slopeL / 2, 0, 0, lu, 0, lu, slopeL / 2, 0, slopeL / 2];
    const ri = [0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6];
    if (hip) { rp.push(...D, ...A, ...E, ...B, ...C, ...F); ruv.push(0, 0, half, 0, half / 2, slopeL / 2, 0, 0, half, 0, half / 2, slopeL / 2); ri.push(8, 10, 9, 11, 13, 12); }
    roof = new THREE.BufferGeometry();
    roof.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3));
    roof.setAttribute("uv", new THREE.Float32BufferAttribute(ruv, 2));
    roof.setIndex(ri);
    roof.computeVertexNormals();
    rinfo = { ux, uz, vx, vz, u0, u1, v0, v1, vm, half, rh, y1, hip };'''),
    ('''    gables = new THREE.BufferGeometry();''', '''    if (!hip) gables = new THREE.BufferGeometry();'''),
    ('''    gables.setAttribute("position", new THREE.Float32BufferAttribute([...G0a, ...G0b, ...G0c, ...G1a, ...G1b, ...G1c], 3));
    gables.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 0.5, 0, 0, 1, 0, 0.5, 0.5], 2));
    gables.setIndex([0, 2, 1, 3, 5, 4]);
    gables.computeVertexNormals();''', '''    if (gables) {
      gables.setAttribute("position", new THREE.Float32BufferAttribute([...G0a, ...G0b, ...G0c, ...G1a, ...G1b, ...G1c], 3));
      gables.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 0.5, 0, 0, 1, 0, 0.5, 0.5], 2));
      gables.setIndex([0, 2, 1, 3, 5, 4]);
      gables.computeVertexNormals();
    }'''),
    ('''  let roof = null, gables = null, chimney = null;''', '''  let roof = null, gables = null, chimney = null, rinfo = null;'''),
    ('''  return { walls, roof, gables, chimney, big, h: hgt, base, top: y1, poly, cx, cz };''',
     '''  return { walls, roof, gables, chimney, big, h: hgt, base, top: y1, poly, cx, cz, area, ri: rinfo, pitched: !!rinfo };'''),

    # ---- Details im Gebaeude-Loop
    ('''  const shutterCol = pick(["#3f6e3a", "#7a4a2a", "#3a5a7a"]);
  for (const b of data.buildings) {''', '''  const shutterCol = pick(["#3f6e3a", "#7a4a2a", "#3a5a7a"]);
  const FAC = extra.facades || {};
  // Details (Gauben, Tueren, Vordaecher, Balkone, Sockel, Attika, Dachtechnik) - als gemergte Boxen
  const det = [], glass = [];
  const DB = (w, h, d, col, o = {}) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (o.rz) g.rotateZ(o.rz);
    if (o.l) g.translate(o.l[0], o.l[1], o.l[2]);
    if (o.ry) g.rotateY(o.ry);
    g.translate(o.x || 0, o.y || 0, o.z || 0);
    g.deleteAttribute("uv");
    colorize(g, col); (o.glass ? glass : det).push(g);
  };
  const tpx = [], tpz = [];
  for (let i = 0; i < track.n; i += 2) { tpx.push(track.px[i]); tpz.push(track.pz[i]); }
  const nearTP = (x, z) => { let bd = 1e18, bi = 0; for (let i = 0; i < tpx.length; i++) { const dx = tpx[i] - x, dz = tpz[i] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; bi = i; } } return { x: tpx[bi], z: tpz[bi], dist: Math.sqrt(bd) }; };
  const detDist = 55 + 60 * ((quality && quality.extras) || 1);
  const DOORS = ["#5a3a22", "#3d4a5a", "#6b4a2e", "#7d2f25", "#2f4a3a", "#8a8f96"];
  const RAILS = ["#6b4a2e", "#e8e8e6", "#3a3d42", "#5a3a22"];
  const edgesOf = (r, tp) => {
    const out = [], P = r.poly;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], c = P[(i + 1) % P.length];
      const dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz);
      if (L < 1.2) continue;
      let nx = dz / L, nz = -dx / L;
      const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
      if ((mx + nx - r.cx) * nx + (mz + nz - r.cz) * nz < 0) { nx = -nx; nz = -nz; }
      const tx = tp.x - mx, tz = tp.z - mz, tl = Math.hypot(tx, tz) || 1;
      out.push({ a, c, L, mx, mz, nx, nz, ry: Math.atan2(nx, nz), face: (nx * tx + nz * tz) / tl });
    }
    return out;
  };
  const onEdge = (e, t) => [e.a[0] + (e.c[0] - e.a[0]) * t, e.a[1] + (e.c[1] - e.a[1]) * t];
  function houseDetails(r, wc, rc, tp, near) {
    const ex = edgesOf(r, tp);
    // Sockel
    if (near) {
      const pc = pick(["#9a958c", "#8c8a86", "#a39d92", "#7f7b74"]);
      for (const e of ex) {
        const ga = H(e.a[0], e.a[1]), gc = H(e.c[0], e.c[1]);
        const lo = Math.min(ga, gc) - 0.4, hi = Math.max(ga, gc) + 0.5;
        if (hi - lo > 3) continue;
        DB(e.L + 0.16, hi - lo, 0.1, pc, { x: e.mx + e.nx * 0.05, y: (lo + hi) / 2, z: e.mz + e.nz * 0.05, ry: e.ry });
      }
    }
    // Haustuer mit Rahmen, Stufe und Vordach auf der Seite zur Strecke
    const fr = ex.filter(e => e.L >= 3.5).sort((p, q) => q.face - p.face);
    let doorT = 0.5;
    if (fr.length) {
      const e = fr[0]; doorT = rnd(0.3, 0.7);
      const [px, pz] = onEdge(e, doorT), gy = H(px, pz), o = (d) => ({ x: px + e.nx * d, z: pz + e.nz * d, ry: e.ry });
      DB(1.32, 2.36, 0.08, "#efece5", { ...o(0.05), y: gy + 1.18 });
      DB(1.06, 2.16, 0.1, pick(DOORS), { ...o(0.06), y: gy + 1.08 });
      DB(0.25, 0.25, 0.04, "#e9e4b0", { ...o(0.1), y: gy + 2.55, l: [0.9, 0, 0] });
      DB(1.7, 0.2, 0.75, "#b8b3aa", { ...o(0.38), y: gy + 0.06 });
      if (Math.random() < 0.8) DB(2.1, 0.12, 1.15, pick(["#e9e6df", "#5b5f66", rc, "#7a5236"]), { ...o(0.58), y: gy + 2.68 });
    }
    // Balkon
    const room = r.top - H(r.cx, r.cz);
    if (room > 5.3 && Math.random() < 0.42) {
      const e = fr.find((q, i) => i > 0 && q.L >= 4) || (fr[0] && fr[0].L >= 8 ? fr[0] : null);
      if (e) {
        const t = e === fr[0] ? (doorT < 0.5 ? 0.76 : 0.24) : rnd(0.35, 0.65);
        const [px, pz] = onEdge(e, t), gy = H(px, pz), bw = Math.min(3.4, e.L * 0.45), rc2 = pick(RAILS);
        const o = { x: px, z: pz, ry: e.ry }, fy = gy + 2.95;
        if (r.top - gy > 5.4) {
          DB(bw, 0.16, 1.25, "#d9d6cf", { ...o, y: fy, l: [0, 0, 0.62] });
          DB(bw, 0.95, 0.06, rc2, { ...o, y: fy + 0.55, l: [0, 0, 1.22] });
          DB(0.06, 0.95, 1.2, rc2, { ...o, y: fy + 0.55, l: [-bw / 2 + 0.03, 0, 0.62] });
          DB(0.06, 0.95, 1.2, rc2, { ...o, y: fy + 0.55, l: [bw / 2 - 0.03, 0, 0.62] });
          DB(1.0, 2.1, 0.08, "#26303a", { ...o, y: fy + 1.13, l: [0, 0, 0.05], glass: true });
        }
      }
    }
    // Dachgauben
    const R = r.ri;
    if (R && R.rh > 2.8 && R.u1 - R.u0 > 8 && Math.random() < 0.55) {
      const n = R.u1 - R.u0 > 13 ? 2 : 1, sides = Math.random() < 0.5 ? [1] : [1, -1];
      const dd = Math.min(2.2, R.half * 0.5), hd = 1.45;
      for (const sd of sides) for (let k = 0; k < n; k++) {
        const u = R.u0 + (R.u1 - R.u0) * (k + 1) / (n + 1), vF = R.vm + sd * R.half * 0.55;
        const yF = R.y1 + R.rh - (R.rh + 0.25) * 0.55, y0 = yF - 0.15;
        const o = { x: u * R.ux + vF * R.vx, z: u * R.uz + vF * R.vz, ry: Math.atan2(sd * R.vx, sd * R.vz) };
        DB(1.9, hd, dd, wc, { ...o, y: y0 + hd / 2, l: [0, 0, -dd / 2] });
        DB(1.25, 0.1, dd + 0.35, rc, { ...o, y: y0 + hd + 0.3, l: [-0.5, 0, -dd / 2 + 0.17], rz: 0.55 });
        DB(1.25, 0.1, dd + 0.35, rc, { ...o, y: y0 + hd + 0.3, l: [0.5, 0, -dd / 2 + 0.17], rz: -0.55 });
        DB(1.1, 0.34, 0.1, wc, { ...o, y: y0 + hd + 0.12, l: [0, 0, -0.05] });
        DB(1.15, 0.95, 0.06, "#f2efe8", { ...o, y: y0 + hd * 0.5 + 0.05, l: [0, 0, 0.02] });
        DB(0.95, 0.75, 0.07, "#26303a", { ...o, y: y0 + hd * 0.5 + 0.05, l: [0, 0, 0.03], glass: true });
      }
    }
  }
  function bigDetails(r, wc, tp, withEntrance) {
    const ex = edgesOf(r, tp);
    // Attika (Brüstung am Flachdach)
    const ac = "#" + new THREE.Color(wc).multiplyScalar(0.84).getHexString();
    for (const e of ex) DB(e.L + 0.3, 0.7, 0.3, ac, { x: e.mx - e.nx * 0.15, y: r.top + 0.35, z: e.mz - e.nz * 0.15, ry: e.ry });
    // Dachtechnik
    const n = Math.min(5, 1 + Math.floor(r.area / 300));
    const ang = r.ri ? 0 : Math.atan2(ex[0]?.nx || 0, ex[0]?.nz || 1);
    for (let k = 0, tries = 0; k < n && tries < 40; tries++) {
      const x = r.cx + rnd(-1, 1) * Math.sqrt(r.area) * 0.4, z = r.cz + rnd(-1, 1) * Math.sqrt(r.area) * 0.4;
      if (![[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].every(([a, c]) => inPoly(x + a, z + c, r.poly))) continue;
      const h = rnd(0.8, 1.6);
      DB(rnd(1.4, 3.2), h, rnd(1.2, 2.4), pick(["#b9bcc0", "#a7aaad", "#c9cbcd", "#9da1a5"]), { x, y: r.top + h / 2, z, ry: ang });
      if (Math.random() < 0.5) DB(0.5, 0.9, 0.5, "#8d9196", { x: x + 1.8, y: r.top + 0.45, z, ry: ang });
      k++;
    }
    // Eingang mit Glastuer und Vordach
    if (!withEntrance) return;
    const e = ex.filter(q => q.L >= 7).sort((p, q) => q.face - p.face)[0];
    if (!e) return;
    const [px, pz] = onEdge(e, rnd(0.3, 0.7)), gy = H(px, pz), o = { x: px, z: pz, ry: e.ry };
    const cw = Math.min(e.L * 0.5, 7.5);
    DB(2.9, 2.75, 0.08, "#c8cacc", { ...o, y: gy + 1.37, l: [0, 0, 0.04] });
    DB(2.5, 2.5, 0.1, "#2a3540", { ...o, y: gy + 1.25, l: [0, 0, 0.06], glass: true });
    DB(cw, 0.28, 2.3, "#d6d7d9", { ...o, y: gy + 3.25, l: [0, 0, 1.15] });
    DB(0.16, 3.2, 0.16, "#9a9ea3", { ...o, y: gy + 1.6, l: [-cw / 2 + 0.25, 0, 2.1] });
    DB(0.16, 3.2, 0.16, "#9a9ea3", { ...o, y: gy + 1.6, l: [cw / 2 - 0.25, 0, 2.1] });
  }
  for (const b of data.buildings) {'''),
    ('''    (r.gables ? geo.roof : geo.flat).push(r.roof);''', '''    (r.pitched ? geo.roof : geo.flat).push(r.roof);
    const tp = nearTP(r.cx, r.cz);
    if (tp.dist < detDist && !b.gable && b.n !== "shelter") {
      if (r.big) bigDetails(r, wc, tp, !FAC[b.n]);
      else if (!FAC[b.n]) houseDetails(r, wc, rc, tp, tp.dist < detDist * 0.7);
    }'''),
    # ---- Fassaden: synchron Gesims/Vordach erzeugen, Textur asynchron
    ('''  // Fassaden-Bilder (echte Gebaeude) auf die Wand, die zur Strecke zeigt
  const FAC = extra.facades || {};
  const loader''', '''  // Fassaden-Bilder (echte Gebaeude) auf die Wand, die zur Strecke zeigt
  const loader'''),
    ('''    const use = f.sides === "long" ? edges.filter(e => e.L > 6).sort((p, q) => q.L - p.L).slice(0, 2) : edges.slice(0, f.walls || 1);
    loader.load(f.file, (t) => {''', '''    const use = f.sides === "long" ? edges.filter(e => e.L > 6).sort((p, q) => q.L - p.L).slice(0, 2) : edges.slice(0, f.walls || 1);
    for (const e of use) {
      let nx = e.c[1] - e.a[1], nz = -(e.c[0] - e.a[0]); const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
      if ((e.mx + nx - bl.cx) * nx + (e.mz + nz - bl.cz) * nz < 0) { nx = -nx; nz = -nz; }
      const gy = H(e.mx, e.mz), hh = Math.min(f.height || bl.h, bl.top - gy - 0.05), w = e.L * 0.97, ry = Math.atan2(nx, nz);
      if (!bl.b.gable && hh < bl.top - gy - 0.4) DB(w + 0.2, 0.3, 0.34, f.trim || "#d9d7d1", { x: e.mx + nx * 0.13, y: gy + hh + 0.15, z: e.mz + nz * 0.13, ry });
      if (f.ledge) { const d = f.ledgeD || 0.9; DB(w * (f.ledgeW || 1), 0.22, d, f.ledgeCol || "#55585e", { x: e.mx + nx * (d / 2 + 0.05), y: gy + hh * f.ledge, z: e.mz + nz * (d / 2 + 0.05), ry }); }
    }
    loader.load(f.file, (t) => {'''),
    ('''  // Schilder an benannten Gebaeuden
  for (const bl of blds) {''', '''  addMerged(det, new THREE.MeshLambertMaterial({ vertexColors: true }), { cast: true });
  addMerged(glass, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.5, envMapIntensity: 1.4 }), { cast: false });

  // Schilder an benannten Gebaeuden
  for (const bl of blds) {'''),
])

edit("tracks.js", [
    # Bild-Schild (freigestellt) mit 3D-Koerper
    ("function pylon(ctx, x, z, lines, bg, fg, h = 12) {", '''function texLoad(file, rx, ry, ox, oy) {
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

function pylon(ctx, x, z, lines, bg, fg, h = 12) {'''),
    # Tankstellendach mit Textur
    ('''  g.add(box(14, 0.8, 10, lam("#f2f2f2"), 0, 5.3, 0));
  g.add(box(14.1, 0.5, 10.1, lam("#f7d117"), 0, 5.0, 0));
  g.add(box(14.15, 0.2, 10.15, lam("#d0281e"), 0, 4.7, 0));''', '''  {
    const side = (rep) => new THREE.MeshLambertMaterial({ map: texLoad("img/facades/tanke_dach.webp", rep, 1, 0, 0) });
    const sx = side(3), sz = side(4), top = lam("#f2f2f2"), bot = lam("#e4e4e2");
    sx.map.wrapS = sz.map.wrapS = THREE.RepeatWrapping;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14.15, 1.3, 10.15), [sx, sx, top, bot, sz, sz]);
    roof.position.y = 5.1; roof.castShadow = true; g.add(roof);
    for (const [lx, lz] of [[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5]]) g.add(box(1.6, 0.06, 0.5, new THREE.MeshBasicMaterial({ color: "#fffbe8" }), lx, 4.42, lz));
  }'''),
    ('''  const sg = signBoard("Tanke", "#f7d117", "#d0281e", 5, 1.4); sg.position.set(0, 5.3, 5.06); g.add(sg);''',
     '''  const sg = signBoard("Tanke", "#f7d117", "#d0281e", 4, 1.0); sg.position.set(0, 6.3, 5.0); g.add(sg);
  g.add(box(4.2, 1.2, 0.1, lam("#f7d117"), 0, 6.3, 4.94));'''),
    # Tuermchen mit echter Textur
    ('''  const g = new THREE.Group();
  const green = lam("#4f8a72"), dark = lam("#2f5446"), white = lam("#f4f2ec");
  g.add(box(2.6, 1.2, 2.6, white, 0, 0.6, 0));
  g.add(box(2.4, 2.6, 2.4, green, 0, 2.5, 0));
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, f = new THREE.Group(); f.rotation.y = a;
    const louv = box(0.9, 1.2, 0.08, dark, 0, 2.9, 1.22); f.add(louv);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), lam("#c8381e")); clock.position.set(0, 1.7, 1.215); f.add(clock);
    const hand = box(0.06, 0.34, 0.03, lam("#e8c46a"), 0, 1.8, 1.23); f.add(hand);
    g.add(f);
  }
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 4), green); cap.rotation.y = Math.PI / 4; cap.position.y = 4.4; g.add(cap);
  const lant = box(0.8, 0.9, 0.8, green, 0, 5.3, 0); g.add(lant);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.4, 4), green); spire.rotation.y = Math.PI / 4; spire.position.y = 6.9; g.add(spire);
  g.add(box(0.1, 1.2, 0.1, lam("#e8c46a"), 0, 8.6, 0)); g.add(box(0.6, 0.1, 0.1, lam("#e8c46a"), 0, 8.8, 0));''', '''  const g = new THREE.Group();
  const green = lam("#6f9a80"), dark = lam("#4d7562"), white = lam("#f4f2ec"), gold = lam("#e2b84a");
  g.add(box(2.6, 1.2, 2.6, white, 0, 0.6, 0));
  const face = new THREE.MeshLambertMaterial({ map: texLoad("img/facades/st_mauritius_tuermchen.webp", 0.212, 0.55, 0.394, 0.01) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.0, 2.2), [face, face, green, green, face, face]);
  body.position.y = 3.6; body.castShadow = true; g.add(body);
  g.add(box(2.7, 0.35, 2.7, dark, 0, 6.25, 0));
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.75, 4.2, 4), green); spire.rotation.y = Math.PI / 4; spire.position.y = 8.5; spire.castShadow = true; g.add(spire);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), gold); ball.position.y = 10.75; g.add(ball);
  g.add(box(0.08, 1.1, 0.08, gold, 0, 11.4, 0)); g.add(box(0.5, 0.08, 0.08, gold, 0, 11.6, 0));'''),
    # Maecces-Pylon mit echtem Schild
    ('''        pylon(ctx, p.x, p.z, [["Mäcces", 6], ["Drive-In 24h", 6]], "#c8102e", "#ffc72c", 13);''',
     '''        imgSign(ctx, p.x, p.z, "img/facades/mcdrive_schild.webp", [0.049, 0.949, 0.058, 0.992], 6.26, 13, (g) => {
          g.add(box(5.95, 2.6, 0.5, lam("#c8102e"), 0, 11.54, 0));
          g.add(box(4.4, 1.0, 0.5, lam("#2b2d31"), 0, 8.15, 0));
          const pole = cyl(0.22, 0.24, 10.3, lam("#9aa0a4")); pole.position.y = 5.15; g.add(pole);
        }, 0.6);'''),
    # Tankstelle neben den Shop statt hinein
    ('''      const sh = poi(ctx, "Shell");
      if (sh) gasStation(ctx, sh.x, sh.z);''', '''      for (const nm of ["Shell", "Agip Eni"]) {
        const sh = poi(ctx, nm);
        if (!sh) continue;
        const q = ctx.track.nearestAll(sh.x, sh.z), tp = ctx.track.at(q.s);
        const dx = tp.x - sh.x, dz = tp.z - sh.z, L = Math.hypot(dx, dz) || 1;
        const room = L - ctx.track.edge - 7;
        if (room >= 12) { const d = Math.min(room, Math.max(12, (L - ctx.track.edge) / 2 + 3)); gasStation(ctx, sh.x + dx / L * d, sh.z + dz / L * d); }
        else { const p = ctx.track.at(q.s + 20, (q.d > 0 ? 1 : -1) * (ctx.track.edge + 9)); gasStation(ctx, p.x, p.z); }
      }'''),
    ('''      "Shell": { file: "img/facades/tanke.webp", walls: 2 },''', '''      "Shell": { file: "img/facades/tanke.webp", walls: 2, height: 4.2 },
      "Agip Eni": { file: "img/facades/tanke.webp", walls: 2, height: 4.2 },'''),
    ('''      "McDonald's": { file: "img/facades/maecces.webp", walls: 2, height: 5 },''', '''      "McDonald's": { file: "img/facades/maecces.webp", walls: 2, height: 5, ledge: 0.66, ledgeCol: "#4a3326", ledgeD: 0.8, trim: "#4a3326" },'''),
    ('''      "Mercedes-Benz Autohaus Biberach": { file: "img/facades/autohaus.webp", walls: 2 },
      "Sonderpreis Baubox": { file: "img/facades/baubox.webp", walls: 1 },''', '''      "Mercedes-Benz Autohaus Biberach": { file: "img/facades/autohaus.webp", walls: 2, ledge: 0.49, ledgeCol: "#2a2c30", ledgeD: 1.4 },
      "Sonderpreis Baubox": { file: "img/facades/baubox.webp", walls: 1, ledge: 0.47, ledgeCol: "#e6e6e4", ledgeD: 1.6 },'''),
    ('''      tagBuildings(data, ["McDonald's", "Shell", "Mercedes-Benz Autohaus Biberach", "Sonderpreis Baubox"]);''',
     '''      tagBuildings(data, ["McDonald's", "Shell", "Mercedes-Benz Autohaus Biberach", "Sonderpreis Baubox", "Agip Eni"]);
      for (const b of data.buildings) if (b.n === "Shell" || b.n === "Agip Eni") b.h = Math.min(b.h, 4.6);'''),
    # Schemmerhofen: Lidl-Vordach, Rathaus-Glasdach, activ-center Pylon
    ('''      "Lidl": { file: "img/facades/lidl_markt.webp", walls: 2 },''', '''      "Lidl": { file: "img/facades/lidl_markt.webp", walls: 2, ledge: 0.56, ledgeCol: "#d9dadc", ledgeD: 1.8, ledgeW: 0.6 },'''),
    ('''      "Rathaus Schemmerhofen": { file: "img/facades/rathaus.webp", walls: 2 },''', '''      "Rathaus Schemmerhofen": { file: "img/facades/rathaus.webp", walls: 2, ledge: 0.43, ledgeCol: "#c9ccce", ledgeD: 1.5, ledgeW: 0.22 },'''),
    ('''      if (ctx.blds.some(b => b.b.n === "St. Mauritius")) turret(ctx, "St. Mauritius");''', '''      if (ctx.blds.some(b => b.b.n === "St. Mauritius")) turret(ctx, "St. Mauritius");
      const li = poi(ctx, "Lidl");
      if (li) {
        const q = ctx.track.nearestAll(li.x, li.z);
        const p = ctx.track.at(q.s + 12, (q.d > 0 ? 1 : -1) * (ctx.track.edge + 4));
        imgSign(ctx, p.x, p.z, "img/facades/activcenter_pylon.webp", [0.361, 0.636, 0.016, 0.983], 1.9, 14, (g) => g.add(box(1.86, 14, 0.5, lam("#c8231e"), 0, 7, 0)), 0.5);
      }'''),
])
print("ok")
