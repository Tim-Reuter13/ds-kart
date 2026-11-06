import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        if s.count(a) != 1:
            raise SystemExit("count %d in %s: %s" % (s.count(a), p, a[:90]))
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


edit("world.js", [
    # Bodenhoehe: Median statt Maximum (Boeschungen machen sonst Hochhaeuser)
    ('''  let base = 1e9, top = -1e9;
  for (const [x, z] of poly) { const h = groundAt(x, z); base = Math.min(base, h); top = Math.max(top, h); }
  const hgt = Math.max(3, b.h);''', '''  let base = 1e9, top = -1e9;
  const gs = [];
  for (const [x, z] of poly) { const h = groundAt(x, z); gs.push(h); base = Math.min(base, h); top = Math.max(top, h); }
  { const [mx, mz] = centroid(poly); gs.push(groundAt(mx, mz)); gs.sort((a, c) => a - c); top = Math.min(top, gs[gs.length >> 1] + 1.0); }
  const hgt = Math.max(3, b.h);
  // Ueberdachung (Tankstellendach, Carport): Dach auf Stuetzen statt Klotz
  if (b.k === "roof" || b.k === "carport") {
    const yb = top + Math.min(hgt, b.k === "carport" ? 2.6 : 5.0), band = b.k === "carport" ? 0.35 : 0.9, ya = yb - band;
    const pos = [], uv = [], idx = [];
    let per = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], c = poly[(i + 1) % poly.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]), k = pos.length / 3;
      pos.push(a[0], ya, a[1], c[0], ya, c[1], c[0], yb, c[1], a[0], yb, a[1]);
      uv.push(per / (band * 6), 0, (per + L) / (band * 6), 0, (per + L) / (band * 6), 1, per / (band * 6), 1);
      idx.push(k, k + 2, k + 1, k, k + 3, k + 2);
      per += L;
    }
    const walls = new THREE.BufferGeometry();
    walls.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    walls.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    walls.setIndex(idx); walls.computeVertexNormals();
    const topF = flatPoly(poly, yb), bot = flatPoly(poly, ya);
    const bi = bot.index.array; for (let i = 0; i < bi.length; i += 3) { const t = bi[i]; bi[i] = bi[i + 1]; bi[i + 1] = t; }
    const bn = bot.attributes.normal; for (let i = 0; i < bn.count; i++) bn.setY(i, -bn.getY(i));
    const roof = mergeGeometries([topF, bot], false);
    const [cx, cz] = centroid(poly);
    const posts = [];
    for (const [x, z] of poly) {
      const dx = cx - x, dz = cz - z, l = Math.hypot(dx, dz) || 1, px = x + dx / l * 0.5, pz = z + dz / l * 0.5, g0 = groundAt(px, pz);
      const p = new THREE.BoxGeometry(0.32, ya - g0 + 0.3, 0.32); p.translate(px, (ya + g0 - 0.3) / 2, pz); posts.push(p);
    }
    return { walls, roof, gables: null, chimney: mergeGeometries(posts, false), big: true, canopy: true, h: yb - base, base, top: yb, poly, cx, cz, area, ri: null, pitched: false };
  }'''),
    # im Loop: Ueberdachungen eigens behandeln
    ('''    const special = extra.buildingStyle && extra.buildingStyle(b);''', '''    const special = extra.buildingStyle && extra.buildingStyle(b);
    if (r.canopy) {
      colorize(r.roof, "#eeeeec"); colorize(r.chimney, "#d9dadb");
      geo.flat.push(r.roof); geo.chim.push(r.chimney);
      if (b.fuel) {
        const t = new THREE.TextureLoader().load("img/facades/tanke_dach.webp"); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
        const m = new THREE.Mesh(r.walls, new THREE.MeshLambertMaterial({ map: t })); m.castShadow = true; group.add(m);
        const lights = [];
        for (let k = 0; k < 6; k++) { const x = r.cx + rnd(-1, 1) * Math.sqrt(r.area) * 0.3, z = r.cz + rnd(-1, 1) * Math.sqrt(r.area) * 0.3; if (inPoly(x, z, r.poly)) { const g = new THREE.BoxGeometry(1.6, 0.06, 0.5); g.translate(x, r.top - 0.93, z); lights.push(g); } }
        if (lights.length) group.add(new THREE.Mesh(mergeGeometries(lights, false), new THREE.MeshBasicMaterial({ color: "#fffbe8" })));
      } else { colorize(r.walls, "#e9e9e6"); geo.bare.push(r.walls); }
      blds.push({ ...r, b });
      continue;
    }'''),
])

edit("tracks.js", [
    # Tanke: echtes OSM-Dach nutzen, nur Zapfsaeulen darunter
    ('''function carts(ctx, x, z, n = 6) {''', '''function pumps(ctx, x, z, ang) {
  const g = new THREE.Group();
  for (const px of [-3, 3]) {
    g.add(box(1.2, 0.25, 3.2, lam("#b9bcc0"), px, 0.12, 0));
    g.add(box(1, 1.8, 0.7, lam("#d0281e"), px, 1.05, 0)); g.add(box(0.8, 0.5, 0.72, lam("#f7d117"), px, 1.75, 0));
    g.add(box(0.5, 0.35, 0.74, lam("#1d2228"), px, 1.35, 0));
  }
  g.position.set(x, ctx.heightAt(x, z), z); g.rotation.y = ang;
  ctx.group.add(g);
}

function carts(ctx, x, z, n = 6) {'''),
    ('''      for (const nm of ["Shell", "Agip Eni"]) {
        const sh = poi(ctx, nm);
        if (!sh) continue;''', '''      for (const nm of ["Shell", "Agip Eni"]) {
        const sh = poi(ctx, nm);
        if (!sh) continue;
        const cr = ctx.blds.filter(b => b.b.fuel === nm)[0];
        if (cr) { const q = ctx.track.nearestAll(cr.cx, cr.cz), p = ctx.track.at(q.s); pumps(ctx, cr.cx, cr.cz, Math.atan2(p.x - cr.cx, p.z - cr.cz)); continue; }'''),
    ('''      for (const b of data.buildings) if (b.n === "Shell" || b.n === "Agip Eni") b.h = Math.min(b.h, 4.6);''', '''      for (const b of data.buildings) if (b.n === "Shell" || b.n === "Agip Eni") b.h = Math.min(b.h, 4.6);
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
      }'''),
])
print("ok")
