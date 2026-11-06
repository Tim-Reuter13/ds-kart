import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            raise SystemExit("NICHT GEFUNDEN in %s: %s" % (p, a[:90]))
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


edit("js/main.js", [
    ('    if (state.players.length >= 4 || state.screen === "race") { net.send(id, { t: "full" }); }', '    if (state.players.length >= 8 || state.screen === "race") { net.send(id, { t: "full" }); }'),
    ('  if (state.players.length >= 4) return;', '  if (state.players.length >= 8) return;'),
    ('  for (let i = 0; i < 4; i++) {', '  const slots = Math.max(4, Math.min(8, state.players.length + 1));\n  for (let i = 0; i < slots; i++) {'),
])
edit("js/game.js", [
    ("""    if (n <= 1) v.push({ x: 0, y: 0, w: W, h: H });
    else if (n === 2) { v.push({ x: 0, y: 0, w: W, h: H / 2 }, { x: 0, y: H / 2, w: W, h: H / 2 }); }
    else { v.push({ x: 0, y: 0, w: W / 2, h: H / 2 }, { x: W / 2, y: 0, w: W / 2, h: H / 2 }, { x: 0, y: H / 2, w: W / 2, h: H / 2 }, { x: W / 2, y: H / 2, w: W / 2, h: H / 2 }); }
    return v;""", """    if (n <= 1) v.push({ x: 0, y: 0, w: W, h: H });
    else if (n === 2) { v.push({ x: 0, y: 0, w: W, h: H / 2 }, { x: 0, y: H / 2, w: W, h: H / 2 }); }
    else {
      const cols = n <= 4 ? 2 : n <= 6 ? 3 : 4;
      for (let row = 0; row < 2; row++) for (let c = 0; c < cols; c++) v.push({ x: c * W / cols, y: row * H / 2, w: W / cols, h: H / 2 });
    }
    return v;"""),
    # Ab 5 Ansichten: Schatten nur einmal pro Bild
    ("""      const pr = rd.getPixelRatio();
      rd.setClearColor("#000");
      if (!target) rd.setScissorTest(true);
      for (const { v, cam, focus } of cams) {
        const fx = (focus.rx ?? focus.x) + Math.sin(focus.heading) * 30, fz = (focus.rz ?? focus.z) + Math.cos(focus.heading) * 30;""",
     """      const pr = rd.getPixelRatio();
      rd.setClearColor("#000");
      if (!target) rd.setScissorTest(true);
      const many = cams.length > 4;
      const sc = this.sun.shadow.camera, ext = many ? 150 : 75;
      if (sc.right !== ext) { sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.updateProjectionMatrix(); }
      rd.shadowMap.autoUpdate = !many;
      if (many) {
        let mx = 0, mz = 0; for (const h of this.humans) { mx += h.x; mz += h.z; } mx /= this.humans.length; mz /= this.humans.length;
        this.sun.target.position.set(mx, this.humans[0].y, mz); this.sun.position.set(mx + this.sunDir.x * 260, this.humans[0].y + this.sunDir.y * 260, mz + this.sunDir.z * 260); this.sun.target.updateMatrixWorld();
        rd.shadowMap.needsUpdate = true;
      }
      for (const { v, cam, focus } of cams) {
        const fx = (focus.rx ?? focus.x) + Math.sin(focus.heading) * 30, fz = (focus.rz ?? focus.z) + Math.cos(focus.heading) * 30;
        if (!many) {"""),
    ("""        this.sun.target.updateMatrixWorld();
        if (target) {
          target.viewport.set(v.x * pr, (H - v.y - v.h) * pr, v.w * pr, v.h * pr);""", """        this.sun.target.updateMatrixWorld();
        }
        if (target) {
          target.viewport.set(v.x * pr, (H - v.y - v.h) * pr, v.w * pr, v.h * pr);"""),
])
edit("js/hud.js", [
    ("""    if (views.length >= 2) g.fillRect(0, H / 2 - 2, W, 4);
    if (views.length >= 3) g.fillRect(W / 2 - 2, 0, 4, H);""", """    if (views.length >= 2) g.fillRect(0, H / 2 - 2, W, 4);
    if (views.length >= 3) { const cols = race.humans.length <= 4 ? 2 : race.humans.length <= 6 ? 3 : 4; for (let c = 1; c < cols; c++) g.fillRect(W * c / cols - 2, 0, 4, H); }"""),
    ("""    else { size = Math.min(W, H) * 0.22; mx = W / 2 - size / 2; my = H / 2 - size / 2; }""",
     """    else if (views.length <= 4) { size = Math.min(W, H) * 0.22; mx = W / 2 - size / 2; my = H / 2 - size / 2; }
    else { size = Math.min(W, H) * 0.17; mx = W / 2 - size / 2; my = H / 2 - size / 2; }"""),
    # lange Unterschriften in der Wiederholung passend skalieren
    ("""    txt(g, caption, W / 2, H - bar - 46 * u, 40 * u, "#ffffff", "center");""",
     """    g.font = `${40 * u}px ${FONT}`; const cw = g.measureText(caption).width, fs = 40 * u * Math.min(1, W * 0.92 / Math.max(1, cw));
    txt(g, caption, W / 2, H - bar - 46 * u, fs, "#ffffff", "center");"""),
])
edit("index.html", [
    (".slot{border-radius:18px;padding:12px;min-height:200px;", ".slot{border-radius:18px;padding:10px;min-height:170px;"),
])
print("ok")
