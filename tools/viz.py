import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import build_tracks as B
from PIL import Image, ImageDraw
tid = sys.argv[1]; cfg = B.TRACKS[tid]
els = B.load(cfg["src"]); bbox, size = cfg["bbox"], cfg["size"]
la0, la1, lo0, lo1 = bbox
def ll2px(ll): return ((ll[1]-lo0)/(lo1-lo0)*size[0], (la1-ll[0])/(la1-la0)*size[1])
im = Image.open(os.path.join(B.REF, tid + ".png")).convert("RGB"); dr = ImageDraw.Draw(im)
if "route_px" in cfg:
    wps = [B.px2ll(bbox, size, w[0], w[1]) + tuple(w[2:]) for w in cfg["route_px"]]
    line = B.route(els, wps)
    dr.line([ll2px(p) for p in line], fill=(255, 0, 255), width=5)
    for i, (x, y, *_) in enumerate(cfg["route_px"]):
        dr.ellipse([x-8, y-8, x+8, y+8], outline=(0, 0, 0), width=3); dr.text((x+10, y-10), str(i), fill=(0, 0, 0))
else:
    pts = cfg["free_px"]; dr.line(pts + [pts[0]], fill=(255, 0, 255), width=5)
im.save(os.path.join(B.REF, tid + "_route.png"))
