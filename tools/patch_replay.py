import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            raise SystemExit("NICHT GEFUNDEN in %s: %s" % (p, a[:90]))
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


edit("kart.js", [
    ("  progress(L) {", """  // Darstellung fuer die Wiederholung
  showAt(x, y, z, yaw, st, t, dt) {
    const m = this.car.root;
    this.rx = x; this.ry = y; this.rz = z; this.rh = yaw;
    m.position.set(x, y, z); m.rotation.y = yaw;
    this.car.body.rotation.set(0, 0, 0); this.car.body.scale.set(1, 1, 1);
    this.car.update(dt, 22, 0);
    const sh = this.car.shadow; sh.position.set(x, 0.16 + this.race_groundAt(x, z), z); sh.rotation.z = -yaw;
    if (this.sprite) { this.sprite.state = st; this.sprite.stateT = t; this.sprite.place(x, y, z, yaw, true); m.visible = false; }
    else m.visible = true;
  }
  race_groundAt() { return this.groundH || 0; }

  progress(L) {"""),
])
edit("game.js", [
    ('import { SpriteCar } from "./sprites.js";', 'import { SpriteCar } from "./sprites.js";\nimport { Recorder, Replay } from "./replay.js";'),
    ("    this.deco = buildRaceDeco(this);", "    this.deco = buildRaceDeco(this);\n    this.rec = new Recorder(this);\n    this.replay = null;"),
    ("    this.deco.tick(dt);", "    this.deco.tick(dt);\n    this.rec.tick(dt);"),
    # Highlights sammeln
    ('          case "hit": if (hum) { this.sfx("hit"); r.hitFlash = 0.7; r.shakeReq = 1.1;',
     '          case "hit": this.rec.event("hit", { victim: r.id, by: e.by ? e.by.id : null, item: e.item }, (hum || (e.by && e.by.human) ? 5 : 2) + (e.item === "amt" || e.item === "blitzer" ? 1 : 0));\n            if (hum) { this.sfx("hit"); r.hitFlash = 0.7; r.shakeReq = 1.1;'),
    ('          case "trick": if (hum) this.sfx("trick"); break;', '          case "trick": if (hum) this.sfx("trick"); this.rec.event("jump", { who: r.id }, r.human ? 3 : 1.5); break;'),
    ('          case "finish": if (hum) {', '          case "finish": if (r.place === 1) this.rec.event("win", { who: r.id }, 10);\n            if (hum) {'),
    # Rennende -> erst Best of
    ("""  finish() {
    if (this.ended) return;
    this.ended = true;
    this.audio.stopEngines();
    this.audio.stopMusic();
    this.onEnd && this.onEnd(this.results());
  }""", """  finish() {
    if (this.ended || this.replay) return;
    this.audio.stopEngines();
    this.finalResults = this.results();
    const rp = new Replay(this, this.rec);
    if (rp.done) { this.endNow(); return; }
    this.replay = rp;
    this.fx.clear();
  }
  skipReplay() { if (this.replay) { this.replay.done = true; } }
  endNow() {
    if (this.ended) return;
    this.ended = true;
    this.audio.stopEngines();
    this.audio.stopMusic();
    this.onEnd && this.onEnd(this.finalResults || this.results());
  }"""),
    ("""  update(dt) {
    if (this.paused || this.ended) return;""", """  update(dt) {
    if (this.paused || this.ended) return;
    if (this.replay) {
      this.replay.update(dt);
      this.world.update(dt, this.time + 100); this.deco.update(dt, this.time + 100);
      if (this.replay.done) this.endNow();
      return;
    }"""),
    ("""  render(dt) {
    const rd = this.renderer;
    const W = rd.domElement.clientWidth, H = rd.domElement.clientHeight;""", """  render(dt) {
    const rd = this.renderer;
    const W = rd.domElement.clientWidth, H = rd.domElement.clientHeight;
    if (this.replay) {
      const rp = this.replay, cam = rp.cam;
      cam.aspect = W / H; cam.updateProjectionMatrix();
      const fr = this.racers[0];
      const draw = (target) => {
        const pr = rd.getPixelRatio();
        this.sun.target.position.set(cam.position.x, cam.position.y, cam.position.z); this.sun.position.set(cam.position.x + this.sunDir.x * 200, cam.position.y + this.sunDir.y * 200, cam.position.z + this.sunDir.z * 200); this.sun.target.updateMatrixWorld();
        if (target) { target.viewport.set(0, 0, W * pr, H * pr); target.scissor.copy(target.viewport); target.scissorTest = false; rd.setRenderTarget(target); }
        else { rd.setViewport(0, 0, W, H); rd.setScissorTest(false); }
        rd.render(this.scene, cam);
      };
      if (this.pipeline) this.pipeline.render(draw); else draw(null);
      const e = rp.clips[Math.min(rp.ci, rp.clips.length - 1)];
      this.hud.drawReplay(e ? rp.caption(e) : "", rp.ci, rp.clips.length, rp.t / 4.6);
      return;
    }"""),
])
edit("hud.js", [
    ("  minimap(race, views, W, H) {", """  drawReplay(caption, i, n, prog) {
    const g = this.g, dpr = devicePixelRatio || 1, W = this.c.width / dpr, H = this.c.height / dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const bar = H * 0.1, u = Math.min(W, H * 1.6) / 900;
    g.fillStyle = "#000"; g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar);
    txt(g, "⭐ BEST OF", 24 * u, bar / 2, 30 * u, "#ffd23a", "left");
    txt(g, `${i + 1} / ${n}`, W - 24 * u, bar / 2, 22 * u, "#fff", "right", "Arial, sans-serif");
    const a = Math.min(1, prog * 5, (1 - prog) * 6);
    g.globalAlpha = Math.max(0, a);
    txt(g, caption, W / 2, H - bar - 46 * u, 40 * u, "#ffffff", "center");
    g.globalAlpha = 1;
    txt(g, "Überspringen: OK / Leertaste / Klick", W / 2, H - bar / 2, 16 * u, "#9fb3d1", "center", "Arial, sans-serif");
    g.fillStyle = "#ffd23a"; g.fillRect(0, bar - 4, W * ((i + prog) / n), 4);
  }

  minimap(race, views, W, H) {"""),
])
print("ok")
