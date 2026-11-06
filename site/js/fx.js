import * as THREE from "three";
import { T } from "./tex.js";

// Einfaches Partikelsystem mit Sprites aus einem Pool
export class FX {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.live = [];
    this.mats = {
      smoke: new THREE.SpriteMaterial({ map: T.smoke(), transparent: true, depthWrite: false }),
      spark: new THREE.SpriteMaterial({ map: T.spark(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    };
  }
  spawn(kind, x, y, z, o = {}) {
    if (this.live.length > 700) return;
    let sp = this.pool.pop();
    if (!sp) { sp = new THREE.Sprite(this.mats.smoke.clone()); sp.renderOrder = 20; this.scene.add(sp); }
    const base = this.mats[kind] || this.mats.smoke;
    sp.material.map = base.map; sp.material.blending = base.blending;
    sp.material.color.set(o.color || "#ffffff");
    sp.material.opacity = o.alpha ?? 0.8;
    sp.position.set(x, y, z);
    sp.visible = true;
    const s = o.size ?? 1;
    sp.scale.set(s, s, 1);
    this.live.push({ sp, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life ?? 1, max: o.life ?? 1, grow: o.grow ?? 1, size: s, alpha: o.alpha ?? 0.8, drag: o.drag ?? 1, grav: o.grav || 0 });
  }
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) { p.sp.visible = false; this.pool.push(p.sp); this.live.splice(i, 1); continue; }
      const k = Math.pow(p.drag, dt);
      p.vx *= k; p.vz *= k; p.vy = p.vy * k - p.grav * dt;
      p.sp.position.x += p.vx * dt; p.sp.position.y += p.vy * dt; p.sp.position.z += p.vz * dt;
      const t = 1 - p.life / p.max;
      const s = p.size * (1 + (p.grow - 1) * t);
      p.sp.scale.set(s, s, 1);
      p.sp.material.opacity = p.alpha * (1 - t);
    }
  }
  clear() { for (const p of this.live) { p.sp.visible = false; this.pool.push(p.sp); } this.live.length = 0; }
}
