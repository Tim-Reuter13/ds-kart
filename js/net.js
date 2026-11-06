// Verbindung zu den Handys ueber PeerJS (WebRTC). Der PC ist der Host.
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const BITS = ["gas", "brake", "drift", "item", "back", "up", "down", "left", "right", "ok", "cancel", "start"];

export class Net {
  constructor() {
    this.phones = new Map(); // id -> {conn, name, token, state, driver, ready, lastSeen}
    this.code = null;
    this.status = "aus";
    this.listeners = {};
  }
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { for (const f of this.listeners[ev] || []) f(...a); }

  start() {
    if (typeof Peer === "undefined") { this.status = "PeerJS fehlt"; return; }
    let code = "";
    try { code = sessionStorage.getItem("dskart_code") || ""; } catch (e) {}
    if (!code) code = Array.from({ length: 4 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join("");
    this.open(code, 0);
  }

  open(code, tries) {
    this.code = code;
    this.status = "verbinde…";
    const peer = new Peer("dskart-" + code.toLowerCase(), { debug: 0 });
    this.peer = peer;
    peer.on("open", () => {
      this.status = "bereit";
      try { sessionStorage.setItem("dskart_code", code); } catch (e) {}
      this.emit("ready", code);
    });
    peer.on("error", (err) => {
      if (err.type === "unavailable-id" && tries < 5) {
        peer.destroy();
        const c = Array.from({ length: 4 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join("");
        this.open(c, tries + 1);
      } else if (err.type === "network" || err.type === "server-error" || err.type === "socket-error" || err.type === "disconnected") {
        this.status = "Server weg – versuche neu…";
        setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 2000);
      } else {
        this.status = "Fehler: " + err.type;
      }
    });
    peer.on("disconnected", () => { this.status = "neu verbinden…"; setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1500); });
    peer.on("connection", (conn) => this.accept(conn));
  }

  accept(conn) {
    let ph = null;
    conn.on("data", (m) => {
      if (!m || typeof m !== "object") return;
      if (m.t === "hello") {
        const token = String(m.token || "").slice(0, 32);
        for (const [id, p] of this.phones) if (p.token === token && token) { ph = p; ph.id = id; }
        if (!ph) {
          const id = "ph" + Math.random().toString(36).slice(2, 8);
          ph = { id, token: token || id, state: {}, driver: null, ready: false };
          this.phones.set(id, ph);
        }
        if (ph.conn && ph.conn !== conn) { try { ph.conn.close(); } catch (e) {} }
        ph.conn = conn; ph.name = String(m.name || "Handy").slice(0, 14); ph.lastSeen = performance.now(); ph.online = true;
        this.send(ph.id, { t: "welcome", id: ph.id, token: ph.token });
        this.emit("join", ph.id);
      } else if (!ph) {
        return;
      } else if (m.t === "s") {
        const st = { steer: Math.max(-1, Math.min(1, +m.x || 0)) };
        BITS.forEach((k, i) => st[k] = !!(m.b & (1 << i)));
        ph.state = st; ph.lastSeen = performance.now();
      } else if (m.t === "pick") {
        this.emit("pick", ph.id, m.driver);
      } else if (m.t === "p") {
        this.send(ph.id, { t: "p", n: m.n });
      }
    });
    conn.on("close", () => { if (ph && ph.conn === conn) { ph.online = false; ph.state = {}; this.emit("leave", ph.id); } });
    conn.on("error", () => {});
  }

  phoneIds() { return [...this.phones.keys()].filter(id => this.phones.get(id).online); }
  phone(id) { return this.phones.get(id); }
  phoneState(id) { const p = this.phones.get(id); return p && p.online ? p.state : null; }
  send(id, msg) { const p = this.phones.get(id); if (p && p.conn && p.conn.open) { try { p.conn.send(msg); } catch (e) {} } }
  broadcast(msg) { for (const id of this.phones.keys()) this.send(id, msg); }
  joinUrl() {
    const base = location.href.replace(/[^/]*(\?.*)?(#.*)?$/, "");
    return base + "pad.html?r=" + this.code;
  }
}
