import * as THREE from "three";

function canvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}
function tex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8;
  return t;
}
function noise(g, w, h, n, colors, rmin, rmax) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    const r = rmin + Math.random() * (rmax - rmin);
    g.globalAlpha = 0.25 + Math.random() * 0.4;
    g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}

const cache = {};
export const T = {
  asphalt() {
    return cache.asphalt ||= tex(canvas(512, 512, (g, w, h) => {
      g.fillStyle = "#56595e"; g.fillRect(0, 0, w, h);
      // grosse, weiche Flecken (Ausbesserungen, Abnutzung)
      for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 90; const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, Math.random() < 0.5 ? "rgba(40,42,46,0.18)" : "rgba(120,122,126,0.12)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      // feine Koernung
      noise(g, w, h, 16000, ["#45484c", "#6d7075", "#4e5155", "#7b7e83", "#3d4044"], 0.5, 1.4);
      // helle Steinchen
      for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(200,200,205,${0.15 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
      // Fahrspuren (leicht dunkler)
      for (const x of [w * 0.3, w * 0.7]) { const gr = g.createLinearGradient(x - 40, 0, x + 40, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(20,22,26,0.14)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - 40, 0, 80, h); }
    }));
  },
  asphaltRough() {
    return cache.asphaltRough ||= (() => { const t = tex(canvas(256, 256, (g, w, h) => {
      g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, w, h);
      noise(g, w, h, 5000, ["#8a8a8a", "#e8e8e8", "#a0a0a0"], 0.5, 2);
    })); t.colorSpace = THREE.NoColorSpace; return t; })();
  },
  grass() {
    return cache.grass ||= tex(canvas(256, 256, (g, w, h) => {
      g.fillStyle = "#5fa83f"; g.fillRect(0, 0, w, h);
      noise(g, w, h, 1800, ["#549a37", "#6cb64a", "#4e8f33", "#78bf55"], 1, 4);
    }));
  },
  dirt() {
    return cache.dirt ||= tex(canvas(256, 256, (g, w, h) => {
      g.fillStyle = "#b79a6c"; g.fillRect(0, 0, w, h);
      noise(g, w, h, 2200, ["#a88b5e", "#c4aa7c", "#9c7f54", "#d0b88a", "#8f8f8f"], 0.8, 3);
    }));
  },
  pavement() {
    return cache.pavement ||= tex(canvas(128, 128, (g, w, h) => {
      g.fillStyle = "#b9b4ab"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#a29d94"; g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); }
      noise(g, w, h, 300, ["#c4bfb6", "#aaa59c"], 0.5, 1.5);
    }));
  },
  windows() {
    // Fassade: 1 Kachel = 3 m breit x 3 m hoch, Fenster in der Mitte
    return cache.windows ||= tex(canvas(128, 128, (g, w, h) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#e9e4da"; g.fillRect(0, 118, w, 10);
      g.fillStyle = "#40505e"; g.fillRect(40, 34, 48, 54);
      g.fillStyle = "#6f8496"; g.fillRect(44, 38, 18, 22); g.fillRect(66, 38, 18, 22);
      g.fillStyle = "#8b5a3c"; g.fillRect(32, 34, 7, 54); g.fillRect(89, 34, 7, 54);
    }));
  },
  roof() {
    return cache.roof ||= tex(canvas(64, 64, (g, w, h) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#d9d9d9";
      for (let y = 0; y < h; y += 8) { g.fillRect(0, y, w, 2); for (let x = (y / 8) % 2 * 4; x < w; x += 8) g.fillRect(x, y, 1, 8); }
    }));
  },
  field() {
    return cache.field ||= tex(canvas(128, 128, (g, w, h) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#dcdcdc";
      for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h);
    }));
  },
  water() {
    return cache.water ||= tex(canvas(256, 256, (g, w, h) => {
      g.fillStyle = "#3f86b8"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 4, x + 16, y); g.stroke();
      }
    }));
  },
  sand() {
    return cache.sand ||= tex(canvas(128, 128, (g, w, h) => {
      g.fillStyle = "#e3cf98"; g.fillRect(0, 0, w, h);
      noise(g, w, h, 900, ["#d6c08a", "#eddaa6", "#cdb57d"], 0.5, 1.8);
    }));
  },
  sign(text, bg = "#2b4a7a", fg = "#ffffff", opts = {}) {
    const key = "sign:" + text + bg + fg + JSON.stringify(opts);
    if (cache[key]) return cache[key];
    const font = opts.font || "bold 64px Arial, sans-serif";
    const meas = canvas(8, 8, () => {}).getContext("2d");
    meas.font = font;
    const tw = Math.ceil(meas.measureText(text).width);
    const w = Math.max(128, tw + 48), h = opts.h || 96;
    const t = tex(canvas(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      if (opts.border) { g.strokeStyle = opts.border; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); }
      g.font = font; g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(text, w / 2, h / 2 + 3);
    }), false);
    t.userData = { aspect: w / h };
    cache[key] = t;
    return t;
  },
  emoji(ch, size = 128) {
    const key = "emoji:" + ch;
    return cache[key] ||= tex(canvas(size, size, (g, w, h) => {
      g.font = `${size * 0.8}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(ch, w / 2, h / 2 + size * 0.05);
    }), false);
  },
  checker() {
    return cache.checker ||= tex(canvas(64, 64, (g, w, h) => {
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? "#111" : "#fff"; g.fillRect(x * 16, y * 16, 16, 16); }
    }));
  },
  smoke() {
    return cache.smoke ||= tex(canvas(128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.5, "rgba(240,240,240,0.55)"); gr.addColorStop(1, "rgba(230,230,230,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }), false);
  },
  spark() {
    return cache.spark ||= tex(canvas(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }), false);
  },
  shadow() {
    return cache.shadow ||= tex(canvas(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 4, 32, 32, 31);
      gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }), false);
  },
};
