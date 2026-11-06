import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for old, new in pairs:
        if old not in s:
            print("NICHT GEFUNDEN in", p, ":", old[:70])
            continue
        s = s.replace(old, new)
    open(p, "w", encoding="utf8").write(s)


edit("tracks.js", [
    ("g.position.set(x, 0, z);", "g.position.set(x, ctx.heightAt(x, z), z);"),
    ("g.position.set(p.x, 0, p.z); g.rotation.y = p.heading;", "g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading;"),
    ("g.position.set(x + (Math.random() - 0.5) * 10, 0, z + (Math.random() - 0.5) * 10);",
     "{ const gx = x + (Math.random() - 0.5) * 10, gz = z + (Math.random() - 0.5) * 10; g.position.set(gx, ctx.heightAt(gx, gz), gz); }"),
    ("isl.position.set(cx, 0.2, cz);", "const gy = ctx.heightAt(cx, cz); isl.position.set(cx, gy + 0.2, cz);"),
    ("curb.position.set(cx, 0.3, cz);", "curb.position.set(cx, gy + 0.3, cz);"),
    ("g.position.set(cx, 0.4, cz);", "g.position.set(cx, gy + 0.4, cz);"),
    ("g.position.set(x, 0.3, z);\n  ctx.group.add(g);\n  ctx.anim.push((dt, t) => { g.position.y = 0.3 + Math.sin(t * 1.4) * 0.12;",
     "const wl = ctx.heightAt(x, z) + 0.3; g.position.set(x, wl, z);\n  ctx.group.add(g);\n  ctx.anim.push((dt, t) => { g.position.y = wl + Math.sin(t * 1.4) * 0.12;"),
    ("fire.position.set(p.x, 0, p.z);", "fire.position.set(p.x, ctx.heightAt(p.x, p.z), p.z);"),
])

edit("world.js", [
    ("  addMerged(geo.gable, new THREE.MeshLambertMaterial({ vertexColors: true }), { cast: true });",
     "  addMerged(geo.gable, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { cast: true });"),
    ("  if (extra.decorate) extra.decorate(ctx);",
     "  const before = group.children.length;\n  if (extra.decorate) extra.decorate(ctx);\n  for (const c of group.children.slice(before)) c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });"),
])

edit("items.js", [
    ("        m.position.set(p.x, 1.3, p.z);\n        this.scene.add(m);\n        this.boxes.push({ m, x: p.x, z: p.z, t: 0, ph: Math.random() * 6 });",
     "        m.position.set(p.x, p.y + 1.3, p.z);\n        m.traverse(o => { if (o.isMesh) o.castShadow = true; });\n        this.scene.add(m);\n        this.boxes.push({ m, x: p.x, y: p.y, z: p.z, t: 0, ph: Math.random() * 6 });"),
    ("        m.position.set(p.x, 0.4, p.z);\n        this.scene.add(m);\n        this.bottles.push({ m, x: p.x, z: p.z, t: 0 });",
     "        m.position.set(p.x, p.y + 0.4, p.z);\n        this.scene.add(m);\n        this.bottles.push({ m, x: p.x, y: p.y, z: p.z, t: 0 });"),
    ("      b.m.position.y = 1.3 + Math.sin(time * 2 + b.ph) * 0.25;", "      b.m.position.y = b.y + 1.3 + Math.sin(time * 2 + b.ph) * 0.25;"),
    ("        if ((r.x - b.x) ** 2 + (r.z - b.z) ** 2 < 3.6 && r.y < 3) {", "        if ((r.x - b.x) ** 2 + (r.z - b.z) ** 2 < 3.6 && r.y < b.y + 3) {"),
    ('          for (let i = 0; i < 10; i++) race.fx.spawn("spark", b.x, 1.3, b.z,', '          for (let i = 0; i < 10; i++) race.fx.spawn("spark", b.x, b.y + 1.3, b.z,'),
    ("        if ((r.x - b.x) ** 2 + (r.z - b.z) ** 2 < 3.2 && r.y < 2.5 && r.respawnT <= 0) {", "        if ((r.x - b.x) ** 2 + (r.z - b.z) ** 2 < 3.2 && r.y < b.y + 2.5 && r.respawnT <= 0) {"),
    ("        m.position.set(x, 0, z); m.rotation.y = r.heading + (Math.random() - 0.5);\n        this.scene.add(m);\n        this.objs.push({ kind: k, m, x, z,",
     "        const gy = race.track.heightAt(x, z);\n        m.position.set(x, gy, z); m.rotation.y = r.heading + (Math.random() - 0.5);\n        m.traverse(o => { if (o.isMesh) o.castShadow = true; });\n        this.scene.add(m);\n        this.objs.push({ kind: k, m, x, y: gy, z,"),
    ('        m.position.set(x, 0.8, z);\n        this.scene.add(m);\n        this.objs.push({ kind: "jaegi", m, x, z,',
     '        m.position.set(x, r.y + 0.8, z);\n        this.scene.add(m);\n        this.objs.push({ kind: "jaegi", m, x, y: r.y, z,'),
    ("        o.m.position.set(o.x, 0.8, o.z);", "        o.y = tr.baseAt(q.s);\n        o.m.position.set(o.x, o.y + 0.8, o.z);"),
    ("        o.y = 2.5 + Math.sin(time * 6) * 0.3;", "        o.y = p.y + 2.5 + Math.sin(time * 6) * 0.3;"),
    ("          if (r.respawnT > 0 || r.y > 2.5) continue;", "          if (r.respawnT > 0 || Math.abs(r.y - (o.y || 0)) > 2.5) continue;"),
    ('for (let k = 0; k < 40; k++) race.fx.spawn("spark", o.x, 1.5, o.z,', 'for (let k = 0; k < 40; k++) race.fx.spawn("spark", o.x, o.y, o.z,'),
    ('for (let k = 0; k < 12; k++) race.fx.spawn("spark", o.x, 1, o.z,', 'for (let k = 0; k < 12; k++) race.fx.spawn("spark", o.x, (o.y || 0) + 1, o.z,'),
])

edit("game.js", [
    ("    const y = 0.13 + r.h * k / N;", "    const y = p.y + 0.13 + r.h * k / N;"),
    ("  pos.push(e.x - rx * half, r.h + 0.13, e.z - rz * half, e.x + rx * half, r.h + 0.13, e.z + rz * half, e.x - rx * half, 0, e.z - rz * half, e.x + rx * half, 0, e.z + rz * half);",
     "  pos.push(e.x - rx * half, e.y + r.h + 0.13, e.z - rz * half, e.x + rx * half, e.y + r.h + 0.13, e.z + rz * half, e.x - rx * half, e.y - 0.5, e.z - rz * half, e.x + rx * half, e.y - 0.5, e.z + rz * half);"),
    ('    this.scene.add(new THREE.HemisphereLight("#e6f2ff", "#6a7a4a", 1.25));\n    const sun = new THREE.DirectionalLight("#fff4dc", 1.7); sun.position.set(-0.5, 1, 0.35); this.scene.add(sun);',
     '    this.scene.add(new THREE.HemisphereLight("#dcecff", "#7a8a5a", 1.15));\n    const sun = new THREE.DirectionalLight("#fff1d6", 2.6);\n    sun.castShadow = true;\n    sun.shadow.mapSize.set(2048, 2048);\n    const sc = sun.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 400;\n    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;\n    this.scene.add(sun); this.scene.add(sun.target);\n    this.sun = sun;\n    this.sunDir = new THREE.Vector3(-0.5, 0.75, 0.35).normalize();'),
    ('    this.scene.fog = new THREE.Fog(def.fog || "#cfe3ef", 160, 760);', '    this.scene.fog = new THREE.Fog(def.fog || "#d3e8f4", 220, 1300);'),
    ("    this.scene = new THREE.Scene();", "    this.scene = new THREE.Scene();\n    this.scene.environment = window.__env || null;\n    this.scene.environmentIntensity = 0.55;"),
    ("      car.shadow.material.map = shadowTex;\n      this.scene.add(car.root); this.scene.add(car.shadow);",
     "      car.shadow.material.map = shadowTex;\n      car.root.traverse(o => { if (o.isMesh) o.castShadow = true; });\n      this.scene.add(car.root); this.scene.add(car.shadow);"),
    ("    u.pos.y = Math.max(u.pos.y, r.y + 1.6);", "    u.pos.y = Math.max(u.pos.y, r.y + 1.6, this.track.heightAt(u.pos.x, u.pos.z) + 1.4);"),
    ("      cam.aspect = v.w / v.h; cam.updateProjectionMatrix();",
     "      cam.aspect = v.w / v.h; cam.updateProjectionMatrix();\n      const focus = r || this.racers[0];\n      const fx = focus.x + Math.sin(focus.heading) * 30, fz = focus.z + Math.cos(focus.heading) * 30;\n      this.sun.target.position.set(fx, focus.y, fz);\n      this.sun.position.set(fx + this.sunDir.x * 200, focus.y + this.sunDir.y * 200, fz + this.sunDir.z * 200);\n      this.sun.target.updateMatrixWorld();"),
])

edit("main.js", [
    ("renderer.outputColorSpace = THREE.SRGBColorSpace;",
     "renderer.outputColorSpace = THREE.SRGBColorSpace;\nrenderer.toneMapping = THREE.ACESFilmicToneMapping;\nrenderer.toneMappingExposure = 1.05;\nrenderer.shadowMap.enabled = true;\nrenderer.shadowMap.type = THREE.PCFSoftShadowMap;\nconst pmrem = new THREE.PMREMGenerator(renderer);\nwindow.__env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;"),
    ('import { TRACKS } from "./tracks.js";', 'import { TRACKS } from "./tracks.js";\nimport { RoomEnvironment } from "../vendor/RoomEnvironment.js";'),
])
print("fertig")
