# Codex-Fassaden (art/facades/*.png) -> site/img/facades/*.webp, Magenta -> transparent
import glob, os
from PIL import Image
import numpy as np
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
KEY = {"mcdrive_schild", "st_mauritius_tuermchen", "activcenter_pylon"}
for f in sorted(glob.glob(os.path.join(root, "art", "facades", "*.png"))):
    name = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert("RGB")
    im.thumbnail((1024, 1024), Image.LANCZOS)
    if name in KEY:
        a = np.asarray(im).astype(np.int16)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        mag = (r > 170) & (b > 170) & (g < 110)
        near = (r > 140) & (b > 140) & (g < 140) & ~mag
        alpha = np.where(mag, 0, 255).astype(np.uint8)
        a2 = a.copy()
        a2[near, 0] = g[near]; a2[near, 2] = g[near]  # Magenta-Rand entfaerben
        rgba = np.dstack([a2.clip(0, 255).astype(np.uint8), alpha])
        im = Image.fromarray(rgba, "RGBA")
        ys, xs = np.where(alpha > 0)
        H, W = alpha.shape
        print(name, "bbox x %.3f-%.3f y %.3f-%.3f" % (xs.min() / W, xs.max() / W, ys.min() / H, ys.max() / H))
        red = (r > 150) & (g < 80) & (b < 80)
        ys, xs = np.where(red)
        if len(xs): print("  rot x %.3f-%.3f y %.3f-%.3f" % (xs.min() / W, xs.max() / W, ys.min() / H, ys.max() / H))
    out = os.path.join(root, "site", "img", "facades", name + ".webp")
    im.save(out, quality=86, method=6)
    print(name, im.size, os.path.getsize(out) // 1024, "KB")
