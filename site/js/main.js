import * as THREE from "three";
import { Race } from "./game.js";
import { HUD } from "./hud.js";
import { Audio } from "./audio.js";
import { Net } from "./net.js";
import { Inputs, devLabel } from "./input.js";
import { DRIVERS } from "./cars.js";
import { CLASSES } from "./kart.js";
import { TRACKS } from "./tracks.js";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";
import { initAudioUI } from "./audioui.js";
import { Pipeline } from "./render.js";

const $ = (s) => document.querySelector(s);
const renderer = new THREE.WebGLRenderer({ canvas: $("#gl"), antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const pmrem = new THREE.PMREMGenerator(renderer);
window.__env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const pipeline = new Pipeline(renderer);
window.__pipeline = pipeline;
const hudCanvas = $("#hud");
const hud = new HUD(hudCanvas);
const audio = new Audio();
const net = new Net();
const inputs = new Inputs(net);
let audioUI = null;

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  const dpr = devicePixelRatio || 1;
  hudCanvas.width = innerWidth * dpr; hudCanvas.height = innerHeight * dpr;
  if (window.__pipeline) window.__pipeline.resize();
}
addEventListener("resize", resize); resize();

const state = {
  screen: "title",
  players: [],            // {dev, di (Fahrer-Index), ready}
  track: 0, cls: "golf", laps: 3,
  race: null,
  focus: { row: 0, col: 0 },
  lastResults: null,
};

function show(id) {
  for (const s of document.querySelectorAll(".screen")) s.classList.toggle("on", s.id === "s-" + id || (id === "pause" && s.id === "pause"));
  state.screen = id;
  if (id !== "race" && id !== "pause") { const g = hudCanvas.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, hudCanvas.width, hudCanvas.height); }
  net.broadcast({ t: "mode", m: id === "race" ? "race" : id === "lobby" ? "pick" : "menu" });
  if (id === "lobby") sendLobby();
}

// ---------------- Netz
net.on("ready", (code) => {
  $("#code").textContent = code;
  const url = net.joinUrl();
  $("#joinurl").textContent = url;
  try {
    const q = qrcode(0, "M"); q.addData(url); q.make();
    $("#qr").innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  } catch (e) { $("#qr").textContent = "QR-Fehler"; }
});
net.on("join", (id) => {
  if (!state.players.find(p => p.dev === id)) {
    if (state.players.length >= 4 || state.screen === "race") { net.send(id, { t: "full" }); }
    else { addPlayer(id); }
  }
  if (!(audioUI && audioUI.isRecording())) net.send(id, { t: "mode", m: state.screen === "race" ? "race" : state.screen === "lobby" ? "pick" : "menu" });
  sendLobby();
});
net.on("leave", (id) => {
  if (state.screen === "lobby") { state.players = state.players.filter(p => p.dev !== id); renderLobby(); sendLobby(); }
});
net.on("pick", (id, driver) => {
  const p = state.players.find(p => p.dev === id);
  if (!p) return;
  const di = DRIVERS.findIndex(d => d.id === driver);
  if (di < 0) return;
  if (state.players.some(o => o !== p && o.di === di)) return;
  p.di = di; p.ready = true; audio.sfx("confirm");
  renderLobby(); sendLobby();
});
function sendLobby() {
  for (const p of state.players) {
    if (!p.dev.startsWith("ph")) continue;
    net.send(p.dev, { t: "lobby", mine: DRIVERS[p.di]?.id, ready: p.ready,
      drivers: DRIVERS.map((d, i) => ({ id: d.id, name: d.name, car: d.car, color: d.hud, taken: state.players.some(o => o !== p && o.di === i && o.ready) })) });
  }
}
setInterval(() => { $("#netst").textContent = "Handy-Verbindung: " + net.status + (net.code ? " · Code " + net.code : ""); $("#netmsg").textContent = net.status === "bereit" ? "" : net.status; }, 500);

// ---------------- Lobby
function freeDriver(from = 0, dir = 1, self = null) {
  for (let k = 0; k < DRIVERS.length; k++) {
    const i = ((from + k * dir) % DRIVERS.length + DRIVERS.length) % DRIVERS.length;
    if (!state.players.some(p => p !== self && p.di === i)) return i;
  }
  return 0;
}
function addPlayer(dev) {
  if (state.players.length >= 4) return;
  state.players.push({ dev, di: freeDriver(state.players.length), ready: false });
  audio.sfx("confirm");
  renderLobby();
}
function renderLobby() {
  const box = $("#slots");
  let html = "";
  for (let i = 0; i < 4; i++) {
    const p = state.players[i];
    if (!p) { html += `<div class="slot"><div class="p">Spieler ${i + 1}</div><div class="small">frei</div></div>`; continue; }
    const d = DRIVERS[p.di];
    const name = p.dev.startsWith("ph") ? (net.phone(p.dev)?.name || "Handy") : devLabel(p.dev);
    html += `<div class="slot on ${p.ready ? "ready" : ""}" style="border-color:${p.ready ? "" : d.hud}">
      <div class="p" style="color:${d.hud}">P${i + 1}</div>
      <div class="swatch" style="background:${d.color}"></div>
      <div class="nm">${d.name}</div><div class="car">${d.car}</div>
      <div class="dev">${name}</div>
      <div class="arrows">${p.ready ? "✔ bereit" : p.dev.startsWith("ph") ? "wählt am Handy…" : "◀ ▶ wählen · OK"}</div></div>`;
  }
  box.innerHTML = html;
}

// ---------------- Strecken-Auswahl
function renderSetup() {
  const f = state.focus;
  $("#trackCards").innerHTML = TRACKS.map((t, i) => `<div class="card ${state.track === i ? "sel" : ""} ${f.row === 0 && f.col === i ? "focus" : ""}" data-t="${i}">
    <div class="stripe" style="background:${t.color}"></div><div class="t">${t.name}</div><div class="s">${t.sub}</div></div>`).join("");
  const cls = Object.entries(CLASSES);
  $("#clsBtns").innerHTML = cls.map(([k, c], i) => `<button class="btn ${state.cls === k ? "sel" : ""} ${f.row === 1 && f.col === i ? "focus" : ""}" data-c="${k}">${c.name} <span style="font-size:14px">(${c.sub})</span></button>`).join("");
  $("#lapBtns").innerHTML = [2, 3, 5].map((n, i) => `<button class="btn ${state.laps === n ? "sel" : ""} ${f.row === 2 && f.col === i ? "focus" : ""}" data-l="${n}">${n}</button>`).join("");
  $("#go").classList.toggle("focus", f.row === 3);
}
$("#trackCards").addEventListener("click", e => { const c = e.target.closest("[data-t]"); if (c) { state.track = +c.dataset.t; state.focus = { row: 0, col: state.track }; renderSetup(); } });
$("#clsBtns").addEventListener("click", e => { const c = e.target.closest("[data-c]"); if (c) { state.cls = c.dataset.c; renderSetup(); } });
$("#lapBtns").addEventListener("click", e => { const c = e.target.closest("[data-l]"); if (c) { state.laps = +c.dataset.l; renderSetup(); } });
$("#go").onclick = () => startRace();
$("#toSetup").onclick = () => toSetup();
$("#toAudio").onclick = () => audioUI.open("lobby");

function toSetup() {
  if (!state.players.length) { addPlayer("kb1"); state.players[0].ready = true; }
  for (const p of state.players) p.ready = true;
  state.focus = { row: 0, col: state.track };
  show("setup"); renderSetup();
}

// ---------------- Rennen
const cache = {};
async function startRace() {
  audio.ensure(); audio.sfx("confirm");
  show("load");
  const def = TRACKS[state.track];
  try {
    cache[def.id] ||= await (await fetch(`data/${def.id}.json`)).json();
  } catch (e) { $("#loading").textContent = "Strecke konnte nicht geladen werden."; return; }
  await new Promise(r => setTimeout(r, 30));
  if (state.race) { state.race.dispose(); state.race = null; }
  const players = state.players.map(p => ({ dev: p.dev, driver: DRIVERS[p.di].id }));
  state.race = new Race({ renderer, pipeline, hud, audio, net, inputs, def, data: cache[def.id], players, cls: state.cls, laps: state.laps, onEnd: showResults });
  window.__race = state.race;
  if (new URLSearchParams(location.search).has("auto")) state.race.autopilot = true;
  show("race");
}

function showResults(res) {
  state.lastResults = res;
  const fmt = (t) => t == null ? "–" : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
  const best = res.find(r => r.human);
  $("#resTitle").textContent = best ? (best.place === 1 ? `🏆 ${best.name} gewinnt!` : `${best.name}: ${best.place}. Platz`) : "Ergebnis";
  $("#resTable").innerHTML = res.map(r => `<tr class="${r.human ? "me" : ""}"><td class="pl">${r.place}.</td><td><span class="dot" style="background:${r.color}"></span>${r.name}</td><td class="small">${r.car}</td><td>${fmt(r.time)}</td><td class="small">🍾 ${(r.pfand * 0.25).toFixed(2).replace(".", ",")} €</td></tr>`).join("");
  state.focus = { row: 0, col: 0 };
  show("results"); renderResults();
}
const RES_BTNS = [["Nochmal", () => startRace()], ["Andere Strecke", () => { show("setup"); state.focus = { row: 0, col: state.track }; renderSetup(); }], ["Fahrer wechseln", () => { for (const p of state.players) p.ready = false; show("lobby"); renderLobby(); }]];
function renderResults() {
  $("#resBtns").innerHTML = RES_BTNS.map(([n], i) => `<button class="btn ${state.focus.col === i ? "focus" : ""}" data-i="${i}">${n}</button>`).join("");
}
$("#resBtns").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) RES_BTNS[+b.dataset.i][1](); });
const PAUSE_BTNS = [["Weiter", () => resume()], ["Neustart", () => startRace()], ["Beenden", () => { if (state.race) { state.race.dispose(); state.race = null; } show("setup"); renderSetup(); }]];
function renderPause() { $("#pauseBtns").innerHTML = PAUSE_BTNS.map(([n], i) => `<button class="btn ${state.focus.col === i ? "focus" : ""}" data-i="${i}">${n}</button>`).join(""); }
$("#pauseBtns").addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (b) PAUSE_BTNS[+b.dataset.i][1](); });
function pause() { if (!state.race) return; state.race.paused = true; audio.stopEngines(); state.focus = { row: 0, col: 0 }; show("pause"); renderPause(); }
function resume() { if (!state.race) return; state.race.paused = false; show("race"); }

// ---------------- Menue-Steuerung mit allen Geraeten
function menuInput() {
  const devs = inputs.devices();
  for (const dev of devs) {
    const e = inputs.edges(dev);
    if (state.screen === "title") {
      if (e.ok || e.start || e.up || e.down || e.left || e.right) { audio.ensure(); audio.sfx("confirm"); net.start(); show("lobby"); renderLobby(); return; }
    } else if (state.screen === "lobby") {
      const p = state.players.find(p => p.dev === dev);
      if (!p) {
        if (e.ok && !dev.startsWith("ph")) addPlayer(dev);
        if (e.cancel && dev === "kb1" && !state.players.length) show("title");
        continue;
      }
      if (dev.startsWith("ph")) { if (e.start && state.players.every(q => q.ready)) toSetup(); continue; }
      if (!p.ready) {
        if (e.left) { p.di = freeDriver(p.di - 1, -1, p); audio.sfx("select"); renderLobby(); sendLobby(); }
        if (e.right) { p.di = freeDriver(p.di + 1, 1, p); audio.sfx("select"); renderLobby(); sendLobby(); }
        if (e.ok) { p.ready = true; audio.sfx("confirm"); renderLobby(); sendLobby(); }
        if (e.cancel) { state.players = state.players.filter(q => q !== p); renderLobby(); sendLobby(); }
      } else {
        if (e.cancel) { p.ready = false; renderLobby(); sendLobby(); }
        if ((e.ok || e.start) && state.players.every(q => q.ready)) { toSetup(); return; }
      }
    } else if (state.screen === "setup") {
      const f = state.focus;
      const rowLen = [TRACKS.length, 3, 3, 1];
      if (e.up) { f.row = Math.max(0, f.row - 1); f.col = Math.min(f.col, rowLen[f.row] - 1); audio.sfx("select"); }
      if (e.down) { f.row = Math.min(3, f.row + 1); f.col = Math.min(f.col, rowLen[f.row] - 1); audio.sfx("select"); }
      if (e.left) { f.col = Math.max(0, f.col - 1); audio.sfx("select"); }
      if (e.right) { f.col = Math.min(rowLen[f.row] - 1, f.col + 1); audio.sfx("select"); }
      if (e.left || e.right || e.up || e.down) {
        if (f.row === 0) state.track = f.col;
        if (f.row === 1) state.cls = Object.keys(CLASSES)[f.col];
        if (f.row === 2) state.laps = [2, 3, 5][f.col];
      }
      if (e.ok || e.start) { if (f.row === 3 || e.start) { startRace(); return; } f.row++; f.col = 0; audio.sfx("confirm"); }
      if (e.cancel) { for (const p of state.players) if (!p.dev.startsWith("ph")) p.ready = false; show("lobby"); renderLobby(); return; }
      renderSetup();
    } else if (state.screen === "audio") {
      if (e.cancel && !audioUI.isRecording()) { $("#aBack").click(); return; }
    } else if (state.screen === "race") {
      if (e.start && !dev.startsWith("kb")) { pause(); return; }
    } else if (state.screen === "pause" || state.screen === "results") {
      const btns = state.screen === "pause" ? PAUSE_BTNS : RES_BTNS;
      const f = state.focus;
      if (e.left || e.up) { f.col = Math.max(0, f.col - 1); audio.sfx("select"); }
      if (e.right || e.down) { f.col = Math.min(btns.length - 1, f.col + 1); audio.sfx("select"); }
      if (e.ok) { btns[f.col][1](); return; }
      if (e.start && state.screen === "pause") { resume(); return; }
      state.screen === "pause" ? renderPause() : renderResults();
    }
  }
}
addEventListener("keydown", (e) => {
  if (e.code === "Escape" && state.screen === "race") pause();
  else if (e.code === "Escape" && state.screen === "pause") resume();
});
$("#s-title").addEventListener("click", () => { audio.ensure(); net.start(); show("lobby"); renderLobby(); });

audioUI = initAudioUI({ audio, net, show: (id) => { show(id); if (id === "lobby") renderLobby(); } });

// ---------------- Schleife
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  menuInput();
  if (state.race && (state.screen === "race" || state.screen === "pause")) {
    state.race.update(dt);
    state.race.render(dt);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test-Hook: ?test=track,players  (z.B. ?test=0,1)
const qs = new URLSearchParams(location.search);
if (qs.has("test")) {
  const [t, n] = qs.get("test").split(",").map(Number);
  state.track = t || 0;
  for (let i = 0; i < (n || 1); i++) state.players.push({ dev: ["kb1", "kb2", "gp0", "gp1"][i], di: i, ready: true });
  if (qs.has("cls")) state.cls = qs.get("cls");
  startRace();
}

// Test-Hook: ?at=0.4 setzt Spieler 1 an diese Stelle der Strecke (Anteil der Runde)
if (qs.has("at")) {
  const wait = setInterval(() => {
    const r = state.race;
    if (!r) return;
    clearInterval(wait);
    const h = r.humans[0];
    h.place_on_grid(r.track, parseFloat(qs.get("at")) * r.track.L, 0);
    h.total = 0; r.countdown = 0.01;
  }, 50);
}

// Titelbild: echtes Logo, falls vorhanden (sonst Text-Logo)
{
  const img = document.querySelector("#logoImg");
  const ok = () => { document.querySelector("#s-title").classList.add("hasLogo"); document.querySelector(".logoWrap").style.setProperty("--logo-mask", `url(${img.src}) center/contain no-repeat`); };
  if (img.complete && img.naturalWidth) ok(); else img.addEventListener("load", ok);
}
