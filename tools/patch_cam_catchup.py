import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, s.count(a), a[:90])
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


edit("js/game.js", [
('''const pick = (a) => a[(Math.random() * a.length) | 0];
''', '''const pick = (a) => a[(Math.random() * a.length) | 0];

// Kamera-Einstellungen (Taste C / N, Controller "Select", Handy-Knopf) - bleiben pro Geraet ueber Rennen hinweg
export const CAMS = [
  { name: "Normal", dist: 7.0, h: 3.0, look: 1.25, ahead: 6 },
  { name: "Weit", dist: 10.5, h: 4.7, look: 1.8, ahead: 8, fov: -4 },
  { name: "Nah", dist: 5.3, h: 2.25, look: 1.45, ahead: 5, fov: 3 },
  { name: "Von oben", dist: 10, h: 10.5, look: 0.4, ahead: 9, fov: -6 },
  { name: "Fahrersicht", first: true },
];
const CAM_PREF = new Map();
'''),
('''      r.dev = p.dev;
''', '''      r.dev = p.dev;
      r.camMode = r.human ? CAM_PREF.get(p.dev) || 0 : 0;
'''),
('''    // Eingaben
    for (const r of this.racers) {
      if (r.human && (r.finished || this.autopilot)) { if (!r.ai) initAI(r, this.track); driveAI(r, this, dt); if (r.finished) r.input.item = false; }''',
'''    // Kamera umschalten
    for (const h of this.humans) {
      const c = !!this.inputs.read(h.dev).cam;
      if (c && !h.prevCam) this.cycleCam(h);
      h.prevCam = c;
    }
    this.catchUp(dt);
    // Eingaben (Handy weg -> Autopilot faehrt weiter, bis es wieder da ist)
    for (const r of this.racers) {
      r.offline = r.human && (r.dev || "").startsWith("ph") && !this.net.phoneState(r.dev);
      if (r.human && (r.finished || this.autopilot || (r.offline && this.started))) { if (!r.ai) initAI(r, this.track); driveAI(r, this, dt); if (r.finished || r.offline) r.input.item = false; }'''),
('''  effects(dt) {''', '''  cycleCam(h) {
    const prev = CAMS[h.camMode || 0];
    h.camMode = ((h.camMode || 0) + 1) % CAMS.length;
    CAM_PREF.set(h.dev, h.camMode);
    const cam = this.cams[this.humans.indexOf(h)];
    if (cam && (prev.first || CAMS[h.camMode].first)) cam.userData.pos = null; // in/aus dem Auto: springen statt durchfahren
    this.hud.message(h, "🎥 Kamera: " + CAMS[h.camMode].name, 1.1, "#9fd8ff");
    this.sfx("select");
  }

  // Unauffaelliger Aufholbonus: wer hinten liegt (Platz + Abstand), wird sanft schneller, erholt sich schneller
  // und zieht bessere Items. Ein weit enteilter Spitzenreiter verliert einen Hauch. Aendert sich nur langsam.
  catchUp(dt) {
    if (!this.started) return;
    let lead = -1e9, second = -1e9;
    for (const r of this.racers) { if (r.finished) continue; if (r.total > lead) { second = lead; lead = r.total; } else if (r.total > second) second = r.total; }
    if (second < -1e8) second = lead;
    const n = this.racers.length;
    for (const r of this.racers) {
      let want = 0;
      if (r.human && !r.finished) {
        const pf = n > 1 ? (r.place - 1) / (n - 1) : 0;
        want = Math.min(1, Math.max((lead - r.total) / 240, pf * pf * 0.8));
        if (r.total >= lead && r.place === 1) want = -Math.min(1, (lead - second) / 160) * 0.35;
      }
      r.cu = (r.cu || 0) + (want - (r.cu || 0)) * Math.min(1, dt * 0.35);
    }
  }

  effects(dt) {'''),
('''    const back = !tv && r0.input.back && r0.human && !(r0.dev || "").startsWith("ph");
    const u = cam.userData;
    const sp = Math.abs(r0.speed), top = this.cls.top;''', '''    const back = !tv && r0.input.back && r0.human && !(r0.dev || "").startsWith("ph");
    const u = cam.userData;
    const sp = Math.abs(r0.speed), top = this.cls.top;
    const cm = tv ? CAMS[0] : CAMS[r0.camMode || 0];
    if (cm.first && (this.started || this.countdown < 1.0)) {
      // Fahrersicht: vorne im Auto, eigener Sprite wird beim Zeichnen ausgeblendet
      const sg = back ? -1 : 1;
      const want = new THREE.Vector3(r.x + fx * 0.8, r.y + 2.05, r.z + fz * 0.8);
      const look = new THREE.Vector3(r.x + fx * 14 * sg, r.y + 1.7, r.z + fz * 14 * sg);
      if (!u.pos) { u.pos = want.clone(); u.look.copy(look); }
      u.pos.lerp(want, 1 - Math.exp(-dt * 30));
      u.look.lerp(look, 1 - Math.exp(-dt * (back !== u.back ? 60 : 14))); u.back = back;
      u.shake = Math.max(0, (u.shake || 0) - dt * 2.2);
      if (r0.shakeReq) { u.shake = Math.max(u.shake, r0.shakeReq); r0.shakeReq = 0; }
      const sh = u.shake * u.shake;
      cam.position.set(u.pos.x + (Math.random() - 0.5) * sh * 0.25, u.pos.y + (Math.random() - 0.5) * sh * 0.2, u.pos.z + (Math.random() - 0.5) * sh * 0.25);
      cam.up.set(0, 1, 0); cam.lookAt(u.look);
      u.roll = (u.roll || 0) + (((r0.steerVis || 0) * Math.min(1, sp / 22) * 0.03) - (u.roll || 0)) * Math.min(1, dt * 5);
      cam.rotateZ(u.roll);
      const fov = 74 + Math.min(1, sp / top) * 10 + (r0.boostT > 0 ? 8 : 0);
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 4);
      return;
    }'''),
('''    const dist = (tv ? 11 : 7.0) + u.pull, height = tv ? 5 : 3.0 + u.pull * 0.15;
    const sgn = back ? -1 : 1;
    const want = new THREE.Vector3(r.x - fx * dist * sgn, r.y + height, r.z - fz * dist * sgn);
    const look = new THREE.Vector3(r.x + fx * 6 * sgn, r.y + 1.25, r.z + fz * 6 * sgn);''', '''    const dist = (tv ? 11 : cm.dist) + u.pull * (tv ? 1 : cm.dist / 7), height = tv ? 5 : cm.h + u.pull * 0.15;
    const sgn = back ? -1 : 1;
    const want = new THREE.Vector3(r.x - fx * dist * sgn, r.y + height, r.z - fz * dist * sgn);
    const look = new THREE.Vector3(r.x + fx * cm.ahead * sgn, r.y + cm.look, r.z + fz * cm.ahead * sgn);'''),
('''    const fov = 64 + Math.min(1, sp / top) * 9 + (r0.boostT > 0 ? 8 : 0);''', '''    const fov = 64 + (tv ? 0 : cm.fov || 0) + Math.min(1, sp / top) * 9 + (r0.boostT > 0 ? 8 : 0);'''),
('''      return { v, cam, focus: r || this.racers[0] };''', '''      return { v, cam, focus: r || this.racers[0], first: r && CAMS[r.camMode || 0].first && (this.started || this.countdown < 1.0) ? r : null };'''),
('''      for (const { v, cam, focus } of cams) {''', '''      for (const { v, cam, focus, first } of cams) {'''),
('''        rd.render(this.scene, cam);
      }
      if (target) { target.scissorTest = false;''', '''        // Fahrersicht: eigenes Auto/Sprite nur in dieser Ansicht ausblenden
        const hideObj = first ? (first.sprite ? first.sprite.mesh : first.car.root) : null, wasVis = hideObj && hideObj.visible;
        if (hideObj) hideObj.visible = false;
        rd.render(this.scene, cam);
        if (hideObj) hideObj.visible = wasVis;
      }
      if (target) { target.scissorTest = false;'''),
])

edit("js/kart.js", [
('''    let top = cls.top * st.speed * (1 + 0.012 * this.pfand) * (this.human ? 1 : race.aiScale(this));''',
 '''    let top = cls.top * st.speed * (1 + 0.012 * this.pfand) * (this.human ? 1 + 0.065 * (this.cu || 0) : race.aiScale(this));'''),
('''    const acc = 15.5 * st.accel;''', '''    const acc = 15.5 * st.accel * (1 + 0.3 * Math.max(0, this.cu || 0));'''),
('''    if (this.spinT > 0) { this.spinT -= dt; this.speed *= Math.pow(0.25, dt); }''',
 '''    if (this.spinT > 0) { this.spinT -= dt * (1 + 0.4 * Math.max(0, this.cu || 0)); this.speed *= Math.pow(0.25, dt); }'''),
])

edit("js/items.js", [
('''// Gewichte: vorne (t=0) .. hinten (t=1)
const W_FRONT = { kippe: 30, jaegi: 24, kasten: 24, vape: 12, energy: 8, kurze: 2, doener: 0, blitzer: 0, amt: 0 };
const W_BACK = { kippe: 4, jaegi: 6, kasten: 2, vape: 10, energy: 16, kurze: 22, doener: 18, blitzer: 10, amt: 12 };

export function rollItem(t) {
  const w = {};
  let sum = 0;
  for (const k of Object.keys(W_FRONT)) { w[k] = W_FRONT[k] * (1 - t) + W_BACK[k] * t; sum += w[k]; }''',
'''// Gewichte: vorne (t=0) .. Mitte (t=0.5) .. ganz hinten (t=1). Hinten gibt es die starken Sachen.
const W_FRONT = { kippe: 32, jaegi: 26, kasten: 26, vape: 3, energy: 10, kurze: 3, doener: 0, blitzer: 0, amt: 0 };
const W_MID = { kippe: 12, jaegi: 18, kasten: 8, vape: 14, energy: 18, kurze: 14, doener: 8, blitzer: 3, amt: 5 };
const W_BACK = { kippe: 0, jaegi: 4, kasten: 0, vape: 8, energy: 10, kurze: 24, doener: 24, blitzer: 12, amt: 18 };

export function rollItem(t) {
  const w = {};
  let sum = 0;
  t = Math.pow(Math.max(0, Math.min(1, t)), 0.85);
  const [A, B, u] = t < 0.5 ? [W_FRONT, W_MID, t * 2] : [W_MID, W_BACK, (t - 0.5) * 2];
  for (const k of Object.keys(W_FRONT)) { w[k] = A[k] * (1 - u) + B[k] * u; sum += w[k]; }'''),
('''    const t = n > 1 ? (r.place - 1) / (n - 1) : 0;
    r.pending = rollItem(t);''', '''    // Platz + Aufholbonus (wer weit zurueck ist, zieht wie der Letzte)
    const t = Math.max(n > 1 ? (r.place - 1) / (n - 1) : 0, r.cu || 0);
    r.pending = rollItem(t);'''),
])
print("ok")
