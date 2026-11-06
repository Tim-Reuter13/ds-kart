import * as THREE from "three";

export const CLASSES = {
  mofa: { name: "Mofa", sub: "gemütlich", top: 21.5 },
  golf: { name: "Golf", sub: "normal", top: 26 },
  amg: { name: "AMG", sub: "Vollgas", top: 30.5 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapAngle = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export class Racer {
  constructor(driver, car, opts) {
    this.driver = driver;
    this.car = car;
    this.human = !!opts.human;
    this.player = opts.player ?? -1; // Index des menschlichen Spielers (Bildschirm)
    this.id = opts.id;
    this.input = { steer: 0, gas: false, brake: false, drift: false, item: false, back: false };
    this.prevDrift = false; this.prevItem = false;
    this.x = 0; this.y = 0; this.z = 0; this.vy = 0;
    this.heading = 0; this.speed = 0;
    this.hint = -1; this.s = 0; this.d = 0;
    this.total = 0; this.lap = 0; this.finished = false; this.finishTime = 0; this.place = 1;
    this.boostT = 0; this.boostKind = 0;
    this.drift = null; // {dir, charge}
    this.driftLevel = 0;
    this.spinT = 0; this.flashT = 0; this.invT = 0; this.blindT = 0; this.smokeT = 0; this.respawnT = 0;
    this.air = false; this.airT = 0; this.trick = false; this.trickSpin = 0;
    this.pfand = 0;
    this.item = null; this.itemCount = 0; this.roulette = 0; this.shield = null;
    this.wrongT = 0;
    this.safe = { s: 0, heading: 0 };
    this.bump = 0;
    this.visualYaw = 0;
    this.squash = 0;
    this.events = []; // fuer Handy-Vibration / Sound
  }

  place_on_grid(track, s, off) {
    const p = track.at(s, off);
    this.x = p.x; this.z = p.z; this.y = p.y; this.heading = p.heading; this.hint = p.i;
    this.ox = this.x; this.oy = this.y; this.oz = this.z; this.oh = this.heading;
    const q = track.locate(this.x, this.z, this.hint);
    this.s = q.s; this.d = q.d;
    this.total = s - track.L; // vor der Linie
    this.safe = { s, heading: p.heading };
  }

  stats() { return this.driver.stats; }

  hit(kind = "spin", t = 1.1, info = {}) {
    if (this.invT > 0 || this.respawnT > 0) return false;
    this.spinT = Math.max(this.spinT, t);
    this.speed *= kind === "stop" ? 0.05 : 0.3;
    this.drift = null; this.driftLevel = 0;
    this.boostT = 0;
    if (this.pfand > 0) this.pfand = Math.max(0, this.pfand - 2);
    this.events.push({ t: "hit", by: info.by || null, item: info.item || null });
    if (info.by && info.by !== this) info.by.events.push({ t: "scored", victim: this, item: info.item });
    return true;
  }

  boost(t, kind = 1) {
    this.boostT = Math.max(this.boostT, t);
    this.boostKind = kind;
    this.events.push({ t: "boost" });
  }

  step(dt, race) {
    const track = race.track;
    const st = this.stats();
    const cls = race.cls;
    const inp = this.input;
    this.ox = this.x; this.oy = this.y; this.oz = this.z; this.oh = this.heading;
    const driftEdge = inp.drift && !this.prevDrift;
    this.prevDrift = inp.drift;

    if (this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        const p = track.at(this.safe.s, 0);
        this.x = p.x; this.z = p.z; this.y = p.y; this.vy = 0; this.heading = p.heading; this.speed = 0;
        this.ox = this.x; this.oy = this.y; this.oz = this.z; this.oh = this.heading;
        this.hint = p.i; this.air = false; this.spinT = 0;
      }
      return;
    }

    const started = race.started;
    let top = cls.top * st.speed * (1 + 0.012 * this.pfand) * (this.human ? 1 : race.aiScale(this));
    if (this.boostT > 0) top *= this.boostKind === 2 ? 1.42 : 1.32;
    if (this.invT > 0) top *= 1.22;
    if (this.flashT > 0) top *= 0.6;
    if (this.smokeT > 0) top *= 1.05;
    const halfW = track.half;
    const ad = Math.abs(this.d);
    let surface = 1;
    if (!this.air && this.boostT <= 0 && this.invT <= 0) {
      if (ad > halfW + 3.4) surface = race.extra.style === "lake" ? 0.62 : 0.55;
      else if (ad > halfW + 0.6) surface = 0.88;
    }
    top *= surface;

    const control = started && this.spinT <= 0;
    const gas = control && inp.gas;
    const brake = control && inp.brake;
    const rawSteer = control ? clamp(inp.steer, -1, 1) : 0;
    this.steerS = (this.steerS || 0) + (rawSteer - (this.steerS || 0)) * Math.min(1, dt * 14);
    const steer = Math.abs(this.steerS) < 0.01 && rawSteer === 0 ? 0 : this.steerS;

    // Geschwindigkeit
    const acc = 15.5 * st.accel;
    if (this.boostT > 0 && started) {
      this.speed = Math.min(top, this.speed + 45 * dt);
    } else if (gas) {
      if (this.speed < top) this.speed += (acc * (1 - (this.speed / top) ** 2) + 1.2) * dt;
      else this.speed -= (this.speed - top) * 1.6 * dt;
    } else if (brake) {
      if (this.speed > 0.5) this.speed -= 30 * dt;
      else this.speed = Math.max(-8, this.speed - 9 * dt);
    } else {
      const f = Math.min(Math.abs(this.speed), 6 * dt);
      this.speed -= Math.sign(this.speed) * f;
      if (this.speed > top) this.speed -= (this.speed - top) * 1.6 * dt;
    }
    if (this.spinT > 0) { this.spinT -= dt; this.speed *= Math.pow(0.25, dt); }
    if (!this.air) {
      const th = Math.atan2(track.tx[this.hint < 0 ? 0 : this.hint], track.tz[this.hint < 0 ? 0 : this.hint]);
      const along = Math.cos(this.heading - th);
      this.speed -= 9.81 * track.slopeAt(this.s) * along * 0.75 * dt;
    }

    // Lenken + Driften
    const turnBase = 1.95 * st.handling;
    const sp = Math.abs(this.speed);
    const turnScale = clamp(sp / 7, 0, 1) * (1 - 0.22 * clamp(sp / cls.top, 0, 1));
    let yaw = steer * turnBase * turnScale * (this.speed < 0 ? -1 : 1);

    if (driftEdge && !this.air && control) {
      this.vy = 2.4; this.y += 0.04; this.air = true; this.airT = 0; this.hop = true;
    }
    if (this.drift) {
      if (!inp.drift || sp < 7 || !control) {
        const lvl = this.driftLevel;
        if (lvl > 0) this.boost([0, 0.55, 1.05, 1.6][lvl], lvl >= 3 ? 2 : 1);
        this.drift = null; this.driftLevel = 0;
      } else {
        const dir = this.drift.dir;
        const into = clamp(steer * dir, -1, 1);
        yaw = dir * turnBase * (0.55 + 0.62 * (into + 1) / 2);
        this.drift.charge += dt * (0.75 + 0.7 * Math.max(0, into));
        const c = this.drift.charge;
        const lvl = c > 3.0 ? 3 : c > 1.9 ? 2 : c > 0.9 ? 1 : 0;
        if (lvl > this.driftLevel) this.events.push({ t: "spark", lvl });
        this.driftLevel = lvl;
      }
    }
    if (this.spinT > 0) { this.trickSpin += dt * 14; yaw = 0; }
    this.heading = wrapAngle(this.heading + yaw * dt);

    // Bewegung
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;

    // Strecke finden
    let q = track.locate(this.x, this.z, this.hint);
    this.hint = q.i;
    const sideOpen = q.d > 0 ? track.openR[q.i] : track.openL[q.i];
    const lim = track.edge - 1.0;
    if (Math.abs(q.d) > lim) {
      let pushBack = true;
      if (sideOpen) {
        const g = track.nearestGlobal(this.x, this.z, q.i, 40);
        if (g && g.dist < track.edge - 1) { pushBack = false; if (Math.abs(g.d) < Math.abs(q.d)) { q = g; this.hint = g.i; } }
      }
      if (pushBack) {
        const over = Math.abs(q.d) - lim;
        const sgn = Math.sign(q.d);
        // rechte Normale (-tz, tx)
        this.x -= (-track.tz[q.i]) * over * sgn;
        this.z -= (track.tx[q.i]) * over * sgn;
        const th = Math.atan2(track.tx[q.i], track.tz[q.i]);
        const rel = wrapAngle(this.heading - th);
        if (Math.abs(rel) > 0.25 && Math.abs(rel) < Math.PI - 0.25) {
          this.speed *= 0.6;
          this.heading = wrapAngle(th + (Math.abs(rel) < Math.PI / 2 ? 0.15 * -sgn : Math.PI + 0.15 * sgn));
          if (this.bump <= 0) { this.events.push({ t: "wall" }); this.bump = 0.4; }
        } else this.speed *= 1 - 0.8 * dt;
        q = track.locate(this.x, this.z, this.hint);
      }
    }
    this.bump -= dt;
    const prevS = this.s;
    this.s = q.s; this.d = q.d;
    let ds = this.s - prevS;
    if (ds < -track.L / 2) ds += track.L;
    if (ds > track.L / 2) ds -= track.L;
    if (started) this.total += ds;

    // Hoehe / Spruenge
    const g = track.groundAt(this.s);
    this.groundH = g.h;
    if (this.air) {
      this.airT += dt;
      this.vy -= 30 * dt;
      this.y += this.vy * dt;
      if (driftEdge && !this.hop && this.airT < 0.6 && !this.trick && control) { this.trick = true; this.events.push({ t: "trick" }); }
      if (this.y <= g.h) {
        this.y = g.h; this.air = false; this.squash = 0.25;
        if (this.trick) { this.boost(0.7); this.trick = false; }
        if (this.hop) {
          this.hop = false;
          if (inp.drift && Math.abs(steer) > 0.25 && sp > 9 && control) this.drift = { dir: Math.sign(steer), charge: 0 };
        }
        if (race.inWater(this.x, this.z) && Math.abs(this.d) > track.half) { this.respawnT = 1.4; this.speed = 0; this.events.push({ t: "splash" }); }
      }
    } else {
      if (this.y > g.h + 0.35 && !g.ramp) { this.air = true; this.airT = 0; this.hop = false; }
      else { this.y = g.h; this.vy = this.speed * g.slope; }
    }

    // Timer
    if (this.boostT > 0) this.boostT -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.invT > 0) this.invT -= dt;
    if (this.blindT > 0) this.blindT -= dt;
    if (this.smokeT > 0) this.smokeT -= dt;
    if (this.squash > 0) this.squash -= dt;

    // Sicherer Punkt / falsche Richtung
    if (!this.air && Math.abs(this.d) < track.half - 1 && this.spinT <= 0) this.safe = { s: this.s, heading: this.heading };
    const th = Math.atan2(track.tx[q.i], track.tz[q.i]);
    if (Math.abs(wrapAngle(this.heading - th)) > 2.2 && sp > 3) this.wrongT += dt; else this.wrongT = 0;

    // Ziel
    if (!this.finished && this.total >= race.laps * track.L) {
      this.finished = true; this.finishTime = race.time;
      this.events.push({ t: "finish" });
    }
    this.lap = Math.max(1, Math.min(race.laps, Math.floor(this.total / track.L) + 1));
    this.steerVis = steer;
    this.slopeVis = (this.slopeVis || 0) + ((this.air ? 0 : g.slope * Math.cos(this.heading - th)) - (this.slopeVis || 0)) * Math.min(1, dt * 8);
  }

  // Darstellung fuer die Wiederholung
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

  progress(L) { return this.finished ? 1e9 - this.finishTime : this.total; }

  syncModel(dt, alpha = 1) {
    const m = this.car.root;
    const ox = this.ox ?? this.x, oy = this.oy ?? this.y, oz = this.oz ?? this.z, oh = this.oh ?? this.heading;
    let dh = this.heading - oh; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    this.rx = ox + (this.x - ox) * alpha; this.ry = oy + (this.y - oy) * alpha; this.rz = oz + (this.z - oz) * alpha; this.rh = oh + dh * alpha;
    m.position.set(this.rx, this.ry, this.rz);
    const targetYaw = this.drift ? this.drift.dir * 0.42 : (this.steerVis || 0) * 0.06;
    this.visualYaw += (targetYaw - this.visualYaw) * Math.min(1, dt * 8);
    m.rotation.y = this.rh + this.visualYaw + (this.spinT > 0 ? this.trickSpin : 0);
    const b = this.car.body;
    b.rotation.z = -(this.steerVis || 0) * Math.min(1, Math.abs(this.speed) / 20) * 0.06 - (this.drift ? this.drift.dir * 0.05 : 0);
    const pitch = -Math.atan(this.slopeVis || 0);
    b.rotation.x = this.trick ? -this.airT * 9 : pitch;
    const sq = this.squash > 0 ? Math.sin(this.squash / 0.25 * Math.PI) * 0.12 : 0;
    b.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.3);
    this.car.update(dt, this.speed, this.steerVis || 0);
    const sh = this.car.shadow;
    sh.position.set(this.rx, 0.16 + (this.groundH || 0), this.rz);
    sh.rotation.z = -this.rh;
    sh.material.opacity = Math.max(0.2, 1 - (this.y - (this.groundH || 0)) * 0.15);
    // Unsichtbar waehrend Respawn
    m.visible = this.respawnT <= 0 || Math.floor(this.respawnT * 10) % 2 === 0;
    if (this.sprite) { this.sprite.update(dt, this); this.sprite.place(this.rx, this.ry, this.rz, m.rotation.y, m.visible); m.visible = false; }
  }
}
