// Rennstrecken-Deko: Boost-Felder (mit Wirkung), leuchtende Randmarker, Kurvenpfeile,
// DS-Kart-Fahnen, Tribuene mit Zuschauern, Konfetti am Start
import * as THREE from "three";

const rnd = (a, b) => a + Math.random() * (b - a);

function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function curvWin(tr, i, k = 5) { let c = 0; for (let j = -k; j <= k; j++) c += tr.curv[(i + j + tr.n) % tr.n]; return c / (2 * k + 1); }
function sideOpen(tr, i, side) { return side > 0 ? tr.openR[i] : tr.openL[i]; }

export function buildRaceDeco(race) {
  const tr = race.track, scene = race.scene, q = race.quality || { extras: 1 };
  const group = new THREE.Group(); scene.add(group);
  const anim = [];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3(), E = new THREE.Euler();

  // ---------- Kurven finden
  const curves = [];
  let inCurve = false, startI = 0, sum = 0;
  for (let i = 0; i < tr.n; i++) {
    const c = curvWin(tr, i);
    if (Math.abs(c) > 0.017) { if (!inCurve) { inCurve = true; startI = i; sum = 0; } sum += c; }
    else if (inCurve) { inCurve = false; if (i - startI > 4) curves.push({ i0: startI, i1: i, dir: Math.sign(sum) }); }
  }

  // ---------- Leuchtende blaue Randmarker in Kurven und am Start
  {
    const pts = [];
    let next = 0;
    for (let i = 0; i < tr.n; i++) {
      if (tr.s[i] < next) continue;
      const nearStart = tr.s[i] < 35 || tr.s[i] > tr.L - 35;
      if (Math.abs(curvWin(tr, i)) < 0.012 && !nearStart) continue;
      next = tr.s[i] + 5;
      for (const sd of [-1, 1]) {
        const p = tr.at(tr.s[i], sd * (tr.half - 0.12));
        pts.push([p.x, p.y + 0.16, p.z, p.heading]);
      }
    }
    const g = new THREE.BoxGeometry(0.22, 0.07, 1.6);
    const m = new THREE.MeshBasicMaterial(); m.color.setRGB(0.35, 1.5, 3.2);
    const im = new THREE.InstancedMesh(g, m, Math.max(1, pts.length));
    pts.forEach(([x, y, z, h], k) => { E.set(0, h, 0); Q.setFromEuler(E); V.set(x, y, z); M.compose(V, Q, S); im.setMatrixAt(k, M); });
    im.count = pts.length;
    group.add(im);
    anim.push((dt, t) => { const k = 1 + Math.sin(t * 4) * 0.25; m.color.setRGB(0.35 * k, 1.5 * k, 3.2 * k); });
  }

  // ---------- Grosse Richtungspfeile an der Kurvenaussenseite
  {
    const texFor = (dir) => canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = "#1d4fd8"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8);
      for (let k = 0; k < 3; k++) {
        const x0 = 40 + k * 64;
        g.beginPath();
        if (dir > 0) { g.moveTo(x0 + 40, 22); g.lineTo(x0, 64); g.lineTo(x0 + 40, 106); g.lineTo(x0 + 62, 106); g.lineTo(x0 + 22, 64); g.lineTo(x0 + 62, 22); }
        else { g.moveTo(x0 + 22, 22); g.lineTo(x0 + 62, 64); g.lineTo(x0 + 22, 106); g.lineTo(x0, 106); g.lineTo(x0 + 40, 64); g.lineTo(x0, 22); }
        g.closePath(); g.fillStyle = "#ffd23a"; g.fill();
      }
    });
    const mats = { 1: new THREE.MeshStandardMaterial({ map: texFor(1), roughness: 0.4, emissive: "#ffffff", emissiveMap: texFor(1), emissiveIntensity: 0.35 }),
                   "-1": new THREE.MeshStandardMaterial({ map: texFor(-1), roughness: 0.4, emissive: "#ffffff", emissiveMap: texFor(-1), emissiveIntensity: 0.35 }) };
    const back = new THREE.MeshStandardMaterial({ color: "#2a2f38", roughness: 0.6 });
    const boardG = new THREE.BoxGeometry(3.0, 1.5, 0.15);
    const postG = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
    for (const c of curves) {
      const outer = c.dir > 0 ? 1 : -1; // Linkskurve (positiv) -> aussen rechts
      for (let k = 0; k < 3; k++) {
        const s = tr.s[c.i0] - 8 + k * 9;
        const p0 = tr.at(s);
        if (sideOpen(tr, p0.i, outer)) continue;
        const p = tr.at(s, outer * (tr.edge + 1.6));
        const b = new THREE.Group();
        const board = new THREE.Mesh(boardG, [back, back, back, back, mats[c.dir > 0 ? 1 : -1], back]);
        board.position.y = 2.3; b.add(board);
        for (const x of [-1.1, 1.1]) { const post = new THREE.Mesh(postG, back); post.position.set(x, 0.8, 0); b.add(post); }
        b.position.set(p.x, tr.heightAt(p.x, p.z), p.z);
        b.rotation.y = p.heading + Math.PI; // Schild schaut den Fahrern entgegen
        b.traverse(o => { if (o.isMesh) o.castShadow = true; });
        group.add(b);
      }
    }
  }

  // ---------- Boost-Felder auf geraden Stuecken
  const pads = [];
  {
    const boxS = (race.extra.boxes || []).map(f => f * tr.L);
    const rampS = tr.ramps.map(r => r.s0);
    const far = (s, list, d) => list.every(x => { let dd = Math.abs(s - x); dd = Math.min(dd, tr.L - dd); return dd > d; });
    const cand = [];
    for (let s = 50; s < tr.L - 50; s += 6) {
      let maxc = 0;
      for (let d = -10; d <= 45; d += 3) maxc = Math.max(maxc, Math.abs(curvWin(tr, tr.at(s + d).i, 3)));
      if (maxc < 0.007 && far(s, boxS, 30) && far(s, rampS, 40)) cand.push(s);
    }
    const chosen = [];
    for (const s of cand) if (chosen.every(x => Math.abs(x - s) > tr.L / 4.2)) chosen.push(s);
    const tex = canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = "#0b2a6a"; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 4; k++) {
        const y = k * 64;
        g.beginPath(); g.moveTo(14, y + 52); g.lineTo(64, y + 8); g.lineTo(114, y + 52); g.lineTo(114, y + 64); g.lineTo(64, y + 24); g.lineTo(14, y + 64); g.closePath();
        g.fillStyle = k % 2 ? "#39d4ff" : "#ffffff"; g.fill();
      }
      g.strokeStyle = "#ffd23a"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    }, true);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -16, polygonOffsetUnits: -64 });
    mat.color.setRGB(1.6, 1.6, 1.6);
    const offs = [-tr.W * 0.22, tr.W * 0.22, 0];
    chosen.slice(0, 3).forEach((s, k) => {
      const off = offs[k % offs.length], len = 7, w = 4;
      const g = new THREE.PlaneGeometry(w, len); g.rotateX(-Math.PI / 2);
      const p = tr.at(s + len / 2, off);
      const m = new THREE.Mesh(g, mat);
      m.position.set(p.x, p.y + 0.17, p.z); m.rotation.y = p.heading; m.renderOrder = 9;
      group.add(m);
      pads.push({ s, off, len, half: w / 2 + 0.3 });
    });
    anim.push((dt) => { tex.offset.y -= dt * 1.6; });
  }

  // ---------- DS-Kart-Fahnen entlang der Strecke
  {
    const flagTex = ["#ffd23a", "#e8412f", "#1d4fd8"].map((bg, k) => canvasTex(64, 256, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2);
      g.font = "900 34px Arial"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = k === 0 ? "#3a1a05" : "#ffffff"; g.fillText("DS-KART", 0, 2); g.restore();
    }));
    const poleG = new THREE.CylinderGeometry(0.06, 0.08, 5.6, 8); poleG.translate(0, 2.8, 0);
    const flagG = new THREE.PlaneGeometry(1.1, 3.6, 1, 6); flagG.translate(0.6, 3.6, 0);
    const poleM = new THREE.MeshStandardMaterial({ color: "#d9dde2", metalness: 0.6, roughness: 0.35 });
    const fMats = flagTex.map(t => new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.7 }));
    const flags = [];
    let next = 20, side = 1;
    const step = 46 / Math.max(0.4, q.extras);
    for (let i = 0; i < tr.n; i++) {
      if (tr.s[i] < next) continue;
      next = tr.s[i] + step; side = -side;
      if (sideOpen(tr, i, side) || Math.abs(curvWin(tr, i)) > 0.012) continue;
      const p = tr.at(tr.s[i], side * (tr.edge + 1.2));
      const f = new THREE.Group();
      const pole = new THREE.Mesh(poleG, poleM); pole.castShadow = true; f.add(pole);
      const flag = new THREE.Mesh(flagG, fMats[flags.length % 3]); flag.castShadow = true; f.add(flag);
      f.position.set(p.x, tr.heightAt(p.x, p.z), p.z); f.rotation.y = p.heading + Math.PI / 2;
      group.add(f); flags.push({ flag, ph: Math.random() * 6 });
    }
    anim.push((dt, t) => { for (const f of flags) f.flag.rotation.y = Math.sin(t * 2.2 + f.ph) * 0.35; });
  }

  // ---------- Tribuene mit Zuschauern am Start
  let crowd = null;
  {
    let side = 0;
    const iS = tr.at(tr.L - 18).i;
    if (!sideOpen(tr, iS, 1)) side = 1; else if (!sideOpen(tr, iS, -1)) side = -1;
    if (side) {
      const p = tr.at(tr.L - 18, side * (tr.edge + 6));
      const st = new THREE.Group();
      const steelM = new THREE.MeshStandardMaterial({ color: "#c9ced6", metalness: 0.5, roughness: 0.4 });
      const seatM = new THREE.MeshStandardMaterial({ color: "#1d4fd8", roughness: 0.6 });
      for (let k = 0; k < 4; k++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(22, 0.8 + k * 0.9, 1.6), k % 2 ? seatM : steelM);
        step.position.set(0, (0.8 + k * 0.9) / 2, -side * 0 + k * 1.6); st.add(step);
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(23, 0.25, 7.5), new THREE.MeshStandardMaterial({ color: "#e8412f", roughness: 0.5 }));
      roof.position.set(0, 6.2, 2.4); st.add(roof);
      for (const x of [-11, 11]) for (const z of [-0.6, 5.6]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.2, 8), steelM); post.position.set(x, 3.1, z); st.add(post); }
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(20, 1.2), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 64, (g, w, h) => { g.fillStyle = "#16181d"; g.fillRect(0, 0, w, h); g.font = "900 44px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffd23a"; g.fillText("DS-KART  ★  DANKE SONJA KART  ★  DS-KART", w / 2, h / 2 + 2); }) }));
      banner.position.set(0, 5.4, -0.9); banner.rotation.y = Math.PI; st.add(banner);
      // Zuschauer
      const n = Math.round(60 * Math.min(1.3, q.extras));
      const bodyG = new THREE.CylinderGeometry(0.28, 0.32, 0.9, 8); bodyG.translate(0, 0.45, 0);
      const headG = new THREE.SphereGeometry(0.24, 10, 8); headG.translate(0, 1.15, 0);
      const bodies = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
      const heads = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ roughness: 0.7 }), n);
      const C = new THREE.Color();
      const people = [];
      for (let k = 0; k < n; k++) {
        const row = k % 4, x = -10 + Math.random() * 20;
        people.push({ x, y: 0.8 + row * 0.9, z: row * 1.6 + 0.2, ph: Math.random() * 6, sp: rnd(4, 8) });
        bodies.setColorAt(k, C.setHSL(Math.random(), 0.7, 0.55));
        heads.setColorAt(k, C.set(["#f1c9a8", "#d9a07a", "#8a5a3a", "#f3d4bc"][k % 4]));
      }
      st.add(bodies, heads);
      st.position.set(p.x, tr.heightAt(p.x, p.z), p.z);
      st.rotation.y = p.heading + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      st.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      group.add(st);
      crowd = { bodies, heads, people };
      anim.push((dt, t) => {
        for (let k = 0; k < people.length; k++) {
          const pp = people[k], jump = Math.max(0, Math.sin(t * pp.sp + pp.ph)) * 0.25;
          V.set(pp.x, pp.y + jump, pp.z); M.compose(V, Q.identity(), S); bodies.setMatrixAt(k, M); heads.setMatrixAt(k, M);
        }
        bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
      });
    }
  }

  // ---------- Konfetti ueber der Startlinie
  const startP = tr.at(0);
  const CONF = ["#ffd23a", "#e8412f", "#39d4ff", "#6aff7a", "#ff7ad9", "#ffffff"];
  let confAcc = 0;

  return {
    pads,
    tick(dt) {
      for (const r of race.racers) {
        if (r.air || r.respawnT > 0) continue;
        for (const p of pads) {
          let ds = r.s - p.s; if (ds < 0) ds += tr.L;
          if (ds < p.len && Math.abs(r.d - p.off) < p.half && (r.padT || 0) < race.time) { r.boost(0.95); r.padT = race.time + 0.8; }
        }
      }
    },
    update(dt, t) {
      for (const f of anim) f(dt, t);
      // Konfetti nur, wenn jemand in der Naehe ist
      if (race.humans.some(h => (h.x - startP.x) ** 2 + (h.z - startP.z) ** 2 < 140 * 140)) {
        confAcc += dt * 26 * Math.min(1.3, q.extras);
        while (confAcc > 1) {
          confAcc--;
          const off = rnd(-tr.half - 2, tr.half + 2), along = rnd(-6, 6);
          const x = startP.x - startP.tz * off + startP.tx * along, z = startP.z + startP.tx * off + startP.tz * along;
          race.fx.spawn("confetti", x, startP.y + rnd(7, 9), z, { color: CONF[(Math.random() * CONF.length) | 0], size: rnd(0.18, 0.3), grow: 1, life: rnd(2.5, 3.5), vx: rnd(-1, 1), vy: rnd(-2.2, -1.2), vz: rnd(-1, 1), alpha: 1, drag: 0.9, spin: rnd(-8, 8) });
        }
      }
    },
  };
}
