// Handy-Seite <-> PC: wiederverwendbare Verbindung (klassisches Skript, braucht peerjs.min.js + mqttlite.js davor).
// Direkt per WebRTC (PeerJS) und parallel ueber oeffentliche MQTT-Server als Ersatzweg; es gewinnt, wer zuerst antwortet.
// Waechter: kommt 5 s nichts vom PC, wird komplett neu verbunden. Direktweg schlaegt Ersatzweg, Upgrade alle 12 s.
(function () {
  "use strict";
  const ICE = { iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"], username: "peerjs", credential: "peerjsp" },
  ], sdpSemantics: "unified-plan" };

  class PhoneLink {
    // opts: { getCode(), getName(), tokenKey, onMsg(m), onStatus(text, ok), onWelcome(m), force: "relay"|"rtc"|null }
    constructor(opts) {
      this.o = opts; this.conn = null; this.joined = false; this.rtt = 0;
      this.N = { gen: 0, peer: null, rtc: null, mq: null, mqLink: null, mqTrying: null, lastRx: 0, fails: 0, myId: "", upT: 0 };
      this.whoT = 0;
      setInterval(() => this.watch(), 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && this.joined && (!this.conn || !this.conn.open || performance.now() - this.N.lastRx > 2000)) this.connect(); });
      addEventListener("online", () => { if (this.joined) this.connect(); });
      addEventListener("pageshow", (e) => { if (e.persisted && this.joined) this.connect(); });
    }
    token() { try { return JSON.parse(localStorage.getItem(this.o.tokenKey)) || ""; } catch (e) { return ""; } }
    setToken(t) { try { localStorage.setItem(this.o.tokenKey, JSON.stringify(t)); } catch (e) {} }
    status(t, ok) { this.o.onStatus && this.o.onStatus(t, ok); }
    hello(link) { link.send({ t: "hello", name: this.o.getName(), token: this.token() }); }
    send(m) { if (this.conn && this.conn.open) this.conn.send(m); }
    get open() { return !!(this.conn && this.conn.open); }
    get kind() { return this.conn ? this.conn.kind : ""; }
    start() { this.joined = true; this.connect(); }
    teardown(keepPeer) {
      const N = this.N;
      try { N.rtc && N.rtc.close(); } catch (e) {}
      if (N.mqLink) N.mqLink.open = false;
      try { N.mq && N.mq.close(); } catch (e) {}
      N.rtc = N.mq = N.mqLink = null; this.conn = null;
      if (N.mqTrying) { for (const c of N.mqTrying) c.close(); N.mqTrying = null; }
      if (!keepPeer && N.peer) { try { N.peer.destroy(); } catch (e) {} N.peer = null; }
      clearTimeout(N.relayTimer);
    }
    connect() {
      const code = (this.o.getCode() || "").toUpperCase();
      if (!code) return;
      const N = this.N, g = ++N.gen;
      const keepPeer = N.peer && N.peer.open && !N.peer.disconnected && !N.peer.destroyed;
      this.teardown(keepPeer);
      N.lastRx = performance.now();
      this.status("verbinde…", false);
      if (this.o.force !== "relay") this.startRTC(code, g, keepPeer);
      N.relayTimer = setTimeout(() => { if (g === N.gen && !(this.conn && this.conn.kind === "rtc")) this.startRelay(code, g); }, this.o.force === "relay" ? 0 : N.fails ? 600 : 3000);
    }
    startRTC(code, g, keepPeer) {
      const N = this.N;
      const go = () => {
        if (g !== N.gen) return;
        const c = N.peer.connect("dskart-" + code.toLowerCase(), { reliable: true, serialization: "binary" });
        N.rtc = c;
        const link = { kind: "rtc", get open() { return c.open; }, send: (m) => { try { c.send(m); } catch (e) {} } };
        c.on("open", () => { if (g === N.gen) this.hello(link); });
        c.on("data", (m) => { if (g === N.gen) this.rx(m, link); });
        c.on("close", () => { if (g === N.gen && this.conn === link) this.lost("getrennt"); });
        c.on("iceStateChanged", (s) => { if (g === N.gen && (s === "failed" || s === "closed") && this.conn === link) this.lost("Funkloch…"); });
        c.on("error", () => {});
      };
      if (keepPeer) { go(); return; }
      if (typeof Peer === "undefined") return;
      try { N.peer = new Peer({ debug: 0, config: ICE, pingInterval: 4000 }); } catch (e) { return; }
      const p = N.peer;
      p.on("open", () => { if (p === N.peer) go(); });
      p.on("error", (err) => { if (p === N.peer && g === N.gen && err.type === "peer-unavailable" && !this.conn) this.status("Suche Spiel " + code + " …", false); });
      p.on("disconnected", () => { if (p === N.peer && !p.destroyed) setTimeout(() => { try { if (p === N.peer && p.disconnected && !p.destroyed) p.reconnect(); } catch (e) {} }, 1500); });
    }
    startRelay(code, g) {
      const N = this.N;
      if (typeof MqttLite === "undefined" || N.mq || N.mqTrying) return;
      N.myId ||= "p" + Math.random().toString(36).slice(2, 12);
      const base = DSK_TOPIC(code), down = base + "/dn/" + N.myId;
      const clis = DSK_BROKERS.map(url => new MqttLite(url, "dskp" + Math.random().toString(36).slice(2, 12)));
      N.mqTrying = clis;
      let won = false;
      clis.forEach(cli => cli.connect().then(() => {
        if (won || g !== N.gen) { cli.close(); return; }
        won = true; N.mq = cli; N.mqTrying = null;
        for (const o of clis) if (o !== cli) o.close();
        const link = { kind: "relay", open: true, send(m) { if (link.open) cli.publish(base + "/up", JSON.stringify({ f: N.myId, m })); } };
        N.mqLink = link;
        cli.onmessage = (topic, text) => { if (topic !== down || g !== N.gen) return; let m; try { m = JSON.parse(text); } catch (e) { return; } this.rx(m, link); };
        cli.onclose = () => { if (g !== N.gen) return; link.open = false; N.mq = null; N.mqLink = null; if (this.conn === link) this.lost("Server weg"); };
        cli.subscribe(down);
        const tryHello = () => {
          if (g !== N.gen || !link.open || this.conn) return;
          if (N.rtc && N.rtc.open && !link.waited) { link.waited = true; setTimeout(tryHello, 2500); return; }
          this.hello(link); setTimeout(tryHello, 3000);
        };
        setTimeout(tryHello, 250);
      }).catch(() => {}));
      setTimeout(() => { if (N.mqTrying === clis) N.mqTrying = null; }, 7000);
    }
    rx(m, link) {
      const N = this.N;
      N.lastRx = performance.now();
      if (!m || typeof m !== "object") return;
      if (m.t === "welcome") {
        this.setToken(m.token);
        if (!this.conn || this.conn === link || link.kind === "rtc") {
          const prev = this.conn; this.conn = link; N.fails = 0;
          if (link.kind === "rtc" && N.mq) { if (N.mqLink) { N.mqLink.send({ t: "bye" }); N.mqLink.open = false; } const q = N.mq; N.mq = null; N.mqLink = null; setTimeout(() => q.close(), 300); }
          this.status(link.kind === "rtc" ? "verbunden" : "verbunden ☁", true);
          if (prev !== link) this.o.onWelcome && this.o.onWelcome(m);
        }
        return;
      }
      if (m.t === "who") { const n = performance.now(); if ((!this.conn || this.conn === link) && n - this.whoT > 1000) { this.whoT = n; this.hello(link); } return; }
      if (link !== this.conn) return;
      if (m.t === "p") { const rtt = Date.now() - m.n; if (rtt >= 0 && rtt < 5000) { this.rtt = rtt; this.status((link.kind === "rtc" ? "verbunden" : "verbunden ☁") + " · " + rtt + " ms", true); } return; }
      this.o.onMsg && this.o.onMsg(m);
    }
    lost(why) {
      this.conn = null; this.N.fails++;
      this.status(why + " – neu…", false);
      if (this.joined) setTimeout(() => this.connect(), Math.min(3000, 400 * this.N.fails));
    }
    watch() {
      if (!this.joined) return;
      const N = this.N, now = performance.now();
      if (this.conn) { this.conn.send({ t: "p", n: Date.now() }); if (now - N.lastRx > 5000) this.lost("keine Antwort"); }
      if (this.conn && this.conn.kind === "relay" && this.o.force !== "relay" && now - N.upT > 12000 && !(N.rtc && N.rtc.open)) {
        N.upT = now;
        try { N.rtc && N.rtc.close(); } catch (e) {}
        this.startRTC((this.o.getCode() || "").toUpperCase(), N.gen, N.peer && N.peer.open && !N.peer.disconnected && !N.peer.destroyed);
      }
    }
  }
  window.PhoneLink = PhoneLink;
})();
