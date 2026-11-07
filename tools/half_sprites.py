# Halbe Aufloesung fuer alle Fahrer-Sprites: site/sprites/<id>/<state>.webp -> <state>_s.webp (256er-Zellen)
# Wird im Splitscreen und auf den Stufen Niedrig/Mittel geladen (ein Viertel Grafikspeicher).
import json, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "sprites")
ids = sys.argv[1:] or sorted(d for d in os.listdir(ROOT) if os.path.isfile(os.path.join(ROOT, d, "sprite.json")))
for sid in ids:
    d = os.path.join(ROOT, sid)
    spec = json.load(open(os.path.join(d, "sprite.json"), encoding="utf8"))
    for st, s in spec["states"].items():
        im = Image.open(os.path.join(d, s["file"])).convert("RGBA")
        sm = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
        out = os.path.join(d, s["file"].replace(".webp", "_s.webp"))
        sm.save(out, quality=86, alpha_quality=92, method=6)
        print(sid, st, sm.size, os.path.getsize(out) // 1024, "KB")
