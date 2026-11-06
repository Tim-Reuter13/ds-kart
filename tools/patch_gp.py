import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            raise SystemExit("NICHT GEFUNDEN in %s: %s" % (p, a[:90]))
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


edit("js/main.js", [
    # GP-Karte
    ("""  $("#trackCards").innerHTML = TRACKS.map((t, i) => `<div class="card ${state.track === i ? "sel" : ""} ${f.row === 0 && f.col === i ? "focus" : ""}" data-t="${i}">
    <div class="stripe" style="background:${t.color}"></div><div class="t">${t.name}</div><div class="s">${t.sub}</div></div>`).join("");""",
     """  $("#trackCards").innerHTML = TRACKS.map((t, i) => `<div class="card ${state.track === i ? "sel" : ""} ${f.row === 0 && f.col === i ? "focus" : ""}" data-t="${i}">
    <div class="stripe" style="background:${t.color}"></div><div class="t">${t.name}</div><div class="s">${t.sub}</div></div>`).join("")
    + `<div class="card ${state.track === TRACKS.length ? "sel" : ""} ${f.row === 0 && f.col === TRACKS.length ? "focus" : ""}" data-t="${TRACKS.length}">
    <div class="stripe" style="background:linear-gradient(90deg,#ffd23a,#e8412f,#39d4ff)"></div><div class="t">🏆 Grand Prix</div><div class="s">Alle ${TRACKS.length} Strecken hintereinander · Punkte · Siegerehrung</div></div>`;"""),
    ("      const rowLen = [TRACKS.length, 3, 3, 4, 1];", "      const rowLen = [TRACKS.length + 1, 3, 3, 4, 1];"),
    # Start: GP oder Einzelrennen
    ("""  show("load");
  const def = TRACKS[state.track];""", """  show("load");
  let ti = state.track;
  if (state.track === TRACKS.length) {
    if (!state.gp || state.gp.over) state.gp = { i: 0, pts: {}, over: false };
    ti = state.gp.i;
  } else state.gp = null;
  const def = TRACKS[ti];
  $("#loading").textContent = state.gp ? `Grand Prix · Rennen ${state.gp.i + 1}/${TRACKS.length}: ${def.name}` : "Lade Strecke…";"""),
    # Ergebnisse mit GP
    ("""function showResults(res) {
  state.lastResults = res;
  const fmt = (t) => t == null ? "–" : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
  const best = res.find(r => r.human);
  $("#resTitle").textContent = best ? (best.place === 1 ? `🏆 ${best.name} gewinnt!` : `${best.name}: ${best.place}. Platz`) : "Ergebnis";
  $("#resTable").innerHTML = res.map(r => `<tr class="${r.human ? "me" : ""}"><td class="pl">${r.place}.</td><td><span class="dot" style="background:${r.color}"></span>${r.name}</td><td class="small">${r.car}</td><td>${fmt(r.time)}</td><td class="small">🍾 ${(r.pfand * 0.25).toFixed(2).replace(".", ",")} €</td></tr>`).join("");
  state.focus = { row: 0, col: 0 };
  show("results"); renderResults();
}
const RES_BTNS = [""", """const GP_PTS = [15, 12, 10, 8, 6, 4, 2, 1];
const portraitOf = (id) => DRIVERS.find(d => d.id === id)?.portrait;
const avatar = (id, color, size = 34) => portraitOf(id) ? `<img src="${portraitOf(id)}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;border:2px solid ${color}">` : `<span class="dot" style="background:${color};width:${size * 0.5}px;height:${size * 0.5}px"></span>`;
function showResults(res) {
  state.lastResults = res;
  const fmt = (t) => t == null ? "–" : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
  const best = res.find(r => r.human);
  if (state.gp) {
    const gp = state.gp;
    for (const r of res) gp.pts[r.driver] = (gp.pts[r.driver] || 0) + (GP_PTS[r.place - 1] || 0);
    const last = gp.i >= TRACKS.length - 1;
    const stand = Object.entries(gp.pts).sort((a, b) => b[1] - a[1]);
    $("#resTitle").textContent = `Grand Prix · Rennen ${gp.i + 1}/${TRACKS.length} · ${TRACKS[gp.i].name}`;
    $("#resTable").innerHTML = res.map(r => `<tr class="${r.human ? "me" : ""}"><td class="pl">${r.place}.</td><td>${avatar(r.driver, r.color)}${r.name}</td><td>${fmt(r.time)}</td><td style="color:#6aff7a">+${GP_PTS[r.place - 1] || 0}</td><td style="font-family:'Lilita One';font-size:24px">${gp.pts[r.driver]} P</td><td class="small">${stand.findIndex(s => s[0] === r.driver) + 1}. gesamt</td></tr>`).join("");
    RES_BTNS = last ? [["Siegerehrung 🏆", () => podium()]] : [["Nächstes Rennen ▶", () => { gp.i++; startRace(); }], ["Grand Prix abbrechen", () => { state.gp = null; show("setup"); renderSetup(); }]];
  } else {
    $("#resTitle").textContent = best ? (best.place === 1 ? `🏆 ${best.name} gewinnt!` : `${best.name}: ${best.place}. Platz`) : "Ergebnis";
    $("#resTable").innerHTML = res.map(r => `<tr class="${r.human ? "me" : ""}"><td class="pl">${r.place}.</td><td>${avatar(r.driver, r.color)}${r.name}</td><td class="small">${r.car}</td><td>${fmt(r.time)}</td><td class="small">🍾 ${(r.pfand * 0.25).toFixed(2).replace(".", ",")} €</td></tr>`).join("");
    RES_BTNS = SINGLE_BTNS;
  }
  state.focus = { row: 0, col: 0 };
  show("results"); renderResults();
}
function podium() {
  const gp = state.gp; gp.over = true;
  const stand = Object.entries(gp.pts).sort((a, b) => b[1] - a[1]);
  const D = (id) => DRIVERS.find(d => d.id === id);
  const top = [stand[1], stand[0], stand[2]].filter(Boolean);
  const h = { 0: 120, 1: 170, 2: 90 };
  $("#resTitle").textContent = `🏆 ${D(stand[0][0]).name} gewinnt den Grand Prix!`;
  $("#resTable").innerHTML = `<tr><td colspan="6"><div style="display:flex;align-items:flex-end;justify-content:center;gap:18px;padding:10px 0 4px">${top.map(([id, p]) => {
    const d = D(id), place = stand.findIndex(s => s[0] === id) + 1, idx = place === 1 ? 1 : place === 2 ? 0 : 2;
    return `<div style="text-align:center;width:150px">${avatar(id, d.hud, place === 1 ? 110 : 84)}<div style="font-family:'Lilita One';font-size:22px;margin-top:6px">${d.name}</div><div class="small">${p} Punkte</div>
      <div style="height:${h[idx]}px;margin-top:8px;border-radius:14px 14px 0 0;background:${place === 1 ? "linear-gradient(#ffe680,#d4a017)" : place === 2 ? "linear-gradient(#f2f5f8,#9aa6b2)" : "linear-gradient(#f0b27a,#a0602a)"};display:flex;align-items:flex-start;justify-content:center;font-family:'Lilita One';font-size:46px;color:#3a1a05;padding-top:8px">${place}</div></div>`;
  }).join("")}</div></td></tr>` + stand.slice(3).map(([id, p], i) => `<tr><td class="pl">${i + 4}.</td><td>${avatar(id, D(id).hud)}${D(id).name}</td><td colspan="4">${p} Punkte</td></tr>`).join("");
  audio.sfx("finish");
  RES_BTNS = [["Neuer Grand Prix", () => { state.gp = null; state.track = TRACKS.length; startRace(); }], ["Zum Menü", () => { state.gp = null; show("setup"); renderSetup(); }]];
  state.focus = { row: 0, col: 0 };
  renderResults();
}
const SINGLE_BTNS = ["""),
    ("""function renderResults() {""", """let RES_BTNS = SINGLE_BTNS;
function renderResults() {"""),
    # Wiederholung ueberspringen
    ("""    } else if (state.screen === "race") {""", """    } else if (state.screen === "race" && state.race && state.race.replay) {
      if (e.ok || e.start || e.cancel || e.item) { state.race.skipReplay(); return; }
    } else if (state.screen === "race") {"""),
    ("""$("#s-title").addEventListener("click",""", """$("#gl").addEventListener("click", () => { if (state.race && state.race.replay) state.race.skipReplay(); });
addEventListener("keydown", (e) => { if ((e.code === "Space" || e.code === "Enter") && state.race && state.race.replay) state.race.skipReplay(); });
$("#s-title").addEventListener("click","""),
])
print("ok")
