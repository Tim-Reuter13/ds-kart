// Eingabegeraete: Tastatur (2 Spieler), Gamepads, Handys (ueber net.js)
const keys = new Set();
const downAt = new Map(); // ganz kurze Tipper zaehlen trotzdem (mind. 70 ms "gedrueckt")
addEventListener("keydown", e => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) downAt.set(e.code, performance.now());
  keys.add(e.code);
});
addEventListener("keyup", e => keys.delete(e.code));
addEventListener("blur", () => keys.clear());

const KB = {
  kb1: { left: ["KeyA"], right: ["KeyD"], gas: ["KeyW"], brake: ["KeyS"], drift: ["Space", "ShiftLeft"], item: ["KeyE", "KeyQ"], back: ["KeyR"], cam: ["KeyC"],
         up: ["KeyW"], down: ["KeyS"], ok: ["Space", "Enter"], cancel: ["Escape", "Backspace"], start: ["Enter"] },
  kb2: { left: ["ArrowLeft"], right: ["ArrowRight"], gas: ["ArrowUp"], brake: ["ArrowDown"], drift: ["ShiftRight", "Numpad0", "Period"], item: ["ControlRight", "Numpad1", "Comma"], back: ["Numpad2", "KeyM"], cam: ["Numpad5", "KeyN"],
         up: ["ArrowUp"], down: ["ArrowDown"], ok: ["ShiftRight", "Numpad0", "NumpadEnter"], cancel: ["Numpad3"], start: ["NumpadEnter"] },
};

export class Inputs {
  constructor(net) {
    this.net = net;
    this.prev = new Map();
  }

  // Liste aktiver Geraete-IDs
  devices() {
    const out = ["kb1", "kb2"];
    for (const gp of navigator.getGamepads ? navigator.getGamepads() : []) if (gp && gp.connected) out.push("gp" + gp.index);
    for (const id of this.net.phoneIds()) out.push(id);
    return out;
  }

  read(dev) {
    const s = { steer: 0, gas: false, brake: false, drift: false, item: false, back: false, up: false, down: false, left: false, right: false, ok: false, cancel: false, start: false, cam: false };
    if (dev === "kb1" || dev === "kb2") {
      const now = performance.now(), m = KB[dev], any = (arr) => arr.some(k => keys.has(k) || now - (downAt.get(k) ?? -1e9) < 70);
      s.left = any(m.left); s.right = any(m.right);
      s.steer = (s.right ? 1 : 0) - (s.left ? 1 : 0);
      s.gas = any(m.gas); s.brake = any(m.brake); s.drift = any(m.drift); s.item = any(m.item); s.back = any(m.back);
      s.up = any(m.up); s.down = any(m.down); s.ok = any(m.ok); s.cancel = any(m.cancel); s.start = any(m.start); s.cam = any(m.cam);
    } else if (dev.startsWith("gp")) {
      const gp = navigator.getGamepads()[+dev.slice(2)];
      if (gp) {
        const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4));
        let ax = gp.axes[0] || 0; if (Math.abs(ax) < 0.18) ax = 0;
        const ay = gp.axes[1] || 0;
        s.steer = Math.max(-1, Math.min(1, ax + (b(15) ? 1 : 0) - (b(14) ? 1 : 0)));
        s.gas = b(0); s.brake = b(1) || b(2); s.drift = b(5) || b(7); s.item = b(4) || b(6); s.back = b(3);
        s.up = b(12) || ay < -0.6; s.down = b(13) || ay > 0.6; s.left = b(14) || ax < -0.6; s.right = b(15) || ax > 0.6;
        s.ok = b(0); s.cancel = b(1); s.start = b(9); s.cam = b(8);
      }
    } else {
      const p = this.net.phoneState(dev);
      if (p) Object.assign(s, p);
    }
    return s;
  }

  // Flanken (nur einmal pro Druck) fuer Menues
  edges(dev) {
    const s = this.read(dev);
    const p = this.prev.get(dev) || {};
    const e = {};
    for (const k of ["up", "down", "left", "right", "ok", "cancel", "start", "item"]) e[k] = s[k] && !p[k];
    this.prev.set(dev, s);
    return e;
  }
}

export function devLabel(dev) {
  if (dev === "kb1") return "Tastatur links (WASD)";
  if (dev === "kb2") return "Tastatur rechts (Pfeile)";
  if (dev.startsWith("gp")) return "Controller " + (+dev.slice(2) + 1);
  return "Handy";
}
