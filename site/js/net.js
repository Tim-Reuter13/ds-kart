// Verbindung zu den Handys. Der PC ist der Host.
// Zwei Wege parallel: direkt per PeerJS (WebRTC, schnell) und als Ersatz ueber einen oeffentlichen MQTT-Server (klappt fast immer).
// Handys werden ueber ihr Token wiedererkannt -> nach Abbruch landen sie wieder auf ihrem Platz.
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const BITS = ["gas", "brake", "drift", "item", "back", "up", "down", "left", "right", "ok", "cancel", "start", "cam"];
const ICE = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"], username: "peerjs", credential: "peerjsp" },
  ],
  sdpSemantics: "unified-plan",
};
const OFFLINE_MS = 4000;
const rndCode = () => Array.from({ length: 4 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join("");

export class Net {
  constructor() {
    this.phones = new Map(); // id -> {id, link, name, token, state, online, lastSeen, via}
    this.code = null;
    this.status = "aus";
    this.rtcState = "aus"; this.relayState = "aus";
    this.listeners = {};
    this.relays = []; this.relayLinks = new Map();
    setInterval(() => this.watch(), 1000);
  }
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { for (const f of this.listeners[ev] || []) f(...a); }

  start() {
    if (this.started) return;
    this.started = true;
    let code = "";
    try { code = sessionStorage.getItem("dskart_code") || ""; } catch (e) {}
    this.setCode(code || rndCode());
    this.openRTC(0);
    this.openRelays();
  }
  setCode(code) {
    const old = this.code;
    this.code = code;
    try { sessionStorage.setItem("dskart_code", code); } catch (e) {}
    if (old !== code) {
      for (const r of this.relays) if (r.open) { if (old) r.unsubscribe(DSK_TOPIC(old) + "/up"); r.subscribe(DSK_TOPIC(code) + "/up"); }
      this.emit("ready", code);
    }
    this.updStatus();
  }
  updStatus() {
    const ok = this.rtcState === "bereit" || this.relayState === "bereit";
    this.status = ok ? "bereit" : this.rtcState === "verbinde…" || this.relayState === "verbinde…" ? "verbinde…" : "keine Verbindung – versuche neu…";
  }

  // ---- direkter Weg (PeerJS)
  openRTC(tries) {
    if (typeof Peer === "undefined") { this.rtcState = "PeerJS fehlt"; this.updStatus(); return; }
    clearTimeout(this.rtcTimer);
    const old = this.peer; this.peer = null;
    if (old) { try { old.destroy(); } catch (e) {} }
    this.rtcState = "verbinde…"; this.updStatus();
    const code = this.code;
    const peer = new Peer("dskart-" + code.toLowerCase(), { debug: 0, config: ICE, pingInterval: 4000 });
    this.peer = peer;
    peer.on("open", () => { if (peer !== this.peer) return; this.rtcTries = 0; this.rtcState = "bereit"; this.updStatus(); });
    peer.on("error", (err) => {
      if (peer !== this.peer) return;
      if (err.type === "unavailable-id") {
        // nach einem Neuladen haengt die alte ID noch kurz am Server -> erst ein paar Mal mit demselben Code probieren
        if (tries < 4) { this.rtcState = "verbinde…"; this.rtcTimer = setTimeout(() => this.openRTC(tries + 1), 2500); }
        else { this.setCode(rndCode()); this.openRTC(0); }
      } else if (["network", "server-error", "socket-error", "socket-closed", "disconnected"].includes(err.type)) {
        this.rtcState = "Server weg – versuche neu…"; this.updStatus();
        this.rtcTimer = setTimeout(() => this.reconnectRTC(), 2000);
      } else if (err.type !== "peer-unavailable") {
        this.rtcState = "Fehler: " + err.type; this.updStatus();
      }
    });
    peer.on("disconnected", () => { if (peer !== this.peer) return; this.rtcState = "neu verbinden…"; this.updStatus(); clearTimeout(this.rtcTimer); this.rtcTimer = setTimeout(() => this.reconnectRTC(), 1200); });
    peer.on("close", () => { if (peer !== this.peer) return; this.rtcTimer = setTimeout(() => this.openRTC(0), 2000); });
    peer.on("connection", (conn) => this.acceptRTC(conn));
  }
  reconnectRTC() {
    const p = this.peer;
    if (!p) return this.openRTC(0);
    this.rtcTries = (this.rtcTries || 0) + 1;
    if (p.open && !p.disconnected) { this.rtcTries = 0; return; }
    if (p.destroyed || !p.disconnected || this.rtcTries > 3) { this.rtcTries = 0; this.openRTC(0); return; }
    try { p.reconnect(); } catch (e) { this.openRTC(0); }
  }
  acceptRTC(conn) {
    const link = { kind: "rtc", get open() { return conn.open; }, send: (m) => conn.send(m), close: () => { try { conn.close(); } catch (e) {} } };
    const h = this.handler(link);
    conn.on("data", h.data);
    conn.on("close", h.close);
    conn.on("error", () => {});
    // ICE-Abbruch meldet PeerJS nicht immer als "close"
    conn.on("iceStateChanged", (s) => { if (s === "failed" || s === "closed") h.close(); });
  }

  // ---- Ersatzweg (MQTT ueber WebSocket)
  openRelays() {
    if (typeof MqttLite === "undefined") { this.relayState = "fehlt"; return; }
    this.relayState = "verbinde…"; this.updStatus();
    DSK_BROKERS.forEach((url, bi) => this.openRelay(url, bi, 0));
  }
  openRelay(url, bi, fails) {
    const cli = new MqttLite(url, "dskh" + Math.random().toString(36).slice(2, 12));
    cli.onmessage = (topic, text) => {
      let msg; try { msg = JSON.parse(text); } catch (e) { return; }
      if (!msg || typeof msg.f !== "string" || !msg.m || topic !== DSK_TOPIC(this.code) + "/up") return;
      const key = bi + ":" + msg.f.slice(0, 24);
      let rl = this.relayLinks.get(key);
      if (!rl || rl.cli !== cli) {
        const down = DSK_TOPIC(this.code) + "/dn/" + msg.f.slice(0, 24);
        const link = { kind: "relay", open: true, send: (m) => { if (link.open) cli.publish(down, JSON.stringify(m)); }, close: () => { link.open = false; this.relayLinks.delete(key); } };
        rl = { cli, link, h: this.handler(link) };
        this.relayLinks.set(key, rl);
      }
      const m = msg.m;
      if (m.t === "clip" && typeof m.b64 === "string") { try { m.data = DSK_B64.dec(m.b64); } catch (e) { return; } delete m.b64; }
      if (m.t === "bye") { rl.h.close(); rl.link.close(); return; }
      rl.h.data(m);
    };
    cli.onclose = () => {
      this.relays = this.relays.filter(r => r !== cli);
      for (const [k, rl] of this.relayLinks) if (rl.cli === cli) { rl.h.close(); rl.link.close(); }
      this.relayState = this.relays.length ? "bereit" : "verbinde…"; this.updStatus();
      setTimeout(() => this.openRelay(url, bi, 0), 2000);
    };
    cli.connect().then(() => {
      this.relays.push(cli);
      cli.subscribe(DSK_TOPIC(this.code) + "/up");
      this.relayState = "bereit"; this.updStatus();
    }).catch(() => {
      if (!this.relays.length) { this.relayState = fails > 1 ? "nicht erreichbar" : "verbinde…"; this.updStatus(); }
      setTimeout(() => this.openRelay(url, bi, fails + 1), Math.min(120000, 3000 * 2 ** fails));
    });
  }

  // ---- gemeinsame Nachrichtenbehandlung (egal welcher Weg)
  handler(link) {
    let ph = null;
    const data = (m) => {
      if (!m || typeof m !== "object") return;
      if (m.t === "hello") {
        const token = String(m.token || "").slice(0, 32);
        ph = null;
        for (const p of this.phones.values()) if (token && p.token === token) ph = p;
        if (!ph) {
          const id = "ph" + Math.random().toString(36).slice(2, 8);
          ph = { id, token: token || id, state: {}, online: false };
          this.phones.set(id, ph);
        }
        const old = ph.link;
        ph.link = link; ph.via = link.kind; ph.name = String(m.name || "Handy").slice(0, 14); ph.lastSeen = performance.now(); ph.online = true;
        if (old && old !== link) old.close();
        this.send(ph.id, { t: "welcome", id: ph.id, token: ph.token, via: link.kind });
        this.emit("join", ph.id);
        return;
      }
      if (!ph) { if (m.t !== "bye") link.send({ t: "who" }); return; } // Host kennt das Handy nicht (z.B. PC neu geladen) -> Handy soll sich neu melden
      if (ph.link !== link) return; // alter Weg, Handy hat schon gewechselt
      ph.lastSeen = performance.now();
      if (!ph.online) { ph.online = true; this.emit("join", ph.id); }
      if (m.t === "s") {
        const st = { steer: Math.max(-1, Math.min(1, +m.x || 0)) };
        BITS.forEach((k, i) => st[k] = !!(m.b & (1 << i)));
        // kurze Tipper (Druck + Loslassen zwischen zwei Bildern) nicht verschlucken
        const prev = ph.state || {}, now = performance.now();
        for (const k of BITS) if (st[k] && !prev[k]) (ph.pulse ||= {})[k] = now;
        ph.state = st;
      } else if (m.t === "clip") this.emit("clip", ph.id, m);
      else if (m.t === "recCancel") this.emit("recCancel", ph.id);
      else if (m.t === "pick") this.emit("pick", ph.id, m.driver);
      else if (m.t === "p") link.send({ t: "p", n: m.n });
    };
    const close = () => {
      if (ph && ph.link === link && ph.online) { ph.online = false; ph.state = {}; this.emit("leave", ph.id); }
    };
    return { data, close };
  }

  // Handys ohne Lebenszeichen als getrennt markieren (sie schicken 10x pro Sekunde ihren Zustand)
  watch() {
    const now = performance.now();
    for (const ph of this.phones.values()) {
      if (ph.online && now - ph.lastSeen > OFFLINE_MS) { ph.online = false; ph.state = {}; this.emit("leave", ph.id); }
    }
  }

  phoneIds() { return [...this.phones.keys()].filter(id => this.phones.get(id).online); }
  phone(id) { return this.phones.get(id); }
  phoneState(id) {
    const p = this.phones.get(id);
    if (!p || !p.online) return null;
    if (!p.pulse) return p.state;
    const now = performance.now(), s = Object.assign({}, p.state);
    for (const k in p.pulse) if (now - p.pulse[k] < 70) s[k] = true;
    return s;
  }
  send(id, msg) { const p = this.phones.get(id); if (p && p.link && p.link.open) { try { p.link.send(msg); } catch (e) {} } }
  broadcast(msg) { for (const id of this.phones.keys()) this.send(id, msg); }
  joinUrl() {
    const base = location.href.replace(/[^/]*(\?.*)?(#.*)?$/, "");
    return base + "pad.html?r=" + this.code;
  }
}
