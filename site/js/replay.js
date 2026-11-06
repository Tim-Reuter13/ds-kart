// Aufzeichnung waehrend des Rennens + "Best of"-Wiederholung mit Kino-Kamera
import * as THREE from "three";
import { ITEMS } from "./items.js";

const STATES = ["fahren", "schaden", "werfen", "vape", "fauchen"];
const FPS = 30, CLIP = 7;

export class Recorder {
  constructor(race) { this.race = race; this.frames = []; this.events = []; this.acc = 0; this.lead = null; }
  tick(dt) {
    const race = this.race;
    if (!race.started) return;
    this.acc += dt;
    while (this.acc >= 1 / FPS) {
      this.acc -= 1 / FPS;
      const f = new Float32Array(race.racers.length * 5);
      race.racers.forEach((r, i) => {
        const st = r.sprite ? Math.max(0, STATES.indexOf(r.sprite.state)) : (r.spinT > 0 ? 1 : 0);
        f.set([r.x, r.y, r.z, r.car.root.rotation.y, st], i * 5);
      });
      this.frames.push(f);
    }
    const first = race.racers.find(r => r.place === 1);
    if (first && this.lead && first !== this.lead && race.time > 6) this.event("lead", { who: first.id }, first.human ? 4 : 2.5);
    this.lead = first;
  }
  event(kind, data, score) { this.events.push({ t: this.race.time, kind, ...data, score }); }

  // Beste Szenen auswaehlen (nicht ueberlappend), chronologisch
  highlights() {
    const ev = this.events.slice().sort((a, b) => b.score - a.score);
    const out = [];
    for (const e of ev) {
      if (out.length >= 6) break;
      if (out.some(o => Math.abs(o.t - e.t) < CLIP)) continue;
      if (e.t < 1.5 || e.t > this.frames.length / FPS - 0.5) continue;
      out.push(e);
    }
    const win = this.events.find(e => e.kind === "win");
    if (win && !out.includes(win)) out.push(win);
    return out.sort((a, b) => a.t - b.t);
  }
}

export class Replay {
  constructor(race, rec) {
    this.race = race; this.rec = rec;
    this.clips = rec.highlights();
    this.ci = 0; this.t = 0; this.done = this.clips.length === 0;
    this.cam = new THREE.PerspectiveCamera(50, 1, 0.5, 2000);
  }
  caption(e) {
    const R = this.race.racers, n = (id) => R[id] ? R[id].driver.name : "?";
    if (e.kind === "hit") return e.by != null && e.by !== e.victim ? `${n(e.by)} erwischt ${n(e.victim)}${e.item && ITEMS[e.item] ? " mit " + ITEMS[e.item].name : ""}!` : `${n(e.victim)} dreht sich!`;
    if (e.kind === "lead") return `${n(e.who)} übernimmt die Führung!`;
    if (e.kind === "jump") return `${n(e.who)} fliegt!`;
    if (e.kind === "win") return `🏆 ${n(e.who)} gewinnt!`;
    return "";
  }
  focusId(e) { return e.kind === "hit" ? e.victim : e.who; }

  update(dt) {
    if (this.done) return;
    this.t += dt;
    if (this.t > CLIP) { this.t = 0; this.ci++; if (this.ci >= this.clips.length) { this.done = true; return; } }
    const e = this.clips[this.ci];
    const time = Math.max(0, e.t - 3.6 + this.t);
    const F = this.rec.frames, fi = Math.min(F.length - 2, Math.floor(time * FPS)), a = time * FPS - fi;
    const f0 = F[fi], f1 = F[fi + 1] || f0;
    this.race.racers.forEach((r, i) => {
      const k = i * 5;
      let dy = f1[k + 3] - f0[k + 3]; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      r.showAt(f0[k] + (f1[k] - f0[k]) * a, f0[k + 1] + (f1[k + 1] - f0[k + 1]) * a, f0[k + 2] + (f1[k + 2] - f0[k + 2]) * a, f0[k + 3] + dy * a, STATES[f0[k + 4] | 0], this.t, dt);
    });
    // Kamera
    const fr = this.race.racers[this.focusId(e)] || this.race.racers[0];
    const p = new THREE.Vector3(fr.rx, fr.ry + 1.0, fr.rz);
    // Kamera-Stile: meist von vorne (Gesichter!), ab und zu ein Kranflug
    const style = [1, 0, 1, 2, 0, 1][this.ci % 6], u = this.t / CLIP;
    let pos;
    if (style === 0) { const ang = fr.rh - 1.1 + u * 2.2; pos = new THREE.Vector3(p.x + Math.sin(ang) * 7.5, p.y + 1.8, p.z + Math.cos(ang) * 7.5); }      // Schwenk vorne links -> vorne rechts
    else if (style === 1) { const ang = fr.rh + 0.35 - u * 0.7; pos = new THREE.Vector3(p.x + Math.sin(ang) * (6.5 - u * 1.2), p.y + 0.7, p.z + Math.cos(ang) * (6.5 - u * 1.2)); } // tiefe Frontfahrt
    else { const ang = fr.rh + 0.9 - u * 1.8; pos = new THREE.Vector3(p.x + Math.sin(ang) * (15 - u * 7), p.y + 10 - u * 7, p.z + Math.cos(ang) * (15 - u * 7)); } // Kran von vorne oben
    pos.y = Math.max(pos.y, this.race.track.heightAt(pos.x, pos.z) + 0.8);
    this.cam.position.copy(pos); this.cam.up.set(0, 1, 0); this.cam.lookAt(p);
  }
}
