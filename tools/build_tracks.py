"""Baut die DS-Kart-Strecken aus OpenStreetMap-Daten (ref/*.json, ODbL).

Jede Strecke: Wegpunkte (lat/lon) -> kuerzester Weg ueber echte Strassen -> geglaettete Mittellinie.
Dazu Gebaeude, Wasser, Flaechen, Nebenstrassen und benannte Orte im Umkreis.
Ausgabe: data/<id>.json in Spielkoordinaten (x = Ost, z = Sued, Einheit ~ Meter * scale).
"""
import heapq
import json
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, "ref")
OUT = os.path.join(ROOT, "site", "data")

DRIVE = {"primary", "secondary", "tertiary", "residential", "unclassified", "service", "living_street",
         "primary_link", "secondary_link", "tertiary_link", "road", "track"}


def px2ll(bbox, size, x, y):
    la0, la1, lo0, lo1 = bbox
    w, h = size
    return (la1 - y / h * (la1 - la0), lo0 + x / w * (lo1 - lo0))


TRACKS = {
    "schemmerhofen": {
        "name": "Schemmerhofen",
        "src": "schemmerhofen.json", "elev": "schemmerhofen_elev.json",
        "bbox": (48.165, 48.178, 9.781, 9.802), "size": (1600, 1485),
        # Rathaus -> Hauptstrasse West -> Alte Biberacher Str. hoch -> activ-center/Lidl -> Lindenstrasse runter -> Hauptstrasse
        "route_px": [(1060, 405, "Hauptstraße"), (850, 390, "Hauptstraße"), (655, 464, "Alte Biberacher Straße"),
                     (600, 700, "Alte Biberacher Straße"), (590, 1000, "Alte Biberacher Straße"), (535, 1205, "Alte Biberacher Straße"),
                     (590, 1265), (640, 1152, "Lindenstraße"), (1026, 936, "Lindenstraße"), (1300, 800, "Lindenstraße"),
                     (1440, 650, "Lindenstraße"), (1309, 562, "Hauptstraße"), (1200, 505, "Hauptstraße")],
        "scale": 0.7, "width": 13, "smooth": 6, "always": ["St. Mauritius", "Lidl", "Activ Kebap"], "start": "Rathaus Schemmerhofen",
    },
    "mcd": {
        "name": "Mäcces Biberach",
        "src": "mcd.json",
        "bbox": (48.080, 48.089, 9.795, 9.809), "size": (1600, 1539),
        "route_px": [(712, 930, "Waldseer Straße"), (450, 760, "Waldseer Straße"), (300, 560), (420, 490),
                     (520, 560, "Leipzigstraße"), (690, 770, "Leipzigstraße"), (780, 786), (842, 795),
                     (800, 820, "Leipzigstraße"), (745, 885, "Leipzigstraße")],
        "scale": 1.0, "width": 14, "smooth": 8, "elev": "mcd_elev.json", "start": "McDonald's",
    },
    "baggersee": {
        "name": "Alberweiler Baggersee",
        "src": "baggersee.json",
        "bbox": (48.163, 48.176, 9.760, 9.782), "size": (1600, 1417),
        # frei gezeichnete Runde um den See und durchs Kieswerk (keine Strassen)
        "free_px": [(560, 860), (700, 790), (840, 770), (960, 820), (1010, 900), (930, 980), (840, 1010),
                    (790, 1090), (700, 1160), (590, 1150), (470, 1090), (420, 1000), (450, 920)],
        "scale": 1.0, "width": 15, "smooth": 4, "elev": "baggersee_elev.json",
    },
}


def load(src):
    with open(os.path.join(REF, src), encoding="utf8") as f:
        return json.load(f)["elements"]


class Proj:
    def __init__(self, lat0, lon0, scale):
        self.lat0, self.lon0, self.scale = lat0, lon0, scale
        self.k = math.cos(math.radians(lat0))

    def __call__(self, lat, lon):
        return ((lon - self.lon0) * self.k * 111320 * self.scale, -(lat - self.lat0) * 111320 * self.scale)


def route(elements, waypoints):
    nodes = {}
    adj = {}
    byname = {}
    for e in elements:
        if e["type"] != "way" or e.get("tags", {}).get("highway") not in DRIVE:
            continue
        g = e["geometry"]
        ids = [(round(p["lat"], 7), round(p["lon"], 7)) for p in g]  # Knoten ueber Koordinaten verknuepfen
        for nid in ids:
            nodes[nid] = nid
            byname.setdefault(e["tags"].get("name"), set()).add(nid)
        for a, b in zip(ids, ids[1:]):
            d = dist_ll(nodes[a], nodes[b])
            pen = 1.0 if e["tags"]["highway"] not in ("service", "track") else 1.6
            adj.setdefault(a, []).append((b, d * pen))
            adj.setdefault(b, []).append((a, d * pen))

    def nearest(w):
        ll, name = w[:2], (w[2] if len(w) > 2 else "*")
        pool = adj if name == "*" else byname.get(name, ())
        return min(pool, key=lambda n: dist_ll(nodes[n], ll))

    path = []
    wp = [nearest(w) for w in waypoints] + [None]
    wp[-1] = wp[0]
    for a, b in zip(wp, wp[1:]):
        seg = dijkstra(adj, a, b)
        if seg is None:
            raise SystemExit(f"keine Verbindung {a}->{b}")
        path += seg if not path else seg[1:]
    return [nodes[n] for n in path]


def dijkstra(adj, a, b):
    dist = {a: 0}
    prev = {}
    pq = [(0, a)]
    while pq:
        d, n = heapq.heappop(pq)
        if n == b:
            out = [b]
            while out[-1] != a:
                out.append(prev[out[-1]])
            return out[::-1]
        if d > dist[n]:
            continue
        for m, w in adj.get(n, ()):
            nd = d + w
            if nd < dist.get(m, 1e18):
                dist[m] = nd
                prev[m] = n
                heapq.heappush(pq, (nd, m))
    return None


def dist_ll(a, b):
    k = math.cos(math.radians(a[0]))
    return math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * k)


def resample(pts, step, closed=True):
    if closed:
        pts = pts + [pts[0]]
    out = [pts[0]]
    carry = 0.0
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        L = math.hypot(x1 - x0, z1 - z0)
        t = step - carry
        while t <= L:
            out.append((x0 + (x1 - x0) * t / L, z0 + (z1 - z0) * t / L))
            t += step
        carry = L - (t - step)
    if closed and math.hypot(out[-1][0] - out[0][0], out[-1][1] - out[0][1]) < step * 0.5:
        out.pop()
    return out


def smooth(pts, iters):
    n = len(pts)
    for _ in range(iters):
        pts = [((pts[i - 1][0] + 2 * pts[i][0] + pts[(i + 1) % n][0]) / 4,
                (pts[i - 1][1] + 2 * pts[i][1] + pts[(i + 1) % n][1]) / 4) for i in range(n)]
    return pts


def remove_spurs(pts):
    """Entfernt Hin-und-zurueck-Stuecke (wenn der Weg dieselbe Strasse zurueckfaehrt)."""
    changed = True
    while changed:
        changed = False
        for i in range(1, len(pts) - 1):
            if math.hypot(pts[i - 1][0] - pts[i + 1][0], pts[i - 1][1] - pts[i + 1][1]) < 1e-6:
                del pts[i:i + 2]
                changed = True
                break
    return pts


def seg_dist(p, a, b):
    ax, az = a
    bx, bz = b
    dx, dz = bx - ax, bz - az
    L2 = dx * dx + dz * dz or 1e-9
    t = max(0, min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / L2))
    return math.hypot(p[0] - ax - dx * t, p[1] - az - dz * t)


class Corridor:
    """Schnelle Abstandsabfrage zur Mittellinie ueber ein Raster."""
    def __init__(self, pts, cell=20):
        self.pts = pts
        self.cell = cell
        self.grid = {}
        n = len(pts)
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            for c in {self.key(a), self.key(b), self.key(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))}:
                self.grid.setdefault(c, []).append(i)

    def key(self, p):
        return (int(math.floor(p[0] / self.cell)), int(math.floor(p[1] / self.cell)))

    def dist(self, p, maxr=200):
        return self.nearest(p, maxr)[0]

    def nearest(self, p, maxr=200):
        kx, kz = self.key(p)
        best = 1e9
        bi = 0
        n = len(self.pts)
        r = 0
        while r * self.cell < maxr + self.cell:
            for dx in range(-r, r + 1):
                for dz in range(-r, r + 1):
                    if max(abs(dx), abs(dz)) != r:
                        continue
                    for i in self.grid.get((kx + dx, kz + dz), ()):
                        dd = seg_dist(p, self.pts[i], self.pts[(i + 1) % n])
                        if dd < best:
                            best, bi = dd, i
            if best < (r - 1) * self.cell:
                break
            r += 1
        return best, bi


def centroid(poly):
    return (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))


def point_in_poly(p, poly):
    x, z = p
    inside = False
    n = len(poly)
    for i in range(n):
        x0, z0 = poly[i]
        x1, z1 = poly[(i + 1) % n]
        if (z0 > z) != (z1 > z) and x < (x1 - x0) * (z - z0) / (z1 - z0 + 1e-12) + x0:
            inside = not inside
    return inside


def rnd(v):
    return round(v, 2)


def build(tid, cfg):
    els = load(cfg["src"])
    bbox, size = cfg["bbox"], cfg["size"]
    if "route_px" in cfg:
        wps = [px2ll(bbox, size, w[0], w[1]) + tuple(w[2:]) for w in cfg["route_px"]]
        line_ll = route(els, wps)
    else:
        line_ll = [px2ll(bbox, size, x, y) for x, y in cfg["free_px"]]
    lat0 = sum(p[0] for p in line_ll) / len(line_ll)
    lon0 = sum(p[1] for p in line_ll) / len(line_ll)
    P = Proj(lat0, lon0, cfg["scale"])
    pts = [P(*ll) for ll in line_ll]
    dedup = [pts[0]]
    for p in pts[1:]:
        if math.hypot(p[0] - dedup[-1][0], p[1] - dedup[-1][1]) > 0.5:
            dedup.append(p)
    pts = remove_spurs(dedup)
    if "free_px" in cfg:
        pts = catmull(pts, 12)
    pts = resample(pts, 3.0)
    pts = smooth(pts, cfg["smooth"] * 6)
    pts = resample(pts, 3.0)
    # Fahrtrichtung: gegen den Uhrzeigersinn erzwingen (egal, nur einheitlich)
    area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if area > 0 and not cfg.get("route_px"):
        pts = pts[::-1]
    if cfg.get("start"):
        for e in els:
            t = e.get("tags", {})
            if t.get("name") == cfg["start"]:
                if e["type"] == "node":
                    sp = P(e["lat"], e["lon"])
                elif "geometry" in e:
                    sp = centroid([P(g["lat"], g["lon"]) for g in e["geometry"]])
                else:
                    continue
                k = min(range(len(pts)), key=lambda i: (pts[i][0] - sp[0]) ** 2 + (pts[i][1] - sp[1]) ** 2)
                k = (k + 6) % len(pts)  # Startlinie knapp hinter dem Gebaeude
                pts = pts[k:] + pts[:k]
                break
    cor = Corridor(pts)
    W = cfg["width"]
    dem = load_dem(cfg, P) if cfg.get("elev") else (lambda x, z: 0.0)
    lineH = [dem(x, z) for x, z in pts]
    n = len(lineH)
    for _ in range(4):  # glaetten (~ +-30 m)
        lineH = [sum(lineH[(i + k) % n] for k in range(-10, 11)) / 21 for i in range(n)]
    base = min(lineH) - 1.5
    lineH = [h - base for h in lineH]
    # Gelaenderaster, Fahrbahn eingeebnet
    xs = [x for x, z in pts]; zs = [z for x, z in pts]
    STEP = 6.0
    gx0, gz0 = min(xs) - 420, min(zs) - 420
    gnx, gnz = int((max(xs) + 420 - gx0) / STEP) + 1, int((max(zs) + 420 - gz0) / STEP) + 1
    terr = []
    for j in range(gnz):
        for i in range(gnx):
            x, z = gx0 + i * STEP, gz0 + j * STEP
            h = dem(x, z) - base
            d, k = cor.nearest((x, z), W / 2 + 40)
            if d < W / 2 + 40:
                th = lineH[k] - 0.15
                if d < W / 2 + 7:
                    h = th
                else:
                    t = (d - (W / 2 + 7)) / 33
                    t = t * t * (3 - 2 * t)
                    h = th * (1 - t) + h * t
            terr.append(round(h, 2))
    REACH = 170

    buildings, water, areas, roads, rails, waterways, pois = [], [], [], [], [], [], []
    named = []
    for e in els:
        t = e.get("tags", {})
        if e["type"] == "node" and t.get("name"):
            p = P(e["lat"], e["lon"])
            named.append((p, t))
        elif e["type"] == "way" and t.get("name") and "geometry" in e and ("amenity" in t or "shop" in t or "building" in t or "leisure" in t):
            poly = [P(g["lat"], g["lon"]) for g in e["geometry"]]
            named.append((centroid(poly), t))

    for e in els:
        if e["type"] != "way" or "geometry" not in e:
            continue
        t = e.get("tags", {})
        poly = [P(g["lat"], g["lon"]) for g in e["geometry"]]
        if len(poly) > 1 and poly[0] == poly[-1]:
            poly = poly[:-1]
        c = centroid(poly)
        if "building" in t:
            d = cor.dist(c, REACH + 40)
            if d > REACH:
                continue
            if any(cor.dist(p, W) < W / 2 + 3 for p in poly) or point_in_poly(pts[0], poly):
                continue
            lv = t.get("building:levels")
            try:
                h = float(lv) * 3.0 + 1.0
            except (TypeError, ValueError):
                h = {"church": 14, "industrial": 9, "retail": 7, "commercial": 9, "garage": 3, "garages": 3,
                     "shed": 3, "school": 10, "apartments": 11}.get(t["building"], 6.5)
            label = t.get("name") or t.get("amenity") or t.get("shop") or ""
            kind = t.get("amenity") or t.get("shop") or t.get("building")
            for p, nt in named:
                if point_in_poly(p, poly):
                    label = nt.get("name", label)
                    kind = nt.get("amenity") or nt.get("shop") or kind
                    break
            buildings.append({"p": [[rnd(x), rnd(z)] for x, z in poly], "h": rnd(h * cfg["scale"] ** 0.5),
                              "k": kind, "n": label, "roof": t.get("roof:shape", "")})
        elif t.get("natural") == "water" or t.get("landuse") in ("reservoir", "basin"):
            if cor.dist(c, 400) < 400 or min(cor.dist(p, 300) for p in poly[::3]) < 300:
                water.append([[rnd(x), rnd(z)] for x, z in poly])
        elif "highway" in t:
            if t["highway"] in ("footway", "path", "steps", "cycleway", "bridleway", "corridor", "proposed", "construction"):
                kind = "path"
            else:
                kind = "road"
            close = [p for p in poly if cor.dist(p, REACH) < REACH]
            if close:
                roads.append({"k": kind, "p": [[rnd(x), rnd(z)] for x, z in poly]})
        elif "railway" in t and t["railway"] == "rail":
            rails.append([[rnd(x), rnd(z)] for x, z in poly])
        elif "waterway" in t:
            if any(cor.dist(p, 300) < 300 for p in poly):
                waterways.append({"k": t["waterway"], "p": [[rnd(x), rnd(z)] for x, z in poly]})
        else:
            kind = t.get("landuse") or t.get("natural") or t.get("leisure") or t.get("amenity")
            if kind in ("forest", "wood", "scrub", "farmland", "meadow", "grass", "orchard", "residential",
                        "commercial", "retail", "industrial", "parking", "pitch", "park", "beach", "sand",
                        "village_green", "allotments", "cemetery", "garden", "playground", "quarry", "farmyard",
                        "school", "recreation_ground", "heath", "grassland"):
                if len(poly) >= 3 and (cor.dist(c, 500) < 500 or min(cor.dist(p, 400) for p in poly[::2]) < 400):
                    areas.append({"k": kind, "p": [[rnd(x), rnd(z)] for x, z in poly]})

    for p, t in named:
        if cor.dist(p, REACH) < REACH or t.get("name") in cfg.get("always", ()):
            pois.append({"n": t.get("name"), "k": t.get("amenity") or t.get("shop") or t.get("leisure") or t.get("place") or "",
                         "x": rnd(p[0]), "z": rnd(p[1])})

    L = sum(math.hypot(pts[(i + 1) % len(pts)][0] - pts[i][0], pts[(i + 1) % len(pts)][1] - pts[i][1]) for i in range(len(pts)))
    data = {"id": tid, "name": cfg["name"], "width": W, "length": round(L, 1),
            "line": [[rnd(x), rnd(z)] for x, z in pts],
            "lineH": [rnd(h) for h in lineH],
            "terrain": {"x0": rnd(gx0), "z0": rnd(gz0), "step": STEP, "nx": gnx, "nz": gnz, "h": terr},
            "buildings": buildings, "water": water, "areas": areas, "roads": roads,
            "rails": rails, "waterways": waterways, "pois": pois,
            "credit": "Kartendaten © OpenStreetMap-Mitwirkende (ODbL)"}
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, tid + ".json"), "w", encoding="utf8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{tid}: Laenge {L:.0f}, {len(pts)} Punkte, {len(buildings)} Gebaeude, {len(areas)} Flaechen, "
          f"{len(water)} Wasser, {len(roads)} Strassen, {len(pois)} Orte")
    return data


def load_dem(cfg, P):
    """Hoehe (m) an Spielkoordinate x/z, bilinear aus dem EU-DEM-Raster."""
    with open(os.path.join(REF, cfg["elev"])) as f:
        e = json.load(f)
    n, H = e["n"], e["h"]

    def f(x, z):
        lon = P.lon0 + x / (P.k * 111320 * P.scale)
        lat = P.lat0 - z / (111320 * P.scale)
        fi = (lat - e["la0"]) / (e["la1"] - e["la0"]) * (n - 1)
        fj = (lon - e["lo0"]) / (e["lo1"] - e["lo0"]) * (n - 1)
        fi = max(0, min(n - 1.001, fi)); fj = max(0, min(n - 1.001, fj))
        i, j = int(fi), int(fj); a, b = fi - i, fj - j
        return (H[i * n + j] * (1 - a) * (1 - b) + H[(i + 1) * n + j] * a * (1 - b) +
                H[i * n + j + 1] * (1 - a) * b + H[(i + 1) * n + j + 1] * a * b)
    return f


def catmull(pts, per):
    n = len(pts)
    out = []
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        for s in range(per):
            t = s / per
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
                                    (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in (0, 1)))
    return out


if __name__ == "__main__":
    for tid in (sys.argv[1:] or TRACKS):
        build(tid, TRACKS[tid])
