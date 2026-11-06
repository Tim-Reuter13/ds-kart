import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for old, new in pairs:
        if old not in s:
            raise SystemExit(f"NICHT GEFUNDEN in {p}: {old[:80]}")
        s = s.replace(old, new)
    open(p, "w", encoding="utf8").write(s)


edit("kart.js", [
    # vorherigen Zustand fuer Zwischenbilder merken
    ("    const driftEdge = inp.drift && !this.prevDrift;",
     "    this.ox = this.x; this.oy = this.y; this.oz = this.z; this.oh = this.heading;\n    const driftEdge = inp.drift && !this.prevDrift;"),
    # Lenkung glaetten (Tastatur springt sonst von 0 auf 1)
    ("    const steer = control ? clamp(inp.steer, -1, 1) : 0;",
     "    const rawSteer = control ? clamp(inp.steer, -1, 1) : 0;\n    this.steerS = (this.steerS || 0) + (rawSteer - (this.steerS || 0)) * Math.min(1, dt * 14);\n    const steer = Math.abs(this.steerS) < 0.01 && rawSteer === 0 ? 0 : this.steerS;"),
    # Teleports ohne Wischer
    ("        this.x = p.x; this.z = p.z; this.y = p.y; this.vy = 0; this.heading = p.heading; this.speed = 0;",
     "        this.x = p.x; this.z = p.z; this.y = p.y; this.vy = 0; this.heading = p.heading; this.speed = 0;\n        this.ox = this.x; this.oy = this.y; this.oz = this.z; this.oh = this.heading;"),
    ("    this.x = p.x; this.z = p.z; this.y = p.y; this.heading = p.heading; this.hint = p.i;",
     "    this.x = p.x; this.z = p.z; this.y = p.y; this.heading = p.heading; this.hint = p.i;\n    this.ox = this.x; this.oy = this.y; this.oz = this.z; this.oh = this.heading;"),
    # Darstellung zwischen zwei Physikschritten interpolieren
    ("  syncModel(dt) {\n    const m = this.car.root;\n    m.position.set(this.x, this.y, this.z);",
     "  syncModel(dt, alpha = 1) {\n    const m = this.car.root;\n"
     "    const ox = this.ox ?? this.x, oy = this.oy ?? this.y, oz = this.oz ?? this.z, oh = this.oh ?? this.heading;\n"
     "    let dh = this.heading - oh; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;\n"
     "    this.rx = ox + (this.x - ox) * alpha; this.ry = oy + (this.y - oy) * alpha; this.rz = oz + (this.z - oz) * alpha; this.rh = oh + dh * alpha;\n"
     "    m.position.set(this.rx, this.ry, this.rz);"),
    ("    m.rotation.y = this.heading + this.visualYaw + (this.spinT > 0 ? this.trickSpin : 0);",
     "    m.rotation.y = this.rh + this.visualYaw + (this.spinT > 0 ? this.trickSpin : 0);"),
    ("    sh.position.set(this.x, 0.16 + (this.groundH || 0), this.z);\n    sh.rotation.z = -this.heading;",
     "    sh.position.set(this.rx, 0.16 + (this.groundH || 0), this.rz);\n    sh.rotation.z = -this.rh;"),
])

edit("game.js", [
    ("    for (const r of this.racers) r.syncModel(dt);",
     "    const alpha = Math.min(1, this.acc / STEP);\n    for (const r of this.racers) r.syncModel(dt, alpha);"),
    # Kamera auf die interpolierte Position
    ("  updateCam(cam, r, dt, tv = false) {\n    const fx = Math.sin(r.heading), fz = Math.cos(r.heading);",
     "  updateCam(cam, r0, dt, tv = false) {\n    const r = { x: r0.rx ?? r0.x, y: r0.ry ?? r0.y, z: r0.rz ?? r0.z, heading: r0.rh ?? r0.heading, input: r0.input, human: r0.human, boostT: r0.boostT, speed: r0.speed };\n    const fx = Math.sin(r.heading), fz = Math.cos(r.heading);"),
    # Rueckblick nur noch per eigener Taste, nie mehr beim Bremsen vom Handy
    ("    const back = !tv && r.input.back && r.human;", "    const back = !tv && r.input.back && r.human && !(r0.dev || '').startsWith('ph');"),
    # Handys geben im Countdown immer Gas -> kein Abwuergen fuer Handys
    ("          else if (t0 !== undefined && t0 >= 2.6) { h.spinT = 0.8;",
     "          else if (t0 !== undefined && t0 >= 2.6 && !(h.dev || '').startsWith('ph')) { h.spinT = 0.8;"),
])
print("ok")
