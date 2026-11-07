// Mini-MQTT-3.1.1-Client ueber WebSocket (nur QoS 0) – Ersatzweg, wenn die direkte WebRTC-Verbindung zum Handy klemmt.
// Klassisches Skript (fuer pad.html und index.html): stellt window.MqttLite und window.DSK_BROKERS bereit.
(function () {
  "use strict";
  const enc = new TextEncoder(), dec = new TextDecoder();
  function cat(parts) {
    let n = 0; for (const p of parts) n += p.length;
    const out = new Uint8Array(n); let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  function str(s) { const b = enc.encode(s); return cat([new Uint8Array([b.length >> 8, b.length & 255]), b]); }
  function pkt(type, body) {
    const len = []; let n = body.length;
    do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; len.push(d); } while (n > 0);
    return cat([new Uint8Array([type]), new Uint8Array(len), body]);
  }

  class MqttLite {
    constructor(url, clientId) {
      this.url = url; this.id = clientId; this.open = false; this.buf = new Uint8Array(0); this.pid = 1;
      this.onmessage = null; this.onclose = null;
    }
    connect(timeout = 6000) {
      return new Promise((res, rej) => {
        let done = false;
        const fail = (e) => { if (!done) { done = true; rej(e); } try { this.ws && this.ws.close(); } catch (x) {} };
        const to = setTimeout(() => fail(new Error("timeout")), timeout);
        let ws;
        try { ws = new WebSocket(this.url, ["mqtt"]); } catch (e) { clearTimeout(to); fail(e); return; }
        this.ws = ws; ws.binaryType = "arraybuffer";
        ws.onopen = () => {
          const body = cat([str("MQTT"), new Uint8Array([4, 0x02, 0, 30]), str(this.id)]);
          ws.send(pkt(0x10, body));
        };
        ws.onmessage = (ev) => this.feed(new Uint8Array(ev.data), (rc) => {
          clearTimeout(to);
          if (rc !== 0) { fail(new Error("connack " + rc)); return; }
          done = true; this.open = true;
          this.ping = setInterval(() => this.raw(new Uint8Array([0xC0, 0])), 12000);
          res(this);
        });
        ws.onerror = () => { clearTimeout(to); fail(new Error("ws")); };
        ws.onclose = () => {
          clearTimeout(to); clearInterval(this.ping);
          const was = this.open; this.open = false;
          if (!done) fail(new Error("closed"));
          else if (was && this.onclose) this.onclose();
        };
      });
    }
    raw(b) { if (this.ws && this.ws.readyState === 1) { try { this.ws.send(b); return true; } catch (e) {} } return false; }
    subscribe(topic) {
      const id = this.pid = (this.pid % 65000) + 1;
      return this.raw(pkt(0x82, cat([new Uint8Array([id >> 8, id & 255]), str(topic), new Uint8Array([0])])));
    }
    unsubscribe(topic) {
      const id = this.pid = (this.pid % 65000) + 1;
      return this.raw(pkt(0xA2, cat([new Uint8Array([id >> 8, id & 255]), str(topic)])));
    }
    publish(topic, text) { return this.raw(pkt(0x30, cat([str(topic), enc.encode(text)]))); }
    close() { this.onclose = null; if (this.open) this.raw(new Uint8Array([0xE0, 0])); this.open = false; clearInterval(this.ping); try { this.ws.close(); } catch (e) {} }
    feed(chunk, onConnack) {
      let b = this.buf.length ? cat([this.buf, chunk]) : chunk;
      for (;;) {
        if (b.length < 2) break;
        let mul = 1, len = 0, i = 1, d;
        do { if (i >= b.length) { d = -1; break; } d = b[i++]; len += (d & 127) * mul; mul *= 128; } while (d & 128);
        if (d === -1 || b.length < i + len) break;
        const type = b[0], body = b.subarray(i, i + len);
        b = b.subarray(i + len);
        if ((type & 0xF0) === 0x20) onConnack(body[1]);
        else if ((type & 0xF0) === 0x30) {
          const qos = (type >> 1) & 3, tl = (body[0] << 8) | body[1];
          const topic = dec.decode(body.subarray(2, 2 + tl));
          let o = 2 + tl;
          if (qos > 0) { const p1 = body[o], p2 = body[o + 1]; o += 2; if (qos === 1) this.raw(new Uint8Array([0x40, 2, p1, p2])); }
          if (this.onmessage) { try { this.onmessage(topic, dec.decode(body.subarray(o))); } catch (e) { console.warn(e); } }
        }
      }
      this.buf = b.length ? b.slice() : new Uint8Array(0);
    }
  }
  window.MqttLite = MqttLite;
  // oeffentliche Test-Broker (kein Konto noetig). Der PC haengt an allen, das Handy nimmt den ersten, der antwortet.
  window.DSK_BROKERS = ["wss://broker.emqx.io:8084/mqtt", "wss://broker.hivemq.com:8884/mqtt"];
  window.DSK_TOPIC = (code) => "dskart/v2/" + String(code).toUpperCase();
  window.DSK_B64 = {
    enc(buf) { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); },
    dec(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; },
  };
})();
