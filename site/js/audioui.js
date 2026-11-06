// Menue "Audio-Profil": alle Sounds anhoeren, selbst aufnehmen (PC- oder Handy-Mikro), speichern
import { AudioStore } from "./audiostore.js";
import { catalog } from "./sounds.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function initAudioUI({ audio, net, show }) {
  const items = catalog();
  let cat = "sfx", clips = new Map(), back = "lobby";
  let rec = null; // laufende Aufnahme {item, source, ...}

  async function loadActive() {
    clips = await AudioStore.load(AudioStore.active());
    await audio.loadProfile(clips);
  }
  loadActive().catch(e => console.warn("Audio-Profil laden", e));

  function renderBar() {
    $("#aProfile").innerHTML = AudioStore.profiles().map(p => `<option ${p === AudioStore.active() ? "selected" : ""}>${esc(p)}</option>`).join("");
    const phones = net.phoneIds().map(id => [id, "Handy: " + (net.phone(id)?.name || "Handy")]);
    const cur = $("#aMic").value;
    $("#aMic").innerHTML = [["pc", "PC-Mikrofon"], ...phones].map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join("");
    if ([...$("#aMic").options].some(o => o.value === cur)) $("#aMic").value = cur;
    else if (phones.length) $("#aMic").value = phones[0][0];
  }
  function renderList() {
    document.querySelectorAll("#aTabs button").forEach(b => b.classList.toggle("on", b.dataset.c === cat));
    let html = "", lastWho = null;
    for (const it of items.filter(i => i.cat === cat)) {
      if (it.cat === "voice" && it.who !== lastWho) { html += `<div class="agroup" style="color:${it.color}">${esc(it.who)}</div>`; lastWho = it.who; }
      const own = clips.get(it.id);
      html += `<div class="arow" data-id="${it.id}">
        <button class="play" data-a="play" title="Anhören">▶</button>
        <div><div class="t">${it.cat === "voice" ? `<span class="who" style="background:${it.color}">${esc(it.who)}</span>` : ""}${esc(it.name)}</div>
          <div class="d">${esc(it.desc)}</div>
          <div class="st ${own ? "own" : ""}">${own ? "✔ Eigene Aufnahme (" + new Date(own.at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) + ")" : "Standard-Sound"}</div></div>
        <div class="acts"><button class="rec" data-a="rec">● Aufnehmen</button>${own ? '<button class="rst" data-a="reset" title="Zurück zum Standard">✕</button>' : ""}</div>
      </div>`;
    }
    $("#alist").innerHTML = html;
  }
  function open(from) { back = from || "lobby"; audio.ensure(); renderBar(); renderList(); show("audio"); }

  $("#aTabs").addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (b) { cat = b.dataset.c; renderList(); } });
  $("#alist").addEventListener("click", async e => {
    const b = e.target.closest("[data-a]"); if (!b) return;
    const it = items.find(i => i.id === b.closest("[data-id]").dataset.id);
    if (b.dataset.a === "play") audio.preview(it);
    if (b.dataset.a === "reset") { await AudioStore.remove(AudioStore.active(), it.id); clips.delete(it.id); await audio.setClip(it.id, null); renderList(); }
    if (b.dataset.a === "rec") startRec(it);
  });
  $("#aProfile").addEventListener("change", async e => { AudioStore.setActive(e.target.value); await loadActive(); renderList(); });
  $("#aNew").onclick = async () => { const n = prompt("Name für das neue Profil (z. B. „Jungs“):", ""); if (n && AudioStore.create(n)) { await loadActive(); renderBar(); renderList(); } };
  $("#aRen").onclick = async () => { const o = AudioStore.active(); const n = prompt("Neuer Name:", o); if (n && n !== o && await AudioStore.rename(o, n)) { await loadActive(); renderBar(); renderList(); } };
  $("#aDel").onclick = async () => { const o = AudioStore.active(); if (AudioStore.profiles().length <= 1) { alert("Das letzte Profil kann nicht gelöscht werden."); return; } if (confirm(`Profil „${o}“ mit allen Aufnahmen löschen?`) && await AudioStore.drop(o)) { await loadActive(); renderBar(); renderList(); } };
  $("#aBack").onclick = () => { audio.stopPreview(); show(back); };
  $("#aMic").addEventListener("focus", renderBar);

  // ---------- Aufnahme
  async function store(it, blob) {
    await AudioStore.save(AudioStore.active(), it.id, blob);
    clips.set(it.id, { blob, at: Date.now() });
    await audio.setClip(it.id, blob);
    renderList();
    audio.preview(it);
  }
  function modal(it, who) {
    $("#rmWho").textContent = (it.who ? it.who + " · " : "") + who;
    $("#rmTitle").textContent = it.name; $("#rmDesc").textContent = it.desc;
    $("#rmMsg").textContent = ""; $("#recBar i").style.width = "0%";
    $("#rmPlay").disabled = true; $("#rmSave").disabled = true;
    $("#recModal").classList.add("on");
  }
  function closeModal() {
    if (rec && rec.source !== "pc") net.send(rec.source, { t: "recEnd" });
    if (rec && rec.mr && rec.mr.state === "recording") rec.mr.stop();
    if (rec && rec.timer) clearInterval(rec.timer);
    rec = null; $("#recModal").classList.remove("on"); $("#rmBtn").classList.remove("live");
  }
  $("#rmClose").onclick = closeModal;

  function startRec(it) {
    const src = $("#aMic").value || "pc";
    audio.stopPreview();
    if (src === "pc") {
      rec = { item: it, source: "pc", blob: null };
      modal(it, "PC-Mikrofon");
      $("#rmBtn").style.display = "block";
      $("#rmMsg").textContent = "Auf ● klicken, sprechen, nochmal klicken zum Stoppen.";
    } else {
      rec = { item: it, source: src, blob: null };
      modal(it, "Handy: " + (net.phone(src)?.name || "Handy"));
      $("#rmBtn").style.display = "none";
      $("#rmMsg").textContent = "Auf dem Handy erscheint jetzt der Aufnahme-Knopf …";
      net.send(src, { t: "rec", id: it.id, title: it.name, who: it.who || "", desc: it.desc, max: it.max });
    }
  }
  $("#rmBtn").onclick = async () => {
    if (!rec || rec.source !== "pc") return;
    if (rec.mr && rec.mr.state === "recording") { rec.mr.stop(); return; }
    try {
      rec.stream ||= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    } catch (e) { $("#rmMsg").textContent = "Kein Mikrofon-Zugriff: " + e.message; return; }
    const chunks = [];
    const mr = new MediaRecorder(rec.stream);
    rec.mr = mr;
    mr.ondataavailable = ev => ev.data.size && chunks.push(ev.data);
    mr.onstop = () => {
      clearInterval(rec.timer); $("#rmBtn").classList.remove("live"); $("#rmBtn").textContent = "●";
      rec.blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
      rec.stream.getTracks().forEach(t => t.stop()); rec.stream = null;
      $("#rmPlay").disabled = false; $("#rmSave").disabled = false; $("#rmMsg").textContent = "Fertig. Anhören oder speichern – oder nochmal auf ● für eine neue Aufnahme.";
    };
    mr.start();
    $("#rmBtn").classList.add("live"); $("#rmBtn").textContent = "■";
    const t0 = performance.now(), max = rec.item.max * 1000;
    rec.timer = setInterval(() => { const p = (performance.now() - t0) / max; $("#recBar i").style.width = Math.min(100, p * 100) + "%"; if (p >= 1 && mr.state === "recording") mr.stop(); }, 50);
  };
  $("#rmPlay").onclick = () => { if (rec && rec.blob) new window.Audio(URL.createObjectURL(rec.blob)).play(); };
  $("#rmSave").onclick = async () => { if (rec && rec.blob) { const it = rec.item, b = rec.blob; closeModal(); await store(it, b); } };

  // Handy schickt die Aufnahme
  net.on("clip", async (id, m) => {
    if (!rec || rec.source !== id || m.id !== rec.item.id) return;
    try {
      const blob = new Blob([m.data], { type: m.mime || "audio/mp4" });
      const it = rec.item; closeModal(); await store(it, blob);
    } catch (e) { $("#rmMsg").textContent = "Aufnahme kaputt angekommen: " + e.message; }
  });
  net.on("recCancel", (id) => { if (rec && rec.source === id) closeModal(); });
  net.on("join", () => { if (document.querySelector("#s-audio.on")) renderBar(); });

  return { open, reload: loadActive, isRecording: () => !!rec };
}
