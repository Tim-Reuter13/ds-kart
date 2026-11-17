// "Wer war's?" – Handy: eigener Bildschirm (Sichtradius), Steuerung, Aufgaben, Meeting
import { MAPS, buildMap, renderMap, moveCircle, visPoly, roomLabels, blocked, loadMapAssets } from "./maps.js";
import { AVATARS, loadAvatars, drawChar, bustCanvas, avatarOf } from "./chars.js";
import { GAMES, TASK_CSS } from "./tasks.js";

const $ = (s) => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const store = { get(k, d) { try { const v = localStorage.getItem("ww_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem("ww_" + k, JSON.stringify(v)); } catch (e) {} } };
const SLOT = qs.get("slot") || ""; // Test: mehrere "Handys" im selben Browser
document.head.append(Object.assign(document.createElement("style"), { textContent: TASK_CSS }));
const RANGE = { use: 1.7, report: 2.3, kill: 1.6, bell: 2.0, hatch: 1.4 };

// ---------------- Zustand
const S = {
  scr: "join", me: null, role: "team", mates: [], tasks: [], done: new Set(), players: [], alive: true,
  x: 0, y: 0, f: 1, mv: 0, walk: 0, busy: false, map: null, mapImg: null, MS: 40,
  others: new Map(), bodies: [], cd: 0, bar: 0, sab: null, sabCd: 0, bell: 1, bellCd: 0, ph: "play",
  meet: null, myVote: null, ghostSeen: false, task: null, introUntil: 0,
};
function show(id) { document.querySelectorAll(".scr").forEach(s => s.classList.toggle("on", s.id === "s-" + id)); S.scr = id; }
function ov(id, on) { $("#" + id).classList.toggle("on", on); }
function toast(t, ms = 1800) { const e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove("on"), ms); }
function vib(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }
let ac = null;
function tone(f, d = 0.08, type = "sine", vol = 0.08) { try { ac ||= new AudioContext(); if (ac.state === "suspended") ac.resume(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) {} }

// ---------------- Verbindung
$("#code").value = (qs.get("r") || store.get("code", "")).toUpperCase();
$("#name").value = store.get("name" + SLOT, "");
const link = new PhoneLink({
  getCode: () => $("#code").value.trim().toUpperCase(),
  getName: () => store.get("name" + SLOT, "") || "Handy",
  tokenKey: "ww_token" + SLOT,
  force: qs.get("via"),
  onStatus: (t, ok) => { $("#net").textContent = t; if (S.scr === "join") $("#jmsg").textContent = ok ? "" : t; },
  onMsg: (m) => onMsg(m),
});
$("#joinBtn").onclick = () => {
  const code = $("#code").value.trim().toUpperCase(), name = $("#name").value.trim().slice(0, 14);
  if (code.length !== 4) { $("#jmsg").textContent = "Der Code hat 4 Buchstaben."; return; }
  if (!name) { $("#jmsg").textContent = "Wie heißt du?"; return; }
  store.set("code", code); store.set("name" + SLOT, name); store.set("joinedAt" + SLOT, Date.now());
  $("#jmsg").textContent = "Verbinde…"; link.start(); tone(660); keepAwake();
};
// automatisch wieder rein (z.B. nach Neuladen)
if ($("#code").value && $("#code").value === store.get("code", "") && store.get("name" + SLOT, "") && Date.now() - store.get("joinedAt" + SLOT, 0) < 3 * 3600e3) { $("#jmsg").textContent = "Verbinde wieder…"; link.start(); }

let wake = null;
async function keepAwake() { if (wake || !navigator.wakeLock || document.visibilityState !== "visible") return; try { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } catch (e) {} }
document.addEventListener("visibilitychange", keepAwake); setInterval(keepAwake, 5000);

function onMsg(m) {
  switch (m.t) {
    case "lobby": renderLobby(m); break;
    case "spect": show("lobby"); $("#lmsg").textContent = m.text; break;
    case "start": startRound(m); break;
    case "st": snap(m); break;
    case "tp": S.x = m.x; S.y = m.y; break;
    case "meet": meeting(m); break;
    case "resume": S.meet = null; ov("ovMeet", false); S.myVote = null; break;
    case "dead": died(m); break;
    case "over": over(m); break;
    case "toast": toast(m.text); break;
    case "rumble": vib(m.ms); break;
  }
}

// ---------------- Lobby
function renderLobby(m) {
  show("lobby"); closeAllOv();
  $("#lmap").textContent = m.map;
  const box = $("#avs"); box.innerHTML = "";
  for (const a of AVATARS) {
    const b = document.createElement("button"); b.className = (m.av === a.id ? "mine " : "") + (m.taken.includes(a.id) ? "taken" : "");
    b.append(bustCanvas(a.id, 56)); b.append(document.createTextNode(a.name));
    b.onclick = () => { if (!m.taken.includes(a.id)) { link.send({ t: "av", av: a.id }); vib(10); } };
    box.append(b);
  }
  $("#lplayers").textContent = "Dabei: " + m.players.map(p => p.name).join(", ");
  $("#lstart").disabled = m.need > 0;
  $("#lstart").textContent = m.need > 0 ? `Noch ${m.need} Spieler…` : "▶ Runde starten";
}
$("#lstart").onclick = () => link.send({ t: "start" });
function closeAllOv() { for (const id of ["ovRole", "ovTask", "ovMeet", "ovDead", "ovOver", "mapOv"]) ov(id, false); closeTask(); }

// ---------------- Runde
async function startRound(m) {
  closeAllOv();
  S.me = m.me; S.role = m.role; S.mates = m.mates; S.tasks = m.tasks; S.done = new Set(m.done || []); S.players = m.players; S.alive = m.alive !== false;
  S.x = m.x; S.y = m.y; S.others.clear(); S.bodies = []; S.sab = null; S.meet = null; S.ghostSeen = !S.alive;
  const def = MAPS.find(d => d.id === m.map);
  if (!S.map || S.map.id !== def.id) { S.map = buildMap(def); S.mapImg = renderMap(S.map, S.MS, await loadMapAssets("assets/")); }
  show("game"); renderTasks(); setupActs();
  $("#roleTag").textContent = S.role === "mole" ? "VERRÄTER" : "CREW";
  $("#roleTag").style.background = S.role === "mole" ? "var(--red)" : "var(--blue)";
  if (m.intro > 0) {
    $("#roleBig").textContent = S.role === "mole" ? "VERRÄTER" : "CREW";
    $("#roleBig").style.color = S.role === "mole" ? "var(--red)" : "var(--blue)";
    $("#roleSub").textContent = S.role === "mole" ? "Kill heimlich die Crew, sabotiere, flieh durch die Schächte – und lüg beim Meeting. Deine Aufgaben sind nur Tarnung." : `Erledigt alle Aufgaben und findet heraus, wer der Verräter ist.`;
    const mates = $("#roleMates"); mates.innerHTML = "";
    if (S.role === "mole") for (const id of S.mates) { const p = S.players.find(q => q.id === id); if (p) { const d = document.createElement("div"); d.style.textAlign = "center"; d.append(bustCanvas(p.av, 48)); d.append(document.createTextNode(p.name)); mates.append(d); } }
    ov("ovRole", true); vib([60, 60, 60]); tone(S.role === "mole" ? 220 : 660, 0.4, "triangle", 0.12);
    setTimeout(() => ov("ovRole", false), m.intro * 1000);
  }
}
function renderTasks() {
  const t = $("#tlist"), M = S.map; if (!M) return;
  const head = S.role === "mole" ? "Tarnung (nur so tun)" : S.alive ? "Aufgaben" : "Aufgaben (als Geist)";
  t.innerHTML = `<b>${head}</b>` + S.tasks.map(id => { const k = M.tasks.find(x => x.id === id); return `<div class="t ${S.done.has(id) ? "ok" : ""}">${k ? k.n : id}</div>`; }).join("");
  if (S.sab?.k === "lights") t.innerHTML += `<div class="t" style="color:var(--red)">⚡ Sicherungskasten reparieren!</div>`;
  if (S.sab?.k === "crit") t.innerHTML += `<div class="t" style="color:var(--red)">🔥 ${M.def.crit.fixN} halten! (${S.sab.t} s)</div>`;
}
$("#tlist").onclick = () => $("#tlist").classList.toggle("mini");

function snap(m) {
  const seen = new Set();
  for (const [id, x, y, f, mv, ghost, busy] of m.ps) {
    seen.add(id);
    let o = S.others.get(id);
    if (!o) { o = { id, rx: x, ry: y, walk: 0 }; S.others.set(id, o); }
    o.x = x; o.y = y; o.f = f; o.mv = mv; o.ghost = !!ghost; o.busy = !!busy; o.seen = performance.now();
  }
  for (const [id, o] of S.others) if (!seen.has(id)) S.others.delete(id);
  S.bodies = m.b.map(([id, x, y]) => ({ id, x, y }));
  S.cd = m.cd; S.bar = m.bar; S.sabCd = m.sabCd; S.bell = m.bell; S.bellCd = m.bellCd; S.ph = m.ph;
  const sabChanged = JSON.stringify(m.sab) !== JSON.stringify(S.sab);
  if (sabChanged && m.sab && !S.sab) { vib([100, 60, 100]); tone(m.sab.k === "crit" ? 880 : 300, 0.4, "square", 0.08); }
  S.sab = m.sab;
  const d = new Set(m.done); if (d.size !== S.done.size || sabChanged) { S.done = d; renderTasks(); }
  if (!m.al && S.alive) { S.alive = false; }
  $("#bar i").style.width = (S.bar * 100) + "%";
  const al = $("#alert");
  if (S.sab?.k === "crit") { al.textContent = `🔥 ${S.map.def.crit.n} ${S.sab.t} s – ${S.map.def.crit.fixN} (${S.sab.a ? "✔" : "✗"} / ${S.sab.b ? "✔" : "✗"})`; al.classList.add("on"); }
  else if (S.sab?.k === "lights") { al.textContent = "💡 Stromausfall! Sicherungskasten reparieren"; al.classList.add("on"); }
  else al.classList.remove("on");
}

// ---------------- Steuerung: Joystick + Tastatur
const zone = $("#stickzone"), base = $("#base"), knob = $("#knob");
let sid = null, cx = 0, cy = 0, jx = 0, jy = 0;
function idleStick() { const r = zone.getBoundingClientRect(); cx = r.width * 0.42; cy = r.height * 0.62; base.style.left = knob.style.left = cx + "px"; base.style.top = knob.style.top = cy + "px"; }
zone.addEventListener("pointerdown", (e) => { if (sid !== null) return; sid = e.pointerId; zone.setPointerCapture(e.pointerId); const r = zone.getBoundingClientRect(); cx = e.clientX - r.left; cy = e.clientY - r.top; base.style.left = knob.style.left = cx + "px"; base.style.top = knob.style.top = cy + "px"; e.preventDefault(); });
zone.addEventListener("pointermove", (e) => {
  if (e.pointerId !== sid) return;
  const r = zone.getBoundingClientRect(), R = 60; let dx = e.clientX - r.left - cx, dy = e.clientY - r.top - cy; const d = Math.hypot(dx, dy);
  if (d > R) { const k = (d - R) / d; cx += dx * k; cy += dy * k; dx -= dx * k; dy -= dy * k; base.style.left = cx + "px"; base.style.top = cy + "px"; }
  knob.style.left = (cx + dx) + "px"; knob.style.top = (cy + dy) + "px";
  const m = Math.hypot(dx, dy) / R; jx = m < 0.12 ? 0 : dx / R; jy = m < 0.12 ? 0 : dy / R;
});
const stickUp = (e) => { if (e.pointerId !== sid) return; sid = null; jx = jy = 0; idleStick(); };
zone.addEventListener("pointerup", stickUp); zone.addEventListener("pointercancel", stickUp);
addEventListener("resize", () => { if (sid === null) idleStick(); });
const keys = new Set();
addEventListener("keydown", (e) => { keys.add(e.code); if (e.code === "KeyE" || e.code === "Space") $("#bUse").click(); if (e.code === "KeyR") $("#bRep").click(); if (e.code === "KeyQ") $("#bKill").click(); });
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => { keys.clear(); jx = jy = 0; });

// ---------------- Aktionen
let target = { use: null, rep: null, kill: null, hatch: null };
function setupActs() {
  const mole = S.role === "mole";
  for (const id of ["bKill", "bSab", "bHatch"]) $("#" + id).style.display = mole && S.alive ? "" : "none";
}
function nearest(list, r) { let best = null, bd = r; for (const o of list) { const d = Math.hypot(o.x - S.x, o.y - S.y); if (d < bd) { bd = d; best = o; } } return best; }
function updateTargets() {
  const M = S.map; if (!M) return;
  const free = S.ph === "play" && !S.task && !S.meet;
  // Benutzen: Krise > Sicherungen > Glocke > eigene Aufgabe
  let use = null;
  if (S.sab?.k === "crit" && S.alive) for (const s of ["a", "b"]) { const sp = M.def.crit[s]; if (Math.hypot(sp.x - S.x, sp.y - S.y) < RANGE.use) use = { k: "hold", s, ic: "🧯", n: M.def.crit.fixN }; }
  if (!use && S.sab?.k === "lights") { const f = M.def.fuse; if (Math.hypot(f.x - S.x, f.y - S.y) < RANGE.use) use = { k: "fuse", ic: "⚡", n: "SICHERUNG" }; }
  if (!use && S.alive) { const b = M.def.bell; if (Math.hypot(b.x - S.x, b.y - S.y) < RANGE.bell) use = { k: "bell", ic: "🔔", n: S.bell > 0 ? "GLOCKE" : "LEER" }; }
  if (!use) { const t = nearest(M.tasks.filter(t => S.tasks.includes(t.id) && !S.done.has(t.id)), RANGE.use); if (t) use = { k: "task", t, ic: "✋", n: "BENUTZEN" }; }
  target.use = free || (use && use.k === "hold") ? use : null;
  target.rep = free && S.alive ? nearest(S.bodies, RANGE.report) : null;
  target.kill = free && S.alive && S.role === "mole" ? nearest([...S.others.values()].filter(o => !o.ghost && !S.mates.includes(o.id)).map(o => ({ id: o.id, x: o.rx, y: o.ry })), RANGE.kill) : null;
  target.hatch = free && S.alive && S.role === "mole" ? M.def.hatches.map((h, i) => ({ ...h, i })).find(h => Math.hypot(h.x - S.x, h.y - S.y) < RANGE.hatch) : null;
  $("#bUse").disabled = !target.use || (target.use.k === "bell" && (S.bell <= 0 || S.bellCd > 0 || S.sab?.k === "crit"));
  $("#useIc").textContent = target.use ? target.use.ic : "✋"; $("#useTxt").textContent = target.use ? target.use.n : "BENUTZEN";
  $("#bRep").disabled = !target.rep;
  $("#bKill").disabled = !target.kill || S.cd > 0; $("#cdTxt").textContent = S.cd > 0 ? S.cd : "";
  $("#bSab").disabled = !free || !S.alive || !!S.sab || S.sabCd > 0;
  $("#bHatch").disabled = !target.hatch;
  $("#holdBtn").classList.toggle("on", !!(target.use && target.use.k === "hold"));
  if (!(target.use && target.use.k === "hold") && holding) { holding = false; $("#holdBtn").classList.remove("held"); }
}
$("#bUse").onclick = () => {
  const u = target.use; if (!u || $("#bUse").disabled) return;
  vib(15);
  if (u.k === "task") openTask(u.t);
  else if (u.k === "fuse") openTask({ id: "_fuse", n: "Sicherungen", g: "switches", p: {} });
  else if (u.k === "bell") link.send({ t: "bell" });
};
$("#bRep").onclick = () => { if (target.rep) { link.send({ t: "report", who: target.rep.id }); vib(40); } };
$("#bKill").onclick = () => { if (target.kill && S.cd <= 0) { link.send({ t: "kill", who: target.kill.id }); vib(60); tone(140, 0.2, "triangle", 0.15); } };
$("#bHatch").onclick = () => { if (target.hatch) { link.send({ t: "hatch", i: target.hatch.i }); vib(20); tone(200, 0.15, "square", 0.05); } };
$("#bSab").onclick = () => { $("#sabMenu").classList.toggle("on"); };
$("#sabMenu").addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (!b) return; link.send({ t: "sab", k: b.dataset.s }); $("#sabMenu").classList.remove("on"); vib(30); });
let holding = false;
const hb = $("#holdBtn");
hb.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!target.use || target.use.k !== "hold") return; holding = true; hb.classList.add("held"); link.send({ t: "hold", s: target.use.s, on: true }); vib(20); });
const holdUp = () => { if (!holding) return; holding = false; hb.classList.remove("held"); if (target.use && target.use.k === "hold") link.send({ t: "hold", s: target.use.s, on: false }); };
hb.addEventListener("pointerup", holdUp); hb.addEventListener("pointercancel", holdUp); hb.addEventListener("pointerleave", holdUp);
setInterval(() => { if (holding && target.use?.k === "hold") link.send({ t: "hold", s: target.use.s, on: true }); }, 500);

// ---------------- Aufgaben-Fenster
let taskClean = null;
function openTask(t) {
  const box = $("#taskBox"); box.innerHTML = ""; S.task = t; S.busy = true;
  ov("ovTask", true);
  const fake = S.role === "mole" && t.id !== "_fuse";
  if (fake) {
    // Maulwurf tut nur so
    box.innerHTML = `<div class="tt">🤫 ${t.n}</div><div class="msg">Du tust nur so, als ob … (zählt nicht)</div><div class="tbar" style="width:min(420px,100%)"><i class="zone" style="left:0;width:0;background:#6aff7a;transition:width 3s linear"></i></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const z = box.querySelector(".zone"); if (z) z.style.width = "100%"; }));
    taskClean = (() => { const h = setTimeout(closeTask, 3200); return () => clearTimeout(h); })();
    return;
  }
  const g = GAMES[t.g];
  taskClean = g ? g(box, t.p || {}, () => taskDone(t)) || null : null;
}
function taskDone(t) {
  if (t.id === "_fuse") link.send({ t: "fixLights" });
  else { S.done.add(t.id); link.send({ t: "done", id: t.id }); renderTasks(); }
  tone(1046, 0.12); tone(1318, 0.15); vib(30);
  closeTask();
}
function closeTask() { if (taskClean) { try { taskClean(); } catch (e) {} taskClean = null; } S.task = null; S.busy = false; ov("ovTask", false); }
$("#taskX").onclick = closeTask;

// ---------------- Meeting
function meeting(m) {
  closeTask(); $("#sabMenu").classList.remove("on");
  if (!S.meet || S.meet.stage !== m.stage) { vib(m.stage === "talk" ? [200, 100, 200] : 60); }
  S.meet = m; ov("ovMeet", true);
  const by = S.players.find(p => p.id === m.by), body = S.players.find(p => p.id === m.body);
  $("#mtitle").textContent = m.kind === "report" ? "🚨 Gefunden!" : "🔔 Notfall-Meeting!";
  $("#msub").textContent = m.kind === "report" ? `${by?.name || "?"} hat ${body ? avatarOf(body.av).name : "jemanden"} gefunden.` : `${by?.name || "?"} hat geläutet.`;
  const alive = new Set(m.alive), canVote = m.stage === "vote" && alive.has(S.me) && !m.voted.includes(S.me);
  $("#mstage").innerHTML = m.stage === "talk" ? `🗣️ Diskutiert! Abstimmung in ${m.left} s` : m.stage === "vote" ? (alive.has(S.me) ? (m.voted.includes(S.me) ? `✔ Stimme abgegeben · noch ${m.left} s` : `🗳️ Wen werft ihr raus? Noch ${m.left} s`) : "👻 Geister stimmen nicht ab – psst!") : resultText(m.result);
  const L = $("#vlist"); L.innerHTML = "";
  for (const p of S.players) {
    const b = document.createElement("button");
    b.disabled = !canVote || !alive.has(p.id);
    if (S.myVote === p.id) b.classList.add("sel");
    b.append(bustCanvas(p.av, 52, { dead: !alive.has(p.id), ring: S.role === "mole" && (S.mates.includes(p.id) || p.id === S.me) ? "#ff4a3d" : undefined }));
    b.append(document.createTextNode(p.name + (p.id === S.me ? " (du)" : "")));
    if (m.voted.includes(p.id)) { const v = document.createElement("span"); v.className = "vd"; v.textContent = "✔"; b.append(v); }
    b.onclick = () => { if (b.disabled) return; if (S.myVote === p.id) { link.send({ t: "vote", who: p.id }); vib(40); } else { S.myVote = p.id; L.querySelectorAll("button").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); toast("Nochmal tippen zum Bestätigen", 1200); } };
    L.append(b);
  }
  $("#vskip").style.display = canVote ? "" : "none";
}
$("#vskip").onclick = () => { if (S.myVote === "skip") { link.send({ t: "vote", who: "skip" }); vib(30); } else { S.myVote = "skip"; toast("Nochmal tippen zum Überspringen", 1200); } };
function resultText(r) {
  if (!r) return "";
  if (!r.out) return r.tie ? "⚖️ Gleichstand – niemand fliegt raus." : "🤷 Übersprungen.";
  return `👋 ${r.name} fliegt raus.` + (r.confirm ? (r.wasMole ? " Das war ein Verräter!" : " Das war kein Verräter.") : "");
}

// ---------------- Tot / Ende
function died(m) {
  S.alive = false; closeTask(); setupActs(); renderTasks();
  $("#deadT").textContent = m.ejected ? "Rausgeworfen!" : "Gekillt!";
  const by = $("#deadBy"); by.innerHTML = "";
  if (m.by) { by.append(bustCanvas(m.by, 70)); by.append(Object.assign(document.createElement("div"), { textContent: "Das war " + avatarOf(m.by).name + " …", style: "text-align:center;font-weight:800" })); }
  $("#deadSub").textContent = S.role === "team" ? "Du bist jetzt ein Geist: niemand sieht dich, aber du kannst weiter Aufgaben machen. Nicht verraten, wer's war! 🤐" : "Als Geist kannst du nur noch zuschauen.";
  ov("ovDead", true); vib([300, 100, 300]); tone(110, 0.5, "sawtooth", 0.1);
}
$("#deadOk").onclick = () => ov("ovDead", false);
function over(m) {
  closeAllOv();
  const won = (m.win === "team") === (S.role === "team");
  $("#oT").textContent = (won ? "🎉 Gewonnen!" : "😵 Verloren") + (m.win === "team" ? " · Crew" : " · Verräter");
  $("#oT").style.color = won ? "#6aff7a" : "var(--red)";
  $("#oWhy").textContent = m.why;
  const L = $("#oList"); L.innerHTML = "";
  for (const p of S.players) { const d = document.createElement("div"); d.style.textAlign = "center"; d.style.fontWeight = "800"; d.style.fontSize = "12px"; d.append(bustCanvas(p.av, 48, { ring: m.roles[p.id] === "mole" ? "#ff4a3d" : "#5aa0ff" })); d.append(document.createElement("br")); d.append(document.createTextNode(p.name + (m.roles[p.id] === "mole" ? " 🕵️" : ""))); L.append(d); }
  ov("ovOver", true); vib(won ? [80, 60, 80, 60, 200] : 400);
}
$("#oAgain").onclick = () => link.send({ t: "start" });

// ---------------- Karte
$("#mapBtn").onclick = () => {
  if (!S.map) return;
  const c = $("#mapCv"), im = S.mapImg, k = Math.min(innerWidth * 0.94 / im.width, innerHeight * 0.78 / im.height);
  c.width = im.width * k * 2; c.height = im.height * k * 2; c.style.width = im.width * k + "px"; c.style.height = im.height * k + "px";
  const g = c.getContext("2d"), s = c.width / S.map.W;
  g.drawImage(im, 0, 0, c.width, c.height);
  g.font = `900 ${s * 0.7}px Nunito, Arial`; g.textAlign = "center"; g.textBaseline = "middle";
  for (const l of roomLabels(S.map)) { g.lineWidth = 5; g.strokeStyle = "rgba(0,0,0,.7)"; g.strokeText(l.n, l.x * s, l.y * s); g.fillStyle = "#fff"; g.fillText(l.n, l.x * s, l.y * s); }
  for (const id of S.tasks) { if (S.done.has(id)) continue; const t = S.map.tasks.find(x => x.id === id); if (!t) continue; g.fillStyle = S.role === "mole" ? "#b07ad8" : "#ffcf3a"; g.beginPath(); g.arc(t.x * s, t.y * s, s * 0.55, 0, 7); g.fill(); g.fillStyle = "#000"; g.fillText("!", t.x * s, t.y * s); }
  if (S.sab?.k === "lights") { const f = S.map.def.fuse; g.fillStyle = "#ff4a3d"; g.beginPath(); g.arc(f.x * s, f.y * s, s * 0.7, 0, 7); g.fill(); }
  if (S.sab?.k === "crit") for (const k of ["a", "b"]) { const f = S.map.def.crit[k]; g.fillStyle = "#ff4a3d"; g.beginPath(); g.arc(f.x * s, f.y * s, s * 0.7, 0, 7); g.fill(); }
  if (S.role === "mole") for (const h of S.map.def.hatches) { g.fillStyle = "#7a8796"; g.fillRect(h.x * s - s * 0.4, h.y * s - s * 0.3, s * 0.8, s * 0.6); }
  g.fillStyle = "#3fd6ff"; g.beginPath(); g.arc(S.x * s, S.y * s, s * 0.6, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke();
  ov("mapOv", true);
};
$("#mapX").onclick = () => ov("mapOv", false);

// ---------------- Spielschleife: Bewegung + Zeichnen
const cv = $("#cv"), g = cv.getContext("2d");
let last = performance.now(), sendT = 0, lastSent = "";
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S.scr !== "game" || !S.map) return;
  // Bewegung
  let vx = jx, vy = jy;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) vx = -1; if (keys.has("KeyD") || keys.has("ArrowRight")) vx = 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) vy = -1; if (keys.has("KeyS") || keys.has("ArrowDown")) vy = 1;
  const m = Math.hypot(vx, vy); if (m > 1) { vx /= m; vy /= m; }
  const canMove = (S.ph === "play") && !S.task && !S.meet && !holding;
  S.mv = 0;
  if (canMove && (vx || vy)) {
    const sp = S.alive ? 3.4 : 4.2;
    if (S.alive) { const [nx, ny] = moveCircle(S.map, S.x, S.y, vx * sp * dt, vy * sp * dt, 0.26); S.walk += Math.hypot(nx - S.x, ny - S.y); S.x = nx; S.y = ny; }
    else { S.x = Math.max(0.5, Math.min(S.map.W - 0.5, S.x + vx * sp * dt)); S.y = Math.max(0.5, Math.min(S.map.H - 0.5, S.y + vy * sp * dt)); S.walk += sp * dt; }
    if (Math.abs(vx) > 0.15) S.f = vx > 0 ? 1 : -1;
    S.mv = 1;
  }
  sendT -= dt;
  if (sendT <= 0) { const k = `${S.x.toFixed(2)}|${S.y.toFixed(2)}|${S.f}|${S.mv}|${S.busy}`; if (k !== lastSent || sendT < -0.5) { link.send({ t: "pos", x: +S.x.toFixed(2), y: +S.y.toFixed(2), f: S.f, mv: S.mv, busy: S.busy }); lastSent = k; sendT = 1 / 15; } }
  for (const o of S.others.values()) { const k = Math.min(1, dt * 12); const ox = o.rx, oy = o.ry; o.rx += (o.x - o.rx) * k; o.ry += (o.y - o.ry) * k; o.walk += Math.hypot(o.rx - ox, o.ry - oy); }
  updateTargets();
  draw(now / 1000);
}
requestAnimationFrame(loop);

function draw(t) {
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); idleStick(); }
  const M = S.map, S0 = S.MS;
  const sc = Math.max(26, Math.min(52, Math.min(W, H) / 10)) * dpr; // Pixel pro Meter auf dem Bildschirm
  const camX = S.x, camY = S.y - 0.7;
  const tx = (x) => (x - camX) * sc + cv.width / 2, ty = (y) => (y - camY) * sc + cv.height / 2;
  g.fillStyle = "#05070d"; g.fillRect(0, 0, cv.width, cv.height);
  // Karte (vorgerendert)
  const k = sc / S0;
  g.imageSmoothingEnabled = true;
  g.drawImage(S.mapImg, tx(0), ty(0), S.mapImg.width * k, S.mapImg.height * k);
  // Markierungen: eigene offene Aufgaben, Glocke, Sabotage-Orte, Klappen
  g.textAlign = "center"; g.textBaseline = "middle";
  const pulse = 1 + 0.12 * Math.sin(t * 5);
  for (const id of S.tasks) { if (S.done.has(id)) continue; const tk = M.tasks.find(x => x.id === id); if (!tk) continue; ring(tx(tk.x), ty(tk.y), sc * 0.42 * pulse, S.role === "mole" ? "rgba(176,122,216,.9)" : "rgba(255,207,58,.95)"); }
  const bell = M.def.bell; g.font = `${sc * 0.8}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; g.fillText("🔔", tx(bell.x), ty(bell.y));
  if (S.sab?.k === "lights") { const f = M.def.fuse; ring(tx(f.x), ty(f.y), sc * 0.5 * pulse, "rgba(255,74,61,.95)"); g.fillText("⚡", tx(f.x), ty(f.y)); }
  if (S.sab?.k === "crit") for (const s of ["a", "b"]) { const f = M.def.crit[s]; ring(tx(f.x), ty(f.y), sc * 0.55 * pulse, "rgba(255,74,61,.95)"); g.fillText("🧯", tx(f.x), ty(f.y)); }
  for (const h of M.def.hatches) { const X = tx(h.x), Y = ty(h.y); g.fillStyle = "#3a3f48"; g.fillRect(X - sc * 0.4, Y - sc * 0.28, sc * 0.8, sc * 0.56); g.strokeStyle = "#8a929e"; g.lineWidth = sc * 0.05; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(X + i * sc * 0.14, Y - sc * 0.25); g.lineTo(X + i * sc * 0.14, Y + sc * 0.25); g.stroke(); } }
  // Figuren (nach y sortiert)
  const list = [];
  for (const b of S.bodies) list.push({ y: b.y, draw: () => { const p = S.players.find(q => q.id === b.id); if (!p) return; drawChar(g, p.av, tx(b.x), ty(b.y), sc, { frame: 7 }); g.font = `${sc * 0.45}px sans-serif`; g.fillText("💫", tx(b.x) - sc * 0.5, ty(b.y) - sc * 0.55 + Math.sin(t * 4) * 3); } });
  for (const o of S.others.values()) {
    const p = S.players.find(q => q.id === o.id); if (!p) continue;
    const mate = S.role === "mole" && S.mates.includes(o.id);
    list.push({ y: o.ry, draw: () => drawChar(g, p.av, tx(o.rx), ty(o.ry), sc, { frame: o.busy ? 6 : o.mv ? Math.floor(o.walk / 0.33) % 4 : 4, flip: o.f < 0, ghost: o.ghost, t, name: p.name, nameCol: mate ? "#ff6a5a" : "#fff" }) });
  }
  const meP = S.players.find(q => q.id === S.me);
  if (meP) list.push({ y: S.y, draw: () => drawChar(g, meP.av, tx(S.x), ty(S.y), sc, { frame: S.busy ? 6 : S.mv ? Math.floor(S.walk / 0.33) % 4 : 4, flip: S.f < 0, ghost: !S.alive, t, name: meP.name, nameCol: S.role === "mole" ? "#ff6a5a" : "#fff" }) });
  list.sort((a, b) => a.y - b.y).forEach(o => o.draw());
  // Dunkelheit ausserhalb der Sicht (Geister sehen alles)
  if (S.alive) {
    const R = (S.role === "mole" ? 8.5 : S.sab?.k === "lights" ? 2.3 : 6.2);
    const poly = visPoly(M, S.x, S.y - 0.3, R, 240);
    if (!draw.fog) draw.fog = document.createElement("canvas");
    const fog = draw.fog; if (fog.width !== cv.width || fog.height !== cv.height) { fog.width = cv.width; fog.height = cv.height; }
    const f = fog.getContext("2d");
    f.globalCompositeOperation = "source-over"; f.clearRect(0, 0, fog.width, fog.height);
    f.fillStyle = S.sab?.k === "lights" && S.role !== "mole" ? "rgba(2,3,8,.97)" : "rgba(4,6,14,.86)"; f.fillRect(0, 0, fog.width, fog.height);
    f.globalCompositeOperation = "destination-out";
    const gr = f.createRadialGradient(tx(S.x), ty(S.y - 0.3), R * sc * 0.55, tx(S.x), ty(S.y - 0.3), R * sc);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    f.fillStyle = gr; f.beginPath(); f.moveTo(tx(poly[0]), ty(poly[1])); for (let i = 2; i < poly.length; i += 2) f.lineTo(tx(poly[i]), ty(poly[i + 1])); f.closePath(); f.fill();
    g.drawImage(fog, 0, 0);
  } else { g.fillStyle = "rgba(120,170,255,.08)"; g.fillRect(0, 0, cv.width, cv.height); }
  // Pfeile zu offenen Aufgaben am Rand
  if (!S.meet) for (const id of S.tasks) {
    if (S.done.has(id)) continue; const tk = M.tasks.find(x => x.id === id); if (!tk) continue;
    const X = tx(tk.x), Y = ty(tk.y), mg = 30 * dpr;
    if (X > mg && X < cv.width - mg && Y > mg && Y < cv.height - mg) continue;
    const a = Math.atan2(Y - cv.height / 2, X - cv.width / 2), r = Math.min(cv.width, cv.height) / 2 - 26 * dpr;
    g.save(); g.translate(cv.width / 2 + Math.cos(a) * r, cv.height / 2 + Math.sin(a) * r * (cv.height / cv.width < 1 ? 0.92 : 1)); g.rotate(a);
    g.fillStyle = S.role === "mole" ? "rgba(176,122,216,.85)" : "rgba(255,207,58,.9)"; g.beginPath(); g.moveTo(12 * dpr, 0); g.lineTo(-8 * dpr, -9 * dpr); g.lineTo(-8 * dpr, 9 * dpr); g.closePath(); g.fill(); g.restore();
  }
  // Raumname
  const room = M.roomAt(S.x, S.y);
  if (room && !room.nolabel) { g.font = `900 ${15 * dpr}px Nunito, Arial`; g.textAlign = "center"; g.lineWidth = 4 * dpr; g.strokeStyle = "rgba(0,0,0,.7)"; g.strokeText(room.n, cv.width / 2, cv.height - 18 * dpr); g.fillStyle = "#fff"; g.fillText(room.n, cv.width / 2, cv.height - 18 * dpr); }
}
function ring(x, y, r, col) { g.strokeStyle = col; g.lineWidth = r * 0.22; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }

loadAvatars("sprites/"); loadMapAssets("assets/");
idleStick();
// Testhilfe: ?auto=1 laeuft zufaellig herum
if (qs.has("bot")) setInterval(() => { if (S.scr === "game") { jx = Math.cos(performance.now() / 1700 + (+SLOT || 0)); jy = Math.sin(performance.now() / 2300 + (+SLOT || 0)); } }, 200);
window.__ww = S;
