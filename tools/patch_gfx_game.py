import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))
p = "game.js"
s = open(p, encoding="utf8").read()


def rep(a, b):
    global s
    if a not in s:
        raise SystemExit("NICHT GEFUNDEN: " + a[:90])
    s = s.replace(a, b)


# ---------- Kamera
start = s.index("  updateCam(cam, r0, dt, tv = false) {")
end = s.index("  render(dt) {")
s = s[:start] + '''  updateCam(cam, r0, dt, tv = false) {
    const r = { x: r0.rx ?? r0.x, y: r0.ry ?? r0.y, z: r0.rz ?? r0.z, heading: r0.rh ?? r0.heading };
    const fx = Math.sin(r.heading), fz = Math.cos(r.heading);
    const back = !tv && r0.input.back && r0.human && !(r0.dev || "").startsWith("ph");
    const u = cam.userData;
    const sp = Math.abs(r0.speed), top = this.cls.top;
    // beim Boost zieht die Kamera leicht zurueck
    u.pull = (u.pull || 0) + (((r0.boostT > 0) ? 1.6 : 0) + Math.min(1, sp / top) * 0.6 - (u.pull || 0)) * Math.min(1, dt * 3);
    const dist = (tv ? 11 : 7.0) + u.pull, height = tv ? 5 : 3.0 + u.pull * 0.15;
    const sgn = back ? -1 : 1;
    const want = new THREE.Vector3(r.x - fx * dist * sgn, r.y + height, r.z - fz * dist * sgn);
    const look = new THREE.Vector3(r.x + fx * 6 * sgn, r.y + 1.25, r.z + fz * 6 * sgn);
    if (!u.pos || back !== u.back) { u.pos = want.clone(); u.look.copy(look); u.back = back; }
    u.pos.lerp(want, 1 - Math.exp(-dt * (back ? 30 : 7.5)));
    u.pos.y = Math.max(u.pos.y, r.y + 1.6, this.track.heightAt(u.pos.x, u.pos.z) + 1.4);
    u.look.lerp(look, 1 - Math.exp(-dt * 12));
    // Wackeln bei Boost-Start und Landung
    u.shake = Math.max(0, (u.shake || 0) - dt * 2.2);
    if (r0.shakeReq) { u.shake = Math.max(u.shake, r0.shakeReq); r0.shakeReq = 0; }
    const sh = u.shake * u.shake;
    cam.position.set(u.pos.x + (Math.random() - 0.5) * sh * 0.5, u.pos.y + (Math.random() - 0.5) * sh * 0.4, u.pos.z + (Math.random() - 0.5) * sh * 0.5);
    cam.up.set(0, 1, 0);
    cam.lookAt(u.look);
    // leichte Neigung in Kurven
    u.roll = (u.roll || 0) + ((tv ? 0 : (r0.steerVis || 0) * Math.min(1, sp / 22) * 0.045 + (r0.drift ? r0.drift.dir * 0.025 : 0)) - (u.roll || 0)) * Math.min(1, dt * 5);
    cam.rotateZ(u.roll);
    // Sichtfeld je nach Tempo
    const fov = 64 + Math.min(1, sp / top) * 9 + (r0.boostT > 0 ? 8 : 0);
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 4);
    if (!this.started && !tv) {
      const t = clamp((this.countdown - 1.0) / 3.2, 0, 1);
      if (t > 0) {
        const a = t * 2.4;
        cam.position.set(r.x + Math.sin(r.heading + Math.PI + a) * (dist + t * 10), r.y + height + t * 6, r.z + Math.cos(r.heading + Math.PI + a) * (dist + t * 10));
        cam.lookAt(r.x, r.y + 1, r.z);
      }
    }
  }

''' + s[end:]

# ---------- Rendern ueber die Pipeline
start = s.index("  render(dt) {")
end = s.index("  results() {")
s = s[:start] + '''  render(dt) {
    const rd = this.renderer;
    const W = rd.domElement.clientWidth, H = rd.domElement.clientHeight;
    const views = this.views(W, H);
    const hv = [];
    // Kameras einmal pro Bild aktualisieren
    const cams = views.map((v, i) => {
      let cam, r = this.humans[i];
      if (r) { cam = this.cams[i]; this.updateCam(cam, r, dt); }
      else { cam = this.tvCam; const lead = this.racers.slice().sort((a, b) => a.place - b.place)[0]; this.updateCam(cam, lead, dt, true); }
      cam.aspect = v.w / v.h; cam.updateProjectionMatrix();
      if (r) hv.push({ ...v, racer: r });
      return { v, cam, focus: r || this.racers[0] };
    });
    const draw = (target) => {
      const pr = rd.getPixelRatio();
      rd.setClearColor("#000");
      if (!target) rd.setScissorTest(true);
      for (const { v, cam, focus } of cams) {
        const fx = (focus.rx ?? focus.x) + Math.sin(focus.heading) * 30, fz = (focus.rz ?? focus.z) + Math.cos(focus.heading) * 30;
        this.sun.target.position.set(fx, focus.y, fz);
        this.sun.position.set(fx + this.sunDir.x * 200, focus.y + this.sunDir.y * 200, fz + this.sunDir.z * 200);
        this.sun.target.updateMatrixWorld();
        if (target) {
          target.viewport.set(v.x * pr, (H - v.y - v.h) * pr, v.w * pr, v.h * pr);
          target.scissor.copy(target.viewport); target.scissorTest = true;
          rd.setRenderTarget(target);
        } else {
          rd.setViewport(v.x, H - v.y - v.h, v.w, v.h);
          rd.setScissor(v.x, H - v.y - v.h, v.w, v.h);
        }
        rd.render(this.scene, cam);
      }
      if (target) { target.scissorTest = false; target.viewport.set(0, 0, target.width, target.height); target.scissor.set(0, 0, target.width, target.height); }
      else rd.setScissorTest(false);
    };
    if (this.pipeline) this.pipeline.render(draw); else draw(null);
    this.hud.draw(this, hv, dt);
    for (const h of this.humans) this.audio.engine(h.id, h.speed, h.boostT > 0, this.started || this.countdown < 3.5, h.driver.id);
  }

''' + s[end:]

# Pipeline durchreichen
rep("  constructor({ renderer, hud, audio, net, inputs, def, data, players, cls = \"golf\", laps = 3, onEnd }) {\n    this.renderer = renderer;",
    "  constructor({ renderer, pipeline, hud, audio, net, inputs, def, data, players, cls = \"golf\", laps = 3, onEnd }) {\n    this.renderer = renderer; this.pipeline = pipeline; this.quality = pipeline ? pipeline.q : { shadowSize: 2048, extras: 1 };")
rep("    sun.shadow.mapSize.set(2048, 2048);", "    sun.shadow.mapSize.set(this.quality.shadowSize, this.quality.shadowSize);")
rep("    this.world = buildWorld(this.scene, this.track, data, def);", "    this.world = buildWorld(this.scene, this.track, data, def, this.quality);")

# Effekte: blaue Boost-Flammen, Reifenrauch, Wackeln
rep('''      if (r.boostT > 0 && Math.random() < dt * 50) {
        this.fx.spawn("spark", backX, r.y + 0.6, backZ, { color: r.boostKind === 2 ? "#ff5a2a" : "#ffb03a", size: 1.3, life: 0.3, vx: -fx * 8, vy: 1, vz: -fz * 8, alpha: 0.95 });
      }''', '''      if (r.boostT > 0) {
        for (const sd of [-0.45, 0.45]) if (Math.random() < dt * 45) {
          this.fx.spawn("spark", backX + rx * sd, r.y + 0.55, backZ + rz * sd, { color: r.boostKind === 2 ? "#b46bff" : "#4ad2ff", size: 1.5, grow: 0.3, life: 0.28, vx: -fx * 9 + (Math.random() - 0.5), vy: 0.8, vz: -fz * 9 + (Math.random() - 0.5), alpha: 1 });
          this.fx.spawn("spark", backX + rx * sd, r.y + 0.55, backZ + rz * sd, { color: "#ffffff", size: 0.7, grow: 0.2, life: 0.14, vx: -fx * 6, vy: 0.5, vz: -fz * 6, alpha: 1 });
        }
      }
      // Reifenrauch beim Driften und scharfen Lenken
      if (!r.air && Math.abs(r.speed) > 10 && (r.drift || Math.abs(r.steerVis || 0) > 0.9) && Math.random() < dt * (r.drift ? 26 : 8)) {
        for (const sd of [-1, 1]) this.fx.spawn("smoke", backX + rx * sd * 0.9, r.y + 0.35, backZ + rz * sd * 0.9, { color: "#f2f2f2", size: 1.0, grow: 3.2, life: 0.9, vx: -fx * 2, vy: 1.2, vz: -fz * 2, alpha: 0.45, drag: 0.4 });
      }
      if (r.squash > 0.23 && !r.landShook) { r.landShook = true; if (r.human) r.shakeReq = 0.5; } else if (r.squash <= 0) r.landShook = false;''')
rep('''          case "boost": if (hum) this.sfx("boost"); break;''', '''          case "boost": if (hum) { this.sfx("boost"); r.shakeReq = 0.6; } break;''')
open(p, "w", encoding="utf8").write(s)
print("ok")
