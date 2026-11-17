# "Wer war's?" - Codex-Sprite-Sheets (4x2 auf Magenta) -> site/werwars/sprites/<id>.webp
# Ausgabe: Streifen mit 8 Bildern a 256x256, Fusspunkt unten mittig (y=248).
# Reihenfolge: 0-3 Laufen (nach rechts), 4 Stehen seitlich, 5 Stehen frontal, 6 Arbeiten, 7 Liegend (Kopf links)
# Aufruf: python tools/werwars_sprites.py            (alle)
import os, sys, json
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "art", "werwars_src")
OUT = os.path.join(ROOT, "site", "werwars", "sprites")
PKG = r"C:\Users\timre\Documents\Codex\2026-11-06\mac\outputs"
CELL, FOOT, STAND_H = 256, 248, 232
os.makedirs(OUT, exist_ok=True)

def key(im):
    a = np.asarray(im.convert("RGB")).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # Abstand zu Magenta (auch wenn es nicht exakt FF00FF ist)
    mag = np.minimum(r, b) - g
    d = np.sqrt((r - 255) ** 2 + (g - 0) ** 2 + (b - 255) ** 2)
    alpha = np.clip((d - 70) / 70.0, 0, 1)
    alpha = np.where((mag > 120) & (r > 170) & (b > 170), 0, alpha)
    # Magenta-Saum entfernen
    spill = np.clip(np.minimum(r, b) - g, 0, None)
    k = (alpha < 1).astype(np.float32) * 0.9 + 0.1
    r2 = np.clip(r - spill * k, 0, 255); b2 = np.clip(b - spill * k, 0, 255)
    out = np.dstack([r2, g, b2, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")

def blobs(rgba, min_area=1500):
    al = np.asarray(rgba)[..., 3] > 40
    f = 4  # grob suchen
    h, w = al.shape
    sm = al[: h // f * f, : w // f * f].reshape(h // f, f, w // f, f).any(axis=(1, 3))
    lab = np.zeros(sm.shape, np.int32); n = 0; boxes = []
    for y0 in range(sm.shape[0]):
        for x0 in range(sm.shape[1]):
            if not sm[y0, x0] or lab[y0, x0]: continue
            n += 1; st = [(y0, x0)]; lab[y0, x0] = n; ys = []; xs = []
            while st:
                y, x = st.pop(); ys.append(y); xs.append(x)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < sm.shape[0] and 0 <= xx < sm.shape[1] and sm[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = n; st.append((yy, xx))
            if len(ys) * f * f >= min_area:
                boxes.append((min(xs) * f, min(ys) * f, (max(xs) + 1) * f, (max(ys) + 1) * f, len(ys)))
    return boxes

def place(strip, img, i, scale, lying=False):
    w, h = img.size
    im = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    w, h = im.size
    if w > CELL:  # zur Sicherheit (liegend sehr lang)
        im = im.resize((CELL - 4, max(1, round(h * (CELL - 4) / w))), Image.LANCZOS); w, h = im.size
    x = i * CELL + (CELL - w) // 2
    y = FOOT - h
    strip.alpha_composite(im, (x, max(0, y)))

def from_sheet(cid, path, height_m):
    rgba = key(Image.open(path))
    bx = blobs(rgba)
    bx.sort(key=lambda b: -b[4]); bx = bx[:8]
    if len(bx) != 8: raise SystemExit(f"{cid}: {len(bx)} Figuren gefunden statt 8")
    H = rgba.size[1]
    top = sorted([b for b in bx if (b[1] + b[3]) / 2 < H / 2], key=lambda b: b[0])
    bot = sorted([b for b in bx if (b[1] + b[3]) / 2 >= H / 2], key=lambda b: b[0])
    if len(top) != 4 or len(bot) != 4: raise SystemExit(f"{cid}: Reihen {len(top)}/{len(bot)}")
    order = top + bot
    crops = [rgba.crop(b[:4]) for b in order]
    stand = max(crops[4].size[1], crops[5].size[1])
    scale = STAND_H / stand
    strip = Image.new("RGBA", (CELL * 8, CELL), (0, 0, 0, 0))
    for i, c in enumerate(crops): place(strip, c, i, scale)
    return strip

def aileen():
    def cell(p):
        im = Image.open(p).convert("RGBA"); a = np.asarray(im)[..., 3]; ys, xs = np.where(a > 40)
        return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    L = os.path.join(PKG, "aileen-laeuferin-realistisch")
    frames = [cell(os.path.join(L, "laufen", f"aileen_laufen_090_0{k}.png")) for k in range(4)]
    frames += [cell(os.path.join(L, "stehen", "aileen_stehen_090_00.png")), cell(os.path.join(L, "stehen", "aileen_stehen_000_00.png")), cell(os.path.join(L, "werfen", "aileen_werfen_090_01.png"))]
    lp = os.path.join(SRC, "aileen_lying.png")
    if os.path.exists(lp):
        rg = key(Image.open(lp)); b = sorted(blobs(rg), key=lambda b: -b[4])[0]; frames.append(rg.crop(b[:4]))
    else:
        frames.append(frames[4].rotate(90, expand=True))
    scale = STAND_H / frames[5].size[1]
    strip = Image.new("RGBA", (CELL * 8, CELL), (0, 0, 0, 0))
    for i, c in enumerate(frames): place(strip, c, i, scale)
    return strip

def main():
    # Groesse im Spiel (Meter, Stehhoehe) - Giovanni ist eine Katze
    HEIGHT = {"tim": 1.8, "sonja": 1.65, "jannik": 1.8, "franzi": 1.68, "papa": 1.78, "kinga": 1.68, "aileen": 1.66, "giovanni": 0.9}
    meta = {}
    ids = sys.argv[1:] or ["tim", "sonja", "jannik", "franzi", "papa", "kinga", "giovanni", "aileen"]
    for cid in ids:
        strip = aileen() if cid == "aileen" else from_sheet(cid, os.path.join(SRC, cid + "_sheet.png"), HEIGHT[cid])
        strip.save(os.path.join(OUT, cid + ".webp"), quality=90, alpha_quality=95, method=6)
        a = np.asarray(strip)[..., 3]
        print(cid, "ok", os.path.getsize(os.path.join(OUT, cid + ".webp")) // 1024, "KB")
        meta[cid] = {"h": HEIGHT[cid]}
    mp = os.path.join(OUT, "sprites.json")
    old = json.load(open(mp)) if os.path.exists(mp) else {}
    old.update(meta)
    json.dump(old, open(mp, "w"), indent=1)

if __name__ == "__main__":
    main()
