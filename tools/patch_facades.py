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
    # Kirchen/erzwungene Satteldaecher nicht als Flachdach-Halle behandeln
    ('  const big = area > 420 || ["industrial",', '  const big = !b.gable && (area > 420 || ["industrial",'),
    ('"doityourself", "fast_food", "fuel"].includes(b.k);', '"doityourself", "fast_food", "fuel"].includes(b.k));'),
    ('    const pitch = rnd(0.75, 1.0);', '    const pitch = b.pitch || rnd(0.75, 1.0);'),
    # Fassaden-Bilder auf die zur Strecke zeigende Wand
    ('  // Schilder an benannten Gebaeuden\n', '''  // Fassaden-Bilder (echte Gebaeude) auf die Wand, die zur Strecke zeigt
  const FAC = extra.facades || {};
  const loader = new THREE.TextureLoader();
  for (const bl of blds) {
    const f = FAC[bl.b.n];
    if (!f) continue;
    const edges = [];
    for (let i = 0; i < bl.poly.length; i++) {
      const a = bl.poly[i], c = bl.poly[(i + 1) % bl.poly.length];
      const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2, L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (L < 3) continue;
      edges.push({ a, c, mx, mz, L, score: track.nearestAll(mx, mz).dist - L * 0.35 });
    }
    edges.sort((p, q) => p.score - q.score);
    const use = f.sides === "long" ? edges.filter(e => e.L > 6).sort((p, q) => q.L - p.L).slice(0, 2) : edges.slice(0, f.walls || 1);
    loader.load(f.file, (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
      const asp = t.image.width / t.image.height;
      for (const e of use) {
        let dx = e.c[0] - e.a[0], dz = e.c[1] - e.a[1];
        let nx = dz, nz = -dx; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
        if ((e.mx + nx - bl.cx) * nx + (e.mz + nz - bl.cz) * nz < 0) { nx = -nx; nz = -nz; }
        const gy = H(e.mx, e.mz);
        const hh = Math.min(f.height || bl.h, bl.top - gy - 0.05);
        const w = e.L * 0.97, rep = Math.max(1, Math.round(w / (hh * asp)));
        const tex = t.clone(); tex.needsUpdate = true; tex.repeat.set(rep, 1);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0, envMapIntensity: 0.8 }));
        m.position.set(e.mx + nx * 0.05, gy + hh / 2, e.mz + nz * 0.05);
        m.rotation.y = Math.atan2(nx, nz);
        m.receiveShadow = true;
        group.add(m);
      }
    }, undefined, () => {});
  }

  // Schilder an benannten Gebaeuden
'''),
    ('    if (!b.n || b.n === "shelter") continue;', '    if (!b.n || b.n === "shelter" || FAC[b.n]) continue;'),
])

edit("tracks.js", [
    # Gebaeude den Orten zuordnen
    ("function polyCentroid(p) {", '''// Namen von Orten (Punkte) auf das naechste Gebaeude uebertragen
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
  g.add(box(0.1, 1.2, 0.1, lam("#e8c46a"), 0, 8.6, 0)); g.add(box(0.6, 0.1, 0.1, lam("#e8c46a"), 0, 8.8, 0));
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

function polyCentroid(p) {'''),
    # Schemmerhofen
    ('''      this.ramps = xs.slice(0, 1).map(s => ({ at: ((s - 13) / track.L + 1) % 1, len: 11, h: 1.7 }));
    },
    buildingStyle(b) {
      if (b.n === "Rathaus Schemmerhofen") return { wall: "#f4e2b8", roof: "#7a2e1e" };
      return null;
    },''', '''      this.ramps = xs.slice(0, 1).map(s => ({ at: ((s - 13) / track.L + 1) % 1, len: 11, h: 1.7 }));
    },
    prepare(data) {
      tagBuildings(data, ["St. Mauritius", "Rathaus Schemmerhofen", "Bäckerei Keck", "Lidl", "Activ Kebap", "Mühlbachhalle"]);
      const ch = data.buildings.find(b => b.n === "St. Mauritius"); if (ch) { ch.gable = true; ch.pitch = 1.25; ch.h = Math.max(ch.h, 9); }
      const rh = data.buildings.find(b => b.n === "Rathaus Schemmerhofen"); if (rh) rh.h = Math.max(rh.h, 8);
    },
    facades: {
      "St. Mauritius": { file: "img/facades/st_mauritius_wand.webp", sides: "long" },
      "Rathaus Schemmerhofen": { file: "img/facades/rathaus.webp", walls: 2 },
      "Bäckerei Keck": { file: "img/facades/baeckerei_keck.webp", height: 4.2 },
      "Lidl": { file: "img/facades/lidl_markt.webp", walls: 2 },
      "Activ Kebap": { file: "img/facades/activ_kebap.webp", height: 4 },
      "Mühlbachhalle": { file: "img/facades/muehlbachhalle.webp", walls: 2 },
    },
    buildingStyle(b) {
      if (b.n === "Rathaus Schemmerhofen") return { wall: "#dccba5", roof: "#7c7a74" };
      if (b.n === "St. Mauritius") return { wall: "#f6f4ee", roof: "#b9532f" };
      if (b.n === "Mühlbachhalle") return { wall: "#f2f2ee", roof: "#4a3a2e" };
      return null;
    },'''),
    ('''      const m = poi(ctx, "St. Mauritius");
      if (m) church(ctx, m.x, m.z);
      const rh = poi(ctx, "Rathaus Schemmerhofen");
      if (rh) {
        const q = ctx.track.nearestAll(rh.x, rh.z);
        const p = ctx.track.at(q.s + 14, (q.d > 0 ? 1 : -1) * (ctx.track.edge + 4));
        maibaum(ctx, p.x, p.z);
        const p2 = ctx.track.at(q.s - 6, (q.d > 0 ? 1 : -1) * (ctx.track.edge + 3));
        flags(ctx, p2.x, p2.z);
      }''', '''      if (ctx.blds.some(b => b.b.n === "St. Mauritius")) turret(ctx, "St. Mauritius");
      else { const m = poi(ctx, "St. Mauritius"); if (m) church(ctx, m.x, m.z); }
      const rh = poi(ctx, "Rathaus Schemmerhofen");
      if (rh) {
        const q = ctx.track.nearestAll(rh.x, rh.z);
        const sd = q.d > 0 ? 1 : -1;
        const p = ctx.track.at(q.s + 6, sd * (ctx.track.edge + 7));
        ribbonSculpture(ctx, p.x, p.z);
        const p2 = ctx.track.at(q.s - 6, sd * (ctx.track.edge + 3));
        flags(ctx, p2.x, p2.z);
      }'''),
    # Biberach
    ('''      if (a) { const q = track.nearestAll(a.x, a.z); this.ramps.push({ at: ((q.s + 20) / track.L) % 1, len: 10, h: 1.6 }); }
    },''', '''      if (a) { const q = track.nearestAll(a.x, a.z); this.ramps.push({ at: ((q.s + 20) / track.L) % 1, len: 10, h: 1.6 }); }
    },
    prepare(data) {
      tagBuildings(data, ["McDonald's", "Shell", "Mercedes-Benz Autohaus Biberach", "Sonderpreis Baubox"]);
    },
    facades: {
      "McDonald's": { file: "img/facades/maecces.webp", walls: 2, height: 5 },
      "Shell": { file: "img/facades/tanke.webp", walls: 2 },
      "Mercedes-Benz Autohaus Biberach": { file: "img/facades/autohaus.webp", walls: 2 },
      "Sonderpreis Baubox": { file: "img/facades/baubox.webp", walls: 1 },
    },'''),
])

edit("game.js", [
    ("    this.track = new Track(data, def);", "    if (def.prepare && !data._prepared) { def.prepare(data); data._prepared = true; }\n    this.track = new Track(data, def);"),
])
print("ok")
