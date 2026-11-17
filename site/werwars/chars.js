// Figuren: Foto-Sprites der Freunde (Streifen mit 8 Bildern a 256x256, Fusspunkt bei y=248)
// 0-3 Laufen nach rechts, 4 Stehen seitlich, 5 Stehen frontal, 6 Arbeiten, 7 Liegend (Kopf links)
export const AVATARS = [
  { id: "tim", name: "Tim", col: "#e04040" }, { id: "sonja", name: "Sonja", col: "#ff6a5a" }, { id: "jannik", name: "Jannik", col: "#5aa0ff" },
  { id: "franzi", name: "Franzi", col: "#7fd06a" }, { id: "giovanni", name: "Giovanni", col: "#f7a8c8" }, { id: "papa", name: "Sonjas Papa", col: "#ff9a3a" },
  { id: "kinga", name: "Kinga", col: "#c79bff" }, { id: "aileen", name: "Aileen", col: "#3fd6c0" },
];
const HEIGHT = { tim: 1.8, sonja: 1.65, jannik: 1.8, franzi: 1.68, papa: 1.78, kinga: 1.68, aileen: 1.66, giovanni: 0.95 };
const CELL = 256, FOOT = 248, STAND = 232;
const imgs = {};
export function loadAvatars(base = "sprites/") {
  return Promise.all(AVATARS.map(a => new Promise(res => {
    const im = new Image(); im.onload = () => res(); im.onerror = () => res(); im.src = base + a.id + ".webp"; imgs[a.id] = im;
  })));
}
export const avatarImg = (id) => imgs[id];
export const avatarOf = (id) => AVATARS.find(a => a.id === id) || AVATARS[0];

// Zeichnet eine Figur mit Fusspunkt (x,y) in Pixeln; S = Pixel pro Meter
// st: { frame, flip, ghost, alpha, name, nameCol, t }
export function drawChar(g, id, x, y, S, st = {}) {
  const im = imgs[id], hm = HEIGHT[id] || 1.7;
  const k = hm * S / STAND; // Pixel im Bild -> Bildschirm
  const fr = st.frame ?? 4;
  const bob = st.ghost ? Math.sin((st.t || 0) * 3) * S * 0.08 - S * 0.25 : 0;
  // Schatten
  if (!st.ghost) { g.fillStyle = "rgba(0,0,0,.28)"; g.beginPath(); g.ellipse(x, y, (fr === 7 ? 0.95 : 0.36) * S * (id === "giovanni" ? 1.3 : 1), 0.13 * S, 0, 0, 7); g.fill(); }
  g.save();
  g.globalAlpha = st.alpha ?? (st.ghost ? 0.42 : 1);
  g.translate(x, y + bob);
  if (st.flip) g.scale(-1, 1);
  if (im && im.complete && im.naturalWidth) {
    g.drawImage(im, fr * CELL, 0, CELL, CELL, -CELL / 2 * k, -FOOT * k, CELL * k, CELL * k);
  } else {
    // Ersatz, solange das Bild laedt
    g.fillStyle = avatarOf(id).col; g.beginPath(); g.ellipse(0, -hm * S * 0.45, 0.3 * S, hm * S * 0.45, 0, 0, 7); g.fill();
  }
  if (st.ghost) { g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(170,220,255,.35)"; g.fillRect(-CELL / 2 * k, -FOOT * k, CELL * k, CELL * k); }
  g.restore();
  if (st.name) {
    const ty = y + bob - (fr === 7 ? 0.55 : hm + 0.18) * S;
    g.font = `900 ${Math.max(11, S * 0.36)}px Nunito, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "bottom";
    g.lineWidth = Math.max(3, S * 0.1); g.lineJoin = "round"; g.strokeStyle = "rgba(0,0,0,.75)"; g.strokeText(st.name, x, ty);
    g.fillStyle = st.nameCol || "#fff"; g.fillText(st.name, x, ty);
  }
}
// Nur das Gesicht/Brustbild aus dem Frontal-Bild (fuer Listen/Abstimmung)
export function drawBust(g, id, cx, cy, r, opts = {}) {
  const im = imgs[id];
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.closePath();
  g.fillStyle = opts.bg || "#24304a"; g.fill(); g.clip();
  if (im && im.naturalWidth) {
    const hm = HEIGHT[id] || 1.7, top = FOOT - STAND * (id === "giovanni" ? 1 : 1);
    const sz = id === "giovanni" ? 150 : 96, sx = 5 * CELL + CELL / 2 - sz / 2, sy = top - 6;
    g.drawImage(im, sx, sy, sz, sz, cx - r, cy - r * 0.95, r * 2, r * 2);
  }
  if (opts.dead) { g.fillStyle = "rgba(10,10,20,.55)"; g.fillRect(cx - r, cy - r, r * 2, r * 2); }
  g.restore();
  g.lineWidth = Math.max(2, r * 0.1); g.strokeStyle = opts.ring || avatarOf(id).col; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
  if (opts.dead) { g.strokeStyle = "#ff4a3d"; g.lineWidth = r * 0.16; g.beginPath(); g.moveTo(cx - r * 0.6, cy - r * 0.6); g.lineTo(cx + r * 0.6, cy + r * 0.6); g.moveTo(cx + r * 0.6, cy - r * 0.6); g.lineTo(cx - r * 0.6, cy + r * 0.6); g.stroke(); }
}
// Brustbild als <canvas> fuer HTML-Listen
export function bustCanvas(id, px = 96, opts = {}) {
  const c = document.createElement("canvas"); c.width = c.height = px * 2; c.style.width = c.style.height = px + "px";
  const draw = () => { const g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height); drawBust(g, id, px, px, px - 4, opts); };
  const im = imgs[id]; if (im && !im.complete) im.addEventListener("load", draw, { once: true });
  draw();
  return c;
}
