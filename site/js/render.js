// Render-Pipeline: HDR-Zwischenbild (MSAA) -> Bloom -> Farbgrading/Vignette -> Tonemapping
import * as THREE from "three";
import { EffectComposer } from "../vendor/jsm/postprocessing/EffectComposer.js";
import { Pass } from "../vendor/jsm/postprocessing/Pass.js";
import { ShaderPass } from "../vendor/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "../vendor/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "../vendor/jsm/postprocessing/OutputPass.js";

export const QUALITY = {
  low:    { name: "Niedrig", pr: 0.75, shadows: false, shadowSize: 1024, post: false, bloom: false, extras: 0.35 },
  medium: { name: "Mittel",  pr: 1.0,  shadows: true,  shadowSize: 1024, post: true,  bloom: false, extras: 0.7 },
  high:   { name: "Hoch",    pr: 1.25, shadows: true,  shadowSize: 2048, post: true,  bloom: true,  extras: 1.0 },
  ultra:  { name: "Ultra",   pr: 2.0,  shadows: true,  shadowSize: 4096, post: true,  bloom: true,  extras: 1.3 },
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
  build() {
    const r = this.renderer, q = this.q;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, q.pr));
    r.shadowMap.enabled = q.shadows;
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    if (!q.post) return;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.views = new ViewsPass();
    this.composer.addPass(this.views);
    if (q.bloom) { this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.5, 1.05); this.composer.addPass(this.bloom); }
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
    this.views.draw = draw;
    this.composer.render();
  }
}
