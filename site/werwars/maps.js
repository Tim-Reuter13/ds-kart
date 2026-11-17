// "Wer war's?" – Karten. 1 Feld = 1 Meter. Raeume als Rechtecke, Waende entstehen automatisch drumherum,
// Tueren/Fenster werden hineingeschnitten. Moebel (props) sind Rechtecke mit Kollision.
// Wird vom PC (Spiellogik + TV) und vom Handy (Zeichnen, eigene Bewegung) benutzt.

// Bodenarten
export const FLOORS = {
  k: { n: "Küchenfliesen", a: "#c9cdd2", b: "#b9bec4", pat: "tile", s: 0.5 },
  r: { n: "Gastraum", a: "#c7a27c", b: "#b48c66", pat: "tile", s: 1 },
  t: { n: "Fliesen", a: "#dfe5ea", b: "#cdd5dc", pat: "tile", s: 0.5 },
  m: { n: "Beton", a: "#9aa0a6", b: "#8d9399", pat: "concrete" },
  w: { n: "Holz", a: "#a8774d", b: "#946640", pat: "wood" },
  c: { n: "Teppich", a: "#5a6f9e", b: "#4f6290", pat: "carpet" },
  a: { n: "Asphalt", a: "#4a4d52", b: "#43464b", pat: "asphalt" },
  p: { n: "Beton hell", a: "#a9adb1", b: "#9da1a6", pat: "slab" },
  s: { n: "Showroom", a: "#e9ecef", b: "#dfe3e7", pat: "tile", s: 1.5 },
  y: { n: "Spielteppich", a: "#e9b64a", b: "#d64a4a", pat: "kids" },
};

const P = (k, x, y, w, h, o = {}) => ({ k, x, y, w, h, solid: o.solid !== false, ...o });

export const MAPS = [
  // ---------------------------------------------------------------- Maecces Biberach (innen)
  {
    id: "maecces", name: "Mäcces Biberach", sub: "Küche · Theke · Drive-in · McCafé-Ecke", color: "#d6452f", outside: "parking",
    w: 46, h: 30,
    rooms: [
      { n: "Küche", x: 1, y: 1, w: 18, h: 9, f: "k" },
      { n: "Lager & Kühlraum", x: 20, y: 1, w: 9, h: 6, f: "m" },
      { n: "Büro", x: 30, y: 1, w: 8, h: 6, f: "w" },
      { n: "Personal-WC", x: 39, y: 1, w: 6, h: 6, f: "t" },
      { n: "Gang", x: 20, y: 8, w: 25, h: 2, f: "m", nolabel: true },
      { n: "Gastraum", x: 1, y: 11, w: 33, h: 18, f: "r" },
      { n: "McCafé-Ecke", x: 35, y: 11, w: 10, h: 8, f: "w" },
      { n: "Drive-in", x: 35, y: 20, w: 10, h: 5, f: "k" },
      { n: "Kunden-WC", x: 35, y: 26, w: 10, h: 3, f: "t" },
    ],
    floors: [{ x: 1, y: 11, w: 30, h: 3, f: "k" }, { x: 1, y: 23, w: 7, h: 6, f: "y" }],
    doors: [[19, 8, 1, 2], [24, 7], [33, 7], [41, 7], [4, 10, 3, 1], [26, 10], [40, 10], [34, 13, 1, 3], [39, 19], [34, 27]],
    windows: [[3, 29, 10, 1], [19, 29, 13, 1], [0, 14, 1, 8], [45, 21, 1, 3], [45, 12, 1, 6], [14, 29, 4, 1, "Eingang"]],
    props: [
      P("grill", 2, 1, 4, 1.3, { label: "Grill" }), P("fryer", 7, 1, 3, 1.3, { label: "Fritteuse" }), P("prep", 11, 1, 5, 1.3, { label: "Burger-Station" }),
      P("toaster", 16.4, 1, 1.6, 1.1), P("steel", 6, 5, 7, 1.5), P("sink", 1, 7.6, 3.4, 1.4, { label: "Spüle" }), P("fridge", 15, 7.7, 3, 1.3),
      P("bin3", 5.2, 8.4, 2.4, 0.6),
      P("shelf", 20, 1, 9, 0.9, { tall: true }), P("shelf", 20, 2.8, 0.9, 3.4, { tall: true }), P("boxes", 22.4, 3.6, 1.8, 1.4), P("coldroom", 26, 2.8, 3, 2.4, { label: "Kühlraum" }),
      P("desk", 31, 1.2, 3, 1.4), P("safe", 35.8, 1, 1.6, 1.3), P("locker", 30, 5.3, 2.4, 0.7),
      P("toilet", 43.4, 1.1, 1.1, 1.3), P("sink", 39.2, 1, 1.6, 0.8),
      P("counter", 1, 14, 26, 1), P("friesout", 8, 11, 3, 0.9), P("drinks", 18, 11, 3, 0.9, { label: "Getränke" }), P("icemachine", 22, 11, 2, 1.1, { label: "Eismaschine" }),
      P("kiosk", 10, 16.2, 0.9, 0.7), P("kiosk", 13, 16.2, 0.9, 0.7), P("kiosk", 16, 16.2, 0.9, 0.7),
      P("table", 10, 19, 2.2, 1.4), P("table", 14, 19, 2.2, 1.4), P("table", 25, 19, 2.2, 1.4), P("table", 29, 19, 2.2, 1.4),
      P("table", 10, 25, 2.2, 1.4), P("table", 14, 25, 2.2, 1.4), P("table", 25, 25, 2.2, 1.4), P("table", 29, 25, 2.2, 1.4),
      P("booth", 31.6, 15.2, 2.2, 3), P("plant", 1.2, 15.4, 0.9, 0.9), P("plant", 32.8, 22.2, 0.9, 0.9),
      P("playpit", 2, 24.4, 4, 2.8, { label: "Bällebad" }), P("slide", 6.2, 27.2, 1.3, 1.3, { solid: false }),
      P("coffee", 35, 11, 3, 0.9, { label: "Kaffee" }), P("vitrine", 39, 11, 4, 0.9), P("sofa", 36, 16.8, 3.4, 1.1), P("table2", 41.6, 15, 1.4, 1.4),
      P("register", 43.7, 20.6, 1.2, 2.2, { label: "Drive-in-Kasse" }), P("steel", 35.2, 20.2, 3, 0.9),
      P("sink", 35.2, 26.1, 2.2, 0.8), P("toilet", 41.6, 26.4, 1.1, 1.3), P("toilet", 43.6, 26.4, 1.1, 1.3),
    ],
    tasks: [
      { id: "burger", n: "Burger belegen", x: 13.5, y: 2.9, g: "burger" },
      { id: "pommes", n: "Pommes frittieren", x: 8.5, y: 2.9, g: "timing", p: { what: "Pommes", icon: "🍟", from: "#f6e7a6", to: "#c9811f", burn: "#5a3410" } },
      { id: "eis", n: "Eismaschine reparieren", x: 23, y: 12.8, g: "seq", p: { icon: "🍦", title: "Eismaschine neu starten", btns: ["Schraube 1", "Schraube 2", "Klappe auf", "Reset", "Klappe zu"], fixed: true } },
      { id: "drivein", n: "Drive-in-Bestellung", x: 43, y: 22, g: "order", p: { icon: "🚗", items: ["Burger", "Cheeseburger", "Pommes", "Nuggets", "Cola", "Wasser", "Eis", "Wrap", "Salat", "Kaffee"] } },
      { id: "zapfen", n: "Getränke zapfen", x: 19.5, y: 12.6, g: "hold", p: { icon: "🥤", what: "Becher füllen", unit: "%", max: 100, lo: 82, hi: 92, speed: 45 } },
      { id: "tische", n: "Tische abwischen", x: 15.1, y: 21, g: "wipe", p: { icon: "🧽", what: "Tisch abwischen", bg: "#c79a6a", dirt: "#7a5a2a" } },
      { id: "kuehl", n: "Kühlraum-Temperatur", x: 27.5, y: 5.8, g: "slider", p: { icon: "❄️", what: "Kühlraum einstellen", unit: "°C", min: -20, max: 10, target: 3, tol: 1 } },
      { id: "kasse", n: "Kasse zählen", x: 32.5, y: 3.1, g: "coins", p: { icon: "💶", what: "Lege genau den Betrag in die Kasse" } },
      { id: "muell", n: "Müll trennen", x: 6.4, y: 7.7, g: "sort", p: { icon: "🗑️", bins: [["Gelber Sack", "#f2c230"], ["Papier", "#2d6cdf"], ["Restmüll", "#555"]], items: [["🥤", 0], ["🍟", 1], ["🧃", 0], ["📦", 1], ["🍔", 2], ["🥡", 1], ["🍕", 2], ["🧴", 0]] } },
      { id: "kaffee", n: "Kaffee machen", x: 36.5, y: 12.5, g: "seq", p: { icon: "☕", title: "Cappuccino", btns: ["Bohnen mahlen", "Tasse drunter", "Espresso", "Milch schäumen"], fixed: true } },
      { id: "wc", n: "Toilette putzen", x: 42.6, y: 28.2, g: "wipe", p: { icon: "🚽", what: "Spiegel & Waschbecken putzen", bg: "#e8eef3", dirt: "#9aa5ad" } },
      { id: "spiel", n: "Spielecke aufräumen", x: 4, y: 28, g: "find", p: { icon: "🧸", what: "Sammle alle Spielsachen ein", targets: ["🧸", "🪀", "🚗", "🎈", "🪁"], filler: ["🟠", "🔴", "🟡", "🔵", "🟢"] } },
    ],
    bell: { x: 20.5, y: 22.3, n: "Service-Glocke" },
    spawn: { x: 20.5, y: 24.5 },
    fuse: { x: 37.3, y: 4.6, n: "Sicherungskasten" },
    crit: { n: "Fritteuse brennt!", fixN: "Feuerlöscher", a: { x: 10.5, y: 8.7 }, b: { x: 31.4, y: 12.4 } },
    hatches: [{ x: 16.6, y: 5.6, g: 0 }, { x: 4, y: 19.5, g: 0 }, { x: 40.5, y: 27.6, g: 0 }, { x: 22, y: 8.9, g: 1 }, { x: 43.3, y: 17.6, g: 1 }],
  },

  // ---------------------------------------------------------------- Total Tankstelle Biberach
  {
    id: "total", name: "Total Tankstelle", sub: "Biberach · Shop · Zapfsäulen · Waschanlage", color: "#e2001a", outside: "grass",
    w: 48, h: 33,
    rooms: [
      { n: "Shop", x: 1, y: 1, w: 21, h: 11, f: "t" },
      { n: "Lager", x: 23, y: 1, w: 12, h: 5, f: "m" },
      { n: "Büro", x: 23, y: 7, w: 6, h: 5, f: "w" },
      { n: "WC", x: 30, y: 7, w: 5, h: 5, f: "t" },
      { n: "Waschanlage", x: 38, y: 1, w: 9, h: 16, f: "m" },
      { n: "Zapfsäulen", x: 1, y: 13, w: 36, h: 19, f: "a", out: true },
      { n: "Hof", x: 37, y: 18, w: 10, h: 14, f: "a", out: true, nolabel: true },
    ],
    floors: [{ x: 1, y: 1, w: 5, h: 4, f: "w" }, { x: 4, y: 14, w: 27, h: 11, f: "p" }],
    doors: [[9, 12, 3, 1], [22, 3], [22, 9], [32, 12], [41, 17, 3, 1]],
    windows: [[2, 12, 6, 1], [13, 12, 8, 1], [0, 6, 1, 5], [37, 4, 1, 4]],
    props: [
      P("bakery", 1, 1, 5, 1.2, { label: "Backshop" }), P("coffee", 1, 3.4, 1, 2.2, { label: "Kaffee" }), P("table2", 3, 8, 1.4, 1.4),
      P("counter", 12, 1.4, 6, 1.2, { label: "Kasse" }), P("pfand", 19.4, 1, 2.3, 1.2, { label: "Pfand" }),
      P("shelf", 7, 5, 7, 0.9, { tall: true }), P("shelf", 7, 8.2, 7, 0.9, { tall: true }), P("shelf", 16, 5, 4.5, 0.9, { tall: true }), P("fridge", 16, 8.2, 4.5, 0.9, { label: "Getränke" }),
      P("shelf", 23, 1, 12, 0.9, { tall: true }), P("boxes", 27.6, 3, 2.6, 1.4), P("pallet", 31.6, 3.2, 2.2, 1.6),
      P("desk", 24, 7.2, 3, 1.3), P("safe", 27.3, 10.2, 1.3, 1.2),
      P("toilet", 33.4, 7.2, 1.1, 1.3), P("sink", 30.2, 7.1, 1.6, 0.8),
      P("car", 40.5, 4, 3, 5.4, { color: "#c9ced6", vert: true }), P("brush", 38.3, 5, 1, 3.4), P("brush", 45.7, 5, 1, 3.4), P("panel", 45.4, 14.6, 1.2, 0.9, { label: "Waschcode" }),
      P("pump", 7, 16.4, 3, 1.1, { n: 1 }), P("pump", 17, 16.4, 3, 1.1, { n: 2 }), P("pump", 27, 16.4, 3, 1.1, { n: 3 }),
      P("pump", 7, 22.4, 3, 1.1, { n: 4 }), P("pump", 17, 22.4, 3, 1.1, { n: 5 }), P("pump", 27, 22.4, 3, 1.1, { n: 6 }),
      P("car", 6.2, 18.2, 4.6, 2, { color: "#2a5fb0" }), P("car", 26.5, 24.2, 4.6, 2, { color: "#d9dde2" }),
      P("pillar", 4.2, 14.6, 0.6, 0.6), P("pillar", 30.2, 14.6, 0.6, 0.6), P("pillar", 4.2, 24.6, 0.6, 0.6), P("pillar", 30.2, 24.6, 0.6, 0.6),
      P("air", 34, 20, 1.2, 1.2, { label: "Luft" }), P("vacuum", 40, 27.6, 1.2, 1.2), P("vacuum", 44, 27.6, 1.2, 1.2),
      P("pricesign", 2, 28.6, 2.4, 1.1, { tall: true, label: "Preise" }), P("bin", 12, 13.3, 0.8, 0.8), P("bin", 24, 13.3, 0.8, 0.8),
      P("hedge", 35.4, 13.2, 1.4, 4, { tall: false }),
    ],
    canopy: { x: 3.6, y: 14.2, w: 27.8, h: 11.2 },
    tasks: [
      { id: "tanken", n: "Tanken: genau 40,00 €", x: 18.5, y: 18.1, g: "fuel", p: { target: 40 } },
      { id: "wechsel", n: "Wechselgeld geben", x: 15, y: 3.3, g: "change" },
      { id: "regal", n: "Regal auffüllen", x: 10.5, y: 7.1, g: "sort", p: { icon: "🛒", bins: [["Snacks", "#e8412f"], ["Getränke", "#2d8adf"], ["Auto", "#555"]], items: [["🍫", 0], ["🥨", 0], ["🥤", 1], ["🧃", 1], ["🛢️", 2], ["🧽", 2], ["🍬", 0], ["💧", 1]] } },
      { id: "broetchen", n: "Brötchen aufbacken", x: 3.5, y: 2.8, g: "timing", p: { what: "Brötchen", icon: "🥖", from: "#f4e3c0", to: "#c98a3e", burn: "#4a2a10" } },
      { id: "entkalken", n: "Kaffee-Automat entkalken", x: 2.6, y: 4.5, g: "seq", p: { icon: "☕", title: "Entkalken", btns: ["Tank leeren", "Tablette rein", "Wasser auffüllen", "Spülen starten"], fixed: true } },
      { id: "waschcode", n: "Waschanlage freischalten", x: 45, y: 14, g: "code", p: { icon: "🧼", what: "Code vom Kassenbon" } },
      { id: "luft", n: "Reifendruck prüfen", x: 34.6, y: 22, g: "hold", p: { icon: "🛞", what: "Auf 2,5 bar pumpen", unit: "bar", max: 4, lo: 2.4, hi: 2.6, speed: 0.9, dec: 1 } },
      { id: "pfand", n: "Pfand sortieren", x: 20.5, y: 2.9, g: "sort", p: { icon: "🍾", bins: [["Glas", "#3c9a5f"], ["Plastik", "#2d8adf"], ["Dose", "#9aa0a6"]], items: [["🍾", 0], ["🥤", 1], ["🥫", 2], ["🍺", 0], ["🧴", 1], ["🥫", 2], ["🫙", 0], ["🧃", 1]] } },
      { id: "lieferung", n: "Lieferung abzeichnen", x: 29, y: 5.3, g: "sign" },
      { id: "preise", n: "Preise am Mast ändern", x: 3.2, y: 27.8, g: "price", p: { what: "Super E10" } },
      { id: "scheibe", n: "Scheibe putzen", x: 8.5, y: 21, g: "wipe", p: { icon: "🪟", what: "Windschutzscheibe putzen", bg: "#9fc4dc", dirt: "#6b5a3a" } },
      { id: "staub", n: "Staubsauger leeren", x: 42.6, y: 29, g: "find", p: { icon: "🧹", what: "Hol alles raus, was nicht reingehört", targets: ["🪙", "🔑", "🧦", "🍬", "🎧"], filler: ["⚫", "🟤", "⚫", "🟤", "⚪"] } },
    ],
    bell: { x: 18.5, y: 28.4, n: "Notruf-Säule" },
    spawn: { x: 18.5, y: 27 },
    fuse: { x: 24.2, y: 10.8, n: "Sicherungskasten" },
    crit: { n: "Benzin läuft aus!", fixN: "Not-Aus", a: { x: 32.2, y: 19 }, b: { x: 27.9, y: 8.2 } },
    hatches: [{ x: 33, y: 3.5, g: 0 }, { x: 44, y: 11, g: 0 }, { x: 4, y: 20.5, g: 1 }, { x: 15, y: 10.6, g: 1 }, { x: 45, y: 24, g: 1 }],
  },

  // ---------------------------------------------------------------- Autohaus Moll Biberach
  {
    id: "moll", name: "Autohaus Moll", sub: "Biberach · Showroom · Werkstatt · Hof", color: "#1f62b8", outside: "grass",
    w: 54, h: 33,
    rooms: [
      { n: "Showroom", x: 1, y: 1, w: 24, h: 16, f: "s" },
      { n: "Verkauf 1", x: 26, y: 1, w: 4, h: 5, f: "c" },
      { n: "Verkauf 2", x: 31, y: 1, w: 4, h: 5, f: "c" },
      { n: "Kundenlounge", x: 26, y: 7, w: 9, h: 10, f: "w" },
      { n: "Werkstatt", x: 36, y: 1, w: 17, h: 16, f: "m" },
      { n: "Reifenlager", x: 36, y: 18, w: 8, h: 7, f: "m" },
      { n: "Teilelager", x: 45, y: 18, w: 8, h: 7, f: "m" },
      { n: "Hof", x: 1, y: 18, w: 34, h: 14, f: "a", out: true },
      { n: "Waschplatz", x: 35, y: 26, w: 18, h: 6, f: "a", out: true },
    ],
    floors: [],
    doors: [[25, 10, 1, 3], [10, 17, 3, 1], [27, 6], [32, 6], [35, 12, 1, 2], [38, 17], [48, 17], [35, 21], [49, 25]],
    windows: [[0, 2, 1, 14], [2, 17, 7, 1], [14, 17, 10, 1], [3, 0, 20, 1]],
    props: [
      P("car", 3, 3, 5, 2.2, { color: "#d9dde2" }), P("car", 12, 3, 5, 2.2, { color: "#1f62b8" }), P("car", 4, 9.4, 5, 2.2, { color: "#b31b1b" }), P("car", 14, 9.4, 5, 2.2, { color: "#2a2c30" }),
      P("desk", 19, 13.6, 4, 1.3, { label: "Empfang" }), P("keybox", 24.1, 14, 0.8, 2, { label: "Schlüssel" }), P("plant", 1.3, 1.3, 0.9, 0.9), P("plant", 23.6, 1.3, 0.9, 0.9), P("sofa", 2, 13.8, 3.4, 1.1),
      P("desk", 26.4, 1.4, 3, 1.2), P("desk", 31.4, 1.4, 3, 1.2),
      P("coffee", 33.9, 8.2, 0.9, 2, { label: "Kaffee" }), P("sofa", 28.2, 14.8, 4.4, 1.1), P("table2", 29.6, 10.2, 1.6, 1.6), P("plant", 26.2, 15.6, 0.9, 0.9),
      P("lift", 37, 2, 4.2, 6, { color: "#7a8796" }), P("lift", 42.6, 2, 4.2, 6, { color: "#c9ced6" }), P("lift", 48.2, 2, 4.2, 6, { color: "#b31b1b", empty: true }),
      P("steel", 37, 14.6, 6, 1.2, { label: "Werkbank" }), P("diag", 44, 14.6, 1.4, 1.2, { label: "Diagnose" }), P("oil", 51.4, 9.6, 1.4, 4, { label: "Öl" }),
      P("tirerack", 40.4, 18, 3.4, 1.2), P("tirerack", 38.4, 23.6, 5.4, 1.2),
      P("shelf", 45, 19, 1.2, 5, { tall: true }), P("shelf", 51.6, 19, 1.2, 5, { tall: true }), P("counter", 47.2, 21, 3, 1),
      P("car", 3, 20, 2.2, 4.6, { color: "#e9ebee", vert: true }), P("car", 7, 20, 2.2, 4.6, { color: "#3c6e3a", vert: true }), P("car", 11, 20, 2.2, 4.6, { color: "#c9a227", vert: true }),
      P("car", 15, 20, 2.2, 4.6, { color: "#5a5e66", vert: true }), P("car", 7, 26.4, 2.2, 4.6, { color: "#8a1c1c", vert: true }), P("car", 15, 26.4, 2.2, 4.6, { color: "#1d4fd8", vert: true }),
      P("flag", 22, 30.4, 0.6, 0.6), P("flag", 26, 30.4, 0.6, 0.6), P("flag", 30, 30.4, 0.6, 0.6),
      P("washbay", 41, 27, 6, 4.2), P("bin", 37, 30.6, 0.8, 0.8),
    ],
    tasks: [
      { id: "reifen", n: "Reifen wechseln", x: 39.1, y: 8.7, g: "lug" },
      { id: "oel", n: "Öl nachfüllen", x: 44.7, y: 8.7, g: "hold", p: { icon: "🛢️", what: "Bis zwischen MIN und MAX", unit: "L", max: 6, lo: 4.6, hi: 5.2, speed: 1.3, dec: 1 } },
      { id: "fehler", n: "Fehlerspeicher auslesen", x: 44.7, y: 14.1, g: "code", p: { icon: "🔧", what: "Fehlercode abtippen" } },
      { id: "polieren", n: "Auto polieren", x: 5.5, y: 5.8, g: "wipe", p: { icon: "✨", what: "Motorhaube polieren", bg: "#d9dde2", dirt: "#8c8f93" } },
      { id: "schluessel", n: "Schlüssel finden", x: 23.6, y: 15.4, g: "find", p: { icon: "🔑", what: "Finde den Schlüssel für BC-MO 204", keys: true } },
      { id: "vertrag", n: "Kaufvertrag unterschreiben", x: 27.9, y: 3.2, g: "sign" },
      { id: "kundenkaffee", n: "Kaffee für Kunden", x: 33.2, y: 9.2, g: "seq", p: { icon: "☕", title: "Latte macchiato", btns: ["Glas hinstellen", "Milch", "Milchschaum", "Espresso"], fixed: true } },
      { id: "einlagern", n: "Reifen einlagern", x: 42, y: 22, g: "sort", p: { icon: "🛞", bins: [["16 Zoll", "#555"], ["17 Zoll", "#2d6cdf"], ["18 Zoll", "#e8412f"]], items: [["16", 0], ["17", 1], ["18", 2], ["17", 1], ["16", 0], ["18", 2]] } },
      { id: "teil", n: "Ersatzteil holen", x: 48.7, y: 20.3, g: "find", p: { icon: "📦", what: "Hol den Bremsbelag", targets: ["🛑"], filler: ["⚙️", "🔩", "🔋", "🪛", "💡", "🧯", "🔧", "⛓️"] } },
      { id: "waschen", n: "Auto waschen", x: 44, y: 26.4, g: "wipe", p: { icon: "🚿", what: "Auto abspritzen", bg: "#7a8796", dirt: "#5b4a33" } },
      { id: "preisschild", n: "Preisschild aufhängen", x: 9, y: 25.2, g: "price", p: { what: "Gebrauchtwagen", car: true } },
      { id: "kunde", n: "Kunde begrüßen", x: 21, y: 15.6, g: "order", p: { icon: "🤝", items: ["Kombi", "SUV", "Kleinwagen", "Weiß", "Schwarz", "Rot", "Anhängerkupplung", "Sitzheizung", "Navi", "Probefahrt"] } },
    ],
    bell: { x: 26, y: 24, n: "Glocke am Fahnenmast" },
    spawn: { x: 26, y: 26 },
    fuse: { x: 36.6, y: 10.5, n: "Sicherungskasten" },
    crit: { n: "Alarmanlage geht los!", fixN: "Alarm-Panel", a: { x: 1.8, y: 15.6 }, b: { x: 52.2, y: 15.6 } },
    hatches: [{ x: 20, y: 6.5, g: 0 }, { x: 50.5, y: 12.4, g: 0 }, { x: 28.5, y: 29.5, g: 1 }, { x: 37.4, y: 20.5, g: 1 }],
  },
];

// ---------------------------------------------------------------- Aufbau: Raster, Kollision, Sicht
export const VOID = 0, WALL = 1, GLASS = 2;
export function buildMap(def) {
  const W = def.w, H = def.h, cells = new Uint8Array(W * H), floor = new Array(W * H).fill(null), room = new Int16Array(W * H).fill(-1);
  const out = new Uint8Array(W * H);
  def.rooms.forEach((r, ri) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { const i = y * W + x; cells[i] = 3; floor[i] = r.f; room[i] = ri; out[i] = r.out ? 1 : 0; }
  });
  // Waende: jede leere Zelle, die an einen Innenraum grenzt
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (cells[i]) continue;
    let indoor = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx; if (cells[j] === 3 && !out[j]) indoor = true;
    }
    if (indoor) cells[i] = WALL;
  }
  const carve = (a, kind) => {
    const [x0, y0, w = 1, h = 1] = a;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const i = y * W + x;
      if (kind === GLASS) { cells[i] = GLASS; continue; }
      // Tuer: Boden vom Nachbarraum uebernehmen
      let f = null, ri = -1;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const j = (y + dy) * W + x + dx; if (floor[j] && !f) { f = floor[j]; ri = room[j]; } }
      cells[i] = 3; floor[i] = f || "m"; room[i] = ri; out[i] = 0;
    }
  };
  for (const d of def.doors) carve(d, 3);
  for (const w of def.windows) carve(w, GLASS);
  for (const f of def.floors || []) for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if (cells[y * W + x] === 3) floor[y * W + x] = f.f;
  const m = { def, id: def.id, W, H, cells, floor, room, out, props: def.props, tasks: def.tasks };
  m.cell = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? VOID : cells[(y | 0) * W + (x | 0)];
  m.walkCell = (x, y) => m.cell(x, y) === 3;
  m.roomAt = (x, y) => { const xi = x | 0, yi = y | 0; if (xi < 0 || yi < 0 || xi >= W || yi >= H) return null; const r = room[yi * W + xi]; return r >= 0 ? def.rooms[r] : null; };
  return m;
}

// Kreis (Spieler) gegen Raster + Moebel
export function blocked(m, x, y, r = 0.3) {
  for (let yy = Math.floor(y - r); yy <= Math.floor(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.floor(x + r); xx++) {
    if (m.cell(xx, yy) === 3) continue;
    const cx = Math.max(xx, Math.min(x, xx + 1)), cy = Math.max(yy, Math.min(y, yy + 1));
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  for (const p of m.props) {
    if (!p.solid) continue;
    const cx = Math.max(p.x, Math.min(x, p.x + p.w)), cy = Math.max(p.y, Math.min(y, p.y + p.h));
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  return false;
}
// Bewegung mit Gleiten an Waenden
export function moveCircle(m, x, y, dx, dy, r = 0.3) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.15));
  dx /= steps; dy /= steps;
  for (let i = 0; i < steps; i++) {
    if (!blocked(m, x + dx, y, r)) x += dx;
    if (!blocked(m, x, y + dy, r)) y += dy;
  }
  return [x, y];
}
// Sichtlinie (Waende blockieren, Glas nicht)
export function lineOfSight(m, x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 0.25);
  for (let i = 1; i < n; i++) { const t = i / n, c = m.cell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); if (c === WALL || c === VOID) return false; }
  return true;
}
// Sichtfeld als Polygon (fuer die Dunkelheit auf dem Handy)
export function visPoly(m, x, y, R, rays = 160) {
  const pts = [];
  for (let k = 0; k < rays; k++) {
    const a = k / rays * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    let d = 0;
    while (d < R) { d += 0.09; const c = m.cell(x + ca * d, y + sa * d); if (c === WALL || c === VOID) { d += 0.8; break; } } // Wand selbst noch zeigen
    d = Math.min(d, R);
    pts.push(x + ca * d, y + sa * d);
  }
  return pts;
}
export function nearestFree(m, x, y) {
  if (!blocked(m, x, y)) return [x, y];
  for (let r = 0.3; r < 4; r += 0.3) for (let a = 0; a < 6.28; a += 0.4) { const xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r; if (!blocked(m, xx, yy)) return [xx, yy]; }
  return [x, y];
}

// ---------------------------------------------------------------- Fotorealistische Assets (von Codex, siehe tools/werwars_assets.py)
// Boden-Textur je Bodenart: [Datei, Meter pro Kachel]
const FLOOR_TEX = { k: ["kitchen", 1.6], r: ["dining", 2.4], t: ["whitetiles", 1.2], m: ["concrete", 4], w: ["wood", 2.6], c: ["carpet", 2], a: ["asphalt", 4], p: ["slabs", 3], s: ["showroom", 3.2], y: ["kidsmat", 2] };
const PROP_TEX = {
  grill: "grill", fryer: "fryer", prep: "burgerstation", steel: "steelcounter", sink: "sink2", fridge: "freezer", toaster: "toaster", icemachine: "icemachine",
  drinks: "drinks", coffee: "coffee", vitrine: "vitrine", bin3: "bins3", table: "table4", table2: "table2", booth: "booth", sofa: "sofa", plant: "plant",
  playpit: "ballpit", kiosk: "kiosk", counter: "counter", desk: "desk", safe: "safe", locker: "lockers", toilet: "toilet",
  pump: "pump", air: "airstation", vacuum: "vacuum", brush: "washbrush", pricesign: "pricesign", panel: "terminal", shelf: "shelf", bakery: "bakery",
  pfand: "pfand", pallet: "pallet", bin: "bin", tirerack: "tirerack", diag: "diag", oil: "oildrums", keybox: "keybox", hedge: "hedge",
  boxes: "boxes", coldroom: "coldroom", register: "terminal", friesout: "fryer", lift: "lift",
};
const CARS = [["car_white", "#e9ebee"], ["car_silver", "#c9ced6"], ["car_blue", "#1f62b8"], ["car_red", "#b31b1b"], ["car_black", "#2a2c30"], ["car_green", "#3c6e3a"]];
function carFor(col = "#999999") {
  const n = parseInt(col.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
  let best = CARS[0][0], bd = 1e9;
  for (const [k, h] of CARS) { const q = parseInt(h.slice(1), 16), d = (c[0] - (q >> 16)) ** 2 + (c[1] - ((q >> 8) & 255)) ** 2 + (c[2] - (q & 255)) ** 2; if (d < bd) { bd = d; best = k; } }
  return best;
}
// passendes Foto je Moebel (manche Arten sehen je nach Ort anders aus)
function texFor(p, m) {
  if (p.k === "car") return carFor(p.color);
  if (p.label === "Werkbank") return "workbench";
  if (p.label === "Getränke" && m.def.id === "total") return "drinkfridge";
  if (p.k === "sink" && !p.label) return "washbasin";
  if (p.k === "table2" && m.def.id === "moll") return "coffeetable";
  if (p.k === "shelf" && m.def.id === "moll") return "boxes";
  if (p.k === "plant" && m.def.id === "moll") return "planter";
  return PROP_TEX[p.k];
}
let ASSETS = null;
export function loadMapAssets(base = "assets/") {
  if (ASSETS) return ASSETS;
  const img = (src) => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  ASSETS = fetch(base + "manifest.json").then(r => r.ok ? r.json() : null).catch(() => null).then(async (man) => {
    const A = { floor: {}, prop: {} };
    if (!man) return A;
    await Promise.all([
      ...man.floors.map(n => img(base + "floors/" + n + ".jpg").then(im => { if (im) A.floor[n] = im; })),
      ...Object.keys(man.props).map(n => img(base + "props/" + n + ".webp").then(im => { if (im) A.prop[n] = im; })),
    ]);
    return A;
  });
  return ASSETS;
}

// ---------------------------------------------------------------- Zeichnen (vorberechnet in ein Bild)
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k))); return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1); }

export function renderMap(m, S = 32, A = null) {
  const cv = document.createElement("canvas"); cv.width = m.W * S; cv.height = m.H * S;
  const g = cv.getContext("2d"), R = rnd(m.W * 31 + m.H);
  if (A && Object.keys(A.floor).length) return renderReal(m, S, A, cv, g);
  // Aussen
  const outCol = m.def.outside === "grass" ? ["#5f8f45", "#56853e"] : ["#55595e", "#4e5257"];
  g.fillStyle = outCol[0]; g.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < m.W * m.H * 0.8; i++) { g.fillStyle = R() < 0.5 ? outCol[1] : shade(outCol[0], 0.08); g.fillRect(R() * cv.width, R() * cv.height, S * 0.18, S * 0.18); }
  if (m.def.outside === "parking") { g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = S * 0.08; for (let x = 2; x < m.W; x += 3) { g.beginPath(); g.moveTo(x * S, 0); g.lineTo(x * S, S * 0.0); g.stroke(); } }
  // Boden
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
    const i = y * m.W + x, c = m.cells[i];
    if (c !== 3) continue;
    drawFloor(g, x, y, S, FLOORS[m.floor[i]] || FLOORS.m, R);
  }
  // Fahrbahnmarkierungen draussen (Tankstelle/Hof)
  if (m.def.id === "total") { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = S * 0.1; g.setLineDash([S * 0.8, S * 0.6]); g.beginPath(); g.moveTo(1 * S, 30.5 * S); g.lineTo(46 * S, 30.5 * S); g.stroke(); g.setLineDash([]); }
  if (m.def.id === "moll") { g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = S * 0.08; for (const x of [2, 6, 10, 14, 18]) { g.beginPath(); g.moveTo(x * S + S * 0.5, 19.5 * S); g.lineTo(x * S + S * 0.5, 25 * S); g.stroke(); } }
  // Schatten an Waenden (Umgebungsverdeckung)
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
    if (m.cells[y * m.W + x] !== 3) continue;
    const w = (xx, yy) => { const c = m.cell(xx, yy); return c === WALL || c === GLASS; };
    const sh = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "rgba(0,0,0,.28)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; };
    if (w(x, y - 1)) { sh(0, y * S, 0, y * S + S * 0.6); g.fillRect(x * S, y * S, S, S * 0.6); }
    if (w(x - 1, y)) { sh(x * S, 0, x * S + S * 0.4, 0); g.fillRect(x * S, y * S, S * 0.4, S); }
    if (w(x + 1, y)) { sh(x * S + S, 0, x * S + S * 0.6, 0); g.fillRect(x * S + S * 0.6, y * S, S * 0.4, S); }
  }
  // Moebel (mit Schlagschatten)
  for (const p of m.props) drawProp(g, p, S, m);
  // Dach der Tankstelle (nur Kante, sonst sieht man nichts)
  if (m.def.canopy) { const c = m.def.canopy; g.strokeStyle = "rgba(226,0,26,.85)"; g.lineWidth = S * 0.22; rr(g, c.x * S, c.y * S, c.w * S, c.h * S, S * 0.4); g.stroke(); g.fillStyle = "rgba(255,255,255,.05)"; g.fill(); }
  // Waende
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
    const c = m.cells[y * m.W + x];
    if (c === WALL) {
      g.fillStyle = "#3a3f4a"; g.fillRect(x * S, y * S, S, S);
      g.fillStyle = "#4b5260"; g.fillRect(x * S, y * S, S, S * 0.62);
      if (m.cell(x, y + 1) === 3) { const gr = g.createLinearGradient(0, y * S + S * 0.5, 0, y * S + S); gr.addColorStop(0, "#e9e2d4"); gr.addColorStop(1, "#bdb5a6"); g.fillStyle = gr; g.fillRect(x * S, y * S + S * 0.5, S, S * 0.5); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x * S, y * S + S * 0.94, S, S * 0.06); }
    } else if (c === GLASS) {
      g.fillStyle = "#9fd2ea"; g.fillRect(x * S, y * S + S * 0.3, S, S * 0.4);
      g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(x * S + S * 0.1, y * S + S * 0.34, S * 0.5, S * 0.08);
      g.fillStyle = "#4b5260"; g.fillRect(x * S, y * S + S * 0.26, S, S * 0.06); g.fillRect(x * S, y * S + S * 0.7, S, S * 0.06);
    }
  }
  // Schilder fuer Fenster mit Namen (z.B. Eingang)
  g.font = `900 ${S * 0.45}px Nunito, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  for (const w of m.def.windows) if (w[4]) { g.fillStyle = "rgba(255,255,255,.95)"; g.fillText(w[4], (w[0] + (w[2] || 1) / 2) * S, (w[1] + 1.25) * S); }
  return cv;
}

// Fotorealistische Variante: Texturen fuer Boeden/Waende, Fotos von oben fuer die Moebel
function renderReal(m, S, A, cv, g) {
  const pat = (name, meters) => { const im = A.floor[name]; if (!im) return null; const p = g.createPattern(im, "repeat"); p.setTransform(new DOMMatrix().scale(meters * S / im.width)); return p; };
  const outside = pat(m.def.outside === "grass" ? "grass" : "asphalt", m.def.outside === "grass" ? 3 : 4);
  g.fillStyle = outside || "#4e5257"; g.fillRect(0, 0, cv.width, cv.height);
  if (m.def.outside !== "grass") { g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(0, 0, cv.width, cv.height); }
  const pats = {};
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
    const i = y * m.W + x; if (m.cells[i] !== 3) continue;
    const f = m.floor[i], ft = FLOOR_TEX[f];
    if (!(f in pats)) pats[f] = ft ? pat(ft[0], ft[1]) : null;
    g.fillStyle = pats[f] || (FLOORS[f] || FLOORS.m).a; g.fillRect(x * S, y * S, S + 0.5, S + 0.5);
  }
  if (m.def.id === "total") { g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = S * 0.1; g.setLineDash([S * 0.8, S * 0.6]); g.beginPath(); g.moveTo(1 * S, 30.5 * S); g.lineTo(46 * S, 30.5 * S); g.stroke(); g.setLineDash([]); }
  if (m.def.id === "moll") { g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = S * 0.08; for (const x of [2, 6, 10, 14, 18]) { g.beginPath(); g.moveTo(x * S + S * 0.5, 19.5 * S); g.lineTo(x * S + S * 0.5, 25 * S); g.stroke(); } }
  // weiche Verschattung an den Waenden
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
    if (m.cells[y * m.W + x] !== 3 || m.out[y * m.W + x]) continue;
    const w = (xx, yy) => { const c = m.cell(xx, yy); return c === WALL || c === GLASS; };
    const sh = (x0, y0, x1, y1, a) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "rgba(0,0,0," + a + ")"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; };
    if (w(x, y - 1)) { sh(0, y * S, 0, y * S + S * 0.9, 0.38); g.fillRect(x * S, y * S, S, S * 0.9); }
    if (w(x - 1, y)) { sh(x * S, 0, x * S + S * 0.5, 0, 0.22); g.fillRect(x * S, y * S, S * 0.5, S); }
    if (w(x + 1, y)) { sh(x * S + S, 0, x * S + S * 0.5, 0, 0.22); g.fillRect(x * S + S * 0.5, y * S, S * 0.5, S); }
  }
  for (const p of m.props) drawPropReal(g, p, S, A, m);
  if (m.def.canopy) { const c = m.def.canopy; g.fillStyle = "rgba(255,255,255,.06)"; rr(g, c.x * S, c.y * S, c.w * S, c.h * S, S * 0.3); g.fill(); g.strokeStyle = "rgba(226,0,26,.9)"; g.lineWidth = S * 0.18; g.stroke(); }
  // Waende: Oberseite mit Textur, Vorderseite als helle Wandflaeche
  const wallPat = pat("wall", 2);
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
    const c = m.cells[y * m.W + x];
    if (c === WALL) {
      g.fillStyle = wallPat || "#4b5260"; g.fillRect(x * S, y * S, S + 0.5, S + 0.5);
      g.fillStyle = "rgba(20,24,32,.55)"; g.fillRect(x * S, y * S, S + 0.5, S + 0.5);
      if (m.cell(x, y + 1) === 3) { const gr = g.createLinearGradient(0, y * S + S * 0.45, 0, y * S + S); gr.addColorStop(0, "#d9d3c7"); gr.addColorStop(1, "#a59d90"); g.fillStyle = gr; g.fillRect(x * S, y * S + S * 0.45, S + 0.5, S * 0.55); g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(x * S, y * S + S * 0.93, S + 0.5, S * 0.07); }
    } else if (c === GLASS) {
      // Glas: Ausrichtung nach den Nachbarn (Wand laeuft waagrecht oder senkrecht)
      const vert = [m.cell(x, y - 1), m.cell(x, y + 1)].some(v => v === WALL || v === GLASS) && ![m.cell(x - 1, y), m.cell(x + 1, y)].some(v => v === WALL || v === GLASS);
      const gr = g.createLinearGradient(x * S, y * S, x * S + S, y * S + S); gr.addColorStop(0, "rgba(170,215,240,.85)"); gr.addColorStop(1, "rgba(110,160,195,.85)"); g.fillStyle = gr;
      if (vert) {
        g.fillRect(x * S + S * 0.3, y * S, S * 0.4, S + 0.5); g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(x * S + S * 0.35, y * S + S * 0.1, S * 0.07, S * 0.45);
        g.fillStyle = "#30343c"; g.fillRect(x * S + S * 0.26, y * S, S * 0.05, S + 0.5); g.fillRect(x * S + S * 0.69, y * S, S * 0.05, S + 0.5);
      } else {
        g.fillRect(x * S, y * S + S * 0.3, S + 0.5, S * 0.4); g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(x * S + S * 0.1, y * S + S * 0.35, S * 0.45, S * 0.07);
        g.fillStyle = "#30343c"; g.fillRect(x * S, y * S + S * 0.26, S + 0.5, S * 0.05); g.fillRect(x * S, y * S + S * 0.69, S + 0.5, S * 0.05);
      }
    }
  }
  g.font = "900 " + (S * 0.45) + "px Nunito, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  for (const w of m.def.windows) if (w[4]) { g.fillStyle = "rgba(255,255,255,.95)"; g.fillText(w[4], (w[0] + (w[2] || 1) / 2) * S, (w[1] + 1.25) * S); }
  return cv;
}
// Foto in die Moebelflaeche einpassen: Seitenverhaeltnis bleibt grob erhalten, bis 30 % Strecken erlaubt
function drawImgFit(g, im, X, Y, W, H, rot) {
  const iw = rot ? im.height : im.width, ih = rot ? im.width : im.height, k = Math.min(W / iw, H / ih);
  const sx = Math.min(W / iw, k * 1.3) * 1.03, sy = Math.min(H / ih, k * 1.3) * 1.03;
  g.save(); g.translate(X + W / 2, Y + H / 2); if (rot) g.rotate(Math.PI / 2);
  const ax = rot ? sy : sx, ay = rot ? sx : sy;
  g.drawImage(im, -im.width * ax / 2, -im.height * ay / 2, im.width * ax, im.height * ay); g.restore();
}
function drawPropReal(g, p, S, A, m) {
  const X = p.x * S, Y = p.y * S, W = p.w * S, H = p.h * S;
  const name = texFor(p, m);
  const im = name && A.prop[name];
  if (!im) { drawProp(g, p, S, m); return; }
  const round = p.k === "plant" || p.k === "bin" || p.k === "safe";
  const rot = !round && ((H > W * 1.15) !== (im.height > im.width * 1.15));
  g.save(); g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = S * 0.25; g.shadowOffsetX = S * 0.06; g.shadowOffsetY = S * 0.12;
  drawImgFit(g, im, X, Y, W, H, rot);
  if (p.k === "lift" && !p.empty) { const c = A.prop[carFor(p.color)]; if (c) drawImgFit(g, c, X + S * 0.5, Y + S * 0.3, W - S, H - S * 0.6, H > W); }
  g.restore();
  if (p.label) { g.font = "900 " + (S * 0.3) + "px Nunito, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "bottom"; g.lineWidth = S * 0.09; g.strokeStyle = "rgba(0,0,0,.7)"; g.lineJoin = "round"; g.strokeText(p.label, X + W / 2, Y - S * 0.05); g.fillStyle = "#fff"; g.fillText(p.label, X + W / 2, Y - S * 0.05); }
}

function drawFloor(g, x, y, S, F, R) {
  const X = x * S, Y = y * S;
  g.fillStyle = F.a; g.fillRect(X, Y, S, S);
  if (F.pat === "tile") {
    const n = Math.max(1, Math.round(1 / F.s)), t = S * F.s;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { if ((x * n + i + y * n + j) % 2 === 0 && F.s <= 1) { g.fillStyle = F.b; g.fillRect(X + i * t, Y + j * t, t, t); } }
    if (F.s > 1) { if ((x + y) % 3 === 0) { g.fillStyle = F.b; g.fillRect(X, Y, S, S); } g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1; if (x % 2 === 0) { g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Y + S); g.stroke(); } if (y % 2 === 0) { g.beginPath(); g.moveTo(X, Y); g.lineTo(X + S, Y); g.stroke(); } }
    else { g.strokeStyle = "rgba(0,0,0,.08)"; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, S - 1, S - 1); }
  } else if (F.pat === "wood") {
    const pl = S / 4;
    for (let k = 0; k < 4; k++) { g.fillStyle = (k + x * 3 + y) % 3 ? F.a : F.b; g.fillRect(X, Y + k * pl, S, pl); g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(X, Y + k * pl, S, 1); if ((x + k * 2 + y) % 4 === 0) g.fillRect(X + S * 0.5, Y + k * pl, 1, pl); }
  } else if (F.pat === "carpet") {
    for (let k = 0; k < 6; k++) { g.fillStyle = R() < 0.5 ? F.b : shade(F.a, 0.06); g.fillRect(X + R() * S, Y + R() * S, 2, 2); }
  } else if (F.pat === "concrete" || F.pat === "slab") {
    for (let k = 0; k < 5; k++) { g.fillStyle = R() < 0.5 ? F.b : shade(F.a, 0.07); g.fillRect(X + R() * S, Y + R() * S, S * 0.12, S * 0.12); }
    if (F.pat === "slab") { g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = 1; if (x % 3 === 0) { g.beginPath(); g.moveTo(X, Y); g.lineTo(X, Y + S); g.stroke(); } if (y % 3 === 0) { g.beginPath(); g.moveTo(X, Y); g.lineTo(X + S, Y); g.stroke(); } }
  } else if (F.pat === "asphalt") {
    for (let k = 0; k < 7; k++) { g.fillStyle = R() < 0.5 ? F.b : shade(F.a, 0.1); g.fillRect(X + R() * S, Y + R() * S, S * 0.08, S * 0.08); }
  } else if (F.pat === "kids") {
    const cols = ["#e9b64a", "#d64a4a", "#3f8fd6", "#4caf50"]; g.fillStyle = cols[(x + y * 2) % 4]; g.fillRect(X, Y, S, S); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(X + S * 0.1, Y + S * 0.1, S * 0.8, S * 0.8);
  }
}

const PROP_COL = {
  grill: "#2b2d31", fryer: "#8d949b", prep: "#c3cad1", toaster: "#9aa1a8", steel: "#c3cad1", sink: "#d8dee3", fridge: "#e6ebef", bin3: "#555",
  shelf: "#8a6a45", boxes: "#b8935e", coldroom: "#dfe8ee", desk: "#7b5a3c", safe: "#4b5058", locker: "#7d8fa3", toilet: "#f4f6f8",
  counter: "#d43a2a", friesout: "#c3cad1", drinks: "#3a3f48", icemachine: "#e8edf1", kiosk: "#2b2d31", table: "#7d5634", booth: "#a8322a",
  plant: "#3f8a3a", playpit: "#f2c230", slide: "#3f8fd6", coffee: "#3a2a20", vitrine: "#dfe8ee", sofa: "#6b3f2a", table2: "#7d5634", register: "#3a3f48",
  bakery: "#c98a3e", pfand: "#2f7a4a", pallet: "#b8935e", car: "#999", brush: "#3f8fd6", panel: "#3a3f48", pump: "#e9ecef", pillar: "#d0d4d8",
  air: "#2d6cdf", vacuum: "#e2001a", pricesign: "#1d2433", bin: "#3a3f48", hedge: "#3f7a30", keybox: "#5a5e66", lift: "#f2c230", diag: "#2b2d31",
  oil: "#c98a3e", tirerack: "#3a3f48", flag: "#1f62b8", washbay: "#3f8fd6",
};
function drawProp(g, p, S, m) {
  const X = p.x * S, Y = p.y * S, W = p.w * S, H = p.h * S, col = p.color || PROP_COL[p.k] || "#888";
  // Schlagschatten
  g.save(); g.fillStyle = "rgba(0,0,0,.28)"; g.filter = "blur(" + Math.round(S * 0.12) + "px)"; rr(g, X + S * 0.1, Y + S * 0.16, W, H, S * 0.15); g.fill(); g.restore();
  const box = (c, r = 0.12) => { rr(g, X, Y, W, H, S * r); g.fillStyle = c; g.fill(); const gr = g.createLinearGradient(0, Y, 0, Y + H); gr.addColorStop(0, "rgba(255,255,255,.22)"); gr.addColorStop(1, "rgba(0,0,0,.18)"); g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = Math.max(1, S * 0.04); g.stroke(); };
  const icon = (t, sz = 0.6, dx = 0.5, dy = 0.5) => { g.font = `${S * sz}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, X + W * dx, Y + H * dy); };
  switch (p.k) {
    case "car": {
      const v = p.vert; rr(g, X, Y, W, H, S * 0.5); g.fillStyle = col; g.fill();
      const gr = v ? g.createLinearGradient(X, 0, X + W, 0) : g.createLinearGradient(0, Y, 0, Y + H); gr.addColorStop(0, "rgba(255,255,255,.35)"); gr.addColorStop(0.5, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(0,0,0,.25)"); g.fillStyle = gr; g.fill();
      g.fillStyle = "rgba(20,30,45,.75)";
      if (v) { rr(g, X + W * 0.14, Y + H * 0.22, W * 0.72, H * 0.2, S * 0.15); g.fill(); rr(g, X + W * 0.14, Y + H * 0.68, W * 0.72, H * 0.14, S * 0.12); g.fill(); }
      else { rr(g, X + W * 0.24, Y + H * 0.14, W * 0.2, H * 0.72, S * 0.15); g.fill(); rr(g, X + W * 0.66, Y + H * 0.14, W * 0.14, H * 0.72, S * 0.12); g.fill(); }
      g.strokeStyle = "rgba(0,0,0,.4)"; g.lineWidth = S * 0.05; rr(g, X, Y, W, H, S * 0.5); g.stroke();
      break;
    }
    case "lift": { g.fillStyle = "#f2c230"; g.fillRect(X, Y, S * 0.5, H); g.fillRect(X + W - S * 0.5, Y, S * 0.5, H); g.fillStyle = "#2b2d31"; for (let k = 0; k < H / S; k += 0.5) { g.fillRect(X, Y + k * S, S * 0.5, S * 0.12); g.fillRect(X + W - S * 0.5, Y + k * S + S * 0.25, S * 0.5, S * 0.12); }
      if (!p.empty) drawProp(g, { k: "car", x: p.x + 0.55, y: p.y + 0.4, w: p.w - 1.1, h: p.h - 0.8, color: p.color, vert: true }, S, m); break; }
    case "table": case "table2": { box(col, 0.2); g.fillStyle = "#b52c22"; const seats = p.k === "table" ? [[0.25, -0.35], [0.75, -0.35], [0.25, 1.05], [0.75, 1.05]] : [[-0.4, 0.5], [1.15, 0.5]]; for (const [sx, sy] of seats) { rr(g, X + W * sx - S * 0.25, Y + H * sy - (p.k === "table" ? 0 : S * 0.25), S * 0.5, S * 0.32, S * 0.1); g.fill(); } break; }
    case "plant": { g.fillStyle = "#8a5a3a"; g.beginPath(); g.arc(X + W / 2, Y + H / 2, W * 0.42, 0, 7); g.fill(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; g.fillStyle = k % 2 ? "#3f8a3a" : "#4fa046"; g.beginPath(); g.ellipse(X + W / 2 + Math.cos(a) * W * 0.25, Y + H / 2 + Math.sin(a) * H * 0.25, W * 0.28, H * 0.16, a, 0, 7); g.fill(); } break; }
    case "pump": { box("#e9ecef", 0.25); g.fillStyle = "#e2001a"; g.fillRect(X + W * 0.1, Y + H * 0.15, W * 0.8, H * 0.22); g.fillStyle = "#222"; g.fillRect(X + W * 0.35, Y + H * 0.45, W * 0.3, H * 0.35); g.fillStyle = "#fff"; g.font = `900 ${S * 0.4}px Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(p.n), X + W * 0.5, Y + H * 0.62); break; }
    case "playpit": { box("#3f8fd6", 0.3); const cs = ["#e8412f", "#f2c230", "#4caf50", "#ff7ad9", "#ffffff"]; const RR = rnd(7); for (let k = 0; k < 40; k++) { g.fillStyle = cs[k % 5]; g.beginPath(); g.arc(X + S * 0.3 + RR() * (W - S * 0.6), Y + S * 0.3 + RR() * (H - S * 0.6), S * 0.13, 0, 7); g.fill(); } break; }
    case "washbay": { box("#2b3a4a", 0.2); drawProp(g, { k: "car", x: p.x + 1, y: p.y + 1, w: p.w - 2, h: p.h - 2, color: "#e9ebee" }, S, m); g.fillStyle = "rgba(160,210,255,.35)"; g.fillRect(X, Y, W, H); break; }
    case "tirerack": { box("#3a3f48", 0.1); for (let k = 0; k < W / S - 0.4; k += 0.8) { g.fillStyle = "#1a1c20"; g.beginPath(); g.arc(X + S * 0.45 + k * S, Y + H / 2, S * 0.36, 0, 7); g.fill(); g.fillStyle = "#777"; g.beginPath(); g.arc(X + S * 0.45 + k * S, Y + H / 2, S * 0.14, 0, 7); g.fill(); } break; }
    case "shelf": { box(col, 0.06); const cs = ["#e8412f", "#2d6cdf", "#f2c230", "#4caf50", "#ff7ad9", "#ffffff"]; const RR = rnd(Math.round(p.x * 13 + p.y * 7)); const horiz = W >= H; const n = Math.floor((horiz ? W : H) / (S * 0.32)); for (let k = 0; k < n; k++) { g.fillStyle = cs[(RR() * 6) | 0]; if (horiz) g.fillRect(X + S * 0.08 + k * S * 0.32, Y + H * 0.2, S * 0.24, H * 0.6); else g.fillRect(X + W * 0.2, Y + S * 0.08 + k * S * 0.32, W * 0.6, S * 0.24); } break; }
    case "counter": { box(col, 0.1); g.fillStyle = "#f2efe8"; g.fillRect(X, Y, W, H * 0.35); break; }
    case "flag": { g.fillStyle = "#ccc"; g.beginPath(); g.arc(X + W / 2, Y + H / 2, W * 0.3, 0, 7); g.fill(); g.fillStyle = col; g.fillRect(X + W / 2, Y - S * 0.6, S * 1.1, S * 0.5); break; }
    case "slide": { g.fillStyle = "#3f8fd6"; rr(g, X, Y, W, H, S * 0.3); g.fill(); g.fillStyle = "#f2c230"; g.fillRect(X + W * 0.35, Y, W * 0.3, H); break; }
    case "hedge": { g.fillStyle = col; rr(g, X, Y, W, H, S * 0.4); g.fill(); g.fillStyle = "rgba(255,255,255,.12)"; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(X + W * 0.5, Y + (k + 0.5) * H / 6, W * 0.35, 0, 7); g.fill(); } break; }
    case "pillar": { g.fillStyle = "#e2001a"; g.beginPath(); g.arc(X + W / 2, Y + H / 2, W / 2, 0, 7); g.fill(); break; }
    default: box(col);
  }
  const icons = { grill: "🔥", fryer: "🍟", prep: "🍔", toaster: "🍞", sink: "🚰", fridge: "🧊", coldroom: "❄️", safe: "🔒", toilet: "🚽", drinks: "🥤", icemachine: "🍦", kiosk: "🖥️", coffee: "☕", vitrine: "🍰", register: "💶", bakery: "🥐", pfand: "🍾", panel: "🧼", air: "🛞", vacuum: "🧹", pricesign: "⛽", bin: "🗑️", bin3: "♻️", keybox: "🔑", diag: "💻", oil: "🛢️", desk: "📄", boxes: "📦", pallet: "📦", friesout: "🍟", locker: "👕", brush: "🫧" };
  if (icons[p.k]) icon(icons[p.k], Math.min(0.75, Math.min(p.w, p.h) * 0.62));
  if (p.label) { g.font = `900 ${S * 0.34}px Nunito, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "bottom"; g.lineWidth = S * 0.1; g.strokeStyle = "rgba(0,0,0,.65)"; g.lineJoin = "round"; g.strokeText(p.label, X + W / 2, Y - S * 0.06); g.fillStyle = "#fff"; g.fillText(p.label, X + W / 2, Y - S * 0.06); }
}

// Raumnamen (fuer Karte/Minikarte)
export function roomLabels(m) {
  return m.def.rooms.filter(r => !r.nolabel).map(r => ({ n: r.n, x: r.x + r.w / 2, y: r.y + r.h / 2 }));
}
