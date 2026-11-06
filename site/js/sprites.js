// Fotorealistische Fahrer-Sprites (8 Blickrichtungen) als Billboards.
// Pro Kamera (auch im Splitscreen) wird die passende Ansicht gewaehlt.
// Sie bekommen das Spiellicht ab (Sonne, Himmel, Schatten) und wippen/wanken beim Fahren.
import * as THREE from "three";
import { FAMILY } from "./family.js";

export const SPRITE_DRIVERS = ["tim", "franzi", "sonja", "jannik", "giovanni"];
const sets = {};

export async function loadSpriteSet(id) {
  if (sets[id]) return sets[id];
  const base = `sprites/${id}/`;
  const spec = await (await fetch(base + "sprite.json")).json();
  const loader = new THREE.TextureLoader();
  const tex = {};
  await Promise.all(Object.entries(spec.states).map(([st, s]) => new Promise((res, rej) => {
    loader.load(base + s.file, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; tex[st] = t; res(); }, undefined, rej);
  })));
  return (sets[id] = { id, spec, tex });
}

const TWO_PI = Math.PI * 2;
const norm = (a) => ((a % TWO_PI) + TWO_PI) % TWO_PI;

export class SpriteCar {
  constructor(set, size = 3.9, lift = 0.42) {
    this.set = set;
    const pv = set.spec.pivot;
    const g = new THREE.PlaneGeometry(size, size);
    g.translate(0, size * (pv[1] - 0.5) + lift, 0); // Fahrbahnkontakt knapp ueber y = 0
    // Normalen leicht nach oben kippen: bekommt Himmel- und Sonnenlicht wie ein Autodach
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 0.55, 0.835);
    this.maps = {};
    for (const [st, t] of Object.entries(set.tex)) {
      const c = t.clone(); c.needsUpdate = true; c.matrixAutoUpdate = true;
      const s = set.spec.states[st];
      c.repeat.set(set.spec.cell / s.w, set.spec.cell / s.h);
      this.maps[st] = c;
    }
    this.mat = new THREE.MeshLambertMaterial({ map: this.maps.fahren, transparent: true, alphaTest: 0.35, depthWrite: true, side: THREE.DoubleSide });
    this.mat.color.setRGB(1.32, 1.3, 1.26);
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 5;
    this.state = "fahren"; this.stateT = 0;
    this.yaw = 0; this.t = Math.random() * 10;
    this.bob = 0; this.lean = 0; this.sq = 0; this.jolt = 0;
    this.mesh.onBeforeRender = (renderer, scene, cam) => this.face(cam);
  }

  play(state, hold = 0) {
    if (FAMILY && state === "vape") state = "werfen";
    if (state === "vape" && !this.maps.vape && this.maps.fauchen) state = "fauchen"; // Giovanni faucht statt zu dampfen
    if (!this.maps[state]) return;
    this.state = state; this.stateT = 0; this.hold = hold;
    if (state === "schaden") this.jolt = 1;
  }

  update(dt, r) {
    this.stateT += dt; this.t += dt;
    if (r.spinT > 0 && this.state !== "schaden") this.play("schaden", r.spinT);
    if (r.smokeT > 0 && this.state === "fahren" && !FAMILY) this.play("vape", r.smokeT);
    const s = this.set.spec.states[this.state];
    if (this.state !== "fahren") {
      const once = (s.dur * 2) / 1000;
      if (this.stateT > Math.max(once, this.hold || 0)) { this.state = "fahren"; this.stateT = 0; this.hold = 0; }
    }
    // Bewegung: Wippen mit dem Tempo, Wanken in Kurven, Strecken beim Boost, Stauchen bei der Landung
    const sp = Math.min(1, Math.abs(r.speed) / 26);
    this.bob = Math.sin(this.t * (9 + sp * 14)) * 0.045 * sp + Math.sin(this.t * 23) * 0.012 * sp;
    const leanT = -(r.steerVis || 0) * 0.09 * sp - (r.drift ? r.drift.dir * 0.06 : 0);
    this.lean += (leanT - this.lean) * Math.min(1, dt * 7);
    let sqT = 0;
    if (r.squash > 0) sqT = Math.sin(r.squash / 0.25 * Math.PI) * 0.16;
    if (r.boostT > 0) sqT -= 0.05;
    this.sq += (sqT - this.sq) * Math.min(1, dt * 18);
    this.jolt = Math.max(0, this.jolt - dt * 2.5);
  }

  place(x, y, z, yaw, visible) {
    this.mesh.position.set(x, y, z);
    this.yaw = yaw;
    this.mesh.visible = visible;
  }

  face(cam) {
    if (cam.isOrthographicCamera) return;
    const p = this.mesh.position;
    const toCam = Math.atan2(cam.position.x - p.x, cam.position.z - p.z);
    // Ansicht: 0 = Front, 90 = Nase nach Bild-rechts, 180 = Heck
    const ang = norm(this.yaw - toCam);
    const idx = Math.round(ang / (Math.PI / 4)) % 8;
    const key = String(idx * 45);
    const st = this.set.spec.states[this.state];
    const fr = st.frames[key] || st.frames["0"];
    const fi = fr.length > 1 ? Math.floor(this.stateT * 1000 / Math.max(1, st.dur)) % fr.length : 0;
    const xy = fr[fi];
    const m = this.maps[this.state];
    m.offset.set(xy[0] / st.w, 1 - (xy[1] + this.set.spec.cell) / st.h);
    if (this.mat.map !== m) this.mat.map = m;
    // Billboard zur Kamera; Wanken nur sichtbar, wenn man von vorn/hinten schaut
    const roll = this.lean * Math.cos(ang) + Math.sin(this.t * 40) * 0.05 * this.jolt;
    this.mesh.rotation.set(0, toCam, roll, "YXZ");
    this.mesh.scale.set(1 + this.sq * 0.6, 1 - this.sq, 1);
    const y0 = this.mesh.position.y;
    this.mesh.position.y = y0 + this.bob;
    this.mesh.updateMatrix();
    this.mesh.matrixWorld.copy(this.mesh.matrix);
    this.mesh.position.y = y0;
  }
}
