# "Wer war's?" - Codex-Bilder -> Spiel-Assets
#  art/werwars_src/assets/floors/*.png  -> site/werwars/assets/floors/<name>.jpg   (nahtlos gemacht, 512 px)
#  art/werwars_src/assets/sheets/*.png  -> site/werwars/assets/props/<name>.webp   (Magenta freigestellt, einzeln)
#  art/werwars_src/assets/bg/*.png      -> site/werwars/assets/bg/<name>.jpg
#  + site/werwars/assets/manifest.json
import os, sys, json
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from werwars_sprites import key, blobs  # gleiche Freistellung wie bei den Figuren

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "art", "werwars_src", "assets")
OUT = os.path.join(ROOT, "site", "werwars", "assets")
for d in ("floors", "props", "bg"): os.makedirs(os.path.join(OUT, d), exist_ok=True)

SHEETS = {
    "kitchen": ["grill", "fryer", "burgerstation", "steelcounter", "sink2", "freezer", "toaster", "icemachine", "drinks", "coffee", "vitrine", "bins3"],
    "dining": ["table4", "table2", "booth", "sofa", "plant", "ballpit", "kiosk", "counter", "desk", "safe", "lockers", "toilet"],
    "cars": ["car_white", "car_silver", "car_blue", "car_red", "car_black", "car_green"],
    "station": ["pump", "airstation", "vacuum", "washbrush", "pricesign", "terminal", "shelf", "drinkfridge", "bakery", "pfand", "pallet", "bin"],
    "garage": ["lift", "tirerack", "workbench", "diag", "oildrums", "keybox", "hedge", "washbasin", "boxes", "coldroom", "coffeetable", "planter"],
}

def seamless(im, size=512):
    """Kachelbar machen: Bild halb verschieben und die Naht mit dem Original ueberblenden."""
    im = im.convert("RGB")
    w, h = im.size
    s = min(w, h); im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))
    a = np.asarray(im).astype(np.float32)
    b = np.roll(np.roll(a, s // 2, axis=0), s // 2, axis=1)
    y, x = np.mgrid[0:s, 0:s] / (s - 1)
    # Gewicht: in der Mitte das verschobene Bild (dort liegt die Naht des Originals am Rand -> nahtlos)
    wx = 1 - np.abs(x - 0.5) * 2; wy = 1 - np.abs(y - 0.5) * 2
    m = np.clip(np.minimum(wx, wy) * 3, 0, 1)[..., None]
    out = a * (1 - m) + b * m
    # Rand muss zu sich selbst passen: die Raender des Ergebnisses kommen aus a (Original) -> rollen und erneut mischen
    out2 = np.roll(np.roll(out, s // 2, axis=0), s // 2, axis=1)
    res = Image.fromarray(np.clip(out2, 0, 255).astype(np.uint8))
    return res.resize((size, size), Image.LANCZOS)

manifest = {"floors": [], "props": {}, "bg": []}
# Boeden
fd = os.path.join(SRC, "floors")
for f in sorted(os.listdir(fd)) if os.path.isdir(fd) else []:
    if not f.endswith(".png"): continue
    n = f[:-4]
    seamless(Image.open(os.path.join(fd, f))).save(os.path.join(OUT, "floors", n + ".jpg"), quality=86)
    manifest["floors"].append(n); print("floor", n)
# Hintergruende
bd = os.path.join(SRC, "bg")
for f in sorted(os.listdir(bd)) if os.path.isdir(bd) else []:
    if not f.endswith(".png"): continue
    n = f[:-4]; im = Image.open(os.path.join(bd, f)).convert("RGB")
    im.thumbnail((1920, 1920), Image.LANCZOS); im.save(os.path.join(OUT, "bg", n + ".jpg"), quality=84)
    manifest["bg"].append(n); print("bg", n)
# Moebel-Blaetter
sd = os.path.join(SRC, "sheets")
for sheet, names in SHEETS.items():
    p = os.path.join(sd, sheet + ".png")
    if not os.path.exists(p): print("fehlt:", sheet); continue
    rgba = key(Image.open(p))
    bx = sorted(blobs(rgba, min_area=2500), key=lambda b: -b[4])[: len(names)]
    if len(bx) < len(names): print(f"{sheet}: nur {len(bx)} von {len(names)} Objekten gefunden")
    # Reihen bilden (nach y), dann nach x
    bx.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in bx:
        cy = (b[1] + b[3]) / 2
        if cur and abs(cy - np.mean([(c[1] + c[3]) / 2 for c in cur])) > 110: rows.append(cur); cur = []
        cur.append(b)
    if cur: rows.append(cur)
    order = [b for r in rows for b in sorted(r, key=lambda b: b[0])]
    for name, b in zip(names, order):
        pad = 4
        crop = rgba.crop((max(0, b[0] - pad), max(0, b[1] - pad), min(rgba.width, b[2] + pad), min(rgba.height, b[3] + pad)))
        al = np.asarray(crop)[..., 3]; ys, xs = np.where(al > 30)
        if len(xs): crop = crop.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        crop.thumbnail((512, 512), Image.LANCZOS)
        crop.save(os.path.join(OUT, "props", name + ".webp"), quality=88, alpha_quality=92, method=6)
        manifest["props"][name] = [crop.width, crop.height]
    print(sheet, "->", ", ".join(names[: len(order)]))
json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w"), indent=1)
print("manifest:", len(manifest["floors"]), "Boeden,", len(manifest["props"]), "Moebel,", len(manifest["bg"]), "Hintergruende")
