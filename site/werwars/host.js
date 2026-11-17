// "Wer war's?" – PC/Fernseher = Spielleitung. Handys = persoenlicher Bildschirm + Steuerung.
import { Net } from "../js/net.js";
import { MAPS, buildMap, lineOfSight, renderMap, roomLabels, nearestFree, loadMapAssets } from "./maps.js";
import { AVATARS, loadAvatars, bustCanvas, avatarOf, drawChar } from "./chars.js";

const $ = (s) => document.querySelector(s);
const net = new Net({ key: "werwars_code" });
const RANGE = { kill: 1.7, report: 2.6, use: 1.9, bell: 2.2, hatch: 1.6 };

// ---------------- Einstellungen (werden gemerkt)
const SET_DEF = { map: 0, moles: 0, tasks: 5, cd: 30, talk: 45, vote: 30, vision: 1, confirm: true };
let SET = { ...SET_DEF };
try { Object.assign(SET, JSON.parse(localStorage.getItem("werwars_set")) || {}); } catch (e) {}
const saveSet = () => { try { localStorage.setItem("werwars_set", JSON.stringify(SET)); } catch (e) {} };
const TEST = new URLSearchParams(location.search).has("test"); // erlaubt Start mit 2 Spielern

// ---------------- Zustand
const G = {
  phase: "lobby", // lobby | intro | play | meet | over
  players: new Map(), // id -> Spieler
  map: null, mapImg: null, bodies: [], sab: null, sabCd: 0, meet: null, over: null, t: 0, bellCd: 0, introT: 0,
};
function player(id) {
  let p = G.players.get(id);
  if (!p) {
    const used = new Set([...G.players.values()].map(q => q.av));
    const av = (AVATARS.find(a => !used.has(a.id)) || AVATARS[0]).id;
    p = { id, name: "Handy", av, role: "team", alive: true, x: 0, y: 0, f: 1, mv: 0, tasks: [], done: new Set(), bellLeft: 1, killCd: 0, vote: null, spect: false };
    G.players.set(id, p);
  }
  return p;
}
const players = () => [...G.players.values()].filter(p => !p.spect);
const online = (p) => !!net.phone(p.id)?.online;
const send = (p, m) => net.send(p.id, m);
const sendAll = (m) => { for (const p of G.players.values()) send(p, m); };
const pubPlayers = () => players().map(p => ({ id: p.id, name: p.name, av: p.av }));

// ---------------- Netz
net.on("ready", (code) => {
  $("#code").textContent = code;
  const url = net.joinUrl("handy.html");
  $("#joinurl").textContent = url.replace(/^https?:\/\//, "");
  try { const q = qrcode(0, "M"); q.addData(url); q.make(); $("#qr").innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) {}
});
net.on("join", (id) => {
  const p = player(id);
  p.name = net.phone(id).name || p.name;
  if (G.phase !== "lobby" && !p.role) p.spect = true;
  if (G.phase === "lobby") p.spect = false;
  resync(p);
  renderLobby();
});
net.on("leave", () => renderLobby());
net.on("msg", (id, m) => { const p = G.players.get(id); if (p) onMsg(p, m); });
net.start();
setInterval(() => { $("#netst").textContent = "Handy-Verbindung: " + net.status + (net.code ? " · Code " + net.code : ""); }, 600);

// Wer neu (oder wieder) verbunden ist, bekommt den aktuellen Stand
function resync(p) {
  if (G.phase === "lobby") { lobbyBroadcast(); return; }
  if (p.spect) { send(p, { t: "spect", text: "Es läuft gerade eine Runde – du bist in der nächsten dabei." }); return; }
  send(p, startMsg(p));
  if (G.phase === "meet") send(p, meetMsg());
  if (G.phase === "over") send(p, G.over);
}

function onMsg(p, m) {
  switch (m.t) {
    case "av": if (G.phase === "lobby" && AVATARS.some(a => a.id === m.av) && !players().some(q => q !== p && q.av === m.av)) { p.av = m.av; lobbyBroadcast(); renderLobby(); } break;
    case "start": if (G.phase === "lobby") startGame(); else if (G.phase === "over") toLobby(); break;
    case "pos":
      if (G.phase !== "play" && G.phase !== "intro") break;
      if (typeof m.x === "number" && typeof m.y === "number" && m.x > 0 && m.y > 0 && m.x < G.map.W && m.y < G.map.H) { p.x = m.x; p.y = m.y; p.f = m.f > 0 ? 1 : -1; p.mv = m.mv ? 1 : 0; p.busy = !!m.busy; }
      break;
    case "done": {
      if (G.phase !== "play" || p.role !== "team" || !p.tasks.includes(m.id) || p.done.has(m.id)) break;
      const t = G.map.tasks.find(t => t.id === m.id);
      if (t && Math.hypot(p.x - t.x, p.y - t.y) < RANGE.use + 1.2) { p.done.add(m.id); checkWin(); }
      break;
    }
    case "kill": {
      if (G.phase !== "play" || p.role !== "mole" || !p.alive || p.killCd > 0) break;
      const v = G.players.get(m.who);
      if (!v || !v.alive || v.role === "mole" || v.spect || Math.hypot(p.x - v.x, p.y - v.y) > RANGE.kill + 0.4) break;
      v.alive = false; v.killedBy = p.av;
      G.bodies.push({ id: v.id, av: v.av, x: v.x, y: v.y });
      p.killCd = SET.cd;
      send(v, { t: "dead", by: p.av });
      send(p, { t: "rumble", ms: 80 });
      checkWin();
      break;
    }
    case "report": {
      if (G.phase !== "play" || !p.alive) break;
      const b = G.bodies.find(b => b.id === m.who);
      if (b && Math.hypot(p.x - b.x, p.y - b.y) < RANGE.report + 0.5) startMeeting("report", p, b);
      break;
    }
    case "bell": {
      const bell = G.map.def.bell;
      if (G.phase !== "play" || !p.alive || p.bellLeft <= 0 || G.bellCd > 0 || (G.sab && G.sab.k === "crit")) { if (G.bellCd > 0) send(p, { t: "toast", text: `Glocke geht erst in ${Math.ceil(G.bellCd)} s` }); break; }
      if (Math.hypot(p.x - bell.x, p.y - bell.y) > RANGE.bell + 0.5) break;
      p.bellLeft--; startMeeting("bell", p, null);
      break;
    }
    case "sab": {
      if (G.phase !== "play" || p.role !== "mole" || !p.alive || G.sab || G.sabCd > 0) break;
      if (m.k === "lights") { G.sab = { k: "lights" }; }
      else if (m.k === "crit") { G.sab = { k: "crit", t: 45, a: new Set(), b: new Set() }; }
      break;
    }
    case "fixLights": {
      const f = G.map.def.fuse;
      if (G.sab?.k === "lights" && (p.alive || p.role === "team") && Math.hypot(p.x - f.x, p.y - f.y) < RANGE.use + 1.2) { G.sab = null; G.sabCd = 30; }
      break;
    }
    case "hold": {
      if (G.sab?.k !== "crit" || !p.alive) break;
      const spot = G.map.def.crit[m.s]; if (!spot) break;
      const set = G.sab[m.s];
      if (m.on && Math.hypot(p.x - spot.x, p.y - spot.y) < RANGE.use + 1.2) set.add(p.id); else set.delete(p.id);
      if (G.sab.a.size && G.sab.b.size) { G.sab = null; G.sabCd = 30; }
      break;
    }
    case "hatch": {
      if (G.phase !== "play" || p.role !== "mole" || !p.alive) break;
      const H = G.map.def.hatches, h = H[m.i];
      if (!h || Math.hypot(p.x - h.x, p.y - h.y) > RANGE.hatch + 0.6) break;
      const grp = H.map((x, i) => [x, i]).filter(([x]) => x.g === h.g);
      const k = grp.findIndex(([, i]) => i === m.i), [to, ti] = grp[(k + 1) % grp.length];
      p.x = to.x; p.y = to.y; send(p, { t: "tp", x: to.x, y: to.y, hatch: ti });
      break;
    }
    case "vote": {
      const M = G.meet;
      if (G.phase !== "meet" || !M || M.stage !== "vote" || !p.alive || M.votes.has(p.id)) break;
      if (m.who !== "skip" && !players().some(q => q.id === m.who && q.alive)) break;
      M.votes.set(p.id, m.who); sfx("vote");
      sendAll(meetMsg()); renderMeet();
      if (players().filter(q => q.alive && online(q)).every(q => M.votes.has(q.id))) M.end = Math.min(M.end, G.t + 1.2);
      break;
    }
  }
}

// ---------------- Spielablauf
function startGame() {
  const ps = players();
  if (ps.length < (TEST ? 2 : 4)) { flash(`Mindestens ${TEST ? 2 : 4} Spieler nötig`); return; }
  const def = MAPS[SET.map] || MAPS[0];
  G.map = buildMap(def); G.mapImg = renderMap(G.map, 24);
  G.bodies = []; G.sab = null; G.sabCd = 15; G.meet = null; G.over = null; G.bellCd = 15; G.t = 0;
  const nm = SET.moles || (ps.length >= 9 ? 3 : ps.length >= 7 ? 2 : 1);
  const order = ps.slice().sort(() => Math.random() - 0.5);
  ps.forEach(p => { p.role = "team"; p.alive = true; p.done = new Set(); p.bellLeft = 1; p.killCd = 12; p.vote = null; p.killedBy = null; });
  order.slice(0, Math.min(nm, Math.max(1, ps.length - 1))).forEach(p => p.role = "mole");
  const ids = def.tasks.map(t => t.id);
  for (const p of ps) {
    p.tasks = ids.slice().sort(() => Math.random() - 0.5).slice(0, SET.tasks);
    const [x, y] = spawnPos(p, ps);
    p.x = x; p.y = y; p.f = 1;
  }
  G.phase = "intro"; G.introT = 4.2;
  for (const p of ps) send(p, startMsg(p));
  sfx("start");
  show("game");
}
function spawnPos(p, ps) {
  const s = G.map.def.spawn, i = ps.indexOf(p), a = i / ps.length * Math.PI * 2;
  return nearestFree(G.map, s.x + Math.cos(a) * 1.6, s.y + Math.sin(a) * 1.1);
}
function startMsg(p) {
  const mates = p.role === "mole" ? players().filter(q => q.role === "mole" && q !== p).map(q => q.id) : [];
  return { t: "start", map: G.map.id, role: p.role, mates, tasks: p.tasks, done: [...p.done], players: pubPlayers(), me: p.id, x: p.x, y: p.y, alive: p.alive, set: { cd: SET.cd, vision: SET.vision }, intro: G.phase === "intro" ? G.introT : 0 };
}
function startMeeting(kind, by, body) {
  G.phase = "meet";
  G.meet = { kind, by: by.id, body: body ? body.id : null, bodyAv: body ? body.av : null, stage: "talk", end: G.t + SET.talk, votes: new Map(), result: null };
  G.bodies = [];
  if (G.sab?.k === "lights") G.sab = null; // Licht geht beim Meeting wieder an
  const alive = players().filter(p => p.alive);
  const bell = G.map.def.bell;
  alive.forEach((p, i) => { const a = i / alive.length * Math.PI * 2; const [x, y] = nearestFree(G.map, bell.x + Math.cos(a) * 1.8, bell.y + Math.sin(a) * 1.3); p.x = x; p.y = y; send(p, { t: "tp", x, y }); });
  sfx(kind === "report" ? "report" : "bell");
  sendAll(meetMsg()); renderMeet(); show("meet");
}
function meetMsg() {
  const M = G.meet;
  return { t: "meet", kind: M.kind, by: M.by, body: M.body, stage: M.stage, left: Math.max(0, Math.ceil(M.end - G.t)), voted: [...M.votes.keys()], alive: players().filter(p => p.alive).map(p => p.id), result: M.result };
}
function tally() {
  const M = G.meet, count = new Map();
  for (const v of M.votes.values()) count.set(v, (count.get(v) || 0) + 1);
  let best = null, bestN = 0, tie = false;
  for (const [k, n] of count) { if (n > bestN) { best = k; bestN = n; tie = false; } else if (n === bestN) tie = true; }
  const out = best && best !== "skip" && !tie ? best : null;
  const votes = {}; for (const [voter, v] of M.votes) (votes[v] ||= []).push(voter);
  const ej = out ? G.players.get(out) : null;
  M.result = { out, tie, skip: !out, votes, wasMole: ej ? ej.role === "mole" : null, name: ej ? ej.name : null, av: ej ? ej.av : null, confirm: SET.confirm, molesLeft: players().filter(p => p.alive && p.role === "mole" && p !== ej).length };
}
function endMeeting() {
  const M = G.meet, r = M.result;
  if (r.out) { const p = G.players.get(r.out); p.alive = false; send(p, { t: "dead", by: null, ejected: true }); }
  G.meet = null; G.phase = "play"; G.bellCd = 15; G.sabCd = Math.max(G.sabCd, 10);
  for (const p of players()) if (p.role === "mole") p.killCd = SET.cd;
  sendAll({ t: "resume" });
  show("game");
  checkWin();
}
function checkWin() {
  if (G.phase === "over") return;
  const ps = players(), alive = ps.filter(p => p.alive), moles = alive.filter(p => p.role === "mole").length, team = alive.length - moles;
  const tTotal = ps.filter(p => p.role === "team").reduce((s, p) => s + p.tasks.length, 0);
  const tDone = ps.filter(p => p.role === "team").reduce((s, p) => s + p.done.size, 0);
  let win = null, why = "";
  if (moles === 0) { win = "team"; why = "Alle Verräter wurden enttarnt!"; }
  else if (tTotal > 0 && tDone >= tTotal) { win = "team"; why = "Alle Aufgaben erledigt!"; }
  else if (moles >= team) { win = "mole"; why = "Die Verräter sind in der Überzahl."; }
  if (win) gameOver(win, why);
}
function gameOver(win, why) {
  G.phase = "over";
  G.over = { t: "over", win, why, roles: Object.fromEntries(players().map(p => [p.id, p.role])), moles: players().filter(p => p.role === "mole").map(p => p.id) };
  sendAll(G.over); sfx(win === "team" ? "winTeam" : "winMole");
  renderOver(); show("over");
}
function toLobby() {
  G.phase = "lobby"; G.map = null; G.over = null; G.meet = null;
  for (const p of G.players.values()) { p.spect = false; p.role = "team"; }
  show("lobby"); renderLobby(); lobbyBroadcast();
}

// ---------------- Takt: Logik + Schnappschuesse an die Handys
let lastSnap = 0, lastTick = performance.now();
setInterval(() => {
  const now = performance.now(), dt = Math.min(0.5, (now - lastTick) / 1000); lastTick = now; // echte Zeit, auch wenn der Browser drosselt
  if (G.phase === "lobby" || G.phase === "over") return;
  G.t += dt;
  if (G.phase === "intro") { G.introT -= dt; if (G.introT <= 0) { G.phase = "play"; } }
  if (G.phase === "play") {
    for (const p of players()) if (p.killCd > 0 && p.alive) p.killCd -= dt;
    if (G.sabCd > 0 && !G.sab) G.sabCd -= dt;
    if (G.bellCd > 0) G.bellCd -= dt;
    if (G.sab?.k === "crit") {
      G.sab.t -= dt;
      // wer weggeht, haelt nicht mehr
      for (const s of ["a", "b"]) for (const id of [...G.sab[s]]) { const p = G.players.get(id), sp = G.map.def.crit[s]; if (!p || !p.alive || Math.hypot(p.x - sp.x, p.y - sp.y) > RANGE.use + 1.4) G.sab[s].delete(id); }
      if (G.sab.t <= 0) gameOver("mole", G.map.def.crit.n.replace("!", "") + " – zu spät reagiert!");
    }
  }
  if (G.phase === "meet") {
    const M = G.meet;
    if (G.t >= M.end) {
      if (M.stage === "talk") { M.stage = "vote"; M.end = G.t + SET.vote; sfx("vote"); }
      else if (M.stage === "vote") { tally(); M.stage = "result"; M.end = G.t + (M.result.out ? 7 : 5); sfx("drum"); }
      else if (M.stage === "result") { endMeeting(); return; }
      sendAll(meetMsg()); renderMeet();
    }
  }
  if (performance.now() - lastSnap > 80) { lastSnap = performance.now(); snapshots(); }
}, 50);

function vision(p) {
  if (!p.alive) return 99;
  const base = p.role === "mole" ? 8.5 : 6.2;
  return (G.sab?.k === "lights" && p.role !== "mole" ? 2.3 : base) * SET.vision;
}
function snapshots() {
  if (!G.map) return;
  const ps = players();
  const tTotal = ps.filter(p => p.role === "team").reduce((s, p) => s + p.tasks.length, 0) || 1;
  const tDone = ps.filter(p => p.role === "team").reduce((s, p) => s + p.done.size, 0);
  const sab = G.sab ? (G.sab.k === "lights" ? { k: "lights" } : { k: "crit", t: Math.ceil(G.sab.t), a: G.sab.a.size, b: G.sab.b.size }) : null;
  for (const p of ps) {
    const R = vision(p), vis = [], bodies = [];
    for (const q of ps) {
      if (q === p) continue;
      if (!q.alive && p.alive) continue; // Geister sieht nur, wer selbst tot ist
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (p.alive && (d > R + 0.4 || !lineOfSight(G.map, p.x, p.y - 0.4, q.x, q.y - 0.4))) continue;
      vis.push([q.id, +q.x.toFixed(2), +q.y.toFixed(2), q.f, q.mv, q.alive ? 0 : 1, q.busy ? 1 : 0]);
    }
    for (const b of G.bodies) { const d = Math.hypot(b.x - p.x, b.y - p.y); if (!p.alive || (d < R + 0.4 && lineOfSight(G.map, p.x, p.y - 0.4, b.x, b.y))) bodies.push([b.id, +b.x.toFixed(2), +b.y.toFixed(2)]); }
    send(p, { t: "st", ps: vis, b: bodies, cd: p.role === "mole" ? Math.max(0, Math.ceil(p.killCd)) : 0, bar: tDone / tTotal, sab, sabCd: Math.ceil(G.sabCd), bell: p.bellLeft, bellCd: Math.ceil(G.bellCd), done: [...p.done], al: p.alive ? 1 : 0, ph: G.phase });
  }
}

// ---------------- Fernseher: Bildschirme
function show(id) { for (const s of document.querySelectorAll(".scr")) s.classList.toggle("on", s.id === "s-" + id); document.body.dataset.scr = id; }
function flash(text) { const n = $("#flash"); n.textContent = text; n.classList.add("on"); clearTimeout(flash.t); flash.t = setTimeout(() => n.classList.remove("on"), 2600); }

function lobbyBroadcast() {
  const ps = players();
  for (const p of ps) send(p, { t: "lobby", you: p.id, av: p.av, players: pubPlayers(), taken: ps.filter(q => q !== p).map(q => q.av), map: (MAPS[SET.map] || MAPS[0]).name, need: Math.max(0, (TEST ? 2 : 4) - ps.length) });
}
function renderLobby() {
  if (G.phase !== "lobby") return;
  const ps = players();
  const box = $("#plist"); box.innerHTML = "";
  for (let i = 0; i < Math.max(8, ps.length); i++) {
    const p = ps[i], d = document.createElement("div");
    d.className = "pl" + (p ? " on" : "") + (p && !online(p) ? " off" : "");
    if (p) { d.append(bustCanvas(p.av, 64)); const n = document.createElement("div"); n.className = "n"; n.textContent = p.name; d.append(n); const a = document.createElement("div"); a.className = "a"; a.textContent = avatarOf(p.av).name; d.append(a); }
    else d.innerHTML = `<div class="free">frei</div>`;
    box.append(d);
  }
  $("#maps").innerHTML = MAPS.map((m, i) => `<div class="mcard ${SET.map === i ? "sel" : ""}" data-i="${i}" style="--c:${m.color}"><canvas data-m="${i}"></canvas><b>${m.name}</b><span>${m.sub}</span></div>`).join("");
  document.querySelectorAll("#maps canvas").forEach(c => mapThumb(c, +c.dataset.m));
  const opt = (k, vals, fmt) => `<div class="opt"><span>${fmt.label}</span>${vals.map(v => `<button class="${SET[k] === v ? "sel" : ""}" data-k="${k}" data-v="${v}">${fmt.f(v)}</button>`).join("")}</div>`;
  $("#opts").innerHTML =
    opt("moles", [0, 1, 2, 3], { label: "Verräter", f: v => v === 0 ? "Auto" : v }) +
    opt("tasks", [3, 5, 7], { label: "Aufgaben", f: v => v }) +
    opt("cd", [20, 30, 45], { label: "Kill-Abklingzeit", f: v => v + " s" }) +
    opt("talk", [30, 45, 90], { label: "Diskussion", f: v => v + " s" }) +
    opt("vote", [20, 30, 60], { label: "Abstimmen", f: v => v + " s" }) +
    opt("vision", [0.75, 1, 1.25], { label: "Sicht", f: v => v < 1 ? "klein" : v > 1 ? "weit" : "normal" }) +
    opt("confirm", [true, false], { label: "Rolle beim Rauswurf zeigen", f: v => v ? "ja" : "nein" });
  const need = (TEST ? 2 : 4) - ps.length;
  $("#startBtn").disabled = need > 0;
  $("#startBtn").textContent = need > 0 ? `Noch ${need} Spieler…` : "▶ Runde starten";
}
const thumbs = {}; let MAP_A = null;
loadMapAssets("assets/").then(a => { MAP_A = a; for (const k in thumbs) delete thumbs[k]; renderLobby(); });
function mapThumb(c, i) {
  if (!thumbs[i]) thumbs[i] = renderMap(buildMap(MAPS[i]), 10, MAP_A);
  const im = thumbs[i]; c.width = im.width; c.height = im.height; c.getContext("2d").drawImage(im, 0, 0);
}
$("#maps").addEventListener("click", (e) => { const c = e.target.closest("[data-i]"); if (c) { SET.map = +c.dataset.i; saveSet(); renderLobby(); lobbyBroadcast(); } });
$("#opts").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (!b) return; const k = b.dataset.k, v = b.dataset.v; SET[k] = v === "true" ? true : v === "false" ? false : +v; saveSet(); renderLobby(); });
$("#startBtn").onclick = () => startGame();
$("#againBtn").onclick = () => toLobby();

// Meeting-Bildschirm
function renderMeet() {
  const M = G.meet; if (!M) return;
  const by = G.players.get(M.by);
  $("#mtitle").textContent = M.kind === "report" ? "🚨 Gefunden!" : "🔔 Notfall-Meeting!";
  $("#msub").textContent = M.kind === "report" ? `${by?.name} hat ${avatarOf(M.bodyAv).name} tot aufgefunden.` : `${by?.name} hat die ${G.map.def.bell.n} geläutet.`;
  const g = $("#mgrid"); g.innerHTML = "";
  for (const p of players()) {
    const d = document.createElement("div"); d.className = "mp" + (p.alive ? "" : " dead") + (M.votes.has(p.id) ? " voted" : "");
    d.append(bustCanvas(p.av, 70, { dead: !p.alive }));
    const n = document.createElement("div"); n.className = "n"; n.textContent = p.name; d.append(n);
    if (M.stage === "result" && M.result) { const v = document.createElement("div"); v.className = "vs"; for (const voter of (M.result.votes[p.id] || [])) v.append(bustCanvas(G.players.get(voter).av, 18)); d.append(v); }
    g.append(d);
  }
  const skip = $("#mskip"); skip.innerHTML = "";
  if (M.stage === "result" && M.result) for (const voter of (M.result.votes.skip || [])) skip.append(bustCanvas(G.players.get(voter).av, 18));
  const R = M.result;
  $("#mstage").innerHTML = M.stage === "talk" ? `🗣️ Diskutiert! Abstimmung in <b>${Math.max(0, Math.ceil(M.end - G.t))} s</b>`
    : M.stage === "vote" ? `🗳️ Abstimmen am Handy! Noch <b>${Math.max(0, Math.ceil(M.end - G.t))} s</b> · ${M.votes.size}/${players().filter(p => p.alive).length} haben gewählt`
    : !R.out ? (R.tie ? "⚖️ Gleichstand – niemand fliegt raus." : "🤷 Übersprungen – niemand fliegt raus.")
    : `👋 <b>${R.name}</b> fliegt raus.` + (R.confirm ? (R.wasMole ? ` <span class="red">${R.name} war ein Verräter!</span>` : ` ${R.name} war <u>kein</u> Verräter.`) : "") + (R.confirm ? `<br><small>${R.molesLeft === 0 ? "Kein Verräter mehr übrig." : `Noch ${R.molesLeft} "Verräter" übrig.`}</small>` : "");
}
setInterval(() => { if (G.phase === "meet" && G.meet && G.meet.stage !== "result") renderMeet(); }, 500);

function renderOver() {
  const O = G.over;
  $("#otitle").textContent = O.win === "team" ? "🎉 Die Crew gewinnt!" : "🔪 Die Verräter gewinnen!";
  $("#otitle").className = O.win === "team" ? "blue" : "red";
  $("#owhy").textContent = O.why;
  const g = $("#ogrid"); g.innerHTML = "";
  for (const p of players()) {
    const d = document.createElement("div"); d.className = "mp" + (p.role === "mole" ? " mole" : "");
    d.append(bustCanvas(p.av, 76, { dead: !p.alive, ring: p.role === "mole" ? "#ff4a3d" : "#5aa0ff" }));
    const n = document.createElement("div"); n.className = "n"; n.textContent = p.name; d.append(n);
    const r = document.createElement("div"); r.className = "r"; r.textContent = p.role === "mole" ? "Verräter" : `Crew · ${p.done.size}/${p.tasks.length} Aufgaben`; d.append(r);
    g.append(d);
  }
}

// ---------------- Fernseher waehrend der Runde: so wenig wie moeglich (alles Wichtige steht auf den Handys)
const cv = $("#tv"), g = cv.getContext("2d");
function resize() { cv.width = innerWidth * Math.min(2, devicePixelRatio || 1); cv.height = innerHeight * Math.min(2, devicePixelRatio || 1); }
addEventListener("resize", resize); resize();
const BG = new Image(); BG.src = "assets/bg/werwars_bg.jpg";
function frame(t) {
  requestAnimationFrame(frame);
  if (!G.map || (G.phase !== "play" && G.phase !== "intro" && G.phase !== "meet")) return;
  const W = cv.width, H = cv.height, dpr = cv.width / innerWidth;
  g.fillStyle = "#06080f"; g.fillRect(0, 0, W, H);
  if (BG.complete && BG.naturalWidth) { const k = Math.max(W / BG.width, H / BG.height); g.globalAlpha = 0.22; g.drawImage(BG, (W - BG.width * k) / 2, (H - BG.height * k) / 2, BG.width * k, BG.height * k); g.globalAlpha = 1; }
  if (G.phase === "meet") return;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `${64 * dpr}px "Lilita One", Nunito, sans-serif`; g.fillStyle = "rgba(255,207,58,.85)"; g.fillText("Wer war's?", W / 2, H / 2 - 40 * dpr);
  const dots = ".".repeat(1 + Math.floor(t / 600) % 3);
  bigText(G.phase === "intro" ? "Schaut auf eure Handys – wer ist der Verräter? 🤫" : "Runde läuft – Augen aufs Handy" + dots, W / 2, H / 2 + 30 * dpr, "rgba(238,242,248,.8)", dpr, 0.9);
  g.font = `800 ${16 * dpr}px Nunito, Arial`; g.fillStyle = "rgba(160,175,200,.6)"; g.fillText(G.map.def.name, W / 2, H - 40 * dpr);
}
function bigText(s, x, y, col, dpr, k = 1) { g.font = `900 ${28 * dpr * k}px Nunito, Arial`; const w = g.measureText(s).width; if (w > cv.width * 0.94) { k *= cv.width * 0.94 / w; g.font = `900 ${28 * dpr * k}px Nunito, Arial`; } g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 7 * dpr; g.strokeStyle = "rgba(0,0,0,.8)"; g.lineJoin = "round"; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); }
requestAnimationFrame(frame);

// ---------------- Klaenge (eigene Synth-Toene)
let ac = null;
function tone(f, d, at = 0, type = "triangle", vol = 0.15, slide = 0) {
  try { ac ||= new AudioContext(); } catch (e) { return; }
  if (ac.state === "suspended") ac.resume();
  const o = ac.createOscillator(), gn = ac.createGain(), t0 = ac.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t0 + d);
  gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(gn); gn.connect(ac.destination); o.start(t0); o.stop(t0 + d + 0.02);
}
function sfx(k) {
  switch (k) {
    case "start": [392, 523, 659].forEach((f, i) => tone(f, 0.25, i * 0.18, "sine", 0.14)); break;
    case "bell": for (let i = 0; i < 3; i++) { tone(1320, 0.5, i * 0.35, "sine", 0.18); tone(1980, 0.3, i * 0.35, "sine", 0.06); } break;
    case "report": for (let i = 0; i < 4; i++) tone(i % 2 ? 520 : 780, 0.16, i * 0.17, "square", 0.08); break;
    case "vote": tone(880, 0.08, 0, "sine", 0.1); break;
    case "drum": for (let i = 0; i < 10; i++) tone(90 + (i % 2) * 10, 0.09, i * 0.09, "triangle", 0.2); break;
    case "task": tone(1046, 0.08, 0, "sine", 0.06); break;
    case "lights": tone(300, 0.6, 0, "sawtooth", 0.08, 0.3); break;
    case "alarm": for (let i = 0; i < 6; i++) tone(i % 2 ? 660 : 880, 0.22, i * 0.24, "square", 0.07); break;
    case "fixed": [660, 990].forEach((f, i) => tone(f, 0.15, i * 0.1, "sine", 0.1)); break;
    case "winTeam": [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, i * 0.15, "triangle", 0.15)); break;
    case "winMole": [392, 370, 349, 262].forEach((f, i) => tone(f, 0.35, i * 0.2, "sawtooth", 0.08)); break;
  }
}
// Alarm laeuft, solange die kritische Sabotage aktiv ist


// ---------------- Start
loadAvatars("sprites/").then(() => renderLobby());
show("lobby"); renderLobby();
addEventListener("pointerdown", () => { try { ac ||= new AudioContext(); ac.resume(); } catch (e) {} }, { once: true });
addEventListener("keydown", (e) => { if (e.code === "Enter" && G.phase === "lobby") startGame(); else if (e.code === "Enter" && G.phase === "over") toLobby(); });
window.__ww = G;
