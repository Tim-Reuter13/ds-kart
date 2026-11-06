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
    # Rauheits-Karten: Glas glatt (spiegelt), Putz matt
    ("""function officeTex() {""", """function roughTex(kind) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d");
  g.fillStyle = "#f0f0f0"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#1a1a1a";
  if (kind === "office") g.fillRect(6, 34, 116, 56); else { g.fillRect(45, 35, 18, 52); g.fillRect(65, 35, 18, 52); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function officeTex() {"""),
    ("""  const wallMat = (map) => new THREE.MeshLambertMaterial({ vertexColors: true, map });
  addMerged(geo.plain, wallMat(facadeTex(null)), { cast: true });
  addMerged(geo.shut, wallMat(facadeTex(shutterCol)), { cast: true });
  addMerged(geo.office, wallMat(officeTex()), { cast: true });""",
     """  const wallMat = (map, kind) => new THREE.MeshStandardMaterial({ vertexColors: true, map, roughnessMap: roughTex(kind), roughness: 1, metalness: 0, envMapIntensity: 1.1 });
  addMerged(geo.plain, wallMat(facadeTex(null), "house"), { cast: true });
  addMerged(geo.shut, wallMat(facadeTex(shutterCol), "house"), { cast: true });
  addMerged(geo.office, wallMat(officeTex(), "office"), { cast: true });"""),
    ("""  addMerged(geo.roof, new THREE.MeshLambertMaterial({ vertexColors: true, map: tileTex(), side: THREE.DoubleSide }), { cast: true });""",
     """  addMerged(geo.roof, new THREE.MeshStandardMaterial({ vertexColors: true, map: tileTex(), side: THREE.DoubleSide, roughness: 0.72, metalness: 0 }), { cast: true });"""),
    # Kontaktschatten: Wand unten dunkler
    ("""    colorize(r.walls, wc); colorize(r.roof, rc);""",
     """    colorize(r.walls, wc); colorize(r.roof, rc);
    { const pa = r.walls.attributes.position, ca = r.walls.attributes.color;
      for (let i = 0; i < pa.count; i++) if (pa.getY(i) < r.base) ca.setXYZ(i, ca.getX(i) * 0.58, ca.getY(i) * 0.58, ca.getZ(i) * 0.6); }"""),
    # Asphalt mit leichtem Glanz
    ("""  const road = new THREE.Mesh(ribbon(line, track.W, hs, { closed: true, vScale: 0.08, dy: 0.12 }), lam(isDirt ? "#d6c39a" : "#ffffff", { map: isDirt ? T.dirt() : T.asphalt(), ...po(8) }));""",
     """  const road = new THREE.Mesh(ribbon(line, track.W, hs, { closed: true, vScale: 0.08, dy: 0.12 }), isDirt ? lam("#d6c39a", { map: T.dirt(), ...po(8) })
    : new THREE.MeshStandardMaterial({ color: "#ffffff", map: T.asphalt(), roughnessMap: T.asphaltRough(), roughness: 1, metalness: 0, envMapIntensity: 0.6, ...po(8) }));"""),
    # Blumenbeete am Streckenrand
    ("""  // ---------- Gebaeude
  const blds = [];""", """  // ---------- Blumenbeete auf dem Gruenstreifen
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
  const blds = [];"""),
    ("export function buildWorld(scene, track, data, extra) {", "export function buildWorld(scene, track, data, extra, quality) {"),
])

edit("tex.js", [
    ("""  asphalt() {
    return cache.asphalt ||= tex(canvas(256, 256, (g, w, h) => {
      g.fillStyle = "#5d5f63"; g.fillRect(0, 0, w, h);
      noise(g, w, h, 2600, ["#4f5155", "#6a6c70", "#55575b", "#727478"], 0.6, 2.2);
    }));
  },""", """  asphalt() {
    return cache.asphalt ||= tex(canvas(512, 512, (g, w, h) => {
      g.fillStyle = "#56595e"; g.fillRect(0, 0, w, h);
      // grosse, weiche Flecken (Ausbesserungen, Abnutzung)
      for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 90; const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, Math.random() < 0.5 ? "rgba(40,42,46,0.18)" : "rgba(120,122,126,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      // feine Koernung
      noise(g, w, h, 16000, ["#45484c", "#6d7075", "#4e5155", "#7b7e83", "#3d4044"], 0.5, 1.4);
      // helle Steinchen
      for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(200,200,205,${0.15 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
      // Fahrspuren (leicht dunkler)
      for (const x of [w * 0.3, w * 0.7]) { const gr = g.createLinearGradient(x - 40, 0, x + 40, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(20,22,26,0.14)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - 40, 0, 80, h); }
    }));
  },
  asphaltRough() {
    return cache.asphaltRough ||= (() => { const t = tex(canvas(256, 256, (g, w, h) => {
      g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, w, h);
      noise(g, w, h, 5000, ["#8a8a8a", "#e8e8e8", "#a0a0a0"], 0.5, 2);
    })); t.colorSpace = THREE.NoColorSpace; return t; })();
  },"""),
])
print("ok")
