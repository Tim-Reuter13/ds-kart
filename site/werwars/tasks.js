// Aufgaben-Minispiele (laufen auf dem Handy). Jede Funktion baut ihr UI in "box" und ruft done() bei Erfolg.
// Rueckgabe: Aufraeumfunktion.
const $el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[(Math.random() * a.length) | 0];
const euro = (v) => v.toFixed(2).replace(".", ",") + " €";
function shake(e) { e.classList.remove("shake"); void e.offsetWidth; e.classList.add("shake"); if (navigator.vibrate) navigator.vibrate(60); }
function buzz(ms = 12) { if (navigator.vibrate) navigator.vibrate(ms); }

export const GAMES = {
  // Reihenfolge druecken (Eismaschine, Kaffee ...)
  seq(box, p, done) {
    const order = p.fixed ? p.btns.slice() : shuffle(p.btns);
    box.append($el("div", "tt", `${p.icon || ""} ${p.title || "Reihenfolge"}`));
    const list = $el("ol", "steps", order.map(b => `<li>${b}</li>`).join("")); box.append(list);
    const grid = $el("div", "grid2"); box.append(grid);
    let k = 0;
    for (const b of shuffle(order)) {
      const bt = $el("button", "big", b); grid.append(bt);
      bt.onclick = () => {
        if (b === order[k]) { bt.disabled = true; bt.classList.add("ok"); list.children[k].classList.add("ok"); buzz(); if (++k === order.length) setTimeout(done, 350); }
        else { shake(grid); k = 0; grid.querySelectorAll("button").forEach(x => { x.disabled = false; x.classList.remove("ok"); }); [...list.children].forEach(x => x.classList.remove("ok")); }
      };
    }
  },
  // Burger nach Bon belegen
  burger(box, p, done) {
    const ING = [["🥩", "Patty"], ["🧀", "Käse"], ["🥬", "Salat"], ["🍅", "Tomate"], ["🧅", "Zwiebel"], ["🥒", "Gurke"], ["🥓", "Bacon"]];
    const want = ["🍞"].concat(shuffle(ING).slice(0, 4).map(x => x[0])).concat(["🍔"]);
    box.append($el("div", "tt", "🍔 Burger nach Bon belegen"));
    const row = $el("div", "burgerRow"); box.append(row);
    const bon = $el("div", "bon", "<b>Bon</b><br>" + want.slice(1, -1).map(e => ING.find(i => i[0] === e)[1]).join("<br>")); row.append(bon);
    const stack = $el("div", "stack"); row.append(stack);
    const grid = $el("div", "grid4"); box.append(grid);
    let k = 0;
    const put = (e) => { const s = $el("div", "layer", e === "🍔" ? "🍞" : e); stack.prepend(s); };
    put("🍞"); k = 1;
    for (const [e, n] of ING.concat([["🍔", "Deckel drauf"]])) {
      const bt = $el("button", "big", `<span style="font-size:30px">${e === "🍔" ? "🍞" : e}</span><br>${n}`); grid.append(bt);
      bt.onclick = () => {
        if (e === want[k]) { put(e); buzz(); if (++k === want.length) setTimeout(done, 400); }
        else { shake(stack); stack.innerHTML = ""; put("🍞"); k = 1; }
      };
    }
  },
  // Im richtigen Moment rausholen (Pommes, Broetchen)
  timing(box, p, done) {
    box.append($el("div", "tt", `${p.icon} ${p.what} goldbraun rausholen`));
    const pot = $el("div", "pot", `<span>${p.icon}</span>`); box.append(pot);
    const bar = $el("div", "tbar", `<i class="zone"></i><i class="mark"></i>`); box.append(bar);
    const msg = $el("div", "msg", "Warte, bis es goldbraun ist …"); box.append(msg);
    const bt = $el("button", "big wide", "Rausholen!"); box.append(bt);
    let t0 = performance.now(), dur = 5200 + Math.random() * 1800, raf;
    const lo = 0.6, hi = 0.78;
    bar.querySelector(".zone").style.cssText = `left:${lo * 100}%;width:${(hi - lo) * 100}%`;
    const mix = (a, b, k) => { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k); return `rgb(${c(16)},${c(8)},${c(0)})`; };
    const loop = () => {
      const u = Math.min(1, (performance.now() - t0) / dur);
      pot.style.background = u < 0.8 ? mix(p.from, p.to, u / 0.8) : mix(p.to, p.burn, (u - 0.8) / 0.2);
      bar.querySelector(".mark").style.left = (u * 100) + "%";
      if (u >= 1) { msg.textContent = "Verbrannt! Nochmal …"; shake(pot); t0 = performance.now(); }
      raf = requestAnimationFrame(loop);
    };
    loop();
    bt.onclick = () => {
      const u = (performance.now() - t0) / dur;
      if (u >= lo && u <= hi) { cancelAnimationFrame(raf); msg.textContent = "Perfekt! 👌"; buzz(40); setTimeout(done, 450); }
      else { msg.textContent = u < lo ? "Noch zu blass – nochmal!" : "Zu dunkel – nochmal!"; shake(pot); t0 = performance.now(); }
    };
    return () => cancelAnimationFrame(raf);
  },
  // Gedrueckt halten bis zur Markierung (Getraenk, Oel, Luft)
  hold(box, p, done) {
    box.append($el("div", "tt", `${p.icon} ${p.what}`));
    const g = $el("div", "gauge", `<i class="band"></i><i class="fill"></i>`); box.append(g);
    const val = $el("div", "val", "0"); box.append(val);
    const bt = $el("button", "big wide hold", "Gedrückt halten"); box.append(bt);
    const fmt = (v) => (p.dec ? v.toFixed(p.dec).replace(".", ",") : Math.round(v)) + " " + p.unit;
    g.querySelector(".band").style.cssText = `bottom:${p.lo / p.max * 100}%;height:${(p.hi - p.lo) / p.max * 100}%`;
    let v = 0, on = false, last = 0, raf;
    const loop = (t) => {
      const dt = last ? (t - last) / 1000 : 0; last = t;
      if (on) { v += p.speed * dt; if (v > p.max) v = p.max; }
      g.querySelector(".fill").style.height = (v / p.max * 100) + "%"; val.textContent = fmt(v);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const start = (e) => { e.preventDefault(); on = true; bt.classList.add("on"); };
    const stop = () => {
      if (!on) return; on = false; bt.classList.remove("on");
      if (v >= p.lo && v <= p.hi) { buzz(40); val.textContent = fmt(v) + " ✔"; cancelAnimationFrame(raf); setTimeout(done, 400); }
      else if (v > p.hi) { val.textContent = "Zu viel! Nochmal"; shake(g); v = 0; }
    };
    bt.addEventListener("pointerdown", start); bt.addEventListener("pointerup", stop); bt.addEventListener("pointerleave", stop); bt.addEventListener("pointercancel", stop);
    return () => cancelAnimationFrame(raf);
  },
  // Tanken: genau auf den Betrag
  fuel(box, p, done) {
    box.append($el("div", "tt", `⛽ Tanken für genau ${euro(p.target)}`));
    const disp = $el("div", "pumpdisp", `<div><small>Betrag</small><b class="eur">0,00</b> €</div><div><small>Liter</small><b class="lit">0,00</b></div>`); box.append(disp);
    const msg = $el("div", "msg", "Halten = tanken · kurz tippen = ein paar Cent"); box.append(msg);
    const bt = $el("button", "big wide hold", "⛽ Zapfhahn"); box.append(bt);
    const okb = $el("button", "big wide", "Fertig – Zapfhahn einhängen"); box.append(okb);
    let v = 0, on = false, t0 = 0, last = 0, raf;
    const price = 1.799;
    const show = () => { disp.querySelector(".eur").textContent = v.toFixed(2).replace(".", ","); disp.querySelector(".lit").textContent = (v / price).toFixed(2).replace(".", ","); };
    const loop = (t) => { const dt = last ? (t - last) / 1000 : 0; last = t; if (on && t - t0 > 220) { v += (v < p.target - 4 ? 7 : 1.6) * dt; show(); } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    bt.addEventListener("pointerdown", (e) => { e.preventDefault(); on = true; t0 = performance.now(); bt.classList.add("on"); });
    const up = () => { if (!on) return; on = false; bt.classList.remove("on"); if (performance.now() - t0 <= 220) { v += 0.03 + Math.random() * 0.05; show(); buzz(8); } if (v > p.target + 0.05) { msg.textContent = "Drüber! Kunde zahlt nicht mehr … nochmal von vorn"; shake(disp); v = 0; show(); } };
    bt.addEventListener("pointerup", up); bt.addEventListener("pointerleave", up); bt.addEventListener("pointercancel", up);
    okb.onclick = () => { if (Math.abs(v - p.target) <= 0.05) { msg.textContent = "Punktlandung! 🎯"; cancelAnimationFrame(raf); setTimeout(done, 450); } else { msg.textContent = `Noch nicht genau ${euro(p.target)} (±5 Cent)`; shake(disp); } };
    return () => cancelAnimationFrame(raf);
  },
  // Wischen (Tisch, Spiegel, Scheibe, Auto)
  wipe(box, p, done) {
    box.append($el("div", "tt", `${p.icon} ${p.what}`));
    const cv = $el("canvas", "wipe"); box.append(cv);
    const msg = $el("div", "msg", "Mit dem Finger drüberwischen"); box.append(msg);
    const W = cv.width = 520, H = cv.height = 300, g = cv.getContext("2d");
    const dirt = document.createElement("canvas"); dirt.width = W; dirt.height = H; const d = dirt.getContext("2d");
    for (let i = 0; i < 9; i++) { d.fillStyle = p.dirt; d.globalAlpha = 0.85; d.beginPath(); d.ellipse(40 + Math.random() * (W - 80), 40 + Math.random() * (H - 80), 30 + Math.random() * 45, 20 + Math.random() * 30, Math.random() * 3, 0, 7); d.fill(); }
    const draw = () => { g.fillStyle = p.bg; g.fillRect(0, 0, W, H); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, 0, W, H * 0.25); g.drawImage(dirt, 0, 0); };
    draw();
    const total = () => { const a = d.getImageData(0, 0, W, H).data; let n = 0; for (let i = 3; i < a.length; i += 16) if (a[i] > 40) n++; return n; };
    const start = total(); let lastCheck = 0, fin = false;
    const rub = (e) => {
      if (fin) return;
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      d.globalCompositeOperation = "destination-out"; d.globalAlpha = 0.35; d.beginPath(); d.arc(x, y, 34, 0, 7); d.fill(); d.globalCompositeOperation = "source-over"; d.globalAlpha = 1;
      draw();
      const now = performance.now();
      if (now - lastCheck > 150) { lastCheck = now; const left = total() / Math.max(1, start); if (left < 0.06) { fin = true; msg.textContent = "Blitzblank ✨"; setTimeout(done, 450); } }
    };
    cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); rub(e); });
    cv.addEventListener("pointermove", (e) => { if (e.buttons || e.pointerType === "touch") rub(e); });
  },
  // Regler auf Zielwert
  slider(box, p, done) {
    box.append($el("div", "tt", `${p.icon} ${p.what}: ${p.target} ${p.unit}`));
    const val = $el("div", "val", ""); box.append(val);
    const r = $el("input", "range"); r.type = "range"; r.min = p.min; r.max = p.max; r.step = 1; r.value = Math.random() < 0.5 ? p.min + 2 : p.max - 2; box.append(r);
    const bt = $el("button", "big wide", "Speichern"); box.append(bt);
    const show = () => { val.textContent = r.value + " " + p.unit; };
    r.oninput = () => { show(); buzz(4); }; show();
    bt.onclick = () => { if (Math.abs(+r.value - p.target) <= p.tol) { val.textContent += " ✔"; setTimeout(done, 350); } else shake(val); };
  },
  // Muenzen abzaehlen (Kasse zaehlen / Wechselgeld)
  coins(box, p, done, opts = {}) {
    const target = opts.target ?? Math.round((3 + Math.random() * 14) * 20) / 20;
    box.append($el("div", "tt", opts.title || `💶 Lege genau ${euro(target)} in die Kasse`));
    if (opts.sub) box.append($el("div", "msg", opts.sub));
    const sum = $el("div", "val", "0,00 €"); box.append(sum);
    const grid = $el("div", "grid4"); box.append(grid);
    const V = [10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05]; let s = 0; const hist = [];
    const show = () => { sum.textContent = euro(s); };
    for (const v of V) {
      const bt = $el("button", "big coin" + (v >= 5 ? " note" : ""), v >= 1 ? v + " €" : Math.round(v * 100) + " ct"); grid.append(bt);
      bt.onclick = () => { s = Math.round((s + v) * 100) / 100; hist.push(v); buzz(6); show(); if (Math.abs(s - target) < 0.001) { sum.textContent += " ✔"; setTimeout(done, 400); } else if (s > target) { sum.textContent = "Zu viel! " + euro(s); shake(sum); s = 0; hist.length = 0; setTimeout(show, 700); } };
    }
    const back = $el("button", "big wide", "↩ Letzte zurück"); box.append(back);
    back.onclick = () => { if (hist.length) { s = Math.round((s - hist.pop()) * 100) / 100; show(); } };
  },
  change(box, p, done) {
    const price = Math.round((5 + Math.random() * 30) * 10) / 10, paid = price < 20 ? 20 : 50;
    return GAMES.coins(box, p, done, { target: Math.round((paid - price) * 100) / 100, title: `💶 Wechselgeld geben`, sub: `Einkauf ${euro(price)} · Kunde zahlt mit ${paid} €` });
  },
  // Sortieren (Muell, Pfand, Regal, Reifen)
  sort(box, p, done) {
    box.append($el("div", "tt", `${p.icon} Richtig einsortieren`));
    const items = shuffle(p.items).slice(0, 6);
    const cur = $el("div", "item", ""); box.append(cur);
    const left = $el("div", "msg", ""); box.append(left);
    const grid = $el("div", "grid3"); box.append(grid);
    let k = 0;
    const show = () => { const it = items[k]; cur.innerHTML = /^\d+$/.test(it[0]) ? `<span class="tire">${it[0]}"</span>` : it[0]; left.textContent = `${items.length - k} übrig`; };
    p.bins.forEach(([n, c], i) => {
      const bt = $el("button", "big bin", n); bt.style.background = c; grid.append(bt);
      bt.onclick = () => { if (items[k][1] === i) { buzz(); if (++k === items.length) { cur.textContent = "✔"; left.textContent = "Alles sortiert"; setTimeout(done, 350); } else show(); } else shake(cur); };
    });
    show();
  },
  // Gesuchte Dinge finden (Spielzeug, Ersatzteil, Schluessel)
  find(box, p, done) {
    box.append($el("div", "tt", `${p.icon} ${p.what}`));
    const grid = $el("div", "grid5"); box.append(grid);
    if (p.keys) {
      const plates = shuffle(["BC-MO 204", "BC-MO 240", "BC-OM 204", "BC-MO 402", "BC-MD 204", "BC-NO 204", "BC-MO 2O4", "BC-M 204", "BC-MO 20", "BC-WO 204", "BC-MO 214", "BC-MQ 204"]);
      for (const pl of plates) { const bt = $el("button", "keytag", "🔑<br>" + pl); grid.append(bt); bt.onclick = () => { if (pl === "BC-MO 204") { bt.classList.add("ok"); buzz(30); setTimeout(done, 350); } else shake(bt); }; }
      return;
    }
    const n = 20, cells = shuffle(p.targets.concat(Array.from({ length: n - p.targets.length }, () => pick(p.filler))));
    let left = p.targets.length;
    for (const c of cells) {
      const bt = $el("button", "cell", c); grid.append(bt);
      bt.onclick = () => { if (p.targets.includes(c) && !bt.disabled) { bt.disabled = true; bt.classList.add("ok"); buzz(); if (--left === 0) setTimeout(done, 350); } else if (!bt.disabled) shake(bt); };
    }
  },
  // Bestellung merken (Drive-in, Kundenwunsch) - siehe orderOnce unten
  order(box, p, done) { return runOrder(box, p, done); },
  // Code merken und eintippen
  code(box, p, done) {
    const code = String(1000 + ((Math.random() * 9000) | 0));
    box.append($el("div", "tt", `${p.icon} ${p.what}`));
    const disp = $el("div", "codedisp", code); box.append(disp);
    const pad = $el("div", "keypad"); let typed = "", hideT = setTimeout(() => { disp.textContent = "····"; }, 2600);
    for (const k of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✔"]) {
      const bt = $el("button", "big", k); pad.append(bt);
      bt.onclick = () => {
        buzz(5);
        if (k === "⌫") typed = typed.slice(0, -1);
        else if (k === "✔") { if (typed === code) { disp.textContent = code + " ✔"; setTimeout(done, 350); return; } shake(disp); typed = ""; disp.textContent = code; clearTimeout(hideT); hideT = setTimeout(() => { disp.textContent = "····"; }, 2000); return; }
        else if (typed.length < 4) typed += k;
        disp.textContent = typed.padEnd(4, "·");
      };
    }
    box.append(pad);
    return () => clearTimeout(hideT);
  },
  // Unterschreiben
  sign(box, p, done) {
    box.append($el("div", "tt", "✍️ Hier unterschreiben"));
    const cv = $el("canvas", "sign"); box.append(cv);
    const W = cv.width = 520, H = cv.height = 220, g = cv.getContext("2d");
    g.fillStyle = "#fffdf6"; g.fillRect(0, 0, W, H); g.strokeStyle = "#9aa5ad"; g.beginPath(); g.moveTo(30, H - 50); g.lineTo(W - 30, H - 50); g.stroke(); g.fillStyle = "#9aa5ad"; g.font = "16px Arial"; g.fillText("X", 30, H - 58);
    let len = 0, last = null;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); last = pt(e); });
    cv.addEventListener("pointermove", (e) => { if (!last) return; const q = pt(e); g.strokeStyle = "#1d3b8a"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(...last); g.lineTo(...q); g.stroke(); len += Math.hypot(q[0] - last[0], q[1] - last[1]); last = q; });
    cv.addEventListener("pointerup", () => { last = null; });
    const bt = $el("button", "big wide", "Fertig"); box.append(bt);
    bt.onclick = () => { if (len > 420) setTimeout(done, 200); else { shake(cv); } };
  },
  // Preis einstellen (Mast / Preisschild)
  price(box, p, done) {
    const target = p.car ? String(9 + ((Math.random() * 20) | 0)) + "990" : "1" + String(600 + ((Math.random() * 300) | 0));
    const show = p.car ? `${target.slice(0, -3)}.${target.slice(-3)} €` : `${target[0]},${target.slice(1)} €`;
    box.append($el("div", "tt", `${p.car ? "🏷️" : "⛽"} ${p.what}: ${show}`));
    const digits = target.split("").map(() => (Math.random() * 10) | 0);
    const row = $el("div", "rollers"); box.append(row);
    const render = () => {
      row.innerHTML = "";
      digits.forEach((d, i) => {
        if (!p.car && i === 1) row.append($el("span", "sep", ","));
        if (p.car && i === target.length - 3) row.append($el("span", "sep", "."));
        const c = $el("div", "roller", `<button>▲</button><b>${d}</b><button>▼</button>`);
        c.children[0].onclick = () => { digits[i] = (digits[i] + 1) % 10; buzz(4); render(); };
        c.children[2].onclick = () => { digits[i] = (digits[i] + 9) % 10; buzz(4); render(); };
        row.append(c);
      });
    };
    render();
    const bt = $el("button", "big wide", "Übernehmen"); box.append(bt);
    bt.onclick = () => { if (digits.join("") === target) setTimeout(done, 250); else shake(row); };
  },
  // Radmuttern im Kreuz anziehen
  lug(box, p, done) {
    box.append($el("div", "tt", "🛞 Radmuttern über Kreuz anziehen"));
    box.append($el("div", "msg", "Fang irgendwo an – dann immer eine überspringen."));
    const wheel = $el("div", "wheel"); box.append(wheel);
    let seq = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5, b = $el("button", "nut", "");
      b.style.left = (50 + Math.cos(a) * 32) + "%"; b.style.top = (50 + Math.sin(a) * 32) + "%";
      wheel.append(b);
      b.onclick = () => {
        if (b.classList.contains("ok")) return;
        const prev = seq[seq.length - 1];
        if (prev === undefined || (i - prev + 5) % 5 === 2) { seq.push(i); b.classList.add("ok"); buzz(20); if (seq.length === 5) setTimeout(done, 400); }
        else { shake(wheel); seq = []; wheel.querySelectorAll(".nut").forEach(n => n.classList.remove("ok")); }
      };
    }
  },
  // Sicherungen (Licht reparieren)
  switches(box, p, done) {
    box.append($el("div", "tt", "⚡ Alle Sicherungen wieder rein"));
    const row = $el("div", "fuses"); box.append(row);
    const st = Array.from({ length: 6 }, () => Math.random() < 0.6);
    if (st.every(Boolean)) st[2] = false;
    st.forEach((on, i) => {
      const b = $el("button", "fuse" + (on ? " on" : ""), "<i></i>"); row.append(b);
      b.onclick = () => { st[i] = !st[i]; b.classList.toggle("on", st[i]); buzz(10); if (st.every(Boolean)) setTimeout(done, 300); };
    });
  },
};

// Bestellung: bei falscher Antwort wird sie nochmal gezeigt
function runOrder(box, p, done) {
  let clean = null;
  const run = () => { box.innerHTML = ""; clean && clean(); clean = orderOnce(box, p, done, run); };
  run();
  return () => clean && clean();
}
function orderOnce(box, p, done, retry) {
  const want = shuffle(p.items).slice(0, 3);
  box.append($el("div", "tt", `${p.icon} Merk dir die Bestellung!`));
  const show = $el("div", "bon big", want.join("<br>")); box.append(show);
  const to = setTimeout(() => {
    show.remove();
    const msg = $el("div", "msg", "Was wurde bestellt? (3 Sachen)"); box.append(msg);
    const grid = $el("div", "grid3"); box.append(grid);
    const sel = new Set();
    for (const it of shuffle(p.items)) { const bt = $el("button", "big", it); grid.append(bt); bt.onclick = () => { bt.classList.toggle("sel"); sel.has(it) ? sel.delete(it) : sel.add(it); buzz(5); }; }
    const ok = $el("button", "big wide", "Bestätigen"); box.append(ok);
    ok.onclick = () => { if (sel.size === 3 && want.every(w => sel.has(w))) { msg.textContent = "Richtig ✔"; setTimeout(done, 350); } else { shake(grid); msg.textContent = "Falsch! Nochmal zuhören …"; setTimeout(retry, 900); } };
  }, 3200);
  return () => clearTimeout(to);
}

// CSS fuer alle Minispiele
export const TASK_CSS = `
.taskbox{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}
.taskbox .tt{font:900 20px Nunito,system-ui,sans-serif;text-align:center}
.taskbox .msg{font-size:14px;color:#c9d6ea;text-align:center;min-height:18px}
.taskbox .val{font:900 26px Nunito,system-ui,sans-serif}
.taskbox button.big{font:800 15px Nunito,system-ui,sans-serif;border:0;border-radius:14px;padding:12px 10px;background:#2b3a5c;color:#fff;min-height:48px;touch-action:manipulation}
.taskbox button.big:active{transform:scale(.97)}
.taskbox button.big.ok{background:#2e8b57}.taskbox button.big.sel{background:#d4a017;color:#2a1a00}
.taskbox button.wide{width:min(420px,100%)}
.taskbox .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:min(420px,100%)}
.taskbox .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:min(460px,100%)}
.taskbox .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:min(460px,100%)}
.taskbox .grid5{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;width:min(460px,100%)}
.taskbox .steps{margin:0;padding-left:22px;font-size:14px;color:#c9d6ea}.taskbox .steps li.ok{color:#6aff7a;text-decoration:line-through}
.taskbox .burgerRow{display:flex;gap:14px;align-items:flex-end}
.taskbox .bon{background:#fffdf3;color:#222;border-radius:6px;padding:8px 12px;font:700 13px/1.5 monospace;box-shadow:0 3px 0 #bbb}
.taskbox .bon.big{font-size:20px;padding:14px 22px}
.taskbox .stack{display:flex;flex-direction:column;align-items:center;min-height:150px;justify-content:flex-end;min-width:80px}
.taskbox .layer{font-size:34px;line-height:24px}
.taskbox .pot{width:140px;height:110px;border-radius:14px 14px 40px 40px;background:#f6e7a6;display:flex;align-items:center;justify-content:center;font-size:54px;border:4px solid #8d949b;box-shadow:inset 0 -12px 0 rgba(0,0,0,.15)}
.taskbox .tbar{position:relative;width:min(420px,100%);height:18px;border-radius:9px;background:#1b2338;overflow:hidden}
.taskbox .tbar .zone{position:absolute;top:0;bottom:0;background:#d4a017}.taskbox .tbar .mark{position:absolute;top:-2px;bottom:-2px;width:4px;background:#fff;margin-left:-2px}
.taskbox .gauge{position:relative;width:90px;height:190px;border-radius:12px;background:#1b2338;border:3px solid #8d949b;overflow:hidden}
.taskbox .gauge .fill{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(#ffd23a,#e8862a)}
.taskbox .gauge .band{position:absolute;left:0;right:0;background:rgba(106,255,122,.35);border-top:2px solid #6aff7a;border-bottom:2px solid #6aff7a;z-index:2}
.taskbox .hold.on{background:#d4a017;color:#2a1a00}
.taskbox .pumpdisp{display:flex;gap:18px;background:#0b0f18;border:3px solid #444;border-radius:10px;padding:10px 18px;font-family:"Courier New",monospace;color:#ff5a3a}
.taskbox .pumpdisp small{display:block;color:#888;font-size:11px}.taskbox .pumpdisp b{font-size:30px}
.taskbox canvas.wipe,.taskbox canvas.sign{width:min(460px,100%);border-radius:14px;touch-action:none;background:#fff}
.taskbox .range{width:min(420px,100%);height:40px}
.taskbox .coin{background:#b08d3a}.taskbox .coin.note{background:#4a7d5a}
.taskbox .item{font-size:64px;min-height:80px}
.taskbox .tire{display:inline-block;width:80px;height:80px;border-radius:50%;background:#1a1c20;border:10px solid #333;color:#fff;font:900 22px/60px Nunito,sans-serif;text-align:center}
.taskbox .bin{color:#fff;text-shadow:0 1px 2px #000}
.taskbox .cell{font-size:28px;border:0;border-radius:12px;background:#2b3a5c;aspect-ratio:1}
.taskbox .cell.ok{background:#2e8b57}
.taskbox .keytag{border:0;border-radius:10px;background:#d9c38a;color:#2a1a00;font:800 10px/1.3 Nunito,sans-serif;padding:6px 2px}
.taskbox .keytag.ok{background:#6aff7a}
.taskbox .codedisp{font:900 44px "Courier New",monospace;letter-spacing:10px;background:#0b0f18;color:#6aff7a;padding:6px 18px;border-radius:10px}
.taskbox .keypad{display:grid;grid-template-columns:repeat(3,72px);gap:8px}
.taskbox .rollers{display:flex;gap:6px;align-items:center;background:#0b0f18;padding:10px;border-radius:12px}
.taskbox .roller{display:flex;flex-direction:column;align-items:center;gap:4px}.taskbox .roller b{font:900 34px "Courier New",monospace;color:#ffd23a}
.taskbox .roller button{border:0;border-radius:8px;background:#2b3a5c;color:#fff;width:46px;height:36px;font-size:16px}
.taskbox .sep{font:900 34px monospace;color:#ffd23a}
.taskbox .wheel{position:relative;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,#c3cad1 0 22%,#7a8796 23% 60%,#1a1c20 61%)}
.taskbox .nut{position:absolute;width:44px;height:44px;margin:-22px;border-radius:50%;border:4px solid #333;background:#d9dde2}
.taskbox .nut.ok{background:#6aff7a}
.taskbox .fuses{display:flex;gap:10px}
.taskbox .fuse{width:46px;height:110px;border-radius:10px;border:3px solid #555;background:#1b2338;position:relative}
.taskbox .fuse i{position:absolute;left:6px;right:6px;height:40px;border-radius:6px;background:#e8412f;bottom:8px;transition:bottom .15s}
.taskbox .fuse.on i{bottom:58px;background:#6aff7a}
.shake{animation:shk .35s}
@keyframes shk{20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
`;
