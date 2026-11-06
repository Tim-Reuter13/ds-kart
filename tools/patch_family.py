import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            raise SystemExit("NICHT GEFUNDEN in %s: %s" % (p, a[:90]))
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


edit("js/items.js", [
    ('import { T } from "./tex.js";', 'import { T } from "./tex.js";\nimport { FAMILY, FAMILY_ITEMS } from "./family.js";'),
    ('export const ROULETTE = Object.keys(ITEMS).filter(k => k !== "pack");',
     'if (FAMILY) for (const k in FAMILY_ITEMS) Object.assign(ITEMS[k], FAMILY_ITEMS[k]);\nexport const ROULETTE = Object.keys(ITEMS).filter(k => k !== "pack");'),
    ('lam("#fff", { map: T.sign("KIPPEN", "#ffffff", "#c8102e", { font: "bold 54px Arial" }) }), lam("#fff", { map: T.sign("RAUCHEN KANN TÖDLICH SEIN", "#ffffff", "#111", { font: "bold 40px Arial" }) })]);',
     'lam("#fff", { map: FAMILY ? T.sign("BONBON", "#ff7ad9", "#ffffff", { font: "bold 54px Arial" }) : T.sign("KIPPEN", "#ffffff", "#c8102e", { font: "bold 54px Arial" }) }), lam("#fff", { map: FAMILY ? T.sign("LECKER!", "#ff7ad9", "#ffffff", { font: "bold 54px Arial" }) : T.sign("RAUCHEN KANN TÖDLICH SEIN", "#ffffff", "#111", { font: "bold 40px Arial" }) })]);'),
    ('new THREE.MeshBasicMaterial({ map: T.sign("BIER", "#d4a017", "#5a2a0a", { font: "bold 70px Arial" }) })',
     'new THREE.MeshBasicMaterial({ map: FAMILY ? T.sign("SAFT", "#3aa84a", "#ffffff", { font: "bold 70px Arial" }) : T.sign("BIER", "#d4a017", "#5a2a0a", { font: "bold 70px Arial" }) })'),
    ('        const m = makeBottle("#1f4d2a", "#e88a1a");',
     '        const m = FAMILY ? new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshPhongMaterial({ color: "#3a9ff0", shininess: 120, transparent: true, opacity: 0.85 })) : makeBottle("#1f4d2a", "#e88a1a");'),
    ('{ size: 0.9, grow: 3, life: 1.4, alpha: 0.6, vy: 1.2, color: "#dddddd" });',
     'FAMILY ? { size: 0.5, grow: 1.5, life: 0.9, alpha: 0.9, vy: 1.4, color: "#ff9ad9" } : { size: 0.9, grow: 3, life: 1.4, alpha: 0.6, vy: 1.2, color: "#dddddd" });'),
    ('color: "#e8f0ff", drag: 0.5 });', 'color: FAMILY ? "#bfe8ff" : "#e8f0ff", drag: 0.5 });'),
])
edit("js/game.js", [
    ('import { Recorder, Replay } from "./replay.js";', 'import { Recorder, Replay } from "./replay.js";\nimport { FAMILY, clean } from "./family.js";'),
    ('''  blind: ["💨 Vape-Wolke!", "💨 Mango-Ice im Gesicht!", "💨 Sicht weg!"],''',
     '''  blind: FAMILY ? ["🫧 Seifenblasen!", "🫧 Alles voller Blasen!", "🫧 Sicht weg!"] : ["💨 Vape-Wolke!", "💨 Mango-Ice im Gesicht!", "💨 Sicht weg!"],'''),
    ('''  hit: ["Autsch!", "Voll reingefahren!", "Kippenschachtel gefressen!", "Läuft bei dir…", "Bruder, nein!"],''',
     '''  hit: FAMILY ? ["Autsch!", "Voll reingefahren!", "Uiii!", "Hoppla!", "Nicht schon wieder!"] : ["Autsch!", "Voll reingefahren!", "Kippenschachtel gefressen!", "Läuft bei dir…", "Bruder, nein!"],'''),
    ('''else if (e.t === "vape") r.sprite.play("vape");''', '''else if (e.t === "vape") r.sprite.play(FAMILY ? "werfen" : "vape");'''),
])
edit("js/sprites.js", [
    ('import * as THREE from "three";', 'import * as THREE from "three";\nimport { FAMILY } from "./family.js";'),
    ('    if (r.smokeT > 0 && this.state === "fahren") this.play("vape", r.smokeT);', '    if (r.smokeT > 0 && this.state === "fahren" && !FAMILY) this.play("vape", r.smokeT);'),
    ('  play(state, hold = 0) {\n    if (!this.maps[state]) return;', '  play(state, hold = 0) {\n    if (FAMILY && state === "vape") state = "werfen";\n    if (!this.maps[state]) return;'),
])
edit("js/hud.js", [
    ('import { ITEMS, ROULETTE } from "./items.js";', 'import { ITEMS, ROULETTE } from "./items.js";\nimport { FAMILY } from "./family.js";'),
    ('      txt(g, "💨", x + w * 0.5, y + h * 0.18, 40 * u, "#fff", "center", EMOJI);', '      txt(g, FAMILY ? "🫧" : "💨", x + w * 0.5, y + h * 0.18, 40 * u, "#fff", "center", EMOJI);'),
    ('    if (r.smokeT > 0) txt(g, "🚬 rauchen…",', '    if (r.smokeT > 0) txt(g, FAMILY ? "🍭 schlecken…" : "🚬 rauchen…",'),
])
edit("js/sounds.js", [
    ('import { DRIVERS } from "./cars.js";', 'import { DRIVERS } from "./cars.js";\nimport { clean } from "./family.js";'),
    ('  return out;\n}', '  for (const o of out) { o.name = clean(o.name); o.desc = clean(o.desc); }\n  return out;\n}'),
])
# Einstellungen-Bildschirm
edit("index.html", [
    ('<button class="btn" id="toAudio">🎙 Audio-Profil</button>', '<button class="btn" id="toAudio">🎙 Audio-Profil</button><button class="btn" id="toSettings">⚙ Einstellungen</button>'),
    ('<div class="screen" id="s-load">', '''<div class="screen" id="s-settings">
  <h2>Einstellungen</h2>
  <div class="panel" style="min-width:min(560px,92vw)">
    <div class="label">Grafik</div><div class="row" id="sQ"></div>
    <div class="label">Musik</div><div class="row"><input type="range" id="sMus" min="0" max="100" style="width:280px"></div>
    <div class="label">Effekte &amp; Stimmen</div><div class="row"><input type="range" id="sSfx" min="0" max="100" style="width:280px"></div>
    <div class="label">Sonstiges</div><div class="row"><button class="btn" id="sTest">Test</button></div>
  </div>
  <div style="margin-top:16px"><button class="btn" id="sBack">◀ Zurück</button></div>
</div>

<div class="screen" id="s-load">'''),
])
edit("js/main.js", [
    ('import { loadSpriteSet, SPRITE_DRIVERS } from "./sprites.js";', 'import { loadSpriteSet, SPRITE_DRIVERS } from "./sprites.js";\nimport { FAMILY, setFamily } from "./family.js";'),
    ('''  const img = document.querySelector("#logoImg");''', '''  const img = document.querySelector("#logoImg");
  if (FAMILY) img.removeAttribute("src");'''),
    ('''$("#toAudio").onclick = () => audioUI.open("lobby");''', '''$("#toAudio").onclick = () => audioUI.open("lobby");
// ---------------- Einstellungen
const vol = (() => { try { return JSON.parse(localStorage.getItem("dskart_vol")) || { mus: 70, sfx: 80 }; } catch (e) { return { mus: 70, sfx: 80 }; } })();
function applyVol() { audio.ensure(); if (audio.musicBus) { audio.musicBus.gain.value = 0.32 * vol.mus / 100; audio.sfxBus.gain.value = 0.75 * vol.sfx / 100; } }
function renderSettings() {
  $("#sQ").innerHTML = Object.keys(QUALITY).map(k => `<button class="btn ${pipeline.level === k ? "sel" : ""}" data-q="${k}">${QUALITY[k].name}</button>`).join("");
  $("#sMus").value = vol.mus; $("#sSfx").value = vol.sfx;
  $("#sTest").textContent = FAMILY ? "Test ✓" : "Test";
}
$("#toSettings").onclick = () => { renderSettings(); show("settings"); };
$("#sBack").onclick = () => { show("lobby"); renderLobby(); };
$("#sQ").addEventListener("click", e => { const c = e.target.closest("[data-q]"); if (c) { pipeline.setLevel(c.dataset.q); renderSettings(); } });
for (const [id, k] of [["#sMus", "mus"], ["#sSfx", "sfx"]]) $(id).addEventListener("input", e => { vol[k] = +e.target.value; try { localStorage.setItem("dskart_vol", JSON.stringify(vol)); } catch (x) {} applyVol(); audio.sfx(k === "sfx" ? "pfand" : "select"); });
$("#sTest").onclick = () => setFamily(!FAMILY);
addEventListener("pointerdown", () => applyVol(), { once: true });'''),
    ('''    } else if (state.screen === "audio") {''', '''    } else if (state.screen === "settings") {
      if (e.cancel) { $("#sBack").click(); return; }
    } else if (state.screen === "audio") {'''),
])
print("ok")
