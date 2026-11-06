# ChatGPT-Sprite-Pakete (manifest + Atlanten) -> site/sprites/<id>/ (WebP + sprite.json + portrait)
# Aufruf: python tools/conv_sprites.py jannik jannik-bmw-realistisch giovanni giovanni-mausauto-realistisch
import json, os, sys
from PIL import Image

SRC = r"C:\Users\timre\Documents\Codex\2026-11-06\mac\outputs"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
args = sys.argv[1:]
for sid, folder in zip(args[0::2], args[1::2]):
    src = os.path.join(SRC, folder)
    mf = [f for f in os.listdir(src) if f.endswith("_manifest.json")][0]
    man = json.load(open(os.path.join(src, mf), encoding="utf8"))
    out = os.path.join(ROOT, "site", "sprites", sid)
    os.makedirs(out, exist_ok=True)
    states = {}
    for st, a in man["animations"].items():
        im = Image.open(os.path.join(src, a["atlas"])).convert("RGBA")
        im.save(os.path.join(out, st + ".webp"), quality=88, alpha_quality=95, method=6)
        frames = {}
        for fr in sorted(a["frames"], key=lambda f: (f["angle"], f["frame"])):
            frames.setdefault(str(fr["angle"]), []).append(fr["rect"][:2])
        states[st] = {"file": st + ".webp", "w": im.width, "h": im.height, "dur": a["frameDurationMs"], "frames": frames}
        print(sid, st, im.size, os.path.getsize(os.path.join(out, st + ".webp")) // 1024, "KB")
    json.dump({"pivot": man["suggestedPivot"], "cell": man["cellSize"][0], "states": states},
              open(os.path.join(out, "sprite.json"), "w"), separators=(",", ":"))
    p = Image.open(os.path.join(src, man["portrait"])).convert("RGBA")
    p.thumbnail((256, 256), Image.LANCZOS)
    p.save(os.path.join(out, "portrait.webp"), quality=88, method=6)
    print(sid, "portrait", p.size)
