// Render-Pipeline: HDR-Zwischenbild (MSAA) -> Bloom -> Farbgrading/Vignette -> Tonemapping
import * as THREE from "three";
import { EffectComposer } from "../vendor/jsm/postprocessing/EffectComposer.js";
import { Pass } from "../vendor/jsm/postprocessing/Pass.js";
import { ShaderPass } from "../vendor/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "../vendor/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "../vendor/jsm/postprocessing/OutputPass.js";

export const QUALITY = {
  // budget = hoechstens so viele Megapixel rechnet die Grafikkarte pro Bild (egal wie gross der Fernseher ist).
  // Ein 4K-Fernseher mit 150 % Skalierung waeren sonst ~6 Megapixel - das ist der haeufigste Grund fuer Ruckeln.
  low:    { name: "Niedrig", pr: 0.75, shadows: false, shadowSize: 1024, post: false, bloom: false, extras: 0.35, tex: 2048, budget: 0.9 },
  medium: { name: "Mittel",  pr: 1.0,  shadows: true,  shadowSize: 1024, post: true,  bloom: false, extras: 0.7, tex: 2048, budget: 1.5 },
  high:   { name: "Hoch",    pr: 1.25, shadows: true,  shadowSize: 2048, post: true,  bloom: true,  extras: 1.0, budget: 2.3 },
  ultra:  { name: "Ultra",   pr: 2.0,  shadows: true,  shadowSize: 4096, post: true,  bloom: true,  extras: 1.3, budget: 4.2 },
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.22 },
    contrast: { value: 1.12 },
    warm: { value: new THREE.Vector3(1.04, 1.0, 0.95) },
    vignette: { value: 0.32 },
  },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float saturation; uniform float contrast; uniform vec3 warm; uniform float vignette;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb * warm;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col = (col - 0.18) * contrast + 0.18;
      vec2 d = vUv - 0.5; float v = 1.0 - vignette * dot(d, d) * 2.2;
      gl_FragColor = vec4(max(col, 0.0) * v, c.a);
    }`,
};

// Zeichnet alle Splitscreen-Ansichten in das Zwischenbild
class ViewsPass extends Pass {
  constructor() { super(); this.needsSwap = false; this.draw = null; }
  render(renderer, writeBuffer, readBuffer) { if (this.draw) this.draw(readBuffer); }
}

export class Pipeline {
  constructor(renderer) {
    this.renderer = renderer;
    this.level = "high";
    this.scale = 1; // automatische Aufloesung (AutoRes in perf.js), 0.4..1
    this.views = 1; this.econ = false; // econ = Splitscreen ab 3 Spielern: ohne Bloom, weniger Kantenglaettung, kleineres Pixel-Budget
    try { this.level = localStorage.getItem("dskart_quality") || "high"; } catch (e) {}
    if (!QUALITY[this.level]) this.level = "high";
    this.build();
  }
  get q() { return QUALITY[this.level]; }
  setLevel(l) {
    if (!QUALITY[l]) return;
    this.level = l;
    try { localStorage.setItem("dskart_quality", l); } catch (e) {}
    this.build();
  }
  setScale(s) {
    if (Math.abs(s - this.scale) < 0.001) return;
    this.scale = s;
    this.applyPR();
  }
  setViews(n) {
    const econ = n >= 3;
    this.views = n;
    if (econ !== this.econ) { this.econ = econ; this.build(); } else this.applyPR();
  }
  // Pixeldichte = min(Geraet, Stufe) * AutoRes-Faktor, aber nie mehr als das Pixel-Budget erlaubt
  applyPR() {
    const r = this.renderer, q = this.q, el = r.domElement;
    const W = el.clientWidth || innerWidth, H = el.clientHeight || innerHeight;
    let pr = Math.min(devicePixelRatio || 1, q.pr) * this.scale;
    pr = Math.min(pr, Math.sqrt(q.budget * 1e6 * (this.econ ? 0.8 : 1) / Math.max(1, W * H)));
    pr = Math.max(0.3, pr);
    if (Math.abs(r.getPixelRatio() - pr) > 0.001) r.setPixelRatio(pr);
    this.resize();
  }
  build() {
    const r = this.renderer, q = this.q;
    r.shadowMap.enabled = q.shadows;
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    this.applyPR();
    if (!q.post) return;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: this.econ ? 2 : 4 });
    this.composer = new EffectComposer(r, rt);
    this.viewsPass = new ViewsPass();
    this.composer.addPass(this.viewsPass);
    if (q.bloom && !this.econ) { this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.5, 1.05); this.composer.addPass(this.bloom); }
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.resize();
  }
  resize() {
    if (!this.composer) return;
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight);
  }
  // draw(target|null): zeichnet alle Ansichten (target = Zwischenbild oder Bildschirm)
  render(draw) {
    if (!this.composer) { draw(null); return; }
    this.viewsPass.draw = draw;
    this.composer.render();
  }
}
